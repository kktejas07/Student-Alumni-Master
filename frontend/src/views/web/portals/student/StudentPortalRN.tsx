/**
 * Student Portal — outer shell.
 *
 * Slice 2A migration: Apple HIG primitives applied.
 * • Wrapped in <ThemeProvider> so every nested view can call useTheme()
 * • Shell background follows theme (light #F5F5F7 / dark brand-purple)
 * • TopBar receives `scrolled` state for glass blur (kicks in past 8px)
 * • All existing routing, state, props, API calls preserved 1:1
 */
import React, { useState, createContext, useContext } from 'react';
import { View, ScrollView, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { ThemeProvider, useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP } from '@/src/theme/apple';
import { ToastProvider } from '@/src/motion/apple/toast';
import { useAutoTour } from '@/src/views/web/tour/TourProvider';

import { Sidebar, StudentNavId } from './Sidebar';
import { TopBar } from './TopBar';
import { AnimatedAurora, GridOverlay, RouteTransition, AiCopilotFab } from './glass';
import { StudentNotificationsPanel } from './views/NotificationsPanel';
import { PALETTE } from './tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { DashboardFooter } from '../../components/SponsorStrip';
import { PromoBanner } from '../../components/PromoBanner';
import { DashboardView } from './views/DashboardView';
import { CareerAIView } from './views/CareerAIView';
import { EventsView } from './views/EventsView';
import { InternshipsView } from './views/InternshipsView';
import { NetworkView } from './views/NetworkView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { MyBookingsView } from './views/MyBookingsView';
import { MyWorkshopsView } from './views/MyWorkshopsView';

import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';

// Navigation context for internal portal navigation
export const StudentPortalNavContext = createContext<{
  navigate: (id: StudentNavId, params?: { q?: string }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
} | null>(null);

export const useStudentPortalNav = () => {
  const ctx = useContext(StudentPortalNavContext);
  if (!ctx) throw new Error('useStudentPortalNav must be used inside StudentPortalRN');
  return ctx;
};

// Feature pages imported as components for inline rendering
import CoursesPage from '@/app/courses';
import RentalsPage from '@/app/rentals';
import FinancialPage from '@/app/financial';
import HigherEducationPage from '@/app/higher-education';
import DealsPage from '@/app/deals';
import WalletPage from '@/app/wallet';

/** Public component — wraps the inner shell with theme + toast providers. */
export function StudentPortalRN() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PortalShell />
      </ToastProvider>
    </ThemeProvider>
  );
}

function PortalShell() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { theme } = useTheme();
  const bp = useBreakpoint();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<StudentNavId>((tab as StudentNavId) || 'dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  // Phase B — auto-launch the Student portal tour on first visit
  useAutoTour('student');

  React.useEffect(() => {
    if (tab) {
      setActive(tab as StudentNavId);
    }
  }, [tab]);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };
  const handleNav = (id: StudentNavId, params?: { q?: string }) => {
    setActive(id);
    if (params && typeof params.q === 'string') {
      setSearchQuery(params.q);
    }
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 8);
  };

  // Responsive page padding (page padding clamp 16 → 32)
  const padH = bp.isPhone ? SP.base : bp.atLeast('xl') ? SP.xxl : SP.lg;

  return (
    <View style={[s.shell, { backgroundColor: PALETTE.bg0 }]}>
      {/* Body gradient — deep navy → midnight (per FinTax360 Jewel spec) */}
      <LinearGradient
        pointerEvents="none"
        colors={[PALETTE.bg0, PALETTE.bg2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      {/* Animated multicolor aurora behind everything */}
      <AnimatedAurora intensity="normal" />
      {/* 64px grid overlay (web only, radial-fade masked) */}
      <GridOverlay />

      <Sidebar active={active} onNav={handleNav} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <StudentPortalNavContext.Provider value={{ navigate: handleNav, searchQuery, setSearchQuery }}>
            <TopBar scrolled={scrolled} activeView={active} onAvatarPress={() => handleNav('profile')} onBellPress={() => setShowNotifs(!showNotifs)} />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: padH, paddingTop: SP.lg, paddingBottom: SP.giga }}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              <EmbeddedShellContext.Provider value={true}>
                {active !== 'internships' && <PromoBanner portal="student" />}
                <RouteTransition deps={[active]}>
                  {active === 'dashboard'       && <DashboardView />}
                  {active === 'career-ai'       && <CareerAIView />}
                  {active === 'internships'     && <InternshipsView />}
                  {active === 'network'         && <NetworkView />}
                  {active === 'my-bookings'     && <MyBookingsView />}
                  {active === 'events'          && <EventsView />}
                  {active === 'my-workshops'    && <MyWorkshopsView />}
                  {active === 'courses'         && <CoursesPage />}
                  {active === 'financial'       && <FinancialPage />}
                  {active === 'deals'           && <DealsPage />}
                  {active === 'wallet'          && <WalletPage />}
                  {active === 'higher-ed'       && <HigherEducationPage />}
                  {active === 'rentals'         && <RentalsPage />}
                  {active === 'profile'         && <ProfileSettingsView />}
                </RouteTransition>
                <DashboardFooter portal="student" />
              </EmbeddedShellContext.Provider>
            </ScrollView>
          </StudentPortalNavContext.Provider>

          {/* Global AI Copilot FAB — visible on every Student screen */}
          <AiCopilotFab onPress={() => router.push('/agent-k')} />
        </View>
        {showNotifs && (
          <StudentNotificationsPanel
            onClose={() => setShowNotifs(false)}
            onOpenSettings={() => {
              handleNav('profile');
              setShowNotifs(false);
            }}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', height: '100%' as any },
});
