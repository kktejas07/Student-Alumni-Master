/**
 * WeeklyTaskCard.tsx
 * A single item in the Weekly Focus section.
 *
 * Premium redesign (reference-match):
 *   • Priority badge (1/2/3) with purple tint for #1
 *   • 32×32 icon container
 *   • Gain chip right-aligned with cyan tint
 *   • Hover: translateY(-1px) + border brightening
 */
import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  num: number;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  title: string;
  description: string;
  gain: number;
  onPress: () => void;
}

export const WeeklyTaskCard = memo(function WeeklyTaskCard({
  num, icon: Icon, color, title, description, gain, onPress,
}: Props) {
  const isTop = num === 1;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        s.row,
        isTop && s.rowTop,
        (pressed || hovered) && s.rowHover,
      ]}
    >
      {/* Priority badge */}
      <View style={[s.num, isTop && s.numTop]}>
        <Text style={[s.numText, isTop && s.numTextTop]}>{num}</Text>
      </View>

      {/* Icon */}
      <View style={[s.icon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
        <Icon size={15} color={color} />
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <Text style={s.desc} numberOfLines={1}>{description}</Text>
      </View>

      {/* Gain chip */}
      <View style={s.gainChip}>
        <Text style={s.gainText}>+{gain}%</Text>
      </View>

      <ChevronRight size={13} color={COLORS.dim} />
    </Pressable>
  );
});

const ROW_WEB = Platform.OS === 'web'
  ? ({ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer' } as any)
  : {};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 12,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: COLORS.border,
    borderWidth: 1,
    ...ROW_WEB,
  },
  rowTop: {
    backgroundColor: 'rgba(124,58,237,0.05)',
    borderColor: 'rgba(124,58,237,0.22)',
  },
  rowHover: {
    backgroundColor: COLORS.cardHover,
    borderColor: COLORS.borderMed,
    ...(Platform.OS === 'web' ? ({ transform: 'translateY(-1px)' } as any) : {}),
  },

  num: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numTop: {
    backgroundColor: 'rgba(124,58,237,0.22)',
  },
  numText: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.sm,
  },
  numTextTop: {
    color: COLORS.purpleL,
  },

  icon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  info: { flex: 1, minWidth: 0 },
  title: {
    color: COLORS.text,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
    lineHeight: 19,
  },
  desc: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
    lineHeight: 16,
  },

  gainChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderColor: 'rgba(34,211,238,0.22)',
    borderWidth: 1,
    flexShrink: 0,
  },
  gainText: {
    color: COLORS.cyan,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.2,
  },
});
