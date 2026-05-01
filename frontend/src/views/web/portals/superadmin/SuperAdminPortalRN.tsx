/**
 * Super Admin Portal — outer shell.
 */
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

import { SAC } from './tokens';
import { Sidebar, SuperAdminNavId, NAV } from './Sidebar';
import { TopBar } from './TopBar';
import { OverviewView } from './views/OverviewView';
import { StubView } from './views/StubView';

export function SuperAdminPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((sx) => sx.logout);
  const [active, setActive] = useState<SuperAdminNavId>('overview');

  const onLogout = async () => {
    try { await logout(); } catch {}
    router.replace('/welcome');
  };

  const titleFor = (id: SuperAdminNavId) => NAV.find((n) => n.id === id)?.label || 'Overview';

  return (
    <View style={s.shell}>
      <Sidebar active={active} onNav={setActive} onLogout={onLogout} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar title={titleFor(active)} />
        <ScrollView
          style={{ flex: 1, backgroundColor: SAC.bg }}
          contentContainerStyle={{ padding: 22, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {active === 'overview'    && <OverviewView />}
          {active === 'colleges'    && <StubView title="Colleges"     note="Manage all 48 colleges — NAAC verifications, MoUs, billing." />}
          {active === 'students'    && <StubView title="Students"     note="Aggregated student directory across all colleges." />}
          {active === 'mentors'     && <StubView title="Mentors"      note="Mentor approvals, payout tiers, performance." />}
          {active === 'alumni'      && <StubView title="Alumni"       note="Cross-college alumni directory, donations, refer drives." />}
          {active === 'events'      && <StubView title="Events"       note="Platform-wide events catalogue, hackathons, AMAs." />}
          {active === 'payments'    && <StubView title="Payments"     note="Stripe ledger, payouts, invoices, refunds — coming next." />}
          {active === 'analytics'   && <StubView title="Analytics"    note="Cohort growth, retention curves, A/B test results." />}
          {active === 'approvals'   && <StubView title="Approvals"    note="12 pending: 4 colleges, 6 mentors, 2 events." />}
          {active === 'ai-insights' && <StubView title="AI Insights"  note="Claude-powered platform briefings and predictions." />}
          {active === 'settings'    && <StubView title="Settings"     note="Global config, role permissions, integrations." />}
          {active === 'workflows'   && <StubView title="Workflows (NEW)" note="Automation builder for approvals, alerts, payouts." />}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: SAC.bg, height: '100%' as any },
});
