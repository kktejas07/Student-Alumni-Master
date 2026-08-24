/**
 * Student Onboarding — Redesigned 9-step wizard.
 *
 * Step 0: Welcome + College    — institution + grad year + CGPA + name + phone
 * Step 1: Education Level      — 6 cards
 * Step 2: Career Path ★NEW    — 4 tiles (job / higher_education / startup / business)
 * Step 3: Career Goal          — 6 radio options
 * Step 4: Interests            — chip multi-select (domain, no skills)
 * Step 5: Skills               — chip multi-select (tech + business + soft)
 * Step 6: Profile Photo + Bio  — merged (selfie/upload + textarea + AI writing style)
 * Step 7: SA Badge + Review    — recap + submit → member-id → generating-experience
 *
 * KEY FIXES vs previous version:
 *   ✅ career_path no longer hardcoded to "job" — collected at Step 2
 *   ✅ Interests and Skills are separate steps (less overwhelming)
 *   ✅ Labeled segment progress bar (not numbered dots)
 *   ✅ Conversational opening copy per step
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  Platform, TextInput as RNTextInput, Animated, useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Camera, Upload, GraduationCap, BriefcaseBusiness,
  Award, Code, CheckCircle2, Check, BookOpen, Rocket, TrendingUp,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton } from '@/src/views/auth/AuthControls';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { DarkChip } from '@/src/views/web/OnboardingShell';
import { InstitutionAutocomplete } from '@/src/views/web/InstitutionAutocomplete';
import { PhoneInput } from '@/src/views/web/PhoneInput';
import { Dropdown } from '@/src/views/web/Dropdown';
import { WebcamModal } from '@/src/views/components/WebcamModal';
import { OnboardingProgressBar } from '@/src/views/components/onboarding/OnboardingProgressBar';

const TOTAL = 4;
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: CURRENT_YEAR + 9 - 1975 }, (_, i) => String(CURRENT_YEAR + 8 - i));

const STEP_LABELS = ['Education', 'Institution', 'Career Path', 'Profile'];
const STEP_SECS = [90, 20, 25, 60];

const EDU_LEVELS = [
  { id: 'high_school', label: 'High School',        icon: BookOpen },
  { id: 'diploma',  label: 'Diploma / ITI',        icon: Award },
  { id: 'btech',    label: "Bachelor's Degree",     icon: GraduationCap },
  { id: 'masters',  label: "Master's Degree",       icon: GraduationCap },
  { id: 'phd',      label: 'PhD / Doctorate',       icon: Award },
];

type CareerPathId = 'job' | 'higher_education' | 'startup' | 'business';
const CAREER_PATHS: {
  id: CareerPathId; icon: any; title: string; desc: string; unlocks: string[];
}[] = [
  {
    id: 'job',
    icon: BriefcaseBusiness,
    title: 'Get a Job',
    desc: 'Prepare for internships and full-time opportunities.',
    unlocks: ['Job recommendations', 'Resume guidance', 'Interview preparation'],
  },
  {
    id: 'higher_education',
    icon: GraduationCap,
    title: 'Higher Education',
    desc: 'Prepare for Masters, MS, MBA or Research.',
    unlocks: ['University recommendations', 'Scholarships', 'Admission guidance'],
  },
  {
    id: 'startup',
    icon: Rocket,
    title: 'Build a Startup',
    desc: 'Learn entrepreneurship and build products.',
    unlocks: ['Startup mentors', 'Incubator opportunities', 'Founder resources'],
  },
  {
    id: 'business',
    icon: TrendingUp,
    title: 'Business Leadership',
    desc: 'Develop leadership and management skills.',
    unlocks: ['Leadership programs', 'MBA resources', 'Business mentors'],
  },
];

const STYLES = ['Friendly & warm', 'Professional', 'Inspiring', 'Concise', 'Detailed'];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}


export default function StudentOnboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const refreshUser = useAuthStore((u) => u.refreshUser);
  const [step, setStep] = useState(params.step ? parseInt(params.step, 10) : 0);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setValidationNotice(null);
    fadeAnim.setValue(0);
    slideAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, fadeAnim, slideAnim]);

  useEffect(() => {
    if (params.step) {
      const parsed = parseInt(params.step, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < TOTAL) setStep(parsed);
    }
  }, [params.step]);

  const [college, setCollege]   = useState('');
  const [gradYear, setGradYear] = useState('');
  const [cgpa, setCgpa]         = useState('');
  const [stream, setStream]     = useState('');
  const [name, setName]         = useState(user?.full_name || '');
  const [phone, setPhone]       = useState(user?.phone || '');
  const [city, setCity]         = useState('');
  const [stateName, setState2]  = useState('');

  const [edu, setEdu] = useState<string>('');

  const [careerPath, setCareerPath] = useState<CareerPathId | ''>('');
  const [pathFeedback, setPathFeedback] = useState(false);

  const [photo, setPhoto]             = useState<string>('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [webcamVisible, setWebcamVisible] = useState(false);
  const [bio, setBio]                 = useState('');
  const [bioStyle, setBioStyle]       = useState('');
  const [generatingBio, setGeneratingBio] = useState(false);

  const confirmPhoto = () => {
    if (!pendingPhoto) return;
    setPhoto(pendingPhoto);
    setPendingPhoto(null);
    toast.success('Photo confirmed', 'Looking great!');
  };

  const handleStylePress = async (s: string) => {
    setBioStyle(s);
    setGeneratingBio(true);
    try {
      const res = await api.generateBio({
        role: 'student',
        full_name: name || user?.full_name,
        writing_style: s,
        existing_bio: bio || undefined,
        institution: college,
        education_level: edu,
      });
      if (res?.bio) setBio(res.bio.slice(0, 300));
    } catch {
    } finally {
      setGeneratingBio(false);
    }
  };

  const badge = useMemo(() => {
    let score = 0;
    if (college) score += 1;
    if (gradYear) score += 1;
    if (cgpa && parseFloat(cgpa) >= 7.0) score += 2;
    else if (cgpa) score += 1;
    if (edu) score += 1;
    if (careerPath) score += 1;
    if (photo) score += 1;
    if (bio.length > 40) score += 1;
    const tier =
      score >= 10 ? 'Platinum' :
      score >= 8  ? 'Gold' :
      score >= 5  ? 'Silver' : 'Bronze';
    return { score, tier };
  }, [college, gradYear, cgpa, edu, careerPath, photo, bio]);

  const next = () => setStep((st) => Math.min(st + 1, TOTAL - 1));
  const prev = () => setStep((st) => Math.max(st - 1, 0));

  const validateStep = (): string | null => {
    if (step === 0 && !edu) return 'Pick your education level to get the right recommendations.';
    if (step === 1) {
      if (!college) return edu === 'high_school' ? 'Enter your school name.' : 'Select your college or university so we can connect you with alumni.';
      if (edu === 'high_school' && !stream) return 'Select your stream.';
      if (edu !== 'high_school' && !gradYear) return 'Select your graduation year to tailor your timeline.';
      if (!cgpa) return edu === 'high_school' ? 'Enter your percentage.' : 'Enter your domain of study.';
    }
    if (step === 2 && !careerPath) return 'Choose a career path to personalize your dashboard.';
    return null;
  };

  const onContinue = async () => {
    const err = validateStep();
    if (err) {
      setValidationNotice(err);
      toast.error('Quick suggestion', err);
      return;
    }
    setValidationNotice(null);
    if (step < TOTAL - 1) return next();
    await submitOnboarding();
  };

  const submitOnboarding = async () => {
    try {
      const payload: any = {
        school_info: {
          country: 'India',
          institution_type: edu === 'high_school' ? 'school' : 'college',
          institution_name: college,
          graduation_year: edu === 'high_school' ? undefined : parseInt(gradYear, 10) || undefined,
          stream: edu === 'high_school' ? stream : undefined,
          city: city || undefined,
          state: stateName || undefined,
        },
        career_path: careerPath,
        student_info: {
          age: 20,
          education_level: edu || 'btech',
          career_interests: [],
          cgpa: cgpa.trim() ? parseFloat(cgpa) : undefined,
        },
        interests: [],
        skills: [],
        bio: bio || `${name} — ${edu || 'Student'}`,
        face_image_base64: photo || pendingPhoto || undefined,
        phone,
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
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1],
      });
      if (!res.canceled && res.assets[0]?.base64) {
        setPendingPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch { toast.error('Photo', 'Could not open gallery.'); }
  };

  const takeSelfie = async () => {
    if (Platform.OS === 'web') { setWebcamVisible(true); return; }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast.error('Camera', 'Permission denied.'); return; }
      const res = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        quality: 0.5, base64: true, allowsEditing: true, aspect: [1, 1],
      });
      if (!res.canceled && res.assets[0]?.base64) {
        setPendingPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
      }
    } catch { toast.error('Camera', 'Could not open camera.'); }
  };

  const HEADS = [
    {
      title: `Welcome, ${name.split(' ')[0] || 'there'} 👋\nWhat level are you at?`,
      sub: 'This helps us recommend the most relevant opportunities.',
    },
    {
      title: 'Institution & Domain',
      sub: 'We connect you with alumni, mentors and peers from your institution and domain.',
    },
    {
      title: "What's your big picture?",
      sub: 'This determines how your dashboard is personalized.',
    },
    {
      title: 'Put a face to your name',
      sub: 'Profiles with photos receive more mentor engagement.',
    },
  ];
  const head = HEADS[step] ?? HEADS[0];

  return (
    <AuthShell role="student">
      <OnboardingProgressBar
        step={step}
        totalSteps={TOTAL}
        labels={STEP_LABELS}
        stepSeconds={STEP_SECS}
      />

      <View className={`flex-row ${isDesktop ? '' : 'flex-col'} gap-xl`}>
        <Animated.View className="flex-1" style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text className="text-primary text-2xl font-display-bold mb-xxs">{head.title}</Text>
          <Text className="text-muted text-base font-body-semibold mb-md leading-5">{head.sub}</Text>

          <View className="w-full p-md rounded-2xl bg-white border border-default gap-s mb-4 mt-2 self-stretch">
            <Text className="text-brand-purple font-body-bold text-2xs tracking-wider">LIVE PROFILE PREVIEW</Text>
            <View className="flex-row flex-wrap gap-y-3 gap-x-6">
              <View className="flex-1 min-w-[120px] gap-xxs">
                <Text className="text-muted text-xs font-body-semibold">Name</Text>
                <Text className="text-primary text-base font-body-bold">{name || 'New Student'}</Text>
              </View>
              <View className="flex-1 min-w-[120px] gap-xxs">
                <Text className="text-muted text-xs font-body-semibold">Education</Text>
                <Text className="text-primary text-base font-body-bold">{EDU_LEVELS.find(e => e.id === edu)?.label || 'Not picked yet'}</Text>
              </View>
              <View className="flex-1 min-w-[120px] gap-xxs">
                <Text className="text-muted text-xs font-body-semibold">Institution</Text>
                <Text className="text-primary text-base font-body-bold" numberOfLines={1}>{college || 'Not picked yet'}</Text>
              </View>
              <View className="flex-1 min-w-[120px] gap-xxs">
                <Text className="text-muted text-xs font-body-semibold">Career Path</Text>
                <Text className="text-primary text-base font-body-bold">{CAREER_PATHS.find(p => p.id === careerPath)?.title || 'Not picked yet'}</Text>
              </View>
              <View className="flex-1 min-w-[120px]" />
            </View>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="py-1.5 gap-3">

          {step === 0 && (
            <View className="flex-row flex-wrap gap-2.5 justify-center">
              {EDU_LEVELS.map((e) => {
                const Icon = e.icon;
                const active = edu === e.id;
                return (
                  <Pressable key={e.id} className={`w-[48%] py-3.5 px-3 rounded-xl border ${active ? 'border-brand-purple bg-brand-purple/10' : 'border-border bg-white'} flex-row items-center gap-2.5`} onPress={() => setEdu(e.id)}>
                    <Icon size={22} color={active ? '#7C3AED' : '#9CA3AF'} />
                    <Text className={`flex-1 text-sm font-body-semibold ${active ? 'text-brand-purple' : 'text-secondary'}`}>{e.label}</Text>
                    {active && <CheckCircle2 size={14} color="#B07FDF" style={{ marginLeft: 'auto' } as any} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 1 && (
            <>
              <Text className="text-muted font-body-bold text-2xs tracking-wider uppercase mt-1 mb-1.5">{edu === 'high_school' ? 'School Name *' : 'Institution *'}</Text>
              <View className="mb-3.5">
                <InstitutionAutocomplete
                  value={college}
                  onChangeText={setCollege}
                  onSelect={(pick) => {
                    setCollege(pick.name);
                    if (!city && pick.city) setCity(pick.city);
                    if (!stateName && pick.state) setState2(pick.state);
                  }}
                  type={edu === 'high_school' ? 'school' : 'college'}
                  placeholder={edu === 'high_school' ? 'Search your school…' : 'Search your institution…'}
                />
              </View>
              <View className="flex-row gap-2.5">
                <View className="flex-1">
                  <Text className="text-muted font-body-bold text-2xs tracking-wider uppercase mt-1 mb-1.5">{edu === 'high_school' ? 'Stream *' : 'Graduation Year *'}</Text>
                  {edu === 'high_school' ? (
                    <Dropdown
                      required
                      value={stream}
                      options={[
                        { value: 'MPC', label: 'MPC' },
                        { value: 'BiPC', label: 'BiPC' },
                        { value: 'MBiPC', label: 'MBiPC' },
                        { value: 'MEC', label: 'MEC' },
                        { value: 'HEC', label: 'HEC' },
                        { value: 'CEC', label: 'CEC' }
                      ]}
                      onChange={setStream}
                      placeholder="Select stream"
                      testID="stream-dropdown"
                      allowOther={false}
                      inline={true}
                    />
                  ) : (
                    <Dropdown
                      required
                      value={gradYear}
                      options={GRAD_YEARS.map((y) => ({ value: y, label: y }))}
                      onChange={setGradYear}
                      placeholder="Select year"
                      testID="grad-year-dropdown"
                      allowOther={false}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-muted font-body-bold text-2xs tracking-wider uppercase mt-1 mb-1.5">{edu === 'high_school' ? 'Percentage/CGPA *' : 'Domain *'}</Text>
                  <AuthInput value={cgpa} onChangeText={setCgpa} placeholder={edu === 'high_school' ? '95' : 'e.g. Computer Science'} keyboardType={edu === 'high_school' ? 'decimal-pad' : 'default'} />
                </View>
              </View>
            </>
          )}

          {step === 2 && (
            <View className="gap-2.5">
              {CAREER_PATHS.map((p) => {
                const active = careerPath === p.id;
                return (
                  <Pressable
                    key={p.id}
                    className={`rounded-lg border p-3.5 gap-2.5 ${active ? 'border-brand-purple bg-brand-purple/10' : 'border-border bg-white'}`}
                    onPress={() => {
                      setCareerPath(p.id);
                      setPathFeedback(true);
                      setTimeout(() => setPathFeedback(false), 900);
                    }}
                    testID={`career-path-${p.id}`}
                  >
                    <View className="flex-row items-start gap-2.5">
                      <View className="mt-0.5 mr-0.5">
                        <p.icon size={24} color={active ? '#7C3AED' : '#9CA3AF'} />
                      </View>
                      <View className="flex-1">
                        <Text className={`text-sm font-body-bold ${active ? 'text-brand-purple' : 'text-gray-700'}`}>{p.title}</Text>
                        <Text className="text-muted text-xs font-body-semibold mt-0.5 leading-4">{p.desc}</Text>
                      </View>
                      {active && <CheckCircle2 size={16} color="#7C3AED" />}
                    </View>
                    <Text className="text-muted font-body-bold text-2xs tracking-wider uppercase mt-1 mb-0.5">You'll receive</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {p.unlocks.map((u) => (
                        <Text key={u} className={`text-xs font-body-semibold rounded-full px-2 py-0.5 border ${active ? 'text-purple-700 bg-purple-50 border-purple-300' : 'text-muted bg-gray-100 border-border'}`}>• {u}</Text>
                      ))}
                    </View>
                  </Pressable>
                );
              })}
              {pathFeedback && (
                <Text className="text-brand-purple font-body-semibold text-xs text-center mt-1">Great choice! Your dashboard will be personalized for this path.</Text>
              )}
            </View>
          )}

          {step === 3 && (
            <>
              <View className="items-center gap-3.5 mb-2">
                <Pressable onPress={takeSelfie} className="w-[140px] h-[140px] rounded-full border-2 border-dashed border-border items-center justify-center bg-white overflow-hidden">
                  {pendingPhoto ? (
                    <Image source={{ uri: pendingPhoto }} className="w-full h-full" />
                  ) : photo ? (
                    <Image source={{ uri: photo }} className="w-full h-full" />
                  ) : (
                    <View className="items-center gap-2">
                      <Camera size={32} color="#9CA3AF" />
                      <Text className="text-faint text-xs font-body-semibold">Tap to capture</Text>
                    </View>
                  )}
                </Pressable>
                {pendingPhoto ? (
                  <View className="flex-row gap-2.5">
                    <Pressable className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-success border border-success" onPress={confirmPhoto}>
                      <Check size={14} color="#000" /><Text className="text-primary font-body-bold text-xs">Confirm</Text>
                    </Pressable>
                    <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-purple border border-brand-purple" onPress={() => { setPendingPhoto(null); takeSelfie(); }}>
                      <Camera size={14} color="#111827" /><Text className="text-secondary font-body-bold text-xs">Retake</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row gap-2.5">
                    <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-purple border border-brand-purple" onPress={takeSelfie}>
                      <Camera size={14} color="#111827" /><Text className="text-secondary font-body-bold text-xs">Take Selfie</Text>
                    </Pressable>
                    <Pressable className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-purple border border-brand-purple" onPress={pickPhoto}>
                      <Upload size={14} color="#111827" /><Text className="text-secondary font-body-bold text-xs">Upload Photo</Text>
                    </Pressable>
                  </View>
                )}
                {!photo && !pendingPhoto && (
                  <Text className="text-faint text-xs font-body-semibold text-center">Optional — but adds to your badge score</Text>
                )}
              </View>

              <Text className="text-muted font-body-bold text-2xs tracking-wider uppercase mt-1 mb-1.5">Your Bio</Text>
              <View className="border border-default rounded-xl bg-white px-3.5 py-3">
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. Final year CSE student at IIT Bombay, passionate about building AI products…"
                  placeholderTextColor="#9CA3AF"
                  className="text-primary font-body-semibold text-base min-h-[90px]"
                  style={Platform.OS === 'web' ? { outlineWidth: 0 } as any : undefined}
                />
              </View>
              <Text className="text-faint text-xs font-body-semibold text-right mt-[-8px]">{bio.length}/300</Text>

              <Text className="text-muted font-body-bold text-2xs tracking-wider uppercase mt-1 mb-1.5">Writing Style — AI Generate</Text>
              <Text className="text-muted text-sm font-body-semibold leading-5 mb-2">Tap a style to auto-generate your bio using AI.</Text>
              <View className="flex-row flex-wrap gap-2 mb-1">
                {STYLES.map((x) => (
                  <DarkChip key={x} label={x} active={bioStyle === x} onPress={() => handleStylePress(x)} />
                ))}
              </View>
              {generatingBio && (
                <Text className="text-brand-purple font-body-semibold text-xs text-center mt-1">✨ Generating your bio…</Text>
              )}
            </>
          )}

        </View>
      </ScrollView>
        </Animated.View>


      </View>

      {validationNotice && (
        <View className="mt-3 px-3.5 py-2 rounded-[10px] bg-brand-purple/10 border border-purple-300">
          <Text className="text-purple-700 font-body-semibold text-sm">💡 {validationNotice}</Text>
        </View>
      )}

      <View className="flex-row items-center gap-2.5 mt-4">
        <Pressable onPress={() => step > 0 ? prev() : router.push('/(auth)/referral-code')} className="w-[42px] h-[42px] rounded-full bg-white border border-default items-center justify-center">
          <ArrowLeft size={18} color="#374151" />
        </Pressable>
        <View className="flex-1">
          <PrimaryButton
            label={step === TOTAL - 1 ? 'Complete Profile →' : 'Continue →'}
            onPress={onContinue}
          />
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
