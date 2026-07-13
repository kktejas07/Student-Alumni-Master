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
import { request, api } from '@/src/models/services/api';

const PAGE_TITLES: Record<NavId, string> = {
  dashboard:    'Dashboard',
  'ai-studio':  'AI Studio',
  students:     'My Connections',
  sessions:     'Sessions',
  requests:     'Session Requests',
  network:      'Network',
  earnings:     'Earnings',
  feedback:     'Feedback',
  event:        'Create Event',
  profile:      'Profile',
  availability: 'Availability',
};

export default function MentorPortalRN() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const logout = useAuthStore((st) => st.logout);
  const user = useAuthStore((st) => st.user) as any;

  const [demoMode, setDemoMode] = useState(true);
  const [active, setActive] = useState<NavId>('dashboard');

  useEffect(() => {
    if (params.tab) {
      setActive(params.tab as NavId);
    }
  }, [params.tab]);

  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [profileTab, setProfileTab] = useState<'manage' | 'digital-id' | 'notifications'>('manage');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  useAutoTour('mentor');

  const [liveCounts, setLiveCounts] = useState({ students: 0, sessions: 0, requests: 0 });

  // Fetch real-time notifications, connections, and requests for the sidebar
  const fetchDashboardData = async () => {
    try {
      const [notifRes, connectionsRes, bookingsRes] = await Promise.all([
        request<{ items?: any[]; unread?: number }>('/notifications'),
        user?.email ? api.mentorConnections(user.email) : Promise.resolve({ items: [] }),
        api.myBookings()
      ]);

      if (notifRes) {
        if (Array.isArray(notifRes.items)) setNotifications(notifRes.items);
        if (typeof notifRes.unread === 'number') setUnreadCount(notifRes.unread);
      }

      const connections = connectionsRes?.items || [];
      const bookings = bookingsRes?.bookings || [];
      
      const pendingRequests = bookings.filter((b: any) => b.status === 'pending').length;
      const upcomingSessions = bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'accepted').length;

      setLiveCounts({
        students: connections.length,
        sessions: upcomingSessions,
        requests: pendingRequests,
      });
    } catch (e) {
      console.warn('Failed to fetch dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [user?.email]);

  useEffect(() => {
    if (params.tab && PAGE_TITLES[params.tab as NavId]) {
      setActive(params.tab as NavId);
    }
  }, [params.tab]);

  const [decisions, setDecisions] = useState<Record<number, 'pending' | 'accepted' | 'declined'>>({});

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  return (
    <View style={s.shell}>
      {/* FinTax360 Jewel-glass canvas. */}
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
        counts={liveCounts}
      />

      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TopBar
            title={PAGE_TITLES[active]}
            query={query}
            setQuery={setQuery}
            notifCount={unreadCount}
            onBellPress={() => setShowNotifs(!showNotifs)}
            onAvatarPress={() => { setProfileTab('manage'); setActive('profile'); }}
            demoMode={demoMode}
            setDemoMode={setDemoMode}
          />

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <PromoBanner portal="mentor" />
            {active === 'dashboard' && <DashboardView onNav={(id) => setActive(id as NavId)} demoMode={demoMode} setDemoMode={setDemoMode} />}
            {active === 'ai-studio' && <MentorAIStudioView />}
            {active === 'students'  && <ConnectionsView />}
            {active === 'sessions'  && <SessionsView />}
            {active === 'requests'  && <RequestsView decisions={decisions} onSetDecision={(id, d) => setDecisions(prev => ({ ...prev, [id]: d }))} demoMode={demoMode} />}
            {active === 'network'   && <NetworkView />}
            {active === 'earnings'  && <EarningsView demoMode={demoMode} setDemoMode={setDemoMode} />}
            {active === 'feedback'  && <FeedbackView demoMode={demoMode} setDemoMode={setDemoMode} />}
            {active === 'event'     && <CreateEventView />}
            {active === 'profile'   && <MentorProfileSettingsView initialTab={profileTab} demoMode={demoMode} setDemoMode={setDemoMode} />}
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
            onNav={(id) => setActive(id)}
            notifications={notifications}
            onRefresh={fetchDashboardData}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: MC.bg, height: '100%' as any },
});
