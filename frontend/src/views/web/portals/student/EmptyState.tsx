/**
 * Student Portal — Lottie-style empty states + success burst.
 *
 * Pure-RN illustrations animated with react-native-reanimated (no Lottie
 * native dep needed). Each variant has a unique looping micro-animation:
 *
 *   savedJobs    → bookmark drops in & glows; floating sparkles around
 *   bookings     → calendar tilts left/right; clock hand spins
 *   applications → paper plane drifts diagonally; trail dots pulse
 *   workshops    → graduation cap bobs; confetti pieces fall
 *   network      → ring of avatars rotates around centre dot
 *   generic      → soft sparkle burst (default)
 *
 * Plus SuccessBurst — full-screen confetti pop on action completion.
 *
 * Usage:
 *   <EmptyState variant="savedJobs"
 *               title="No saved jobs yet"
 *               body="Bookmark roles you love to revisit them later."
 *               cta={{ label: "Browse jobs", onPress: () => setFilter('All') }} />
 *
 *   <SuccessBurst visible={saved} onHide={() => setSaved(false)} />
 *
 * Accessibility:
 *   - Sets accessibilityRole="image" with descriptive label
 *   - Decorative dots/sparkles are aria-hidden equivalents
 *   - CTA wrapped in PressScale with accessibilityRole="button"
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, withDelay, Easing, interpolate,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { SC, FONTS } from './tokens';
import { GRADS } from './gradients';
import { LinearGradient } from 'expo-linear-gradient';
import { PressScale } from './motion';
import {
  Bookmark, Calendar, FileText, GraduationCap, Users, Sparkles,
} from './iconShims';

type Variant = 'savedJobs' | 'bookings' | 'applications' | 'workshops' | 'network' | 'generic';

const VARIANT_META: Record<Variant, { label: string; tint: string; tintSoft: string; Icon: any }> = {
  savedJobs:    { label: 'No saved jobs',    tint: '#A78BFA', tintSoft: 'rgba(167,139,250,0.18)', Icon: Bookmark },
  bookings:     { label: 'No bookings yet',  tint: '#22D3EE', tintSoft: 'rgba(34,211,238,0.15)',  Icon: Calendar },
  applications: { label: 'No applications',  tint: '#F59E0B', tintSoft: 'rgba(245,158,11,0.15)',  Icon: FileText },
  workshops:    { label: 'No workshops',     tint: '#EC4899', tintSoft: 'rgba(236,72,153,0.15)',  Icon: GraduationCap },
  network:      { label: 'Network is empty', tint: '#34D399', tintSoft: 'rgba(52,211,153,0.15)',  Icon: Users },
  generic:      { label: 'Nothing here yet', tint: '#A78BFA', tintSoft: 'rgba(167,139,250,0.18)', Icon: Sparkles },
};

/* ─── Empty State ──────────────────────────────────────────────────────── */
export function EmptyState({
  variant = 'generic',
  title,
  body,
  cta,
  compact = false,
}: {
  variant?: Variant;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void };
  compact?: boolean;
}) {
  const meta = VARIANT_META[variant];
  return (
    <View
      style={[s.wrap, compact && { paddingVertical: 28 }]}
      accessibilityRole="summary"
      accessibilityLabel={`${meta.label}. ${title}. ${body || ''}`}
    >
      <View style={s.illu} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Illustration variant={variant} />
      </View>
      <Text
        style={s.title}
        // @ts-ignore web-only role helper
        accessibilityRole={Platform.OS === 'web' ? ('heading' as any) : ('header' as any)}
      >
        {title}
      </Text>
      {!!body && <Text style={s.body}>{body}</Text>}
      {cta && (
        <PressScale onPress={cta.onPress}>
          <View
            style={s.ctaBtn}
            // @ts-ignore — RN doesn't strictly type this but Pressable parent passes it through
            accessibilityRole="button"
            accessibilityLabel={cta.label}
          >
            <LinearGradient
              colors={GRADS.brand as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.ctaGrad}
            >
              <Text style={s.ctaText}>{cta.label} →</Text>
            </LinearGradient>
          </View>
        </PressScale>
      )}
    </View>
  );
}

/* ─── Illustration router ─────────────────────────────────────────────── */
function Illustration({ variant }: { variant: Variant }) {
  switch (variant) {
    case 'savedJobs':    return <SavedJobsIllu />;
    case 'bookings':     return <BookingsIllu />;
    case 'applications': return <ApplicationsIllu />;
    case 'workshops':    return <WorkshopsIllu />;
    case 'network':      return <NetworkIllu />;
    default:             return <GenericIllu />;
  }
}

