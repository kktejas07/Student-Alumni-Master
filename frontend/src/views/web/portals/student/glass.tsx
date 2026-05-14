/**
 * Student Portal — Glass-morphism primitives (Dashboard preview).
 *
 * Two main exports:
 *   • <Aurora />     — absolutely-positioned blurred purple blobs that
 *                      sit BEHIND the dashboard content and provide the
 *                      colour for the frosted glass to refract.
 *   • <GlassSurface />— a frosted-glass wrapper. On web it uses CSS
 *                       `backdrop-filter: blur(…)`; on native iOS/Android
 *                       it falls back to expo-blur's <BlurView>.
 *   • glassStyle()   — utility returning the {bg, border, shadow} block
 *                       that can be spread on existing styled views to
 *                       glass-ify them without restructuring JSX.
 *
 * Visual recipe (v0.17.0):
 *   - Surface fill:        rgba(20,16,33,0.55)
 *   - Hairline border:     rgba(167,139,250,0.22)
 *   - Inner highlight 1px: rgba(255,255,255,0.08) (top edge)
 *   - Drop shadow:         0 12px 40px rgba(95,37,159,0.18)
 *   - Backdrop blur:       20-24px (web) / "dark" intensity 30 (native)
 */
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { SC } from './tokens';

/* ─────────────────────────────────────────────────────────────────
 * Aurora — background blob layer (purely decorative)
 * ───────────────────────────────────────────────────────────────── */
export function Aurora({ intensity = 'normal' }: { intensity?: 'subtle' | 'normal' | 'strong' }) {
  // Three soft circular blobs in lavender / magenta / electric purple.
  // `pointerEvents="none"` so they never intercept taps.
  const opacityMul = intensity === 'subtle' ? 0.55 : intensity === 'strong' ? 1.4 : 1.0;

  // On web we use real CSS radial-gradient backgrounds for ultra-smooth
  // blobs without rasterising big alpha PNGs. On native we approximate
  // with three highly-blurred translucent circles.
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          a.layer,
          {
            // @ts-expect-error web-only
            backgroundImage:
              'radial-gradient(900px 720px at 12% 6%,  rgba(167,139,250,' + (0.55 * opacityMul) + ') 0%, rgba(167,139,250,0) 60%),' +
              'radial-gradient(900px 720px at 95% 10%, rgba(236, 72,153,' + (0.40 * opacityMul) + ') 0%, rgba(236, 72,153,0) 65%),' +
              'radial-gradient(1100px 900px at 60% 110%, rgba(123, 61,191,' + (0.58 * opacityMul) + ') 0%, rgba(123, 61,191,0) 70%)',
          },
        ]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={a.layer}>
      <View style={[a.blob, { top: 0,    left: 0,    width: 620, height: 620,
                              backgroundColor: `rgba(167,139,250,${0.50 * opacityMul})` }]} />
      <View style={[a.blob, { top: 0,    right: 0,   width: 580, height: 580,
                              backgroundColor: `rgba(236,72,153,${0.38 * opacityMul})` }]} />
      <View style={[a.blob, { bottom: 0, left: '15%', width: 760, height: 760,
                              backgroundColor: `rgba(123,61,191,${0.55 * opacityMul})` }]} />
    </View>
  );
}

const a = StyleSheet.create({
  layer: {
    position: 'absolute',
    inset: 0 as any,
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    // 80px blur on native — heavy but fine on a static layer
    ...(Platform.OS !== 'web' ? { opacity: 0.9 } : {}),
    // @ts-expect-error filter is web-only
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
  },
});

/* ─────────────────────────────────────────────────────────────────
 * GlassSurface — frosted glass container
 * ───────────────────────────────────────────────────────────────── */
export function GlassSurface({
  children, style, strong, blurAmount = 22, radius = 14,
}: {
  children: React.ReactNode;
  style?: any;
  strong?: boolean;          // stronger fill for higher legibility
  blurAmount?: number;       // web blur in px
  radius?: number;
}) {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          {
            backgroundColor: strong ? SC.glassBgStrong : SC.glassBg,
            borderWidth: 1,
            borderColor: SC.glassBorder,
            borderRadius: radius,
            // @ts-expect-error web-only
            backdropFilter: `blur(${blurAmount}px) saturate(140%)`,
            WebkitBackdropFilter: `blur(${blurAmount}px) saturate(140%)`,
            boxShadow: SC.glassShadow,
          },
          style,
        ]}
      >
        {/* 1px inner top-highlight — gives the "glass edge" sparkle */}
        <View pointerEvents="none" style={[gs.highlight, { borderRadius: radius }]} />
        {children}
      </View>
    );
  }

  // Native — use BlurView. Dark tint to keep purple aesthetic.
  return (
    <BlurView
      intensity={strong ? 45 : 30}
      tint="dark"
      style={[
        {
          borderWidth: 1,
          borderColor: SC.glassBorder,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: strong ? SC.glassBgStrong : SC.glassBg,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={[gs.highlight, { borderRadius: radius }]} />
      {children}
    </BlurView>
  );
}

const gs = StyleSheet.create({
  highlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

/* ─────────────────────────────────────────────────────────────────
 * glassStyle — utility for views that want to glass-ify their
 *              existing card shells without restructuring JSX.
 *
 *  Usage:
 *    <View style={[s.briefRow, glassStyle()]}>
 * ───────────────────────────────────────────────────────────────── */
export function glassStyle(opts: { strong?: boolean; blur?: number } = {}) {
  const { strong = false, blur = 22 } = opts;
  if (Platform.OS === 'web') {
    return {
      backgroundColor: strong ? SC.glassBgStrong : SC.glassBg,
      borderColor: SC.glassBorder,
      // @ts-expect-error web-only
      backdropFilter: `blur(${blur}px) saturate(140%)`,
      WebkitBackdropFilter: `blur(${blur}px) saturate(140%)`,
      boxShadow: SC.glassShadow,
    } as any;
  }
  return {
    backgroundColor: strong ? SC.glassBgStrong : SC.glassBg,
    borderColor: SC.glassBorder,
  } as any;
}
