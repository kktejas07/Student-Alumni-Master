/**
 * Onboarding step — Role-specific details
 * ============================================
 * Per spec, each user role needs different fields:
 *
 * - STUDENT:  age (10+), education_level, career_interests
 * - ALUMNI:   employment_status, current_employer, current_role
 * - MENTOR:   category, organization, job_title, linkedin_url
 *
 * This screen renders ONLY the fields relevant to the user's role.
 * Validation is enforced before navigation continues to face-capture.
 */
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Button, Input, NeoCard, Chip } from '@/src/views/components';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

// Education level labels — used only in the Student variant
const EDU_LEVELS = [
  { id: 'plus_one', label: 'Class 11 (+1)' },
  { id: 'plus_two', label: 'Class 12 (+2)' },
  { id: 'btech', label: 'B.Tech / Engineering' },
  { id: 'bachelors', label: 'Bachelors' },
  { id: 'masters', label: 'Masters' },
  { id: 'phd', label: 'PhD' },
  { id: 'other', label: 'Other' },
] as const;

// Mentor categories per spec — 4 distinct (split startup vs business)
const MENTOR_CATEGORIES = [
  { id: 'it_software', label: 'IT / Software' },
  { id: 'higher_education', label: 'Higher Education' },
  { id: 'startup', label: 'Startup' },
  { id: 'business', label: 'Business' },
] as const;

// Alumni employment status per spec
const EMPLOYMENT_STATUSES = [
  { id: 'employed', label: 'Employed' },
  { id: 'self_employed', label: 'Self-employed' },
  { id: 'studying', label: 'Studying' },
  { id: 'between_jobs', label: 'Between jobs' },
] as const;

