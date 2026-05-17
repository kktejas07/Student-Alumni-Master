import { Stack } from 'expo-router';
import { usePathname } from 'expo-router';
import AppFooter from '@/src/views/web/AppFooter';

// Routes where the footer should appear
const FOOTER_ROUTES = ['/', '/login', '/register', '/policy/', '/faq', '/about', '/contact', '/intro', '/welcome', '/forgot-password'];
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Colors } from '@/src/theme';
import { ToastProvider } from '@/src/views/components';
import analytics from '@/src/lib/analytics';
import { AgentKQuickLauncher } from '@/src/views/web/agent-k/AgentKQuickLauncher';

// Material 3 theme — overrides primary/secondary to brand purple. This means
// all react-native-paper components (Surface, Card, Button, Ripple) will pick
// up the SA brand automatically.
const m3FontConfig = {
  fontFamily: 'DMSans_500Medium',
};
const SAPaperTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: m3FontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.brandPurple,
    onPrimary: Colors.white,
    primaryContainer: Colors.palePurple,
    onPrimaryContainer: Colors.deepPurple,
    secondary: Colors.midPurple,
    onSecondary: Colors.white,
    secondaryContainer: Colors.paleLavender,
    onSecondaryContainer: Colors.deepPurple,
    surface: Colors.surface,
    surfaceVariant: Colors.palePurple,
    background: Colors.background,
    onSurface: Colors.textPrimary,
    onSurfaceVariant: Colors.textSecondary,
    outline: Colors.border,
  },
};

export default function RootLayout() {
  const pathname = usePathname();
  const showFooter = ['/', '/login', '/register', '/policy/', '/faq', '/about', '/contact', '/intro', '/welcome', '/forgot-password'].some((r) => pathname.startsWith(r));
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    // FinTax360 / Student-portal glass theme typography
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    PlusJakartaSans_400Regular: Manrope_400Regular,
    PlusJakartaSans_500Medium: Manrope_500Medium,
    PlusJakartaSans_600SemiBold: Manrope_600SemiBold,
    PlusJakartaSans_700Bold: Manrope_700Bold,
    JetBrainsMono_400Regular: require('../assets/fonts/SpaceMono-Regular.ttf'),
    JetBrainsMono_500Medium: require('../assets/fonts/SpaceMono-Regular.ttf'),
    JetBrainsMono_600SemiBold: require('../assets/fonts/SpaceMono-Regular.ttf'),
    JetBrainsMono_700Bold: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    init();
    // Boot the analytics stack — gracefully no-ops if env keys are missing.
    analytics.init();
  }, [init]);

  // Render the loader only while fonts are still loading AND haven't errored.
  // If fonts fail to load (e.g. network / CDN issue on web), fall back to
  // system fonts instead of blocking the entire app indefinitely.
  if ((!fontsLoaded && !fontError) || !initialized) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.deepPurple,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={SAPaperTheme}>
        <SafeAreaProvider>
          <ToastProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
                animation: 'slide_from_right',
                animationDuration: 280,
              }}
            />
            {showFooter && <AppFooter />}
            {/* Agent K — global Cmd/Ctrl+K quick launcher modal */}
            <AgentKQuickLauncher />
          </ToastProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
