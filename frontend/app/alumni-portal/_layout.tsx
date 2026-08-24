/**
 * /alumni-portal — auth gate for every nested segment route.
 *
 * Guards /alumni-portal, /alumni-portal/events, etc. Only logged-in users
 * reach the portal; everyone else bounces to /login.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { portalPathForRole, rolesForPortal } from '@/src/lib/portalHome';

import { SAModernLoader } from '@/src/views/components/SAModernLoader';

export default function AlumniPortalLayoutRoute() {
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
    if (!rolesForPortal('alumni').includes(role)) {
      router.replace(portalPathForRole(role) as any);
    }
  }, [user, initialized, router]);

  if (!initialized) {
    return <SAModernLoader subtitle="LOADING ALUMNI PORTAL" />;
  }
  if (!user) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#030614', gap: 10 }}>
        <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium' }}>Redirecting to login…</Text>
      </View>
    );
  }
  return <Slot />;
}

