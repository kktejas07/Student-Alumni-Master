/**
 * Admin route group — gates non-admins.
 */
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function AdminLayoutRoute() {
  const router = useRouter();
  const { user, initialized } = useAuthStore();
  useEffect(() => {
    if (!initialized) return;
    if (!user) { router.replace('/login' as any); return; }
    if (user.role !== 'admin') router.replace('/' as any);
  }, [user, initialized]);
  return <Stack screenOptions={{ headerShown: false }} />;
}
