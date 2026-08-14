/**
 * Native bottom tabs. On web these mobile screens are not used —
 * send people to their portal instead of the Expo tab shell.
 */
import { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, BookOpen, Users, User } from 'lucide-react-native';
import { Colors } from '@/src/theme';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { portalPathForRole } from '@/src/lib/portalHome';

const C = Colors.light;

export default function TabsLayout() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (Platform.OS !== 'web' || !initialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(portalPathForRole(user.role) as any);
  }, [initialized, user, router]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0f1e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#A78BFA" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopWidth: 2,
          borderTopColor: C.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 70,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="courses"
        options={{ title: 'Courses', tabBarIcon: ({ color }) => <BookOpen size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="network"
        options={{ title: 'Network', tabBarIcon: ({ color }) => <Users size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
