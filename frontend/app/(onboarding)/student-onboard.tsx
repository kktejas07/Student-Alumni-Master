/**
 * Student Onboarding — 7-step wizard per HTML spec (screenshots provided).
 *
 * Step 1: Your College      — institution search + grad year + CGPA + name + email + phone
 * Step 2: Education Level   — 8 cards (High School / Diploma / Bachelor's / Master's / MBA / PhD / Executive / Self-taught)
 * Step 3: Interests & Skills — 4 chip sections (Interests / Tech / Business / Soft Skills)
 * Step 4: Career Goals       — 6 radio options (Internship / FAANG / Startup / MBA-MS / Mentor / Explore)
 * Step 5: Profile Photo      — selfie or upload
 * Step 6: Your Bio           — 300-char textarea + 5 writing style chips
 * Step 7: Your SA Badge      — Silver/Gold/Platinum recap + "How calculated" + Perks
 *
 * After Step 7 → /(onboarding)/member-id → /(auth)/email-verify → /(auth)/2fa-setup → /welcome-dashboard
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Upload, GraduationCap, BriefcaseBusiness, BookOpen, Award, Sparkles, Code, CheckCircle2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { DarkChip } from '@/src/views/web/OnboardingShell';
import { InstitutionAutocomplete } from '@/src/views/web/InstitutionAutocomplete';
import { PhoneInput } from '@/src/views/web/PhoneInput';
import { Dropdown } from '@/src/views/web/Dropdown';

const TOTAL = 7;
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const CURRENT_YEAR = new Date().getFullYear();
// Per spec — students are currently studying; graduation year ≥ current year.
const GRAD_YEARS = Array.from({ length: 9 }, (_, i) => String(CURRENT_YEAR + i));

const EDU_LEVELS = [
  { id: 'diploma',     label: 'Diploma / ITI',      icon: Award },
  { id: 'btech',       label: "Bachelor's Degree",  icon: GraduationCap },
  { id: 'masters',     label: "Master's Degree",    icon: GraduationCap },
  { id: 'mba',         label: 'MBA',                icon: BriefcaseBusiness },
  { id: 'phd',         label: 'PhD / Doctorate',    icon: Award },
  { id: 'bootcamp',    label: 'Self-taught / Bootcamp', icon: Code },
];
const INTERESTS  = ['Software Engineering', 'Product Management', 'Data Science', 'UI/UX Design', 'Finance & Banking', 'Consulting', 'Entrepreneurship', 'Research'];
const TECH       = ['Python', 'JavaScript', 'React', 'Node.js', 'ML / AI', 'Cloud (AWS/GCP)', 'DevOps', 'Flutter', 'Figma', 'SQL'];
const BUSINESS   = ['Excel / Sheets', 'PowerPoint', 'Financial Modelling', 'Market Research', 'Product Strategy', 'Operations', 'Sales', 'Marketing'];
const SOFT       = ['Communication', 'Leadership', 'Problem Solving', 'Time Management', 'Teamwork', 'Critical Thinking', 'Adaptability'];
const GOALS = [
  { id: 'top_internship', label: 'Crack a top internship' },
  { id: 'faang',          label: 'Get a FAANG job' },
  { id: 'startup',        label: 'Build my own startup' },
  { id: 'mba_ms',         label: 'Crack MBA/MS admissions' },
  { id: 'mentor',         label: 'Find a mentor' },
  { id: 'explore',        label: 'Explore career options' },
];
const STYLES = ['Friendly & warm', 'Professional', 'Inspiring', 'Concise', 'Detailed'];

// Stepper — 7 circular step indicators with purple fill for done/active
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

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function StudentOnboard() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const [step, setStep] = useState(0);

  // ---- Step 1: College ----
  const [college, setCollege]   = useState('');
  const [gradYear, setGradYear] = useState('');
  const [cgpa, setCgpa]         = useState('');
  const [name, setName]         = useState(user?.full_name || '');
  const [phone, setPhone]       = useState(user?.phone || '');
  const [city, setCity]         = useState('');
  const [stateName, setState2]  = useState('');

  // ---- Step 2: Education ----
  const [edu, setEdu] = useState<string>('');

  // ---- Step 3: Interests & Skills ----
  const [ints, setInts]   = useState<string[]>([]);
  const [tech, setTech]   = useState<string[]>([]);
  const [biz, setBiz]     = useState<string[]>([]);
  const [soft, setSoft]   = useState<string[]>([]);

  // ---- Step 4: Goal ----
  const [goal, setGoal] = useState('');

  // ---- Step 5: Photo ----
  const [photo, setPhoto] = useState<string>('');  // base64

  // ---- Step 6: Bio ----
  const [bio, setBio]     = useState('');
  const [style, setStyle] = useState('');

  // ---- Step 7: Badge (computed client-side for preview) ----
  const badge = useMemo(() => {
    let score = 0;
    if (college) score += 1;
    if (gradYear) score += 1;
    if (cgpa && parseFloat(cgpa) >= 7.0) score += 2; else if (cgpa) score += 1;
    if (edu) score += 1;
    if (ints.length + tech.length + biz.length + soft.length >= 5) score += 2; else if (ints.length + tech.length + biz.length + soft.length > 0) score += 1;
    if (goal) score += 1;
    if (photo) score += 1;
    if (bio.length > 40) score += 1;
    const tier = score >= 9 ? 'Platinum' : score >= 7 ? 'Gold' : score >= 4 ? 'Silver' : 'Bronze';
    return { score, tier };
  }, [college, gradYear, cgpa, edu, ints, tech, biz, soft, goal, photo, bio]);

  const next = () => setStep((st) => Math.min(st + 1, TOTAL - 1));
  const prev = () => setStep((st) => Math.max(st - 1, 0));

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!college) return 'Please pick your college/university.';
      if (!gradYear) return 'Graduation year is required.';
      if (!name.trim()) return 'Full name is required.';
      if (phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
    }
    if (step === 1 && !edu) return 'Please pick your current education level.';
    if (step === 3 && !goal) return 'Please pick a primary career goal.';
    return null;
  };

  const onContinue = async () => {
    const err = validateStep();
    if (err) { toast.error('Check your details', err); return; }
    if (step < TOTAL - 1) return next();
    // Step 7: submit onboarding + route to member-id
    await submitOnboarding();
  };

  const submitOnboarding = async () => {
    try {
      const payload: any = {
        school_info: {
          country: 'India',
          institution_type: 'college',
          institution_name: college,
          graduation_year: parseInt(gradYear, 10) || undefined,
          city: city || undefined,
          state: stateName || undefined,
        },
        career_path: 'job',
        student_info: {
          age: 20,
          education_level: edu || 'btech',
          career_interests: ints,
          cgpa: cgpa.trim() ? parseFloat(cgpa) : undefined,
          career_goal: goal,
        },
        interests: [...ints],
        skills: [...tech, ...biz, ...soft],
        bio: bio || `${name} — ${edu || 'Student'} aspiring ${goal || 'career'}`,
        face_image_base64: photo || undefined,
        phone,
      };
      await api.completeOnboarding(payload);
      await refreshUser();
      toast.success(`${badge.tier} badge earned! 🎉`, 'Taking you to your Member ID…');
      router.replace('/(onboarding)/member-id' as any);
    } catch (e: any) {
      toast.error('Setup failed', e?.message || 'Please try again.');
    }
  };

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) {
        setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch { toast.error('Photo', 'Could not open gallery.'); }
  };
  const takeSelfie = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast.error('Camera', 'Permission denied.'); return; }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) {
        setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch { toast.error('Camera', 'Could not open camera.'); }
  };

  const HEADS = [
    { title: 'Your College',          sub: 'Tell us where you study' },
    { title: 'Education Level',       sub: 'What level are you currently at?' },
    { title: 'Interests & Skills',    sub: 'What powers your recommendations' },
    { title: 'Career Goals',          sub: 'What are you aspiring to achieve?' },
    { title: 'Profile Photo',         sub: 'Put a face to your name' },
    { title: 'Your Bio',              sub: 'Introduce yourself in a few lines' },
    { title: 'Your SA Badge',         sub: 'Based on your profile' },
  ];
  const head = HEADS[step];

  return (
    <AuthShell role="student">
      <Stepper step={step} />
      <Text style={s.title}>{head.title}</Text>
      <Text style={s.sub}>{head.sub}</Text>

      <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 6, gap: 12 }}>
          {/* === STEP 1: College === */}
          {step === 0 && (
            <>
              <Text style={s.section}>College / University *</Text>
              <InstitutionAutocomplete
                value={college}
                onChangeText={setCollege}
                onSelect={(pick) => { setCollege(pick.name); if (!city && pick.city) setCity(pick.city); if (!stateName && pick.state) setState2(pick.state); }}
                type="college"
                placeholder="Search your institution…"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Dropdown
                    label="Graduation Year"
                    required
                    value={gradYear}
                    options={GRAD_YEARS.map((y) => ({ value: y, label: y }))}
                    onChange={setGradYear}
                    placeholder="Select year"
                    testID="grad-year-dropdown"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthInput label="CGPA" value={cgpa} onChangeText={setCgpa} placeholder="8.5" keyboardType="decimal-pad" />
                </View>
              </View>
              <AuthInput label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Arjun Sharma" autoCapitalize="words" />
              <AuthInput label="Email Address" value={user?.email || ''} onChangeText={() => {}} placeholder="you@college.edu" />
              <PhoneInput label="Phone Number *" value={phone} onChangeText={setPhone} />
            </>
          )}

          {/* === STEP 2: Education === */}
          {step === 1 && (
            <View style={s.cardGrid}>
              {EDU_LEVELS.map((e) => {
                const Icon = e.icon;
                const active = edu === e.id;
                return (
                  <Pressable key={e.id} style={[s.card, active && s.cardActive]} onPress={() => setEdu(e.id)}>
                    <Icon size={22} color={active ? '#B07FDF' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[s.cardLabel, active && s.cardLabelActive]}>{e.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* === STEP 3: Interests & Skills === */}
          {step === 2 && (
            <>
              <Text style={s.section}>Interests</Text>
              <View style={s.chipRow}>{INTERESTS.map((x) => (<DarkChip key={x} label={x} active={ints.includes(x)} onPress={() => setInts((a) => toggle(a, x))} />))}</View>
              <Text style={s.section}>Tech</Text>
              <View style={s.chipRow}>{TECH.map((x) => (<DarkChip key={x} label={x} active={tech.includes(x)} onPress={() => setTech((a) => toggle(a, x))} />))}</View>
              <Text style={s.section}>Business</Text>
              <View style={s.chipRow}>{BUSINESS.map((x) => (<DarkChip key={x} label={x} active={biz.includes(x)} onPress={() => setBiz((a) => toggle(a, x))} />))}</View>
              <Text style={s.section}>Soft Skills</Text>
              <View style={s.chipRow}>{SOFT.map((x) => (<DarkChip key={x} label={x} active={soft.includes(x)} onPress={() => setSoft((a) => toggle(a, x))} />))}</View>
            </>
          )}

          {/* === STEP 4: Career Goal === */}
          {step === 3 && (
            <View style={{ gap: 10 }}>
              {GOALS.map((g) => {
                const active = goal === g.id;
                return (
                  <Pressable key={g.id} style={[s.optRow, active && s.optRowActive]} onPress={() => setGoal(g.id)}>
                    <View style={[s.radio, active && s.radioActive]}>{active && <View style={s.radioDot} />}</View>
                    <Text style={[s.optLabel, active && s.optLabelActive]}>{g.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* === STEP 5: Photo === */}
          {step === 4 && (
            <View style={{ alignItems: 'center', gap: 16 }}>
              <Pressable onPress={pickPhoto} style={s.photoFrame}>
                {photo ? (
                  <Image source={{ uri: photo }} style={s.photoImg} />
                ) : (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Camera size={32} color="rgba(255,255,255,0.6)" />
                    <Text style={s.photoHint}>Tap to capture</Text>
                  </View>
                )}
              </Pressable>
              <Text style={s.helper}>A profile photo helps build trust with mentors and peers.{'\n'}Your photo is only visible to connected users.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={s.smallBtn} onPress={takeSelfie}><Camera size={14} color="#FFF" /><Text style={s.smallBtnText}>Take Selfie</Text></Pressable>
                <Pressable style={s.smallBtn} onPress={pickPhoto}><Upload size={14} color="#FFF" /><Text style={s.smallBtnText}>Upload Photo</Text></Pressable>
              </View>
            </View>
          )}

          {/* === STEP 6: Bio === */}
          {step === 5 && (
            <>
              <Text style={s.section}>Your Bio</Text>
              <View style={s.textareaWrap}>
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. Final year CSE student at IIT Bombay, passionate about building AI products and connecting with industry mentors..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={s.textarea}
                />
              </View>
              <Text style={s.helperRight}>{bio.length}/300</Text>
              <Text style={s.helper}>Keep it genuine — 2–3 sentences work best.</Text>
              <Text style={s.section}>Writing Style</Text>
              <View style={s.chipRow}>{STYLES.map((x) => (<DarkChip key={x} label={x} active={style === x} onPress={() => setStyle(x)} />))}</View>
            </>
          )}

          {/* === STEP 7: Badge === */}
          {step === 6 && (
            <View style={{ alignItems: 'center', gap: 14 }}>
              <View style={[s.badgeCircle, { borderColor: badge.tier === 'Platinum' ? '#E5E4E2' : badge.tier === 'Gold' ? '#FFD700' : badge.tier === 'Silver' ? '#C0C0C0' : '#CD7F32' }]}>
                <Award size={38} color="#FFF" />
                <Text style={s.badgeTier}>{badge.tier}</Text>
              </View>
              <Text style={s.greeting}>Welcome, {name.split(' ')[0] || 'there'}!</Text>
              <Text style={s.helper}>You've earned {badge.tier} status on Student Alumni.</Text>
              <View style={s.verifiedPill}><CheckCircle2 size={14} color="#5EEAD4" /><Text style={s.verifiedText}>Verified SA member</Text></View>

              <Text style={[s.section, { marginTop: 14, alignSelf: 'flex-start' }]}>How your badge was calculated</Text>
              <View style={{ width: '100%', gap: 6 }}>
                {[
                  `Institution: ${college || 'not set'}`,
                  `CGPA — ${cgpa ? (parseFloat(cgpa) >= 7 ? 'Strong' : '< 7.0') : 'not set'}`,
                  `Education: ${edu || 'not set'}`,
                  `${ints.length} interests selected`,
                  `${tech.length + biz.length + soft.length} skills added`,
                  `Career goal: ${goal || 'not set'}`,
                  `Profile photo: ${photo ? 'added' : 'not set'}`,
                  `Bio: ${bio.length > 20 ? 'written' : 'not set'}`,
                ].map((l) => (
                  <Text key={l} style={s.calcRow}>• {l}</Text>
                ))}
              </View>

              <Text style={[s.section, { marginTop: 12, alignSelf: 'flex-start' }]}>{badge.tier} Perks</Text>
              <View style={{ width: '100%', gap: 6 }}>
                <Text style={s.perk}>✔ Verified SA member badge</Text>
                <Text style={s.perk}>✔ +{badge.tier === 'Platinum' ? 500 : badge.tier === 'Gold' ? 200 : badge.tier === 'Silver' ? 50 : 10} bonus credits</Text>
                <Text style={s.perk}>✨ Upgrade by completing your profile</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={s.navRow}>
        {step > 0 ? (
          <Pressable onPress={prev} style={s.backBtn}>
            <ArrowLeft size={18} color="#FFF" />
          </Pressable>
        ) : <View style={{ width: 42 }} />}
        <View style={{ flex: 1 }}>
          <PrimaryButton label={step === TOTAL - 1 ? 'See My Member ID →' : 'Continue →'} onPress={onContinue} />
        </View>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  dotActive: { borderColor: '#B07FDF', backgroundColor: '#7C3AED' },
  dotText: { color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.bold, fontSize: 11 },
  dotTextActive: { color: '#FFF' },
  line: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.14)' },
  lineActive: { backgroundColor: '#7C3AED' },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 13.5, textAlign: 'center', marginBottom: 18 },
  section: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', gap: 10, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  cardActive: { borderColor: '#B07FDF', backgroundColor: 'rgba(176,127,223,0.14)' },
  cardLabel: { flex: 1, color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 13 },
  cardLabelActive: { color: '#FFF' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  optRowActive: { borderColor: '#B07FDF', backgroundColor: 'rgba(176,127,223,0.14)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#B07FDF' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B07FDF' },
  optLabel: { color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 14 },
  optLabelActive: { color: '#FFF' },
  photoFrame: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoHint: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 12 },
  helper: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  helperRight: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 11, textAlign: 'right', marginTop: -10 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(124,58,237,0.32)', borderWidth: 1, borderColor: 'rgba(176,127,223,0.4)' },
  smallBtnText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },
  textareaWrap: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 14, paddingVertical: 12 },
  textarea: { color: '#FFF', fontFamily: FONTS.med, fontSize: 13.5, minHeight: 100, ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}) },
  badgeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,58,237,0.22)', marginTop: 4 },
  badgeTier: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12, marginTop: 4, letterSpacing: 1 },
  greeting: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 18 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(94,234,212,0.12)', borderWidth: 1, borderColor: 'rgba(94,234,212,0.3)' },
  verifiedText: { color: '#5EEAD4', fontFamily: FONTS.bold, fontSize: 11.5 },
  calcRow: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 12.5 },
  perk: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 12.5 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
});
