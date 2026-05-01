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
          {active === 'dashboard'   && <DashboardView />}
          {active === 'career-ai'   && <StubView title="Career AI"          note="Roadmap planner, resume builder, mock interview — the standalone version is already live." deepLink="/career-ai" />}
          {active === 'internships' && <StubView title="Internships & Jobs" note="Job board with smart matching across LinkedIn, Internshala, Naukri — coming next." />}
          {active === 'network'     && <StubView title="Network"             note="Alumni discovery, group chats, knowledge rooms — coming next." />}
          {active === 'events'      && <StubView title="Events"              note="Hackathons, masterclasses, fests — the catalog page is live." />}
          {active === 'financial'   && <StubView title="Financial"           note="Scholarships, loans, education insurance." deepLink="/financial" />}
          {active === 'deals'       && <StubView title="Deals & Offers"      note="Student-only discounts on tools and food." deepLink="/deals" />}
          {active === 'wallet'      && <StubView title="SA Wallet"           note="Top-up balance, refer & earn, transaction history — coming next." />}
          {active === 'higher-ed'   && <StubView title="Higher Education"    note="Universities, GRE/GMAT/IELTS prep, application tracker." deepLink="/higher-education" />}
          {active === 'rentals'     && <StubView title="Rentals"             note="Student-friendly accommodation listings." deepLink="/rentals" />}
          {active === 'profile'     && <StubView title="Profile"             note="Digital ID, achievements, badges — coming next." />}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SC.bg, height: '100%' as any },
});
