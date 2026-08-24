// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, ScrollView, Platform } from 'react-native';
import { Building2, UserCheck, Calendar, ShieldCheck, ChevronRight, Eye, CheckCircle2, Inbox, X, Briefcase, MapPin, Clock, AlertTriangle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SAC, FONTS } from '../tokens';
import { Av } from '../atoms';
import { GRAD, GradientButton, SecondaryButton, TopTabs, SearchField, StatusPill, Toast, useToast, EmptyState, IconBox, Card } from '../applekit';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Approval = { id: string; kind: 'college' | 'mentor' | 'event'; who: string; who2: string; meta: string; priority: 'high' | 'med' | 'low'; color: string };
type Counts = { all: number; college: number; mentor: number; event: number };
const FALLBACK = { items: [] as Approval[], counts: { all: 0, college: 0, mentor: 0, event: 0 } as Counts };
const kindIcon = (k: Approval['kind']) => (k === 'college' ? Building2 : k === 'mentor' ? UserCheck : Calendar);
const kindLabel = (k: Approval['kind']) => (k === 'college' ? 'COLLEGE' : k === 'mentor' ? 'MENTOR' : 'EVENT');
const priorityKind = (p: Approval['priority']) => (p === 'high' ? 'danger' : p === 'med' ? 'warn' : 'neutral') as const;

