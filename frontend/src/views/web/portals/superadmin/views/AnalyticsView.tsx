/**
 * Super Admin — Analytics Dashboard
 *
 * Real-time analytics combining MongoDB + Firebase Analytics + PostHog.
 * Sections: KPIs, growth, roles, engagement, devices, geography, funnel,
 * active hours heat map, retention, page views, error tracking, predictions,
 * session duration, activity feed, top colleges.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, ScrollView,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3, Users, TrendingUp, Activity, Calendar, Download, RefreshCw,
  Globe, Monitor, Smartphone, Sparkles, Eye,
  Clock, FileText, AlertTriangle, Zap, Timer, Target,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Card, KpiTile, GRAD, SecondaryButton, StatusPill, LoadingBox } from '../applekit';
import { usePortalData } from '@/src/lib/portalApi';

// ── Types ───────────────────────────────────────────────────────────────────
type KPIs = {
  total_signups: number; active_users_30d: number; new_signups_30d: number;
  signups_mom_pct: number; total_bookings: number; revenue_mtd: number;
  revenue_ytd: number; total_events: number; echo_registrations: number;
};
type GrowthPoint = { month: string; year: number; count: number; cumulative: number };
type RoleDist = { label: string; value: number; color: string };
type Engagement = {
  total_activity_events_30d: number; unique_active_users_30d: number;
  avg_events_per_user: number;
  top_categories: { category: string; count: number; pct: number }[];
  daily_active_series: { date: string; count: number }[];
};
type DeviceData = { by_os: { label: string; value: number; pct: number }[]; by_browser: { label: string; value: number; pct: number }[]; by_kind: { label: string; value: number; pct: number }[] };
type GeoData = { countries: { country: string; count: number; pct: number }[]; cities: { city: string; country: string; count: number }[] };
type FunnelStage = { label: string; v: number; color: string };
type ActivityItem = { type: string; title: string; subtitle: string; timestamp: string };
type College = { name: string; students: number; alumni: number; total: number };
type FirebaseData = {
  realtime_active: { active_users: number; configured: boolean };
  session_duration: { avg_duration_sec: number; total_sessions: number; configured: boolean };
  active_hours: { hours: { hour: number; count: number }[]; configured: boolean };
  retention: { cohorts: { cohort: string; week: string; users: number }[]; configured: boolean };
  page_views: { pages: { path: string; views: number }[]; configured: boolean };
  engagement: { bounce_rate: number; engagement_rate: number; views_per_session: number; configured: boolean };
  acquisition: { sources: { source: string; sessions: number }[]; configured: boolean };
  demographics: { countries: { country: string; count: number }[]; cities: { city: string; country: string; count: number }[]; configured: boolean };
  devices: { by_os: { label: string; value: number }[]; by_browser: { label: string; value: number }[]; by_device: { label: string; value: number }[]; configured: boolean };
  daily_active: { series: { date: string; count: number }[]; configured: boolean };
};
type PostHogData = {
  configured: boolean;
  reason?: string;
  host?: string;
  project_id?: number;
  realtime_active?: number;
  totals_30d?: { events: number; users: number; pageviews: number };
  daily_series?: { date: string; events: number; users: number }[];
  top_events?: { event: string; count: number }[];
  top_paths?: { path: string; views: number }[];
  sources?: { source: string; sessions: number }[];
  countries?: { country: string; count: number }[];
  devices?: { by_os: { label: string; value: number }[]; by_browser: { label: string; value: number }[]; by_device: { label: string; value: number }[] };
  sessions?: { sessions: number; users: number; has_session_data: boolean };
};
type ErrorData = { total_errors_30d: number; auth_errors: number; activity_errors: number; recent: { type: string; message: string; user: string; timestamp: string }[] };
type Predictions = { next_3_months: { month: string; predicted_signups: number; cumulative: number }[]; trend: string; growth_rate_pct: number };
type AnalyticsData = {
  generated_at: string; kpis: KPIs; user_growth: GrowthPoint[];
  role_distribution: RoleDist[]; engagement: Engagement; devices: DeviceData;
  geography: GeoData; funnel: FunnelStage[]; recent_activity: ActivityItem[];
  top_colleges: College[]; firebase: FirebaseData; posthog: PostHogData; errors: ErrorData; predictions: Predictions;
};

const FALLBACK: AnalyticsData = {
  generated_at: '', kpis: { total_signups: 0, active_users_30d: 0, new_signups_30d: 0, signups_mom_pct: 0, total_bookings: 0, revenue_mtd: 0, revenue_ytd: 0, total_events: 0, echo_registrations: 0 },
  user_growth: [], role_distribution: [],
  engagement: { total_activity_events_30d: 0, unique_active_users_30d: 0, avg_events_per_user: 0, top_categories: [], daily_active_series: [] },
  devices: { by_os: [], by_browser: [], by_kind: [] }, geography: { countries: [], cities: [] },
  funnel: [], recent_activity: [], top_colleges: [],
  firebase: { realtime_active: { active_users: 0, configured: false }, session_duration: { avg_duration_sec: 0, total_sessions: 0, configured: false }, active_hours: { hours: [], configured: false }, retention: { cohorts: [], configured: false }, page_views: { pages: [], configured: false }, engagement: { bounce_rate: 0, engagement_rate: 0, views_per_session: 0, configured: false }, acquisition: { sources: [], configured: false }, demographics: { countries: [], cities: [], configured: false }, devices: { by_os: [], by_browser: [], by_device: [], configured: false }, daily_active: { series: [], configured: false } },
  posthog: { configured: false, reason: '', realtime_active: 0, totals_30d: { events: 0, users: 0, pageviews: 0 }, daily_series: [], top_events: [], top_paths: [], sources: [], countries: [], devices: { by_os: [], by_browser: [], by_device: [] }, sessions: { sessions: 0, users: 0, has_session_data: false } },
  errors: { total_errors_30d: 0, auth_errors: 0, activity_errors: 0, recent: [] },
  predictions: { next_3_months: [], trend: 'stable', growth_rate_pct: 0 },
};

const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtCurrency = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;
const fmtDuration = (sec: number) => { const m = Math.floor(sec / 60); const s = Math.round(sec % 60); return m > 0 ? `${m}m ${s}s` : `${s}s`; };
const timeAgo = (iso: string) => { if (!iso) return ''; const diff = Date.now() - new Date(iso).getTime(); const m = Math.floor(diff / 60000); if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`; };



// ── Main Component ───────────────────────────────────────────────────────────
export function AnalyticsView() {
  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const { data, loading, refresh } = usePortalData<AnalyticsData>('/admin/super/analytics', FALLBACK, 15_000);
  const d = data || FALLBACK;
  const fb = d.firebase || FALLBACK.firebase;
  const ph = d.posthog || FALLBACK.posthog;

  const handleExport = useCallback(() => {
    if (Platform.OS !== 'web' || !data) return;
    const rows: string[][] = [
      ['Metric', 'Value'],
      ['Total Signups', String(data.kpis.total_signups)],
      ['Active Users (30d)', String(data.kpis.active_users_30d)],
      ['Revenue MTD', `₹${data.kpis.revenue_mtd}`],
      ['Revenue YTD', `₹${data.kpis.revenue_ytd}`],
      ['Total Bookings', String(data.kpis.total_bookings)],
      ['Total Events', String(data.kpis.total_events)],
      ['Echo Registrations', String(data.kpis.echo_registrations)],
      ['Avg Session Duration', fmtDuration(fb.session_duration.avg_duration_sec)],
      ['Bounce Rate', `${fb.engagement.bounce_rate}%`],
      ['Engagement Rate', `${fb.engagement.engagement_rate}%`],
      ['Total Errors (30d)', String(data.errors.total_errors_30d)],
      ['Growth Trend', data.predictions.trend],
      [],
      ['Month', 'New Users', 'Cumulative'],
      ...data.user_growth.map(g => [g.month, String(g.count), String(g.cumulative)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [data, fb]);

  if (loading && !data?.generated_at) return <LoadingBox />;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ gap: 14 }}>
      {/* Header */}
      <Card style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={18} color="#A78BFA" />
          </View>
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#F3F4F6' }}>Analytics Dashboard</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>
              {d.generated_at ? `Updated ${timeAgo(d.generated_at)}` : 'Loading...'}
              {fb.realtime_active.configured ? ` · ${fb.realtime_active.active_users} online now` : ''}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <StatusPill kind="success" label="Live" />
          <Pressable onPress={refresh} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={14} color={SAC.muted} />
          </Pressable>
          {Platform.OS === 'web' && (
            <SecondaryButton onPress={handleExport}><Download size={12} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 11 }}>Export</Text></SecondaryButton>
          )}
        </View>
      </Card>

      {/* KPI Strip */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 140 }}><KpiTile Icon={Users} label="TOTAL SIGNUPS" value={fmt(d.kpis.total_signups)} delta={`${d.kpis.signups_mom_pct > 0 ? '+' : ''}${d.kpis.signups_mom_pct}% MoM`} deltaKind={d.kpis.signups_mom_pct >= 0 ? 'success' : 'danger'} /></View>
        <View style={{ flex: 1, minWidth: 140 }}><KpiTile Icon={Activity} label="ACTIVE (30d)" value={fmt(d.kpis.active_users_30d)} delta={`${d.engagement.avg_events_per_user} events/user`} deltaKind="success" /></View>
        <View style={{ flex: 1, minWidth: 140 }}><KpiTile Icon={TrendingUp} label="REVENUE MTD" value={fmtCurrency(d.kpis.revenue_mtd)} delta={`${fmtCurrency(d.kpis.revenue_ytd)} YTD`} deltaKind="success" /></View>
        <View style={{ flex: 1, minWidth: 140 }}><KpiTile Icon={Timer} label="AVG SESSION" value={fmtDuration(fb.session_duration.avg_duration_sec)} delta={`${fmt(fb.session_duration.total_sessions)} sessions`} deltaKind="neutral" /></View>
        <View style={{ flex: 1, minWidth: 140 }}><KpiTile Icon={Target} label="ENGAGEMENT" value={`${fb.engagement.engagement_rate}%`} delta={`${fb.engagement.bounce_rate}% bounce`} deltaKind={fb.engagement.engagement_rate > 50 ? 'success' : 'danger'} /></View>
        <View style={{ flex: 1, minWidth: 140 }}><KpiTile Icon={AlertTriangle} label="ERRORS (30d)" value={String(d.errors.total_errors_30d)} delta={`${d.errors.auth_errors} auth`} deltaKind={d.errors.total_errors_30d > 50 ? 'danger' : 'success'} /></View>
      </View>

      {/* Growth + Roles */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 3 }}><UserGrowthCard growth={d.user_growth} predictions={d.predictions} /></View>
        <View style={{ flex: 2 }}><RoleDistributionCard roles={d.role_distribution} /></View>
      </View>

      {/* Active Hours Heat Map + Retention */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 1 }}><ActiveHoursCard hours={fb.active_hours.hours} /></View>
        <View style={{ flex: 1 }}><RetentionCard cohorts={fb.retention.cohorts} /></View>
      </View>

      {/* PostHog Overview */}
      <PostHogOverview ph={ph} />

      {/* PostHog Trends */}
      {ph.configured && (
        <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
          <View style={{ flex: 3 }}><PostHogTrendsCard ph={ph} /></View>
          <View style={{ flex: 2 }}><PostHogEventsCard ph={ph} /></View>
        </View>
      )}

      {/* PostHog Paths + Sources */}
      {ph.configured && (
        <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
          <View style={{ flex: 1 }}><PostHogPathsCard ph={ph} /></View>
          <View style={{ flex: 1 }}><PostHogSourcesCard ph={ph} /></View>
        </View>
      )}

      {/* PostHog Countries + Devices */}
      {ph.configured && (
        <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
          <View style={{ flex: 1 }}><PostHogCountriesCard ph={ph} /></View>
          <View style={{ flex: 1 }}><PostHogDevicesCard ph={ph} /></View>
        </View>
      )}

      {/* GA4 Daily Active + Devices */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 1 }}><GaDailyCard series={fb.daily_active.series} /></View>
        <View style={{ flex: 1 }}><GaDevicesCard devices={fb.devices} /></View>
      </View>

      {/* Page Views + Acquisition */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 1 }}><PageViewsCard pages={fb.page_views.pages} /></View>
        <View style={{ flex: 1 }}><AcquisitionCard sources={fb.acquisition.sources} /></View>
      </View>

      {/* Engagement + Devices */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 3 }}><EngagementCard engagement={d.engagement} /></View>
        <View style={{ flex: 2 }}><DeviceCard devices={d.devices} /></View>
      </View>

      {/* Geography + Funnel */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 2 }}><GeographyCard geo={d.geography} /></View>
        <View style={{ flex: 3 }}><FunnelCard funnel={d.funnel} /></View>
      </View>

      {/* Error Tracking + Predictions */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 1 }}><ErrorTrackingCard errors={d.errors} /></View>
        <View style={{ flex: 1 }}><PredictionsCard predictions={d.predictions} /></View>
      </View>

      {/* Activity Feed + Top Colleges */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 3 }}><ActivityFeedCard items={d.recent_activity} /></View>
        <View style={{ flex: 2 }}><TopCollegesCard colleges={d.top_colleges} /></View>
      </View>
    </Animated.View>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function UserGrowthCard({ growth, predictions }: { growth: GrowthPoint[]; predictions: Predictions }) {
  const maxVal = Math.max(...growth.map(g => g.count), ...predictions.next_3_months.map(p => p.predicted_signups), 1);
  return (
    <Card style={{ padding: 20, gap: 12, height: 300 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>User Growth</Text>
        <StatusPill kind={predictions.trend === 'growing' ? 'success' : predictions.trend === 'declining' ? 'danger' : 'neutral'} label={`${predictions.growth_rate_pct > 0 ? '+' : ''}${predictions.growth_rate_pct}% trend`} />
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: 10 }}>
        {growth.map((g, i) => {
          const h = Math.max(4, (g.count / maxVal) * 180);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: SAC.dim }}>{g.count || ''}</Text>
              <LinearGradient colors={i === growth.length - 1 ? [GRAD.from, GRAD.to] : ['#4B5563', '#374151']} style={{ width: '80%', height: h, borderRadius: 3 }} />
              <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: SAC.dim }}>{g.month}</Text>
            </View>
          );
        })}
        {predictions.next_3_months.map((p, i) => (
          <View key={`p${i}`} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: '#A78BFA' }}>{p.predicted_signups}</Text>
            <View style={{ width: '80%', height: Math.max(4, (p.predicted_signups / maxVal) * 180), borderRadius: 3, backgroundColor: 'rgba(167,139,250,0.3)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.5)', borderStyle: 'dashed' }} />
            <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: '#A78BFA' }}>{p.month}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function RoleDistributionCard({ roles }: { roles: RoleDist[] }) {
  const total = roles.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>User Roles</Text>
      {roles.map((r, i) => (
        <View key={i} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text }}>{r.label}</Text>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: r.color }}>{r.value.toLocaleString()} ({Math.round(r.value / total * 100)}%)</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(r.value / total) * 100}%`, borderRadius: 4, backgroundColor: r.color }} />
          </View>
        </View>
      ))}
    </Card>
  );
}

function ActiveHoursCard({ hours }: { hours: { hour: number; count: number }[] }) {
  const maxCount = Math.max(...hours.map(h => h.count), 1);
  const grid = Array.from({ length: 24 }, (_, i) => {
    const found = hours.find(h => h.hour === i);
    return { hour: i, count: found?.count || 0 };
  });
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Clock size={16} color="#F59E0B" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Active Hours (Heat Map)</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
        {grid.map((h) => {
          const intensity = h.count / maxCount;
          const bg = `rgba(245,158,11,${Math.max(0.08, intensity * 0.9)})`;
          return (
            <Pressable key={h.hour} style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: intensity > 0.5 ? '#fff' : SAC.muted }}>{h.hour}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>Less</Text>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
            <View key={i} style={{ width: 16, height: 8, borderRadius: 2, backgroundColor: `rgba(245,158,11,${v})` }} />
          ))}
        </View>
        <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>More</Text>
      </View>
    </Card>
  );
}

function RetentionCard({ cohorts }: { cohorts: { cohort: string; week: string; users: number }[] }) {
  if (cohorts.length === 0) return (
    <Card style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>User Retention</Text>
      <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>No retention data available yet. Configure Firebase Analytics to see retention cohorts.</Text>
    </Card>
  );
  const grouped = cohorts.reduce<Record<string, { week: string; users: number }[]>>((acc, c) => {
    (acc[c.cohort] = acc[c.cohort] || []).push({ week: c.week, users: c.users });
    return acc;
  }, {});
  const maxUsers = Math.max(...cohorts.map(c => c.users), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>User Retention</Text>
      {Object.entries(grouped).slice(0, 4).map(([cohort, weeks]) => (
        <View key={cohort} style={{ gap: 4 }}>
          <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim }}>{cohort}</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {weeks.map((w, i) => {
              const pct = (w.users / maxUsers) * 100;
              const color = pct > 70 ? '#22C55E' : pct > 50 ? '#F59E0B' : '#EF4444';
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: '100%', height: 12, borderRadius: 3, backgroundColor: `${color}33` }}>
                    <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
                  </View>
                  <Text style={{ fontFamily: FONTS.med, fontSize: 8, color: SAC.dim }}>{w.week}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </Card>
  );
}

function PageViewsCard({ pages }: { pages: { path: string; views: number }[] }) {
  const maxViews = Math.max(...pages.map(p => p.views), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FileText size={16} color="#3B82F6" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Top Pages</Text>
      </View>
      {pages.length > 0 ? pages.slice(0, 8).map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${(p.views / maxViews) * 100}%`, maxWidth: 120, borderRadius: 3, backgroundColor: '#3B82F6' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }} numberOfLines={1}>{p.path}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#3B82F6' }}>{fmt(p.views)}</Text>
        </View>
      )) : (
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>Configure Firebase Analytics to see page views</Text>
      )}
    </Card>
  );
}

