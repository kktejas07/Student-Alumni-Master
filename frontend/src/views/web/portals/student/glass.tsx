// @ts-nocheck
/**
 * Student Portal — FinTax360 Glass-Dark primitives (v0.18.0).
 *
 * Exports
 * ────────
 *   <AnimatedAurora />  — four drifting colored orbs across the navy canvas
 *                          (web: CSS-transform loops; native: Reanimated)
 *   <GridOverlay />     — 64px grid with radial mask (web only — no-op native)
 *   <GlassCard />       — fade+slide-in on mount, hover-lift on web, press
 *                          scale on native. THE primary card primitive.
 *   <GlassSoft />       — nested soft surface (form fields, chips background)
 *   <KpiTile />         — eyebrow + big mono number + delta footer + glow
 *   <PillChip />        — semantic pill with variants
 *   <GradientButton />  — pill with violet gradient + glow
 *   <AiCopilotFab />    — fixed FAB, scales 1.1× on hover
 *   <RouteTransition /> — fade+y-shift wrapper for view changes
 *
 *   glassStyle()        — legacy spread-style helper (kept for migration)
 *   Aurora              — legacy alias (now renders AnimatedAurora)
 *   GlassSurface        — legacy alias (now renders GlassCard)
 */
import React, { useEffect, useRef } from 'react';
import { View, Platform, StyleSheet, Pressable, Text, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE, SC, TYPO } from './tokens';

/* ─────────────────────────────────────────────────────────────────
 * AnimatedAurora — four drifting colored orbs (violet · blue · teal · rose)
 *                  that sit behind every glass surface.
 * ───────────────────────────────────────────────────────────────── */
export function AnimatedAurora({ intensity = 'normal' }: {
  intensity?: 'subtle' | 'normal' | 'strong';
}) {
  const mul = intensity === 'subtle' ? 0.3 : intensity === 'strong' ? 0.9 : 0.55;

  if (Platform.OS === 'web') {
    // Pure CSS: three positioned div "orbs" with their own keyframe loops.
    // Wrapping in a single layer so the parent only sees one absolutely-
    // positioned descendant. Pink/rose orb dropped per design feedback;
    // remaining palette is violet · blue · teal for a calmer canvas.
    return (
      <View pointerEvents="none" style={[a.layer]}>
        {/* @ts-expect-error web-only — styled via inline JSX style sheet */}
        <style>{`
@keyframes orbA { 0%{transform:translate(0,0)} 50%{transform:translate(15vw,10vh)} 100%{transform:translate(0,0)} }
@keyframes orbB { 0%{transform:translate(0,0)} 50%{transform:translate(-18vw,12vh)} 100%{transform:translate(0,0)} }
@keyframes orbC { 0%{transform:translate(0,0)} 50%{transform:translate(12vw,-10vh)} 100%{transform:translate(0,0)} }
        `}</style>
        <View style={[a.orb, {
          top: '-12%', left: '-10%', width: 540, height: 540,
          backgroundColor: PALETTE.violet,
          opacity: 0.26 * mul,
          // @ts-expect-error web-only
          filter: 'blur(140px)',
          animation: 'orbA 22s ease-in-out infinite',
        } as any]} />
        <View style={[a.orb, {
          top: '8%', right: '-14%', width: 500, height: 500,
          backgroundColor: PALETTE.blue,
          opacity: 0.20 * mul,
          // @ts-expect-error web-only
          filter: 'blur(140px)',
          animation: 'orbB 28s ease-in-out infinite',
        } as any]} />
        <View style={[a.orb, {
          bottom: '-18%', left: '25%', width: 620, height: 620,
          backgroundColor: PALETTE.teal,
          opacity: 0.16 * mul,
          // @ts-expect-error web-only
          filter: 'blur(160px)',
          animation: 'orbC 32s ease-in-out infinite',
        } as any]} />
      </View>
    );
  }

  // Native — static orbs (Animated.View support would be ideal but the blur
  // hit on a moving image is too costly on lower-end devices).
  return (
    <View pointerEvents="none" style={a.layer}>
      <View style={[a.orb, { top: -50,  left: -50,  width: 360, height: 360,
                             backgroundColor: PALETTE.violet, opacity: 0.24 * mul }]} />
      <View style={[a.orb, { top: 80,   right: -70, width: 320, height: 320,
                             backgroundColor: PALETTE.blue,   opacity: 0.18 * mul }]} />
      <View style={[a.orb, { bottom: 60, left: 120, width: 400, height: 400,
                             backgroundColor: PALETTE.teal,   opacity: 0.14 * mul }]} />
    </View>
  );
}

