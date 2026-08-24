/**
 * GlassCard — Material You-inspired gradient + glass surface.
 *
 * Renders children inside a soft tint gradient with subtle inner highlight,
 * matching the look used across Mentor + Alumni portals. Pass `tint` as the
 * portal's primary color and the surface auto-tones the gradient + ring.
 *
 * Usage:
 *   <GlassCard tint="#A78BFA" intensity="md">
 *     ...children...
 *   </GlassCard>
 */
import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Intensity = 'sm' | 'md' | 'lg';

interface Props {
  tint?: string;             // e.g. '#A78BFA' (purple), '#14B8A6' (teal), '#F97316'
  intensity?: Intensity;     // controls gradient + glow strength
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  borderRadius?: number;
}

function rgba(hex: string, a: number): string {
  // Accept #RRGGBB or rgba(...)
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function GlassCard({
  tint = '#A78BFA',
  intensity = 'md',
  children,
  style,
  contentStyle,
  testID,
  borderRadius = 16,
}: Props) {
  const cfg = {
    sm: { gradA: 0.06, gradB: 0.02, ring: 0.18, glow: 0.10 },
    md: { gradA: 0.10, gradB: 0.03, ring: 0.28, glow: 0.18 },
    lg: { gradA: 0.16, gradB: 0.05, ring: 0.36, glow: 0.30 },
  }[intensity];

  const elevation = Platform.OS === 'web'
    ? ({ boxShadow: `0 4px 24px -4px ${rgba(tint, cfg.glow)}, inset 0 1px 0 ${rgba('#FFFFFF', 0.06)}` } as any)
    : ({
        shadowColor: tint, shadowOpacity: cfg.glow, shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 }, elevation: 4,
      });

  return (
    <View testID={testID} style={[{ borderRadius, overflow: 'hidden' }, elevation, style]}>
      {/* Base dark surface */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(13,16,24,0.92)' }]} />
      {/* Tint gradient — diagonal */}
      <LinearGradient
        colors={[rgba(tint, cfg.gradA), rgba(tint, cfg.gradB), 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Soft top-edge highlight (glass top sheen) */}
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { height: '40%' as any }]}
      />
      {/* Tinted ring border */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius, borderWidth: 1, borderColor: rgba(tint, cfg.ring) },
        ]}
      />
      <View style={[{ padding: 18 }, contentStyle]}>{children}</View>
    </View>
  );
}
