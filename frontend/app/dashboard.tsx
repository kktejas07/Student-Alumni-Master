import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { portalPathForRole } from '@/src/lib/portalHome';
import { COLORS } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export default function DashboardRoute() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    router.replace(
      (Platform.OS === 'web' ? portalPathForRole(user.role) : '/(tabs)') as any,
    );
  }, [initialized, router, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>Loading your dashboard...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: COLORS.textS,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
});