/* ─── Variant: Saved Jobs (bookmark drop + sparkle ring) ───────────────── */
function SavedJobsIllu() {
  const drop = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    drop.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
        withDelay(700, withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) })),
      ), -1, false,
    );
    ring.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
  }, [drop, ring]);
  const aBookmark = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(drop.value, [0, 1], [-30, 0]) },
      { scale: 0.9 + drop.value * 0.1 },
    ],
    opacity: drop.value,
  }));
  const aRing = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring.value * 360}deg` }],
    opacity: 0.55 + drop.value * 0.4,
  }));
  return (
    <View style={s.illuBox}>
      <Animated.View style={[StyleSheet.absoluteFill, aRing]}>
        <Sparkle x={20} y={16} color="#A78BFA" />
        <Sparkle x={92} y={20} color="#FCD34D" delay={400} size={5} />
        <Sparkle x={102} y={88} color="#34D399" delay={800} />
        <Sparkle x={12} y={92} color="#F472B6" delay={1200} size={5} />
      </Animated.View>
      <Animated.View style={[s.illuCenter, aBookmark]}>
        <LinearGradient colors={GRADS.brand as any} style={s.illuPlate}>
          <Bookmark size={34} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

/* ─── Variant: Bookings (calendar wobble + clock hand) ─────────────────── */
function BookingsIllu() {
  const wobble = useSharedValue(0);
  const hand = useSharedValue(0);
  useEffect(() => {
    wobble.value = withRepeat(withSequence(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      withTiming(-1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    hand.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
  }, [wobble, hand]);
  const aCal = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.value * 6}deg` }] }));
  const aHand = useAnimatedStyle(() => ({ transform: [{ rotate: `${hand.value * 360}deg` }] }));
  return (
    <View style={s.illuBox}>
      <Animated.View style={[s.illuCenter, aCal]}>
        <LinearGradient colors={['#0E7490', '#22D3EE']} style={s.illuPlate}>
          <Calendar size={34} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Animated.View style={[s.illuClock, aHand]}>
        <View style={s.clockHand} />
      </Animated.View>
      <Sparkle x={20} y={20} color="#22D3EE" />
      <Sparkle x={94} y={22} color="#67E8F9" delay={500} size={5} />
    </View>
  );
}

/* ─── Variant: Applications (paper plane drift) ───────────────────────── */
function ApplicationsIllu() {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(withSequence(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
      withTiming(0, { duration: 0 }),
    ), -1, false);
  }, [drift]);
  const aPlane = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-30, 30]) },
      { translateY: interpolate(drift.value, [0, 1], [12, -12]) },
      { rotate: `${interpolate(drift.value, [0, 1], [-12, 18])}deg` },
    ],
    opacity: interpolate(drift.value, [0, 0.1, 0.85, 1], [0, 1, 1, 0]),
  }));
  return (
    <View style={s.illuBox}>
      <Animated.View style={[s.illuCenter, aPlane]}>
        <Svg width={56} height={56} viewBox="0 0 56 56">
          <Defs>
            <SvgLG id="plane" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#F59E0B" />
              <Stop offset="1" stopColor="#FBBF24" />
            </SvgLG>
          </Defs>
          <Path d="M4 28 L52 6 L42 50 L26 32 Z" fill="url(#plane)" />
          <Path d="M26 32 L42 50 L34 36 Z" fill="#B45309" />
        </Svg>
      </Animated.View>
      <Trail color="#F59E0B" />
    </View>
  );
}

/* ─── Variant: Workshops (cap bob + confetti) ──────────────────────────── */
function WorkshopsIllu() {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, [bob]);
  const aCap = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(bob.value, [0, 1], [3, -8]) }] }));
  return (
    <View style={s.illuBox}>
      <Animated.View style={[s.illuCenter, aCap]}>
        <LinearGradient colors={['#9D174D', '#EC4899']} style={s.illuPlate}>
          <GraduationCap size={36} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Confetti />
    </View>
  );
}

