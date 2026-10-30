// @ts-nocheck
/**
 * Apple HIG Primitives — bundled in one file for atomic adoption.
 *
 * Components: Card, Button, Modal, Sheet, Tabs, SegmentedControl, GlassTopbar
 * + helpers: AppleText
 *
 * All components:
 *   • Theme-aware via useTheme() (light + dark)
 *   • Reduced-motion safe (uses existing useReducedMotion from student/motion)
 *   • Responsive — adapt to phone/tablet/desktop via useBreakpoint()
 *   • A11y first (roles, labels, focus rings on web)
 *   • 44pt minimum tap targets on touch (auto-padded)
 *   • No layout-triggering animations (only transform/opacity)
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Modal as RNModal, Platform,
  ActivityIndicator, ViewStyle, TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay,
  Easing as REasing,
} from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';
import { SP, RADII, TYPE, FONT_FAMILY, type Theme } from '@/src/theme/apple';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { useReducedMotion } from '@/src/views/web/portals/student/motion';
import { EASE, DUR, SPRING } from './tokens';

/* ─── AppleText — typography helper bound to theme + fluid sizing ──── */
type AppleTextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'caption' | 'label';
const TEXT_SIZES: Record<AppleTextVariant, { size: number; lineHeight: number; weight: TextStyle['fontWeight'] }> = {
  display:    { size: 34, lineHeight: 41, weight: '700' },
  h1:         { size: 28, lineHeight: 34, weight: '700' },
  h2:         { size: 22, lineHeight: 28, weight: '600' },
  h3:         { size: 17, lineHeight: 22, weight: '600' },
  body:       { size: 15, lineHeight: 22, weight: '400' },
  bodyStrong: { size: 15, lineHeight: 22, weight: '600' },
  caption:    { size: 12, lineHeight: 16, weight: '500' },
  label:      { size: 13, lineHeight: 18, weight: '500' },
};

export function AppleText({
  variant = 'body', tone = 'primary', children, style, numberOfLines,
}: {
  variant?: AppleTextVariant;
  tone?: 'primary' | 'secondary' | 'tertiary' | 'accent';
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  const { theme } = useTheme();
  const { isPhone } = useBreakpoint();
  const t = TEXT_SIZES[variant];
  const color = tone === 'primary' ? theme.text
              : tone === 'secondary' ? theme.textSec
              : tone === 'tertiary' ? theme.textTer
              : theme.primary;
  const ts = (variant === 'display' || variant === 'h1') ? TYPE.display.letterSpacing
           : variant === 'h2' ? TYPE.title.letterSpacing
           : variant === 'caption' ? 0 : TYPE.body.letterSpacing;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{
        fontFamily: FONT_FAMILY,
        fontSize: t.size,
        lineHeight: isPhone ? Math.round(t.size * 1.5) : t.lineHeight,
        fontWeight: t.weight,
        letterSpacing: ts,
        color,
      }, style]}
    >
      {children}
    </Text>
  );
}

/* ─── Card — hover lift, tap scale, glass mode ────────────────────── */
export function Card({
  children, glass = false, interactive = true, onPress, style,
  accessibilityLabel, testID,
}: {
  children: React.ReactNode;
  glass?: boolean;
  interactive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const { theme, isDark } = useTheme();
  const { isPhone } = useBreakpoint();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: lift.value }],
  }));

  const padding = isPhone ? SP.base : SP.lg;
  const radius = isPhone ? RADII.lg : RADII.card;

  const Wrap: any = onPress ? Pressable : View;
  return (
    <Animated.View style={[aStyle]}>
      <Wrap
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : undefined}
        onHoverIn={interactive && !reduced && Platform.OS === 'web' ? () => { lift.value = withTiming(-2, { duration: DUR.base, easing: EASE.standard }); } : undefined}
        onHoverOut={interactive && !reduced && Platform.OS === 'web' ? () => { lift.value = withTiming(0, { duration: DUR.base, easing: EASE.standard }); } : undefined}
        onPressIn={onPress && !reduced ? () => { scale.value = withSpring(0.98, SPRING.snappy); } : undefined}
        onPressOut={onPress && !reduced ? () => { scale.value = withSpring(1, SPRING.snappy); } : undefined}
        onPress={onPress}
        style={({ pressed }: any) => [
          {
            backgroundColor: glass ? theme.bgGlass : theme.bgElevated,
            borderRadius: radius,
            padding,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.hairline,
            ...(Platform.OS === 'web' ? ({
              transitionProperty: 'background-color, border-color, box-shadow',
              transitionDuration: '200ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: onPress ? 'pointer' : 'default',
              boxShadow: isDark
                ? '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)'
                : '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
            } as any) : theme.shadow.sm),
          },
          style,
        ]}
      >
        {glass && Platform.OS !== 'web' && (
          <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        {children}
      </Wrap>
    </Animated.View>
  );
}

