/**
 * RoleCards — 2x2 grid of role selection cards.
 * Updated to match SA Auth Flow v2 spec:
 *   - Lucide icons (was emoji)
 *   - Staggered fade-in animation (0s, 0.07s, 0.14s, 0.21s)
 *   - Box-shadow glow on icon when selected
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, GraduationCap, UserCheck, Award, Building2, type LucideIcon } from 'lucide-react-native';
import { AC, FONTS } from './tokens';

export type Role = 'student' | 'mentor' | 'alumni' | 'college';

const ROLES: { id: Role; Icon: LucideIcon; label: string; sub: string; gradient: [string, string]; shadow: string; delay: number }[] = [
  { id: 'student', Icon: GraduationCap, label: 'Student',           sub: 'Internships, mentors & career guidance',  gradient: [AC.student, '#A78BFA'], shadow: 'rgba(124,58,237,0.30)', delay:    0 },
  { id: 'mentor',  Icon: UserCheck,     label: 'Mentor',             sub: 'Guide students & earn on your schedule',  gradient: [AC.mentor,  '#5EEAD4'], shadow: 'rgba(20,184,166,0.30)', delay:   70 },
  { id: 'alumni',  Icon: Award,         label: 'Alumni',             sub: 'Stay connected & give back to juniors',   gradient: [AC.alumni,  '#FCD34D'], shadow: 'rgba(245,158,11,0.30)', delay:  140 },
  { id: 'college', Icon: Building2,     label: 'College / University', sub: 'Manage your institution on SA platform', gradient: [AC.college, '#818CF8'], shadow: 'rgba(99,102,241,0.30)', delay:  210 },
];

function FadeUpCard({ delay, children }: { delay: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: Platform.OS !== 'web', easing: Easing.out(Easing.cubic) }),
      Animated.timing(ty,      { toValue: 0, duration: 380, delay, useNativeDriver: Platform.OS !== 'web', easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [delay]);
  return <Animated.View style={{ opacity, transform: [{ translateY: ty }], width: '48%' as any, minWidth: 180 }}>{children}</Animated.View>;
}

export function RoleCards({ value, onChange }: { value: Role | null; onChange: (r: Role) => void }) {
  return (
    <View style={s.grid}>
      {ROLES.map((r) => {
        const on = value === r.id;
        const Icon = r.Icon;
        return (
          <FadeUpCard key={r.id} delay={r.delay}>
            <Pressable
              onPress={() => onChange(r.id)}
              style={[s.card, on && [s.cardOn, { borderColor: r.gradient[0], ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 0 1px ${r.gradient[0]}, 0 12px 32px ${r.shadow}` } as any) : {}) }]]}
            >
              <View style={s.head}>
                <LinearGradient
                  colors={r.gradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[s.iconBox, (Platform.OS === 'web' ? ({ boxShadow: `0 4px 14px ${r.shadow}` } as any) : {})]}
                >
                  <Icon size={24} color="#fff" strokeWidth={2.2} />
                </LinearGradient>
                <View style={[s.dot, on ? { backgroundColor: r.gradient[0], borderColor: r.gradient[0] } : null]}>
                  {on && <Check size={12} color="#fff" strokeWidth={3} />}
                </View>
              </View>
              <Text style={s.label}>{r.label}</Text>
              <Text numberOfLines={2} style={s.sub}>{r.sub}</Text>
            </Pressable>
          </FadeUpCard>
        );
      })}
    </View>
  );
}

export const ROLE_META: Record<Role, { label: string; emoji: string; gradient: [string, string]; Icon: LucideIcon }> = {
  student: { label: ROLES[0].label, emoji: '🎓', gradient: ROLES[0].gradient, Icon: ROLES[0].Icon },
  mentor:  { label: ROLES[1].label, emoji: '👨‍💼', gradient: ROLES[1].gradient, Icon: ROLES[1].Icon },
  alumni:  { label: ROLES[2].label, emoji: '🏆', gradient: ROLES[2].gradient, Icon: ROLES[2].Icon },
  college: { label: ROLES[3].label, emoji: '🏫', gradient: ROLES[3].gradient, Icon: ROLES[3].Icon },
};

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { width: '100%', padding: 16, borderRadius: 16, backgroundColor: AC.card, borderWidth: 1, borderColor: AC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.18s ease' } as any) : {}) },
  cardOn: { backgroundColor: AC.cardOn },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16, marginBottom: 4 },
  sub: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 13, lineHeight: 19 },
});
