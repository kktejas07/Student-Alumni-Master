/**
 * Alumni Onboarding — 6-step wizard per Alumni UI spec (New Folder With Items 4.zip).
 *
 * Step 1: Your Career Now      — Full Name, Current Role, Company, College & Batch,
 *                                Graduation Year, Years of Experience
 * Step 2: Interests & Skills   — 4 chip groups: Domain Expertise / Tech / Business / Soft Skills
 * Step 3: Your Next Chapter    — 6 cards (single select): Become a Mentor, Level Up My Career,
 *                                Build a Startup, Higher Education, Explore Options, Stay Connected & Give Back
 * Step 4: Profile Photo        — Selfie / Upload (CTA "Continue →")
 * Step 5: Your Bio             — 300-char textarea + 5 writing-style chips (CTA "See My Badge ✨")
 * Step 6: Your SA Badge        — Bronze / Silver / Gold / Platinum recap + perks (CTA "Continue →")
 *
 * After Step 6 → /(onboarding)/member-id → /(auth)/email-verify → /(auth)/two-fa-setup → Welcome Dashboard
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Camera, Upload, GraduationCap, Award, CheckCircle2, Sparkles,
  Briefcase, Building2, Clock, User as UserIcon, Calendar,
  Rocket, TrendingUp, Compass, BookOpen, HeartHandshake, UsersRound,
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
import { SuggestionAutocomplete } from '@/src/views/web/SuggestionAutocomplete';
import { Dropdown } from '@/src/views/web/Dropdown';

const TOTAL = 6;
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 50 }, (_, i) => String(CURRENT_YEAR - i));

// === Step 2 chip groups ===
const DOMAIN_EXPERTISE = [
  'Software Engineering', 'Product', 'Finance', 'Consulting',
  'Design', 'Research', 'Entrepreneurship',
];
const TECH_SKILLS = [
  'Python', 'JavaScript', 'React', 'Node.js', 'SQL',
  'ML / AI', 'Cloud (AWS/GCP)', 'DevOps', 'Flutter', 'Figma',
];
const BUSINESS_SKILLS = [
  'Excel / Sheets', 'PowerPoint', 'Financial Modelling', 'Market Research',
  'Product Strategy', 'Operations', 'Sales', 'Marketing',
];
const SOFT_SKILLS = [
  'Communication', 'Leadership', 'Problem Solving', 'Time Management',
  'Teamwork', 'Critical Thinking', 'Adaptability',
];

// === Step 3: Next Chapter (6 single-select cards) ===
type NextChapterPath = {
  id: string; title: string; desc: string; Icon: any; tint: string;
};
const NEXT_CHAPTER: NextChapterPath[] = [
  { id: 'become_mentor',    title: 'Become a Mentor',          desc: 'Guide students & earn by sharing expertise',     Icon: UsersRound,    tint: '#A78BFA' },
  { id: 'level_up_career',  title: 'Level Up My Career',       desc: 'Get promoted, switch or explore new companies', Icon: TrendingUp,    tint: '#60A5FA' },
  { id: 'build_startup',    title: 'Build a Startup',          desc: 'Launch your venture or join as an early hire',  Icon: Rocket,        tint: '#FB923C' },
  { id: 'higher_education', title: 'Higher Education',         desc: 'MBA, MS, PhD or executive programmes abroad',   Icon: BookOpen,      tint: '#34D399' },
  { id: 'explore_options',  title: 'Explore Options',          desc: 'Help me discover what fits my journey',         Icon: Compass,       tint: '#F472B6' },
  { id: 'give_back',        title: 'Stay Connected & Give Back', desc: 'Network, refer talent, speak at events',      Icon: HeartHandshake, tint: '#FBBF24' },
];

// === Step 5: Writing styles ===
const STYLES = ['Friendly & warm', 'Professional', 'Inspiring', 'Concise', 'Detailed'];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

// 6-circle stepper
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

export default function AlumniOnboard() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const [step, setStep] = useState(0);

  // Step 1
  const [fullName,  setFullName]   = useState(user?.full_name || '');
  const [jobTitle,  setJobTitle]   = useState('');
  const [company,   setCompany]    = useState('');
  const [college,   setCollege]    = useState('');
  const [gradYear,  setGradYear]   = useState('2020');
  const [yoe,       setYoe]        = useState('4');

  // Step 2
  const [domain,    setDomain]    = useState<string[]>([]);
  const [tech,      setTech]      = useState<string[]>([]);
  const [biz,       setBiz]       = useState<string[]>([]);
  const [soft,      setSoft]      = useState<string[]>([]);

  // Step 3
  const [nextChapter, setNextChapter] = useState<string>('');

  // Step 4
  const [photo, setPhoto] = useState<string>('');

  // Step 5
  const [bio,   setBio]   = useState('');
  const [style, setStyle] = useState('');

  // Suggestions
  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([]);
  const [orgSuggestions,  setOrgSuggestions]  = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${BASE}/api/mentors/suggestions`);
        const data = await r.json();
        if (!alive) return;
        setRoleSuggestions(Array.isArray(data.job_titles) ? data.job_titles : []);
        setOrgSuggestions(Array.isArray(data.organizations) ? data.organizations : []);
      } catch { /* ignore — autocomplete still allows free-form typing */ }
    })();
    return () => { alive = false; };
  }, []);

  // Step 6: badge tier auto-computed
  const badge = useMemo(() => {
    let score = 0;
    if (jobTitle && company) score += 2;
    if (college) score += 1;
    const yoeN = parseInt(yoe || '0', 10);
    if (yoeN >= 8) score += 3; else if (yoeN >= 4) score += 2; else if (yoeN >= 1) score += 1;
    const allSkills = domain.length + tech.length + biz.length + soft.length;
    if (allSkills >= 8) score += 3; else if (allSkills >= 4) score += 2; else if (allSkills > 0) score += 1;
    if (nextChapter) score += 1;
    if (photo) score += 1;
    if (bio.length > 40) score += 1;
    const tier = score >= 11 ? 'Platinum' : score >= 8 ? 'Gold' : score >= 5 ? 'Silver' : 'Bronze';
    const perks = tier === 'Platinum'
      ? ['Verified alumni badge', '+250 bonus credits', 'Priority listing in alumni directory', 'VIP event invites']
      : tier === 'Gold'
        ? ['Verified alumni badge', '+150 bonus credits', 'Featured in alumni directory']
        : tier === 'Silver'
          ? ['Verified alumni badge', '+75 bonus credits', 'Upgrade by adding skills & experience']
          : ['SA member badge', '+25 bonus credits', 'Upgrade by completing your profile'];
    return { score, tier, perks };
  }, [jobTitle, company, college, yoe, domain, tech, biz, soft, nextChapter, photo, bio]);

  const next = () => setStep((st) => Math.min(st + 1, TOTAL - 1));
  const prev = () => setStep((st) => Math.max(st - 1, 0));

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!fullName.trim())  return 'Full name is required.';
      if (!jobTitle.trim())  return 'Current role is required.';
      if (!company.trim())   return 'Company is required.';
      if (!college.trim())   return 'College / institution is required.';
      const gy = parseInt(gradYear || '0', 10);
      if (!gy || gy < 1970 || gy > CURRENT_YEAR + 5) return 'Pick a valid graduation year.';
    }
    if (step === 1 && (domain.length + tech.length + biz.length + soft.length === 0))
      return 'Pick at least one skill or domain.';
    if (step === 2 && !nextChapter) return 'Pick what you are focusing on next.';
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
      const gy = parseInt(gradYear || '0', 10) || CURRENT_YEAR;
      const payload: any = {
        full_name: fullName,
        school_info: {
          country: 'India',
          institution_type: 'college',
          institution_name: college,
          graduation_year: gy,
        },
        alumni_info: {
          graduation_year:    gy,
          university:         college,
          current_employer:   company,
          current_role:       jobTitle,
          employment_status:  'employed',
          years_of_experience: parseInt(yoe || '0', 10) || 0,
          domain_expertise:   domain,
          tech_skills:        tech,
          business_skills:    biz,
          soft_skills:        soft,
          next_chapter:       nextChapter || undefined,
          profile_photo:      photo || undefined,
          bio:                bio || undefined,
          writing_style:      style || undefined,
          // If they picked "Become a Mentor" auto-flag wants_to_mentor
          wants_to_mentor:    nextChapter === 'become_mentor',
        },
        career_path: 'job',
        interests:   domain,
        skills:      [...tech, ...biz, ...soft],
        bio:         bio || `${jobTitle || 'Alumnus'} at ${company || ''} — ${college || ''} class of ${gy}`,
        face_image_base64: photo || undefined,
      };
      await api.completeOnboarding(payload);
      await refreshUser();
      toast.success(`${badge.tier} status earned! 🎉`, 'Generating your Member ID…');
      router.replace('/(onboarding)/member-id' as any);
    } catch (e: any) {
      toast.error('Setup failed', e?.message || 'Please try again.');
    }
  };

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
    } catch { toast.error('Photo', 'Could not open gallery.'); }
  };
  const takeSelfie = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast.error('Camera', 'Permission denied.'); return; }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
    } catch { toast.error('Camera', 'Could not open camera.'); }
  };

  const HEADS = [
    { title: 'Your Career Now',    sub: 'Share your current role to inspire students' },
    { title: 'Interests & Skills', sub: 'Domain expertise & skills you bring' },
    { title: 'Your Next Chapter',  sub: 'What are you focusing on next?' },
    { title: 'Profile Photo',      sub: 'Put a face to your alumni profile' },
    { title: 'Your Bio',           sub: 'Introduce yourself to the SA community' },
    { title: 'Your SA Badge',      sub: 'Based on your profile & college' },
  ];
  const head = HEADS[step];
  const ctaLabel =
    step === 4 ? 'See My Badge ✨' :
    step === TOTAL - 1 ? 'Continue to Member ID →' :
    'Continue →';

  return (
    <AuthShell role="alumni">
      <Stepper step={step} />
      <Text style={s.title}>{head.title}</Text>
      <Text style={s.sub}>{head.sub}</Text>

      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 6, gap: 12 }}>
          {/* === STEP 1: Your Career Now === */}
          {step === 0 && (
            <>
              <AuthInput
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Rohan Bhat"
                autoCapitalize="words"
                leftIcon={<UserIcon size={16} color="rgba(255,255,255,0.55)" />}
              />
              <SuggestionAutocomplete
                label="Current Role"
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="e.g. Senior PM at Flipkart"
                suggestions={roleSuggestions}
                helper="Pick from our curated list — or type your own."
              />
              <SuggestionAutocomplete
                label="Company"
                value={company}
                onChangeText={setCompany}
                placeholder="Your current employer"
                suggestions={orgSuggestions}
                helper="Pick from our curated list — or type your own."
              />
              <Text style={s.section}>College &amp; Batch</Text>
              <InstitutionAutocomplete
                value={college}
                onChangeText={setCollege}
                onSelect={(pick) => setCollege(pick.name)}
                type="college"
                placeholder="Search your institution…"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Dropdown
                    label="Graduation Year"
                    value={gradYear}
                    options={GRAD_YEARS.map((y) => ({ value: y, label: y }))}
                    onChange={setGradYear}
                    placeholder="Year"
                    testID="alumni-grad-year"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthInput
                    label="Years of Experience"
                    value={yoe}
                    onChangeText={(t) => setYoe(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="4"
                    keyboardType="numeric"
                    leftIcon={<Clock size={16} color="rgba(255,255,255,0.55)" />}
                  />
                </View>
              </View>
            </>
          )}

          {/* === STEP 2: Interests & Skills === */}
          {step === 1 && (
            <>
              <Text style={s.section}>Domain Expertise</Text>
              <View style={s.chipRow}>
                {DOMAIN_EXPERTISE.map((x) => (
                  <DarkChip key={x} label={x} active={domain.includes(x)} onPress={() => setDomain((a) => toggle(a, x))} />
                ))}
              </View>
              <Text style={[s.section, { marginTop: 10 }]}>Tech</Text>
              <View style={s.chipRow}>
                {TECH_SKILLS.map((x) => (
                  <DarkChip key={x} label={x} active={tech.includes(x)} onPress={() => setTech((a) => toggle(a, x))} />
                ))}
              </View>
              <Text style={[s.section, { marginTop: 10 }]}>Business</Text>
              <View style={s.chipRow}>
                {BUSINESS_SKILLS.map((x) => (
                  <DarkChip key={x} label={x} active={biz.includes(x)} onPress={() => setBiz((a) => toggle(a, x))} />
                ))}
              </View>
              <Text style={[s.section, { marginTop: 10 }]}>Soft Skills</Text>
              <View style={s.chipRow}>
                {SOFT_SKILLS.map((x) => (
                  <DarkChip key={x} label={x} active={soft.includes(x)} onPress={() => setSoft((a) => toggle(a, x))} />
                ))}
              </View>
            </>
          )}

          {/* === STEP 3: Next Chapter === */}
          {step === 2 && (
            <View style={s.cardGrid}>
              {NEXT_CHAPTER.map((p) => {
                const Icon = p.Icon;
                const active = nextChapter === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[s.nextCard, active && s.nextCardActive]}
                    onPress={() => setNextChapter(p.id)}
                  >
                    <View style={[s.nextIcon, { backgroundColor: p.tint + '33', borderColor: p.tint }]}>
                      <Icon size={18} color={p.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.nextTitle, active && s.nextTitleActive]}>{p.title}</Text>
                      <Text style={s.nextDesc}>{p.desc}</Text>
                    </View>
                    <View style={[s.radio, active && s.radioActive]}>
                      {active && <View style={s.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* === STEP 4: Photo === */}
          {step === 3 && (
            <View style={{ alignItems: 'center', gap: 16 }}>
              <Pressable onPress={pickPhoto} style={s.photoFrame}>
                {photo
                  ? <Image source={{ uri: photo }} style={s.photoImg} />
                  : <View style={{ alignItems: 'center', gap: 8 }}>
                      <Camera size={32} color="rgba(255,255,255,0.6)" />
                      <Text style={s.photoHint}>Tap to capture</Text>
                    </View>}
              </Pressable>
              <Text style={s.helper}>A profile photo helps build trust with mentors and peers.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={s.smallBtn} onPress={takeSelfie}><Camera size={14} color="#FFF" /><Text style={s.smallBtnText}>Take Selfie</Text></Pressable>
                <Pressable style={s.smallBtn} onPress={pickPhoto}><Upload size={14} color="#FFF" /><Text style={s.smallBtnText}>Upload Photo</Text></Pressable>
              </View>
            </View>
          )}

          {/* === STEP 5: Bio === */}
          {step === 4 && (
            <>
              <Text style={s.section}>Your Bio</Text>
              <View style={s.textareaWrap}>
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. Senior PM at Flipkart with 6 years in product. IIT Bombay alum passionate about mentoring the next generation of builders…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={s.textarea}
                />
              </View>
              <Text style={s.helperRight}>{bio.length}/300</Text>
              <Text style={s.helper}>Your bio appears on your alumni profile - keep it authentic.</Text>
              <Text style={[s.section, { marginTop: 10 }]}>Write Style</Text>
              <View style={s.chipRow}>
                {STYLES.map((x) => (<DarkChip key={x} label={x} active={style === x} onPress={() => setStyle(x)} />))}
              </View>
            </>
          )}

          {/* === STEP 6: Badge === */}
          {step === 5 && (
            <View style={{ alignItems: 'center', gap: 14 }}>
              <View style={[s.badgeCircle, {
                borderColor: badge.tier === 'Platinum' ? '#E5E4E2'
                  : badge.tier === 'Gold' ? '#FFD700'
                  : badge.tier === 'Silver' ? '#C0C0C0' : '#CD7F32'
              }]}>
                <Award size={38} color="#FFF" />
                <Text style={s.badgeTier}>{badge.tier}</Text>
              </View>
              <Text style={s.greeting}>Welcome, {(fullName || user?.full_name || 'Alumni').split(' ')[0]}!</Text>
              <Text style={s.helper}>You've earned {badge.tier} status on Student Alumni.</Text>
              <View style={s.verifiedPill}>
                <CheckCircle2 size={14} color="#FBBF24" />
                <Text style={s.verifiedText}>Verified SA member</Text>
              </View>

              <Text style={[s.section, { marginTop: 14, alignSelf: 'flex-start' }]}>How your badge was calculated</Text>
              <View style={{ width: '100%', gap: 6 }}>
                {[
                  `College: ${college || 'not set'}`,
                  `Experience: ${yoe || '0'} yrs ${parseInt(yoe || '0', 10) >= 8 ? '(8+)' : parseInt(yoe || '0', 10) >= 4 ? '(4-7)' : '(<4)'}`,
                  `Senior title / leadership role: ${jobTitle || 'not set'}`,
                  `Education: graduation ${gradYear || 'not set'}`,
                  `${tech.length + biz.length + soft.length} skills added`,
                  `${domain.length} domains of expertise`,
                  `Profile photo ${photo ? 'added' : 'not added'}`,
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
  // Alumni theme accent: orange/yellow on active step
  dotActive: { borderColor: '#F59E0B', backgroundColor: '#F59E0B' },
  dotText: { color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.bold, fontSize: 11 },
  dotTextActive: { color: '#1F2937' },
  line: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.14)' },
  lineActive: { backgroundColor: '#F59E0B' },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 13.5, textAlign: 'center', marginBottom: 18 },
  section: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Next Chapter cards
  nextCard: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  nextCardActive: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.10)' },
  nextIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  nextTitle: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.bold, fontSize: 13.5 },
  nextTitleActive: { color: '#FFF' },
  nextDesc: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#F59E0B' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B' },

  // Photo
  photoFrame: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoHint: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 12 },
  helper: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  helperRight: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 11, textAlign: 'right', marginTop: -10 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(245,158,11,0.18)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  smallBtnText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },

  // Bio
  textareaWrap: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 14, paddingVertical: 12 },
  textarea: { color: '#FFF', fontFamily: FONTS.med, fontSize: 13.5, minHeight: 100, ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}) },

  // Badge
  badgeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.18)', marginTop: 4 },
  badgeTier: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12, marginTop: 4, letterSpacing: 1 },
  greeting: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 18 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  verifiedText: { color: '#FBBF24', fontFamily: FONTS.bold, fontSize: 11.5 },
  calcRow: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 12.5 },
  perk: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 12.5 },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
});
