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
  View, Text, ScrollView, Pressable,
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

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-bg2">
        <View className="flex-1 items-center justify-center">
          {loading ? (
            <ActivityIndicator size="large" color={C.brandPurple} />
          ) : (
            <Text className="text-text">Failed to load analytics data.</Text>
          )}
        </View>
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
    <View className="flex-1 bg-bg2">
      {/* Hero */}
      <LinearGradient colors={Gradients.heroDiagonal as any} className="px-4 pb-4 rounded-b-3xl">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center pt-2">
            <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full items-center justify-center bg-glass border border-glass-border" testID="analytics-back">
              <ArrowLeft size={20} color={C.white} />
            </Pressable>
            <View className="flex-1 ml-3">
              <Text className="text-muted text-xs font-body-semibold">ROLE_LABEL</Text>
              <Text className="text-text font-display-bold text-lg mt-0.5" numberOfLines={1}>{greeting}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: Spacing.lg, paddingTop: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={C.brandPurple} />}
        showsVerticalScrollIndicator={false}
      >
        {scope === 'platform' && <PlatformDashboard data={data} />}
        {scope === 'college' && <CollegeDashboard data={data} />}
        {scope === 'mentor' && <MentorDashboard data={data} />}
        {scope === 'none' && (
          <View className="flex-1 py-16 items-center justify-center">
            <Text className="text-text text-center text-lg">
              Analytics not available for this role
            </Text>
            <Text className="text-muted text-center text-sm mt-2">
              Sign in as admin, college, or mentor to view your dashboard.
            </Text>
          </View>
        )}
        <View className="h-16" />
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
      <View className="flex-row flex-wrap gap-3 mb-4">
        <KpiCard label="Total users" value={k.total_users} accent={C.brandPurple} testID="kpi-total-users" />
        <KpiCard label="Students" value={k.students} accent="#5F259F" />
        <KpiCard label="Alumni" value={k.alumni} accent="#00A78E" />
        <KpiCard label="Mentors" value={k.mentors} accent="#F4A22C" />
        <KpiCard label="Colleges" value={k.colleges} accent="#3B82F6" />
        <KpiCard label="Pending mentors" value={k.pending_mentors} accent={C.danger} />
      </View>

      <ChartSection title="User growth" subtitle="New signups (last 14 days)">
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
          <View className="gap-2">
            {data.top_colleges.map((c: any, idx: number) => (
              <View key={c.name} className="flex-row items-center gap-3 py-1.5">
                <Text className="text-violet font-body-bold text-sm" style={{ width: 22 }}>#{idx + 1}</Text>
                <View className="flex-1">
                  <Text className="text-text font-body-bold text-sm" numberOfLines={1}>{c.name}</Text>
                  <Text className="text-muted text-xs">
                    {c.students} students · {c.alumni} alumni
                  </Text>
                </View>
                <Text className="text-violet font-display-bold text-base">{c.total}</Text>
              </View>
            ))}
          </View>
        </ChartSection>
      )}

      {data.revenue && (
        <ChartSection title="Revenue (mocked)" subtitle="Connect a payments collection to wire real numbers">
          <View className="flex-row gap-3 mb-3">
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
          <View className="gap-2">
            {data.recent_signups.slice(0, 5).map((s: any, idx: number) => (
              <View key={idx} className="flex-row items-center gap-2 py-1">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: roleColor(s.role) }} />
                <Text className="text-text text-sm flex-1" numberOfLines={1}>
                  {s.name}
                </Text>
                <Text className="text-muted text-xs">{s.role}</Text>
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
      <View className="flex-row flex-wrap gap-3 mb-4">
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
          <View className="gap-2">
            {data.top_alumni.map((a: any, idx: number) => (
              <View key={idx} className="flex-row items-center gap-3 py-1.5">
                <View className="w-9 h-9 rounded-full items-center justify-center bg-violet">
                  <Text className="text-text font-body-bold text-sm">
                    {(a.name || '?').split(' ').map((s: string) => s[0]).join('')}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-text font-body-bold text-sm" numberOfLines={1}>{a.name}</Text>
                  <Text className="text-muted text-xs" numberOfLines={1}>
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
      <View className="flex-row flex-wrap gap-3 mb-4">
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
          <View className="gap-2.5">
            {data.upcoming_sessions_list.map((s: any, idx: number) => (
              <AnimatedCard key={s.id || idx} className="flex-row items-center gap-3" index={idx}>
                <View className="flex-1">
                  <Text className="text-text font-body-bold text-sm" numberOfLines={1}>
                    {s.student_name}
                  </Text>
                  <Text className="text-muted text-xs" numberOfLines={1}>{s.topic}</Text>
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <Clock size={12} color={C.brandPurple} />
                    <Text className="text-violet text-xs">
                      {formatDate(s.scheduled_at)}
                    </Text>
                  </View>
                </View>
                <View className="px-2 py-0.5 rounded-full" style={statusColor(s.status)}>
                  <Text className="text-text text-xs font-body-bold" style={{ fontSize: 9 }}>
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
