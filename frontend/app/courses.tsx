/**
 * /courses — SA Courses (Learning Marketplace).
 *
 * C17 light-theme redesign: forces the light palette for this page only
 * (#F8FAFC background, white cards, #7C3AED accent) and replaces the
 * per-subcategory carousel bands with ONE flat filterable grid
 * (3-col desktop / 2-col tablet / 1-col phone).
 *
 *   1. Header "Courses" + stat chips + search (with autocomplete)
 *   2. Career tracks strip (always above the grid)
 *   3. Category tabs (All / Tech / Design / Business) with counts
 *   4. Pricing pills + Filters · N + Sort dropdown + Clear all
 *   5. Active filter chips + "N of M courses" status banner
 *   6. Flat card grid — logo square (initials fallback), badges, stats,
 *      skill pills, price + Enroll
 *   7. Advisor / Course-AI bar
 *   8. Phone bottom nav: Home · Career AI · Courses · Network · Deals
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, TextInput, Modal, Linking, Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { ForceLightTheme } from '@/src/theme/ThemeContext';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import CareerTrackInline from '@/src/views/web/courses/CareerTrackInline';
import CourseDetailDrawer from '@/src/views/web/courses/CourseDetailDrawer';
import { request } from '@/src/models/services/api';
import { StudentPortalNavContext } from '@/src/views/web/portals/student/StudentPortalNavContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Section = { id: string; emoji: string; name: string;
                 color: string;
                 items: { key: string; label: string; icon: IconName; count: number }[] };

type Course = {
  id: string; source: string; title: string; short_desc: string;
  provider: { name: string; type: string; logo: string };
  instructors: string[]; category: string; subcategory: string;
  level: string; language: string; duration_hours: number;
  duration_label: string; enrolled_count: number; rating: number;
  review_count: number;
  pricing: { type: string; original_inr?: number; sa_inr?: number;
             sa_discount_percent?: number };
  certification: { available: boolean; free: boolean; type?: string;
                    accreditor?: string; recognised?: boolean; cost_inr?: number };
  thumbnail: string; featured?: boolean; enroll_url: string;
  tags?: string[];
};

/* Light palette (page is pinned light — no dark branch) */
const L = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',
  accent: '#7C3AED',
  accentBg: '#F5F3FF',
  accentBorder: '#DDD6FE',
  accentText: '#6D28D9',
  border: '#E2E8F0',
  pillBg: '#FFFFFF',
  pillBorder: '#CBD5E1',
  priceFree: '#059669',
  pricePaid: '#D97706',
};

const TAG_META: Record<string, { label: string; color: string }> = {
  FREE:               { label: 'FREE',             color: '#059669' },
  FREE_CERT:          { label: 'FREE CERT',        color: '#059669' },
  TOP_RATED:          { label: 'TOP-RATED',        color: '#D97706' },
  TRENDING:           { label: 'TRENDING',         color: '#EF4444' },
  NEW:                { label: 'NEW',              color: '#0891B2' },
  GOVT_CERTIFIED:     { label: 'GOVT-CERTIFIED',   color: '#6366F1' },
  IVY_LEAGUE:         { label: 'IVY LEAGUE',       color: '#7C3AED' },
  QUICK_WIN:          { label: 'QUICK WIN',        color: '#D97706' },
  BEGINNER_FRIENDLY:  { label: 'BEGINNER FRIENDLY',color: '#0D9488' },
  JOB_READY:          { label: 'JOB-READY',        color: '#DB2777' },
  HAS_MENTOR:         { label: 'HAS MENTOR',       color: '#0EA5E9' },
};

const SORT_LABELS = {
  popular:  'Most popular',
  rating:   'Highest rated',
  newest:   'Newest',
  free:     'Free first',
  shortest: 'Shortest first',
} as const;

const DURATION_LABELS = {
  all:    'Any duration',
  short:  '< 5h',
  medium: '5–20h',
  long:   '20–50h',
  xl:     '50h+',
} as const;

const LEVEL_OPTIONS = ['all', 'Beginner', 'Intermediate', 'Advanced'];

const BOTTOM_NAV: { icon: IconName; label: string; route: string; active?: boolean }[] = [
  { icon: 'home-variant',  label: 'Home',      route: '/platform' },
  { icon: 'brain',         label: 'Career AI', route: '/career-ai' },
  { icon: 'school',        label: 'Courses',   route: '/courses', active: true },
  { icon: 'account-group', label: 'Network',   route: '/network' },
  { icon: 'gift',          label: 'Deals',     route: '/deals' },
];

/* Deterministic provider → tint pair for the initials logo square */
const LOGO_TINTS = [
  { bg: '#EDE9FE', fg: '#6D28D9' },
  { bg: '#E0F2FE', fg: '#0369A1' },
  { bg: '#FCE7F3', fg: '#BE185D' },
  { bg: '#FEF3C7', fg: '#B45309' },
  { bg: '#D1FAE5', fg: '#047857' },
  { bg: '#E0E7FF', fg: '#4338CA' },
  { bg: '#CCFBF1', fg: '#0F766E' },
  { bg: '#FFE4E6', fg: '#BE123C' },
];
function logoTint(provider: string) {
  let h = 0;
  for (let i = 0; i < provider.length; i++) h = (h * 31 + provider.charCodeAt(i)) | 0;
  return LOGO_TINTS[Math.abs(h) % LOGO_TINTS.length];
}

const fmtINR = (n?: number) => '₹' + (n || 0).toLocaleString('en-IN');
const fmtCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(n);
};

