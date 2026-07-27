import { getBaseUrl } from '@/src/lib/env';
/**
 * Auth Login screen using AuthShell + AuthControls + analytics tracking.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import Svg, { Path, G } from 'react-native-svg';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, OutlineButton, PasswordRules } from '@/src/views/auth/AuthControls';
import { ROLE_META, type Role } from '@/src/views/auth/RoleCards';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth, passwordStrength } from '@/src/lib/authAnalytics';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { initFirebaseAuth, signInWithGoogle, signInWithGitHub } from '@/src/lib/firebaseAuth';

const BASE = getBaseUrl();

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.9 19.7-20 0-1.3-.1-2.4-.3-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.6 8.4 6.3 14.1z" />
      <Path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.5 16.1 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.8l6.3 5.3c-.4.4 6.7-4.9 6.7-15.1 0-1.3-.1-2.4-.3-3.5z" />
    </Svg>
  );
}

function LinkedInIn({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        <Path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 11-.01-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z" />
      </G>
    </Svg>
  );
}

function GitHubCat({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#111827" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </Svg>
  );
}

function DarkSocialButton({ label, onPress, icon, testID }: any) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {})
      }}
    >
      {icon}
      <Text style={{ color: '#111827', fontFamily: FONTS.bold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: Role; email?: string }>();
  const role: Role | undefined = params.role as Role;
  const initialEmail: string = (params.email as string) || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [exists, setExists] = useState<boolean | null>(null);
  // Guard against double-submit within the same animation frame
  const submittingRef = useRef(false);
  const pwdRef = useRef<TextInput>(null);

  const [oauthCfg, setOauthCfg] = useState<{ linkedin_client_id?: string; redirect_uri?: string; firebase?: { apiKey: string; authDomain: string; projectId: string; appId: string } | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/oauth-config`);
        if (res.ok) {
          const cfg = await res.json();
          setOauthCfg(cfg);
          // Init Firebase Auth if configured
          if (cfg.firebase?.apiKey) {
            initFirebaseAuth(cfg.firebase);
          }
        }
      } catch {}
    })();
  }, []);

  // Listen for OAuth popup callback (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_SUCCESS') {
        const { access_token, refresh_token, user } = event.data.payload;
        if (access_token && user) {
          setUser(user);
          setTokens(access_token, refresh_token);
          trackAuth({ event: 'login_success', email: user.email, role: user.role });
          const r = (user.role || '').toLowerCase();
          if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
          else if (r === 'mentor') router.replace('/mentor-portal');
          else if (r === 'college') router.replace('/college-portal');
          else if (r === 'alumni') router.replace('/alumni-portal');
          else router.replace('/student-portal');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const strength = passwordStrength(password);

  useEffect(() => {
    trackAuth({ event: 'email_entered', extra: { _silent: true, role } });
  }, [role]);

  const onEmailBlur = async () => {
    if (!email || !email.includes('@')) return;
    trackAuth({ event: 'email_check', email });
    // Hit /auth/check or /auth/me after a probe — for now, optimistic UX
    setExists(null);
  };
  
  const onEmailSubmit = () => {
    onEmailBlur();
    pwdRef.current?.focus();
  };

  const onPasswordBlur = async () => {
    if (password) {
      // Server-side strength check (does NOT store the password)
      trackAuth({ event: 'password_strength_check', password_for_strength: password });
    }
  };

  const onLogin = async (overrideEmail?: string, overridePwd?: string) => {
    // Defensive: callers like `onPress={onLogin}` pass the gesture event as 1st arg.
    const e = String(typeof overrideEmail === 'string' ? overrideEmail : (email || '')).trim();
    const p = String(typeof overridePwd === 'string' ? overridePwd : (password || ''));
    setEmailError(''); setPwdError('');
    if (!e || e.indexOf('@') === -1) {
      setEmailError('Enter a valid email');
      return;
    }
    if (!p) {
      setPwdError('Enter your password');
      return;
    }
    // Prevent double-submit within same animation frame (before React re-renders the disabled button)
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    trackAuth({ event: 'login_attempt', email: e, role });
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, password: p }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = err?.detail;
        const reason = Array.isArray(raw)
          ? raw.map((e: any) => e?.msg || e?.message || '').filter(Boolean).join(', ') || 'Invalid credentials'
          : typeof raw === 'string' ? raw
          : typeof raw === 'object' && raw !== null ? (raw.msg || raw.message || 'Invalid credentials')
          : 'Invalid credentials';
        trackAuth({ event: 'login_failure', email, reason });
        setPwdError(reason);
        return;
      }
      const data = await res.json();
      if (data.requires_2fa) {
        trackAuth({ event: 'login_attempt', email, success: true, extra: { needs_2fa: true } });
        router.push({ pathname: '/(auth)/two-fa-challenge', params: { challenge_id: data.challenge_id, email: data.user_email } });
        return;
      }
      setUser(data.user);
      // Fire token storage without awaiting — localStorage writes are synchronous on web.
      // Navigation should not be blocked by this microtask overhead.
      setTokens(data.access_token, data.refresh_token);
      trackAuth({ event: 'login_success', email, role: data.user.role });
      // Stop loading BEFORE navigating so the component unmounts in a clean state,
      // preventing a stale loading→false re-render from racing the navigation event queue.
      setLoading(false);
      submittingRef.current = false;
      const r = (data.user.role || '').toLowerCase();
      if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
      else if (r === 'mentor') router.replace('/mentor-portal');
      else if (r === 'college') router.replace('/college-portal');
      else if (r === 'alumni') router.replace('/alumni-portal');
      else router.replace('/student-portal');
      return; // prevent finally from running setLoading again
    } catch (e: any) {
      trackAuth({ event: 'login_failure', email, reason: e?.message || 'Network error' });
      setPwdError('Network error — try again');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };


  return (
    <AuthShell role={role}>
      <Pressable onPress={() => {
        if (Platform.OS === 'web' && window.history.length > 1) {
          router.back();
        } else {
          router.replace('/');
        }
      }} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </Pressable>

      <View style={s.head}>
        {role && (
          <View style={s.roleStripe}>
            <Text style={s.roleEmoji}>{ROLE_META[role].emoji}</Text>
            <Text style={s.roleText}>Signing in as {ROLE_META[role].label}</Text>
          </View>
        )}
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.sub}>Sign in to continue your journey on Student Alumni</Text>
      </View>

      {/* OAuth row */}
      <View style={s.oauthRow}>
        {oauthCfg?.enable_google_login === true && (
          <DarkSocialButton label="Google" testID="login-google" icon={<GoogleG size={16} />} onPress={async () => {
              try {
                if (oauthCfg?.firebase && Platform.OS === 'web') {
                  const result = await signInWithGoogle();
                  if (!result) return;
                  const res = await fetch(`${BASE}/api/auth/firebase`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_token: result.idToken }),
                  });
                  if (!res.ok) throw new Error('Firebase auth failed');
                  const data = await res.json();
                  setUser(data.user);
                  setTokens(data.access_token, data.refresh_token);
                  trackAuth({ event: 'login_success', email: data.user.email, role: data.user.role });
                  const r = (data.user.role || '').toLowerCase();
                  if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
                  else if (r === 'mentor') router.replace('/mentor-portal');
                  else if (r === 'college') router.replace('/college-portal');
                  else if (r === 'alumni') router.replace('/alumni-portal');
                  else router.replace('/student-portal');
                } else {
                  setPwdError('Google sign-in is not configured. Contact admin.');
                }
              } catch (e: any) {
                setPwdError(e?.message || 'Google sign-in failed');
              }
            }} />
        )}
        {oauthCfg?.enable_linkedin_login === true && (
          <DarkSocialButton label="LinkedIn" testID="login-linkedin" icon={<LinkedInIn size={16} />} onPress={() => {
              if (oauthCfg?.linkedin_client_id && Platform.OS === 'web') {
                const state = `linkedin_${Math.random().toString(36).slice(2)}`;
                const url = `https://www.linkedin.com/oauth/v2/authorization?client_id=${oauthCfg.linkedin_client_id}&redirect_uri=${encodeURIComponent(oauthCfg.redirect_uri!)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
                window.open(url, '_blank', 'width=600,height=700');
              } else {
                setPwdError('LinkedIn sign-in is not configured. Contact admin.');
              }
            }} />
        )}
        {oauthCfg?.enable_github_login === true && (
          <DarkSocialButton label="GitHub" testID="login-github" icon={<GitHubCat size={16} />} onPress={async () => {
              try {
                if (oauthCfg?.firebase && Platform.OS === 'web') {
                  const result = await signInWithGitHub();
                  if (!result) return;
                  const res = await fetch(`${BASE}/api/auth/firebase`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_token: result.idToken }),
                  });
                  if (!res.ok) throw new Error('Firebase auth failed');
                  const data = await res.json();
                  setUser(data.user);
                  setTokens(data.access_token, data.refresh_token);
                  trackAuth({ event: 'login_success', email: data.user.email, role: data.user.role });
                  const r = (data.user.role || '').toLowerCase();
                  if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
                  else if (r === 'mentor') router.replace('/mentor-portal');
                  else if (r === 'college') router.replace('/college-portal');
                  else if (r === 'alumni') router.replace('/alumni-portal');
                  else router.replace('/student-portal');
                } else {
                  setPwdError('GitHub sign-in is not configured. Contact admin.');
                }
              } catch (e: any) {
                setPwdError(e?.message || 'GitHub sign-in failed');
              }
            }} />
        )}
      </View>

      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.dividerText}>or continue with email</Text>
        <View style={s.line} />
      </View>

      <View style={{ gap: 14 }}>
        <AuthInput
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); }}
          placeholder="you@university.edu"
          keyboardType="email-address"
          error={emailError}
          onSubmitEditing={onEmailSubmit}
          blurOnSubmit={false}
          autoFocus={true}
          editable={!loading}
          testID="login-email"
        />

        <AuthInput
          ref={pwdRef}
          label="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setPwdError(''); }}
          placeholder="Enter your password"
          secureTextEntry={!showPwd}
          error={pwdError}
          editable={!loading}
          rightSlot={
            <Pressable onPress={() => setShowPwd((v) => !v)} style={{ paddingHorizontal: 6 }} testID="login-show-password" accessibilityRole="button" accessibilityLabel={showPwd ? "Hide password" : "Show password"}>
              {showPwd ? <EyeOff size={16} color={AC.muted} /> : <Eye size={16} color={AC.muted} />}
            </Pressable>
          }
          onSubmitEditing={onLogin}
          testID="login-password"
        />

      </View>

      <View style={s.row}>
        <View />
        <Pressable onPress={() => router.push('/(auth)/forgot-password')} testID="login-forgot-password">
          <Text style={s.forgot}>Forgot password?</Text>
        </Pressable>
      </View>

      <PrimaryButton label="Sign in" onPress={onLogin} loading={loading} testID="login-submit" />

      <Text style={s.signup}>
        New to Student Alumni?{' '}
        <Text style={s.signupLink} onPress={() => router.push('/get-started')} testID="login-get-started">Get started</Text>
      </Text>

      
    </AuthShell>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 18, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  backText: { color: '#6B7280', fontFamily: FONTS.med, fontSize: 13 },

  head: { marginBottom: 22 },
  roleStripe: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.10)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)', marginBottom: 18 },
  roleEmoji: { fontSize: 14 },
  roleText: { color: '#7C3AED', fontFamily: FONTS.bold, fontSize: 12 },
  title: { color: '#111827', fontFamily: FONTS.xbold, fontSize: 30, letterSpacing: -0.6, marginBottom: 6 },
  sub: { color: '#6B7280', fontFamily: FONTS.med, fontSize: 15 },

  oauthRow: { flexDirection: 'row', gap: 12, marginBottom: 18, width: '100%' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  forgot: { color: '#7C3AED', fontFamily: FONTS.bold, fontSize: 13, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },

  signup: { textAlign: 'center', color: '#374151', fontFamily: FONTS.med, fontSize: 13, marginTop: 18 },
  signupLink: { color: '#7C3AED', fontFamily: FONTS.bold, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },

});
