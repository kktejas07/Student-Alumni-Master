import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function MeRedirectPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const tab = params.tab;
    const role = user?.role || 'student';
    let path = '/student-portal';
    if (role === 'mentor') {
      path = '/mentor-portal';
    } else if (role === 'alumni') {
      path = '/alumni-portal';
    } else if (role === 'college') {
      path = '/college-portal';
    } else if (role === 'superadmin') {
      path = '/super-admin';
    }

    if (tab) {
      router.replace(`${path}?tab=profile&ptab=${tab}` as any);
    } else {
      router.replace(`${path}?tab=profile` as any);
    }
  }, [params, router, user]);

  return null;
}
