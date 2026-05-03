/**
 * Student Portal — outer shell. Routes between Dashboard view and stubs
 * for the other 10 nav items. Mirrors MentorPortalRN structure.
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
import { CareerAIView } from './views/CareerAIView';
import { EventsView } from './views/EventsView';
import { InternshipsView } from './views/InternshipsView';
import { NetworkView } from './views/NetworkView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { WalletView } from './views/WalletView';
import { MyBookingsView } from './views/MyBookingsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { MyWorkshopsView } from './views/MyWorkshopsView';

export function StudentPortalRN() {
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
          {active === 'career-ai'       && <CareerAIView />}
          {active === 'internships'     && <InternshipsView />}
          {active === 'my-applications' && <MyApplicationsView />}
          {active === 'network'         && <NetworkView />}
          {active === 'my-bookings'     && <MyBookingsView />}
          {active === 'events'          && <EventsView />}
          {active === 'my-workshops'    && <MyWorkshopsView />}
          {active === 'financial'       && <StubView title="Financial"           note="Scholarships, loans, education insurance." deepLink="/financial" />}
          {active === 'deals'           && <StubView title="Deals & Offers"      note="Student-only discounts on tools and food." deepLink="/deals" />}
          {active === 'wallet'          && <WalletView />}
          {active === 'higher-ed'       && <StubView title="Higher Education"    note="Universities, GRE/GMAT/IELTS prep, application tracker." deepLink="/higher-education" />}
          {active === 'rentals'         && <StubView title="Rentals"             note="Student-friendly accommodation listings." deepLink="/rentals" />}
          {active === 'profile'         && <ProfileSettingsView />}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SC.bg, height: '100%' as any },
});
