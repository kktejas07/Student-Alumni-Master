/**
 * /applications/[id] — Application Tracker
 * Shows status, cost breakdown, decision countdown, deadlines, timeline,
 * AI-generated next steps. Wired to /api/he/applications/{id}.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { request } from '@/src/models/services/api';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const C = {
  text: '#fff', text2: 'rgba(255,255,255,0.72)', text3: 'rgba(255,255,255,0.46)',
  border: 'rgba(255,255,255,0.10)', card: 'rgba(255,255,255,0.04)',
};

const STATUS_META: Record<string, { label: string; icon: IconName; color: string }> = {
  draft:               { label: 'Draft',                icon: 'pencil',           color: '#94A3B8' },
  submitted:           { label: 'Application Submitted',icon: 'email-fast',       color: '#3B82F6' },
  under_review:        { label: 'Under Review',         icon: 'magnify',          color: '#A78BFA' },
  interview_scheduled: { label: 'Interview Scheduled',  icon: 'calendar-clock',   color: '#F59E0B' },
  decision_pending:    { label: 'Decision Pending',     icon: 'clock-outline',    color: '#F59E0B' },
  accepted:            { label: 'Accepted!',            icon: 'check-decagram',   color: '#34D399' },
  rejected:            { label: 'Rejected',             icon: 'close-circle',     color: '#F87171' },
  waitlisted:          { label: 'Waitlisted',           icon: 'progress-clock',   color: '#FCD34D' },
  enrolled:            { label: 'Enrolled',             icon: 'school',           color: '#10B981' },
};

const fmtINR = (n: number) => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN',
  { day: '2-digit', month: 'short', year: 'numeric' });

export default function ApplicationTrackerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<any | null>(null);
  const [nextSteps, setNextSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepsBusy, setStepsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await request<any>(`/he/applications/${id}`);
      setApp(r.application);
    } catch (e: any) { setError(e?.message || 'Could not load'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const fetchSteps = async () => {
    setStepsBusy(true);
    try {
      const r = await request<any>('/he/ai/next-steps', { method: 'POST', body: { application_id: id } });
      setNextSteps(r.steps || []);
    } catch (e: any) { setError(e?.message); }
    finally { setStepsBusy(false); }
  };

  if (loading) {
    return (
      <FeaturePageShell title="Application Tracker" subtitle="Loading…" heroEmoji="📋" accent="#7C3AED">
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color="#A78BFA" size="large" />
        </View>
      </FeaturePageShell>
    );
  }

  if (!app || error) {
    return (
      <FeaturePageShell title="Application Tracker" subtitle={error || 'Not found'} heroEmoji="📋" accent="#7C3AED">
        <Pressable style={s.backBtn} onPress={() => router.replace('/higher-education' as any)}>
          <MaterialCommunityIcons name="arrow-left" size={14} color="#fff" />
          <Text style={s.backBtnText}>Back to programmes</Text>
        </Pressable>
      </FeaturePageShell>
    );
  }

  const prog = app.programme_snapshot || {};
  const status = STATUS_META[app.status] || STATUS_META.submitted;
  const days = app.days_until_decision ?? 0;
  const daysColor = days > 30 ? '#A78BFA' : days >= 14 ? '#F59E0B' : '#F87171';

  return (
    <FeaturePageShell
      title={prog.name || 'Application'}
      subtitle={`${prog.institution} · ${prog.country} · App ID: ${app.app_id}`}
      heroEmoji="📋"
      accent="#7C3AED"
      rightSlot={
        <Pressable style={s.backBtn} onPress={() => router.replace('/higher-education' as any)}>
          <MaterialCommunityIcons name="arrow-left" size={14} color="#fff" />
          <Text style={s.backBtnText}>Programmes</Text>
        </Pressable>
      }
    >
      {/* Status card */}
      <View style={[s.statusCard, { borderColor: status.color + '66' }]}>
        <View style={[s.statusIcon, { backgroundColor: status.color + '22' }]}>
          <MaterialCommunityIcons name={status.icon} size={24} color={status.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.statusLabel}>STATUS</Text>
          <Text style={[s.statusValue, { color: status.color }]}>{status.label}</Text>
          <Text style={s.statusSub}>
            Submitted on {fmtDate(app.submitted_at)} · Expected decision {fmtDate(app.expected_decision_at)}
          </Text>
        </View>
      </View>

      {/* Two-up: cost + countdown */}
      <View style={s.twoUp}>
        <View style={[s.card, { flex: 1.2 }]}>
          <View style={s.cardHead}>
            <MaterialCommunityIcons name="cash-multiple" size={16} color="#FCD34D" />
            <Text style={s.cardTitle}>Cost Breakdown</Text>
          </View>
          {app.cost_breakdown && (
            <View style={{ gap: 8 }}>
              <CostRow label="Tuition fee (per year)" value={fmtINR(app.cost_breakdown.tuition_per_year_inr)} />
              <CostRow label="Living costs (per year)" value={fmtINR(app.cost_breakdown.living_per_year_inr)} />
              <CostRow label="Application fee (paid)" value={fmtINR(app.cost_breakdown.app_fee_inr)} good />
              <View style={s.divider} />
              <CostRow label="Total Year 1" value={fmtINR(app.cost_breakdown.total_y1_inr)} bold />
              <CostRow label="Total programme" value={fmtINR(app.cost_breakdown.total_programme_inr)} bold accent />
            </View>
          )}
        </View>

        <View style={[s.card, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[s.countdownNumber, { color: daysColor }]}>{days}</Text>
          <Text style={s.countdownLabel}>days remaining</Text>
          <Text style={s.countdownSub}>until {fmtDate(app.expected_decision_at)}</Text>
        </View>
      </View>

      {/* Deadlines */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <MaterialCommunityIcons name="calendar-check" size={16} color="#A78BFA" />
          <Text style={s.cardTitle}>Deadlines Checklist</Text>
        </View>
        <View style={{ gap: 8 }}>
          {(app.deadlines || []).map((d: any) => {
            const dotColor = d.status === 'done' ? '#34D399'
                          : d.status === 'pending' ? '#F59E0B'
                          : d.status === 'missed' ? '#F87171' : '#94A3B8';
            const dotIcon: IconName = d.status === 'done' ? 'check-circle'
                                    : d.status === 'pending' ? 'clock-outline'
                                    : d.status === 'missed' ? 'close-circle' : 'circle-outline';
            return (
              <View key={d.id} style={s.dlRow}>
                <MaterialCommunityIcons name={dotIcon} size={18} color={dotColor} />
                <View style={{ flex: 1 }}>
                  <Text style={s.dlLabel}>{d.label}{d.progress ? ` (${d.progress})` : ''}</Text>
                  <Text style={s.dlDate}>{fmtDate(d.due_date)}</Text>
                </View>
                <Text style={[s.dlStatus, { color: dotColor }]}>{d.status.toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Timeline */}
      <View style={s.card}>
        <View style={s.cardHead}>
          <MaterialCommunityIcons name="timeline-clock" size={16} color="#06B6D4" />
          <Text style={s.cardTitle}>Application Timeline</Text>
        </View>
        <View style={{ gap: 12 }}>
          {(app.timeline || []).map((t: any, idx: number) => {
            const dotColor = t.status === 'done' ? '#34D399'
                          : t.status === 'current' ? '#A78BFA' : '#475569';
            return (
              <View key={t.id} style={s.tlRow}>
                <View style={[s.tlDot, { backgroundColor: dotColor + '22', borderColor: dotColor }]}>
                  <MaterialCommunityIcons
                    name={t.status === 'done' ? 'check' : t.status === 'current' ? 'circle-double' : 'circle-outline'}
                    size={16} color={dotColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tlLabel, { color: t.status === 'pending' ? C.text3 : '#fff' }]}>{t.label}</Text>
                  <Text style={s.tlDate}>{fmtDate(t.date)} · {t.status}</Text>
                </View>
                {idx < (app.timeline || []).length - 1 && (
                  <View style={[s.tlConnector, { backgroundColor: t.status === 'done' ? '#34D39955' : '#47556955' }]} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Next Steps (AI) */}
      <View style={[s.card, { borderColor: 'rgba(167,139,250,0.45)' }]}>
        <View style={s.cardHead}>
          <MaterialCommunityIcons name="auto-fix" size={16} color="#A78BFA" />
          <Text style={s.cardTitle}>Next Steps</Text>
          <Pressable style={s.aiBtn} onPress={fetchSteps} disabled={stepsBusy}>
            {stepsBusy ? <ActivityIndicator color="#A78BFA" size="small" /> : <>
              <MaterialCommunityIcons name="refresh" size={11} color="#A78BFA" />
              <Text style={s.aiBtnText}>Generate</Text>
            </>}
          </Pressable>
        </View>
        {nextSteps.length === 0 && !stepsBusy && (
          <Text style={s.placeholder}>Click "Generate" for AI-curated next steps based on your application status.</Text>
        )}
        {nextSteps.map((step, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepBullet}>
              <Text style={s.stepBulletText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{step.title}</Text>
              {step.why && <Text style={s.stepWhy}>{step.why}</Text>}
            </View>
            {step.action?.label && (
              <View style={s.stepAction}>
                <Text style={s.stepActionText}>{step.action.label}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </FeaturePageShell>
  );
}

function CostRow({ label, value, good, bold, accent }: { label: string; value: string; good?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <View style={s.costRow}>
      <Text style={[s.costLabel, bold && { fontWeight: '700', color: '#fff' }]}>{label}</Text>
      <Text style={[s.costValue,
        bold && { fontWeight: '800' },
        good && { color: '#34D399' },
        accent && { color: '#FCD34D' }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: C.border, borderWidth: 1,
  },
  backBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 16, borderWidth: 1,
    backgroundColor: C.card,
  },
  statusIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { color: C.text3, fontSize: 10.5, letterSpacing: 1 },
  statusValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  statusSub: { color: C.text2, fontSize: 12, marginTop: 4 },

  twoUp: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    padding: 16, borderRadius: 14,
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    minWidth: 280, gap: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '800', flex: 1 },

  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { color: C.text2, fontSize: 12.5 },
  costValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },

  countdownNumber: { fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  countdownLabel: { color: C.text2, fontSize: 13, fontWeight: '600' },
  countdownSub: { color: C.text3, fontSize: 11, marginTop: 4 },

  dlRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dlLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dlDate: { color: C.text3, fontSize: 11, marginTop: 2 },
  dlStatus: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  tlDot: {
    width: 36, height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    zIndex: 2,
  },
  tlConnector: { position: 'absolute', left: 17, top: 36, width: 2, height: 24, opacity: 0.5 },
  tlLabel: { fontSize: 13, fontWeight: '700' },
  tlDate: { color: C.text3, fontSize: 11, marginTop: 2 },

  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderColor: 'rgba(167,139,250,0.45)', borderWidth: 1,
  },
  aiBtnText: { color: '#A78BFA', fontSize: 10.5, fontWeight: '800' },
  placeholder: { color: C.text3, fontSize: 12, fontStyle: 'italic' },

  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  stepBullet: {
    width: 24, height: 24, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBulletText: { color: '#A78BFA', fontSize: 11, fontWeight: '800' },
  stepTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  stepWhy: { color: C.text3, fontSize: 11, marginTop: 2 },
  stepAction: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  stepActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
