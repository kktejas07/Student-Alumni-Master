/**
 * College Admin Portal — outer shell.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, DeviceEventEmitter, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';

import { CC } from './tokens';
import { Sidebar, CollegeNavId, NAV } from './Sidebar';
import { TopBar } from './TopBar';
import { LinearGradient } from 'expo-linear-gradient';
import { StarryBackground } from '@/src/views/web/nexus-glow-landing/StarryBackground';
import { DashboardFooter } from '../../components/SponsorStrip';
import { PromoBanner } from '../../components/PromoBanner';
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
import { CollegeNotificationsPanel } from './views/NotificationsPanel';
import { useAutoTour } from '@/src/views/web/tour/TourProvider';

export function CollegePortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const { tab, go } = usePortalUrl();
  const active = tab as any;
  const [showNotifs, setShowNotifs] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useAutoTour('college');

  const setActive = (id: any) => { if (String(id) !== tab) go(String(id)); };

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [active]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollCollegePortalToTop', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  const onLogout = async () => {
    router.replace('/welcome');
    try { await logout(); } catch {}
  };

  const titleFor = (id: CollegeNavId) => NAV.find((n) => n.id === id)?.label || 'Dashboard';

  return (
    <View style={s.shell}>
      <LinearGradient
        pointerEvents="none"
        colors={['#030614', '#040816']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />

      <Sidebar active={active} onNav={setActive} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TopBar
            title={titleFor(active)}
            onCalendarPress={() => setActive('events')}
            onNotificationsPress={() => setShowNotifs(!showNotifs)}
            onProfilePress={() => setActive('profile')}
            onAddPress={() => router.push('/(onboarding)/college-onboard' as any)}
          />
          <ScrollView
            ref={scrollRef}
            style={[{ flex: 1 }, Platform.OS === 'web' && ({ scrollBehavior: 'smooth' } as any)]}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, padding: 22, paddingBottom: 60 }}>
              <PromoBanner portal="college" />
              {active === 'dashboard'    && (
                <DashboardView
                  onOpenProfile={() => setActive('profile')}
                  onNavigate={setActive}
                />
              )}
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
            </View>
            <DashboardFooter portal="college" />
          </ScrollView>
        </View>
        {showNotifs && (
          <CollegeNotificationsPanel
            onClose={() => setShowNotifs(false)}
            onOpenSettings={() => {
              setActive('profile');
              setShowNotifs(false);
            }}
            onNavigate={setActive}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: CC.bg, height: '100%' as any },
});
