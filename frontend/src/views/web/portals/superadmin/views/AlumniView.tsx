import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Heart, Building2, MapPin, Award } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';

const ALUMNI = [
  { id:1, name:'Aanya Mehta',     init:'AM', batch:2019, college:'IIT Kanpur',           role:'Sr. PM, Atlassian',     city:'Sydney',       donor:true,  donated:'₹50K',  color:'#A78BFA' },
  { id:2, name:'Rishabh Kumar',   init:'RK', batch:2017, college:'BITS Pilani',          role:'CTO, Stealth Startup',  city:'San Francisco',donor:true,  donated:'₹2.4L', color:'#22D3EE' },
  { id:3, name:'Vidya Murthy',    init:'VM', batch:2015, college:"St. Xavier's, Mumbai", role:'VP Marketing, Disney+', city:'Mumbai',       donor:false, donated:'—',     color:'#EC4899' },
  { id:4, name:'Karan Joshi',     init:'KJ', batch:2020, college:'Anna University',      role:'SDE-2, Amazon',         city:'Bengaluru',    donor:true,  donated:'₹25K',  color:'#F59E0B' },
  { id:5, name:'Esha Tripathi',   init:'ET', batch:2014, college:'NIT Trichy',           role:'Founder, EduTech Co',   city:'Hyderabad',    donor:true,  donated:'₹1.0L', color:'#22C55E' },
  { id:6, name:'Mohit Bansal',    init:'MB', batch:2018, college:'IIT Kanpur',           role:'Quant, JaneStreet',     city:'New York',     donor:false, donated:'—',     color:'#3B82F6' },
];

export function AlumniView() {
  const { width } = useWindowDimensions();
  const cols = width >= 1280 ? 3 : width >= 760 ? 2 : 1;
  const cardW = `${100 / cols - (cols > 1 ? 1 : 0)}%`;

  return (
    <View>
      <View style={s.heroRow}>
        <View style={s.heroBox}><Award size={16} color={SAC.accent} /><View><Text style={s.heroLabel}>VERIFIED ALUMNI</Text><Text style={s.heroVal}>48,210</Text></View></View>
        <View style={s.heroBox}><Heart size={16} color={SAC.red} /><View><Text style={s.heroLabel}>DONATIONS YTD</Text><Text style={s.heroVal}>₹4.8 Cr</Text></View></View>
        <View style={s.heroBox}><Building2 size={16} color={SAC.blue} /><View><Text style={s.heroLabel}>UNIQUE COMPANIES</Text><Text style={s.heroVal}>3,420</Text></View></View>
        <View style={s.heroBox}><MapPin size={16} color={SAC.purple} /><View><Text style={s.heroLabel}>COUNTRIES</Text><Text style={s.heroVal}>62</Text></View></View>
      </View>

      <View style={s.grid}>
        {ALUMNI.map((a) => (
          <View key={a.id} style={[s.card, { width: cardW as any }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Av initials={a.init} size={44} color={a.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.name}>{a.name}</Text>
                <Text numberOfLines={1} style={s.batch}>{a.college} · Batch {a.batch}</Text>
              </View>
              {a.donor && <Badge label="DONOR" color="red" />}
            </View>
            <View style={{ marginTop: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Building2 size={11} color={SAC.muted} /><Text numberOfLines={1} style={s.line}>{a.role}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><MapPin size={11} color={SAC.muted} /><Text style={s.line}>{a.city}</Text></View>
              {a.donor && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Heart size={11} color={SAC.red} fill={SAC.red} />
                  <Text style={[s.line, { color: SAC.accentBright, fontFamily: FONTS.xbold }]}>Donated {a.donated}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable style={s.cta}><Text style={s.ctaText}>View profile</Text></Pressable>
              <Pressable style={s.outline}><Text style={s.outlineText}>Message</Text></Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  heroBox: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12 },
  heroLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },
  heroVal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 14 },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  batch: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  line: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  cta: { flex: 1, height: 32, borderRadius: 8, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 },
  outline: { paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: SAC.border, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
});