// Legacy alias
export const Aurora = AnimatedAurora;

const a = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 9999 },
});

/* ─────────────────────────────────────────────────────────────────
 * GridOverlay — 64px grid with radial fade (web only). Adds the
 *               subtle technical-blueprint texture to the canvas.
 * ───────────────────────────────────────────────────────────────── */
export function GridOverlay() {
  if (Platform.OS !== 'web') return null;
  return (
    <View
      pointerEvents="none"
      style={[
        a.layer,
        {
          // @ts-expect-error web-only
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px, 64px 64px',
          maskImage: 'radial-gradient(60vw 70vh at 50% 30%, #000 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(60vw 70vh at 50% 30%, #000 0%, transparent 75%)',
        } as any,
      ]}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
 * GlassCard — primary card surface, animated on mount + hover.
 * ───────────────────────────────────────────────────────────────── */
export function GlassCard({
  children, style, strong, radius = 16, padding,
  blurAmount = 22, glow = false, delay = 0,
  onPress, accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: any;
  strong?: boolean;
  radius?: number;
  padding?: number;
  blurAmount?: number;
  glow?: boolean;
  delay?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  // Fade + slide-in on mount
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350,
        delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 350,
        delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, ty]);

  const base: any = {
    backgroundColor: strong ? PALETTE.glassStrong : PALETTE.glass,
    borderWidth: 1,
    borderColor: hover ? PALETTE.glassBorderHi : PALETTE.glassBorder,
    borderRadius: radius,
    padding,
    overflow: 'hidden',
  };

  if (Platform.OS === 'web') {
    Object.assign(base, {
      backdropFilter: `blur(${blurAmount}px) saturate(180%)`,
      WebkitBackdropFilter: `blur(${blurAmount}px) saturate(180%)`,
      boxShadow: glow || hover ? PALETTE.violetGlow : PALETTE.glassShadow,
      transitionProperty: 'transform, box-shadow, border-color',
      transitionDuration: '220ms',
      transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      transform: hover ? 'translateY(-3px)' : pressed ? 'translateY(0px) scale(0.99)' : 'translateY(0)',
      cursor: onPress ? 'pointer' : 'default',
    });
  }

  const inner = (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY: ty }] },
        base,
        style,
      ]}
    >
      {/* 1px top highlight (the glass-edge sparkle) */}
      <View pointerEvents="none"
            style={[g.highlight, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      {children}
    </Animated.View>
  );

  if (Platform.OS === 'web') {
    if (onPress) {
      return (
        <Pressable
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onHoverIn={() => setHover(true)}
          onHoverOut={() => setHover(false)}
          accessibilityLabel={accessibilityLabel}
        >
          {inner}
        </Pressable>
      );
    }
    return (
      // Wrap in a View so hover events propagate even when no onPress.
      <View
        // @ts-expect-error web-only
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {inner}
      </View>
    );
  }

  // Native — BlurView for actual frosted-glass effect + Pressable for scale.
  const content = (
    <BlurView
      intensity={strong ? 50 : 32}
      tint="dark"
      style={[{ borderRadius: radius, overflow: 'hidden' }, base]}
    >
      <View pointerEvents="none"
            style={[g.highlight, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
      {children}
    </BlurView>
  );

  if (onPress) {
    return (
      <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityLabel={accessibilityLabel}
          style={({ pressed: p }) => ({ transform: [{ scale: p ? 0.985 : 1 }] })}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>
      {content}
    </Animated.View>
  );
}

// Legacy alias
export const GlassSurface = GlassCard;

const g = StyleSheet.create({
  highlight: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: PALETTE.glassHighlight,
  },
});

/* ─────────────────────────────────────────────────────────────────
 * GlassSoft — nested soft surface (used inside GlassCard for inputs,
 *             segmented controls, list rows).
 * ───────────────────────────────────────────────────────────────── */
export function GlassSoft({ children, style, radius = 12 }: {
  children: React.ReactNode; style?: any; radius?: number;
}) {
  return (
    <View style={[{
      backgroundColor: PALETTE.glassSoft,
      borderColor: PALETTE.glassBorder,
      borderWidth: 1,
      borderRadius: radius,
    }, style]}>
      {children}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * KpiTile — eyebrow + big mono number + delta footer + radial glow.
 * ───────────────────────────────────────────────────────────────── */
export function KpiTile({
  label, value, delta, deltaTone = 'positive', glowColor = PALETTE.violet,
  delay = 0, style,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  glowColor?: string;
  delay?: number;
  style?: any;
}) {
  const deltaColor =
    deltaTone === 'positive' ? PALETTE.teal :
    deltaTone === 'negative' ? PALETTE.rose : PALETTE.muted;

  return (
    <GlassCard delay={delay} radius={16} padding={18} style={[{ minWidth: 180 }, style]}>
      {/* corner glow */}
      <View pointerEvents="none" style={[k.glow, { backgroundColor: glowColor }]} />
      <Text style={k.label}>{label}</Text>
      <View style={{ height: 6 }} />
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={k.value}>{value}</Text>
      ) : value}
      {!!delta && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
          <Text style={[k.delta, { color: deltaColor }]}>{delta}</Text>
        </View>
      )}
    </GlassCard>
  );
}

const k = StyleSheet.create({
  glow: {
    position: 'absolute', top: -40, right: -40, width: 140, height: 140,
    borderRadius: 9999, opacity: 0.20,
    ...(Platform.OS === 'web' ? ({
      filter: 'blur(40px)',
    } as any) : {}),
  },
  label: {
    fontFamily: TYPO.body600, fontSize: 11, color: PALETTE.muted,
    letterSpacing: 1.4, textTransform: 'uppercase' as any,
  },
  value: {
    fontFamily: TYPO.mono700, fontSize: 28, color: PALETTE.text,
    letterSpacing: -0.6,
  },
  delta: {
    fontFamily: TYPO.mono600, fontSize: 12,
  },
});

/* ─────────────────────────────────────────────────────────────────
 * PillChip — semantic pill (success / warning / danger / violet / blue)
 * ───────────────────────────────────────────────────────────────── */
type ChipVariant = 'success' | 'warning' | 'danger' | 'violet' | 'blue' | 'neutral';
export function PillChip({
  label, variant = 'neutral', icon, style,
}: {
  label: string;
  variant?: ChipVariant;
  icon?: React.ReactNode;
  style?: any;
}) {
  const tone = {
    success: PALETTE.teal,
    warning: PALETTE.amber,
    danger:  PALETTE.rose,
    violet:  PALETTE.violet,
    blue:    PALETTE.blue,
    neutral: PALETTE.muted,
  }[variant];
  return (
    <View style={[p.chip, { borderColor: tone + '55', backgroundColor: tone + '1A' }, style]}>
      {icon}
      <Text style={[p.label, { color: tone }]}>{label}</Text>
    </View>
  );
}

const p = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, height: 24, borderRadius: 999, borderWidth: 1,
  },
  label: { fontFamily: TYPO.body700, fontSize: 11, letterSpacing: 0.3 },
});

