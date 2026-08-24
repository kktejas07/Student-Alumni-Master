/**
 * Onboarding step 2 — School / Institution info (refined per spec).
 *
 * Role-aware:
 *   • Student → strict 11th / 12th / Other (Other = not yet 10+2 student)
 *   • Alumni / Mentor → Pass-out degree + Pass-out year (60-year range)
 *
 * Features:
 *   • Type of Institution chips drive search relevance (school/college/university)
 *   • InstitutionAutocomplete with Nominatim filter & high-res logo
 *   • Auto-fill City/State/Address; "Edit address manually" toggle to override
 *   • Academic Year, Stream, Board → glass-style dropdown pickers (not free-text)
 *   • Persists `current_course`, `academic_year`, `stream`, `board` for promotions logic
 */
import { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import type { InstitutionType } from '@/src/models/entities';
import { useToast } from '@/src/views/components';
import { OnboardingShell, DarkChip, DarkInfoCard } from '@/src/views/web/OnboardingShell';
import { WebField } from '@/src/views/web/AuthWebControls';
import { InstitutionAutocomplete, InstitutionLogo } from '@/src/views/web/InstitutionAutocomplete';
import { Dropdown } from '@/src/views/web/Dropdown';
import type { DropdownOption } from '@/src/views/web/Dropdown';

const INSTITUTION_TYPES: { id: InstitutionType; label: string }[] = [
  { id: 'school', label: 'Inter' },
  { id: 'college', label: 'College' },
  { id: 'university', label: 'University' },
];

const CURRENT_YEAR = new Date().getFullYear();

const STUDENT_COURSE_OPTIONS = [
  { id: '11th',  label: '11th'  },
  { id: '12th',  label: '12th'  },
  { id: 'other', label: 'Other' },
];
const ACADEMIC_YEAR_OPTIONS: DropdownOption[] = (() => {
  const list: DropdownOption[] = [];
  for (let i = -5; i <= 5; i++) {
    const a = CURRENT_YEAR + i;
    const b = (a + 1).toString().slice(2);
    list.push({ value: `${a}-${b}`, label: `${a}–${b}` });
  }
  return list;
})();
const STREAM_OPTIONS: DropdownOption[] = [
  { value: 'mpc',         label: 'MPC',                   hint: 'Maths · Physics · Chemistry' },
  { value: 'bipc',        label: 'BiPC',                  hint: 'Biology · Physics · Chemistry' },
  { value: 'mec',         label: 'MEC',                   hint: 'Maths · Economics · Commerce' },
  { value: 'cec',         label: 'CEC',                   hint: 'Civics · Economics · Commerce' },
  { value: 'hec',         label: 'HEC',                   hint: 'History · Economics · Civics' },
  { value: 'science_pcm', label: 'Science (PCM)',         hint: 'Physics · Chemistry · Maths' },
  { value: 'science_pcb', label: 'Science (PCB)',         hint: 'Physics · Chemistry · Biology' },
  { value: 'science_pcmb',label: 'Science (PCMB)',        hint: 'Maths + Biology combined' },
  { value: 'commerce',    label: 'Commerce',              hint: 'Accounts · Business · Economics' },
  { value: 'commerce_math',label: 'Commerce with Maths',  hint: 'Accounts · Maths · Economics' },
  { value: 'arts',        label: 'Arts / Humanities',     hint: 'History · Pol. Science · etc.' },
  { value: 'vocational',  label: 'Vocational' },
  { value: 'other',       label: 'Other' },
];

const ENGINEERING_STREAM_OPTIONS: DropdownOption[] = [
  { value: 'cse',          label: 'Computer Science & Engineering',   hint: 'CSE / CS' },
  { value: 'it',           label: 'Information Technology',           hint: 'IT' },
  { value: 'ai_ml',        label: 'AI & Machine Learning',            hint: 'AIML' },
  { value: 'data_science', label: 'Data Science',                     hint: 'DS' },
  { value: 'cyber_sec',    label: 'Cyber Security' },
  { value: 'iot',          label: 'IoT / Embedded Systems' },
  { value: 'ece',          label: 'Electronics & Communication',      hint: 'ECE' },
  { value: 'eee',          label: 'Electrical & Electronics',         hint: 'EEE' },
  { value: 'electronics_instrumentation', label: 'Electronics & Instrumentation' },
  { value: 'mechanical',   label: 'Mechanical Engineering',           hint: 'Mech' },
  { value: 'civil',        label: 'Civil Engineering' },
  { value: 'chemical',     label: 'Chemical Engineering' },
  { value: 'aerospace',    label: 'Aerospace / Aeronautical' },
  { value: 'biotech',      label: 'Biotechnology' },
  { value: 'biomedical',   label: 'Biomedical Engineering' },
  { value: 'metallurgy',   label: 'Metallurgical Engineering' },
  { value: 'mining',       label: 'Mining Engineering' },
  { value: 'automobile',   label: 'Automobile Engineering' },
  { value: 'industrial',   label: 'Industrial / Production Engineering' },
  { value: 'marine',       label: 'Marine Engineering' },
  { value: 'petroleum',    label: 'Petroleum Engineering' },
  { value: 'textile',      label: 'Textile Engineering' },
  { value: 'architecture', label: 'Architecture',                     hint: 'B.Arch' },
  { value: 'planning',     label: 'Planning / Urban Design' },
  { value: 'agriculture',  label: 'Agricultural Engineering' },
  { value: 'food_tech',    label: 'Food Technology' },
  { value: 'environment',  label: 'Environmental Engineering' },
  { value: 'other',        label: 'Other' },
];

const COLLEGE_ACADEMIC_YEAR_OPTIONS: DropdownOption[] = (() => {
  const list: DropdownOption[] = [];
  for (let i = 30; i >= 1; i--) list.push({ value: String(CURRENT_YEAR - i), label: String(CURRENT_YEAR - i) });
  list.push({ value: String(CURRENT_YEAR), label: `${CURRENT_YEAR} (current)` });
  for (let i = 1; i <= 10; i++) list.push({ value: String(CURRENT_YEAR + i), label: String(CURRENT_YEAR + i) });
  return list;
})();
const BOARD_OPTIONS: DropdownOption[] = [
  { value: 'cbse',        label: 'CBSE' },
  { value: 'icse',        label: 'ICSE' },
  { value: 'state_board', label: 'State Board' },
  { value: 'ib',          label: 'IB',           hint: 'International Baccalaureate' },
  { value: 'igcse',       label: 'IGCSE',        hint: 'Cambridge International' },
  { value: 'nios',        label: 'NIOS',         hint: 'National Institute of Open Schooling' },
  { value: 'other',       label: 'Other' },
];

const PASSOUT_DEGREE_PRESETS = [
  'B.Tech', 'B.E.', 'M.Tech', 'M.E.',
  'Diploma (Engg)', 'B.Sc (Engg)', 'PhD (Engg)',
];
const PASSOUT_YEAR_OPTIONS: DropdownOption[] = (() => {
  const list: DropdownOption[] = [];
  for (let i = 30; i >= 1; i--) list.push({ value: String(CURRENT_YEAR - i), label: String(CURRENT_YEAR - i) });
  list.push({ value: String(CURRENT_YEAR), label: `${CURRENT_YEAR} (current)` });
  for (let i = 1; i <= 30; i++) list.push({ value: String(CURRENT_YEAR + i), label: String(CURRENT_YEAR + i) });
  return list;
})();

const STEPS = ['Welcome', 'School', 'Details', 'Photo', 'Done'];

export default function SchoolInfoScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { school_info, setSchoolInfo } = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  const role = user?.role || 'student';
  const isStudent = role === 'student';
  const isPassedOut = role === 'alumni' || role === 'mentor';
  const instType = school_info.institution_type || 'university';
  const isInter      = isStudent && instType === 'school';
  const isHigherEd   = isStudent && (instType !== 'school');

  useEffect(() => {
    if (!school_info.institution_type) {
      setSchoolInfo({ institution_type: 'university' });
    }
  }, []);

  const validate = (): boolean => {
    setError(null);
    const s = school_info;
    if (!s.institution_type) { setError('Please pick the type of institution'); return false; }
    if (!s.institution_name?.trim()) { setError('Please pick or enter your institution'); return false; }

    if (isInter) {
      if (!s.current_course) {
        setError('Please choose your current course (11th / 12th / Other).');
        return false;
      }
      if (s.current_course === 'other') {
        setError("We currently support 11th and 12th students only. You'll be able to register once you reach Class 11.");
        return false;
      }
      if (!s.academic_year) {
        setError('Please select your academic year.');
        return false;
      }
    }

    if (isHigherEd) {
      if (!s.academic_year) {
        setError('Please select your academic year.');
        return false;
      }
      if (!s.branch_or_stream) {
        setError('Please select your engineering stream / branch.');
        return false;
      }
    }

    if (isPassedOut) {
      if (!s.degree?.trim()) { setError('Please enter your pass-out degree'); return false; }
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

  const onInstitutionSelect = (pick: any) => {
    setSchoolInfo({
      institution_name: pick.name,
      institution_logo: pick.logo_url,
      institution_domain: pick.domain,
      ...(school_info.address_manual ? {} : {
        city: pick.city || school_info.city,
        state: pick.state || school_info.state,
        address_line: pick.address_line || school_info.address_line,
      }),
    });
  };

  const toggleManualAddress = (val: boolean) => {
    setSchoolInfo({ address_manual: val });
  };

  const onPassoutYearChange = (v: string) => {
    const n = parseInt(v, 10);
    setSchoolInfo({ graduation_year: isNaN(n) ? undefined : n, class_or_year: v });
  };

  return (
    <OnboardingShell
      step={1}
      stepBarSteps={STEPS}
      title={<>Tell us about your{'\n'}institution</>}
      subtitle="We'll use this to connect you with the right alumni, mentors, and resources."
      primaryLabel={'Continue →'}
      primaryTestID="school-next-btn"
      onPrimary={next}
      onBack={() => router.back()}
    >
      {isInter && (
        <DarkInfoCard tone="warning">
          <Text className="text-amber font-body-semibold text-xs" style={{ lineHeight: 18 }}>
            {'⚠️'}  Students must be in Class 11 (+1) or Class 12 (+2) to register.
          </Text>
        </DarkInfoCard>
      )}

      <Text className="text-xs font-body-bold tracking-widest uppercase mt-1 mb-2" style={{ color: '#6B7280' }}>Institution name</Text>
      <View className="flex-row items-start gap-3 mb-3.5 relative" style={{ zIndex: 50 }}>
        <InstitutionLogo
          name={school_info.institution_name || ''}
          domain={school_info.institution_domain}
          logoUrl={school_info.institution_logo}
          size={56}
        />
        <View className="flex-1" style={{ minWidth: 0 }}>
          <InstitutionAutocomplete
            value={school_info.institution_name || ''}
            onChangeText={(v) => setSchoolInfo({ institution_name: v })}
            onSelect={onInstitutionSelect}
            type={school_info.institution_type as any}
            testID="school-name-input"
          />
        </View>
      </View>

      {isInter && (
        <>
          <Text className="text-xs font-body-bold tracking-widest uppercase mt-1 mb-2" style={{ color: '#6B7280' }}>Current course</Text>
          <View className="flex-row flex-wrap gap-2 mb-3.5">
            {STUDENT_COURSE_OPTIONS.map((c) => (
              <DarkChip
                key={c.id}
                label={c.label}
                active={school_info.current_course === c.id}
                onPress={() => setSchoolInfo({
                  current_course: c.id as any,
                  degree: c.id === 'other' ? '' : c.label,
                  class_or_year: c.label,
                })}
                testID={`school-course-${c.id}`}
              />
            ))}
          </View>

          <Dropdown
            label="Academic year"
            required
            value={school_info.academic_year}
            options={ACADEMIC_YEAR_OPTIONS}
            onChange={(v) => setSchoolInfo({ academic_year: v })}
            placeholder="Select academic year (e.g., 2025–26)"
            testID="school-academic-year"
          />

          <Dropdown
            label="Stream"
            optional
            value={school_info.branch_or_stream}
            options={STREAM_OPTIONS}
            onChange={(v) => setSchoolInfo({ branch_or_stream: v })}
            placeholder="Select your stream"
            testID="school-stream"
          />

          <Dropdown
            label="Board"
            optional
            value={school_info.board_or_university}
            options={BOARD_OPTIONS}
            onChange={(v) => setSchoolInfo({ board_or_university: v })}
            placeholder="Select your board (CBSE, ICSE, State Board…)"
            testID="school-board"
          />
        </>
      )}

      {isHigherEd && (
        <>
          <Dropdown
            label="Academic year"
            required
            value={school_info.academic_year}
            options={COLLEGE_ACADEMIC_YEAR_OPTIONS}
            onChange={(v) => setSchoolInfo({ academic_year: v, class_or_year: v })}
            placeholder={instType === 'college'
              ? 'Select admission / current academic year'
              : 'Select admission / current academic year'}
            testID="school-academic-year"
          />

          <Dropdown
            label="Stream / Branch"
            required
            value={school_info.branch_or_stream}
            options={ENGINEERING_STREAM_OPTIONS}
            onChange={(v) => setSchoolInfo({ branch_or_stream: v })}
            placeholder="Select your engineering branch (CSE, ECE, Mech…)"
            testID="school-stream"
          />
        </>
      )}

      {isPassedOut && (
        <>
          <Text className="text-xs font-body-bold tracking-widest uppercase mt-1 mb-2" style={{ color: '#6B7280' }}>Pass-out degree</Text>
          <WebField
            placeholder="e.g., B.Tech, MBA, B.Sc"
            value={school_info.degree || ''}
            onChangeText={(v: string) => setSchoolInfo({ degree: v })}
            testID="school-degree-input"
          />
          <View className="flex-row flex-wrap gap-2 mb-3.5" style={{ marginTop: -4 }}>
            {PASSOUT_DEGREE_PRESETS.map((d) => (
              <DarkChip
                key={d}
                label={d}
                active={school_info.degree === d}
                onPress={() => setSchoolInfo({ degree: d })}
                testID={`school-degree-chip-${d}`}
              />
            ))}
          </View>

          <Dropdown
            label="Pass-out year"
            required
            value={school_info.graduation_year ? String(school_info.graduation_year) : ''}
            options={PASSOUT_YEAR_OPTIONS}
            onChange={onPassoutYearChange}
            placeholder="Select your pass-out year"
            testID="school-passout-year"
          />

          <Dropdown
            label="Branch / Stream (optional)"
            optional
            value={school_info.branch_or_stream || ''}
            options={ENGINEERING_STREAM_OPTIONS}
            onChange={(v) => setSchoolInfo({ branch_or_stream: v })}
            placeholder="Select your engineering branch (CSE, ECE, Mech…)"
            testID="school-branch-dropdown"
          />
          <WebField
            label="Board / University (optional)"
            placeholder="e.g., Anna University"
            value={school_info.board_or_university || ''}
            onChangeText={(v: string) => setSchoolInfo({ board_or_university: v })}
            testID="school-board-input"
          />
        </>
      )}

      <View className="flex-row items-center justify-between mt-1 mb-2">
        <Text className="text-xs font-body-bold tracking-widest uppercase" style={{ color: '#6B7280', marginBottom: 0 }}>Address</Text>
        <View className="flex-row items-center gap-2">
          <Text className="font-body-semibold" style={{ color: '#6B7280', fontSize: 11.5, letterSpacing: 0.4 }}>Edit manually</Text>
          <Switch
            value={!!school_info.address_manual}
            onValueChange={toggleManualAddress}
            trackColor={{ false: '#E5E7EB', true: 'rgba(124,58,237,0.55)' }}
            thumbColor={school_info.address_manual ? '#A78BFA' : '#9CA3AF'}
            testID="school-address-toggle"
          />
        </View>
      </View>

      {school_info.address_manual ? (
        <>
          <WebField
            label="Address line"
            placeholder="House / Street / Locality"
            value={school_info.address_line || ''}
            onChangeText={(v: string) => setSchoolInfo({ address_line: v })}
            testID="school-address-line"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <WebField label="City" placeholder="Bangalore"
                value={school_info.city || ''}
                onChangeText={(v: string) => setSchoolInfo({ city: v })}
                testID="school-city-input"
              />
            </View>
            <View className="flex-1">
              <WebField label="State" placeholder="Karnataka"
                value={school_info.state || ''}
                onChangeText={(v: string) => setSchoolInfo({ state: v })}
                testID="school-state-input"
              />
            </View>
          </View>
          <Text className="font-body mt-1" style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11.5 }}>
            {'✏️'}  Manual mode — fill in the address yourself.
          </Text>
        </>
      ) : (
        <View className="bg-bg2 border border-glass-border rounded-xl p-3.5 mb-3.5">
          {school_info.address_line || school_info.city || school_info.state ? (
            <>
              {!!school_info.address_line && (
                <Text className="font-body-semibold mb-1" style={{ color: '#111827', fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                  {school_info.address_line}
                </Text>
              )}
              <Text className="font-body-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.70)', fontSize: 12.5 }}>
                {[school_info.city, school_info.state].filter(Boolean).join(', ')
                  || 'City & state will appear here'}
              </Text>
              <Text className="font-body mt-1" style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11.5 }}>
                {'✨'}  Auto-filled from the institution. Toggle "Edit manually" to override.
              </Text>
            </>
          ) : (
            <Text className="text-dim font-body" style={{ fontSize: 12.5 }}>
              Pick an institution above and we'll auto-fill the address.
            </Text>
          )}
        </View>
      )}

      {error && (
        <Text className="text-rose font-body-semibold rounded-lg px-3 py-2 mt-1" style={{ fontSize: 13, backgroundColor: 'rgba(220,38,38,0.15)', borderColor: 'rgba(252,165,165,0.3)', borderWidth: 1 }}>
          {error}
        </Text>
      )}
    </OnboardingShell>
  );
}
