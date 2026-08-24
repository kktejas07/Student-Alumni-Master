/**
 * SectionHeader.tsx
 * Reusable header pattern used in every Career AI section card.
 * Props-only component — zero business logic.
 *
 * Visual refinements (iteration 2):
 *   • Title–subtitle gap increased (marginTop 3 → 5)
 *   • Subtitle line-height improved for readability
 *   • marginBottom increased for breathing room below header
 */
import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, SPACING } from '@/src/lib/designTokens';

interface Props {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  accessibilityLabel?: string;
}

export const SectionHeader = memo(function SectionHeader({
  title, subtitle, rightElement, accessibilityLabel,
}: Props) {
  return (
    <View style={s.row}>
      <View style={s.left}>
        <Text
          style={s.title}
          accessibilityRole="header"
          accessibilityLabel={accessibilityLabel ?? title}
        >
          {title}
        </Text>
        {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      </View>
      {rightElement ? <View style={s.right}>{rightElement}</View> : null}
    </View>
  );
});

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,    // 20px (up from 16px) — more breathing room
  },
  left: { flex: 1, minWidth: 0 },
  right: { flexShrink: 0 },
  title: {
    color: COLORS.text,
    fontFamily: FONT_FAMILIES.xbold,
    fontSize: FONT_SIZES.lg,    // 18px
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  sub: {
    color: COLORS.textSub,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 13,
    marginTop: 5,               // 5px (up from 3px)
    lineHeight: 18,
  },
});
