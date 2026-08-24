import { getBaseUrl } from '@/src/lib/env';
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth } from '@/src/lib/authAnalytics';

const BASE = getBaseUrl();

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
      <Pressable onPress={() => router.back()} className="flex-row items-center" style={{ gap: 4, marginBottom: 8 }}>
        <ArrowLeft size={16} color={AC.muted} />
        <Text style={{ color: AC.muted, fontFamily: FONTS.med, fontSize: 13 }}>Back</Text>
      </Pressable>

      <View style={{ marginBottom: 20 }}>
        <Text className="text-text font-display-bold" style={{ fontSize: 26, marginBottom: 8 }}>Sign in with Email OTP</Text>
        <Text className="text-muted" style={{ fontFamily: FONTS.med, fontSize: 14, lineHeight: 20 }}>
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
          testID="otp-email"
        />
        <PrimaryButton label="Send OTP Code" onPress={onSend} loading={loading} testID="otp-send-code" />
      </View>

      <View className="items-center" style={{ marginTop: 24 }}>
        <Pressable onPress={() => router.replace('/(auth)/email-detect')}>
          <Text style={{ color: '#B07FDF', fontFamily: FONTS.med, fontSize: 13 }}>← Back to login options</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}
