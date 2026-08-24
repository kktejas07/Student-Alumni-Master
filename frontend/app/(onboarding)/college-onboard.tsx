import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Building2, GraduationCap, Globe, MapPin, Calendar, Link2,
  Camera, Upload, Award, CheckCircle2, User as UserIcon, Mail, Phone,
  GraduationCap as Cap, Users, UsersRound, Briefcase, CalendarDays, BookOpen,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton } from '@/src/views/auth/AuthControls';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { DarkChip } from '@/src/views/web/OnboardingShell';
import { InstitutionAutocomplete } from '@/src/views/web/InstitutionAutocomplete';
import { SuggestionAutocomplete } from '@/src/views/web/SuggestionAutocomplete';
import { Dropdown } from '@/src/views/web/Dropdown';

const TOTAL = 6;

const RANKING_TIERS = [
  { id: 'top_50',       label: 'Top 50 National' },
  { id: 'top_51_200',   label: 'Top 51-200' },
  { id: 'top_201_500',  label: 'Top 201-500' },
  { id: 'not_ranked',   label: 'Not ranked yet' },
];
const ACCREDITATIONS = [
  'NAAC A++', 'NAAC A+', 'NAAC A',
  'NBA Accreditation', 'NIRF Top 100', 'NIRF Top 200',
  'ABET', 'ISO 9001', 'Times HE Ranked', 'QS Ranked',
];

type Feature = { id: string; label: string; Icon: any; tint: string };
const FEATURES: Feature[] = [
  { id: 'student_placement',  label: 'Student placement tracking', Icon: Briefcase,    tint: '#60A5FA' },
  { id: 'alumni_network',     label: 'Alumni network access',      Icon: UsersRound,    tint: '#FB923C' },
  { id: 'mentor_connections', label: 'Mentor connections',         Icon: Users,         tint: '#F59E0B' },
  { id: 'industry_tieups',    label: 'Industry tie-ups',           Icon: Building2,     tint: '#34D399' },
  { id: 'event_management',   label: 'Event management',           Icon: CalendarDays,  tint: '#A78BFA' },
  { id: 'job_portal',         label: 'Job portal integration',     Icon: BookOpen,      tint: '#F472B6' },
];

