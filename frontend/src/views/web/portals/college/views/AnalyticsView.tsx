import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CC, FONTS } from '../tokens';
import { KpiCard } from '../atoms';
import { TrendingUp, Users, Trophy, BarChart3 } from 'lucide-react-native';

const MONTHLY = [
  { m: 'Dec', placed: 18 }, { m: 'Jan', placed: 32 }, { m: 'Feb', placed: 48 }, { m: 'Mar', placed: 41 }, { m: 'Apr', placed: 67 }, { m: 'May', placed: 89 },
];

export function AnalyticsView() {
  const max = Math.max(...MONTHLY.map((m) => m.placed));
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <KpiCard Icon={TrendingUp} label="Avg Salary"       value="₹18.2 LPA" delta="↑ 12% YoY"  color="green" />
        <KpiCard Icon={Users}      label="Highest Offer"    value="₹52 LPA"  delta="OpenAI · Siddharth" color="purple" />
        <KpiCard Icon={Trophy}     label="Conversion Rate" value="71%"      delta="+5pts"      color="amber" />
        <KpiCard Icon={BarChart3}  label="Top Recruiter"   value="Infosys"  delta="42 offers"  color="blue" />
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Monthly Placements</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 160, marginTop: 22 }}>
          {MONTHLY.map((m, i) => {
            const h = Math.round((m.placed / max) * 140);
            const isLast = i === MONTHLY.length - 1;
            return (
              <View key={m.m} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Text style={{ color: isLast ? CC.accentBright : CC.dim, fontFamily: FONTS.bold, fontSize: 11 }}>{m.placed}</Text>
                <LinearGradient colors={[isLast ? CC.accent : CC.primary, isLast ? CC.accentBright : CC.primaryD] as any} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ width: '100%', height: h, borderTopLeftRadius: 6, borderTopRightRadius: 6, opacity: isLast ? 1 : 0.7 }} />
                <Text style={{ color: CC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{m.m}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
});
