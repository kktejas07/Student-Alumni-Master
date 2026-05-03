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
import { useRouter } from 'expo-router';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { request } from '@/src/models/services/api';

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

const fmtINR = (n?: number) => '₹' + (n || 0).toLocaleString('en-IN');
const fmtCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
  return String(n);
};

export default function CoursesPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [hero, setHero] = useState<Hero[]>([]);
  const [stats, setStats] = useState({ total_courses: 0, free_courses: 0,
                                        paid_courses: 0, free_certs: 0 });
  const [tracksMeta, setTracksMeta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterSubcat, setFilterSubcat] = useState<{ category: string;
                                                      subcategory: string;
                                                      label: string } | null>(null);
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [results, setResults] = useState<Course[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [enrollFor, setEnrollFor] = useState<Course | null>(null);
  const [featured, setFeatured] = useState<Course[]>([]);
  const [trendingFree, setTrendingFree] = useState<Course[]>([]);
  const [topUni, setTopUni] = useState<Course[]>([]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [r, allList] = await Promise.all([
        request<any>('/courses/catalog'),
        request<any>('/courses/list?sort=popular'),
      ]);
      setSections(r.sections || []);
      setHero(r.hero || []);
      setStats(r.stats || stats);
      setTracksMeta(r.tracks || []);
      const all: Course[] = allList.courses || [];
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

  const fetchResults = useCallback(async () => {
    const hasFilter = !!filterSubcat || !!search.trim() || pricingFilter !== 'all';
    if (!hasFilter) { setResults([]); return; }
    setResultsLoading(true);
    try {
      const qp = new URLSearchParams();
      if (filterSubcat) {
        qp.set('category', filterSubcat.category);
        qp.set('subcategory', filterSubcat.subcategory);
      }
      if (search.trim()) qp.set('q', search.trim());
      if (pricingFilter !== 'all') qp.set('pricing', pricingFilter);
      qp.set('sort', 'free_first');
      const r = await request<any>(`/courses/list?${qp.toString()}`);
      setResults(r.courses || []);
    } catch (e: any) {
      console.warn('courses list err', e?.message);
    } finally {
      setResultsLoading(false);
    }
  }, [filterSubcat, search, pricingFilter]);

  useEffect(() => {
    const t = setTimeout(fetchResults, 250);
    return () => clearTimeout(t);
  }, [fetchResults]);

  const showResults = !!filterSubcat || !!search.trim() || pricingFilter !== 'all';

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
      {/* Search Bar */}
      <View style={s.searchBox}>
        <MaterialCommunityIcons name="magnify" size={18} color={C.text3} />
        <TextInput
          style={s.searchInput}
          placeholder="Search courses, skills, instructors…"
          placeholderTextColor={C.text3}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {!!search && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={16} color={C.text3} />
          </Pressable>
        )}
      </View>

      {/* Hero Row */}
      <View style={s.heroRow}>
        {hero.map((h, i) => (
          <Pressable key={h.id}
            onPress={() => {
              if (h.id === 'ai-career-track') {
                router.push('/tracks/ai-career-track' as any);
              } else if (h.id === 'free-this-month') {
                setPricingFilter('free');
                setFilterSubcat(null);
              } else if (h.cta_href.startsWith('/')) {
                router.push(h.cta_href as any);
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
          <Text style={s.loadingText}>Loading curated catalog…</Text>
        </View>
      ) : null}

      {/* Filter results (when active) */}
      {showResults && (
        <ResultsBlock
          subcatLabel={filterSubcat?.label}
          searchQuery={search}
          pricing={pricingFilter}
          onClear={() => {
            setFilterSubcat(null);
            setSearch('');
            setPricingFilter('all');
          }}
          onPricingChange={setPricingFilter}
          loading={resultsLoading}
          courses={results}
          onEnroll={setEnrollFor}
        />
      )}

      {/* Carousels — Featured / Trending Free / Top Universities */}
      {!showResults && featured.length > 0 && (
        <Carousel title="✨ Featured this month" subtitle="Hand-picked by SA editors"
                   accent="#A78BFA" courses={featured} onEnroll={setEnrollFor} />
      )}
      {!showResults && trendingFree.length > 0 && (
        <Carousel title="🔥 Trending Free Courses"
                   subtitle="Most-enrolled this week — totally free"
                   accent="#10B981" courses={trendingFree} onEnroll={setEnrollFor} />
      )}
      {!showResults && topUni.length > 0 && (
        <Carousel title="🎓 Top Universities" subtitle="MIT · Stanford · Harvard · IITs · IIMs · Yale"
                   accent="#F59E0B" courses={topUni} onEnroll={setEnrollFor} />
      )}

      {/* Sections — sub-category icon grid (hide when results visible) */}
      {!showResults && sections.map((sec) => (
        <View key={sec.id} style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={{ fontSize: 22 }}>{sec.emoji}</Text>
            <Text style={s.sectionName}>{sec.name}</Text>
          </View>
          <View style={s.iconGrid}>
            {sec.items.map((it) => (
              <Pressable key={it.key}
                onPress={() => setFilterSubcat({
                  category: sec.id, subcategory: it.key, label: it.label,
                })}
                style={s.tile}>
                <View style={[
                  s.tileCircle,
                  it.highlighted && { backgroundColor: '#3D2D5C',
                                       borderColor: '#A78BFA',
                                       borderWidth: 2,
                                       boxShadow: '0 0 24px -8px rgba(167,139,250,0.6)' as any },
                ]}>
                  <MaterialCommunityIcons name={it.icon} size={24}
                    color={it.highlighted ? '#FFFFFF' : '#FFFFFF'} />
                </View>
                <Text style={s.tileLabel}>{it.label}</Text>
                {it.count > 0 && (
                  <Text style={s.tileCount}>{it.count}</Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* Career tracks strip */}
      {!showResults && tracksMeta.length > 0 && (
        <View style={s.tracksStrip}>
          <Text style={s.kicker}>CAREER TRACKS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {tracksMeta.map((t: any) => (
              <Pressable key={t.slug}
                onPress={() => router.push(`/tracks/${t.slug}` as any)}
                style={[s.trackChip, { borderColor: t.color + '66',
                                        backgroundColor: t.color + '14' }]}>
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

      {/* AI Advisor */}
      <View style={{ marginTop: 18 }}>
        <AdvisorAIBlock
          context="courses"
          advisorTitle="Talk to a Course Advisor"
          advisorDesc="Need a personalised learning path? Connect with an SA mentor."
          aiTitle="Ask the SA Course AI"
          aiDesc="Tell us your goal & weekly hours — we'll plan free + paid courses for you."
          advisorAccent="#A78BFA"
          aiAccent="#10B981"
          advisorIcon="account-tie-voice"
          aiIcon="brain"
        />
      </View>

      {/* Enroll modal */}
      <EnrollModal course={enrollFor}
                    onClose={() => setEnrollFor(null)} />
    </FeaturePageShell>
  );
}

/* ─── Results Block ─────────────────────────────────────────── */
function ResultsBlock({ subcatLabel, searchQuery, pricing, onClear,
                         onPricingChange, loading, courses, onEnroll }:
  { subcatLabel?: string; searchQuery: string; pricing: 'all'|'free'|'paid';
    onClear: () => void; onPricingChange: (v: 'all'|'free'|'paid') => void;
    loading: boolean; courses: Course[]; onEnroll: (c: Course) => void }) {
  return (
    <View style={s.resultsBlock}>
      <View style={s.resultsHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.resultsTitle}>
            {subcatLabel || (searchQuery ? `Results for "${searchQuery}"` : 'Filtered courses')}
          </Text>
          <Text style={s.resultsCount}>
            {loading ? 'Loading…' : `${courses.length} courses found`}
          </Text>
        </View>
        <Pressable onPress={onClear} style={s.clearBtn}>
          <MaterialCommunityIcons name="close" size={12} color={C.text2} />
          <Text style={s.clearBtnText}>Clear filters</Text>
        </Pressable>
      </View>

      <View style={s.pricingFilters}>
        {(['all', 'free', 'paid'] as const).map((p) => {
          const active = pricing === p;
          const lbl = p === 'all' ? 'All' : p === 'free' ? 'Free / Free Cert' : 'Paid (with SA discount)';
          return (
            <Pressable key={p} onPress={() => onPricingChange(p)}
              style={[s.pricingChip,
                active && { backgroundColor: '#7C3AED33', borderColor: '#A78BFA' }]}>
              <Text style={[s.pricingChipText, active && { color: '#C4B5FD' }]}>
                {lbl}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#A78BFA" />
        </View>
      ) : courses.length === 0 ? (
        <View style={s.emptyBox}>
          <MaterialCommunityIcons name="book-search" size={36} color={C.text3} />
          <Text style={s.emptyTitle}>No courses match these filters</Text>
          <Text style={s.emptySub}>Try clearing or switching pricing tier</Text>
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
  const isFree = ['free', 'free_audit', 'free_with_sa'].includes(course.pricing.type);
  const isDiscounted = course.pricing.type === 'discounted_for_sa';
  const tags = (course.tags || []).slice(0, 3);

  return (
    <View style={s.courseCard}>
      <View style={s.courseTopRow}>
        <View style={s.providerStrip}>
          <Text style={{ fontSize: 16 }}>{course.provider.logo}</Text>
          <Text style={s.providerName} numberOfLines={1}>
            {course.provider.name}
          </Text>
        </View>
        <PriceBadge type={course.pricing.type} />
      </View>

      <View style={s.thumbnailBox}>
        <Text style={s.thumbnailEmoji}>{course.thumbnail}</Text>
      </View>

      <View style={{ padding: 14, gap: 8 }}>
        <Text style={s.courseTitle} numberOfLines={2}>{course.title}</Text>
        <Text style={s.courseInstructor} numberOfLines={1}>
          {course.instructors[0]} · {course.provider.name}
        </Text>

        <View style={s.metaTagRow}>
          <MetaTag text={course.level} />
          <MetaTag text={course.language} />
          <MetaTag text={course.duration_label} />
        </View>

        <View style={s.statsRow}>
          <MaterialCommunityIcons name="star" size={11} color="#FCD34D" />
          <Text style={s.ratingText}>{course.rating}</Text>
          <Text style={s.ratingCount}>({fmtCount(course.review_count)})</Text>
          <View style={{ flex: 1 }} />
          <MaterialCommunityIcons name="account-multiple" size={11} color={C.text3} />
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
                    { backgroundColor: meta.color + '22',
                      borderColor: meta.color + '55' }]}>
                  <Text style={[s.smartTagText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
              );
            })}
            {(course.tags || []).length > 3 && (
              <View style={[s.smartTag,
                { backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.10)' }]}>
                <Text style={[s.smartTagText, { color: C.text2 }]}>
                  +{(course.tags || []).length - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.priceRow}>
          <View>
            {isFree ? (
              <Text style={[s.priceFree]}>FREE</Text>
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
  const free = cert.free;
  const recognised = cert.recognised;
  let label = 'Certificate of completion';
  let bg = 'rgba(124,58,237,0.14)';
  let fg = '#C4B5FD';
  if (free && recognised) {
    label = '✨ Free industry-recognised certificate';
    bg = 'rgba(16,185,129,0.14)'; fg = '#6EE7B7';
  } else if (free) {
    label = '✨ Free certificate of completion';
    bg = 'rgba(16,185,129,0.14)'; fg = '#6EE7B7';
  } else if (recognised) {
    label = `🏆 Industry cert · ${fmtINR(cert.cost_inr)}`;
    bg = 'rgba(245,158,11,0.14)'; fg = '#FCD34D';
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
                <View style={s.enrollEmoji}>
                  <Text style={{ fontSize: 28 }}>{course.thumbnail}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.enrollTitle} numberOfLines={2}>
                    {course.title}
                  </Text>
                  <Text style={s.enrollProvider}>
                    {course.provider.name} · {course.duration_label}
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={20} color={C.text2} />
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
                        <Text style={s.enrollPriceSA}>FREE</Text>
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
                  <MaterialCommunityIcons name="alert-circle" size={13} color="#FCA5A5" />
                  <Text style={s.errText}>{err}</Text>
                </View>
              )}

              {done && (
                <View style={s.successBox}>
                  <MaterialCommunityIcons name="check-decagram" size={32} color="#86EFAC" />
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
      <MaterialCommunityIcons name={icon} size={11} color={C.text3} />
      <Text style={s.factText}>{v}</Text>
    </View>
  );
}

/* ─── Carousel + MiniCard ──────────────────────────────────── */
function Carousel({ title, subtitle, accent, courses, onEnroll }:
  { title: string; subtitle: string; accent: string;
    courses: Course[]; onEnroll: (c: Course) => void }) {
  return (
    <View style={s.carouselWrap}>
      <View style={s.carouselHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.carouselTitle}>{title}</Text>
          <Text style={s.carouselSub}>{subtitle}</Text>
        </View>
        <View style={[s.carouselCount,
          { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
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
  const isFree = ['free', 'free_audit', 'free_with_sa'].includes(course.pricing.type);
  const isDiscounted = course.pricing.type === 'discounted_for_sa';
  return (
    <Pressable onPress={onEnroll}
      style={[s.miniCard, { borderColor: accent + '44' }]}>
      <View style={[s.miniThumb, { backgroundColor: accent + '14' }]}>
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
          <Text style={s.miniProviderName} numberOfLines={1}>
            {course.provider.name}
          </Text>
        </View>
        <Text style={s.miniTitle} numberOfLines={2}>{course.title}</Text>
        <View style={s.miniStats}>
          <MaterialCommunityIcons name="star" size={10} color="#FCD34D" />
          <Text style={s.miniStatText}>{course.rating}</Text>
          <Text style={s.miniDot}>·</Text>
          <Text style={s.miniStatText}>{fmtCount(course.enrolled_count)}</Text>
          <Text style={s.miniDot}>·</Text>
          <Text style={s.miniStatText}>{course.duration_label}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.miniFooter}>
          {isFree ? (
            <Text style={s.miniPriceFree}>FREE</Text>
          ) : isDiscounted ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={s.miniPriceOrig}>{fmtINR(course.pricing.original_inr)}</Text>
              <Text style={[s.miniPriceSA, { color: accent }]}>
                {fmtINR(course.pricing.sa_inr)}
              </Text>
            </View>
          ) : (
            <Text style={[s.miniPriceSA, { color: accent }]}>
              {fmtINR(course.pricing.original_inr)}
            </Text>
          )}
          <View style={[s.miniArrow, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name="arrow-right" size={11} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
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
    backgroundColor: '#261944', borderColor: '#3D2D5C', borderWidth: 1,
    marginTop: 4 },
  searchInput: { flex: 1, color: '#fff', fontFamily: 'DMSans_500Medium',
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
  loadingText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  sectionCard: { padding: 24, borderRadius: 22,
    backgroundColor: 'rgba(67,41,109,0.40)', borderColor: '#3D2D5C', borderWidth: 1,
    gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionName: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '18%', flexGrow: 1, alignItems: 'center', gap: 8,
    paddingVertical: 6, ...({ cursor: 'pointer' } as any) },
  tileCircle: { width: 64, height: 64, borderRadius: 999,
    backgroundColor: '#2F1F4D', borderColor: '#3D2D5C', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: '#fff', fontFamily: 'DMSans_600SemiBold',
    fontSize: 12, textAlign: 'center' },
  tileCount: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_700Bold',
    fontSize: 10 },

  tracksStrip: { gap: 10, marginTop: 4 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, letterSpacing: 1.2 },
  trackChip: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  trackChipText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  trackChipMeta: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.30)' },
  trackChipMetaText: { color: 'rgba(255,255,255,0.80)',
    fontFamily: 'DMSans_700Bold', fontSize: 10 },

  /* Results */
  resultsBlock: { gap: 14 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultsTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  resultsCount: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  clearBtnText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  pricingFilters: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pricingChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border,
    borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  pricingChipText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14, marginTop: 6 },
  emptySub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },

  /* Course Card */
  courseCard: { flexGrow: 1, flexBasis: 300, maxWidth: 360,
    borderRadius: 16, borderWidth: 1, borderColor: '#3D2D5C',
    backgroundColor: '#261944', overflow: 'hidden' },
  courseTopRow: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  providerStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  providerName: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11, flex: 1 },
  priceBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 5 },
  priceBadgeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9.5, letterSpacing: 0.6 },

  thumbnailBox: { aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.18)' },
  thumbnailEmoji: { fontSize: 56 },

  courseTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 15, lineHeight: 20 },
  courseInstructor: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  metaTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.05)' },
  metaTagText: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  ratingCount: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 10.5 },
  enrolledText: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  certBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 11, flex: 1 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  smartTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  smartTagText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5, letterSpacing: 0.4 },

  priceRow: { flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginTop: 4 },
  priceFree: { color: '#10B981', fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  priceOrig: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 11, textDecorationLine: 'line-through' },
  priceSA: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  priceDiscNote: { color: '#FCD34D', fontFamily: 'DMSans_700Bold', fontSize: 9.5, marginTop: 1 },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, height: 34, borderRadius: 999,
    backgroundColor: '#7C3AED', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
  enrollBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },

  /* Modal */
  overlay: { flex: 1, backgroundColor: 'rgba(7,2,15,0.78)',
    justifyContent: 'center', alignItems: 'center', padding: 16 },
  enrollSheet: { width: '100%', maxWidth: 540, maxHeight: '92%',
    backgroundColor: '#13031F', borderRadius: 18, padding: 18,
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1 },
  enrollHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  enrollEmoji: { width: 56, height: 56, borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.18)', borderColor: 'rgba(124,58,237,0.40)',
    borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  enrollTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  enrollProvider: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 },
  enrollDesc: { color: C.text2, fontFamily: 'DMSans_500Medium',
    fontSize: 13, lineHeight: 18, marginVertical: 10 },
  enrollFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  factCell: { flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)' },
  factText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },

  enrollPriceBox: { padding: 14, borderRadius: 12, marginTop: 12,
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, alignItems: 'center' },
  enrollPriceOrig: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 13, textDecorationLine: 'line-through' },
  enrollPriceSA: { color: '#A78BFA', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 28, marginTop: 2 },
  enrollPriceNote: { color: '#FCD34D', fontFamily: 'DMSans_700Bold',
    fontSize: 11, marginTop: 4 },

  enrollCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 46, borderRadius: 12, backgroundColor: '#7C3AED',
    marginTop: 12, ...({ cursor: 'pointer' } as any) },
  enrollCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5 },

  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1, marginTop: 12 },
  errText: { color: '#FCA5A5', fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },

  successBox: { alignItems: 'center', paddingVertical: 14, gap: 4 },
  successTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 18, marginTop: 8 },
  successSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  successCTA: { flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, height: 42, borderRadius: 10,
    backgroundColor: '#7C3AED', marginTop: 14,
    ...({ cursor: 'pointer' } as any) },
  successCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },
  successDismiss: { paddingVertical: 10, ...({ cursor: 'pointer' } as any) },
  successDismissText: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  /* Carousel */
  carouselWrap: { gap: 10 },
  carouselHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  carouselTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  carouselSub: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 11.5, marginTop: 2 },
  carouselCount: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1 },
  carouselCountText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  /* Mini card */
  miniCard: { width: 240, borderRadius: 14, borderWidth: 1,
    backgroundColor: '#261944', overflow: 'hidden',
    ...({ cursor: 'pointer' } as any) },
  miniThumb: { aspectRatio: 16 / 10, alignItems: 'center', justifyContent: 'center',
    position: 'relative' },
  miniThumbEmoji: { fontSize: 44 },
  miniFeaturedDot: { position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center' },
  miniProvider: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniProviderName: { color: C.text3, fontFamily: 'DMSans_600SemiBold',
    fontSize: 10.5, flex: 1 },
  miniTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 13, lineHeight: 17 },
  miniStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 10 },
  miniDot: { color: C.text3, fontSize: 10 },
  miniFooter: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4 },
  miniPriceFree: { color: '#10B981', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  miniPriceOrig: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 10, textDecorationLine: 'line-through' },
  miniPriceSA: { fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  miniArrow: { width: 22, height: 22, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center' },
});
