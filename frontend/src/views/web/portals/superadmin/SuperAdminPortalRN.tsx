/**
 * Super Admin Portal — view switch inside the shared <PortalShell>.
 */
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import '@/src/styles/superadmin-effects.css';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { request } from '@/src/models/services/api';
import { PortalShell } from '@/src/ui/shell/PortalShell';
import { ForceLightTheme } from '@/src/theme/ThemeContext';

import { SUPERADMIN_PORTAL, type SuperAdminNavId } from './nav';
import { OverviewView } from './views/OverviewView';
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
import { TalentPoolAgentsView } from './views/TalentPoolAgentsView';
import { NewsletterView } from './views/NewsletterView';
import { EchoShowcaseAdminView } from './views/EchoShowcaseAdminView';
import { VendorsView } from './views/VendorsView';
import { CouponsView } from './views/CouponsView';
import { CertificatesView } from './views/CertificatesView';
import { TeamsMeetingsView } from './views/TeamsMeetingsView';
import { EmailQualityView } from './views/EmailQualityView';
import { BGVAccountVerticalsView } from './views/BGVAccountVerticalsView';
import { VisitorIntelligenceView } from './views/VisitorIntelligenceView';
import { CICDEvaluatorView } from './views/CICDEvaluatorView';
import { CodeHealthView } from './views/CodeHealthView';
import { CareersAdminView } from './views/CareersAdminView';

export function SuperAdminPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const { tab, sub, go } = usePortalUrl();
  const active = tab as SuperAdminNavId;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let on = true;
    const tick = () => request<any>('/admin/super/approvals')
      .then((r) => { if (on) setCounts({ approvals: (r?.items || []).filter((a: any) => !a.status || a.status === 'pending').length }); })
      .catch(() => {});
    tick();
    const id = setInterval(tick, 60000);
    return () => { on = false; clearInterval(id); };
  }, []);

  // Cursor-following glow (web only, from superadmin-effects.css)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = document.getElementById('sa-cursor-glow');
    if (!el) return;
    let tx = 0, ty = 0, px = 0, py = 0, raf = 0;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; el.style.opacity = '1'; };
    const glide = () => { px += (tx - px) * 0.08; py += (ty - py) * 0.08; el.style.transform = `translate3d(${px}px,${py}px,0)`; raf = requestAnimationFrame(glide); };
    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(glide);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const onLogout = async () => {
    router.replace('/welcome');
    try { await logout(); } catch {}
  };
  const nav = (id: string) => go(id);
  const subFor = () => ({ sub, onSub: (s: string) => go(active, s) });

  return (
    <ForceLightTheme>
      <>
        {Platform.OS === 'web' && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <div id="sa-cursor-glow" />
          </div>
        )}
        <PortalShell config={SUPERADMIN_PORTAL} active={active} onNav={nav} onLogout={onLogout} counts={counts} plain>
          {active === 'overview'        && <OverviewView onNavigate={(id) => go(id as SuperAdminNavId)} />}
          {active === 'visitor-radar'   && <VisitorIntelligenceView />}
          {active === 'agents'          && <AutonomousAgentsView />}
          {active === 'cicd-evaluator'  && <CICDEvaluatorView />}
          {active === 'code-health'     && <CodeHealthView />}
          {active === 'bgv'             && <BGVAccountVerticalsView />}
          {active === 'colleges'        && <CollegesView {...subFor()} />}
          {active === 'students'        && <StudentsView openUserId={sub || null} />}
          {active === 'mentors'         && <MentorsView {...subFor()} />}
          {active === 'alumni'          && <AlumniView />}
          {active === 'events'          && <EventsView {...subFor()} />}
          {active === 'payments'        && <PaymentsView />}
          {active === 'analytics'       && <AnalyticsView />}
          {active === 'approvals'       && <ApprovalsView />}
          {active === 'ai-insights'     && <AIInsightsView />}
          {active === 'settings'        && <SettingsView {...subFor()} />}
          {active === 'workflows'       && <WorkflowsView />}
          {active === 'imports'         && <ImportsView {...subFor()} />}
          {active === 'partners'        && <PartnersView {...subFor()} />}
          {active === 'promotions'      && <PromotionsView />}
          {active === 'newsletter'      && <NewsletterView {...subFor()} />}
          {active === 'email-health'    && <EmailQualityView />}
          {active === 'talent-pool'     && <TalentPoolView {...subFor()} />}
          {active === 'talent-pool-agents' && <TalentPoolAgentsView />}
          {active === 'echo-showcase'   && <EchoShowcaseAdminView {...subFor()} />}
          {active === 'vendors'         && <VendorsView />}
          {active === 'coupons'         && <CouponsView />}
          {active === 'careers'         && <CareersAdminView />}
          {active === 'certificates'    && <CertificatesView {...subFor()} />}
          {active === 'teams'           && <TeamsMeetingsView />}
        </PortalShell>
      </>
    </ForceLightTheme>
  );
}
