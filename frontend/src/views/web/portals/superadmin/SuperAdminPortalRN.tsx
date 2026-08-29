/**
 * Super Admin Portal — outer shell.
 */
import React from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import '@/src/styles/superadmin-effects.css';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { SAC, useSAC, DARK_SAC, LIGHT_SAC, resolveColors } from './tokens';
import { useTheme } from '@/src/theme/ThemeContext';
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
import { AutonomousAgentsView } from './views/AutonomousAgentsView';
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
import { VisitorIntelligenceView } from './views/VisitorIntelligenceView';
import { useAutoTour } from '@/src/views/web/tour/TourProvider';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';

export function SuperAdminPortalRN() {
  const T = useSAC();
  const { isDark } = useTheme();
  Object.assign(s, resolveColors(s, T));
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

  // ── Cursor glow tracking (web only) ────────────────────────────────
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = document.getElementById('sa-cursor-glow');
    if (!el) return;
    let tx = 0, ty = 0, px = 0, py = 0;
    let raf: number;
    // Reference: clight.style.opacity = '1' on first mousemove
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; el.style.opacity = '1'; };
    // Reference: px += (tx - px) * 0.08; with translate3d
    const glide = () => {
      px += (tx - px) * 0.08;
      py += (ty - py) * 0.08;
      el.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';
      raf = requestAnimationFrame(glide);
    };
    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(glide);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <View style={s.shell}>
      {/* Theme-aware background */}
      <LinearGradient
        pointerEvents="none"
        colors={isDark ? ['#0a0f1e', '#131938'] : ['#F4F5FA', '#E8E9F3']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      {/* Cursor-following violet glow — inside fixed backdrop container (matches reference) */}
      {Platform.OS === 'web' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div id="sa-cursor-glow" />
        </div>
      )}
      <SAWatermark size={850} top={30} right={-30} opacity={isDark ? 0.16 : 0.06} />
      {isDark && (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <AnimatedAurora intensity="normal" />
          <GridOverlay />
        </View>
      )}

      <Sidebar active={active} onNav={nav} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 2 }}>
        <TopBar title={titleFor(active)} onAvatarPress={() => setActive('settings')} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 22, paddingBottom: 22 }}
          showsVerticalScrollIndicator={false}
        >
          <PromoBanner portal="super_admin" />
          {active === 'overview'        && <OverviewView onNavigate={(id) => go(id as SuperAdminNavId)} />}
          {active === 'visitor-radar'   && <VisitorIntelligenceView />}
          {active === 'agents'          && <AutonomousAgentsView />}
          {active === 'bgv'             && <BGVAccountVerticalsView />}
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
