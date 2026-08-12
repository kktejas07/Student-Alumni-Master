/**
 * /super-admin — auth gate for every nested segment route.
 *
 * Renders children (index redirect + catch-all portal) only after auth init
 * and role check. Guards /super-admin, /super-admin/newsletter, etc.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function SuperAdminLayoutRoute() {
  const router = useRouter();
  const user        = useAuthStore((s) => s.user);
  const loading     = useAuthStore((s) => s.loading);
  const initialized = useAuthStore((s) => s.initialized);
  const init        = useAuthStore((s) => s.init);

  useEffect(() => { if (!initialized) init(); }, [initialized, init]);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/login?redirect=/super-admin');
      return;
    }
    const role = String(user.role || '').toLowerCase();
    if (!['admin', 'super_admin'].includes(role)) {
      router.replace('/login?redirect=/super-admin');
    }
  }, [initialized, user]);

  if (!initialized || loading) {
    return (
      <View style={s.gate}>
        <ActivityIndicator size="small" color="#F59E0B" />
        <Text style={s.gateText}>Authenticating…</Text>
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
  gate: { flex: 1, backgroundColor: '#0F0A05', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gateText: { color: '#C4A788', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
});