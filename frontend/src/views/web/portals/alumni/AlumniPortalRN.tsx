/**
 * Alumni Portal — outer shell. Mirrors StudentPortalRN structure with the
 * orange theme tokens. Identical view set (Dashboard, Network, Events,
 * Profile, etc.); the feeds inside diverge per business logic later.
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
// Reuse the shared role-aware ProfileSettingsView (stays purple per user spec).
import { ProfileSettingsView } from '../student/views/ProfileSettingsView';
import { WalletView } from './views/WalletView';
import { MyBookingsView } from './views/MyBookingsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { MyWorkshopsView } from './views/MyWorkshopsView';

export function AlumniPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<StudentNavId>('dashboard');

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  return (
    <View style={s.shell}>
      <Sidebar active={active} onNav={setActive} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar />
        <ScrollView
          style={{ flex: 1, backgroundColor: SC.bg }}
          contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {active === 'dashboard'       && <DashboardView />}
          {active === 'career-ai'       && <StubView title="Alumni Tools"        note="Mentor matchmaker, alumni-only AMAs and curated content." deepLink="/career-ai" />}
          {active === 'internships'     && <InternshipsView />}
          {active === 'my-applications' && <MyApplicationsView />}
          {active === 'network'         && <NetworkView />}
          {active === 'my-bookings'     && <MyBookingsView />}
          {active === 'events'          && <EventsView />}
          {active === 'my-workshops'    && <MyWorkshopsView />}
          {active === 'financial'       && <StubView title="Donations & Giving"  note="Endow scholarships, fund research, support your alma mater." deepLink="/financial" />}
          {active === 'deals'           && <StubView title="Alumni Deals"        note="Exclusive alumni-only discounts on tools and travel." deepLink="/deals" />}
          {active === 'wallet'          && <WalletView />}
          {active === 'higher-ed'       && <StubView title="Continuing Education" note="Executive programs, MBAs, online cohorts at partner schools." deepLink="/higher-education" />}
          {active === 'rentals'         && <StubView title="Housing Network"     note="Connect with fellow alumni for short-stay or relocation help." deepLink="/rentals" />}
          {active === 'profile'         && <ProfileSettingsView />}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SC.bg, height: '100%' as any },
});
