/**
 * NativeLoginScreen — React Native email/password sign-in used on iOS/Android.
 *
 * The web login (`app/(auth)/login.tsx`) renders raw DOM (<style>, <div>) and
 * routes into the web portals. On native we render a plain RN form built from
 * the shared AuthShell / AuthInput primitives, sign in through the auth store
 * (api.login + secure token storage) and land users on the native tab bar.
 */
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { AuthShell } from './AuthShell';
import { AuthInput, PrimaryButton } from './AuthControls';
import { AC, FONTS } from './tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NativeLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState(String(params.email || ''));
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [formError, setFormError] = useState('');
  const submittingRef = useRef(false);

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    setEmailError('');
    setPwdError('');
    setFormError('');

    if (!EMAIL_RE.test(cleanEmail)) {
      setEmailError('Enter a valid email address');
      return;
    }
    if (!password) {
      setPwdError('Enter your password');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    try {
      const res: any = await login(cleanEmail, password);
      if (res?.requires_2fa) {
        router.push({
          pathname: '/(auth)/two-fa-challenge',
          params: {
            challenge_id: String(res.challenge_id || ''),
            user_email: String(res.user_email || cleanEmail),
            methods: (res.methods || ['totp']).join(','),
          },
        } as any);
        return;
      }
      if (res?.ok) {
        router.replace('/(tabs)' as any);
        return;
      }
      setFormError('Sign in failed. Please try again.');
    } catch (e: any) {
      const msg = String(e?.message || '');
      setFormError(
        /network|fetch|timeout/i.test(msg)
          ? 'Unable to reach the server. Check your connection and try again.'
          : msg || 'Invalid email or password.'
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Text style={s.title}>Welcome back</Text>
      <Text style={s.sub}>Sign in to continue to StudentAlumni.</Text>

      <View style={{ marginTop: 22, gap: 14 }}>
        <AuthInput
          label="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); setFormError(''); }}
          placeholder="you@university.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          editable={!loading}
          leftIcon={<Mail size={16} color={AC.muted} />}
          testID="login-email"
          accessibilityLabel="Email address"
        />
        <AuthInput
          label="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setPwdError(''); setFormError(''); }}
          placeholder="Your password"
          secureTextEntry={!showPwd}
          autoCapitalize="none"
          error={pwdError}
          editable={!loading}
          onSubmitEditing={submit}
          leftIcon={<Lock size={16} color={AC.muted} />}
          rightSlot={
            <Pressable
              onPress={() => setShowPwd((v) => !v)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? <EyeOff size={18} color={AC.muted} /> : <Eye size={18} color={AC.muted} />}
            </Pressable>
          }
          testID="login-password"
          accessibilityLabel="Password"
        />

        {formError ? (
          <Text style={s.error} accessibilityRole="alert" testID="login-error">{formError}</Text>
        ) : null}

        <PrimaryButton label="Sign in" onPress={submit} loading={loading} testID="login-submit" />

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password' as any)}
          style={s.linkRow}
          accessibilityRole="link"
          testID="login-forgot"
        >
          <Text style={s.link}>Forgot password?</Text>
        </Pressable>
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>New to StudentAlumni?</Text>
        <Pressable onPress={() => router.push('/(auth)/email-detect' as any)} accessibilityRole="link" testID="login-register">
          <Text style={s.footerLink}>Create an account</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  title: { color: AC.text, fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.4 },
  sub: { color: AC.textSub, fontFamily: FONTS.med, fontSize: 14, marginTop: 6, lineHeight: 20 },
  error: { color: AC.red, fontFamily: FONTS.med, fontSize: 13, lineHeight: 18 },
  linkRow: { alignSelf: 'flex-end', paddingVertical: 4 },
  link: { color: AC.primaryL, fontFamily: FONTS.bold, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 28 },
  footerText: { color: AC.muted, fontFamily: FONTS.med, fontSize: 13 },
  footerLink: { color: AC.primaryL, fontFamily: FONTS.bold, fontSize: 13 },
});
