/**
 * /mentor-portal — auth gate for every nested segment route.
 *
 * Guards /mentor-portal, /mentor-portal/sessions, etc. Only authenticated
 * users reach the portal; everyone else bounces to /login.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { portalPathForRole, rolesForPortal } from '@/src/lib/portalHome';

export default function MentorPortalLayoutRoute() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    const role = String(user.role || '').toLowerCase();
    if (!rolesForPortal('mentor').includes(role)) {
      router.replace(portalPathForRole(role) as any);
    }
  }, [user, initialized, router]);

  if (!initialized) {
    return (
      <View style={s.gate}>
        <ActivityIndicator size="small" color="#14B8A6" />
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
  gate: { flex: 1, backgroundColor: '#071412', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gateText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
});