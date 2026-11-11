/**
 * ScoreComparison.tsx
 * "CURRENT → PROJECTED" display used by the Goal Simulator.
 * Props-only — no simulation logic.
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';
import { useTheme } from '@/src/theme/ThemeContext';

interface Props {
  current: number;
  projected: number | null;
  totalGain: number;
}

export const ScoreComparison = memo(function ScoreComparison({ current, projected, totalGain }: Props) {
  const { isDark } = useTheme();
  const s = useMemo(() => makeStyles(isDark), [isDark]);
  const green = isDark ? COLORS.green : '#059669';
  const cyan = isDark ? COLORS.cyan : '#0891B2';
  const hasResult = projected !== null && projected > 0;

  return (
    <View style={s.row}>
      {/* Current */}
      <View style={s.box}>
        <Text style={s.label}>CURRENT</Text>
        <Text style={s.score}>{current}%</Text>
      </View>

      {/* Arrow */}
      <View style={s.arrow}>
        <TrendingUp size={20} color={hasResult ? green : (isDark ? COLORS.dim : 'rgba(15,23,42,0.5)')} />
      </View>

      {/* Projected */}
      <View style={[s.box, hasResult && s.boxProjected]}>
        <Text style={[s.label, hasResult && { color: cyan }]}>PROJECTED</Text>
        <Text style={[s.score, hasResult && { color: cyan }]}>
          {hasResult ? `${projected}%` : '—'}
        </Text>
      </View>
    </View>
  );
});

const makeStyles = (dark: boolean) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  box: {
    flex: 1, alignItems: 'center', padding: SPACING.sm,
    borderRadius: RADIUS.card,
    backgroundColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
    borderColor: dark ? COLORS.border : 'rgba(15,23,42,0.08)', borderWidth: 1,
  },
  boxProjected: {
    borderColor: (dark ? COLORS.cyan : '#0891B2') + '40',
    backgroundColor: (dark ? COLORS.cyan : '#0891B2') + '0a',
  },
  arrow:  { alignItems: 'center', justifyContent: 'center' },
  label:  { color: dark ? COLORS.textSub : 'rgba(15,23,42,0.7)', fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.8 },
  score:  { color: dark ? COLORS.text : '#0F172A', fontFamily: FONT_FAMILIES.xbold, fontSize: 26, letterSpacing: -0.5, marginTop: SPACING.xxs },
});
