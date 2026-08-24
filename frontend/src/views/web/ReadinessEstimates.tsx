import React from 'react';
import { View, Text } from 'react-native';
import { Target, Award, Mic } from 'lucide-react-native';

const FT = { bold: 'DMSans_700Bold', semi: 'DMSans_600SemiBold', med: 'DMSans_500Medium', reg: 'DMSans_400Regular' };
const C = {
  card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.55)',
  dim: 'rgba(255,255,255,0.28)',
  purpleL: '#A78BFA', teal: '#2DD4BF', green: '#34D399', amber: '#F59E0B',
};

interface ReadinessEstimate {
  label: string;
  percentage: number;
  is_ready: boolean;
  met_weight: number;
  total_weight: number;
  details: Array<{ criteria: string; met: boolean; weight: number }>;
}

interface ReadinessEstimatesData {
  internship_readiness: ReadinessEstimate;
  placement_readiness: ReadinessEstimate;
  interview_readiness: ReadinessEstimate;
}

const ESTIMATE_CONFIG: Record<string, { label: string; Icon: any; color: string }> = {
  internship_readiness: { label: 'Internship Ready', Icon: Target, color: C.teal },
  placement_readiness: { label: 'Placement Ready', Icon: Award, color: C.amber },
  interview_readiness: { label: 'Interview Ready', Icon: Mic, color: C.purpleL },
};

export function ReadinessEstimates({ data }: { data: ReadinessEstimatesData | null }) {
  if (!data) return null;

  const entries = Object.entries(ESTIMATE_CONFIG);

  return (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 18 }}>
      <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 10, letterSpacing: 1.2, marginBottom: 14 }}>READINESS ESTIMATES</Text>
      <View style={{ gap: 10 }}>
        {entries.map(([key, cfg]) => {
          const est = data[key as keyof ReadinessEstimatesData];
          if (!est) return null;
          const pct = est.percentage;
          const col = est.is_ready ? C.green : pct >= 50 ? C.amber : cfg.color;
          return (
            <View key={key} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: col + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <cfg.Icon size={14} color={col} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontFamily: FT.semi, fontSize: 13 }}>{cfg.label}</Text>
                    <Text style={{ color: col, fontFamily: FT.bold, fontSize: 16 }}>{pct}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct}%`, backgroundColor: col, borderRadius: 2 }} />
                  </View>
                  <Text style={{ color: est.is_ready ? C.green : C.text, fontFamily: FT.med, fontSize: 10, marginTop: 4 }}>
                    {est.is_ready ? 'Ready ' : `${est.met_weight}/${est.total_weight} criteria met`}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        <Text style={{ color: C.dim, fontFamily: FT.reg, fontSize: 9, textAlign: 'center' }}>
          Threshold-based estimates using current skill scores
        </Text>
      </View>
    </View>
  );
}
