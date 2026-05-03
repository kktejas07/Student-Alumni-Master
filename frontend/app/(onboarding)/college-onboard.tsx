/**
 * College / University Onboarding — 6-step wizard per spec (New Folder With Items 5.zip).
 *
 * Step 1: Your Institution      — Institution Name (autocomplete) + Type + Affiliated Univ
 *                                 + Website + City/State + Year Established + Ranking Tier
 *                                 chips + Accreditations chips
 * Step 2: Contact Person        — Name, Designation, Official Email (.ac.in/.edu), Phone
 * Step 3: Features Needed       — 6 multi-select tiles (Placement / Alumni / Mentor /
 *                                 Industry / Events / Job Portal)
 * Step 4: Logo & Cover Photo    — 2 upload areas
 * Step 5: About Your Institution — 300-char bio + 5 writing-style chips → CTA "See Institution Badge ✨"
 * Step 6: Welcome / SA Badge    — Bronze/Silver/Gold/Platinum recap + perks → CTA "Continue →"
 *
 * After Step 6 → /(onboarding)/member-id → /(auth)/email-verify → 2FA → Welcome Dashboard
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Building2, GraduationCap, Globe, MapPin, Calendar, Link2,
  Camera, Upload, Award, CheckCircle2, User as UserIcon, Mail, Phone,
  GraduationCap as Cap, Users, UsersRound, Briefcase, CalendarDays, BookOpen,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton } from '@/src/views/auth/AuthControls';
import { FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { DarkChip } from '@/src/views/web/OnboardingShell';
import { InstitutionAutocomplete } from '@/src/views/web/InstitutionAutocomplete';
import { Dropdown } from '@/src/views/web/Dropdown';

const TOTAL = 6;

// === Step 1 chip lists ===
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

// === Step 3 features ===
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
    <View style={s.stepRow}>
      {Array.from({ length: TOTAL }, (_, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <React.Fragment key={i}>
            <View style={[s.dot, (done || active) && s.dotActive]}>
              {done ? <CheckCircle2 size={14} color="#FFF" /> : <Text style={[s.dotText, active && s.dotTextActive]}>{i + 1}</Text>}
            </View>
            {i < TOTAL - 1 && <View style={[s.line, done && s.lineActive]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function CollegeOnboard() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const [step, setStep] = useState(0);

  // Step 1
  const [name,          setName]          = useState('');
  const [type,          setType]          = useState('university');
  const [affiliated,    setAffiliated]    = useState('');
  const [website,       setWebsite]       = useState('');
  const [city,          setCity]          = useState('');
  const [stateName,     setStateName]     = useState('');
  const [yearEst,       setYearEst]       = useState('');
  const [rankingTier,   setRankingTier]   = useState('');
  const [accreds,       setAccreds]       = useState<string[]>([]);

  // Curated city + state lists for autocomplete + "Other" manual entry
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

  // Step 2
  const [contactName,        setContactName]        = useState(user?.full_name || '');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactEmail,       setContactEmail]       = useState('');
  const [contactPhone,       setContactPhone]       = useState('');

  // Step 3
  const [features, setFeatures] = useState<string[]>([]);

  // Step 4
  const [logo,  setLogo]  = useState('');
  const [cover, setCover] = useState('');

  // Step 5
  const [bio,   setBio]   = useState('');
  const [style, setStyle] = useState('');

  // Step 6: badge
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
      router.replace('/(onboarding)/member-id' as any);
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

  const HEADS = [
    { title: 'Your Institution',       sub: 'Register your college or university on SA' },
    { title: 'Contact Person',         sub: 'Primary admin for your institution account' },
    { title: 'Features Needed',        sub: 'Select features you want to activate' },
    { title: 'Logo & Cover Photo',     sub: 'Upload your institution logo and cover photo' },
    { title: 'About Your Institution', sub: 'Write a brief description of your institution' },
    { title: 'Welcome, there!',        sub: 'Based on your institution profile' },
  ];
  const head = HEADS[step];
  const ctaLabel =
    step === 4 ? 'See Institution Badge ✨' :
    step === TOTAL - 1 ? 'Continue to Member ID →' :
    'Continue →';

  return (
    <AuthShell role="college">
      <Stepper step={step} />
      <Text style={s.title}>{head.title}</Text>
      <Text style={s.sub}>{head.sub}</Text>

      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 6, gap: 12 }}>
          {/* === STEP 1 === */}
          {step === 0 && (
            <>
              <Text style={s.section}>Institution Name</Text>
              <InstitutionAutocomplete
                value={name}
                onChangeText={setName}
                onSelect={(pick) => {
                  // Auto-populate City + State from the selected college's
                  // mapped data (Photon returns city/state for most insts).
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
                leftIcon={<Link2 size={16} color="rgba(255,255,255,0.55)" />}
              />
              <AuthInput
                label="Official Website"
                value={website}
                onChangeText={setWebsite}
                placeholder="www.iitb.ac.in"
                autoCapitalize="none"
                leftIcon={<Globe size={16} color="rgba(255,255,255,0.55)" />}
              />
              <Text style={s.section}>City &amp; State</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <SuggestionAutocomplete
                    label="City"
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Mumbai"
                    suggestions={CITY_LIST}
                    helper={city ? undefined : 'Auto-fills when you pick a college above.'}
                  />
                </View>
                <View style={{ flex: 1 }}>
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
                leftIcon={<Calendar size={16} color="rgba(255,255,255,0.55)" />}
              />
              <Text style={s.section}>National Ranking Tier</Text>
              <View style={s.chipRow}>
                {RANKING_TIERS.map((r) => (
                  <DarkChip key={r.id} label={r.label} active={rankingTier === r.id} onPress={() => setRankingTier(rankingTier === r.id ? '' : r.id)} />
                ))}
              </View>
              <Text style={[s.section, { marginTop: 8 }]}>Accreditations &amp; Rankings</Text>
              <View style={s.chipRow}>
                {ACCREDITATIONS.map((x) => (
                  <DarkChip key={x} label={x} active={accreds.includes(x)} onPress={() => setAccreds((a) => toggle(a, x))} />
                ))}
              </View>
            </>
          )}

          {/* === STEP 2 === */}
          {step === 1 && (
            <>
              <AuthInput
                label="Contact Person Name"
                value={contactName}
                onChangeText={setContactName}
                placeholder="Full name"
                autoCapitalize="words"
                leftIcon={<UserIcon size={16} color="rgba(255,255,255,0.55)" />}
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
                leftIcon={<Mail size={16} color="rgba(255,255,255,0.55)" />}
              />
              <AuthInput
                label="Phone"
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                leftIcon={<Phone size={16} color="rgba(255,255,255,0.55)" />}
              />
              <View style={s.infoBox}>
                <CheckCircle2 size={16} color="#60A5FA" />
                <Text style={s.infoText}>
                  We'll verify your college email domain (.ac.in / .edu) before activating your institution account.
                </Text>
              </View>
            </>
          )}

          {/* === STEP 3 === */}
          {step === 2 && (
            <View style={s.cardGrid}>
              {FEATURES.map((f) => {
                const Icon = f.Icon;
                const active = features.includes(f.id);
                return (
                  <Pressable
                    key={f.id}
                    style={[s.featureCard, active && s.featureCardActive]}
                    onPress={() => setFeatures((arr) => toggle(arr, f.id))}
                  >
                    <View style={[s.featureIcon, { backgroundColor: f.tint + '33', borderColor: f.tint }]}>
                      <Icon size={18} color={f.tint} />
                    </View>
                    <Text style={[s.featureLabel, active && s.featureLabelActive]}>{f.label}</Text>
                    {active && <CheckCircle2 size={16} color="#3B82F6" />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* === STEP 4 === */}
          {step === 3 && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={s.section}>Institution Logo</Text>
                <Pressable onPress={pickLogo} style={s.logoFrame}>
                  {logo
                    ? <Image source={{ uri: logo }} style={s.logoImg} />
                    : <View style={{ alignItems: 'center', gap: 6 }}>
                        <Upload size={26} color="rgba(255,255,255,0.6)" />
                        <Text style={s.photoHint}>Tap to upload</Text>
                      </View>}
                </Pressable>
                <Text style={s.helperLeft}>Recommended: 400×400px PNG</Text>
                <Text style={s.helperLeft}>Square logo on white or transparent background.</Text>
              </View>
              <View>
                <Text style={s.section}>Cover Photo</Text>
                <Pressable onPress={pickCover} style={s.coverFrame}>
                  {cover
                    ? <Image source={{ uri: cover }} style={s.coverImg} />
                    : <View style={{ alignItems: 'center', gap: 6 }}>
                        <ImageIcon size={28} color="rgba(255,255,255,0.6)" />
                        <Text style={s.photoHint}>Upload campus photo · 1200×400px recommended</Text>
                      </View>}
                </Pressable>
              </View>
            </View>
          )}

          {/* === STEP 5 === */}
          {step === 4 && (
            <>
              <Text style={s.section}>Your Bio</Text>
              <View style={s.textareaWrap}>
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. IIT Bombay is one of India's premier engineering institutions, ranked #1 nationally. We have 10,000+ alumni across 50+ countries…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={s.textarea}
                />
              </View>
              <Text style={s.helperRight}>{bio.length}/300</Text>
              <Text style={s.helper}>
                This appears on your institution's SA profile page. Include your ranking, specialisations and key achievements.
              </Text>
              <Text style={[s.section, { marginTop: 10 }]}>Write Style</Text>
              <View style={s.chipRow}>
                {STYLES.map((x) => (<DarkChip key={x} label={x} active={style === x} onPress={() => setStyle(x)} />))}
              </View>
            </>
          )}

          {/* === STEP 6 === */}
          {step === 5 && (
            <View style={{ alignItems: 'center', gap: 14 }}>
              <View style={[s.badgeCircle, {
                borderColor: badge.tier === 'Platinum' ? '#E5E4E2'
                  : badge.tier === 'Gold' ? '#FFD700'
                  : badge.tier === 'Silver' ? '#C0C0C0' : '#CD7F32'
              }]}>
                <Award size={38} color="#FFF" />
                <Text style={s.badgeTier}>{badge.tier} Status</Text>
              </View>
              <Text style={s.greeting}>Welcome, there!</Text>
              <Text style={s.helper}>You've earned {badge.tier} status on Student Alumni.</Text>
              <View style={s.verifiedPill}>
                <CheckCircle2 size={14} color="#60A5FA" />
                <Text style={s.verifiedText}>Verified SA member</Text>
              </View>

              <Text style={[s.section, { marginTop: 14, alignSelf: 'flex-start' }]}>How your badge was calculated</Text>
              <View style={{ width: '100%', gap: 6 }}>
                {[
                  `Institution: ${name || 'not set'}`,
                  `Type: ${INSTITUTION_TYPES.find((t) => t.value === type)?.label || type}`,
                  `Ranking tier: ${RANKING_TIERS.find((r) => r.id === rankingTier)?.label || 'not selected'}`,
                  `Accreditations: ${accreds.length}`,
                  `Year established: ${yearEst || 'not set'}`,
                  `Features activated: ${features.length}`,
                  `Logo ${logo ? 'added' : 'not added'} · Cover ${cover ? 'added' : 'not added'}`,
                  `Bio ${bio.length > 20 ? 'written' : 'not written'}`,
                ].map((l) => (<Text key={l} style={s.calcRow}>• {l}</Text>))}
              </View>

              <Text style={[s.section, { marginTop: 12, alignSelf: 'flex-start' }]}>{badge.tier} Perks</Text>
              <View style={{ width: '100%', gap: 6 }}>
                {badge.perks.map((p) => (<Text key={p} style={s.perk}>✔ {p}</Text>))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={s.navRow}>
        {step > 0 ? (
          <Pressable onPress={prev} style={s.backBtn}><ArrowLeft size={18} color="#FFF" /></Pressable>
        ) : <View style={{ width: 42 }} />}
        <View style={{ flex: 1 }}>
          <PrimaryButton label={ctaLabel} onPress={onContinue} />
        </View>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  // College theme accent: blue
  dotActive: { borderColor: '#3B82F6', backgroundColor: '#3B82F6' },
  dotText: { color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.bold, fontSize: 11 },
  dotTextActive: { color: '#FFF' },
  line: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.14)' },
  lineActive: { backgroundColor: '#3B82F6' },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 13.5, textAlign: 'center', marginBottom: 18 },
  section: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Info box (Step 2)
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, backgroundColor: 'rgba(96,165,250,0.10)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)' },
  infoText: { flex: 1, color: 'rgba(255,255,255,0.78)', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },

  // Feature cards (Step 3)
  featureCard: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  featureCardActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.10)' },
  featureIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  featureLabel: { flex: 1, color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.bold, fontSize: 13.5 },
  featureLabelActive: { color: '#FFF' },

  // Photo / Logo
  logoFrame: { width: 130, height: 130, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  coverFrame: { width: '100%', height: 110, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
  coverImg: { width: '100%', height: '100%' },
  photoHint: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 12, textAlign: 'center', paddingHorizontal: 16 },
  helper: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  helperLeft: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },
  helperRight: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 11, textAlign: 'right', marginTop: -10 },

  // Bio
  textareaWrap: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 14, paddingVertical: 12 },
  textarea: { color: '#FFF', fontFamily: FONTS.med, fontSize: 13.5, minHeight: 100, ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}) },

  // Badge
  badgeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59,130,246,0.18)', marginTop: 4 },
  badgeTier: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 11, marginTop: 4, letterSpacing: 0.6 },
  greeting: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 18 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(96,165,250,0.12)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },
  verifiedText: { color: '#60A5FA', fontFamily: FONTS.bold, fontSize: 11.5 },
  calcRow: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 12.5 },
  perk: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 12.5 },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
});
