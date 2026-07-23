/**
 * /alumni-portal — True React Native port of the Alumni Dashboard.
 *
 * Mirrors the Student Portal architecture and view set, themed in orange
 * per the alumni onboarding color schema. Feeds will diverge per business
 * logic in a follow-up pass (CGPA + last organization driven).
 */
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { AlumniPortalRN } from '@/src/views/web/portals/alumni/AlumniPortalRN';

export default function AlumniPortalRoute() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login');
    }
  }, [user, initialized, router]);

  if (!initialized || !user) return null;

  // Native + web both render the RN port directly — feature parity with student portal.
  return <AlumniPortalRN />;
}
