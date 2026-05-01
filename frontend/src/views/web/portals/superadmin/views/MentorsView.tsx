import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Star, Briefcase, IndianRupee, MoreHorizontal } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';

const MENTORS = [
  { id:1, name:'Dr. Suresh Rao',     initials:'SR', role:'AI Architect, Microsoft',     tier:'Platinum', sessions:182, rating:4.9, payout:'₹1.4L', status:'active'   as const, color:'#A78BFA' },
  { id:2, name:'Aanya Mehta',         initials:'AM', role:'PM, Atlassian',                tier:'Gold',     sessions:128, rating:4.8, payout:'₹98K',  status:'active'   as const, color:'#22D3EE' },
  { id:3, name:'Kunal Verma',         initials:'KV', role:'Founder, Stealth Startup',     tier:'Gold',     sessions:96,  rating:4.7, payout:'₹76K',  status:'active'   as const, color:'#F59E0B' },
  { id:4, name:'Riya Khanna',         initials:'RK', role:'Sr. Designer, Spotify',        tier:'Silver',   sessions:54,  rating:4.6, payout:'₹38K',  status:'active'   as const, color:'#EC4899' },
  { id:5, name:'Pranav Sinha',        initials:'PS', role:'SDE-3, Google',                tier:'Pending',  sessions:0,   rating:0,   payout:'₹0',    status:'pending'  as const, color:'#3B82F6' },
  { id:6, name:'Tanvi Bhatt',         initials:'TB', role:'CFO, Razorpay',                tier:'Pending',  sessions:0,   rating:0,   payout:'₹0',    status:'pending'  as const, color:'#22C55E' },
];

const tierColor = (t: string) => t === 'Platinum' ? 'purple' as const : t === 'Gold' ? 'amber' as const : t === 'Silver' ? 'gray' as const : 'orange' as const;

export function MentorsView() {
  const { width } = useWindowDimensions();
  const stack = width < 760;
  const [tab, setTab] = useState<'all' | 'active' | 'pending'>('all');
  const list = MENTORS.filter((m) => tab === 'all' ? true : m.status === tab);

  return (
    <View>
      <View style={s.tabRow}>
        {([
          { id: 'all',     label: 'All Mentors (1,840)' },
          { id: 'active',  label: 'Active' },
          { id: 'pending', label: 'Pending Approval (6)' },
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
                  <Pressable style={s.approveCta}><Text style={s.approveText}>Approve</Text></Pressable>
                  <Pressable style={s.rejectCta}><Text style={s.rejectText}>Reject</Text></Pressable>
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