const STYLES = ['Friendly & warm', 'Professional', 'Inspiring', 'Concise', 'Detailed'];
const INSTITUTION_TYPES = [
  { value: 'university', label: 'University' },
  { value: 'institute',  label: 'Institute (e.g. IIT, NIT)' },
  { value: 'college',    label: 'College' },
  { value: 'school',     label: 'School' },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Stepper({ step }: { step: number }) {
  return (
    <View className="flex-row items-center mb-[18px] gap-1">
      {Array.from({ length: TOTAL }, (_, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <React.Fragment key={i}>
            <View
              className={`w-[26px] h-[26px] rounded-[13px] border-[1.5px] border-gray-200 items-center justify-center bg-gray-50 ${
                done || active ? 'border-blue-500 bg-blue-500' : ''
              }`}
            >
              {done ? (
                <CheckCircle2 size={14} color="#111827" />
              ) : (
                <Text className={`text-[11px] font-bold ${active ? 'text-white' : 'text-gray-400'}`}>
                  {i + 1}
                </Text>
              )}
            </View>
            {i < TOTAL - 1 && (
              <View className={`flex-1 h-[1.5px] bg-gray-200 ${done ? 'bg-blue-500' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function CollegeOnboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const [step, setStep] = useState(params.step ? parseInt(params.step, 10) : 0);

  useEffect(() => {
    if (params.step) {
      const parsed = parseInt(params.step, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < TOTAL) {
        setStep(parsed);
      }
    }
  }, [params.step]);

  const [name,          setName]          = useState('');
  const [type,          setType]          = useState('university');
  const [affiliated,    setAffiliated]    = useState('');
  const [website,       setWebsite]       = useState('');
  const [city,          setCity]          = useState('');
  const [stateName,     setStateName]     = useState('');
  const [yearEst,       setYearEst]       = useState('');
  const [rankingTier,   setRankingTier]   = useState('');
  const [accreds,       setAccreds]       = useState<string[]>([]);

  const CITY_LIST = [
    'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata',
    'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Indore',
    'Bhopal', 'Coimbatore', 'Nagpur', 'Surat', 'Vadodara', 'Patna',
    'Visakhapatnam', 'Kochi', 'Thiruvananthapuram', 'Chandigarh',
    'Guwahati', 'Bhubaneswar', 'Mysuru', 'Mangaluru', 'Vijayawada',
    'Warangal', 'Tiruchirappalli', 'Madurai',
  ];
  const STATE_LIST = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh',
  ];

  const [contactName,        setContactName]        = useState(user?.full_name || '');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactEmail,       setContactEmail]       = useState('');
  const [contactPhone,       setContactPhone]       = useState(user?.phone || '');

  const [features, setFeatures] = useState<string[]>([]);

  const [logo,  setLogo]  = useState('');
  const [cover, setCover] = useState('');

  const [bio,   setBio]   = useState('');
  const [style, setStyle] = useState('');
  const [generatingBio, setGeneratingBio] = useState(false);

  const handleStylePress = async (s: string) => {
    setStyle(s);
    setGeneratingBio(true);
    try {
      const res = await api.generateBio({
        role: 'college',
        full_name: name,
        writing_style: s,
        existing_bio: bio || undefined,
        institution_name: name,
        location: `${city}, ${stateName}`,
        institution_type: type,
      });
      if (res?.bio) setBio(res.bio.slice(0, 300));
    } catch {
    } finally {
      setGeneratingBio(false);
    }
  };

  const badge = useMemo(() => {
    let score = 0;
    if (name) score += 1;
    if (rankingTier === 'top_50') score += 4;
    else if (rankingTier === 'top_51_200') score += 3;
    else if (rankingTier === 'top_201_500') score += 2;
    if (accreds.length >= 3) score += 3; else if (accreds.length > 0) score += 2;
    if (yearEst && parseInt(yearEst, 10) <= 1980) score += 1;
    if (contactEmail && /\.(ac\.in|edu)$/i.test(contactEmail)) score += 1;
    if (features.length >= 4) score += 2; else if (features.length > 0) score += 1;
    if (logo) score += 1;
    if (bio.length > 40) score += 1;
    const tier = score >= 11 ? 'Platinum' : score >= 8 ? 'Gold' : score >= 5 ? 'Silver' : 'Bronze';
    const perks = tier === 'Platinum'
      ? ['Verified institution on SA', 'Unlimited student accounts', 'Featured placement in college discovery', 'Dedicated success manager']
      : tier === 'Gold'
        ? ['Verified institution on SA', 'Up to 5,000 student accounts', 'Featured placement in college discovery']
        : tier === 'Silver'
          ? ['Verified institution on SA', 'Up to 500 student accounts', 'Upgrade by adding NAAC/NBA accreditations']
          : ['SA institution profile', 'Up to 100 student accounts', 'Upgrade by adding accreditations & website'];
    return { score, tier, perks };
  }, [name, rankingTier, accreds, yearEst, contactEmail, features, logo, bio]);

  const next = () => setStep((st) => Math.min(st + 1, TOTAL - 1));
  const prev = () => setStep((st) => Math.max(st - 1, 0));

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!name.trim()) return 'Institution name is required.';
      if (!type) return 'Pick institution type.';
    }
    if (step === 1) {
      if (!contactName.trim()) return 'Contact person name is required.';
      if (!contactDesignation.trim()) return 'Designation is required.';
      if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return 'Enter a valid email.';
      if (!/\.(ac\.in|edu)$/i.test(contactEmail)) return 'Email must end in .ac.in or .edu for verification.';
    }
    if (step === 2 && features.length === 0) return 'Pick at least one feature.';
    return null;
  };

  const onContinue = async () => {
    const err = validateStep();
    if (err) { toast.error('Check your details', err); return; }
    if (step < TOTAL - 1) return next();
    await submitOnboarding();
  };

  const submitOnboarding = async () => {
    try {
      const payload: any = {
        full_name: contactName,
        school_info: {
          country: 'India',
          institution_type: type,
          institution_name: name,
          graduation_year: undefined,
        },
        college_info: {
          institution_name:    name,
          institution_type:    type,
          affiliated_university: affiliated || undefined,
          official_website:    website || undefined,
          city:                city || undefined,
          state:               stateName || undefined,
          country:             'India',
          year_established:    yearEst ? parseInt(yearEst, 10) : undefined,
          ranking_tier:        rankingTier || undefined,
          accreditations:      accreds,
          accreditation:       accreds[0] || undefined,
          contact_name:        contactName || undefined,
          contact_designation: contactDesignation || undefined,
          contact_official_email: contactEmail || undefined,
          contact_phone:       contactPhone || undefined,
          features_needed:     features,
          logo:                logo || undefined,
          cover_photo:         cover || undefined,
          bio:                 bio || undefined,
          writing_style:       style || undefined,
        },
        career_path: 'job',
        interests:   [],
        skills:      [],
        bio:         bio || `${name} — ${type} on Student Alumni`,
        phone:       contactPhone || undefined,
      };
      await api.completeOnboarding(payload);
      await refreshUser();
      toast.success(`${badge.tier} institution status earned! 🎉`, 'Generating your Member ID…');
      router.push({ pathname: '/(onboarding)/member-id', params: { from: 'onboarding' } } as any);
    } catch (e: any) {
      toast.error('Setup failed', e?.message || 'Please try again.');
    }
  };

  const pickLogo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) setLogo(`data:image/png;base64,${res.assets[0].base64}`);
    } catch { toast.error('Logo', 'Could not open gallery.'); }
  };
  const pickCover = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true, allowsEditing: true, aspect: [3, 1] });
      if (!res.canceled && res.assets[0]?.base64) setCover(`data:image/jpeg;base64,${res.assets[0].base64}`);
    } catch { toast.error('Cover', 'Could not open gallery.'); }
  };

  const userFirstName = (user?.full_name || contactName || 'there').split(' ')[0];

  const HEADS = [
    { title: 'Your Institution',       sub: 'Register your college or university on SA' },
    { title: 'Contact Person',         sub: 'Primary admin for your institution account' },
    { title: 'Features Needed',        sub: 'Select features you want to activate' },
    { title: 'Logo & Cover Photo',     sub: 'Upload your institution logo and cover photo' },
    { title: 'About Your Institution', sub: 'Write a brief description of your institution' },
    { title: `Welcome, ${userFirstName}!`, sub: 'Based on your institution profile' },
  ];
  const head = HEADS[step];
  const ctaLabel =
    step === 4 ? 'See Institution Badge ✨' :
    step === TOTAL - 1 ? 'Continue to Member ID →' :
    'Continue →';

  return (
    <AuthShell role="college">
      <Stepper step={step} />
      <Text className="text-gray-900 font-bold text-[26px] mb-1.5 text-center">{head.title}</Text>
      <Text className="text-gray-500 font-medium text-[13.5px] text-center mb-[18px]">{head.sub}</Text>

      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <View className="py-1.5 gap-3">
          {step === 0 && (
            <>
              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-1 mb-1.5">Institution Name</Text>
              <InstitutionAutocomplete
                value={name}
                onChangeText={setName}
                onSelect={(pick) => {
                  setName(pick.name);
                  if (!pick.manual) {
                    if (pick.city)  setCity(pick.city);
                    if (pick.state) setStateName(pick.state);
                  }
                }}
                type="college"
                placeholder="Search your college or university…"
              />
              <Dropdown
                label="Institution Type"
                value={type}
                options={INSTITUTION_TYPES}
                onChange={setType}
                placeholder="Select institution type…"
                testID="college-type-dropdown"
              />
              <AuthInput
                label="Affiliated University (if any)"
                value={affiliated}
                onChangeText={setAffiliated}
                placeholder="e.g. Mumbai University"
                leftIcon={<Link2 size={16} color="#6B7280" />}
              />
              <AuthInput
                label="Official Website"
                value={website}
                onChangeText={setWebsite}
                placeholder="www.iitb.ac.in"
                autoCapitalize="none"
                leftIcon={<Globe size={16} color="#6B7280" />}
              />
              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-1 mb-1.5">City &amp; State</Text>
              <View className="flex-row gap-[10px] z-20 relative">
                <View className="flex-1">
                  <SuggestionAutocomplete
                    label="City"
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Mumbai"
                    suggestions={CITY_LIST}
                    helper={city ? undefined : 'Auto-fills when you pick a college above.'}
                  />
                </View>
                <View className="flex-1">
                  <SuggestionAutocomplete
                    label="State"
                    value={stateName}
                    onChangeText={setStateName}
                    placeholder="e.g. Maharashtra"
                    suggestions={STATE_LIST}
                  />
                </View>
              </View>
              <AuthInput
                label="Year Established"
                value={yearEst}
                onChangeText={(t) => setYearEst(t.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="e.g. 1958"
                keyboardType="numeric"
                leftIcon={<Calendar size={16} color="#6B7280" />}
              />
              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-1 mb-1.5">National Ranking Tier</Text>
              <View className="flex-row flex-wrap gap-2">
                {RANKING_TIERS.map((r) => (
                  <DarkChip key={r.id} label={r.label} active={rankingTier === r.id} onPress={() => setRankingTier(rankingTier === r.id ? '' : r.id)} />
                ))}
              </View>
              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-2 mb-1.5">Accreditations &amp; Rankings</Text>
              <View className="flex-row flex-wrap gap-2">
                {ACCREDITATIONS.map((x) => (
                  <DarkChip key={x} label={x} active={accreds.includes(x)} onPress={() => setAccreds((a) => toggle(a, x))} />
                ))}
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <AuthInput
                label="Contact Person Name"
                value={contactName}
                onChangeText={setContactName}
                placeholder="Full name"
                autoCapitalize="words"
                leftIcon={<UserIcon size={16} color="#6B7280" />}
              />
              <SuggestionAutocomplete
                label="Designation"
                value={contactDesignation}
                onChangeText={setContactDesignation}
                placeholder="e.g. TPO, Dean, Principal"
                suggestions={[
                  'Training & Placement Officer (TPO)',
                  'Dean of Students',
                  'Principal',
                  'Director',
                  'Vice Chancellor',
                  'Registrar',
                  'Head of Department',
                  'Coordinator',
                  'Admin Officer',
                ]}
                helper="Pick from our curated list — or choose Other to type your own."
              />
              <AuthInput
                label="Official Email (.ac.in / .edu)"
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="name@college.ac.in"
                keyboardType="email-address"
                leftIcon={<Mail size={16} color="#6B7280" />}
              />

              <View className="flex-row items-start gap-2.5 p-3 rounded-[10px] bg-blue-500/10 border border-blue-500/25">
                <CheckCircle2 size={16} color="#60A5FA" />
                <Text className="flex-1 text-blue-900 font-medium text-[12.5px] leading-[18px]">
                  We'll verify your college email domain (.ac.in / .edu) before activating your institution account.
                </Text>
              </View>
            </>
          )}

          {step === 2 && (
            <View className="flex-row flex-wrap gap-2.5">
              {FEATURES.map((f) => {
                const Icon = f.Icon;
                const active = features.includes(f.id);
                return (
                  <Pressable
                    key={f.id}
                    className={`w-full py-3 px-3 rounded-xl border border-gray-200 bg-white flex-row items-center gap-3 ${
                      active ? 'border-blue-500 bg-blue-500/10' : ''
                    }`}
                    onPress={() => setFeatures((arr) => toggle(arr, f.id))}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center border"
                      style={{ backgroundColor: f.tint + '33', borderColor: f.tint }}
                    >
                      <Icon size={18} color={f.tint} />
                    </View>
                    <Text className={`flex-1 font-bold text-[13.5px] ${active ? 'text-gray-900' : 'text-gray-800'}`}>{f.label}</Text>
                    {active && <CheckCircle2 size={16} color="#3B82F6" />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 3 && (
            <View className="gap-[18px]">
              <View>
                <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-1 mb-1.5">Institution Logo</Text>
                <Pressable onPress={pickLogo} className="w-[130px] h-[130px] rounded-xl border-2 border-dashed border-gray-300 items-center justify-center bg-white overflow-hidden">
                  {logo
                    ? <Image source={{ uri: logo }} className="w-full h-full" />
                    : <View className="items-center gap-1.5">
                        <Upload size={26} color="#6B7280" />
                        <Text className="text-gray-500 font-medium text-xs text-center px-4">Tap to upload</Text>
                      </View>}
                </Pressable>
                <Text className="text-gray-500 font-medium text-[11.5px] mt-1">Recommended: 400×400px PNG</Text>
                <Text className="text-gray-500 font-medium text-[11.5px] mt-1">Square logo on white or transparent background.</Text>
              </View>
              <View>
                <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-1 mb-1.5">Cover Photo</Text>
                <Pressable onPress={pickCover} className="w-full h-[110px] rounded-xl border-2 border-dashed border-gray-300 items-center justify-center bg-white overflow-hidden">
                  {cover
                    ? <Image source={{ uri: cover }} className="w-full h-full" />
                    : <View className="items-center gap-1.5">
                        <ImageIcon size={28} color="#6B7280" />
                        <Text className="text-gray-500 font-medium text-xs text-center px-4">Upload campus photo · 1200×400px recommended</Text>
                      </View>}
                </Pressable>
              </View>
            </View>
          )}

          {step === 4 && (
            <>
              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-1 mb-1.5">Your Bio</Text>
              <View className="border border-gray-200 rounded-xl bg-white px-3.5 py-3">
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. IIT Bombay is one of India's premier engineering institutions, ranked #1 nationally. We have 10,000+ alumni across 50+ countries…"
                  placeholderTextColor="#9CA3AF"
                  className="text-gray-800 font-medium text-[13.5px] min-h-[100px]"
                />
              </View>
              <Text className="text-gray-500 font-medium text-[11px] text-right -mt-2.5">{bio.length}/300</Text>
              <Text className="text-gray-500 font-medium text-[12.5px] text-center leading-[18px]">
                This appears on your institution's SA profile page. Include your ranking, specialisations and key achievements.
              </Text>
              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-2.5 mb-1.5">Write Style</Text>
              <View className="flex-row flex-wrap gap-2">
                {STYLES.map((x) => (<DarkChip key={x} label={x} active={style === x} onPress={() => handleStylePress(x)} />))}
              </View>
              {generatingBio && <Text className="text-purple-400 font-medium text-xs text-center mt-1.5">✨ Generating your bio…</Text>}
            </>
          )}

          {step === 5 && (
            <View className="items-center gap-[14px]">
              <View
                className="w-[120px] h-[120px] rounded-full border-4 items-center justify-center bg-blue-500/18 mt-1"
                style={{
                  borderColor: badge.tier === 'Platinum' ? '#E5E4E2'
                    : badge.tier === 'Gold' ? '#FFD700'
                    : badge.tier === 'Silver' ? '#C0C0C0' : '#CD7F32'
                }}
              >
                <Award size={38} color="#111827" />
                <Text className="text-gray-800 font-bold text-[11px] mt-1 tracking-wide">{badge.tier} Status</Text>
              </View>
              <Text className="text-gray-800 font-bold text-lg">Welcome, {userFirstName}!</Text>
              <Text className="text-gray-500 font-medium text-[12.5px] text-center leading-[18px]">You've earned {badge.tier} status on Student Alumni.</Text>
              <View className="flex-row items-center gap-1.5 px-3 py-[5px] rounded-full bg-blue-500/12 border border-blue-500/30">
                <CheckCircle2 size={14} color="#60A5FA" />
                <Text className="text-blue-400 font-bold text-[11.5px]">Verified SA member</Text>
              </View>

              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-3.5 self-start">How your badge was calculated</Text>
              <View className="w-full gap-1.5">
                {[
                  `Institution: ${name || 'not set'}`,
                  `Type: ${INSTITUTION_TYPES.find((t) => t.value === type)?.label || type}`,
                  `Ranking tier: ${RANKING_TIERS.find((r) => r.id === rankingTier)?.label || 'not selected'}`,
                  `Accreditations: ${accreds.length}`,
                  `Year established: ${yearEst || 'not set'}`,
                  `Features activated: ${features.length}`,
                  `Logo ${logo ? 'added' : 'not added'} · Cover ${cover ? 'added' : 'not added'}`,
                  `Bio ${bio.length > 20 ? 'written' : 'not written'}`,
                ].map((l) => (<Text key={l} className="text-gray-600 font-medium text-[12.5px]">• {l}</Text>))}
              </View>

              <Text className="text-gray-500 font-bold text-[11px] tracking-wider uppercase mt-3 self-start">{badge.tier} Perks</Text>
              <View className="w-full gap-1.5">
                {badge.perks.map((p) => (<Text key={p} className="text-gray-800 font-medium text-[12.5px]">✔ {p}</Text>))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="flex-row items-center gap-2.5 mt-4">
        <Pressable
          onPress={step > 0 ? prev : () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/referral-code');
            }
          }}
          className="w-[42px] h-[42px] rounded-[21px] bg-white border border-gray-200 items-center justify-center"
          testID="college-onboard-back"
        >
          <ArrowLeft size={18} color="#374151" />
        </Pressable>
        <View className="flex-1">
          <PrimaryButton label={ctaLabel} onPress={onContinue} />
        </View>
      </View>
    </AuthShell>
  );
}
