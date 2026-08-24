/**
 * MilestoneCard.tsx
 * A single step in the Career Journey timeline.
 * Handles its own visual state (done, active, future) via props.
 *
 * Premium redesign (reference-match):
 *   • Active card: 3px left accent bar + 12% purple bg + glow border
 *   • Completed: green connector + softer opacity (rewarding feel)
 *   • Future: dim but readable (not invisible)
 *   • Timeline dot: 26×26, stronger state colours
 *   • Badge pills: colored bg, not just text
 *   • Hover: translateY(-1px) + border brightening
 */
import React, { memo } from 'react';
import {View, Text, Pressable, Platform, StyleSheet} from "react-native";
import { ChevronRight, CircleCheck as CheckCircle2, Lock } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';
import type { Milestone } from '@/src/viewmodels/hooks/useCareerAI';

interface Props {
  milestone: Milestone;
  isFirst: boolean;
  isActive: boolean;
  isFuture: boolean;
  isLast: boolean;
  showTopConnector: boolean;
  gain: number;
  onPress: () => void;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
}

export const MilestoneCard = memo(function MilestoneCard({
  milestone, isFirst, isActive, isFuture, isLast, showTopConnector,
  gain, onPress, icon: Icon, color,
}: Props) {
  const isCompleted = milestone.completed;

  return (
    <View style={s.row}>
      {/* ── Timeline column ── */}
      <View style={s.timeline}>
        {showTopConnector && (
          <View style={[s.connector, isCompleted && s.connectorDone]} />
        )}
        <View style={[
          s.dot,
          isCompleted && s.dotDone,
          isActive    && s.dotActive,
          isFuture    && s.dotFuture,
        ]}>
          {isCompleted
            ? <CheckCircle2 size={12} color="#fff" fill={COLORS.green} />
            : isFuture
              ? <Lock size={9} color={COLORS.dim} />
              : <Icon size={10} color={isActive ? COLORS.purpleL : COLORS.dim} />
          }
        </View>
        {!isLast && (
          <View style={[s.connector, isCompleted && s.connectorDone]} />
        )}
      </View>

      {/* ── Card ── */}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed, hovered }: any) => [
          s.card,
          isCompleted && s.cardDone,
          isActive    && s.cardActive,
          isFuture    && s.cardFuture,
          (pressed || hovered) && !isFuture && s.cardHover,
        ]}
      >
        {/* Left accent bar for active milestone */}
        {isActive && <View style={s.accentBar} />}

        <View style={s.cardInner}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Header row: status badge + gain chip */}
            <View style={s.cardHeader}>
              {isCompleted && (
                <View style={[s.badge, s.badgeDone]}>
                  <Text style={[s.badgeText, { color: COLORS.green }]}>Completed</Text>
                </View>
              )}
              {isActive && (
                <View style={[s.badge, s.badgeActive]}>
                  <Text style={[s.badgeText, { color: COLORS.purpleL }]}>Next Action</Text>
                </View>
              )}
              {isFuture && (
                <View style={[s.badge, s.badgeFuture]}>
                  <Text style={[s.badgeText, { color: COLORS.dim }]}>Locked</Text>
                </View>
              )}
              <View style={s.gainChip}>
                <Text style={s.gainText}>+{gain}%</Text>
              </View>
            </View>

            {/* Title */}
            <Text
              style={[
                s.title,
                isCompleted && s.titleDone,
                isFuture    && { color: COLORS.text2 },
              ]}
              numberOfLines={1}
            >
              {milestone.title}
            </Text>

            {/* Description */}
            <Text
              style={[s.desc, isFuture && { color: COLORS.dim }]}
              numberOfLines={2}
            >
              {milestone.description}
            </Text>
          </View>
          <ChevronRight size={13} color={isFuture ? COLORS.dim : COLORS.textSub} />
        </View>
      </Pressable>
    </View>
  );
});

const CARD_WEB = Platform.OS === 'web'
  ? ({ transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer' } as any)
  : {};

const s = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'stretch', minHeight: 64 },
  timeline: { width: 32, alignItems: 'center' },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 1,
  },
  connectorDone: { backgroundColor: COLORS.green + 'aa' },

  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dotDone:   {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  dotActive: {
    backgroundColor: 'rgba(79,70,229,0.22)',
    borderColor: COLORS.purpleL,
    borderWidth: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 8px rgba(129,140,248,0.35)' } as any)
      : {}),
  },
  dotFuture: { opacity: 0.45 },

  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    marginLeft: SPACING.xs,
    marginBottom: 8,
    overflow: 'hidden',
    ...CARD_WEB,
  },
  cardDone: {
    opacity: 0.65,
    backgroundColor: 'rgba(52,211,153,0.03)',
    borderColor: 'rgba(52,211,153,0.12)',
  },
  cardActive: {
    backgroundColor: 'rgba(79,70,229,0.10)',
    borderColor: 'rgba(79,70,229,0.32)',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 16px rgba(79,70,229,0.15)' } as any)
      : {}),
  },
  cardFuture: { opacity: 0.52 },
  cardHover: {
    backgroundColor: COLORS.cardHover,
    borderColor: COLORS.borderMed,
    ...(Platform.OS === 'web' ? ({ transform: 'translateY(-1px)' } as any) : {}),
  },

  /* Left accent bar — only rendered for active card */
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.purpleL,
    borderTopLeftRadius: RADIUS.card,
    borderBottomLeftRadius: RADIUS.card,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '2px 0 8px rgba(129,140,248,0.40)' } as any)
      : {}),
  },

  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    paddingLeft: SPACING.md,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  badge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  badgeDone:   { backgroundColor: 'rgba(52,211,153,0.12)' },
  badgeActive: { backgroundColor: 'rgba(129,140,248,0.14)' },
  badgeFuture: { backgroundColor: 'rgba(255,255,255,0.04)' },
  badgeText:   { fontSize: FONT_SIZES.xs, fontFamily: FONT_FAMILIES.bold, letterSpacing: 0.3 },

  gainChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderColor: 'rgba(34,211,238,0.22)',
    borderWidth: 1,
    marginLeft: 'auto' as any,
  },
  gainText: {
    color: COLORS.cyan,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.2,
  },

  title:     { color: COLORS.text, fontFamily: FONT_FAMILIES.bold, fontSize: 13, lineHeight: 18 },
  titleDone: { textDecorationLine: 'line-through', color: COLORS.text2 },
  desc:      {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
    lineHeight: 16,
  },
});
