/**
 * Admin primitives — GlassCard, KpiCard, MiniBar, StatusChip, ActionButton.
 */
import { ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ViewStyle } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { ADMIN_THEME as T } from './theme';

interface CardProps { children: ReactNode; style?: ViewStyle | ViewStyle[]; padding?: number; }
export function GlassCard({ children, style, padding = 18 }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style as any]}>
      {children}
    </View>
  );
}

interface KpiProps {
  icon: any; label: string; value: string | number;
  note?: string; noteUp?: boolean;
}
export function KpiCard({ icon: Icon, label, value, note, noteUp }: KpiProps) {
  const tone = noteUp ? T.good : T.bad;
  return (
    <GlassCard padding={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={styles.kpiIcon}>
          <Icon size={18} color={T.light} />
        </View>
        {note && (
          <View style={[styles.note, { backgroundColor: tone + '22', borderColor: tone + '55' }]}>
            {noteUp ? <TrendingUp size={10} color={tone} /> : <TrendingDown size={10} color={tone} />}
            <Text style={[styles.noteText, { color: tone }]}>{note}</Text>
          </View>
        )}
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </GlassCard>
  );
}

export function MiniBar({ data, color, height = 48 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(1, ...data);
  const c = color || T.mid;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(2, (v / max) * height),
            borderTopLeftRadius: 3, borderTopRightRadius: 3,
            backgroundColor: i === data.length - 1 ? c : c + '70',
          }}
        />
      ))}
    </View>
  );
}

export function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: 'good' | 'bad' | 'warn' | 'neutral' }) {
  const colors = {
    good:    { bg: 'rgba(16,185,129,0.18)', fg: '#10B981', bd: 'rgba(16,185,129,0.45)' },
    bad:     { bg: 'rgba(239,68,68,0.18)',  fg: '#EF4444', bd: 'rgba(239,68,68,0.45)'  },
    warn:    { bg: 'rgba(245,158,11,0.20)', fg: T.light,    bd: T.borderMd               },
    neutral: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.65)', bd: 'rgba(255,255,255,0.18)' },
  } as const;
  const c = colors[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg, borderColor: c.bd }]}>
      <Text style={[styles.chipText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

interface BtnProps { label: string; onPress?: () => void; variant?: 'primary' | 'ghost' | 'danger'; icon?: any; testID?: string; }
export function ActionButton({ label, onPress, variant = 'primary', icon: Icon, testID }: BtnProps) {
  const bg =
    variant === 'primary' ? T.accent
    : variant === 'danger' ? 'rgba(239,68,68,0.20)'
    : 'rgba(255,255,255,0.06)';
  const border =
    variant === 'danger' ? 'rgba(239,68,68,0.45)'
    : variant === 'ghost' ? 'rgba(255,255,255,0.18)'
    : T.borderMd;
  const fg = variant === 'danger' ? '#FCA5A5' : T.text;
  const grad = variant === 'primary' && Platform.OS === 'web'
    ? ({ backgroundImage: `linear-gradient(135deg,${T.accent},${T.mid})` } as any) : {};
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ hovered, pressed }: any) => [
        styles.btn, { backgroundColor: bg, borderColor: border }, grad,
        hovered && { opacity: 0.92 }, pressed && { opacity: 0.85 },
      ]}
    >
      {Icon && <Icon size={14} color={fg} />}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1,
    borderRadius: 16,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)' } as any) : {}),
  },
  kpiIcon: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  noteText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  kpiValue: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 28, lineHeight: 28, marginTop: 14, letterSpacing: -0.5 },
  kpiLabel: { color: T.textMute, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  chipText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  btnText: { fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
});
