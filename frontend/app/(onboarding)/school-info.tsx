/**
 * Onboarding step 2 — School / Institution info.
 * Web: split-screen.  Native (iOS/Android): full-screen dark.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import type { InstitutionType } from '@/src/models/entities';
import { useToast } from '@/src/views/components';
import { OnboardingShell, DarkChip, DarkInfoCard } from '@/src/views/web/OnboardingShell';
import { WebField } from '@/src/views/web/AuthWebControls';

const INSTITUTION_TYPES: { id: InstitutionType; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'college', label: 'College' },
  { id: 'university', label: 'University' },
];
const CLASS_PRESETS = ['11', '12', 'B.Tech 1st Year', 'B.Tech 2nd Year', 'BBA', 'B.Sc'];
const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function SchoolInfoScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { school_info, setSchoolInfo } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  const isStudent = user?.role === 'student';
  const isAlumni = user?.role === 'alumni';

  const validate = (): boolean => {
    setError(null);
    const s = school_info;
    if (!s.institution_name?.trim()) { setError('Please enter your institution name'); return false; }
    if (!s.class_or_year?.trim()) { setError('Please enter your class or year'); return false; }
    if (isStudent) {
      const cls = s.class_or_year.trim().toLowerCase();
      if (/^\d+$/.test(cls)) {
        const n = parseInt(cls, 10);
        if (n < 11) { setError('Students must be in Class 11 (+1) or above to register on this platform.'); return false; }
      }
      if (/^class\s*([1-9]|10)$/.test(cls) || /^[1-9](st|nd|rd|th)?$/.test(cls) || cls === '10' || cls === '10th') {
        setError('Students must be in Class 11 (+1) or above to register on this platform.'); return false;
      }
    }
    if (isAlumni && !s.graduation_year) { setError('Please enter your graduation year'); return false; }
    return true;
  };

  const next = () => {
    if (!validate()) {
      if (error) toast.error('Check your details', error);
      return;
    }
    router.push('/(onboarding)/role-details');
  };

  return (
    <OnboardingShell
      step={1}
      stepBarSteps={STEPS}
      title={<>Tell us about your{'\n'}institution</>}
      subtitle="We'll use this to connect you with the right alumni, mentors, and resources."
      primaryLabel="Continue →"
      primaryTestID="school-next-btn"
      onPrimary={next}
      onBack={() => router.back()}
    >
      {isStudent && (
        <DarkInfoCard tone="warning">
          <Text style={styles.warnText}>
            ⚠️  Students must be in Class 11 (+1) or above to register.
          </Text>
        </DarkInfoCard>
      )}

      <Text style={styles.section}>Type of institution</Text>
      <View style={styles.chipRow}>
        {INSTITUTION_TYPES.map((t) => (
          <DarkChip
            key={t.id}
            label={t.label}
            active={school_info.institution_type === t.id}
            onPress={() => setSchoolInfo({ institution_type: t.id })}
            testID={`school-type-${t.id}`}
          />
        ))}
      </View>

      <WebField
        label="Institution name"
        placeholder="e.g., IIT Bombay / DPS Vasant Kunj"
        value={school_info.institution_name || ''}
        onChangeText={(v: string) => setSchoolInfo({ institution_name: v })}
        testID="school-name-input"
      />

      <Text style={styles.section}>{isAlumni ? 'Last class / Year completed' : 'Current class / Year'}</Text>
      <WebField
        placeholder="e.g., 11, 12, B.Tech 2nd Year, MBA 1st Year"
        value={school_info.class_or_year || ''}
        onChangeText={(v: string) => setSchoolInfo({ class_or_year: v })}
        testID="school-class-input"
      />
      <View style={[styles.chipRow, { marginTop: -4, marginBottom: 12 }]}>
        {CLASS_PRESETS.map((c) => (
          <DarkChip
            key={c}
            label={c}
            active={school_info.class_or_year === c}
            onPress={() => setSchoolInfo({ class_or_year: c })}
          />
        ))}
      </View>

      <WebField
        label="Branch / Stream (optional)"
        placeholder="e.g., Computer Science, Commerce, PCM"
        value={school_info.branch_or_stream || ''}
        onChangeText={(v: string) => setSchoolInfo({ branch_or_stream: v })}
        testID="school-branch-input"
      />

      <WebField
        label="Board / University (optional)"
        placeholder="e.g., CBSE, Anna University"
        value={school_info.board_or_university || ''}
        onChangeText={(v: string) => setSchoolInfo({ board_or_university: v })}
        testID="school-board-input"
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <WebField label="City" placeholder="Bangalore" value={school_info.city || ''} onChangeText={(v: string) => setSchoolInfo({ city: v })} testID="school-city-input" />
        </View>
        <View style={{ flex: 1 }}>
          <WebField label="State" placeholder="Karnataka" value={school_info.state || ''} onChangeText={(v: string) => setSchoolInfo({ state: v })} testID="school-state-input" />
        </View>
      </View>

      {isAlumni && (
        <WebField
          label="Graduation year"
          placeholder="e.g., 2020"
          keyboardType="numeric"
          value={school_info.graduation_year ? String(school_info.graduation_year) : ''}
          onChangeText={(v: string) => setSchoolInfo({ graduation_year: parseInt(v) || undefined })}
          testID="school-grad-year-input"
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  section: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  warnText: { color: '#FCD34D', fontFamily: 'DMSans_500Medium', fontSize: 12.5, lineHeight: 18 },
  error: {
    color: '#FCA5A5',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderColor: 'rgba(252,165,165,0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 4,
  },
});
