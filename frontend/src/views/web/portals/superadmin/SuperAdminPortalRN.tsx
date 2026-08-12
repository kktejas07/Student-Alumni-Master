/**
 * Super Admin Portal — outer shell.
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet , Platform} from 'react-native';
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
import { useAutoTour } from '@/src/views/web/tour/TourProvider';

export function SuperAdminPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<SuperAdminNavId>('overview');
  useAutoTour('super_admin');

  const onLogout = async () => {
    router.replace('/welcome');
    try { await logout(); } catch {}
  };

  const titleFor = (id: SuperAdminNavId) => NAV.find((n) => n.id === id)?.label || 'Overview';

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

      <Sidebar active={active} onNav={setActive} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar title={titleFor(active)} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, paddingBottom: 22 }}
          showsVerticalScrollIndicator={false}
        >
          <PromoBanner portal="super_admin" />
          {active === 'overview'    && <OverviewView onNavigate={(id) => setActive(id as SuperAdminNavId)} />}
          {active === 'colleges'    && <CollegesView />}
          {active === 'students'    && <StudentsView />}
          {active === 'mentors'     && <MentorsView />}
          {active === 'alumni'      && <AlumniView />}
          {active === 'events'      && <EventsView />}
          {active === 'payments'    && <PaymentsView />}
          {active === 'analytics'   && <AnalyticsView />}
          {active === 'approvals'   && <ApprovalsView />}
          {active === 'ai-insights' && <AIInsightsView />}
          {active === 'settings'    && <SettingsView />}
          {active === 'workflows'   && <WorkflowsView />}
          {active === 'imports'     && <ImportsView />}
          {active === 'partners'    && <PartnersView />}
          {active === 'promotions'  && <PromotionsView />}
          {active === 'newsletter'  && <NewsletterView />}
          {active === 'talent-pool' && <TalentPoolView />}
          {active === 'echo-showcase' && <EchoShowcaseAdminView />}
          {active === 'certificates' && <CertificatesView />}
          <DashboardFooter portal="super_admin" />
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SAC.bg, height: '100%' as any },
});
