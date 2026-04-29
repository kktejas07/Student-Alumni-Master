/**
 * Onboarding step 3 — Role-specific details (Web split-screen + Native dark theme).
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { OnboardingShell, DarkChip, DarkInfoCard, DarkToggle } from '@/src/views/web/OnboardingShell';
import { WebField } from '@/src/views/web/AuthWebControls';

const EDU_LEVELS = [
  { id: 'plus_one', label: 'Class 11 (+1)' },
  { id: 'plus_two', label: 'Class 12 (+2)' },
  { id: 'btech', label: 'B.Tech / Engineering' },
  { id: 'bachelors', label: 'Bachelors' },
  { id: 'masters', label: 'Masters' },
  { id: 'phd', label: 'PhD' },
  { id: 'other', label: 'Other' },
] as const;
const MENTOR_CATEGORIES = [
  { id: 'it_software', label: 'IT / Software' },
  { id: 'higher_education', label: 'Higher Education' },
  { id: 'startup', label: 'Startup' },
  { id: 'business', label: 'Business' },
] as const;
const EMPLOYMENT_STATUSES = [
  { id: 'employed', label: 'Employed' },
  { id: 'self_employed', label: 'Self-employed' },
  { id: 'studying', label: 'Studying' },
  { id: 'between_jobs', label: 'Between jobs' },
] as const;
const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function RoleDetailsScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const onboarding = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);
  const [ageStr, setAgeStr] = useState(
    onboarding.student_age ? String(onboarding.student_age) : ''
  );

  const validate = (): boolean => {
    setError(null);
    if (user?.role === 'student') {
      const age = parseInt(ageStr, 10);
      if (!age || age < 10) { setError('Students must be at least 10 years old.'); return false; }
      if (!onboarding.student_education_level) { setError('Please select your education level.'); return false; }
    }
    if (user?.role === 'mentor') {
      if (!onboarding.mentor_category) { setError('Please select a mentorship category.'); return false; }
      if (!onboarding.mentor_organization?.trim()) { setError('Organization / Company is required.'); return false; }
      if (!onboarding.mentor_job_title?.trim()) { setError('Job Title / Designation is required.'); return false; }
    }
    if (user?.role === 'alumni') {
      if (!onboarding.alumni_employment_status) { setError('Please select your employment status.'); return false; }
      if (onboarding.alumni_wants_to_mentor && !onboarding.alumni_mentor_category) {
        setError('Please pick a mentorship category to mentor students.'); return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validate()) {
      if (error) toast.error('Check your details', error);
      return;
    }
    if (user?.role === 'student') onboarding.setStudentInfo({ age: parseInt(ageStr, 10) });
    if (user?.role === 'student' || user?.role === 'alumni') {
      router.push('/(onboarding)/career-path');
    } else {
      router.push('/(onboarding)/face-capture');
    }
  };

  // Fall back to 'student' if auth state hasn't rehydrated yet — this avoids
  // a blank screen on direct navigation/refresh while zustand restores from storage.
  const role = (user?.role || 'student') as 'student' | 'mentor' | 'alumni' | 'college';

  return (
    <OnboardingShell
      step={2}
      stepBarSteps={STEPS}
      title={
        role === 'student' ? 'About your studies' :
        role === 'mentor'  ? 'Your professional profile' :
                                  'Your alumni journey'
      }
      subtitle="We use this to personalize your dashboard and recommendations."
      primaryLabel="Continue →"
      primaryTestID="role-details-next-btn"
      onPrimary={next}
      onBack={() => router.back()}
    >
      {/* Student fields */}
      {role === 'student' && (
        <>
          <WebField
            label="Age"
            placeholder="e.g., 17"
            keyboardType="numeric"
            value={ageStr}
            onChangeText={setAgeStr}
            testID="student-age-input"
          />
          <Text style={styles.section}>Education Level</Text>
          <View style={styles.chipRow}>
            {EDU_LEVELS.map((e) => (
              <DarkChip
                key={e.id}
                label={e.label}
                active={onboarding.student_education_level === e.id}
                onPress={() => onboarding.setStudentInfo({ education_level: e.id as any })}
                testID={`edu-level-${e.id}`}
              />
            ))}
          </View>
          <WebField
            label="What do you want to become? *"
            placeholder="e.g., Software Developer, UX Designer, Data Scientist"
            value={onboarding.student_career_goal || ''}
            onChangeText={(v: string) => onboarding.setStudentInfo({ career_goal: v })}
            testID="student-career-goal-input"
            helper="Your career aspiration powers the AI roadmap and personalized matches."
          />
        </>
      )}

      {/* Mentor fields */}
      {role === 'mentor' && (
        <>
          <DarkInfoCard tone="info">
            <Text style={styles.infoText}>
              📝 Mentor accounts are reviewed by our team for quality. You'll be notified once approved (24–48 hours).
            </Text>
          </DarkInfoCard>
          <Text style={styles.section}>Mentorship Category</Text>
          <View style={styles.chipRow}>
            {MENTOR_CATEGORIES.map((m) => (
              <DarkChip
                key={m.id}
                label={m.label}
                active={onboarding.mentor_category === m.id}
                onPress={() => onboarding.setMentorInfo({ mentor_category: m.id })}
                testID={`mentor-cat-${m.id}`}
              />
            ))}
          </View>
          <WebField label="Organization / Company *" placeholder="e.g., Google, IIT Bombay, Your Startup" value={onboarding.mentor_organization || ''} onChangeText={(v: string) => onboarding.setMentorInfo({ mentor_organization: v })} testID="mentor-org-input" />
          <WebField label="Job Title / Designation *" placeholder="e.g., Senior Engineer, Founder, Professor" value={onboarding.mentor_job_title || ''} onChangeText={(v: string) => onboarding.setMentorInfo({ mentor_job_title: v })} testID="mentor-title-input" />
          <WebField label="LinkedIn URL (highly recommended)" placeholder="https://linkedin.com/in/yourname" keyboardType="url" value={onboarding.mentor_linkedin_url || ''} onChangeText={(v: string) => onboarding.setMentorInfo({ mentor_linkedin_url: v })} testID="mentor-linkedin-input" />
          <WebField label="Years of Experience" placeholder="e.g., 5" keyboardType="numeric" value={onboarding.mentor_years_of_experience ? String(onboarding.mentor_years_of_experience) : ''} onChangeText={(v: string) => onboarding.setMentorInfo({ mentor_years_of_experience: parseInt(v) || undefined })} testID="mentor-yoe-input" />
        </>
      )}

      {/* Alumni fields */}
      {role === 'alumni' && (
        <>
          <Text style={styles.section}>Employment Status</Text>
          <View style={styles.chipRow}>
            {EMPLOYMENT_STATUSES.map((s) => (
              <DarkChip
                key={s.id}
                label={s.label}
                active={onboarding.alumni_employment_status === s.id}
                onPress={() => onboarding.setAlumniInfo({ alumni_employment_status: s.id })}
                testID={`alumni-status-${s.id}`}
              />
            ))}
          </View>
          <WebField label="Current Employer" placeholder="e.g., Microsoft, Tata Consultancy" value={onboarding.alumni_employer || ''} onChangeText={(v: string) => onboarding.setAlumniInfo({ alumni_employer: v })} testID="alumni-employer-input" />
          <WebField label="Current Role" placeholder="e.g., Senior Software Engineer" value={onboarding.alumni_role || ''} onChangeText={(v: string) => onboarding.setAlumniInfo({ alumni_role: v })} testID="alumni-role-input" />
          <WebField
            label="LinkedIn URL (highly recommended)"
            placeholder="https://linkedin.com/in/yourname"
            keyboardType="url"
            value={onboarding.alumni_linkedin_url || ''}
            onChangeText={(v: string) => onboarding.setAlumniInfo({ alumni_linkedin_url: v })}
            testID="alumni-linkedin-input"
            helper="Boosts credibility when students view your profile."
          />
          <View style={styles.toggleCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Want to mentor current students?</Text>
              <Text style={styles.toggleSub}>Share your journey and earn through 1:1 sessions.</Text>
            </View>
            <DarkToggle
              on={!!onboarding.alumni_wants_to_mentor}
              onChange={(v) => onboarding.setAlumniInfo({ alumni_wants_to_mentor: v })}
              testID="alumni-mentor-toggle"
            />
          </View>
          {onboarding.alumni_wants_to_mentor && (
            <>
              <Text style={styles.section}>Mentorship Category *</Text>
              <View style={styles.chipRow}>
                {MENTOR_CATEGORIES.map((m) => (
                  <DarkChip
                    key={m.id}
                    label={m.label}
                    active={onboarding.alumni_mentor_category === m.id}
                    onPress={() => onboarding.setAlumniInfo({ alumni_mentor_category: m.id })}
                    testID={`alumni-mentor-cat-${m.id}`}
                  />
                ))}
              </View>
              <Text style={styles.helper}>You'll be added to the mentor pool after admin review (24–48 hours).</Text>
            </>
          )}
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  section: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  infoText: { color: '#C4B5FD', fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 19 },
  toggleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderColor: 'rgba(196,181,253,0.20)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginTop: 4, marginBottom: 14,
  },
  toggleTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13.5 },
  toggleSub: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  helper: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 4, marginBottom: 12 },
  error: { color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 13, backgroundColor: 'rgba(220,38,38,0.15)', borderColor: 'rgba(252,165,165,0.3)', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 },
});
