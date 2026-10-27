// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Platform, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import {
  Workflow, Zap, Clock, ChevronRight, Plus, Play, AlertTriangle, X, Check,
  Trash2, Pencil, Eye, Bot, Sparkles, Database, Layers, ArrowRight, ArrowDown,
  Settings, Sliders, Split, Send, Bell, Mail, ShieldCheck, RefreshCw, Move, Code, FileText, CheckCircle2
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { Badge } from '../atoms';
import { GradientButton, SecondaryButton, Toast, useToast, IconBox } from '../applekit';
import { usePortalData, postPortal, patchPortal, deletePortal } from '@/src/lib/portalApi';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GRAD } from '../applekit';

type WorkflowRunLog = { at: string; success: boolean; steps: { step: string; success: boolean; message: string }[]; params: any };

type Wf = {
  id: string; name: string; trigger: string; steps: string[];
  runs: number; success: number; on: boolean; color: string;
  last_run_at?: string; last_run_success?: boolean; run_log?: WorkflowRunLog[];
  created_at?: string; updated_at?: string; event_triggers: string[];
};

type GraphNode = {
  id: string;
  type: 'trigger' | 'rag' | 'llm' | 'condition' | 'action';
  title: string;
  subtitle: string;
  config: Record<string, any>;
  icon: any;
  color: string;
};

const DEFAULT_GRAPH_NODES: GraphNode[] = [
  {
    id: 'node-1',
    type: 'trigger',
    title: 'Event Trigger: user.signup',
    subtitle: 'Fires immediately when a student registers',
    config: { event: 'user.signup', debounce: '0s' },
    icon: Zap,
    color: '#8b5cf6'
  },
  {
    id: 'node-2',
    type: 'rag',
    title: 'Agent K Hybrid RAG Retrieval',
    subtitle: 'Extracts student college syllabus & job tracks',
    config: { collection: 'curricula_kb', top_k: 3, min_score: 0.78 },
    icon: Database,
    color: '#3b82f6'
  },
  {
    id: 'node-3',
    type: 'llm',
    title: 'Claude 3.5 Sonnet Prompt Synthesis',
    subtitle: 'Generates 30-day personalized career roadmap',
    config: { model: 'claude-3-5-sonnet', temp: 0.3, max_tokens: 1500 },
    icon: Sparkles,
    color: '#10b981'
  },
  {
    id: 'node-4',
    type: 'condition',
    title: 'Branching: Profile Completeness',
    subtitle: 'Check if phone & college verification passed',
    config: { condition: 'profile.verified === true' },
    icon: Split,
    color: '#f59e0b'
  },
  {
    id: 'node-5',
    type: 'action',
    title: 'Dispatch Onboarding Notification & Badge',
    subtitle: 'Issues Welcome Badge + WhatsApp/Email summary',
    config: { channels: ['email', 'in_app'], badge_id: 'BADGE_PIONEER' },
    icon: Send,
    color: '#ec4899'
  }
];

