// @ts-nocheck
/**
 * Super Admin Portal — Approvals view.
 *
 * Renders pending approvals (colleges / mentors / events) with
 * the Apple-grade design kit: gradient top-tabs, search, status
 * pills, gradient Approve CTA, and an auto-save toast.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  Building2, UserCheck, Calendar, ShieldCheck, ChevronRight, Eye,
  CheckCircle2, Inbox,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SAC, FONTS } from '../tokens';
import { Av } from '../atoms';
import {
  GRAD, GradientButton, SecondaryButton, TopTabs, SearchField,
  StatusPill, Toast, useToast, EmptyState, IconBox, Card,
} from '../applekit';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Approval = {
  id: string; kind: 'college' | 'mentor' | 'event'; who: string; who2: string;
  meta: string; priority: 'high' | 'med' | 'low'; color: string;
};
type Counts = { all: number; college: number; mentor: number; event: number };

const FALLBACK = { items: [] as Approval[], counts: { all: 0, college: 0, mentor: 0, event: 0 } as Counts };

const kindIcon  = (k: Approval['kind']) => (k === 'college' ? Building2 : k === 'mentor' ? UserCheck : Calendar);
const kindLabel = (k: Approval['kind']) => (k === 'college' ? 'COLLEGE' : k === 'mentor' ? 'MENTOR' : 'EVENT');
const priorityKind = (p: Approval['priority']) => (p === 'high' ? 'danger' : p === 'med' ? 'warn' : 'neutral') as const;

export function ApprovalsView() {
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/approvals', FALLBACK);
  const [tab, setTab] = useState<'all' | 'college' | 'mentor' | 'event'>('all');
  const [actioned, setActioned] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const { toast, flash } = useToast();

  const items = data?.items || [];
  const counts = data?.counts || FALLBACK.counts;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (actioned[a.id]) return false;
      if (tab !== 'all' && a.kind !== tab) return false;
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

  const onApprove = async (id: string, label?: string) => {
    setActioned((p) => ({ ...p, [id]: 'approved' }));
    setSelection((p) => { const n = new Set(p); n.delete(id); return n; });
    try { await postPortal(`/admin/super/approvals/${id}/approve`); flash(`Approved${label ? `: ${label}` : ''}`); refresh(); } catch { flash('Failed to approve'); }
  };
  const onReject = async (id: string, label?: string) => {
    setActioned((p) => ({ ...p, [id]: 'rejected' }));
    setSelection((p) => { const n = new Set(p); n.delete(id); return n; });
    try { await postPortal(`/admin/super/approvals/${id}/reject`); flash(`Rejected${label ? `: ${label}` : ''}`); refresh(); } catch { flash('Failed to reject'); }
  };
  const bulkApprove = async () => {
    const ids = Array.from(selection);
    for (const id of ids) {
      setActioned((p) => ({ ...p, [id]: 'approved' }));
      try { await postPortal(`/admin/super/approvals/${id}/approve`); } catch {}
    }
    setSelection(new Set());
    flash(`Approved ${ids.length} item${ids.length === 1 ? '' : 's'}`);
    refresh();
  };

  const tabs = [
    { id: 'all',     label: 'All Pending', count: counts.all },
    { id: 'college', label: 'Colleges',    count: counts.college, icon: Building2 },
    { id: 'mentor',  label: 'Mentors',     count: counts.mentor,  icon: UserCheck },
    { id: 'event',   label: 'Events',      count: counts.event,   icon: Calendar  },
  ] as const;

  return (
    <View style={{ gap: 14 }}>
      {/* Header */}
      <Card>
        <View style={s.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBox><CheckCircle2 size={14} color={GRAD.to} /></IconBox>
            <View>
              <Text style={s.title}>Approvals queue</Text>
              <Text style={s.sub}>{counts.all} item{counts.all === 1 ? '' : 's'} waiting · review and approve in bulk or individually</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <SearchField value={search} onChange={setSearch} placeholder="Search by name or meta…" width={240} />
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
      </Card>

      {/* Tabs */}
      <TopTabs<typeof tab> tabs={tabs as any} active={tab} onChange={(t) => setTab(t as any)} />

      {/* List */}
      {list.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nothing here right now"
          sub={search ? 'No items match your search.' : 'New approvals will appear here as they come in.'}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {list.map((a) => {
            const Icon = kindIcon(a.kind);
            const selected = selection.has(a.id);
            return (
              <Animated.View key={a.id} entering={FadeInDown.duration(160)} style={[s.row, selected && s.rowSel]}>
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
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <Icon size={11} color={SAC.muted} />
                    <Text numberOfLines={1} style={s.meta}>{a.meta}</Text>
                  </View>
                </View>
                <SecondaryButton size="sm" onPress={() => onApprove(a.id, a.who)}>
                  <Eye size={12} color={SAC.muted} />
                  <Text style={s.secText}>Review</Text>
                </SecondaryButton>
                <GradientButton size="sm" onPress={() => onApprove(a.id, a.who)}>
                  <ShieldCheck size={12} color="#fff" />
                  <Text style={s.primaryText}>Approve</Text>
                </GradientButton>
                <SecondaryButton size="sm" danger onPress={() => onReject(a.id, a.who)}>
                  <Text style={s.dangerText}>Reject</Text>
                </SecondaryButton>
                <ChevronRight size={14} color={SAC.dim} />
              </Animated.View>
            );
          })}
        </View>
      )}

      <Toast text={toast.text} visible={toast.visible} />
    </View>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 },
  sub:   { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12,
  },
  rowSel: { borderColor: GRAD.ring, backgroundColor: 'rgba(245,158,11,0.04)' },
  check: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.4, borderColor: SAC.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: GRAD.to, borderColor: GRAD.to },

  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  meta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },

  primaryText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  secText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  dangerText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11.5 },
});
