/**
 * Shared Apple HIG design-kit primitives for the web portals.
 *
 * `createKit(config)` builds a full set of primitives (buttons, cards, pills,
 * tabs, search field, toast, KPI tile, empty/loading states) from a small
 * token config so every portal can keep its own colour identity while sharing
 * one implementation.
 *
 *   student/portalkit.tsx    -> createKit(purple tokens)
 *   superadmin/applekit.tsx  -> createKit(orange tokens)
 *
 * Portals re-export the returned members under their existing names, so call
 * sites keep importing from `../portalkit` / `../applekit` unchanged.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform, ScrollView,
  ActivityIndicator, Animated as RNAnimated, Easing, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Search, AlertTriangle, Info, Loader, X } from 'lucide-react-native';

/* ─────────────────────────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────────────────────────── */
export type KitGradient = {
  from: string;
  to: string;
  deep: string;
  soft: readonly [string, string];
  ring: string;
  ringSoft: string;
  hero?: readonly string[];
};

export type KitColors = {
  /** Default body/heading text colour. */
  text: string;
  /** Strong headline colour (KPI value, empty-state title). */
  strongText: string;
  /** Text drawn on top of the gradient (active tab, gradient pill). */
  onGradient: string;
  /** Text colour used inside the search input. */
  searchInputText: string;
  /** Toast body text colour. */
  toastText: string;
  muted: string;
  dim: string;
  border: string;
  card: string;
  cardSolid: string;
  green: string;
  /** Foreground colour for the `brand` StatusPill. */
  brandPill: string;
  /** Spinner colour inside a loading SecondaryButton. */
  secondarySpinner: string;
};

export type KitFonts = { bold: string; semi: string; med: string; xbold: string };

export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'pending';

export type ToastPaletteEntry = {
  Icon: any;
  accent: string;
  iconColor: string;
  iconBg: string;
  border: string;
  bg: string;
};

export type KitConfig = {
  grad: KitGradient;
  colors: KitColors;
  fonts: KitFonts;
  /** Which gradient stop tints standalone icons (KPI icon, empty state, loader). */
  accentStop: 'from' | 'to';
  /** Portal-specific `info` / `pending` toast colours. */
  toast: { info: ToastPaletteEntry; pending: ToastPaletteEntry };
  /**
   * Optional hook run inside GradientButton on every render. The superadmin
   * kit uses it to swap the module-scope stylesheet colours for the active
   * theme; it receives the kit's StyleSheet object and may mutate it.
   */
  useThemedSheet?: (sheet: Record<string, any>) => void;
};

export type PillKind = 'success' | 'warn' | 'info' | 'danger' | 'brand' | 'neutral';

const TOAST_MS = 5000;

export function inferToastKind(text: string, kind?: ToastKind): ToastKind {
  if (kind) return kind;
  const t = (text || '').toLowerCase();
  if (/(fail|error|invalid|required|denied|unable|rejected|not found|forbidden|crash)/.test(t)) return 'error';
  if (/(warn|caution|make sure|almost|partial)/.test(t)) return 'warning';
  if (/(pending|loading|sending|processing|wait|queued|running)/.test(t)) return 'pending';
  if (/(info|note|heads up|editing|tip|reminder)/.test(t)) return 'info';
  return 'success';
}

/**
 * useToast — portal-agnostic toast state hook (no tokens needed).
 */
export function useToast() {
  const [toast, setToast] = useState({
    visible: false,
    text: 'Saved',
    kind: 'success' as ToastKind,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setToast((t) => ({ ...t, visible: false }));
  }, []);

  const flash = useCallback((text = 'Saved', kind?: ToastKind) => {
    const resolved = inferToastKind(text, kind);
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, text, kind: resolved });
    timerRef.current = setTimeout(hide, TOAST_MS);
  }, [hide]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { toast, flash, hide };
}

type ButtonSize = 'sm' | 'md' | 'lg';