function AcquisitionCard({ sources }: { sources: { source: string; sessions: number }[] }) {
  const maxSessions = Math.max(...sources.map(s => s.sessions), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Zap size={16} color="#8B5CF6" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Acquisition Sources</Text>
      </View>
      {sources.length > 0 ? sources.slice(0, 6).map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${(s.sessions / maxSessions) * 100}%`, maxWidth: 100, borderRadius: 3, backgroundColor: '#8B5CF6' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }}>{s.source}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#8B5CF6' }}>{fmt(s.sessions)}</Text>
        </View>
      )) : (
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>Configure Firebase Analytics to see acquisition data</Text>
      )}
    </Card>
  );
}

function EngagementCard({ engagement }: { engagement: Engagement }) {
  const maxDAU = Math.max(...engagement.daily_active_series.map(d => d.count), 1);
  return (
    <Card style={{ padding: 20, gap: 12, height: 280 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Engagement (30 Days)</Text>
        <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>{engagement.unique_active_users_30d} unique users</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 100, paddingTop: 8 }}>
        {engagement.daily_active_series.slice(-30).map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '70%', height: Math.max(2, (d.count / maxDAU) * 80), borderRadius: 2, backgroundColor: '#3B82F6' }} />
          </View>
        ))}
      </View>
      <View style={{ gap: 6, marginTop: 4 }}>
        <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top Activities</Text>
        {engagement.top_categories.slice(0, 4).map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ height: 6, width: `${c.pct}%`, maxWidth: 120, borderRadius: 3, backgroundColor: '#3B82F6' }} />
            <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, flex: 1 }}>{c.category}</Text>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#3B82F6' }}>{c.count}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function DeviceCard({ devices }: { devices: DeviceData }) {
  const renderBars = (items: { label: string; value: number; pct: number }[], color: string) => (
    <View style={{ gap: 6 }}>
      {items.slice(0, 5).map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${item.pct}%`, maxWidth: 100, borderRadius: 3, backgroundColor: color, opacity: 1 - i * 0.15 }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }}>{item.label}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color }}>{item.pct}%</Text>
        </View>
      ))}
    </View>
  );
  return (
    <Card style={{ padding: 20, gap: 16 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Devices & Browsers</Text>
      {devices.by_kind.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {devices.by_kind.map((k, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: 'rgba(139,92,246,0.1)' }}>
              {k.label === 'Desktop' ? <Monitor size={16} color="#8B5CF6" /> : <Smartphone size={16} color="#8B5CF6" />}
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6', marginTop: 4 }}>{k.pct}%</Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{k.label}</Text>
            </View>
          ))}
        </View>
      )}
      {devices.by_os.length > 0 && <View><Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By OS</Text>{renderBars(devices.by_os, '#8B5CF6')}</View>}
      {devices.by_browser.length > 0 && <View><Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Browser</Text>{renderBars(devices.by_browser, '#A78BFA')}</View>}
    </Card>
  );
}