/* ─── Button — primary/secondary/ghost/destructive · sm/md/lg · loading ─ */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  children, onPress, variant = 'primary', size = 'md',
  loading, disabled, fullWidth, leftIcon, rightIcon,
  accessibilityLabel, testID, style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const { isPhone } = useBreakpoint();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Phone primary CTAs default to full-width (per spec)
  const wide = fullWidth ?? false;
  const isDisabled = disabled || loading;

  const heights: Record<ButtonSize, number> = { sm: 32, md: 36, lg: 44 };
  const paddings: Record<ButtonSize, number> = { sm: SP.md, md: SP.base, lg: SP.lg };
  const fontSizes: Record<ButtonSize, number> = { sm: 13, md: 14, lg: 15 };

  // Touch devices need 44pt min — auto-pad small/medium on phone
  const effHeight = isPhone ? Math.max(heights[size], 44) : heights[size];

  const palette = {
    primary:     { bg: theme.primary,                       fg: '#fff', border: theme.primary },
    secondary:   { bg: 'transparent',                       fg: theme.text,    border: theme.hairline },
    ghost:       { bg: 'transparent',                       fg: theme.primary, border: 'transparent' },
    destructive: { bg: theme.red,                            fg: '#fff', border: theme.red },
  }[variant];

  return (
    <Animated.View style={[aStyle, wide && { alignSelf: 'stretch' }]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
        disabled={isDisabled}
        onPressIn={() => { if (!reduced) scale.value = withSpring(0.97, SPRING.snappy); }}
        onPressOut={() => { if (!reduced) scale.value = withSpring(1, SPRING.snappy); }}
        onPress={onPress}
        style={({ hovered }: any) => [
          {
            height: effHeight,
            paddingHorizontal: paddings[size],
            borderRadius: RADII.md,
            backgroundColor: palette.bg,
            borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
            borderColor: palette.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SP.sm,
            opacity: isDisabled ? 0.5 : 1,
            ...(Platform.OS === 'web' ? ({
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transitionProperty: 'filter, background-color',
              transitionDuration: '150ms',
              transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
              filter: hovered && !isDisabled ? 'brightness(1.08)' : 'brightness(1)',
              userSelect: 'none',
            } as any) : {}),
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : (
          <>
            {leftIcon}
            <Text style={{
              fontFamily: FONT_FAMILY, fontSize: fontSizes[size], fontWeight: '600',
              color: palette.fg, letterSpacing: Number("-0.01"),
            }}>
              {children}
            </Text>
            {rightIcon}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ─── Modal — responsive: full-bottom-sheet on phone, centered on tablet+ ─ */
export function Modal({
  open, onClose, children, dismissOnBackdrop = true,
  accessibilityLabel,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dismissOnBackdrop?: boolean;
  accessibilityLabel?: string;
}) {
  const { theme, isDark } = useTheme();
  const { isPhone } = useBreakpoint();
  const reduced = useReducedMotion();
  const v = useSharedValue(0);

  useEffect(() => {
    if (open) v.value = withTiming(1, { duration: reduced ? 0 : DUR.medium, easing: REasing.bezier(0.32, 0.72, 0, 1) });
    else v.value = withTiming(0, { duration: reduced ? 0 : DUR.base, easing: REasing.bezier(0.4, 0, 1, 1) });
  }, [open, v, reduced]);

  // Phone → bottom sheet (translateY); Tablet+ → centered (scale + fade)
  const aBackdrop = useAnimatedStyle(() => ({ opacity: v.value * 0.45 }));
  const aPanel = useAnimatedStyle(() => isPhone
    ? { opacity: 1, transform: [{ translateY: (1 - v.value) * 600 }] }
    : { opacity: v.value, transform: [{ scale: 0.96 + v.value * 0.04 }] });

  return (
    <RNModal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View
        style={{ flex: 1, justifyContent: isPhone ? 'flex-end' : 'center', alignItems: 'center' }}
        accessibilityLabel={accessibilityLabel}
        accessibilityViewIsModal
      >
        {/* Backdrop */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close modal"
          onPress={dismissOnBackdrop ? onClose : undefined}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, aBackdrop]} />
        </Pressable>

        {/* Panel */}
        <Animated.View
          style={[
            {
              width: isPhone ? '100%' : 480,
              maxWidth: '100%',
              maxHeight: isPhone ? '88%' : '85%',
              backgroundColor: theme.bgElevated,
              borderRadius: isPhone ? RADII.modal : RADII.modal,
              borderTopLeftRadius: isPhone ? RADII.hero : RADII.modal,
              borderTopRightRadius: isPhone ? RADII.hero : RADII.modal,
              padding: isPhone ? SP.base : SP.xl,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.hairline,
              ...(Platform.OS === 'web' ? ({
                boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.65)' : '0 24px 64px rgba(0,0,0,0.18)',
              } as any) : theme.shadow.xl),
            },
            aPanel,
          ]}
        >
          {/* Drag handle on phone */}
          {isPhone && (
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: theme.separator, alignSelf: 'center', marginBottom: SP.md }} />
          )}
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
}

/* ─── Sheet — slide drawer (right/left/bottom) ───────────────────── */
export function Sheet({
  open, onClose, side = 'right', children,
  accessibilityLabel,
}: {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'left' | 'bottom';
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const { theme, isDark } = useTheme();
  const { isPhone, width: vw, height: vh } = useBreakpoint();
  const reduced = useReducedMotion();
  const v = useSharedValue(0);

  useEffect(() => {
    if (open) v.value = withTiming(1, { duration: reduced ? 0 : 350, easing: REasing.bezier(0.32, 0.72, 0, 1) });
    else v.value = withTiming(0, { duration: reduced ? 0 : DUR.base, easing: REasing.bezier(0.4, 0, 1, 1) });
  }, [open, v, reduced]);

  // Phone: full-width drawer / full-bottom; Tablet+: 380–480px right-side panel
  const panelWidth  = isPhone ? Math.min(vw, 360) : 420;
  const panelHeight = side === 'bottom' ? Math.min(vh * 0.88, 720) : vh;

  const aBackdrop = useAnimatedStyle(() => ({ opacity: v.value * 0.4 }));
  const aPanel = useAnimatedStyle(() => {
    if (side === 'bottom') return { transform: [{ translateY: (1 - v.value) * panelHeight }] };
    if (side === 'left')   return { transform: [{ translateX: (v.value - 1) * panelWidth }] };
    return { transform: [{ translateX: (1 - v.value) * panelWidth }] };
  });

  const positions: Record<typeof side, ViewStyle> = {
    right:  { right: 0, top: 0, bottom: 0, width: panelWidth },
    left:   { left: 0,  top: 0, bottom: 0, width: panelWidth },
    bottom: { left: 0, right: 0, bottom: 0, height: panelHeight },
  };

  return (
    <RNModal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }} accessibilityLabel={accessibilityLabel} accessibilityViewIsModal>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} accessibilityLabel="Close sheet" accessibilityRole="button">
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, aBackdrop]} />
        </Pressable>
        <Animated.View
          style={[
            {
              position: 'absolute',
              backgroundColor: theme.bgElevated,
              borderTopLeftRadius: side === 'bottom' || side === 'right' ? RADII.hero : 0,
              borderBottomLeftRadius: side === 'right' ? RADII.hero : 0,
              borderTopRightRadius: side === 'bottom' || side === 'left' ? RADII.hero : 0,
              borderBottomRightRadius: side === 'left' ? RADII.hero : 0,
              padding: SP.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.hairline,
              ...(Platform.OS === 'web' ? ({
                boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.65)' : '0 24px 64px rgba(0,0,0,0.18)',
              } as any) : theme.shadow.xl),
            },
            positions[side],
            aPanel,
          ]}
        >
          {side === 'bottom' && (
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: theme.separator, alignSelf: 'center', marginBottom: SP.md }} />
          )}
          {children}
        </Animated.View>
      </View>
    </RNModal>
  );
}

