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
  View, Text, StyleSheet, ScrollView, Pressable, Image,
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
import { FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { DarkChip } from '@/src/views/web/OnboardingShell';
import { InstitutionAutocomplete } from '@/src/views/web/InstitutionAutocomplete';
import { PhoneInput } from '@/src/views/web/PhoneInput';
import { Dropdown } from '@/src/views/web/Dropdown';
import { WebcamModal } from '@/src/views/components/WebcamModal';
import { OnboardingProgressBar } from '@/src/views/components/onboarding/OnboardingProgressBar';

const TOTAL = 4; // 0-indexed steps 0–3 = 4 steps
const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: CURRENT_YEAR + 9 - 1975 }, (_, i) => String(CURRENT_YEAR + 8 - i));

// ─── Step labels for the progress bar ────────────────────────────────────────
const STEP_LABELS = ['Education', 'Institution', 'Career Path', 'Profile'];
// Estimated seconds per step (for "~N min left" label)
const STEP_SECS = [90, 20, 25, 60];

// ─── Step 1: Education ───────────────────────────────────────────────────────
const EDU_LEVELS = [
  { id: 'high_school', label: 'High School',        icon: BookOpen },
  { id: 'diploma',  label: 'Diploma / ITI',        icon: Award },
  { id: 'btech',    label: "Bachelor's Degree",     icon: GraduationCap },
  { id: 'masters',  label: "Master's Degree",       icon: GraduationCap },
  { id: 'phd',      label: 'PhD / Doctorate',       icon: Award },
];

// ─── Step 2: Career Path ★ NEW ────────────────────────────────────────────────
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

// ─── Step 6: Bio writing styles ──────────────────────────────────────────────
const STYLES = ['Friendly & warm', 'Professional', 'Inspiring', 'Concise', 'Detailed'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}



