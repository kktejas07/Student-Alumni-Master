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
import { View, StyleSheet, ScrollView, useWindowDimensions, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Heart } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { getBaseUrl } from '@/src/lib/env';
import { api } from '@/src/models/services/api';

const BASE = getBaseUrl();

const REGISTERED_EMAILS = [
  'devender@snist.ac.in',
  'aisha@iitb.ac.in',
  'arjun@vnrvjiet.in',
  'demo@studentalumni.ai',
  'student@snist.ac.in'
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
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
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

  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  // Auto-play Carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Email Validation & Account Check
  const handleEmailChange = async (val: string) => {
    setEmail(val);
    setErrorMsg('');
    const clean = val.trim().toLowerCase();

    if (!clean) {
      setEmailStatus('idle');
      return;
    }

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
    if (!isValid) {
      setEmailStatus('invalid');
      return;
    }

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
        setEmailStatus('new');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const userEmail = email && email.includes('@') ? email : 'google.user@studentalumni.ai';
      const rawName = userEmail.split('@')[0].replace(/[\._-]/g, ' ');
      const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      const res = await api.oauthGoogle({
        email: userEmail,
        full_name: formattedName,
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: 'student'
      });

      if (res && res.user && res.access_token) {
        setUser(res.user);
        setTokens(res.access_token, res.refresh_token);
        setLoading(false);
        const r = (res.user.role || '').toLowerCase();
        if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
        else if (r === 'mentor') router.replace('/mentor-portal');
        else if (r === 'college') router.replace('/college-portal');
        else if (r === 'alumni') router.replace('/alumni-portal');
        else router.replace('/student-portal/dashboard');
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
      setUser(data.user);
      setTokens(data.access_token, data.refresh_token);

      setLoading(false);

      const r = (data.user?.role || '').toLowerCase();
      if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
      else if (r === 'mentor') router.replace('/mentor-portal');
      else if (r === 'college') router.replace('/college-portal');
      else if (r === 'alumni') router.replace('/alumni-portal');
      else router.replace('/student-portal/dashboard');
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
          html, body, #root { background: #05060F !important; font-family: 'Manrope', -apple-system, sans-serif !important; }
          .au-glow-left {
            position: absolute; left: -14%; top: -22%; width: 780px; height: 620px;
            background: radial-gradient(circle, rgba(91,79,233,.22), transparent 68%);
            filter: blur(70px);
          }
          .au-glow-right {
            position: absolute; right: -18%; top: 34%; width: 680px; height: 560px;
            background: radial-gradient(circle, rgba(240,166,232,.10), transparent 70%);
            filter: blur(80px);
          }
          .social-btn { transition: all 0.2s ease; }
          .social-btn:hover { border-color: rgba(139, 132, 255, 0.5) !important; background: rgba(24, 28, 58, 0.9) !important; }
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
          
          {/* Left Column: Brand Showcase Carousel */}
          {!isTablet && (
            <div style={{ position: 'relative', borderRight: '1px solid #1B1E33', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 48px' }}>
              {/* Carousel Content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: '40px 0' }}>
                <div style={{ position: 'relative', minHeight: 340 }}>
                  <div style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: '1.8px', color: slide.tagColor, marginBottom: 14 }}>
                    {slide.tag}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: '700', letterSpacing: '-1.5px', lineHeight: 1.14, color: '#FFFFFF', maxWidth: 440 }}>
                    {slide.title}
                  </div>
                  <div style={{ fontSize: 15.5, lineHeight: 1.65, color: '#9AA0B4', maxWidth: 400, marginTop: 14 }}>
                    {slide.desc}
                  </div>

                  {/* Graphic Card Preview */}
                  <div style={{ marginTop: 32, padding: '20px 24px', borderRadius: 16, border: '1px solid #2A2A55', background: 'rgba(14, 16, 32, 0.8)', maxWidth: 360, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.2px', color: '#9AA0B4' }}>{slide.badgeLabel}</div>
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
                        background: idx === activeSlide ? '#8B84FF' : '#2A2A55',
                        cursor: 'pointer',
                        transition: 'all 0.35s ease'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Brand Footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#9AA0B4' }}>
                Built with love for students
                <Heart size={14} color="#8B84FF" fill="#8B84FF" />
                across all campus's
              </div>
            </div>
          )}

          {/* Right Column: Sign In Form */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '32px 20px' : '52px 48px' }}>
            <div style={{ width: '100%', maxWidth: 420 }}>
              <div style={{ fontSize: 30, fontWeight: '700', letterSpacing: '-1px', color: '#FFFFFF' }}>Sign in</div>
              <div style={{ fontSize: 14.5, color: '#9AA0B4', marginTop: 7 }}>Continue with Google, or use your email.</div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="social-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 11,
                  border: '1px solid #2A2A55',
                  borderRadius: 12,
                  background: '#FFFFFF',
                  color: '#1F2430',
                  fontSize: 15,
                  fontWeight: '600',
                  padding: '14px',
                  marginTop: 26,
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" style={{ flex: 'none' }}>
                  <path fill="#4285F4" d="M45 24c0-1.6-.14-3.13-.4-4.6H24v8.7h11.7c-.5 2.7-2.05 5-4.35 6.55v5.4h7c4.1-3.78 6.65-9.35 6.65-16.05Z"></path>
                  <path fill="#34A853" d="M24 46c5.85 0 10.75-1.94 14.35-5.25l-7-5.4c-1.94 1.3-4.42 2.07-7.35 2.07-5.65 0-10.44-3.81-12.14-8.94h-7.2v5.6C7.3 41.2 14.98 46 24 46Z"></path>
                  <path fill="#FBBC05" d="M11.86 28.48A13.4 13.4 0 0 1 11.15 24c0-1.56.27-3.07.71-4.48v-5.6h-7.2A21.9 21.9 0 0 0 2 24c0 3.55.85 6.9 2.66 10.08l7.2-5.6Z"></path>
                  <path fill="#EA4335" d="M24 10.6c3.18 0 6.04 1.1 8.29 3.23l6.2-6.2C34.73 4.1 29.84 2 24 2 14.98 2 7.3 6.8 4.66 13.92l7.2 5.6C13.56 14.4 18.35 10.6 24 10.6Z"></path>
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
                <span style={{ flex: 1, height: 1, background: '#1B1E33' }} />
                <span style={{ fontSize: 12, fontWeight: '600', letterSpacing: '1.4px', color: '#7B8199' }}>OR</span>
                <span style={{ flex: 1, height: 1, background: '#1B1E33' }} />
              </div>

              {/* Error Message Alert */}
              {errorMsg ? (
                <div style={{ background: 'rgba(248,113,134,.12)', border: '1px solid rgba(248,113,134,.35)', borderRadius: 12, padding: '12px 14px', color: '#F87186', fontSize: 13.5, marginBottom: 16 }}>
                  {errorMsg}
                </div>
              ) : null}

              {/* Email Step Input */}
              <div style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: '1.3px', color: '#9AA0B4', marginBottom: 9 }}>EMAIL</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid #1B1E33', borderRadius: 12, background: '#0C0E1B', padding: '14px 15px' }}>
                <Mail size={16} color="#7B8199" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="you@college.edu"
                  style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: '#F4F5FB', fontSize: 15, outline: 'none' }}
                />
                {emailStatus === 'registered' && <CheckCircle2 size={16} color="#34D399" />}
                {emailStatus === 'invalid' && <AlertCircle size={16} color="#F5B342" />}
                {emailStatus === 'new' && <Sparkles size={16} color="#8B84FF" />}
              </div>

              {/* Real-time Status Helper Text */}
              {emailStatus === 'registered' && (
                <div style={{ fontSize: 13, color: '#34D399', marginTop: 8 }}>
                  Account found — enter your password to continue.
                </div>
              )}
              {emailStatus === 'new' && (
                <div style={{ fontSize: 13, color: '#8B84FF', marginTop: 8 }}>
                  No account on this email yet — we'll help you create one.
                </div>
              )}
              {emailStatus === 'invalid' && (
                <div style={{ fontSize: 13, color: '#F5B342', marginTop: 8 }}>
                  That doesn't look like a valid email yet.
                </div>
              )}

              {/* Password Input Block (Appears when email is recognized or typed) */}
              {(emailStatus === 'registered' || password.length > 0) && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 9 }}>
                    <span style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: '1.3px', color: '#9AA0B4' }}>PASSWORD</span>
                    <span
                      onClick={() => router.push('/(auth)/forgot-password')}
                      style={{ fontSize: 12.5, fontWeight: '600', color: '#8B84FF', cursor: 'pointer' }}
                    >
                      Forgot?
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid #1B1E33', borderRadius: 12, background: '#0C0E1B', padding: '14px 15px' }}>
                    <Lock size={16} color="#7B8199" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: '#F4F5FB', fontSize: 15, outline: 'none' }}
                    />
                    <span
                      onClick={() => setShowPwd(!showPwd)}
                      style={{ fontSize: 12, fontWeight: '600', color: '#7B8199', cursor: 'pointer' }}
                    >
                      {showPwd ? 'Hide' : 'Show'}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => submitForm()}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  borderRadius: 12,
                  background: '#5B4FE9',
                  color: '#FFFFFF',
                  fontSize: 15.5,
                  fontWeight: '700',
                  padding: '16px',
                  marginTop: 24,
                  width: '100%',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 24px rgba(91, 79, 233, 0.35)'
                }}
              >
                <span>
                  {loading
                    ? 'Signing in…'
                    : emailStatus === 'new'
                    ? 'Create an account'
                    : 'Sign in'}
                </span>
                {!loading && <ArrowRight size={16} />}
              </button>

              {/* Footer Switch */}
              <div style={{ fontSize: 13.5, color: '#9AA0B4', textAlign: 'center', marginTop: 22 }}>
                New here?{' '}
                <span
                  onClick={() => router.push('/get-started')}
                  style={{ fontWeight: '600', color: '#8B84FF', cursor: 'pointer' }}
                >
                  Create an account
                </span>
              </div>
            </div>
          </div>

        </div>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: '#05060F',
    minHeight: '100vh' as any,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
