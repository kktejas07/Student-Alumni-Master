import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, MapPin, Globe, Phone, Mail, Building2 } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { COLLEGE } from '../data';

export function ProfileView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;
  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      <View style={{ flex: stack ? undefined : 1.5, gap: 12 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Av initials={COLLEGE.initials} size={70} color={CC.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name}>{COLLEGE.name}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Badge label={COLLEGE.rank} color="cyan" />
                <Badge label="Verified ✓" color="green" />
                <Badge label="Est. 1869" color="purple" />
              </View>
            </View>
            <Pressable style={s.editBtn}><Text style={{ color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 12 }}>Edit</Text></Pressable>
          </View>
          <View style={{ marginTop: 18, gap: 8 }}>
            <Row Icon={MapPin}    label="Location"  value="5, Mahapalika Marg, Mumbai 400001" />
            <Row Icon={Globe}     label="Website"   value="xaviers.edu" />
            <Row Icon={Phone}     label="Contact"   value="+91 22 2262 0661" />
            <Row Icon={Mail}      label="Email"     value="admin@xaviers.edu" />
            <Row Icon={Building2} label="Affiliation" value="University of Mumbai" />
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Accreditations</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {[{ l:'NAAC A++',c:'#22D3EE' }, { l:'NIRF Top 50',c:'#FBBF24' }, { l:'AICTE',c:'#A78BFA' }, { l:'Autonomous',c:'#22C55E' }].map((x) => (
              <View key={x.l} style={[s.accBox, { borderColor: x.c + '60' }]}>
                <Award size={20} color={x.c} />
                <Text style={s.accLabel}>{x.l}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={{ width: stack ? '100%' : 320 }}>
        <LinearGradient colors={[CC.primary, CC.primaryD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.idCard}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 }}>ADMIN PORTAL · DIGITAL ID</Text>
          <Av initials={COLLEGE.initials} size={56} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 10 }}>{COLLEGE.name}</Text>
          <Text style={{ color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5, marginTop: 2 }}>Admin Code: SXC-A88-2026</Text>
          <View style={s.idStats}>
            <Stat label="Students" value="3,240" /><View style={s.divider} />
            <Stat label="Alumni"   value="8,400" /><View style={s.divider} />
            <Stat label="Placement" value="94%" />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}
function Row({ Icon, label, value }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={s.rowIcon}><Icon size={13} color={CC.accentBright} /></View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text numberOfLines={1} style={s.rowValue}>{value}</Text>
    </View>
  );
}
function Stat({ label, value }: any) {
  return (<View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>{value}</Text><Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.6, marginTop: 2 }}>{label}</Text></View>);
}
const s = StyleSheet.create({
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  editBtn: { paddingHorizontal: 14, height: 32, borderRadius: 8, borderWidth: 1, borderColor: CC.border2, backgroundColor: CC.card, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(99,102,241,0.10)', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 },
  rowValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  accBox: { width: 110, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: CC.card, gap: 6 },
  accLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10.5, textAlign: 'center' },
  idCard: { borderRadius: 18, padding: 22, alignItems: 'flex-start' },
  idStats: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 14, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  divider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.20)' },
});