/* ─────────────────────────────────────────────────────────────────
 * GradientButton — pill primary with violet gradient + glow.
 * ───────────────────────────────────────────────────────────────── */
export function GradientButton({
  label, onPress, icon, disabled, size = 'md', style,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}) {
  const [hover, setHover] = React.useState(false);
  const h = size === 'sm' ? 32 : size === 'lg' ? 46 : 38;
  const fs = size === 'sm' ? 12 : size === 'lg' ? 15 : 13;
  const px = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={Platform.OS === 'web' ? () => setHover(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setHover(false) : undefined}
      style={[{ opacity: disabled ? 0.55 : 1 }, style]}
    >
      <LinearGradient
        colors={[PALETTE.violet, PALETTE.violetD]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[gb.btn, { height: h, paddingHorizontal: px,
          ...(Platform.OS === 'web' ? ({
            boxShadow: hover
              ? '0 14px 36px rgba(139,92,246,0.45), 0 0 0 1px rgba(139,92,246,0.30)'
              : '0 8px 24px rgba(139,92,246,0.30), 0 0 0 1px rgba(139,92,246,0.20)',
            transitionProperty: 'transform, box-shadow',
            transitionDuration: '180ms',
            transform: hover ? 'translateY(-1px)' : 'translateY(0)',
            cursor: 'pointer',
          } as any) : {}),
        }]}
      >
        {icon}
        <Text style={[gb.label, { fontSize: fs }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const gb = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderRadius: 999,
  },
  label: { color: '#fff', fontFamily: TYPO.body700, letterSpacing: 0.2 },
});

/* ─────────────────────────────────────────────────────────────────
 * AiCopilotFab — fixed floating action button that opens Agent K.
 *
 * Visible on every Student screen INCLUDING /agent-k itself. Sits at
 * bottom-right, breathes with a soft violet glow, scales 1.08× on
 * hover (web) and 0.96× on press (native). Z-index above scroll
 * content via absolute positioning.
 *
 * Placement contract: render INSIDE the Student shell root (after the
 * scroll content) so it overlays every embedded view.
 * ───────────────────────────────────────────────────────────────── */
export function AiCopilotFab({
  onPress, label = 'Agent K', accessibilityLabel = 'Open AI Copilot — Agent K',
}: {
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
}) {
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  // Soft "breathing" glow loop
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    ).start();
  }, [pulse]);

  // Mount-in entrance
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: 220,
        easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 380, delay: 220,
        easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, ty]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[fab.layer, { opacity, transform: [{ translateY: ty }] }]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onHoverIn={Platform.OS === 'web' ? () => setHover(true) : undefined}
        onHoverOut={Platform.OS === 'web' ? () => setHover(false) : undefined}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID="ai-copilot-fab"
      >
        <View style={fab.wrap}>
          {/* breathing glow ring (behind the button) */}
          <Animated.View
            pointerEvents="none"
            style={[
              fab.glow,
              {
                opacity: glowOpacity,
                ...(Platform.OS === 'web' ? ({ filter: 'blur(20px)' } as any) : {}),
              },
            ]}
          />
          <LinearGradient
            colors={[PALETTE.violet, PALETTE.violetD]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[
              fab.btn,
              Platform.OS === 'web' && ({
                boxShadow: hover
                  ? '0 18px 44px rgba(139,92,246,0.55), 0 0 0 1px rgba(139,92,246,0.42)'
                  : '0 12px 32px rgba(139,92,246,0.40), 0 0 0 1px rgba(139,92,246,0.28)',
                transitionProperty: 'transform, box-shadow',
                transitionDuration: '180ms',
                transform: hover ? 'scale(1.08)' : pressed ? 'scale(0.96)' : 'scale(1)',
                cursor: 'pointer',
              } as any),
            ]}
          >
            <Text style={fab.spark}>✦</Text>
            <Text style={fab.label}>{label}</Text>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const fab = StyleSheet.create({
  layer: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    zIndex: 1000,
    ...(Platform.OS === 'web' ? ({ position: 'fixed' as any } as any) : {}),
  },
  wrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 80, height: 80,
    borderRadius: 9999,
    backgroundColor: PALETTE.violet,
    top: -10, left: -10,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 22,
    borderRadius: 9999,
  },
  spark: { color: '#fff', fontSize: 18, fontFamily: TYPO.display700, lineHeight: 22 },
  label: { color: '#fff', fontSize: 14, fontFamily: TYPO.body700, letterSpacing: 0.3 },
});

