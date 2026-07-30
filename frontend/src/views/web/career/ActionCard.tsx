/**
 * ActionCard.tsx
 * A single item in the "Next Best Actions" ranked list.
 * Props-only — no business logic, no API calls.
 *
 * Premium redesign (reference-match):
 *   • Rank #1 gets purple glow border (highest priority emphasis)
 *   • 36×36 icon container (up from 32)
 *   • Time estimate chip with structured layout
 *   • Gain chip with colored text right-aligned
 *   • Hover: translateY(-1px) + border brightening
 */
import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { ChevronRight, Clock } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  rank: number;
  /** Lucide icon component */
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  title: string;
  difficultyLabel: string;
  difficultyColor: string;
  timeEstimate: string;
  gain: number;
  onPress: () => void;
}

export const ActionCard = memo(function ActionCard({
  rank, icon: Icon, color, title, difficultyLabel, difficultyColor,
  timeEstimate, gain, onPress,
}: Props) {
  const isTopAction = rank === 1;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        s.row,
        isTopAction && s.rowTop,
        (pressed || hovered) && s.rowHover,
      ]}
    >
      {/* Rank badge */}
      <View style={[s.rank, isTopAction && s.rankTop]}>
        <Text style={[s.rankText, isTopAction && s.rankTextTop]}>{rank}</Text>
      </View>

      {/* Icon container */}
      <View style={[s.icon, { backgroundColor: color + '20', borderColor: color + '40' }]}>
        <Icon size={16} color={color} />
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <View style={s.chips}>
          {/* Difficulty chip */}
          <View style={[s.diffChip, { borderColor: difficultyColor + '40' }]}>
            <Text style={[s.diffText, { color: difficultyColor }]}>{difficultyLabel}</Text>
          </View>
          {/* Time chip */}
          <View style={s.timeChip}>
            <Clock size={9} color={COLORS.textSub} />
            <Text style={s.time}>{timeEstimate}</Text>
          </View>
        </View>
      </View>

      {/* Gain + arrow */}
      <View style={s.right}>
        <Text style={[s.gain, { color }]}>+{gain}%</Text>
        <ChevronRight size={13} color={COLORS.dim} />
      </View>
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
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 14,
    borderRadius: RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: COLORS.border,
    borderWidth: 1,
    ...ROW_WEB,
  },
  rowTop: {
    backgroundColor: 'rgba(79,70,229,0.07)',
    borderColor: 'rgba(79,70,229,0.28)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 0 1px rgba(79,70,229,0.18) inset' } as any)
      : {}),
  },
  rowHover: {
    backgroundColor: COLORS.cardHover,
    borderColor: COLORS.borderMed,
    ...(Platform.OS === 'web' ? ({ transform: 'translateY(-1px)' } as any) : {}),
  },

  rank: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.icon,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankTop: {
    backgroundColor: 'rgba(79,70,229,0.20)',
  },
  rankText: {
    color: COLORS.textSub,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.sm,
  },
  rankTextTop: {
    color: COLORS.purpleL,
  },

  icon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  info: { flex: 1, minWidth: 0 },
  title: {
    color: COLORS.text,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 4,
  },
  diffChip: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 3,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
  },
  diffText: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.3,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  time: {
    color: COLORS.textSub,
    fontFamily: FONT_FAMILIES.med,
    fontSize: FONT_SIZES.xs,
  },

  right: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xxs },
  gain: { fontFamily: FONT_FAMILIES.xbold, fontSize: FONT_SIZES.md, letterSpacing: -0.3 },
});
