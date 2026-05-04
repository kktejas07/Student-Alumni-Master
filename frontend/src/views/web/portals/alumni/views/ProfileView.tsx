import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { QrCode, Award, MapPin, GraduationCap, Github, Linkedin, ExternalLink } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { STUDENT } from '../data';

const BADGES = [
  { id: 1, label: 'Top Performer',   color: '#FCD34D' },
  { id: 2, label: '10 Sessions',     color: '#A78BFA' },
  { id: 3, label: 'Profile Verified',color: '#22C55E' },
  { id: 4, label: 'Hackathon Winner',color: '#F59E0B' },
];

export function ProfileView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;
  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      <View style={{ flex: stack ? undefined : 1.5, gap: 12 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Av initials={STUDENT.initials} size={66} color={SC.primaryL} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name}>{STUDENT.name}</Text>
              <Text style={s.meta}>{STUDENT.year} · B.Tech CSE</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Badge label="Verified ✓" color="green" />
                <Badge label={STUDENT.saId} color="purple" />
              </View>
            </View>
            <Pressable style={s.editBtn}><Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12 }}>Edit</Text></Pressable>
          </View>
          <View style={{ marginTop: 18, gap: 8 }}>
            <Row Icon={GraduationCap} label="College" value="BITS Pilani · Batch 2026" />
            <Row Icon={MapPin}        label="Location" value="Pilani, Rajasthan" />
            <Row Icon={Linkedin}      label="LinkedIn" value="linkedin.com/in/arjunsharma" />
            <Row Icon={Github}        label="GitHub"   value="github.com/arjunsharma" />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Achievements & Badges</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {BADGES.map((b) => (
              <View key={b.id} style={[s.badgeBox, { borderColor: b.color + '60' }]}>
                <Award size={20} color={b.color} />
                <Text style={s.badgeLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
        <LinearGradient colors={[SC.primary, SC.primaryD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.idCard}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 }}>STUDENT ALUMNI · DIGITAL ID</Text>
          <Av initials={STUDENT.initials} size={56} color={SC.primaryL} />
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 10 }}>{STUDENT.name}</Text>
          <Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12, marginTop: 2 }}>{STUDENT.saId}</Text>
          <View style={s.qrBox}><QrCode size={88} color={SC.primaryD} /></View>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 10, textAlign: 'center', marginTop: 8 }}>Scan to view full profile</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

function Row({ Icon, label, value }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={s.rowIcon}><Icon size={13} color={SC.accentBright} /></View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text numberOfLines={1} style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  name: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  editBtn: { paddingHorizontal: 14, height: 32, borderRadius: 8, borderWidth: 1, borderColor: SC.border2, backgroundColor: SC.card, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.10)', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 80 },
  rowValue: { color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, flex: 1 },
  badgeBox: { width: 100, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: SC.card, gap: 6 },
  badgeLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10.5, textAlign: 'center' },
  idCard: { borderRadius: 18, padding: 22, alignItems: 'flex-start' },
  qrBox: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 14 },
});
