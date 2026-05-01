/**
 * RoleCards — 2x2 grid of role selection cards.
 * Tapping a card highlights it; parent decides what happens on confirm.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { AC, FONTS } from './tokens';

export type Role = 'student' | 'mentor' | 'alumni' | 'college';

const ROLES: { id: Role; emoji: string; label: string; sub: string; gradient: [string, string]; shadow: string }[] = [
  { id: 'student', emoji: '🎓', label: 'Student',           sub: 'Internships, mentors & career guidance',  gradient: [AC.student, '#A78BFA'], shadow: 'rgba(124,58,237,0.30)' },
  { id: 'mentor',  emoji: '👨\u200D💼', label: 'Mentor',     sub: 'Guide students & earn on your schedule',  gradient: [AC.mentor,  '#5EEAD4'], shadow: 'rgba(20,184,166,0.30)' },
  { id: 'alumni',  emoji: '🏆', label: 'Alumni',            sub: 'Stay connected & give back to juniors',   gradient: [AC.alumni,  '#FCD34D'], shadow: 'rgba(245,158,11,0.30)' },
  { id: 'college', emoji: '🏫', label: 'College / University', sub: 'Manage your institution on SA platform', gradient: [AC.college, '#818CF8'], shadow: 'rgba(99,102,241,0.30)' },
];

export function RoleCards({ value, onChange }: { value: Role | null; onChange: (r: Role) => void }) {
  return (
    <View style={s.grid}>
      {ROLES.map((r) => {
        const on = value === r.id;
        return (
          <Pressable
            key={r.id}
            onPress={() => onChange(r.id)}
            style={[s.card, on && [s.cardOn, { borderColor: r.gradient[0], shadowColor: r.shadow, ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 0 1px ${r.gradient[0]}, 0 12px 32px ${r.shadow}` } as any) : {}) }]]}
          >
            <View style={s.head}>
              <LinearGradient
                colors={r.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.iconBox, on && (Platform.OS === 'web' ? ({ boxShadow: `0 6px 20px ${r.shadow}` } as any) : {})]}
              >
                <Text style={s.iconEmoji}>{r.emoji}</Text>
              </LinearGradient>
              <View style={[s.dot, on ? { backgroundColor: r.gradient[0], borderColor: r.gradient[0] } : null]}>
                {on && <Check size={12} color="#fff" strokeWidth={3} />}
              </View>
            </View>
            <Text style={s.label}>{r.label}</Text>
            <Text numberOfLines={2} style={s.sub}>{r.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const ROLE_META: Record<Role, { label: string; emoji: string; gradient: [string, string] }> = {
  student: { label: ROLES[0].label, emoji: ROLES[0].emoji, gradient: ROLES[0].gradient },
  mentor:  { label: ROLES[1].label, emoji: ROLES[1].emoji, gradient: ROLES[1].gradient },
  alumni:  { label: ROLES[2].label, emoji: ROLES[2].emoji, gradient: ROLES[2].gradient },
  college: { label: ROLES[3].label, emoji: ROLES[3].emoji, gradient: ROLES[3].gradient },
};

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { width: '48%', minWidth: 180, padding: 16, borderRadius: 16, backgroundColor: AC.card, borderWidth: 1, borderColor: AC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.18s ease' } as any) : {}) },
  cardOn: { backgroundColor: AC.cardOn, borderColor: AC.borderOn },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16, marginBottom: 4 },
  sub: { color: AC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 18 },
});
