/**
 * Alumni Portal — outer shell. Mirrors StudentPortalRN behaviour with the
 * orange theme tokens. All sidebar items render INSIDE this shell via the
 * EmbeddedShellContext (no router redirects).
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { SC } from './tokens';
import { Sidebar, StudentNavId } from './Sidebar';
import { TopBar } from './TopBar';
import { DashboardView } from './views/DashboardView';
import { StubView } from './views/StubView';
import { EventsView } from './views/EventsView';
import { InternshipsView } from './views/InternshipsView';
import { NetworkView } from './views/NetworkView';
import { ProfileSettingsView } from '../student/views/ProfileSettingsView';
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

export function AlumniPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<StudentNavId>('dashboard');

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

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
            {active === 'career-ai'       && <StubView title="Alumni Tools" note="Mentor matchmaker, alumni-only AMAs and curated content." deepLink="/career-ai" />}
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
