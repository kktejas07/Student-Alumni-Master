import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Switch, Platform, Modal, ScrollView, TextInput } from 'react-native';
import { Workflow, Zap, Clock, ChevronRight, Plus, Play, AlertTriangle, X, Check, Trash2, Pencil, Eye } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
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
const FALLBACK = { items: [] as Wf[] };

export function WorkflowsView() {
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/workflows', FALLBACK);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
const [creating, setCreating] = useState(false);
const [newWorkflow, setNewWorkflow] = useState({ name: '', trigger: '', event_triggers: [] as string[] });
  const [viewWf, setViewWf] = useState<Wf | null>(null);
  const [editWf, setEditWf] = useState<Wf | null>(null);
  const [deleteWf, setDeleteWf] = useState<Wf | null>(null);
  const [runLogWf, setRunLogWf] = useState<Wf | null>(null);
  const { toast, flash } = useToast();

  const items: Wf[] = (data?.items || []).map((w) => ({
    ...w,
    on: overrides[w.id] !== undefined ? overrides[w.id] : w.on,
  }));

  const toggle = async (id: string, current: boolean) => {
    setOverrides((p) => ({ ...p, [id]: !current }));
    try {
      await postPortal(`/admin/super/workflows/${id}/toggle`);
      flash('Saved');
    } catch {
      setOverrides((p) => ({ ...p, [id]: current }));
      flash('Failed');
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

  return (
    <View>
      {/* Banner */}
      <View style={s.banner}>
        <View style={s.bIcon}><Workflow size={16} color={SAC.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.bTitle}>Automation Builder</Text>
            <Badge label="NEW" color="orange" />
          </View>
          <Text style={s.bSub}>Build event-triggered workflows. Each step executes in sequence when the workflow runs.</Text>
        </View>
        <Pressable onPress={() => setCreating(true)} style={s.cta}>
          <Plus size={13} color="#fff" /><Text style={s.ctaText}>New workflow</Text>
        </Pressable>
      </View>

      {/* Workflow List */}
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
                  ) : w.steps.map((step, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={s.step}>{step}</Text>
                      {idx < w.steps.length - 1 && <ChevronRight size={10} color={SAC.dim} />}
                    </View>
                  ))}
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
                {w.last_run_at && (
                  <Text style={s.lastRun}>Last run: {new Date(w.last_run_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                )}
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

      {/* View Detail Modal */}
      <Modal visible={!!viewWf} transparent animationType="fade" onRequestClose={() => setViewWf(null)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 580 }]}>
            <View style={[s.modalHero, { borderBottomWidth: 1, borderBottomColor: SAC.border, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={[s.dot, { width: 10, height: 40, borderRadius: 3, backgroundColor: viewWf?.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>{viewWf?.name}</Text>
                <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>
                  Trigger: {viewWf?.trigger || '—'}
                </Text>
              </View>
              {viewWf && (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={viewWf.on ? 'ACTIVE' : 'PAUSED'} color={viewWf.on ? 'green' : 'gray'} />
                  <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 }}>
                    {viewWf.runs} runs · {Math.round((viewWf.success / Math.max(viewWf.runs, 1)) * 100)}% success
                  </Text>
                </View>
              )}
              <Pressable onPress={() => setViewWf(null)} style={s.closePressable}><X size={16} color={SAC.muted} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 480, padding: 18, gap: 16 }}>
              {/* Steps */}
              <View>
                <Text style={s.sectionLabel}>STEPS ({viewWf?.steps?.length || 0})</Text>
                {(!viewWf?.steps || viewWf.steps.length === 0) ? (
                  <Text style={s.emptySub}>No steps defined. Edit the workflow to add steps.</Text>
                ) : viewWf.steps.map((step, idx) => (
                  <View key={idx} style={s.stepRow}>
                    <View style={s.stepNum}>{idx + 1}</View>
                    <Text style={s.stepName}>{step}</Text>
                    <Check size={13} color={SAC.green} />
                  </View>
                ))}
              </View>
              {/* Event Triggers */}
              {(viewWf?.event_triggers?.length > 0) && (
                <View>
                  <Text style={s.sectionLabel}>EVENT TRIGGERS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {viewWf.event_triggers.map((et, i) => (
                      <Text key={i} style={s.eventPill}>{et}</Text>
                    ))}
                  </View>
                </View>
              )}
              {/* Stats */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[s.statCard, { flex: 1 }]}>
                  <Text style={s.statVal}>{viewWf?.runs || 0}</Text>
                  <Text style={s.statLbl}>Total runs</Text>
                </View>
                <View style={[s.statCard, { flex: 1 }]}>
                  <Text style={s.statVal}>{viewWf?.success || 0}</Text>
                  <Text style={s.statLbl}>Successful</Text>
                </View>
                <View style={[s.statCard, { flex: 1 }]}>
                  <Text style={s.statVal}>{(viewWf?.runs || 0) - (viewWf?.success || 0)}</Text>
                  <Text style={s.statLbl}>Failed</Text>
                </View>
              </View>
              {/* Run Log */}
              {(viewWf?.run_log && viewWf.run_log.length > 0) && (
                <View>
                  <Text style={s.sectionLabel}>RECENT RUNS</Text>
                  <View style={{ gap: 8 }}>
                    {([...(viewWf?.run_log || [])].reverse()).slice(0, 10).map((log, i) => (
                      <View key={i} style={s.logCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          {log.success ? (
                            <Check size={12} color={SAC.green} />
                          ) : (
                            <AlertTriangle size={12} color={SAC.red} />
                          )}
                          <Text style={[s.logDate, { color: log.success ? SAC.green : SAC.red }]}>
                            {new Date(log.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        {log.steps?.map((s, si) => (
                          <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                            {s.success ? <Check size={10} color={SAC.green} /> : <X size={10} color={SAC.red} />}
                            <Text style={[s.logStep, { color: s.success ? SAC.muted : SAC.red }]}>{s.step}: {s.message}</Text>
                          </View>
                        ))}
                      </View>
                  ))}
                </View>
                {(w.event_triggers?.length > 0) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                    <Text style={{ color: SAC.dim, fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.5 }}>EVENTS:</Text>
                    {w.event_triggers.map((et, idx) => (
                      <Text key={idx} style={s.eventPill}>{et}</Text>
                    ))}
                  </View>
                )}
              </View>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: SAC.border }}>
              <SecondaryButton onPress={() => { setViewWf(null); setEditWf(viewWf); }}><Pencil size={13} color={SAC.muted} /><Text style={s.secText}>Edit</Text></SecondaryButton>
              <Pressable onPress={() => { setViewWf(null); if (viewWf) runWorkflow(viewWf.id); }} style={s.runBtnLarge}>
                <Play size={13} color={SAC.accent} /><Text style={s.runTextLarge}>Run now</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editWf} transparent animationType="fade" onRequestClose={() => setEditWf(null)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 520 }]}>
            <View style={[s.modalHero, { borderBottomWidth: 1, borderBottomColor: SAC.border, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <IconBox size={32}><Pencil size={15} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>Edit workflow</Text><Text style={s.muted}>Update name, trigger, steps, and color.</Text></View>
              <Pressable onPress={() => setEditWf(null)}><X size={16} color={SAC.muted} /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 480, padding: 18, gap: 14 }}>
              <View style={{ gap: 6 }}>
                <Text style={s.label}>Name</Text>
                <TextInput value={editWf?.name || ''} onChangeText={(v) => setEditWf((p) => p ? { ...p, name: v } : null)} style={s.input} placeholder="Workflow name" placeholderTextColor={SAC.dim} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={s.label}>Trigger</Text>
                <TextInput value={editWf?.trigger || ''} onChangeText={(v) => setEditWf((p) => p ? { ...p, trigger: v } : null)} style={s.input} placeholder="e.g. New mentor signup" placeholderTextColor={SAC.dim} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={s.label}>Steps</Text>
                <Text style={s.hint}>Each step is executed in order when the workflow runs.</Text>
                {(!editWf?.steps || editWf.steps.length === 0) && (
                  <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 12, fontStyle: 'italic' }}>No steps yet</Text>
                )}
                {editWf?.steps?.map((step, idx) => (
                  <View key={idx} style={s.stepEditRow}>
                    <Text style={s.stepNumSmall}>{idx + 1}</Text>
                    <TextInput
                      value={step}
                      onChangeText={(v) => {
                        const newSteps = [...(editWf?.steps || [])];
                        newSteps[idx] = v;
                        setEditWf((p) => p ? { ...p, steps: newSteps } : null);
                      }}
                      style={[s.input, { flex: 1 }]}
                      placeholder="Step name"
                      placeholderTextColor={SAC.dim}
                    />
                    <Pressable
                      onPress={() => {
                        const newSteps = (editWf?.steps || []).filter((_, i) => i !== idx);
                        setEditWf((p) => p ? { ...p, steps: newSteps } : null);
                      }}
                      style={s.stepRemoveBtn}
                    >
                      <X size={12} color={SAC.red} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={() => setEditWf((p) => p ? { ...p, steps: [...(p.steps || []), ''] } : null)}
                  style={s.addStepBtn}
                >
                  <Plus size={13} color={SAC.accent} />
                  <Text style={s.addStepText}>Add step</Text>
                </Pressable>
              </View>
              {/* Event Triggers */}
              <View style={{ gap: 6 }}>
                <Text style={s.label}>Event Triggers</Text>
                <Text style={s.hint}>Workflow runs automatically when these events occur.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(['user.signup', 'mentor.signup', 'session.no_show', 'attendance.low', 'payment.failed', 'event.register', 'cron.daily', 'cron.1st_of_month']).map((evt) => {
                    const active = (editWf?.event_triggers || []).includes(evt);
                    return (
                      <Pressable
                        key={evt}
                        onPress={() => {
                          const current = editWf?.event_triggers || [];
                          const next = active ? current.filter((e: string) => e !== evt) : [...current, evt];
                          setEditWf((p) => p ? { ...p, event_triggers: next } : null);
                        }}
                        style={[s.eventToggle, active && s.eventToggleActive]}
                      >
                        <Text style={[s.eventToggleText, active && s.eventToggleTextActive]}>{evt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {/* Color */}
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {['#22C55E', '#EF4444', '#F97316', '#A78BFA', '#3B82F6', '#EC4899', '#14B8A6', '#F59E0B'].map((c) => (
                    <Pressable key={c} onPress={() => setEditWf((p) => p ? { ...p, color: c } : null)} style={[s.colorSwatch, { backgroundColor: c }, editWf?.color === c && s.colorSwatchActive]} />
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: SAC.border }}>
              <SecondaryButton onPress={() => setEditWf(null)}><Text style={s.secText}>Cancel</Text></SecondaryButton>
              <GradientButton onPress={saveEdit} disabled={!editWf?.name?.trim()}><Check size={13} color="#fff" /><Text style={s.btnText}>Save</Text></GradientButton>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!deleteWf} transparent animationType="fade" onRequestClose={() => setDeleteWf(null)}>
        <View style={s.modalBg}>
          <Animated.View entering={FadeInDown.duration(200)} style={[s.modalCard, { maxWidth: 400 }]}>
            <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
              <View style={[s.iconCircle, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1 }]}>
                <Trash2 size={22} color={SAC.red} />
              </View>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16, textAlign: 'center' }}>Delete "{deleteWf?.name}"?</Text>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', lineHeight: 18 }}>
                This will permanently delete this workflow and its run history. This cannot be undone.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: SAC.border }}>
              <Pressable onPress={() => setDeleteWf(null)} style={[s.cancelBtn, { flex: 1 }]}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} style={[s.deleteBtn, { flex: 1 }]}>
                <Trash2 size={13} color="#fff" />
                <Text style={s.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Toast text={toast.text} visible={toast.visible} />
    </View>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', gap: 12, padding: 14, marginBottom: 14, borderRadius: 14, backgroundColor: 'rgba(249,115,22,0.06)', borderColor: SAC.border2, borderWidth: 1, alignItems: 'center' },
  bIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  bSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 17 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.primary, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  muted: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
  btnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}) },
  modalCard: { width: '100%', maxWidth: 560, maxHeight: '92%', backgroundColor: SAC.bg2, borderRadius: 16, borderWidth: 1, borderColor: SAC.border2, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.7)' } as any) : {}) },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, backgroundColor: SAC.card },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  input: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 13, backgroundColor: SAC.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, paddingHorizontal: 12, paddingVertical: 10, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  label: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12 },
  hint: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11 },
  sectionLabel: { color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.4, marginBottom: 8 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12 },
  dot: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  trigger: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  dotSep: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11.5 },
  step: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 10.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.04)' },
  noSteps: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11, fontStyle: 'italic' },
  statRuns: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  statSuccess: { fontFamily: FONTS.bold, fontSize: 11 },
  lastRun: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10 },
  iconBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 7, borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  runText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  eventPill: { color: SAC.accent, fontFamily: FONTS.bold, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: 'rgba(245,158,11,0.10)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.20)' },
  eventToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.cardSolid, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  eventToggleActive: { borderColor: SAC.accent, backgroundColor: 'rgba(245,158,11,0.12)' },
  eventToggleText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  eventToggleTextActive: { color: SAC.accent, fontFamily: FONTS.bold },

  emptyState: { alignItems: 'center', gap: 10, padding: 40 },
  emptyTitle: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  emptySub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },

  closePressable: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: SAC.border },
  stepNum: { width: 22, height: 22, borderRadius: 6, backgroundColor: SAC.cardSolid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SAC.border },
  stepName: { flex: 1, color: SAC.text, fontFamily: FONTS.med, fontSize: 13 },
  statCard: { backgroundColor: SAC.cardSolid, borderRadius: 10, borderWidth: 1, borderColor: SAC.border, padding: 12, alignItems: 'center' },
  statVal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22 },
  statLbl: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10.5, marginTop: 4 },
  logCard: { backgroundColor: SAC.cardSolid, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, padding: 10 },
  logDate: { fontFamily: FONTS.bold, fontSize: 11.5 },
  logStep: { fontFamily: FONTS.med, fontSize: 11 },
  runBtnLarge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: SAC.primary, borderWidth: 1, borderColor: SAC.primary + '55', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  runTextLarge: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },

  stepEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepNumSmall: { width: 20, height: 20, borderRadius: 6, backgroundColor: SAC.cardSolid, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SAC.border, color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, textAlign: 'center', overflow: 'hidden' },
  stepRemoveBtn: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SAC.red + '44', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  addStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: SAC.accent + '44', borderStyle: 'dashed', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  addStepText: { color: SAC.accent, fontFamily: FONTS.bold, fontSize: 12 },
  colorSwatch: { width: 28, height: 28, borderRadius: 7, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchActive: { borderColor: '#fff' },

  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: SAC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  cancelText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: SAC.red, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  deleteBtnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
});