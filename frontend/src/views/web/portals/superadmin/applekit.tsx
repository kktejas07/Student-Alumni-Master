/**
 * Apple HIG Design Kit — Super Admin portal.
 *
 * Shared primitives so every Super Admin view (Overview, Approvals, Colleges,
 * Students, Mentors, Alumni, Events, Payments, Analytics, AI Insights,
 * Workflows) renders with the same warm-orange gradient identity, hairline
 * borders, 14px radii, and Apple-style auto-save toast.
 *
 * Import as:
 *   import { GRAD, GradientButton, Card, IconBox, StatusPill, TopTabs,
 *            SearchField, useToast, Toast, SectionLabel } from '../applekit';
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform, ScrollView,
  ActivityIndicator, Animated as RNAnimated, Easing, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Search, AlertTriangle, Info, Loader, X } from 'lucide-react-native';
import { SAC, FONTS } from './tokens';

/* ─────────────────────────────────────────────────────────────────
 * Gradient palette (warm orange → amber, matches Settings spec)
 * ───────────────────────────────────────────────────────────────── */
export const GRAD = {
  from: '#FB923C',   // orange 400
  to:   '#F59E0B',   // amber 500
  deep: '#D97706',   // amber 600
  soft: ['rgba(251,146,60,0.20)', 'rgba(245,158,11,0.10)'] as const,
  ring: 'rgba(245,158,11,0.30)',
  ringSoft: 'rgba(245,158,11,0.10)',
} as const;

/* ─────────────────────────────────────────────────────────────────
 * GradientButton — primary CTA used everywhere
 * ───────────────────────────────────────────────────────────────── */
export function GradientButton({
  onPress, loading, disabled, children, size = 'md', style,
}: {
  onPress?: () => void; loading?: boolean; disabled?: boolean;
  children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; style?: any;
}) {
  const pad = size === 'sm'
    ? { paddingHorizontal: 11, paddingVertical: 7 }
    : size === 'lg'
    ? { paddingHorizontal: 18, paddingVertical: 11 }
    : { paddingHorizontal: 14, paddingVertical: 9 };
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ hovered }: any) => [
        { opacity: loading || disabled ? 0.6 : 1 },
        hovered && Platform.OS === 'web' ? { transform: [{ translateY: -1 }] } : null,
        style,
      ]}
    >
      <LinearGradient
        colors={[GRAD.from, GRAD.to]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[k.btn, pad]}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : children}
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ onPress, loading, disabled, children, size = 'md', danger, style }: {
  onPress?: () => void; loading?: boolean; disabled?: boolean;
  children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; danger?: boolean; style?: any;
}) {
  const pad = size === 'sm'
    ? { paddingHorizontal: 11, paddingVertical: 7 }
    : { paddingHorizontal: 14, paddingVertical: 9 };
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ hovered }: any) => [
        k.secBtn, pad,
        { opacity: loading || disabled ? 0.6 : 1 },
        danger && { borderColor: 'rgba(239,68,68,0.35)' },
        hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(255,255,255,0.05)' } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color="#7C3AED" /> : children}
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Card — standard surface with hairline border + 14px radius
 * ───────────────────────────────────────────────────────────────── */
export function Card({ children, style, padded = true }: {
  children: React.ReactNode; style?: any; padded?: boolean;
}) {
  return <View style={[k.card, padded && { padding: 18 }, style]}>{children}</View>;
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[k.sectionLabel, style]}>{children}</Text>;
}

/* ─────────────────────────────────────────────────────────────────
 * IconBox — gradient-tinted icon container
 * ───────────────────────────────────────────────────────────────── */
