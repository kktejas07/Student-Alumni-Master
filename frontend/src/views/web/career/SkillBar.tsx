/**
 * SkillBar.tsx
 * A single row in the Skills Breakdown section.
 * Renders: icon box → skill title → progress bar → percentage.
 * Matches Image 1 reference design.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  label: string;
  score: number;
  baseColor: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  status?: string;
}

export const SkillBar = memo(function SkillBar({ label, score, baseColor, icon: Icon, status }: Props) {
  const clampedScore = Math.min(100, Math.max(0, Number(score) || 0));
  const statusColor = clampedScore >= 70 ? '#34D399' : clampedScore >= 40 ? '#F59E0B' : '#F87171';
  const statusLabel = status || (clampedScore >= 70 ? 'Strong' : clampedScore >= 40 ? 'Developing' : 'Needs Work');

  return (
    <View style={s.row}>
      {/* Left: icon + name */}
      <View style={s.left}>
        <View style={[s.iconWrap, { backgroundColor: baseColor + '1F', borderColor: baseColor + '35' }]}>
          <Icon size={14} color={baseColor} />
        </View>
        <Text style={s.name} numberOfLines={1}>{label}</Text>
      </View>

      {/* Bar */}
      <View style={s.barWrap}>
        <View style={s.track}>
          <View style={[s.fill, { width: `${clampedScore}%` as any, backgroundColor: baseColor }]} />
        </View>
      </View>

      {/* Score % */}
      <Text style={[s.pct, { color: '#FFF' }]}>{clampedScore}%</Text>

      {/* Status chip */}
      <View style={[s.statusChip, { backgroundColor: statusColor + '18', borderColor: statusColor + '35' }]}>
        <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 190,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  name: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 12,
    flex: 1,
  },
  barWrap: { flex: 1 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  pct: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
