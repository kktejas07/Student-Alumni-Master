/**
 * Onboarding step 3 — Role-specific details (Web split-screen + Native dark theme).
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { OnboardingShell, DarkChip, DarkInfoCard, DarkToggle } from '@/src/views/web/OnboardingShell';
import { WebField } from '@/src/views/web/AuthWebControls';
import { MentorCategoryGrid } from '@/src/views/web/MentorCategoryGrid';
import { Dropdown } from '@/src/views/web/Dropdown';
import { SuggestionAutocomplete } from '@/src/views/web/SuggestionAutocomplete';
import type { MentorCategory } from '@/src/models/entities';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Static fallback — used if /api/mentors/suggestions is unreachable.
const FALLBACK_ORGS = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'TCS', 'Infosys', 'Wipro',
  'Flipkart', 'Swiggy', 'Razorpay', 'Zomato', 'Paytm', 'Zerodha',
  'Deloitte', 'Accenture', 'McKinsey & Company', 'IIT Bombay',
  'IIM Ahmedabad', 'Independent / Freelancer',
];
const FALLBACK_TITLES = [
  'Software Engineer', 'Senior Software Engineer', 'Engineering Manager',
  'Tech Lead', 'Product Manager', 'Data Scientist', 'Founder', 'CTO',
  'Career Coach', 'Professor / Assistant Professor', 'Industry Advisor',
  'Other',
];

const EDU_LEVELS = [
  { id: 'plus_one', label: 'Class 11 (+1)' },
  { id: 'plus_two', label: 'Class 12 (+2)' },
  { id: 'btech', label: 'B.Tech / Engineering' },
  { id: 'bachelors', label: 'Bachelors' },
  { id: 'masters', label: 'Masters' },
  { id: 'phd', label: 'PhD' },
  { id: 'other', label: 'Other' },
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
  const [cgpaStr, setCgpaStr] = useState(
    onboarding.student_cgpa != null ? String(onboarding.student_cgpa) : ''
  );
  const [phoneStr, setPhoneStr] = useState(onboarding.phone || '');
  const [customPrice, setCustomPrice] = useState('');
  const SESSION_PRICES = [499, 799, 999, 1499];
  const [orgs, setOrgs] = useState<string[]>(FALLBACK_ORGS);
  const [titles, setTitles] = useState<string[]>(FALLBACK_TITLES);
  const [titleOther, setTitleOther] = useState('');

  // Load mentor suggestions from backend on mount (once).
  useEffect(() => {
    if (user?.role !== 'mentor') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/mentors/suggestions`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.organizations) && data.organizations.length)
          setOrgs(data.organizations);
        if (Array.isArray(data.job_titles) && data.job_titles.length)
          setTitles(data.job_titles);
      } catch {/* keep fallback */}
    })();
    return () => { cancelled = true; };
  }, [user?.role]);

  const validate = (): boolean => {
    setError(null);
    // Phone — required for ALL roles per spec (collected during onboarding)
    const phoneDigits = phoneStr.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      setError('Please enter a valid phone number (10+ digits).');
      return false;
    }
    if (user?.role === 'student') {
      const age = parseInt(ageStr, 10);
      if (!age || age < 10) { setError('Students must be at least 10 years old.'); return false; }
      if (!onboarding.student_education_level) { setError('Please select your education level.'); return false; }
      if (cgpaStr.trim()) {
        const g = parseFloat(cgpaStr);
        if (isNaN(g) || g < 0 || g > 10) {
          setError('CGPA must be between 0.0 and 10.0 (leave empty if unknown).');
          return false;
        }
      }
    }
    if (user?.role === 'mentor') {
      if (!onboarding.mentor_category) { setError('Please select a mentorship category.'); return false; }
      if (!onboarding.mentor_organization?.trim()) { setError('Organization / Company is required.'); return false; }
      if (!onboarding.mentor_job_title?.trim()) { setError('Job Title / Designation is required.'); return false; }
      if (!onboarding.mentor_session_price_inr || onboarding.mentor_session_price_inr < 0) {
        setError('Please pick a session price (or enter a custom amount).'); return false;
      }
    }
    if (user?.role === 'alumni') {
      if (!onboarding.alumni_employment_status) { setError('Please select your employment status.'); return false; }
      if (onboarding.alumni_wants_to_mentor) {
        const cats = onboarding.alumni_mentor_categories || [];
        if (cats.length === 0) {
          setError('Please pick at least one mentorship archetype to mentor students.'); return false;
        }
      }
    }
    return true;
  };

  const next = () => {
    if (!validate()) {
      if (error) toast.error('Check your details', error);
      return;
    }
    // Persist phone for all roles
    onboarding.setPhone(phoneStr.trim());
    if (user?.role === 'student') {
      onboarding.setStudentInfo({
        age: parseInt(ageStr, 10),
        cgpa: cgpaStr.trim() ? parseFloat(cgpaStr) : undefined,
      });
    }
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
      {/* Phone Number — collected during onboarding for ALL roles per spec */}
      <WebField
        label="Phone Number *"
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        value={phoneStr}
        onChangeText={setPhoneStr}
        testID="phone-input"
        helper="We'll use this for session reminders, booking confirmations and OTP verification."
      />

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
          <WebField
            label="Academic CGPA (optional, 0.0 – 10.0)"
            placeholder="e.g., 8.4"
            keyboardType="decimal-pad"
            value={cgpaStr}
            onChangeText={setCgpaStr}
            testID="student-cgpa-input"
            helper="Shared with colleges & mentors to match scholarships and opportunities."
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
          <Text style={styles.section}>Mentorship Archetype</Text>
          <MentorCategoryGrid
            selected={onboarding.mentor_category ? [onboarding.mentor_category as MentorCategory] : []}
            onChange={(arr) => onboarding.setMentorInfo({ mentor_category: arr[0] })}
            multi={false}
            testIDPrefix="mentor-cat"
          />
          <SuggestionAutocomplete
            label="Organization / Company *"
            value={onboarding.mentor_organization || ''}
            onChangeText={(v: string) => onboarding.setMentorInfo({ mentor_organization: v })}
            placeholder="Start typing… (e.g., Google, IIT Bombay, Your Startup)"
            suggestions={orgs}
            helper="Pick from our list — or type your own organization"
            testID="mentor-org-input"
          />
          <Dropdown
            label="Job Title / Designation *"
            value={titles.includes(onboarding.mentor_job_title || '')
              ? (onboarding.mentor_job_title as string)
              : (onboarding.mentor_job_title ? 'Other' : '')}
            options={titles.map((t) => ({ value: t, label: t }))}
            onChange={(v) => {
              if (v === 'Other') {
                // Preserve any previously-entered custom value; otherwise blank.
                onboarding.setMentorInfo({
                  mentor_job_title: titles.includes(onboarding.mentor_job_title || '')
                    ? ''
                    : (onboarding.mentor_job_title || ''),
                });
              } else {
                onboarding.setMentorInfo({ mentor_job_title: v });
                setTitleOther('');
              }
            }}
            placeholder="Select your designation"
            required
            testID="mentor-title-dropdown"
          />
          {/* If user picked 'Other' OR their stored title isn't in the preset list,
              show a free-text input so they can supply a custom designation. */}
          {(!titles.includes(onboarding.mentor_job_title || '') || titleOther) && (
            <WebField
              label="Custom job title"
              placeholder="e.g., Developer Advocate, Ops Lead"
              value={onboarding.mentor_job_title || ''}
              onChangeText={(v: string) => {
                setTitleOther(v);
                onboarding.setMentorInfo({ mentor_job_title: v });
              }}
              testID="mentor-title-other-input"
            />
          )}
          <WebField label="LinkedIn URL (highly recommended)" placeholder="https://linkedin.com/in/yourname" keyboardType="url" value={onboarding.mentor_linkedin_url || ''} onChangeText={(v: string) => onboarding.setMentorInfo({ mentor_linkedin_url: v })} testID="mentor-linkedin-input" />
          <WebField label="Years of Experience" placeholder="e.g., 5" keyboardType="numeric" value={onboarding.mentor_years_of_experience ? String(onboarding.mentor_years_of_experience) : ''} onChangeText={(v: string) => onboarding.setMentorInfo({ mentor_years_of_experience: parseInt(v) || undefined })} testID="mentor-yoe-input" />

          {/* Session Price — per HTML spec. Revenue-critical. */}
          <Text style={styles.section}>1:1 Session Price *</Text>
          <Text style={styles.helper}>
            Set your per-session rate in INR. You can change this anytime from your mentor dashboard.
          </Text>
          <View style={styles.chipRow}>
            {SESSION_PRICES.map((p) => (
              <DarkChip
                key={p}
                label={`₹${p}`}
                active={onboarding.mentor_session_price_inr === p && !customPrice}
                onPress={() => {
                  setCustomPrice('');
                  onboarding.setMentorInfo({ mentor_session_price_inr: p });
                }}
                testID={`session-price-${p}`}
              />
            ))}
            <DarkChip
              label="Custom"
              active={!!customPrice}
              onPress={() => { /* focus handled by input below */ }}
              testID="session-price-custom"
            />
          </View>
          <WebField
            label="Custom amount (₹)"
            placeholder="e.g., 2500"
            keyboardType="numeric"
            value={customPrice}
            onChangeText={(v: string) => {
              setCustomPrice(v);
              const n = parseInt(v, 10);
              onboarding.setMentorInfo({ mentor_session_price_inr: isNaN(n) ? undefined : n });
            }}
            testID="session-price-custom-input"
            helper="Leave empty to use one of the presets above."
          />
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
              <Text style={styles.section}>Mentorship Archetypes (pick up to 3) *</Text>
              <MentorCategoryGrid
                selected={
                  onboarding.alumni_mentor_categories
                  || (onboarding.alumni_mentor_category ? [onboarding.alumni_mentor_category as MentorCategory] : [])
                }
                onChange={(arr) => onboarding.setAlumniInfo({
                  alumni_mentor_categories: arr,
                  alumni_mentor_category: arr[0],   // keep legacy field synced
                })}
                multi={true}
                max={3}
                testIDPrefix="alumni-mentor-cat"
              />
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
