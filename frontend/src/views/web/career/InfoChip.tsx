/**
 * InfoChip.tsx
 * Small colored badge/pill used throughout Career AI for status labels,
 * category tags, and metadata chips.
 * Props-only — zero business logic.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';
import { useTheme } from '@/src/theme/ThemeContext';

interface Props {
  label: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: React.ReactNode;
}

export const InfoChip = memo(function InfoChip({
  label,
  color,
  backgroundColor,
  borderColor,
  icon,
}: Props) {
  const { isDark } = useTheme();
  const resolvedColor = color ?? (isDark ? COLORS.text2 : 'rgba(15, 23, 42, 0.8)');
  const resolvedBg = backgroundColor ?? (isDark ? COLORS.chipBg : 'rgba(99, 102, 241, 0.08)');
  const resolvedBorder = borderColor ?? (isDark ? COLORS.border : 'rgba(15, 23, 42, 0.1)');
  return (
    <View style={[s.chip, { backgroundColor: resolvedBg, borderColor: resolvedBorder }]}>
      {icon}
      <Text style={[s.text, { color: resolvedColor }]}>{label}</Text>
    </View>
  );
});

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
  },
  text: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.sm,
  },
});