function GeographyCard({ geo }: { geo: GeoData }) {
  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Globe size={16} color="#14B8A6" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Geographic Distribution</Text>
      </View>
      {geo.countries.length > 0 ? (
        <View style={{ gap: 6 }}>
          {geo.countries.slice(0, 8).map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ height: 6, width: `${c.pct}%`, maxWidth: 120, borderRadius: 3, backgroundColor: '#14B8A6', opacity: 1 - i * 0.1 }} />
              <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted, flex: 1 }}>{c.country}</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#14B8A6' }}>{c.count}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>No geographic data yet</Text>
      )}
      {geo.cities.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Top Cities</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {geo.cities.slice(0, 5).map((c, i) => (
              <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(20,184,166,0.1)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.2)' }}>
                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: '#14B8A6' }}>{c.city} ({c.country})</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

function FunnelCard({ funnel }: { funnel: FunnelStage[] }) {
  const maxVal = funnel.length > 0 ? funnel[0].v : 1;
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Activation Funnel</Text>
      {funnel.map((s, i) => {
        const pct = maxVal > 0 ? (s.v / maxVal) * 100 : 0;
        const dropoff = i > 0 && funnel[i - 1].v > 0 ? Math.round((1 - s.v / funnel[i - 1].v) * 100) : 0;
        return (
          <View key={i} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text }}>{s.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: s.color }}>{s.v.toLocaleString()}</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{Math.round(pct)}%</Text>
                {dropoff > 0 && <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: '#EF4444' }}>-{dropoff}%</Text>}
              </View>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%`, borderRadius: 5, backgroundColor: s.color }} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function ErrorTrackingCard({ errors }: { errors: ErrorData }) {
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={16} color="#EF4444" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Error Tracking (30d)</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#EF4444' }}>{errors.total_errors_30d}</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Total Errors</Text>
        </View>
        <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.1)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#F59E0B' }}>{errors.auth_errors}</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Auth Errors</Text>
        </View>
      </View>
      {errors.recent.length > 0 && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent Errors</Text>
          {errors.recent.slice(0, 4).map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <View style={{ width: 3, height: 24, borderRadius: 2, backgroundColor: '#EF4444' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.text }} numberOfLines={1}>{e.message}</Text>
                <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim }}>{e.user} · {timeAgo(e.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function PredictionsCard({ predictions }: { predictions: Predictions }) {
  const trendColor = predictions.trend === 'growing' ? '#22C55E' : predictions.trend === 'declining' ? '#EF4444' : '#F59E0B';
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Sparkles size={16} color="#A78BFA" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Predictions & Insights</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.1)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: trendColor }}>{predictions.growth_rate_pct > 0 ? '+' : ''}{predictions.growth_rate_pct}%</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Growth Rate</Text>
        </View>
        <View style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.1)' }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: trendColor }}>{predictions.trend}</Text>
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Trend</Text>
        </View>
      </View>
      {predictions.next_3_months.length > 0 && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Next 3 Months</Text>
          {predictions.next_3_months.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.text }}>{p.month}</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#A78BFA' }}>~{p.predicted_signups} signups</Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{fmt(p.cumulative)} total</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: 4, padding: 8, borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.05)' }}>
        <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>
          {predictions.trend === 'growing' ? '📈 User growth is accelerating. Consider scaling infrastructure.' : predictions.trend === 'declining' ? '📉 Growth is slowing. Review acquisition channels.' : '📊 Growth is stable. Focus on retention and engagement.'}
        </Text>
      </View>
    </Card>
  );
}

function ActivityFeedCard({ items }: { items: ActivityItem[] }) {
  const typeColors: Record<string, string> = { signup: '#22C55E', booking: '#F59E0B', echo_reg: '#8B5CF6', event_reg: '#3B82F6' };
  return (
    <Card style={{ padding: 20, gap: 10, maxHeight: 380 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Eye size={14} color="#A78BFA" />
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Recent Activity</Text>
        </View>
        <StatusPill kind="success" label="LIVE" />
      </View>
      <ScrollView style={{ flex: 1 }}>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
            <View style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: typeColors[item.type] || '#6B7280' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text }} numberOfLines={1}>{item.title}</Text>
              {item.subtitle ? <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{item.subtitle}</Text> : null}
            </View>
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{timeAgo(item.timestamp)}</Text>
          </View>
        ))}
        {items.length === 0 && <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim, textAlign: 'center', padding: 20 }}>No recent activity</Text>}
      </ScrollView>
    </Card>
  );
}

function TopCollegesCard({ colleges }: { colleges: College[] }) {
  return (
    <Card style={{ padding: 20, gap: 10, maxHeight: 380 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Top Colleges</Text>
      <ScrollView style={{ flex: 1 }}>
        {colleges.map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: SAC.dim, width: 20 }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.text }} numberOfLines={1}>{c.name}</Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.dim }}>{c.students} students · {c.alumni} alumni</Text>
            </View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: GRAD.from }}>{c.total}</Text>
          </View>
        ))}
        {colleges.length === 0 && <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim, textAlign: 'center', padding: 20 }}>No college data yet</Text>}
      </ScrollView>
    </Card>
  );
}

// ── PostHog Cards ────────────────────────────────────────────────────────────

function PostHogOverview({ ph }: { ph: PostHogData }) {
  const t = ph.totals_30d || { events: 0, users: 0, pageviews: 0 };
  const s = ph.sessions || { sessions: 0, users: 0, has_session_data: false };
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(29,74,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={16} color="#1D4AFF" />
          </View>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>PostHog Product Analytics</Text>
        </View>
        {ph.configured ? (
          <StatusPill kind="success" label="LIVE" />
        ) : (
          <StatusPill kind="danger" label="NOT CONFIGURED" />
        )}
      </View>
      {!ph.configured ? (
        <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim, lineHeight: 18 }}>
          {ph.reason || 'Connect PostHog to see product analytics. Add a personal API key (phx_) with query:read under Settings → Integrations → PostHog.'}
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 10, backgroundColor: 'rgba(29,74,255,0.1)' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: '#1D4AFF' }}>{ph.realtime_active ?? 0}</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Active now (5m)</Text>
          </View>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 10, backgroundColor: 'rgba(29,74,255,0.1)' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: '#1D4AFF' }}>{fmt(t.events)}</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Events (30d)</Text>
          </View>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 10, backgroundColor: 'rgba(29,74,255,0.1)' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: '#1D4AFF' }}>{fmt(t.users)}</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Unique users (30d)</Text>
          </View>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 10, backgroundColor: 'rgba(29,74,255,0.1)' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: '#1D4AFF' }}>{fmt(t.pageviews)}</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Pageviews (30d)</Text>
          </View>
          <View style={{ flex: 1, minWidth: 130, padding: 12, borderRadius: 10, backgroundColor: 'rgba(29,74,255,0.1)' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: '#1D4AFF' }}>{s.has_session_data ? fmt(s.sessions) : '—'}</Text>
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{s.has_session_data ? 'Sessions (30d)' : 'Sessions (no data)'}</Text>
          </View>
        </View>
      )}
    </Card>
  );
}

function PostHogTrendsCard({ ph }: { ph: PostHogData }) {
  const series = ph.daily_series || [];
  const maxVal = Math.max(...series.map(d => d.events), ...series.map(d => d.users), 1);
  return (
    <Card style={{ padding: 20, gap: 12, height: 260 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>PostHog Daily Activity (30d)</Text>
        <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>events vs users</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 150, paddingTop: 8 }}>
        {series.slice(-30).map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
              <View style={{ width: 4, height: Math.max(2, (d.events / maxVal) * 110), borderRadius: 2, backgroundColor: '#1D4AFF' }} />
              <View style={{ width: 4, height: Math.max(2, (d.users / maxVal) * 110), borderRadius: 2, backgroundColor: '#A78BFA' }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#1D4AFF' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Events</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#A78BFA' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>Unique users</Text>
        </View>
      </View>
    </Card>
  );
}

function PostHogEventsCard({ ph }: { ph: PostHogData }) {
  const events = ph.top_events || [];
  const maxCount = Math.max(...events.map(e => e.count), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Top Events</Text>
      {events.length > 0 ? events.slice(0, 8).map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${(e.count / maxCount) * 100}%`, maxWidth: 120, borderRadius: 3, backgroundColor: '#1D4AFF' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }} numberOfLines={1}>{e.event}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#1D4AFF' }}>{fmt(e.count)}</Text>
        </View>
      )) : <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>No event data</Text>}
    </Card>
  );
}

