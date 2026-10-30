/**
 * Alumni Portal — view switch inside the shared <PortalShell>.
 */
import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { PortalShell } from '@/src/ui/shell/PortalShell';
import { PortalNavContext } from '../shared/navContext';

import { ALUMNI_PORTAL, type AlumniNavId } from './nav';
import { DashboardView } from './views/DashboardView';
import { EventsView } from './views/EventsView';
import { InternshipsView } from './views/InternshipsView';
import { NetworkView } from './views/NetworkView';
import { ProfileSettingsView } from '../student/views/ProfileSettingsView';
import { MyBookingsView } from './views/MyBookingsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { MyWorkshopsView } from './views/MyWorkshopsView';
import { MyTicketsView } from '../student/views/MyTicketsView';
import { CareerAIView } from '../student/views/CareerAIView';

import CoursesPage from '@/app/courses';
import RentalsPage from '@/app/rentals';
import FinancialPage from '@/app/financial';
import HigherEducationPage from '@/app/higher-education';
import DealsPage from '@/app/deals';
import WalletPage from '@/app/wallet';

/** @deprecated kept for AlumniNavId importers */
export type StudentNavId = AlumniNavId;

/** Alumni alias of the shared portal nav context (see ../shared/navContext). */
export const AlumniPortalNavContext = PortalNavContext;

export function AlumniPortalRN() {
  const router = useRouter();
  const { tab, go } = usePortalUrl();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<AlumniNavId>(tab as AlumniNavId);
  const [searchQuery, setSearchQuery] = useState('');
  const [q, setQ] = useState('');

  React.useEffect(() => { if (tab) setActive(tab as AlumniNavId); }, [tab]);
  React.useEffect(() => setQ(searchQuery), [searchQuery]);

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };
  const handleNav = (id: AlumniNavId, params?: { q?: string }) => {
    if (id !== active) go(id);
    if (params && typeof params.q === 'string') setSearchQuery(params.q);
  };
  const submitSearch = () => {
    if (!q.trim()) return;
    setSearchQuery(q.trim());
    if (active !== 'network' && active !== 'internships') handleNav('internships');
  };

  return (
    <PortalNavContext.Provider value={{ navigate: (id, p) => handleNav(id as AlumniNavId, p), searchQuery, setSearchQuery }}>
      <PortalShell
        config={ALUMNI_PORTAL}
        active={active}
        onNav={(id) => handleNav(id as AlumniNavId)}
        onLogout={onLogout}
        search={{ value: q, onChange: setQ, onSubmit: submitSearch }}
      >
        {active === 'dashboard' && (
          <DashboardView
            onOpenProfile={() => handleNav('profile')}
            onOpenInternships={() => handleNav('internships')}
            onOpenNetwork={() => handleNav('network')}
            onOpenEvents={() => handleNav('events')}
            onOpenCareerAi={() => handleNav('career-ai')}
          />
        )}
        {active === 'career-ai'       && <CareerAIView />}
        {active === 'internships'     && <InternshipsView />}
        {active === 'my-applications' && <MyApplicationsView />}
        {active === 'network'         && <NetworkView />}
        {active === 'my-bookings'     && <MyBookingsView />}
        {active === 'my-tickets'      && <MyTicketsView />}
        {active === 'events'          && <EventsView />}
        {active === 'my-workshops'    && <MyWorkshopsView />}
        {active === 'courses'         && <CoursesPage />}
        {active === 'financial'       && <FinancialPage />}
        {active === 'deals'           && <DealsPage />}
        {active === 'wallet'          && <WalletPage />}
        {active === 'higher-ed'       && <HigherEducationPage />}
        {active === 'rentals'         && <RentalsPage />}
        {active === 'profile'         && <ProfileSettingsView />}
      </PortalShell>
    </PortalNavContext.Provider>
  );
}
