/**
 * College Admin Portal — outer shell.
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { CC } from './tokens';
import { Sidebar, CollegeNavId, NAV } from './Sidebar';
import { TopBar } from './TopBar';
import { DashboardView } from './views/DashboardView';
import { StubView } from './views/StubView';
import { StudentsView } from './views/StudentsView';
import { AlumniView } from './views/AlumniView';
import { MentorsView } from './views/MentorsView';
import { EventsView } from './views/EventsView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { AnalyticsView } from './views/AnalyticsView';
import { AIInsightsView } from './views/AIInsightsView';
import { CareerIntelView } from './views/CareerIntelView';
import { PlacementsView } from './views/PlacementsView';
import { ProfileView } from './views/ProfileView';
// Shared role-aware comprehensive profile view (purple theme, identical to student).
import { ProfileSettingsView as SharedProfileSettingsView } from '../student/views/ProfileSettingsView';
import { CreateEventView } from './views/CreateEventView';

export function CollegePortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<CollegeNavId>('dashboard');

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  const titleFor = (id: CollegeNavId) => NAV.find((n) => n.id === id)?.label || 'Dashboard';

  return (
    <View style={s.shell}>
      <Sidebar active={active} onNav={setActive} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar title={titleFor(active)} />
        <ScrollView
          style={{ flex: 1, backgroundColor: CC.bg }}
          contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {active === 'dashboard'    && <DashboardView />}
          {active === 'students'     && <StudentsView />}
          {active === 'alumni'       && <AlumniView />}
          {active === 'mentors'      && <MentorsView />}
          {active === 'events'       && <EventsView />}
          {active === 'create-event' && <CreateEventView />}
          {active === 'announcements'&& <AnnouncementsView />}
          {active === 'analytics'    && <AnalyticsView />}
          {active === 'ai-insights'  && <AIInsightsView />}
          {active === 'career-intel' && <CareerIntelView />}
          {active === 'placements'   && <PlacementsView />}
          {active === 'profile'      && <SharedProfileSettingsView roleOverride="college" />}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: CC.bg, height: '100%' as any },
});
