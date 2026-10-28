/**
 * College Admin Portal — view switch inside the shared <PortalShell>.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { request, api } from '@/src/models/services/api';
import { PortalShell } from '@/src/ui/shell/PortalShell';

import { COLLEGE_PORTAL, collegeNameOf, type CollegeNavId } from './nav';
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { AlumniView } from './views/AlumniView';
import { MentorsView } from './views/MentorsView';
import { EventsView } from './views/EventsView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { AnalyticsView } from './views/AnalyticsView';
import { AIInsightsView } from './views/AIInsightsView';
import { CareerIntelView } from './views/CareerIntelView';
import { PlacementsView } from './views/PlacementsView';
import { ProfileSettingsView as SharedProfileSettingsView } from '../student/views/ProfileSettingsView';
import { CreateEventView } from './views/CreateEventView';
import { CollegeNotificationsPanel } from './views/NotificationsPanel';

export function CollegePortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const user = useAuthStore((sx) => sx.user) as any;
  const { tab, go } = usePortalUrl();
  const active = tab as CollegeNavId;
  const scrollRef = useRef<ScrollView>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const setActive = (id: any) => { if (String(id) !== tab) go(String(id)); };

  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }, [active]);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollCollegePortalToTop', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    return () => sub.remove();
  }, []);

  // Live sidebar counts
  useEffect(() => {
    const collegeName = collegeNameOf(user);
    const len = (r: any) => (Array.isArray(r) ? r.length : r?.items?.length || 0);
    api.pendingMentors().then((r) => setCounts((c) => ({ ...c, mentors: len(r) }))).catch(() => {});
    request<any>(collegeName ? `/college/events?college_name=${encodeURIComponent(collegeName)}` : '/college/events')
      .then((r) => setCounts((c) => ({ ...c, events: len(r) }))).catch(() => {});
    request<any>('/college/announcements').then((r) => setCounts((c) => ({ ...c, announcements: len(r) }))).catch(() => {});
    request<any>('/college/ai-insights').then((r) => setCounts((c) => ({ ...c, 'ai-insights': len(r) }))).catch(() => {});
  }, [user?.email]);

  const onLogout = async () => {
    router.replace('/welcome');
    try { await logout(); } catch {}
  };

  return (
    <PortalShell
      config={COLLEGE_PORTAL}
      active={active}
      onNav={setActive}
      onLogout={onLogout}
      counts={counts}
      scrollRef={scrollRef}
      notifications={(close) => (
        <CollegeNotificationsPanel onClose={close} onOpenSettings={() => { setActive('profile'); close(); }} onNavigate={setActive} />
      )}
    >
      {active === 'dashboard'    && <DashboardView onOpenProfile={() => setActive('profile')} onNavigate={setActive} />}
      {active === 'students'     && <StudentsView />}
      {active === 'alumni'       && <AlumniView />}
      {active === 'mentors'      && <MentorsView />}
      {active === 'events'       && <EventsView onNavigate={setActive} />}
      {active === 'create-event' && <CreateEventView onNavigate={setActive} />}
      {active === 'announcements'&& <AnnouncementsView />}
      {active === 'analytics'    && <AnalyticsView />}
      {active === 'ai-insights'  && <AIInsightsView />}
      {active === 'career-intel' && <CareerIntelView />}
      {active === 'placements'   && <PlacementsView />}
      {active === 'profile'      && <SharedProfileSettingsView roleOverride="college" />}
    </PortalShell>
  );
}