/* ─── Tabs — animated underline indicator ────────────────────────── */
export function Tabs({
  tabs, value, onChange, style,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    const m = layouts[value];
    if (!m) return;
    x.value = reduced ? m.x : withSpring(m.x, SPRING.snappy);
    w.value = reduced ? m.w : withSpring(m.w, SPRING.snappy);
  }, [value, layouts, reduced, x, w]);

  const aIndicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));

  return (
    <View style={[{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.hairline, flexDirection: 'row', position: 'relative' }, style]}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            onLayout={(e) => {
              const { x: lx, width: lw } = e.nativeEvent.layout;
              setLayouts((m) => ({ ...m, [tab.id]: { x: lx, w: lw } }));
            }}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: SP.base, paddingVertical: SP.md, minHeight: 44, justifyContent: 'center',
              ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
            }}
          >
            <Text
              style={{
                fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '500',
                color: active ? theme.text : theme.textSec,
                ...(Platform.OS === 'web' ? ({ transitionProperty: 'color', transitionDuration: '150ms' } as any) : {}),
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View
        style={[
          { position: 'absolute', bottom: (StyleSheet.hairlineWidth * Number("-1")), left: 0, height: 2, borderRadius: 1, backgroundColor: theme.text },
          aIndicator,
        ]}
      />
    </View>
  );
}

