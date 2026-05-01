import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Star, Briefcase, IndianRupee, MoreHorizontal } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Mentor = { id: string; name: string; initials: string; role: string; tier: string; sessions: number; rating: number; payout: string; status: string; color: string };
const FALLBACK = { items: [] as Mentor[], counts: { all: 0, active: 0, pending: 0 } };

const tierColor = (t: string) => t === 'Platinum' ? 'purple' as const : t === 'Gold' ? 'amber' as const : t === 'Silver' ? 'gray' as const : 'orange' as const;

export function MentorsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/mentors', FALLBACK);
  const [tab, setTab] = useState<'all' | 'active' | 'pending'>('all');
  const [actioned, setActioned] = useState<Record<string, string>>({});
  const MENTORS = (data?.items || []).filter((m) => !actioned[m.id]);
  const counts = data?.counts || FALLBACK.counts;
  const { width } = useWindowDimensions();
  const stack = width < 760;
  const list = MENTORS.filter((m) => tab === 'all' ? true : m.status === (tab === 'active' ? 'approved' : 'pending'));

  const onApprove = async (id: string) => { setActioned((p) => ({ ...p, [id]: 'approved' })); try { await postPortal(`/admin/super/approvals/${id}/approve`); } catch {} };
  const onReject = async (id: string) => { setActioned((p) => ({ ...p, [id]: 'rejected' })); try { await postPortal(`/admin/super/approvals/${id}/reject`); } catch {} };

  return (
    <View>
      <View style={s.tabRow}>
        {([
          { id: 'all',     label: `All Mentors (${counts.all})` },
          { id: 'active',  label: `Active (${counts.active})` },
          { id: 'pending', label: `Pending Approval (${counts.pending})` },
        ] as const).map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[s.tab, tab === t.id && s.tabOn]}>
            <Text style={{ color: tab === t.id ? '#fff' : SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {list.map((m) => (
          <View key={m.id} style={[s.card, stack && { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: stack ? undefined : 2.4, minWidth: 0 }}>
              <Av initials={m.initials} size={42} color={m.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.name}>{m.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Briefcase size={11} color={SAC.muted} />
                  <Text numberOfLines={1} style={s.role}>{m.role}</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 26, flex: stack ? undefined : 2 }}>
              <View><Text style={s.statL}>TIER</Text><Badge label={m.tier} color={tierColor(m.tier)} /></View>
              <View><Text style={s.statL}>SESSIONS</Text><Text style={s.statV}>{m.sessions}</Text></View>
              <View>
                <Text style={s.statL}>RATING</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={11} color={SAC.accent} fill={SAC.accent} />
                  <Text style={s.statV}>{m.rating || '—'}</Text>
                </View>
              </View>
              <View>
                <Text style={s.statL}>PAYOUT/MO</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <IndianRupee size={10} color={SAC.accentBright} />
                  <Text style={[s.statV, { color: SAC.accentBright }]}>{m.payout.replace('₹', '')}</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: stack ? undefined : 1, justifyContent: stack ? 'flex-start' : 'flex-end' }}>
              {m.status === 'pending' ? (
                <>
                  <Pressable style={s.approveCta} onPress={() => onApprove(m.id)}><Text style={s.approveText}>Approve</Text></Pressable>
                  <Pressable style={s.rejectCta} onPress={() => onReject(m.id)}><Text style={s.rejectText}>Reject</Text></Pressable>
                </>
              ) : (
                <Pressable style={s.viewCta}><Text style={s.viewText}>View profile</Text></Pressable>
              )}
              <Pressable><MoreHorizontal size={16} color={SAC.muted} /></Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 14, height: 34, borderRadius: 8, borderColor: SAC.border, borderWidth: 1, backgroundColor: SAC.card, justifyContent: 'center' },
  tabOn: { backgroundColor: SAC.primary, borderColor: SAC.primary },

  card: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12 },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  role: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  statL: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.6, marginBottom: 4 },
  statV: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },

  approveCta: { paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: SAC.green, alignItems: 'center', justifyContent: 'center' },
  approveText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  rejectCta: { paddingHorizontal: 12, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 11.5 },
  viewCta: { paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center' },
  viewText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
});
