import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import {View, Text, Pressable, ActivityIndicator, Platform} from "react-native";
import { TrendingUp, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components/Toast';
import { SIM_ACTIONS } from '@/src/lib/careerConstants';
import { COLORS } from '@/src/lib/designTokens';
import { ScoreComparison } from './ScoreComparison';
import { InfoChip } from './InfoChip';

interface SimResult {
  current: number;
  simulated: number;
  total_gain: number;
  breakdown: Array<{
    type: string;
    title: string;
    gain: number;
    simulated_score_before: number;
    simulated_score_after: number;
  }>;
}

interface Props {
  currentReadiness: number;
  collapsible?: boolean;
}

export const CareerGoalSimulator = memo(function CareerGoalSimulator({
  currentReadiness,
  collapsible = true,
}: Props) {
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; });

  const [enabled,   setEnabled]   = useState<Set<string>>(new Set());
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [dirty,     setDirty]     = useState(false);
  const [expanded,  setExpanded]  = useState(!collapsible);

  const toggle = useCallback((type: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
    setDirty(true);
  }, []);

  const simulate = useCallback(async () => {
    if (enabled.size === 0) { setSimResult(null); return; }
    setLoading(true);
    try {
      const result = await request<SimResult>('/career/simulate', {
        method: 'POST',
        body: { enabled_actions: Array.from(enabled) },
      });
      setSimResult(result);
      setDirty(false);
    } catch (err: any) {
      toastRef.current.error('Simulation Failed', err?.message || 'Could not calculate projected score. Please try again.');
      setSimResult(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (dirty) simulate(); }, [dirty, simulate]);

  const hasGain = simResult && simResult.total_gain > 0;

  const headerContent = (
    <>
      <View>
        <Text className="text-white font-display-bold text-[15px] tracking-[-0.2px]" accessibilityRole="header">Goal Simulator</Text>
        <Text className="text-white/50 font-body-semibold text-sm mt-0.5">Toggle actions to see projected impact</Text>
      </View>
      <View className="flex-row flex-wrap items-center gap-1">
        {hasGain && (
          <InfoChip
            label={`+${simResult!.total_gain}%`}
            color={COLORS.green}
            backgroundColor={COLORS.chipBg}
            borderColor={COLORS.green + '30'}
            icon={<TrendingUp size={11} color={COLORS.green} />}
          />
        )}
        {collapsible && (
          expanded
            ? <ChevronUp size={14} color={COLORS.dim} />
            : <ChevronDown size={14} color={COLORS.dim} />
        )}
      </View>
    </>
  );

  return (
    <View>
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          className="flex-row items-start justify-between gap-1 mb-4"
          style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
        >
          {headerContent}
        </Pressable>
      ) : (
        <View className="flex-row items-start justify-between gap-1 mb-4">{headerContent}</View>
      )}

      <ScoreComparison
        current={currentReadiness}
        projected={simResult?.simulated ?? null}
        totalGain={simResult?.total_gain ?? 0}
      />

      {expanded && (
        <View className="gap-1.5 mt-1">
          {SIM_ACTIONS.map((act) => {
            const isOn = enabled.has(act.type);
            const breakdown = simResult?.breakdown?.find((b) => b.type === act.type);
            return (
              <Pressable
                accessibilityRole="button"
                key={act.type}
                onPress={() => toggle(act.type)}
                className="flex-row items-center gap-1 px-2 py-2 rounded-lg border"
                style={{
                  backgroundColor: isOn ? act.color + '18' : 'rgba(255,255,255,0.015)',
                  borderColor: isOn ? act.color + '50' : act.color + '30',
                  ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' } : {}),
                }}
              >
                <View
                  className="w-5 h-5 rounded-sm items-center justify-center"
                  style={{
                    backgroundColor: isOn ? act.color : act.color + '15',
                    borderColor: isOn ? undefined : act.color + '35',
                    borderWidth: isOn ? undefined : 1,
                  }}
                >
                  {isOn ? <Check size={11} color="#fff" /> : <Plus size={11} color={act.color} />}
                </View>
                <Text className="flex-1 text-white font-body-bold text-sm">
                  {act.label}
                </Text>
                {breakdown && (
                  <Text className="text-green-400 font-body-bold text-sm">+{breakdown.gain}%</Text>
                )}
              </Pressable>
            );
          })}

          {loading && (
            <ActivityIndicator size="small" color="#818CF8" className="mt-1" />
          )}
          <Text className="text-white/30 font-body-semibold text-sm text-center mt-1">Simulation only — no data is saved</Text>
        </View>
      )}
    </View>
  );
});
