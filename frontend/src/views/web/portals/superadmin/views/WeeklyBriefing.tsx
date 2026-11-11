/**
 * Weekly platform health briefing (AI4).
 *
 * Shows the most recent Monday 09:00 IST briefing produced by the platform
 * health briefing agent, plus the metric snapshot it was derived from, and
 * lets an admin regenerate it on demand.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  Sparkles, AlertTriangle, TrendingUp, Lightbulb, RefreshCw, Calendar, Zap,
} from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import {
  GRAD, Card, IconBox, StatusPill, GradientButton, SecondaryButton,
  SectionLabel, useToast, Toast,
} from '../applekit';
import { request } from '@/src/models/services/api';

type Insight = {
  kind: 'risk' | 'opportunity' | 'insight';
  severity: 'high' | 'medium' | 'low';
  title: string;
  body: string;
};

type Snapshot = {
  window_days: number;
  growth: {
    new_users: number; new_users_prev: number; new_users_pct: number | null;
    total_users: number; new_mentors: number; new_colleges: number;
  };
  engagement: {
    active_users: number; active_users_prev: number; active_users_pct: number | null;
    bookings: number; event_registrations: number;
  };
  revenue: {
    gross: number; net: number; transactions: number;
    avg_order: number; refunds: number;
  };
  errors: {
    email_failures: number; whatsapp_failures: number;
    failed_agent_runs: number; total: number;
  };
  approvals: { pending: number; overdue: number; by_kind: Record<string, number> };
};

type Briefing = {
  id: string;
  week_of: string;
  generated_at: string;
  window_days: number;
  insight_count: number;
  model: string;
  snapshot: Snapshot;
  insights: Insight[];
};

const ICON_MAP: Record<string, any> = { AlertTriangle, TrendingUp, Lightbulb, Zap };

const KIND_COLOR: Record<string, string> = {
  risk: '#F0616D',
  opportunity: '#34D399',
  insight: '#F59E0B',
};

const SEVERITY_KIND: Record<string, any> = { high: 'danger', medium: 'warn', low: 'info' };

const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null || pct === undefined) {
    return <Text style={[s.delta, { color: SAC.dim }]}>no prior data</Text>;
  }
  const up = pct >= 0;
  return (
    <Text style={[s.delta, { color: up ? '#34D399' : '#F0616D' }]}>
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </Text>
  );
}

function Stat({ label, value, delta }: { label: string; value: any; delta?: number | null }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {delta !== undefined ? <Delta pct={delta} /> : null}
    </View>
  );
}

export function WeeklyBriefing() {
  const { toast, flash, hide } = useToast();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res: any = await request('/admin/briefings/latest');
      setBriefing(res?.briefing || null);
    } catch (e: any) {
      flash(e?.message || 'Failed to load the weekly briefing', 'error');
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  const regenerate = async () => {
    setBusy(true);
    try {
      const res: any = await request('/admin/briefings/generate', { method: 'POST' });
      flash(`Briefing ${res?.week_of || ''} generated — ${res?.insight_count || 0} insight(s)`);
      await load();
    } catch (e: any) {
      flash(e?.message || 'Could not generate a briefing', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card style={s.card}>
        <Text style={s.empty}>Loading the latest weekly briefing…</Text>
      </Card>
    );
  }

  if (!briefing) {
    return (
      <Card style={s.card}>
        <View style={s.emptyHead}>
          <IconBox size={32} tint={GRAD.soft}>
            <Sparkles size={16} color={GRAD.to} />
          </IconBox>
          <Text style={s.emptyTitle}>No briefing yet</Text>
        </View>
        <Text style={s.empty}>
          The platform health briefing agent publishes every Monday at 09:00 IST.
          You can also generate one now.
        </Text>
        <View style={{ marginTop: 14, alignSelf: 'flex-start' }}>
          <GradientButton onPress={regenerate} loading={busy}>
            <RefreshCw size={13} color="#fff" />
            <Text style={s.btnText}>Generate briefing</Text>
          </GradientButton>
        </View>
        <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
      </Card>
    );
  }

  const snap = briefing.snapshot || ({} as Snapshot);
  const growth = snap.growth || ({} as any);
  const eng = snap.engagement || ({} as any);
  const rev = snap.revenue || ({} as any);
  const err = snap.errors || ({} as any);
  const appr = snap.approvals || ({} as any);

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <Card style={s.card}>
        <View style={s.head}>
          <IconBox size={36} tint={GRAD.soft}>
            <Sparkles size={17} color={GRAD.to} />
          </IconBox>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={s.titleRow}>
              <Text style={s.title}>Weekly platform health briefing</Text>
              <StatusPill label={briefing.week_of || '—'} kind="brand" />
            </View>
            <View style={s.metaRow}>
              <Calendar size={11} color={SAC.dim} />
              <Text style={s.meta}>Generated {fmtDate(briefing.generated_at)}</Text>
              <Text style={s.dot}>·</Text>
              <Text style={s.meta}>{briefing.insight_count} insight(s)</Text>
              <Text style={s.dot}>·</Text>
              <Text style={s.meta}>{briefing.model === 'rules' ? 'rule-based' : 'Claude'}</Text>
            </View>
          </View>
          <SecondaryButton size="sm" onPress={regenerate} disabled={busy}>
            <RefreshCw size={12} color={SAC.muted} />
            <Text style={s.btnGhost}>Regenerate</Text>
          </SecondaryButton>
        </View>
      </Card>

      {/* Snapshot */}
      <Card style={s.card}>
        <SectionLabel>Metric snapshot · last {briefing.window_days || 7} days</SectionLabel>
        <View style={s.grid}>
          <Stat label="NEW USERS" value={growth.new_users ?? 0} delta={growth.new_users_pct} />
          <Stat label="ACTIVE USERS" value={eng.active_users ?? 0} delta={eng.active_users_pct} />
          <Stat label="GROSS REVENUE" value={money(rev.gross)} />
          <Stat label="NET REVENUE" value={money(rev.net)} />
          <Stat label="TRANSACTIONS" value={rev.transactions ?? 0} />
          <Stat label="APPROVALS PENDING" value={appr.pending ?? 0} />
        </View>
        {appr.overdue > 0 ? (
          <View style={s.alertRow}>
            <AlertTriangle size={13} color="#F0616D" />
            <Text style={s.alertText}>
              {appr.overdue} approval(s) past their SLA — {money(rev.refunds)} refunded this week,{' '}
              {err.total ?? 0} delivery/agent failure(s).
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Insights */}
      <Card style={s.card}>
        <SectionLabel>Insights · {briefing.insights?.length || 0}</SectionLabel>
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 10 }}>
            {(briefing.insights || []).map((it, i) => {
              const Icon = ICON_MAP[it.kind] || Lightbulb;
              const color = KIND_COLOR[it.kind] || KIND_COLOR.insight;
              return (
                <View key={`${it.title}-${i}`} style={s.insight}>
                  <View style={[s.insightIcon, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    <Icon size={14} color={color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.titleRow}>
                      <Text style={s.insightTitle}>{it.title}</Text>
                      <StatusPill
                        label={(it.severity || 'medium').toUpperCase()}
                        kind={SEVERITY_KIND[it.severity] || 'info'}
                      />
                    </View>
                    <Text style={s.insightBody}>{it.body}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { gap: 12 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  meta: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },
  dot: { color: SAC.dim, fontSize: 10.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flexGrow: 1, flexBasis: 140, minWidth: 130,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: SAC.border,
  },
  statLabel: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.6 },
  statValue: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 4 },
  delta: { fontFamily: FONTS.bold, fontSize: 10.5, marginTop: 3 },

  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 9,
    backgroundColor: 'rgba(240,97,107,0.08)', borderWidth: 1, borderColor: 'rgba(240,97,107,0.28)',
  },
  alertText: { color: '#FCA5A5', fontFamily: FONTS.med, fontSize: 11.5, flex: 1, lineHeight: 16 },

  insight: {
    flexDirection: 'row', gap: 12, padding: 12, borderRadius: 11,
    backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border,
  },
  insightIcon: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 13 },
  insightBody: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 5, lineHeight: 17 },

  emptyHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 13.5 },
  empty: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 },

  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  btnGhost: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
});
