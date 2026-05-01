/**
 * College Admin Portal — reusable atoms.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { CC, FONTS } from './tokens';

export function Av({ initials, size = 40, color }: { initials: string; size?: number; color?: string }) {
  const bg = (color || CC.primary);
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: size * 0.36, letterSpacing: 0.3 }}>{initials}</Text>
    </View>
  );
}

const BADGE_COLORS = {
  cyan:    { bg: 'rgba(34,211,238,0.15)', bc: 'rgba(34,211,238,0.30)', c: '#67E8F9' },
  green:   { bg: 'rgba(34,197,94,0.15)',  bc: 'rgba(34,197,94,0.30)',  c: '#86EFAC' },
  amber:   { bg: 'rgba(245,158,11,0.15)', bc: 'rgba(245,158,11,0.30)', c: '#FCD34D' },
  blue:    { bg: 'rgba(59,130,246,0.15)', bc: 'rgba(59,130,246,0.30)', c: '#93C5FD' },
  purple:  { bg: 'rgba(167,139,250,0.18)',bc: 'rgba(167,139,250,0.35)',c: '#C4B5FD' },
  red:     { bg: 'rgba(239,68,68,0.15)',  bc: 'rgba(239,68,68,0.30)',  c: '#FCA5A5' },
  indigo:  { bg: 'rgba(99,102,241,0.18)', bc: 'rgba(99,102,241,0.30)', c: '#A5B4FC' },
  pink:    { bg: 'rgba(236,72,153,0.15)', bc: 'rgba(236,72,153,0.30)', c: '#F9A8D4' },
  gray:    { bg: 'rgba(255,255,255,0.07)',bc: 'rgba(255,255,255,0.14)',c: 'rgba(255,255,255,0.5)' },
} as const;
export type BadgeColor = keyof typeof BADGE_COLORS;

export function Badge({ label, color = 'indigo' }: { label: string; color?: BadgeColor }) {
  const p = BADGE_COLORS[color] || BADGE_COLORS.gray;
  return (
    <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.bc }]}>
      <Text style={{ color: p.c, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

export function KpiCard({
  Icon, label, value, delta, color = 'blue',
}: { Icon: LucideIcon; label: string; value: string; delta: string; color?: 'blue' | 'purple' | 'green' | 'amber' }) {
  const PALETTES = {
    blue:   { tint: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.25)', ic: '#22D3EE' },
    purple: { tint: 'rgba(167,139,250,0.10)',border: 'rgba(167,139,250,0.25)',ic: '#A78BFA' },
    green:  { tint: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  ic: '#34D399' },
    amber:  { tint: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', ic: '#FBBF24' },
  };
  const p = PALETTES[color];
  const isUp = delta.includes('↑');
  return (
    <View style={[styles.kpi, { backgroundColor: p.tint, borderColor: p.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <View style={[styles.kpiIcon, { backgroundColor: p.ic + '24' }]}><Icon size={14} color={p.ic} /></View>
        <Text style={{ color: CC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.3 }}>{label}</Text>
      </View>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 28, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: isUp ? CC.green : p.ic, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{delta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  kpi: { flex: 1, minWidth: 180, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  kpiIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