function PostHogPathsCard({ ph }: { ph: PostHogData }) {
  const paths = ph.top_paths || [];
  const maxViews = Math.max(...paths.map(p => p.views), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FileText size={16} color="#1D4AFF" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Top Paths</Text>
      </View>
      {paths.length > 0 ? paths.slice(0, 8).map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${(p.views / maxViews) * 100}%`, maxWidth: 100, borderRadius: 3, backgroundColor: '#1D4AFF' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }} numberOfLines={1}>{p.path}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#1D4AFF' }}>{fmt(p.views)}</Text>
        </View>
      )) : <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>No pageview data</Text>}
    </Card>
  );
}

function PostHogSourcesCard({ ph }: { ph: PostHogData }) {
  const sources = ph.sources || [];
  const maxSessions = Math.max(...sources.map(s => s.sessions), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Zap size={16} color="#1D4AFF" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Acquisition Sources</Text>
      </View>
      {sources.length > 0 ? sources.slice(0, 6).map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${(s.sessions / maxSessions) * 100}%`, maxWidth: 100, borderRadius: 3, backgroundColor: '#1D4AFF' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }}>{s.source}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#1D4AFF' }}>{fmt(s.sessions)}</Text>
        </View>
      )) : <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>No acquisition data</Text>}
    </Card>
  );
}

