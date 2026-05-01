import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Building2, UserCheck, Calendar, ShieldCheck, ChevronRight, Eye } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';

const APPROVALS = [
  { id:1, kind:'college' as const, who:'Manipal Institute of Tech', meta:'Onboarding · Premium MoU · ₹6.8L/yr', priority:'high' as const, who2:'MIT', color:'#3B82F6' },
  { id:2, kind:'college' as const, who:'Loyola College Chennai',     meta:'Onboarding · Standard MoU · ₹2.4L/yr', priority:'med' as const,  who2:'LC',  color:'#A78BFA' },
  { id:3, kind:'college' as const, who:'Symbiosis Pune',              meta:'Onboarding · Premium MoU · ₹5.2L/yr', priority:'high' as const, who2:'SP',  color:'#22D3EE' },
  { id:4, kind:'college' as const, who:'KIIT Bhubaneswar',            meta:'Renewal · Premium MoU · ₹4.8L/yr',    priority:'med' as const,  who2:'KT',  color:'#F59E0B' },

  { id:5, kind:'mentor' as const,  who:'Pranav Sinha',                meta:'SDE-3, Google · 8 yrs · ML Specialist', priority:'high' as const, who2:'PS', color:'#22C55E' },
  { id:6, kind:'mentor' as const,  who:'Tanvi Bhatt',                 meta:'CFO, Razorpay · 12 yrs · Fintech',       priority:'high' as const, who2:'TB', color:'#EC4899' },
  { id:7, kind:'mentor' as const,  who:'Akshay Iyer',                 meta:'Sr. PM, Flipkart · 6 yrs · Product',     priority:'med' as const,  who2:'AI', color:'#A78BFA' },
  { id:8, kind:'mentor' as const,  who:'Nidhi Gupta',                 meta:'Designer, Figma · 5 yrs · UX',           priority:'med' as const,  who2:'NG', color:'#22D3EE' },
  { id:9, kind:'mentor' as const,  who:'Rohan Kapadia',               meta:'Quant, JaneStreet · 7 yrs · Trading',    priority:'low' as const,  who2:'RK', color:'#FB923C' },
  { id:10,kind:'mentor' as const,  who:'Maya Subramanian',            meta:'Sr. Director, Adobe · 14 yrs · Strategy',priority:'high' as const, who2:'MS', color:'#3B82F6' },

  { id:11,kind:'event' as const,   who:'Ahmedabad Tech Fest 2026',     meta:'Jun 1–3 · Onsite · Capacity 1500',       priority:'med' as const,  who2:'TF', color:'#22D3EE' },
  { id:12,kind:'event' as const,   who:'AI Summit Bengaluru',          meta:'Jun 15 · Hybrid · Capacity 800',         priority:'low' as const,  who2:'AS', color:'#A78BFA' },
];

const kindIcon = (k: 'college' | 'mentor' | 'event') => k === 'college' ? Building2 : k === 'mentor' ? UserCheck : Calendar;
const kindLabel = (k: 'college' | 'mentor' | 'event') => k === 'college' ? 'COLLEGE' : k === 'mentor' ? 'MENTOR' : 'EVENT';
const pColor = (p: 'high'|'med'|'low') => p === 'high' ? 'red' as const : p === 'med' ? 'amber' as const : 'gray' as const;

export function ApprovalsView() {
  const [tab, setTab] = useState<'all'|'college'|'mentor'|'event'>('all');
  const list = APPROVALS.filter((a) => tab === 'all' ? true : a.kind === tab);

  return (
    <View>
      <View style={s.tabRow}>
        {([
          { id:'all',     label:`All Pending (${APPROVALS.length})` },
          { id:'college', label:`Colleges (${APPROVALS.filter(a=>a.kind==='college').length})` },
          { id:'mentor',  label:`Mentors (${APPROVALS.filter(a=>a.kind==='mentor').length})` },
          { id:'event',   label:`Events (${APPROVALS.filter(a=>a.kind==='event').length})` },
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
              <Pressable style={s.approveBtn}><ShieldCheck size={12} color="#fff" /><Text style={s.approveText}>Approve</Text></Pressable>
              <Pressable style={s.rejectBtn}><Text style={s.rejectText}>Reject</Text></Pressable>
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
