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
    // Every role gets routed to its pixel-exact portal
    else if (user.role === 'admin') router.replace('/super-admin');
    else if (user.role === 'college') router.replace('/college-portal');
    else if (user.role === 'mentor') router.replace('/mentor-portal');
    else if (user.role === 'alumni') router.replace('/alumni-portal');
    else router.replace('/student-portal');
  }, [user, initialized, router]);

  if (Platform.OS !== 'web') return null;

  // While the redirect is in-flight, show a role-tinted loader so there's no flash
  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A0438' }}>
        <ActivityIndicator color={C.white} />
      </View>
    );
  }

  const loaderBg =
    user.role === 'mentor' ? '#071412' :
    (user.role === 'college' || user.role === 'admin') ? '#0A0A0F' :
    '#1A0438';
  const loaderColor =
    user.role === 'mentor' ? '#14B8A6' :
    (user.role === 'college' || user.role === 'admin') ? '#3B82F6' :
    '#A78BFA';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: loaderBg }}>
      <ActivityIndicator color={loaderColor} />
    </View>
  );
}
