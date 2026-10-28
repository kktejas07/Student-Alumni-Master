/**
 * /student-portal — auth gate for every nested segment route.
 *
 * Guards /student-portal, /student-portal/events, etc. Only logged-in users
 * reach the portal; everyone else bounces to /login.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { portalPathForRole, rolesForPortal } from '@/src/lib/portalHome';

import { SAModernLoader } from '@/src/views/components/SAModernLoader';

export default function StudentPortalLayoutRoute() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    if (!user) {
      router.replace('/login');
      return;
    }
    const role = String(user.role || '').toLowerCase();
    if (!rolesForPortal('student').includes(role)) {
      router.replace(portalPathForRole(role) as any);
    }
  }, [user, initialized, router]);

  return <Slot />;
}

const s = StyleSheet.create({
  gate: { flex: 1, backgroundColor: '#030614', alignItems: 'center', justifyContent: 'center', gap: 10 },
  gateText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
});