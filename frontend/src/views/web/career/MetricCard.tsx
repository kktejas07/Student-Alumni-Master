/**
 * MetricCard.tsx
 * KPI card used in the 5-card strip under the Hero section.
 * Displays: icon box, label, large value, subText / trend badge, soft bottom border.
 * Matches Image 1 reference design.
 */
import React, { memo } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import {
  COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING, ELEVATION,
} from '@/src/lib/designTokens';

interface Props {
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  barValue?: number;
  subText: string;
  hintText?: string;
  trendText?: string;
  trendPositive?: boolean;
  onPress?: () => void;
  style?: any;
  iconElement?: React.ReactNode;
}

export const MetricCard = memo(function MetricCard({
  label, value, unit, color, subText, hintText, trendText, trendPositive = true,
  onPress, iconElement, style,
}: Props) {
  const Container: any = onPress ? Pressable : View;
  const containerProps = onPress
    ? {
        accessibilityRole: 'button' as const,
        onPress,
        style: ({ pressed, hovered }: any) => [
          s.card, style,
          (pressed || hovered) && s.cardHover,
        ],
      }
    : { style: [s.card, style] };

  return (
    <Container {...containerProps}>
      <View style={s.body}>
        {/* Top row: icon box + label */}
        <View style={s.topRow}>
          <View style={[s.iconBox, { backgroundColor: color + '1A', borderColor: color + '33' }]}>
            {iconElement ?? <View style={[s.colorDot, { backgroundColor: color }]} />}
          </View>
          <Text style={s.label} numberOfLines={1}>{label}</Text>
        </View>

        {/* Value */}
        <View style={s.valueRow}>
          <Text style={[s.value, { color: '#FFF' }]}>
            {value}
            {unit ? <Text style={[s.unit, { color: COLORS.text2 }]}>{unit}</Text> : null}
          </Text>
        </View>

        {/* SubText / Trend */}
        <View style={s.subRow}>
          {trendText ? (
            <Text style={[s.trend, { color: trendPositive ? COLORS.green : COLORS.red }]}>
              {trendText}
            </Text>
          ) : (
            <Text style={[s.sub, { color }]} numberOfLines={1}>{subText}</Text>
          )}
          {hintText && !trendText ? (
            <Text style={[s.hint, { color: COLORS.textSub }]} numberOfLines={1}>{hintText}</Text>
          ) : null}
        </View>
      </View>

      {/* Subtle bottom border accent line */}
      <View style={[s.accentLine, { backgroundColor: color + '50' }]} />
    </Container>
  );
});

const CARD_SHADOW = Platform.OS === 'web'
  ? ({
      boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset',
      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'default',
    } as any)
  : {};

const CARD_HOVER_SHADOW = Platform.OS === 'web'
  ? ({
      boxShadow: '0 8px 30px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.10) inset',
      transform: 'translateY(-2px)',
      cursor: 'pointer',
    } as any)
  : {};

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(18, 22, 35, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    minHeight: 120,
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'space-between',
    ...CARD_SHADOW,
  },
  cardHover: {
    backgroundColor: 'rgba(26, 30, 50, 0.90)',
    borderColor: 'rgba(129, 140, 248, 0.30)',
    ...CARD_HOVER_SHADOW,
  },
  body: {
    padding: SPACING.md,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.chip,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  label: {
    color: 'rgba(238,240,255,0.65)',
    fontFamily: FONT_FAMILIES.bold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as any,
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontFamily: FONT_FAMILIES.xbold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  unit: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 16,
    letterSpacing: 0,
    marginLeft: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sub: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 12,
  },
  hint: {
    fontFamily: FONT_FAMILIES.med,
    fontSize: 11,
  },
  trend: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 12,
  },
  accentLine: {
    height: 2,
    width: '100%',
    opacity: 0.6,
  },
});
