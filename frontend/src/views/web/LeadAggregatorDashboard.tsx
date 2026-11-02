/**
 * LA6 — Lead Aggregator Brand Self-Service Portal Dashboard.
 *
 * Full admin view with: KPI strip, lead funnel, temperature gauge,
 * domain distribution, city heat map, campus stats, bot status,
 * brand management, and quick actions.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  useWindowDimensions, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart2, Users, Briefcase, Zap, Target, Flame, TrendingUp,
  RefreshCw, ChevronRight, Building2, MapPin, Bot, Shield,
  DollarSign, GitBranch, Bell, Search, Download, Plus, Filter,
  Activity, AlertTriangle, CheckCircle, Clock, Eye, Layers,
  Globe, Award, PieChart, ArrowUpRight, ArrowDownRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { leadAggregatorApi } from '@/src/lib/leadAggregatorApi';

// ─── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  bg1: '#0A0E1A', bg2: '#111827', bg3: '#1F2937',
  card: 'rgba(255,255,255,0.04)', cardH: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.08)', borderH: 'rgba(255,255,255,0.15)',
  accent: '#6366F1', accentL: '#818CF8', accentXL: '#A5B4FC',
  teal: '#2DD4BF', green: '#34D399', amber: '#F59E0B', red: '#EF4444',
  blue: '#60A5FA', pink: '#F472B6', purple: '#A78BFA', orange: '#FB923C',
  text: '#F9FAFB', textDim: 'rgba(255,255,255,0.55)', textMute: 'rgba(255,255,255,0.30)',
};
const FT = { bold: 'DMSans_700Bold', semi: 'DMSans_600SemiBold', med: 'DMSans_500Medium', reg: 'DMSans_400Regular' };

const TEMP_COLORS: Record<string, string> = { hot: '#EF4444', warm: '#F59E0B', cold: '#60A5FA', low: '#6B7280' };
const TEMP_ICONS: Record<string, any> = { hot: Flame, warm: Zap, cold: Activity, low: Clock };

type Stats = {
  total_brands: number; active_offers: number; total_leads: number; leads_this_week: number;
  hot_leads: number; warm_leads: number; cold_leads: number; low_leads: number;
  conversion_rate: number; domains_covered: number; campus_contacts: number; campus_verified: number;
  bot_runs: number; last_bot_run: any; scoring_distribution: any; domain_distribution: any;
  city_distribution: any; referral_sources: any; lead_funnel: any;
};

const EMPTY: Stats = {
  total_brands: 0, active_offers: 0, total_leads: 0, leads_this_week: 0,
  hot_leads: 0, warm_leads: 0, cold_leads: 0, low_leads: 0,
  conversion_rate: 0, domains_covered: 0, campus_contacts: 0, campus_verified: 0,
  bot_runs: 0, last_bot_run: null, scoring_distribution: {}, domain_distribution: {},
  city_distribution: {}, referral_sources: {}, lead_funnel: {},
};

export function LeadAggregatorDashboard() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  const [stats, setStats] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await leadAggregatorApi.stats();
      setStats({ ...EMPTY, ...data });
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: C.bg1 }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={[s.textDim, { marginTop: 12 }]}>Loading Lead Aggregator...</Text>
      </View>
    );
  }

  const kpis = [
    { label: 'Total Leads', value: stats.total_leads, icon: Users, color: C.accent, delta: `+${stats.leads_this_week} this week` },
    { label: 'Hot Leads', value: stats.hot_leads, icon: Flame, color: C.red },
    { label: 'Brands', value: stats.total_brands, icon: Building2, color: C.teal },
    { label: 'Active Offers', value: stats.active_offers, icon: Briefcase, color: C.amber },
    { label: 'Conversion', value: `${stats.conversion_rate}%`, icon: Target, color: C.green },
    { label: 'Domains', value: stats.domains_covered, icon: Globe, color: C.purple },
    { label: 'Campus', value: `${stats.campus_verified}/${stats.campus_contacts}`, icon: Award, color: C.pink },
    { label: 'Bot Runs', value: stats.bot_runs, icon: Bot, color: C.blue },
  ];

  const tempData = [
    { key: 'hot', count: stats.hot_leads },
    { key: 'warm', count: stats.warm_leads },
    { key: 'cold', count: stats.cold_leads },
    { key: 'low', count: stats.low_leads },
  ];
  const totalTemp = tempData.reduce((s, t) => s + t.count, 0) || 1;

  const funnelSteps = ['new', 'contacted', 'qualified', 'converted', 'invalid'];
  const funnelColors = [C.blue, C.accent, C.amber, C.green, C.red];

  const domainEntries = Object.entries(stats.domain_distribution || {}).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 12);
  const cityEntries = Object.entries(stats.city_distribution || {}).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg1 }} contentContainerStyle={{ padding: isMobile ? 16 : 28, paddingBottom: 60 }}>
      {/* Header */}
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 24 }]}>
        <View>
          <Text style={[s.h1, { fontSize: isMobile ? 22 : 28 }]}>Lead Aggregator</Text>
          <Text style={s.textDim}>Universal 27-Domain Lead Engine &middot; AXISS v2</Text>
        </View>
        <View style={s.row}>
          <Pressable style={[s.btn, s.btnOutline]} onPress={refresh}>
            <RefreshCw size={14} color={C.accentL} />
            <Text style={[s.btnText, { color: C.accentL }]}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
          </Pressable>
        </View>
      </View>

      {error && (
        <View style={[s.card, { borderColor: C.red, marginBottom: 16 }]}>
          <Text style={{ color: C.red, fontFamily: FT.med, fontSize: 13 }}>{error}</Text>
        </View>
      )}

      {/* KPI Strip */}
      <View style={[s.grid, { gap: 12, marginBottom: 24 }]}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <View key={kpi.label} style={[s.card, s.kpiCard, { minWidth: isMobile ? '47%' : 140, flex: 1 }]}>
              <View style={[s.iconBadge, { backgroundColor: kpi.color + '18' }]}>
                <Icon size={16} color={kpi.color} />
              </View>
              <Text style={s.kpiValue}>{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</Text>
              <Text style={s.kpiLabel}>{kpi.label}</Text>
              {kpi.delta && <Text style={[s.textMute, { fontSize: 11, marginTop: 2 }]}>{kpi.delta}</Text>}
            </View>
          );
        })}
      </View>

      {/* Temperature Gauge + Lead Funnel */}
      <View style={[isMobile ? s.col : s.row, { gap: 16, marginBottom: 24 }]}>
        {/* Temperature */}
        <View style={[s.card, s.section, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Lead Temperature</Text>
          <View style={[s.row, { height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 12, marginBottom: 12 }]}>
            {tempData.map((t) => (
              <View key={t.key} style={{ flex: t.count / totalTemp, backgroundColor: TEMP_COLORS[t.key], minWidth: t.count > 0 ? 4 : 0 }} />
            ))}
          </View>
          <View style={[s.row, { flexWrap: 'wrap', gap: 12 }]}>
            {tempData.map((t) => {
              const TIcon = TEMP_ICONS[t.key];
              return (
                <View key={t.key} style={[s.row, { gap: 6 }]}>
                  <TIcon size={14} color={TEMP_COLORS[t.key]} />
                  <Text style={[s.textDim, { fontSize: 13 }]}>
                    {t.key.charAt(0).toUpperCase() + t.key.slice(1)}: <Text style={{ color: C.text, fontFamily: FT.semi }}>{t.count}</Text>
                    {' '}({Math.round(t.count / totalTemp * 100)}%)
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Funnel */}
        <View style={[s.card, s.section, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Lead Funnel</Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            {funnelSteps.map((step, i) => {
              const count = stats.lead_funnel?.[step] || 0;
              const maxCount = Math.max(...funnelSteps.map(s => stats.lead_funnel?.[s] || 0), 1);
              return (
                <View key={step}>
                  <View style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                    <Text style={[s.textDim, { fontSize: 12, textTransform: 'capitalize' }]}>{step}</Text>
                    <Text style={[s.text, { fontSize: 12, fontFamily: FT.semi }]}>{count}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: C.bg3, borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${(count / maxCount) * 100}%`, backgroundColor: funnelColors[i], borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Domain Distribution + City Distribution */}
      <View style={[isMobile ? s.col : s.row, { gap: 16, marginBottom: 24 }]}>
        <View style={[s.card, s.section, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Domain Distribution</Text>
          <View style={{ marginTop: 12, gap: 6 }}>
            {domainEntries.length === 0 && <Text style={s.textMute}>No domain data yet</Text>}
            {domainEntries.map(([domain, count]) => {
              const maxDomain = (domainEntries[0]?.[1] as number) || 1;
              return (
                <View key={domain} style={[s.row, { gap: 8, alignItems: 'center' }]}>
                  <Text style={[s.textDim, { fontSize: 12, width: 100 }]}>{domain}</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: C.bg3, borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${((count as number) / maxDomain) * 100}%`, backgroundColor: C.accent, borderRadius: 3 }} />
                  </View>
                  <Text style={[s.text, { fontSize: 11, fontFamily: FT.semi, width: 30, textAlign: 'right' }]}>{count as number}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[s.card, s.section, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Top Cities</Text>
          <View style={{ marginTop: 12, gap: 6 }}>
            {cityEntries.length === 0 && <Text style={s.textMute}>No city data yet</Text>}
            {cityEntries.map(([city, count], i) => (
              <View key={city} style={[s.row, { justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: i < cityEntries.length - 1 ? 1 : 0, borderBottomColor: C.border }]}>
                <View style={[s.row, { gap: 6 }]}>
                  <MapPin size={12} color={C.teal} />
                  <Text style={[s.text, { fontSize: 13 }]}>{city}</Text>
                </View>
                <Text style={[s.text, { fontSize: 13, fontFamily: FT.semi }]}>{count as number}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Bot Status + Referral Sources */}
      <View style={[isMobile ? s.col : s.row, { gap: 16, marginBottom: 24 }]}>
        <View style={[s.card, s.section, { flex: 1 }]}>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.sectionTitle}>6h Bot Agent</Text>
            {stats.last_bot_run && (
              <View style={[s.badge, { backgroundColor: stats.last_bot_run.status === 'completed' ? C.green + '22' : C.amber + '22' }]}>
                <Text style={{ color: stats.last_bot_run.status === 'completed' ? C.green : C.amber, fontFamily: FT.med, fontSize: 11 }}>
                  {stats.last_bot_run.status}
                </Text>
              </View>
            )}
          </View>
          {stats.last_bot_run ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              <Text style={s.textDim}>Run ID: {stats.last_bot_run.run_id}</Text>
              <Text style={s.textDim}>Started: {new Date(stats.last_bot_run.started_at).toLocaleString()}</Text>
            </View>
          ) : (
            <Text style={[s.textMute, { marginTop: 12 }]}>No bot runs yet</Text>
          )}
          <Pressable style={[s.btn, s.btnAccent, { marginTop: 16, alignSelf: 'flex-start' }]} onPress={() => leadAggregatorApi.triggerBot().then(load)}>
            <Bot size={14} color="#fff" />
            <Text style={[s.btnText, { color: '#fff' }]}>Trigger Bot Run</Text>
          </Pressable>
        </View>

        <View style={[s.card, s.section, { flex: 1 }]}>
          <Text style={s.sectionTitle}>Referral Sources</Text>
          <View style={{ marginTop: 12, gap: 6 }}>
            {Object.entries(stats.referral_sources || {}).length === 0 && (
              <Text style={s.textMute}>No referral data yet</Text>
            )}
            {Object.entries(stats.referral_sources || {}).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([src, count]) => (
              <View key={src} style={[s.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
                <Text style={[s.text, { fontSize: 13 }]}>{src}</Text>
                <Text style={[s.text, { fontSize: 13, fontFamily: FT.semi }]}>{count as number}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={[s.card, s.section, { marginBottom: 24 }]}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={[s.grid, { gap: 10, marginTop: 12 }]}>
          {[
            { label: 'Brands', icon: Building2, color: C.teal },
            { label: 'Offers', icon: Briefcase, color: C.amber },
            { label: 'Leads', icon: Users, color: C.accent },
            { label: 'Analytics', icon: BarChart2, color: C.green },
            { label: 'Fraud', icon: Shield, color: C.red },
            { label: 'Revenue', icon: DollarSign, color: C.purple },
            { label: 'Campus', icon: Award, color: C.pink },
            { label: 'Dedup', icon: GitBranch, color: C.orange },
            { label: 'Export', icon: Download, color: C.blue },
            { label: 'ML Model', icon: Layers, color: C.accentL },
            { label: 'WhatsApp', icon: Bell, color: C.green },
            { label: 'Integrations', icon: Globe, color: C.teal },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Pressable key={action.label} style={[s.actionCard, { borderColor: action.color + '30' }]}>
                <Icon size={18} color={action.color} />
                <Text style={[s.text, { fontSize: 12, marginTop: 6 }]}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={[s.textMute, { fontSize: 11 }]}>AXISS Universal Lead Aggregator v2 &middot; 27 Domains &middot; DPDP Act 2023 Compliant</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flexDirection: 'column' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  h1: { fontFamily: FT.bold, fontSize: 28, color: C.text },
  text: { fontFamily: FT.reg, fontSize: 14, color: C.text },
  textDim: { fontFamily: FT.reg, fontSize: 13, color: C.textDim },
  textMute: { fontFamily: FT.reg, fontSize: 12, color: C.textMute },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  section: { padding: 20 },
  sectionTitle: { fontFamily: FT.semi, fontSize: 15, color: C.text },
  kpiCard: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  kpiValue: { fontFamily: FT.bold, fontSize: 22, color: C.text, marginTop: 8 },
  kpiLabel: { fontFamily: FT.med, fontSize: 11, color: C.textDim, marginTop: 2 },
  iconBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnOutline: { borderWidth: 1, borderColor: C.accent + '40' },
  btnAccent: { backgroundColor: C.accent },
  btnText: { fontFamily: FT.med, fontSize: 13 },
  actionCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
  },
});