// ─── Main Component ───────────────────────────────────────────────────────────
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
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [step, fadeAnim, slideAnim]);

  useEffect(() => {
    if (params.step) {
      const parsed = parseInt(params.step, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < TOTAL) setStep(parsed);
    }
  }, [params.step]);

  // ── Step 0: College ──
  const [college, setCollege]   = useState('');
  const [gradYear, setGradYear] = useState('');
  const [cgpa, setCgpa]         = useState('');
  const [stream, setStream]     = useState('');
  const [name, setName]         = useState(user?.full_name || '');
  const [phone, setPhone]       = useState(user?.phone || '');
  const [city, setCity]         = useState('');
  const [stateName, setState2]  = useState('');

  // ── Step 1: Education ──
  const [edu, setEdu] = useState<string>('');

  // ── Step 2: Career Path ★ ──
  const [careerPath, setCareerPath] = useState<CareerPathId | ''>('');
  const [pathFeedback, setPathFeedback] = useState(false);

  // (Career Goal state removed)

  // ── Step 6: Photo + Bio ──
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
      // silently fallback
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

  // ─── Step heading copy ────────────────────────────────────────────────────
  // ─── Step heading copy ────────────────────────────────────────────────────
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

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 24 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={s.title}>{head.title}</Text>
          <Text style={s.sub}>{head.sub}</Text>

          <View style={[s.previewCard, { marginBottom: 16, marginTop: 8 }]}>
            <Text style={s.previewTitle}>LIVE PROFILE PREVIEW</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 24 }}>
              <View style={[s.previewRow, { flex: 1, minWidth: 120 }]}>
                <Text style={s.previewLabel}>Name</Text>
                <Text style={s.previewVal}>{name || 'New Student'}</Text>
              </View>
              <View style={[s.previewRow, { flex: 1, minWidth: 120 }]}>
                <Text style={s.previewLabel}>Education</Text>
                <Text style={s.previewVal}>{EDU_LEVELS.find(e => e.id === edu)?.label || 'Not picked yet'}</Text>
              </View>
              <View style={[s.previewRow, { flex: 1, minWidth: 120 }]}>
                <Text style={s.previewLabel}>Institution</Text>
                <Text style={s.previewVal} numberOfLines={1}>{college || 'Not picked yet'}</Text>
              </View>
              <View style={[s.previewRow, { flex: 1, minWidth: 120 }]}>
                <Text style={s.previewLabel}>Career Path</Text>
                <Text style={s.previewVal}>{CAREER_PATHS.find(p => p.id === careerPath)?.title || 'Not picked yet'}</Text>
              </View>
              {/* Invisible spacer to fix flex: 1 alignment on the last row */}
              <View style={{ flex: 1, minWidth: 120 }} />
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 6, gap: 12 }}>

          {/* ══════════════════ STEP 0: Education ══════════════════ */}
          {step === 0 && (
            <View style={s.cardGrid}>
              {EDU_LEVELS.map((e) => {
                const Icon = e.icon;
                const active = edu === e.id;
                return (
                  <Pressable key={e.id} style={[s.card, active && s.cardActive]} onPress={() => setEdu(e.id)}>
                    <Icon size={22} color={active ? '#7C3AED' : '#9CA3AF'} />
                    <Text style={[s.cardLabel, active && s.cardLabelActive]}>{e.label}</Text>
                    {active && <CheckCircle2 size={14} color="#B07FDF" style={{ marginLeft: 'auto' } as any} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ══════════════════ STEP 1: College ══════════════════ */}
          {step === 1 && (
            <>
              <Text style={s.section}>{edu === 'high_school' ? 'School Name *' : 'Institution *'}</Text>
              <View style={{ marginBottom: 14 }}>
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
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.section}>{edu === 'high_school' ? 'Stream *' : 'Graduation Year *'}</Text>
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
                <View style={{ flex: 1 }}>
                  <Text style={s.section}>{edu === 'high_school' ? 'Percentage/CGPA *' : 'Domain *'}</Text>
                  <AuthInput value={cgpa} onChangeText={setCgpa} placeholder={edu === 'high_school' ? '95' : 'e.g. Computer Science'} keyboardType={edu === 'high_school' ? 'decimal-pad' : 'default'} />
                </View>
              </View>
            </>
          )}

          {/* ══════════════════ STEP 2: Career Path ★ NEW ══════════════════ */}
          {step === 2 && (
            <View style={{ gap: 10 }}>
              {CAREER_PATHS.map((p) => {
                const active = careerPath === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[s.pathTile, active && s.pathTileActive]}
                    onPress={() => {
                      setCareerPath(p.id);
                      setPathFeedback(true);
                      setTimeout(() => setPathFeedback(false), 900);
                    }}
                    testID={`career-path-${p.id}`}
                  >
                    <View style={s.pathTileTop}>
                      <View style={{ marginTop: 2, marginRight: 2 }}>
                        <p.icon size={24} color={active ? '#7C3AED' : '#9CA3AF'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.pathTitle, active && s.pathTitleActive]}>{p.title}</Text>
                        <Text style={s.pathDesc}>{p.desc}</Text>
                      </View>
                      {active && <CheckCircle2 size={16} color="#7C3AED" />}
                    </View>
                    {/* "You'll receive" preview */}
                    <Text style={[s.section, { marginTop: 4, marginBottom: 2 }]}>You'll receive</Text>
                    <View style={s.pathUnlocks}>
                      {p.unlocks.map((u) => (
                        <Text key={u} style={[s.pathUnlockChip, active && s.pathUnlockChipActive]}>• {u}</Text>
                      ))}
                    </View>
                  </Pressable>
                );
              })}
              {pathFeedback && (
                <Text style={s.feedbackText}>Great choice! Your dashboard will be personalized for this path.</Text>
              )}
            </View>
          )}

          {/* ══════════════════ STEP 3: Photo + Bio ══════════════════ */}
          {step === 3 && (
            <>
              {/* Photo */}
              <View style={{ alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <Pressable onPress={takeSelfie} style={s.photoFrame}>
                  {pendingPhoto ? (
                    <Image source={{ uri: pendingPhoto }} style={s.photoImg} />
                  ) : photo ? (
                    <Image source={{ uri: photo }} style={s.photoImg} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 8 }}>
                      <Camera size={32} color="#9CA3AF" />
                      <Text style={s.photoHint}>Tap to capture</Text>
                    </View>
                  )}
                </Pressable>
                {pendingPhoto ? (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable style={s.confirmBtn} onPress={confirmPhoto}>
                      <Check size={14} color="#000" /><Text style={s.confirmBtnText}>Confirm</Text>
                    </Pressable>
                    <Pressable style={s.smallBtn} onPress={() => { setPendingPhoto(null); takeSelfie(); }}>
                      <Camera size={14} color="#111827" /><Text style={s.smallBtnText}>Retake</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable style={s.smallBtn} onPress={takeSelfie}>
                      <Camera size={14} color="#111827" /><Text style={s.smallBtnText}>Take Selfie</Text>
                    </Pressable>
                    <Pressable style={s.smallBtn} onPress={pickPhoto}>
                      <Upload size={14} color="#111827" /><Text style={s.smallBtnText}>Upload Photo</Text>
                    </Pressable>
                  </View>
                )}
                {!photo && !pendingPhoto && (
                  <Text style={s.skipHint}>Optional — but adds to your badge score</Text>
                )}
              </View>

              {/* Bio */}
              <Text style={s.section}>Your Bio</Text>
              <View style={s.textareaWrap}>
                <RNTextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, 300))}
                  multiline
                  placeholder="e.g. Final year CSE student at IIT Bombay, passionate about building AI products…"
                  placeholderTextColor="#9CA3AF"
                  style={s.textarea}
                />
              </View>
              <Text style={s.helperRight}>{bio.length}/300</Text>

              <Text style={s.section}>Writing Style — AI Generate</Text>
              <Text style={s.helper}>Tap a style to auto-generate your bio using AI.</Text>
              <View style={s.chipRow}>
                {STYLES.map((x) => (
                  <DarkChip key={x} label={x} active={bioStyle === x} onPress={() => handleStylePress(x)} />
                ))}
              </View>
              {generatingBio && (
                <Text style={s.generatingText}>✨ Generating your bio…</Text>
              )}
            </>
          )}
          {/* Step 4 was removed */}

        </View>
      </ScrollView>
        </Animated.View>


      </View>

      {validationNotice && (
        <View style={s.validationPill}>
          <Text style={s.validationText}>💡 {validationNotice}</Text>
        </View>
      )}

      {/* ── Navigation Row ── */}
      <View style={s.navRow}>
        <Pressable onPress={() => step > 0 ? prev() : router.push('/(auth)/referral-code')} style={s.backBtn}>
          <ArrowLeft size={18} color="#374151" />
        </Pressable>
        <View style={{ flex: 1 }}>
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



// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  title: { color: '#111827', fontFamily: FONTS.bold, fontSize: 24, marginBottom: 4 },
  sub: { color: '#6B7280', fontFamily: FONTS.med, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  section: {
    color: '#6B7280', fontFamily: FONTS.bold,
    fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 4, marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },

  // Education / generic card grid
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  card: {
    width: '48%', paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardActive: { borderColor: '#7C3AED', backgroundColor: '#F3E8FF' },
  cardLabel: { flex: 1, color: '#4B5563', fontFamily: FONTS.med, fontSize: 13 },
  cardLabelActive: { color: '#7C3AED' },

  // Career path tiles
  pathTile: {
    borderRadius: 14, borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14, gap: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 160ms' } as any) : {}),
  },
  pathTileActive: { borderColor: '#7C3AED', backgroundColor: '#F3E8FF' },
  pathTileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pathEmoji: { fontSize: 26, marginTop: 2 },
  pathTitle: { color: '#374151', fontFamily: FONTS.bold, fontSize: 15 },
  pathTitleActive: { color: '#7C3AED' },
  pathDesc: { color: '#6B7280', fontFamily: FONTS.med, fontSize: 12, marginTop: 2, lineHeight: 16 },
  pathUnlocks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pathUnlockChip: {
    color: '#6B7280', fontFamily: FONTS.med, fontSize: 11,
    backgroundColor: '#F3F4F6',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pathUnlockChipActive: {
    color: '#6D28D9',
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  feedbackText: {
    color: '#7C3AED', fontFamily: FONTS.med, fontSize: 12,
    textAlign: 'center', marginTop: 4,
  },

  // Career goal radios
  optRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  optRowActive: { borderColor: '#7C3AED', backgroundColor: '#F3E8FF' },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: '#9CA3AF',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#7C3AED' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED' },
  optLabel: { color: '#4B5563', fontFamily: FONTS.med, fontSize: 14 },
  optLabelActive: { color: '#7C3AED' },
  helper: { color: '#6B7280', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18, marginBottom: 8 },

  // Photo
  photoFrame: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoHint: { color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 11 },
  skipHint: { color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 11, textAlign: 'center' },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#7C3AED', borderWidth: 1, borderColor: '#7C3AED',
  },
  smallBtnText: { color: '#4C1D95', fontFamily: FONTS.bold, fontSize: 12 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#10B981', borderWidth: 1, borderColor: '#10B981',
  },
  confirmBtnText: { color: '#111827', fontFamily: FONTS.bold, fontSize: 12 },

  // Bio
  helperRight: { color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 11, textAlign: 'right', marginTop: -8 },
  textareaWrap: {
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  textarea: {
    color: '#111827', fontFamily: FONTS.med, fontSize: 13.5, minHeight: 90,
    ...(Platform.OS === 'web' ? ({ outlineWidth: 0 } as any) : {}),
  },
  generatingText: { color: '#7C3AED', fontFamily: FONTS.med, fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Badge + Review
  badgeCircle: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3E8FF', marginTop: 4,
  },
  badgeTier: { color: '#7C3AED', fontFamily: FONTS.bold, fontSize: 11, marginTop: 4, letterSpacing: 1 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
  },
  verifiedText: { color: '#059669', fontFamily: FONTS.bold, fontSize: 11.5 },
  reviewCard: {
    width: '100%', backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 14, gap: 6,
  },
  reviewCardTitle: { color: '#6B7280', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewLabel: { color: '#6B7280', fontFamily: FONTS.med, fontSize: 12.5 },
  reviewValue: { color: '#111827', fontFamily: FONTS.bold, fontSize: 12.5 },
  perk: { color: '#374151', fontFamily: FONTS.med, fontSize: 12.5 },

  // Nav
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  validationPill: {
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F3E8FF', borderWidth: 1, borderColor: '#C4B5FD',
  },
  validationText: {
    color: '#6D28D9', fontFamily: FONTS.med, fontSize: 12.5,
  },
  previewCard: {
    width: '100%', padding: 16, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignSelf: 'stretch', gap: 12,
  },
  previewTitle: {
    color: '#7C3AED', fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 1,
  },
  previewRow: { gap: 2 },
  previewLabel: {
    color: '#6B7280', fontFamily: FONTS.med, fontSize: 11,
  },
  previewVal: {
    color: '#111827', fontFamily: FONTS.bold, fontSize: 13,
  },
});
