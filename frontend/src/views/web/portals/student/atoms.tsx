/**
 * Student Portal — reusable atoms (Avatar, Badge, KpiCard, etc).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from './iconShims';
import { SC, FONTS } from './tokens';

export function Av({ initials, size = 40, color }: { initials: string; size?: number; color?: string }) {
  const bg = (color || SC.primary) + 'CC';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

const BADGE_COLORS = {
  teal:   { bg: 'rgba(20,184,166,0.15)', bc: 'rgba(20,184,166,0.30)', c: '#5EEAD4' },
  green:  { bg: 'rgba(34,197,94,0.15)',  bc: 'rgba(34,197,94,0.30)',  c: '#86EFAC' },
  amber:  { bg: 'rgba(245,158,11,0.15)', bc: 'rgba(245,158,11,0.30)', c: '#FCD34D' },
  blue:   { bg: 'rgba(59,130,246,0.15)', bc: 'rgba(59,130,246,0.30)', c: '#93C5FD' },
  purple: { bg: 'rgba(123,61,191,0.20)', bc: 'rgba(123,61,191,0.35)', c: '#C4B5FD' },
  red:    { bg: 'rgba(239,68,68,0.15)',  bc: 'rgba(239,68,68,0.30)',  c: '#FCA5A5' },
  pink:   { bg: 'rgba(236,72,153,0.15)', bc: 'rgba(236,72,153,0.30)', c: '#F9A8D4' },
  gray:   { bg: 'rgba(255,255,255,0.07)',bc: 'rgba(255,255,255,0.14)',c: 'rgba(255,255,255,0.5)' },
} as const;
export type BadgeColor = keyof typeof BADGE_COLORS;

export function Badge({ label, color = 'purple' }: { label: string; color?: BadgeColor }) {
  const p = BADGE_COLORS[color] || BADGE_COLORS.gray;
  return (
    <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.bc }]}>
      <Text style={{ color: p.c, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

export function KpiCard({
  Icon, label, value, delta, color = 'purple',
}: { Icon: LucideIcon; label: string; value: string; delta: string; color?: 'blue' | 'purple' | 'green' | 'amber' }) {
  const PALETTES = {
    blue:   { tint: 'rgba(37,99,235,0.18)',   border: 'rgba(96,165,250,0.30)',  ic: '#60A5FA' },
    purple: { tint: 'rgba(95,37,159,0.18)',   border: 'rgba(176,127,223,0.30)', ic: '#A78BFA' },
    green:  { tint: 'rgba(6,95,70,0.18)',     border: 'rgba(52,211,153,0.30)',  ic: '#34D399' },
    amber:  { tint: 'rgba(180,83,9,0.18)',    border: 'rgba(245,158,11,0.30)',  ic: '#F59E0B' },
  };
  const p = PALETTES[color];
  return (
    <View style={[styles.kpi, { backgroundColor: p.tint, borderColor: p.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={14} color={p.ic} />
        <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.4 }}>{label}</Text>
      </View>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 30, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ color: p.ic, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{delta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start',
  },
  kpi: {
    flex: 1, minWidth: 160, paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1,
  },
});
