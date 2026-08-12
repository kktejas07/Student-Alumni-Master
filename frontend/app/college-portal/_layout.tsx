/**
 * /college-portal — auth gate for every nested segment route.
 *
 * Guards /college-portal, /college-portal/students, etc. Only authenticated
 * users reach the portal; everyone else bounces to /login.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function CollegePortalLayoutRoute() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login');
    }
  }, [user, initialized, router]);

  if (!initialized) {
    return (
      <View style={s.gate}>
        <ActivityIndicator size="small" color="#34D399" />
      </View>
    );
  }
  if (!user) {
    return (
      <View style={s.gate}>
        <Text style={s.gateText}>Redirecting to login…</Text>
      </View>
    );
  }
  return <Slot />;
}

const s = StyleSheet.create({
  gate: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gateText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
});