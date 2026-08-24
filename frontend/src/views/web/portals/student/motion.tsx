// @ts-nocheck
/**
 * Student Portal — motion primitives. Migrated to NativeWind className.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, ViewStyle, TextStyle, Platform, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, withSpring, withDelay, Easing, interpolate,
  runOnJS, useDerivedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLG = Animated.createAnimatedComponent(LinearGradient);

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);
  useEffect(() => {
    let mounted = true;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).matchMedia) {
      const mq = (window as any).matchMedia('(prefers-reduced-motion: reduce)');
      const handler = () => { if (mounted) setReduced(!!mq.matches); };
      handler();
      mq.addEventListener?.('change', handler);
      return () => { mounted = false; mq.removeEventListener?.('change', handler); };
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduced(!!v); }).catch(() => {});
      const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: any) => { if (mounted) setReduced(!!v); });
      return () => { mounted = false; (sub as any)?.remove?.(); };
    }
  }, []);
  return reduced;
}

export function FadeInView({
  children, delay = 0, distance = 12, duration = 420, style,
}: { children: React.ReactNode; delay?: number; distance?: number; duration?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) { v.value = 1; return; }
    v.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [delay, duration, v, reduced]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * distance }],
  }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

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

export function PressScale({
  children, onPress, style, scaleTo = 0.97, hitSlop, disabled, testID, nativeID,
  accessibilityLabel, accessibilityHint, accessibilityRole = 'button',
  accessibilityState,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ((s: { hovered?: boolean; pressed?: boolean }) => ViewStyle);
  scaleTo?: number;
  hitSlop?: number;
  disabled?: boolean;
  testID?: string;
  nativeID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab' | 'switch' | 'header' | 'image';
  accessibilityState?: { selected?: boolean; disabled?: boolean; expanded?: boolean; checked?: boolean };
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={aStyle}>
      <Pressable
        testID={testID} nativeID={nativeID} disabled={disabled}
        onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 14, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
        onPress={onPress} hitSlop={hitSlop}
        accessibilityRole={accessibilityRole as any}
        accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled, ...(accessibilityState || {}) }}
        style={[style as any, Platform.OS === 'web' ? { outlineOffset: 2 } : undefined]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function AnimatedCounter({
  value, prefix = '', suffix = '', duration = 900, style, format,
}: {
  value: number; prefix?: string; suffix?: string; duration?: number; style?: TextStyle; format?: (n: number) => string;
}) {
  const sv = useSharedValue(0);
  const [display, setDisplay] = React.useState<string>(() => (format ? format(0) : `${prefix}0${suffix}`));
  useEffect(() => { sv.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) }); }, [value, duration, sv]);
  useDerivedValue(() => {
    const n = Math.round(sv.value);
    const out = format ? format(n) : `${prefix}${n.toLocaleString('en-IN')}${suffix}`;
    runOnJS(setDisplay)(out);
    return n;
  }, [sv]);
  return <Text style={style}>{display}</Text>;
}

export function ShimmerGradient({
  colors, style, duration = 5800,
}: { colors: readonly string[]; style?: ViewStyle; duration?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) { t.value = 0.5; return; }
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [duration, t, reduced]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + t.value * 0.45,
    transform: [{ translateX: interpolate(t.value, [0, 1], [-12, 12]) }],
  }));
  return (
    <Animated.View pointerEvents="none" className="absolute inset-0" style={[aStyle, style]}>
      <LinearGradient colors={colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="absolute inset-0" />
    </Animated.View>
  );
}

export function PulseDot({ size = 8, color = '#22C55E', style }: { size?: number; color?: string; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1, false);
  }, [v, reduced]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + v.value * 0.6 }],
    opacity: 1 - v.value * 0.55,
  }));
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View className="absolute" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
      <Animated.View className="absolute" style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, aStyle]} />
    </View>
  );
}

export function SparkIcon({
  Icon, size = 14, color = '#A78BFA', durationMs = 4200,
}: { Icon: React.ComponentType<{ size?: number; color?: string }>; size?: number; color?: string; durationMs?: number }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }), -1, true);
  }, [durationMs, v, reduced]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(v.value, [0, 1], [-15, 15])}deg` }, { scale: 0.92 + v.value * 0.16 }],
  }));
  return <Animated.View style={aStyle}><Icon size={size} color={color} /></Animated.View>;
}

export function ParallaxCard({
  children, intensity = 6, style,
}: { children: React.ReactNode; intensity?: number; style?: ViewStyle }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));
  if (Platform.OS !== 'web') return <View style={style}>{children}</View>;
  return (
    <Animated.View
      style={[aStyle, style]}
      onMouseMove={(e: any) => {
        const r = (e.currentTarget as any).getBoundingClientRect?.();
        if (!r) return;
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tx.value = withTiming(px * intensity, { duration: 180 });
        ty.value = withTiming(py * intensity, { duration: 180 });
      }}
      onMouseLeave={() => { tx.value = withTiming(0); ty.value = withTiming(0); }}
    >
      {children}
    </Animated.View>
  );
}

export function AnimatedRingFill({
  progress, height = 6, fillColors,
}: { progress: number; height?: number; fillColors: readonly [string, string] }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(progress || 0, { duration: 1200, easing: Easing.out(Easing.cubic) }); }, [progress, v]);
  const aStyle = useAnimatedStyle(() => ({ width: `${Math.min(100, Math.max(0, v.value))}%` as any }));
  return (
    <View className="overflow-hidden" style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <Animated.View className="h-full overflow-hidden" style={[{ borderRadius: height / 2 }, aStyle]}>
        <LinearGradient colors={fillColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="h-full w-full" />
      </Animated.View>
    </View>
  );
}

export { AnimatedLG };

/* ─── Skeleton loaders (NativeWind) ──────────────────────────────────── */
export function SkeletonBlock({
  w, h = 14, br = 6, style,
}: { w?: number | string; h?: number; br?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }), -1, true);
  }, [v, reduced]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + v.value * 0.35,
    transform: [{ translateX: interpolate(v.value, [0, 1], [-8, 8]) }],
  }));
  return (
    <View
      className="overflow-hidden bg-white/[0.05]"
      style={[{ width: (w as any) ?? '100%', height: h, borderRadius: br }, style]}
      accessibilityRole={Platform.OS === 'web' ? ('progressbar' as any) : undefined}
      accessibilityLabel="Loading content"
    >
      <Animated.View className="absolute inset-0" style={aStyle}>
        <LinearGradient
          colors={['rgba(255,255,255,0.04)', 'rgba(167,139,250,0.18)', 'rgba(255,255,255,0.04)'] as any}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          className="absolute inset-0"
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonCard({ kind = 'job', style }: { kind?: 'job' | 'kpi' | 'event' | 'mentor' | 'list'; style?: ViewStyle }) {
  const base = "bg-white/[0.025] border border-white/[0.06]";
  if (kind === 'kpi') {
    return (
      <View className={`flex-1 min-w-[160px] p-3.5 rounded-[14px] ${base}`} style={style}>
        <SkeletonBlock w={28} h={28} br={8} />
        <SkeletonBlock w="60%" h={10} style={{ marginTop: 14 }} />
        <SkeletonBlock w="40%" h={18} style={{ marginTop: 8 }} />
      </View>
    );
  }
  if (kind === 'event') {
    return (
      <View className={`flex-row gap-3 items-center p-3 rounded-xl ${base}`} style={style}>
        <SkeletonBlock w={48} h={48} br={10} />
        <View className="flex-1 gap-1.5">
          <SkeletonBlock w="70%" h={12} />
          <SkeletonBlock w="40%" h={10} />
          <SkeletonBlock w="55%" h={10} />
        </View>
        <SkeletonBlock w={70} h={28} br={8} />
      </View>
    );
  }
  if (kind === 'mentor') {
    return (
      <View className={`flex-row gap-2.5 items-center p-2.5 rounded-[10px] ${base}`} style={style}>
        <SkeletonBlock w={44} h={44} br={22} />
        <View className="flex-1 gap-1.5">
          <SkeletonBlock w="55%" h={12} />
          <SkeletonBlock w="80%" h={10} />
        </View>
      </View>
    );
  }
  if (kind === 'list') {
    return (
      <View className={`flex-row gap-2.5 items-center p-2.5 rounded-[10px] ${base}`} style={style}>
        <SkeletonBlock w={36} h={36} br={8} />
        <View className="flex-1 gap-[5px]">
          <SkeletonBlock w="50%" h={11} />
          <SkeletonBlock w="80%" h={10} />
        </View>
      </View>
    );
  }
  return (
    <View className={`flex-row gap-3 p-3.5 rounded-xl ${base}`} style={style}>
      <SkeletonBlock w={44} h={44} br={10} />
      <View className="flex-1 gap-[7px]">
        <SkeletonBlock w="55%" h={13} />
        <SkeletonBlock w="35%" h={10} />
        <View className="flex-row gap-1.5 mt-1">
          <SkeletonBlock w={52} h={18} br={9} />
          <SkeletonBlock w={70} h={18} br={9} />
          <SkeletonBlock w={46} h={18} br={9} />
        </View>
      </View>
      <View className="items-end gap-1.5">
        <SkeletonBlock w={70} h={28} br={8} />
        <SkeletonBlock w={50} h={10} />
      </View>
    </View>
  );
}

export function SkeletonList({ n = 4, kind = 'job', gap = 10 }: { n?: number; kind?: 'job' | 'kpi' | 'event' | 'mentor' | 'list'; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonCard key={i} kind={kind} />
      ))}
    </View>
  );
}
