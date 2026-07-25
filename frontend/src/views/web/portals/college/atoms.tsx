/**
 * College Admin Portal — reusable atoms.
 */
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { CC, FONTS } from './tokens';

export function Av({ initials, size = 40, color, photo }: { initials: string; size?: number; color?: string; photo?: string | null }) {
  const bg = (color || CC.primary);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: size * 0.36, letterSpacing: 0.3 }}>{initials}</Text>
      )}
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
  Icon, label, value, delta, color = 'purple',
}: { Icon?: any; label: string; value: string; delta: string; color?: 'blue' | 'purple' | 'green' | 'amber' | 'red' | string }) {
  const PALETTES: any = {
    blue:   { tint: 'rgba(37,99,235,0.18)',   border: 'rgba(96,165,250,0.30)',  ic: '#60A5FA' },
    purple: { tint: 'rgba(95,37,159,0.18)',   border: 'rgba(176,127,223,0.30)', ic: '#A78BFA' },
    green:  { tint: 'rgba(6,95,70,0.18)',     border: 'rgba(52,211,153,0.30)',  ic: '#34D399' },
    amber:  { tint: 'rgba(180,83,9,0.18)',    border: 'rgba(245,158,11,0.30)',  ic: '#F59E0B' },
    red:    { tint: 'rgba(239,68,68,0.18)',   border: 'rgba(248,113,113,0.30)', ic: '#F87171' },
  };
  const p = PALETTES[color] || PALETTES.purple;
  const IconComp = Icon;
  return (
    <View style={[styles.kpi, { backgroundColor: p.tint, borderColor: p.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {IconComp && <IconComp size={14} color={p.ic} />}
        <Text style={{ color: CC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.4 }}>{label}</Text>
      </View>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 30, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: p.ic, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{delta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  kpi: { flex: 1, minWidth: 180, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  kpiIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