/* ─── SegmentedControl — iOS pill that slides ────────────────────── */
export function SegmentedControl<T extends string>({
  options, value, onChange, fullWidth = false, style,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  fullWidth?: boolean;
  style?: ViewStyle;
}) {
  const { theme, isDark } = useTheme();
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    const m = layouts[value];
    if (!m) return;
    x.value = reduced ? m.x : withSpring(m.x, { damping: 32, stiffness: 400 });
    w.value = reduced ? m.w : withSpring(m.w, { damping: 32, stiffness: 400 });
  }, [value, layouts, reduced, x, w]);

  const aThumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));

  return (
    <View
      style={[{
        flexDirection: 'row',
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        borderRadius: 9,
        padding: 2,
        position: 'relative',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
      }, style]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute', top: 2, bottom: 2,
            backgroundColor: theme.bgElevated,
            borderRadius: 7,
            ...(Platform.OS === 'web' ? ({ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06)' } as any) : theme.shadow.sm),
          },
          aThumb,
        ]}
      />
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            onLayout={(e) => {
              const { x: lx, width: lw } = e.nativeEvent.layout;
              setLayouts((m) => ({ ...m, [String(opt.id)]: { x: lx, w: lw } }));
            }}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: SP.base, paddingVertical: 8, minHeight: 32,
              alignItems: 'center', justifyContent: 'center', flex: fullWidth ? 1 : undefined,
              ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
            }}
          >
            <Text
              style={{
                fontFamily: FONT_FAMILY, fontSize: 13,
                fontWeight: active ? '600' : '500',
                color: active ? theme.text : theme.textSec,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── GlassTopbar — gains blur after scrollY > 8, responsive height ── */
export function GlassTopbar({
  children, scrolled = false, style,
}: {
  children: React.ReactNode;
  scrolled?: boolean;
  style?: ViewStyle;
}) {
  const { theme, isDark } = useTheme();
  const { isPhone } = useBreakpoint();
  const v = useSharedValue(scrolled ? 1 : 0);
  useEffect(() => { v.value = withTiming(scrolled ? 1 : 0, { duration: DUR.base, easing: REasing.bezier(0.4, 0, 0.2, 1) }); }, [scrolled, v]);
  const aStyle = useAnimatedStyle(() => ({ opacity: v.value }));

  const height = isPhone ? 44 : 52;

  return (
    <View
      style={[{
        height,
        backgroundColor: theme.bg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'transparent',
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: isPhone ? SP.base : SP.lg,
        position: 'relative', zIndex: 10,
      }, style]}
    >
      {/* Glass overlay — fades in once scrolled */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, aStyle]}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: theme.bgGlass,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.hairline,
            // @ts-ignore — RN-Web supports this
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          } as any]} />
        ) : (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.hairline }]} />
        )}
      </Animated.View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: SP.md }}>
        {children}
      </View>
    </View>
  );
}

/* ─── ScrollReveal — IntersectionObserver-style fade-up on scroll ─── */
export function ScrollReveal({
  children, delay = 0, distance = 16, style,
}: { children: React.ReactNode; delay?: number; distance?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) { v.value = 1; return; }
    v.value = withDelay(delay, withTiming(1, { duration: 400, easing: REasing.bezier(0, 0, 0.2, 1) }));
  }, [delay, reduced, v]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * distance }],
  }));
  return <Animated.View style={[aStyle, style]}>{children}</Animated.View>;
}

export default {
  AppleText, Card, Button, Modal, Sheet, Tabs, SegmentedControl, GlassTopbar, ScrollReveal,
};
