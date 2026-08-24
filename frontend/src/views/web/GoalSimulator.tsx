import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap, TrendingUp, RotateCcw, Check, Plus } from 'lucide-react-native';
import { request } from '@/src/models/services/api';

const FT = { bold: 'DMSans_700Bold', semi: 'DMSans_600SemiBold', med: 'DMSans_500Medium', reg: 'DMSans_400Regular' };
const C = {
  card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.55)',
  dim: 'rgba(255,255,255,0.28)',
  purpleL: '#818CF8', purple: '#4338CA', teal: '#2DD4BF', green: '#34D399',
  amber: '#F59E0B', blue: '#60A5FA', pink: '#F472B6',
};

const SIM_ACTIONS = [
  { type: 'RESUME', label: 'Upload Resume', color: C.purpleL },
  { type: 'PROJECT', label: 'Add a Project', color: C.teal },
  { type: 'SKILLS', label: 'List 3+ Skills', color: C.amber },
  { type: 'LINKEDIN', label: 'Link LinkedIn', color: C.blue },
  { type: 'PORTFOLIO', label: 'Build Portfolio', color: C.pink },
  { type: 'MOCK_INTERVIEW', label: 'Practice Mock Interview', color: C.green },
  { type: 'CERTIFICATION', label: 'Get Certified', color: C.amber },
  { type: 'NETWORKING', label: 'Network with Alumni', color: C.teal },
  { type: 'PROFILE', label: 'Complete Profile', color: C.purpleL },
  { type: 'EDUCATION', label: 'Add Education Details', color: C.blue },
];

export function GoalSimulator({ currentReadiness }: { currentReadiness: number }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [simResult, setSimResult] = useState<{
    current: number; simulated: number; total_gain: number; breakdown: Array<{
      type: string; title: string; gain: number;
      simulated_score_before: number; simulated_score_after: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const toggle = (type: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    setDirty(true);
  };

  const simulate = useCallback(async () => {
    if (enabled.size === 0) {
      setSimResult(null);
      return;
    }
    setLoading(true);
    try {
      const result = await request<any>('/career/simulate', {
        method: 'POST',
        body: { enabled_actions: Array.from(enabled) },
      });
      setSimResult(result);
      setDirty(false);
    } catch {
      setSimResult(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (dirty) simulate();
  }, [dirty, simulate]);

  return (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Zap size={14} color={C.purpleL} />
        <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 10, letterSpacing: 1.2 }}>GOAL SIMULATOR</Text>
        <Text style={{ color: C.dim, fontFamily: FT.reg, fontSize: 9.5 }}>Toggle actions to see impact</Text>
      </View>

      {/* Current vs Simulated */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.8 }}>CURRENT</Text>
          <Text style={{ color: '#fff', fontFamily: FT.bold, fontSize: 28, marginTop: 4 }}>{currentReadiness}%</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: C.teal + '12', borderColor: C.teal + '44', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: C.teal, fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.8 }}>SIMULATED</Text>
          <Text style={{ color: C.teal, fontFamily: FT.bold, fontSize: 28, marginTop: 4 }}>
            {simResult ? `${simResult.simulated}%` : '—'}
          </Text>
          {simResult && simResult.total_gain > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
              <TrendingUp size={12} color={C.green} />
              <Text style={{ color: C.green, fontFamily: FT.bold, fontSize: 12 }}>+{simResult.total_gain}%</Text>
            </View>
          )}
        </View>
      </View>

      {/* Toggle actions */}
      <View style={{ gap: 6 }}>
        {SIM_ACTIONS.map((act) => {
          const isOn = enabled.has(act.type);
          const breakdown = simResult?.breakdown?.find((b) => b.type === act.type);
          return (
            <Pressable
              key={act.type}
              onPress={() => toggle(act.type)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isOn ? act.color + '18' : 'rgba(255,255,255,0.02)', borderColor: isOn ? act.color + '44' : C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isOn ? act.color : C.dim + '44', alignItems: 'center', justifyContent: 'center' }}>
                {isOn ? <Check size={12} color="#fff" /> : <Plus size={12} color={C.dim} />}
              </View>
              <Text style={{ flex: 1, color: isOn ? '#fff' : C.text, fontFamily: isOn ? FT.semi : FT.med, fontSize: 12 }}>{act.label}</Text>
              {breakdown && (
                <Text style={{ color: C.green, fontFamily: FT.bold, fontSize: 12 }}>+{breakdown.gain}%</Text>
              )}
              {simResult && !breakdown && isOn && (
                <Text style={{ color: C.text, fontFamily: FT.med, fontSize: 10 }}>pending</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <ActivityIndicator size="small" color={C.purpleL} />
        </View>
      )}

      {/* Simulated breakdown */}
      {simResult && simResult.breakdown.length > 0 && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, marginTop: 12 }}>
          <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.8, marginBottom: 8 }}>EXPECTED GAIN</Text>
          {simResult.breakdown.map((b, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
              <Text style={{ color: C.text, fontFamily: FT.med, fontSize: 11 }}>{b.title || b.type}</Text>
              <Text style={{ color: C.green, fontFamily: FT.bold, fontSize: 11 }}>+{b.gain}% ({b.simulated_score_before}%→{b.simulated_score_after}%)</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={{ color: C.dim, fontFamily: FT.reg, fontSize: 9, marginTop: 10, textAlign: 'center' }}>
        This is a simulation only. No data is saved.
      </Text>
    </View>
  );
}
