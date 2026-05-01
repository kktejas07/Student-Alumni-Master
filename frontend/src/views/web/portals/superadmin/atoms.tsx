/**
 * Super Admin Portal — reusable atoms.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { SAC, FONTS } from './tokens';

export function Av({ initials, size = 38, color }: { initials: string; size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: color || SAC.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

const BADGE_COLORS = {
  amber:  { bg: 'rgba(251,191,36,0.15)', bc: 'rgba(251,191,36,0.30)', c: '#FCD34D' },
  orange: { bg: 'rgba(249,115,22,0.18)', bc: 'rgba(249,115,22,0.30)', c: '#FB923C' },
  green:  { bg: 'rgba(34,197,94,0.15)',  bc: 'rgba(34,197,94,0.30)',  c: '#86EFAC' },
  blue:   { bg: 'rgba(59,130,246,0.15)', bc: 'rgba(59,130,246,0.30)', c: '#93C5FD' },
  red:    { bg: 'rgba(239,68,68,0.15)',  bc: 'rgba(239,68,68,0.30)',  c: '#FCA5A5' },
  purple: { bg: 'rgba(167,139,250,0.18)',bc: 'rgba(167,139,250,0.35)',c: '#C4B5FD' },
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

export function KpiCard({ Icon, label, value, delta }: { Icon: LucideIcon; label: string; value: string; delta: string }) {
  const isUp = delta.includes('↑');
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiIcon}><Icon size={16} color={SAC.accent} /></View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiDelta, { color: isUp ? SAC.green : SAC.muted }]}>{delta}</Text>
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
    width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(251,191,36,0.10)',
    borderColor: 'rgba(251,191,36,0.20)', borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  kpiLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.3, marginBottom: 4 },
  kpiValue: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.5 },
  kpiDelta: { fontFamily: FONTS.med, fontSize: 11, marginTop: 4 },
});
