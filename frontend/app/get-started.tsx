/**
 * Get Started — Role Selection screen
 * ====================================
 * Entry point of the new auth flow. Pixel-matched to the SA Auth Flow HTML spec.
 * Wraps RoleCards in the responsive 2-pane AuthShell.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { RoleCards, ROLE_META, type Role } from '@/src/views/auth/RoleCards';
import { PrimaryButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth } from '@/src/lib/authAnalytics';

export default function GetStarted() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    // Fingerprint device on entry (silent event)
    trackAuth({ event: 'role_selected', extra: { _silent: true, action: 'visit_get_started' } });
  }, []);

  const onSelect = (r: Role) => {
    setRole(r);
    trackAuth({ event: 'role_selected', role: r });
  };

  const onContinue = async () => {
    if (!role) return;
    try { await AsyncStorage.setItem('sa_chosen_role', role); } catch {}
    // User clicked "Get Started" → primary intent is to CREATE a new account.
    // Route to register (not login) with the chosen role pre-selected.
    router.push({ pathname: '/(auth)/register', params: { role } });
  };

  return (
    <AuthShell>
      <View style={s.head}>
        <Text style={s.title}>Get started</Text>
        <Text style={s.sub}>I am joining Student Alumni as a...</Text>
      </View>

      <RoleCards value={role} onChange={onSelect} />

      <PrimaryButton
        label={role ? `Continue as ${ROLE_META[role].label} →` : 'Continue as ... →'}
        onPress={onContinue}
        disabled={!role}
      />

      <Text style={s.terms}>
        By continuing you agree to our{' '}
        <Text style={s.link}>Terms</Text> & <Text style={s.link}>Privacy Policy</Text>
      </Text>

      <View style={s.signinRow}>
        <Text style={s.signinText}>Already have an account?</Text>
        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text style={s.signinLink}>Sign in</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  head: { marginBottom: 28 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 30, letterSpacing: -0.6, marginBottom: 6 },
  sub: { color: AC.muted, fontFamily: FONTS.med, fontSize: 15 },

  terms: { textAlign: 'center', color: AC.dim, fontFamily: FONTS.med, fontSize: 12, marginTop: 14, lineHeight: 18 },
  link: { color: AC.muted, ...(Platform.OS === 'web' ? ({ textDecorationLine: 'underline', cursor: 'pointer' } as any) : {}) },

  signinRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 22 },
  signinText: { color: AC.muted, fontFamily: FONTS.med, fontSize: 13 },
  signinLink: { color: AC.primaryL, fontFamily: FONTS.bold, fontSize: 13, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
});
