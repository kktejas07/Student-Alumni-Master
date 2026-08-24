// @ts-nocheck
/**
 * Student Portal — FinTax360 Glass-Dark primitives (v0.18.0).
 * Migrated to NativeWind className where possible.
 * Complex effects (blur, backdrop-filter, animations) stay as web-only inline.
 */
import React, { useEffect, useRef } from 'react';
import { View, Platform, Pressable, Text, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PALETTE, SC, TYPO } from './tokens';

/* ─────────────────────────────────────────────────────────────────
 * AnimatedAurora — four drifting colored orbs
 * ───────────────────────────────────────────────────────────────── */
export function AnimatedAurora({ intensity = 'normal' }: {
  intensity?: 'subtle' | 'normal' | 'strong';
}) {
  const mul = intensity === 'subtle' ? 0.3 : intensity === 'strong' ? 0.9 : 0.55;

  if (Platform.OS === 'web') {
    return (
      <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
        {/* @ts-expect-error web-only */}
        <style>{`
@keyframes orbA { 0%{transform:translate(0,0)} 50%{transform:translate(15vw,10vh)} 100%{transform:translate(0,0)} }
@keyframes orbB { 0%{transform:translate(0,0)} 50%{transform:translate(-18vw,12vh)} 100%{transform:translate(0,0)} }
@keyframes orbC { 0%{transform:translate(0,0)} 50%{transform:translate(12vw,-10vh)} 100%{transform:translate(0,0)} }
        `}</style>
        <View
          className="absolute rounded-full"
          style={{
            top: '-12%', left: '-10%', width: 540, height: 540,
            backgroundColor: PALETTE.violet, opacity: 0.26 * mul,
            filter: 'blur(140px)', animation: 'orbA 22s ease-in-out infinite',
          } as any}
        />
        <View
          className="absolute rounded-full"
          style={{
            top: '8%', right: '-14%', width: 500, height: 500,
            backgroundColor: PALETTE.blue, opacity: 0.20 * mul,
            filter: 'blur(140px)', animation: 'orbB 28s ease-in-out infinite',
          } as any}
        />
        <View
          className="absolute rounded-full"
          style={{
            bottom: '-18%', left: '25%', width: 620, height: 620,
            backgroundColor: PALETTE.teal, opacity: 0.16 * mul,
            filter: 'blur(160px)', animation: 'orbC 32s ease-in-out infinite',
          } as any}
        />
      </View>
    );
  }

  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
      <View className="absolute rounded-full" style={{ top: -50, left: -50, width: 360, height: 360, backgroundColor: PALETTE.violet, opacity: 0.24 * mul }} />
      <View className="absolute rounded-full" style={{ top: 80, right: -70, width: 320, height: 320, backgroundColor: PALETTE.blue, opacity: 0.18 * mul }} />
      <View className="absolute rounded-full" style={{ bottom: 60, left: 120, width: 400, height: 400, backgroundColor: PALETTE.teal, opacity: 0.14 * mul }} />
    </View>
  );
}

export const Aurora = AnimatedAurora;

/* ─────────────────────────────────────────────────────────────────
 * GridOverlay — 64px grid with radial fade (web only)
 * ───────────────────────────────────────────────────────────────── */
export function GridOverlay() {
  if (Platform.OS !== 'web') return null;
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), ' +
          'linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '64px 64px, 64px 64px',
        maskImage: 'radial-gradient(60vw 70vh at 50% 30%, #000 0%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(60vw 70vh at 50% 30%, #000 0%, transparent 75%)',
      } as any}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
 * GlassCard — primary card surface, animated on mount + hover.
 * Complex: uses splitStyles, Animated.View, BlurView (native).
 * ───────────────────────────────────────────────────────────────── */
