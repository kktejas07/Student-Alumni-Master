import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp } from 'lucide-react-native';

const FT = { bold: 'DMSans_700Bold', semi: 'DMSans_600SemiBold', med: 'DMSans_500Medium', reg: 'DMSans_400Regular' };
const C = {
  card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.55)',
  dim: 'rgba(255,255,255,0.28)',
  purpleL: '#A78BFA', teal: '#2DD4BF', green: '#34D399', amber: '#F59E0B', blue: '#60A5FA',
};

interface Predictions {
  current: number;
  predictions: {
    '7d': { score: number; gain: number; actions: Array<{ type: string; gain: number; title: string }> };
    '30d': { score: number; gain: number; actions: Array<{ type: string; gain: number; title: string }> };
    '90d': { score: number; gain: number; actions: Array<{ type: string; gain: number; title: string }> };
  };
}

export function PredictionTimeline({ data }: { data: Predictions | null }) {
  if (!data || !data.predictions?.['7d']) return null;
  const preds = data.predictions;
  const current = data.current;

  const periods = [
    { key: '7d',  label: '7 Days',  color: C.teal,  data: preds['7d'] },
    { key: '30d', label: '30 Days', color: C.amber, data: preds['30d'] },
    { key: '90d', label: '90 Days', color: C.blue,  data: preds['90d'] },
  ];

  return (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <TrendingUp size={14} color={C.purpleL} />
        <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 10, letterSpacing: 1.2 }}>PREDICTED CAREER GROWTH</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {periods.map((p) => {
          const gain = p.data.gain;
          const score = p.data.score;
          const isPositive = gain > 0;
          return (
            <View key={p.key} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
              <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.8, marginBottom: 6 }}>{p.label}</Text>
              <Text style={{ color: '#fff', fontFamily: FT.bold, fontSize: 22, letterSpacing: -0.5 }}>{score}%</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <TrendingUp size={11} color={isPositive ? p.color : C.dim} />
                <Text style={{ color: isPositive ? p.color : C.dim, fontFamily: FT.bold, fontSize: 11 }}>
                  {isPositive ? `+${gain}%` : '0%'}
                </Text>
              </View>
              {p.data.actions.length > 0 && (
                <Text style={{ color: C.text, fontFamily: FT.med, fontSize: 9, marginTop: 6 }} numberOfLines={2}>
                  {p.data.actions.map((a: any) => a.title).join(' · ')}
                </Text>
              )}
              <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.min(100, score)}%`, backgroundColor: p.color, borderRadius: 2 }} />
              </View>
            </View>
          );
        })}
      </View>
      <Text style={{ color: C.dim, fontFamily: FT.reg, fontSize: 9.5, marginTop: 10, textAlign: 'center' }}>
        Based on current profile data and pending actions
      </Text>
    </View>
  );
}
