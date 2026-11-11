/**
 * Super Admin Portal — Approvals view.
 *
 * Renders pending approvals (colleges / mentors / events) with
 * review slide panel, inline approve/reject, bulk actions.
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import {
  Building2, UserCheck, Calendar, ShieldCheck, ChevronRight, Eye, EyeOff,
  CheckCircle2, X, Mail, Phone, MapPin, Briefcase, GraduationCap,
  Clock, AlertTriangle, ExternalLink, Timer, History, ArrowUpRight, Download,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { SAC, useSAC, FONTS, resolveColors, pristineOf } from '../tokens';
import { Av } from '../atoms';
import {
  GRAD, GradientButton, SecondaryButton, TopTabs, SearchField,
  StatusPill, Toast, useToast, EmptyState, IconBox, Card,
} from '../applekit';
import { usePortalData, postPortal } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';

type Approval = {
  id: string; kind: 'college' | 'mentor' | 'event'; who: string; who2: string;
  meta: string; priority: 'high' | 'med' | 'low'; color: string;
  pending_hours?: number; sla_hours?: number; due_at?: string | null;
  remaining_hours?: number; overdue?: boolean;
  sla_state?: 'on_track' | 'due_soon' | 'overdue';
};
type Counts = {
  all: number; college: number; mentor: number; event: number;
  overdue?: number; due_soon?: number;
};
type AuditEntry = {
  id: string; action: string; kind: string; item_id: string; label: string;
  at: string; actor?: { email?: string; name?: string }; detail?: any;
};

const FALLBACK = {
  items: [] as Approval[],
  counts: { all: 0, college: 0, mentor: 0, event: 0 } as Counts,
};

const kindIcon  = (k: Approval['kind']) => (k === 'college' ? Building2 : k === 'mentor' ? UserCheck : Calendar);
const kindLabel = (k: Approval['kind']) => (k === 'college' ? 'COLLEGE' : k === 'mentor' ? 'MENTOR' : 'EVENT');

/* ── helpers ──────────────────────────────────────────────── */
function fmtDuration(h?: number) {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}
function fmtTimestamp(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}
function slaBadge(item: Approval) {
  const st = item.sla_state || (item.overdue ? 'overdue' : 'on_track');
  if (st === 'overdue') return { label: 'OVERDUE', color: '#F87171', bg: 'rgba(248,113,113,0.12)', kind: 'danger' as const };
  if (st === 'due_soon') return { label: 'DUE SOON', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', kind: 'warn' as const };
  return { label: 'ON TRACK', color: '#34D399', bg: 'rgba(52,211,153,0.12)', kind: 'success' as const };
}
const ACTION_META: Record<string, { label: string; color: string }> = {
  approve: { label: 'Approved', color: '#34D399' },
  reject: { label: 'Rejected', color: '#F87171' },
  escalate: { label: 'Escalated', color: '#FB923C' },
  comment: { label: 'Comment', color: '#93C5FD' },
};
const priorityKind = (p: Approval['priority']): 'danger' | 'warn' | 'neutral' => (p === 'high' ? 'danger' : p === 'med' ? 'warn' : 'neutral');

function ApprovalsEmptyArt() {
  const T = useSAC();
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Rect x={9} y={9} width={26} height={26} rx={7} fill="none" stroke={T.line2} strokeDasharray="3 3" />
      <Circle cx={22} cy={21} r={6.5} fill={T.tint} stroke={T.violet} strokeWidth={1.6} />
      <Path d="M19.5 21l1.8 1.8 3.4-3.6" fill="none" stroke={T.violet} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ReviewPanel({ item, onClose, onApprove, onReject, onEscalate }: {
  item: Approval | null;
  onClose: () => void;
  onApprove: (id: string, label?: string) => void;
  onReject: (id: string, label?: string) => void;
  onEscalate: (item: Approval) => void;
}) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [trail, setTrail] = useState<AuditEntry[]>([]);
  const [showTrail, setShowTrail] = useState(true);

  // AP4: every action on this item, oldest-first, from the append-only log.
  useEffect(() => {
    if (!item) { setTrail([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const r: any = await request<any>(
          `/admin/approvals/audit?kind=${item.kind}&item_id=${item.id}&limit=50`,
          { method: 'GET', auth: true },
        );
        if (!cancelled) setTrail(r?.entries || []);
      } catch {
        if (!cancelled) setTrail([]);
      }
    })();
    return () => { cancelled = true; };
  }, [item?.id, item?.kind]);

  if (!item) return null;

  const Icon = kindIcon(item.kind);
  const badge = slaBadge(item);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={rpst.overlay}>
        <Pressable style={rpst.backdrop} onPress={onClose} />
        <View style={rpst.panel}>
          <View style={rpst.head}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconBox size={36}><Icon size={16} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={rpst.title}>Review {kindLabel(item.kind)}</Text>
                <Text style={rpst.sub}>Approve or reject this {item.kind} request</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={rpst.xBtn}><X size={16} color={SAC.muted} /></Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
            <View style={rpst.profile}>
              <Av initials={item.who2} size={56} color={item.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={rpst.name}>{item.who}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <StatusPill label={kindLabel(item.kind)} kind="warn" />
                  <StatusPill
                    label={item.priority === 'high' ? 'HIGH PRIORITY' : item.priority === 'med' ? 'MEDIUM' : 'LOW'}
                    kind={priorityKind(item.priority)}
                  />
                  <StatusPill label={badge.label} kind={badge.kind} />
                </View>
              </View>
            </View>

            <View style={rpst.detailCard}>
              <View style={rpst.detailRow}>
                <Briefcase size={13} color={SAC.muted} />
                <Text style={rpst.detailLabel}>Type</Text>
                <Text style={rpst.detailVal}>{kindLabel(item.kind)}</Text>
              </View>
              <View style={rpst.detailRow}>
                <MapPin size={13} color={SAC.muted} />
                <Text style={rpst.detailLabel}>Details</Text>
                <Text style={rpst.detailVal} numberOfLines={2}>{item.meta}</Text>
              </View>
              <View style={rpst.detailRow}>
                <Timer size={13} color={item.overdue ? '#F87171' : SAC.muted} />
                <Text style={rpst.detailLabel}>Pending</Text>
                <Text style={[rpst.detailVal, item.overdue && { color: '#F87171' }]}>
                  {fmtDuration(item.pending_hours)}
                </Text>
              </View>
              <View style={rpst.detailRow}>
                <Clock size={13} color={SAC.muted} />
                <Text style={rpst.detailLabel}>SLA</Text>
                <Text style={rpst.detailVal}>
                  {item.sla_hours || '—'}h · due {fmtTimestamp(item.due_at || '')}
                </Text>
              </View>
            </View>

            {/* AP4 — audit trail timeline */}
            <View style={rpst.trailCard}>
              <Pressable onPress={() => setShowTrail((v) => !v)} style={rpst.trailHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <History size={13} color={SAC.muted} />
                  <Text style={rpst.trailTitle}>Audit trail</Text>
                  <StatusPill label={`${trail.length}`} kind="neutral" />
                </View>
                <ChevronRight
                  size={14}
                  color={SAC.dim}
                  style={{ transform: [{ rotate: showTrail ? '90deg' : '0deg' }] }}
                />
              </Pressable>

              {showTrail && (
                <View style={{ marginTop: 10, gap: 0 }}>
                  {trail.length === 0 ? (
                    <Text style={rpst.trailEmpty}>No actions recorded yet.</Text>
                  ) : (
                    trail.slice().reverse().map((e, i) => {
                      const meta = ACTION_META[e.action] || { label: e.action, color: SAC.muted };
                      return (
                        <View key={e.id || `${e.at}-${i}`} style={rpst.trailRow}>
                          <View style={rpst.trailGutter}>
                            <View style={[rpst.trailDot, { backgroundColor: meta.color }]} />
                            {i < trail.length - 1 && <View style={rpst.trailLine} />}
                          </View>
                          <View style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[rpst.trailAction, { color: meta.color }]}>{meta.label}</Text>
                              {e.actor?.name ? (
                                <Text style={rpst.trailActor}>by {e.actor.name}</Text>
                              ) : null}
                            </View>
                            <Text style={rpst.trailTime}>{fmtTimestamp(e.at)}</Text>
                            {e.detail?.note ? (
                              <Text style={rpst.trailNote}>{e.detail.note}</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>

            {item.overdue && (
              <SecondaryButton onPress={() => onEscalate(item)}>
                <ArrowUpRight size={13} color="#FB923C" />
                <Text style={{ color: '#FB923C', fontFamily: FONTS.bold, fontSize: 12 }}>
                  Escalate this overdue approval
                </Text>
              </SecondaryButton>
            )}

            {confirmReject ? (
              <View style={rpst.rejectBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#FCA5A5" />
                  <Text style={rpst.rejectTitle}>Reason for rejection</Text>
                </View>
                <TextInput
                  style={rpst.rejectInput}
                  placeholder="The applicant will see this. Keep it kind & specific."
                  placeholderTextColor={SAC.dim}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <SecondaryButton onPress={() => { setConfirmReject(false); setRejectReason(''); }} style={{ flex: 1 }}>
                    <Text style={rpst.secText}>Cancel</Text>
                  </SecondaryButton>
                  <GradientButton onPress={() => { onReject(item.id, item.who); setConfirmReject(false); }} style={{ flex: 1 }}>
                    <Text style={rpst.primaryText}>Confirm Reject</Text>
                  </GradientButton>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <SecondaryButton
                  onPress={() => setConfirmReject(true)}
                  style={{ flex: 1 }}
                  danger
                >
                  <AlertTriangle size={13} color="#FCA5A5" />
                  <Text style={rpst.dangerText}>Reject</Text>
                </SecondaryButton>
                <GradientButton onPress={() => onApprove(item.id, item.who)} style={{ flex: 1 }}>
                  <ShieldCheck size={13} color="#fff" />
                  <Text style={rpst.primaryText}>Approve</Text>
                </GradientButton>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const rpst = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: SAC.panel2 },
  panel: {
    backgroundColor: SAC.bg2, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%', minHeight: 340,
    borderTopWidth: 1, borderTopColor: SAC.border,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  xBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,23,38,0.05)' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  name: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 17 },
  detailCard: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 12, padding: 14, gap: 12,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, width: 60 },
  detailVal: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  rejectBox: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)',
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  rejectTitle: { color: SAC.danger, fontFamily: FONTS.bold, fontSize: 12.5 },
  rejectInput: {
    height: 80, borderRadius: 10, backgroundColor: SAC.panel2,
    color: SAC.text, fontFamily: FONTS.med, fontSize: 12.5,
    padding: 12, textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  primaryText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 12 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  dangerText: { color: SAC.danger, fontFamily: FONTS.bold, fontSize: 12 },
  trailCard: {
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1,
    borderRadius: 12, padding: 14,
  },
  trailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trailTitle: { color: SAC.text, fontFamily: FONTS.bold, fontSize: 12.5 },
  trailEmpty: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 11.5 },
  trailRow: { flexDirection: 'row', gap: 10 },
  trailGutter: { width: 12, alignItems: 'center' },
  trailDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  trailLine: { flex: 1, width: 1.5, backgroundColor: SAC.border, marginTop: 3 },
  trailAction: { fontFamily: FONTS.bold, fontSize: 11.5 },
  trailActor: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  trailTime: { color: SAC.dim, fontFamily: FONTS.mono, fontSize: 10, marginTop: 2 },
  trailNote: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 },
});

export function ApprovalsView() {
  const T = useSAC();
  Object.assign(rpst, resolveColors(pristineOf(rpst), T));
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/approvals', FALLBACK);
  const [tab, setTab] = useState<'all' | 'overdue' | 'college' | 'mentor' | 'event'>('all');
  const [actioned, setActioned] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [reviewItem, setReviewItem] = useState<Approval | null>(null);
  const { toast, flash, hide } = useToast();

  const items = data?.items || [];
  const counts = data?.counts || FALLBACK.counts;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (actioned[a.id]) return false;
      if (tab === 'overdue' && !a.overdue) return false;
      if (tab !== 'all' && tab !== 'overdue' && a.kind !== tab) return false;
      if (q && !(`${a.who} ${a.meta}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, tab, actioned, search]);

  const toggleSel = (id: string) => setSelection((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const selectAll = () => setSelection(new Set(list.map((a) => a.id)));
  const clearSel  = () => setSelection(new Set());

  // AP4 — record that the review panel was opened.
  const openReview = useCallback(async (item: Approval) => {
    setReviewItem(item);
    try {
      await postPortal(`/admin/approvals/${item.kind}/${item.id}/view`);
    } catch {
      // Viewing is best-effort; never block the panel on a logging failure.
    }
  }, []);

  const onEscalate = async (item: Approval) => {
    try {
      const r: any = await postPortal(`/admin/approvals/${item.kind}/${item.id}/escalate`, {
        body: { note: `Pending ${fmtDuration(item.pending_hours)} against a ${item.sla_hours}h SLA` },
      });
      flash(r?.message || 'Escalated');
      setReviewItem(null);
    } catch (e: any) {
      flash(e?.message || 'Failed to escalate', 'error');
    }
  };

  const exportAuditCsv = async () => {
    try {
      const { tokenStore } = await import('@/src/models/services/api');
      const { getBaseUrl } = await import('@/src/lib/env');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${getBaseUrl()}/api/admin/approvals/audit.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'approval_audit_trail.csv';
      a.click();
      URL.revokeObjectURL(url);
      flash('Audit trail exported');
    } catch (e: any) {
      flash(e?.message || 'Export failed', 'error');
    }
  };

  const onApprove = async (id: string, label?: string) => {
    setActioned((p) => ({ ...p, [id]: 'approved' }));
    setSelection((p) => { const n = new Set(p); n.delete(id); return n; });
    setReviewItem(null);
    try { await postPortal(`/admin/super/approvals/${id}/approve`); flash(`Approved${label ? `: ${label}` : ''}`); refresh(); } catch { flash('Failed to approve'); }
  };
  const onReject = async (id: string, label?: string) => {
    setActioned((p) => ({ ...p, [id]: 'rejected' }));
    setSelection((p) => { const n = new Set(p); n.delete(id); return n; });
    setReviewItem(null);
    try { await postPortal(`/admin/super/approvals/${id}/reject`); flash(`Rejected${label ? `: ${label}` : ''}`); refresh(); } catch { flash('Failed to reject'); }
  };
  const bulkApprove = async () => {
    const ids = Array.from(selection);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      setActioned((p) => ({ ...p, [id]: 'approved' }));
      try {
        await postPortal(`/admin/super/approvals/${id}/approve`);
        ok += 1;
      } catch {
        fail += 1;
        setActioned((p) => { const n = { ...p }; delete n[id]; return n; });
      }
    }
    setSelection(new Set());
    if (fail === 0) {
      flash(`Approved ${ok} item${ok === 1 ? '' : 's'}`);
    } else {
      flash(`Approved ${ok}, failed ${fail}`, fail === ids.length ? 'error' : 'warning');
    }
    refresh();
  };

  const tabs = [
    { id: 'all',     label: 'All Pending', count: counts.all },
    { id: 'overdue', label: 'Overdue',    count: counts.overdue || 0, icon: AlertTriangle },
    { id: 'college', label: 'Colleges',    count: counts.college, icon: Building2 },
    { id: 'mentor',  label: 'Mentors',     count: counts.mentor,  icon: UserCheck },
    { id: 'event',   label: 'Events',      count: counts.event,   icon: Calendar  },
  ] as const;

  return (
    <View style={{ gap: 14 }}>
      {/* Review slide panel */}
      <ReviewPanel
        item={reviewItem}
        onClose={() => setReviewItem(null)}
        onApprove={onApprove}
        onReject={onReject}
        onEscalate={onEscalate}
      />

      {/* Header */}
      <Card>
        <View style={s.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBox><CheckCircle2 size={14} color={GRAD.to} /></IconBox>
            <View>
              <Text style={s.title}>Approvals queue</Text>
              <Text style={s.sub}>
                {counts.all} item{counts.all === 1 ? '' : 's'} waiting · review and approve in bulk or individually
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <SearchField value={search} onChange={setSearch} placeholder="Search by name or meta…" width={240} />
            <SecondaryButton onPress={exportAuditCsv}>
              <Download size={12} color={SAC.muted} />
              <Text style={s.secText}>Export trail</Text>
            </SecondaryButton>
            {selection.size > 0 ? (
              <>
                <SecondaryButton onPress={clearSel}>
                  <Text style={s.secText}>Clear ({selection.size})</Text>
                </SecondaryButton>
                <GradientButton onPress={bulkApprove}>
                  <ShieldCheck size={13} color="#fff" />
                  <Text style={s.primaryText}>Approve {selection.size}</Text>
                </GradientButton>
              </>
            ) : (
              list.length > 0 && (
                <SecondaryButton onPress={selectAll}>
                  <Text style={s.secText}>Select all</Text>
                </SecondaryButton>
              )
            )}
          </View>
        </View>

        {/* SLA summary strip (AP1) */}
        <View style={s.slaStrip}>
          <View style={s.slaStat}>
            <Text style={s.slaStatValue}>{counts.overdue || 0}</Text>
            <Text style={s.slaStatLabel}>OVERDUE</Text>
          </View>
          <View style={s.slaDivider} />
          <View style={s.slaStat}>
            <Text style={[s.slaStatValue, { color: T.amber }]}>{counts.due_soon || 0}</Text>
            <Text style={s.slaStatLabel}>DUE SOON</Text>
          </View>
          <View style={s.slaDivider} />
          <View style={s.slaStat}>
            <Text style={[s.slaStatValue, { color: T.ok }]}>
              {Math.max((counts.all || 0) - (counts.overdue || 0) - (counts.due_soon || 0), 0)}
            </Text>
            <Text style={s.slaStatLabel}>ON TRACK</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={s.slaHint}>
            SLA · colleges 48h · mentors 24h · events 72h
          </Text>
        </View>
      </Card>

      {/* Tabs */}
      <TopTabs<typeof tab> tabs={tabs as any} active={tab} onChange={(t) => setTab(t as any)} />

      {/* List */}
      {list.length === 0 ? (
        <EmptyState
          icon={() => <ApprovalsEmptyArt />}
          title="Nothing here right now"
          sub={search ? 'No items match your search.' : 'New approvals will appear here as they come in.'}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {list.map((a) => {
            const Icon = kindIcon(a.kind);
            const selected = selection.has(a.id);
            const badge = slaBadge(a);
            return (
              <Animated.View key={a.id} entering={FadeInDown.duration(160)} style={[s.row, selected && s.rowSel, a.overdue && s.rowOverdue]}>
                <Pressable onPress={() => toggleSel(a.id)} style={[s.check, selected && s.checkOn]}>
                  {selected && <CheckCircle2 size={11} color="#fff" />}
                </Pressable>
                <Av initials={a.who2} size={40} color={a.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text numberOfLines={1} style={s.name}>{a.who}</Text>
                    <StatusPill label={kindLabel(a.kind)} kind="warn" />
                    <StatusPill
                      label={a.priority === 'high' ? 'HIGH' : a.priority === 'med' ? 'MED' : 'LOW'}
                      kind={priorityKind(a.priority)}
                    />
                    <StatusPill label={badge.label} kind={badge.kind} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <Icon size={11} color={T.muted} />
                    <Text numberOfLines={1} style={s.meta}>{a.meta}</Text>
                  </View>
                </View>
                <SecondaryButton size="sm" onPress={() => openReview(a)}>
                  <Eye size={12} color={T.muted} />
                  <Text style={s.secText}>Review</Text>
                </SecondaryButton>
                <GradientButton size="sm" onPress={() => onApprove(a.id, a.who)}>
                  <ShieldCheck size={12} color="#fff" />
                  <Text style={s.primaryText}>Approve</Text>
                </GradientButton>
                <SecondaryButton size="sm" danger onPress={() => onReject(a.id, a.who)}>
                  <Text style={s.dangerText}>Reject</Text>
                </SecondaryButton>
                <ChevronRight size={14} color={T.dim} />
              </Animated.View>
            );
          })}
        </View>
      )}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  title: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 15 },
  sub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
  },
  rowSel: { borderColor: GRAD.ring, backgroundColor: 'rgba(245,158,11,0.04)' },
  rowOverdue: { borderColor: 'rgba(239,68,68,0.55)', backgroundColor: 'rgba(239,68,68,0.05)' },

  slaStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 10, marginTop: 12,
  },
  slaStat: { alignItems: 'center', minWidth: 54 },
  slaStatValue: { color: SAC.danger, fontFamily: FONTS.xbold, fontSize: 17 },
  slaStatLabel: { color: SAC.dim, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.6, marginTop: 2 },
  slaDivider: { width: 1, height: 26, backgroundColor: SAC.border2 },
  slaHint: { color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 },
  check: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: GRAD.to, borderColor: GRAD.to },

  name: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 13.5 },
  meta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },

  primaryText: { color: SAC.text, fontFamily: FONTS.xbold, fontSize: 11.5 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  dangerText: { color: SAC.danger, fontFamily: FONTS.bold, fontSize: 11.5 },
});
