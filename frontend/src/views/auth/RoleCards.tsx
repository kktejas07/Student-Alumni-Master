/**
 * RoleCards — 2x2 grid of role selection cards.
 * Migrated to NativeWind className.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, GraduationCap, UserCheck, Award, Building2, type LucideIcon } from 'lucide-react-native';

export type Role = 'student' | 'mentor' | 'alumni' | 'college';

const ROLES: { id: Role; Icon: LucideIcon; label: string; sub: string; gradient: [string, string]; shadow: string; delay: number }[] = [
  { id: 'student', Icon: GraduationCap, label: 'Student',           sub: 'Internships, mentors & career guidance',  gradient: ['#7C3AED', '#A78BFA'], shadow: 'rgba(124,58,237,0.30)', delay:    0 },
  { id: 'mentor',  Icon: UserCheck,     label: 'Mentor',             sub: 'Guide students & earn on your schedule',  gradient: ['#F59E0B', '#5EEAD4'], shadow: 'rgba(20,184,166,0.30)', delay:   70 },
  { id: 'alumni',  Icon: Award,         label: 'Alumni',             sub: 'Stay connected & give back to juniors',   gradient: ['#FB923C', '#FCD34D'], shadow: 'rgba(245,158,11,0.30)', delay:  140 },
  { id: 'college', Icon: Building2,     label: 'College / University', sub: 'Manage your institution', gradient: ['#3B82F6', '#818CF8'], shadow: 'rgba(99,102,241,0.30)', delay:  210 },
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
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: ty }], width: '48%', minWidth: 180 }}>
      {children}
    </Animated.View>
  );
}

export function RoleCards({ value, onChange }: { value: Role | null; onChange: (r: Role) => void }) {
  return (
    <View className="flex-row flex-wrap gap-3 mb-6">
      {ROLES.map((r) => {
        const on = value === r.id;
        const Icon = r.Icon;
        return (
          <FadeUpCard key={r.id} delay={r.delay}>
            <Pressable
              onPress={() => onChange(r.id)}
              className={`w-full p-4 rounded-2xl border ${
                on ? 'bg-gray-100' : 'bg-gray-50'
              } ${on ? '' : 'border-gray-200'}`}
              style={{
                borderColor: on ? r.gradient[0] : '#E5E7EB',
                ...(Platform.OS === 'web' && on ? { boxShadow: `0 0 0 1px ${r.gradient[0]}, 0 12px 32px ${r.shadow}`, cursor: 'pointer', transition: 'all 0.18s ease' } : {}),
                ...(Platform.OS === 'web' && !on ? { cursor: 'pointer', transition: 'all 0.18s ease' } : {}),
              }}
            >
              <View className="flex-row justify-between items-start mb-3.5">
                <LinearGradient
                  colors={r.gradient as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-12 h-12 rounded-[14px] items-center justify-center"
                  style={Platform.OS === 'web' ? { boxShadow: `0 4px 14px ${r.shadow}` } : undefined}
                >
                  <Icon size={24} color="#fff" strokeWidth={2.2} />
                </LinearGradient>
                <View
                  className={`w-[22px] h-[22px] rounded-full border-2 items-center justify-center ${
                    on ? '' : 'border-gray-300'
                  }`}
                  style={on ? { backgroundColor: r.gradient[0], borderColor: r.gradient[0] } : undefined}
                >
                  {on && <Check size={12} color="#fff" strokeWidth={3} />}
                </View>
              </View>
              <Text className="text-gray-900 font-display text-lg mb-1">{r.label}</Text>
              <Text numberOfLines={2} className="text-gray-500 font-body text-[13px] leading-[19px]">{r.sub}</Text>
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
  card: { width: '100%', padding: 16, borderRadius: 16, backgroundColor: 'rgba(18, 20, 43, 0.75)', borderWidth: 1, borderColor: 'rgba(139, 132, 255, 0.22)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.18s ease' } as any) : {}) },
  cardOn: { backgroundColor: 'rgba(91, 79, 233, 0.25)', borderColor: '#8B84FF' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(139, 132, 255, 0.4)', alignItems: 'center', justifyContent: 'center' },
  label: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 16, marginBottom: 4 },
  sub: { color: '#9AA0B4', fontFamily: FONTS.med, fontSize: 13, lineHeight: 19 },
});