const splitStyles = (style: any) => {
  if (!style) return { layout: {}, inner: {} };
  const flattened = Platform.OS === 'web' ? {} : require('react-native').StyleSheet.flatten(style);
  if (Platform.OS === 'web') {
    // On web we pass all style to inner (simpler path)
    return { layout: {}, inner: style };
  }
  const layoutKeys = [
    'position', 'top', 'bottom', 'left', 'right',
    'flex', 'flexGrow', 'flexShrink', 'flexBasis',
    'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'margin', 'marginHorizontal', 'marginVertical', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
    'alignSelf', 'zIndex',
  ];
  const layout: any = {};
  const inner: any = {};
  Object.keys(flattened).forEach(key => {
    if (layoutKeys.includes(key)) layout[key] = flattened[key];
    else inner[key] = flattened[key];
  });
  return { layout, inner };
};

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
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 350, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, ty]);

  const { layout, inner: innerStyle } = splitStyles(style);

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
      className="w-full h-full"
      style={[
        { opacity, transform: [{ translateY: ty }] },
        base,
        innerStyle,
      ]}
    >
      {/* 1px top highlight */}
      <View
        pointerEvents="none"
        className="absolute top-0 left-0 right-0 h-px"
        style={{ backgroundColor: PALETTE.glassHighlight, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
      />
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
          style={layout}
        >
          {inner}
        </Pressable>
      );
    }
    return (
      <View
        // @ts-expect-error web-only
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={layout}
      >
        {inner}
      </View>
    );
  }

  const content = (
    <BlurView
      intensity={strong ? 50 : 32}
      tint="dark"
      className="w-full h-full"
      style={[{ borderRadius: radius, overflow: 'hidden' }, base, innerStyle]}
    >
      <View
        pointerEvents="none"
        className="absolute top-0 left-0 right-0 h-px"
        style={{ backgroundColor: PALETTE.glassHighlight, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
      />
      {children}
    </BlurView>
  );

  if (onPress) {
    return (
      <Animated.View className="w-full h-full" style={[{ opacity, transform: [{ translateY: ty }] }, layout]}>
        <Pressable
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityLabel={accessibilityLabel}
          style={({ pressed: p }) => [{ transform: [{ scale: p ? 0.985 : 1 }] }, { width: '100%', height: '100%' }]}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View className="w-full h-full" style={[{ opacity, transform: [{ translateY: ty }] }, layout]}>
      {content}
    </Animated.View>
  );
}

export const GlassSurface = GlassCard;

/* ─────────────────────────────────────────────────────────────────
 * GlassSoft — nested soft surface
 * ───────────────────────────────────────────────────────────────── */
export function GlassSoft({ children, style, radius = 12 }: {
  children: React.ReactNode; style?: any; radius?: number;
}) {
  return (
    <View className="border" style={[{
      backgroundColor: PALETTE.glassSoft,
      borderColor: PALETTE.glassBorder,
      borderRadius: radius,
    }, style]}>
      {children}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * KpiTile — eyebrow + big mono number + delta footer + radial glow
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
      <View
        pointerEvents="none"
        className="absolute -top-10 -right-10 w-[140px] h-[140px] rounded-full opacity-20"
        style={{ backgroundColor: glowColor, ...(Platform.OS === 'web' ? { filter: 'blur(40px)' } : {}) } as any}
      />
      <Text className="font-body-semibold text-[11px] uppercase tracking-[1.4px]" style={{ color: PALETTE.muted }}>{label}</Text>
      <View className="h-1.5" />
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className="font-mono-bold text-[28px] tracking-[-0.6px]" style={{ color: PALETTE.text }}>{value}</Text>
      ) : value}
      {!!delta && (
        <View className="flex-row items-center mt-1.5 gap-1">
          <Text className="font-mono-semibold text-xs" style={{ color: deltaColor }}>{delta}</Text>
        </View>
      )}
    </GlassCard>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * PillChip — semantic pill with variants
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
    <View
      className="flex-row items-center gap-[5px] h-6 rounded-full border"
      style={[{ paddingHorizontal: 10, borderColor: tone + '55', backgroundColor: tone + '1A' }, style]}
    >
      {icon}
      <Text className="font-body-bold text-[11px]" style={{ color: tone, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * GradientButton — pill primary with violet gradient + glow
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
        className="flex-row items-center justify-center gap-[7px] rounded-full"
        style={{
          height: h, paddingHorizontal: px,
          ...(Platform.OS === 'web' ? ({
            boxShadow: hover
              ? '0 14px 36px rgba(139,92,246,0.45), 0 0 0 1px rgba(139,92,246,0.30)'
              : '0 8px 24px rgba(139,92,246,0.30), 0 0 0 1px rgba(139,92,246,0.20)',
            transitionProperty: 'transform, box-shadow',
            transitionDuration: '180ms',
            transform: hover ? 'translateY(-1px)' : 'translateY(0)',
            cursor: 'pointer',
          } as any) : {}),
        } as any}
      >
        {icon}
        <Text className="text-white font-body-bold" style={{ fontSize: fs, letterSpacing: 0.2 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * AiCopilotFab — fixed FAB that opens Agent K
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

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    ).start();
  }, [pulse]);

  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 380, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity, ty]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Animated.View
      pointerEvents="box-none"
      className="absolute z-[1000]"
      style={[{ right: 22, bottom: 22, opacity, transform: [{ translateY: ty }], ...(Platform.OS === 'web' ? { position: 'fixed' } : {}) } as any]}
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
        <View className="relative items-center justify-center">
          <Animated.View
            pointerEvents="none"
            className="absolute w-20 h-20 rounded-full -top-2.5 -left-2.5"
            style={{ backgroundColor: PALETTE.violet, opacity: glowOpacity, ...(Platform.OS === 'web' ? { filter: 'blur(20px)' } : {}) } as any}
          />
          <LinearGradient
            colors={[PALETTE.violet, PALETTE.violetD]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            className="flex-row items-center justify-center gap-2 h-14 rounded-full"
            style={{
              paddingHorizontal: 22,
              ...(Platform.OS === 'web' ? ({
                boxShadow: hover
                  ? '0 18px 44px rgba(139,92,246,0.55), 0 0 0 1px rgba(139,92,246,0.42)'
                  : '0 12px 32px rgba(139,92,246,0.40), 0 0 0 1px rgba(139,92,246,0.28)',
                transitionProperty: 'transform, box-shadow',
                transitionDuration: '180ms',
                transform: hover ? 'scale(1.08)' : pressed ? 'scale(0.96)' : 'scale(1)',
                cursor: 'pointer',
              } as any) : {}),
            } as any}
          >
            <Text className="text-white text-lg font-display-bold" style={{ lineHeight: 22 }}>✦</Text>
            <Text className="text-white text-sm font-body-bold" style={{ letterSpacing: 0.3 }}>{label}</Text>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

import { GlobalTopProgressBar } from '../../components/AppLoader';

/* ─────────────────────────────────────────────────────────────────
 * RouteTransition — fade + y-shift wrapper + top glowing progress bar
 * ───────────────────────────────────────────────────────────────── */
export function RouteTransition({ children, deps = [] }: {
  children: React.ReactNode;
  deps?: any[];
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(6)).current;
  const [navigating, setNavigating] = React.useState(false);

  useEffect(() => {
    setNavigating(true);
    opacity.setValue(0); ty.setValue(6);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => { setNavigating(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <Animated.View className="flex-1" style={{ opacity, transform: [{ translateY: ty }] }}>
      <GlobalTopProgressBar active={navigating} />
      {children}
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * glassStyle — legacy spread helper
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
 * StatusChip — pill with 4 spec-tinted variants
 * ───────────────────────────────────────────────────────────────── */
type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

const STATUS_PALETTE: Record<StatusTone, { bg: string; fg: string; bd: string }> = {
  success: { bg: 'rgba(16,185,129,0.10)', fg: '#34D399', bd: 'rgba(16,185,129,0.20)' },
  warning: { bg: 'rgba(245,158,11,0.10)', fg: '#FBBF24', bd: 'rgba(245,158,11,0.20)' },
  danger:  { bg: 'rgba(239,68,68,0.10)',  fg: '#F87171', bd: 'rgba(239,68,68,0.20)' },
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
    <View
      className="flex-row items-center gap-[5px] rounded-full self-start"
      style={{ paddingHorizontal: 10, paddingVertical: 3, backgroundColor: c.bg, borderWidth: 1, borderColor: c.bd }}
    >
      {icon}
      <Text className="font-body-semibold text-[11px]" style={{ color: c.fg, letterSpacing: 0.2 }}>{children}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Kicker — uppercase eyebrow label
 * ───────────────────────────────────────────────────────────────── */
export function Kicker({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <Text
      className="font-body-semibold text-[11px] uppercase mb-1.5"
      style={{ color: color ?? 'rgba(255,255,255,0.50)', letterSpacing: 2.4 }}
    >{children}</Text>
  );
}
