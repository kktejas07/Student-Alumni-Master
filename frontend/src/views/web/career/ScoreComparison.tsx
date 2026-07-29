/**
 * ScoreComparison.tsx
 * "CURRENT → PROJECTED" display used by the Goal Simulator.
 * Props-only — no simulation logic.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  current: number;
  projected: number | null;
  totalGain: number;
}

export const ScoreComparison = memo(function ScoreComparison({ current, projected, totalGain }: Props) {
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
        <TrendingUp size={20} color={hasResult ? COLORS.green : COLORS.dim} />
      </View>

      {/* Projected */}
      <View style={[s.box, hasResult && s.boxProjected]}>
        <Text style={[s.label, hasResult && { color: COLORS.cyan }]}>PROJECTED</Text>
        <Text style={[s.score, hasResult && { color: COLORS.cyan }]}>
          {hasResult ? `${projected}%` : '—'}
        </Text>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  box: {
    flex: 1, alignItems: 'center', padding: SPACING.sm,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: COLORS.border, borderWidth: 1,
  },
  boxProjected: {
    borderColor: COLORS.cyan + '40',
    backgroundColor: COLORS.cyan + '0a',
  },
  arrow:  { alignItems: 'center', justifyContent: 'center' },
  label:  { color: COLORS.textSub, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.8 },
  score:  { color: COLORS.text,    fontFamily: FONT_FAMILIES.xbold, fontSize: 26, letterSpacing: -0.5, marginTop: SPACING.xxs },
});
