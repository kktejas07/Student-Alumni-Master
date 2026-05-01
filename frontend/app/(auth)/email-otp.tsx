/**
 * Email OTP — per HTML spec screen "Email OTP".
 *
 * Standalone entry point for passwordless sign-in via email OTP (different
 * from the 2FA email-verify flow).
 *
 * Flow:
 *   1. User enters email + clicks Send OTP Code
 *   2. Backend sends a 6-digit code (re-uses existing OTP infra — placeholder)
 *   3. We forward the user to /(auth)/email-verify which renders the code
 *      input UI + verify/resend controls.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth } from '@/src/lib/authAnalytics';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function EmailOTP() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState((params.email as string) || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    trackAuth({ event: 'otp_sent', email: trimmed });
    try {
      // Best-effort call — if backend endpoint exists we use it; otherwise we
      // still forward to the verify screen which has its own mock OTP flow.
      await fetch(`${BASE}/api/auth/email-otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      }).catch(() => {});
      router.push({ pathname: '/(auth)/email-verify', params: { email: trimmed, mode: 'otp' } });
    } catch {
      setError('Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Pressable onPress={() => router.back()} style={s.back}>
        <ArrowLeft size={16} color={AC.muted} />
        <Text style={s.backText}>Back</Text>
      </Pressable>

      <View style={s.head}>
        <Text style={s.title}>Sign in with Email OTP</Text>
        <Text style={s.sub}>
          Enter your email and we'll send a one-time code to sign you in — no password needed.
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        <AuthInput
          label="Email address"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          placeholder="you@college.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          error={error}
          onSubmitEditing={onSend}
        />
        <PrimaryButton label="Send OTP Code" onPress={onSend} loading={loading} />
      </View>

      <View style={s.footerRow}>
        <Pressable onPress={() => router.replace('/(auth)/email-detect')}>
          <Text style={s.linkText}>← Back to login options</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { color: AC.muted, fontFamily: FONTS.med, fontSize: 13 },
  head: { marginBottom: 20 },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 8 },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 14, lineHeight: 20 },
  footerRow: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#B07FDF', fontFamily: FONTS.med, fontSize: 13 },
});
