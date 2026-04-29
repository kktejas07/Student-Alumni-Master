/**
 * Home Tab - Student Alumni Dashboard
 * =====================================
 * Implements the 8-module dashboard per spec, with content prioritization
 * driven by the backend /dashboard `personalization` payload.
 *
 * Module priority order is determined server-side:
 *  - Class 11/12 students: scholarships + campus tours first
 *  - University students: career_guidelines + internships + hackathons first
 *  - All roles see all 8 modules but in a personalized order
 *
 * Design: minimalist Material 3 inspired — soft shadows, generous spacing,
 * brand purple as primary accent, no harsh red.
 */
import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
} from 'lucide-react-native';
import { Colors as C, Spacing, Typography, Shadows } from '@/src/theme';
import { Card, SALogo } from '@/src/views/components';
import { useAuth, useDashboard, useCareerSuggestions } from '@/src/viewmodels/hooks';

// 8-module catalog metadata. Order is overridden by personalization.priority_modules.
// Each module has icon, label, color tint, and route.
const MODULES: Record<
  string,
  { label: string; icon: any; tint: string; route: string; testID: string }
> = {
  career_guidelines: {
    label: 'Career\nGuidelines',
    icon: Compass,
    tint: '#EDE0F7',
    route: '/internships',
    testID: 'mod-career-guidelines',
  },
  events: {
    label: 'Events',
    icon: Calendar,
    tint: '#FCE4EC',
    route: '/events',
    testID: 'mod-events',
  },
  courses: {
    label: 'Courses',
    icon: BookOpen,
    tint: '#E3F2FD',
    route: '/(tabs)/courses',
    testID: 'mod-courses',
  },
  networking: {
    label: 'Networking',
    icon: Users,
    tint: '#E8F5E9',
    route: '/(tabs)/network',
    testID: 'mod-networking',
  },
  financial: {
    label: 'Financial\nServices',
    icon: CreditCard,
    tint: '#FFF8E1',
    route: '/resources?cat=loans',
    testID: 'mod-financial',
  },
  insurance: {
    label: 'Insurance',
    icon: Shield,
    tint: '#F3E5F5',
    route: '/resources?cat=insurance',
    testID: 'mod-insurance',
  },
  housing: {
    label: 'Housing',
    icon: HomeIcon,
    tint: '#E0F7FA',
    route: '/resources?cat=housing',
    testID: 'mod-housing',
  },
  deals: {
    label: 'Deals',
    icon: Tag,
    tint: '#FFEBEE',
    route: '/(tabs)/deals',
    testID: 'mod-deals',
  },
  // School-student priority modules
  scholarships: {
    label: 'Scholarships',
    icon: GraduationCap,
    tint: '#FFF8E1',
    route: '/resources?cat=loans',
    testID: 'mod-scholarships',
  },
  campus_tours: {
    label: 'Campus\nTours',
    icon: Briefcase,
    tint: '#E8F5E9',
    route: '/events',
    testID: 'mod-campus-tours',
  },
};

// Default order if backend doesn't supply personalization
const DEFAULT_MODULES = [
  'career_guidelines', 'events', 'courses', 'networking',
  'financial', 'insurance', 'housing', 'deals',
];

