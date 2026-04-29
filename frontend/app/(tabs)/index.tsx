/**
 * Home Tab — Student Alumni Dashboard (PhonePe-inspired layout)
 * ==============================================================
 * Architecture:
 *  - Top hero: greeting + profile/QR + edit-preferences pencil
 *  - Filter chips (All / Career / Events / Courses / Networking)
 *  - "Recommended for You" — hand-picked mentor + urgent event + course
 *  - "Closing Soon" rail — events with deadline ≤ 7 days (urgency badges)
 *  - 4-col PhonePe-style tile grid (priority modules from backend engine)
 *  - Suggested Mentors carousel
 *  - Upcoming Events carousel
 *  - Top Student Deals carousel
 *  - Promotions strip — demoted modules for school students
 *  - Alumni transition CTA — visible when user is eligible
 *
 * Motion:
 *  - All cards/tiles use AnimatedCard / AnimatedTile (M3 ripple + spring scale)
 *  - Sections fade-up with 60ms stagger
 *  - Filter chips trigger smooth re-fetch via PATCH /users/me/preferences
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Users,
  Tag,
  Briefcase,
  MessageCircle,
  Calendar,
  GraduationCap,
  Home as HomeIcon,
  Shield,
  CreditCard,
  Compass,
  Bell,
  QrCode,
  Settings,
  Clock,
  Star,
  TrendingUp,
} from 'lucide-react-native';
import { Colors as C, Spacing, Typography, Shadows, Radius, Gradients } from '@/src/theme';
import * as Haptics from 'expo-haptics';
import {
  AnimatedCard,
  AnimatedTile,
  CountdownBadge,
  StaggerView,
  SALogo,
} from '@/src/views/components';
import { useAuth, useDashboard, useCareerSuggestions } from '@/src/viewmodels/hooks';
import { api } from '@/src/models/services/api';

// ---------------------------------------------------------------------------
// Module catalogue: icon + tint + route per module-id used in the priority list
// ---------------------------------------------------------------------------
const MODULES: Record<
  string,
  { label: string; icon: any; tint: string; iconColor: string; route: string }
> = {
  career_guidelines: {
    label: 'Career\nGuidelines',
    icon: Compass, tint: '#EDE0F7', iconColor: C.deepPurple,
    route: '/internships',
  },
  events: {
    label: 'Events',
    icon: Calendar, tint: '#FCE4EC', iconColor: '#C2185B',
    route: '/events',
  },
  courses: {
    label: 'Courses',
    icon: BookOpen, tint: '#E3F2FD', iconColor: '#1565C0',
    route: '/(tabs)/courses',
  },
  networking: {
    label: 'Knowledge\nRooms',
    icon: Users, tint: '#E8F5E9', iconColor: '#2E7D32',
    route: '/rooms',
  },
  financial: {
    label: 'Financial\nServices',
    icon: CreditCard, tint: '#FFF8E1', iconColor: '#EF6C00',
    route: '/resources?cat=loans',
  },
  insurance: {
    label: 'Insurance',
    icon: Shield, tint: '#F3E5F5', iconColor: '#6A1B9A',
    route: '/resources?cat=insurance',
  },
  housing: {
    label: 'Housing',
    icon: HomeIcon, tint: '#E0F7FA', iconColor: '#00838F',
    route: '/resources?cat=housing',
  },
  deals: {
    label: 'Deals',
    icon: Tag, tint: '#FCE4EC', iconColor: '#AD1457',
    route: '/(tabs)/deals',
  },
  scholarships: {
    label: 'Scholarships',
    icon: GraduationCap, tint: '#FFF8E1', iconColor: '#EF6C00',
    route: '/resources?cat=loans',
  },
  campus_tours: {
    label: 'Campus\nTours',
    icon: Briefcase, tint: '#E8F5E9', iconColor: '#2E7D32',
    route: '/events',
  },
};

const PATH_LABELS: Record<string, string> = {
  job: 'Job-Ready Path',
  higher_education: 'Higher Ed Path',
  startup: 'Startup Path',
  business: 'Business Path',
};

// Filter chips for quick re-prioritization (per spec "simple filters and dropdowns")
const FILTER_CHIPS = [
  { id: 'all', label: 'For You', testID: 'chip-all' },
  { id: 'career', label: 'Career', testID: 'chip-career' },
  { id: 'events', label: 'Events', testID: 'chip-events' },
  { id: 'courses', label: 'Courses', testID: 'chip-courses' },
  { id: 'networking', label: 'Network', testID: 'chip-networking' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, refetch } = useDashboard();
  const { suggestion, generate, loadCached, loading: aiLoading } = useCareerSuggestions();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    loadCached();
  }, []);

  // Refetch dashboard whenever user comes back to the tab (preferences may have changed)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, []),
  );

  const personalization = data?.personalization || {};
  const moduleIds: string[] = personalization?.priority_modules?.length
    ? personalization.priority_modules
    : ['career_guidelines', 'events', 'courses', 'networking', 'financial', 'insurance', 'housing', 'deals'];
  const promoIds: string[] = personalization?.promotion_modules || [];
  const path = user?.career_path;

  const handleTilePress = useCallback(
    (moduleId: string, route: string) => {
      // Track click for frequency-based weighting
      api.trackModuleClick(moduleId).catch(() => {});
      router.push(route as any);
    },
    [router],
  );

  // Filter chip handler — re-fetches with the current preferences (chip is purely cosmetic
  // for narrowing visible content; the real priority comes from backend personalization).
  const filteredModules = useMemo(() => {
    if (activeFilter === 'all') return moduleIds;
    if (activeFilter === 'career') return moduleIds.filter((m) => ['career_guidelines', 'financial', 'scholarships'].includes(m));
    if (activeFilter === 'events') return moduleIds.filter((m) => ['events', 'campus_tours'].includes(m));
    if (activeFilter === 'courses') return moduleIds.filter((m) => ['courses', 'scholarships'].includes(m));
    if (activeFilter === 'networking') return moduleIds.filter((m) => ['networking', 'events'].includes(m));
    return moduleIds;
  }, [activeFilter, moduleIds]);

  const recs = data?.recommendations || {};
  const closingSoon: any[] = data?.closing_soon || [];
  const suggestedMentors: any[] = data?.suggested_mentors || [];

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brandPurple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      {/* ===== TOP HERO with gradient (PhonePe-style header) ===== */}
      <LinearGradient
        colors={Gradients.heroDiagonal as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.heroRow}>
            <SALogo size={36} variant="white" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroKicker}>{path ? PATH_LABELS[path] : 'WELCOME'}</Text>
              <Text style={styles.heroGreeting} numberOfLines={1}>
                Hi, {user?.full_name?.split(' ')[0] || 'there'} 👋
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              testID="home-qr-btn"
              style={styles.heroIconBtn}
              android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: true }}
            >
              <QrCode size={20} color={C.white} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/chat')}
              testID="home-chat-btn"
              style={[styles.heroIconBtn, { marginLeft: 8 }]}
              android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: true }}
            >
              <Bell size={20} color={C.white} />
            </Pressable>
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {FILTER_CHIPS.map((c) => {
              const active = activeFilter === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setActiveFilter(c.id);
                  }}
                  testID={c.testID}
                  style={[
                    styles.chip,
                    active ? styles.chipActive : styles.chipInactive,
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? C.deepPurple : C.white }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.brandPurple} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Mentor pending banner ===== */}
        {user?.role === 'mentor' && user?.mentor_status === 'pending' && (
          <AnimatedCard
            style={[styles.pendingBanner]}
            bg={C.warningSoft}
            index={0}
            testID="banner-mentor-pending"
          >
            <Text style={[Typography.bodyBold, { color: C.deepPurple }]}>Account Under Review</Text>
            <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4 }]}>
              Your mentor profile is being reviewed. You'll be notified within 24-48 hours.
            </Text>
          </AnimatedCard>
        )}

        {/* ===== Analytics CTA for admin/mentor/college roles ===== */}
        {(user?.role === 'admin' || user?.role === 'mentor' || user?.role === 'college') && (
          <AnimatedCard
            onPress={() => router.push('/analytics' as any)}
            style={styles.analyticsBanner}
            index={0}
            testID="banner-analytics"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.analyticsIcon}>
                <TrendingUp size={20} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyBold, { color: C.deepPurple }]}>
                  {user?.role === 'admin' ? 'Platform analytics' : user?.role === 'mentor' ? 'Your mentor analytics' : 'Institution analytics'}
                </Text>
                <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]}>
                  {user?.role === 'admin' ? 'KPIs · growth · top colleges · revenue' :
                    user?.role === 'mentor' ? 'Bookings · earnings · top topics · sessions' :
                    'Students · alumni · enrollments · top alumni'}
                </Text>
              </View>
              <ArrowRight size={20} color={C.brandPurple} />
            </View>
          </AnimatedCard>
        )}

        {/* ===== Alumni transition CTA ===== */}
        {personalization?.can_transition_alumni && (
          <AnimatedCard
            onPress={async () => {
              try {
                await api.transitionToAlumni();
                refetch();
              } catch {}
            }}
            style={styles.alumniBanner}
            index={0}
            testID="banner-alumni-transition"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.alumniIcon}>
                <GraduationCap size={22} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodyBold, { color: C.deepPurple }]}>
                  Graduated? Become an alumni
                </Text>
                <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]}>
                  Unlock mentor mode + Knowledge Rooms.
                </Text>
              </View>
              <ArrowRight size={20} color={C.brandPurple} />
            </View>
          </AnimatedCard>
        )}

        {/* ===== Recommended For You (top picks) ===== */}
        <SectionHeader
          icon={<Star size={16} color={C.brandPurple} />}
          title="Recommended for you"
          subtitle="Curated by your career path"
        />
        <View style={styles.recRow}>
          {/* Urgent event */}
          {recs?.event && (
            <AnimatedCard
              onPress={() => router.push(`/event/${recs.event.id}` as any)}
              style={[styles.recCard, { width: '48%' }]}
              padded={false}
              index={1}
              testID="rec-event"
            >
              <Image source={{ uri: recs.event.image }} style={styles.recImg} />
              <View style={{ padding: 12 }}>
                <Text style={[Typography.label, { color: C.brandPurple, fontSize: 9 }]} numberOfLines={1}>
                  {recs.event.category?.toUpperCase() || 'EVENT'}
                </Text>
                <Text style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 13, marginTop: 2 }]} numberOfLines={2}>
                  {recs.event.title}
                </Text>
                {typeof recs.event.deadline_days === 'number' && recs.event.deadline_days >= 0 && (
                  <View style={{ marginTop: 8 }}>
                    <CountdownBadge days={recs.event.deadline_days} />
                  </View>
                )}
              </View>
            </AnimatedCard>
          )}
          {/* Top mentor */}
          {recs?.mentor && (
            <AnimatedCard
              onPress={() => router.push(`/mentor/${recs.mentor.id}` as any)}
              style={[styles.recCard, { width: '48%' }]}
              padded={false}
              index={2}
              testID="rec-mentor"
            >
              <View style={styles.recMentorTop}>
                <Image source={{ uri: recs.mentor.avatar }} style={styles.recAvatar} />
              </View>
              <View style={{ padding: 12, paddingTop: 6 }}>
                <Text style={[Typography.label, { color: C.brandPurple, fontSize: 9 }]}>TOP MENTOR</Text>
                <Text style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 13, marginTop: 2 }]} numberOfLines={1}>
                  {recs.mentor.full_name}
                </Text>
                <Text style={[Typography.bodySm, { color: C.textSecondary, fontSize: 11 }]} numberOfLines={1}>
                  {recs.mentor.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                  <Star size={12} color={C.warning} fill={C.warning} />
                  <Text style={[Typography.bodySm, { fontSize: 11, color: C.textSecondary }]}>
                    {recs.mentor.rating} · {recs.mentor.sessions} sessions
                  </Text>
                </View>
              </View>
            </AnimatedCard>
          )}
        </View>

        {/* ===== Closing Soon strip — events with urgent deadlines ===== */}
        {closingSoon.length > 0 && (
          <>
            <SectionHeader
              icon={<Clock size={16} color={C.danger} />}
              title="Closing soon"
              subtitle="Don't miss these deadlines"
              right={
                <Pressable onPress={() => router.push('/events')}>
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              }
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: Spacing.lg, paddingRight: Spacing.lg }}
            >
              {closingSoon.map((e: any, idx: number) => (
                <AnimatedCard
                  key={e.id}
                  onPress={() => router.push(`/event/${e.id}` as any)}
                  style={[styles.closingCard]}
                  padded={false}
                  index={idx}
                  testID={`closing-${e.id}`}
                >
                  <Image source={{ uri: e.image }} style={styles.closingImg} />
                  <View style={{ padding: 12 }}>
                    <CountdownBadge days={e.deadline_days} />
                    <Text
                      style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 13, marginTop: 8 }]}
                      numberOfLines={2}
                    >
                      {e.title}
                    </Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary, fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
                      {e.venue}
                    </Text>
                  </View>
                </AnimatedCard>
              ))}
            </ScrollView>
          </>
        )}

        {/* ===== AI Career Roadmap card ===== */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg }}>
          <AnimatedCard bg={C.deepPurple} style={styles.aiCard} index={0}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles size={18} color={C.lightPurple} />
              <Text style={[Typography.label, { color: C.lightPurple }]}>AI CAREER ROADMAP</Text>
            </View>
            {suggestion?.summary ? (
              <>
                <Text style={[Typography.body, { color: C.white }]} testID="home-ai-summary">
                  {suggestion.summary}
                </Text>
                {suggestion.milestones?.length > 0 && (
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {suggestion.milestones.slice(0, 2).map((m: any, idx: number) => (
                      <View key={idx} style={styles.milestoneOnDark}>
                        <Text style={[Typography.label, { color: C.lightPurple, fontSize: 10 }]}>
                          {m.timeframe}
                        </Text>
                        <Text style={[Typography.bodyBold, { color: C.white }]}>{m.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Pressable
                  onPress={() => generate()}
                  testID="home-refresh-roadmap-btn"
                  style={styles.refreshBtn}
                >
                  <Text style={[Typography.bodyBold, { color: C.deepPurple, fontSize: 14 }]}>
                    {aiLoading ? 'Refreshing…' : 'Refresh roadmap'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[Typography.body, { color: C.white, marginTop: 4 }]}>
                  Generate your personalized AI roadmap with milestones and skills.
                </Text>
                <Pressable
                  onPress={() => generate()}
                  testID="home-generate-roadmap-btn"
                  style={styles.refreshBtn}
                >
                  <Text style={[Typography.bodyBold, { color: C.deepPurple, fontSize: 14 }]}>
                    {aiLoading ? 'Generating…' : 'Generate my roadmap ✨'}
                  </Text>
                </Pressable>
              </>
            )}
          </AnimatedCard>
        </View>

        {/* ===== PhonePe-style 4-col tile grid ===== */}
        <SectionHeader
          icon={<TrendingUp size={16} color={C.brandPurple} />}
          title="Explore"
          subtitle={
            personalization.is_school_student
              ? 'Top picks for school students'
              : personalization.is_alumni
                ? 'Curated for alumni'
                : 'Your priority modules'
          }
          right={
            <Pressable
              onPress={() => router.push('/preferences' as any)}
              testID="edit-prefs-btn"
              style={styles.editPrefsBtn}
            >
              <Settings size={14} color={C.brandPurple} />
              <Text style={[Typography.bodySm, { color: C.brandPurple, fontFamily: 'DMSans_600SemiBold', marginLeft: 4 }]}>
                Edit
              </Text>
            </Pressable>
          }
        />
        <View style={styles.tileGrid}>
          {filteredModules.map((id, idx) => {
            const m = MODULES[id];
            if (!m) return null;
            const Icon = m.icon;
            return (
              <View key={id} style={styles.tileCell}>
                <AnimatedTile
                  label={m.label}
                  icon={<Icon size={24} color={m.iconColor} />}
                  tint={m.tint}
                  onPress={() => handleTilePress(id, m.route)}
                  index={idx}
                  testID={`tile-${id}`}
                />
              </View>
            );
          })}
        </View>

        {/* ===== Suggested Mentors carousel ===== */}
        {suggestedMentors.length > 0 && (
          <>
            <SectionHeader
              icon={<Users size={16} color={C.brandPurple} />}
              title="Mentors for you"
              subtitle="Matched to your career path"
              right={
                <Pressable onPress={() => router.push('/(tabs)/network')}>
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              }
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: Spacing.lg }}
            >
              {suggestedMentors.map((m: any, idx: number) => (
                <AnimatedCard
                  key={m.id}
                  onPress={() => router.push(`/mentor/${m.id}` as any)}
                  style={styles.mentorCard}
                  padded={false}
                  index={idx}
                  testID={`mentor-${m.id}`}
                >
                  <Image source={{ uri: m.avatar }} style={styles.mentorAvatar} />
                  <View style={{ padding: 12, paddingTop: 8 }}>
                    <Text
                      style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 13 }]}
                      numberOfLines={1}
                    >
                      {m.full_name}
                    </Text>
                    <Text
                      style={[Typography.bodySm, { color: C.textSecondary, fontSize: 11 }]}
                      numberOfLines={1}
                    >
                      {m.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                      <Star size={12} color={C.warning} fill={C.warning} />
                      <Text style={[Typography.bodySm, { fontSize: 11, color: C.textSecondary }]}>
                        {m.rating}
                      </Text>
                    </View>
                  </View>
                </AnimatedCard>
              ))}
            </ScrollView>
          </>
        )}

        {/* ===== Featured deals strip ===== */}
        {data?.featured_deals?.length > 0 && (
          <>
            <SectionHeader
              icon={<Tag size={16} color={C.brandPurple} />}
              title="Top student deals"
              right={
                <Pressable onPress={() => router.push('/(tabs)/deals')}>
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              }
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: Spacing.lg }}
            >
              {data.featured_deals.map((d: any, idx: number) => (
                <AnimatedCard
                  key={d.id}
                  onPress={() => router.push('/(tabs)/deals')}
                  style={{ width: 200 }}
                  padded={false}
                  index={idx}
                  testID={`deal-${d.id}`}
                >
                  <Image source={{ uri: d.image }} style={styles.dealImg} />
                  <View style={{ padding: 12 }}>
                    <Text style={[Typography.label, { color: C.textSecondary, fontSize: 9 }]}>
                      {d.brand}
                    </Text>
                    <Text
                      style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 13 }]}
                      numberOfLines={1}
                    >
                      {d.title}
                    </Text>
                    <Text
                      style={[
                        Typography.bodyBold,
                        { color: C.brandPurple, marginTop: 4, fontSize: 13 },
                      ]}
                    >
                      {d.discount}
                    </Text>
                  </View>
                </AnimatedCard>
              ))}
            </ScrollView>
          </>
        )}

        {/* ===== Promotions strip — demoted modules ===== */}
        {promoIds.length > 0 && activeFilter === 'all' && (
          <>
            <SectionHeader
              title="Promotions"
              subtitle="Other useful modules"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: Spacing.lg }}
            >
              {promoIds.map((id, idx) => {
                const m = MODULES[id];
                if (!m) return null;
                const Icon = m.icon;
                return (
                  <AnimatedCard
                    key={id}
                    onPress={() => handleTilePress(id, m.route)}
                    style={styles.promoCard}
                    index={idx}
                    testID={`promo-${id}`}
                  >
                    <View style={[styles.promoIcon, { backgroundColor: m.tint }]}>
                      <Icon size={20} color={m.iconColor} />
                    </View>
                    <Text
                      style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 13, marginTop: 8 }]}
                      numberOfLines={2}
                    >
                      {m.label.replace('\n', ' ')}
                    </Text>
                  </AnimatedCard>
                );
              })}
            </ScrollView>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SectionHeader sub-component