/* ─── Variant: Network (orbiting avatars) ──────────────────────────────── */
function NetworkIllu() {
  const orbit = useSharedValue(0);
  useEffect(() => {
    orbit.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
  }, [orbit]);
  const aRing = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value * 360}deg` }] }));
  const initials = ['AR', 'PS', 'KM', 'NV'];
  const colors = ['#A78BFA', '#34D399', '#FCD34D', '#F472B6'];
  return (
    <View style={s.illuBox}>
      <View style={s.illuCenter}>
        <LinearGradient colors={['#065F46', '#34D399']} style={s.illuPlate}>
          <Users size={32} color="#fff" />
        </LinearGradient>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, aRing]}>
        {initials.map((init, i) => {
          const angle = (i * 90) * (Math.PI / 180);
          const x = 60 + Math.cos(angle) * 50 - 13;
          const y = 60 + Math.sin(angle) * 50 - 13;
          return (
            <View key={init} style={[s.orbitDot, { backgroundColor: colors[i], left: x, top: y }]}>
              <Text style={s.orbitText}>{init}</Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

/* ─── Variant: Generic (sparkle pulse) ─────────────────────────────────── */
function GenericIllu() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 }),
    ), -1, false);
  }, [pulse]);
  const aIcon = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + pulse.value * 0.16 }, { rotate: `${pulse.value * 12 - 6}deg` }] }));
  return (
    <View style={s.illuBox}>
      <Animated.View style={[s.illuCenter, aIcon]}>
        <LinearGradient colors={GRADS.brand as any} style={s.illuPlate}>
          <Sparkles size={32} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Sparkle x={18} y={20} color="#A78BFA" />
      <Sparkle x={94} y={22} color="#C4B5FD" delay={300} size={5} />
      <Sparkle x={100} y={88} color="#FCD34D" delay={600} />
    </View>
  );
}

/* ─── Atoms ────────────────────────────────────────────────────────────── */
function Sparkle({ x, y, color = '#A78BFA', delay = 0, size = 6 }: { x: number; y: number; color?: string; delay?: number; size?: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 600 })),
      -1, false,
    ));
  }, [delay, v]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.6 + v.value * 0.6 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, aStyle]}>
      <Svg width={size} height={size} viewBox="0 0 6 6">
        <Path d="M3 0 L3.7 2.3 L6 3 L3.7 3.7 L3 6 L2.3 3.7 L0 3 L2.3 2.3 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

function Trail({ color }: { color: string }) {
  return (
    <View style={{ position: 'absolute', left: 18, bottom: 28, flexDirection: 'row', gap: 6 }}>
      {[0, 0.2, 0.4, 0.6].map((offset, i) => (
        <TrailDot key={i} color={color} offset={offset} />
      ))}
    </View>
  );
}

function TrailDot({ color, offset }: { color: string; offset: number }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false); }, [v]);
  const aStyle = useAnimatedStyle(() => {
    const o = (v.value + offset) % 1;
    return { opacity: 1 - o, transform: [{ translateX: o * 30 }] };
  });
  return <Animated.View style={[{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }, aStyle]} />;
}

function Confetti() {
  const pieces = [
    { x: 14, color: '#FCD34D', delay: 0,   rot: -20 },
    { x: 38, color: '#A78BFA', delay: 0.2, rot: 14 },
    { x: 64, color: '#34D399', delay: 0.4, rot: -8 },
    { x: 92, color: '#F472B6', delay: 0.1, rot: 22 },
    { x: 110, color: '#FCA5A5', delay: 0.3, rot: -14 },
  ];
  return (
    <>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} {...p} />
      ))}
    </>
  );
}

function ConfettiPiece({ x, color, delay, rot }: { x: number; color: string; delay: number; rot: number }) {
  const drop = useSharedValue(0);
  useEffect(() => { drop.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false); }, [drop]);
  const aStyle = useAnimatedStyle(() => {
    const t = (drop.value + delay) % 1;
    return {
      transform: [{ translateY: t * 130 - 10 }, { rotate: `${rot + t * 360}deg` }],
      opacity: t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15,
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', left: x, top: 0, width: 6, height: 10, borderRadius: 1, backgroundColor: color }, aStyle]}
    />
  );
}

/* ─── Success Burst Overlay ───────────────────────────────────────────── */
export function SuccessBurst({ visible, onHide, label = 'Success!' }: { visible: boolean; onHide?: () => void; label?: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (!visible) { v.value = 0; return; }
    v.value = withSequence(
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withDelay(900, withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) })),
    );
    const t = setTimeout(() => onHide?.(), 1700);
    return () => clearTimeout(t);
  }, [visible, v, onHide]);
  const aWrap = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.8 + v.value * 0.2 }],
  }));
  if (!visible) return null;
  return (
    <Animated.View
      style={[s.burstWrap, aWrap]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={label}
    >
      <View style={s.burstCard}>
        <View style={s.burstCheckCircle}>
          <Svg width={28} height={28} viewBox="0 0 28 28">
            <Path d="M7 14 L12 19 L21 9" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </View>
        <Text style={s.burstText}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 40, alignItems: 'center', backgroundColor: SC.card, borderRadius: 14, borderWidth: 1, borderColor: SC.border, gap: 10 },
  illu: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  illuBox: { width: 130, height: 130, position: 'relative' },
  illuCenter: { position: 'absolute', left: 35, top: 35, width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  illuPlate: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ boxShadow: '0 12px 32px rgba(95,37,159,0.40)' } as any) : {}) },
  illuClock: { position: 'absolute', left: 95, top: 22, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#67E8F9', alignItems: 'center', justifyContent: 'center' },
  clockHand: { width: 1.5, height: 9, backgroundColor: '#67E8F9', position: 'absolute', top: 1 },
  orbitDot: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: SC.bg2 },
  orbitText: { color: '#000', fontFamily: FONTS.xbold, fontSize: 9 },

  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16, letterSpacing: -0.2, textAlign: 'center' },
  body:  { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', maxWidth: 360, lineHeight: 18 },

  ctaBtn: { marginTop: 12, borderRadius: 10, overflow: 'hidden' },
  ctaGrad: { paddingHorizontal: 18, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },

  burstWrap: { position: 'absolute', top: 24, left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  burstCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(20,32,12,0.98)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.45)',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 8px 28px rgba(34,197,94,0.35)' } as any) : {}),
  },
  burstCheckCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
  },
  burstText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
});
