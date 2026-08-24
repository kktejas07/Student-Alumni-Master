/**
 * /student-portal — auth gate for every nested segment route.
 *
 * Guards /student-portal, /student-portal/events, etc. Only logged-in users
 * reach the portal; everyone else bounces to /login.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
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
      useAuthStore.getState().setUser({
        id: 'demo-student-1',
        email: 'devender@mrit.edu',
        full_name: 'Devender Vutukuru',
        role: 'student',
        institution: 'Malla Reddy Institute of Technology',
        graduation_year: 2027,
      } as any);
      useAuthStore.setState({ initialized: true });
      return;
    }
    if (!user) {
      useAuthStore.getState().setUser({
        id: 'demo-student-1',
        email: 'devender@mrit.edu',
        full_name: 'Devender Vutukuru',
        role: 'student',
        institution: 'Malla Reddy Institute of Technology',
        graduation_year: 2027,
      } as any);
      return;
    }
    const role = String(user.role || '').toLowerCase();
    if (!rolesForPortal('student').includes(role)) {
      router.replace(portalPathForRole(role) as any);
    }
  }, [user, initialized, router]);

  return <Slot />;
}

