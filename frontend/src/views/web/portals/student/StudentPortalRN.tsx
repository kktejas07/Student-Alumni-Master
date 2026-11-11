/**
 * Student Portal — view switch inside the shared <PortalShell>.
 * Navigation, chrome and layout live in src/ui/shell; this file only maps
 * the active tab to a view and owns student-specific nav context (search
 * query, course detail hand-off).
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { PortalShell } from '@/src/ui/shell/PortalShell';
import { ToastProvider } from '@/src/motion/apple/toast';

import { STUDENT_PORTAL, isEchoSlug, type StudentNavId } from './nav';
import { StudentNotificationsPanel } from './views/NotificationsPanel';
import { DashboardView } from './views/DashboardView';
import { CareerAIView } from './views/CareerAIView';
import { EventsView } from './views/EventsView';
import { InternshipsView } from './views/InternshipsView';
import { NetworkView } from './views/NetworkView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { MyBookingsView } from './views/MyBookingsView';
import { MyWorkshopsView } from './views/MyWorkshopsView';
import { MyTicketsView } from './views/MyTicketsView';
import { MyCertificatesView } from './views/MyCertificatesView';
import { EchoShowcaseView } from './views/EchoShowcaseView';
import { RentalsView } from './views/RentalsView';
import { CalendarView } from './views/CalendarView';
import { MessagesView } from './views/MessagesView';
import { AchievementsView } from './views/AchievementsView';
import { HelpCenterView } from './views/HelpCenterView';
import { StudentPortalNavContext } from './StudentPortalNavContext';

import CoursesPage from '@/app/courses';
import FinancialPage from '@/app/financial';
import HigherEducationPage from '@/app/higher-education';
import DealsPage from '@/app/deals';
import WalletPage from '@/app/wallet';

export function StudentPortalRN() {
  return (
    <ToastProvider>
      <StudentPortalInner />
    </ToastProvider>
  );
}

function StudentPortalInner() {
  const router = useRouter();
  const { tab, go } = usePortalUrl();
  const [active, setActive] = useState<StudentNavId>(tab as StudentNavId);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailCourse, setDetailCourse] = useState<any>(null);
  const logout = useAuthStore((sx) => sx.logout);

  useEffect(() => { if (tab) setActive(tab as StudentNavId); }, [tab]);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };
  const handleNav = (id: StudentNavId, params?: { q?: string; detailCourse?: any }) => {
    if (id !== active) go(id);
    if (params && typeof params.q === 'string') setSearchQuery(params.q);
    if (params?.detailCourse) setDetailCourse(params.detailCourse);
  };
  const [q, setQ] = useState('');
  useEffect(() => setQ(searchQuery), [searchQuery]);
  const submitSearch = () => {
    if (!q.trim()) return;
    setSearchQuery(q.trim());
    if (active !== 'network' && active !== 'internships') handleNav('internships');
  };

  return (
    <StudentPortalNavContext.Provider value={{ navigate: handleNav, searchQuery, setSearchQuery, detailCourse, setDetailCourse }}>
      <PortalShell
        config={STUDENT_PORTAL}
        active={active}
        onNav={handleNav}
        onLogout={onLogout}
        search={{ value: q, onChange: setQ, onSubmit: submitSearch }}
        notifications={(close) => (
          <StudentNotificationsPanel onClose={close} onOpenSettings={() => { handleNav('profile'); close(); }} />
        )}
      >
        {active === 'dashboard'       && <DashboardView />}
        {active === 'career-ai'       && <CareerAIView />}
        {active === 'internships'     && <InternshipsView />}
        {active === 'network'         && <NetworkView />}
        {(active === 'my-bookings' || active === 'bookings') && <MyBookingsView />}
        {(active === 'my-tickets' || active === 'tickets') && <MyTicketsView />}
        {(active === 'my-certificates' || active === 'certificates') && <MyCertificatesView />}
        {(active === 'myevents' || active === 'events') && <EventsView />}
        {(active === 'my-workshops' || active === 'workshops') && <MyWorkshopsView />}
        {(active === 'echo-showcase' || isEchoSlug(active)) && (
          <EchoShowcaseView slug={active === 'echo-showcase' ? undefined : active} onBack={() => handleNav('myevents')} />
        )}
        {active === 'courses'         && <CoursesPage />}
        {active === 'financial'       && <FinancialPage />}
        {active === 'deals'           && <DealsPage />}
        {active === 'wallet'          && <WalletPage />}
        {active === 'higher-education'       && <HigherEducationPage />}
        {active === 'rentals'         && <RentalsView />}
        {active === 'calendar'        && <CalendarView />}
        {active === 'messages'        && <MessagesView />}
        {active === 'achievements'    && <AchievementsView />}
        {active === 'help-center'     && <HelpCenterView />}
        {active === 'profile'         && <ProfileSettingsView />}
      </PortalShell>
    </StudentPortalNavContext.Provider>
  );
}
