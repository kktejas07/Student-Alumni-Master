import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function ProfileRedirect() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
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

    router.replace(`${path}?tab=profile` as any);
  }, [router, user]);

  return null;
}
