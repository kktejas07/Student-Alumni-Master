/**
 * Agent K — workspace page (/agent-k).
 *
 * Three-column layout on desktop (lg+), stacks on phone:
 *   • LEFT   AutomationCatalog   — pre-built templates from /api/agent-k/templates
 *   • CENTER AgentKSession       — prompt input → plan preview → execution → summary
 *   • RIGHT  ExecutionLog        — live chronological tool-call log
 *
 * The page accepts a `prompt` query-string param. If provided (e.g. from
 * the Cmd+K Quick Launcher), the prompt is auto-submitted on mount.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { NX } from '@/src/theme/nexus';
import { request } from '@/src/models/services/api';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';

const FONT = Platform.select({
  ios: 'System', android: 'sans-serif',
  default: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
}) as string;

type PlanStep = { tool: string; args: any; rationale?: string };
type Plan = {
  summary: string;
  estimated_runtime_seconds: number;
  steps: PlanStep[];
  requires_clarification?: string;
};
type ExecStep = {
  index: number;
  tool: string;
  args: any;
  status: 'completed' | 'failed' | 'skipped' | 'running';
  result?: any;
  error?: string;
  started_at?: string;
  completed_at?: string;
};
type Template = { module: string; icon: string; title: string; prompt: string };

export default function AgentKWorkspace() {
  const params = useLocalSearchParams<{ prompt?: string; autorun?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const stack = width < 1100;

  const [text, setText] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [run, setRun] = useState<{ id?: string; prompt?: string; plan?: Plan; status?: string; steps?: ExecStep[]; result_summary?: string | null } | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Load templates on mount
  useEffect(() => {
    request<{ templates: Template[] }>('/agent-k/templates').then((r) => setTemplates(r?.templates || [])).catch(() => {});
  }, []);

  // Auto-run from Quick Launcher
  useEffect(() => {
    if (params.prompt && !run && !loadingPlan) {
      const p = String(params.prompt);
      setText(p);
      submit(p, params.autorun === '1');
      router.setParams({ prompt: '', autorun: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.prompt]);

  const submit = useCallback(async (prompt?: string, autoExecute = false) => {
    const final = (prompt ?? text).trim();
    if (!final) return;
    setLoadingPlan(true);
    setRun({ prompt: final });
    try {
      const r: any = await request('/agent-k/run', {
        method: 'POST',
        body: { prompt: final, auto_execute: autoExecute },
      });
      const newRun = { id: r.run_id, prompt: final, plan: r.plan as Plan, status: r.status, steps: [] };
      setRun(newRun);
      if (autoExecute && r.status !== 'completed') {
        // Backend may have already executed — refetch
        try {
          const got: any = await request(`/agent-k/runs/${r.run_id}`);
          setRun({ id: got.id, prompt: got.prompt, plan: got.plan, status: got.status, steps: got.steps, result_summary: got.result_summary });
        } catch {}
      } else if (r.status === 'completed') {
        const got: any = await request(`/agent-k/runs/${r.run_id}`);
        setRun({ id: got.id, prompt: got.prompt, plan: got.plan, status: got.status, steps: got.steps, result_summary: got.result_summary });
      }
    } catch (e: any) {
      setRun({ prompt: final, plan: { summary: 'Failed to plan', estimated_runtime_seconds: 0, steps: [], requires_clarification: String(e?.message || e) } });
    } finally {
      setLoadingPlan(false);
    }
  }, [text]);

  const execute = useCallback(async () => {
    if (!run?.id) return;
    setExecuting(true);
    try {
      const r: any = await request(`/agent-k/runs/${run.id}/execute`, { method: 'POST' });
      setRun((prev) => prev ? ({ ...prev, status: r.status, steps: r.steps, result_summary: r.result_summary }) : prev);
    } catch (e: any) {
      // Show error on summary line
      setRun((prev) => prev ? ({ ...prev, status: 'failed', result_summary: String(e?.message || e) }) : prev);
    } finally {
      setExecuting(false);
    }
  }, [run?.id]);

  const reset = () => { setRun(null); setText(''); };

  return (
    <FeaturePageShell title="Agent K" subtitle="Automation operator" heroEmoji="🤖" accent={NX.purple}>
      <View style={[s.frame, stack ? null : { flexDirection: 'row' }]}>
        {/* LEFT: Catalog */}
        <View style={[s.col, stack ? { width: '100%' } : { width: 300 }]}>
          <AutomationCatalog templates={templates} onPick={(p) => { setText(p); submit(p, true); }} />
        </View>

        {/* CENTER: Session */}
        <View style={[s.col, { flex: 1 }]}>
          {!run ? (
            <EmptyState text={text} setText={setText} onSubmit={() => submit()} suggestions={templates.slice(0, 4)} loading={loadingPlan} onPick={(p) => { setText(p); submit(p, true); }} />
          ) : (
            <ActiveSession run={run} loadingPlan={loadingPlan} executing={executing} onExecute={execute} onReset={reset} />
          )}
        </View>

        {/* RIGHT: Execution log */}
        {!stack && (
          <View style={[s.col, { width: 320 }]}>
            <ExecutionLog steps={run?.steps || []} />
          </View>
        )}
      </View>
    </FeaturePageShell>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────
