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
import React, { useCallback, useEffect, useRef, useState, memo, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { TrendingUp, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components/Toast';
import { SIM_ACTIONS } from '@/src/lib/careerConstants';
import { useTheme } from '@/src/theme/ThemeContext';
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

/** Light-theme variants for SIM_ACTIONS colors (neon hues wash out on white). */
const SIM_ACTION_LIGHT_COLORS: Record<string, string> = {
  '#818CF8': '#4338CA',
  '#2DD4BF': '#0D9488',
  '#F59E0B': '#D97706',
  '#3B82F6': '#2563EB',
  '#EC4899': '#DB2777',
  '#10B981': '#059669',
};

export const CareerGoalSimulator = memo(function CareerGoalSimulator({
  currentReadiness,
  collapsible = true,
}: Props) {
  const { isDark } = useTheme();
  const s = useMemo(() => makeStyles(isDark), [isDark]);
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
      // No longer silent — shows a toast on failure
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
            color={isDark ? COLORS.green : '#059669'}
            backgroundColor={isDark ? COLORS.chipBg : 'rgba(16,185,129,0.15)'}
            borderColor={isDark ? COLORS.green + '30' : 'rgba(16,185,129,0.3)'}
            icon={<TrendingUp size={11} color={isDark ? COLORS.green : '#059669'} />}
          />
        )}
        {collapsible && (
          expanded
            ? <ChevronUp size={14} color={isDark ? COLORS.dim : 'rgba(15,23,42,0.5)'} />
            : <ChevronDown size={14} color={isDark ? COLORS.dim : 'rgba(15,23,42,0.5)'} />
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
            const actColor  = isDark ? act.color : (SIM_ACTION_LIGHT_COLORS[act.color] ?? act.color);
            return (
              <Pressable
                accessibilityRole="button"
                key={act.type}
                onPress={() => toggle(act.type)}
                style={[
                  s.actionRow,
                  isOn
                    ? { backgroundColor: actColor + '18', borderColor: actColor + '50' }
                    : { borderColor: actColor + '30', backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.02)' }
                ]}
              >
                <View style={[
                  s.check,
                  isOn
                    ? { backgroundColor: actColor }
                    : { backgroundColor: actColor + '15', borderColor: actColor + '35', borderWidth: 1 }
                ]}>
                  {isOn ? <Check size={11} color="#fff" /> : <Plus size={11} color={actColor} />}
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
            <ActivityIndicator size="small" color={isDark ? COLORS.purpleL : '#4338CA'} style={{ marginTop: SPACING.xxs }} />
          )}
          {!simResult && !loading && enabled.size === 0 && (
            <Text style={s.hint}>Add profile items to simulate</Text>
          )}
          <Text style={s.disclaimer}>Simulation only — no data is saved</Text>
        </View>
      )}
    </View>
  );
});

const makeStyles = (dark: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  headerRight: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.xs },
  title: { color: dark ? COLORS.text : '#0F172A', fontFamily: FONT_FAMILIES.xbold, fontSize: 15, letterSpacing: -0.2 },
  sub:   { color: dark ? COLORS.text2 : 'rgba(15,23,42,0.7)', fontFamily: FONT_FAMILIES.med,   fontSize: FONT_SIZES.sm, marginTop: 2 },

  actionList: { gap: 6, marginTop: SPACING.xs },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.sm, paddingVertical: 9,
    borderRadius: RADIUS.btn,
    backgroundColor: dark ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.03)',
    borderColor: dark ? COLORS.border : 'rgba(15,23,42,0.08)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)' } as any) : {}),
  },
  check: {
    width: 20, height: 20, borderRadius: RADIUS.icon,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel:   { flex: 1, color: dark ? '#FFFFFF' : '#0F172A', fontFamily: FONT_FAMILIES.bold,  fontSize: FONT_SIZES.sm },
  breakdownGain: { color: dark ? COLORS.green : '#059669',          fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },
  hint:          { color: dark ? COLORS.dim : 'rgba(15,23,42,0.5)', fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, textAlign: 'center' },
  disclaimer:    { color: dark ? COLORS.dim : 'rgba(15,23,42,0.5)', fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, textAlign: 'center', marginTop: SPACING.xs },
});
