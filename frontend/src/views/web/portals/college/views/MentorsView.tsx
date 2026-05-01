import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Mentor = { id: string; name: string; initials: string; role: string; company: string; status: string; sessions: number; rating: number; color: string };
const FALLBACK = { items: [] as Mentor[] };

export function MentorsView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/mentors', FALLBACK);
  const [actioned, setActioned] = useState<Record<string, string>>({});
  const MENTORS = (data?.items || []).filter((m) => !actioned[m.id]);
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'active'|'pending'>('active');
  const list = MENTORS.filter((m) => (tab === 'active' ? m.status === 'approved' : m.status === 'pending'));

  const onApprove = async (id: string) => { setActioned((p) => ({ ...p, [id]: 'approved' })); try { await postPortal(`/admin/super/approvals/${id}/approve`); } catch {} };
  const onReject = async (id: string) => { setActioned((p) => ({ ...p, [id]: 'rejected' })); try { await postPortal(`/admin/super/approvals/${id}/reject`); } catch {} };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
        {(['active','pending'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
            <Text style={{ color: tab === t ? '#fff' : CC.muted, fontFamily: FONTS.bold, fontSize: 12, textTransform: 'capitalize' }}>{t}</Text>
            <View style={s.count}><Text style={s.countText}>{MENTORS.filter((m) => (t === 'active' ? m.status === 'approved' : m.status === 'pending')).length}</Text></View>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        {list.map((m) => (
          <View key={m.id} style={s.row}>
            <Av initials={m.initials} size={42} color={m.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={s.name}>{m.name}</Text>
              <Text numberOfLines={1} style={s.meta}>{m.role} at {m.company}</Text>
              {tab === 'active' && <Text style={s.stats}>{m.sessions} sessions · {m.rating}★</Text>}
            </View>
            {tab === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable style={s.acceptBtn} onPress={() => onApprove(m.id)}><Check size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 }}>Approve</Text></Pressable>
                <Pressable style={s.declineBtn} onPress={() => onReject(m.id)}><X size={13} color={CC.red} /><Text style={{ color: CC.red, fontFamily: FONTS.bold, fontSize: 11.5 }}>Reject</Text></Pressable>
              </View>
            ) : (
              <Badge label="Active" color="green" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  tab: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, height: 36, borderRadius: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' },
  tabOn: { borderBottomColor: CC.primary, backgroundColor: 'rgba(99,102,241,0.10)' },
  count: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6 },
  countText: { color: CC.muted, fontFamily: FONTS.xbold, fontSize: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  name: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  stats: { color: CC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 },
  acceptBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: CC.green },
  declineBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.10)' },
});