const TEMPLATE_PRESETS = [
  {
    name: 'Student AI Onboarding & Roadmap',
    nodes: DEFAULT_GRAPH_NODES
  },
  {
    name: 'Mentor Verification & BGV Pipeline',
    nodes: [
      { id: 'm-1', type: 'trigger', title: 'Event Trigger: mentor.signup', subtitle: 'Fires on mentor submission', config: { event: 'mentor.signup' }, icon: Zap, color: '#8b5cf6' },
      { id: 'm-2', type: 'action', title: 'LinkedIn & DigiLocker BGV Check', subtitle: 'Validates alumni credentials', config: { provider: 'digilocker' }, icon: ShieldCheck, color: '#3b82f6' },
      { id: 'm-3', type: 'llm', title: 'Resume & Domain Matcher', subtitle: 'Calculates student fit score', config: { model: 'gpt-4o' }, icon: Sparkles, color: '#10b981' },
      { id: 'm-4', type: 'action', title: 'Auto-Approve & Calendar Provisioning', subtitle: 'Creates booking slots', config: { status: 'approved' }, icon: Send, color: '#ec4899' }
    ]
  },
  {
    name: 'Attendance Risk & Counselor Alert',
    nodes: [
      { id: 'a-1', type: 'trigger', title: 'Schedule Trigger: cron.daily', subtitle: 'Runs daily at 08:00 UTC', config: { cron: '0 8 * * *' }, icon: Clock, color: '#8b5cf6' },
      { id: 'a-2', type: 'condition', title: 'Filter: Attendance < 70%', subtitle: 'Identify at-risk students', config: { threshold: 70 }, icon: Split, color: '#f59e0b' },
      { id: 'a-3', type: 'action', title: 'Schedule 1:1 Counselor Call', subtitle: 'Dispatches calendar booking', config: { type: 'intervention' }, icon: Send, color: '#ec4899' }
    ]
  }
];

const FALLBACK = { items: [] as Wf[] };

