// @ts-nocheck
/**
 * /agent-k — Unified Agent K view (v0.14.0).
 *
 * One view, portal-aware. Three modes:
 *
 *   1. NO-AUTH               → quietly redirect to /login
 *   2. NO-AI-CONNECTED       → empty state with "Connect AI" CTA → /marketplace
 *   3. READY                 → Prescription Cards grid + Run history below
 *
 * Prescription cards come from `GET /api/agent-k/prescriptions?portal=...`
 * and are 1-click actions derived from the user's active dashboard
 * recommendations. Each tap submits the canned `prompt` to /agent-k/run
 * which is gated server-side (BYO-AI). Run history is the existing
 * /agent-k/runs feed, collapsed below the prescriptions.
 *
 * Replaces the previous 781-line 3-column template workspace AND the
 * standalone /agent-k/runs route (now a redirect).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, useWindowDimensions,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeContext';
import { PORTAL_ACCENTS } from '@/src/theme/nexus';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { AiCopilotFab as StudentAiCopilotFab } from '@/src/views/web/portals/student/glass';

const FONT = Platform.select({
  ios: 'System', android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
}) as string;

type Card = {
  id: string; icon: string; tint: string;
  kicker: string; title: string; subtitle?: string;
  cta: string; prompt: string; tools: string[];
};
type Provider = { tool_id: string; label: string; connected_at?: string };
type Prescriptions = {
  portal: string;
  cards: Card[];
  ai_connected: boolean;
  is_admin: boolean;
  deeplink_marketplace: string;
};
type RunRow = {
  _id?: string; id?: string; prompt?: string; status?: string;
  started_at?: string; result_summary?: string | null;
};
type Schedule = {
  id: string;
  title: string;
  prompt: string;
  cadence: 'hourly' | 'daily' | 'weekly' | 'cron';
  hour?: number;
  minute?: number;
  weekday?: number;
  interval_hours?: number;
  cron_expr?: string | null;
  timezone?: string;
  status: 'active' | 'paused';
  cadence_label?: string;
  last_run_at?: string | null;
  last_status?: string | null;
  next_run_at?: string | null;
  runs_count?: number;
};
type PortalKey = 'student' | 'alumni' | 'mentor' | 'college' | 'admin';

/** Map the logged-in user's role → which portal's prescriptions to fetch. */
function rolePortal(role?: string | null): PortalKey {
  const r = (role || '').toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'alumni') return 'alumni';
  if (r === 'mentor') return 'mentor';
  if (r === 'college' || r === 'college_admin') return 'college';
  return 'student';
}

/** Map portal → brand colour stops (mirrors PORTAL_ACCENTS for the gradient). */
function portalGradient(p: PortalKey): [string, string] {
  const a = PORTAL_ACCENTS[p];
  return [a.primary, a.primaryD];
}

