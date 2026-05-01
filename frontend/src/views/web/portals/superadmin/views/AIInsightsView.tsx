import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Zap } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const INSIGHTS = [
  { id:1, kind:'risk' as const,        icon: AlertTriangle, color:'#EF4444', title:'Mentor supply gap forecast for May',                body:'At current 18% MoM growth, 22 colleges will exceed their mentor-to-student SLA by May 31. Recommend onboarding 40+ Platinum mentors in Bengaluru, Hyderabad, Pune.' },
  { id:2, kind:'opportunity' as const, icon: TrendingUp,    color:'#22C55E', title:'Premium MoU upgrade opportunity — ₹2.1Cr',          body:'14 Standard MoU colleges show 3x higher session volume than peers. Conversion model predicts 73% upgrade probability. Trigger automated upgrade pitch.' },
  { id:3, kind:'insight' as const,     icon: Lightbulb,     color:'#FBBF24', title:'Peak booking window: Sundays 6-9pm',                 body:'42% of weekly mentor bookings happen Sunday evenings. Push notification timed to 5:30pm shows 3.2x higher conversion than current 9am send.' },
  { id:4, kind:'opportunity' as const, icon: TrendingUp,    color:'#A78BFA', title:'Alumni donor segment leaking — re-engage',           body:'18 high-net-worth alumni (₹50K+ donations) haven\'t opened the platform in 90+ days. Personalized milestone email predicted to recover 12 (~₹6L pipeline).' },
  { id:5, kind:'risk' as const,        icon: AlertTriangle, color:'#F59E0B', title:'Refund spike on Hackathon vertical',                 body:'Refunds up 38% MoM. Root cause likely partner organizer reliability — 4 of 7 refunds traced to one vendor. Recommend immediate review.' },
  { id:6, kind:'insight' as const,     icon: Zap,           color:'#22D3EE', title:'AI-mock-interview adoption uplift drives retention',  body:'Students who use AI mock-interview within first 14 days show 2.4x higher 30-day retention. Recommend featuring it in onboarding.' },
];

export function AIInsightsView() {
  return (
    <View>
      <View style={s.banner}>
        <View style={s.bIcon}><Sparkles size={16} color={SAC.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.bTitle}>Platform Briefing · Powered by Claude</Text>
          <Text style={s.bSub}>6 prioritized insights generated this morning. Trust the high-priority ones — they’ve been verified against the last 90 days of platform data.</Text>
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
  banner: { flexDirection: 'row', gap: 12, padding: 14, marginBottom: 14, borderRadius: 14, backgroundColor: 'rgba(251,191,36,0.06)', borderColor: SAC.border2, borderWidth: 1 },
  bIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  bSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 4, lineHeight: 17 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  icon: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  body: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  actBtn: { paddingHorizontal: 14, height: 30, borderRadius: 8, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center' },
  actText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  dismissBtn: { paddingHorizontal: 14, height: 30, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, backgroundColor: SAC.card, alignItems: 'center', justifyContent: 'center' },
  dismissText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
});
