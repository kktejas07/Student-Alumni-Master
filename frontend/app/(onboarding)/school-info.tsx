/**
 * Onboarding step 2 — School / Institution info.
 *
 * Role-aware fields:
 *   • Student          → restricted to "11th" or "12th" (school students only)
 *   • Alumni / Mentor  → "Pass-out degree" + "Pass-out year" (60yr range: -30 … +30)
 *
 * Institution name uses InstitutionAutocomplete (Nominatim) with logo lookup.
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
import { InstitutionAutocomplete, InstitutionLogo } from '@/src/views/web/InstitutionAutocomplete';

const INSTITUTION_TYPES: { id: InstitutionType; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'college', label: 'College' },
  { id: 'university', label: 'University' },
];

// Pass-out & current presets
const CURRENT_YEAR = new Date().getFullYear();
const STUDENT_COURSE_PRESETS = ['11th', '12th'];                     // strict per spec
const PASSOUT_DEGREE_PRESETS = ['B.Tech', 'B.Sc', 'B.Com', 'BBA', 'BA', 'MBA', 'M.Tech', 'M.Sc', 'PhD'];
const PASSOUT_YEAR_PRESETS = (() => {
  // 30 past + current + 30 future = 61 years total
  const list: string[] = [];
  for (let i = 30; i >= 1; i--) list.push(String(CURRENT_YEAR - i));
  list.push(String(CURRENT_YEAR));
  for (let i = 1; i <= 30; i++) list.push(String(CURRENT_YEAR + i));
  return list;
})();

const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function SchoolInfoScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { school_info, setSchoolInfo } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);
  const [logoMeta, setLogoMeta] = useState<{ domain?: string; logo_url?: string }>({});

  const role = user?.role || 'student';
  const isStudent = role === 'student';
  const isPassedOut = role === 'alumni' || role === 'mentor';

  const degreeLabel = isStudent ? 'Current course' : 'Pass-out degree';
  const yearLabel   = isStudent ? 'Academic year (optional)' : 'Pass-out year';
  const yearPresets = isPassedOut ? PASSOUT_YEAR_PRESETS : [`${CURRENT_YEAR}-${(CURRENT_YEAR + 1).toString().slice(2)}`];
  const yearPlaceholder = isPassedOut ? 'e.g., 2020' : `e.g., ${CURRENT_YEAR}-${(CURRENT_YEAR + 1).toString().slice(2)}`;
  const degreePresets = isStudent ? STUDENT_COURSE_PRESETS : PASSOUT_DEGREE_PRESETS;

  const validate = (): boolean => {
    setError(null);
    const s = school_info;
    if (!s.institution_name?.trim()) { setError('Please pick or enter your institution'); return false; }
    if (!s.degree?.trim()) { setError(`Please enter your ${degreeLabel.toLowerCase()}`); return false; }

    if (isStudent) {
      const d = (s.degree || '').toLowerCase().trim();
      if (!['11', '11th', 'class 11', '12', '12th', 'class 12'].includes(d)) {
        setError('Students must be in Class 11 (+1) or Class 12 (+2) to register.');
        return false;
      }
    }

    if (isPassedOut) {
      if (!s.graduation_year) { setError('Please enter your pass-out year'); return false; }
      if (s.graduation_year < 1950 || s.graduation_year > CURRENT_YEAR + 30) {
        setError(`Pass-out year must be between 1950 and ${CURRENT_YEAR + 30}`); return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validate()) {
      if (error) toast.error('Check your details', error);
      return;
    }
    router.push('/(onboarding)/role-details');
  };

  const onYearChange = (v: string) => {
    if (isPassedOut) {
      const n = parseInt(v, 10);
      setSchoolInfo({ graduation_year: isNaN(n) ? undefined : n, class_or_year: v });
    } else {
      setSchoolInfo({ class_or_year: v });
    }
  };
  const yearValue = isPassedOut
    ? (school_info.graduation_year ? String(school_info.graduation_year) : '')
    : (school_info.class_or_year || '');

  const onInstitutionSelect = (pick: any) => {
    setSchoolInfo({
      institution_name: pick.name,
      city: pick.city || school_info.city,
      state: pick.state || school_info.state,
    });
    setLogoMeta({ domain: pick.domain, logo_url: pick.logo_url });
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
            ⚠️  Students must be in Class 11 (+1) or Class 12 (+2) to register.
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

      <Text style={styles.section}>Institution name</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        {!!school_info.institution_name && (
          <InstitutionLogo
            name={school_info.institution_name}
            domain={logoMeta.domain}
            size={48}
          />
        )}
        <View style={{ flex: 1 }}>
          <InstitutionAutocomplete
            value={school_info.institution_name || ''}
            onChangeText={(v) => setSchoolInfo({ institution_name: v })}
            onSelect={onInstitutionSelect}
            testID="school-name-input"
          />
        </View>
      </View>

      {/* Degree / Course */}
      <Text style={styles.section}>{degreeLabel}</Text>
      {isStudent ? (
        <View style={styles.chipRow}>
          {STUDENT_COURSE_PRESETS.map((d) => (
            <DarkChip
              key={d}
              label={d}
              active={school_info.degree === d}
              onPress={() => setSchoolInfo({ degree: d })}
              testID={`school-degree-chip-${d}`}
            />
          ))}
        </View>
      ) : (
        <>
          <WebField
            placeholder="e.g., B.Tech, MBA, B.Sc"
            value={school_info.degree || ''}
            onChangeText={(v: string) => setSchoolInfo({ degree: v })}
            testID="school-degree-input"
          />
          <View style={[styles.chipRow, { marginTop: -4, marginBottom: 14 }]}>
            {degreePresets.map((d) => (
              <DarkChip
                key={d}
                label={d}
                active={school_info.degree === d}
                onPress={() => setSchoolInfo({ degree: d })}
                testID={`school-degree-chip-${d}`}
              />
            ))}
          </View>
        </>
      )}

      {/* Year */}
      <Text style={styles.section}>{yearLabel}</Text>
      <WebField
        placeholder={yearPlaceholder}
        keyboardType={isPassedOut ? 'numeric' : 'default'}
        value={yearValue}
        onChangeText={onYearChange}
        testID="school-year-input"
      />
      {isPassedOut && (
        <View style={[styles.chipRow, styles.scrollableYears]}>
          {yearPresets.map((y) => (
            <DarkChip
              key={y}
              label={y}
              active={yearValue === y}
              onPress={() => onYearChange(y)}
              testID={`school-year-chip-${y}`}
            />
          ))}
        </View>
      )}

      {!isStudent && (
        <WebField
          label="Branch / Stream (optional)"
          placeholder="e.g., Computer Science, Commerce, PCM"
          value={school_info.branch_or_stream || ''}
          onChangeText={(v: string) => setSchoolInfo({ branch_or_stream: v })}
          testID="school-branch-input"
        />
      )}
      {isStudent && (
        <WebField
          label="Stream (optional)"
          placeholder="e.g., Science (PCM/PCB), Commerce, Arts"
          value={school_info.branch_or_stream || ''}
          onChangeText={(v: string) => setSchoolInfo({ branch_or_stream: v })}
          testID="school-branch-input"
        />
      )}

      <WebField
        label={isStudent ? 'Board (optional)' : 'Board / University (optional)'}
        placeholder={isStudent ? 'e.g., CBSE, ICSE, State Board' : 'e.g., Anna University'}
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
      <Text style={styles.hint}>
        ✨ City &amp; state auto-fill when you pick from the dropdown — you can still edit them.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  section: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  scrollableYears: { maxHeight: 220, overflow: 'hidden' as any },
  warnText: { color: '#FCD34D', fontFamily: 'DMSans_500Medium', fontSize: 12.5, lineHeight: 18 },
  hint: { color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_400Regular', fontSize: 11.5, marginTop: -8, marginBottom: 14 },
  error: {
    color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 13,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderColor: 'rgba(252,165,165,0.3)', borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, marginTop: 4,
  },
});