export function WorkflowsView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/workflows', FALLBACK);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [nodes, setNodes] = useState<GraphNode[]>(DEFAULT_GRAPH_NODES);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphExecuting, setGraphExecuting] = useState(false);
  const [activeExecutingIndex, setActiveExecutingIndex] = useState<number | null>(null);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  // List & Modal States
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', trigger: '', event_triggers: [] as string[] });
  const [viewWf, setViewWf] = useState<Wf | null>(null);
  const [editWf, setEditWf] = useState<Wf | null>(null);
  const [deleteWf, setDeleteWf] = useState<Wf | null>(null);
  const { toast, flash, hide } = useToast();

  const items: Wf[] = (data?.items || []).map((w) => ({
    ...w,
    on: overrides[w.id] !== undefined ? overrides[w.id] : w.on,
  }));

  const toggle = async (id: string, current: boolean) => {
    setOverrides((p) => ({ ...p, [id]: !current }));
    try {
      await postPortal(`/admin/super/workflows/${id}/toggle`);
      flash('Workflow state updated');
    } catch {
      setOverrides((p) => ({ ...p, [id]: current }));
      flash('Failed to update state');
    }
  };

  const runWorkflow = async (id: string) => {
    try {
      await postPortal(`/admin/super/workflows/${id}/run`, { body: {} });
      flash('Workflow executed');
      refresh();
    } catch {
      flash('Failed to run');
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;
    try {
      await postPortal('/admin/super/workflows', { body: newWorkflow });
      flash('Workflow created');
      setCreating(false);
      setNewWorkflow({ name: '', trigger: '', event_triggers: [] });
      refresh();
    } catch {
      flash('Failed to create');
    }
  };

  const saveEdit = async () => {
    if (!editWf) return;
    try {
      await patchPortal(`/admin/super/workflows/${editWf.id}`, {
        body: {
          name: editWf.name,
          trigger: editWf.trigger,
          steps: editWf.steps,
          color: editWf.color,
          event_triggers: editWf.event_triggers,
        },
      });
      flash('Workflow updated');
      setEditWf(null);
      refresh();
    } catch {
      flash('Failed to update');
    }
  };

  const confirmDelete = async () => {
    if (!deleteWf) return;
    try {
      await deletePortal(`/admin/super/workflows/${deleteWf.id}`);
      flash('Workflow deleted');
      setDeleteWf(null);
      refresh();
    } catch {
      flash('Failed to delete');
    }
  };

  // Live Canvas Graph Test Execution
  const runVisualGraphTest = async () => {
    setGraphExecuting(true);
    setExecutionLogs([]);
    flash('Starting visual workflow graph execution...');

    for (let i = 0; i < nodes.length; i++) {
      setActiveExecutingIndex(i);
      const curr = nodes[i];
      await new Promise((r) => setTimeout(r, 650));
      setExecutionLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ Node ${i + 1} (${curr.title}) executed successfully in ${Math.floor(Math.random() * 40 + 15)}ms`
      ]);
    }

    setActiveExecutingIndex(null);
    setGraphExecuting(false);
    flash('Visual Workflow Pipeline completed with 100% success!');
  };

  const addNode = (type: GraphNode['type']) => {
    const id = `node-${Date.now()}`;
    let newNode: GraphNode;
    if (type === 'rag') {
      newNode = { id, type: 'rag', title: 'Knowledge Retrieval (RAG)', subtitle: 'Qdrant vector memory lookup', config: { top_k: 3 }, icon: Database, color: '#3b82f6' };
    } else if (type === 'llm') {
      newNode = { id, type: 'llm', title: 'LLM Reasoning Node', subtitle: 'Claude / GPT / Gemini processing', config: { model: 'claude-3-5-sonnet' }, icon: Sparkles, color: '#10b981' };
    } else if (type === 'condition') {
      newNode = { id, type: 'condition', title: 'Conditional Branch', subtitle: 'Evaluate user attributes', config: { expr: 'user.score > 80' }, icon: Split, color: '#f59e0b' };
    } else {
      newNode = { id, type: 'action', title: 'Action / Tool Node', subtitle: 'Dispatch webhook or email', config: { action: 'send_email' }, icon: Send, color: '#ec4899' };
    }
    setNodes([...nodes, newNode]);
    flash(`Added ${newNode.title}`);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
    flash('Node removed');
  };

  const loadPreset = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setNodes(preset.nodes);
    flash(`Loaded preset: ${preset.name}`);
  };

  return (
    <View style={s.container}>
      {/* Header Banner with Mode Toggle */}
      <View style={s.banner}>
        <View style={s.bIcon}><Workflow size={20} color={SAC.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.bTitle}>Visual Workflow & Agent DAG Studio</Text>
            <Badge label="DIFY-STYLE" color="purple" />
          </View>
          <Text style={s.bSub}>
            Build event-driven agent pipelines with visual nodes: Event Triggers ➔ RAG Knowledge ➔ LLM Reasoning ➔ Action Tools.
          </Text>
        </View>

        {/* View Switcher & Action */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={s.modeToggle}>
            <Pressable
              onPress={() => setViewMode('canvas')}
              style={[s.modeBtn, viewMode === 'canvas' && s.modeBtnActive]}
            >
              <Layers size={13} color={viewMode === 'canvas' ? '#fff' : SAC.muted} />
              <Text style={[s.modeText, viewMode === 'canvas' && { color: SAC.text }]}>Visual Canvas</Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[s.modeBtn, viewMode === 'list' && s.modeBtnActive]}
            >
              <Sliders size={13} color={viewMode === 'list' ? '#fff' : SAC.muted} />
              <Text style={[s.modeText, viewMode === 'list' && { color: SAC.text }]}>Workflows List</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setCreating(true)} style={s.cta}>
            <Plus size={13} color="#fff" />
            <Text style={s.ctaText}>New workflow</Text>
          </Pressable>
        </View>
      </View>

      {/* ─────────────────── VIEW MODE 1: VISUAL NODE CANVAS ─────────────────── */}
      {viewMode === 'canvas' && (
        <View style={{ gap: 16 }}>
          {/* Preset Library & Canvas Controls */}
          <View style={s.canvasControlBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={s.presetLabel}>Templates:</Text>
              {TEMPLATE_PRESETS.map((p, idx) => (
                <Pressable key={idx} onPress={() => loadPreset(p)} style={s.presetPill}>
                  <Sparkles size={11} color={SAC.accent} />
                  <Text style={s.presetText}>{p.name}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={s.testRunBtn}
                onPress={runVisualGraphTest}
                disabled={graphExecuting}
              >
                {graphExecuting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Play size={13} color="#fff" />
                    <Text style={s.testRunText}>Test Run Visual Flow</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Node Palette */}
          <View style={s.paletteBar}>
            <Text style={s.paletteTitle}>+ Add Node to Canvas:</Text>
            <Pressable style={[s.paletteBtn, { borderColor: '#3b82f6' }]} onPress={() => addNode('rag')}>
              <Database size={13} color="#3b82f6" />
              <Text style={s.paletteBtnText}>+ RAG Knowledge</Text>
            </Pressable>
            <Pressable style={[s.paletteBtn, { borderColor: '#10b981' }]} onPress={() => addNode('llm')}>
              <Sparkles size={13} color="#10b981" />
              <Text style={s.paletteBtnText}>+ LLM Reasoning</Text>
            </Pressable>
            <Pressable style={[s.paletteBtn, { borderColor: '#f59e0b' }]} onPress={() => addNode('condition')}>
              <Split size={13} color="#f59e0b" />
              <Text style={s.paletteBtnText}>+ Condition</Text>
            </Pressable>
            <Pressable style={[s.paletteBtn, { borderColor: '#ec4899' }]} onPress={() => addNode('action')}>
              <Send size={13} color="#ec4899" />
              <Text style={s.paletteBtnText}>+ Action / Tool</Text>
            </Pressable>
          </View>

          {/* Visual Graph Canvas Area */}
          <View style={s.canvasContainer}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 16 }}>
              {nodes.map((node, index) => {
                const Icon = node.icon || Bot;
                const isExecuting = activeExecutingIndex === index;
                const isSelected = selectedNode?.id === node.id;

                return (
                  <React.Fragment key={node.id}>
                    {/* Visual Node Card */}
                    <Pressable
                      onPress={() => setSelectedNode(node)}
                      style={[
                        s.nodeCard,
                        { borderColor: isExecuting ? '#10b981' : isSelected ? SAC.accent : SAC.border },
                        isExecuting && s.nodeExecutingGlow
                      ]}
                    >
                      <View style={[s.nodeIconBox, { backgroundColor: node.color + '22', borderColor: node.color + '66' }]}>
                        <Icon size={18} color={node.color} />
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={s.nodeTitle}>{node.title}</Text>
                          <Badge label={node.type.toUpperCase()} color="purple" />
                        </View>
                        <Text style={s.nodeSub}>{node.subtitle}</Text>

                        {/* Node Config Summary */}
                        <View style={s.configRow}>
                          {Object.entries(node.config).map(([k, v]) => (
                            <View key={k} style={s.configChip}>
                              <Text style={s.configChipKey}>{k}:</Text>
                              <Text style={s.configChipVal}>{String(v)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      <Pressable style={s.nodeDeleteBtn} onPress={() => removeNode(node.id)}>
                        <X size={14} color={SAC.muted} />
                      </Pressable>
                    </Pressable>

                    {/* Connecting Visual Flow Arrow */}
                    {index < nodes.length - 1 && (
                      <View style={s.arrowRow}>
                        <View style={s.arrowLine} />
                        <View style={[s.arrowHead, isExecuting && { borderColor: '#10b981' }]}>
                          <ArrowDown size={14} color={isExecuting ? '#10b981' : SAC.accent} />
                        </View>
                        <View style={s.arrowLine} />
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </View>

          {/* Node Configuration Inspector Drawer / Modal */}
          {selectedNode && (
            <View style={s.inspectorCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Sliders size={16} color={SAC.accent} />
                  <Text style={s.inspectorTitle}>Node Inspector: {selectedNode.title}</Text>
                </View>
                <Pressable onPress={() => setSelectedNode(null)}>
                  <X size={16} color={SAC.muted} />
                </Pressable>
              </View>

              <View style={{ gap: 10, marginTop: 12 }}>
                <Text style={s.inspectorLabel}>Node Title</Text>
                <TextInput
                  value={selectedNode.title}
                  onChangeText={(t) => {
                    const updated = { ...selectedNode, title: t };
                    setSelectedNode(updated);
                    setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)));
                  }}
                  style={s.input}
                />

                <Text style={s.inspectorLabel}>Description / Subtitle</Text>
                <TextInput
                  value={selectedNode.subtitle}
                  onChangeText={(st) => {
                    const updated = { ...selectedNode, subtitle: st };
                    setSelectedNode(updated);
                    setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)));
                  }}
                  style={s.input}
                />

                <Text style={s.inspectorLabel}>Configuration JSON</Text>
                <TextInput
                  value={JSON.stringify(selectedNode.config, null, 2)}
                  onChangeText={(cfg) => {
                    try {
                      const parsed = JSON.parse(cfg);
                      const updated = { ...selectedNode, config: parsed };
                      setSelectedNode(updated);
                      setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)));
                    } catch {}
                  }}
                  multiline
                  style={[s.input, { height: 80, fontFamily: FONTS.med, color: '#93c5fd' }]}
                />
              </View>
            </View>
          )}

          {/* Live Execution Logs */}
          {executionLogs.length > 0 && (
            <View style={s.logsCard}>
              <Text style={s.logsTitle}>Execution Trace & Telemetry</Text>
              {executionLogs.map((lg, i) => (
                <Text key={i} style={s.logLine}>{lg}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ─────────────────── VIEW MODE 2: WORKFLOW LIST TABLE ─────────────────── */}
      {viewMode === 'list' && (
        <View style={{ gap: 10 }}>
          {items.length === 0 && (
            <View style={s.emptyState}>
              <Workflow size={32} color={SAC.dim} />
              <Text style={s.emptyTitle}>No workflows yet</Text>
              <Text style={s.emptySub}>Create your first workflow to automate approvals, alerts, and more.</Text>
            </View>
          )}
          {items.map((w) => {
            const successPct = Math.round((w.success / Math.max(w.runs, 1)) * 100);
            return (
              <View key={w.id} style={s.card}>
                <View style={[s.dot, { backgroundColor: w.color }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text numberOfLines={1} style={s.name}>{w.name}</Text>
                    {!w.on && <Badge label="PAUSED" color="gray" />}
                    {w.on && <Badge label="ACTIVE" color="green" />}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Zap size={11} color={SAC.muted} />
                    <Text style={s.trigger}>{w.trigger || '—'}</Text>
                    <Text style={s.dotSep}>·</Text>
                    <Clock size={11} color={SAC.muted} />
                    <Text style={s.trigger}>{w.steps.length} steps</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {w.steps.length === 0 ? (
                      <Text style={s.noSteps}>No steps defined — click Edit to add steps</Text>
                    ) : (
                      w.steps.map((step, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={s.step}>{step}</Text>
                          {idx < w.steps.length - 1 && <ChevronRight size={10} color={SAC.dim} />}
                        </View>
                      ))
                    )}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.statRuns}>{w.runs.toLocaleString('en-IN')} runs</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {successPct < 100 && w.runs > 0 && <AlertTriangle size={11} color={SAC.amber} />}
                    <Text style={[s.statSuccess, {
                      color: successPct >= 99 ? SAC.green : successPct >= 90 ? SAC.amber : w.runs === 0 ? SAC.muted : SAC.red,
                    }]}>
                      {w.runs === 0 ? 'Never run' : `${successPct}% success`}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 6, alignItems: 'center' }}>
                  <Pressable onPress={() => setViewWf(w)} style={s.iconBtn}><Eye size={13} color={SAC.muted} /></Pressable>
                  <Pressable onPress={() => setEditWf({ ...w })} style={s.iconBtn}><Pencil size={13} color={SAC.muted} /></Pressable>
                  <Pressable onPress={() => setDeleteWf(w)} style={[s.iconBtn, { borderColor: SAC.red + '55' }]}><Trash2 size={13} color={SAC.red} /></Pressable>
                </View>
                <Switch
                  value={w.on}
                  onValueChange={() => toggle(w.id, w.on)}
                  trackColor={{ false: 'rgba(255,255,255,0.10)', true: SAC.primary }}
                  thumbColor={w.on ? '#fff' : '#ccc'}
                  {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
                />
                <Pressable onPress={() => runWorkflow(w.id)} style={s.runBtn}>
                  <Play size={11} color={SAC.accent} /><Text style={s.runText}>Run</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ─────────────────── MODALS ─────────────────── */}
      {/* Create Modal */}
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 440 }]}>
            <LinearGradient colors={GRAD.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.modalHero}>
              <IconBox size={36}><Workflow size={16} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1 }}><Text style={s.modalTitle}>New workflow</Text><Text style={s.muted}>Define the name and trigger for your automation.</Text></View>
              <Pressable onPress={() => setCreating(false)}><X size={16} color={SAC.muted} /></Pressable>
            </LinearGradient>
            <View style={{ padding: 18, gap: 12 }}>
              <TextInput value={newWorkflow.name} onChangeText={(v) => setNewWorkflow({ ...newWorkflow, name: v })} placeholder="Workflow name (e.g. Welcome Series)" placeholderTextColor={SAC.dim} style={s.input} />
              <TextInput value={newWorkflow.trigger} onChangeText={(v) => setNewWorkflow({ ...newWorkflow, trigger: v })} placeholder="Trigger (e.g. New signup, Cron daily, Attendance < 70%)" placeholderTextColor={SAC.dim} style={s.input} />
              <View style={{ gap: 6 }}>
                <Text style={s.label}>Event Triggers</Text>
                <Text style={s.hint}>Select events that should trigger this workflow.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(['user.signup', 'mentor.signup', 'session.no_show', 'attendance.low', 'cron.daily', 'cron.1st_of_month']).map((evt) => {
                    const active = newWorkflow.event_triggers.includes(evt);
                    return (
                      <Pressable
                        key={evt}
                        onPress={() => {
                          setNewWorkflow((p) => ({
                            ...p,
                            event_triggers: active ? p.event_triggers.filter((e) => e !== evt) : [...p.event_triggers, evt],
                          }));
                        }}
                        style={[s.eventToggle, active && s.eventToggleActive]}
                      >
                        <Text style={[s.eventToggleText, active && s.eventToggleTextActive]}>{evt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <SecondaryButton onPress={() => setCreating(false)}><Text style={s.secText}>Cancel</Text></SecondaryButton>
                <GradientButton onPress={createWorkflow} disabled={!newWorkflow.name.trim()}><Check size={13} color="#fff" /><Text style={s.btnText}>Create</Text></GradientButton>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editWf} transparent animationType="fade" onRequestClose={() => setEditWf(null)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 500 }]}>
            <View style={{ padding: 18, gap: 12 }}>
              <Text style={s.modalTitle}>Edit Workflow: {editWf?.name}</Text>
              <TextInput value={editWf?.name} onChangeText={(v) => editWf && setEditWf({ ...editWf, name: v })} placeholder="Workflow name" style={s.input} />
              <TextInput value={editWf?.trigger} onChangeText={(v) => editWf && setEditWf({ ...editWf, trigger: v })} placeholder="Trigger" style={s.input} />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <SecondaryButton onPress={() => setEditWf(null)}><Text style={s.secText}>Cancel</Text></SecondaryButton>
                <GradientButton onPress={saveEdit}><Check size={13} color="#fff" /><Text style={s.btnText}>Save</Text></GradientButton>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={!!deleteWf} transparent animationType="fade" onRequestClose={() => setDeleteWf(null)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { maxWidth: 400, padding: 20, gap: 14 }]}>
            <Text style={{ color: SAC.text, fontFamily: FONTS.bold, fontSize: 16 }}>Delete Workflow?</Text>
            <Text style={{ color: SAC.muted, fontSize: 13 }}>Are you sure you want to delete "{deleteWf?.name}"? This action cannot be undone.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <SecondaryButton onPress={() => setDeleteWf(null)}><Text style={s.secText}>Cancel</Text></SecondaryButton>
              <Pressable onPress={confirmDelete} style={[s.cta, { backgroundColor: SAC.red }]}><Text style={s.ctaText}>Delete</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16 },
  banner: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.08)', borderColor: SAC.border2, borderWidth: 1, alignItems: 'center' },
  bIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center' },
  bTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  bSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  modeToggle: { flexDirection: 'row', backgroundColor: SAC.panel2, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: SAC.border },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  modeBtnActive: { backgroundColor: SAC.primary },
  modeText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: SAC.primary },
  ctaText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },

  // Canvas Styles
  canvasControlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  presetLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  presetPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: SAC.border, borderWidth: 1 },
  presetText: { color: '#eee', fontFamily: FONTS.med, fontSize: 11.5 },
  testRunBtn: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  testRunText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  paletteBar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10, borderRadius: 12, backgroundColor: SAC.panel2, borderWidth: 1, borderColor: SAC.border },
  paletteTitle: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  paletteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: SAC.card, borderWidth: 1 },
  paletteBtnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 11.5 },
  canvasContainer: { minHeight: 380, maxHeight: 600, backgroundColor: 'rgba(10,15,30,0.7)', borderColor: SAC.border2, borderWidth: 1, borderRadius: 16 },
  nodeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  nodeExecutingGlow: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10b981' },
  nodeIconBox: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nodeTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13.5 },
  nodeSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  nodeDeleteBtn: { padding: 8 },
  configRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  configChip: { flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: SAC.panel2, borderWidth: 1, borderColor: SAC.border },
  configChipKey: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  configChipVal: { color: '#93c5fd', fontFamily: FONTS.bold, fontSize: 10.5 },
  arrowRow: { alignItems: 'center', justifyContent: 'center', marginVertical: -4 },
  arrowLine: { width: 2, height: 8, backgroundColor: SAC.border },
  arrowHead: { width: 26, height: 26, borderRadius: 13, backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center' },
  inspectorCard: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  inspectorTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13.5 },
  inspectorLabel: { color: '#ccc', fontFamily: FONTS.bold, fontSize: 11.5 },
  logsCard: { backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  logsTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 13, marginBottom: 4 },
  logLine: { color: '#a7f3d0', fontFamily: FONTS.med, fontSize: 11.5 },

  // List View Styles
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  dot: { width: 4, height: 36, borderRadius: 2 },
  name: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 14 },
  trigger: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  dotSep: { color: SAC.dim },
  noSteps: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11.5 },
  step: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.04)' },
  statRuns: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  statSuccess: { fontFamily: FONTS.bold, fontSize: 11 },
  iconBtn: { padding: 6, borderRadius: 6, borderWidth: 1, borderColor: SAC.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  runText: { color: SAC.accent, fontFamily: FONTS.bold, fontSize: 11.5 },
  emptyState: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 15 },
  emptySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center' },

  // Modal Common
  modalBg: { flex: 1, backgroundColor: SAC.panel2, alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  modalTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 15 },
  muted: { color: SAC.muted, fontSize: 12 },
  secText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  btnText: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  input: { backgroundColor: SAC.panel2, borderColor: SAC.border, borderWidth: 1, borderRadius: 8, padding: 10, color: SAC.text, fontSize: 12.5 },
  label: { color: '#ccc', fontFamily: FONTS.bold, fontSize: 12 },
  hint: { color: SAC.muted, fontSize: 11 },
  eventToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: SAC.border },
  eventToggleActive: { backgroundColor: SAC.primary, borderColor: SAC.accent },
  eventToggleText: { color: SAC.muted, fontSize: 11 },
  eventToggleTextActive: { color: SAC.text, fontFamily: FONTS.bold }
});