export function IconBox({ children, size = 32, tint }: {
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

/* ─────────────────────────────────────────────────────────────────
 * StatusPill — coloured rounded pill (success/warn/info/neutral/grad)
 * ───────────────────────────────────────────────────────────────── */
const PILL = {
  success: { bg: 'rgba(16,185,129,0.14)', bc: 'rgba(16,185,129,0.32)', c: SAC.green },
  warn:    { bg: 'rgba(245,158,11,0.14)', bc: 'rgba(245,158,11,0.34)', c: '#FBBF24' },
  info:    { bg: 'rgba(59,130,246,0.14)', bc: 'rgba(59,130,246,0.32)', c: '#93C5FD' },
  danger:  { bg: 'rgba(239,68,68,0.14)',  bc: 'rgba(239,68,68,0.32)',  c: '#FCA5A5' },
  brand:   { bg: 'rgba(123,61,191,0.16)', bc: 'rgba(123,61,191,0.40)', c: '#C4B5FD' },
  neutral: { bg: 'rgba(255,255,255,0.06)',bc: 'rgba(255,255,255,0.14)',c: SAC.muted },
} as const;
export type PillKind = keyof typeof PILL;

export function StatusPill({ label, kind = 'neutral', dot }: {
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

export function GradientPill({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <LinearGradient colors={[GRAD.from, GRAD.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={k.pillGrad}>
      {dot && <View style={[k.pillDot, { backgroundColor: '#fff' }]} />}
      <Text style={k.pillGradText}>{label}</Text>
    </LinearGradient>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * TopTabs — horizontal segment control (gradient on active)
 * ───────────────────────────────────────────────────────────────── */
export function TopTabs<T extends string>({
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
              {Icon && <Icon size={12.5} color={SAC.muted} />}
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

/* ─────────────────────────────────────────────────────────────────
 * SearchField — Apple-style search input
 * ───────────────────────────────────────────────────────────────── */
export function SearchField({ value, onChange, placeholder = 'Search…', width = 260 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string;
}) {
  return (
    <View style={[k.searchBox, { width: width as any }]}>
      <Search size={13} color={SAC.dim} />
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={SAC.dim}
        style={k.searchInput}
      />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Toast hook + component
 * Bottom-right, 5s auto-dismiss, progress bar, status colors.
 * ───────────────────────────────────────────────────────────────── */
export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'pending';

const TOAST_MS = 5000;

function inferToastKind(text: string, kind?: ToastKind): ToastKind {
  if (kind) return kind;
  const t = (text || '').toLowerCase();
  if (/(fail|error|invalid|required|denied|unable|rejected|not found|forbidden|crash)/.test(t)) return 'error';
  if (/(warn|caution|make sure|almost|partial)/.test(t)) return 'warning';
  if (/(pending|loading|sending|processing|wait|queued|running)/.test(t)) return 'pending';
  if (/(info|note|heads up|editing|tip|reminder)/.test(t)) return 'info';
  return 'success';
}

const TOAST_PALETTE: Record<ToastKind, {
  Icon: any;
  accent: string;
  iconColor: string;
  iconBg: string;
  border: string;
  bg: string;
}> = {
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
  info: {
    Icon: Info,
    accent: '#818CF8',
    iconColor: '#C7D2FE',
    iconBg: 'rgba(99,102,241,0.18)',
    border: 'rgba(129,140,248,0.4)',
    bg: 'rgba(12, 12, 24, 0.94)',
  },
  pending: {
    Icon: Loader,
    accent: '#FB923C',
    iconColor: '#FDBA74',
    iconBg: 'rgba(251,146,60,0.18)',
    border: 'rgba(251,146,60,0.4)',
    bg: 'rgba(18, 12, 8, 0.94)',
  },
};

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

export function Toast({
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
          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            accessibilityLabel="Dismiss notification"
            style={k.toastClose}
          >
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

/* ─────────────────────────────────────────────────────────────────
 * KpiTile — gradient-accent metric tile for dashboards
 * ───────────────────────────────────────────────────────────────── */
export function KpiTile({ Icon, label, value, delta, deltaKind = 'success' }: {
  Icon: any; label: string; value: string; delta?: string; deltaKind?: PillKind;
}) {
  const dC = PILL[deltaKind].c;
  return (
    <View style={k.kpiCard}>
      <IconBox><Icon size={16} color={GRAD.to} /></IconBox>
      <Text style={k.kpiLabel}>{label}</Text>
      <Text style={k.kpiValue}>{value}</Text>
      {!!delta && <Text style={[k.kpiDelta, { color: dC }]}>{delta}</Text>}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Empty / Loading state
 * ───────────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, sub }: { icon?: any; title: string; sub?: string }) {
  return (
    <View style={k.empty}>
      {Icon && <View style={k.emptyIcon}><Icon size={20} color={GRAD.to} /></View>}
      <Text style={k.emptyTitle}>{title}</Text>
      {!!sub && <Text style={k.emptySub}>{sub}</Text>}
    </View>
  );
}

export function LoadingBox() {
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator size="small" color={GRAD.to} />
      <Text style={k.emptySub}>Loading…</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Styles
 * ───────────────────────────────────────────────────────────────── */
const k = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 9, justifyContent: 'center',
  },
  secBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 9, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'transparent',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },

  card: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14,
  },
  sectionLabel: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.8 },

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
  pillGradText: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.4 },

  tabsOuter: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14 },
  tabActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
  },
  tabActiveText: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 12.5 },
  tabInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  tabInactiveText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
  tabCount: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)', minWidth: 20, alignItems: 'center',
  },
  tabCountText: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10 },
  tabCountActive: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)', minWidth: 20, alignItems: 'center',
  },
  tabCountActiveText: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 10 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 34, paddingHorizontal: 11,
    borderRadius: 10, backgroundColor: SAC.cardSolid, borderColor: SAC.border, borderWidth: 1,
  },
  searchInput: {
    flex: 1, color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 12,
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
    color: '#fff',
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
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, gap: 10,
  },
  kpiLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.3 },
  kpiValue: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5 },
  kpiDelta: { fontFamily: FONTS.bold, fontSize: 11, marginTop: -4 },

  empty: {
    padding: 32, alignItems: 'center', gap: 10,
    backgroundColor: SAC.card, borderRadius: 14, borderWidth: 1, borderColor: SAC.border,
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: GRAD.ringSoft, borderWidth: 1, borderColor: GRAD.ring,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 13 },
  emptySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },
});
