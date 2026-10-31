import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { portalPathForRole } from '@/src/lib/portalHome';

export default function MeRedirectPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Native has no web portals — "me" is the Profile tab.
    if (Platform.OS !== 'web') {
      router.replace('/(tabs)/profile' as any);
      return;
    }
    const home = portalPathForRole(user.role);
    const tab = params.tab;
    if (home === '/student-portal' && tab) {
      router.replace(`/student-portal?tab=profile&ptab=${tab}` as any);
      return;
    }
    if (home === '/super-admin') {
      router.replace('/super-admin/settings/profile' as any);
      return;
    }
    router.replace(`${home}` as any);
  }, [params, router, user, initialized]);

  return null;
}
