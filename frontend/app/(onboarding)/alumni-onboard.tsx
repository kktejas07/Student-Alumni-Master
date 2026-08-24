import { getBaseUrl } from '@/src/lib/env';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, TextInput as RNTextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Camera, Upload, Award, CheckCircle2, Check,
  Clock, User as UserIcon,
  Rocket, TrendingUp, Compass, BookOpen, HeartHandshake, UsersRound,
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
import { WebcamModal } from '@/src/views/components/WebcamModal';

const TOTAL = 6;
const BASE = getBaseUrl();
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 50 }, (_, i) => String(CURRENT_YEAR - i));

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
            <View className={`w-[26px] h-[26px] rounded-[13px] border-[1.5px] items-center justify-center ${done || active ? 'border-amber-500 bg-amber-500' : 'border-gray-200 bg-gray-50'}`}>
              {done ? <CheckCircle2 size={14} color="#111827" /> : <Text className={`font-bold text-[11px] ${active ? 'text-gray-800' : 'text-gray-400'}`}>{i + 1}</Text>}
            </View>
            {i < TOTAL - 1 && <View className={`flex-1 h-[1.5px] ${done ? 'bg-amber-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function AlumniOnboard() {
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

  const [fullName,  setFullName]   = useState(user?.full_name || '');
  const [jobTitle,  setJobTitle]   = useState('');
  const [company,   setCompany]    = useState('');
  const [college,   setCollege]    = useState('');
  const [gradYear,  setGradYear]   = useState('2020');
  const [yoe,       setYoe]        = useState('4');

  const [domain,    setDomain]    = useState<string[]>([]);
  const [tech,      setTech]      = useState<string[]>([]);
  const [biz,       setBiz]       = useState<string[]>([]);
  const [soft,      setSoft]      = useState<string[]>([]);

  const [nextChapter, setNextChapter] = useState<string>('');

  const [photo, setPhoto] = useState<string>('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [webcamVisible, setWebcamVisible] = useState(false);

  const confirmPhoto = () => {
    if (!pendingPhoto) return;
    setPhoto(pendingPhoto);
    setPendingPhoto(null);
    toast.success('Photo confirmed', 'Looking great!');
  };

  const [bio,   setBio]   = useState('');
  const [style, setStyle] = useState('');
  const [generatingBio, setGeneratingBio] = useState(false);

  const handleStylePress = async (s: string) => {
    setStyle(s);
    setGeneratingBio(true);
    try {
      const res = await api.generateBio({
        role: 'alumni',
        full_name: fullName || user?.full_name,
        writing_style: s,
        existing_bio: bio || undefined,
        organization: company,
        job_title: jobTitle,
        institution: college,
        graduation_year: gradYear,
        interests: [...domain, ...tech, ...biz, ...soft],
      });
      if (res?.bio) setBio(res.bio.slice(0, 300));
    } catch {
    } finally {
      setGeneratingBio(false);
    }
  };

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
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

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
          wants_to_mentor:    nextChapter === 'become_mentor',
        },
        career_path: (
          nextChapter === 'higher_education' ? 'higher_education' :
          nextChapter === 'build_startup'    ? 'startup' :
          nextChapter === 'build_business'   ? 'business' :
          'job'
        ),
        interests:   domain,
        skills:      [...tech, ...biz, ...soft],
        bio:         bio || `${jobTitle || 'Alumnus'} at ${company || ''} — ${college || ''} class of ${gy}`,
        face_image_base64: photo || undefined,
      };
      await api.completeOnboarding(payload);
      await refreshUser();
      toast.success(`${badge.tier} status earned! 🎉`, 'Generating your Member ID…');
      router.push({ pathname: '/(onboarding)/member-id', params: { from: 'onboarding' } } as any);
    } catch (e: any) {
      toast.error('Setup failed', e?.message || 'Please try again.');
    }
  };

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1] });
      if (!res.canceled && res.assets[0]?.base64) setPendingPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
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
      if (!res.canceled && res.assets[0]?.base64) setPendingPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
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
      <Text className="text-gray-900 font-bold text-[26px] mb-1.5 text-center">{head.title}</Text>
      <Text className="text-gray-500 font-medium text-[13.5px] text-center mb-[18px]">{head.sub}</Text>

      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 6, gap: 12 }}>
          {step === 0 && (
            <>
              <AuthInput
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Rohan Bhat"
                autoCapitalize="words"
                leftIcon={<UserIcon size={16} color="#6B7280" />}
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
              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-1 mb-1.5">College &amp; Batch</Text>
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
                    label="Graduation Year"
                    value={gradYear}
                    options={GRAD_YEARS.map((y) => ({ value: y, label: y }))}
                    onChange={setGradYear}
                    placeholder="Year"
                    testID="alumni-grad-year"
                  />
                </View>
                <View className="flex-1">
                  <AuthInput
                    label="Years of Experience"
                    value={yoe}
                    onChangeText={(t) => setYoe(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    placeholder="4"
                    keyboardType="numeric"
                    leftIcon={<Clock size={16} color="#6B7280" />}
                  />
                </View>
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-1 mb-1.5">Domain Expertise</Text>
              <View className="flex-row flex-wrap gap-2">
                {DOMAIN_EXPERTISE.map((x) => (
                  <DarkChip key={x} label={x} active={domain.includes(x)} onPress={() => setDomain((a) => toggle(a, x))} />
                ))}
              </View>
              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-2.5 mb-1.5">Tech</Text>
              <View className="flex-row flex-wrap gap-2">
                {TECH_SKILLS.map((x) => (
                  <DarkChip key={x} label={x} active={tech.includes(x)} onPress={() => setTech((a) => toggle(a, x))} />
                ))}
              </View>
              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-2.5 mb-1.5">Business</Text>
              <View className="flex-row flex-wrap gap-2">
                {BUSINESS_SKILLS.map((x) => (
                  <DarkChip key={x} label={x} active={biz.includes(x)} onPress={() => setBiz((a) => toggle(a, x))} />
                ))}
              </View>
              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-2.5 mb-1.5">Soft Skills</Text>
              <View className="flex-row flex-wrap gap-2">
                {SOFT_SKILLS.map((x) => (
                  <DarkChip key={x} label={x} active={soft.includes(x)} onPress={() => setSoft((a) => toggle(a, x))} />
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <View className="flex-row flex-wrap gap-2.5">
              {NEXT_CHAPTER.map((p) => {
                const Icon = p.Icon;
                const active = nextChapter === p.id;
                return (
                  <Pressable
                    key={p.id}
                    className={`w-full py-3 px-3 rounded-xl border flex-row items-center gap-3 ${active ? 'border-amber-500 bg-amber-500/10' : 'border-gray-200 bg-white'}`}
                    onPress={() => setNextChapter(p.id)}
                  >
                    <View className="w-10 h-10 rounded-full items-center justify-center border" style={{ backgroundColor: p.tint + '33', borderColor: p.tint }}>
                      <Icon size={18} color={p.tint} />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-bold text-[13.5px] ${active ? 'text-gray-900' : 'text-gray-800'}`}>{p.title}</Text>
                      <Text className="text-gray-500 font-medium text-[11.5px] mt-0.5">{p.desc}</Text>
                    </View>
                    <View className={`w-[18px] h-[18px] rounded-full border-[1.5px] items-center justify-center ${active ? 'border-amber-500' : 'border-gray-300'}`}>
                      {active && <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 3 && (
            <View className="items-center gap-4">
              <Pressable onPress={takeSelfie} className="w-40 h-40 rounded-full border-2 border-dashed items-center justify-center bg-white overflow-hidden">
                {pendingPhoto ? (
                  <Image source={{ uri: pendingPhoto }} className="w-full h-full" />
                ) : photo ? (
                  <Image source={{ uri: photo }} className="w-full h-full" />
                ) : (
                  <View className="items-center gap-2">
                    <Camera size={32} color="#6B7280" />
                    <Text className="text-gray-500 font-medium text-xs">Tap to capture</Text>
                  </View>
                )}
              </Pressable>
              <Text className="text-gray-500 font-medium text-[12.5px] text-center leading-[18px]">A profile photo helps build trust with mentors and peers.</Text>
              {pendingPhoto ? (
                <View className="flex-row gap-2.5">
                  <Pressable className="flex-row items-center gap-1.5 px-[18px] py-2 rounded-full bg-indigo-400 border border-indigo-400" onPress={confirmPhoto}><Check size={14} color="#000" /><Text className="text-indigo-950 font-bold text-xs">Confirm</Text></Pressable>
                  <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/18 border border-amber-500/40" onPress={() => { setPendingPhoto(null); takeSelfie(); }}><Camera size={14} color="#111827" /><Text className="text-indigo-950 font-bold text-xs">Retake</Text></Pressable>
                </View>
              ) : (
                <View className="flex-row gap-2.5">
                  <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/18 border border-amber-500/40" onPress={takeSelfie}><Camera size={14} color="#111827" /><Text className="text-indigo-950 font-bold text-xs">Take Selfie</Text></Pressable>
                  <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/18 border border-amber-500/40" onPress={pickPhoto}><Upload size={14} color="#111827" /><Text className="text-indigo-950 font-bold text-xs">Upload Photo</Text></Pressable>
                </View>
              )}
            </View>
          )}

          {step === 4 && (
            <>
              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-1 mb-1.5">Your Bio</Text>
              <View className="border border-gray-200 rounded-xl bg-white px-3.5 py-3">
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. Senior PM at Flipkart with 6 years in product. IIT Bombay alum passionate about mentoring the next generation of builders…"
                  placeholderTextColor="#9CA3AF"
                  className="text-gray-800 font-medium text-[13.5px] min-h-[100px]"
                />
              </View>
              <Text className="text-gray-500 font-medium text-[11px] text-right mt-[-10px]">{bio.length}/300</Text>
              <Text className="text-gray-500 font-medium text-[12.5px] text-center leading-[18px]">Your bio appears on your alumni profile - keep it authentic.</Text>
              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-2.5 mb-1.5">Write Style</Text>
              <View className="flex-row flex-wrap gap-2">
                {STYLES.map((x) => (<DarkChip key={x} label={x} active={style === x} onPress={() => handleStylePress(x)} />))}
              </View>
              {generatingBio && <Text className="text-violet-400 font-medium text-xs text-center mt-1.5">✨ Generating your bio…</Text>}
            </>
          )}

          {step === 5 && (
            <View className="items-center gap-3.5">
              <View className="w-[120px] h-[120px] rounded-full border-4 items-center justify-center bg-amber-500/18 mt-1" style={{
                borderColor: badge.tier === 'Platinum' ? '#E5E4E2'
                  : badge.tier === 'Gold' ? '#FFD700'
                  : badge.tier === 'Silver' ? '#C0C0C0' : '#CD7F32'
              }}>
                <Award size={38} color="#111827" />
                <Text className="text-gray-800 font-bold text-xs mt-1 tracking-widest">{badge.tier}</Text>
              </View>
              <Text className="text-gray-800 font-bold text-lg">Welcome, {(fullName || user?.full_name || 'Alumni').split(' ')[0]}!</Text>
              <Text className="text-gray-500 font-medium text-[12.5px] text-center leading-[18px]">You've earned {badge.tier} status on Student Alumni.</Text>
              <View className="flex-row items-center gap-1.5 px-3 py-[5px] rounded-full bg-amber-500/12 border border-amber-500/30">
                <CheckCircle2 size={14} color="#FBBF24" />
                <Text className="text-amber-500 font-bold text-[11.5px]">Verified SA member</Text>
              </View>

              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-3.5 self-start">How your badge was calculated</Text>
              <View className="w-full gap-1.5">
                {[
                  `College: ${college || 'not set'}`,
                  `Experience: ${yoe || '0'} yrs ${parseInt(yoe || '0', 10) >= 8 ? '(8+)' : parseInt(yoe || '0', 10) >= 4 ? '(4-7)' : '(<4)'}`,
                  `Senior title / leadership role: ${jobTitle || 'not set'}`,
                  `Education: graduation ${gradYear || 'not set'}`,
                  `${tech.length + biz.length + soft.length} skills added`,
                  `${domain.length} domains of expertise`,
                  `Profile photo ${photo ? 'added' : 'not added'}`,
                  `Bio ${bio.length > 20 ? 'written' : 'not written'}`,
                ].map((l) => (<Text key={l} className="text-gray-600 font-medium text-[12.5px]">• {l}</Text>))}
              </View>

              <Text className="text-gray-500 font-bold text-[11px] tracking-widest uppercase mt-3 self-start">{badge.tier} Perks</Text>
              <View className="w-full gap-1.5">
                {badge.perks.map((p) => (<Text key={p} className="text-gray-800 font-medium text-[12.5px]">✔ {p}</Text>))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="flex-row items-center gap-2.5 mt-4">
        <Pressable
          onPress={step > 0 ? prev : () => router.replace('/welcome')}
          className="w-[42px] h-[42px] rounded-[21px] bg-white border border-gray-200 items-center justify-center"
          testID="alumni-onboard-back"
        >
          <ArrowLeft size={18} color="#374151" />
        </Pressable>
        <View className="flex-1">
          <PrimaryButton label={ctaLabel} onPress={onContinue} />
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
