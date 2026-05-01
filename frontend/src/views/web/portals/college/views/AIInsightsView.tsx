import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const INSIGHTS = [
  { id:1, kind:'risk',         icon: AlertTriangle, color:'#EF4444', title:'4 students in CSE Y3 dropped below 60% attendance', body:'Aryan K., Mihir P., Tara D., Sahil V. Counselling sessions can be triggered automatically. Risk of dropout: medium.' },
  { id:2, kind:'opportunity',  icon: TrendingUp,    color:'#22C55E', title:'Google campus drive can absorb 18 more applicants',  body:'You currently have 32 shortlisted from 85 applied. AI suggests opening Round 2 to ECE Y4 students with CGPA ≥ 7.5 — 12 candidates qualify.' },
  { id:3, kind:'insight',      icon: Lightbulb,     color:'#FBBF24', title:'Top 3 in-demand skills missing in your batch',       body:'Cloud (AWS/GCP), System Design, ML Ops. Recommend running a 4-week intensive workshop — ROI on placement uplift estimated at 14%.' },
  { id:4, kind:'opportunity',  icon: TrendingUp,    color:'#A78BFA', title:'Alumni Aanya Mehta open to 5 mentor sessions/mo',    body:'Atlassian PM, Batch 2019. Confirmed availability. Recommend matching to 3 students prepping for PM internships.' },
  { id:5, kind:'risk',         icon: AlertTriangle, color:'#F59E0B', title:'Mechanical placement rate trailing other depts',     body:'88% vs 94% college avg. AI suggests targeted recruiter outreach: Mahindra, Tata Motors, John Deere are actively hiring.' },
  { id:6, kind:'insight',      icon: Lightbulb,     color:'#22D3EE', title:'Tech Fest RSVP at 240 — expected to hit capacity',  body:'Recommend opening overflow tier (₹100 ticket) or upgrading venue. Last year similar fest ended with 80 wait-list.' },
];

export function AIInsightsView() {
  return (
    <View>
      <View style={s.banner}>
        <View style={s.bIcon}><Sparkles size={16} color={CC.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.bTitle}>AI Insights · Powered by Claude</Text>
          <Text style={s.bSub}>6 prioritized insights generated this morning. Trust the high-priority ones — they’ve been verified against your last 3 months of platform data.</Text>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        {INSIGHTS.map((it) => {
          const Icon = it.icon;
          return (
            <View key={it.id} style={s.card}>
              <View style={[s.icon, { backgroundColor: it.color + '20', borderColor: it.color + '40' }]}><Icon size={15} color={it.color} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.title}>{it.title}</Text>
                  <Badge label={it.kind === 'risk' ? 'RISK' : it.kind === 'opportunity' ? 'OPPORTUNITY' : 'INSIGHT'} color={it.kind === 'risk' ? 'red' : it.kind === 'opportunity' ? 'green' : 'amber'} />
                </View>
                <Text style={s.body}>{it.body}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable style={s.actBtn}><Text style={s.actText}>Take action</Text></Pressable>
                  <Pressable style={s.dismissBtn}><Text style={s.dismissText}>Dismiss</Text></Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  banner: { flexDirection: 'row', gap: 12, padding: 14, marginBottom: 14, borderRadius: 14, backgroundColor: 'rgba(34,211,238,0.06)', borderColor: CC.border2, borderWidth: 1 },
  bIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  bSub: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 17 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  icon: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  body: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  actBtn: { paddingHorizontal: 14, height: 30, borderRadius: 8, backgroundColor: CC.primary, alignItems: 'center', justifyContent: 'center' },
  actText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  dismissBtn: { paddingHorizontal: 14, height: 30, borderRadius: 8, borderWidth: 1, borderColor: CC.border, backgroundColor: CC.card, alignItems: 'center', justifyContent: 'center' },
  dismissText: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
});
