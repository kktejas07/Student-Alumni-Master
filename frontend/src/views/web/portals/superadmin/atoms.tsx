/**
 * Super Admin Portal — reusable atoms.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from './tokens';

export function Av({ initials, size = 38, color }: { initials: string; size?: number; color?: string }) {
  const T = useSAC();
  Object.assign(styles, resolveColors(styles, T));
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: color || SAC.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

const BADGE_COLORS = {
  amber:  { bg: 'rgba(251,191,36,0.15)', bc: 'rgba(251,191,36,0.30)', c: '#FCD34D' },
  orange: { bg: 'rgba(249,115,22,0.18)', bc: 'rgba(249,115,22,0.30)', c: '#FB923C' },
  green:  { bg: 'rgba(34,197,94,0.15)',  bc: 'rgba(34,197,94,0.30)',  c: '#86EFAC' },
  blue:   { bg: 'rgba(59,130,246,0.15)', bc: 'rgba(59,130,246,0.30)', c: '#93C5FD' },
  red:    { bg: 'rgba(239,68,68,0.15)',  bc: 'rgba(239,68,68,0.30)',  c: '#FCA5A5' },
  purple: { bg: 'rgba(37,99,235,0.18)',bc: 'rgba(37,99,235,0.35)',c: '#93C5FD' },
  gray:   { bg: 'rgba(255,255,255,0.07)',bc: 'rgba(255,255,255,0.14)',c: 'rgba(255,255,255,0.5)' },
} as const;
export type BadgeColor = keyof typeof BADGE_COLORS;

export function Badge({ label, color = 'amber' }: { label: string; color?: BadgeColor }) {
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
    purple: { tint: 'rgba(95,37,159,0.18)',   border: 'rgba(176,127,223,0.30)', ic: '#60A5FA' },
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
        <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.4 }}>{label}</Text>
      </View>
      <Text style={{ color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 30, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: p.ic, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{delta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start' },
  kpi: {
    flex: 1, minWidth: 200, paddingVertical: 16, paddingHorizontal: 18,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14,
  },
  kpiIcon: {
    width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(245,158,11,0.10)',
    borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  kpiLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.3, marginBottom: 4 },
  kpiValue: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5 },
  kpiDelta: { fontFamily: FONTS.med, fontSize: 11, marginTop: 4 },
});
