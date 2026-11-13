import { Stack } from 'expo-router';
import '@/global.css';
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
import { ActivityIndicator, LogBox, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
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
import { ThemeProvider, useTheme } from '@/src/theme/ThemeContext';

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
function ThemeAwareApplication({ routeTransitioning }: { routeTransitioning: boolean }) {
  const { theme, isDark } = useTheme();
  const paperTheme = useMemo(() => ({
    ...MD3LightTheme,
    dark: isDark,
    fonts: configureFonts({ config: m3FontConfig }),
    colors: {
      ...MD3LightTheme.colors,
      primary: '#7C3AED',
      onPrimary: '#FFFFFF',
      primaryContainer: theme.bgInset,
      onPrimaryContainer: theme.text,
      secondary: '#7B3DBF',
      onSecondary: '#FFFFFF',
      secondaryContainer: theme.bgInset,
      onSecondaryContainer: theme.text,
      surface: theme.bgElevated,
      surfaceVariant: theme.bgInset,
      background: theme.bg,
      onSurface: theme.text,
      onSurfaceVariant: theme.textSec,
      outline: theme.hairline,
    },
  }), [isDark, theme]);

  return (
    <PaperProvider theme={paperTheme}>
      <SafeAreaProvider>
        <ToastProvider>
          <ConfirmProvider>
            <TourProvider>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <GlobalTopProgressBar active={routeTransitioning} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: theme.bg },
                  animation: 'slide_from_right',
                  animationDuration: 350,
                }}
              >
                <Stack.Screen
                  name="profile/[id]"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
              </Stack>
              <AgentKQuickLauncher />
              <ConsentBanner />
              <TourOverlay />
              <AnnouncementPopup />
            </TourProvider>
          </ConfirmProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

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
    // Mono — one bundled weight (see src/theme/typography.ts)
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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
          <ThemeAwareApplication routeTransitioning={routeTransitioning} />
          </ThemeProvider>
        </GestureHandlerRootView>
      </AnalyticsRoot>
    </AnalyticsErrorBoundary>
  );
}
