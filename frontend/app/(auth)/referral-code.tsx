import { getBaseUrl } from '@/src/lib/env';
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { ArrowLeft, Gift } from 'lucide-react-native';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, OutlineButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth } from '@/src/lib/authAnalytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = getBaseUrl();

export default function ReferralCode() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Enter your referral code or skip for now.');
      return;
    }
    setError('');
    setLoading(true);
    trackAuth({ event: 'referral_applied' as any, extra: { code: trimmed } });
    try {
      await AsyncStorage.setItem('sa_referral_code', trimmed);
      await fetch(`${BASE}/api/referrals/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      }).catch(() => {});
      router.replace('/onboarding' as any);
    } catch {
      setError('Could not apply code. Try again or skip.');
    } finally {
      setLoading(false);
    }
  };

  const onSkip = () => {
    trackAuth({ event: 'referral_skipped' as any });
    router.replace('/onboarding' as any);
  };

  return (
    <AuthShell role={role as any}>
      <Pressable
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(auth)/login');
          }
        }}
        className="flex-row items-center"
        style={{ gap: 4, marginBottom: 14 }}
      >
        <ArrowLeft size={16} color="#6B7280" />
        <Text style={{ color: '#374151', fontFamily: FONTS.med, fontSize: 13 }}>Back</Text>
      </Pressable>

      <View className="items-center" style={{ marginBottom: 20 }}>
        <View className="items-center justify-center rounded-full" style={{ width: 72, height: 72, backgroundColor: 'rgba(124,58,237,0.18)', borderColor: 'rgba(124,58,237,0.4)', borderWidth: 1.5 }}>
          <Gift size={28} color="#B07FDF" />
        </View>
      </View>

      <View className="items-center" style={{ marginBottom: 20 }}>
        <Text className="text-text font-display-bold" style={{ fontSize: 26, marginBottom: 8, textAlign: 'center' }}>Have a referral code?</Text>
        <Text className="text-muted" style={{ fontFamily: FONTS.med, fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 10 }}>
          Enter your referral code to unlock exclusive benefits and bonus credits
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        <AuthInput
          label="Referral code"
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase()); setError(''); }}
          placeholder="e.g. SAFAM2025"
          autoCapitalize="characters"
          error={error}
          onSubmitEditing={onApply}
        />
        <PrimaryButton label="Apply Code" onPress={onApply} loading={loading} />
        <OutlineButton label="Skip for now" onPress={onSkip} />
      </View>
    </AuthShell>
  );
}
