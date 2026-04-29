/**
 * Home / Dashboard tab — career roadmap, stats, featured items
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
} from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, NeoCard } from '@/src/views/components';
import { useAuth, useDashboard, useCareerSuggestions } from '@/src/viewmodels/hooks';

const C = Colors.light;

const PATH_LABELS: Record<string, { label: string; color: string }> = {
  job: { label: 'Job Path', color: C.accentMint },
  higher_education: { label: 'Higher Education Path', color: C.accentBlue },
  startup: { label: 'Startup Path', color: C.accentPink },
  business: { label: 'Business Path', color: C.accentYellow },
};

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, refetch } = useDashboard();
  const { suggestion, generate, loadCached, loading: aiLoading } = useCareerSuggestions();

  useEffect(() => {
    loadCached();
  }, []);

  const path = user?.career_path;
  const pathInfo = path ? PATH_LABELS[path] : null;

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {/* Greeting */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{pathInfo?.label.toUpperCase() || 'YOUR DASHBOARD'}</Text>
            <Text style={styles.greeting}>
              Hi, {user?.full_name?.split(' ')[0] || 'there'} 👋
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/chat')}
            testID="home-chat-btn"
            style={styles.chatBtn}
          >
            <MessageCircle size={22} color={C.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* AI Career Roadmap Card */}
        <NeoCard bg={pathInfo?.color || C.accentYellow} shadow="md" style={{ marginBottom: Spacing.md }}>
          <View style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color={C.textPrimary} />
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>AI Career Roadmap</Text>
            </View>

            {suggestion?.summary ? (
              <>
                <Text style={[Typography.body, { color: C.textPrimary }]} testID="home-ai-summary">
                  {suggestion.summary}
                </Text>
                {suggestion.milestones?.length > 0 && (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {suggestion.milestones.slice(0, 3).map((m: any, idx: number) => (
                      <View key={idx} style={styles.milestone}>
                        <Text style={[Typography.caption, { color: C.textPrimary }]}>{m.timeframe}</Text>
                        <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{m.title}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Button
                  title="Refresh roadmap"
                  variant="secondary"
                  loading={aiLoading}
                  onPress={() => generate()}
                  testID="home-refresh-roadmap-btn"
                  style={{ marginTop: 8 }}
                />
              </>
            ) : (
              <>
                <Text style={[Typography.body, { color: C.textPrimary }]}>
                  Generate your personalized AI roadmap with milestones, skills and courses tailored to
                  your path.
                </Text>
                <Button
                  title={aiLoading ? 'Generating...' : 'Generate my roadmap ✨'}
                  loading={aiLoading}
                  onPress={() => generate()}
                  testID="home-generate-roadmap-btn"
                  style={{ marginTop: 8 }}
                />
              </>
            )}
          </View>
        </NeoCard>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          <StatCard
            icon={<BookOpen size={20} color={C.textPrimary} />}
            value={data?.stats?.courses_available || 0}
            label="Courses"
            color={C.accentMint}
            onPress={() => router.push('/(tabs)/courses')}
            testID="stat-courses"
          />
          <StatCard
            icon={<Users size={20} color={C.textPrimary} />}
            value={data?.stats?.mentors_available || 0}
            label="Mentors"
            color={C.accentBlue}
            onPress={() => router.push('/(tabs)/network')}
            testID="stat-mentors"
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon={<Briefcase size={20} color={C.textPrimary} />}
            value={data?.stats?.internships_available || 0}
            label="Internships"
            color={C.accentPink}
            onPress={() => router.push('/internships')}
            testID="stat-internships"
          />
          <StatCard
            icon={<Tag size={20} color={C.textPrimary} />}
            value={data?.stats?.deals_available || 0}
            label="Deals"
            color={C.accentYellow}
            onPress={() => router.push('/(tabs)/deals')}
            testID="stat-deals"
          />
        </View>

        {/* Featured courses */}
        {data?.featured_courses?.length > 0 && (
          <Section
            title="Featured Courses"
            onSeeAll={() => router.push('/(tabs)/courses')}
            testID="section-courses"
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {data.featured_courses.map((c: any) => (
                <TouchableOpacity key={c.id} style={{ width: 240 }} testID={`course-card-${c.id}`}>
                  <NeoCard shadow="sm">
                    <Image source={{ uri: c.image }} style={styles.courseImg} />
                    <Text style={[Typography.caption, { color: C.textSecondary, marginTop: 8 }]}>
                      {c.provider}
                    </Text>
                    <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={2}>
                      {c.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <View style={[styles.tag, { backgroundColor: c.is_free ? C.accentMint : C.accentYellow }]}>
                        <Text style={[Typography.caption, { color: C.textPrimary, fontSize: 10 }]}>
                          {c.is_free ? 'FREE' : 'PAID'}
                        </Text>
                      </View>
                      <View style={[styles.tag, { backgroundColor: C.surfaceMuted }]}>
                        <Text style={[Typography.caption, { color: C.textPrimary, fontSize: 10 }]}>
                          {c.level}
                        </Text>
                      </View>
                    </View>
                  </NeoCard>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}

        {/* Featured deals */}
        {data?.featured_deals?.length > 0 && (
          <Section
            title="Top Student Deals"
            onSeeAll={() => router.push('/(tabs)/deals')}
            testID="section-deals"
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {data.featured_deals.map((d: any) => (
                <TouchableOpacity key={d.id} style={{ width: 240 }} testID={`deal-card-${d.id}`}>
                  <NeoCard shadow="sm">
                    <Image source={{ uri: d.image }} style={styles.courseImg} />
                    <Text style={[Typography.caption, { color: C.textSecondary, marginTop: 8 }]}>
                      {d.brand} · {d.category}
                    </Text>
                    <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={2}>
                      {d.title}
                    </Text>
                    <Text style={[Typography.bodySm, { color: C.accentPink, marginTop: 4, fontFamily: 'Manrope_600SemiBold' }]}>
                      {d.discount}
                    </Text>
                  </NeoCard>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, color, onPress, testID }: any) {
  return (
    <TouchableOpacity onPress={onPress} testID={testID} style={{ flex: 1 }}>
      <NeoCard bg={color} shadow="sm">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {icon}
          <Text style={[Typography.h3, { color: C.textPrimary }]}>{value}</Text>
        </View>
        <Text style={[Typography.bodySm, { color: C.textPrimary }]}>{label}</Text>
      </NeoCard>
    </TouchableOpacity>
  );
}

function Section({ title, children, onSeeAll, testID }: any) {
  return (
    <View style={{ marginTop: Spacing.lg }} testID={testID}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[Typography.bodySm, { color: C.accentPink }]}>See all</Text>
            <ArrowRight size={14} color={C.accentPink} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  kicker: { ...Typography.caption, color: C.textSecondary },
  greeting: { ...Typography.h2, color: C.textPrimary, marginTop: 2 },
  chatBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  milestone: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    padding: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { ...Typography.h3, color: C.textPrimary },
  courseImg: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surfaceMuted,
  },
  tag: {
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
