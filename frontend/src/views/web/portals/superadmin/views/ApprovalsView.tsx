import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Building2, UserCheck, Calendar, ShieldCheck, ChevronRight, Eye } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Approval = {
  id: string; kind: 'college' | 'mentor' | 'event'; who: string; who2: string;
  meta: string; priority: 'high' | 'med' | 'low'; color: string;
};

const FALLBACK = { items: [] as Approval[], counts: { all: 0, college: 0, mentor: 0, event: 0 } };

const kindIcon = (k: 'college' | 'mentor' | 'event') => k === 'college' ? Building2 : k === 'mentor' ? UserCheck : Calendar;
const kindLabel = (k: 'college' | 'mentor' | 'event') => k === 'college' ? 'COLLEGE' : k === 'mentor' ? 'MENTOR' : 'EVENT';
const pColor = (p: 'high'|'med'|'low') => p === 'high' ? 'red' as const : p === 'med' ? 'amber' as const : 'gray' as const;

export function ApprovalsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/approvals', FALLBACK);
  const [tab, setTab] = useState<'all'|'college'|'mentor'|'event'>('all');
  const [actioned, setActioned] = useState<Record<string, 'approved' | 'rejected'>>({});

  const items = data?.items || [];
  const counts = data?.counts || FALLBACK.counts;
  const list = items.filter((a) => (tab === 'all' ? true : a.kind === tab) && !actioned[a.id]);

  const onApprove = async (id: string) => {
    setActioned((p) => ({ ...p, [id]: 'approved' }));
    try { await postPortal(`/admin/super/approvals/${id}/approve`); } catch {}
  };
  const onReject = async (id: string) => {
    setActioned((p) => ({ ...p, [id]: 'rejected' }));
    try { await postPortal(`/admin/super/approvals/${id}/reject`); } catch {}
  };

  return (
    <View>
      <View style={s.tabRow}>
        {([
          { id:'all',     label:`All Pending (${counts.all})` },
          { id:'college', label:`Colleges (${counts.college})` },
          { id:'mentor',  label:`Mentors (${counts.mentor})` },
          { id:'event',   label:`Events (${counts.event})` },
        ] as const).map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[s.tab, tab === t.id && s.tabOn]}>
            <Text style={{ color: tab === t.id ? '#fff' : SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {list.map((a) => {
          const Icon = kindIcon(a.kind);
          return (
            <View key={a.id} style={s.row}>
              <Av initials={a.who2} size={40} color={a.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text numberOfLines={1} style={s.name}>{a.who}</Text>
                  <Badge label={kindLabel(a.kind)} color="orange" />
                  <Badge label={a.priority === 'high' ? 'HIGH' : a.priority === 'med' ? 'MED' : 'LOW'} color={pColor(a.priority)} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Icon size={11} color={SAC.muted} />
                  <Text numberOfLines={1} style={s.meta}>{a.meta}</Text>
                </View>
              </View>
              <Pressable style={s.viewBtn}><Eye size={12} color={SAC.muted} /><Text style={s.viewText}>Review</Text></Pressable>
              <Pressable style={s.approveBtn} onPress={() => onApprove(a.id)}><ShieldCheck size={12} color="#fff" /><Text style={s.approveText}>Approve</Text></Pressable>
              <Pressable style={s.rejectBtn} onPress={() => onReject(a.id)}><Text style={s.rejectText}>Reject</Text></Pressable>
              <ChevronRight size={14} color={SAC.dim} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 14, height: 34, borderRadius: 8, borderColor: SAC.border, borderWidth: 1, backgroundColor: SAC.card, justifyContent: 'center' },
  tabOn: { backgroundColor: SAC.primary, borderColor: SAC.primary },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12 },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  meta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },

  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8, borderWidth: 1, borderColor: SAC.border },
  viewText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8, backgroundColor: SAC.green },
  approveText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11 },
  rejectBtn: { paddingHorizontal: 11, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11 },
});
