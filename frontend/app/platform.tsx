/**
 * Web-only authenticated platform shell.
 *
 * Routes the user to the appropriate role-specific sidebar dashboard:
 *   - student / alumni → StudentPlatform
 *   - mentor          → MentorPlatform
 *   - college / admin → CollegePlatform
 *
 * On native (iOS/Android) this route is a no-op redirect to /(tabs).
 * The mobile experience continues to use the existing tab navigator.
 */
import React, { useEffect } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Colors as C } from '@/src/theme';
import StudentPlatform from '@/src/views/web/platform/StudentPlatform';
import MentorPlatform from '@/src/views/web/platform/MentorPlatform';
import CollegePlatform from '@/src/views/web/platform/CollegePlatform';

export default function PlatformRoute() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  // On native, send the user back to their mobile tab home.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/(tabs)');
    }
  }, [router]);

  // Auth gate — if not signed in, send to landing.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!initialized) return;
    if (!user) router.replace('/welcome');
    else if (!user.onboarding_completed) router.replace('/(onboarding)/role-info');
  }, [user, initialized, router]);

  if (Platform.OS !== 'web') return null;

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A0438' }}>
        <ActivityIndicator color={C.white} />
      </View>
    );
  }

  switch (user.role) {
    case 'mentor':
      return <MentorPlatform />;
    case 'college':
    case 'admin':
      return <CollegePlatform />;
    case 'student':
    case 'alumni':
    default:
      return <StudentPlatform />;
  }
}
