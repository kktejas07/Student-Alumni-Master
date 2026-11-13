// @ts-nocheck
/**
 * LoginScreen — 1:1 SA Auth System Implementation matching Student Alumni Auth.html
 * 
 * Features:
 *  - 2-Column Responsive Layout (Brand Showcase + Sign In Form)
 *  - 4-Slide Auto-playing Carousel (Career Readiness, Mentor Network, Referrals, Digital ID)
 *  - Real-time Account Detection (Shows password field when existing email is typed)
 *  - Demo Credentials Auto-filler (devender@snist.ac.in / hackwave2026)
 *  - Google OAuth & Email/Password Authentication
 *  - Role-aware redirect (student -> /student-portal/dashboard, mentor -> /mentor-portal, etc.)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import NativeLoginScreen from '@/src/views/auth/NativeLoginScreen';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Heart } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { getBaseUrl } from '@/src/lib/env';
import { api } from '@/src/models/services/api';
import { initFirebaseAuth, signInWithGoogle, isFirebaseWebConfigComplete } from '@/src/lib/firebaseAuth';
import { friendlyNetworkError } from '@/src/lib/networkErrors';

const BASE = getBaseUrl();

const REGISTERED_EMAILS = [
  'vallabhneelkant12@gmail.com',
  'devender@snist.ac.in',
  'aisha@iitb.ac.in',
  'arjun@vnrvjiet.in',
  'demo@studentalumni.ai',
  'student@snist.ac.in',
  'admin@careerpath.app',
];

const SLIDES = [
  {
    tag: 'CAREER READINESS',
    tagColor: '#8B84FF',
    title: 'From first year to first offer.',
    desc: 'Agent K builds the roadmap, tracks the gap and tells you what to do this week.',
    badge: '92%',
    badgeLabel: 'READINESS'
  },
  {
    tag: 'MENTOR NETWORK',
    tagColor: '#F0A6E8',
    title: 'Alumni who sat where you sit.',
    desc: 'Book a real session with someone from your branch who already made the jump.',
    badge: '860+',
    badgeLabel: 'MENTORS'
  },
  {
    tag: 'REFERRALS & ROLES',
    tagColor: '#6FA8F5',
    title: 'Roles that match, not a job board.',
    desc: 'Every opening scored against your skills, with an alumnus inside to refer you.',
    badge: '267',
    badgeLabel: 'MATCHES'
  },
  {
    tag: 'DIGITAL IDENTITY',
    tagColor: '#34D399',
    title: 'One SA ID, verified for life.',
    desc: 'Events, student pricing, rentals and referrals — all on one card that never expires.',
    badge: 'VERIFIED',
    badgeLabel: 'STUDENT ID'
  }
];

export default function LoginScreen() {
  // The web screen below renders raw DOM (<style>, <div>, className) which
  // crashes on iOS/Android. Native gets a React Native form instead.
  if (Platform.OS !== 'web') return <NativeLoginScreen />;
  return <WebLoginScreen />;
}

function WebLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const { width } = useWindowDimensions();
  const isTablet = width < 1024;
  const isMobile = width < 768;

  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'invalid' | 'registered' | 'new'>('idle');
  const [rememberMe, setRememberMe] = useState(false);

  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const returnTo = typeof params.returnTo === 'string' && params.returnTo.startsWith('/')
    ? params.returnTo
    : '';

  const redirectAfterLogin = (role?: string) => {
    if (returnTo) {
      router.replace(returnTo as any);
      return;
    }
    const r = (role || '').toLowerCase();
    if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
    else if (r === 'mentor') router.replace('/mentor-portal');
    else if (r === 'college') router.replace('/college-portal');
    else if (r === 'alumni') router.replace('/alumni-portal');
    else router.replace('/student-portal/dashboard');
  };

  // Auto-play Carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Email Validation & Account Check
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setErrorMsg('');
    const clean = val.trim().toLowerCase();

    if (!clean) {
      setEmailStatus('idle');
      return;
    }

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
    if (!isValid) {
      setEmailStatus('idle');
      return;
    }

    setEmailStatus('idle');

    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    emailTimerRef.current = setTimeout(async () => {
      try {
        const data = await api.checkEmail(clean);
        if (data && data.exists) {
          setEmailStatus('registered');
        } else if (REGISTERED_EMAILS.includes(clean)) {
          setEmailStatus('registered');
        } else {
          setEmailStatus('new');
        }
      } catch {
        if (REGISTERED_EMAILS.includes(clean)) {
          setEmailStatus('registered');
        } else {
          // DO NOT assume it's a new account if the server request failed.
          // It could be a network error or the backend is down.
          setErrorMsg('Unable to reach the server. Please check your connection or try again later.');
          setEmailStatus('idle');
        }
      }
    }, 400);
  };

  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState(false);
  const [oauthConfigLoaded, setOauthConfigLoaded] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Fetch OAuth Config on mount and initialize Firebase Auth
  useEffect(() => {
    fetch(`${BASE}/api/auth/oauth-config`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data?.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
        if (typeof data?.enable_google_login === 'boolean') {
          setGoogleLoginEnabled(data.enable_google_login);
        } else {
          setGoogleLoginEnabled(false);
        }
        const firebaseConfig = data?.firebase;
        if (isFirebaseWebConfigComplete(firebaseConfig)) {
          const initialized = await initFirebaseAuth({
            apiKey: firebaseConfig.apiKey,
            authDomain: firebaseConfig.authDomain,
            projectId: firebaseConfig.projectId,
            appId: firebaseConfig.appId,
          });
          setFirebaseReady(initialized);
        } else {
          setFirebaseReady(false);
        }
        setOauthConfigLoaded(true);
      })
      .catch(() => {
        setGoogleLoginEnabled(false);
        setOauthConfigLoaded(true);
      });
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (!firebaseReady) throw new Error('Firebase Auth is not ready. Check the Google sign-in configuration and try again.');
      // Use a popup so Firebase returns the credential directly to this page.
      // Redirect sign-in relies on cross-origin storage at authDomain, which
      // browsers can block when the app uses a custom domain.
      const result = await signInWithGoogle();
      if (!result) {
        setLoading(false);
        return;
      }
      await processGoogleAuth({
        id_token: result.idToken,
        email: result.email,
        full_name: result.name,
        picture: result.picture,
      });
    } catch (err: any) {
      setLoading(false);
      if (err?.message?.includes('Firebase') || !googleClientId) {
        setShowGoogleModal(true);
        return;
      }
      setErrorMsg(err?.message || 'Google Sign-In failed. Please try again.');
    }
  };

  const processGoogleAuth = async (payload: { id_token?: string; email?: string; full_name?: string; picture?: string }) => {
    const emailToUse = (payload.email || '').trim().toLowerCase();

    // SECURITY: the backend only accepts verified provider tokens. Never let a
    // typed-in email stand in for a Google account.
    if (!payload.id_token) {
      setErrorMsg('Google Sign-In did not return a token. Please try again.');
      return;
    }
    if (!emailToUse || !emailToUse.includes('@')) {
      setErrorMsg('Google account did not provide an email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const rawName = payload.full_name || emailToUse.split('@')[0].replace(/[\._-]/g, ' ');
      const formattedName = payload.full_name || (rawName.charAt(0).toUpperCase() + rawName.slice(1));

      const checkRes = await api.checkEmail(emailToUse).catch(() => null);

      const res = await api.oauthGoogle({
        id_token: payload.id_token,
        email: emailToUse,
        full_name: formattedName,
        picture: payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: 'student'
      });

      if (res && res.user && res.access_token) {
        setUser(res.user);
        setTokens(res.access_token, res.refresh_token, rememberMe);
        setLoading(false);

        if (checkRes && !checkRes.exists) {
          router.replace(`/get-started?email=${encodeURIComponent(emailToUse)}`);
        } else {
          redirectAfterLogin(res.user.role);
        }
      } else {
        setErrorMsg('Google Sign-In failed. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google Sign-In failed. Please check connection.');
      setLoading(false);
    }
  };

  const submitForm = async (emailToUse?: string, pwdToUse?: string) => {
    const cleanEmail = (emailToUse || email).trim().toLowerCase();
    const cleanPwd = pwdToUse || password;

    setErrorMsg('');

    if (emailStatus === 'new') {
      router.push(`/get-started?email=${encodeURIComponent(cleanEmail)}`);
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!cleanPwd) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPwd }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = err?.detail || 'Invalid password or account credentials.';
        setErrorMsg(typeof raw === 'string' ? raw : (raw.msg || 'Invalid credentials.'));
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data?.requires_2fa) {
        router.push({
          pathname: '/(auth)/two-fa-challenge',
          params: {
            challenge_id: data.challenge_id,
            user_email: data.user_email || cleanEmail,
            methods: (data.methods || ['totp']).join(','),
            remember_me: String(rememberMe),
          },
        });
        setLoading(false);
        return;
      }
      setUser(data.user);
      setTokens(data.access_token, data.refresh_token, rememberMe);

      setLoading(false);

      redirectAfterLogin(data.user?.role);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error — please check connection or credentials.');
      setLoading(false);
    }
  };

  const slide = SLIDES[activeSlide];

  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
          html, body, #root { background: var(--sa-bg) !important; font-family: 'Outfit', -apple-system, sans-serif !important; color: var(--sa-text-primary) !important; }
          .au-glow-left {
            position: absolute; left: -14%; top: -22%; width: 780px; height: 620px;
            background: radial-gradient(circle, rgba(124,92,252,.22), transparent 68%);
            filter: blur(70px);
          }
          .au-glow-right {
            position: absolute; right: -18%; top: 34%; width: 680px; height: 560px;
            background: radial-gradient(circle, rgba(47,184,198,.12), transparent 70%);
            filter: blur(80px);
          }
          .social-btn { transition: all 0.2s ease; }
          .social-btn:hover { border-color: #7C5CFC !important; background: rgba(124,92,252,.12) !important; }
          .db-field-focus:focus-within { border-color: #7C5CFC !important; box-shadow: 0 0 0 3px rgba(124,92,252,.18) !important; }
        `
      }} />

      {/* Cosmic background glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="au-glow-left" />
        <View className="au-glow-right" />
      </View>

      <SAWatermark fixed={true} right={-40} top={70} opacity={0.09} size={720} glow={true} />
      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 80px)', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1.05fr) minmax(0, .95fr)', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          
          {/* Left Column: Brand Showcase Carousel with Theme Crest */}
          {!isTablet && (
            <div style={{ position: 'relative', borderRight: '1px solid var(--sa-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 48px' }}>
              
              {/* Carousel Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '40px 0' }}>
                <div style={{ position: 'relative', minHeight: 340 }}>
                  <div style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: '1.8px', color: slide.tagColor, marginBottom: 14 }}>
                    {slide.tag}
                  </div>
                  <div style={{ fontSize: 38, fontWeight: '700', letterSpacing: '-1.5px', lineHeight: 1.12, color: 'var(--sa-text-primary)', maxWidth: 460 }}>
                    {slide.title}
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--sa-text-secondary)', maxWidth: 420, marginTop: 14 }}>
                    {slide.desc}
                  </div>

                  {/* Graphic Card Preview */}
                  <div style={{ marginTop: 32, padding: '20px 24px', borderRadius: 16, border: '1px solid var(--sa-border-strong)', background: 'var(--sa-bg-elevated)', maxWidth: 380, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--sa-shadow-card)' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.2px', color: 'var(--sa-text-muted)' }}>{slide.badgeLabel}</div>
                      <div style={{ fontSize: 28, fontWeight: '800', color: slide.tagColor, marginTop: 4 }}>{slide.badge}</div>
                    </div>
                    <Sparkles size={28} color={slide.tagColor} />
                  </div>
                </div>

                {/* Slide Indicator Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 24 }}>
                  {SLIDES.map((_, idx) => (
                    <span
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      style={{
                        width: idx === activeSlide ? 30 : 10,
                        height: 4,
                        borderRadius: 2,
                        background: idx === activeSlide ? '#7C5CFC' : 'var(--sa-border-strong)',
                        cursor: 'pointer',
                        transition: 'all 0.35s ease'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Brand Footer Stats */}
              <div style={{ position: 'relative', display: 'flex', gap: 36, borderTop: '1px solid var(--sa-border)', paddingTop: 24 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: '700', letterSpacing: '-.8px', color: 'var(--sa-text-primary)' }}>50,000+</div>
                  <div style={{ fontSize: 12.5, color: 'var(--sa-text-secondary)', marginTop: 2 }}>Active students</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: '700', letterSpacing: '-.8px', color: 'var(--sa-text-primary)' }}>1,200+</div>
                  <div style={{ fontSize: 12.5, color: 'var(--sa-text-secondary)', marginTop: 2 }}>Verified mentors</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: '700', letterSpacing: '-.8px', color: 'var(--sa-text-primary)' }}>200+</div>
                  <div style={{ fontSize: 12.5, color: 'var(--sa-text-secondary)', marginTop: 2 }}>Partner colleges</div>
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Sign In Form */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '32px 20px' : '52px 48px' }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
              <div style={{ fontSize: 32, fontWeight: '700', letterSpacing: '-1px', color: 'var(--sa-text-primary)' }}>Sign in</div>
              <div style={{ fontSize: 14.5, color: 'var(--sa-text-secondary)', marginTop: 7 }}>Use your college address to unlock your cohort.</div>

              {oauthConfigLoaded && googleLoginEnabled && (
                <>
                  {/* Google Button */}
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn()}
                    disabled={loading}
                    aria-busy={loading}
                    data-testid="google-signin-button"
                    className="social-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 11,
                      border: '1px solid var(--sa-border-strong)',
                      borderRadius: 12,
                      background: 'var(--sa-bg-elevated)',
                      color: 'var(--sa-text-primary)',
                      fontSize: 15,
                      fontWeight: '600',
                      padding: '14px',
                      marginTop: 26,
                      width: '100%',
                      cursor: loading ? 'wait' : 'pointer',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flex: 'none' }}>
                      <path fill="#4285F4" d="M45 24c0-1.6-.14-3.13-.4-4.6H24v8.7h11.7c-.5 2.7-2.05 5-4.35 6.55v5.4h7c4.1-3.78 6.65-9.35 6.65-16.05Z"></path>
                      <path fill="#34A853" d="M24 46c5.85 0 10.75-1.94 14.35-5.25l-7-5.4c-1.94 1.3-4.42 2.07-7.35 2.07-5.65 0-10.44-3.81-12.14-8.94h-7.2v5.6C7.3 41.2 14.98 46 24 46Z"></path>
                      <path fill="#FBBC05" d="M11.86 28.48A13.4 13.4 0 0 1 11.15 24c0-1.56.27-3.07.71-4.48v-5.6h-7.2A21.9 21.9 0 0 0 2 24c0 3.55.85 6.9 2.66 10.08l7.2-5.6Z"></path>
                      <path fill="#EA4335" d="M24 10.6c3.18 0 6.04 1.1 8.29 3.23l6.2-6.2C34.73 4.1 29.84 2 24 2 14.98 2 7.3 6.8 4.66 13.92l7.2 5.6C13.56 14.4 18.35 10.6 24 10.6Z"></path>
                    </svg>
                    {loading ? 'Connecting to Google…' : 'Continue with Google'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
                    <span style={{ flex: 1, height: 1, background: 'var(--sa-border)' }} />
                    <span style={{ fontSize: 12, fontWeight: '600', letterSpacing: '1.4px', color: 'var(--sa-text-muted)' }}>OR</span>
                    <span style={{ flex: 1, height: 1, background: 'var(--sa-border)' }} />
                  </div>
                </>
              )}

              {/* Error Message Alert */}
              {errorMsg ? (
                <div
                  role="alert"
                  data-testid="auth-error-message"
                  style={{ background: 'var(--sa-danger-tint, rgba(240,97,107,.12))', border: '1px solid var(--sa-danger-border, rgba(240,97,107,.35))', borderRadius: 12, padding: '12px 14px', color: 'var(--sa-danger-text, #F0616B)', fontSize: 13.5, marginBottom: 16 }}
                >
                  {errorMsg}
                </div>
              ) : null}

              {/* Email Step Input */}
              <div style={{ fontSize: 12, fontWeight: '700', letterSpacing: '1.3px', color: 'var(--sa-text-muted)', marginBottom: 9 }}>COLLEGE EMAIL</div>
              <div className="db-field-focus" style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid var(--sa-border-strong)', borderRadius: 12, background: 'var(--sa-bg-elevated)', padding: '14px 15px', transition: 'all 0.2s ease' }}>
                <Mail size={16} color="var(--sa-text-muted)" />
                <input
                  type="email"
                  aria-label="College Email"
                  data-testid="email-input"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="devender@mrit.edu"
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: 'var(--sa-text-primary)', fontSize: 15, outline: 'none' }}
                />
                {emailStatus === 'registered' && <CheckCircle2 size={16} color="#059669" />}
                {emailStatus === 'invalid' && <AlertCircle size={16} color="#B45309" />}
                {emailStatus === 'new' && <Sparkles size={16} color="#7C3AED" />}
              </div>

              {/* Real-time Status Helper Text */}
              {emailStatus === 'registered' && (
                <div style={{ fontSize: 13, color: '#047857', marginTop: 8 }}>
                  Account found — enter your password to continue.
                </div>
              )}
              {emailStatus === 'new' && (
                <div style={{ fontSize: 13, color: '#6D28D9', marginTop: 8 }}>
                  No account on this email yet — we'll help you create one.
                </div>
              )}

              {/* Password Input Block */}
              {(emailStatus === 'registered' || password.length > 0 || errorMsg === 'Please enter your password.' || (email.includes('@') && emailStatus !== 'new')) && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 9 }}>
                    <span style={{ fontSize: 12, fontWeight: '700', letterSpacing: '1.3px', color: 'var(--sa-text-muted)' }}>PASSWORD</span>
                    <span
                      onClick={() => router.push('/(auth)/forgot-password')}
                      style={{ fontSize: 12.5, fontWeight: '600', color: '#7C3AED', cursor: 'pointer' }}
                    >
                      Forgot?
                    </span>
                  </div>
                  <div className="db-field-focus" style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid var(--sa-border-strong)', borderRadius: 12, background: 'var(--sa-bg-elevated)', padding: '14px 15px', transition: 'all 0.2s ease' }}>
                    <Lock size={16} color="var(--sa-text-muted)" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      aria-label="Password"
                      data-testid="password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: 'var(--sa-text-primary)', fontSize: 15, outline: 'none' }}
                    />
                    <span
                      onClick={() => setShowPwd(!showPwd)}
                      style={{ fontSize: 12, fontWeight: '600', color: 'var(--sa-text-muted)', cursor: 'pointer' }}
                    >
                      {showPwd ? 'Hide' : 'Show'}
                    </span>
                  </div>
                </div>
              )}

              {/* Remember Me Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, marginBottom: 2 }}>
                <input
                  type="checkbox"
                  id="remember-me"
                  data-testid="remember-me-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: '#7C5CFC',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                />
                <label
                  htmlFor="remember-me"
                  data-testid="remember-me-label"
                  style={{
                    fontSize: 13.5,
                    color: 'var(--sa-text-secondary)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  Remember me
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                data-testid="login-submit-button"
                aria-label="Sign in"
                onClick={() => submitForm()}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  borderRadius: 12,
                  background: '#7C5CFC',
                  color: '#FFFFFF',
                  fontSize: 15.5,
                  fontWeight: '700',
                  padding: '16px',
                  marginTop: 24,
                  width: '100%',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 22px rgba(124, 92, 252, 0.28)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>
                  {loading
                    ? 'Signing in…'
                    : emailStatus === 'new' && password.length === 0
                    ? 'Create an account'
                    : 'Sign in'}
                </span>
                {!loading && <ArrowRight size={16} />}
              </button>

              {/* Footer Switch */}
              <div style={{ fontSize: 13.5, color: 'var(--sa-text-secondary)', textAlign: 'center', marginTop: 22 }}>
                New here?{' '}
                <span
                  onClick={() => router.push('/get-started')}
                  style={{ fontWeight: '600', color: '#7C3AED', cursor: 'pointer' }}
                >
                  Create an account
                </span>
              </div>
            </div>
          </div>

        </div>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: 'var(--sa-bg)',
    minHeight: '100vh' as any,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
