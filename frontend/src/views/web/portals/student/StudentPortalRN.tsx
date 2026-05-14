/**
 * Student Portal — outer shell.
 *
 * Slice 2A migration: Apple HIG primitives applied.
 * • Wrapped in <ThemeProvider> so every nested view can call useTheme()
 * • Shell background follows theme (light #F5F5F7 / dark brand-purple)
 * • TopBar receives `scrolled` state for glass blur (kicks in past 8px)
 * • All existing routing, state, props, API calls preserved 1:1
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { ThemeProvider, useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP } from '@/src/theme/apple';
import { ToastProvider } from '@/src/motion/apple/toast';

import { Sidebar, StudentNavId } from './Sidebar';
import { TopBar } from './TopBar';
import { AnimatedAurora, GridOverlay, RouteTransition } from './glass';
import { PALETTE } from './tokens';
import { DashboardView } from './views/DashboardView';
import { CareerAIView } from './views/CareerAIView';
import { EventsView } from './views/EventsView';
import { InternshipsView } from './views/InternshipsView';
import { NetworkView } from './views/NetworkView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { MyBookingsView } from './views/MyBookingsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { MyWorkshopsView } from './views/MyWorkshopsView';

import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';

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
  const { theme } = useTheme();
  const bp = useBreakpoint();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<StudentNavId>('dashboard');
  const [scrolled, setScrolled] = useState(false);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };
  const handleNav = (id: StudentNavId) => setActive(id);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 8);
  };

  // Responsive page padding (page padding clamp 16 → 32)
  const padH = bp.isPhone ? SP.base : bp.atLeast('xl') ? SP.xxl : SP.lg;

  return (
    <View style={[s.shell, { backgroundColor: PALETTE.bg0 }]}>
      {/* Animated multicolor aurora behind everything */}
      <AnimatedAurora intensity="normal" />
      {/* 64px grid overlay (web only, radial-fade masked) */}
      <GridOverlay />

      <Sidebar active={active} onNav={handleNav} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar scrolled={scrolled} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: padH, paddingTop: SP.lg, paddingBottom: SP.giga }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <EmbeddedShellContext.Provider value={true}>
            <RouteTransition deps={[active]}>
              {active === 'dashboard'       && <DashboardView />}
              {active === 'career-ai'       && <CareerAIView />}
              {active === 'internships'     && <InternshipsView />}
              {active === 'my-applications' && <MyApplicationsView />}
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
          </EmbeddedShellContext.Provider>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', height: '100%' as any },
});
