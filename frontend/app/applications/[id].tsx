/**
 * /applications/[id] — Application Tracker
 * Shows status, cost breakdown, decision countdown, deadlines, timeline,
 * AI-generated next steps. Wired to /api/he/applications/{id}.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

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
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'student';

  const themeColor =
    role === 'alumni' ? '#60A5FA' :
    role === 'mentor' ? '#5EEAD4' :
    role === 'college' || role === 'admin' ? '#818CF8' :
    '#A78BFA';

  const activeTabColor =
    role === 'alumni' ? '#3B82F6' :
    role === 'mentor' ? '#14B8A6' :
    role === 'college' || role === 'admin' ? '#6366F1' :
    '#7C3AED';

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
        <View className="py-16 items-center">
          <ActivityIndicator color={themeColor} size="large" />
        </View>
      </FeaturePageShell>
    );
  }

  if (!app || error) {
    return (
      <FeaturePageShell title="Application Tracker" subtitle={error || 'Not found'} heroEmoji="📋" accent={themeColor}>
        <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10" onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={14} color="#fff" />
          <Text className="text-white text-xs font-body-bold">Back to programmes</Text>
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
        <Pressable className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10" onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={14} color="#fff" />
          <Text className="text-white text-xs font-body-bold">Programmes</Text>
        </Pressable>
      }
    >
      {/* Status card */}
      <View className="flex-row items-center gap-3.5 p-4 rounded-2xl border bg-white/4" style={{ borderColor: status.color + '66' }}>
        <View className="w-[50px] h-[50px] rounded-xl items-center justify-center" style={{ backgroundColor: status.color + '22' }}>
          <MaterialCommunityIcons name={status.icon} size={24} color={status.color} />
        </View>
        <View className="flex-1">
          <Text className="text-dim text-xs" style={{ letterSpacing: 1 }}>STATUS</Text>
          <Text className="text-lg font-body-bold mt-0.5" style={{ color: status.color }}>{status.label}</Text>
          <Text className="text-muted text-xs mt-1">
            Submitted on {fmtDate(app.submitted_at)} · Expected decision {fmtDate(app.expected_decision_at)}
          </Text>
        </View>
      </View>

      {/* Two-up: cost + countdown */}
      <View className="flex-row flex-wrap gap-3.5">
        <View className="p-4 rounded-xl bg-white/4 border border-glass-border min-w-[280px] gap-2.5" style={{ flex: 1.2 }}>
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="cash-multiple" size={16} color="#FCD34D" />
            <Text className="text-white text-sm font-body-bold flex-1">Cost Breakdown</Text>
          </View>
          {app.cost_breakdown && (
            <View className="gap-2">
              <CostRow label="Tuition fee (per year)" value={fmtINR(app.cost_breakdown.tuition_per_year_inr)} />
              <CostRow label="Living costs (per year)" value={fmtINR(app.cost_breakdown.living_per_year_inr)} />
              <CostRow label="Application fee (paid)" value={fmtINR(app.cost_breakdown.app_fee_inr)} good />
              <View className="h-px bg-glass-border my-1" />
              <CostRow label="Total Year 1" value={fmtINR(app.cost_breakdown.total_y1_inr)} bold />
              <CostRow label="Total programme" value={fmtINR(app.cost_breakdown.total_programme_inr)} bold accent />
            </View>
          )}
        </View>

        <View className="p-4 rounded-xl bg-white/4 border border-glass-border min-w-[280px] gap-2.5 flex-1 items-center justify-center">
          <Text className="text-6xl font-body-bold -tracking-0.5" style={{ color: daysColor, fontWeight: '900' }}>{days}</Text>
          <Text className="text-muted text-sm font-body-semibold">days remaining</Text>
          <Text className="text-dim text-xs mt-1">until {fmtDate(app.expected_decision_at)}</Text>
        </View>
      </View>

      <View className="p-4 rounded-xl bg-white/4 border border-glass-border min-w-[280px] gap-2.5">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="calendar-check" size={16} color={themeColor} />
          <Text className="text-white text-sm font-body-bold flex-1">Deadlines Checklist</Text>
        </View>
        <View className="gap-2">
          {(app.deadlines || []).map((d: any) => {
            const dotColor = d.status === 'done' ? '#34D399'
                          : d.status === 'pending' ? '#F59E0B'
                          : d.status === 'missed' ? '#F87171' : '#94A3B8';
            const dotIcon: IconName = d.status === 'done' ? 'check-circle'
                                    : d.status === 'pending' ? 'clock-outline'
                                    : d.status === 'missed' ? 'close-circle' : 'circle-outline';
            return (
              <View key={d.id} className="flex-row items-center gap-2.5 py-2 border-b border-glass-border">
                <MaterialCommunityIcons name={dotIcon} size={18} color={dotColor} />
                <View className="flex-1">
                  <Text className="text-white text-sm font-body-semibold">{d.label}{d.progress ? ` (${d.progress})` : ''}</Text>
                  <Text className="text-dim text-xs mt-0.5">{fmtDate(d.due_date)}</Text>
                </View>
                <Text className="text-xs font-body-bold" style={{ color: dotColor, letterSpacing: 0.5 }}>{d.status.toUpperCase()}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Timeline */}
      <View className="p-4 rounded-xl bg-white/4 border border-glass-border min-w-[280px] gap-2.5">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="timeline-clock" size={16} color="#06B6D4" />
          <Text className="text-white text-sm font-body-bold flex-1">Application Timeline</Text>
        </View>
        <View className="gap-3">
          {(app.timeline || []).map((t: any, idx: number) => {
            const dotColor = t.status === 'done' ? '#34D399'
                          : t.status === 'current' ? themeColor : '#475569';
            return (
              <View key={t.id} className="flex-row items-center gap-3 relative">
                <View className="w-9 h-9 rounded-full items-center justify-center border-2 z-[2]" style={{ backgroundColor: dotColor + '22', borderColor: dotColor }}>
                  <MaterialCommunityIcons
                    name={t.status === 'done' ? 'check' : t.status === 'current' ? 'circle-double' : 'circle-outline'}
                    size={16} color={dotColor}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-body-bold" style={{ color: t.status === 'pending' ? C.text3 : '#fff' }}>{t.label}</Text>
                  <Text className="text-dim text-xs mt-0.5">{fmtDate(t.date)} · {t.status}</Text>
                </View>
                {idx < (app.timeline || []).length - 1 && (
                  <View className="absolute left-[17px] top-9 w-0.5 h-6 opacity-50" style={{ backgroundColor: t.status === 'done' ? '#34D39955' : '#47556955' }} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View className="p-4 rounded-xl bg-white/4 min-w-[280px] gap-2.5" style={{ borderColor: themeColor + '73', borderWidth: 1 }}>
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="auto-fix" size={16} color={themeColor} />
          <Text className="text-white text-sm font-body-bold flex-1">Next Steps</Text>
          <Pressable className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-violet/15 border border-violet/45" onPress={fetchSteps} disabled={stepsBusy}>
            {stepsBusy ? <ActivityIndicator color={themeColor} size="small" /> : <>
              <MaterialCommunityIcons name="refresh" size={11} color={themeColor} />
              <Text className="text-violet text-xs font-body-bold">Generate</Text>
            </>}
          </Pressable>
        </View>
        {nextSteps.length === 0 && !stepsBusy && (
          <Text className="text-dim text-xs italic">Click "Generate" for AI-curated next steps based on your application status.</Text>
        )}
        {nextSteps.map((step, i) => (
          <View key={i} className="flex-row items-center gap-2.5 py-2 border-b border-glass-border">
            <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: themeColor + '33' }}>
              <Text className="text-xs font-body-bold" style={{ color: themeColor }}>{i + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-body-semibold">{step.title}</Text>
              {step.why && <Text className="text-dim text-xs mt-0.5">{step.why}</Text>}
            </View>
            {step.action?.label && (
              <View className="px-2.5 py-1 rounded-full bg-violet">
                <Text className="text-white text-xs font-body-bold">{step.action.label}</Text>
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
    <View className="flex-row justify-between">
      <Text className="text-muted text-sm" style={bold ? { fontWeight: '700', color: '#fff' } : {}}>{label}</Text>
      <Text className="text-white text-sm font-body-semibold" style={{
        ...(bold ? { fontWeight: '800' } : {}),
        ...(good ? { color: '#34D399' } : {}),
        ...(accent ? { color: '#FCD34D' } : {}),
      }}>{value}</Text>
    </View>
  );
}
