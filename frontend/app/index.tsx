/**
 * Splash / Entry router - decides where to send the user based on auth state.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Colors } from '@/src/theme';

export default function Index() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/welcome');
    } else if (!user.onboarding_completed) {
      router.replace('/(onboarding)/role-info');
    } else {
      router.replace('/(tabs)');
    }
  }, [user, initialized, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.light.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="large" color={Colors.light.primary} />
    </View>
  );
}
