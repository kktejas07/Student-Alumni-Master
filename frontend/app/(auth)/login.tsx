// @ts-nocheck
/**
 * LoginScreen — Dark Luxury Authentication matching the Onboarding Design System.
 * 
 * Palette & Tokens:
 *  - Canvas: #05060F with ambient aurora field
 *  - Glass Card: rgba(12, 14, 27, 0.88) with rgba(139, 132, 255, 0.25) border
 *  - Typography: Manrope with high-contrast text and purple highlights
 *  - Google, LinkedIn, GitHub OAuth + Email/Password form
 *  - Role-aware redirect (student -> /student-portal/dashboard, mentor -> /mentor-portal, etc.)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { getBaseUrl } from '@/src/lib/env';
import { trackAuth } from '@/src/lib/authAnalytics';

const BASE = getBaseUrl();

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; role?: string }>();
  const initialEmail = (params.email as string) || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const submittingRef = useRef(false);
  const pwdRef = useRef<TextInput>(null);

  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  useEffect(() => {
    trackAuth({ event: 'login_screen_viewed' as any });
  }, []);

  const handleLogin = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPwd = password;

    setErrorMsg('');
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!cleanPwd) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPwd }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = err?.detail || 'Invalid email or password.';
        const msg = typeof raw === 'string' ? raw : (raw.msg || 'Invalid email or password.');
        setErrorMsg(msg);
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setTokens(data.access_token, data.refresh_token);
      trackAuth({ event: 'login_success', email: cleanEmail, role: data.user?.role });

      setLoading(false);
      submittingRef.current = false;

      const r = (data.user?.role || '').toLowerCase();
      if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
      else if (r === 'mentor') router.replace('/mentor-portal');
      else if (r === 'college') router.replace('/college-portal');
      else if (r === 'alumni') router.replace('/alumni-portal');
      else router.replace('/student-portal/dashboard');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error — please try again.');
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#F4F5FB',
        backgroundColor: '#05060F',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflowX: 'hidden',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── CSS Keyframes ── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes ob-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ob-wash { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-3%, 2.5%, 0); } }
        .login-btn:hover { background: #6E62F5 !important; }
        .social-btn { transition: all 0.2s ease; }
        .social-btn:hover { border-color: rgba(139, 132, 255, 0.5) !important; background: rgba(24, 28, 58, 0.8) !important; }
      `,
        }}
      />

      {/* ── Background Aurora Glow Wash ── */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            left: '-25%',
            top: '-25%',
            width: '150%',
            height: '150%',
            background:
              'radial-gradient(46% 40% at 32% 26%, rgba(124,107,255,.22), transparent 68%), radial-gradient(40% 38% at 74% 68%, rgba(47,184,198,.15), transparent 70%)',
            filter: 'blur(30px)',
            animation: 'ob-wash 48s ease-in-out infinite',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 26vh 14vh #05060F' }} />
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
          opacity: 0.09,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        viewBox="0 0 300 350"
      >
        <defs>
          <linearGradient id="loginWatermarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D8B6FF" />
            <stop offset="45%" stopColor="#9A5CE8" />
            <stop offset="100%" stopColor="#5B1FB0" />
          </linearGradient>
          <linearGradient id="loginWatermarkInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B683F5" />
            <stop offset="100%" stopColor="#7331C9" />
          </linearGradient>
        </defs>
        <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#loginWatermarkGrad)" />
        <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#loginWatermarkInner)" />
        <text
          style={{ fontFamily: "'Manrope', sans-serif", fontSize: '128px', fontWeight: 800, letterSpacing: '-4px', fill: '#FFFFFF' }}
          textAnchor="middle"
          x="150"
          y="215"
        >
          SA
        </text>
      </svg>

      {/* ── Main Centered Login Glass Card ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(12, 14, 27, 0.88)',
          border: '1px solid rgba(139, 132, 255, 0.25)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 24px 60px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,132,255,0.15)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          animation: 'ob-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
          boxSizing: 'border-box',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <svg width="26" height="30" viewBox="0 0 300 350" style={{ flex: 'none' }}>
            <defs>
              <linearGradient id="loginBadge" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7C6BFF" />
                <stop offset=".55" stopColor="#4B3FD6" />
                <stop offset="1" stopColor="#2FB8C6" />
              </linearGradient>
            </defs>
            <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#loginBadge)" />
            <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="rgba(255,255,255,.16)" />
            <text x="150" y="216" textAnchor="middle" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '126px', fontWeight: 800, letterSpacing: '-6px', fill: '#FFFFFF' }}>
              SA
            </text>
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            StudentAlumni
          </span>
        </div>

        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-1px', margin: '0 0 8px', color: '#FFFFFF' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '14.5px', color: '#9AA0B4', margin: '0 0 28px', lineHeight: 1.55 }}>
          Sign in to continue your journey on Student Alumni
        </p>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={async () => {
            try {
              if (Platform.OS === 'web') {
                const result = await signInWithGoogle();
                if (!result) return;
                const res = await fetch(`${BASE}/api/auth/firebase`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_token: result.idToken }),
                });
                if (!res.ok) throw new Error('Google authentication failed');
                const data = await res.json();
                setUser(data.user);
                setTokens(data.access_token, data.refresh_token);
                trackAuth({ event: 'login_success', email: data.user.email, role: data.user.role });
                const r = (data.user.role || '').toLowerCase();
                if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
                else if (r === 'mentor') router.replace('/mentor-portal');
                else if (r === 'college') router.replace('/college-portal');
                else if (r === 'alumni') router.replace('/alumni-portal');
                else router.replace('/student-portal/dashboard');
              }
            } catch (e: any) {
              setErrorMsg(e?.message || 'Google sign-in failed');
            }
          }}
          className="social-btn"
          style={{
            width: '100%',
            padding: '13px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(139, 132, 255, 0.25)',
            background: 'rgba(18, 20, 43, 0.75)',
            color: '#FFFFFF',
            fontSize: '14.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.9 19.7-20 0-1.3-.1-2.4-.3-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.6 8.4 6.3 14.1z" />
            <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.5 16.1 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.8l6.3 5.3c-.4.4 6.7-4.9 6.7-15.1 0-1.3-.1-2.4-.3-3.5z" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <span style={{ flex: 1, height: '1px', background: 'rgba(139, 132, 255, 0.2)' }} />
          <span style={{ fontSize: '11.5px', color: '#9AA0B4', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            or continue with email
          </span>
          <span style={{ flex: 1, height: '1px', background: 'rgba(139, 132, 255, 0.2)' }} />
        </div>

        {/* Error Alert Box */}
        {errorMsg ? (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#FCA5A5',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        {/* Email & Password Form */}
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#9AA0B4', marginBottom: '6px', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              style={{
                width: '100%',
                padding: '14px 15px',
                borderRadius: '10px',
                border: '1px solid rgba(139, 132, 255, 0.25)',
                background: 'rgba(18, 20, 43, 0.75)',
                color: '#FFFFFF',
                fontSize: '14.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', color: '#9AA0B4', fontWeight: 500 }}>Password</label>
              <span
                onClick={() => router.push('/(auth)/forgot-password')}
                style={{ fontSize: '12.5px', color: '#8B84FF', cursor: 'pointer', fontWeight: 600 }}
              >
                Forgot password?
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                style={{
                  width: '100%',
                  padding: '14px 45px 14px 15px',
                  borderRadius: '10px',
                  border: '1px solid rgba(139, 132, 255, 0.25)',
                  background: 'rgba(18, 20, 43, 0.75)',
                  color: '#FFFFFF',
                  fontSize: '14.5px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#9AA0B4',
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: '#5B4FE9', cursor: 'pointer' }}
            />
            <label htmlFor="remember" style={{ fontSize: '13px', color: '#9AA0B4', cursor: 'pointer' }}>
              Remember me on this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-btn"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              background: '#5B4FE9',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(91, 79, 233, 0.4)',
              transition: 'background 0.2s ease',
              marginTop: '8px',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Footer Link to Get Started */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13.5px', color: '#9AA0B4' }}>
          New to Student Alumni?{' '}
          <span
            onClick={() => router.push('/get-started')}
            style={{ color: '#8B84FF', fontWeight: 700, cursor: 'pointer' }}
          >
            Get started
          </span>
        </div>
      </div>
    </div>
  );
}
