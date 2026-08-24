/**
 * CareerGoalSimulator.tsx
 *
 * UNIFIED Goal Simulator — single implementation replacing:
 *   1. The inlined simEnabled/simResult/simLoading/simDirty state in career-ai.tsx
 *   2. The standalone GoalSimulator.tsx component
 *
 * This component owns its own simulation state. The parent page only
 * provides `currentReadiness` and an optional onToggle collapse callback.
 *
 * API: POST /career/simulate
 */
import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { TrendingUp, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components/Toast';
import { SIM_ACTIONS } from '@/src/lib/careerConstants';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING, WEB_TRANSITIONS } from '@/src/lib/designTokens';
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
  /** If provided, the simulator panel is collapsible. */
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

  // ── Toggle an action on/off ───────────────────────────────────────────────
  const toggle = useCallback((type: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
    setDirty(true);
  }, []);

  // ── Run simulation ────────────────────────────────────────────────────────
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
      // ✅ No longer silent — shows a toast on failure
      toastRef.current.error('Simulation Failed', err?.message || 'Could not calculate projected score. Please try again.');
      setSimResult(null);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // toast accessed via ref

  useEffect(() => { if (dirty) simulate(); }, [dirty, simulate]);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasGain = simResult && simResult.total_gain > 0;

  const headerContent = (
    <>
      <View>
        <Text style={s.title} accessibilityRole="header">Goal Simulator</Text>
        <Text style={s.sub}>Toggle actions to see projected impact</Text>
      </View>
      <View style={s.headerRight}>
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
      {/* Header — clickable if collapsible */}
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          style={s.header}
        >
          {headerContent}
        </Pressable>
      ) : (
        <View style={s.header}>{headerContent}</View>
      )}

      {/* Score display — always visible */}
      <ScoreComparison
        current={currentReadiness}
        projected={simResult?.simulated ?? null}
        totalGain={simResult?.total_gain ?? 0}
      />

      {/* Toggle rows — shown when expanded */}
      {expanded && (
        <View style={s.actionList}>
          {SIM_ACTIONS.map((act) => {
            const isOn      = enabled.has(act.type);
            const breakdown = simResult?.breakdown?.find((b) => b.type === act.type);
            return (
              <Pressable
                accessibilityRole="button"
                key={act.type}
                onPress={() => toggle(act.type)}
                style={[
                  s.actionRow,
                  isOn 
                    ? { backgroundColor: act.color + '18', borderColor: act.color + '50' }
                    : { borderColor: act.color + '30', backgroundColor: 'rgba(255,255,255,0.015)' }
                ]}
              >
                <View style={[
                  s.check, 
                  isOn 
                    ? { backgroundColor: act.color }
                    : { backgroundColor: act.color + '15', borderColor: act.color + '35', borderWidth: 1 }
                ]}>
                  {isOn ? <Check size={11} color="#fff" /> : <Plus size={11} color={act.color} />}
                </View>
                <Text style={s.actionLabel}>
                  {act.label}
                </Text>
                {breakdown && (
                  <Text style={s.breakdownGain}>+{breakdown.gain}%</Text>
                )}
              </Pressable>
            );
          })}

          {loading && (
            <ActivityIndicator size="small" color={COLORS.purpleL} style={{ marginTop: SPACING.xxs }} />
          )}
          <Text style={s.disclaimer}>Simulation only — no data is saved</Text>
        </View>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  headerRight: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.xs },
  title: { color: COLORS.text,  fontFamily: FONT_FAMILIES.xbold, fontSize: 15, letterSpacing: -0.2 },
  sub:   { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,   fontSize: FONT_SIZES.sm, marginTop: 2 },

  actionList: { gap: 6, marginTop: SPACING.xs },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.sm, paddingVertical: 9,
    borderRadius: RADIUS.btn,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: COLORS.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' } as any) : {}),
  },
  check: {
    width: 20, height: 20, borderRadius: RADIUS.icon,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel:   { flex: 1, color: '#FFFFFF', fontFamily: FONT_FAMILIES.bold,  fontSize: FONT_SIZES.sm },
  breakdownGain: { color: COLORS.green,           fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },
  disclaimer:    { color: COLORS.dim, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, textAlign: 'center', marginTop: SPACING.xs },
});
