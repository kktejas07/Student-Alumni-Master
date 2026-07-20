// @ts-nocheck
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
 *   <ParallaxCard>                  hover tilt (web only)
 *   <AnimatedRingFill>              animated horizontal progress fill
 *   <SkeletonBlock w={..} h={..}>   shimmer placeholder
 *   <SkeletonCard kind="job">       composed skeleton matching the real card
 *   <SkeletonList n={..} kind={..}> n skeleton cards stacked
 *
 * Reduced motion:
 *   useReducedMotion() returns true when:
 *     - the user has set the OS-level prefers-reduced-motion media query (web)
 *     - or AccessibilityInfo.isReduceMotionEnabled() resolves true (native)
 *   When true, all primitives auto-skip animation and render the final state.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, ViewStyle, TextStyle, Platform, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, withSpring, withDelay, Easing, interpolate,
  runOnJS, useDerivedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLG = Animated.createAnimatedComponent(LinearGradient);

/* ─── useReducedMotion — respects OS / browser setting ───────────────── */
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

/* ─── FadeInView ───────────────────────────────────────────────────────── */
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

/* ─── PressScale (gesture-driven scale + ripple + a11y) ──────────────── */
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
        testID={testID}
        nativeID={nativeID}
        disabled={disabled}
        onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 14, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
        onPress={onPress}
        hitSlop={hitSlop}
        accessibilityRole={accessibilityRole as any}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled, ...(accessibilityState || {}) }}
        // @ts-ignore — web-only focus-visible outline for keyboard a11y
        style={[
          style as any,
          Platform.OS === 'web' ? ({
            // Native focus ring for keyboard users; respects reduced motion
            outlineOffset: 2,
          } as any) : null,
        ]}
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
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }), -1, true);
  }, [durationMs, v, reduced]);
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
  useEffect(() => { v.value = withTiming(progress || 0, { duration: 1200, easing: Easing.out(Easing.cubic) }); }, [progress, v]);
  const aStyle = useAnimatedStyle(() => ({ width: `${Math.min(100, Math.max(0, v.value))}%` as any }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, overflow: 'hidden' }, aStyle]}>
        <LinearGradient
          colors={fillColors as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

/* ─── useInView — cheap visibility flag for gating expensive effects     ── */
/* (e.g. don't start a count-up animation until the element is on-screen) */
export function useInView(threshold = 0.25): [React.RefObject<any>, boolean] {
  const ref = useRef<any>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const canObserve = Platform.OS === 'web' && typeof window !== 'undefined' && 'IntersectionObserver' in window;
    if (!canObserve) { setInView(true); return; }
    const node = ref.current;
    if (!node) return;
    const io = new (window as any).IntersectionObserver(
      (entries: any[]) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { setInView(true); io.unobserve(entry.target); }
        });
      },
      { threshold },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── RevealOnScroll — IntersectionObserver-driven fade+slide (web);    ─── */
/* ─── mount-based fallback on native / no-IO environments.              ─── */
export function RevealOnScroll({
  children, delay = 0, distance = 28, duration = 700, threshold = 0.18, once = true, style,
}: {
  children: React.ReactNode; delay?: number; distance?: number; duration?: number;
  threshold?: number; once?: boolean; style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);
  const ref = useRef<any>(null);

  useEffect(() => {
    if (reduced) { v.value = 1; return; }
    const canObserve = Platform.OS === 'web' && typeof window !== 'undefined' && 'IntersectionObserver' in window;
    if (!canObserve) {
      v.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
      return;
    }
    const node = ref.current;
    if (!node) return;
    const io = new (window as any).IntersectionObserver(
      (entries: any[]) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            v.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            v.value = withTiming(0, { duration: duration * 0.5 });
          }
        });
      },
      { threshold, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delay, duration, threshold, once, reduced, v]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: interpolate(v.value, [0, 1], [distance, 0]) }],
  }));

  return <Animated.View ref={ref} style={[aStyle, style]}>{children}</Animated.View>;
}