function PostHogCountriesCard({ ph }: { ph: PostHogData }) {
  const countries = ph.countries || [];
  const maxCount = Math.max(...countries.map(c => c.count), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Globe size={16} color="#1D4AFF" />
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Top Countries</Text>
      </View>
      {countries.length > 0 ? countries.slice(0, 8).map((c, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ height: 6, width: `${(c.count / maxCount) * 100}%`, maxWidth: 100, borderRadius: 3, backgroundColor: '#1D4AFF' }} />
          <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }}>{c.country}</Text>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: '#1D4AFF' }}>{fmt(c.count)}</Text>
        </View>
      )) : <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>No geo data</Text>}
    </Card>
  );
}

function PostHogDevicesCard({ ph }: { ph: PostHogData }) {
  const devices = ph.devices || { by_os: [], by_browser: [], by_device: [] };
  const bars = (items: { label: string; value: number }[], color: string) => {
    const max = Math.max(...items.map(i => i.value), 1);
    return (
      <View style={{ gap: 6 }}>
        {items.slice(0, 5).map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ height: 6, width: `${(item.value / max) * 100}%`, maxWidth: 100, borderRadius: 3, backgroundColor: color, opacity: 1 - i * 0.15 }} />
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }}>{item.label}</Text>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color }}>{fmt(item.value)}</Text>
          </View>
        ))}
      </View>
    );
  };
  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>PostHog Devices</Text>
      {devices.by_device.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {devices.by_device.slice(0, 3).map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: 'rgba(29,74,255,0.1)' }}>
              {d.label === 'Desktop' ? <Monitor size={16} color="#1D4AFF" /> : d.label === 'Mobile' ? <Smartphone size={16} color="#1D4AFF" /> : <Activity size={16} color="#1D4AFF" />}
              <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6', marginTop: 4 }}>{fmt(d.value)}</Text>
              <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted }}>{d.label}</Text>
            </View>
          ))}
        </View>
      )}
      {devices.by_os.length > 0 && <View><Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By OS</Text>{bars(devices.by_os, '#1D4AFF')}</View>}
      {devices.by_browser.length > 0 && <View><Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Browser</Text>{bars(devices.by_browser, '#A78BFA')}</View>}
    </Card>
  );
}

