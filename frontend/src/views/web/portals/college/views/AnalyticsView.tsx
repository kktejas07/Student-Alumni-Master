import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CC, FONTS } from '../tokens';
import { KpiCard } from '../atoms';
import { TrendingUp, Users, Trophy, BarChart3 } from 'lucide-react-native';
import { usePortalData } from '@/src/lib/portalApi';

const FALLBACK = {
  kpi: { students: 0, placement: '0%', median_lpa: '₹0', top_offer: '₹0', median_yoy: '↑ 0%' },
  placement_trend: [] as { year: number; rate: number; median_lpa: number }[],
  salary_dist: [] as { band: string; count: number; pct: number; color: string }[],
  sectors: [] as { name: string; count: number; color: string }[],
  attrition: [] as { label: string; pct: number; color: string }[],
};

export function AnalyticsView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/analytics', FALLBACK);
  const TREND = data.placement_trend || [];
  const SECTORS = data.sectors || [];
  const ATTR = data.attrition || [];
  const SAL = data.salary_dist || [];
  const max = Math.max(...TREND.map((t) => t.rate), 1);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <KpiCard Icon={TrendingUp} label="Avg Salary"      value={data.kpi.median_lpa} delta={data.kpi.median_yoy + ' YoY'} color="green" />
        <KpiCard Icon={Users}      label="Highest Offer"   value={data.kpi.top_offer}  delta="Single biggest" color="purple" />
        <KpiCard Icon={Trophy}     label="Placement Rate"  value={data.kpi.placement}  delta="↑ 4% YoY"      color="amber" />
        <KpiCard Icon={BarChart3}  label="Total Students"  value={String(data.kpi.students)} delta="active roster" color="blue" />
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Placement Rate Trend</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 160, marginTop: 22 }}>
          {TREND.map((t, i) => {
            const h = Math.round((t.rate / max) * 140);
            const isLast = i === TREND.length - 1;
            return (
              <View key={t.year} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Text style={{ color: isLast ? CC.accentBright : CC.dim, fontFamily: FONTS.bold, fontSize: 11 }}>{t.rate}%</Text>
                <LinearGradient colors={[isLast ? CC.accent : CC.primary, isLast ? CC.accentBright : CC.primaryD] as any} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ width: '100%', height: h, borderTopLeftRadius: 6, borderTopRightRadius: 6, opacity: isLast ? 1 : 0.7 }} />
                <Text style={{ color: CC.dim, fontFamily: FONTS.med, fontSize: 11 }}>'{String(t.year).slice(-2)}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View style={[s.card, { flex: 1, minWidth: 280 }]}>
          <Text style={s.cardTitle}>Salary Distribution</Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            {SAL.map((b) => (
              <View key={b.band} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12, width: 90 }}>{b.band}</Text>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <View style={{ width: `${b.pct * 2}%` as any, height: '100%', backgroundColor: b.color, borderRadius: 4 }} />
                </View>
                <Text style={{ color: CC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 60, textAlign: 'right' }}>{b.count} ({b.pct}%)</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={[s.card, { flex: 1, minWidth: 280 }]}>
          <Text style={s.cardTitle}>Top Sectors</Text>
          <View style={{ marginTop: 14, gap: 10 }}>
            {SECTORS.slice(0, 6).map((sec) => (
              <View key={sec.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sec.color }} />
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12, flex: 1 }}>{sec.name}</Text>
                <Text style={{ color: CC.accentBright, fontFamily: FONTS.xbold, fontSize: 13 }}>{sec.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
});