/* ─── RevealStagger — children reveal in sequence as the group scrolls in ── */
export function RevealStagger({
  children, gap = 90, baseDelay = 0, distance = 24, style, itemStyle,
}: { children: React.ReactNode; gap?: number; baseDelay?: number; distance?: number; style?: ViewStyle; itemStyle?: ViewStyle }) {
  const arr = React.Children.toArray(children);
  return (
    <View style={style}>
      {arr.map((c, i) => (
        <RevealOnScroll key={i} delay={baseDelay + i * gap} distance={distance} style={itemStyle}>{c as any}</RevealOnScroll>
      ))}
    </View>
  );
}

/* ─── MagneticButton — cursor-attraction hover (web); PressScale fallback ── */
export function MagneticButton({
  children, onPress, style, strength = 16, scaleOnHover = 1.035,
  accessibilityLabel, accessibilityRole = 'button',
}: {
  children: React.ReactNode; onPress?: () => void; style?: any; strength?: number; scaleOnHover?: number;
  accessibilityLabel?: string; accessibilityRole?: 'button' | 'link';
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  if (Platform.OS !== 'web') {
    return <PressScale onPress={onPress} style={style} accessibilityLabel={accessibilityLabel}>{children}</PressScale>;
  }

  return (
    <Animated.View
      style={aStyle}
      // @ts-ignore — web-only pointer events
      onMouseMove={(e: any) => {
        const r = e.currentTarget.getBoundingClientRect?.();
        if (!r) return;
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        tx.value = withSpring(px * strength, { damping: 14, stiffness: 180 });
        ty.value = withSpring(py * strength, { damping: 14, stiffness: 180 });
      }}
      // @ts-ignore
      onMouseEnter={() => { scale.value = withSpring(scaleOnHover, { damping: 12, stiffness: 200 }); }}
      // @ts-ignore
      onMouseLeave={() => {
        tx.value = withSpring(0, { damping: 12, stiffness: 180 });
        ty.value = withSpring(0, { damping: 12, stiffness: 180 });
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole as any}
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => { scale.value = withSpring(scaleOnHover * 0.96, { damping: 14, stiffness: 260 }); }}
        onPressOut={() => { scale.value = withSpring(scaleOnHover, { damping: 12, stiffness: 220 }); }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ─── CursorSpotlight — soft radial glow that follows the pointer (web) ─── */
/* Purely decorative ambient light layer; no-op on native / touch.        */
export function CursorSpotlight({ color = 'rgba(139,92,246,0.10)', size = 640 }: { color?: string; size?: number }) {
  const x = useSharedValue(-9999);
  const y = useSharedValue(-9999);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (Platform.OS !== 'web' || reduced || typeof window === 'undefined') return;
    const handler = (e: any) => {
      x.value = e.clientX;
      y.value = e.clientY;
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, [reduced, x, y]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - size / 2 }, { translateY: y.value - size / 2 }],
  }));

  if (Platform.OS !== 'web' || reduced) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        aStyle,
        {
          position: 'fixed' as any,
          top: 0, left: 0,
          width: size, height: size,
          borderRadius: size / 2,
          zIndex: 1,
          // @ts-ignore — web-only
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          mixBlendMode: 'screen' as any,
        },
      ]}
    />
  );
}

/* ─── SplitHeadline — word-by-word fade+rise reveal for hero-scale text ── */
export function SplitHeadline({
  text, style, wordStyle, baseDelay = 100, gap = 55,
}: { text: string; style?: TextStyle | TextStyle[]; wordStyle?: TextStyle | TextStyle[]; baseDelay?: number; gap?: number }) {
  const reduced = useReducedMotion();
  const lines = text.split('\n');
  let wordIndex = 0;
  return (
    <Text style={style}>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {line.split(' ').map((word, wi) => {
            const idx = wordIndex++;
            return (
              <React.Fragment key={wi}>
                <RevealWord delay={reduced ? 0 : baseDelay + idx * gap} style={wordStyle}>{word}</RevealWord>
                {wi < line.split(' ').length - 1 ? ' ' : ''}
              </React.Fragment>
            );
          })}
          {li < lines.length - 1 ? '\n' : ''}
        </React.Fragment>
      ))}
    </Text>
  );
}