export default function AgentKPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);

  const portal: PortalKey = rolePortal(user?.role);
  const grad = portalGradient(portal);

  const [presc, setPresc] = useState<Prescriptions | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [runs, setRuns]   = useState<RunRow[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [busyCardId, setBusyCardId] = useState<string | null>(null);
  const [scheduleEditor, setScheduleEditor] = useState<{ card: Card } | null>(null);
  const [busyScheduleId, setBusyScheduleId] = useState<string | null>(null);

  const integrationsRoute = useMemo(() => {
    const role = user?.role || 'student';
    if (role === 'alumni') {
      return '/alumni-portal?tab=profile&ptab=integrations';
    }
    return '/student-portal?tab=profile&ptab=integrations';
  }, [user?.role]);

  // Pretty-print the connected providers for the "Powered by …" badge.
  const poweredByLabel = useMemo(() => {
    if (!providers.length) return '';
    const labels = providers.map((p) =>
      p.label || ({
        openai: 'OpenAI', claude: 'Anthropic', anthropic: 'Anthropic',
        gemini: 'Gemini', google: 'Gemini', mistral: 'Mistral',
        cohere: 'Cohere', perplexity: 'Perplexity', groq: 'Groq',
        'together-ai': 'Together AI', 'fireworks-ai': 'Fireworks',
        huggingface: 'Hugging Face', deepseek: 'DeepSeek',
      } as Record<string, string>)[p.tool_id] || p.tool_id,
    );
    return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} & ${labels.slice(-1)}`;
  }, [providers]);

  const goBack = useCallback(() => {
    if (router.canGoBack?.()) router.back();
    else router.replace('/(tabs)' as any);
  }, [router]);

  // Fetch prescriptions + providers + recent runs + schedules in parallel
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, pv, r, sc] = await Promise.all([
        request(`/agent-k/prescriptions?portal=${portal}`),
        request('/agent-k/installed-providers').catch(() => ({ providers: [] as Provider[] })),
        request('/agent-k/runs?limit=5').catch(() => ({ runs: [] })),
        request('/agent-k/scheduled').catch(() => ({ schedules: [] as Schedule[] })),
      ]);
      setPresc(p as Prescriptions);
      setProviders(((pv as any)?.providers as Provider[]) || []);
      setRuns(((r as any)?.runs as RunRow[]) || []);
      setSchedules(((sc as any)?.schedules as Schedule[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load Agent K');
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => { load(); }, [load]);

  const runCard = useCallback(async (card: Card) => {
    setBusyCardId(card.id);
    try {
      const res: any = await request('/agent-k/run', {
        method: 'POST',
        body: { prompt: card.prompt, auto_execute: true },
      });
      // Refresh run history then navigate to detail
      await load();
      if (res?.run_id) router.push(`/agent-k?run=${res.run_id}`);
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('412') || msg.includes('setup_required')) {
        // BYO-AI gate triggered — push to Marketplace
        router.push('/marketplace?category=AI');
      } else {
        setError(msg || 'Run failed');
      }
    } finally {
      setBusyCardId(null);
    }
  }, [load, router]);

  // ── Scheduled-automation actions ──────────────────────────────
  const createSchedule = useCallback(async (body: any) => {
    try {
      await request('/agent-k/scheduled', {
        method: 'POST',
        body,
      });
      setScheduleEditor(null);
      await load();
    } catch (e: any) {
      const msg = e?.message || '';
      setError(msg || 'Could not create schedule');
    }
  }, [load]);

  const toggleSchedule = useCallback(async (s: Schedule) => {
    setBusyScheduleId(s.id);
    try {
      const next = s.status === 'active' ? 'paused' : 'active';
      await request(`/agent-k/scheduled/${s.id}`, {
        method: 'PATCH', body: { status: next },
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not update schedule');
    } finally {
      setBusyScheduleId(null);
    }
  }, [load]);

  const runScheduleNow = useCallback(async (s: Schedule) => {
    setBusyScheduleId(s.id);
    try {
      await request(`/agent-k/scheduled/${s.id}/run-now`, { method: 'POST' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not run schedule');
    } finally {
      setBusyScheduleId(null);
    }
  }, [load]);

  const deleteSchedule = useCallback(async (s: Schedule) => {
    setBusyScheduleId(s.id);
    try {
      await request(`/agent-k/scheduled/${s.id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not delete schedule');
    } finally {
      setBusyScheduleId(null);
    }
  }, [load]);

  // Layout
  const cols = width >= 1180 ? 3 : width >= 760 ? 2 : 1;

  // Body switch ────────────────────────────────────────────────────
  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={s.center}>
        <ActivityIndicator size="small" color={grad[0]} />
        <Text style={[s.dim, { color: theme.textTer, marginTop: 8 }]}>
          Loading your Agent K…
        </Text>
      </View>
    );
  } else if (!presc?.ai_connected && !presc?.is_admin) {
    body = (
      <EmptyConnectAI
        gradient={grad}
        textColor={theme.text}
        subColor={theme.textSec}
        borderColor={theme.hairline}
        onConnect={() => router.push(integrationsRoute as any)}
      />
    );
  } else {
    body = (
      <View style={{ gap: 18 }}>
        {/* Kicker */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.dot, { backgroundColor: grad[0] }]} />
          <Text style={[s.kicker, { color: theme.textSec }]}>
            TODAY’S PRESCRIPTION · POWERED BY YOUR CONNECTED AI
          </Text>
        </View>
        <Text style={[s.h1, { color: theme.text }]}>
          {portal === 'admin'    && 'Run the platform on autopilot'}
          {portal === 'college'  && 'Move every department forward today'}
          {portal === 'mentor'   && 'Show up prepared for every mentee'}
          {portal === 'alumni'   && 'Give back in 30 seconds'}
          {portal === 'student'  && 'One tap → Agent K does it for you'}
        </Text>

        {/* Cards grid */}
        <View style={[s.grid, Platform.OS === 'web' ? {
          // @ts-expect-error web grid
          display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14,
        } : null]}>
          {presc!.cards.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.duration(280).delay(60 * i)} style={[s.card, {
              backgroundColor: theme.bgElevated, borderColor: theme.hairline,
            }]}>
              <View style={[s.iconBox, { backgroundColor: c.tint + '22', borderColor: c.tint + '55' }]}>
                <MaterialCommunityIcons
                  name={(c.icon as any) || 'lightbulb-outline'}
                  size={16}
                  color={c.tint}
                />
              </View>
              <Text style={[s.cardKicker, { color: c.tint }]}>{c.kicker}</Text>
              <Text numberOfLines={2} style={[s.cardTitle, { color: theme.text }]}>{c.title}</Text>
              {!!c.subtitle && (
                <Text numberOfLines={3} style={[s.cardSub, { color: theme.textSec }]}>{c.subtitle}</Text>
              )}
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => runCard(c)}
                  disabled={busyCardId === c.id}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={grad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[s.cardCta, busyCardId === c.id && { opacity: 0.7 }]}
                  >
                    {busyCardId === c.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <MaterialCommunityIcons name="lightning-bolt" size={13} color="#fff" />}
                    <Text style={s.cardCtaText}>{busyCardId === c.id ? 'Running…' : c.cta}</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => setScheduleEditor({ card: c })}
                  style={[s.cardScheduleBtn, { borderColor: c.tint + '66', backgroundColor: c.tint + '11' }]}
                  accessibilityLabel="Schedule this automation"
                >
                  <MaterialCommunityIcons name="calendar-clock" size={15} color={c.tint} />
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Run history (collapsed list) */}
        <View style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[s.section, { color: theme.textSec }]}>RECENT RUNS</Text>
            {!!runs.length && (
              <Text style={[s.dim, { color: theme.textTer }]}>{runs.length} recent</Text>
            )}
          </View>
          {!runs.length ? (
            <Text style={[s.dim, { color: theme.textTer }]}>No runs yet — tap a prescription card to start.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {runs.map((r) => (
                <View
                  key={r._id || r.id}
                  style={[s.runRow, { backgroundColor: theme.bgInset, borderColor: theme.hairline }]}
                >
                  <View style={[s.statusDot, {
                    backgroundColor:
                      r.status === 'completed' ? '#10B981' :
                      r.status === 'failed' || r.status === 'cancelled' ? '#EF4444' :
                      grad[0],
                  }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[s.runPrompt, { color: theme.text }]}>{r.prompt}</Text>
                    {!!r.result_summary && (
                      <Text numberOfLines={1} style={[s.dim, { color: theme.textSec, marginTop: 2 }]}>
                        {r.result_summary}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.dim, { color: theme.textTer }]}>{r.status}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Scheduled automations ─────────────────────────────── */}
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[s.section, { color: theme.textSec }]}>SCHEDULED AUTOMATIONS</Text>
            <Text style={[s.dim, { color: theme.textTer }]}>
              {schedules.length} active{schedules.length > 0 ? ` · runs every minute` : ''}
            </Text>
          </View>

          {!schedules.length ? (
            <View style={[s.scheduleEmpty, { borderColor: theme.hairline, backgroundColor: theme.bgInset }]}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={grad[0]} />
              <Text style={[s.dim, { color: theme.textSec, marginTop: 6, textAlign: 'center' as any }]}>
                No scheduled automations yet — tap the calendar icon on any prescription card to schedule it.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {schedules.map((sch) => (
                <View
                  key={sch.id}
                  style={[s.scheduleRow, { backgroundColor: theme.bgElevated, borderColor: theme.hairline }]}
                >
                  <View style={[s.statusDot, {
                    backgroundColor: sch.status === 'active' ? '#10B981' : '#9CA3AF',
                    marginTop: 6,
                  }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[s.scheduleTitle, { color: theme.text }]}>{sch.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <View style={[s.miniPill, { borderColor: theme.hairline, backgroundColor: theme.bgInset }]}>
                        <MaterialCommunityIcons name="calendar-clock" size={10} color={theme.textSec} />
                        <Text style={[s.miniPillText, { color: theme.textSec }]}>
                          {sch.cadence_label || sch.cadence}
                        </Text>
                      </View>
                      {!!sch.next_run_at && (
                        <Text style={[s.dim, { color: theme.textTer, fontSize: 11 }]}>
                          next · {new Date(sch.next_run_at).toLocaleString()}
                        </Text>
                      )}
                      {!!sch.last_status && (
                        <Text style={[s.dim, { color: theme.textTer, fontSize: 11 }]}>
                          last · {sch.last_status}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable onPress={() => runScheduleNow(sch)}
                               disabled={busyScheduleId === sch.id}
                               style={[s.iconBtn, { borderColor: theme.hairline }]}
                               accessibilityLabel="Run now">
                      <MaterialCommunityIcons name="lightning-bolt" size={13} color={grad[0]} />
                    </Pressable>
                    <Pressable onPress={() => toggleSchedule(sch)}
                               disabled={busyScheduleId === sch.id}
                               style={[s.iconBtn, { borderColor: theme.hairline }]}
                               accessibilityLabel={sch.status === 'active' ? 'Pause' : 'Resume'}>
                      <MaterialCommunityIcons
                        name={sch.status === 'active' ? 'pause' : 'play'}
                        size={13}
                        color={theme.text}
                      />
                    </Pressable>
                    <Pressable onPress={() => deleteSchedule(sch)}
                               disabled={busyScheduleId === sch.id}
                               style={[s.iconBtn, { borderColor: 'rgba(239,68,68,0.4)' }]}
                               accessibilityLabel="Delete">
                      <MaterialCommunityIcons name="trash-can-outline" size={13} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  if (!user) {
    // not logged in — soft redirect
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  return (
    <View style={[ss.shell, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      {/* Top bar — Back + title + "Powered by …" pill */}
      <View style={[ss.topBar, { borderBottomColor: theme.hairline }]}>
        <Pressable onPress={goBack} style={[ss.backBtn, { borderColor: theme.hairline }]}>
          <MaterialCommunityIcons name="arrow-left" size={16} color={theme.text} />
          <Text style={[ss.backText, { color: theme.text }]}>Back to Dashboard</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {!!poweredByLabel && (
          <LinearGradient
            colors={grad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={ss.poweredBy}
          >
            <MaterialCommunityIcons name="flash" size={11} color="#fff" />
            <Text style={ss.poweredByText}>Powered by {poweredByLabel}</Text>
          </LinearGradient>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 + (insets.bottom || 0) }}>
        {/* Header card */}
        <View style={[s.hero, { borderColor: theme.hairline, backgroundColor: theme.bgElevated }]}>
          <View style={[s.heroIcon, { borderColor: grad[0] + '60', backgroundColor: grad[0] + '18' }]}>
            <MaterialCommunityIcons name="robot-outline" size={20} color={grad[0]} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.heroTitle, { color: theme.text }]}>Agent K</Text>
            <Text style={[s.heroSub, { color: theme.textSec }]}>
              Personalised automations powered by your connected AI provider.
            </Text>
          </View>
          {presc?.ai_connected && !presc?.is_admin && (
            <Pressable onPress={() => router.push(integrationsRoute as any)}
                       style={[s.miniBtn, { borderColor: theme.hairline }]}>
              <MaterialCommunityIcons name="key-outline" size={12} color={theme.textSec} />
              <Text style={[s.miniBtnText, { color: theme.textSec }]}>Manage providers</Text>
            </Pressable>
          )}
        </View>

        {!!error && (
          <View style={[s.errBar, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.32)' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#FCA5A5" />
            <Text style={{ color: '#FCA5A5', fontFamily: FONT, fontSize: 12.5 }}>{error}</Text>
          </View>
        )}

        {body}
      </ScrollView>

      {/* Schedule editor — bottom sheet/modal */}
      {!!scheduleEditor && (
        <ScheduleEditor
          card={scheduleEditor.card}
          gradient={grad}
          theme={theme}
          onClose={() => setScheduleEditor(null)}
          onSubmit={createSchedule}
        />
      )}

      {/* Global AI Copilot FAB (student portal only) — visible on
          Agent K too per design contract. Tapping is a no-op visual. */}
      {portal === 'student' && (
        <StudentAiCopilotFab onPress={() => router.push('/agent-k')} />
      )}
    </View>
  );
}

/* ─── Schedule editor — bottom-sheet modal ─────────────────────── */
function ScheduleEditor({
  card, gradient, theme, onClose, onSubmit,
}: {
  card: Card;
  gradient: [string, string];
  theme: any;
  onClose: () => void;
  onSubmit: (body: any) => Promise<void> | void;
}) {
  const [title, setTitle] = useState<string>(card.title.slice(0, 80));
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'hourly' | 'cron'>('daily');
  const [hour, setHour] = useState<number>(9);
  const [minute, setMinute] = useState<number>(0);
  const [weekday, setWeekday] = useState<number>(0);
  const [intervalHours, setIntervalHours] = useState<number>(6);
  const [cronExpr, setCronExpr] = useState<string>('');
  const [tz, setTz] = useState<string>(
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC') || 'UTC',
  );
  const [submitting, setSubmitting] = useState(false);

  const cadenceOptions: { value: typeof cadence; label: string }[] = [
    { value: 'daily',  label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'cron',   label: 'Advanced' },
  ];
  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim() || card.title.slice(0, 80),
        prompt: card.prompt,
        cadence,
        hour, minute, weekday,
        interval_hours: intervalHours,
        cron_expr: cadence === 'cron' ? cronExpr.trim() : null,
        timezone: tz,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={se.backdrop}>
        <Pressable onPress={(e) => e.stopPropagation()}
                   style={[se.sheet, { backgroundColor: theme.bgElevated, borderColor: theme.hairline }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[s.iconBox, { borderColor: card.tint + '55', backgroundColor: card.tint + '22' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={15} color={card.tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[se.h1, { color: theme.text }]}>Schedule automation</Text>
              <Text style={[s.dim, { color: theme.textSec }]} numberOfLines={1}>{card.title}</Text>
            </View>
            <Pressable onPress={onClose} style={[s.iconBtn, { borderColor: theme.hairline }]}>
              <MaterialCommunityIcons name="close" size={14} color={theme.textSec} />
            </Pressable>
          </View>

          {/* Title */}
          <Text style={[se.label, { color: theme.textSec }]}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Give this automation a name"
            placeholderTextColor={theme.textTer}
            style={[se.input, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.bgInset }]}
          />

          {/* Cadence chips */}
          <Text style={[se.label, { color: theme.textSec, marginTop: 14 }]}>Cadence</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cadenceOptions.map((o) => {
              const active = cadence === o.value;
              return (
                <Pressable key={o.value} onPress={() => setCadence(o.value)}>
                  <View style={[
                    se.cadenceChip,
                    { borderColor: active ? gradient[0] : theme.hairline,
                      backgroundColor: active ? gradient[0] + '22' : 'transparent' },
                  ]}>
                    <Text style={[
                      se.cadenceChipText,
                      { color: active ? gradient[0] : theme.textSec },
                    ]}>{o.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Cadence-specific controls */}
          {(cadence === 'daily' || cadence === 'weekly') && (
            <View style={{ marginTop: 12, gap: 10 }}>
              {cadence === 'weekly' && (
                <View>
                  <Text style={[se.label, { color: theme.textSec, marginBottom: 6 }]}>Day of week</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {weekdayLabels.map((d, idx) => {
                      const active = weekday === idx;
                      return (
                        <Pressable key={d} onPress={() => setWeekday(idx)}>
                          <View style={[
                            se.dayChip,
                            { borderColor: active ? gradient[0] : theme.hairline,
                              backgroundColor: active ? gradient[0] + '22' : 'transparent' },
                          ]}>
                            <Text style={[se.dayChipText, { color: active ? gradient[0] : theme.textSec }]}>{d}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[se.label, { color: theme.textSec, marginBottom: 4 }]}>Hour (0–23)</Text>
                  <TextInput
                    value={String(hour)} keyboardType="numeric"
                    onChangeText={(t) => setHour(Math.max(0, Math.min(23, parseInt(t, 10) || 0)))}
                    style={[se.input, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.bgInset }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[se.label, { color: theme.textSec, marginBottom: 4 }]}>Minute (0–59)</Text>
                  <TextInput
                    value={String(minute)} keyboardType="numeric"
                    onChangeText={(t) => setMinute(Math.max(0, Math.min(59, parseInt(t, 10) || 0)))}
                    style={[se.input, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.bgInset }]}
                  />
                </View>
              </View>
            </View>
          )}

          {cadence === 'hourly' && (
            <View style={{ marginTop: 12 }}>
              <Text style={[se.label, { color: theme.textSec, marginBottom: 4 }]}>Every N hours (1–168)</Text>
              <TextInput
                value={String(intervalHours)} keyboardType="numeric"
                onChangeText={(t) => setIntervalHours(Math.max(1, Math.min(168, parseInt(t, 10) || 1)))}
                style={[se.input, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.bgInset }]}
              />
            </View>
          )}

          {cadence === 'cron' && (
            <View style={{ marginTop: 12 }}>
              <Text style={[se.label, { color: theme.textSec, marginBottom: 4 }]}>Crontab expression</Text>
              <TextInput
                value={cronExpr}
                onChangeText={setCronExpr}
                autoCapitalize="none" autoCorrect={false}
                placeholder="e.g. 0 9 * * 1   (every Monday 9 AM)"
                placeholderTextColor={theme.textTer}
                style={[se.input, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.bgInset, fontFamily: Platform.OS === 'web' ? 'Menlo, monospace' : 'monospace' }]}
              />
              <Text style={[s.dim, { color: theme.textTer, marginTop: 4, fontSize: 11 }]}>
                5 fields: minute · hour · day-of-month · month · day-of-week
              </Text>
            </View>
          )}

          <Text style={[se.label, { color: theme.textSec, marginTop: 14, marginBottom: 4 }]}>Timezone</Text>
          <TextInput
            value={tz} onChangeText={setTz} autoCapitalize="none"
            placeholder="e.g. Asia/Kolkata"
            placeholderTextColor={theme.textTer}
            style={[se.input, { color: theme.text, borderColor: theme.hairline, backgroundColor: theme.bgInset }]}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable onPress={onClose} style={[se.btn, { borderColor: theme.hairline }]}>
              <Text style={[se.btnText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} disabled={submitting} style={{ flex: 1 }}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[se.submitBtn, submitting && { opacity: 0.7 }]}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                <Text style={[se.btnText, { color: '#fff' }]}>
                  {submitting ? 'Saving…' : 'Schedule it'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const se = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 18,
  },
  sheet: {
    width: '100%', maxWidth: 460,
    borderRadius: 16, borderWidth: 1, padding: 18,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 16px 48px rgba(0,0,0,0.45)' } as any) : {}),
  },
  h1: { fontFamily: FONT, fontSize: 15.5, fontWeight: '800' as any },
  label: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any, letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' as any },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontFamily: FONT, fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  cadenceChip: {
    paddingHorizontal: 12, height: 30, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cadenceChipText: { fontFamily: FONT, fontSize: 12, fontWeight: '700' as any },
  dayChip: {
    paddingHorizontal: 10, height: 28, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipText: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any },
  btn: {
    flex: 1, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 38, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnText: { fontFamily: FONT, fontSize: 13, fontWeight: '800' as any },
});

/* ─── Empty state — Connect AI in Marketplace ───────────────────── */
function EmptyConnectAI({ gradient, textColor, subColor, borderColor, onConnect }: {
  gradient: [string, string]; textColor: string; subColor: string; borderColor: string; onConnect: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(280)} style={[s.empty, { borderColor }]}>
      <View style={[s.emptyIcon, { borderColor: gradient[0] + '60', backgroundColor: gradient[0] + '14' }]}>
        <MaterialCommunityIcons name="key-variant" size={28} color={gradient[0]} />
      </View>
      <Text style={[s.emptyTitle, { color: textColor }]}>Bring your own AI to unlock Agent K</Text>
      <Text style={[s.emptySub, { color: subColor }]}>
        Agent K runs every action with the AI provider YOU connect — your keys, your data, your control.
        Choose from OpenAI, Anthropic, Gemini, Mistral, Cohere, Perplexity, Groq and more in the Marketplace.
      </Text>
      <Pressable onPress={onConnect}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emptyCta}>
          <MaterialCommunityIcons name="storefront-outline" size={14} color="#fff" />
          <Text style={s.emptyCtaText}>Open AI Marketplace</Text>
        </LinearGradient>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['OpenAI', 'Anthropic', 'Gemini', 'Mistral', 'Cohere', 'Perplexity', 'Groq'].map((p) => (
          <View key={p} style={[s.chip, { borderColor }]}>
            <Text style={[s.chipText, { color: subColor }]}>{p}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 14,
  },
  heroIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  heroTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800' as any },
  heroSub: { fontFamily: FONT, fontSize: 12.5, marginTop: 2 },
  miniBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, height: 28, borderRadius: 999, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  miniBtnText: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any },

  errBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginBottom: 12,
  },

  center: { paddingVertical: 60, alignItems: 'center' },

  dot: { width: 7, height: 7, borderRadius: 4 },
  kicker: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800' as any, letterSpacing: 1.6 },
  section: { fontFamily: FONT, fontSize: 10.5, fontWeight: '800' as any, letterSpacing: 1.6 },
  h1: { fontFamily: FONT, fontSize: 22, fontWeight: '800' as any, letterSpacing: -0.4 },
  dim: { fontFamily: FONT, fontSize: 12 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
  },
  card: {
    flex: 1, minWidth: 280,
    padding: 16, borderRadius: 14, borderWidth: 1, gap: 8,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 4px 14px rgba(0,0,0,0.18)' } as any) : {}),
  },
  iconBox: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cardKicker: { fontFamily: FONT, fontSize: 10, fontWeight: '800' as any, letterSpacing: 1.5 },
  cardTitle: { fontFamily: FONT, fontSize: 14.5, fontWeight: '800' as any, lineHeight: 19 },
  cardSub: { fontFamily: FONT, fontSize: 12, lineHeight: 16.5 },
  cardCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 34, paddingHorizontal: 12, borderRadius: 10, marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardCtaText: { color: '#fff', fontFamily: FONT, fontSize: 12, fontWeight: '800' as any },

  runRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  runPrompt: { fontFamily: FONT, fontSize: 12.5, fontWeight: '700' as any },

  // Scheduled automations
  scheduleEmpty: {
    alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' as any,
  },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  scheduleTitle: { fontFamily: FONT, fontSize: 13.5, fontWeight: '700' as any },
  miniPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, height: 22, borderRadius: 999, borderWidth: 1,
  },
  miniPillText: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cardScheduleBtn: {
    width: 36, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  empty: {
    alignItems: 'center', padding: 32, borderRadius: 16, borderWidth: 1, gap: 12,
    backgroundColor: 'transparent',
  },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontFamily: FONT, fontSize: 17, fontWeight: '800' as any, textAlign: 'center' as any },
  emptySub: { fontFamily: FONT, fontSize: 13, lineHeight: 19, textAlign: 'center' as any, maxWidth: 580 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 38, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  emptyCtaText: { color: '#fff', fontFamily: FONT, fontSize: 13, fontWeight: '800' as any },

  chip: {
    paddingHorizontal: 10, height: 26, borderRadius: 999, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontFamily: FONT, fontSize: 11, fontWeight: '700' as any },
});

/* ─── Outer shell styles (top bar / back button / powered-by pill) ─── */
const ss = StyleSheet.create({
  shell: { flex: 1, minHeight: '100%' as any },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, height: 30, borderRadius: 999, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  backText: { fontFamily: FONT, fontSize: 12, fontWeight: '700' as any },
  poweredBy: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, height: 26, borderRadius: 999,
  },
  poweredByText: { color: '#fff', fontFamily: FONT, fontSize: 11, fontWeight: '800' as any, letterSpacing: 0.3 },
});
