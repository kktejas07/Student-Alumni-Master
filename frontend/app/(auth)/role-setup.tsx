/**
 * Role Setup — matches the SA Prototype (Student/Alumni/Mentor with inline
 * segment chips for Mentor).
 *
 * Single screen:
 *   • SA logo + "Who are you?" + helper subtitle
 *   • 3 horizontal role rows (icon left, title+desc, radio right)
 *   • Mentor row has a "RECOMMENDED" badge + inline segment chip selector
 *     (IT/Software, Higher Ed, Startup, Education)
 *   • Continue → completes setup and routes to next step
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useToast } from '@/src/views/components';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebPrimaryBtn } from '@/src/views/web/AuthWebControls';
import { SALogo } from '@/src/views/components';
import type { UserRole } from '@/src/models/entities';

const IS_WEB = Platform.OS === 'web';

type Role = 'student' | 'alumni' | 'mentor';

type MentorSegment = 'it_software' | 'higher_education' | 'startup' | 'business';

const ROLES: { id: Role; emoji: string; title: string; desc: string; recommended?: boolean }[] = [
  {
    id: 'student',
    emoji: '🎓',
    title: 'Student',
    desc: 'Currently studying — connect with alumni for guidance & opportunities',
  },
  {
    id: 'alumni',
    emoji: '💼',
    title: 'Alumni',
    desc: 'Graduated — grow your professional network and stay connected',
  },
  {
    id: 'mentor',
    emoji: '🧑‍🏫',
    title: 'Mentor',
    desc: 'Register to guide students — share expertise, book sessions & build your brand',
    recommended: true,
  },
];

const MENTOR_SEGMENTS: { id: MentorSegment; label: string }[] = [
  { id: 'it_software',      label: 'IT / Software' },
  { id: 'higher_education', label: 'Higher Ed' },
  { id: 'startup',          label: 'Startup' },
  { id: 'business',         label: 'Education' }, // "Education" maps to our 'business' bucket per prototype copy
];

export default function RoleSetup() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const onboarding = useOnboardingStore();

  const initial = (user?.role as Role) || 'student';
  const [role, setRole] = useState<Role>(initial === 'college' ? 'student' : initial);
  const [segment, setSegment] = useState<MentorSegment>('it_software');

  const onContinue = () => {
    if (role === 'mentor' && !segment) {
      toast.error('Pick a segment', 'Choose your mentorship area to continue.');
      return;
    }
    if (role === 'mentor') {
      onboarding.setMentorInfo({ mentor_category: segment });
      toast.success('Welcome, Mentor!', 'You are all set in the ' + (MENTOR_SEGMENTS.find((s) => s.id === segment)?.label) + ' segment.');
    } else {
      toast.success("You're all set!", `Welcome to your ${role} dashboard.`);
    }
    if (IS_WEB) {
      router.replace('/(auth)/email-verify');
    } else {
      router.replace('/(onboarding)/role-info');
    }
  };

  const Body = (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={styles.logoWrap}>
        <SALogo size={56} variant="glass" />
      </View>
      <Text style={styles.title}>Who are you?</Text>
      <Text style={styles.sub}>Help us personalise your experience</Text>

      <View style={{ width: '100%', marginTop: 12, gap: 10 }}>
        {ROLES.map((r) => {
          const active = role === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setRole(r.id)}
              testID={`role-row-${r.id}`}
              style={({ hovered, pressed }: any) => [
                styles.row,
                hovered && !active && { borderColor: 'rgba(196,181,253,0.30)', backgroundColor: 'rgba(124,58,237,0.10)' },
                active && styles.rowActive,
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
            >
              {/* Recommended badge (Mentor) */}
              {r.recommended && (
                <View style={styles.recBadge}>
                  <Text style={styles.recBadgeText}>RECOMMENDED</Text>
                </View>
              )}

              <View style={styles.rowTop}>
                <View style={[styles.rowIcon, active && styles.rowIconActive]}>
                  <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                </View>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.rowTitle}>{r.title}</Text>
                  <Text style={styles.rowDesc}>{r.desc}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </View>

              {/* Inline segment chips for Mentor — ALWAYS visible per prototype */}
              {r.id === 'mentor' && (
                <View style={styles.segments}>
                  {MENTOR_SEGMENTS.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={(e: any) => {
                        // Tapping a segment auto-selects Mentor role too
                        e?.stopPropagation?.();
                        setRole('mentor');
                        setSegment(s.id);
                      }}
                      testID={`mentor-segment-${s.id}`}
                      style={({ hovered }: any) => [
                        styles.segChip,
                        active && segment === s.id && styles.segChipActive,
                        hovered && (!active || segment !== s.id) && { backgroundColor: 'rgba(255,255,255,0.10)' },
                      ]}
                    >
                      <Text style={[styles.segText, active && segment === s.id && styles.segTextActive]}>{s.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ width: '100%', marginTop: 22 }}>
        <WebPrimaryBtn label="Continue →" onPress={onContinue} testID="role-setup-continue-btn" />
      </View>
    </View>
  );

  if (IS_WEB) {
    return (
      <AuthWebShell variant="center" cardMaxWidth={460}>
        {Body}
      </AuthWebShell>
    );
  }

  return (
    <SafeAreaView style={nativeStyles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={nativeStyles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {Body}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  logoWrap: { marginTop: 4, marginBottom: 16, alignItems: 'center' },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 6,
  },

  row: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...({ cursor: 'pointer', transitionDuration: '200ms' } as any),
  },
  rowActive: {
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconActive: {
    backgroundColor: 'rgba(124,58,237,0.30)',
    borderColor: 'rgba(196,181,253,0.45)',
  },
  rowTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 16, letterSpacing: -0.2 },
  rowDesc:  { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, lineHeight: 17, marginTop: 4 },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.14)' },
  radioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED' },

  recBadge: {
    position: 'absolute',
    top: 0, right: 0,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 12,
    zIndex: 2,
  },
  recBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.8,
  },

  // segment chips
  segments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  segChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  segChipActive: {
    backgroundColor: 'rgba(176,127,223,0.30)',
    borderColor: 'rgba(196,181,253,0.55)',
  },
  segText:       { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 12 },
  segTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
});

const nativeStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0820' },
  container: { padding: 22, paddingBottom: 60 },
});
