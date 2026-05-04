/**
 * Student Portal — motion primitives (heavy animation level).
 *
 * Built on react-native-reanimated@~4.1 and moti@0.30 (already installed).
 *
 * Components exported:
 *   <FadeInView delay={n}>          fade + slide-up on mount
 *   <Stagger>...</Stagger>          children fade-in with stagger
 *   <PressScale>                    Pressable with spring scale 0.97 on press
 *   <AnimatedCounter value={n} />   tweened number with easing
 *   <ShimmerGradient colors={..}>   slow colour-cycle for hero auras
 *   <PulseDot />                    breathing live indicator
 *   <SparkIcon Icon={..} />         rotating shimmer glyph for "AI" markers
 */
import React, { useEffect, useRef } from 'react';
import { View, Pressable, Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, withSpring, withDelay, Easing, interpolate,
  runOnJS, useDerivedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLG = Animated.createAnimatedComponent(LinearGradient);

/* ─── FadeInView ───────────────────────────────────────────────────────── */
export function FadeInView({
  children, delay = 0, distance = 12, duration = 420, style,
}: { children: React.ReactNode; delay?: number; distance?: number; duration?: number; style?: ViewStyle }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) })); }, [delay, duration, v]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * distance }],
  }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

/* ─── Stagger ──────────────────────────────────────────────────────────── */
export function Stagger({
  children, gap = 70, baseDelay = 0, distance = 10, style,
}: { children: React.ReactNode; gap?: number; baseDelay?: number; distance?: number; style?: ViewStyle }) {
  const arr = React.Children.toArray(children);
  return (
    <View style={style}>
      {arr.map((c, i) => (
        <FadeInView key={i} delay={baseDelay + i * gap} distance={distance}>{c as any}</FadeInView>
      ))}
    </View>
  );
}

/* ─── PressScale (gesture-driven scale + ripple) ───────────────────────── */
export function PressScale({
  children, onPress, style, scaleTo = 0.97, hitSlop, disabled, testID,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ((s: { hovered?: boolean; pressed?: boolean }) => ViewStyle);
  scaleTo?: number;
  hitSlop?: number;
  disabled?: boolean;
  testID?: string;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={aStyle}>
      <Pressable
        testID={testID}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 14, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
        onPress={onPress}
        hitSlop={hitSlop}
        style={style as any}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ─── AnimatedCounter ──────────────────────────────────────────────────── */
export function AnimatedCounter({
  value, prefix = '', suffix = '', duration = 900, style, format,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  style?: TextStyle;
  format?: (n: number) => string;
}) {
  const sv = useSharedValue(0);
  const [display, setDisplay] = React.useState<string>(() => (format ? format(0) : `${prefix}0${suffix}`));
  useEffect(() => {
    sv.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, sv]);
  useDerivedValue(() => {
    const n = Math.round(sv.value);
    const out = format ? format(n) : `${prefix}${n.toLocaleString('en-IN')}${suffix}`;
    runOnJS(setDisplay)(out);
    return n;
  }, [sv]);
  return <Text style={style}>{display}</Text>;
}

/* ─── ShimmerGradient (slow hue-cycle for hero aura) ───────────────────── */
export function ShimmerGradient({
  colors, style, duration = 5800,
}: { colors: readonly string[]; style?: ViewStyle; duration?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [duration, t]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + t.value * 0.45,
    transform: [{ translateX: interpolate(t.value, [0, 1], [-12, 12]) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, aStyle, style]}>
      <LinearGradient
        colors={colors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/* ─── PulseDot (live breathing indicator) ──────────────────────────────── */
export function PulseDot({ size = 8, color = '#22C55E', style }: { size?: number; color?: string; style?: ViewStyle }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1, false);
  }, [v]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + v.value * 0.6 }],
    opacity: 1 - v.value * 0.55,
  }));
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      <Animated.View
        style={[
          { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          aStyle,
        ]}
      />
    </View>
  );
}

/* ─── SparkIcon — gentle 360° rotation for AI / sparkle glyphs ─────────── */
export function SparkIcon({
  Icon, size = 14, color = '#A78BFA', durationMs = 4200,
}: { Icon: React.ComponentType<{ size?: number; color?: string }>; size?: number; color?: string; durationMs?: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }), -1, true);
  }, [durationMs, v]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(v.value, [0, 1], [-15, 15])}deg` },
      { scale: 0.92 + v.value * 0.16 },
    ],
  }));
  return <Animated.View style={aStyle}><Icon size={size} color={color} /></Animated.View>;
}

/* ─── ParallaxCard (mild tilt on hover for web; static on native) ─────── */
export function ParallaxCard({
  children, intensity = 6, style,
}: { children: React.ReactNode; intensity?: number; style?: ViewStyle }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));
  if (Platform.OS !== 'web') {
    return <View style={style}>{children}</View>;
  }
  return (
    <Animated.View
      style={[aStyle, style]}
      // @ts-ignore — web-only event
      onMouseMove={(e: any) => {
        const r = (e.currentTarget as any).getBoundingClientRect?.();
        if (!r) return;
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tx.value = withTiming(px * intensity, { duration: 180 });
        ty.value = withTiming(py * intensity, { duration: 180 });
      }}
      // @ts-ignore
      onMouseLeave={() => { tx.value = withTiming(0); ty.value = withTiming(0); }}
    >
      {children}
    </Animated.View>
  );
}

/* ─── AnimatedRing (progress arc) — used for tier rings ────────────────── */
export function AnimatedRingFill({
  progress, height = 6, fillColors,
}: { progress: number; height?: number; fillColors: readonly [string, string] }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(progress, { duration: 1200, easing: Easing.out(Easing.cubic) }); }, [progress, v]);
  const aStyle = useAnimatedStyle(() => ({ width: `${Math.min(100, Math.max(0, v.value))}%` as any }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <AnimatedLG
        colors={fillColors as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[{ height: '100%', borderRadius: height / 2 }, aStyle]}
      />
    </View>
  );
}

/* ─── Re-export the animated LinearGradient for ad-hoc usage ──────────── */
export { AnimatedLG };
