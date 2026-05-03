/**
 * Referral Code — per HTML spec screen "Referral Code".
 *
 * Users can enter a referral/invite code to unlock bonus credits.
 * This screen is optional — Skip for now routes to the next step.
 * Typically shown after Register but before Onboarding.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { ArrowLeft, Gift } from 'lucide-react-native';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, OutlineButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth } from '@/src/lib/authAnalytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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
      // Persist locally for backend to consume later during onboarding-complete.
      await AsyncStorage.setItem('sa_referral_code', trimmed);
      // Best-effort call — endpoint may not exist yet; frontend UX still works.
      await fetch(`${BASE}/api/referrals/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      }).catch(() => {});
      // Route by role — students get the spec-compliant 7-step wizard,
      // mentors get the spec-compliant 8-step wizard, alumni get the
      // 6-step wizard, others use the shorter flat quick-setup form.
      const dest =
        role === 'student' ? '/(onboarding)/student-onboard' :
        role === 'mentor'  ? '/(onboarding)/mentor-onboard'  :
        role === 'alumni'  ? '/(onboarding)/alumni-onboard'  :
        role === 'college' ? '/(onboarding)/college-onboard' :
        '/(onboarding)/quick-setup';
      router.replace(dest as any);
    } catch {
      setError('Could not apply code. Try again or skip.');
    } finally {
      setLoading(false);
    }
  };

  const onSkip = () => {
    trackAuth({ event: 'referral_skipped' as any });
    const dest =
      role === 'student' ? '/(onboarding)/student-onboard' :
      role === 'mentor'  ? '/(onboarding)/mentor-onboard'  :
      '/(onboarding)/quick-setup';
    router.replace(dest as any);
  };

  return (
    <AuthShell role={role as any}>
      <Pressable onPress={() => router.back()} style={s.back}>
        <ArrowLeft size={16} color={AC.muted} />
        <Text style={s.backText}>Back</Text>
      </Pressable>

      <View style={s.giftWrap}>
        <View style={s.giftCircle}>
          <Gift size={28} color="#B07FDF" />
        </View>
      </View>

      <View style={s.head}>
        <Text style={s.title}>Have a referral code?</Text>
        <Text style={s.sub}>
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

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backText: { color: AC.muted, fontFamily: FONTS.med, fontSize: 13 },
  giftWrap: { alignItems: 'center', marginBottom: 20 },
  giftCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.4)', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  head: { marginBottom: 20, alignItems: 'center' },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 26, marginBottom: 8, textAlign: 'center' },
  sub: {
    color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 14,
    lineHeight: 20, textAlign: 'center', paddingHorizontal: 10,
  },
});