const PATH_LABELS: Record<string, string> = {
  job: 'Job Path',
  higher_education: 'Higher Ed Path',
  startup: 'Startup Path',
  business: 'Business Path',
};

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, refetch } = useDashboard();
  const { suggestion, generate, loadCached, loading: aiLoading } = useCareerSuggestions();

  useEffect(() => {
    loadCached();
  }, []);

  // Resolve module order: server-provided priority OR default 8
  const moduleIds: string[] = data?.personalization?.priority_modules?.length
    ? data.personalization.priority_modules
    : DEFAULT_MODULES;

  const path = user?.career_path;

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={C.brandPurple} />}
      >
        {/* ===== Header ===== */}
        <View style={styles.headerRow}>
          <SALogo size={36} variant="gradient" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.kicker}>{path ? PATH_LABELS[path].toUpperCase() : 'WELCOME'}</Text>
            <Text style={styles.greeting}>Hi, {user?.full_name?.split(' ')[0] || 'there'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/chat')} testID="home-chat-btn" style={styles.chatBtn}>
            <MessageCircle size={20} color={C.brandPurple} />
          </TouchableOpacity>
        </View>

        {/* ===== Mentor pending banner — only for mentors awaiting approval ===== */}
        {user?.role === 'mentor' && user?.mentor_status === 'pending' && (
          <Card style={[styles.pendingBanner]}>
            <Text style={[Typography.bodyBold, { color: C.deepPurple }]}>Account Under Review</Text>
            <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4 }]}>
              Your mentor profile is being reviewed. You'll be notified within 24-48 hours.
            </Text>
          </Card>
        )}

        {/* ===== AI Career Roadmap Card ===== */}
        <View style={styles.aiCardWrap}>
          <Card style={styles.aiCard} bg={C.deepPurple}>
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
                        <Text style={[Typography.label, { color: C.lightPurple, fontSize: 10 }]}>{m.timeframe}</Text>
                        <Text style={[Typography.bodyBold, { color: C.white }]}>{m.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => generate()}
                  testID="home-refresh-roadmap-btn"
                  style={styles.refreshBtn}
                >
                  <Text style={[Typography.bodyBold, { color: C.deepPurple, fontSize: 14 }]}>
                    {aiLoading ? 'Refreshing…' : 'Refresh roadmap'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[Typography.body, { color: C.white, marginTop: 4 }]}>
                  Generate your personalized AI roadmap with milestones and skills.
                </Text>
                <TouchableOpacity
                  onPress={() => generate()}
                  testID="home-generate-roadmap-btn"
                  style={styles.refreshBtn}
                >
                  <Text style={[Typography.bodyBold, { color: C.deepPurple, fontSize: 14 }]}>
                    {aiLoading ? 'Generating…' : 'Generate my roadmap ✨'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>

        {/* ===== 8-MODULE PRIORITY GRID ===== */}
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.modulesGrid}>
          {moduleIds.map((id) => {
            const m = MODULES[id];
            if (!m) return null;
            const Icon = m.icon;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => router.push(m.route as any)}
                activeOpacity={0.7}
                style={styles.moduleCell}
                testID={m.testID}
              >
                <Card style={styles.moduleCard}>
                  <View style={[styles.moduleIcon, { backgroundColor: m.tint }]}>
                    <Icon size={22} color={C.deepPurple} />
                  </View>
                  <Text style={[Typography.bodyBold, styles.moduleLabel]}>{m.label}</Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===== Featured events strip ===== */}
        {data?.featured_events?.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <TouchableOpacity onPress={() => router.push('/events')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {data.featured_events.map((e: any) => (
                <TouchableOpacity key={e.id} style={{ width: 240 }} testID={`evt-${e.id}`}>
                  <Card padded={false} style={{ overflow: 'hidden' }}>
                    <Image source={{ uri: e.image }} style={styles.eventImg} />
                    <View style={{ padding: 14 }}>
                      <Text style={[Typography.label, { color: C.brandPurple, fontSize: 10 }]}>
                        {e.category?.toUpperCase()}
                      </Text>
                      <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={2}>
                        {e.title}
                      </Text>
                      <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4 }]}>
                        {e.start_date} · {e.venue}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ===== Featured deals strip ===== */}
        {data?.featured_deals?.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Student Deals</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/deals')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {data.featured_deals.map((d: any) => (
                <TouchableOpacity key={d.id} style={{ width: 220 }} testID={`deal-${d.id}`}>
                  <Card padded={false} style={{ overflow: 'hidden' }}>
                    <Image source={{ uri: d.image }} style={styles.dealImg} />
                    <View style={{ padding: 14 }}>
                      <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>{d.brand}</Text>
                      <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>{d.title}</Text>
                      <Text style={[Typography.bodyBold, { color: C.brandPurple, marginTop: 4, fontSize: 14 }]}>
                        {d.discount}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  kicker: { ...Typography.label, color: C.brandPurple, fontSize: 10 },
  greeting: { ...Typography.h2, color: C.textPrimary, marginTop: 2 },
  chatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  pendingBanner: { marginBottom: 16, backgroundColor: C.warningSoft, borderLeftWidth: 4, borderLeftColor: C.warning },
  aiCardWrap: { marginBottom: Spacing.lg },
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
  sectionTitle: { ...Typography.h3, color: C.textPrimary, marginBottom: 12, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  seeAll: { ...Typography.bodySm, color: C.brandPurple, fontFamily: 'DMSans_600SemiBold' },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  moduleCell: {
    width: '47.5%',
  },
  moduleCard: {
    padding: 16,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleLabel: { color: C.textPrimary, fontSize: 14, lineHeight: 18 },
  eventImg: { width: '100%', height: 110, backgroundColor: C.surfaceMuted },
  dealImg: { width: '100%', height: 100, backgroundColor: C.surfaceMuted },
});
