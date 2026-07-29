/**
 * AIInsightBubble.tsx
 * Single AI insight item — redesigned to feel like an AI conversation card.
 *
 * Premium redesign (reference-match):
 *   • Left 3px purple gradient accent border (not just a flat border)
 *   • 28×28 icon container with stronger glow
 *   • "AI" label chip top-right
 *   • Body text 13px with line-height 19
 *   • Subtle bg gradient from purple to transparent
 */
import React, { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  text: string;
}

export const AIInsightBubble = memo(function AIInsightBubble({ text }: Props) {
  return (
    <View style={s.bubble}>
      {/* Left accent bar */}
      <View style={s.accentBar} />

      <View style={s.body}>
        {/* Top row: icon + AI chip */}
        <View style={s.topRow}>
          <View style={s.iconWrap}>
            <Sparkles size={12} color={COLORS.purpleL} />
          </View>
          <View style={s.aiChip}>
            <Text style={s.aiChipText}>AI</Text>
          </View>
        </View>

        {/* Insight text */}
        <Text style={s.text}>{text}</Text>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(67,56,202,0.08)',
    borderColor: 'rgba(129, 140, 248, 0.22)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 0 12px rgba(129, 140, 248, 0.12)',
        } as any)
      : {}),
  },

  /* 3px left accent bar */
  accentBar: {
    width: 3,
    backgroundColor: COLORS.purpleL,
    opacity: 0.9,
  },

  body: {
    flex: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(129,140,248,0.18)',
    borderColor: 'rgba(129,140,248,0.25)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 10px rgba(129,140,248,0.25)' } as any)
      : {}),
  },

  aiChip: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderColor: 'rgba(129,140,248,0.22)',
    borderWidth: 1,
  },
  aiChipText: {
    color: COLORS.purpleL,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.8,
  },

  text: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
