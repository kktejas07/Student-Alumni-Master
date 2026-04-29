/**
 * Root layout: loads fonts, mounts auth bootstrap, sets up navigation.
 */
import { Stack } from 'expo-router';
import { useFonts, Outfit_700Bold, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from '@expo-google-fonts/manrope';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Colors } from '@/src/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
  });

  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    init();
  }, [init]);

  if (!fontsLoaded || !initialized) {
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

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.light.background } }} />
    </SafeAreaProvider>
  );
}
