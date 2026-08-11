/**
 * Super Admin Portal — outer shell.
 */
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { SAC } from './tokens';
import { Sidebar, SuperAdminNavId, NAV } from './Sidebar';
import { TopBar } from './TopBar';
import { AnimatedAurora, GridOverlay } from '../student/glass';
import { LinearGradient } from 'expo-linear-gradient';
import { DashboardFooter } from '../../components/SponsorStrip';
import { PromoBanner } from '../../components/PromoBanner';
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
import { ImportsView } from './views/ImportsView';
import { PartnersView } from './views/PartnersView';
import { PromotionsView } from './views/PromotionsView';
import { TalentPoolView } from './views/TalentPoolView';
import { NewsletterView } from './views/NewsletterView';
import { EchoShowcaseAdminView } from './views/EchoShowcaseAdminView';
import { CertificatesView } from './views/CertificatesView';
import { EmailQualityView } from './views/EmailQualityView';
import { BGVAccountVerticalsView } from './views/BGVAccountVerticalsView';
import { useAutoTour } from '@/src/views/web/tour/TourProvider';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';

export function SuperAdminPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const { tab, sub, go } = usePortalUrl();
  const active = tab as SuperAdminNavId;
  useAutoTour('super_admin');

  const onLogout = async () => {
    router.replace('/welcome');
    try { await logout(); } catch {}
  };

  const titleFor = (id: SuperAdminNavId) => NAV.find((n) => n.id === id)?.label || 'Overview';
  const nav = (id: SuperAdminNavId) => go(id);
  // Pass the current sub-segment + a setter so views with internal tabs
  // (`useSubTab`) reflect their active tab in the URL. Passing fresh props on
  // every render is fine — `useSubTab` falls back to local state when the
  // props don't change meaningfully.
  const subFor = (t: string) => ({
    sub,
    onSub: (s: string) => go(active, s),
  });

  return (
    <View style={s.shell}>
      {/* FinTax360 Jewel-glass canvas */}

      <AnimatedAurora intensity="normal" />
      <GridOverlay />

      <Sidebar active={active} onNav={nav} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar title={titleFor(active)} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, paddingBottom: 22 }}
          showsVerticalScrollIndicator={false}
        >
          <PromoBanner portal="super_admin" />
          {active === 'overview'    && <OverviewView onNavigate={(id) => go(id as SuperAdminNavId)} />}
          {active === 'bgv'         && <BGVAccountVerticalsView />}
          {active === 'colleges'    && <CollegesView {...subFor('colleges')} />}
          {active === 'students'    && <StudentsView />}
          {active === 'mentors'     && <MentorsView />}
          {active === 'alumni'      && <AlumniView />}
          {active === 'events'      && <EventsView {...subFor('events')} />}
          {active === 'payments'    && <PaymentsView />}
          {active === 'analytics'   && <AnalyticsView />}
          {active === 'approvals'   && <ApprovalsView />}
          {active === 'ai-insights' && <AIInsightsView />}
          {active === 'settings'    && <SettingsView {...subFor('settings')} />}
          {active === 'workflows'   && <WorkflowsView />}
          {active === 'imports'     && <ImportsView {...subFor('imports')} />}
          {active === 'partners'    && <PartnersView {...subFor('partners')} />}
          {active === 'promotions'  && <PromotionsView />}
          {active === 'newsletter'  && <NewsletterView {...subFor('newsletter')} />}
          {active === 'email-health' && <EmailQualityView />}
          {active === 'talent-pool' && <TalentPoolView />}
          {active === 'echo-showcase' && <EchoShowcaseAdminView {...subFor('echo-showcase')} />}
          {active === 'certificates' && <CertificatesView {...subFor('certificates')} />}
          <DashboardFooter portal="super_admin" />
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SAC.bg, height: '100%' as any },
});
