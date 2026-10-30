/**
 * MetricCard.tsx
 * KPI card used in the 5-card strip under the Hero section.
 * Displays: icon box, label, large value, subText / trend badge, soft bottom border.
 * Matches Image 1 reference design.
 */
import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import {
  COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING,
} from '@/src/lib/designTokens';
import { useTheme } from '@/src/theme/ThemeContext';

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
  const { isDark } = useTheme();
  const s = useMemo(() => makeStyles(isDark), [isDark]);
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
          <Text style={[s.value, { color: isDark ? '#FFF' : '#0F172A' }]}>
            {value}
            {unit ? <Text style={[s.unit, { color: isDark ? COLORS.text2 : 'rgba(15, 23, 42, 0.6)' }]}>{unit}</Text> : null}
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
            <Text style={[s.hint, { color: isDark ? COLORS.textSub : 'rgba(71, 85, 105, 0.8)' }]} numberOfLines={1}>{hintText}</Text>
          ) : null}
        </View>
      </View>

      {/* Subtle bottom border accent line */}
      <View style={[s.accentLine, { backgroundColor: color + '50' }]} />
    </Container>
  );
});

const makeCardShadow = (dark: boolean) => Platform.OS === 'web'
  ? ({
      boxShadow: dark
        ? '0 4px 20px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset'
        : '0 4px 20px rgba(15,23,42,0.08)',
      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'default',
    } as any)
  : {};

const makeCardHoverShadow = (dark: boolean) => Platform.OS === 'web'
  ? ({
      boxShadow: dark
        ? '0 8px 30px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.10) inset'
        : '0 8px 30px rgba(15,23,42,0.12)',
      transform: 'translateY(-2px)',
      cursor: 'pointer',
    } as any)
  : {};

const makeStyles = (dark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: dark ? '#0A0A2A' : '#FFFFFF',
    borderColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    minHeight: 120,
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'space-between',
    ...makeCardShadow(dark),
  },
  cardHover: {
    backgroundColor: dark ? 'rgba(26, 30, 50, 0.90)' : 'rgba(241, 245, 249, 0.90)',
    borderColor: dark ? 'rgba(129, 140, 248, 0.30)' : 'rgba(99, 102, 241, 0.30)',
    ...makeCardHoverShadow(dark),
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
    color: dark ? 'rgba(238,240,255,0.65)' : 'rgba(71,85,105,0.85)',
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