export default function CoursesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);
  const studentNav = React.useContext(StudentPortalNavContext);
  const { width } = useWindowDimensions();
  const isMobile = width > 0 && width < 640;
  const isDesktop = width >= 1024;
  const cols = isDesktop ? 3 : isMobile ? 1 : 2;

  useEffect(() => {
    if (studentNav?.detailCourse) {
      setEnrollFor(studentNav.detailCourse);
      studentNav.setDetailCourse?.(null);
    }
  }, [studentNav?.detailCourse]);

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') {
        router.replace('/alumni-portal?tab=courses' as any);
      } else if (user.role === 'student') {
        router.replace('/student-portal?tab=courses' as any);
      }
    }
  }, [isEmbedded, initialized, user, router]);

  const [sections, setSections] = useState<Section[]>([]);
  const [stats, setStats] = useState({ total_courses: 0, free_courses: 0,
                                        paid_courses: 0, free_certs: 0 });
  const [tracksMeta, setTracksMeta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');     // 'all' | section.id
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  // Advanced filter state
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [hasMentorFilter, setHasMentorFilter] = useState<boolean>(false);
  const [hasCertFilter, setHasCertFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest' | 'free' | 'shortest'>('popular');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Search autocomplete
  const [searchFocused, setSearchFocused] = useState(false);
  const [enrollFor, setEnrollFor] = useState<Course | null>(null);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [activeTrackSlug, setActiveTrackSlug] = useState<string | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [r, allList] = await Promise.all([
        request<any>('/courses/catalog'),
        request<any>('/courses/list?sort=popular'),
      ]);
      setSections(r.sections || []);
      setStats(r.stats || stats);
      setTracksMeta(r.tracks || []);
      setAllCourses(allList.courses || []);
    } catch (e: any) {
      console.warn('courses catalog err', e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  /* ─── In-place filter (no API call, no view swap) ──────────── */
  const filterCourse = useCallback((c: Course) => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false;
    if (activeSubcat && c.subcategory !== activeSubcat) return false;
    if (pricingFilter === 'free' &&
        !['free', 'free_audit', 'free_with_sa'].includes(c.pricing.type)) return false;
    if (pricingFilter === 'paid' &&
        ['free', 'free_audit', 'free_with_sa'].includes(c.pricing.type)) return false;
    // Advanced filters
    if (levelFilter !== 'all' && c.level !== levelFilter) return false;
    if (durationFilter !== 'all') {
      const h = c.duration_hours || 0;
      if (durationFilter === 'short'  && h >= 5)            return false;
      if (durationFilter === 'medium' && (h < 5 || h > 20)) return false;
      if (durationFilter === 'long'   && (h < 20 || h > 50))return false;
      if (durationFilter === 'xl'     && h < 50)            return false;
    }
    if (languageFilter !== 'all' && c.language !== languageFilter) return false;
    if (providerFilter !== 'all' && c.provider.name !== providerFilter) return false;
    if (hasMentorFilter && !(c.tags || []).includes('HAS_MENTOR')) return false;
    if (hasCertFilter && !c.certification.available) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const blob = `${c.title} ${c.short_desc} ${c.provider.name} ${c.instructors.join(' ')}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  }, [activeCategory, activeSubcat, pricingFilter, search,
      levelFilter, durationFilter, languageFilter, providerFilter,
      hasMentorFilter, hasCertFilter]);

  // Sort comparator
  const sortComparator = useCallback((a: Course, b: Course) => {
    if (sortBy === 'rating')   return b.rating - a.rating;
    if (sortBy === 'newest')   return (b as any).created_at?.localeCompare?.((a as any).created_at || '') || 0;
    if (sortBy === 'free') {
      const af = ['free','free_audit','free_with_sa'].includes(a.pricing.type) ? 0 : 1;
      const bf = ['free','free_audit','free_with_sa'].includes(b.pricing.type) ? 0 : 1;
      return af - bf;
    }
    if (sortBy === 'shortest') return (a.duration_hours || 0) - (b.duration_hours || 0);
    return b.enrolled_count - a.enrolled_count;  // popular default
  }, [sortBy]);

  const filteredCourses = useMemo(
    () => allCourses.filter(filterCourse).sort(sortComparator),
    [allCourses, filterCourse, sortComparator]
  );

  // Whether any filter is active
  const filtersActive = activeCategory !== 'all' || activeSubcat ||
                        pricingFilter !== 'all' || !!search.trim() ||
                        levelFilter !== 'all' || durationFilter !== 'all' ||
                        languageFilter !== 'all' || providerFilter !== 'all' ||
                        hasMentorFilter || hasCertFilter;

  const advancedFilterCount =
    (levelFilter !== 'all' ? 1 : 0) +
    (durationFilter !== 'all' ? 1 : 0) +
    (languageFilter !== 'all' ? 1 : 0) +
    (providerFilter !== 'all' ? 1 : 0) +
    (hasMentorFilter ? 1 : 0) +
    (hasCertFilter ? 1 : 0);

  const clearAllFilters = () => {
    setActiveCategory('all');
    setActiveSubcat(null);
    setPricingFilter('all');
    setSearch('');
    setLevelFilter('all');
    setDurationFilter('all');
    setLanguageFilter('all');
    setProviderFilter('all');
    setHasMentorFilter(false);
    setHasCertFilter(false);
  };

  // Derive unique option lists from allCourses
  const languageOptions = useMemo(
    () => ['all', ...Array.from(new Set(allCourses.map((c) => c.language))).sort()],
    [allCourses]
  );
  const providerOptions = useMemo(
    () => ['all', ...Array.from(new Set(allCourses.map((c) => c.provider.name))).sort()],
    [allCourses]
  );
  // Search autocomplete options
  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 2) return null;
    const courses = allCourses
      .filter((c) => c.title.toLowerCase().includes(q) || c.short_desc.toLowerCase().includes(q))
      .slice(0, 5);
    const skills = Array.from(new Set(allCourses.flatMap((c) => c.tags || [])))
      .filter((t) => t.toLowerCase().includes(q.replace(/\s/g, '_')))
      .slice(0, 8);
    const providers = Array.from(new Set(allCourses.map((c) => c.provider.name)))
      .filter((p) => p.toLowerCase().includes(q))
      .slice(0, 6);
    return { courses, skills, providers };
  }, [search, allCourses]);

  return (
    <ForceLightTheme>
    <FeaturePageShell
      title="Courses"
      subtitle="Skill up with curated tracks, free certifications & expert mentors."
      accent="#7C3AED"
      rightSlot={
        <View style={s.statsPills}>
          <View style={s.statPillFree}>
            <Text style={s.statPillValFree}>{stats.free_courses}</Text>
            <Text style={s.statPillLblFree}>Free</Text>
          </View>
          <View style={s.statPillAmber}>
            <Text style={s.statPillValAmber}>{stats.free_certs}</Text>
            <Text style={s.statPillLblAmber}>Free certs</Text>
          </View>
        </View>
      }
    >
      {/* Career Track inline view (replaces catalog when active) */}
      {activeTrackSlug && (
        <CareerTrackInline
          slug={activeTrackSlug}
          onBack={() => setActiveTrackSlug(null)}
          onEnrollCourse={(c) => setDetailCourse(c as any)}
        />
      )}

      {/* Catalog (hidden when track view is open) */}
      {!activeTrackSlug && (<>
      {/* Search Bar */}
      <View>
        <View style={s.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color={L.text3} />
          <TextInput
            style={[s.searchInput, { color: L.text }]}
            placeholder="Search courses, skills, instructors…"
            placeholderTextColor={L.text3}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={L.text3} />
            </Pressable>
          )}
        </View>
        {/* Autocomplete dropdown */}
        {searchFocused && searchSuggestions && (
          (searchSuggestions.courses.length > 0 ||
            searchSuggestions.skills.length > 0 ||
            searchSuggestions.providers.length > 0) ? (
          <View style={s.acDropdown}>
            {searchSuggestions.courses.length > 0 && (
              <View style={s.acSection}>
                <Text style={s.acHeader}>Courses</Text>
                {searchSuggestions.courses.map((c) => (
                  <Pressable key={c.id}
                    onPress={() => { setEnrollFor(c); setSearch(''); }}
                    style={s.acRow}>
                    <ProviderLogo provider={c.provider.name} size={24} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.acTitle, { color: L.text }]} numberOfLines={1}>{c.title}</Text>
                      <Text style={s.acMeta} numberOfLines={1}>
                        {c.provider.name} · {c.duration_label}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-top-left" size={13} color={L.text3} />
                  </Pressable>
                ))}
              </View>
            )}
            {searchSuggestions.skills.length > 0 && (
              <View style={s.acSection}>
                <Text style={s.acHeader}>Skills</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {searchSuggestions.skills.map((sk) => {
                    const m = TAG_META[sk];
                    return (
                      <Pressable key={sk}
                        onPress={() => setSearch(sk.toLowerCase().replace(/_/g, ' '))}
                        style={[s.smartTag,
                          { backgroundColor: (m?.color || '#7C3AED') + '15',
                            borderColor: (m?.color || '#7C3AED') + '40' }]}>
                        <Text style={[s.smartTagText, { color: m?.color || L.accent }]}>
                          {m?.label || sk}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
            {searchSuggestions.providers.length > 0 && (
              <View style={s.acSection}>
                <Text style={s.acHeader}>Providers</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {searchSuggestions.providers.map((p) => (
                    <Pressable key={p}
                      onPress={() => { setProviderFilter(p); setSearch(''); }}
                      style={s.acProviderChip}>
                      <MaterialCommunityIcons name="school-outline" size={11} color={L.accent} />
                      <Text style={s.acProviderText}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
          ) : null
        )}
      </View>

      {/* Loading state */}
      {loading && allCourses.length === 0 ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={L.accent} />
          <Text style={s.loadingText}>Loading curated catalog…</Text>
        </View>
      ) : null}

      {/* Career tracks strip — above the grid */}
      {tracksMeta.length > 0 && (
        <View style={s.tracksStrip}>
          <Text style={[s.kicker, { color: L.text3 }]}>CAREER TRACKS</Text>
          <View style={s.tracksRow}>
            {tracksMeta.map((t: any) => (
              <Pressable key={t.slug}
                onPress={() => setActiveTrackSlug(t.slug)}
                style={[s.trackChip, { borderColor: t.color + '40',
                                       backgroundColor: t.color + '10' }]}>
                <MaterialCommunityIcons name="rocket-launch" size={14} color={t.color} />
                <Text style={[s.trackChipText, { color: t.color }]}>{t.title}</Text>
                <View style={s.trackChipMeta}>
                  <Text style={s.trackChipMetaText}>
                    {t.duration_weeks}w · {t.enrolled_count} learners
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Primary Category tab strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {[{ id: 'all', label: 'All', icon: 'view-grid' as IconName, color: '#7C3AED' },
          ...sections.map((sec) => ({
            id: sec.id, label: sec.name,
            icon: (sec.id === 'tech' ? 'laptop' :
                   sec.id === 'design' ? 'palette' :
                   sec.id === 'business' ? 'briefcase' : 'school') as IconName,
            color: sec.id === 'tech' ? '#0891B2' :
                   sec.id === 'design' ? '#DB2777' :
                   sec.id === 'business' ? '#D97706' : '#7C3AED',
          }))].map((cat) => {
          const active = activeCategory === cat.id;
          const count = cat.id === 'all'
            ? allCourses.length
            : allCourses.filter((c) => c.category === cat.id).length;
          return (
            <Pressable key={cat.id}
              onPress={() => {
                setActiveCategory(cat.id);
                setActiveSubcat(null);
              }}
              style={[s.pill,
                { backgroundColor: active ? cat.color : L.pillBg,
                  borderColor: active ? cat.color : L.pillBorder }]}>
              <MaterialCommunityIcons name={cat.icon} size={14}
                color={active ? '#fff' : cat.color} />
              <Text style={[s.pillText, { color: active ? '#fff' : L.text2 }]}>
                {cat.label}
              </Text>
              {count > 0 && (
                <View style={[s.pillCount,
                  { backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#E2E8F0' }]}>
                  <Text style={[s.pillCountText, { color: active ? '#fff' : '#334155' }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Pricing pill row + Filters · N + Sort + Clear all */}
      <View style={s.pricingFilters}>
        {(['all', 'free', 'paid'] as const).map((p) => {
          const active = pricingFilter === p;
          const lbl = p === 'all' ? 'All pricing' : p === 'free' ? 'Free / Free Cert' : 'Paid (with SA discount)';
          const icon: IconName = p === 'all' ? 'cash-multiple' :
                                  p === 'free' ? 'gift' : 'currency-inr';
          return (
            <Pressable key={p} onPress={() => setPricingFilter(p)}
              style={[s.pill,
                { backgroundColor: active ? L.accent : L.pillBg,
                  borderColor: active ? L.accent : L.pillBorder }]}>
              <MaterialCommunityIcons name={icon} size={13}
                color={active ? '#fff' : L.accent} />
              <Text style={[s.pillText, { color: active ? '#fff' : L.text2 }]}>
                {lbl}
              </Text>
            </Pressable>
          );
        })}

        {/* More filters trigger */}
        <Pressable onPress={() => setShowFilterSheet(true)}
          style={[s.pill,
            { backgroundColor: advancedFilterCount > 0 ? L.accent : L.pillBg,
              borderColor: advancedFilterCount > 0 ? L.accent : L.pillBorder }]}>
          <MaterialCommunityIcons name="tune-variant" size={13}
            color={advancedFilterCount > 0 ? '#fff' : L.accent} />
          <Text style={[s.pillText, { color: advancedFilterCount > 0 ? '#fff' : L.text2 }]}>
            Filters{advancedFilterCount > 0 ? ` · ${advancedFilterCount}` : ''}
          </Text>
        </Pressable>

        {/* Sort dropdown trigger */}
        <View>
          <Pressable onPress={() => setShowSortMenu(!showSortMenu)}
            style={[s.pill,
              { backgroundColor: sortBy !== 'popular' ? L.accent : L.pillBg,
                borderColor: sortBy !== 'popular' ? L.accent : L.pillBorder }]}>
            <MaterialCommunityIcons name="sort" size={13}
              color={sortBy !== 'popular' ? '#fff' : L.accent} />
            <Text style={[s.pillText, { color: sortBy !== 'popular' ? '#fff' : L.text2 }]}>
              Sort: {SORT_LABELS[sortBy]}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={12}
              color={sortBy !== 'popular' ? '#fff' : L.text2} />
          </Pressable>
          {showSortMenu && (
            <View style={s.sortMenu}>
              {(Object.keys(SORT_LABELS) as Array<keyof typeof SORT_LABELS>).map((k) => (
                <Pressable key={k}
                  onPress={() => { setSortBy(k); setShowSortMenu(false); }}
                  style={[s.sortItem, sortBy === k && s.sortItemActive]}>
                  <Text style={[s.sortItemText, { color: sortBy === k ? L.accentText : L.text2 }]}>
                    {SORT_LABELS[k]}
                  </Text>
                  {sortBy === k && (
                    <MaterialCommunityIcons name="check" size={13} color={L.accent} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {filtersActive && (
          <Pressable onPress={clearAllFilters} style={s.clearBtn}>
            <MaterialCommunityIcons name="close" size={12} color={L.text2} />
            <Text style={s.clearBtnText}>Clear all</Text>
          </Pressable>
        )}
      </View>

      {/* Active advanced filter chips (removable) */}
      {advancedFilterCount > 0 && (
        <View style={s.activeChipsRow}>
          {levelFilter !== 'all' && (
            <RemovableChip label={`Level: ${levelFilter}`}
              onClear={() => setLevelFilter('all')} />
          )}
          {durationFilter !== 'all' && (
            <RemovableChip
              label={`Duration: ${DURATION_LABELS[durationFilter as keyof typeof DURATION_LABELS]}`}
              onClear={() => setDurationFilter('all')} />
          )}
          {languageFilter !== 'all' && (
            <RemovableChip label={`Lang: ${languageFilter}`}
              onClear={() => setLanguageFilter('all')} />
          )}
          {providerFilter !== 'all' && (
            <RemovableChip label={`Provider: ${providerFilter}`}
              onClear={() => setProviderFilter('all')} />
          )}
          {hasMentorFilter && (
            <RemovableChip label="Has mentor"
              onClear={() => setHasMentorFilter(false)} />
          )}
          {hasCertFilter && (
            <RemovableChip label="Has certificate"
              onClear={() => setHasCertFilter(false)} />
          )}
        </View>
      )}

      {/* Filter status banner */}
      {filtersActive && (
        <View style={s.filterStatus}>
          <MaterialCommunityIcons name="filter-check" size={13} color={L.accent} />
          <Text style={s.filterStatusText}>
            Showing {filteredCourses.length} of {allCourses.length} courses
            {activeCategory !== 'all' ? ` in ${sections.find(x => x.id === activeCategory)?.name}` : ''}
            {pricingFilter !== 'all' ? ` · ${pricingFilter}` : ''}
            {search.trim() ? ` · "${search.trim()}"` : ''}
            {allCourses.length > 0 && (
              <Pressable onPress={clearAllFilters} hitSlop={8}>
                <Text style={s.filterStatusClear}>  Clear filters</Text>
              </Pressable>
            )}
          </Text>
        </View>
      )}

      {/* Empty state when filters yield no results */}
      {filtersActive && filteredCourses.length === 0 && (
        <View style={s.emptyBox}>
          <MaterialCommunityIcons name="book-search" size={40} color={L.text3} />
          <Text style={s.emptyTitle}>No courses match these filters</Text>
          <Text style={s.emptySub}>Try clearing or switching pricing tier</Text>
          <Pressable onPress={clearAllFilters} style={s.clearBtnLarge}>
            <Text style={s.clearBtnLargeText}>Reset filters</Text>
          </Pressable>
        </View>
      )}

      {/* Flat filterable grid */}
      {filteredCourses.length > 0 && (
        <View style={s.cardGrid}>
          {filteredCourses.map((c) => (
            <CourseCard key={c.id} course={c}
                        onEnroll={() => setEnrollFor(c)}
                        cellStyle={cardCell(cols)} />
          ))}
        </View>
      )}

      {/* Advisor / Course-AI bar */}
      <View style={{ marginTop: 18 }}>
        <AdvisorAIBlock
          context="courses"
          advisorTitle="Talk to a Course Advisor"
          advisorDesc="Need a personalised learning path? Connect with an SA mentor."
          aiTitle="Ask the SA Course AI"
          aiDesc="Tell us your goal & weekly hours — we'll plan free + paid courses for you."
          advisorAccent="#7C3AED"
          aiAccent="#10B981"
          advisorIcon="account-tie-voice"
          aiIcon="brain"
        />
      </View>
      </>)}

      {/* Course Detail Drawer (right-side slide-in) */}
      <CourseDetailDrawer course={detailCourse}
                          onClose={() => setDetailCourse(null)} />

      {/* Enroll modal */}
      <EnrollModal course={enrollFor}
                   onClose={() => setEnrollFor(null)} />

      {/* Filters sheet modal */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        levelFilter={levelFilter} setLevelFilter={setLevelFilter}
        durationFilter={durationFilter} setDurationFilter={setDurationFilter}
        languageFilter={languageFilter} setLanguageFilter={setLanguageFilter}
        providerFilter={providerFilter} setProviderFilter={setProviderFilter}
        hasMentorFilter={hasMentorFilter} setHasMentorFilter={setHasMentorFilter}
        hasCertFilter={hasCertFilter} setHasCertFilter={setHasCertFilter}
        languageOptions={languageOptions} providerOptions={providerOptions}
        onClearAll={() => {
          setLevelFilter('all'); setDurationFilter('all'); setLanguageFilter('all');
          setProviderFilter('all'); setHasMentorFilter(false); setHasCertFilter(false);
        }}
      />

      {/* Phone bottom nav — Home · Career AI · Courses · Network · Deals */}
      {isMobile && !isEmbedded && Platform.OS === 'web' && (
        <View style={s.bottomNav} pointerEvents="box-none">
          <View style={s.bottomNavInner}>
            {BOTTOM_NAV.map((n) => (
              <Pressable key={n.route}
                onPress={() => !n.active && router.replace(n.route as any)}
                style={s.bottomNavItem}>
                <MaterialCommunityIcons name={n.icon} size={20}
                  color={n.active ? L.accent : L.text3} />
                <Text style={[s.bottomNavLabel, { color: n.active ? L.accent : L.text3 }]}>
                  {n.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </FeaturePageShell>
    </ForceLightTheme>
  );
}

/* ─── Provider logo (initials fallback) ────────────────────── */
function ProviderLogo({ provider, size = 32 }:
  { provider: string; size?: number }) {
  const tint = logoTint(provider || '?');
  const initial = (provider || '?').replace(/[^A-Za-z0-9]/g, ' ').trim().split(/\s+/)[0]?.[0]?.toUpperCase() || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: 9, backgroundColor: tint.bg,
                   alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: tint.fg, fontSize: Math.round(size * 0.45),
                     fontWeight: '800' }}>{initial}</Text>
    </View>
  );
}

/* ─── Course Card ───────────────────────────────────────────── */
function CourseCard({ course, onEnroll, cellStyle }:
  { course: Course; onEnroll: () => void;
    cellStyle: { [k: string]: string | number } }) {
  const isFree = ['free', 'free_audit', 'free_with_sa'].includes(course.pricing.type);
  const isDiscounted = course.pricing.type === 'discounted_for_sa';
  const tags = (course.tags || []).slice(0, 3);
  const sourceLabel = course.source === 'internal' ? 'SA' : (course.source || 'SA').slice(0, 12);

  return (
    <View style={[s.courseCard, cellStyle, { backgroundColor: L.card, borderColor: L.border }]}>
      <View style={s.courseTopRow}>
        <View style={s.providerStrip}>
          <ProviderLogo provider={course.provider.name} size={28} />
          <Text style={s.providerName} numberOfLines={1}>
            {course.provider.name}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <PriceBadge type={course.pricing.type} />
          <View style={s.sourceBadge}>
            <Text style={s.sourceBadgeText}>
              {course.source === 'internal' ? 'SA EXCLUSIVE' : sourceLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
          <Text style={[s.courseTitle, { color: L.text, flex: 1 }]} numberOfLines={2}>
            {course.title}
          </Text>
          {course.featured && (
            <View style={s.featuredBadge}>
              <MaterialCommunityIcons name="star" size={9} color="#fff" />
              <Text style={s.featuredBadgeText}>FEATURED</Text>
            </View>
          )}
        </View>
        <Text style={s.courseInstructor} numberOfLines={1}>
          {course.instructors[0]} · {course.provider.name}
        </Text>

        <View style={s.metaTagRow}>
          <MetaTag text={course.level} />
          <MetaTag text={course.language} />
          <MetaTag text={course.duration_label} />
        </View>

        <View style={s.statsRow}>
          <MaterialCommunityIcons name="star" size={11} color="#F59E0B" />
          <Text style={s.ratingText}>{course.rating}</Text>
          <Text style={s.ratingCount}>({fmtCount(course.review_count)})</Text>
          <View style={{ flex: 1 }} />
          <MaterialCommunityIcons name="account-multiple" size={11} color={L.text3} />
          <Text style={s.enrolledText}>{fmtCount(course.enrolled_count)}</Text>
        </View>

        {course.certification.available && (
          <CertBadge cert={course.certification} />
        )}

        {tags.length > 0 && (
          <View style={s.tagRow}>
            {tags.map((t, i) => {
              const meta = TAG_META[t];
              if (!meta) return null;
              return (
                <View key={`${t}-${i}`}
                  style={[s.smartTag,
                    { backgroundColor: meta.color + '15',
                      borderColor: meta.color + '40' }]}>
                  <Text style={[s.smartTagText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
              );
            })}
            {(course.tags || []).length > 3 && (
              <View style={s.smartTagNeutral}>
                <Text style={s.smartTagNeutralText}>
                  +{(course.tags || []).length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.priceRow}>
          <View>
            {isFree ? (
              <Text style={[s.priceFree, { color: L.priceFree }]}>FREE</Text>
            ) : isDiscounted ? (
              <View>
                <Text style={s.priceOrig}>{fmtINR(course.pricing.original_inr)}</Text>
                <Text style={s.priceSA}>{fmtINR(course.pricing.sa_inr)}</Text>
                <Text style={s.priceDiscNote}>
                  {course.pricing.sa_discount_percent}% SA discount
                </Text>
              </View>
            ) : (
              <Text style={s.priceSA}>{fmtINR(course.pricing.original_inr)}</Text>
            )}
          </View>
          <Pressable onPress={onEnroll} style={s.enrollBtn}>
            <Text style={s.enrollBtnText}>Enroll</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MetaTag({ text }: { text: string }) {
  return (
    <View style={s.metaTag}>
      <Text style={s.metaTagText}>{text}</Text>
    </View>
  );
}

function PriceBadge({ type }: { type: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    free: { label: 'FREE', color: '#059669' },
    free_audit: { label: 'FREE AUDIT', color: '#0891B2' },
    free_with_sa: { label: 'FREE · SA', color: '#059669' },
    paid: { label: 'PAID', color: '#7C3AED' },
    discounted_for_sa: { label: 'SA DEAL', color: '#DB2777' },
    subscription: { label: 'SUBSCRIPTION', color: '#D97706' },
  };
  const c = cfg[type] || cfg.paid;
  return (
    <View style={[s.priceBadge, { backgroundColor: c.color }]}>
      <Text style={s.priceBadgeText}>{c.label}</Text>
    </View>
  );
}

function CertBadge({ cert }: { cert: Course['certification'] }) {
  const free = cert.free;
  const recognised = cert.recognised;
  let label = 'Certificate of completion';
  let bg = L.accentBg;
  let fg = L.accentText;
  if (free && recognised) {
    label = 'Free industry-recognised certificate';
    bg = '#ECFDF5'; fg = '#047857';
  } else if (free) {
    label = 'Free certificate of completion';
    bg = '#ECFDF5'; fg = '#047857';
  } else if (recognised) {
    label = `Industry cert · ${fmtINR(cert.cost_inr)}`;
    bg = '#FFFBEB'; fg = '#B45309';
  } else {
    label = `Certificate · ${fmtINR(cert.cost_inr)}`;
  }
  return (
    <View style={[s.certBadge, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name="certificate" size={13} color={fg} />
      <Text style={[s.certBadgeText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ─── Removable Chip helper ─────────────────────────────────── */
function RemovableChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <Pressable onPress={onClear} style={s.removableChip}>
      <Text style={s.removableChipText}>{label}</Text>
      <MaterialCommunityIcons name="close" size={11} color={L.accentText} />
    </Pressable>
  );
}

/* ─── Filter Sheet (right-side drawer modal) ───────────────── */
function FilterSheet({
  visible, onClose,
  levelFilter, setLevelFilter,
  durationFilter, setDurationFilter,
  languageFilter, setLanguageFilter,
  providerFilter, setProviderFilter,
  hasMentorFilter, setHasMentorFilter,
  hasCertFilter, setHasCertFilter,
  languageOptions, providerOptions, onClearAll,
}: any) {
  const chipInactive = { backgroundColor: L.pillBg, borderColor: L.border };
  const chipActive = { backgroundColor: L.accent, borderColor: L.accent };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={s.sheetBackdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={s.sheetPanel}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Refine results</Text>
            <Pressable onPress={onClose} style={s.sheetCloseBtn}>
              <MaterialCommunityIcons name="close" size={18} color={L.text} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 22 }}>
            {/* Level */}
            <View style={s.filterGroup}>
              <Text style={s.filterGroupLabel}>Level</Text>
              <View style={s.filterChipRow}>
                {LEVEL_OPTIONS.map((lv) => {
                  const active = levelFilter === lv;
                  return (
                    <Pressable key={lv} onPress={() => setLevelFilter(lv)}
                      style={[s.filterChoice, active ? chipActive : chipInactive]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : L.text2 }]}>
                        {lv === 'all' ? 'All levels' : lv}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Duration */}
            <View style={s.filterGroup}>
              <Text style={s.filterGroupLabel}>Duration</Text>
              <View style={s.filterChipRow}>
                {(Object.keys(DURATION_LABELS) as Array<keyof typeof DURATION_LABELS>).map((d) => {
                  const active = durationFilter === d;
                  return (
                    <Pressable key={d} onPress={() => setDurationFilter(d)}
                      style={[s.filterChoice, active ? chipActive : chipInactive]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : L.text2 }]}>
                        {DURATION_LABELS[d]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Language */}
            <View style={s.filterGroup}>
              <Text style={s.filterGroupLabel}>Language</Text>
              <View style={s.filterChipRow}>
                {(languageOptions || []).slice(0, 12).map((lang: string) => {
                  const active = languageFilter === lang;
                  return (
                    <Pressable key={lang} onPress={() => setLanguageFilter(lang)}
                      style={[s.filterChoice, active ? chipActive : chipInactive]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : L.text2 }]}>
                        {lang === 'all' ? 'Any' : lang}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Provider */}
            <View style={s.filterGroup}>
              <Text style={s.filterGroupLabel}>Provider / University</Text>
              <View style={s.filterChipRow}>
                {(providerOptions || []).slice(0, 16).map((p: string) => {
                  const active = providerFilter === p;
                  return (
                    <Pressable key={p} onPress={() => setProviderFilter(p)}
                      style={[s.filterChoice, active ? chipActive : chipInactive]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : L.text2 }]} numberOfLines={1}>
                        {p === 'all' ? 'Any' : p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Toggles */}
            <View style={s.filterGroup}>
              <Text style={s.filterGroupLabel}>Includes</Text>
              <Pressable onPress={() => setHasMentorFilter(!hasMentorFilter)}
                style={s.filterToggleRow}>
                <View style={[s.toggleSwitch,
                  { backgroundColor: hasMentorFilter ? L.accent : '#CBD5E1' }]}>
                  <View style={[s.toggleKnob, hasMentorFilter && { left: 18 }]} />
                </View>
                <Text style={s.filterToggleText}>Has mentor / live sessions</Text>
              </Pressable>
              <Pressable onPress={() => setHasCertFilter(!hasCertFilter)}
                style={s.filterToggleRow}>
                <View style={[s.toggleSwitch,
                  { backgroundColor: hasCertFilter ? L.accent : '#CBD5E1' }]}>
                  <View style={[s.toggleKnob, hasCertFilter && { left: 18 }]} />
                </View>
                <Text style={s.filterToggleText}>Offers a certificate</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={s.sheetFooter}>
            <Pressable onPress={onClearAll} style={s.sheetClearBtn}>
              <Text style={s.sheetClearText}>Reset</Text>
            </Pressable>
            <Pressable onPress={onClose} style={s.sheetApplyBtn}>
              <Text style={s.sheetApplyText}>Apply filters</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── Enroll Modal ──────────────────────────────────────────── */
function EnrollModal({ course, onClose }:
  { course: Course | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setBusy(false); setDone(null); setErr(null); }, [course]);

  const handleEnroll = async () => {
    if (!course) return;
    setBusy(true); setErr(null);
    try {
      const r = await request<any>('/courses/enroll', {
        method: 'POST', body: { course_id: course.id },
      });
      setDone(r.enrollment);
    } catch (e: any) {
      setErr(e?.message || 'Could not enroll. Try again.');
    } finally { setBusy(false); }
  };

  const openExternal = () => {
    if (!course) return;
    const url = course.enroll_url;
    if (url.startsWith('http')) Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal visible={!!course} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.enrollSheet}>
          {course && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.enrollHeader}>
                <ProviderLogo provider={course.provider.name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={s.enrollTitle} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={s.enrollProvider}>
                    {course.provider.name} · {course.duration_label}
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={20} color={L.text2} />
                </Pressable>
              </View>

              <Text style={s.enrollDesc}>{course.short_desc}</Text>

              <View style={s.enrollFacts}>
                <Fact icon="signal-cellular-3" v={course.level} />
                <Fact icon="translate" v={course.language} />
                <Fact icon="clock-outline" v={course.duration_label} />
                <Fact icon="account-multiple"
                       v={`${fmtCount(course.enrolled_count)} enrolled`} />
                <Fact icon="star" v={`${course.rating} (${fmtCount(course.review_count)})`} />
              </View>

              {course.certification.available && (
                <CertBadge cert={course.certification} />
              )}

              {!done && !err && (
                <>
                  <View style={s.enrollPriceBox}>
                    {course.pricing.type === 'discounted_for_sa' ? (
                      <>
                        <Text style={s.enrollPriceOrig}>
                          {fmtINR(course.pricing.original_inr)}
                        </Text>
                        <Text style={s.enrollPriceSA}>
                          {fmtINR(course.pricing.sa_inr)}
                        </Text>
                        <Text style={s.enrollPriceNote}>
                          {course.pricing.sa_discount_percent}% SA exclusive discount
                        </Text>
                      </>
                    ) : course.pricing.type.startsWith('free') ? (
                      <>
                        <Text style={[s.enrollPriceSA, { color: L.priceFree }]}>FREE</Text>
                        {(course.pricing.original_inr || 0) > 0 && (
                          <Text style={s.enrollPriceNote}>
                            ₹{(course.pricing.original_inr || 0).toLocaleString('en-IN')} value
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={s.enrollPriceSA}>
                        {fmtINR(course.pricing.original_inr)}
                      </Text>
                    )}
                  </View>

                  <Pressable onPress={handleEnroll} disabled={busy}
                    style={[s.enrollCTA, { opacity: busy ? 0.7 : 1 }]}>
                    {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <MaterialCommunityIcons name="rocket-launch"
                          size={14} color="#fff" />
                        <Text style={s.enrollCTAText}>
                          Enroll & Save to My Learning
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {err && (
                <View style={s.errBox}>
                  <MaterialCommunityIcons name="alert-circle" size={13} color="#EF4444" />
                  <Text style={s.errText}>{err}</Text>
                </View>
              )}

              {done && (
                <View style={s.successBox}>
                  <MaterialCommunityIcons name="check-decagram" size={32} color="#10B981" />
                  <Text style={s.successTitle}>You're enrolled!</Text>
                  <Text style={s.successSub}>
                    Saved to My Learning · ID {done.enrollment_id}
                  </Text>
                  <Pressable onPress={openExternal} style={s.successCTA}>
                    <MaterialCommunityIcons name="open-in-new" size={14} color="#fff" />
                    <Text style={s.successCTAText}>Open course on {course.provider.name}</Text>
                  </Pressable>
                  <Pressable onPress={onClose} style={s.successDismiss}>
                    <Text style={s.successDismissText}>Done</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Fact({ icon, v }: { icon: IconName; v: string }) {
  return (
    <View style={s.factCell}>
      <MaterialCommunityIcons name={icon} size={11} color={L.text3} />
      <Text style={s.factText}>{v}</Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────── */
const s = StyleSheet.create({
  statsPills: { flexDirection: 'row', gap: 6 },
  statPillFree: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 },
  statPillValFree: { color: '#047857', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  statPillLblFree: { color: '#047857', fontFamily: 'DMSans_700Bold', fontSize: 10 },
  statPillAmber: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1 },
  statPillValAmber: { color: '#B45309', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  statPillLblAmber: { color: '#B45309', fontFamily: 'DMSans_700Bold', fontSize: 10 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 52, borderRadius: 14,
    borderWidth: 1, marginTop: 4,
    backgroundColor: L.card, borderColor: L.pillBorder },
  searchInput: { flex: 1, fontFamily: 'DMSans_500Medium',
    fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },

  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingText: { color: L.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  /* Events-style filter pill (category, pricing, filters, sort) */
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  pillText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  pillCount: { paddingHorizontal: 6, height: 16, minWidth: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  pillCountText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  /* Filter status banner */
  filterStatus: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    backgroundColor: L.accentBg, borderColor: L.accentBorder },
  filterStatusText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12,
    color: L.accentText, flex: 1 },
  filterStatusClear: { color: L.accent, fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },

  /* Large reset button (empty state) */
  clearBtnLarge: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 999, backgroundColor: L.accent,
    ...({ cursor: 'pointer' } as any) },
  clearBtnLargeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },

  /* Career tracks strip */
  tracksStrip: { gap: 10, marginTop: 4 },
  kicker: { color: L.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, letterSpacing: 1.2 },
  tracksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trackChip: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  trackChipText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  trackChipMeta: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)' },
  trackChipMetaText: { color: '#334155', fontFamily: 'DMSans_700Bold', fontSize: 10 },

  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, backgroundColor: L.pillBg, borderColor: L.border,
    ...({ cursor: 'pointer' } as any) },
  clearBtnText: { color: L.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  pricingFilters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },

  /* Sort dropdown */
  sortMenu: { position: 'absolute', top: 38, right: 0,
    minWidth: 180, borderRadius: 12,
    borderWidth: 1, padding: 6, backgroundColor: L.card, borderColor: L.border,
    ...({ boxShadow: '0 12px 40px rgba(15,23,42,0.16)', zIndex: 1000 } as any) },
  sortItem: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 9,
    borderRadius: 8, ...({ cursor: 'pointer' } as any) },
  sortItemActive: { backgroundColor: '#EDE9FE' },
  sortItemText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },

  /* Active filter chips row */
  activeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  removableChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, backgroundColor: '#EDE9FE', borderColor: '#DDD6FE',
    ...({ cursor: 'pointer' } as any) },
  removableChipText: { color: L.accentText, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Search autocomplete dropdown */
  acDropdown: { position: 'absolute', top: 56, left: 0, right: 0,
    borderRadius: 14, borderWidth: 1,
    padding: 12, gap: 14, backgroundColor: L.card, borderColor: L.border,
    ...({ boxShadow: '0 16px 48px rgba(15,23,42,0.16)', zIndex: 999 } as any) },
  acSection: { gap: 6 },
  acHeader: { color: L.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  acRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10,
    ...({ cursor: 'pointer' } as any) },
  acTitle: { fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  acMeta: { color: L.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  acProviderChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' },
  acProviderText: { color: L.accentText, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Filter Sheet */
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end', alignItems: 'flex-end' },
  sheetPanel: { width: 420, maxWidth: '100%', height: '100%',
    borderLeftWidth: 1, borderColor: L.border,
    backgroundColor: L.card, flexDirection: 'column' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: L.border },
  sheetTitle: { color: L.text, fontFamily: 'DMSans_800ExtraBold', fontSize: 18, flex: 1 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 999,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  filterGroup: { gap: 10 },
  filterGroupLabel: { color: L.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChoice: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  filterChoiceText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  filterToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, ...({ cursor: 'pointer' } as any) },
  toggleSwitch: { width: 36, height: 20, borderRadius: 999,
    justifyContent: 'center', paddingHorizontal: 2, position: 'relative' },
  toggleKnob: { width: 16, height: 16, borderRadius: 999,
    backgroundColor: '#fff', position: 'absolute', top: 2, left: 2 },
  filterToggleText: { color: L.text, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  sheetFooter: { flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: L.border },
  sheetClearBtn: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999,
    borderWidth: 1, backgroundColor: '#F1F5F9', borderColor: L.border,
    ...({ cursor: 'pointer' } as any) },
  sheetClearText: { color: L.text2, fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  sheetApplyBtn: { flex: 1, paddingVertical: 11, borderRadius: 999,
    backgroundColor: L.accent, alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  sheetApplyText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },

  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { color: L.text, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 14, marginTop: 6 },
  emptySub: { color: L.text3, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  /* Course Card */
  courseCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  courseTopRow: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10,
    gap: 8 },
  providerStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1,
    minWidth: 0 },
  providerName: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: L.text2,
    flex: 1 },
  priceBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 5 },
  priceBadgeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9.5, letterSpacing: 0.6 },
  sourceBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5,
    backgroundColor: L.accentBg, borderWidth: 1, borderColor: L.accentBorder },
  sourceBadgeText: { color: L.accentText, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9, letterSpacing: 0.4 },

  courseTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15, lineHeight: 20 },
  courseInstructor: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: L.text3 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  featuredBadgeText: { color: '#B45309', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 8.5, letterSpacing: 0.4 },

  metaTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5,
    backgroundColor: '#F1F5F9' },
  metaTagText: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5, color: L.text2 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12, color: L.text },
  ratingCount: { fontFamily: 'DMSans_500Medium', fontSize: 10.5, color: L.text3 },
  enrolledText: { fontFamily: 'DMSans_700Bold', fontSize: 10.5, color: L.text3 },

  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  certBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 11, flex: 1 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  smartTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
    borderWidth: 1 },
  smartTagText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5,
    letterSpacing: 0.4 },
  smartTagNeutral: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
    borderWidth: 1, backgroundColor: '#F1F5F9', borderColor: L.border },
  smartTagNeutralText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5,
    color: L.text2 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 4, gap: 8 },
  priceFree: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  priceOrig: { fontFamily: 'DMSans_500Medium',
    fontSize: 11, color: L.text3, textDecorationLine: 'line-through' },
  priceSA: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: L.accent },
  priceDiscNote: { fontFamily: 'DMSans_700Bold', fontSize: 9.5,
    color: L.pricePaid, marginTop: 1 },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 34, borderRadius: 999,
    backgroundColor: L.accent, justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  enrollBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },

  /* Modal */
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 16, backgroundColor: 'rgba(15,23,42,0.45)' },
  enrollSheet: { width: '100%', maxWidth: 540, maxHeight: '92%',
    borderRadius: 18, padding: 18, borderWidth: 1, borderColor: L.border,
    backgroundColor: L.card,
    ...({ boxShadow: '0 24px 60px rgba(15,23,42,0.25)' } as any) },
  enrollHeader: { flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 12 },
  enrollTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: L.text },
  enrollProvider: { fontFamily: 'DMSans_500Medium', fontSize: 12,
    color: L.text3, marginTop: 2 },
  enrollDesc: { fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 18,
    color: L.text2, marginVertical: 10 },
  enrollFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginBottom: 12 },
  factCell: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#F1F5F9' },
  factText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: L.text2 },

  enrollPriceBox: { padding: 14, borderRadius: 12, marginTop: 12,
    borderWidth: 1, backgroundColor: L.accentBg,
    borderColor: L.accentBorder, alignItems: 'center' },
  enrollPriceOrig: { fontFamily: 'DMSans_500Medium', fontSize: 13,
    color: L.text3, textDecorationLine: 'line-through' },
  enrollPriceSA: { fontFamily: 'DMSans_800ExtraBold', fontSize: 28,
    color: L.accent, marginTop: 2 },
  enrollPriceNote: { fontFamily: 'DMSans_700Bold', fontSize: 11,
    color: L.pricePaid, marginTop: 4 },

  enrollCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 46, borderRadius: 12, backgroundColor: L.accent,
    marginTop: 12, ...({ cursor: 'pointer' } as any) },
  enrollCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5 },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)', borderWidth: 1, marginTop: 12 },
  errText: { color: '#EF4444', fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },

  successBox: { alignItems: 'center', paddingVertical: 14, gap: 4 },
  successTitle: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 18, color: L.text, marginTop: 8 },
  successSub: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: L.text2 },
  successCTA: { flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, height: 42, borderRadius: 10,
    backgroundColor: L.accent, marginTop: 14,
    ...({ cursor: 'pointer' } as any) },
  successCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },
  successDismiss: { paddingVertical: 10, ...({ cursor: 'pointer' } as any) },
  successDismissText: { color: L.text3, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  /* Bottom nav (mobile) */
  bottomNav: {
    position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1, borderTopColor: L.border,
    paddingHorizontal: 8,
    ...({ backdropFilter: 'blur(12px)', zIndex: 60 } as any),
  },
  bottomNavInner: { flexDirection: 'row', justifyContent: 'space-around',
    alignItems: 'center', flex: 1 },
  bottomNavItem: {
    alignItems: 'center', justifyContent: 'center', gap: 3, flex: 1,
    ...({ cursor: 'pointer' } as any),
  },
  bottomNavLabel: { fontSize: 10, fontWeight: '700' },
});

/* Responsive card cell — 3-col desktop / 2-col tablet / 1-col phone */
function cardCell(n: number) {
  return {
    flexGrow: 1,
    flexBasis: `${Math.max(100 / n - 1.5, 20).toFixed(2)}%`,
  };
}
