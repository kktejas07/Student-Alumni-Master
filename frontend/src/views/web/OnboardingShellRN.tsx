// @ts-nocheck
/**
 * OnboardingShellRN — Exact 1:1 Match of Onboarding.html with
 * Interactive Photo Capture / Avatar Upload Step and 3D Card Integration.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { getBaseUrl } from '@/src/lib/env';
import { passwordStrength } from '@/src/lib/authAnalytics';
import { initFirebaseAuth, signInWithGoogle } from '@/src/lib/firebaseAuth';
import { CollegeAutocomplete, type CollegeSelection } from '@/src/views/components/CollegeAutocomplete';

export function OnboardingShellRN() {
  const router = useRouter();

  if (Platform.OS === 'web') {
    return <WebOnboardingEngine router={router} />;
  }

  return <NativeOnboardingFallback router={router} />;
}

function WebOnboardingEngine({ router }: { router: any }) {
  const [flow, setFlow] = useState<'student' | 'alumnus' | 'college'>('student');
  const [isLoaded, setIsLoaded] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  // Real-Time Auth & OTP State
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isPasswordTyping, setIsPasswordTyping] = useState(false);
  const [userDob, setUserDob] = useState(''); // ISO YYYY-MM-DD — required by /auth/register
  const [showPwd, setShowPwd] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [realtimeOtpCode, setRealtimeOtpCode] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [collegeSelection, setCollegeSelection] = useState<CollegeSelection | null>(null);
  const [collegeError, setCollegeError] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(true);
  const finishInProgressRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const passwordFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dobInputRef = useRef<HTMLInputElement>(null);
  const passwordCheck = passwordStrength(userPassword);
  const showPasswordRequirements = userPassword.length > 0
    && (isPasswordTyping || passwordCheck.score < passwordCheck.checks.length);

  useEffect(() => () => {
    if (passwordFeedbackTimerRef.current) clearTimeout(passwordFeedbackTimerRef.current);
  }, []);

  const handlePasswordChange = (password: string) => {
    setUserPassword(password);
    setIsPasswordTyping(true);
    if (passwordFeedbackTimerRef.current) clearTimeout(passwordFeedbackTimerRef.current);
    passwordFeedbackTimerRef.current = setTimeout(() => setIsPasswordTyping(false), 1000);
  };

  const handlePasswordBlur = () => {
    setIsPasswordTyping(false);
    if (passwordFeedbackTimerRef.current) clearTimeout(passwordFeedbackTimerRef.current);
  };

  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const focusMissingAccountField = (field: 'name' | 'email' | 'password' | 'dob') => {
    const fieldRefs = {
      name: nameInputRef,
      email: emailInputRef,
      password: passwordInputRef,
      dob: dobInputRef,
    };
    const input = fieldRefs[field].current;
    if (!input) return;
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
  };

  const validateAccountFields = () => {
    if (!userName.trim()) {
      setOtpError('Please enter your full name.');
      focusMissingAccountField('name');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())) {
      setOtpError('Please enter a valid email address.');
      focusMissingAccountField('email');
      return false;
    }
    if (!userPassword) {
      setOtpError('Please create a password for your account.');
      focusMissingAccountField('password');
      return false;
    }
    if (!userDob) {
      setOtpError('Please enter your date of birth to create your account.');
      focusMissingAccountField('dob');
      return false;
    }
    return true;
  };

  const handleSendRealtimeOtp = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      setOtpError('Please enter a valid email address.');
      return false;
    }
    setIsSendingOtp(true);
    setOtpError(null);
    const startTime = Date.now();
    try {
      const res = await api.sendEmailOtp(userEmail);
      if (res && res.otp_code) {
        setRealtimeOtpCode(res.otp_code);
        setOtpDigits(res.otp_code.split(''));
      }
      return true;
    } catch (err: any) {
      setOtpError(err?.message || 'Failed to send OTP code.');
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyRealtimeOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      setOtpError('Please enter all 6 digits of the verification code.');
      return false;
    }
    setIsVerifyingOtp(true);
    setOtpError(null);
    const startTime = Date.now();
    try {
      const res = await api.verifyEmailOtp(userEmail, code);
      setIsOtpVerified(true);
      if (res && res.user && res.token) {
        setUser(res.user);
        await setTokens(res.token, res.token);
      }
      return true;
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid 6-digit code. Please enter the correct code.');
      return false;
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setOtpError(null);
    try {
      const googleProfile = await signInWithGoogle();
      if (!googleProfile) return;
      if (!googleProfile.idToken || !googleProfile.email) {
        throw new Error('Google did not return a verified email address. Please try again.');
      }

      const emailToUse = googleProfile.email.trim().toLowerCase();
      const res = await api.oauthFirebase({
        id_token: googleProfile.idToken,
        email: emailToUse,
        full_name: googleProfile.name || emailToUse.split('@')[0],
        picture: googleProfile.picture,
        role: flow === 'alumnus' ? 'alumni' : flow,
      });

      if (res && res.user && res.access_token) {
        setUser(res.user);
        await setTokens(res.access_token, res.refresh_token);
        const role = String(res.user.role || '').toLowerCase();
        if (role === 'alumni') router.replace('/alumni-portal');
        else if (role === 'college') router.replace('/college-portal');
        else if (role === 'mentor') router.replace('/mentor-portal');
        else if (role === 'admin' || role === 'super_admin') router.replace('/super-admin');
        else router.replace('/student-portal/dashboard');
      } else {
        throw new Error('Google authentication failed. Please try again.');
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Google authentication failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFinishOnboarding = async () => {
    if (finishInProgressRef.current) return;
    finishInProgressRef.current = true;
    setIsFinishing(true);
    setOtpError(null);

    try {
      const existingUser = useAuthStore.getState().user;
      const alreadyRegistered = existingUser?.email?.toLowerCase() === userEmail.trim().toLowerCase();

      if (!alreadyRegistered) {
        if (!userPassword) {
          setOtpError('Please create a password for your account before continuing.');
          setStepIdx(1);
          setTimeout(() => focusMissingAccountField('password'), 0);
          return;
        }

        if (!userDob) {
          setOtpError('Please enter your date of birth to create your account.');
          setStepIdx(1);
          setTimeout(() => focusMissingAccountField('dob'), 0);
          return;
        }

        const regRes = await api.register({
          email: userEmail,
          password: userPassword,
          full_name: userName || userEmail.split('@')[0],
          role: flow === 'alumnus' ? 'alumni' : flow,
          dob: userDob,
        });

        if (!regRes?.user || !regRes.access_token) {
          setOtpError('Registration failed. Please try again.');
          return;
        }

        setUser(regRes.user);
        await setTokens(regRes.access_token, regRes.refresh_token);
      }

      if (avatarUri && !profilePhotoSaved) {
        await api.updateProfile({ face_image_base64: avatarUri, photo_data: avatarUri });
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setUser({ ...currentUser, face_image_base64: avatarUri, photo_data: avatarUri });
        }
        setProfilePhotoSaved(true);
      }

      if (resumeFile && !resumeUploadComplete) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('Could not read the selected resume.'));
          };
          reader.onerror = () => reject(new Error('Could not read the selected resume.'));
          reader.readAsDataURL(resumeFile);
        });
        await request('/users/me/resume', {
          method: 'POST',
          body: { name: resumeFile.name, size: resumeFile.size, data_url: dataUrl },
        });
        setResumeUploadComplete(true);
      }

      const selectedInstitution = collegeSelection?.name.trim() || '';
      const savedUser = await api.completeOnboarding({
        school_info: {
          institution_name: selectedInstitution,
          institution_type: 'college',
          college_id: collegeSelection?.isCustom ? null : collegeSelection?.id,
          college_tier: collegeSelection?.isCustom ? null : collegeSelection?.tier,
          is_custom_college: Boolean(collegeSelection?.isCustom),
          custom_college_name: collegeSelection?.isCustom ? selectedInstitution : null,
          class_or_year: selectedYear,
          branch_or_stream: selectedCourse,
          graduation_year: Number(selectedYear),
        },
        career_path: 'job',
        interests,
        skills: Object.keys(skillLevels),
        ...(avatarUri ? { face_image_base64: avatarUri } : {}),
      });
      if (savedUser) setUser(savedUser);

      void AsyncStorage.removeItem('sa_onboarding_state').catch((err) => {
        console.warn('Unable to clear saved onboarding state:', err);
      });

      if (flow === 'alumnus') router.replace('/alumni-portal');
      else if (flow === 'college') router.replace('/college-portal');
      else router.replace('/student-portal/dashboard');
    } catch (regErr: any) {
      const msg = regErr?.detail || regErr?.message || 'Registration failed. Please check your details and try again.';
      setOtpError(msg);
    } finally {
      finishInProgressRef.current = false;
      setIsFinishing(false);
    }
  };

  // Student Form State
  const [selectedCourse, setSelectedCourse] = useState('Computer Science');
  const [selectedYear, setSelectedYear] = useState('2027');
  const [selectedSem, setSelectedSem] = useState('5');
  const [selectedGoal, setSelectedGoal] = useState('Software engineering');
  const [skillLevels, setSkillLevels] = useState<Record<string, number>>({
    dsa: 2,
    sys_design: 1,
    interviews: 3,
    portfolio: 1,
  });
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState('');
  const [resumeUploadComplete, setResumeUploadComplete] = useState(false);
  const [resumeATS, setResumeATS] = useState<{ score: number } | null>(null);
  const [resumeATSLoading, setResumeATSLoading] = useState(false);

  // Profile Photo State
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [profilePhotoSaved, setProfilePhotoSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const [interests, setInterests] = useState<string[]>(['Backend', 'Machine learning', 'Hackathons']);
  const [mentorFmt, setMentorFmt] = useState('Video calls');
  const [mentorFreq, setMentorFreq] = useState('Twice a month');
  const [mentorWho, setMentorWho] = useState('Someone from my college');
  const [followedMentors, setFollowedMentors] = useState<Record<string, boolean>>({});

  // Alumnus Form State
  const [alumCompany, setAlumCompany] = useState('');
  const [alumRole, setAlumRole] = useState('');
  const [alumCap, setAlumCap] = useState('2');
  const [alumExpertise, setAlumExpertise] = useState<string[]>(['Resume review', 'Interview prep', 'Career switching']);

  // Name capitalization helper — capitalize first letter of each word
  const capitalizeName = (name: string) => {
    if (!name) return '';
    return name.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Dynamic SA ID generation
  const generateSaId = () => {
    const prefix = flow === 'alumnus' ? 'AL' : 'ST';
    const year = flow === 'alumnus' ? (selectedYear || '26').slice(-2) : new Date().getFullYear().toString().slice(-2);
    const collegeShort = (instName || 'MRIT').replace(/[^A-Z]/gi, '').substring(0, 4).toUpperCase();
    const seq = String(Math.floor(10000 + Math.random() * 90000));
    return `SA-${prefix}-${year}-${collegeShort}-${seq}`;
  };

  const [generatedSaId, setGeneratedSaId] = useState('');

  // College Form State
  const [instName, setInstName] = useState('');
  const [instRole, setInstRole] = useState('');
  const [instSize, setInstSize] = useState('500–2,000');
  const [collegeDepts, setCollegeDepts] = useState<string[]>(['Computer Science', 'Business']);

  // Global State
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    reply: true,
    opp: true,
    events: false,
    news: false,
  });
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeGoogleAuth = async () => {
      let firebaseConfig;
      try {
        const response = await fetch(`${getBaseUrl()}/api/auth/oauth-config`);
        if (!response.ok) {
          throw new Error(`OAuth configuration request failed (${response.status})`);
        }
        const config = await response.json();
        firebaseConfig = config?.firebase;
      } catch (err) {
        console.warn('Unable to load Google sign-in configuration:', err);
      }

      await initFirebaseAuth(firebaseConfig || {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
      });
      if (!cancelled) {
        setIsGoogleLoading(false);
      }
    };

    void initializeGoogleAuth();
    return () => {
      cancelled = true;
    };
  }, []);



  const FLOW_SEQS = {
    student: ['who', 'account', 'verify', 'course', 'goal', 'skills', 'resume', 'photo', 'interests', 'mentorpref', 'notify', 'roadmap', 'mentors', 'perks', 'card', 'done'],
    alumnus: ['who', 'account', 'verify', 'college', 'role', 'photo', 'capacity', 'expertise', 'notify', 'perks', 'card', 'done'],
    college: ['who', 'account', 'verify', 'institution', 'departments', 'invite', 'notify', 'perks', 'done'],
  };

  const CRUMBS: Record<string, string> = {
    who: 'Getting started',
    account: 'Your account',
    verify: 'Your account',
    course: 'About you',
    goal: 'About you',
    skills: 'About you',
    resume: 'About you',
    photo: 'Profile Photo',
    interests: 'Preferences',
    mentorpref: 'Preferences',
    notify: 'Preferences',
    roadmap: 'Your plan',
    mentors: 'Your plan',
    role: 'About you',
    college: 'About you',
    capacity: 'Your commitment',
    expertise: 'Your commitment',
    institution: 'Your institution',
    departments: 'Your institution',
    invite: 'Your cohort',
    perks: 'Perks & offers',
    card: 'Your SA card',
    done: 'Done',
  };

  const currentSeq = FLOW_SEQS[flow];
  const currentKey = currentSeq[stepIdx] || 'who';
  const progressPct = ((stepIdx / (currentSeq.length - 1)) * 100).toFixed(1);

  // Generate SA ID once when card step is reached
  useEffect(() => {
    if (currentKey === 'card' && !generatedSaId) {
      setGeneratedSaId(generateSaId());
    }
  }, [currentKey]);

  const nextStep = async () => {
    if (isNavigating) return;
    if (['course', 'college', 'institution'].includes(currentKey)) {
      const validCollege = Boolean(collegeSelection?.name.trim());
      setCollegeError(!validCollege);
      if (!validCollege) return;
    }
    setIsNavigating(true);
    try {
      if (currentKey === 'account') {
        if (!validateAccountFields()) return;
        const sent = await handleSendRealtimeOtp();
        if (sent) setStepIdx(stepIdx + 1);
        return;
      }
      if (currentKey === 'verify') {
        const ok = await handleVerifyRealtimeOtp();
        if (ok) {
          setStepIdx(stepIdx + 1);
        }
        return;
      }
      if (stepIdx < currentSeq.length - 1) {
        setStepIdx(stepIdx + 1);
      } else {
        await handleFinishOnboarding();
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const skipStep = () => {
    if (['course', 'college', 'institution'].includes(currentKey)) {
      void nextStep();
      return;
    }
    if (stepIdx < currentSeq.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  const prevStep = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
    else router.replace('/');
  };

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleExpertise = (item: string) => {
    setAlumExpertise((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleDept = (dept: string) => {
    setCollegeDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const updateCollegeSelection = (selection: CollegeSelection | null) => {
    setCollegeSelection(selection);
    setInstName(selection?.name || '');
    if (selection?.name.trim()) setCollegeError(false);
  };

  const handleResumeDrop = () => {
    resumeInputRef.current?.click();
  };

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(extension || '')) {
      setResumeError('Unsupported file type. Please choose a PDF, DOC, or DOCX file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError('File too large (max 5MB)');
      return;
    }

    setResumeError('');
    setResumeFile(file);
    setResumeUploaded(true);
    setResumeUploadComplete(false);
    setResumeATS(null);
    if (extension === 'pdf' || extension === 'docx') {
      setResumeATSLoading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          if (typeof reader.result !== 'string') {
            throw new Error('Could not read the selected resume.');
          }
          const response = await fetch(`${getBaseUrl()}/api/auth/resume-ats-check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              size: file.size,
              data_url: reader.result,
              target_role: selectedGoal,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data?.detail || 'ATS check failed');
          if (typeof data?.score !== 'number') throw new Error('ATS response did not include a score.');
          setResumeATS(data);
        } catch (error: unknown) {
          setResumeError(error instanceof Error ? error.message : 'Unable to check this resume right now.');
        } finally {
          setResumeATSLoading(false);
        }
      };
      reader.onerror = () => {
        setResumeATSLoading(false);
        setResumeError('Could not read the selected resume.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Unsupported image type. Please choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUri(reader.result);
        setPhotoError('');
        setProfilePhotoSaved(false);
      } else {
        setPhotoError('Could not read the selected image.');
      }
    };
    reader.onerror = () => setPhotoError('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  const copyCouponCode = (code: string) => {
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const SKILL_LABELS: Record<number, string> = {
    1: 'Just starting',
    2: 'Comfortable',
    3: 'Confident',
    4: 'Could teach it',
  };

  if (!isLoaded) return null;

  return (
    <div
      id="ob-root"
      style={{
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: 'var(--text)',
        backgroundColor: 'var(--bg)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'clip',
        overflowY: 'auto',
        width: '100%',
      }}
    >
      {/* ── CSS Tokens & Keyframes ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        :root, #ob-root {
          --ind: #5B4FE9;
          --ind-lt: #8B84FF;
          --bg: #05060F;
          --bg2: #05060D;
          --card: #0C0E1B;
          --card2: #0E1020;
          --line: #1B1E33;
          --line2: #171A2C;
          --line-hi: #2A2A55;
          --dot: #2A2E45;
          --text: #F4F5FB;
          --text2: #D5D8E4;
          --muted: #9AA0B4;
          --muted2: #B6BACB;
          --nav-bg: rgba(5,6,15,.78);
          --tint: rgba(91,79,233,.16);
          --tint2: rgba(91,79,233,.20);
          --glow1: rgba(124,107,255,.22);
          --glow2: rgba(47,184,198,.15);
        }
        @keyframes ob-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ob-ring { 0% { transform: scale(.6); opacity: .55; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes ob-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes ob-cardfloat { 0%, 100% { transform: rotate(-1.6deg) translateY(0); } 50% { transform: rotate(1.6deg) translateY(-12px); } }
        @keyframes ob-wash { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-3%, 2.5%, 0); } }
        @keyframes ob-shine { 0% { transform: translateX(-120%) skewX(-18deg); } 55%, 100% { transform: translateX(220%) skewX(-18deg); } }
        .ob-chip { transition: all .2s ease; }
        .ob-chip:hover { border-color: var(--ind) !important; }
        .ob-pick { transition: all .25s ease; }
        .ob-pick:hover { transform: translateY(-3px); border-color: var(--ind-lt) !important; }
        .ob-toggle-row { transition: all .2s ease; }
        .ob-toggle-row:hover { border-color: var(--line-hi) !important; }
        .ob-ghost:hover { border-color: var(--line-hi) !important; background: var(--card2) !important; }
        .ob-cta:hover { background: #6E62F5 !important; }
      `,
        }}
      />

      {/* ── Hidden File Input for Avatar ── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/webp"
        data-testid="onboarding-photo-input"
        aria-label="Choose a profile photo"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={resumeInputRef}
        onChange={handleResumeSelect}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        data-testid="onboarding-resume-input"
        aria-label="Choose a resume"
        style={{ display: 'none' }}
      />

      {/* ── Background Aurora Glow Wash ── */}
      <div id="ob-field" style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div
          id="ob-wash"
          style={{
            position: 'absolute',
            left: '-25%',
            top: '-25%',
            width: '150%',
            height: '150%',
            background:
              'radial-gradient(46% 40% at 32% 26%, var(--glow1), transparent 68%), radial-gradient(40% 38% at 74% 68%, var(--glow2), transparent 70%)',
            filter: 'blur(30px)',
            animation: 'ob-wash 48s ease-in-out infinite',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 26vh 14vh var(--bg)' }} />
      </div>

      {/* ── Fixed 720px SA Background Shield Watermark ── */}
      <svg
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: '90px',
          right: '20px',
          width: '720px',
          height: 'auto',
          opacity: 0.11,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        viewBox="0 0 300 350"
      >
        <defs>
          <linearGradient id="obWatermarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D8B6FF" />
            <stop offset="45%" stopColor="#9A5CE8" />
            <stop offset="100%" stopColor="#5B1FB0" />
          </linearGradient>
          <linearGradient id="obWatermarkInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B683F5" />
            <stop offset="100%" stopColor="#7331C9" />
          </linearGradient>
        </defs>
        <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#obWatermarkGrad)" />
        <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#obWatermarkInner)" />
        <text
          style={{ fontFamily: "'Manrope', sans-serif", fontSize: '128px', fontWeight: 800, letterSpacing: '-4px', fill: '#FFFFFF' }}
          textAnchor="middle"
          x="150"
          y="215"
        >
          SA
        </text>
      </svg>

      {/* ── Sticky Top Bar with Progress Line ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ height: '3px', background: 'var(--line2)' }}>
          <div
            id="ob-prog"
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--ind), #3AA0F0 55%, #34D3A6)',
              transition: 'width .45s cubic-bezier(.2,.8,.2,1)',
            }}
          />
        </div>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <button
            type="button"
            aria-label="StudentAlumni home"
            onClick={() => router.replace('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', border: 0, padding: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left' }}
          >
            <svg width="26" height="30" viewBox="0 0 300 350" style={{ flex: 'none' }}>
              <defs>
                <linearGradient id="obBadge" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C6BFF" />
                  <stop offset=".55" stopColor="#4B3FD6" />
                  <stop offset="1" stopColor="#2FB8C6" />
                </linearGradient>
              </defs>
              <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#obBadge)" />
              <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="rgba(255,255,255,.16)" />
              <text x="150" y="216" textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '126px', fontWeight: 800, letterSpacing: '-6px', fill: '#FFFFFF' }}>
                SA
              </text>
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>StudentAlumni</span>
          </button>
          <div id="ob-crumb" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {CRUMBS[currentKey] || 'Getting started'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span id="ob-count" style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Step {stepIdx + 1} of {currentSeq.length}
            </span>
            <button
              type="button"
              id="ob-exit"
              aria-label="Cancel onboarding"
              onClick={async () => {
                await AsyncStorage.removeItem('sa_onboarding_state');
                router.replace('/');
              }}
              style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', border: 0, padding: 0, background: 'transparent', font: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Stage Area ── */}
      <div id="ob-stage" style={{ position: 'relative', zIndex: 2, flex: 1, maxWidth: '1180px', width: '100%', margin: '0 auto', padding: '64px 32px 40px', boxSizing: 'border-box' }}>
        {/* STEP 1: PERSONA SELECTOR (WHO) */}
        {currentKey === 'who' && (
          <div className="ob-step" style={{ display: 'block', animation: 'ob-in .4s ease' }}>
            <div style={{ maxWidth: '640px', marginBottom: '40px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--ind-lt)', marginBottom: '16px' }}>
                WELCOME
              </div>
              <h1 style={{ fontSize: '44px', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1.8px', margin: '0 0 14px' }}>
                First, who are you?
              </h1>
              <p style={{ fontSize: '17px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                This decides what we ask next, and how little we ask.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px' }}>
              {[
                { id: 'student', title: 'Student', sub: 'Find mentors, build a roadmap, land a first offer.', badge: '16 STEPS · ~3 MIN', icon: 'M12 4 L21 8.5 L12 13 L3 8.5 Z M21 8.5 v5.5 M7 11 v4.5 q5 3.2 10 0 V11' },
                { id: 'alumnus', title: 'Alumnus or mentor', sub: 'Set your capacity and answer where it counts.', badge: '11 STEPS · ~2 MIN', icon: 'M12 4 a4 4 0 1 0 0 8 a4 4 0 0 0 0 -8 Z M5 20 q7 -7 14 0' },
                { id: 'college', title: 'College', sub: 'Connect a cohort and see placement in one view.', badge: '9 STEPS · ~2 MIN', icon: 'M4 20 h16 M6 20 v-9 h5 v9 M13 20 v-13 h5 v13' },
              ].map((p) => {
                const on = flow === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setFlow(p.id as any);
                      setTimeout(nextStep, 260);
                    }}
                    className="ob-pick"
                    style={{
                      border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                      borderRadius: '16px',
                      background: on ? 'var(--tint)' : 'var(--card)',
                      padding: '28px 26px 30px',
                      cursor: 'pointer',
                      width: '100%',
                      color: 'var(--text)',
                      font: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--ind-lt)', strokeWidth: 1.6, marginBottom: '30px' }}>
                      <path d={p.icon} />
                    </svg>
                    <div style={{ fontSize: '19px', fontWeight: 700, marginBottom: '6px' }}>{p.title}</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted)' }}>{p.sub}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.2px', color: 'var(--ind-lt)', marginTop: '18px' }}>
                      {p.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: CREATE ACCOUNT */}
        {currentKey === 'account' && (
          <div className="ob-step" style={{ display: 'block', animation: 'ob-in .4s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, .9fr)', gap: '64px', alignItems: 'start' }}>
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                    Create your account
                  </h1>
                  <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                    Use your college address if you have one — it unlocks your cohort automatically.
                  </p>
                </div>
                <div style={{ display: 'grid', gap: '14px', maxWidth: '460px' }}>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '1px solid var(--dot)', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 600, cursor: isGoogleLoading ? 'wait' : 'pointer', background: 'var(--card)', color: 'var(--text)', opacity: isGoogleLoading ? 0.7 : 1 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.9 19.7-20 0-1.3-.1-2.4-.3-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.6 8.4 6.3 14.1z" />
                      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.5 16.1 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.8l6.3 5.3c-.4.4 6.7-4.9 6.7-15.1 0-1.3-.1-2.4-.3-3.5z" />
                    </svg>
                    {isGoogleLoading ? 'Preparing Google sign-in...' : 'Continue with Google'}
                  </button>
                  {otpError && (
                    <div role="alert" style={{ border: '1px solid #EF4444', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', padding: '12px 16px', color: '#F87171', fontSize: '14px' }}>
                      {otpError}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '6px 0' }}>
                    <span style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                    <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>or continue with email</span>
                    <span style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '7px' }}>Full Name</div>
                    <input
                      ref={nameInputRef}
                      aria-label="Full Name"
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Aisha Khan"
                      style={{ border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: 'var(--text)', width: '100%', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '7px' }}>Email Address</div>
                    <input
                      ref={emailInputRef}
                      aria-label="Email Address"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="you@college.edu"
                      style={{ border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: 'var(--text)', width: '100%', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '7px' }}>Password</div>
                    <div style={{ position: 'relative' }}>
                      <input
                        ref={passwordInputRef}
                        aria-label="Password"
                        type={showPwd ? 'text' : 'password'}
                        value={userPassword}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onBlur={handlePasswordBlur}
                        aria-describedby={showPasswordRequirements ? 'password-requirements' : undefined}
                        placeholder="••••••••••"
                        style={{ border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', paddingRight: '55px', fontSize: '15px', color: 'var(--text)', width: '100%', outline: 'none' }}
                      />
                      <button
                        type="button"
                        aria-label={`${showPwd ? 'Hide' : 'Show'} password`}
                        onClick={() => setShowPwd(!showPwd)}
                        style={{ position: 'absolute', right: '15px', top: '15px', fontSize: '13px', fontWeight: '600', color: 'var(--muted)', cursor: 'pointer', border: 0, padding: 0, background: 'transparent', font: 'inherit' }}
                      >
                        {showPwd ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showPasswordRequirements && (
                      <div
                        id="password-requirements"
                        aria-live="polite"
                        style={{ marginTop: '12px', padding: '12px', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)' }}
                      >
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                          {passwordCheck.checks.map((check, index) => (
                            <span
                              key={check.key}
                              style={{
                                flex: 1,
                                height: '4px',
                                borderRadius: '2px',
                                background: index < passwordCheck.score ? 'var(--ind)' : 'var(--line2)',
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '7px' }}>
                          Password requirements
                        </div>
                        <div style={{ display: 'grid', gap: '5px' }}>
                          {passwordCheck.checks.map((check) => (
                            <div
                              key={check.key}
                              style={{ fontSize: '12px', color: check.met ? 'var(--ind-lt)' : 'var(--muted)' }}
                            >
                              {check.met ? '✓' : '○'} {check.label}
                            </div>
                          ))}
                        </div>
                        {passwordCheck.score === passwordCheck.checks.length && (
                          <div style={{ fontSize: '12px', color: 'var(--ind-lt)', marginTop: '8px' }}>
                            Password meets all requirements.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Date of Birth — required by platform age policy */}
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '7px' }}>Date of Birth</div>
                    <input
                      ref={dobInputRef}
                      aria-label="Date of Birth"
                      type="date"
                      value={userDob}
                      onChange={(e) => setUserDob(e.target.value)}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                      style={{ border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: userDob ? 'var(--text)' : 'var(--muted)', width: '100%', outline: 'none' }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                      Required for age verification. Stored securely and encrypted.
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--card)', padding: '26px 28px 28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--ind-lt)', marginBottom: '20px' }}>
                  WHAT YOU GET
                </div>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    '1,200+ verified mentors, matched to your course',
                    'A roadmap that updates as your goals change',
                    'Free for students, with no card required',
                  ].map((txt, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '12px', alignItems: 'start' }}>
                      <svg width="17" height="17" viewBox="0 0 20 20" style={{ fill: 'none', stroke: 'var(--ind-lt)', strokeWidth: 1.8, marginTop: '2px' }}>
                        <circle cx="10" cy="10" r="8.4" />
                        <path d="M6.4 10.4 l2.4 2.4 4.8 -5.6" />
                      </svg>
                      <div style={{ fontSize: '14.5px', lineHeight: 1.55, color: 'var(--muted2)' }}>{txt}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--line)', fontSize: '13px', lineHeight: 1.6, color: 'var(--muted)' }}>
                  Your profile stays private until you send a request yourself.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CHECK INBOX (VERIFY) */}
        {currentKey === 'verify' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '560px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '34px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                Check your inbox
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                We sent a real-time six-digit code to <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{userEmail}</strong>. It expires in ten minutes.
              </p>
            </div>

            {/* Real-time Code Banner */}
            {realtimeOtpCode && (
              <div style={{ border: '1px solid #5B4FE9', borderRadius: '12px', background: 'rgba(91,79,233,0.14)', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: '#8B84FF' }}>REAL-TIME 6-DIGIT CODE</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '6px', color: '#FFFFFF', marginTop: '2px' }}>{realtimeOtpCode}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpDigits(realtimeOtpCode.split(''))}
                  style={{ border: 'none', borderRadius: '8px', background: '#5B4FE9', color: '#FFF', fontWeight: 600, fontSize: '13px', padding: '8px 14px', cursor: 'pointer' }}
                >
                  Auto-fill Code
                </button>
              </div>
            )}

            {otpError && (
              <div style={{ border: '1px solid #EF4444', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', padding: '12px 16px', color: '#F87171', fontSize: '14px', marginBottom: '20px' }}>
                {otpError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '26px' }}>
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <input
                  key={idx}
                  id={`ob-otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={otpDigits[idx]}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newDigits = [...otpDigits];
                    newDigits[idx] = val;
                    setOtpDigits(newDigits);
                    if (val && idx < 5) {
                      const nextEl = document.getElementById(`ob-otp-${idx + 1}`);
                      if (nextEl) nextEl.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                      const prevEl = document.getElementById(`ob-otp-${idx - 1}`);
                      if (prevEl) prevEl.focus();
                    }
                  }}
                  style={{
                    width: '58px',
                    height: '68px',
                    border: `1px solid ${otpDigits[idx] ? 'var(--ind)' : 'var(--line)'}`,
                    borderRadius: '12px',
                    background: 'var(--card)',
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px', color: 'var(--muted)' }}>
              <span onClick={handleSendRealtimeOtp} style={{ color: 'var(--ind-lt)', cursor: 'pointer', fontWeight: 600 }}>
                {isSendingOtp ? 'Sending...' : 'Resend code'}
              </span>
              <span>·</span>
              <span onClick={() => setStepIdx(1)} style={{ cursor: 'pointer' }}>Use a different email</span>
            </div>
          </div>
        )}

        {currentKey === 'college' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '620px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '30px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>Select your college</h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>Choose your college or enter its full name if it is not listed.</p>
            </div>
            <CollegeAutocomplete value={collegeSelection} onChange={updateCollegeSelection} error={collegeError ? 'Please enter your college name.' : undefined} />
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>Curated Indian college listings; the dataset is not exhaustive.</div>
          </div>
        )}

        {/* STUDENT STEP: COURSE */}
        {currentKey === 'course' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '620px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                What are you studying?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                This is how we find alumni who sat in your seat.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '26px', maxWidth: '720px' }}>
              <div>
                <CollegeAutocomplete value={collegeSelection} onChange={updateCollegeSelection} error={collegeError ? 'Please enter your college name.' : undefined} />
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>Curated Indian college listings; the dataset is not exhaustive.</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>Course</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Computer Science', 'Electronics', 'Mechanical', 'Business', 'Design', 'Other'].map((c) => {
                    const on = selectedCourse === c;
                    return (
                      <span
                        key={c}
                        onClick={() => setSelectedCourse(c)}
                        className="ob-chip"
                        style={{
                          fontSize: '14.5px',
                          padding: '11px 18px',
                          borderRadius: '100px',
                          border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                          background: on ? 'var(--tint)' : 'transparent',
                          color: on ? 'var(--text)' : 'var(--muted2)',
                          cursor: 'pointer',
                        }}
                      >
                        {c}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>Graduating in</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['2026', '2027', '2028', '2029'].map((y) => {
                    const on = selectedYear === y;
                    return (
                      <span
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className="ob-chip"
                        style={{
                          fontSize: '14.5px',
                          padding: '11px 18px',
                          borderRadius: '100px',
                          border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                          background: on ? 'var(--tint)' : 'transparent',
                          color: on ? 'var(--text)' : 'var(--muted2)',
                          cursor: 'pointer',
                        }}
                      >
                        {y}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>Current Semester</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map((s) => {
                    const on = selectedSem === s;
                    return (
                      <span
                        key={s}
                        onClick={() => setSelectedSem(s)}
                        className="ob-chip"
                        style={{
                          fontSize: '14.5px',
                          padding: '11px 18px',
                          borderRadius: '100px',
                          border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                          background: on ? 'var(--tint)' : 'transparent',
                          color: on ? 'var(--text)' : 'var(--muted2)',
                          cursor: 'pointer',
                        }}
                      >
                        Sem {s}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT STEP: GOAL */}
        {currentKey === 'goal' && (
          <div className="ob-step" style={{ display: 'block', animation: 'ob-in .4s ease' }}>
            <div style={{ maxWidth: '620px', marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                Where do you want to land?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                Pick the closest one. You can change it any time, and the roadmap rebuilds itself.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', maxWidth: '900px' }}>
              {[
                { id: 'Software engineering', sub: '412 mentors · 89 open roles', icon: 'M7 8 l-4 4 4 4 M17 8 l4 4 -4 4 M14 5 l-4 14' },
                { id: 'Data & analytics', sub: '263 mentors · 51 open roles', icon: 'M4 19 V9 M10 19 V5 M16 19 v-7 M22 19 H2' },
                { id: 'Product management', sub: '188 mentors · 34 open roles', icon: 'M8 21 h8 M12 17 v4' },
                { id: 'Design', sub: '146 mentors · 22 open roles', icon: 'M9 15 l6 -6 M15 9 v4 M15 9 h-4' },
                { id: 'Finance', sub: '204 mentors · 40 open roles', icon: 'M12 3 v18 M8 7 h6 a2.5 2.5 0 010 5 h-4 a2.5 2.5 0 000 5 h6' },
                { id: 'Still deciding', sub: 'We will show you three paths', icon: 'M12 4 v6 l5 3' },
              ].map((g) => {
                const on = selectedGoal === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className="ob-pick"
                    style={{
                      border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                      borderRadius: '14px',
                      background: on ? 'var(--tint)' : 'var(--card)',
                      padding: '22px 22px 24px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--ind-lt)', strokeWidth: 1.7, marginBottom: '22px' }}>
                      <path d={g.icon} />
                    </svg>
                    <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '5px' }}>{g.id}</div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)' }}>{g.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STUDENT STEP: SKILLS */}
        {currentKey === 'skills' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '760px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                Be honest about where you are
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                Nobody sees this but you. It sets the starting point of your roadmap.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { key: 'dsa', title: 'Data structures & algorithms' },
                { key: 'sys_design', title: 'System design' },
                { key: 'interviews', title: 'Interviews & communication' },
                { key: 'portfolio', title: 'Portfolio & projects' },
              ].map((sk) => {
                const cur = skillLevels[sk.key] || 1;
                return (
                  <div
                    key={sk.key}
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: '14px',
                      background: 'var(--card)',
                      padding: '20px 24px',
                      display: 'grid',
                      gridTemplateColumns: '1fr max-content',
                      gap: '20px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '3px' }}>{sk.title}</div>
                      <div style={{ fontSize: '13.5px', color: 'var(--muted)' }}>{SKILL_LABELS[cur]}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '7px' }}>
                      {[1, 2, 3, 4].map((lv) => (
                        <span
                          key={lv}
                          onClick={() => setSkillLevels((p) => ({ ...p, [sk.key]: lv }))}
                          style={{
                            width: '30px',
                            height: '8px',
                            borderRadius: '4px',
                            background: lv <= cur ? 'var(--ind)' : 'var(--line2)',
                            cursor: 'pointer',
                            transition: 'background .2s ease',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STUDENT STEP: RESUME */}
        {currentKey === 'resume' && (
          <div className="ob-step" style={{ display: 'block', animation: 'ob-in .4s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, .85fr)', gap: '56px', alignItems: 'start' }}>
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                    Add your resume
                  </h1>
                  <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                    Optional, but it gives Agent K something concrete to work with. PDF or DOCX.
                  </p>
                </div>
                {!resumeUploaded ? (
                  <div
                    id="ob-drop"
                    onClick={handleResumeDrop}
                  role="button"
                  tabIndex={0}
                  aria-label="Choose a resume file"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleResumeDrop();
                    }
                  }}
                  style={{
                      border: '1px dashed var(--dot)',
                      borderRadius: '16px',
                      background: 'var(--card)',
                      padding: '44px 32px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all .25s ease',
                    }}
                  >
                    <svg width="34" height="34" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--ind-lt)', strokeWidth: 1.5, marginBottom: '18px' }}>
                      <path d="M12 16 V5 M8 9 l4 -4 4 4" />
                      <path d="M4 15 v3 a2 2 0 002 2 h12 a2 2 0 002 -2 v-3" />
                    </svg>
                    <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Choose your resume</div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>or browse your files</div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--card)', padding: '18px 20px', marginTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--ind-lt)', strokeWidth: 1.6, flex: 'none' }}>
                        <path d="M6 3.5 h8 l4 4 v13 h-12 Z M14 3.5 v4 h4" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div data-testid="onboarding-resume-name" style={{ fontSize: '15px', fontWeight: 600, overflowWrap: 'anywhere' }}>{resumeFile?.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                          {resumeFile ? `${(resumeFile.size / 1024).toFixed(1)} KB · Ready to upload` : ''}
                        </div>
                      </div>
                      <button type="button" onClick={handleResumeDrop} style={{ fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', border: 0, background: 'transparent', font: 'inherit' }}>Replace</button>
                    </div>
                  </div>
                )}
                {resumeError && <div role="alert" style={{ color: '#F87171', fontSize: '13px', marginTop: '12px' }}>{resumeError}</div>}
                <div style={{ fontSize: '13.5px', color: 'var(--muted)', marginTop: '16px' }}>
                  You can skip this and add it later from your dashboard.
                </div>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--card)', padding: '26px 28px 28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--ind-lt)', marginBottom: '22px' }}>
                  RESUME STATUS
                </div>
                {resumeUploaded ? (
                  <div data-testid="onboarding-resume-status" style={{ color: 'var(--ind-lt)' }}>
                    {resumeATSLoading ? (
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Calculating ATS score…</div>
                    ) : resumeATS ? (
                      <>
                        <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '4px' }}>ATS score</div>
                        <div style={{ fontSize: '30px', fontWeight: 800 }}>{resumeATS.score}/100</div>
                      </>
                    ) : (
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                        {resumeFile?.name.toLowerCase().endsWith('.doc')
                          ? 'ATS scoring supports PDF and DOCX. Your resume will still upload after account creation.'
                          : 'ATS score is unavailable. Your resume will still upload after account creation.'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted)' }}>
                    Choose a PDF or DOCX to calculate an ATS score. DOC files can still be uploaded.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP: PHOTO CAPTURE / AVATAR UPLOAD (NEW SPEC) */}
        {currentKey === 'photo' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '720px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--ind-lt)', marginBottom: '14px' }}>
                DIGITAL IDENTITY PORTRAIT
              </div>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                Add your profile picture
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                This photo appears directly on your official Student Alumni Digital ID Card and verified mentor requests.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '36px', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '20px', padding: '36px' }}>
              {/* Photo Display Preview */}
              <div style={{ position: 'relative' }}>
                <div
                  data-testid="onboarding-photo-preview"
                  style={{
                    width: '128px',
                    height: '128px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--ind), #2FB8C6)',
                    border: '3px solid var(--ind-lt)',
                    boxShadow: '0 10px 30px rgba(91,79,233,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {avatarUri && <img src={avatarUri} alt="Selected profile photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  {!avatarUri && (
                    <span style={{ fontSize: '42px', color: '#FFFFFF', fontWeight: 800 }}>
                      {capitalizeName(userName || userEmail.split('@')[0] || 'Student').split(' ').map((part) => part[0] || '').slice(0, 2).join('').toUpperCase()}
                    </span>
                  )}
                </div>
                {avatarUri && (
                  <button
                    type="button"
                    aria-label="Remove selected profile photo"
                    onClick={() => { setAvatarUri(null); setPhotoError(''); setProfilePhotoSaved(false); }}
                    style={{
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#EF4444',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="ob-ghost"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    fontSize: '15px',
                    fontWeight: 500,
                    padding: '13px 24px',
                    borderRadius: '10px',
                    border: '1px solid var(--dot)',
                    color: 'var(--text)',
                    background: 'transparent',
                    cursor: 'pointer',
                    transition: 'all .2s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload from device
                </button>
                {photoError && <div role="alert" style={{ color: '#F87171', fontSize: '13px' }}>{photoError}</div>}

                <span
                  onClick={nextStep}
                  style={{
                    fontSize: '13.5px',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    marginTop: '4px',
                    textAlign: 'center',
                  }}
                >
                  Skip for now →
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT STEP: INTERESTS */}
        {currentKey === 'interests' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '820px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                What should we surface?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                Pick three or more. This filters your events feed and opportunity matches.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['Backend', 'Machine learning', 'Frontend', 'Cloud & infra', 'Hackathons', 'Research', 'Startups', 'Open source', 'Higher study', 'Product', 'Analytics', 'Public speaking'].map((tag) => {
                const on = interests.includes(tag);
                return (
                  <span
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className="ob-chip"
                    style={{
                      fontSize: '14.5px',
                      padding: '12px 20px',
                      borderRadius: '100px',
                      border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                      background: on ? 'var(--tint)' : 'transparent',
                      color: on ? 'var(--text)' : 'var(--muted2)',
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: '13.5px', color: interests.length >= 3 ? 'var(--ind-lt)' : 'var(--muted)', marginTop: '24px', fontWeight: 600 }}>
              {interests.length} selected
            </div>
          </div>
        )}

        {/* STUDENT STEP: MENTOR PREFERENCES */}
        {currentKey === 'mentorpref' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '760px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                How do you want to be mentored?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                We only propose mentors who work the same way.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '26px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>Format</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Video calls', 'Chat only', 'Either'].map((f) => {
                    const on = mentorFmt === f;
                    return (
                      <span
                        key={f}
                        onClick={() => setMentorFmt(f)}
                        className="ob-chip"
                        style={{
                          fontSize: '14.5px',
                          padding: '11px 18px',
                          borderRadius: '100px',
                          border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                          background: on ? 'var(--tint)' : 'transparent',
                          color: on ? 'var(--text)' : 'var(--muted2)',
                          cursor: 'pointer',
                        }}
                      >
                        {f}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>How often</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Weekly', 'Twice a month', 'Monthly', 'When I need it'].map((fr) => {
                    const on = mentorFreq === fr;
                    return (
                      <span
                        key={fr}
                        onClick={() => setMentorFreq(fr)}
                        className="ob-chip"
                        style={{
                          fontSize: '14.5px',
                          padding: '11px 18px',
                          borderRadius: '100px',
                          border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                          background: on ? 'var(--tint)' : 'transparent',
                          color: on ? 'var(--text)' : 'var(--muted2)',
                          cursor: 'pointer',
                        }}
                      >
                        {fr}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>I would rather be matched with</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Someone from my college', 'Someone at my target company', 'No preference'].map((w) => {
                    const on = mentorWho === w;
                    return (
                      <span
                        key={w}
                        onClick={() => setMentorWho(w)}
                        className="ob-chip"
                        style={{
                          fontSize: '14.5px',
                          padding: '11px 18px',
                          borderRadius: '100px',
                          border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                          background: on ? 'var(--tint)' : 'transparent',
                          color: on ? 'var(--text)' : 'var(--muted2)',
                          cursor: 'pointer',
                        }}
                      >
                        {w}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFY TOGGLES (ALL FLOWS) */}
        {currentKey === 'notify' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '680px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                When should we interrupt you?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                Defaults are deliberately quiet. Change any of it later.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { key: 'reply', title: 'A mentor replies', sub: 'Email and in-app' },
                { key: 'opp', title: 'An opportunity matches my roadmap', sub: 'At most one digest a week' },
                { key: 'events', title: 'Campus events near me', sub: 'Fairs, panels and alumni AMAs' },
                { key: 'news', title: 'Product news', sub: 'Monthly, and genuinely monthly' },
              ].map((n) => {
                const on = notifs[n.key];
                return (
                  <div
                    key={n.key}
                    onClick={() => setNotifs((p) => ({ ...p, [n.key]: !p[n.key] }))}
                    className="ob-toggle-row"
                    style={{
                      border: '1px solid var(--line)',
                      borderRadius: '14px',
                      background: 'var(--card)',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '20px',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '3px' }}>{n.title}</div>
                      <div style={{ fontSize: '13.5px', color: 'var(--muted)' }}>{n.sub}</div>
                    </div>
                    <span
                      style={{
                        width: '46px',
                        height: '26px',
                        borderRadius: '100px',
                        background: on ? 'var(--ind)' : 'var(--line2)',
                        position: 'relative',
                        flex: 'none',
                        transition: 'background .25s ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '3px',
                          left: on ? '23px' : '3px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          transition: 'left .25s cubic-bezier(.2,.8,.2,1)',
                        }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STUDENT STEP: ROADMAP */}
        {currentKey === 'roadmap' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '1000px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '40px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--ind-lt)', marginBottom: '14px' }}>
                BUILT FROM YOUR ANSWERS
              </div>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                Here is your roadmap
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                {selectedGoal}, graduating {selectedYear}, starting from system design.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: '20px', position: 'relative', borderTop: '2px solid var(--ind)', paddingTop: '32px' }}>
              {(() => {
                const currentNum = parseInt(selectedSem) || 5;
                const roadmap = [];

                roadmap.push({
                  sem: `NOW · SEM ${currentNum}`,
                  title: `${selectedCourse} basics`,
                  sub: 'Two mentor sessions and one guided project.'
                });

                if (currentNum < 6) {
                  roadmap.push({
                    sem: `SEM ${currentNum + 1}`,
                    title: 'Portfolio project',
                    sub: 'The one that matches your open roles.'
                  });
                } else if (currentNum === 6) {
                  roadmap.push({
                    sem: 'SUMMER',
                    title: 'Hackathon prep',
                    sub: 'Build a project to showcase.'
                  });
                }

                if (currentNum <= 7) {
                  roadmap.push({
                    sem: 'SEM 7',
                    title: 'Internship',
                    sub: `Referral route through two ${instName || 'alumni'}.`
                  });
                }

                if (currentNum <= 8) {
                  roadmap.push({
                    sem: 'SEM 8',
                    title: 'First offer',
                    sub: 'Interview prep, then negotiation prompts.'
                  });
                }
                return roadmap;
              })().map((m, idx) => (
                <div key={idx} className="ob-rstep" style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '-41px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--ind)',
                      border: '3px solid #05060F',
                      boxShadow: '0 0 10px rgba(91,79,233,0.8)',
                    }}
                  />
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginBottom: '7px' }}>{m.sem}</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{m.title}</div>
                  <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted)' }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STUDENT STEP: MENTORS */}
        {currentKey === 'mentors' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '1000px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                Three mentors to start with
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                All three have capacity this month. Following is not a request — you reach out when you are ready.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px' }}>
              {[
                { id: 'priya', name: 'Priya Raman', role: "Product · Bengaluru · MRIT '21", fit: '98% FIT', desc: 'Same course, four years ahead. Mentors three students each term.', grad: 'linear-gradient(135deg, var(--ind), #3AC4D6)' },
                { id: 'arjun', name: 'Arjun Mehta', role: "Systems · Pune · MRIT '20", fit: '92% FIT', desc: 'Runs the system design sessions your first step needs.', grad: 'linear-gradient(135deg, #4F46C7, var(--ind-lt))' },
                { id: 'neha', name: 'Neha Sethi', role: "Engineering · Remote · MRIT '19", fit: '88% FIT', desc: 'Reviews portfolios monthly and hires interns herself.', grad: 'linear-gradient(135deg, #3AC4D6, #4F46C7)' },
              ].map((m) => {
                const isFollowing = followedMentors[m.id];
                return (
                  <div key={m.id} className="ob-mentor" style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--card)', padding: '26px 24px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <span style={{ width: '46px', height: '46px', borderRadius: '50%', background: m.grad, display: 'block' }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: 'var(--ind-lt)', background: 'var(--tint)', borderRadius: '8px', padding: '6px 10px' }}>
                        {m.fit}
                      </span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{m.name}</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--muted)', marginBottom: '14px' }}>{m.role}</div>
                    <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted2)', marginBottom: '20px' }}>{m.desc}</div>
                    <span
                      onClick={() => setFollowedMentors((p) => ({ ...p, [m.id]: !p[m.id] }))}
                      className="ob-follow"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: 600,
                        padding: '11px',
                        borderRadius: '8px',
                        border: `1px solid ${isFollowing ? 'var(--ind)' : 'var(--dot)'}`,
                        background: isFollowing ? 'var(--tint)' : 'transparent',
                        color: isFollowing ? 'var(--ind-lt)' : 'var(--text)',
                        cursor: 'pointer',
                        transition: 'all .2s ease',
                      }}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ALUMNUS STEP: ROLE */}
        {currentKey === 'role' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '620px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                Where do you work now?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                Students search by company and role, so this is what makes you findable.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '22px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Company</div>
                <input
                  type="text"
                  value={alumCompany}
                  onChange={(e) => setAlumCompany(e.target.value)}
                  placeholder="e.g. Google, Deloitte, Microsoft"
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Role</div>
                <input
                  type="text"
                  value={alumRole}
                  onChange={(e) => setAlumRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Senior Consultant"
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: 'var(--text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Graduated from</div>
                <div style={{ border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{instName || 'College'} · Class of {selectedYear}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ind-lt)' }}>VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALUMNUS STEP: CAPACITY */}
        {currentKey === 'capacity' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '620px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: '0 0 12px' }}>
                Set your capacity
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: 0 }}>
                Nothing is ever proposed beyond this. You can drop it to zero any week.
              </p>
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--card)', padding: '32px 34px 34px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '26px' }}>
                <span id="ob-cap" style={{ fontSize: '46px', fontWeight: 800, letterSpacing: '-2px' }}>{alumCap}</span>
                <span style={{ fontSize: '16px', color: 'var(--muted)' }}>sessions a month</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                {['1', '2', '4', 'Written only'].map((c) => {
                  const on = alumCap === c;
                  return (
                    <span
                      key={c}
                      onClick={() => setAlumCap(c)}
                      className="ob-cap-opt"
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '15px',
                        fontWeight: 600,
                        padding: '13px',
                        borderRadius: '10px',
                        border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                        background: on ? 'var(--tint)' : 'transparent',
                        color: on ? 'var(--text)' : 'var(--muted2)',
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </span>
                  );
                })}
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
                At {alumCap} a month you would reach roughly <strong style={{ color: 'var(--ind-lt)', fontWeight: 600 }}>24 students a year</strong>, and your college sees the hours logged against its placement record.
              </div>
            </div>
          </div>
        )}

        {/* ALUMNUS STEP: EXPERTISE */}
        {currentKey === 'expertise' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '820px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                What can you help with?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                Only these topics will be routed to you.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['Resume review', 'Interview prep', 'Referrals', 'Career switching', 'Higher study', 'Negotiation', 'Portfolio', 'Startups'].map((tag) => {
                const on = alumExpertise.includes(tag);
                return (
                  <span
                    key={tag}
                    onClick={() => toggleExpertise(tag)}
                    className="ob-chip"
                    style={{
                      fontSize: '14.5px',
                      padding: '12px 20px',
                      borderRadius: '100px',
                      border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                      background: on ? 'var(--tint)' : 'transparent',
                      color: on ? 'var(--text)' : 'var(--muted2)',
                      cursor: 'pointer',
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* COLLEGE STEP: INSTITUTION */}
        {currentKey === 'institution' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '620px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                Tell us about the institution
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                We use this to scope your dashboard and reporting.
              </p>
            </div>
            <div style={{ display: 'grid', gap: '22px' }}>
              <CollegeAutocomplete value={collegeSelection} onChange={updateCollegeSelection} error={collegeError ? 'Please enter your college name.' : undefined} />
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>Your role</div>
                <input
                  type="text"
                  value={instRole}
                  onChange={(e) => setInstRole(e.target.value)}
                  placeholder="e.g. Head of Career Services"
                  style={{ border: '1px solid var(--line)', borderRadius: '10px', background: 'var(--card)', padding: '14px 15px', fontSize: '15px', color: 'var(--text)', width: '100%', outline: 'none' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>Students per graduating cohort</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['Under 500', '500–2,000', '2,000+'].map((sz) => {
                    const on = instSize === sz;
                    return (
                      <span
                        key={sz}
                        onClick={() => setInstSize(sz)}
                        className="ob-chip"
                        style={{
                          fontSize: '14.5px',
                          padding: '11px 18px',
                          borderRadius: '100px',
                          border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                          background: on ? 'var(--tint)' : 'transparent',
                          color: on ? 'var(--text)' : 'var(--muted2)',
                          cursor: 'pointer',
                        }}
                      >
                        {sz}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COLLEGE STEP: DEPARTMENTS */}
        {currentKey === 'departments' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '860px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                Which departments first?
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                Start with one or two. Reporting is split by department from day one.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
              {[
                { name: 'Computer Science', sub: '640 students · 210 alumni on the network' },
                { name: 'Electronics', sub: '410 students · 96 alumni' },
                { name: 'Business', sub: '380 students · 142 alumni' },
                { name: 'Mechanical', sub: '295 students · 61 alumni' },
                { name: 'Design', sub: '120 students · 38 alumni' },
                { name: 'All departments', sub: '1,845 students · 547 alumni' },
              ].map((d) => {
                const on = collegeDepts.includes(d.name);
                return (
                  <div
                    key={d.name}
                    onClick={() => toggleDept(d.name)}
                    className="ob-pick"
                    style={{
                      border: `1px solid ${on ? 'var(--ind)' : 'var(--line)'}`,
                      borderRadius: '14px',
                      background: on ? 'var(--tint)' : 'var(--card)',
                      padding: '22px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '16.5px', fontWeight: 700, marginBottom: '4px' }}>{d.name}</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--muted)' }}>{d.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COLLEGE STEP: INVITE COHORT */}
        {currentKey === 'invite' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '940px', animation: 'ob-in .4s ease' }}>
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                Invite your first cohort
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                Paste a list, or send us a CSV. Students verify with their college address.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, .8fr)', gap: '24px', alignItems: 'start' }}>
              <div style={{ border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--card)', padding: '20px 22px' }}>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>Email addresses</div>
                <div style={{ fontSize: '14.5px', lineHeight: 2, color: 'var(--muted2)' }}>
                  aisha.k@mrit.edu<br />rohan.m@mrit.edu<br />ira.s@mrit.edu<br />
                  <span style={{ color: 'var(--muted)' }}>…and 637 more from the CS list</span>
                </div>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--card)', padding: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--ind-lt)', marginBottom: '18px' }}>
                  READY TO SEND
                </div>
                <div style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1.8px' }}>640</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '8px', marginBottom: '20px' }}>
                  invitations, CS &amp; Business
                </div>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)', paddingTop: '18px', borderTop: '1px solid var(--line)' }}>
                  Nothing sends until you confirm on the next screen.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERKS (ALL FLOWS) */}
        {currentKey === 'perks' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '1020px', animation: 'ob-in .4s ease' }}>
            <div style={{ maxWidth: '640px', marginBottom: '36px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--ind-lt)', marginBottom: '14px' }}>
                UNLOCKED BY YOUR COLLEGE EMAIL
              </div>
              <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                Your perks are live
              </h1>
              <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                Claim now or later — codes sit in your dashboard and never expire silently.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px' }}>
              {[
                { title: 'Mentor sessions', sub: 'Any paid one-to-one, first three bookings.', code: 'MRIT-MENTOR-40', off: '40%', offSub: 'off first term' },
                { title: 'Resume Pro', sub: 'Unlimited ATS rewrites and role-matched keywords.', code: 'SA-RESUME-6M', off: '₹0', offSub: 'for 6 months' },
                { title: 'Partner workshops', sub: 'Any paid workshop from a partner company this term.', code: 'SA-WORKSHOP-2X', off: '2', offSub: 'free passes' },
              ].map((p) => (
                <div
                  key={p.code}
                  className="ob-perk"
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid var(--line)',
                    borderRadius: '16px',
                    background: 'var(--card)',
                    padding: '26px 24px 24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-2px', background: 'linear-gradient(100deg, var(--ind), #2FB8C6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {p.off}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{p.offSub}</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '5px' }}>{p.title}</div>
                  <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)', marginBottom: '20px' }}>{p.sub}</div>
                  <div
                    onClick={() => copyCouponCode(p.code)}
                    className="ob-coupon"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      border: '1px dashed var(--dot)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13.5px', letterSpacing: '.6px' }}>{p.code}</span>
                    <span className="ob-coupon-cta" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ind-lt)' }}>
                      {copiedCoupon === p.code ? 'COPIED' : 'COPY'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '26px', fontSize: '13.5px', color: 'var(--muted)' }}>
              <svg width="15" height="15" viewBox="0 0 20 20" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }}>
                <circle cx="10" cy="10" r="8" />
                <path d="M10 6.5 v.01 M10 9 v4.5" />
              </svg>
              Referral bonus: each friend who verifies adds one more workshop pass.
            </div>
          </div>
        )}

        {/* 3D DIGITAL SA CARD (STUDENT & ALUMNUS) */}
        {currentKey === 'card' && (
          <div className="ob-step" style={{ display: 'block', animation: 'ob-in .4s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .95fr) minmax(0, 1fr)', gap: '60px', alignItems: 'center' }}>
              <div>
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.6px', color: 'var(--ind-lt)', marginBottom: '14px' }}>
                    YOUR SA IDENTITY
                  </div>
                  <h1 style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1.12, letterSpacing: -1.5, margin: 0 }}>
                    Your digital card is issued
                  </h1>
                  <p style={{ fontSize: '16.5px', lineHeight: 1.65, color: 'var(--muted2)', margin: '12px 0 0' }}>
                    Generated from your verified profile. Show it at campus events, use the SA ID when applying through the network.
                  </p>
                </div>
                <div style={{ display: 'grid', gap: '12px', maxWidth: '420px', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '13.5px', color: 'var(--muted)' }}>SA ID</span>
                    <span id="ob-said" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '14px', fontWeight: 600 }}>
                      {generatedSaId || 'Generating...'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '13.5px', color: 'var(--muted)' }}>Status</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ind-lt)' }}>
                      {flow === 'alumnus' ? (alumRole ? `Verified ${alumRole}` : 'Verified Mentor') : 'Verified Student'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0' }}>
                    <span style={{ fontSize: '13.5px', color: 'var(--muted)' }}>Valid until</span>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>June {flow === 'alumnus' ? '2030' : selectedYear}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    id="ob-flip"
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                    className="ob-ghost"
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 500,
                      padding: '13px 22px',
                      borderRadius: '10px',
                      border: '1px solid var(--dot)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {isCardFlipped ? 'Show front' : 'Flip card'}
                  </span>
                  <span className="ob-ghost" style={{ fontSize: '14.5px', fontWeight: 500, padding: '13px 22px', borderRadius: '10px', border: '1px solid var(--dot)', color: 'var(--text)', cursor: 'pointer' }}>
                    Add to wallet
                  </span>
                  <span className="ob-ghost" style={{ fontSize: '14.5px', fontWeight: 500, padding: '13px 22px', borderRadius: '10px', border: '1px solid var(--dot)', color: 'var(--text)', cursor: 'pointer' }}>
                    Download PNG
                  </span>
                </div>
              </div>

              {/* 3D Card Visual with Live Avatar */}
              <div style={{ perspective: '1400px' }}>
                <div id="ob-cardwrap" style={{ width: '100%', maxWidth: '460px', animation: 'ob-cardfloat 9s ease-in-out infinite' }}>
                  <div
                    id="ob-card"
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1.6 / 1',
                      transformStyle: 'preserve-3d',
                      transition: 'transform .8s cubic-bezier(.4,0,.2,1)',
                      transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Front Face */}
                    <div
                      id="ob-card-front"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '20px',
                        overflow: 'hidden',
                        background: '#4B3FD6',
                        boxShadow: '0 30px 70px rgba(0,0,0,.45)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(128deg, #5B4FE9 0%, #3F7FE8 48%, #2FB8C6 78%, #34D3A6 100%)' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 34px), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 34px)' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(158deg, rgba(255,255,255,.14) 0%, rgba(0,0,0,0) 42%, rgba(0,0,0,.22) 100%)' }} />
                      <span className="ob-sheen" style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '34%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.24), transparent)' }} />
                      <div style={{ position: 'relative', height: '100%', padding: '26px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFFFFF', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <svg width="24" height="28" viewBox="0 0 300 350">
                              <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="rgba(255,255,255,.22)" stroke="#FFFFFF" strokeWidth="12" />
                              <text x="150" y="214" textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '122px', fontWeight: 800, letterSpacing: '-6px', fill: '#FFFFFF' }}>SA</text>
                            </svg>
                            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.4px' }}>STUDENTALUMNI</span>
                          </div>

                          {/* Live Avatar Preview or Verified Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {avatarUri && (
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: `url(${avatarUri}) center/cover no-repeat`,
                                  border: '1.5px solid #FFFFFF',
                                }}
                              />
                            )}
                            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.4px', background: 'rgba(255,255,255,.18)', borderRadius: '100px', padding: '6px 11px' }}>VERIFIED</span>
                          </div>
                        </div>
                        <div>
                          <div id="ob-card-name" style={{ fontSize: '27px', fontWeight: 700, letterSpacing: '-1px', marginBottom: '4px' }}>
                            {capitalizeName(userName || userEmail.split('@')[0] || 'Student')}
                          </div>
                          <div id="ob-card-sub" style={{ fontSize: '13.5px', opacity: 0.82 }}>
                            {flow === 'alumnus' ? `${alumRole || 'Professional'}, ${alumCompany || 'Company'} · Class of ${selectedYear}` : `${selectedCourse} · Class of ${selectedYear}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '1.6px', opacity: 0.7, marginBottom: '5px' }}>SA ID</div>
                            <div id="ob-card-id" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '15px', fontWeight: 600, letterSpacing: '.5px' }}>
                              {generatedSaId || 'Generating...'}
                            </div>
                          </div>
                          <div style={{ width: '46px', height: '46px', borderRadius: '6px', background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '18px' }}>
                            SA
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back Face */}
                    <div
                      id="ob-card-back"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        visibility: isCardFlipped ? 'visible' : 'hidden',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        background: 'linear-gradient(160deg, #16143A, #0B0C1C)',
                        border: '1px solid rgba(255,255,255,.14)',
                        boxShadow: '0 30px 70px rgba(0,0,0,.45)',
                      }}
                    >
                      <svg viewBox="0 0 300 350" style={{ position: 'absolute', right: '-34px', bottom: '-46px', width: '240px', opacity: 0.07 }}>
                        <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#FFFFFF" />
                      </svg>
                      <div style={{ height: '44px', background: 'rgba(255,255,255,.10)', marginTop: '26px' }} />
                      <div style={{ padding: '22px 28px', color: '#FFFFFF' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', opacity: 0.62, marginBottom: '14px' }}>
                          ISSUED BY STUDENTALUMNI
                        </div>
                        <div style={{ fontSize: '13.5px', lineHeight: 1.6, opacity: 0.85, marginBottom: '18px' }}>
                          This card confirms a verified college affiliation. It carries no payment function and expires with the holder's graduation year.
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'ui-monospace, monospace', fontSize: '12px', opacity: 0.75 }}>
                          <span>studentalumni.ai/verify</span>
                          <span id="ob-card-back-id">{generatedSaId || 'Generating...'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP: DONE (ALL FLOWS) */}
        {currentKey === 'done' && (
          <div className="ob-step" style={{ display: 'block', maxWidth: '620px', animation: 'ob-in .4s ease' }}>
            {otpError && (
              <div role="alert" style={{ border: '1px solid #EF4444', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', padding: '12px 16px', color: '#F87171', fontSize: '14px', marginBottom: '20px' }}>
                {otpError}
              </div>
            )}
            <div style={{ position: 'relative', width: '76px', height: '76px', marginBottom: '34px' }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid var(--ind)', animation: 'ob-ring 2.6s ease-out infinite' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid var(--ind)', animation: 'ob-ring 2.6s ease-out infinite 1.3s' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--ind), #2FB8C6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>

              </span>
            </div>
            <h1 style={{ fontSize: '42px', fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.7, margin: '0 0 14px' }}>
              You are set up
            </h1>
            <p id="ob-done-sub" style={{ fontSize: '17px', lineHeight: 1.65, color: 'var(--muted2)', margin: '0 0 36px' }}>
              {flow === 'student'
                ? 'Your roadmap is live, three mentors are following you back, and your first suggested action is waiting on the dashboard.'
                : flow === 'alumnus'
                ? 'You are listed as a mentor with two sessions a month. Matching requests will arrive with an agenda attached.'
                : 'Your dashboard is ready. Confirm the 640 invitations and placement reporting starts from the first accepted student.'}
            </p>
            <div style={{ display: 'grid', gap: '12px', maxWidth: '560px', marginBottom: '36px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content', gap: '16px', alignItems: 'center', border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--card)', padding: '18px 20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ind-lt)' }}>01</span>
                <div style={{ fontSize: '15px' }}>Refine your resume for the SWE referral drop</div>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>4 min</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content', gap: '16px', alignItems: 'center', border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--card)', padding: '18px 20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ind-lt)' }}>02</span>
                <div style={{ fontSize: '15px' }}>Book your first system design session</div>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>2 min</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="ob-cta"
                disabled={isFinishing}
                style={{ fontSize: '15px', fontWeight: 600, padding: '15px 26px', borderRadius: '10px', border: 0, background: 'var(--ind)', color: '#FFFFFF', cursor: isFinishing ? 'wait' : 'pointer', opacity: isFinishing ? 0.7 : 1, transition: 'background .2s ease' }}
              >
                {isFinishing ? 'Opening dashboard...' : 'Continue to dashboard →'}
              </button>
              <span
                id="ob-restart"
                onClick={() => setStepIdx(0)}
                className="ob-ghost"
                style={{ fontSize: '15px', fontWeight: 500, padding: '15px 24px', borderRadius: '10px', border: '1px solid var(--dot)', color: 'var(--text)', cursor: 'pointer', transition: 'all .2s ease' }}
              >
                Run it again
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Navigation Bar ── */}
      {currentKey !== 'done' && (
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--nav-bg)', backdropFilter: 'blur(14px)', borderTop: '1px solid var(--line)', zIndex: 20 }}>
          <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <button
              type="button"
              id="ob-back"
              onClick={prevStep}
              style={{
                fontSize: '14.5px',
                fontWeight: 500,
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '12px 0',
                border: 0,
                background: 'transparent',
                fontFamily: 'inherit',
              }}
            >
              Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {stepIdx > 0 && currentKey !== 'notify' && currentKey !== 'roadmap' && (
                <button
                  type="button"
                  id="ob-skip"
                  onClick={skipStep}
                  style={{ fontSize: '14px', color: 'var(--muted)', cursor: 'pointer', border: 0, background: 'transparent', fontFamily: 'inherit' }}
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                id="ob-next"
                onClick={nextStep}
                disabled={isNavigating}
                className="ob-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '9px',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '13px 26px',
                  borderRadius: '10px',
                  background: 'var(--ind)',
                  color: '#FFFFFF',
                  cursor: isNavigating ? 'wait' : 'pointer',
                  opacity: isNavigating ? 0.7 : 1,
                  transition: 'background .2s ease',
                  border: 0,
                  fontFamily: 'inherit',
                }}
              >
                {isNavigating ? 'Loading...' : (stepIdx === currentSeq.length - 2 ? 'Finish' : 'Continue')}
                {!isNavigating && (
                  <svg width="14" height="14" viewBox="0 0 16 16" style={{ fill: 'none', stroke: '#FFFFFF', strokeWidth: 1.9 }}>
                    <path d="M3 8 h10 M9 4 l4 4 -4 4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NativeOnboardingFallback({ router }: { router: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#05060F', padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 }}>
        StudentAlumni Onboarding
      </Text>
      <View
        onTouchEnd={() => router.replace('/student-portal/dashboard')}
        style={{ backgroundColor: '#5B4FE9', padding: 16, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Go to Dashboard</Text>
      </View>
    </View>
  );
}