// ── GA4 Extra Cards ──────────────────────────────────────────────────────────

function GaDailyCard({ series }: { series: { date: string; count: number }[] }) {
  const maxVal = Math.max(...series.map(s => s.count), 1);
  return (
    <Card style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>GA4 Daily Active Users</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 120, paddingTop: 8 }}>
        {series.slice(-30).map((s, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '70%', height: Math.max(2, (s.count / maxVal) * 100), borderRadius: 2, backgroundColor: '#3B82F6' }} />
          </View>
        ))}
      </View>
      {series.length === 0 && <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>Configure GA4 Property ID + service account to see daily active users</Text>}
    </Card>
  );
}

function GaDevicesCard({ devices }: { devices: FirebaseData['devices'] }) {
  const bars = (items: { label: string; value: number }[], color: string) => {
    const max = Math.max(...items.map(i => i.value), 1);
    return (
      <View style={{ gap: 6 }}>
        {items.slice(0, 5).map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ height: 6, width: `${(item.value / max) * 100}%`, maxWidth: 100, borderRadius: 3, backgroundColor: color, opacity: 1 - i * 0.15 }} />
            <Text style={{ fontFamily: FONTS.med, fontSize: 10, color: SAC.muted, flex: 1 }}>{item.label}</Text>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color }}>{fmt(item.value)}</Text>
          </View>
        ))}
      </View>
    );
  };
  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>GA4 Devices</Text>
      {devices.by_os.length > 0 && <View><Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By OS</Text>{bars(devices.by_os, '#3B82F6')}</View>}
      {devices.by_browser.length > 0 && <View><Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Browser</Text>{bars(devices.by_browser, '#A78BFA')}</View>}
      {devices.by_device.length > 0 && <View><Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Device</Text>{bars(devices.by_device, '#60A5FA')}</View>}
      {devices.by_os.length === 0 && devices.by_browser.length === 0 && <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: SAC.dim }}>Configure GA4 to see device breakdown</Text>}
    </Card>
  );
}