/* ─────────────────────────────────────────────────────────────────
 * RouteTransition — fade + 6px y-shift wrapper for view changes.
 *                   Wrap each view's root with this.
 * ───────────────────────────────────────────────────────────────── */
export function RouteTransition({ children, deps = [] }: {
  children: React.ReactNode;
  deps?: any[];
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    opacity.setValue(0); ty.setValue(6);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250,
        easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 250,
        easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateY: ty }] }}>
      {children}
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * glassStyle — legacy spread helper (kept for migration).
 * ───────────────────────────────────────────────────────────────── */
export function glassStyle(opts: { strong?: boolean; blur?: number } = {}) {
  const { strong = false, blur = 22 } = opts;
  if (Platform.OS === 'web') {
    return {
      backgroundColor: strong ? PALETTE.glassStrong : PALETTE.glass,
      borderColor: PALETTE.glassBorder,
      backdropFilter: `blur(${blur}px) saturate(180%)`,
      WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
      boxShadow: PALETTE.glassShadow,
    } as any;
  }
  return {
    backgroundColor: strong ? PALETTE.glassStrong : PALETTE.glass,
    borderColor: PALETTE.glassBorder,
  } as any;
}


/* ─────────────────────────────────────────────────────────────────
 * StatusChip — pill with 4 spec-tinted variants. Use for state
 *              indicators (Pending, Active, Completed, Cancelled).
 *
 *   <StatusChip tone="success">Registered</StatusChip>
 *   <StatusChip tone="warning">Pending</StatusChip>
 *   <StatusChip tone="danger">Cancelled</StatusChip>
 *   <StatusChip tone="neutral">Draft</StatusChip>
 *
 * Per FinTax360 Jewel spec — tinted bg/text/border at fixed alphas.
 * ───────────────────────────────────────────────────────────────── */
