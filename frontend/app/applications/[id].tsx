/**
 * /applications/[id] — Application Tracker
 * Shows status, cost breakdown, decision countdown, deadlines, timeline,
 * AI-generated next steps. Wired to /api/he/applications/{id}.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useTheme } from '@/src/theme/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STATUS_META: Record<string, { label: string; icon: IconName; color: string }> = {
  draft:               { label: 'Draft',                icon: 'pencil',           color: '#94A3B8' },
  submitted:           { label: 'Application Submitted',icon: 'email-fast',       color: '#3B82F6' },
  under_review:        { label: 'Under Review',         icon: 'magnify',          color: '#60A5FA' },
  interview_scheduled: { label: 'Interview Scheduled',  icon: 'calendar-clock',   color: '#F59E0B' },
  decision_pending:    { label: 'Decision Pending',     icon: 'clock-outline',    color: '#F59E0B' },
  accepted:            { label: 'Accepted!',            icon: 'check-decagram',   color: '#10B981' },
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
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'student';

  const themeColor =
    role === 'alumni' ? '#60A5FA' :
    role === 'mentor' ? '#5EEAD4' :
    role === 'college' || role === 'admin' ? '#818CF8' :
    '#60A5FA';

  const activeTabColor =
    role === 'alumni' ? '#3B82F6' :
    role === 'mentor' ? '#14B8A6' :
    role === 'college' || role === 'admin' ? '#6366F1' :
    '#2563EB';

  const colors = useMemo(() => ({
    bg: isDark ? '#0A1628' : '#F8FAFC',
    card: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
    cardShadow: isDark ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255,255,255,0.72)' : '#334155',
    text3: isDark ? 'rgba(255,255,255,0.46)' : '#64748B',
    border: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
    backBtnBg: isDark ? 'rgba(255,255,255,0.08)' : '#EFF6FF',
    backBtnBorder: isDark ? 'rgba(255,255,255,0.10)' : '#BFDBFE',
    backBtnText: isDark ? '#FFFFFF' : '#2563EB',
  }), [isDark]);

  const handleBack = () => {
    if (role === 'alumni') {
      router.replace('/alumni-portal?tab=higher-ed' as any);
    } else if (role === 'student') {
      router.replace('/student-portal?tab=higher-ed' as any);
    } else {
      router.replace('/higher-education' as any);
    }
  };
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
      <FeaturePageShell title="Application Tracker" subtitle="Loading…" heroEmoji="📋" accent={themeColor}>
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color={themeColor} size="large" />
        </View>
      </FeaturePageShell>
    );
  }

  if (!app || error) {
    return (
      <FeaturePageShell title="Application Tracker" subtitle={error || 'Not found'} heroEmoji="📋" accent={themeColor}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.backBtnBg, borderColor: colors.backBtnBorder }]} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={14} color={colors.backBtnText} />
          <Text style={[s.backBtnText, { color: colors.backBtnText }]}>Back to programmes</Text>
        </Pressable>
      </FeaturePageShell>
    );
  }

  const prog = app.programme_snapshot || {};
  const status = STATUS_META[app.status] || STATUS_META.submitted;
  const days = app.days_until_decision ?? 0;
  const daysColor = days > 30 ? themeColor : days >= 14 ? '#F59E0B' : '#F87171';

  return (
    <FeaturePageShell
      title={prog.name || 'Application'}
      subtitle={`${prog.institution} · ${prog.country} · App ID: ${app.app_id}`}
      heroEmoji="📋"
      accent={themeColor}
      rightSlot={
        <Pressable style={[s.backBtn, { backgroundColor: colors.backBtnBg, borderColor: colors.backBtnBorder }]} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={14} color={colors.backBtnText} />
          <Text style={[s.backBtnText, { color: colors.backBtnText }]}>Programmes</Text>
        </Pressable>
      }
    >
      {/* Status card */}
      <View style={[s.statusCard, { backgroundColor: colors.card, borderColor: isDark ? status.color + '66' : status.color + '40' }, colors.cardShadow]}>
        <View style={[s.statusIcon, { backgroundColor: status.color + '22' }]}>
          <MaterialCommunityIcons name={status.icon} size={24} color={status.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.statusLabel, { color: colors.text3 }]}>STATUS</Text>
          <Text style={[s.statusValue, { color: status.color }]}>{status.label}</Text>
          <Text style={[s.statusSub, { color: colors.text2 }]}>
            Submitted on {fmtDate(app.submitted_at)} · Expected decision {fmtDate(app.expected_decision_at)}
          </Text>
        </View>
      </View>

      {/* Two-up: cost + countdown */}
      <View style={s.twoUp}>
        <View style={[s.card, { flex: 1.2, backgroundColor: colors.card, borderColor: colors.cardBorder }, colors.cardShadow]}>
          <View style={s.cardHead}>
            <MaterialCommunityIcons name="cash-multiple" size={16} color="#F59E0B" />
            <Text style={[s.cardTitle, { color: colors.text }]}>Cost Breakdown</Text>
          </View>
          {app.cost_breakdown && (
            <View style={{ gap: 8 }}>
              <CostRow label="Tuition fee (per year)" value={fmtINR(app.cost_breakdown.tuition_per_year_inr)} colors={colors} />
              <CostRow label="Living costs (per year)" value={fmtINR(app.cost_breakdown.living_per_year_inr)} colors={colors} />
              <CostRow label="Application fee (paid)" value={fmtINR(app.cost_breakdown.app_fee_inr)} good colors={colors} />
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <CostRow label="Total Year 1" value={fmtINR(app.cost_breakdown.total_y1_inr)} bold colors={colors} />
              <CostRow label="Total programme" value={fmtINR(app.cost_breakdown.total_programme_inr)} bold accent colors={colors} />
            </View>
          )}
        </View>

        <View style={[s.card, { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder }, colors.cardShadow]}>
          <Text style={[s.countdownNumber, { color: daysColor }]}>{days}</Text>
          <Text style={[s.countdownLabel, { color: colors.text2 }]}>days remaining</Text>
          <Text style={[s.countdownSub, { color: colors.text3 }]}>until {fmtDate(app.expected_decision_at)}</Text>
        </View>
      </View>

      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }, colors.cardShadow]}>
        <View style={s.cardHead}>
          <MaterialCommunityIcons name="calendar-check" size={16} color={themeColor} />
          <Text style={[s.cardTitle, { color: colors.text }]}>Deadlines Checklist</Text>
        </View>
        <View style={{ gap: 8 }}>
          {(app.deadlines || []).map((d: any) => {
            const dotColor = d.status === 'done' ? '#10B981'
                          : d.status === 'pending' ? '#F59E0B'
                          : d.status === 'missed' ? '#F87171' : '#94A3B8';
            const dotIcon: IconName = d.status === 'done' ? 'check-circle'
                                    : d.status === 'pending' ? 'clock-outline'
                                    : d.status === 'missed' ? 'close-circle' : 'circle-outline';
            return (
              <View key={d.id} style={[s.dlRow, { borderBottomColor: colors.border }]}>
                <MaterialCommunityIcons name={dotIcon} size={18} color={dotColor} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.dlLabel, { color: colors.text }]}>{d.label}{d.progress ? ` (${d.progress})` : ''}</Text>
                  <Text style={[s.dlDate, { color: colors.text3 }]}>{fmtDate(d.due_date)}</Text>
                </View>
                <Text style={[s.dlStatus, { color: dotColor }]}>{d.status.toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Timeline */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }, colors.cardShadow]}>
        <View style={s.cardHead}>
          <MaterialCommunityIcons name="timeline-clock" size={16} color="#06B6D4" />
          <Text style={[s.cardTitle, { color: colors.text }]}>Application Timeline</Text>
        </View>
        <View style={{ gap: 12 }}>
          {(app.timeline || []).map((t: any, idx: number) => {
            const dotColor = t.status === 'done' ? '#10B981'
                          : t.status === 'current' ? themeColor : '#94A3B8';
            return (
              <View key={t.id} style={s.tlRow}>
                <View style={[s.tlDot, { backgroundColor: dotColor + '22', borderColor: dotColor }]}>
                  <MaterialCommunityIcons
                    name={t.status === 'done' ? 'check' : t.status === 'current' ? 'circle-double' : 'circle-outline'}
                    size={16} color={dotColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.tlLabel, { color: t.status === 'pending' ? colors.text3 : colors.text }]}>{t.label}</Text>
                  <Text style={[s.tlDate, { color: colors.text3 }]}>{fmtDate(t.date)} · {t.status}</Text>
                </View>
                {idx < (app.timeline || []).length - 1 && (
                  <View style={[s.tlConnector, { backgroundColor: t.status === 'done' ? '#10B98155' : '#94A3B855' }]} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={[s.card, { backgroundColor: colors.card, borderColor: isDark ? themeColor + '73' : '#CBD5E1' }, colors.cardShadow]}>
        <View style={s.cardHead}>
          <MaterialCommunityIcons name="auto-fix" size={16} color={themeColor} />
          <Text style={[s.cardTitle, { color: colors.text }]}>Next Steps</Text>
          <Pressable style={[s.aiBtn, { backgroundColor: isDark ? themeColor + '26' : '#EFF6FF', borderColor: isDark ? themeColor + '73' : '#BFDBFE' }]} onPress={fetchSteps} disabled={stepsBusy}>
            {stepsBusy ? <ActivityIndicator color={themeColor} size="small" /> : <>
              <MaterialCommunityIcons name="refresh" size={11} color={isDark ? themeColor : '#2563EB'} />
              <Text style={[s.aiBtnText, { color: isDark ? themeColor : '#2563EB' }]}>Generate</Text>
            </>}
          </Pressable>
        </View>
        {nextSteps.length === 0 && !stepsBusy && (
          <Text style={[s.placeholder, { color: colors.text3 }]}>Click "Generate" for AI-curated next steps based on your application status.</Text>
        )}
        {nextSteps.map((step, i) => (
          <View key={i} style={[s.stepRow, { borderBottomColor: colors.border }]}>
            <View style={[s.stepBullet, { backgroundColor: isDark ? themeColor + '33' : '#EFF6FF' }]}>
              <Text style={[s.stepBulletText, { color: isDark ? themeColor : '#2563EB' }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.stepTitle, { color: colors.text }]}>{step.title}</Text>
              {step.why && <Text style={[s.stepWhy, { color: colors.text3 }]}>{step.why}</Text>}
            </View>
            {step.action?.label && (
              <View style={[s.stepAction, { backgroundColor: activeTabColor }]}>
                <Text style={s.stepActionText}>{step.action.label}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </FeaturePageShell>
  );
}

function CostRow({ label, value, good, bold, accent, colors }: { label: string; value: string; good?: boolean; bold?: boolean; accent?: boolean; colors: any }) {
  return (
    <View style={s.costRow}>
      <Text style={[s.costLabel, { color: bold ? colors.text : colors.text2 }, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[
        s.costValue,
        { color: colors.text },
        bold && { fontWeight: '800' },
        good && { color: '#10B981' },
        accent && { color: '#D97706' },
      ]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  backBtnText: { fontSize: 11, fontWeight: '700' },

  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 16, borderWidth: 1,
  },
  statusIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontSize: 10.5, letterSpacing: 1 },
  statusValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  statusSub: { fontSize: 12, marginTop: 4 },

  twoUp: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    padding: 16, borderRadius: 14,
    borderWidth: 1,
    minWidth: 280, gap: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '800', flex: 1 },

  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { fontSize: 12.5 },
  costValue: { fontSize: 13, fontWeight: '600' },
  divider: { height: 1, marginVertical: 4 },

  countdownNumber: { fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  countdownLabel: { fontSize: 13, fontWeight: '600' },
  countdownSub: { fontSize: 11, marginTop: 4 },

  dlRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dlLabel: { fontSize: 13, fontWeight: '600' },
  dlDate: { fontSize: 11, marginTop: 2 },
  dlStatus: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  tlDot: {
    width: 36, height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
    zIndex: 2,
  },
  tlConnector: { position: 'absolute', left: 17, top: 36, width: 2, height: 24, opacity: 0.5 },
  tlLabel: { fontSize: 13, fontWeight: '700' },
  tlDate: { fontSize: 11, marginTop: 2 },

  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1,
  },
  aiBtnText: { fontSize: 10.5, fontWeight: '800' },
  placeholder: { fontSize: 12, fontStyle: 'italic' },

  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  stepBullet: {
    width: 24, height: 24, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBulletText: { fontSize: 11, fontWeight: '800' },
  stepTitle: { fontSize: 13, fontWeight: '600' },
  stepWhy: { fontSize: 11, marginTop: 2 },
  stepAction: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  stepActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
