/**
 * Atoms — small reusable building blocks for the Mentor Portal RN port.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { MC, FONTS } from './tokens';

export function Av({ initials, size = 42, color }: { initials: string; size?: number; color?: string }) {
  const bg = (color || MC.teal) + '28';
  const bd = (color || MC.teal) + '50';
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: bg, borderWidth: 2, borderColor: bd,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: FONTS.xbold, fontSize: size * 0.33, color: '#fff' }}>{initials}</Text>
    </View>
  );
}

const BADGE_COLORS = {
  teal:   { bg: 'rgba(20,184,166,0.15)', bc: 'rgba(20,184,166,0.30)', c: '#5EEAD4' },
  green:  { bg: 'rgba(34,197,94,0.15)',  bc: 'rgba(34,197,94,0.30)',  c: '#86EFAC' },
  amber:  { bg: 'rgba(245,158,11,0.15)', bc: 'rgba(245,158,11,0.30)', c: '#FCD34D' },
  blue:   { bg: 'rgba(59,130,246,0.15)', bc: 'rgba(59,130,246,0.30)', c: '#93C5FD' },
  gray:   { bg: 'rgba(255,255,255,0.07)',bc: 'rgba(255,255,255,0.14)',c: 'rgba(255,255,255,0.5)' },
  orange: { bg: 'rgba(249,115,22,0.15)', bc: 'rgba(249,115,22,0.30)', c: '#FDBA74' },
  purple: { bg: 'rgba(123,61,191,0.20)', bc: 'rgba(123,61,191,0.35)', c: '#C4B5FD' },
  red:    { bg: 'rgba(239,68,68,0.15)',  bc: 'rgba(239,68,68,0.30)',  c: '#FCA5A5' },
  pink:   { bg: 'rgba(236,72,153,0.15)', bc: 'rgba(236,72,153,0.30)', c: '#F9A8D4' },
} as const;
export type BadgeColor = keyof typeof BADGE_COLORS;

export function Badge({ label, color = 'teal' }: { label: string; color?: BadgeColor }) {
  const p = BADGE_COLORS[color] || BADGE_COLORS.gray;
  return (
    <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.bc }]}>
      <Text style={{ color: p.c, fontFamily: FONTS.bold, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s} size={size}
          color={s <= rating ? MC.amber : 'rgba(255,255,255,0.20)'}
          fill={s <= rating ? MC.amber : 'transparent'}
        />
      ))}
    </View>
  );
}

export function Countdown({ days }: { days: number }) {
  const isUrgent = days <= 3;
  const c = isUrgent ? MC.amber : MC.tealP;
  const bg = isUrgent ? 'rgba(245,158,11,0.15)' : 'rgba(20,184,166,0.12)';
  return (
    <View style={{
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
      backgroundColor: bg, borderColor: c + '40', borderWidth: 1,
    }}>
      <Text style={{ color: c, fontFamily: FONTS.xbold, fontSize: 9.5 }}>
        {days === 0 ? 'Today' : `${days}d`}
      </Text>
    </View>
  );
}

export function BarChart({ data }: { data: { month: string; amount: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.amount));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100, paddingHorizontal: 4 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = Math.round((d.amount / maxVal) * 84);
        return (
          <View key={d.month} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: isLast ? MC.amber : MC.dim }}>
              ₹{(d.amount / 1000).toFixed(0)}k
            </Text>
            <View
              style={{
                width: '100%', height: h, borderTopLeftRadius: 4, borderTopRightRadius: 4,
                backgroundColor: isLast ? MC.amber : MC.teal,
                opacity: isLast ? 1 : 0.55,
              }}
            />
            <Text style={{ fontSize: 10, color: isLast ? '#fff' : MC.dim, fontFamily: isLast ? FONTS.bold : FONTS.med }}>
              {d.month}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start',
  },
});