type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const STATUS_PALETTE: Record<StatusTone, { bg: string; fg: string; bd: string }> = {
  success: { bg: 'rgba(16,185,129,0.10)', fg: '#34D399', bd: 'rgba(16,185,129,0.20)' },
  warning: { bg: 'rgba(245,158,11,0.10)', fg: '#FBBF24', bd: 'rgba(245,158,11,0.20)' },
  danger:  { bg: 'rgba(239,68,68,0.10)',  fg: '#F87171', bd: 'rgba(239,68,68,0.20)'  },
  neutral: { bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.70)', bd: 'rgba(255,255,255,0.10)' },
};

export function StatusChip({
  children, tone = 'neutral', icon,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  icon?: React.ReactNode;
}) {
  const c = STATUS_PALETTE[tone];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 3,
      backgroundColor: c.bg,
      borderWidth: 1, borderColor: c.bd,
      borderRadius: 9999,
      alignSelf: 'flex-start',
    }}>
      {icon}
      <Text style={{
        color: c.fg,
        fontFamily: TYPO.body600,
        fontSize: 11,
        letterSpacing: 0.2,
      }}>{children}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Kicker — uppercase eyebrow label. The spec calls it the
 *          "hierarchy label" — text-xs font-semibold tracking-[0.2em]
 *          uppercase text-white/50. Use ABOVE section/card titles.
 *
 *   <Kicker>Today's brief</Kicker>
 *   <h2>Your career intelligence</h2>
 * ───────────────────────────────────────────────────────────────── */
export function Kicker({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <Text style={{
      color: color ?? 'rgba(255,255,255,0.50)',
      fontFamily: TYPO.body600,
      fontSize: 11,
      letterSpacing: 2.4,                // ~0.2em on 12px
      textTransform: 'uppercase',
      marginBottom: 6,
    }}>{children}</Text>
  );
}
