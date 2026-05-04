/**
 * Student Portal — outer shell. All sidebar items render INSIDE this shell.
 *
 * Feature pages (Courses / Rentals / Financial / Higher-Ed / Deals / etc.)
 * are imported as components and rendered inline via EmbeddedShellContext —
 * which makes their inner FeaturePageShell skip its own sidebar/gradient
 * and just render the hero + content. SPA-style navigation, no redirects.
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { SC } from './tokens';
import { Sidebar, StudentNavId } from './Sidebar';
import { TopBar } from './TopBar';
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

export function StudentPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<StudentNavId>('dashboard');

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  // All sidebar clicks now render inline — no router.push detours.
  const handleNav = (id: StudentNavId) => setActive(id);

  return (
    <View style={s.shell}>
      <Sidebar active={active} onNav={handleNav} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar />
        <ScrollView
          style={{ flex: 1, backgroundColor: SC.bg }}
          contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <EmbeddedShellContext.Provider value={true}>
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
          </EmbeddedShellContext.Provider>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SC.bg, height: '100%' as any },
});
