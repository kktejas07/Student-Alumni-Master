import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const SKILLS = [
  { skill:'Cloud (AWS/GCP)', demand:92, supply:48, color:'#22D3EE' },
  { skill:'System Design',   demand:88, supply:36, color:'#A78BFA' },
  { skill:'ML/Deep Learning',demand:85, supply:62, color:'#34D399' },
  { skill:'React/Frontend',  demand:78, supply:80, color:'#FBBF24' },
  { skill:'Data Eng (Spark)',demand:74, supply:30, color:'#F472B6' },
];
const HIRING = [
  { role:'Software Engineer',     openings:142, growth:'↑ 12%' },
  { role:'Product Manager',       openings: 38, growth:'↑ 22%' },
  { role:'UX/Product Designer',   openings: 27, growth:'↑  8%' },
  { role:'Data Scientist',        openings: 64, growth:'↑ 18%' },
  { role:'Mobile Engineer (iOS)', openings: 22, growth:'↓  3%' },
];

export function CareerIntelView() {
  return (
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ flex: 1.5, minWidth: 320 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Skill Demand vs Supply</Text>
          <Text style={s.sub}>Aggregated from job-board data and your batch profiles.</Text>
          <View style={{ marginTop: 16, gap: 14 }}>
            {SKILLS.map((sk) => {
              const gap = sk.demand - sk.supply;
              return (
                <View key={sk.skill}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={s.skillName}>{sk.skill}</Text>
                    <Text style={[s.gapText, { color: gap > 30 ? CC.red : gap > 10 ? CC.amber : CC.green }]}>Gap: {gap}</Text>
                  </View>
                  <View style={{ position: 'relative', height: 10 }}>
                    <View style={[s.track, { width: `${sk.demand}%` as any, backgroundColor: sk.color + '60' }]} />
                    <View style={[s.track, { width: `${sk.supply}%` as any, backgroundColor: sk.color, top: 0 }]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={s.legend}>Supply: {sk.supply}%</Text>
                    <Text style={s.legend}>Demand: {sk.demand}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 280 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Hiring Demand</Text>
          <Text style={s.sub}>Active openings, last 30 days.</Text>
          <View style={{ gap: 10, marginTop: 12 }}>
            {HIRING.map((h) => (
              <View key={h.role} style={s.hRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.hRole}>{h.role}</Text>
                  <Text style={s.hMeta}>{h.openings} openings</Text>
                </View>
                <Badge label={h.growth} color={h.growth.includes('↑') ? 'green' : 'red'} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  sub: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  skillName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  gapText: { fontFamily: FONTS.bold, fontSize: 11 },
  track: { position: 'absolute', height: 6, borderRadius: 3, top: 2 },
  legend: { color: CC.dim, fontFamily: FONTS.med, fontSize: 10.5 },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: CC.border },
  hRole: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  hMeta: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
});