function ReviewPanel({ item, onClose, onApprove, onReject }: { item: Approval | null; onClose: () => void; onApprove: (id: string, label?: string) => void; onReject: (id: string, label?: string) => void }) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  if (!item) return null;
  const Icon = kindIcon(item.kind);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <View style={{ backgroundColor: SAC.bg2, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%', minHeight: 340, borderTopWidth: 1, borderTopColor: SAC.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconBox size={36}><Icon size={16} color={GRAD.to} /></IconBox>
              <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>Review {kindLabel(item.kind)}</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>Approve or reject this {item.kind} request</Text></View>
            </View>
            <Pressable onPress={onClose} style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}><X size={16} color={SAC.muted} /></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
              <Av initials={item.who2} size={56} color={item.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 17 }}>{item.who}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}><StatusPill label={kindLabel(item.kind)} kind="warn" /><StatusPill label={item.priority === 'high' ? 'HIGH PRIORITY' : item.priority === 'med' ? 'MEDIUM' : 'LOW'} kind={priorityKind(item.priority)} /></View>
              </View>
            </View>
            <View style={{ backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Briefcase size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, width: 60 }}>Type</Text><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 }}>{kindLabel(item.kind)}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><MapPin size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, width: 60 }}>Details</Text><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 }} numberOfLines={2}>{item.meta}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Clock size={13} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, width: 60 }}>Requested</Text><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 }}>Pending review</Text></View>
            </View>
            {confirmReject ? (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', borderWidth: 1, borderRadius: 12, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}><AlertTriangle size={14} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12.5 }}>Reason for rejection</Text></View>
                <TextInput style={{ height: 80, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.25)', color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, padding: 12, textAlignVertical: 'top', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }} placeholder="The applicant will see this. Keep it kind & specific." placeholderTextColor={SAC.dim} value={rejectReason} onChangeText={setRejectReason} multiline />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <SecondaryButton onPress={() => { setConfirmReject(false); setRejectReason(''); }} style={{ flex: 1 }}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Cancel</Text></SecondaryButton>
                  <GradientButton onPress={() => { onReject(item.id, item.who); setConfirmReject(false); }} style={{ flex: 1 }} danger><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>Confirm Reject</Text></GradientButton>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <SecondaryButton onPress={() => setConfirmReject(true)} style={{ flex: 1 }} danger><AlertTriangle size={13} color="#FCA5A5" /><Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 }}>Reject</Text></SecondaryButton>
                <GradientButton onPress={() => onApprove(item.id, item.who)} style={{ flex: 1 }}><ShieldCheck size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>Approve</Text></GradientButton>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function ApprovalsView() {
  const { data, refresh } = usePortalData<typeof FALLBACK>('/admin/super/approvals', FALLBACK);
  const [tab, setTab] = useState<'all' | 'college' | 'mentor' | 'event'>('all');
  const [actioned, setActioned] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [reviewItem, setReviewItem] = useState<Approval | null>(null);
  const { toast, flash, hide } = useToast();
  const items = data?.items || [];
  const counts = data?.counts || FALLBACK.counts;

  const list = useMemo(() => { const q = search.trim().toLowerCase(); return items.filter((a) => { if (actioned[a.id]) return false; if (tab !== 'all' && a.kind !== tab) return false; if (q && !(`${a.who} ${a.meta}`.toLowerCase().includes(q))) return false; return true; }); }, [items, tab, actioned, search]);
  const toggleSel = (id: string) => setSelection((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectAll = () => setSelection(new Set(list.map((a) => a.id)));
  const clearSel = () => setSelection(new Set());

  const onApprove = async (id: string, label?: string) => { setActioned((p) => ({ ...p, [id]: 'approved' })); setSelection((p) => { const n = new Set(p); n.delete(id); return n; }); setReviewItem(null); try { await postPortal(`/admin/super/approvals/${id}/approve`); flash(`Approved${label ? `: ${label}` : ''}`); refresh(); } catch { flash('Failed to approve'); } };
  const onReject = async (id: string, label?: string) => { setActioned((p) => ({ ...p, [id]: 'rejected' })); setSelection((p) => { const n = new Set(p); n.delete(id); return n; }); setReviewItem(null); try { await postPortal(`/admin/super/approvals/${id}/reject`); flash(`Rejected${label ? `: ${label}` : ''}`); refresh(); } catch { flash('Failed to reject'); } };
  const bulkApprove = async () => { const ids = Array.from(selection); let ok = 0; let fail = 0; for (const id of ids) { setActioned((p) => ({ ...p, [id]: 'approved' })); try { await postPortal(`/admin/super/approvals/${id}/approve`); ok += 1; } catch { fail += 1; setActioned((p) => { const n = { ...p }; delete n[id]; return n; }); } } setSelection(new Set()); if (fail === 0) flash(`Approved ${ok} item${ok === 1 ? '' : 's'}`); else flash(`Approved ${ok}, failed ${fail}`, fail === ids.length ? 'error' : 'warning'); refresh(); };

  const tabs = [{ id: 'all', label: 'All Pending', count: counts.all }, { id: 'college', label: 'Colleges', count: counts.college, icon: Building2 }, { id: 'mentor', label: 'Mentors', count: counts.mentor, icon: UserCheck }, { id: 'event', label: 'Events', count: counts.event, icon: Calendar }] as const;

  return (
    <View style={{ gap: 14 }}>
      <ReviewPanel item={reviewItem} onClose={() => setReviewItem(null)} onApprove={onApprove} onReject={onReject} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><IconBox><CheckCircle2 size={14} color={GRAD.to} /></IconBox><View><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>Approvals queue</Text><Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{counts.all} item{counts.all === 1 ? '' : 's'} waiting · review and approve in bulk or individually</Text></View></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <SearchField value={search} onChange={setSearch} placeholder="Search by name or meta…" width={240} />
            {selection.size > 0 ? (<><SecondaryButton onPress={clearSel}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 }}>Clear ({selection.size})</Text></SecondaryButton><GradientButton onPress={bulkApprove}><ShieldCheck size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 }}>Approve {selection.size}</Text></GradientButton></>) : (list.length > 0 && <SecondaryButton onPress={selectAll}><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 }}>Select all</Text></SecondaryButton>)}
          </View>
        </View>
      </Card>
      <TopTabs<typeof tab> tabs={tabs as any} active={tab} onChange={(t) => setTab(t as any)} />
      {list.length === 0 ? (<EmptyState icon={Inbox} title="Nothing here right now" sub={search ? 'No items match your search.' : 'New approvals will appear here as they come in.'} />) : (
        <View style={{ gap: 10 }}>
          {list.map((a) => {
            const Icon = kindIcon(a.kind);
            const selected = selection.has(a.id);
            return (
              <Animated.View key={a.id} entering={FadeInDown.duration(160)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, ...(selected ? { borderColor: GRAD.ring, backgroundColor: 'rgba(245,158,11,0.04)' } : {}) }}>
                <Pressable onPress={() => toggleSel(a.id)} style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1.4, borderColor: selected ? GRAD.to : SAC.border2, alignItems: 'center', justifyContent: 'center', ...(selected ? { backgroundColor: GRAD.to } : {}) }}>
                  {selected && <CheckCircle2 size={11} color="#fff" />}
                </Pressable>
                <Av initials={a.who2} size={40} color={a.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 }}>{a.who}</Text>
                    <StatusPill label={kindLabel(a.kind)} kind="warn" />
                    <StatusPill label={a.priority === 'high' ? 'HIGH' : a.priority === 'med' ? 'MED' : 'LOW'} kind={priorityKind(a.priority)} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}><Icon size={11} color={SAC.muted} /><Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{a.meta}</Text></View>
                </View>
                <SecondaryButton size="sm" onPress={() => setReviewItem(a)}><Eye size={12} color={SAC.muted} /><Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 }}>Review</Text></SecondaryButton>
                <GradientButton size="sm" onPress={() => onApprove(a.id, a.who)}><ShieldCheck size={12} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 }}>Approve</Text></GradientButton>
                <SecondaryButton size="sm" danger onPress={() => onReject(a.id, a.who)}><Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11.5 }}>Reject</Text></SecondaryButton>
                <ChevronRight size={14} color={SAC.dim} />
              </Animated.View>
            );
          })}
        </View>
      )}
      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}
