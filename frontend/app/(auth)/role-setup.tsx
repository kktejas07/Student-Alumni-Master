/**
 * Role Setup — lightweight quick-setup screen shown right after Register.
 * Flow:  Register → role-setup → email-verify (web) | role-info (native deep onboarding) | home
 *
 * Step 1: pick role (Student / Alumni / Mentor / College)
 * Step 2: 2–3 quick role-specific fields
 * Step 3: confirmation → continue
 *
 * The full multi-step onboarding (role-info, school-info, role-details,
 * career-path, face-capture, success) is still available later for users
 * who want to flesh out their profile.
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, GraduationCap, Briefcase, Users, Building2, Sparkles, Check } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useToast } from '@/src/views/components';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebField, WebPrimaryBtn, WebGhostBtn, WebStepBar } from '@/src/views/web/AuthWebControls';
import type { UserRole } from '@/src/models/entities';

const IS_WEB = Platform.OS === 'web';

const ROLES: { id: UserRole; emoji: string; title: string; sub: string; tint: string; Icon: any }[] = [
  { id: 'student', emoji: '🎓', title: 'Student',  sub: 'Class 11+ / College',           tint: '#A78BFA', Icon: GraduationCap },
  { id: 'alumni',  emoji: '🤝', title: 'Alumni',   sub: 'Graduated, paying it forward',  tint: '#34D399', Icon: Users },
  { id: 'mentor',  emoji: '💼', title: 'Mentor',   sub: 'Industry / Faculty pro',        tint: '#FCD34D', Icon: Briefcase },
  { id: 'college', emoji: '🏛️', title: 'College',  sub: 'Institution admin',             tint: '#F472B6', Icon: Building2 },
];

const STUDENT_INTERESTS = ['AI/ML', 'Web Dev', 'Mobile Dev', 'Design', 'Data Science', 'Product', 'Marketing', 'Finance'];
const STUDENT_GOALS     = ['Job', 'Higher Education', 'Startup', 'Freelance'];
const MENTOR_AREAS      = ['IT / Software', 'Higher Education', 'Startup', 'Business', 'Design', 'Marketing'];

export default function RoleSetup() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const onboarding = useOnboardingStore();

  // Pre-fill role from registered user (or default to student)
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [role, setRole] = useState<UserRole>((user?.role as UserRole) || 'student');
  const [submitting, setSubmitting] = useState(false);

  // Role-specific quick fields
  const [careerGoal, setCareerGoal] = useState<string>('Job');
  const [interests, setInterests] = useState<string[]>([]);
  const [gradYear, setGradYear] = useState('');
  const [employer, setEmployer] = useState('');
  const [expertise, setExpertise] = useState<string>('');
  const [linkedin, setLinkedin] = useState('');
  const [collegeName, setCollegeName] = useState('');

  const toggleInterest = (i: string) =>
    setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  const goNext = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      // Validate role-specific minimum
      if (role === 'student' && !careerGoal) {
        toast.error('Pick a goal', 'Choose a primary career path.');
        return;
      }
      if (role === 'alumni' && !gradYear) {
        toast.error('Add graduation year', 'We need it to connect you with peers.');
        return;
      }
      if (role === 'mentor' && !expertise) {
        toast.error('Pick an expertise', 'Choose your primary mentorship area.');
        return;
      }
      if (role === 'college' && !collegeName.trim()) {
        toast.error('Add institution', 'Tell us your college name.');
        return;
      }
      setStep(2);
      return;
    }
  };

  const finish = async () => {
    setSubmitting(true);
    // Save quick prefs into onboarding store so the deep onboarding can pick them up.
    if (role === 'student') {
      onboarding.setStudentInfo({ career_interests: interests });
      onboarding.setCareerPath(
        careerGoal === 'Job' ? 'job' :
        careerGoal === 'Higher Education' ? 'higher_education' :
        careerGoal === 'Startup' ? 'startup' : 'business'
      );
      onboarding.setInterests(interests);
    }
    if (role === 'alumni') {
      onboarding.setSchoolInfo({ graduation_year: parseInt(gradYear, 10) || undefined });
      onboarding.setAlumniInfo({ alumni_employer: employer || undefined, alumni_linkedin_url: linkedin || undefined });
    }
    if (role === 'mentor') {
      onboarding.setMentorInfo({
        mentor_category: (
          expertise === 'IT / Software' ? 'it_software' :
          expertise === 'Higher Education' ? 'higher_education' :
          expertise === 'Startup' ? 'startup' : 'business'
        ),
        mentor_linkedin_url: linkedin || undefined,
      });
    }
    if (role === 'college') {
      onboarding.setSchoolInfo({ institution_name: collegeName });
    }

    toast.success("You're all set!", `Welcome to your ${role} dashboard.`);
    setSubmitting(false);

    // Native: continue with deep onboarding (role-info & friends)
    // Web:   go to email verification → 2FA → /platform
    if (IS_WEB) {
      router.replace('/(auth)/email-verify');
    } else {
      router.replace('/(onboarding)/role-info');
    }
  };

  const Body = (
    <View style={{ width: '100%' }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => (step > 0 ? setStep((s) => (s - 1) as any) : router.back())}
          style={({ hovered }: any) => [styles.backBtn, hovered && { opacity: 1 }]}
          testID="role-setup-back-btn"
        >
          <ArrowLeft size={18} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <WebStepBar steps={['Pick role', 'Quick prefs', 'Done']} current={step} />
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Step 0 — pick role */}
      {step === 0 && (
        <View>
          <Text style={styles.title}>How do you want to{'\n'}use Student Alumni?</Text>
          <Text style={styles.sub}>Pick the role that fits you best — you can always switch later.</Text>
          <View style={styles.rolesGrid}>
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  testID={`role-tile-${r.id}`}
                  style={({ hovered, pressed }: any) => [
                    styles.roleTile,
                    hovered && !active && { borderColor: 'rgba(196,181,253,0.30)', backgroundColor: 'rgba(124,58,237,0.10)' },
                    active && { borderColor: r.tint, backgroundColor: 'rgba(124,58,237,0.16)', shadowColor: r.tint, shadowOpacity: 0.4, shadowRadius: 24 },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={[styles.roleIcon, active && { backgroundColor: r.tint + '33', borderColor: r.tint + '88' }]}>
                    <Text style={{ fontSize: 28 }}>{r.emoji}</Text>
                  </View>
                  <Text style={styles.roleTitle}>{r.title}</Text>
                  <Text style={styles.roleSub} numberOfLines={2}>{r.sub}</Text>
                  {active && (
                    <View style={[styles.roleCheck, { backgroundColor: r.tint }]}>
                      <Check size={12} color="#0F0820" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <WebPrimaryBtn label="Continue →" onPress={goNext} testID="role-setup-continue-btn" />
        </View>
      )}

      {/* Step 1 — quick prefs */}
      {step === 1 && (
        <View>
          <Text style={styles.title}>Quick set-up{'\n'}for {ROLES.find((r) => r.id === role)?.title.toLowerCase()}s</Text>
          <Text style={styles.sub}>Just 2–3 things, then you're in.</Text>

          {/* STUDENT */}
          {role === 'student' && (
            <>
              <Text style={styles.sectionLabel}>What's your primary path?</Text>
              <View style={styles.chipRow}>
                {STUDENT_GOALS.map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setCareerGoal(g)}
                    testID={`career-${g}`}
                    style={({ hovered }: any) => [
                      styles.chip,
                      careerGoal === g && styles.chipActive,
                      hovered && careerGoal !== g && { backgroundColor: 'rgba(255,255,255,0.10)' },
                    ]}
                  >
                    <Text style={[styles.chipText, careerGoal === g && styles.chipTextActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Pick a few interests (optional)</Text>
              <View style={styles.chipRow}>
                {STUDENT_INTERESTS.map((i) => (
                  <Pressable
                    key={i}
                    onPress={() => toggleInterest(i)}
                    testID={`interest-${i}`}
                    style={({ hovered }: any) => [
                      styles.chip,
                      interests.includes(i) && styles.chipActive,
                      hovered && !interests.includes(i) && { backgroundColor: 'rgba(255,255,255,0.10)' },
                    ]}
                  >
                    <Text style={[styles.chipText, interests.includes(i) && styles.chipTextActive]}>{i}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* ALUMNI */}
          {role === 'alumni' && (
            <>
              <WebField label="Graduation year" placeholder="e.g., 2020" keyboardType="numeric" value={gradYear} onChangeText={setGradYear} testID="alumni-grad-year-input" />
              <WebField label="Current employer (optional)" placeholder="e.g., Microsoft, Stripe" value={employer} onChangeText={setEmployer} testID="alumni-employer-input" autoCapitalize="words" />
              <WebField label="LinkedIn URL (recommended)" placeholder="https://linkedin.com/in/..." keyboardType="url" value={linkedin} onChangeText={setLinkedin} testID="alumni-linkedin-input" />
            </>
          )}

          {/* MENTOR */}
          {role === 'mentor' && (
            <>
              <Text style={styles.sectionLabel}>Primary expertise</Text>
              <View style={styles.chipRow}>
                {MENTOR_AREAS.map((a) => (
                  <Pressable
                    key={a}
                    onPress={() => setExpertise(a)}
                    testID={`mentor-${a}`}
                    style={({ hovered }: any) => [
                      styles.chip,
                      expertise === a && styles.chipActive,
                      hovered && expertise !== a && { backgroundColor: 'rgba(255,255,255,0.10)' },
                    ]}
                  >
                    <Text style={[styles.chipText, expertise === a && styles.chipTextActive]}>{a}</Text>
                  </Pressable>
                ))}
              </View>
              <WebField label="LinkedIn URL (recommended)" placeholder="https://linkedin.com/in/..." keyboardType="url" value={linkedin} onChangeText={setLinkedin} testID="mentor-linkedin-input" />
            </>
          )}

          {/* COLLEGE */}
          {role === 'college' && (
            <>
              <WebField label="Institution name" placeholder="e.g., IIT Bombay" value={collegeName} onChangeText={setCollegeName} testID="college-name-input" autoCapitalize="words" />
              <WebField label="Website (optional)" placeholder="https://your-college.edu" keyboardType="url" value={linkedin} onChangeText={setLinkedin} testID="college-website-input" />
            </>
          )}

          <WebPrimaryBtn label="Continue →" onPress={goNext} testID="role-setup-step1-continue-btn" />
        </View>
      )}

      {/* Step 2 — done */}
      {step === 2 && (
        <View style={{ alignItems: 'center', paddingVertical: 4 }}>
          <View style={styles.successRing}>
            <Sparkles size={36} color="#FCD34D" />
          </View>
          <Text style={[styles.title, { textAlign: 'center', marginTop: 6 }]}>You're all set! 🎉</Text>
          <Text style={[styles.sub, { textAlign: 'center', maxWidth: 360 }]}>
            We've personalised your dashboard for{' '}
            <Text style={{ color: '#C4B5FD', fontFamily: 'DMSans_700Bold' }}>
              {ROLES.find((r) => r.id === role)?.title}
            </Text>{' '}
            mode. You can refine your profile any time from settings.
          </Text>

          <View style={{ width: '100%', marginTop: 18 }}>
            <WebPrimaryBtn label={IS_WEB ? 'Verify email & continue →' : 'Complete profile →'} onPress={finish} loading={submitting} testID="role-setup-finish-btn" />
            <View style={{ height: 10 }} />
            <WebGhostBtn
              label="Go to dashboard"
              onPress={async () => {
                if (IS_WEB) router.replace('/platform');
                else router.replace('/(tabs)');
              }}
              testID="role-setup-skip-btn"
            />
          </View>
        </View>
      )}
    </View>
  );

  // ─── Web ────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <AuthWebShell variant="center" cardMaxWidth={520}>
        {Body}
      </AuthWebShell>
    );
  }

  // ─── Native ─────────────────────────────────────────────────────────────
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  backBtn: {
    width: 32, height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.85,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 8,
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 22,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  chipActive: { backgroundColor: 'rgba(124,58,237,0.25)', borderColor: '#7C3AED' },
  chipText: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },

  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  roleTile: {
    flexBasis: '47%', flexGrow: 1,
    paddingVertical: 18, paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    gap: 6,
    position: 'relative',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  roleIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ transitionDuration: '200ms' } as any),
  },
  roleTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 15, marginTop: 6 },
  roleSub:   { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, lineHeight: 16 },
  roleCheck: {
    position: 'absolute',
    top: 12, right: 12,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  successRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(252,211,77,0.18)',
    borderWidth: 2, borderColor: 'rgba(252,211,77,0.50)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
});

const nativeStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0820' },
  container: { padding: 22, paddingBottom: 60 },
});
