/**
 * Analytics Dashboard — adaptive, role-aware
 * ============================================
 * Renders different sections based on the user's role:
 *  - admin       → Platform-wide KPIs, growth, top colleges, mentor categories, revenue
 *  - college     → Their institution's students/alumni breakdown + enrollment trend
 *  - mentor      → Their bookings, ratings, hours, weekly trend, top topics, upcoming sessions
 *
 * One screen, three modes — fewer files, less duplication.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Users, GraduationCap, Briefcase, Building2,
  Calendar, Clock, Star, DollarSign, TrendingUp, BookOpen,
} from 'lucide-react-native';
import { Colors as C, Typography, Spacing, Radius, Gradients } from '@/src/theme';
import {
  KpiCard, LineChart, BarChart, DonutChart, ChartSection,
} from '@/src/views/components/Charts';
import { AnimatedCard } from '@/src/views/components';
import { useAuth } from '@/src/viewmodels/hooks';
import { api } from '@/src/models/services/api';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.analytics();
      setData(r);
    } catch (e) {
      console.error('analytics fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={C.brandPurple} /></View>
      </SafeAreaView>
    );
  }

  const scope = data?.scope;
  const roleLabel =
    scope === 'platform' ? 'PLATFORM ADMIN' :
    scope === 'college' ? 'COLLEGE ADMIN' :
    scope === 'mentor' ? 'MENTOR ANALYTICS' :
    'ANALYTICS';

  const greeting =
    scope === 'platform' ? 'Platform overview' :
    scope === 'college' ? data?.institution_name :
    scope === 'mentor' ? `Hi, ${user?.full_name?.split(' ')[0] || ''}` :
    'Dashboard';

  return (
    <View style={styles.safe}>
      {/* Hero */}
      <LinearGradient colors={Gradients.heroDiagonal as any} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} testID="analytics-back">
              <ArrowLeft size={20} color={C.white} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.heroKicker}>{roleLabel}</Text>
              <Text style={styles.heroGreeting} numberOfLines={1}>{greeting}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={C.brandPurple} />}
        showsVerticalScrollIndicator={false}
      >
        {scope === 'platform' && <PlatformDashboard data={data} />}
        {scope === 'college' && <CollegeDashboard data={data} />}
        {scope === 'mentor' && <MentorDashboard data={data} />}
        {scope === 'none' && (
          <View style={styles.emptyState}>
            <Text style={[Typography.h3, { color: C.textPrimary, textAlign: 'center' }]}>
              Analytics not available for this role
            </Text>
            <Text style={[Typography.body, { color: C.textSecondary, textAlign: 'center', marginTop: 8 }]}>
              Sign in as admin, college, or mentor to view your dashboard.
            </Text>
          </View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Platform / Super-Admin dashboard
// ---------------------------------------------------------------------------
function PlatformDashboard({ data }: { data: any }) {
  const k = data.kpis;
  return (
    <>
      {/* KPI grid */}
      <View style={styles.kpiGrid}>
        <KpiCard label="Total users" value={k.total_users} accent={C.brandPurple} testID="kpi-total-users" />
        <KpiCard label="Students" value={k.students} accent="#5F259F" />
        <KpiCard label="Alumni" value={k.alumni} accent="#00A78E" />
        <KpiCard label="Mentors" value={k.mentors} accent="#F4A22C" />
        <KpiCard label="Colleges" value={k.colleges} accent="#3B82F6" />
        <KpiCard label="Pending mentors" value={k.pending_mentors} accent={C.danger} />
      </View>

      <ChartSection
        title="User growth"
        subtitle="New signups (last 14 days)"
      >
        <LineChart data={data.growth_series.map((g: any) => ({ value: g.count, label: g.date }))} />
      </ChartSection>

      <ChartSection title="Role distribution" subtitle="Across the platform">
        <DonutChart data={data.role_distribution} />
      </ChartSection>

      {data.mentor_categories?.length > 0 && (
        <ChartSection title="Mentor categories" subtitle="Approved mentors only">
          <BarChart data={data.mentor_categories} color="#F4A22C" />
        </ChartSection>
      )}

      {data.top_colleges?.length > 0 && (
        <ChartSection title="Top institutions" subtitle="By total user count">
          <View style={{ gap: 8 }}>
            {data.top_colleges.map((c: any, idx: number) => (
              <View key={c.name} style={styles.row}>
                <Text style={[Typography.bodyBold, { color: C.brandPurple, width: 22 }]}>#{idx + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[Typography.bodySm, { color: C.textSecondary }]}>
                    {c.students} students · {c.alumni} alumni
                  </Text>
                </View>
                <Text style={[Typography.h4, { color: C.brandPurple }]}>{c.total}</Text>
              </View>
            ))}
          </View>
        </ChartSection>
      )}

      {data.revenue && (
        <ChartSection title="Revenue (mocked)" subtitle="Connect a payments collection to wire real numbers">
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <KpiCard label="MTD" value={`₹${data.revenue.mtd.toLocaleString()}`} accent={C.brandPurple} />
            <KpiCard label="YTD" value={`₹${(data.revenue.ytd / 1000).toFixed(0)}K`} accent="#00A78E" />
          </View>
          <BarChart
            data={data.revenue.by_source.map((r: any) => ({ label: r.label.split(' ')[0], value: r.value }))}
            color={C.brandPurple}
          />
        </ChartSection>
      )}

      {data.recent_signups?.length > 0 && (
        <ChartSection title="Recent signups" subtitle="Latest activity">
          <View style={{ gap: 8 }}>
            {data.recent_signups.slice(0, 5).map((s: any, idx: number) => (
              <View key={idx} style={styles.activityRow}>
                <View style={[styles.dot, { backgroundColor: roleColor(s.role) }]} />
                <Text style={[Typography.body, { flex: 1, color: C.textPrimary }]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{s.role}</Text>
              </View>
            ))}
          </View>
        </ChartSection>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// College dashboard
// ---------------------------------------------------------------------------
function CollegeDashboard({ data }: { data: any }) {
  const k = data.kpis;
  return (
    <>
      <View style={styles.kpiGrid}>
        <KpiCard label="Students" value={k.total_students} accent="#5F259F" />
        <KpiCard label="Alumni" value={k.total_alumni} accent="#00A78E" />
        <KpiCard label="Mentors" value={k.total_mentors} accent="#F4A22C" />
        <KpiCard label="Bookings" value={k.total_bookings_by_students} accent={C.brandPurple} />
      </View>

      <ChartSection title="Enrollment trend" subtitle="New users (last 14 days)">
        <LineChart data={data.enrollment_series.map((g: any) => ({ value: g.count, label: g.date }))} />
      </ChartSection>

      {data.education_distribution?.length > 0 && (
        <ChartSection title="Education levels" subtitle="Student breakdown">
          <BarChart data={data.education_distribution} color="#5F259F" />
        </ChartSection>
      )}

      {data.career_path_distribution?.length > 0 && (
        <ChartSection title="Career paths" subtitle="What students are aiming for">
          <DonutChart data={data.career_path_distribution} />
        </ChartSection>
      )}

      {data.top_alumni?.length > 0 && (
        <ChartSection title="Notable alumni" subtitle="Recent / top profiles">
          <View style={{ gap: 8 }}>
            {data.top_alumni.map((a: any, idx: number) => (
              <View key={idx} style={styles.row}>
                <View style={styles.alumniAvatar}>
                  <Text style={{ color: C.white, fontFamily: 'DMSans_700Bold' }}>
                    {(a.name || '?').split(' ').map((s: string) => s[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>{a.name}</Text>
                  <Text style={[Typography.bodySm, { color: C.textSecondary }]} numberOfLines={1}>
                    {a.role || 'Alumnus'} {a.employer ? `· ${a.employer}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ChartSection>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mentor dashboard
// ---------------------------------------------------------------------------
function MentorDashboard({ data }: { data: any }) {
  const k = data.kpis;
  return (
    <>
      <View style={styles.kpiGrid}>
        <KpiCard label="Total bookings" value={k.total_bookings} accent={C.brandPurple} testID="kpi-total-bookings" />
        <KpiCard label="Completed" value={k.completed_sessions} accent="#00A78E" />
        <KpiCard label="Upcoming" value={k.upcoming_sessions} accent="#F4A22C" />
        <KpiCard label="Hours mentored" value={k.hours_mentored} suffix="h" accent="#3B82F6" />
        <KpiCard label="Earnings" value={`₹${k.estimated_earnings.toLocaleString()}`} accent={C.brandPurple} />
        <KpiCard label="Rating" value={data.rating} suffix="/5" accent="#F4A22C" />
      </View>

      <ChartSection title="Bookings trend" subtitle="Last 8 weeks">
        <LineChart
          data={data.weekly_bookings.map((w: any) => ({ value: w.count, label: w.week }))}
          color={C.brandPurple}
        />
      </ChartSection>

      {data.top_topics?.length > 0 && (
        <ChartSection title="Top topics" subtitle="Most-requested session types">
          <BarChart data={data.top_topics} color="#00A78E" />
        </ChartSection>
      )}

      {data.upcoming_sessions_list?.length > 0 && (
        <ChartSection title="Upcoming sessions" subtitle={`${data.upcoming_sessions_list.length} scheduled`}>
          <View style={{ gap: 10 }}>
            {data.upcoming_sessions_list.map((s: any, idx: number) => (
              <AnimatedCard key={s.id || idx} style={styles.sessionCard} index={idx}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>
                    {s.student_name}
                  </Text>
                  <Text style={[Typography.bodySm, { color: C.textSecondary }]} numberOfLines={1}>{s.topic}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Clock size={12} color={C.brandPurple} />
                    <Text style={[Typography.bodySm, { color: C.brandPurple }]}>
                      {formatDate(s.scheduled_at)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusPill, statusColor(s.status)]}>
                  <Text style={[Typography.label, { color: C.white, fontSize: 9 }]}>
                    {(s.status || 'pending').toUpperCase()}
                  </Text>
                </View>
              </AnimatedCard>
            ))}
          </View>
        </ChartSection>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function roleColor(role: string): string {
  return {
    student: '#5F259F',
    alumni: '#00A78E',
    mentor: '#F4A22C',
    admin: C.danger,
    college: '#3B82F6',
  }[role] || C.textSecondary;
}

function statusColor(status: string) {
  if (status === 'confirmed') return { backgroundColor: '#00A78E' };
  if (status === 'completed') return { backgroundColor: C.brandPurple };
  if (status === 'cancelled') return { backgroundColor: C.danger };
  return { backgroundColor: '#F4A22C' };
}

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)',
  },
  heroKicker: { ...Typography.label, color: 'rgba(255,255,255,0.78)', fontSize: 10 },
  heroGreeting: { ...Typography.h2, color: C.white, marginTop: 2, fontSize: 22 },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.lg },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    marginBottom: Spacing.lg,
  },
  emptyState: {
    flex: 1, padding: Spacing.xl, alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 6,
  },
  alumniAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.brandPurple,
    alignItems: 'center', justifyContent: 'center',
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sessionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill,
  },
});
