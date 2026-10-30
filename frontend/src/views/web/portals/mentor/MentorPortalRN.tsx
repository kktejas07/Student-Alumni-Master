/**
 * Mentor Portal — view switch inside the shared <PortalShell>.
 * Live sidebar counts (connections / sessions / requests) and the
 * notifications panel are fetched here and handed to the shell.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { request, api } from '@/src/models/services/api';
import { PortalShell } from '@/src/ui/shell/PortalShell';

import { MENTOR_PORTAL, PAGE_TITLES, type NavId } from './nav';
import { DashboardView } from './views/DashboardView';
import { ConnectionsView } from './views/ConnectionsView';
import { SessionsView } from './views/SessionsView';
import { RequestsView } from './views/RequestsView';
import { NetworkView } from './views/NetworkView';
import { EarningsView } from './views/EarningsView';
import { FeedbackView } from './views/FeedbackView';
import { CreateEventView } from './views/CreateEventView';
import { AvailabilityView } from './views/AvailabilityView';
import { MentorProfileSettingsView } from './views/MentorProfileSettingsView';
import { MentorAIStudioView } from './views/MentorAIStudioView';
import { NotificationsPanel } from './views/NotificationsPanel';

type ProfileTab = 'manage' | 'digital-id' | 'notifications';

export default function MentorPortalRN() {
  const router = useRouter();
  const { tab, sub, go } = usePortalUrl();
  const logout = useAuthStore((st) => st.logout);
  const user = useAuthStore((st) => st.user) as any;

  const [active, setActive] = useState<NavId>('dashboard');
  useEffect(() => { if (tab && PAGE_TITLES[tab as NavId]) setActive(tab as NavId); }, [tab]);

  const [query, setQuery] = useState('');
  const [profileTab, setProfileTab] = useState<ProfileTab>(
    sub === 'digital-id' ? 'digital-id' : sub === 'notifications' ? 'notifications' : 'manage'
  );
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [counts, setCounts] = useState({ students: 0, sessions: 0, requests: 0 });
  const [decisions, setDecisions] = useState<Record<number, 'pending' | 'accepted' | 'declined'>>({});

  const refresh = useCallback(async () => {
    try {
      const [notifRes, connectionsRes, bookingsRes] = await Promise.all([
        request<{ items?: any[]; unread?: number }>('/notifications'),
        user?.email ? api.mentorConnections(user.email) : Promise.resolve({ items: [] }),
        api.myBookings(),
      ]);
      if (notifRes) {
        if (Array.isArray(notifRes.items)) setNotifications(notifRes.items);
        if (typeof notifRes.unread === 'number') setUnreadCount(notifRes.unread);
      }
      const bookings = bookingsRes?.bookings || [];
      setCounts({
        students: (connectionsRes?.items || []).length,
        sessions: bookings.filter((b: any) => b.status === 'confirmed' || b.status === 'accepted').length,
        requests: bookings.filter((b: any) => b.status === 'pending').length,
      });
    } catch (e) {
      console.warn('Failed to fetch mentor dashboard data:', e);
    }
  }, [user?.email]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  const navigate = (id: NavId, pt?: ProfileTab) => {
    if (pt) setProfileTab(pt);
    if (id === 'profile' && pt) { go(id, pt); return; }
    if (String(id) !== tab) go(id); else setActive(id);
  };

  return (
    <PortalShell
      config={MENTOR_PORTAL}
      active={active}
      title={PAGE_TITLES[active]}
      onNav={(id) => navigate(id as NavId, id === 'profile' ? 'manage' : undefined)}
      onLogout={onLogout}
      counts={counts}
      unread={unreadCount}
      search={{ value: query, onChange: setQuery, onSubmit: () => {} }}
      notifications={(close) => (
        <NotificationsPanel
          onClose={close}
          onOpenSettings={() => { navigate('profile', 'notifications'); close(); }}
          onNav={(id) => navigate(id as NavId)}
          notifications={notifications}
          onRefresh={refresh}
        />
      )}
    >
      {active === 'dashboard'    && <DashboardView onNav={(id) => navigate(id as NavId)} />}
      {active === 'ai-studio'    && <MentorAIStudioView />}
      {active === 'students'     && <ConnectionsView />}
      {active === 'sessions'     && <SessionsView />}
      {active === 'requests'     && <RequestsView decisions={decisions} onSetDecision={(id, d) => setDecisions((prev) => ({ ...prev, [id]: d }))} />}
      {active === 'availability' && <AvailabilityView />}
      {active === 'network'      && <NetworkView />}
      {active === 'earnings'     && <EarningsView />}
      {active === 'feedback'     && <FeedbackView />}
      {active === 'event'        && <CreateEventView />}
      {active === 'profile'      && <MentorProfileSettingsView initialTab={profileTab} />}
    </PortalShell>
  );
}
