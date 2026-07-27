/**
 * Alumni Portal — outer shell. Mirrors StudentPortalRN behaviour with the
 * orange theme tokens. All sidebar items render INSIDE this shell via the
 * EmbeddedShellContext (no router redirects).
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet , Platform} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useAutoTour } from '@/src/views/web/tour/TourProvider';

import { SC } from './tokens';
import { Sidebar, StudentNavId } from './Sidebar';
import { TopBar } from './TopBar';
import { LinearGradient } from 'expo-linear-gradient';
import { StarryBackground } from '@/src/views/web/nexus-glow-landing/StarryBackground';
import { DashboardFooter } from '../../components/SponsorStrip';
import { PromoBanner } from '../../components/PromoBanner';
import { DashboardView } from './views/DashboardView';
import { StubView } from './views/StubView';
import { EventsView } from './views/EventsView';
import { InternshipsView } from './views/InternshipsView';
import { NetworkView } from './views/NetworkView';
import { ProfileSettingsView } from '../student/views/ProfileSettingsView';
import { MyBookingsView } from './views/MyBookingsView';
import { MyApplicationsView } from './views/MyApplicationsView';
import { MyWorkshopsView } from './views/MyWorkshopsView';
import { CareerAIView } from '../student/views/CareerAIView';

import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';

// Feature pages imported as components for inline rendering
import CoursesPage from '@/app/courses';
import RentalsPage from '@/app/rentals';
import FinancialPage from '@/app/financial';
import HigherEducationPage from '@/app/higher-education';
import DealsPage from '@/app/deals';
import WalletPage from '@/app/wallet';

export const AlumniPortalNavContext = React.createContext<{
  navigate: (id: StudentNavId, params?: { q?: string }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
} | null>(null);

export function AlumniPortalRN() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<StudentNavId>((tab as StudentNavId) || 'dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  useAutoTour('alumni');

  React.useEffect(() => {
    if (tab) {
      setActive(tab as StudentNavId);
    }
  }, [tab]);

  const onLogout = async () => {
    router.replace('/welcome');
    try { await logout(); } catch {}
  };

  const handleNav = (id: StudentNavId, params?: { q?: string }) => {
    setActive(id);
    if (params && typeof params.q === 'string') {
      setSearchQuery(params.q);
    }
  };

  return (
    <View style={s.shell}>
      {/* Landing Page Starry Background */}
      {Platform.OS === 'web' ? (
        <View style={StyleSheet.absoluteFillObject}>
          <StarryBackground />
        </View>
      ) : (
        <LinearGradient
          pointerEvents="none"
          colors={['#030614', '#040816']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject as any}
        />
      )}

      <Sidebar active={active} onNav={handleNav} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AlumniPortalNavContext.Provider value={{ navigate: handleNav, searchQuery, setSearchQuery }}>
          <TopBar activeView={active} onAvatarPress={() => setActive('profile')} />
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            <EmbeddedShellContext.Provider value={true}>
              <PromoBanner portal="alumni" />
            {active === 'dashboard'       && (
              <DashboardView
                onOpenProfile={() => setActive('profile')}
                onOpenInternships={() => setActive('internships')}
                onOpenNetwork={() => setActive('network')}
                onOpenEvents={() => setActive('events')}
                onOpenCareerAi={() => setActive('career-ai')}
              />
            )}
            {active === 'career-ai'       && <CareerAIView />}
            {active === 'internships'     && <InternshipsView />}
            {active === 'my-applications' && <MyApplicationsView />}
            {active === 'network'         && <NetworkView />}
            {active === 'my-bookings'     && <MyBookingsView />}
            {active === 'events'          && <EventsView />}
            {active === 'my-workshops'    && <MyWorkshopsView />}
            {active === 'courses'         && <CoursesPage />}
            {active === 'financial'       && <FinancialPage />}
            {active === 'deals'           && <DealsPage />}
            {active === 'wallet'          && <WalletPage />}
            {active === 'higher-ed'       && <HigherEducationPage />}
            {active === 'rentals'         && <RentalsPage />}
            {active === 'profile'         && <ProfileSettingsView />}
          </EmbeddedShellContext.Provider>
          <DashboardFooter portal="alumni" />
        </ScrollView>
        </AlumniPortalNavContext.Provider>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SC.bg, height: '100%' as any },
});
