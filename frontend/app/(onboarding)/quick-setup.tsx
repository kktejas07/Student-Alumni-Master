import { getBaseUrl } from '@/src/lib/env';
/**
 * Quick Setup — Flat onboarding per HTML spec (Batch B, Hybrid approach).
 *
 * A single-screen role-specific form:
 *   STUDENT  — College / Graduation Year / CGPA / Full Name / Email / Phone
 *   MENTOR   — Current Role / Company / College & Batch / Session Price chips
 *   ALUMNI   — Full Name / Current Role / Company / College & Batch / Grad Year / YoE
 *
 * User can submit this minimal spec-compliant form and go straight to their
 * dashboard. Rich onboarding (archetypes, skills, face capture, bio) is
 * offered as an OPTIONAL "Complete your profile" step later.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, OutlineButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { InstitutionAutocomplete } from '@/src/views/web/InstitutionAutocomplete';
import { SuggestionAutocomplete } from '@/src/views/web/SuggestionAutocomplete';
import { Dropdown } from '@/src/views/web/Dropdown';
import { PhoneInput } from '@/src/views/web/PhoneInput';
import { api } from '@/src/models/services/api';
import { DarkChip } from '@/src/views/web/OnboardingShell';
import { Clock } from 'lucide-react-native';

const BASE = getBaseUrl();

const SESSION_PRICES = [499, 799, 999, 1499];
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 60 }, (_, i) => String(CURRENT_YEAR + 6 - i));

function Stepper({ active, total }: { active: number; total: number }) {
  return (
    <View className="flex-row items-center gap-1.5 mb-5 justify-center">
      {Array.from({ length: total }, (_, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <React.Fragment key={i}>
            <View
              className="w-7 h-7 rounded-full border items-center justify-center bg-bg2"
              style={{
                borderColor: (done || current) ? '#B07FDF' : '#E5E7EB',
                backgroundColor: (done || current) ? 'rgba(176,127,223,0.18)' : '#F9FAFB',
              }}
            >
              <Text
                className="font-display-bold"
                style={{ color: (done || current) ? '#E9D5FF' : '#9CA3AF', fontSize: 11 }}
              >{i + 1}</Text>
            </View>
            {i < total - 1 && (
              <View
                className="w-6 h-0.5"
                style={{ backgroundColor: done ? '#B07FDF' : '#E5E7EB' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function QuickSetup() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const role = user?.role || 'student';

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone]       = useState(user?.phone || '');
  const [college, setCollege]   = useState('');
  const [gradYear, setGradYear] = useState('');

  const [cgpa, setCgpa]         = useState('');

  const [currentRole, setCurrentRole] = useState('');
  const [company, setCompany]         = useState('');

  const [sessionPrice, setSessionPrice] = useState<number | undefined>(999);
  const [customPrice, setCustomPrice]   = useState('');

  const [yoe, setYoe] = useState('');

  const [instName, setInstName]   = useState('');
  const [instType, setInstType]   = useState<'university' | 'college' | 'institute'>('university');
  const [affiliated, setAffiliated] = useState('');
  const [website, setWebsite]     = useState('');
  const [city, setCity]           = useState('');
  const [stateName, setStateName] = useState('');

  const [orgs, setOrgs]       = useState<string[]>([
    'Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys', 'Flipkart', 'Swiggy',
    'Razorpay', 'Deloitte', 'IIT Bombay', 'Independent / Freelancer',
  ]);
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([
    'Software Engineer', 'Senior Software Engineer', 'Engineering Manager',
    'Tech Lead', 'Product Manager', 'Data Scientist', 'Founder', 'CTO',
  ]);
  const [courses, setCourses] = useState<string[]>([
    'Computer Science Engineering (CSE)', 'Information Technology (IT)',
    'Electronics & Communication (ECE)', 'Mechanical Engineering',
    'Civil Engineering', 'Artificial Intelligence & Machine Learning', 'Other',
  ]);
  const [courseSel, setCourseSel] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const [o, c] = await Promise.all([
          fetch(`${BASE}/api/mentors/suggestions`).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch(`${BASE}/api/catalog/courses`).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (o?.organizations?.length) setOrgs(o.organizations);
        if (o?.job_titles?.length)    setRoleSuggestions(o.job_titles);
        if (c?.courses?.length)       setCourses(c.courses);
      } catch {/* keep fallbacks */}
    })();
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const meta = role === 'mentor'
    ? { title: 'Your Profile', sub: 'Tell students about yourself', steps: 3 }
    : role === 'alumni'
      ? { title: 'Your Career Now', sub: 'Share your current role to help students aspiring your path', steps: 4 }
      : role === 'college'
        ? { title: 'Your Institution', sub: 'Register your college or university on SA', steps: 3 }
        : { title: 'Tell us about your college', sub: 'This helps us personalise your experience', steps: 4 };

  const validate = (): string | null => {
    if (role === 'student') {
      if (!college.trim()) return 'College / University is required.';
      if (!gradYear.trim() || isNaN(Number(gradYear))) return 'Pick a valid Batch Year.';
      if (!fullName.trim()) return 'Full name is required.';
      if (!phone.replace(/\D/g, '').length || phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    }
    if (role === 'mentor') {
      if (!currentRole.trim()) return 'Current role is required.';
      if (!company.trim())     return 'Company is required.';
      if (!college.trim())     return 'College / University is required.';
      if (!gradYear.trim())    return 'Batch Year is required.';
      if (!sessionPrice || sessionPrice < 100) return 'Pick or enter a session price.';
      if (!phone.replace(/\D/g, '').length || phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    }
    if (role === 'alumni') {
      if (!currentRole.trim()) return 'Current role is required.';
      if (!company.trim())     return 'Company is required.';
      if (!college.trim())     return 'College / University is required.';
      if (!gradYear.trim() || isNaN(Number(gradYear))) return 'Pick a valid Batch Year.';
    }
    if (role === 'college') {
      if (!instName.trim()) return 'Institution name is required.';
      if (!city.trim() || !stateName.trim()) return 'City & State are required.';
      if (!phone.replace(/\D/g, '').length || phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    }
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) { setError(err); toast.error('Check your details', err); return; }
    setError('');
    setLoading(true);
    try {
      const payload: any = {
        school_info: {
          country: 'India',
          institution_type: role === 'college' ? 'university' : 'college',
          institution_name:
            role === 'college' ? instName.trim() : college.trim(),
          graduation_year:
            (role === 'college' || !gradYear) ? undefined : parseInt(gradYear, 10),
        },
        interests: [],
        skills: [],
        bio: '',
        phone: phone.trim(),
      };

      if (role === 'student') {
        payload.career_path = 'job';
        payload.student_info = {
          age: 20,
          education_level: 'btech',
          career_interests: [],
          cgpa: cgpa.trim() ? parseFloat(cgpa) : undefined,
        };
        if (courseSel) payload.school_info.branch_or_stream = courseSel;
      }

      if (role === 'mentor') {
        payload.mentor_info = {
          category: 'it_software',
          organization: company.trim(),
          job_title: currentRole.trim(),
          session_price_inr: sessionPrice,
          bio: '',
        };
      }

      if (role === 'alumni') {
        payload.career_path = 'job';
        payload.alumni_info = {
          graduation_year: parseInt(gradYear, 10),
          university: college.trim(),
          current_employer: company.trim(),
          current_role: currentRole.trim(),
          employment_status: 'employed',
          wants_to_mentor: false,
        };
      }

      if (role === 'college') {
        payload.school_info = {
          country: 'India',
          institution_type: instType,
          institution_name: instName.trim(),
          city: city.trim(),
          state: stateName.trim(),
        };
        payload.college_info = {
          institution_name: instName.trim(),
          institution_type: instType,
          affiliated_university: affiliated.trim() || undefined,
          official_website: website.trim() || undefined,
          city: city.trim(),
          state: stateName.trim(),
          country: 'India',
        };
      }

      await api.completeOnboarding(payload);
      await refreshUser();
      toast.success('Profile ready!', 'Taking you to your dashboard.');
      router.replace('/(onboarding)/welcome-dashboard');
    } catch (e: any) {
      setError(e?.message || 'Could not save profile. Try again.');
      toast.error('Setup failed', e?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  };

  const onCompleteDeeper = () => router.replace('/(onboarding)/role-info');

  return (
    <AuthShell role={role as any}>
      <Stepper active={0} total={meta.steps} />
      <Text className="text-text font-display-bold text-2xl mb-1.5 text-center">{meta.title}</Text>
      <Text className="text-muted font-body-semibold text-sm text-center mb-4">{meta.sub}</Text>

      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        <View className="gap-3 py-1.5">
          {role === 'student' && (
            <>
              <Text className="text-xs font-body-bold tracking-widest uppercase mt-1" style={{ color: '#6B7280' }}>College / University *</Text>
              <InstitutionAutocomplete
                value={college}
                onChangeText={setCollege}
                onSelect={(pick) => {
                  setCollege(pick.name);
                  if (!city.trim() && pick.city) setCity(pick.city);
                  if (!stateName.trim() && pick.state) setStateName(pick.state);
                }}
                type="college"
                placeholder="Search your college / university (Indian institutions)"
                testID="student-college"
              />
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Dropdown
                    label="Batch Year *"
                    value={gradYear}
                    options={GRAD_YEARS.map((y) => ({ value: y, label: y }))}
                    onChange={setGradYear}
                    placeholder="Select year"
                    testID="student-grad-year"
                  />
                </View>
                <View className="flex-1">
                  <AuthInput label="CGPA (optional, 0.0-10.0)" value={cgpa} onChangeText={setCgpa} placeholder="8.4" keyboardType="decimal-pad" />
                </View>
              </View>
              <Dropdown
                label="Course / Stream"
                optional
                value={courseSel}
                options={courses.map((c) => ({ value: c, label: c }))}
                onChange={setCourseSel}
                placeholder="Select your course (Engineering & more)"
                testID="student-course-dropdown"
              />
              <AuthInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="e.g. Arjun Sharma" autoCapitalize="words" />
              <AuthInput label="Email Address" value={user?.email || ''} onChangeText={() => {}} placeholder={user?.email} />
              <PhoneInput label="Phone Number *" value={phone} onChangeText={setPhone} helper="Country code auto-detected — change it if you're outside India." />
            </>
          )}

          {role === 'mentor' && (
            <>
              <SuggestionAutocomplete
                label="Current Role"
                value={currentRole}
                onChangeText={setCurrentRole}
                suggestions={roleSuggestions}
                placeholder="e.g. SDE-2 at Google"
                helper="Pick from our curated list — or type your own."
                testID="mentor-role"
              />
              <SuggestionAutocomplete
                label="Company"
                value={company}
                onChangeText={setCompany}
                suggestions={orgs}
                placeholder="Company name (type to search)"
                helper="Pick from our curated list — or type your own."
                testID="mentor-company"
              />
              <Text className="text-xs font-body-bold tracking-widest uppercase mt-1" style={{ color: '#6B7280' }}>College / University *</Text>
              <InstitutionAutocomplete
                value={college}
                onChangeText={setCollege}
                type="college"
                placeholder="Search your college / university (Indian institutions)"
                testID="mentor-college"
              />
              <Dropdown
                label="Batch Year *"
                value={gradYear}
                options={GRAD_YEARS.map((y) => ({ value: y, label: y }))}
                onChange={setGradYear}
                placeholder="Select year"
                testID="mentor-grad-year"
              />
              <PhoneInput label="Phone Number *" value={phone} onChangeText={setPhone} />
              <Text className="text-xs font-body-bold tracking-widest uppercase mt-1" style={{ color: '#6B7280' }}>Session Price (₹)</Text>
              <View className="flex-row flex-wrap gap-2">
                {SESSION_PRICES.map((p) => (
                  <DarkChip
                    key={p}
                    label={`₹${p}`}
                    active={sessionPrice === p && !customPrice}
                    onPress={() => { setCustomPrice(''); setSessionPrice(p); }}
                    testID={`price-${p}`}
                  />
                ))}
                <DarkChip
                  label="Custom"
                  active={!!customPrice}
                  onPress={() => {}}
                  testID="price-custom"
                />
              </View>
              {(customPrice !== '' || sessionPrice === 0) && (
                <AuthInput label="Custom amount (₹)" value={customPrice} onChangeText={(v: string) => {
                  setCustomPrice(v);
                  const n = parseInt(v, 10);
                  setSessionPrice(isNaN(n) ? undefined : n);
                }} placeholder="e.g. 2500" keyboardType="numeric" />
              )}
            </>
          )}

          {role === 'alumni' && (
            <>
              <SuggestionAutocomplete
                label="Current Role"
                value={currentRole}
                onChangeText={setCurrentRole}
                suggestions={roleSuggestions}
                placeholder="e.g. Senior Software Engineer"
                helper="Pick from our curated list — or type your own."
                testID="alumni-role"
              />
              <SuggestionAutocomplete
                label="Company"
                value={company}
                onChangeText={setCompany}
                suggestions={orgs}
                placeholder="Company name (type to search)"
                helper="Pick from our curated list — or type your own."
                testID="alumni-company"
              />
              <Text className="text-xs font-body-bold tracking-widest uppercase mt-1" style={{ color: '#6B7280' }}>College / University *</Text>
              <InstitutionAutocomplete
                value={college}
                onChangeText={setCollege}
                type="college"
                placeholder="Search your college / university (Indian institutions)"
                testID="alumni-college"
              />
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Dropdown
                    label="Batch Year *"
                    value={gradYear}
                    options={GRAD_YEARS.map((y) => ({ value: y, label: y }))}
                    onChange={setGradYear}
                    placeholder="Select year"
                    testID="alumni-grad-year"
                  />
                </View>
                <View className="flex-1">
                  <AuthInput
                    label="Years of Experience"
                    value={yoe}
                    onChangeText={setYoe}
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                    leftIcon={<Clock size={16} color="#6B7280" />}
                  />
                </View>
              </View>
            </>
          )}

          {role === 'college' && (
            <>
              <Text className="text-xs font-body-bold tracking-widest uppercase mt-1" style={{ color: '#6B7280' }}>Institution Name *</Text>
              <InstitutionAutocomplete
                value={instName}
                onChangeText={setInstName}
                onSelect={(pick) => {
                  setInstName(pick.name);
                  if (!city.trim() && pick.city) setCity(pick.city);
                  if (!stateName.trim() && pick.state) setStateName(pick.state);
                }}
                type="university"
                placeholder="Search your institution (Indian universities / colleges)"
                testID="college-inst-name"
              />

              <Text className="text-xs font-body-bold tracking-widest uppercase mt-1" style={{ color: '#6B7280' }}>Institution Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {(['university', 'college', 'institute'] as const).map((t) => (
                  <DarkChip
                    key={t}
                    label={t.charAt(0).toUpperCase() + t.slice(1)}
                    active={instType === t}
                    onPress={() => setInstType(t)}
                    testID={`inst-type-${t}`}
                  />
                ))}
              </View>

              <AuthInput
                label="Affiliated University (optional)"
                value={affiliated}
                onChangeText={setAffiliated}
                placeholder="e.g. Delhi University"
                autoCapitalize="words"
              />
              <AuthInput
                label="Official Website"
                value={website}
                onChangeText={setWebsite}
                placeholder="https://www.example.edu"
                keyboardType="url"
                autoCapitalize="none"
              />
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <AuthInput label="City" value={city} onChangeText={setCity} placeholder="e.g. New Delhi" autoCapitalize="words" />
                </View>
                <View className="flex-1">
                  <AuthInput label="State" value={stateName} onChangeText={setStateName} placeholder="e.g. Delhi" autoCapitalize="words" />
                </View>
              </View>
              <PhoneInput label="Admin Phone Number *" value={phone} onChangeText={setPhone} />
            </>
          )}
        </View>
      </ScrollView>

      {error ? <Text className="text-rose font-body-semibold text-sm mt-2.5 text-center">{error}</Text> : null}

      <View className="mt-2.5 gap-2.5">
        <PrimaryButton label="Continue →" onPress={onSubmit} loading={loading} />
        <OutlineButton label="← Go Back" onPress={() => router.replace('/welcome')} testID="quick-setup-back" />
        <Pressable onPress={onCompleteDeeper}>
          <Text className="text-violet font-body-semibold text-sm text-center mt-1">Want to share more? Complete your full profile →</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
