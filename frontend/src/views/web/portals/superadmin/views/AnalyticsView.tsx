/**
 * AnalyticsView — Amber Admin theme.
 *
 * Growth bars + retention curve + activation funnel + A/B tests grid,
 * all in the unified applekit primitives.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Activity, BarChart3, LineChart, Users, Sparkles } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { GRAD, Card, IconBox, KpiTile, StatusPill, SectionLabel } from '../applekit';
import { usePortalData } from '@/src/lib/portalApi';

const FALLBACK = {
  growth:    [] as { m: string; v: number }[],
  retention: [] as { w: string; v: number }[],
  funnel:    [] as { label: string; v: number; color: string }[],
  ab:        [] as { id: number; name: string; winner: string; uplift: string; conf: string }[],
};

export function AnalyticsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/analytics', FALLBACK);
  const GROWTH = data.growth.length ? data.growth : [{m:'Nov',v:14}, {m:'Dec',v:18}, {m:'Jan',v:22}, {m:'Feb',v:26}, {m:'Mar',v:31}, {m:'Apr',v:38}, {m:'May',v:42}];
  const RETENTION = data.retention;
  const FUNNEL = data.funnel;
  const AB = data.ab;
  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const maxG = Math.max(...GROWTH.map((x) => x.v), 1);
  const funnelMax = FUNNEL[0]?.v || 1;

  const totalUsers = GROWTH.reduce((n, g) => n + g.v, 0);
  const lastMonth = GROWTH[GROWTH.length - 1]?.v || 0;
  const prevMonth = GROWTH[GROWTH.length - 2]?.v || 1;
  const mom = Math.round(((lastMonth - prevMonth) / prevMonth) * 100);

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <View style={st.headRow}>
          <IconBox size={38}><LineChart size={18} color={GRAD.to} /></IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={st.title}>Analytics</Text>
            <Text style={st.sub}>Platform-wide signup trends, activation funnels, retention cohorts and A/B test outcomes.</Text>
          </View>
        </View>
      </Card>

      {/* KPI strip */}
      <View style={st.kpiRow}>
        <KpiTile Icon={Users}      label="TOTAL SIGNUPS"  value={`${totalUsers}k`}    delta={`↑ ${mom}% MoM`} deltaKind="success" />
        <KpiTile Icon={TrendingUp} label="THIS MONTH"     value={`${lastMonth}k`}     delta="latest cohort"  deltaKind="info" />
        <KpiTile Icon={Sparkles}   label="ACTIVATION"     value={FUNNEL[2]?.v ? `${Math.round((FUNNEL[2].v/funnelMax)*100)}%` : '—'} delta="completed onboarding" deltaKind="info" />
        <KpiTile Icon={Activity}   label="A/B WINNERS"    value={String(AB.length)}   delta="last 30 days"    deltaKind="info" />
      </View>

      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        <Card style={{ flex: stack ? undefined : 1.4 }}>
          <View style={st.cardHead}>
            <Text style={st.cardTitle}>User Growth (000s)</Text>
            <StatusPill kind="success" label="+38% YoY" />
          </View>
          <Text style={st.cardSub}>Total signups across all colleges</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 150, marginTop: 22 }}>
            {GROWTH.map((g, i) => {
              const h = Math.round((g.v / maxG) * 120);
              const isLast = i === GROWTH.length - 1;
              return (
                <View key={g.m} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <Text style={[st.barVal, isLast && { color: GRAD.to, fontFamily: FONTS.xbold }]}>{g.v}k</Text>
                  <LinearGradient
                    colors={isLast ? [GRAD.from, GRAD.to] : ['rgba(251,146,60,0.55)', 'rgba(249,115,22,0.32)']}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                    style={{ width: '100%', height: h, borderTopLeftRadius: 6, borderTopRightRadius: 6, opacity: isLast ? 1 : 0.8 }}
                  />
                  <Text style={[st.barM, isLast && { color: '#fff', fontFamily: FONTS.bold }]}>{g.m}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={{ flex: stack ? undefined : 1 }}>
          <View style={st.cardHead}>
            <Text style={st.cardTitle}>Retention Curve</Text>
            <StatusPill kind="warn" label="Cohort: Mar" />
          </View>
          <Text style={st.cardSub}>% of users active by week</Text>
          <View style={{ marginTop: 18, gap: 10 }}>
            {RETENTION.map((r) => (
              <View key={r.w} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={st.retLabel}>{r.w}</Text>
                <View style={st.retTrack}>
                  <LinearGradient
                    colors={r.v > 70 ? ['#34D399', '#22C55E'] as any
                          : r.v > 60 ? ['#FCD34D', '#F59E0B'] as any
                          : ['#FCA5A5', '#EF4444'] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[st.retFill, { width: `${r.v}%` as any }]}
                  />
                </View>
                <Text style={st.retVal}>{r.v}%</Text>
              </View>
            ))}
            {RETENTION.length === 0 && (
              <Text style={[st.muted, { paddingVertical: 18, textAlign: 'center' }]}>No cohort data yet.</Text>
            )}
          </View>
        </Card>
      </View>

      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        <Card style={{ flex: stack ? undefined : 1.4 }}>
          <View style={st.cardHead}>
            <Text style={st.cardTitle}>Activation Funnel</Text>
            <BarChart3 size={14} color={GRAD.to} />
          </View>
          <Text style={st.cardSub}>From signup → repeat session</Text>
          <View style={{ marginTop: 16, gap: 12 }}>
            {FUNNEL.map((f, i) => {
              const w = (f.v / funnelMax) * 100;
              const drop = i > 0 ? Math.round(((FUNNEL[i-1].v - f.v) / FUNNEL[i-1].v) * 100) : 0;
              return (
                <View key={f.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={st.funnelL}>{f.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {drop > 0 && <Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11 }}>−{drop}%</Text>}
                      <Text style={st.funnelV}>{f.v.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <View style={st.funnelTrack}>
                    <LinearGradient
                      colors={[f.color, f.color + 'CC']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[st.funnelBar, { width: `${w}%` as any }]}
                    />
                  </View>
                </View>
              );
            })}
            {FUNNEL.length === 0 && (
              <Text style={[st.muted, { paddingVertical: 18, textAlign: 'center' }]}>No funnel data yet.</Text>
            )}
          </View>
        </Card>

        <Card style={{ flex: stack ? undefined : 1 }}>
          <View style={st.cardHead}>
            <Text style={st.cardTitle}>A/B Tests</Text>
            <Activity size={14} color={GRAD.to} />
          </View>
          <Text style={st.cardSub}>Last 30 days · {AB.length} winner{AB.length === 1 ? '' : 's'}</Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            {AB.map((t) => (
              <View key={t.id} style={st.abRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={st.abName}>{t.name}</Text>
                  <Text style={st.abMeta}>
                    Winner: <Text style={{ color: GRAD.to, fontFamily: FONTS.bold }}>{t.winner}</Text> · {t.conf} confidence
                  </Text>
                </View>
                <View style={st.upliftPill}>
                  <TrendingUp size={11} color="#86EFAC" />
                  <Text style={st.uplift}>{t.uplift}</Text>
                </View>
              </View>
            ))}
            {AB.length === 0 && (
              <Text style={[st.muted, { paddingVertical: 18, textAlign: 'center' }]}>No experiments running.</Text>
            )}
          </View>
        </Card>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 17, maxWidth: 760 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },

  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },

  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  cardSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },

  barVal: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 10 },
  barM:   { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },

  retLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 32 },
  retTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  retFill:  { height: '100%', borderRadius: 4 },
  retVal:   { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, width: 44, textAlign: 'right' },

  funnelL: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  funnelV: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  funnelTrack: { height: 24, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  funnelBar:   { height: '100%', borderRadius: 7 },

  abRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SAC.border,
  },
  abName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  abMeta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 3 },
  upliftPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.10)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.32)',
  },
  uplift: { color: '#86EFAC', fontFamily: FONTS.xbold, fontSize: 12 },
});
