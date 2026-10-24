import { Stack } from 'expo-router';
import { usePathname } from 'expo-router';
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
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { ActivityIndicator, LogBox, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Colors } from '@/src/theme';
import { ToastProvider, ConfirmProvider } from '@/src/views/components';
import { SAModernLoader } from '@/src/views/components/SAModernLoader';
import { GlobalTopProgressBar } from '@/src/views/web/components/AppLoader';
import '@/src/views/web/components/UniversalMotionTransition';
import analytics, { AnalyticsRoot, AnalyticsErrorBoundary } from '@/src/analytics';
import { AgentKQuickLauncher } from '@/src/views/web/agent-k/AgentKQuickLauncher';
import { ConsentBanner } from '@/src/views/web/consent/ConsentBanner';
import { TourProvider } from '@/src/views/web/tour/TourProvider';
import { TourOverlay } from '@/src/views/web/tour/TourOverlay';
import { AnnouncementPopup } from '@/src/views/web/components/AnnouncementPopup';
import { initGlobalErrorLogger } from '@/src/utils/globalErrorLogger';
import { ThemeProvider } from '@/src/theme/ThemeContext';

LogBox.ignoreLogs(['6000ms timeout exceeded', 'fontfaceobserver']);
// `window` exists on React Native too (it is a global alias), so every DOM
// touch below must be additionally guarded by Platform.OS === 'web'.
const IS_WEB_DOM = Platform.OS === 'web' && typeof window !== 'undefined';
if (IS_WEB_DOM) {
  initGlobalErrorLogger();
}

if (IS_WEB_DOM && typeof window.addEventListener === 'function') {
  window.addEventListener('error', (e) => {
    if (e.message?.includes('6000ms timeout exceeded')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
  
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('6000ms timeout exceeded')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
}

if (IS_WEB_DOM) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const isTimeout = args.some(arg => 
      (typeof arg === 'string' && arg.includes('6000ms timeout exceeded')) ||
      (arg && arg.message && arg.message.includes('6000ms timeout exceeded'))
    );
    if (isTimeout) return;
    originalConsoleError(...args);
  };
}
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
    PlusJakartaSans_800ExtraBold: Manrope_800ExtraBold,
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

  // Global theme transition — smooth light/dark switch for all themed elements
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const KEY = 'sa-theme-transition-css';
    if (document.getElementById(KEY)) return;
    const s = document.createElement('style');
    s.id = KEY;
    s.textContent = `\n      *, *::before, *::after {\n        transition-property: background-color, color, border-color, box-shadow, fill, stroke, opacity;\n        transition-duration: 0.3s;\n        transition-timing-function: ease;\n      }\n      /* Exclude animations and transforms to prevent jank */\n      [style*="animation"], [style*="transform"] {\n        transition-property: none !important;\n      }\n    `;
    document.head.appendChild(s);
  }, []);

  const pathname = usePathname();
  const [routeTransitioning, setRouteTransitioning] = useState(false);

  useEffect(() => {
    setRouteTransitioning(true);
    const t = setTimeout(() => setRouteTransitioning(false), 350);
    return () => clearTimeout(t);
  }, [pathname]);

  // Render the loader only on native platforms while auth is initializing
  // or native fonts are loading. On web, render immediately with zero blocking splash.
  if (Platform.OS !== 'web' && ((!fontsLoaded && !fontError) || !initialized)) {
    return <SAModernLoader subtitle="INITIALIZING ECOSYSTEM" />;
  }

  return (
    <AnalyticsErrorBoundary screenName="root_layout">
      <AnalyticsRoot>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
          <PaperProvider theme={SAPaperTheme}>
            <SafeAreaProvider>
              <ToastProvider>
                <ConfirmProvider>
                <TourProvider>
                  <StatusBar style="light" />
                  <GlobalTopProgressBar active={routeTransitioning} />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: Colors.background },
                      animation: 'slide_from_right',
                      animationDuration: 350,
                    }}
                  >
                    <Stack.Screen 
                      name="profile/[id]" 
                      options={{ 
                        presentation: 'transparentModal', 
                        animation: 'fade',
                        contentStyle: { backgroundColor: 'transparent' }
                      }} 
                    />
                  </Stack>
                  {/* Agent K — global Cmd/Ctrl+K quick launcher modal */}
                  <AgentKQuickLauncher />
                  {/* Phase B — privacy & cookie consent banner (web only) */}
                  <ConsentBanner />
                  {/* Phase B — product tour spotlight overlay (web only) */}
                  <TourOverlay />
                  {/* Global announcement popup (web only, feature-flagged via backend) */}
                  <AnnouncementPopup />
                </TourProvider>
                </ConfirmProvider>
              </ToastProvider>
            </SafeAreaProvider>
          </PaperProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </AnalyticsRoot>
    </AnalyticsErrorBoundary>
  );
}
