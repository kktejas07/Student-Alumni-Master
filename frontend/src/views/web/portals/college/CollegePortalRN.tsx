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
          {active === 'students'     && <StubView title="Students"      note="Roster, attendance, grades, counselling alerts — coming next." />}
          {active === 'alumni'       && <StubView title="Alumni Network" note="Search alumni, batch directories, donations — coming next." />}
          {active === 'mentors'      && <StubView title="Mentors"        note="Approve mentor applications, view active mentors and their session stats." />}
          {active === 'events'       && <StubView title="Events"         note="Manage college events, RSVPs, capacity — coming next." />}
          {active === 'announcements'&& <StubView title="Announcements"  note="Push notices to students, alumni, faculty." />}
          {active === 'analytics'    && <StubView title="Analytics"      note="Cohort placement trends, salary curves, attrition — coming next." />}
          {active === 'ai-insights'  && <StubView title="AI Insights"    note="Claude-powered briefings, predictive at-risk analysis, growth ideas." />}
          {active === 'career-intel' && <StubView title="Career Intel"   note="Aggregate skill gaps, hiring intent, in-demand roles for your batches." />}
          {active === 'placements'   && <StubView title="Placements"     note="Recruiter pipeline, drive scheduling, offer letters — coming next." />}
          {active === 'profile'      && <StubView title="Admin Profile"  note="College admin profile, NAAC certifications, contact details." />}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: CC.bg, height: '100%' as any },
});