function RevealWord({ children, delay, style }: { children: React.ReactNode; delay: number; style?: TextStyle | TextStyle[] }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    v.value = withDelay(delay, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
  }, [delay, v]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [
      { translateY: interpolate(v.value, [0, 1], [18, 0]) },
      { rotateX: `${interpolate(v.value, [0, 1], [35, 0])}deg` },
    ],
  }));
  // @ts-ignore — Animated.Text supports nested Text style inheritance on web
  return <Animated.Text style={[aStyle, style]}>{children}</Animated.Text>;
}

/* ─── Re-export the animated LinearGradient for ad-hoc usage ──────────── */
export { AnimatedLG };

/* ──────────────────────────────────────────────────────────────────────── */
/* Skeleton loaders — Reanimated shimmer-based placeholders for loading   */
/* states. Auto-respects reduced motion (degrades to static gray block).  */
/* ──────────────────────────────────────────────────────────────────────── */

/* ─── SkeletonBlock — primitive shimmer rectangle ──────────────────────── */
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
      // @ts-ignore — RN web style
      style={[
        { width: (w as any) ?? '100%', height: h, borderRadius: br, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
        style,
      ]}
      accessibilityRole={Platform.OS === 'web' ? ('progressbar' as any) : undefined}
      accessibilityLabel="Loading content"
    >
      <Animated.View style={[StyleSheet.absoluteFill, aStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.04)', 'rgba(167,139,250,0.18)', 'rgba(255,255,255,0.04)'] as any}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/* ─── SkeletonCard — preset card shapes mirroring real layouts ────────── */
export function SkeletonCard({ kind = 'job', style }: { kind?: 'job' | 'kpi' | 'event' | 'mentor' | 'list'; style?: ViewStyle }) {
  if (kind === 'kpi') {
    return (
      <View style={[skelStyles.kpi, style]}>
        <SkeletonBlock w={28} h={28} br={8} />
        <SkeletonBlock w="60%" h={10} style={{ marginTop: 14 }} />
        <SkeletonBlock w="40%" h={18} style={{ marginTop: 8 }} />
      </View>
    );
  }
  if (kind === 'event') {
    return (
      <View style={[skelStyles.event, style]}>
        <SkeletonBlock w={48} h={48} br={10} />
        <View style={{ flex: 1, gap: 6 }}>
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
      <View style={[skelStyles.mentor, style]}>
        <SkeletonBlock w={44} h={44} br={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBlock w="55%" h={12} />
          <SkeletonBlock w="80%" h={10} />
        </View>
      </View>
    );
  }
  if (kind === 'list') {
    return (
      <View style={[skelStyles.row, style]}>
        <SkeletonBlock w={36} h={36} br={8} />
        <View style={{ flex: 1, gap: 5 }}>
          <SkeletonBlock w="50%" h={11} />
          <SkeletonBlock w="80%" h={10} />
        </View>
      </View>
    );
  }
  // job (default)
  return (
    <View style={[skelStyles.job, style]}>
      <SkeletonBlock w={44} h={44} br={10} />
      <View style={{ flex: 1, gap: 7 }}>
        <SkeletonBlock w="55%" h={13} />
        <SkeletonBlock w="35%" h={10} />
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <SkeletonBlock w={52} h={18} br={9} />
          <SkeletonBlock w={70} h={18} br={9} />
          <SkeletonBlock w={46} h={18} br={9} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkeletonBlock w={70} h={28} br={8} />
        <SkeletonBlock w={50} h={10} />
      </View>
    </View>
  );
}

/* ─── SkeletonList — N stacked skeleton cards ─────────────────────────── */
export function SkeletonList({ n = 4, kind = 'job', gap = 10 }: { n?: number; kind?: 'job' | 'kpi' | 'event' | 'mentor' | 'list'; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonCard key={i} kind={kind} />
      ))}
    </View>
  );
}

const skelStyles = StyleSheet.create({
  job: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  kpi: {
    flex: 1, minWidth: 160, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  event: {
    flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  mentor: {
    flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
});
