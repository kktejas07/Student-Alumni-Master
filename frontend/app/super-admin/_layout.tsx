/**
 * /super-admin — auth gate for every nested segment route.
 *
 * Renders children (index redirect + catch-all portal) only after auth init
 * and role check. Guards /super-admin, /super-admin/newsletter, etc.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { portalPathForRole } from '@/src/lib/portalHome';

import { SAModernLoader } from '@/src/views/components/SAModernLoader';

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
      router.replace(portalPathForRole(role) as any);
    }
  }, [initialized, user]);

  if (!initialized || loading) {
    return <SAModernLoader subtitle="AUTHENTICATING ADMIN ACCESS" />;
  }
  if (!user) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0F0A05', gap: 10 }}>
        <Text className="text-xs" style={{ color: '#C4A788', fontFamily: 'DMSans_500Medium' }}>Redirecting to login…</Text>
      </View>
    );
  }

  return <Slot />;
}

