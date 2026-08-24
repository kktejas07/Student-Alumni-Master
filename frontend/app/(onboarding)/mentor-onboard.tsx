import { getBaseUrl } from '@/src/lib/env';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Camera, Upload, GraduationCap, BriefcaseBusiness, BookOpen, Award, Sparkles, Code, CheckCircle2, Check,
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
import { WebcamModal } from '@/src/views/components/WebcamModal';

const TOTAL = 8;
const BASE = getBaseUrl();
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

type Archetype = {
  id: string;
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

const EXPERTISE = [
  'System Design', 'Career Guidance', 'Product Management',
  'Startup Advice', 'Data Science', 'Finance',
  'Leadership', 'Communication', 'Negotiation',
];

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

const PRICE_CHIPS = [499, 799, 999, 1499];

const STYLES = ['Friendly & warm', 'Professional', 'Inspiring', 'Concise', 'Detailed'];

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
            <View className={`w-6 h-6 rounded-full border-[1.5px] items-center justify-center ${done || active ? 'border-violet bg-violet' : 'border-gray-200 bg-gray-50'}`}>
              {done ? <CheckCircle2 size={14} color="#111827" /> : <Text className={`font-body-bold text-[10px] ${active ? 'text-white' : 'text-muted'}`}>{i + 1}</Text>}
            </View>
            {i < TOTAL - 1 && <View className={`flex-1 h-[1.5px] ${done ? 'bg-violet' : 'bg-gray-200'}`} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function MentorOnboard() {
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

  const [jobTitle,  setJobTitle]    = useState('');
  const [company,   setCompany]     = useState('');
  const [college,   setCollege]     = useState('');
  const [batch,     setBatch]       = useState('');
  const [yoe,       setYoe]         = useState('5');
  const [price,     setPrice]       = useState<number>(999);
  const [customOn,  setCustomOn]    = useState(false);
  const [customPrice, setCustomPrice] = useState('');

  const [archetypes, setArchetypes] = useState<string[]>([]);

  const [edu, setEdu] = useState<string>('');

  const [expertise, setExpertise] = useState<string[]>([]);

  const [availability, setAvailability] = useState<string[]>([]);

  const [photo, setPhoto] = useState<string>('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [webcamVisible, setWebcamVisible] = useState(false);

  const confirmPhoto = () => {
    if (!pendingPhoto) return;
    setPhoto(pendingPhoto);
    setPendingPhoto(null);
    toast.success('Photo confirmed', 'Looking great!');
  };

  const [bio, setBio]     = useState('');
  const [style, setStyle] = useState('');
  const [generatingBio, setGeneratingBio] = useState(false);

  const handleStylePress = async (s: string) => {
    setStyle(s);
    setGeneratingBio(true);
    try {
      const res = await api.generateBio({
        role: 'mentor',
        full_name: user?.full_name,
        writing_style: s,
        existing_bio: bio || undefined,
        organization: company,
        job_title: jobTitle,
        mentor_category: archetypes[0],
        expertise,
      });
      if (res?.bio) setBio(res.bio.slice(0, 300));
    } catch {
    } finally {
      setGeneratingBio(false);
    }
  };

  const [roleSuggestions, setRoleSuggestions]   = useState<string[]>([]);
  const [orgSuggestions,  setOrgSuggestions]    = useState<string[]>([]);
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
          profile_photo:      photo || pendingPhoto || undefined,
          college:            college,
          college_batch:      batch ? parseInt(batch, 10) : undefined,
          bio:                bio || undefined,
        },
        career_path: 'job',
        interests:   [],
        skills:      expertise,
        bio:         bio || `${jobTitle || 'Mentor'} at ${company || ''} — open to mentor students`,
        face_image_base64: photo || pendingPhoto || undefined,
      };
      await api.completeOnboarding(payload);
      await refreshUser();
      toast.success(`${badge.tier} badge earned! 🎉`, 'Taking you to your Member ID…');
      router.push({ pathname: '/(onboarding)/member-id', params: { from: 'onboarding' } } as any);
    } catch (e: any) {
      toast.error('Setup failed', e?.message || 'Please try again.');
    }
  };

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) {
        setPendingPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch { toast.error('Photo', 'Could not open gallery.'); }
  };
  const takeSelfie = async () => {
    if (Platform.OS === 'web') {
      setWebcamVisible(true);
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast.error('Camera', 'Permission denied.'); return; }
      const res = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) {
        setPendingPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
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
      <Text className="text-text font-display-bold text-[26px] mb-1.5 text-center">{head.title}</Text>
      <Text className="text-muted font-body-semibold text-[13.5px] text-center mb-[18px]">{head.sub}</Text>

      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <View className="py-1.5 gap-3">
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
              <Text className="text-muted font-body-bold text-[11px] tracking-widest uppercase mt-1 mb-1.5">College &amp; Batch</Text>
              <InstitutionAutocomplete
                value={college}
                onChangeText={setCollege}
                onSelect={(pick) => setCollege(pick.name)}
                type="college"
                placeholder="Search your institution…"
              />
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Dropdown
                    label="Batch Year"
                    value={batch}
                    options={BATCH_YEARS.map((y) => ({ value: y, label: y }))}
                    onChange={setBatch}
                    placeholder="Select year"
                    testID="batch-year-dropdown"
                  />
                </View>
                <View className="flex-1">
                  <AuthInput
                    label="Years of Experience"
                    value={yoe}
                    onChangeText={(t) => setYoe(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="5"
                    keyboardType="numeric"
                    leftIcon={<Clock size={16} color="#6B7280" />}
                  />
                </View>
              </View>
              <Text className="text-muted font-body-bold text-[11px] tracking-widest uppercase mt-1 mb-1.5">Session Price (₹)</Text>
              <View className="flex-row flex-wrap gap-2">
                {PRICE_CHIPS.map((p) => {
                  const active = !customOn && price === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => { setPrice(p); setCustomOn(false); }}
                      className={`px-4 py-2.5 rounded-[10px] border ${active ? 'border-violet bg-violet/18' : 'border-gray-200 bg-white'}`}
                      style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
                    >
                      <Text className={`font-body-bold text-sm ${active ? 'text-[#4C1D95]' : 'text-gray-600'}`}>₹{p}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setCustomOn(true)}
                  className={`px-4 py-2.5 rounded-[10px] border ${customOn ? 'border-violet bg-violet/18' : 'border-gray-200 bg-white'}`}
                  style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
                >
                  <Text className={`font-body-bold text-sm ${customOn ? 'text-[#4C1D95]' : 'text-gray-600'}`}>Custom</Text>
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

          {step === 1 && (
            <View className="flex-row flex-wrap gap-2.5">
              {ARCHETYPES.map((a) => {
                const Icon = a.Icon;
                const active = archetypes.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    className={`w-full py-3 px-3 rounded-xl border flex-row items-center gap-3 ${active ? 'border-violet bg-violet/14' : 'border-gray-200 bg-white'}`}
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
                    onPress={() => setArchetypes((arr) => toggle(arr, a.id))}
                  >
                    <View className="w-10 h-10 rounded-full items-center justify-center border" style={{ backgroundColor: a.tint + '33', borderColor: a.tint }}>
                      <Icon size={18} color={a.tint} />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-body-bold text-[13.5px] ${active ? 'text-[#1F2937]' : 'text-[#1F2937]'}`}>{a.title}</Text>
                      <Text className="text-muted font-body-semibold text-[11.5px] mt-0.5">{a.desc}</Text>
                    </View>
                    {active && <CheckCircle2 size={16} color="#B07FDF" />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 2 && (
            <View className="flex-row flex-wrap gap-2.5">
              {EDU_LEVELS.map((e) => {
                const Icon = e.Icon;
                const active = edu === e.id;
                return (
                  <Pressable
                    key={e.id}
                    className={`w-[48%] py-3.5 px-3 rounded-xl border flex-row items-center gap-2.5 ${active ? 'border-violet bg-violet/14' : 'border-gray-200 bg-white'}`}
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
                    onPress={() => setEdu(e.id)}
                  >
                    <Icon size={22} color={active ? '#B07FDF' : '#6B7280'} />
                    <Text className={`flex-1 font-body-semibold text-[13px] ${active ? 'text-[#4C1D95]' : 'text-[#374151]'}`}>{e.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 3 && (
            <View className="flex-row flex-wrap gap-2">
              {EXPERTISE.map((x) => (
                <DarkChip key={x} label={x} active={expertise.includes(x)} onPress={() => setExpertise((a) => toggle(a, x))} />
              ))}
            </View>
          )}

          {step === 4 && (
            <View className="flex-row flex-wrap gap-2.5">
              {AVAILABILITY.map((slot) => {
                const active = availability.includes(slot.id);
                return (
                  <Pressable
                    key={slot.id}
                    className={`w-[48%] py-3.5 px-3 rounded-xl border flex-row items-center gap-2.5 ${active ? 'border-violet bg-violet/14' : 'border-gray-200 bg-white'}`}
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
                    onPress={() => setAvailability((arr) => toggle(arr, slot.id))}
                  >
                    <Clock size={16} color={active ? '#B07FDF' : '#6B7280'} />
                    <Text className={`flex-1 font-body-semibold text-[13px] ${active ? 'text-[#4C1D95]' : 'text-[#374151]'}`}>{slot.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 5 && (
            <View className="items-center gap-4">
              <Pressable onPress={takeSelfie} className="w-40 h-40 rounded-[80px] border-2 border-dashed border-gray-300 items-center justify-center bg-white overflow-hidden">
                {pendingPhoto ? (
                  <Image source={{ uri: pendingPhoto }} className="w-full h-full" />
                ) : photo ? (
                  <Image source={{ uri: photo }} className="w-full h-full" />
                ) : (
                  <View className="items-center gap-2">
                    <Camera size={32} color="#6B7280" />
                    <Text className="text-muted font-body-semibold text-xs">Tap to capture</Text>
                  </View>
                )}
              </Pressable>
              <Text className="text-muted font-body-semibold text-[12.5px] text-center leading-[18px]">A profile photo helps build trust with mentors and peers.{'\n'}Your photo is only visible to connected users.</Text>
              {pendingPhoto ? (
                <View className="flex-row gap-2.5">
                  <Pressable className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-[#818CF8] border border-[#818CF8]" onPress={confirmPhoto}><Check size={14} color="#000" /><Text className="text-[#1E1B4B] font-body-bold text-xs">Confirm</Text></Pressable>
                  <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-500/32 border border-indigo-400/40" onPress={() => { setPendingPhoto(null); takeSelfie(); }}><Camera size={14} color="#111827" /><Text className="text-[#1E1B4B] font-body-bold text-xs">Retake</Text></Pressable>
                </View>
              ) : (
                <View className="flex-row gap-2.5">
                  <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-500/32 border border-indigo-400/40" onPress={takeSelfie}><Camera size={14} color="#111827" /><Text className="text-[#1E1B4B] font-body-bold text-xs">Take Selfie</Text></Pressable>
                  <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-500/32 border border-indigo-400/40" onPress={pickPhoto}><Upload size={14} color="#111827" /><Text className="text-[#1E1B4B] font-body-bold text-xs">Upload Photo</Text></Pressable>
                </View>
              )}
            </View>
          )}

          {step === 6 && (
            <>
              <Text className="text-muted font-body-bold text-[11px] tracking-widest uppercase mt-1 mb-1.5">Your Bio</Text>
              <View className="border border-gray-200 rounded-xl bg-white px-3.5 py-3">
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. SDE-2 at Google with 5+ yrs in distributed systems. Happy to help with system design, FAANG interviews & career growth."
                  placeholderTextColor="#9CA3AF"
                  className="text-[#1F2937] font-body-semibold text-[13.5px]"
                  style={{ minHeight: 100, ...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}) }}
                />
              </View>
              <Text className="text-muted font-body-semibold text-[11px] text-right -mt-2.5">{bio.length}/300</Text>
              <Text className="text-muted font-body-semibold text-[12.5px] text-center leading-[18px]">Keep it genuine — 2–3 sentences work best.</Text>
              <Text className="text-muted font-body-bold text-[11px] tracking-widest uppercase mt-1 mb-1.5">Writing Style</Text>
              <View className="flex-row flex-wrap gap-2">{STYLES.map((x) => (<DarkChip key={x} label={x} active={style === x} onPress={() => handleStylePress(x)} />))}</View>
              {generatingBio && <Text className="text-violet font-body-semibold text-xs text-center mt-1.5">✨ Generating your bio…</Text>}
            </>
          )}

          {step === 7 && (
            <View className="items-center gap-3.5">
              <View className="w-[120px] h-[120px] rounded-[60px] border-4 items-center justify-center bg-indigo-500/22 mt-1" style={{ borderColor: badge.tier === 'Platinum' ? '#E5E4E2' : badge.tier === 'Gold' ? '#FFD700' : badge.tier === 'Silver' ? '#C0C0C0' : '#CD7F32' }}>
                <Award size={38} color="#111827" />
                <Text className="text-[#1F2937] font-body-bold text-xs mt-1 tracking-widest">{badge.tier}</Text>
              </View>
              <Text className="text-[#1F2937] font-body-bold text-lg">Welcome, {(user?.full_name || 'Mentor').split(' ')[0]}!</Text>
              <Text className="text-muted font-body-semibold text-[12.5px] text-center leading-[18px]">You've earned {badge.tier} status as a mentor on Student Alumni.</Text>
              <View className="flex-row items-center gap-1.5 px-3 py-1.25 rounded-full bg-teal-400/12 border border-teal-400/30"><CheckCircle2 size={14} color="#5EEAD4" /><Text className="text-teal-400 font-body-bold text-[11.5px]">Pending admin verification</Text></View>

              <Text className="text-muted font-body-bold text-[11px] tracking-widest uppercase mt-3.5 self-start">How your badge was calculated</Text>
              <View className="w-full gap-1.5">
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
                  <Text key={l} className="text-gray-600 font-body-semibold text-[12.5px]">• {l}</Text>
                ))}
              </View>

              <Text className="text-muted font-body-bold text-[11px] tracking-widest uppercase mt-3 self-start">{badge.tier} Mentor Perks</Text>
              <View className="w-full gap-1.5">
                <Text className="text-[#1F2937] font-body-semibold text-[12.5px]">✔ Verified mentor badge after admin approval</Text>
                <Text className="text-[#1F2937] font-body-semibold text-[12.5px]">✔ Featured placement in suggestions: {badge.tier === 'Platinum' ? 'Top tier' : badge.tier === 'Gold' ? 'High' : badge.tier === 'Silver' ? 'Standard' : 'Basic'}</Text>
                <Text className="text-[#1F2937] font-body-semibold text-[12.5px]">💰 Earn ₹{price} per 1:1 session</Text>
                <Text className="text-[#1F2937] font-body-semibold text-[12.5px]">✨ Upgrade tier by adding more archetypes & sessions</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="flex-row items-center gap-2.5 mt-4">
        {step > 0 ? (
          <Pressable onPress={prev} className="w-[42px] h-[42px] rounded-[21px] bg-white border border-gray-200 items-center justify-center" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}>
            <ArrowLeft size={18} color="#374151" />
          </Pressable>
        ) : <View className="w-[42px]" />}
        <View className="flex-1">
          <PrimaryButton label={step === TOTAL - 1 ? 'See My Member ID →' : 'Continue →'} onPress={onContinue} />
        </View>
      </View>
      <WebcamModal
        visible={webcamVisible}
        onClose={() => setWebcamVisible(false)}
        onCapture={(base64) => {
          setPendingPhoto(base64);
          setWebcamVisible(false);
        }}
      />
    </AuthShell>
  );
}
