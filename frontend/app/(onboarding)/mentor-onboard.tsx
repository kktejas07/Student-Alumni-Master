/**
 * Mentor Onboarding — 8-step wizard per Mentor UI spec (Archive.zip screenshots).
 *
 * Step 1: Your Profile         — Current Role, Company, College & Batch, YoE, Session Price (₹) chips
 * Step 2: Mentorship Archetype — 10 multi-select tile grid (Career Coach, Tech Guru, …)
 * Step 3: Education Background — 8 cards (High School / Diploma / Bachelor's / Master's / MBA / PhD / Executive / Self-taught)
 * Step 4: Your Expertise       — 9 chip multi-select (System Design, Career Guidance, …)
 * Step 5: Your Availability    — 7 day×time slot tiles (Mon–Fri 6–7 PM, Sat–Sun 10 AM–12 PM)
 * Step 6: Profile Photo        — selfie or upload
 * Step 7: Your Bio             — 300-char textarea + 5 writing-style chips
 * Step 8: Your SA Badge        — Bronze/Silver/Gold/Platinum recap + verification + perks
 *
 * After Step 8 → /(onboarding)/member-id → /welcome-dashboard
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Camera, Upload, GraduationCap, BriefcaseBusiness, BookOpen, Award, Sparkles, Code, CheckCircle2,
  Compass, Code as CodeIcon, Rocket, MessageSquare, Brain, UsersRound, TrendingUp, FileText, Palette, HandHeart,
  Briefcase, Building2, Clock, Trophy, Scroll, GraduationCap as Cap, BookOpen as BookIcon,
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

const TOTAL = 8;
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const CURRENT_YEAR = new Date().getFullYear();
// For mentors, batch year is in the past — they've already graduated.
const BATCH_YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

// === Step 2: Mentorship Archetypes (10 tiles) ===
type Archetype = {
  id: string;          // backend MentorCategory slug
  title: string;
  desc: string;
  Icon: any;
  tint: string;
};
const ARCHETYPES: Archetype[] = [
  { id: 'career_coach',     title: 'Career Coach',       desc: 'Help navigate career paths & transitions',     Icon: Compass,       tint: '#A78BFA' },
  { id: 'it_software',      title: 'Tech Guru',          desc: 'Deep technical skills & system design',         Icon: CodeIcon,      tint: '#60A5FA' },
  { id: 'startup_advisor',  title: 'Startup Advisor',    desc: 'Entrepreneurship, fundraising & PMF',           Icon: Rocket,        tint: '#FB923C' },
  { id: 'interview_prep',   title: 'Interview Prep',     desc: 'Mock interviews, DSA, system design rounds',    Icon: MessageSquare, tint: '#34D399' },
  { id: 'higher_education', title: 'Research Mentor',    desc: 'Publications, PhD guidance & academic writing', Icon: Brain,         tint: '#C084FC' },
  { id: 'engineering_manager', title: 'Leadership Coach', desc: 'Management, team building & exec presence',    Icon: UsersRound,    tint: '#F87171' },
  { id: 'industry_advisor', title: 'Finance & Investing', desc: 'Markets, fintech, IB & quant',                 Icon: TrendingUp,    tint: '#FBBF24' },
  { id: 'business_mentor',  title: 'Product Mentor',     desc: 'PM frameworks, roadmaps & stakeholder mgmt',    Icon: FileText,      tint: '#9CA3AF' },
  { id: 'creative_design',  title: 'Creative & Design',  desc: 'UX/UI, branding, creative careers & portfolios', Icon: Palette,      tint: '#F472B6' },
  { id: 'life_wellness',    title: 'Life & Wellness',    desc: 'Work-life balance, mental health & mindfulness', Icon: HandHeart,    tint: '#22D3EE' },
];

// === Step 3: Education Background (8 cards) ===
const EDU_LEVELS = [
  { id: 'high_school', label: 'High School',           Icon: Building2 },
  { id: 'diploma',     label: 'Diploma / ITI',         Icon: Scroll },
  { id: 'btech',       label: "Bachelor's Degree",     Icon: GraduationCap },
  { id: 'masters',     label: "Master's Degree",       Icon: Cap },
  { id: 'mba',         label: 'MBA',                   Icon: BriefcaseBusiness },
  { id: 'phd',         label: 'PhD / Doctorate',       Icon: BookIcon },
  { id: 'executive',   label: 'Executive Programme',   Icon: Trophy },
  { id: 'bootcamp',    label: 'Self-taught / Bootcamp', Icon: Code },
];

// === Step 4: Expertise chips (9) ===
const EXPERTISE = [
  'System Design', 'Career Guidance', 'Product Management',
  'Startup Advice', 'Data Science', 'Finance',
  'Leadership', 'Communication', 'Negotiation',
];

// === Step 5: Availability slots ===
type Slot = { id: string; label: string };
const AVAILABILITY: Slot[] = [
  { id: 'mon_18_19', label: 'Mon 6–7 PM' },
  { id: 'tue_18_19', label: 'Tue 6–7 PM' },
  { id: 'wed_18_19', label: 'Wed 6–7 PM' },
  { id: 'thu_18_19', label: 'Thu 6–7 PM' },
  { id: 'fri_18_19', label: 'Fri 6–7 PM' },
  { id: 'sat_10_12', label: 'Sat 10 AM–12 PM' },
  { id: 'sun_10_12', label: 'Sun 10 AM–12 PM' },
];

// === Step 1: Session price chips (₹) ===
const PRICE_CHIPS = [499, 799, 999, 1499];

// === Step 7: Writing styles ===
const STYLES = ['Friendly & warm', 'Professional', 'Inspiring', 'Concise', 'Detailed'];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

// Stepper — 8 circular indicators with purple fill for done/active
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

export default function MentorOnboard() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const [step, setStep] = useState(0);

  // ---- Step 1: Profile ----
  const [jobTitle,  setJobTitle]    = useState('');
  const [company,   setCompany]     = useState('');
  const [college,   setCollege]     = useState('');
  const [batch,     setBatch]       = useState('');
  const [yoe,       setYoe]         = useState('5');
  const [price,     setPrice]       = useState<number>(999);
  const [customOn,  setCustomOn]    = useState(false);
  const [customPrice, setCustomPrice] = useState('');

  // ---- Step 2: Archetypes ----
  const [archetypes, setArchetypes] = useState<string[]>([]);

  // ---- Step 3: Education ----
  const [edu, setEdu] = useState<string>('');

  // ---- Step 4: Expertise ----
  const [expertise, setExpertise] = useState<string[]>([]);

  // ---- Step 5: Availability ----
  const [availability, setAvailability] = useState<string[]>([]);

  // ---- Step 6: Photo ----
  const [photo, setPhoto] = useState<string>('');

  // ---- Step 7: Bio ----
  const [bio, setBio]     = useState('');
  const [style, setStyle] = useState('');

  // ---- Suggestions (fetched once on mount) ----
  const [roleSuggestions, setRoleSuggestions]   = useState<string[]>([]);
  const [orgSuggestions,  setOrgSuggestions]    = useState<string[]>([]);
  // Fallback defaults if API is slow / offline
  const FALLBACK_ROLES = ['Software Engineer', 'Senior Software Engineer', 'Engineering Manager', 'Product Manager', 'Data Scientist', 'Designer', 'CTO', 'Founder'];
  const FALLBACK_ORGS  = ['Google', 'Microsoft', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Flipkart', 'Swiggy', 'Paytm', 'Razorpay'];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${BASE}/api/mentors/suggestions`);
        if (!r.ok) throw new Error('suggestions fetch failed');
        const data = await r.json();
        if (!alive) return;
        setRoleSuggestions(Array.isArray(data.job_titles) && data.job_titles.length ? data.job_titles : FALLBACK_ROLES);
        setOrgSuggestions(Array.isArray(data.organizations) && data.organizations.length ? data.organizations : FALLBACK_ORGS);
      } catch {
        if (!alive) return;
        setRoleSuggestions(FALLBACK_ROLES);
        setOrgSuggestions(FALLBACK_ORGS);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ---- Step 8: Badge (computed client-side for preview) ----
  const badge = useMemo(() => {
    let score = 0;
    if (jobTitle && company) score += 2;
    if (college) score += 1;
    if (parseInt(yoe || '0', 10) >= 3) score += 2;
    else if (parseInt(yoe || '0', 10) >= 1) score += 1;
    if (archetypes.length >= 3) score += 2;
    else if (archetypes.length > 0) score += 1;
    if (edu) score += 1;
    if (expertise.length >= 3) score += 2;
    else if (expertise.length > 0) score += 1;
    if (availability.length >= 3) score += 1;
    if (photo) score += 1;
    if (bio.length > 40) score += 1;
    const tier = score >= 11 ? 'Platinum' : score >= 8 ? 'Gold' : score >= 5 ? 'Silver' : 'Bronze';
    return { score, tier };
  }, [jobTitle, company, college, yoe, archetypes, edu, expertise, availability, photo, bio]);

  const next = () => setStep((st) => Math.min(st + 1, TOTAL - 1));
  const prev = () => setStep((st) => Math.max(st - 1, 0));

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!jobTitle.trim()) return 'Current role is required.';
      if (!company.trim()) return 'Company is required.';
      if (!college.trim()) return 'College / batch is required.';
      const y = parseInt(yoe || '0', 10);
      if (!y || y < 0 || y > 60) return 'Enter valid years of experience (0–60).';
      if (!price || price < 0) return 'Pick a session price.';
    }
    if (step === 1 && archetypes.length === 0) return 'Pick at least one mentorship archetype.';
    if (step === 2 && !edu) return 'Pick your education background.';
    if (step === 3 && expertise.length === 0) return 'Pick at least one area of expertise.';
    if (step === 4 && availability.length === 0) return 'Pick at least one time slot.';
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
      const primary = (archetypes[0] || 'career_coach') as any;
      const payload: any = {
        school_info: {
          country: 'India',
          institution_type: 'college',
          institution_name: college,
          graduation_year: batch ? parseInt(batch, 10) : undefined,
        },
        mentor_info: {
          category:           primary,
          categories:         archetypes,
          organization:       company,
          job_title:          jobTitle,
          years_of_experience: parseInt(yoe || '0', 10) || 0,
          session_price_inr:  price,
          education_level:    edu || undefined,
          expertise:          expertise,
          availability:       availability,
          profile_photo:      photo || undefined,
          college:            college,
          college_batch:      batch ? parseInt(batch, 10) : undefined,
          bio:                bio || undefined,
        },
        career_path: 'job',
        interests:   [],
        skills:      expertise,
        bio:         bio || `${jobTitle || 'Mentor'} at ${company || ''} — open to mentor students`,
        face_image_base64: photo || undefined,
      };
      await api.completeOnboarding(payload);
      await refreshUser();
      toast.success(`${badge.tier} badge earned! 🎉`, 'Verifying your email next…');
      // Per spec — Step 8 → Email Verify → 2FA Setup → Welcome Dashboard
      // (Member ID is accessible later from within the Mentor Portal.)
      router.replace(`/(auth)/email-verify?email=${encodeURIComponent(user?.email || '')}` as any);
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
    { title: 'Your Profile',         sub: 'Tell students who you are' },
    { title: 'Mentorship Archetype', sub: 'How do you mentor best? Pick all that apply' },
    { title: 'Education Background', sub: 'Your academic background' },
    { title: 'Your Expertise',       sub: 'What can you mentor best?' },
    { title: 'Your Availability',    sub: 'When are you free to mentor?' },
    { title: 'Profile Photo',        sub: 'Help students recognise you' },
    { title: 'Your Bio',             sub: 'Introduce yourself in a few lines' },
    { title: 'Your SA Badge',        sub: 'Based on your profile' },
  ];
  const head = HEADS[step];

  return (
    <AuthShell role="mentor">
      <Stepper step={step} />
      <Text style={s.title}>{head.title}</Text>
      <Text style={s.sub}>{head.sub}</Text>

      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 6, gap: 12 }}>
          {/* === STEP 1: Profile === */}
          {step === 0 && (
            <>
              <SuggestionAutocomplete
                label="Current Role"
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="e.g. SDE-2 at Google"
                suggestions={roleSuggestions}
                helper="Pick from our curated list — or type your own."
              />
              <SuggestionAutocomplete
                label="Company"
                value={company}
                onChangeText={setCompany}
                placeholder="Company name (type to search)"
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
                    label="Batch Year"
                    value={batch}
                    options={BATCH_YEARS.map((y) => ({ value: y, label: y }))}
                    onChange={setBatch}
                    placeholder="Select year"
                    testID="batch-year-dropdown"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AuthInput
                    label="Years of Experience"
                    value={yoe}
                    onChangeText={(t) => setYoe(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="5"
                    keyboardType="numeric"
                    leftIcon={<Clock size={16} color="rgba(255,255,255,0.55)" />}
                  />
                </View>
              </View>
              <Text style={s.section}>Session Price (₹)</Text>
              <View style={[s.chipRow, { gap: 8 }]}>
                {PRICE_CHIPS.map((p) => {
                  const active = !customOn && price === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => { setPrice(p); setCustomOn(false); }}
                      style={[s.priceChip, active && s.priceChipActive]}
                    >
                      <Text style={[s.priceChipText, active && s.priceChipTextActive]}>₹{p}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setCustomOn(true)}
                  style={[s.priceChip, customOn && s.priceChipActive]}
                >
                  <Text style={[s.priceChipText, customOn && s.priceChipTextActive]}>Custom</Text>
                </Pressable>
              </View>
              {customOn && (
                <AuthInput
                  label="Custom Price (₹)"
                  value={customPrice}
                  onChangeText={(t) => {
                    const clean = t.replace(/[^0-9]/g, '').slice(0, 6);
                    setCustomPrice(clean);
                    const n = parseInt(clean || '0', 10);
                    if (n > 0) setPrice(n);
                  }}
                  placeholder="e.g. 1299"
                  keyboardType="numeric"
                  hint="Set your own session price in INR."
                />
              )}
            </>
          )}

          {/* === STEP 2: Archetypes === */}
          {step === 1 && (
            <View style={s.cardGrid}>
              {ARCHETYPES.map((a) => {
                const Icon = a.Icon;
                const active = archetypes.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    style={[s.archetypeCard, active && s.archetypeCardActive]}
                    onPress={() => setArchetypes((arr) => toggle(arr, a.id))}
                  >
                    <View style={[s.archetypeIcon, { backgroundColor: a.tint + '33', borderColor: a.tint }]}>
                      <Icon size={18} color={a.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.archetypeTitle, active && s.archetypeTitleActive]}>{a.title}</Text>
                      <Text style={s.archetypeDesc}>{a.desc}</Text>
                    </View>
                    {active && <CheckCircle2 size={16} color="#B07FDF" />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* === STEP 3: Education === */}
          {step === 2 && (
            <View style={s.cardGrid}>
              {EDU_LEVELS.map((e) => {
                const Icon = e.Icon;
                const active = edu === e.id;
                return (
                  <Pressable key={e.id} style={[s.eduCard, active && s.eduCardActive]} onPress={() => setEdu(e.id)}>
                    <Icon size={22} color={active ? '#B07FDF' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[s.cardLabel, active && s.cardLabelActive]}>{e.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* === STEP 4: Expertise === */}
          {step === 3 && (
            <View style={s.chipRow}>
              {EXPERTISE.map((x) => (
                <DarkChip key={x} label={x} active={expertise.includes(x)} onPress={() => setExpertise((a) => toggle(a, x))} />
              ))}
            </View>
          )}

          {/* === STEP 5: Availability === */}
          {step === 4 && (
            <View style={s.cardGrid}>
              {AVAILABILITY.map((slot) => {
                const active = availability.includes(slot.id);
                return (
                  <Pressable
                    key={slot.id}
                    style={[s.slotCard, active && s.slotCardActive]}
                    onPress={() => setAvailability((arr) => toggle(arr, slot.id))}
                  >
                    <Clock size={16} color={active ? '#B07FDF' : 'rgba(255,255,255,0.55)'} />
                    <Text style={[s.cardLabel, active && s.cardLabelActive]}>{slot.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* === STEP 6: Photo === */}
          {step === 5 && (
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

          {/* === STEP 7: Bio === */}
          {step === 6 && (
            <>
              <Text style={s.section}>Your Bio</Text>
              <View style={s.textareaWrap}>
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. SDE-2 at Google with 5+ yrs in distributed systems. Happy to help with system design, FAANG interviews & career growth."
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

          {/* === STEP 8: Badge === */}
          {step === 7 && (
            <View style={{ alignItems: 'center', gap: 14 }}>
              <View style={[s.badgeCircle, { borderColor: badge.tier === 'Platinum' ? '#E5E4E2' : badge.tier === 'Gold' ? '#FFD700' : badge.tier === 'Silver' ? '#C0C0C0' : '#CD7F32' }]}>
                <Award size={38} color="#FFF" />
                <Text style={s.badgeTier}>{badge.tier}</Text>
              </View>
              <Text style={s.greeting}>Welcome, {(user?.full_name || 'Mentor').split(' ')[0]}!</Text>
              <Text style={s.helper}>You've earned {badge.tier} status as a mentor on Student Alumni.</Text>
              <View style={s.verifiedPill}><CheckCircle2 size={14} color="#5EEAD4" /><Text style={s.verifiedText}>Pending admin verification</Text></View>

              <Text style={[s.section, { marginTop: 14, alignSelf: 'flex-start' }]}>How your badge was calculated</Text>
              <View style={{ width: '100%', gap: 6 }}>
                {[
                  `Role: ${jobTitle || 'not set'} ${company ? '· ' + company : ''}`,
                  `Experience: ${yoe || '0'} yrs`,
                  `Archetypes: ${archetypes.length} selected`,
                  `Education: ${edu || 'not set'}`,
                  `Expertise: ${expertise.length} chips`,
                  `Availability: ${availability.length} slots`,
                  `Session price: ₹${price}`,
                  `Profile photo: ${photo ? 'added' : 'not set'}`,
                  `Bio: ${bio.length > 20 ? 'written' : 'not set'}`,
                ].map((l) => (
                  <Text key={l} style={s.calcRow}>• {l}</Text>
                ))}
              </View>

              <Text style={[s.section, { marginTop: 12, alignSelf: 'flex-start' }]}>{badge.tier} Mentor Perks</Text>
              <View style={{ width: '100%', gap: 6 }}>
                <Text style={s.perk}>✔ Verified mentor badge after admin approval</Text>
                <Text style={s.perk}>✔ Featured placement in suggestions: {badge.tier === 'Platinum' ? 'Top tier' : badge.tier === 'Gold' ? 'High' : badge.tier === 'Silver' ? 'Standard' : 'Basic'}</Text>
                <Text style={s.perk}>💰 Earn ₹{price} per 1:1 session</Text>
                <Text style={s.perk}>✨ Upgrade tier by adding more archetypes & sessions</Text>
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
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  dotActive: { borderColor: '#B07FDF', backgroundColor: '#7C3AED' },
  dotText: { color: 'rgba(255,255,255,0.4)', fontFamily: FONTS.bold, fontSize: 10 },
  dotTextActive: { color: '#FFF' },
  line: { flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.14)' },
  lineActive: { backgroundColor: '#7C3AED' },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 13.5, textAlign: 'center', marginBottom: 18 },
  section: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Archetype tile
  archetypeCard: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  archetypeCardActive: { borderColor: '#B07FDF', backgroundColor: 'rgba(176,127,223,0.14)' },
  archetypeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  archetypeTitle: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.bold, fontSize: 13.5 },
  archetypeTitleActive: { color: '#FFF' },
  archetypeDesc: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },

  // Edu / availability cards (48% width — two per row)
  eduCard: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  eduCardActive: { borderColor: '#B07FDF', backgroundColor: 'rgba(176,127,223,0.14)' },

  slotCard: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  slotCardActive: { borderColor: '#B07FDF', backgroundColor: 'rgba(176,127,223,0.14)' },

  cardLabel: { flex: 1, color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 13 },
  cardLabelActive: { color: '#FFF' },

  // Price chips
  priceChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  priceChipActive: { borderColor: '#B07FDF', backgroundColor: 'rgba(176,127,223,0.18)' },
  priceChipText: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.bold, fontSize: 14 },
  priceChipTextActive: { color: '#FFF' },

  // Photo
  photoFrame: {
    width: 160, height: 160, borderRadius: 80, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoHint: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 12 },
  helper: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  helperRight: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 11, textAlign: 'right', marginTop: -10 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(124,58,237,0.32)', borderWidth: 1, borderColor: 'rgba(176,127,223,0.4)' },
  smallBtnText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 },

  // Bio textarea
  textareaWrap: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 14, paddingVertical: 12 },
  textarea: { color: '#FFF', fontFamily: FONTS.med, fontSize: 13.5, minHeight: 100, ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}) },

  // Badge
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