type GradientButtonProps = {
  onPress?: () => void; loading?: boolean; disabled?: boolean;
  children?: React.ReactNode; title?: string; Icon?: any; icon?: any; size?: ButtonSize; style?: any;
};

type SecondaryButtonProps = GradientButtonProps & { danger?: boolean };

/* ─────────────────────────────────────────────────────────────────
 * createKit
 * ───────────────────────────────────────────────────────────────── */
export function createKit(config: KitConfig) {
  const { grad: GRAD, colors: C, fonts: FONTS, accentStop } = config;
  const accent = GRAD[accentStop];
  // Always a function so the hook call below is unconditional.
  const useThemedSheet = config.useThemedSheet ?? (() => {});

  const PILL: Record<PillKind, { bg: string; bc: string; c: string }> = {
    success: { bg: 'rgba(16,185,129,0.14)', bc: 'rgba(16,185,129,0.32)', c: C.green },
    warn:    { bg: 'rgba(245,158,11,0.14)', bc: 'rgba(245,158,11,0.34)', c: '#FBBF24' },
    info:    { bg: 'rgba(59,130,246,0.14)', bc: 'rgba(59,130,246,0.32)', c: '#93C5FD' },
    danger:  { bg: 'rgba(239,68,68,0.14)',  bc: 'rgba(239,68,68,0.32)',  c: '#FCA5A5' },
    brand:   { bg: 'rgba(123,61,191,0.16)', bc: 'rgba(123,61,191,0.40)', c: C.brandPill },
    neutral: { bg: 'rgba(255,255,255,0.06)',bc: 'rgba(255,255,255,0.14)',c: C.muted },
  };

  const TOAST_PALETTE: Record<ToastKind, ToastPaletteEntry> = {
    success: {
      Icon: Check,
      accent: '#10B981',
      iconColor: '#6EE7B7',
      iconBg: 'rgba(16,185,129,0.18)',
      border: 'rgba(16,185,129,0.35)',
      bg: 'rgba(12, 18, 28, 0.94)',
    },
    error: {
      Icon: AlertTriangle,
      accent: '#EF4444',
      iconColor: '#FCA5A5',
      iconBg: 'rgba(239,68,68,0.18)',
      border: 'rgba(239,68,68,0.4)',
      bg: 'rgba(18, 10, 14, 0.94)',
    },
    warning: {
      Icon: AlertTriangle,
      accent: '#F59E0B',
      iconColor: '#FCD34D',
      iconBg: 'rgba(245,158,11,0.18)',
      border: 'rgba(245,158,11,0.4)',
      bg: 'rgba(18, 14, 8, 0.94)',
    },
    info: config.toast.info,
    pending: config.toast.pending,
  };

  /* ── Styles ─────────────────────────────────────────────────── */
  const k = StyleSheet.create({
    btn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 9, justifyContent: 'center',
    },
    secBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: 'transparent',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
    },

    card: {
      backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14,
    },
    sectionLabel: { color: C.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.8 },

    iconBox: {
      alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },

    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
    },
    pillDot: { width: 6, height: 6, borderRadius: 4 },
    pillText: { fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.3 },
    pillGrad: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start',
    },
    pillGradText: { color: C.onGradient, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.4 },

    tabsOuter: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14 },
    tabActive: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    },
    tabActiveText: { color: C.onGradient, fontFamily: FONTS.xbold, fontSize: 12.5 },
    tabInactive: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
    },
    tabInactiveText: { color: C.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
    tabCount: {
      paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.08)', minWidth: 20, alignItems: 'center',
    },
    tabCountText: { color: C.muted, fontFamily: FONTS.xbold, fontSize: 10 },
    tabCountActive: {
      paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.22)', minWidth: 20, alignItems: 'center',
    },
    tabCountActiveText: { color: C.onGradient, fontFamily: FONTS.xbold, fontSize: 10 },

    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      height: 34, paddingHorizontal: 11,
      borderRadius: 10, backgroundColor: C.cardSolid, borderColor: C.border, borderWidth: 1,
    },
    searchInput: {
      flex: 1, color: C.searchInputText, fontFamily: FONTS.med, fontSize: 12,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
    },

    toastHost: {
      ...(Platform.OS === 'web'
        ? { position: 'fixed' as any, bottom: 24, right: 24, top: 'auto' as any, left: 'auto' as any }
        : { position: 'absolute' as any, bottom: 24, right: 16 }),
      zIndex: 99999,
      elevation: 99999,
      maxWidth: 380,
      width: 360,
      pointerEvents: 'box-none' as any,
    },
    toastHostNarrow: {
      left: 12,
      right: 12,
      bottom: 16,
      width: 'auto' as any,
      maxWidth: '100%' as any,
    },
    toastCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      paddingLeft: 16,
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(18px)',
            cursor: 'pointer',
          } as any)
        : {}),
    },
    toastAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
    },
    toastIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toastText: {
      flex: 1,
      color: C.toastText,
      fontFamily: FONTS.semi,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: -0.1,
    },
    toastClose: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    toastProgressTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    toastProgressFill: {
      height: '100%',
    },

    kpiCard: {
      flex: 1, minWidth: 180, paddingVertical: 16, paddingHorizontal: 18,
      backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, gap: 10,
    },
    kpiLabel: { color: C.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.3 },
    kpiValue: { color: C.strongText, fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5 },
    kpiDelta: { fontFamily: FONTS.bold, fontSize: 11, marginTop: -4 },

    empty: {
      padding: 32, alignItems: 'center', gap: 10,
      backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    },
    emptyIcon: {
      width: 44, height: 44, borderRadius: 12,
      backgroundColor: GRAD.ringSoft, borderWidth: 1, borderColor: GRAD.ring,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { color: C.strongText, fontFamily: FONTS.xbold, fontSize: 13 },
    emptySub: { color: C.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },
  });

  /* ── GradientButton — primary CTA ───────────────────────────── */
  function GradientButton({
    onPress, loading, disabled, children, title, Icon, icon: iconProp, size = 'md', style,
  }: GradientButtonProps) {
    useThemedSheet(k);
    const pad = size === 'sm'
      ? { paddingHorizontal: 11, paddingVertical: 7 }
      : size === 'lg'
      ? { paddingHorizontal: 18, paddingVertical: 11 }
      : { paddingHorizontal: 14, paddingVertical: 9 };

    const TheIcon = Icon || iconProp;

    return (
      <Pressable
        onPress={onPress}
        disabled={loading || disabled}
        style={({ hovered }: any) => [
          { opacity: loading || disabled ? 0.6 : 1 },
          hovered && Platform.OS === 'web' ? { transform: [{ translateY: -1 }], cursor: 'pointer' } : null,
          style,
        ]}
      >
        <LinearGradient
          colors={[GRAD.from, GRAD.to]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[k.btn, pad]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : children ? (
            children
          ) : (
            <>
              {TheIcon && <TheIcon size={size === 'sm' ? 13 : 15} color="#fff" />}
              {title && (
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: size === 'sm' ? 12 : 13, letterSpacing: 0.2 }}>
                  {title}
                </Text>
              )}
            </>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  function SecondaryButton({
    onPress, loading, disabled, children, title, Icon, icon: iconProp, size = 'md', danger, style,
  }: SecondaryButtonProps) {
    const pad = size === 'sm'
      ? { paddingHorizontal: 11, paddingVertical: 7 }
      : { paddingHorizontal: 14, paddingVertical: 9 };

    const TheIcon = Icon || iconProp;

    return (
      <Pressable
        onPress={onPress}
        disabled={loading || disabled}
        style={({ hovered }: any) => [
          k.secBtn, pad,
          { opacity: loading || disabled ? 0.6 : 1 },
          danger && { borderColor: 'rgba(239,68,68,0.35)' },
          hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer' } : null,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={C.secondarySpinner} />
        ) : children ? (
          children
        ) : (
          <>
            {TheIcon && <TheIcon size={size === 'sm' ? 13 : 14} color={danger ? '#EF4444' : C.muted} />}
            {title && (
              <Text style={{ color: danger ? '#EF4444' : C.text, fontFamily: FONTS.bold, fontSize: size === 'sm' ? 12 : 13 }}>
                {title}
              </Text>
            )}
          </>
        )}
      </Pressable>
    );
  }

  /* ── Card / SectionLabel ────────────────────────────────────── */
  function Card({ children, style, padded = true }: {
    children: React.ReactNode; style?: any; padded?: boolean;
  }) {
    return <View style={[k.card, padded && { padding: 18 }, style]}>{children}</View>;
  }

  function SectionLabel({ children, style }: { children: React.ReactNode; style?: any }) {
    return <Text style={[k.sectionLabel, style]}>{children}</Text>;
  }

  /* ── IconBox — gradient-tinted icon container ───────────────── */
  function IconBox({ children, size = 32, tint }: {
    children: React.ReactNode; size?: number; tint?: string;
  }) {
    const bg = tint ? tint + '22' : GRAD.ringSoft;
    const bc = tint ? tint + '55' : GRAD.ring;
    return (
      <View style={[
        k.iconBox,
        { width: size, height: size, backgroundColor: bg, borderColor: bc, borderRadius: Math.max(8, size / 3.5) },
      ]}>
        {children}
      </View>
    );
  }

  /* ── StatusPill / GradientPill ──────────────────────────────── */
  function StatusPill({ label, kind = 'neutral', dot }: {
    label: string; kind?: PillKind; dot?: boolean;
  }) {
    const p = PILL[kind] || PILL.neutral;
    return (
      <View style={[k.pill, { backgroundColor: p.bg, borderColor: p.bc }]}>
        {dot && <View style={[k.pillDot, { backgroundColor: p.c }]} />}
        <Text style={[k.pillText, { color: p.c }]}>{label}</Text>
      </View>
    );
  }

  function GradientPill({ label, dot }: { label: string; dot?: boolean }) {
    return (
      <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={k.pillGrad}>
        {dot && <View style={[k.pillDot, { backgroundColor: '#fff' }]} />}
        <Text style={k.pillGradText}>{label}</Text>
      </LinearGradient>
    );
  }

  /* ── TopTabs — segment control (gradient on active) ─────────── */
  function TopTabs<T extends string>({
    tabs, active, onChange,
  }: {
    tabs: Array<{ id: T; label: string; icon?: any; count?: number }>;
    active: T;
    onChange: (id: T) => void;
  }) {
    return (
      <View style={k.tabsOuter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 6 }}>
          {tabs.map((t) => {
            const isActive = t.id === active;
            const Icon = t.icon;
            if (isActive) {
              return (
                <Pressable key={t.id} onPress={() => onChange(t.id)}>
                  <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={k.tabActive}>
                    {Icon && <Icon size={13} color="#fff" />}
                    <Text style={k.tabActiveText}>{t.label}</Text>
                    {typeof t.count === 'number' && (
                      <View style={k.tabCountActive}>
                        <Text style={k.tabCountActiveText}>{t.count}</Text>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={t.id}
                onPress={() => onChange(t.id)}
                style={({ hovered }: any) => [
                  k.tabInactive,
                  hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(255,255,255,0.05)' } : null,
                ]}
              >
                {Icon && <Icon size={12.5} color={C.muted} />}
                <Text style={k.tabInactiveText}>{t.label}</Text>
                {typeof t.count === 'number' && (
                  <View style={k.tabCount}>
                    <Text style={k.tabCountText}>{t.count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  /* ── SearchField ────────────────────────────────────────────── */
  function SearchField({ value, onChange, placeholder = 'Search…', width = 260 }: {
    value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string;
  }) {
    return (
      <View style={[k.searchBox, { width: width as any }]}>
        <Search size={13} color={C.dim} />
        <TextInput
          value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={C.dim}
          style={k.searchInput}
        />
      </View>
    );
  }

  /* ── Toast — bottom-right, 5s auto-dismiss, progress bar ────── */
  function Toast({
    text,
    visible,
    kind = 'success',
    onDismiss,
  }: {
    text: string;
    visible: boolean;
    kind?: ToastKind;
    onDismiss?: () => void;
  }) {
    const { width } = useWindowDimensions();
    const progress = useRef(new RNAnimated.Value(1)).current;
    const narrow = Platform.OS === 'web' ? width < 640 : width < 480;
    const palette = TOAST_PALETTE[kind] || TOAST_PALETTE.success;
    const Icon = palette.Icon;

    useEffect(() => {
      if (!visible) return;
      progress.setValue(1);
      const anim = RNAnimated.timing(progress, {
        toValue: 0,
        duration: TOAST_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      anim.start();
      return () => anim.stop();
    }, [visible, text, kind, progress]);

    if (!visible) return null;

    const widthPct = progress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    const node = (
      <View
        pointerEvents="box-none"
        // Critical for web: keep host free of transforms so position:fixed sticks to the viewport.
        style={[
          k.toastHost,
          narrow && k.toastHostNarrow,
          Platform.OS === 'web' && ({
            position: 'fixed',
            top: 'auto',
            left: narrow ? 16 : 'auto',
            right: 24,
            bottom: 24,
            zIndex: 2147483000,
            width: narrow ? 'auto' : 380,
            maxWidth: narrow ? 'calc(100vw - 32px)' : 380,
          } as any),
        ]}
      >
        <View
          accessibilityRole="alert"
          accessibilityLabel={`${kind}: ${text}`}
          style={[k.toastCard, { backgroundColor: palette.bg, borderColor: palette.border }]}
        >
          <View style={[k.toastAccent, { backgroundColor: palette.accent }]} />
          <View style={[k.toastIconWrap, { backgroundColor: palette.iconBg }]}>
            <Icon size={15} color={palette.iconColor} />
          </View>
          <Text style={k.toastText} numberOfLines={3}>{text}</Text>
          {!!onDismiss && (
            <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Dismiss notification" style={k.toastClose}>
              <X size={14} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
          <View style={k.toastProgressTrack}>
            <RNAnimated.View
              style={[k.toastProgressFill, { backgroundColor: palette.accent, width: widthPct as any }]}
            />
          </View>
        </View>
      </View>
    );

    // Portal to <body> on web so sidebar/scroll/transform ancestors cannot pin it mid-screen.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const ReactDOM = require('react-dom');
      return ReactDOM.createPortal(node, document.body);
    }
    return node;
  }

  /* ── KpiTile ────────────────────────────────────────────────── */
  function KpiTile({ Icon, label, value, delta, deltaKind = 'success' }: {
    Icon: any; label: string; value: string; delta?: string; deltaKind?: PillKind;
  }) {
    const dC = PILL[deltaKind].c;
    return (
      <View style={k.kpiCard}>
        <IconBox><Icon size={16} color={accent} /></IconBox>
        <Text style={k.kpiLabel}>{label}</Text>
        <Text style={k.kpiValue}>{value}</Text>
        {!!delta && <Text style={[k.kpiDelta, { color: dC }]}>{delta}</Text>}
      </View>
    );
  }

  /* ── Empty / Loading state ──────────────────────────────────── */
  function EmptyState({ icon: Icon, title, sub }: { icon?: any; title: string; sub?: string }) {
    return (
      <View style={k.empty}>
        {Icon && <View style={k.emptyIcon}><Icon size={20} color={accent} /></View>}
        <Text style={k.emptyTitle}>{title}</Text>
        {!!sub && <Text style={k.emptySub}>{sub}</Text>}
      </View>
    );
  }

  function LoadingBox() {
    return (
      <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
        <ActivityIndicator size="small" color={accent} />
        <Text style={k.emptySub}>Loading…</Text>
      </View>
    );
  }

  return {
    GradientButton, SecondaryButton, Card, SectionLabel, IconBox,
    StatusPill, GradientPill, TopTabs, SearchField, Toast,
    KpiTile, EmptyState, LoadingBox,
    styles: k,
  };
}