export default function RoleDetailsScreen() {
  const router = useRouter();
  // Pull role from authStore (set during register) — drives which fields render
  const user = useAuthStore((s) => s.user);
  const onboarding = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);
  // Local UI state — synced with the onboarding store on save
  const [ageStr, setAgeStr] = useState(
    onboarding.student_age ? String(onboarding.student_age) : ''
  );

  /** Validate role-specific fields before continuing. */
  const validate = (): boolean => {
    setError(null);
    if (user?.role === 'student') {
      const age = parseInt(ageStr, 10);
      if (!age || age < 10) {
        setError('Students must be at least 10 years old.');
        return false;
      }
      if (!onboarding.student_education_level) {
        setError('Please select your education level.');
        return false;
      }
    }
    if (user?.role === 'mentor') {
      if (!onboarding.mentor_category) {
        setError('Please select a mentorship category.');
        return false;
      }
      if (!onboarding.mentor_organization?.trim()) {
        setError('Organization / Company is required for mentors.');
        return false;
      }
      if (!onboarding.mentor_job_title?.trim()) {
        setError('Job Title / Designation is required for mentors.');
        return false;
      }
    }
    if (user?.role === 'alumni') {
      if (!onboarding.alumni_employment_status) {
        setError('Please select your employment status.');
        return false;
      }
      // If alumni opted in to mentor, require category pick
      if (onboarding.alumni_wants_to_mentor && !onboarding.alumni_mentor_category) {
        setError('Please pick a mentorship category to mentor students.');
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validate()) return;
    // Save age to store for students
    if (user?.role === 'student') {
      onboarding.setStudentInfo({ age: parseInt(ageStr, 10) });
    }
    // Students/alumni go to career path; mentors skip career path → straight to face capture
    if (user?.role === 'student' || user?.role === 'alumni') {
      router.push('/(onboarding)/career-path');
    } else {
      router.push('/(onboarding)/face-capture');
    }
  };

  // Don't render anything if role is unknown (defensive guard)
  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="role-details-back-btn" style={styles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.step}>STEP 2</Text>
          <Text style={styles.h1}>
            {user.role === 'student'
              ? 'About your studies'
              : user.role === 'mentor'
                ? 'Your professional profile'
                : 'Your alumni journey'}
          </Text>
          <Text style={styles.subtitle}>
            We use this to personalize your dashboard and recommendations.
          </Text>

          {/* ===== STUDENT-ONLY FIELDS ===== */}
          {user.role === 'student' && (
            <>
              <Input
                label="Age"
                placeholder="e.g., 17"
                keyboardType="numeric"
                value={ageStr}
                onChangeText={setAgeStr}
                testID="student-age-input"
              />

              <View style={styles.section}>
                <Text style={styles.label}>Education Level</Text>
                <View style={styles.chipRow}>
                  {EDU_LEVELS.map((e) => (
                    <Chip
                      key={e.id}
                      label={e.label}
                      active={onboarding.student_education_level === e.id}
                      // setStudentInfo accepts a partial — only education_level is updated here
                      onPress={() =>
                        onboarding.setStudentInfo({ education_level: e.id as any })
                      }
                      testID={`edu-level-${e.id}`}
                    />
                  ))}
                </View>
              </View>

              {/* Career Goal — per spec, free-text aspiration drives AI roadmap */}
              <Input
                label="What do you want to become? *"
                placeholder="e.g., Software Developer, UX Designer, Data Scientist"
                value={onboarding.student_career_goal || ''}
                onChangeText={(v) => onboarding.setStudentInfo({ career_goal: v })}
                testID="student-career-goal-input"
              />
              <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: -8 }]}>
                Your career aspiration powers the AI roadmap and personalized course / mentor matches.
              </Text>
            </>
          )}

          {/* ===== MENTOR-ONLY FIELDS ===== */}
          {user.role === 'mentor' && (
            <>
              {/* Pending review notice — sets expectation that mentor accounts are reviewed */}
              <NeoCard bg={C.palePurple} shadow="sm" style={{ marginBottom: Spacing.md }}>
                <Text style={[Typography.bodySm, { color: C.deepPurple }]}>
                  Mentor accounts are reviewed by our team for quality. You'll be notified once
                  approved (typically 24-48 hours).
                </Text>
              </NeoCard>

              <View style={styles.section}>
                <Text style={styles.label}>Mentorship Category</Text>
                <View style={styles.chipRow}>
                  {MENTOR_CATEGORIES.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.label}
                      active={onboarding.mentor_category === m.id}
                      onPress={() => onboarding.setMentorInfo({ mentor_category: m.id })}
                      testID={`mentor-cat-${m.id}`}
                    />
                  ))}
                </View>
              </View>

              <Input
                label="Organization / Company *"
                placeholder="e.g., Google, IIT Bombay, Your Startup"
                value={onboarding.mentor_organization || ''}
                onChangeText={(v) => onboarding.setMentorInfo({ mentor_organization: v })}
                testID="mentor-org-input"
              />

              <Input
                label="Job Title / Designation *"
                placeholder="e.g., Senior Engineer, Founder, Professor"
                value={onboarding.mentor_job_title || ''}
                onChangeText={(v) => onboarding.setMentorInfo({ mentor_job_title: v })}
                testID="mentor-title-input"
              />

              <Input
                label="LinkedIn URL (highly recommended)"
                placeholder="https://linkedin.com/in/yourname"
                autoCapitalize="none"
                keyboardType="url"
                value={onboarding.mentor_linkedin_url || ''}
                onChangeText={(v) => onboarding.setMentorInfo({ mentor_linkedin_url: v })}
                testID="mentor-linkedin-input"
              />

              <Input
                label="Years of Experience"
                placeholder="e.g., 5"
                keyboardType="numeric"
                value={
                  onboarding.mentor_years_of_experience
                    ? String(onboarding.mentor_years_of_experience)
                    : ''
                }
                onChangeText={(v) =>
                  onboarding.setMentorInfo({ mentor_years_of_experience: parseInt(v) || undefined })
                }
                testID="mentor-yoe-input"
              />
            </>
          )}

          {/* ===== ALUMNI-ONLY FIELDS ===== */}
          {user.role === 'alumni' && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Employment Status</Text>
                <View style={styles.chipRow}>
                  {EMPLOYMENT_STATUSES.map((s) => (
                    <Chip
                      key={s.id}
                      label={s.label}
                      active={onboarding.alumni_employment_status === s.id}
                      onPress={() =>
                        onboarding.setAlumniInfo({ alumni_employment_status: s.id })
                      }
                      testID={`alumni-status-${s.id}`}
                    />
                  ))}
                </View>
              </View>

              <Input
                label="Current Employer"
                placeholder="e.g., Microsoft, Tata Consultancy"
                value={onboarding.alumni_employer || ''}
                onChangeText={(v) => onboarding.setAlumniInfo({ alumni_employer: v })}
                testID="alumni-employer-input"
              />

              <Input
                label="Current Role"
                placeholder="e.g., Senior Software Engineer"
                value={onboarding.alumni_role || ''}
                onChangeText={(v) => onboarding.setAlumniInfo({ alumni_role: v })}
                testID="alumni-role-input"
              />

              {/* Per spec — "Including a LinkedIn profile link is highly recommended for alumni" */}
              <Input
                label="LinkedIn URL (highly recommended)"
                placeholder="https://linkedin.com/in/yourname"
                autoCapitalize="none"
                keyboardType="url"
                value={onboarding.alumni_linkedin_url || ''}
                onChangeText={(v) => onboarding.setAlumniInfo({ alumni_linkedin_url: v })}
                testID="alumni-linkedin-input"
              />
              <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: -8 }]}>
                Boosts credibility when students view your profile or book sessions.
              </Text>

              {/* Per spec — alumni can opt-in to mentor others by picking a category */}
              <NeoCard bg={C.palePurple} shadow="sm" style={{ marginTop: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyBold, { color: C.deepPurple }]}>
                      Want to mentor current students?
                    </Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]}>
                      Share your journey and earn through 1:1 sessions on the platform.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      onboarding.setAlumniInfo({
                        alumni_wants_to_mentor: !onboarding.alumni_wants_to_mentor,
                      })
                    }
                    testID="alumni-mentor-toggle"
                    style={[
                      styles.toggle,
                      onboarding.alumni_wants_to_mentor && styles.toggleOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        onboarding.alumni_wants_to_mentor && styles.toggleKnobOn,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </NeoCard>

              {/* If alumni opts in to mentor, ask category */}
              {onboarding.alumni_wants_to_mentor && (
                <View style={styles.section}>
                  <Text style={styles.label}>Mentorship Category *</Text>
                  <View style={styles.chipRow}>
                    {MENTOR_CATEGORIES.map((m) => (
                      <Chip
                        key={m.id}
                        label={m.label}
                        active={onboarding.alumni_mentor_category === m.id}
                        onPress={() =>
                          onboarding.setAlumniInfo({ alumni_mentor_category: m.id })
                        }
                        testID={`alumni-mentor-cat-${m.id}`}
                      />
                    ))}
                  </View>
                  <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4 }]}>
                    You'll be added to the mentor pool after admin review (24-48 hours).
                  </Text>
                </View>
              )}
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title="Continue →"
            onPress={next}
            testID="role-details-next-btn"
            style={{ marginTop: Spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 80 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  step: { ...Typography.label, color: C.textSecondary },
  h1: { ...Typography.h2, color: C.textPrimary, marginVertical: Spacing.xs },
  subtitle: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md },
  label: { ...Typography.label, color: C.textSecondary, marginBottom: 6 },
  section: { gap: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { ...Typography.bodySm, color: C.danger, marginTop: 4 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: C.brandPurple },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.white,
    alignSelf: 'flex-start',
  },
  toggleKnobOn: { alignSelf: 'flex-end' },
});
