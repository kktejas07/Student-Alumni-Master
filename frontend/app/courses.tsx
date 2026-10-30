/**
 * /courses — SA Courses (Learning Marketplace) landing.
 * Matches screenshot: search + 2 hero cards + 3 sections × 8 sub-categories.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, TextInput, Modal, Linking, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import { AnimatedCard, FAB } from '@/src/views/web/md3';
import CareerTrackInline from '@/src/views/web/courses/CareerTrackInline';
import CourseDetailDrawer from '@/src/views/web/courses/CourseDetailDrawer';
import AICourseAdvisor from '@/src/views/web/courses/AICourseAdvisor';
import { request } from '@/src/models/services/api';
import { StudentPortalNavContext } from '@/src/views/web/portals/student/StudentPortalNavContext';
import { useTheme } from '@/src/theme/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type SubCat = { key: string; label: string; icon: IconName;
                count: number; highlighted?: boolean };
type Section = { id: string; emoji: string; name: string;
                  color: string; items: SubCat[] };
type Hero = { id: string; emoji: string; title: string; subtitle: string;
               cta_label: string; cta_href: string;
               from: string; to: string };

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

const C = {
  text: '#fff', text2: 'rgba(255,255,255,0.72)', text3: 'rgba(255,255,255,0.46)',
  border: 'rgba(255,255,255,0.10)', card: 'rgba(255,255,255,0.04)',
};

const TAG_META: Record<string, { label: string; color: string }> = {
  FREE:               { label: 'FREE',             color: '#10B981' },
  FREE_CERT:          { label: 'FREE CERT',        color: '#10B981' },
  TOP_RATED:          { label: 'TOP-RATED',        color: '#F59E0B' },
  TRENDING:           { label: 'TRENDING',         color: '#EF4444' },
  NEW:                { label: 'NEW',              color: '#06B6D4' },
  GOVT_CERTIFIED:     { label: 'GOVT-CERTIFIED',   color: '#6366F1' },
  IVY_LEAGUE:         { label: 'IVY LEAGUE',       color: '#A78BFA' },
  QUICK_WIN:          { label: 'QUICK WIN',        color: '#F59E0B' },
  BEGINNER_FRIENDLY:  { label: 'BEGINNER FRIENDLY',color: '#14B8A6' },
  JOB_READY:          { label: 'JOB-READY',        color: '#EC4899' },
  HAS_MENTOR:         { label: 'HAS MENTOR',       color: '#22D3EE' },
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

const fmtINR = (n?: number) => '₹' + (n || 0).toLocaleString('en-IN');
const fmtCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(n);
};

export default function CoursesPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);
  const studentNav = React.useContext(StudentPortalNavContext);

  const colors = useMemo(() => ({
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255, 255, 255, 0.72)' : '#475569',
    text3: isDark ? 'rgba(255, 255, 255, 0.46)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    card: isDark ? '#261944' : '#FFFFFF',
    cardBorder: isDark ? '#3D2D5C' : '#E2E8F0',
    sectionCard: isDark ? 'rgba(67, 41, 109, 0.40)' : '#FFFFFF',
    sectionBorder: isDark ? '#3D2D5C' : '#E2E8F0',
    searchBg: isDark ? '#261944' : '#FFFFFF',
    searchBorder: isDark ? '#3D2D5C' : '#CBD5E1',
    pillBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
    pillBorder: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    pillText: isDark ? 'rgba(255, 255, 255, 0.72)' : '#475569',
    dropdownBg: isDark ? '#221538' : '#FFFFFF',
    sheetBg: isDark ? '#1A0F2E' : '#FFFFFF',
    modalBg: isDark ? '#13031F' : '#FFFFFF',
    modalBackdrop: isDark ? 'rgba(7, 2, 15, 0.78)' : 'rgba(15, 23, 42, 0.60)',
  }), [isDark]);

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
  const [hero, setHero] = useState<Hero[]>([]);
  const [stats, setStats] = useState({ total_courses: 0, free_courses: 0,
                                        paid_courses: 0, free_certs: 0 });
  const [tracksMeta, setTracksMeta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');     // 'all' | section.id
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);   // subcategory key
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  // Advanced filter state (P1(a))
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [hasMentorFilter, setHasMentorFilter] = useState<boolean>(false);
  const [hasCertFilter, setHasCertFilter] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest' | 'free' | 'shortest'>('popular');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Search autocomplete (P1(b))
  const [searchFocused, setSearchFocused] = useState(false);
  const [enrollFor, setEnrollFor] = useState<Course | null>(null);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [activeTrackSlug, setActiveTrackSlug] = useState<string | null>(null);
  const [featured, setFeatured] = useState<Course[]>([]);
  const [trendingFree, setTrendingFree] = useState<Course[]>([]);
  const [topUni, setTopUni] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [myTracks, setMyTracks] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [r, allList, enrolls, tracksRes, certs] = await Promise.all([
        request<any>('/courses/catalog'),
        request<any>('/courses/list?sort=popular'),
        request<any>('/courses/my-enrollments').catch(() => ({ enrollments: [] })),
        request<any>('/courses/my-tracks').catch(() => ({ enrollments: [] })),
        request<any>('/courses/my-certificates').catch(() => ({ certificates: [] })),
      ]);
      setMyEnrollments(enrolls?.enrollments || []);
      setMyTracks(tracksRes?.enrollments || []);
      setMyCertificates(certs?.certificates || []);
      setSections(r.sections || []);
      setHero(r.hero || []);
      setStats(r.stats || stats);
      setTracksMeta(r.tracks || []);
      const all: Course[] = allList.courses || [];
      setAllCourses(all);
      // Featured: featured flag OR rating >= 4.8
      setFeatured(all.filter(c => c.featured || c.rating >= 4.8).slice(0, 10));
      // Trending free: free pricing types with high enrollment
      setTrendingFree(
        all.filter(c => ['free', 'free_audit', 'free_with_sa'].includes(c.pricing.type))
           .sort((a, b) => b.enrolled_count - a.enrolled_count)
           .slice(0, 10));
      // Top universities: provider type=university
      setTopUni(all.filter(c => c.provider.type === 'university')
                   .sort((a, b) => b.rating - a.rating)
                   .slice(0, 10));
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
      const blob = `${c.title} ${c.short_desc} ${c.provider.name} ${c.instructors.join(' ')} ${(c.tags || []).join(' ')}`.toLowerCase();
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

  // Filtered carousels (re-derive when filters change)
  const fFeatured = useMemo(
    () => featured.filter(filterCourse),
    [featured, filterCourse]
  );
  const fTrendingFree = useMemo(
    () => trendingFree.filter(filterCourse),
    [trendingFree, filterCourse]
  );
  const fTopUni = useMemo(
    () => topUni.filter(filterCourse),
    [topUni, filterCourse]
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

  // The visible sections (parent categories) based on active category
  const visibleSections = useMemo(() => {
    if (activeCategory === 'all') return sections;
    return sections.filter((s) => s.id === activeCategory);
  }, [sections, activeCategory]);

  return (
    <FeaturePageShell
      title="Courses"
      subtitle="Skill up with curated tracks, free certifications & expert mentors."
      heroEmoji="🎓"
      accent="#7C3AED"
      rightSlot={
        <View style={s.statsPills}>
          <View style={s.statPill}>
            <Text style={s.statPillVal}>{stats.free_courses}</Text>
            <Text style={s.statPillLbl}>Free</Text>
          </View>
          <View style={[s.statPill, { borderColor: 'rgba(245,158,11,0.4)',
                                       backgroundColor: 'rgba(245,158,11,0.12)' }]}>
            <Text style={[s.statPillVal, { color: '#FCD34D' }]}>{stats.free_certs}</Text>
            <Text style={[s.statPillLbl, { color: '#FCD34D' }]}>Free certs</Text>
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
        <View style={[s.searchBox, { backgroundColor: colors.searchBg, borderColor: colors.searchBorder }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.text3} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search courses, skills, instructors…"
            placeholderTextColor={colors.text3}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={colors.text3} />
            </Pressable>
          )}
        </View>
        {/* Autocomplete dropdown */}
        {searchFocused && searchSuggestions && (
          (searchSuggestions.courses.length > 0 ||
            searchSuggestions.skills.length > 0 ||
            searchSuggestions.providers.length > 0) ? (
          <View style={[s.acDropdown, { backgroundColor: colors.dropdownBg, borderColor: colors.border }]}>
            {searchSuggestions.courses.length > 0 && (
              <View style={s.acSection}>
                <Text style={[s.acHeader, { color: colors.text3 }]}>Courses</Text>
                {searchSuggestions.courses.map((c) => (
                  <Pressable key={c.id}
                    onPress={() => { setEnrollFor(c); setSearch(''); }}
                    style={s.acRow}>
                    <Text style={{ fontSize: 18 }}>{c.thumbnail}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.acTitle, { color: colors.text }]} numberOfLines={1}>{c.title}</Text>
                      <Text style={[s.acMeta, { color: colors.text3 }]} numberOfLines={1}>
                        {c.provider.name} · {c.duration_label}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-top-left" size={13} color={colors.text3} />
                  </Pressable>
                ))}
              </View>
            )}
            {searchSuggestions.skills.length > 0 && (
              <View style={s.acSection}>
                <Text style={[s.acHeader, { color: colors.text3 }]}>Skills</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {searchSuggestions.skills.map((sk) => {
                    const m = TAG_META[sk];
                    return (
                      <Pressable key={sk}
                        onPress={() => setSearch(sk.toLowerCase().replace(/_/g, ' '))}
                        style={[s.smartTag,
                          { backgroundColor: (m?.color || '#A78BFA') + (isDark ? '22' : '15'),
                            borderColor: (m?.color || '#A78BFA') + (isDark ? '55' : '40') }]}>
                        <Text style={[s.smartTagText, { color: m?.color || '#7C3AED' }]}>
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
                <Text style={[s.acHeader, { color: colors.text3 }]}>Providers</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {searchSuggestions.providers.map((p) => (
                    <Pressable key={p}
                      onPress={() => { setProviderFilter(p); setSearch(''); }}
                      style={[s.acProviderChip, {
                        backgroundColor: isDark ? 'rgba(167,139,250,0.10)' : '#EDE9FE',
                        borderColor: isDark ? 'rgba(167,139,250,0.30)' : '#DDD6FE',
                      }]}>
                      <MaterialCommunityIcons name="school-outline" size={11} color={isDark ? '#A78BFA' : '#7C3AED'} />
                      <Text style={[s.acProviderText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
          ) : null
        )}
      </View>

      {/* Hero Row */}
      <View style={s.heroRow}>
        {hero.map((h, i) => (
          <Pressable key={h.id}
            onPress={() => {
              // No navigation — keep within embedded shell
              if (h.id === 'free-this-month') {
                setPricingFilter('free');
                setActiveCategory('all');
                setActiveSubcat(null);
              } else if (h.id === 'ai-career-track') {
                // Open inline career track view
                setActiveTrackSlug('ai-career-track');
              }
            }}
            style={[s.heroCard, i === 0 ? { flex: 2 } : { flex: 1 }]}>
            <LinearGradient
              colors={[h.from, h.to]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.heroBlur1} />
            <View style={s.heroIconCircle}>
              <Text style={{ fontSize: 22 }}>{h.emoji}</Text>
            </View>
            <Text style={s.heroTitle}>{h.title}</Text>
            <Text style={s.heroSub} numberOfLines={2}>{h.subtitle}</Text>
            <View style={s.heroCta}>
              <Text style={s.heroCtaText}>{h.cta_label}</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color="#fff" />
            </View>
          </Pressable>
        ))}
      </View>

      {/* Loading state for catalog */}
      {loading && sections.length === 0 ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#A78BFA" />
          <Text style={[s.loadingText, { color: colors.text2 }]}>Loading curated catalog…</Text>
        </View>
      ) : null}

      {/* Primary Category tab strip (events-style — solid filled when active) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {[{ id: 'all', label: 'All', icon: 'view-grid' as IconName, color: '#7C3AED' },
          ...sections.map((sec) => ({
            id: sec.id, label: sec.name,
            icon: (sec.id === 'tech' ? 'laptop' :
                   sec.id === 'design' ? 'palette' :
                   sec.id === 'business' ? 'briefcase' : 'school') as IconName,
            color: sec.id === 'tech' ? '#06B6D4' :
                   sec.id === 'design' ? '#EC4899' :
                   sec.id === 'business' ? '#F59E0B' : '#7C3AED',
          }))].map((cat) => {
          const active = activeCategory === cat.id;
          // Compute count for this category
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
                { backgroundColor: active ? cat.color : colors.pillBg,
                  borderColor: active ? cat.color : colors.pillBorder }]}>
              <MaterialCommunityIcons name={cat.icon} size={14}
                color={active ? '#fff' : (isDark ? cat.color : (cat.color === '#A78BFA' ? '#7C3AED' : cat.color))} />
              <Text style={[s.pillText, { color: active ? '#fff' : colors.pillText }]}>
                {cat.label}
              </Text>
              {count > 0 && (
                <View style={[s.pillCount,
                  { backgroundColor: active ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(0,0,0,0.30)' : '#E2E8F0') }]}>
                  <Text style={[s.pillCountText, { color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.80)' : '#334155') }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sub-category strip (within active category — events-style) */}
      {activeCategory !== 'all' && (() => {
        const sec = sections.find((x) => x.id === activeCategory);
        if (!sec) return null;
        const accent = activeCategory === 'tech' ? '#06B6D4' :
                       activeCategory === 'design' ? '#EC4899' :
                       activeCategory === 'business' ? '#F59E0B' : '#7C3AED';
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
            <Pressable
              onPress={() => setActiveSubcat(null)}
              style={[s.pill,
                { backgroundColor: !activeSubcat ? accent : colors.pillBg,
                  borderColor: !activeSubcat ? accent : colors.pillBorder }]}>
              <MaterialCommunityIcons name="filter-variant" size={13}
                color={!activeSubcat ? '#fff' : accent} />
              <Text style={[s.pillText, { color: !activeSubcat ? '#fff' : colors.pillText }]}>
                All {sec.name}
              </Text>
            </Pressable>
            {sec.items.map((it) => {
              const active = activeSubcat === it.key;
              return (
                <Pressable key={it.key}
                  onPress={() => setActiveSubcat(active ? null : it.key)}
                  style={[s.pill,
                    { backgroundColor: active ? accent : colors.pillBg,
                      borderColor: active ? accent : colors.pillBorder }]}>
                  <MaterialCommunityIcons name={it.icon} size={13}
                    color={active ? '#fff' : accent} />
                  <Text style={[s.pillText, { color: active ? '#fff' : colors.pillText }]}>
                    {it.label}
                  </Text>
                  {it.count > 0 && (
                    <View style={[s.pillCount,
                      { backgroundColor: active ? 'rgba(255,255,255,0.25)' : (isDark ? 'rgba(0,0,0,0.30)' : '#E2E8F0') }]}>
                      <Text style={[s.pillCountText, { color: active ? '#fff' : (isDark ? 'rgba(255,255,255,0.80)' : '#334155') }]}>
                        {it.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        );
      })()}

      {/* Pricing pill row (events-style) + Sort + Filters · N */}
      <View style={s.pricingFilters}>
        {(['all', 'free', 'paid'] as const).map((p) => {
          const active = pricingFilter === p;
          const lbl = p === 'all' ? 'All pricing' : p === 'free' ? 'Free / Free Cert' : 'Paid (with SA discount)';
          const icon: IconName = p === 'all' ? 'cash-multiple' :
                                  p === 'free' ? 'gift' : 'currency-inr';
          return (
            <Pressable key={p} onPress={() => setPricingFilter(p)}
              style={[s.pill,
                { backgroundColor: active ? '#7C3AED' : colors.pillBg,
                  borderColor: active ? '#7C3AED' : colors.pillBorder }]}>
              <MaterialCommunityIcons name={icon} size={13}
                color={active ? '#fff' : (isDark ? '#A78BFA' : '#7C3AED')} />
              <Text style={[s.pillText, { color: active ? '#fff' : colors.pillText }]}>
                {lbl}
              </Text>
            </Pressable>
          );
        })}

        {/* More filters trigger */}
        <Pressable onPress={() => setShowFilterSheet(true)}
          style={[s.pill,
            { backgroundColor: advancedFilterCount > 0 ? '#7C3AED' : colors.pillBg,
              borderColor: advancedFilterCount > 0 ? '#7C3AED' : colors.pillBorder }]}>
          <MaterialCommunityIcons name="tune-variant" size={13}
            color={advancedFilterCount > 0 ? '#fff' : (isDark ? '#A78BFA' : '#7C3AED')} />
          <Text style={[s.pillText, { color: advancedFilterCount > 0 ? '#fff' : colors.pillText }]}>
            Filters{advancedFilterCount > 0 ? ` · ${advancedFilterCount}` : ''}
          </Text>
        </Pressable>

        {/* Sort dropdown trigger */}
        <View>
          <Pressable onPress={() => setShowSortMenu(!showSortMenu)}
            style={[s.pill,
              { backgroundColor: sortBy !== 'popular' ? '#7C3AED' : colors.pillBg,
                borderColor: sortBy !== 'popular' ? '#7C3AED' : colors.pillBorder }]}>
            <MaterialCommunityIcons name="sort" size={13}
              color={sortBy !== 'popular' ? '#fff' : (isDark ? '#A78BFA' : '#7C3AED')} />
            <Text style={[s.pillText, { color: sortBy !== 'popular' ? '#fff' : colors.pillText }]}>
              Sort: {SORT_LABELS[sortBy]}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={12}
              color={sortBy !== 'popular' ? '#fff' : colors.text2} />
          </Pressable>
          {showSortMenu && (
            <View style={[s.sortMenu, { backgroundColor: colors.dropdownBg, borderColor: colors.border }]}>
              {(Object.keys(SORT_LABELS) as Array<keyof typeof SORT_LABELS>).map((k) => (
                <Pressable key={k}
                  onPress={() => { setSortBy(k); setShowSortMenu(false); }}
                  style={[s.sortItem, sortBy === k && (isDark ? s.sortItemActive : { backgroundColor: '#EDE9FE' })]}>
                  <Text style={[s.sortItemText, { color: sortBy === k ? (isDark ? '#C4B5FD' : '#6D28D9') : colors.text2 }]}>
                    {SORT_LABELS[k]}
                  </Text>
                  {sortBy === k && (
                    <MaterialCommunityIcons name="check" size={13} color={isDark ? '#A78BFA' : '#7C3AED'} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {filtersActive && (
          <Pressable onPress={clearAllFilters} style={[s.clearBtn, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="close" size={12} color={colors.text2} />
            <Text style={[s.clearBtnText, { color: colors.text2 }]}>Clear all</Text>
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
        <View style={[s.filterStatus, {
          backgroundColor: isDark ? 'rgba(167,139,250,0.08)' : '#F5F3FF',
          borderColor: isDark ? 'rgba(167,139,250,0.30)' : '#DDD6FE',
        }]}>
          <MaterialCommunityIcons name="filter-check" size={13} color={isDark ? '#A78BFA' : '#7C3AED'} />
          <Text style={[s.filterStatusText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
            Showing {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
            {activeCategory !== 'all' ? ` in ${sections.find(s=>s.id===activeCategory)?.name}` : ''}
            {activeSubcat ? ` › ${sections.find(s=>s.id===activeCategory)?.items.find(i=>i.key===activeSubcat)?.label}` : ''}
            {pricingFilter !== 'all' ? ` · ${pricingFilter}` : ''}
            {search.trim() ? ` · "${search.trim()}"` : ''}
          </Text>
        </View>
      )}

      {/* Personal Learning Carousels */}
      {!filtersActive && myEnrollments.length > 0 && (
        <Carousel title="📚 My Active Courses" subtitle="Pick up right where you left off"
                   accent="#06B6D4" courses={myEnrollments.map((e: any) => e.course_snapshot || allCourses.find((c: any) => c.id === e.course_id)).filter(Boolean)} onEnroll={setEnrollFor} />
      )}
      {!filtersActive && myCertificates.length > 0 && (
        <Carousel title="🏆 My Certificates" subtitle="Your earned credentials"
                   accent="#F59E0B" courses={myCertificates.map((c: any) => c.course_snapshot || allCourses.find((ac: any) => ac.id === c.course_id)).filter(Boolean)} onEnroll={() => {}} />
      )}

      {/* Carousels — Featured / Trending Free / Top Universities (filtered in-place) */}
      {fFeatured.length > 0 && (
        <Carousel title="✨ Featured this month" subtitle="Hand-picked by SA editors"
                   accent="#7C3AED" courses={fFeatured} onEnroll={setEnrollFor} />
      )}
      {fTrendingFree.length > 0 && (
        <Carousel title="🔥 Trending Free Courses"
                   subtitle="Most-enrolled this week — totally free"
                   accent="#10B981" courses={fTrendingFree} onEnroll={setEnrollFor} />
      )}
      {fTopUni.length > 0 && (
        <Carousel title="🎓 Top Universities" subtitle="MIT · Stanford · Harvard · IITs · IIMs · Yale"
                   accent="#F59E0B" courses={fTopUni} onEnroll={setEnrollFor} />
      )}

      {/* Per-section, per-subcategory course rows */}
      {visibleSections.map((sec) => {
        const sectionAccent =
          sec.id === 'tech' ? '#06B6D4' :
          sec.id === 'design' ? '#EC4899' :
          sec.id === 'business' ? '#F59E0B' : '#7C3AED';
        // Subcategory groups, filtered by active filters
        const subcatGroups = sec.items
          .filter((it) => !activeSubcat || it.key === activeSubcat)
          .map((it) => ({
            sub: it,
            courses: allCourses.filter(
              (c) => c.category === sec.id && c.subcategory === it.key && filterCourse(c)
            ),
          }))
          .filter((g) => g.courses.length > 0);

        if (subcatGroups.length === 0) return null;

        return (
          <View key={sec.id} style={[s.sectionCard, { backgroundColor: colors.sectionCard, borderColor: colors.sectionBorder }]}>
            <View style={s.sectionHeader}>
              <Text style={{ fontSize: 22 }}>{sec.emoji}</Text>
              <Text style={[s.sectionName, { color: colors.text }]}>{sec.name}</Text>
              <View style={[s.sectionCountPill,
                { backgroundColor: sectionAccent + (isDark ? '22' : '15'),
                  borderColor: sectionAccent + (isDark ? '55' : '40') }]}>
                <Text style={[s.sectionCountText, { color: sectionAccent }]}>
                  {subcatGroups.reduce((acc, g) => acc + g.courses.length, 0)} courses
                </Text>
              </View>
            </View>

            {subcatGroups.map(({ sub, courses }) => (
              <View key={sub.key} style={s.subcatBlock}>
                <View style={s.subcatHeader}>
                  <View style={[s.subcatIcon,
                    { backgroundColor: sectionAccent + (isDark ? '22' : '15'),
                      borderColor: sectionAccent + (isDark ? '55' : '40') }]}>
                    <MaterialCommunityIcons name={sub.icon} size={14}
                      color={sectionAccent} />
                  </View>
                  <Text style={[s.subcatTitle, { color: colors.text }]}>{sub.label}</Text>
                  <Text style={[s.subcatCountSmall, { color: colors.text3 }]}>
                    {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {!activeSubcat && (
                    <Pressable
                      onPress={() => {
                        setActiveCategory(sec.id);
                        setActiveSubcat(sub.key);
                      }}
                      style={[s.viewAllBtn, { backgroundColor: colors.pillBg }]}>
                      <Text style={[s.viewAllText, { color: sectionAccent }]}>
                        Filter
                      </Text>
                      <MaterialCommunityIcons name="filter-variant" size={11}
                        color={sectionAccent} />
                    </Pressable>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
                  {courses.map((c) => (
                    <MiniCourseCard key={c.id} course={c} accent={sectionAccent}
                      onEnroll={() => setEnrollFor(c)} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        );
      })}

      {/* Empty state when filters yield no results */}
      {filtersActive && filteredCourses.length === 0 && (
        <View style={s.emptyBox}>
          <MaterialCommunityIcons name="book-search" size={40} color={colors.text3} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No courses match these filters</Text>
          <Text style={[s.emptySub, { color: colors.text3 }]}>Try clearing or switching pricing tier</Text>
          <Pressable onPress={clearAllFilters} style={s.clearBtnLarge}>
            <Text style={s.clearBtnLargeText}>Reset filters</Text>
          </Pressable>
        </View>
      )}

      {/* Career tracks strip — visual only, opens advisor instead of navigating */}
      {!filtersActive && tracksMeta.length > 0 && (
        <View style={s.tracksStrip}>
          <Text style={[s.kicker, { color: colors.text3 }]}>CAREER TRACKS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {tracksMeta.map((t: any) => (
              <Pressable key={t.slug}
                onPress={() => setActiveTrackSlug(t.slug)}
                style={[s.trackChip, { borderColor: t.color + (isDark ? '66' : '40'),
                                        backgroundColor: t.color + (isDark ? '14' : '10') }]}>
                <MaterialCommunityIcons name="rocket-launch" size={14} color={t.color} />
                <Text style={[s.trackChipText, { color: t.color }]}>{t.title}</Text>
                <View style={[s.trackChipMeta, { backgroundColor: isDark ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[s.trackChipMetaText, { color: isDark ? 'rgba(255,255,255,0.80)' : '#334155' }]}>
                    {t.duration_weeks}w · {t.enrolled_count} learners
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* AI Advisor */}
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

      {/* AI Course Advisor floating widget */}
      <AICourseAdvisor open={advisorOpen} setOpen={setAdvisorOpen} onCourseClick={(c) => setDetailCourse(c)} />

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

      {/* MD3 Floating Action Button — quick "Find courses" search focus */}
      <FAB
        icon="brain"
        label="Course AI"
        color="#7C3AED"
        onPress={() => setAdvisorOpen(true)}
      />
    </FeaturePageShell>
  );
}

/* ─── Results Block ─────────────────────────────────────────── */
function ResultsBlock({ subcatLabel, searchQuery, pricing, onClear,
                         onPricingChange, loading, courses, onEnroll }:
  { subcatLabel?: string; searchQuery: string; pricing: 'all'|'free'|'paid';
    onClear: () => void; onPricingChange: (v: 'all'|'free'|'paid') => void;
    loading: boolean; courses: Course[]; onEnroll: (c: Course) => void }) {
  const { isDark } = useTheme();
  const colors = {
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255, 255, 255, 0.72)' : '#475569',
    text3: isDark ? 'rgba(255, 255, 255, 0.46)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    pillBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
  };

  return (
    <View style={s.resultsBlock}>
      <View style={s.resultsHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.resultsTitle, { color: colors.text }]}>
            {subcatLabel || (searchQuery ? `Results for "${searchQuery}"` : 'Filtered courses')}
          </Text>
          <Text style={[s.resultsCount, { color: colors.text3 }]}>
            {loading ? 'Loading…' : `${courses.length} courses found`}
          </Text>
        </View>
        <Pressable onPress={onClear} style={[s.clearBtn, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="close" size={12} color={colors.text2} />
          <Text style={[s.clearBtnText, { color: colors.text2 }]}>Clear filters</Text>
        </Pressable>
      </View>

      <View style={s.pricingFilters}>
        {(['all', 'free', 'paid'] as const).map((p) => {
          const active = pricing === p;
          const lbl = p === 'all' ? 'All' : p === 'free' ? 'Free / Free Cert' : 'Paid (with SA discount)';
          return (
            <Pressable key={p} onPress={() => onPricingChange(p)}
              style={[s.pricingChip,
                { backgroundColor: active ? (isDark ? '#7C3AED33' : '#EDE9FE') : colors.pillBg,
                  borderColor: active ? (isDark ? '#A78BFA' : '#7C3AED') : colors.border }]}>
              <Text style={[s.pricingChipText, { color: active ? (isDark ? '#C4B5FD' : '#6D28D9') : colors.text2 }]}>
                {lbl}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#7C3AED" />
        </View>
      ) : courses.length === 0 ? (
        <View style={s.emptyBox}>
          <MaterialCommunityIcons name="book-search" size={36} color={colors.text3} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>No courses match these filters</Text>
          <Text style={[s.emptySub, { color: colors.text3 }]}>Try clearing or switching pricing tier</Text>
        </View>
      ) : (
        <View style={s.cardGrid}>
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onEnroll={() => onEnroll(c)} />
          ))}
        </View>
      )}
    </View>
  );
}

/* ─── Course Card ───────────────────────────────────────────── */
function CourseCard({ course, onEnroll }:
  { course: Course; onEnroll: () => void }) {
  const { isDark } = useTheme();
  const isFree = ['free', 'free_audit', 'free_with_sa'].includes(course.pricing.type);
  const isDiscounted = course.pricing.type === 'discounted_for_sa';
  const tags = (course.tags || []).slice(0, 3);
  const colors = {
    cardBg: isDark ? '#261944' : '#FFFFFF',
    cardBorder: isDark ? '#3D2D5C' : '#E2E8F0',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255, 255, 255, 0.72)' : '#475569',
    text3: isDark ? 'rgba(255, 255, 255, 0.46)' : '#64748B',
    metaTagBg: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
  };

  return (
    <View style={[s.courseCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <View style={s.courseTopRow}>
        <View style={s.providerStrip}>
          <Text style={{ fontSize: 16 }}>{course.provider.logo}</Text>
          <Text style={[s.providerName, { color: colors.text2 }]} numberOfLines={1}>
            {course.provider.name}
          </Text>
        </View>
        <PriceBadge type={course.pricing.type} />
      </View>

      <View style={s.thumbnailBox}>
        <Text style={s.thumbnailEmoji}>{course.thumbnail}</Text>
      </View>

      <View style={{ padding: 14, gap: 8 }}>
        <Text style={[s.courseTitle, { color: colors.text }]} numberOfLines={2}>{course.title}</Text>
        <Text style={[s.courseInstructor, { color: colors.text3 }]} numberOfLines={1}>
          {course.instructors[0]} · {course.provider.name}
        </Text>

        <View style={s.metaTagRow}>
          <MetaTag text={course.level} />
          <MetaTag text={course.language} />
          <MetaTag text={course.duration_label} />
        </View>

        <View style={s.statsRow}>
          <MaterialCommunityIcons name="star" size={11} color="#F59E0B" />
          <Text style={[s.ratingText, { color: colors.text }]}>{course.rating}</Text>
          <Text style={[s.ratingCount, { color: colors.text3 }]}>({fmtCount(course.review_count)})</Text>
          <View style={{ flex: 1 }} />
          <MaterialCommunityIcons name="account-multiple" size={11} color={colors.text3} />
          <Text style={[s.enrolledText, { color: colors.text3 }]}>{fmtCount(course.enrolled_count)}</Text>
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
                    { backgroundColor: meta.color + (isDark ? '22' : '15'),
                      borderColor: meta.color + (isDark ? '55' : '40') }]}>
                  <Text style={[s.smartTagText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
              );
            })}
            {(course.tags || []).length > 3 && (
              <View style={[s.smartTag,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0' }]}>
                <Text style={[s.smartTagText, { color: colors.text2 }]}>
                  +{(course.tags || []).length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.priceRow}>
          <View>
            {isFree ? (
              <Text style={[s.priceFree, { color: isDark ? '#10B981' : '#059669' }]}>FREE</Text>
            ) : isDiscounted ? (
              <View>
                <Text style={[s.priceOrig, { color: colors.text3 }]}>{fmtINR(course.pricing.original_inr)}</Text>
                <Text style={[s.priceSA, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>{fmtINR(course.pricing.sa_inr)}</Text>
                <Text style={[s.priceDiscNote, { color: isDark ? '#FCD34D' : '#D97706' }]}>
                  {course.pricing.sa_discount_percent}% SA discount
                </Text>
              </View>
            ) : (
              <Text style={[s.priceSA, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>{fmtINR(course.pricing.original_inr)}</Text>
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
  const { isDark } = useTheme();
  return (
    <View style={[s.metaTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
      <Text style={[s.metaTagText, { color: isDark ? 'rgba(255,255,255,0.72)' : '#475569' }]}>{text}</Text>
    </View>
  );
}

function PriceBadge({ type }: { type: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    free: { label: 'FREE', color: '#10B981' },
    free_audit: { label: 'FREE AUDIT', color: '#06B6D4' },
    free_with_sa: { label: 'FREE · SA', color: '#10B981' },
    paid: { label: 'PAID', color: '#7C3AED' },
    discounted_for_sa: { label: 'SA DEAL', color: '#EC4899' },
    subscription: { label: 'SUBSCRIPTION', color: '#F59E0B' },
  };
  const c = cfg[type] || cfg.paid;
  return (
    <View style={[s.priceBadge, { backgroundColor: c.color }]}>
      <Text style={s.priceBadgeText}>{c.label}</Text>
    </View>
  );
}

function CertBadge({ cert }: { cert: Course['certification'] }) {
  const { isDark } = useTheme();
  const free = cert.free;
  const recognised = cert.recognised;
  let label = 'Certificate of completion';
  let bg = isDark ? 'rgba(124,58,237,0.14)' : '#F5F3FF';
  let fg = isDark ? '#C4B5FD' : '#6D28D9';
  if (free && recognised) {
    label = '✨ Free industry-recognised certificate';
    bg = isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5'; fg = isDark ? '#6EE7B7' : '#047857';
  } else if (free) {
    label = '✨ Free certificate of completion';
    bg = isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5'; fg = isDark ? '#6EE7B7' : '#047857';
  } else if (recognised) {
    label = `🏆 Industry cert · ${fmtINR(cert.cost_inr)}`;
    bg = isDark ? 'rgba(245,158,11,0.14)' : '#FFFBEB'; fg = isDark ? '#FCD34D' : '#B45309';
  } else {
    label = `🎖 Certificate · ${fmtINR(cert.cost_inr)}`;
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
  const { isDark } = useTheme();
  return (
    <Pressable onPress={onClear} style={[s.removableChip, {
      backgroundColor: isDark ? 'rgba(167,139,250,0.16)' : '#EDE9FE',
      borderColor: isDark ? 'rgba(167,139,250,0.40)' : '#DDD6FE',
    }]}>
      <Text style={[s.removableChipText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>{label}</Text>
      <MaterialCommunityIcons name="close" size={11} color={isDark ? '#C4B5FD' : '#6D28D9'} />
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
  const { isDark } = useTheme();
  const colors = {
    panelBg: isDark ? '#1A0F2E' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255, 255, 255, 0.72)' : '#475569',
    text3: isDark ? 'rgba(255, 255, 255, 0.46)' : '#64748B',
    pillBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
    closeBtnBg: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={s.sheetBackdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={[s.sheetPanel, { backgroundColor: colors.panelBg, borderColor: colors.border }]}>
          <View style={[s.sheetHeader, { borderColor: colors.border }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>Refine results</Text>
            <Pressable onPress={onClose} style={[s.sheetCloseBtn, { backgroundColor: colors.closeBtnBg }]}>
              <MaterialCommunityIcons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 22 }}>
            {/* Level */}
            <View style={s.filterGroup}>
              <Text style={[s.filterGroupLabel, { color: colors.text3 }]}>Level</Text>
              <View style={s.filterChipRow}>
                {LEVEL_OPTIONS.map((lv) => {
                  const active = levelFilter === lv;
                  return (
                    <Pressable key={lv} onPress={() => setLevelFilter(lv)}
                      style={[s.filterChoice,
                        { backgroundColor: active ? '#7C3AED' : colors.pillBg,
                          borderColor: active ? '#7C3AED' : colors.border }]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : colors.text2 }]}>
                        {lv === 'all' ? 'All levels' : lv}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Duration */}
            <View style={s.filterGroup}>
              <Text style={[s.filterGroupLabel, { color: colors.text3 }]}>Duration</Text>
              <View style={s.filterChipRow}>
                {(Object.keys(DURATION_LABELS) as Array<keyof typeof DURATION_LABELS>).map((d) => {
                  const active = durationFilter === d;
                  return (
                    <Pressable key={d} onPress={() => setDurationFilter(d)}
                      style={[s.filterChoice,
                        { backgroundColor: active ? '#7C3AED' : colors.pillBg,
                          borderColor: active ? '#7C3AED' : colors.border }]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : colors.text2 }]}>
                        {DURATION_LABELS[d]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Language */}
            <View style={s.filterGroup}>
              <Text style={[s.filterGroupLabel, { color: colors.text3 }]}>Language</Text>
              <View style={s.filterChipRow}>
                {(languageOptions || []).slice(0, 12).map((lang: string) => {
                  const active = languageFilter === lang;
                  return (
                    <Pressable key={lang} onPress={() => setLanguageFilter(lang)}
                      style={[s.filterChoice,
                        { backgroundColor: active ? '#7C3AED' : colors.pillBg,
                          borderColor: active ? '#7C3AED' : colors.border }]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : colors.text2 }]}>
                        {lang === 'all' ? 'Any' : lang}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Provider */}
            <View style={s.filterGroup}>
              <Text style={[s.filterGroupLabel, { color: colors.text3 }]}>Provider / University</Text>
              <View style={s.filterChipRow}>
                {(providerOptions || []).slice(0, 16).map((p: string) => {
                  const active = providerFilter === p;
                  return (
                    <Pressable key={p} onPress={() => setProviderFilter(p)}
                      style={[s.filterChoice,
                        { backgroundColor: active ? '#7C3AED' : colors.pillBg,
                          borderColor: active ? '#7C3AED' : colors.border }]}>
                      <Text style={[s.filterChoiceText, { color: active ? '#fff' : colors.text2 }]} numberOfLines={1}>
                        {p === 'all' ? 'Any' : p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Toggles */}
            <View style={s.filterGroup}>
              <Text style={[s.filterGroupLabel, { color: colors.text3 }]}>Includes</Text>
              <Pressable onPress={() => setHasMentorFilter(!hasMentorFilter)}
                style={s.filterToggleRow}>
                <View style={[s.toggleSwitch,
                  { backgroundColor: hasMentorFilter ? '#7C3AED' : (isDark ? 'rgba(255,255,255,0.10)' : '#CBD5E1') }]}>
                  <View style={[s.toggleKnob,
                    hasMentorFilter && { left: 18 }]} />
                </View>
                <Text style={[s.filterToggleText, { color: colors.text }]}>Has mentor / live sessions</Text>
              </Pressable>
              <Pressable onPress={() => setHasCertFilter(!hasCertFilter)}
                style={s.filterToggleRow}>
                <View style={[s.toggleSwitch,
                  { backgroundColor: hasCertFilter ? '#7C3AED' : (isDark ? 'rgba(255,255,255,0.10)' : '#CBD5E1') }]}>
                  <View style={[s.toggleKnob,
                    hasCertFilter && { left: 18 }]} />
                </View>
                <Text style={[s.filterToggleText, { color: colors.text }]}>Offers a certificate</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[s.sheetFooter, { borderColor: colors.border }]}>
            <Pressable onPress={onClearAll} style={[s.sheetClearBtn, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
              <Text style={[s.sheetClearText, { color: colors.text2 }]}>Reset</Text>
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
  const { isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const colors = {
    overlayBg: isDark ? 'rgba(7,2,15,0.78)' : 'rgba(15,23,42,0.60)',
    sheetBg: isDark ? '#13031F' : '#FFFFFF',
    border: isDark ? 'rgba(167,139,250,0.30)' : '#E2E8F0',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255, 255, 255, 0.72)' : '#475569',
    text3: isDark ? 'rgba(255, 255, 255, 0.46)' : '#64748B',
    factBg: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
  };

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
      <View style={[s.overlay, { backgroundColor: colors.overlayBg }]}>
        <View style={[s.enrollSheet, { backgroundColor: colors.sheetBg, borderColor: colors.border }]}>
          {course && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.enrollHeader}>
                <View style={s.enrollEmoji}>
                  <Text style={{ fontSize: 28 }}>{course.thumbnail}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.enrollTitle, { color: colors.text }]} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={[s.enrollProvider, { color: colors.text3 }]}>
                    {course.provider.name} · {course.duration_label}
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={20} color={colors.text2} />
                </Pressable>
              </View>

              <Text style={[s.enrollDesc, { color: colors.text2 }]}>{course.short_desc}</Text>

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
                  <View style={[s.enrollPriceBox, {
                    backgroundColor: isDark ? 'rgba(124,58,237,0.10)' : '#F5F3FF',
                    borderColor: isDark ? 'rgba(167,139,250,0.30)' : '#DDD6FE',
                  }]}>
                    {course.pricing.type === 'discounted_for_sa' ? (
                      <>
                        <Text style={[s.enrollPriceOrig, { color: colors.text3 }]}>
                          {fmtINR(course.pricing.original_inr)}
                        </Text>
                        <Text style={[s.enrollPriceSA, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
                          {fmtINR(course.pricing.sa_inr)}
                        </Text>
                        <Text style={[s.enrollPriceNote, { color: isDark ? '#FCD34D' : '#D97706' }]}>
                          {course.pricing.sa_discount_percent}% SA exclusive discount
                        </Text>
                      </>
                    ) : course.pricing.type.startsWith('free') ? (
                      <>
                        <Text style={[s.enrollPriceSA, { color: isDark ? '#10B981' : '#059669' }]}>FREE</Text>
                        {(course.pricing.original_inr || 0) > 0 && (
                          <Text style={[s.enrollPriceNote, { color: isDark ? '#FCD34D' : '#D97706' }]}>
                            ₹{(course.pricing.original_inr || 0).toLocaleString('en-IN')} value
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={[s.enrollPriceSA, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
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
                  <Text style={[s.successTitle, { color: colors.text }]}>You're enrolled!</Text>
                  <Text style={[s.successSub, { color: colors.text2 }]}>
                    Saved to My Learning · ID {done.enrollment_id}
                  </Text>
                  <Pressable onPress={openExternal} style={s.successCTA}>
                    <MaterialCommunityIcons name="open-in-new" size={14} color="#fff" />
                    <Text style={s.successCTAText}>Open course on {course.provider.name}</Text>
                  </Pressable>
                  <Pressable onPress={onClose} style={s.successDismiss}>
                    <Text style={[s.successDismissText, { color: colors.text3 }]}>Done</Text>
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
  const { isDark } = useTheme();
  return (
    <View style={[s.factCell, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}>
      <MaterialCommunityIcons name={icon} size={11} color={isDark ? 'rgba(255,255,255,0.46)' : '#64748B'} />
      <Text style={[s.factText, { color: isDark ? 'rgba(255,255,255,0.72)' : '#475569' }]}>{v}</Text>
    </View>
  );
}

/* ─── Carousel + MiniCard ──────────────────────────────────── */
function Carousel({ title, subtitle, accent, courses, onEnroll }:
  { title: string; subtitle: string; accent: string;
    courses: Course[]; onEnroll: (c: Course) => void }) {
  const { isDark } = useTheme();
  return (
    <View style={s.carouselWrap}>
      <View style={s.carouselHead}>
        <View style={{ flex: 1 }}>
          <Text style={[s.carouselTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{title}</Text>
          <Text style={[s.carouselSub, { color: isDark ? 'rgba(255,255,255,0.46)' : '#64748B' }]}>{subtitle}</Text>
        </View>
        <View style={[s.carouselCount,
          { backgroundColor: accent + (isDark ? '22' : '15'), borderColor: accent + (isDark ? '55' : '40') }]}>
          <Text style={[s.carouselCountText, { color: accent }]}>
            {courses.length}
          </Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
        {courses.map((c) => (
          <MiniCourseCard key={c.id} course={c} accent={accent}
                           onEnroll={() => onEnroll(c)} />
        ))}
      </ScrollView>
    </View>
  );
}

function MiniCourseCard({ course, accent, onEnroll }:
  { course: Course; accent: string; onEnroll: () => void }) {
  const { isDark } = useTheme();
  const isFree = ['free', 'free_audit', 'free_with_sa'].includes(course.pricing.type);
  const isDiscounted = course.pricing.type === 'discounted_for_sa';
  const colors = {
    cardBg: isDark ? '#261944' : '#FFFFFF',
    border: isDark ? accent + '44' : '#E2E8F0',
    title: isDark ? '#FFFFFF' : '#0F172A',
    provider: isDark ? 'rgba(255,255,255,0.46)' : '#64748B',
    stat: isDark ? 'rgba(255,255,255,0.72)' : '#475569',
    dot: isDark ? 'rgba(255,255,255,0.46)' : '#94A3B8',
    origPrice: isDark ? 'rgba(255,255,255,0.46)' : '#94A3B8',
    freePrice: isDark ? '#10B981' : '#059669',
    saPrice: isDark ? accent : (accent === '#A78BFA' ? '#7C3AED' : accent),
  };

  return (
    <AnimatedCard onPress={onEnroll}
      glowColor={accent + '55'}
      style={[s.miniCard, { backgroundColor: colors.cardBg, borderColor: colors.border }] as any}>
      <View style={[s.miniThumb, { backgroundColor: accent + (isDark ? '14' : '10') }]}>
        <Text style={s.miniThumbEmoji}>{course.thumbnail}</Text>
        {course.featured && (
          <View style={[s.miniFeaturedDot, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name="star" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={{ padding: 12, gap: 6, flex: 1 }}>
        <View style={s.miniProvider}>
          <Text style={{ fontSize: 12 }}>{course.provider.logo}</Text>
          <Text style={[s.miniProviderName, { color: colors.provider }]} numberOfLines={1}>
            {course.provider.name}
          </Text>
        </View>
        <Text style={[s.miniTitle, { color: colors.title }]} numberOfLines={2}>{course.title}</Text>
        <View style={s.miniStats}>
          <MaterialCommunityIcons name="star" size={10} color="#F59E0B" />
          <Text style={[s.miniStatText, { color: colors.stat }]}>{course.rating}</Text>
          <Text style={[s.miniDot, { color: colors.dot }]}>·</Text>
          <Text style={[s.miniStatText, { color: colors.stat }]}>{fmtCount(course.enrolled_count)}</Text>
          <Text style={[s.miniDot, { color: colors.dot }]}>·</Text>
          <Text style={[s.miniStatText, { color: colors.stat }]}>{course.duration_label}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.miniFooter}>
          {isFree ? (
            <Text style={[s.miniPriceFree, { color: colors.freePrice }]}>FREE</Text>
          ) : isDiscounted ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[s.miniPriceOrig, { color: colors.origPrice }]}>{fmtINR(course.pricing.original_inr)}</Text>
              <Text style={[s.miniPriceSA, { color: colors.saPrice }]}>
                {fmtINR(course.pricing.sa_inr)}
              </Text>
            </View>
          ) : (
            <Text style={[s.miniPriceSA, { color: colors.saPrice }]}>
              {fmtINR(course.pricing.original_inr)}
            </Text>
          )}
          <View style={[s.miniArrow, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name="arrow-right" size={11} color="#fff" />
          </View>
        </View>
      </View>
    </AnimatedCard>
  );
}

/* ─── Styles ────────────────────────────────────────────────── */
const s = StyleSheet.create({
  statsPills: { flexDirection: 'row', gap: 6 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.14)',
    borderColor: 'rgba(16,185,129,0.40)', borderWidth: 1 },
  statPillVal: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  statPillLbl: { color: '#86EFAC', fontFamily: 'DMSans_700Bold', fontSize: 10 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 52, borderRadius: 14,
    borderWidth: 1, marginTop: 4 },
  searchInput: { flex: 1, fontFamily: 'DMSans_500Medium',
    fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },

  heroRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  heroCard: { borderRadius: 20, padding: 22, minHeight: 156,
    overflow: 'hidden', justifyContent: 'flex-start' as const,
    ...({ cursor: 'pointer' } as any) },
  heroBlur1: { position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)' },
  heroIconCircle: { width: 44, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 22, marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_500Medium',
    fontSize: 13, lineHeight: 18, marginBottom: 14 },
  heroCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.30)', borderWidth: 1 },
  heroCtaText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },

  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: 'DMSans_500Medium', fontSize: 12 },

  sectionCard: { padding: 24, borderRadius: 22, borderWidth: 1, gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '18%', flexGrow: 1, alignItems: 'center', gap: 8,
    paddingVertical: 6, ...({ cursor: 'pointer' } as any) },
  tileCircle: { width: 64, height: 64, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  tileLabel: { fontFamily: 'DMSans_600SemiBold',
    fontSize: 12, textAlign: 'center' },
  tileCount: { fontFamily: 'DMSans_700Bold', fontSize: 10 },

  /* Section count pill (right of section title) */
  sectionCountPill: { paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, marginLeft: 'auto' },
  sectionCountText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  /* Events-style filter pill (used for category, sub-category, and pricing) */
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  pillText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  pillCount: { paddingHorizontal: 6, height: 16, minWidth: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  pillCountText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  /* Filter status banner */
  filterStatus: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  filterStatusText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, flex: 1 },

  /* Large reset button (empty state) */
  clearBtnLarge: { marginTop: 14, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 999, backgroundColor: '#7C3AED',
    ...({ cursor: 'pointer' } as any) },
  clearBtnLargeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },

  /* Sub-category quick-filter chips strip */
  subcatChip: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  subcatChipText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  subcatChipCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  subcatChipCountText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5 },

  /* Per-subcategory horizontal block */
  subcatBlock: { gap: 10, marginTop: 6 },
  subcatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subcatIcon: { width: 26, height: 26, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  subcatTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  subcatCountSmall: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    ...({ cursor: 'pointer' } as any) },
  viewAllText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  tracksStrip: { gap: 10, marginTop: 4 },
  kicker: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, letterSpacing: 1.2 },
  trackChip: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  trackChipText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  trackChipMeta: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  trackChipMetaText: { fontFamily: 'DMSans_700Bold', fontSize: 10 },

  /* Results */
  resultsBlock: { gap: 14 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultsTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  resultsCount: { fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  clearBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  pricingFilters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pricingChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  pricingChipText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  /* Sort dropdown */
  sortMenu: { position: 'absolute', top: 38, right: 0,
    minWidth: 180, borderRadius: 12,
    borderWidth: 1, padding: 6,
    boxShadow: '0 12px 40px rgba(0,0,0,0.25)' as any,
    zIndex: 1000 },
  sortItem: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 9,
    borderRadius: 8, ...({ cursor: 'pointer' } as any) },
  sortItemActive: { backgroundColor: 'rgba(124,58,237,0.18)' },
  sortItemText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },

  /* Active filter chips row */
  activeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  removableChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  removableChipText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Search autocomplete dropdown */
  acDropdown: { position: 'absolute', top: 56, left: 0, right: 0,
    borderRadius: 14, borderWidth: 1,
    padding: 12, gap: 14,
    boxShadow: '0 16px 48px rgba(0,0,0,0.25)' as any, zIndex: 999 },
  acSection: { gap: 6 },
  acHeader: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  acRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10,
    ...({ cursor: 'pointer' } as any) },
  acTitle: { fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  acMeta: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  acProviderChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1 },
  acProviderText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Filter Sheet */
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(10,5,22,0.65)',
    justifyContent: 'flex-end', alignItems: 'flex-end' },
  sheetPanel: { width: 420, maxWidth: '100%', height: '100%',
    borderLeftWidth: 1, flexDirection: 'column' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1 },
  sheetTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, flex: 1 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  filterGroup: { gap: 10 },
  filterGroupLabel: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChoice: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  filterChoiceActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterChoiceText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  filterToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, ...({ cursor: 'pointer' } as any) },
  toggleSwitch: { width: 36, height: 20, borderRadius: 999,
    justifyContent: 'center', paddingHorizontal: 2, position: 'relative' },
  toggleKnob: { width: 16, height: 16, borderRadius: 999,
    backgroundColor: '#fff', position: 'absolute', top: 2, left: 2 },
  filterToggleText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  sheetFooter: { flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  sheetClearBtn: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  sheetClearText: { fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  sheetApplyBtn: { flex: 1, paddingVertical: 11, borderRadius: 999,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  sheetApplyText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },

  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, marginTop: 6 },
  emptySub: { fontFamily: 'DMSans_500Medium', fontSize: 12 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  /* Course Card */
  courseCard: { flexGrow: 1, flexBasis: 300, maxWidth: 360,
    borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  courseTopRow: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  providerStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  providerName: { fontFamily: 'DMSans_700Bold', fontSize: 11, flex: 1 },
  priceBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 5 },
  priceBadgeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9.5, letterSpacing: 0.6 },

  thumbnailBox: { aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.14)' },
  thumbnailEmoji: { fontSize: 56 },

  courseTitle: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 15, lineHeight: 20 },
  courseInstructor: { fontFamily: 'DMSans_500Medium', fontSize: 11 },

  metaTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  metaTagText: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  ratingCount: { fontFamily: 'DMSans_500Medium', fontSize: 10.5 },
  enrolledText: { fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  certBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 11, flex: 1 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  smartTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  smartTagText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5, letterSpacing: 0.4 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 4 },
  priceFree: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  priceOrig: { fontFamily: 'DMSans_500Medium',
    fontSize: 11, textDecorationLine: 'line-through' },
  priceSA: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  priceDiscNote: { fontFamily: 'DMSans_700Bold', fontSize: 9.5, marginTop: 1 },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 34, borderRadius: 999,
    backgroundColor: '#7C3AED', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  enrollBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },

  /* Modal */
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  enrollSheet: { width: '100%', maxWidth: 540, maxHeight: '92%',
    borderRadius: 18, padding: 18, borderWidth: 1 },
  enrollHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  enrollEmoji: { width: 56, height: 56, borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.14)', borderColor: 'rgba(124,58,237,0.30)',
    borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  enrollTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  enrollProvider: { fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 },
  enrollDesc: { fontFamily: 'DMSans_500Medium',
    fontSize: 13, lineHeight: 18, marginVertical: 10 },
  enrollFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  factCell: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  factText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  enrollPriceBox: { padding: 14, borderRadius: 12, marginTop: 12,
    borderWidth: 1, alignItems: 'center' },
  enrollPriceOrig: { fontFamily: 'DMSans_500Medium',
    fontSize: 13, textDecorationLine: 'line-through' },
  enrollPriceSA: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 28, marginTop: 2 },
  enrollPriceNote: { fontFamily: 'DMSans_700Bold',
    fontSize: 11, marginTop: 4 },

  enrollCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 46, borderRadius: 12, backgroundColor: '#7C3AED',
    marginTop: 12, ...({ cursor: 'pointer' } as any) },
  enrollCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5 },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)', borderWidth: 1, marginTop: 12 },
  errText: { color: '#EF4444', fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },

  successBox: { alignItems: 'center', paddingVertical: 14, gap: 4 },
  successTitle: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 18, marginTop: 8 },
  successSub: { fontFamily: 'DMSans_500Medium', fontSize: 12 },
  successCTA: { flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, height: 42, borderRadius: 10,
    backgroundColor: '#7C3AED', marginTop: 14,
    ...({ cursor: 'pointer' } as any) },
  successCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },
  successDismiss: { paddingVertical: 10, ...({ cursor: 'pointer' } as any) },
  successDismissText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },

  /* Carousel */
  carouselWrap: { gap: 10 },
  carouselHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  carouselTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  carouselSub: { fontFamily: 'DMSans_500Medium',
    fontSize: 11.5, marginTop: 2 },
  carouselCount: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1 },
  carouselCountText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  /* Mini card */
  miniCard: { width: 240, borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', ...({ cursor: 'pointer' } as any) },
  miniThumb: { aspectRatio: 16 / 10, alignItems: 'center', justifyContent: 'center',
    position: 'relative' },
  miniThumbEmoji: { fontSize: 44 },
  miniFeaturedDot: { position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center' },
  miniProvider: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniProviderName: { fontFamily: 'DMSans_600SemiBold',
    fontSize: 10.5, flex: 1 },
  miniTitle: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 13, lineHeight: 17 },
  miniStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontFamily: 'DMSans_700Bold', fontSize: 10 },
  miniDot: { fontSize: 10 },
  miniFooter: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4 },
  miniPriceFree: { fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  miniPriceOrig: { fontFamily: 'DMSans_500Medium',
    fontSize: 10, textDecorationLine: 'line-through' },
  miniPriceSA: { fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  miniArrow: { width: 22, height: 22, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center' },
});