function AutomationCatalog({ templates, onPick }: { templates: Template[]; onPick: (prompt: string) => void }) {
  // Group by module
  const groups: Record<string, Template[]> = {};
  for (const t of templates) (groups[t.module] = groups[t.module] || []).push(t);
  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>Automations</Text>
      <Text style={s.panelSubtitle}>Pre-built tasks Agent K can run.</Text>
      <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
        {Object.entries(groups).map(([mod, list]) => (
          <View key={mod} style={{ marginBottom: 12 }}>
            <Text style={s.groupLabel}>{mod.toUpperCase()}</Text>
            {list.map((t, i) => (
              <Pressable
                key={t.title + i}
                onPress={() => onPick(t.prompt)}
                style={({ hovered }: any) => ([
                  s.catalogItem,
                  hovered && Platform.OS === 'web' ? { borderColor: NX.purple, backgroundColor: 'rgba(124,58,237,0.06)' } as any : null,
                ])}
              >
                <MaterialCommunityIcons name={t.icon as any} size={16} color={NX.purple} />
                <Text style={s.catalogItemText} numberOfLines={2}>{t.title}</Text>
                <MaterialCommunityIcons name="play-circle-outline" size={14} color={NX.textT} />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function EmptyState({
  text, setText, onSubmit, suggestions, loading, onPick,
}: {
  text: string; setText: (v: string) => void; onSubmit: () => void;
  suggestions: Template[]; loading: boolean; onPick: (p: string) => void;
}) {
  return (
    <View style={[s.panel, { minHeight: 480, alignItems: 'center', justifyContent: 'center' }]}>
      <LinearGradient
        colors={[NX.purple, NX.cyan] as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.heroIcon}
      >
        <MaterialCommunityIcons name="robot-outline" size={32} color="#fff" />
      </LinearGradient>
      <Text style={s.heroTitle}>Hi there — I'm Agent K.</Text>
      <Text style={s.heroSubtitle}>Tell me what to do across the SA platform and I'll plan + run it for you.</Text>

      <View style={s.bigInputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. Find 5 SWE internships and show me which match my profile…"
          placeholderTextColor={NX.textT}
          style={s.bigInput}
          onSubmitEditing={onSubmit}
          accessibilityLabel="Agent K prompt"
          multiline={false}
        />
        <Pressable
          onPress={onSubmit}
          disabled={loading || !text.trim()}
          style={({ hovered }: any) => ([
            s.runBtn,
            (loading || !text.trim()) ? { opacity: 0.5 } : null,
          ])}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={s.runBtnText}>Run</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color="#fff" />
            </>
          )}
        </Pressable>
      </View>

      <Text style={[s.groupLabel, { marginTop: 24 }]}>SUGGESTIONS</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
        {suggestions.map((t) => (
          <Pressable
            key={t.title}
            onPress={() => onPick(t.prompt)}
            style={({ hovered }: any) => ([
              s.suggChip,
              hovered && Platform.OS === 'web' ? { borderColor: NX.purple } as any : null,
            ])}
          >
            <MaterialCommunityIcons name={t.icon as any} size={12} color={NX.purple} />
            <Text style={s.suggChipText}>{t.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ActiveSession({
  run, loadingPlan, executing, onExecute, onReset,
}: {
  run: any; loadingPlan: boolean; executing: boolean;
  onExecute: () => void; onReset: () => void;
}) {
  const plan: Plan | undefined = run.plan;
  const steps: ExecStep[] = run.steps || [];
  const finished = run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled';

  return (
    <ScrollView style={s.panel} showsVerticalScrollIndicator={false}>
      {/* User prompt bubble */}
      <View style={s.userBubble}>
        <View style={s.userIcon}><MaterialCommunityIcons name="account-circle" size={18} color={NX.cyan} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.bubbleLabel}>You</Text>
          <Text style={s.bubbleText}>{run.prompt}</Text>
        </View>
      </View>

      {loadingPlan && (
        <View style={s.thinkingRow}>
          <ActivityIndicator size="small" color={NX.purple} />
          <Text style={{ color: NX.textS, fontFamily: FONT, fontSize: 13 }}>Agent K is thinking…</Text>
        </View>
      )}

      {plan && (
        <Animated.View entering={FadeInDown.duration(220)} style={s.planCard}>
          <View style={s.planHeader}>
            <MaterialCommunityIcons name="auto-fix" size={16} color={NX.purple} />
            <Text style={s.planHeaderText}>Here's what I'll do</Text>
            {plan.estimated_runtime_seconds > 0 && (
              <View style={s.timePill}>
                <MaterialCommunityIcons name="clock-outline" size={10} color={NX.textS} />
                <Text style={s.timePillText}>~{plan.estimated_runtime_seconds}s</Text>
              </View>
            )}
          </View>
          {plan.summary ? <Text style={s.planSummary}>{plan.summary}</Text> : null}
          {plan.requires_clarification ? (
            <View style={s.warnBanner}>
              <MaterialCommunityIcons name="help-circle-outline" size={14} color={NX.warning} />
              <Text style={s.warnText}>{plan.requires_clarification}</Text>
            </View>
          ) : null}

          {/* Steps */}
          <View style={{ marginTop: 12, gap: 8 }}>
            {plan.steps.map((step, i) => {
              const exec = steps.find((e) => e.index === i);
              return <StepCard key={i} index={i + 1} step={step} exec={exec} />;
            })}
          </View>

          {/* Footer actions */}
          {!finished && plan.steps.length > 0 && (
            <View style={s.planFooter}>
              <Pressable onPress={onReset} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onExecute} disabled={executing} style={({ hovered }: any) => ([
                s.approveBtn, executing ? { opacity: 0.6 } : null,
              ])}>
                {executing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={s.approveBtnText}>Approve & run</Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>
      )}

      {/* Final summary */}
      {run.result_summary && (
        <Animated.View entering={FadeIn.duration(220)} style={s.summaryCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MaterialCommunityIcons name="check-decagram" size={18} color={NX.success} />
            <Text style={s.summaryHeader}>All done</Text>
          </View>
          <Text style={s.summaryText}>{run.result_summary}</Text>
          <Pressable onPress={onReset} style={[s.cancelBtn, { marginTop: 12, alignSelf: 'flex-start' }]}>
            <MaterialCommunityIcons name="restart" size={12} color={NX.textP} />
            <Text style={s.cancelBtnText}>New task</Text>
          </Pressable>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function StepCard({ index, step, exec }: { index: number; step: PlanStep; exec?: ExecStep }) {
  const status = exec?.status || 'pending';
  const statusMeta = {
    pending:   { icon: 'circle-outline',          color: NX.textT, bg: 'transparent' },
    running:   { icon: 'progress-clock',          color: NX.amber, bg: NX.amberSoft },
    completed: { icon: 'check-circle',            color: NX.success, bg: NX.successBg },
    failed:    { icon: 'close-circle',            color: NX.danger, bg: NX.dangerBg },
    skipped:   { icon: 'minus-circle-outline',    color: NX.textT, bg: NX.surface3 },
  } as any;
  const m = statusMeta[status];
  const argSummary = step.args ? Object.entries(step.args).slice(0, 3).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ') : '';

  return (
    <View style={s.stepCard}>
      <LinearGradient
        colors={[NX.purple, NX.cyan] as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.stepNum}
      >
        <Text style={s.stepNumText}>{index}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={s.toolName}>{step.tool}</Text>
          <View style={[s.statusPill, { backgroundColor: m.bg }]}>
            <MaterialCommunityIcons name={m.icon as any} size={10} color={m.color} />
            <Text style={[s.statusPillText, { color: m.color }]}>{status}</Text>
          </View>
        </View>
        {step.rationale ? <Text style={s.stepRationale}>{step.rationale}</Text> : null}
        {argSummary ? <Text style={s.stepArgs}>{argSummary}</Text> : null}
        {exec?.error && <Text style={s.stepError}>{exec.error}</Text>}
        {exec?.result && (
          <Text style={s.stepResult}>
            {typeof exec.result === 'object'
              ? `Returned ${exec.result.count ?? Object.keys(exec.result).length} item${(exec.result.count || 0) === 1 ? '' : 's'}`
              : String(exec.result)}
          </Text>
        )}
      </View>
    </View>
  );
}

function ExecutionLog({ steps }: { steps: ExecStep[] }) {
  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>Execution log</Text>
      <Text style={s.panelSubtitle}>Live tool-call history</Text>
      <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
        {steps.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <MaterialCommunityIcons name="console-line" size={28} color={NX.textT} />
            <Text style={{ color: NX.textT, fontFamily: FONT, fontSize: 12, marginTop: 8 }}>No tool calls yet</Text>
          </View>
        ) : (
          steps.map((e, i) => (
            <View key={i} style={s.logRow}>
              <Text style={s.logTime}>{(e.started_at || '').slice(11, 19)}</Text>
              <Text style={s.logTool}>{e.tool}</Text>
              <Text style={[s.logStatus, { color: e.status === 'completed' ? NX.success : e.status === 'failed' ? NX.danger : NX.textS }]}>
                {e.status}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  frame: { gap: 16, paddingVertical: 8 },
  col: { gap: 16 },
  panel: {
    backgroundColor: NX.surface2,
    borderWidth: 1, borderColor: NX.border,
    borderRadius: 18, padding: 18, minHeight: 480,
  },
  panelTitle: { color: NX.textP, fontFamily: FONT, fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  panelSubtitle: { color: NX.textS, fontFamily: FONT, fontSize: 12, marginTop: 2 },
  groupLabel: { color: NX.textT, fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },

  catalogItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 9, marginBottom: 4,
    backgroundColor: NX.surface3, borderRadius: 10, borderWidth: 1, borderColor: NX.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  catalogItemText: { color: NX.textP, fontFamily: FONT, fontSize: 12.5, flex: 1, lineHeight: 16 },

  // Empty state
  heroIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { color: NX.textP, fontFamily: FONT, fontSize: 22, fontWeight: '600', letterSpacing: -0.4 },
  heroSubtitle: { color: NX.textS, fontFamily: FONT, fontSize: 13, marginTop: 6, marginBottom: 24, textAlign: 'center', maxWidth: 480 },
  bigInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', maxWidth: 600,
    backgroundColor: NX.surface3, borderRadius: 14, borderWidth: 1, borderColor: NX.borderHi,
    paddingHorizontal: 6, paddingVertical: 6,
  },
  bigInput: {
    flex: 1, color: NX.textP, fontFamily: FONT, fontSize: 14,
    paddingHorizontal: 12, paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: NX.purple, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  runBtnText: { color: '#fff', fontFamily: FONT, fontSize: 13, fontWeight: '600' },
  suggChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: NX.surface3, borderRadius: 999, borderWidth: 1, borderColor: NX.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  suggChipText: { color: NX.textP, fontFamily: FONT, fontSize: 12 },

  // Conversation
  userBubble: {
    flexDirection: 'row', gap: 10, marginBottom: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: NX.surface3, borderRadius: 12, borderWidth: 1, borderColor: NX.border,
  },
  userIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  bubbleLabel: { color: NX.textT, fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 2 },
  bubbleText: { color: NX.textP, fontFamily: FONT, fontSize: 13.5, lineHeight: 18 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },

  // Plan card
  planCard: {
    backgroundColor: NX.surface1, borderRadius: 16, borderWidth: 1, borderColor: NX.borderHi,
    padding: 16, marginBottom: 14,
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  planHeaderText: { color: NX.textP, fontFamily: FONT, fontSize: 14, fontWeight: '600', flex: 1 },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: NX.surface3,
  },
  timePillText: { color: NX.textS, fontFamily: FONT, fontSize: 10, fontWeight: '600' },
  planSummary: { color: NX.textS, fontFamily: FONT, fontSize: 13, lineHeight: 18 },
  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, marginTop: 10, borderRadius: 10,
    backgroundColor: NX.warningBg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  warnText: { color: NX.warning, fontFamily: FONT, fontSize: 12, flex: 1 },
  planFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: NX.surface3, borderRadius: 10, borderWidth: 1, borderColor: NX.border,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  cancelBtnText: { color: NX.textP, fontFamily: FONT, fontSize: 12.5, fontWeight: '600' },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: NX.purple, borderRadius: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  approveBtnText: { color: '#fff', fontFamily: FONT, fontSize: 12.5, fontWeight: '600' },

  // Step cards
  stepCard: {
    flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12,
    backgroundColor: NX.surface2, borderWidth: 1, borderColor: NX.border,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontFamily: FONT, fontSize: 12, fontWeight: '700' },
  toolName: { color: NX.textP, fontFamily: FONT, fontSize: 13, fontWeight: '600',
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  statusPillText: { fontFamily: FONT, fontSize: 10, fontWeight: '600' },
  stepRationale: { color: NX.textS, fontFamily: FONT, fontSize: 12, marginTop: 4 },
  stepArgs: { color: NX.textT, fontFamily: FONT, fontSize: 11, marginTop: 4,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  stepError: { color: NX.danger, fontFamily: FONT, fontSize: 11, marginTop: 4 },
  stepResult: { color: NX.success, fontFamily: FONT, fontSize: 11, marginTop: 4 },

  // Final summary
  summaryCard: {
    backgroundColor: NX.successBg, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
    padding: 14, marginTop: 4,
  },
  summaryHeader: { color: NX.textP, fontFamily: FONT, fontSize: 14, fontWeight: '600' },
  summaryText: { color: NX.textP, fontFamily: FONT, fontSize: 13, lineHeight: 19 },

  // Execution log
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: NX.borderLo,
  },
  logTime: { color: NX.textT, fontFamily: FONT, fontSize: 10,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  logTool: { color: NX.textP, fontFamily: FONT, fontSize: 11, flex: 1,
    ...(Platform.OS === 'web' ? ({ fontFamily: '"JetBrains Mono", "SF Mono", monospace' } as any) : {}),
  },
  logStatus: { fontFamily: FONT, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
});
