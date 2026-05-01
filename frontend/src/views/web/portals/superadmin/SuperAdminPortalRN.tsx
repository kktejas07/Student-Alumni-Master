/**
 * Super Admin Portal — outer shell.
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { SAC } from './tokens';
import { Sidebar, SuperAdminNavId, NAV } from './Sidebar';
import { TopBar } from './TopBar';
import { OverviewView } from './views/OverviewView';
import { StubView } from './views/StubView';
import { CollegesView } from './views/CollegesView';
import { StudentsView } from './views/StudentsView';
import { MentorsView } from './views/MentorsView';
import { AlumniView } from './views/AlumniView';
import { EventsView } from './views/EventsView';
import { PaymentsView } from './views/PaymentsView';
import { AnalyticsView } from './views/AnalyticsView';
import { ApprovalsView } from './views/ApprovalsView';
import { AIInsightsView } from './views/AIInsightsView';
import { SettingsView } from './views/SettingsView';
import { WorkflowsView } from './views/WorkflowsView';

export function SuperAdminPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<SuperAdminNavId>('overview');

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  const titleFor = (id: SuperAdminNavId) => NAV.find((n) => n.id === id)?.label || 'Overview';

  return (
    <View style={s.shell}>
      <Sidebar active={active} onNav={setActive} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar title={titleFor(active)} />
        <ScrollView
          style={{ flex: 1, backgroundColor: SAC.bg }}
          contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {active === 'overview'    && <OverviewView />}
          {active === 'colleges'    && <CollegesView />}
          {active === 'students'    && <StudentsView />}
          {active === 'mentors'     && <MentorsView />}
          {active === 'alumni'      && <AlumniView />}
          {active === 'events'      && <EventsView />}
          {active === 'payments'    && <PaymentsView />}
          {active === 'analytics'   && <AnalyticsView />}
          {active === 'approvals'   && <ApprovalsView />}
          {active === 'ai-insights' && <AIInsightsView />}
          {active === 'settings'    && <SettingsView />}
          {active === 'workflows'   && <WorkflowsView />}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SAC.bg, height: '100%' as any },
});
