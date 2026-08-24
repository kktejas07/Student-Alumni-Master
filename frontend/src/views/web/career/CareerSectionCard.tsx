/**
 * CareerSectionCard.tsx
 * Shared card wrapper with 3-tier elevation system.
 *
 * Visual refinements (iteration 2):
 *   • Primary: noticeably brighter background + stronger shadow + subtle top-glow border
 *   • Secondary: standard card weight
 *   • Utility: slightly darker/recessed — sits behind primary cards in visual hierarchy
 *   • All tiers have inset top highlight for glass-like depth
 */
import React, { memo } from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/src/lib/designTokens';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  elevation?: 'primary' | 'secondary' | 'utility';
}

export const CareerSectionCard = memo(function CareerSectionCard({
  children, style, elevation = 'secondary',
}: Props) {
  const elevStyle =
    elevation === 'primary'   ? s.primary   :
    elevation === 'utility'   ? s.utility   :
    s.secondary;

  return (
    <View style={[s.base, elevStyle, style]}>
      {children}
    </View>
  );
});

const WEB = (styles: object) => Platform.OS === 'web' ? styles as any : {};

const s = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    overflow: 'hidden',
  },

  /** PRIMARY — Career Journey, Skills Breakdown */
  primary: {
    backgroundColor: '#16192a',
    borderColor: 'rgba(255,255,255,0.09)',
    ...WEB({
      boxShadow: [
        '0 4px 28px rgba(0,0,0,0.45)',
        '0 1px 0 rgba(255,255,255,0.06) inset',
      ].join(', '),
    }),
  },

  /** SECONDARY — Actions, Simulator (default) */
  secondary: {
    backgroundColor: '#131624',
    borderColor: 'rgba(255,255,255,0.06)',
    ...WEB({
      boxShadow: [
        '0 2px 16px rgba(0,0,0,0.32)',
        '0 1px 0 rgba(255,255,255,0.04) inset',
      ].join(', '),
    }),
  },

  /** UTILITY — Recruiter, Insights, Weekly Focus (recedes into bg) */
  utility: {
    backgroundColor: '#0f1220',
    borderColor: 'rgba(255,255,255,0.05)',
    ...WEB({
      boxShadow: '0 1px 8px rgba(0,0,0,0.24)',
    }),
  },
});
