import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Skill = { skill: string; demand: number; supply: number; gap: number; color: string };
type Hiring = { company: string; openings: number; tier: string; season: string; color: string };
type Role = { role: string; growth: string; openings: number; color: string };
const FALLBACK = { skill_gaps: [] as Skill[], hiring_intent: [] as Hiring[], roles_in_demand: [] as Role[] };

export function CareerIntelView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/career-intel', FALLBACK);
  const SKILLS = data.skill_gaps || [];
  const HIRING = data.roles_in_demand || [];
  return (
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ flex: 1.5, minWidth: 320 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Skill Demand vs Supply</Text>
          <Text style={s.sub}>Aggregated from job-board data and your batch profiles.</Text>
          <View style={{ marginTop: 16, gap: 14 }}>
            {SKILLS.map((sk) => (
              <View key={sk.skill}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={s.skillName}>{sk.skill}</Text>
                  <Text style={[s.gapText, { color: sk.gap > 30 ? CC.red : sk.gap > 10 ? CC.amber : CC.green }]}>Gap: {sk.gap}</Text>
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
            ))}
          </View>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 280 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>Hiring Demand</Text>
          <Text style={s.sub}>Roles in demand · last 30 days.</Text>
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
