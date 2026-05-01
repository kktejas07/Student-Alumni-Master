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
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
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

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const SESSION_PRICES = [499, 799, 999, 1499];

// Simple 3-dot stepper for spec feel — steps differ per role
function Stepper({ active, total }: { active: number; total: number }) {
  return (
    <View style={s.stepRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[s.stepDot, i === active && s.stepDotActive]}>
          <Text style={[s.stepText, i === active && s.stepTextActive]}>{i + 1}</Text>
        </View>
      ))}
    </View>
  );
}

export default function QuickSetup() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const role = user?.role || 'student';

  // Shared fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone]       = useState(user?.phone || '');
  const [college, setCollege]   = useState('');
  const [gradYear, setGradYear] = useState('');

  // Student
  const [cgpa, setCgpa]         = useState('');

  // Mentor / Alumni shared
  const [currentRole, setCurrentRole] = useState('');
  const [company, setCompany]         = useState('');
  const [collegeBatch, setCollegeBatch] = useState('');

  // Mentor
  const [sessionPrice, setSessionPrice] = useState<number | undefined>(999);
  const [customPrice, setCustomPrice]   = useState('');

  // Alumni
  const [yoe, setYoe] = useState('');

  // College — spec fields: Institution Name / Type / Affiliated Univ / Website / City & State
  const [instName, setInstName]   = useState('');
  const [instType, setInstType]   = useState<'university' | 'college' | 'institute'>('university');
  const [affiliated, setAffiliated] = useState('');
  const [website, setWebsite]     = useState('');
  const [city, setCity]           = useState('');
  const [stateName, setStateName] = useState('');

  // Populated from API on mount — used by Mentor/Alumni Company autocomplete + Student course dropdown
  const [orgs, setOrgs]       = useState<string[]>([
    'Google', 'Microsoft', 'Amazon', 'TCS', 'Infosys', 'Flipkart', 'Swiggy',
    'Razorpay', 'Deloitte', 'IIT Bombay', 'Independent / Freelancer',
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
          fetch(`${BASE}/api/courses`).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (o?.organizations?.length) setOrgs(o.organizations);
        if (c?.courses?.length)       setCourses(c.courses);
      } catch {/* keep fallbacks */}
    })();
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Role meta
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
      if (!gradYear.trim() || isNaN(Number(gradYear))) return 'Enter a valid graduation year.';
      if (!fullName.trim()) return 'Full name is required.';
      if (!phone.replace(/\D/g, '').length || phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    }
    if (role === 'mentor') {
      if (!currentRole.trim()) return 'Current role is required.';
      if (!company.trim())     return 'Company is required.';
      if (!collegeBatch.trim()) return 'College & Batch is required.';
      if (!sessionPrice || sessionPrice < 100) return 'Pick or enter a session price.';
      if (!phone.replace(/\D/g, '').length || phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    }
    if (role === 'alumni') {
      if (!fullName.trim()) return 'Full name is required.';
      if (!currentRole.trim()) return 'Current role is required.';
      if (!company.trim())     return 'Company is required.';
      if (!collegeBatch.trim()) return 'College & Batch is required.';
      if (!gradYear.trim() || isNaN(Number(gradYear))) return 'Enter a valid graduation year.';
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
      // Parse "IIT Bombay, 2018" style combined field
      const [cbInst = '', cbYear = ''] = (collegeBatch || '').split(',').map((s) => s.trim());

      const payload: any = {
        school_info: {
          country: 'India',
          institution_type: role === 'college' ? 'university' : 'college',
          institution_name:
            role === 'student' ? college.trim()
            : role === 'mentor' || role === 'alumni' ? cbInst
            : college.trim(),
          graduation_year:
            role === 'student' ? parseInt(gradYear, 10)
            : role === 'alumni' ? parseInt(gradYear, 10)
            : cbYear ? parseInt(cbYear, 10) : undefined,
        },
        interests: [],
        skills: [],
        bio: '',
        phone: phone.trim(),
      };

      if (role === 'student') {
        payload.career_path = 'job';
        payload.student_info = {
          age: 20,  // Collected in optional deeper onboarding; default here
          education_level: 'btech',
          career_interests: [],
          cgpa: cgpa.trim() ? parseFloat(cgpa) : undefined,
        };
        // Capture selected course into school_info.branch_or_stream (existing field)
        if (courseSel) payload.school_info.branch_or_stream = courseSel;
      }

      if (role === 'mentor') {
        payload.mentor_info = {
          category: 'it_software',  // User refines in optional deeper step
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
          university: cbInst || college.trim(),
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
      <Text style={s.title}>{meta.title}</Text>
      <Text style={s.sub}>{meta.sub}</Text>

      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12, paddingVertical: 6 }}>
          {/* STUDENT */}
          {role === 'student' && (
            <>
              <Text style={s.section}>College / University *</Text>
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
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AuthInput label="Graduation Year" value={gradYear} onChangeText={setGradYear} placeholder="2026" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
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

          {/* MENTOR */}
          {role === 'mentor' && (
            <>
              <AuthInput label="Current Role" value={currentRole} onChangeText={setCurrentRole} placeholder="e.g. SDE-2 at Google" />
              <SuggestionAutocomplete
                label="Company"
                value={company}
                onChangeText={setCompany}
                suggestions={orgs}
                placeholder="Company name (type to search)"
                helper="Pick from our curated list — or type your own."
                testID="mentor-company"
              />
              <AuthInput label="College & Batch" value={collegeBatch} onChangeText={setCollegeBatch} placeholder="IIT Bombay, 2018" />
              <PhoneInput label="Phone Number *" value={phone} onChangeText={setPhone} />
              <Text style={s.section}>Session Price (₹)</Text>
              <View style={s.chipRow}>
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

          {/* ALUMNI */}
          {role === 'alumni' && (
            <>
              <AuthInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="e.g. Arjun Sharma" autoCapitalize="words" />
              <AuthInput label="Current Role" value={currentRole} onChangeText={setCurrentRole} placeholder="e.g. Senior Software Engineer" />
              <SuggestionAutocomplete
                label="Company"
                value={company}
                onChangeText={setCompany}
                suggestions={orgs}
                placeholder="Company name (type to search)"
                testID="alumni-company"
              />
              <AuthInput label="College & Batch" value={collegeBatch} onChangeText={setCollegeBatch} placeholder="IIT Bombay, 2018" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AuthInput label="Graduation Year" value={gradYear} onChangeText={setGradYear} placeholder="2018" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthInput label="Years of Experience" value={yoe} onChangeText={setYoe} placeholder="e.g. 5" keyboardType="numeric" />
                </View>
              </View>
              <PhoneInput label="Phone Number *" value={phone} onChangeText={setPhone} />
            </>
          )}

          {/* COLLEGE — per HTML spec "Your Institution" */}
          {role === 'college' && (
            <>
              <Text style={s.section}>Institution Name *</Text>
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

              <Text style={s.section}>Institution Type</Text>
              <View style={s.chipRow}>
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
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AuthInput label="City" value={city} onChangeText={setCity} placeholder="e.g. New Delhi" autoCapitalize="words" />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthInput label="State" value={stateName} onChangeText={setStateName} placeholder="e.g. Delhi" autoCapitalize="words" />
                </View>
              </View>
              <PhoneInput label="Admin Phone Number *" value={phone} onChangeText={setPhone} />
            </>
          )}
        </View>
      </ScrollView>

      {error ? <Text style={s.err}>{error}</Text> : null}

      <View style={{ marginTop: 10, gap: 10 }}>
        <PrimaryButton label="Continue →" onPress={onSubmit} loading={loading} />
        <Pressable onPress={onCompleteDeeper}>
          <Text style={s.deepLink}>Want to share more? Complete your full profile →</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  stepRow: { flexDirection: 'row', gap: 8, marginBottom: 22, justifyContent: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stepDotActive: { borderColor: '#B07FDF', backgroundColor: 'rgba(176,127,223,0.18)' },
  stepText: { color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.bold, fontSize: 11 },
  stepTextActive: { color: '#E9D5FF' },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 13.5, textAlign: 'center', marginBottom: 18 },
  section: {
    color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.bold,
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  err: { color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 10, textAlign: 'center' },
  deepLink: { color: '#B07FDF', fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', marginTop: 4 },
});
