/**
 * Student Portal — Apple HIG / Purple "PortalKit" design primitives.
 *
 * Mirrors the Super Admin `applekit.tsx` API so views share identical
 * component contracts. The only differences are:
 *   • Gradient identity is BRAND PURPLE (#7B3DBF → #5F259F)
 *   • Pulls tokens from the student `tokens.ts` (`SC`, `FONTS`)
 *
 * Exports:
 *   GRAD, GradientButton, SecondaryButton, Card, SectionLabel,
 *   IconBox, StatusPill, GradientPill, TopTabs, SearchField,
 *   useToast, Toast, KpiTile, EmptyState, LoadingBox
 *
 * Usage:
 *   import {
 *     GRAD, Card, IconBox, GradientButton, SectionLabel, KpiTile,
 *   } from '../portalkit';
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, Search } from 'lucide-react-native';
import { SC, FONTS } from './tokens';

/* ─────────────────────────────────────────────────────────────────
 * Gradient palette — Brand PURPLE (consistent identity)
 * ───────────────────────────────────────────────────────────────── */
export const GRAD = {
  from: '#7B3DBF',                                // purple 500
  to:   '#5F259F',                                // purple 700
  deep: '#3D1468',                                // purple 900
  soft: ['rgba(123,61,191,0.22)', 'rgba(95,37,159,0.10)'] as const,
  ring: 'rgba(123,61,191,0.32)',
  ringSoft: 'rgba(123,61,191,0.12)',
  hero: ['#7B3DBF', '#5F259F', '#EC4899'] as const,
} as const;

/* ─────────────────────────────────────────────────────────────────
 * GradientButton — primary purple CTA used everywhere
 * ───────────────────────────────────────────────────────────────── */
export function GradientButton({
  onPress, loading, disabled, children, size = 'md',
}: {
  onPress?: () => void; loading?: boolean; disabled?: boolean;
  children: React.ReactNode; size?: 'sm' | 'md' | 'lg';
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

export function SecondaryButton({ onPress, children, size = 'md', danger }: {
  onPress?: () => void; children: React.ReactNode; size?: 'sm' | 'md' | 'lg'; danger?: boolean;
}) {
  const pad = size === 'sm'
    ? { paddingHorizontal: 11, paddingVertical: 7 }
    : { paddingHorizontal: 14, paddingVertical: 9 };
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        k.secBtn, pad,
        danger && { borderColor: 'rgba(239,68,68,0.35)' },
        hovered && Platform.OS === 'web' ? { backgroundColor: 'rgba(255,255,255,0.05)' } : null,
      ]}
    >
      {children}
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Card — Apple HIG surface (hairline border + 14px radius)
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
 * IconBox — purple-tinted icon container (matches sidebar / KPIs)
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
 * StatusPill — coloured rounded pill (success/warn/info/danger/neutral)
 * ───────────────────────────────────────────────────────────────── */
const PILL = {
  success: { bg: 'rgba(16,185,129,0.14)', bc: 'rgba(16,185,129,0.32)', c: SC.green },
  warn:    { bg: 'rgba(245,158,11,0.14)', bc: 'rgba(245,158,11,0.34)', c: '#FBBF24' },
  info:    { bg: 'rgba(59,130,246,0.14)', bc: 'rgba(59,130,246,0.32)', c: '#93C5FD' },
  danger:  { bg: 'rgba(239,68,68,0.14)',  bc: 'rgba(239,68,68,0.32)',  c: '#FCA5A5' },
  brand:   { bg: 'rgba(123,61,191,0.16)', bc: 'rgba(123,61,191,0.40)', c: '#C4B5FD' },
  neutral: { bg: 'rgba(255,255,255,0.06)',bc: 'rgba(255,255,255,0.14)',c: SC.muted },
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
 * TopTabs — horizontal segment control with purple gradient on active
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
              {Icon && <Icon size={12.5} color={SC.muted} />}
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
      <Search size={13} color={SC.dim} />
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={SC.dim}
        style={k.searchInput}
      />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Toast hook + component (auto-save / action confirmation)
 * ───────────────────────────────────────────────────────────────── */
export function useToast() {
  const [toast, setToast] = useState({ visible: false, text: 'Saved' });
  const flash = useCallback((text = 'Saved') => {
    setToast({ visible: true, text });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1500);
  }, []);
  return { toast, flash };
}

export function Toast({ text, visible }: { text: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} style={k.toast} pointerEvents="none">
      <Check size={12} color={SC.green} />
      <Text style={k.toastText}>{text}</Text>
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * KpiTile — purple-accent metric tile for dashboards
 * ───────────────────────────────────────────────────────────────── */
export function KpiTile({ Icon, label, value, delta, deltaKind = 'success' }: {
  Icon: any; label: string; value: string; delta?: string; deltaKind?: PillKind;
}) {
  const dC = PILL[deltaKind].c;
  return (
    <View style={k.kpiCard}>
      <IconBox><Icon size={16} color={GRAD.from} /></IconBox>
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
      {Icon && <View style={k.emptyIcon}><Icon size={20} color={GRAD.from} /></View>}
      <Text style={k.emptyTitle}>{title}</Text>
      {!!sub && <Text style={k.emptySub}>{sub}</Text>}
    </View>
  );
}

export function LoadingBox() {
  return (
    <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator size="small" color={GRAD.from} />
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
    borderRadius: 9, borderWidth: 1, borderColor: SC.border, backgroundColor: 'transparent',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },

  card: {
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14,
  },
  sectionLabel: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1.8 },

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
  pillGradText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.4 },

  tabsOuter: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14 },
  tabActive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
  },
  tabActiveText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  tabInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  tabInactiveText: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12.5 },
  tabCount: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)', minWidth: 20, alignItems: 'center',
  },
  tabCountText: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 10 },
  tabCountActive: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)', minWidth: 20, alignItems: 'center',
  },
  tabCountActiveText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 10 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 34, paddingHorizontal: 11,
    borderRadius: 10, backgroundColor: SC.cardSolid, borderColor: SC.border, borderWidth: 1,
  },
  searchInput: {
    flex: 1, color: SC.text, fontFamily: FONTS.med, fontSize: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  toast: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.18)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)',
    maxWidth: 220, marginHorizontal: 'auto' as any,
  },
  toastText: { color: SC.green, fontFamily: FONTS.xbold, fontSize: 11.5 },

  kpiCard: {
    flex: 1, minWidth: 180, paddingVertical: 16, paddingHorizontal: 18,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, gap: 10,
  },
  kpiLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.3 },
  kpiValue: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5 },
  kpiDelta: { fontFamily: FONTS.bold, fontSize: 11, marginTop: -4 },

  empty: {
    padding: 32, alignItems: 'center', gap: 10,
    backgroundColor: SC.card, borderRadius: 14, borderWidth: 1, borderColor: SC.border,
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: GRAD.ringSoft, borderWidth: 1, borderColor: GRAD.ring,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: SC.text, fontFamily: FONTS.xbold, fontSize: 13 },
  emptySub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },
});
