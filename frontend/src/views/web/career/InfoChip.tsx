/**
 * InfoChip.tsx
 * Small colored badge/pill used throughout Career AI for status labels,
 * category tags, and metadata chips.
 * Props-only — zero business logic.
 */
import React, { memo } from 'react';
import {View, Text, StyleSheet} from "react-native";
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  label: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  icon?: React.ReactNode;
}

export const InfoChip = memo(function InfoChip({
  label,
  color = COLORS.text2,
  backgroundColor = COLORS.chipBg,
  borderColor = COLORS.border,
  icon,
}: Props) {
  return (
    <View style={[s.chip, { backgroundColor, borderColor }]}>
      {icon}
      <Text style={[s.text, { color }]}>{label}</Text>
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
