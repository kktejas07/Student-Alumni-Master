/**
 * MentorPortalRN — the true React Native implementation of the Mentor
 * Portal HTML spec. Replaces the iframe approach on web.
 *
 * Currently fully ported:
 *   • Sidebar (with collapse, mentor mini-profile, nav, sign-out)
 *   • TopBar (page title, search, notifications, avatar)
 *   • Dashboard view (AI briefing, 4 stats, today's sessions, connections,
 *     earnings, feedback summary, upcoming)
 *
 * Stubbed (next ports):
 *   • My Connections, Sessions, Session Requests, Network, Earnings,
 *     Feedback, Create Event, Profile
 */
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { MC } from './tokens';
import { Sidebar, NavId } from './Sidebar';
import { TopBar } from './TopBar';
import { AnimatedAurora, GridOverlay } from '../student/glass';
import { LinearGradient } from 'expo-linear-gradient';
import { DashboardFooter } from '../../components/SponsorStrip';
import { PromoBanner } from '../../components/PromoBanner';
import { DashboardView } from './views/DashboardView';
import { ConnectionsView } from './views/ConnectionsView';
import { SessionsView } from './views/SessionsView';
import { RequestsView } from './views/RequestsView';
import { NetworkView } from './views/NetworkView';
import { EarningsView } from './views/EarningsView';
import { FeedbackView } from './views/FeedbackView';
import { CreateEventView } from './views/CreateEventView';
import { AvailabilityView } from './views/AvailabilityView';
import { ProfileView } from './views/ProfileView';
import { MentorProfileSettingsView } from './views/MentorProfileSettingsView';
import { MentorAIStudioView } from './views/MentorAIStudioView';
import { NotificationsPanel } from './views/NotificationsPanel';
// Shared role-aware comprehensive profile view (purple theme, identical to student).
import { ProfileSettingsView as SharedProfileSettingsView } from '../student/views/ProfileSettingsView';
import { STUDENTS, SESSION_REQUESTS } from './data';
import { useAutoTour } from '@/src/views/web/tour/TourProvider';

const PAGE_TITLES: Record<NavId, string> = {
  dashboard:    'Dashboard',
  'ai-studio':  'AI Studio',
  students:     'My Connections',
  sessions:     'Sessions',
  requests:     'Session Requests',
  availability: 'Set Availability',
  network:      'Network',
  earnings:     'Earnings',
  feedback:     'Feedback',
  event:        'Create Event',
  profile:      'Profile',
};

export default function MentorPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((st) => st.logout);

  const params = useLocalSearchParams();
  const [active, setActive] = useState<NavId>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [profileTab, setProfileTab] = useState<'manage' | 'digital-id' | 'notifications'>('manage');
  useAutoTour('mentor');

  useEffect(() => {
    if (params.tab && PAGE_TITLES[params.tab as NavId]) {
      setActive(params.tab as NavId);
    }
  }, [params.tab]);

  const [decisions, setDecisions] = useState<Record<number, 'pending' | 'accepted' | 'declined'>>({});

  const acceptedCount = Object.values(decisions).filter((d) => d === 'accepted').length;
  const declinedCount = Object.values(decisions).filter((d) => d === 'declined').length;
  const pendingRequestsCount = SESSION_REQUESTS.length - acceptedCount - declinedCount;

  const counts = {
    students: STUDENTS.length,
    sessions: STUDENTS.filter((s) => s.nextSession).length,
    requests: pendingRequestsCount,
  };

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  return (
    <View style={s.shell}>
      {/* FinTax360 Jewel-glass canvas */}
      <LinearGradient
        pointerEvents="none"
        colors={['#0a0f1e', '#131938']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <AnimatedAurora intensity="normal" />
      <GridOverlay />

      <Sidebar
        active={active}
        onNav={(id) => setActive(id)}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onLogout={onLogout}
        counts={counts}
      />

      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TopBar
            title={PAGE_TITLES[active]}
            query={query}
            setQuery={setQuery}
            notifCount={4}
            onBellPress={() => setShowNotifs(!showNotifs)}
            onAvatarPress={() => { setProfileTab('manage'); setActive('profile'); }}
          />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <PromoBanner portal="mentor" />
            {active === 'dashboard' && <DashboardView onNav={(id) => setActive(id as NavId)} />}
            {active === 'ai-studio' && <MentorAIStudioView />}
            {active === 'students'  && <ConnectionsView />}
            {active === 'sessions'  && <SessionsView />}
            {active === 'availability' && <AvailabilityView />}
            {active === 'requests'  && <RequestsView decisions={decisions} onSetDecision={(id, d) => setDecisions(prev => ({ ...prev, [id]: d }))} />}
            {active === 'network'   && <NetworkView />}
            {active === 'earnings'  && <EarningsView />}
            {active === 'feedback'  && <FeedbackView />}
            {active === 'event'     && <CreateEventView />}
            {active === 'profile'   && <MentorProfileSettingsView initialTab={profileTab} />}
            <DashboardFooter portal="mentor" />
          </ScrollView>
        </View>
        {showNotifs && (
          <NotificationsPanel
            onClose={() => setShowNotifs(false)}
            onOpenSettings={() => {
              setProfileTab('notifications');
              setActive('profile');
              setShowNotifs(false);
            }}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: MC.bg, height: '100%' as any },
});
