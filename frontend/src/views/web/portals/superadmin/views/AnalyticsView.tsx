/**
 * Super Admin — Analytics Dashboard
 *
 * Real-time analytics powered by MongoDB + Firebase Analytics + PostHog.
 * Shows KPIs, user growth, engagement, devices, geography, funnel, activity feed.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, useWindowDimensions, ScrollView,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3, Users, TrendingUp, Activity, Calendar, Download, RefreshCw,
  Globe, Monitor, Smartphone, ArrowUpRight, ArrowDownRight, Sparkles, Eye,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Card, KpiTile, GRAD, GradientButton, SecondaryButton, StatusPill, LoadingBox } from '../applekit';
import { usePortalData } from '@/src/views/web/portals/portalUrl';

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
type DeviceData = {
  by_os: { label: string; value: number; pct: number }[];
  by_browser: { label: string; value: number; pct: number }[];
  by_kind: { label: string; value: number; pct: number }[];
};
type GeoData = {
  countries: { country: string; count: number; pct: number }[];
  cities: { city: string; country: string; count: number }[];
};
type FunnelStage = { label: string; v: number; color: string };
type ActivityItem = { type: string; title: string; subtitle: string; timestamp: string };
type College = { name: string; students: number; alumni: number; total: number };
type AnalyticsData = {
  generated_at: string; kpis: KPIs; user_growth: GrowthPoint[];
  role_distribution: RoleDist[]; engagement: Engagement; devices: DeviceData;
  geography: GeoData; funnel: FunnelStage[]; recent_activity: ActivityItem[];
  top_colleges: College[];
};

const FALLBACK: AnalyticsData = {
  generated_at: '', kpis: { total_signups: 0, active_users_30d: 0, new_signups_30d: 0, signups_mom_pct: 0, total_bookings: 0, revenue_mtd: 0, revenue_ytd: 0, total_events: 0, echo_registrations: 0 },
  user_growth: [], role_distribution: [], engagement: { total_activity_events_30d: 0, unique_active_users_30d: 0, avg_events_per_user: 0, top_categories: [], daily_active_series: [] },
  devices: { by_os: [], by_browser: [], by_kind: [] }, geography: { countries: [], cities: [] },
  funnel: [], recent_activity: [], top_colleges: [],
};

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtCurrency = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;
const timeAgo = (iso: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function AnalyticsView() {
  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const { data, loading, refresh } = usePortalData<AnalyticsData>('/admin/super/analytics', FALLBACK, 15_000);
  const d = data || FALLBACK;

  const handleExport = useCallback(() => {
    if (Platform.OS !== 'web' || !data) return;
    const rows: string[][] = [
      ['Metric', 'Value'],
      ['Total Signups', String(data.kpis.total_signups)],
      ['Active Users (30d)', String(data.kpis.active_users_30d)],
      ['New Signups (30d)', String(data.kpis.new_signups_30d)],
      ['Revenue MTD', `₹${data.kpis.revenue_mtd}`],
      ['Revenue YTD', `₹${data.kpis.revenue_ytd}`],
      ['Total Bookings', String(data.kpis.total_bookings)],
      ['Total Events', String(data.kpis.total_events)],
      ['Echo Registrations', String(data.kpis.echo_registrations)],
      [],
      ['Month', 'New Users', 'Cumulative'],
      ...data.user_growth.map(g => [g.month, String(g.count), String(g.cumulative)]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

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
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
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
        <View style={{ flex: 1, minWidth: 150 }}><KpiTile Icon={Users} label="TOTAL SIGNUPS" value={fmt(d.kpis.total_signups)} delta={`${d.kpis.signups_mom_pct > 0 ? '+' : ''}${d.kpis.signups_mom_pct}% MoM`} deltaKind={d.kpis.signups_mom_pct >= 0 ? 'positive' : 'negative'} /></View>
        <View style={{ flex: 1, minWidth: 150 }}><KpiTile Icon={Activity} label="ACTIVE (30d)" value={fmt(d.kpis.active_users_30d)} delta={`${d.engagement.avg_events_per_user} events/user`} deltaKind="positive" /></View>
        <View style={{ flex: 1, minWidth: 150 }}><KpiTile Icon={TrendingUp} label="REVENUE MTD" value={fmtCurrency(d.kpis.revenue_mtd)} delta={`${fmtCurrency(d.kpis.revenue_ytd)} YTD`} deltaKind="positive" /></View>
        <View style={{ flex: 1, minWidth: 150 }}><KpiTile Icon={Calendar} label="EVENTS" value={fmt(d.kpis.total_events)} delta={`${d.kpis.echo_registrations} echo regs`} deltaKind="neutral" /></View>
        <View style={{ flex: 1, minWidth: 150 }}><KpiTile Icon={Sparkles} label="ENGAGEMENT" value={fmt(d.engagement.total_activity_events_30d)} delta="30d activity" deltaKind="neutral" /></View>
        <View style={{ flex: 1, minWidth: 150 }}><KpiTile Icon={TrendingUp} label="NEW SIGNUPS" value={fmt(d.kpis.new_signups_30d)} delta="last 30 days" deltaKind="neutral" /></View>
      </View>

      {/* Charts Row 1: Growth + Roles */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 3 }}>
          <UserGrowthCard growth={d.user_growth} />
        </View>
        <View style={{ flex: 2 }}>
          <RoleDistributionCard roles={d.role_distribution} />
        </View>
      </View>

      {/* Charts Row 2: Engagement + Devices */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 3 }}>
          <EngagementCard engagement={d.engagement} />
        </View>
        <View style={{ flex: 2 }}>
          <DeviceCard devices={d.devices} />
        </View>
      </View>

      {/* Charts Row 3: Geography + Funnel */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 2 }}>
          <GeographyCard geo={d.geography} />
        </View>
        <View style={{ flex: 3 }}>
          <FunnelCard funnel={d.funnel} />
        </View>
      </View>

      {/* Activity Feed + Top Colleges */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        <View style={{ flex: 3 }}>
          <ActivityFeedCard items={d.recent_activity} />
        </View>
        <View style={{ flex: 2 }}>
          <TopCollegesCard colleges={d.top_colleges} />
        </View>
      </View>
    </Animated.View>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function UserGrowthCard({ growth }: { growth: GrowthPoint[] }) {
  const maxVal = Math.max(...growth.map(g => g.count), 1);
  return (
    <Card style={{ padding: 20, gap: 12, height: 280 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>User Growth (12 Months)</Text>
        {growth.length > 0 && <StatusPill kind="positive" label={`+${growth[growth.length - 1]?.count || 0}`} />}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingTop: 10 }}>
        {growth.map((g, i) => {
          const h = Math.max(4, (g.count / maxVal) * 180);
          const isLast = i === growth.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim }}>{g.count || ''}</Text>
              <LinearGradient colors={isLast ? [GRAD.from, GRAD.to] : ['#4B5563', '#374151']} style={{ width: '80%', height: h, borderRadius: 4 }} />
              <Text style={{ fontFamily: FONTS.med, fontSize: 9, color: SAC.dim }}>{g.month}</Text>
            </View>
          );
        })}
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

function EngagementCard({ engagement }: { engagement: Engagement }) {
  const maxDAU = Math.max(...engagement.daily_active_series.map(d => d.count), 1);
  return (
    <Card style={{ padding: 20, gap: 12, height: 280 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#F3F4F6' }}>Engagement (30 Days)</Text>
        <Text style={{ fontFamily: FONTS.med, fontSize: 11, color: SAC.muted }}>{engagement.unique_active_users_30d} unique users</Text>
      </View>
      {/* DAU mini chart */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 100, paddingTop: 8 }}>
        {engagement.daily_active_series.slice(-30).map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '70%', height: Math.max(2, (d.count / maxDAU) * 80), borderRadius: 2, backgroundColor: '#3B82F6' }} />
          </View>
        ))}
      </View>
      {/* Top categories */}
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
      {devices.by_os.length > 0 && (
        <View>
          <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By OS</Text>
          {renderBars(devices.by_os, '#8B5CF6')}
        </View>
      )}
      {devices.by_browser.length > 0 && (
        <View>
          <Text style={{ fontFamily: FONTS.semi, fontSize: 10, color: SAC.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Browser</Text>
          {renderBars(devices.by_browser, '#A78BFA')}
        </View>
      )}
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