// ---------------------------------------------------------------------------
function SectionHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <StaggerView style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon}
          <Text style={[Typography.h3, { color: C.textPrimary, fontSize: 18 }]}>{title}</Text>
        </View>
        {subtitle && (
          <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </StaggerView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heroKicker: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 10,
  },
  heroGreeting: { ...Typography.h3, color: C.white, marginTop: 2, fontSize: 22 },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  chipRow: { gap: 8, paddingTop: 4, paddingRight: Spacing.lg },
  chip: {
    borderRadius: 18,
    height: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: C.white, borderColor: C.white, borderWidth: 1 },
  chipInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  scroll: { paddingTop: Spacing.lg, paddingBottom: 40 },

  pendingBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
  },
  alumniBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: C.palePurple,
    borderLeftWidth: 4,
    borderLeftColor: C.brandPurple,
  },
  alumniIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.brandPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: C.palePurple,
    borderLeftWidth: 4,
    borderLeftColor: '#00A78E',
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A78E',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  seeAll: {
    ...Typography.bodySm,
    color: C.brandPurple,
    fontFamily: 'DMSans_600SemiBold',
  },
  editPrefsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: C.palePurple,
  },

  recRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  recCard: { overflow: 'hidden' },
  recImg: { width: '100%', height: 90, backgroundColor: C.surfaceMuted },
  recMentorTop: {
    height: 90,
    backgroundColor: C.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: C.white },

  closingCard: { width: 200, overflow: 'hidden' },
  closingImg: { width: '100%', height: 80, backgroundColor: C.surfaceMuted },

  aiCard: { padding: 18 },
  milestoneOnDark: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  refreshBtn: {
    backgroundColor: C.white,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignSelf: 'flex-start',
    marginTop: 14,
  },

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingTop: 4,
  },
  tileCell: {
    width: '25%',
    paddingVertical: 8,
    alignItems: 'center',
  },

  mentorCard: { width: 150, overflow: 'hidden' },
  mentorAvatar: { width: '100%', height: 110, backgroundColor: C.palePurple },

  dealImg: { width: '100%', height: 90, backgroundColor: C.surfaceMuted },

  promoCard: { width: 130, alignItems: 'flex-start' },
  promoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
