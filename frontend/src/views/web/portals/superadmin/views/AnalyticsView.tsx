import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';
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

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        <View style={[s.card, { flex: stack ? undefined : 1.4 }]}>
          <View style={s.cardHead}><Text style={s.cardTitle}>User Growth (000s)</Text><Badge label="+38% YoY" color="green" /></View>
          <Text style={s.cardSub}>Total signups across all colleges</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 140, marginTop: 22 }}>
            {GROWTH.map((g, i) => {
              const h = Math.round((g.v / maxG) * 120);
              const isLast = i === GROWTH.length - 1;
              return (
                <View key={g.m} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={[s.barVal, isLast && { color: SAC.accentBright }]}>{g.v}k</Text>
                  <LinearGradient colors={[isLast ? SAC.accentBright : SAC.primary, isLast ? SAC.accent : SAC.primaryD] as any} start={{x:0,y:0}} end={{x:0,y:1}} style={{ width: '100%', height: h, borderTopLeftRadius: 5, borderTopRightRadius: 5, opacity: isLast ? 1 : 0.7 }} />
                  <Text style={[s.barM, isLast && { color: '#fff', fontFamily: FONTS.bold }]}>{g.m}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <View style={s.cardHead}><Text style={s.cardTitle}>Retention Curve</Text><Badge label="Cohort: Mar" color="orange" /></View>
          <Text style={s.cardSub}>% of users active by week</Text>
          <View style={{ marginTop: 18, gap: 10 }}>
            {RETENTION.map((r) => (
              <View key={r.w} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={s.retLabel}>{r.w}</Text>
                <View style={s.retTrack}><View style={[s.retFill, { width: `${r.v}%` as any, backgroundColor: r.v > 70 ? SAC.green : r.v > 60 ? SAC.amber : SAC.red }]} /></View>
                <Text style={s.retVal}>{r.v}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        <View style={[s.card, { flex: stack ? undefined : 1.4 }]}>
          <Text style={s.cardTitle}>Activation Funnel</Text>
          <Text style={s.cardSub}>From signup → repeat session</Text>
          <View style={{ marginTop: 16, gap: 10 }}>
            {FUNNEL.map((f, i) => {
              const w = (f.v / funnelMax) * 100;
              const drop = i > 0 ? Math.round(((FUNNEL[i-1].v - f.v) / FUNNEL[i-1].v) * 100) : 0;
              return (
                <View key={f.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={s.funnelL}>{f.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {drop > 0 && <Text style={{ color: SAC.red, fontFamily: FONTS.bold, fontSize: 11 }}>−{drop}%</Text>}
                      <Text style={s.funnelV}>{f.v.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <View style={s.funnelTrack}><View style={[s.funnelBar, { width: `${w}%` as any, backgroundColor: f.color }]} /></View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[s.card, { flex: stack ? undefined : 1 }]}>
          <View style={s.cardHead}><Text style={s.cardTitle}>A/B Tests</Text><Activity size={14} color={SAC.accent} /></View>
          <Text style={s.cardSub}>Last 30 days · 3 winners</Text>
          <View style={{ marginTop: 14, gap: 12 }}>
            {AB.map((t) => (
              <View key={t.id} style={s.abRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={s.abName}>{t.name}</Text>
                  <Text style={s.abMeta}>Winner: <Text style={{ color: SAC.accentBright }}>{t.winner}</Text> · {t.conf} confidence</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={12} color={SAC.green} />
                  <Text style={{ color: SAC.green, fontFamily: FONTS.xbold, fontSize: 12 }}>{t.uplift}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  cardSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },

  barVal: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 10 },
  barM: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },

  retLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 32 },
  retTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  retFill: { height: '100%', borderRadius: 3 },
  retVal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, width: 40, textAlign: 'right' },

  funnelL: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  funnelV: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  funnelTrack: { height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' },
  funnelBar: { height: '100%', borderRadius: 6 },

  abRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: SAC.border },
  abName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  abMeta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 3 },
});
