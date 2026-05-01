/**
 * Mentor Portal — Profile view: editable profile + Digital ID card with QR.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { QrCode, Linkedin, Globe, MapPin, Briefcase, GraduationCap, Star as StarIcon } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, StarRow, Badge } from '../atoms';
import { MENTOR } from '../data';

export function ProfileView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;

  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      {/* Left: profile editor */}
      <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Av initials={MENTOR.avatar} size={72} color={MC.teal} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.5 }}>{MENTOR.name}</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13 }}>{MENTOR.role} · {MENTOR.company}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <StarRow rating={5} size={13} />
                <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{MENTOR.rating} · {MENTOR.sessions} sessions</Text>
              </View>
            </View>
            <Pressable onPress={() => alert('Edit profile (mock)')} style={s.editBtn}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Edit Profile</Text></Pressable>
          </View>

          <View style={{ marginTop: 18, gap: 8 }}>
            <Row Icon={Briefcase} label="Role" value={`${MENTOR.role} at ${MENTOR.company}`} />
            <Row Icon={GraduationCap} label="Alma Mater" value={`${MENTOR.college} · Batch of ${MENTOR.batch}`} />
            <Row Icon={MapPin} label="Location" value="Mumbai, India" />
            <Row Icon={Linkedin} label="LinkedIn" value="linkedin.com/in/sureshrao" link="https://linkedin.com/in/sureshrao" />
            <Row Icon={Globe} label="Website" value="sureshrao.dev" link="https://sureshrao.dev" />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Expertise</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {MENTOR.expertise.map((e) => (
              <View key={e} style={s.tag}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>{e}</Text></View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Pricing</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <View style={[s.priceBox, { borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)' }]}>
              <Text style={{ color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.6 }}>1:1 SESSION</Text>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, marginTop: 4 }}>₹{MENTOR.price}</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>Per 30 min</Text>
            </View>
            <View style={s.priceBox}>
              <Text style={{ color: MC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.6 }}>EVENT (PAID)</Text>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, marginTop: 4 }}>₹499</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>Per seat</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Right: Digital ID Card */}
      <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
        <LinearGradient colors={['#0F3830', '#0A1A16'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.idCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={s.idDot} />
            <Text style={{ color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 }}>VERIFIED MENTOR</Text>
          </View>
          <Av initials={MENTOR.avatar} size={64} color={MC.teal} />
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 20, letterSpacing: -0.5, marginTop: 10 }}>{MENTOR.name}</Text>
          <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12, marginTop: 2 }}>{MENTOR.role} · {MENTOR.company}</Text>

          <View style={s.idStats}>
            <Stat label="Sessions" value={String(MENTOR.sessions)} />
            <View style={s.idDivider} />
            <Stat label="Rating" value={`${MENTOR.rating}★`} />
            <View style={s.idDivider} />
            <Stat label="Batch" value={String(MENTOR.batch)} />
          </View>

          <View style={s.qrBox}><QrCode size={88} color={MC.tealP} /></View>
          <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10, textAlign: 'center', marginTop: 8 }}>Scan to view profile · sa.alumni/m/SR-CTO-08</Text>
          <Pressable onPress={() => Linking.openURL('https://www.studentalumni.in')} style={s.shareBtn}><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Share Mentor Card</Text></Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}

function Row({ Icon, label, value, link }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={s.rowIcon}><Icon size={13} color={MC.tealP} /></View>
      <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11, width: 90 }}>{label}</Text>
      {link ? (
        <Pressable onPress={() => Linking.openURL(link)}>
          <Text style={{ color: MC.tealP, fontFamily: FONTS.med, fontSize: 13 }}>{value}</Text>
        </Pressable>
      ) : (
        <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13 }}>{value}</Text>
      )}
    </View>
  );
}

function Stat({ label, value }: any) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>{value}</Text>
      <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.6, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, marginBottom: 8 },
  editBtn: { paddingHorizontal: 14, height: 32, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)', alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(20,184,166,0.10)', alignItems: 'center', justifyContent: 'center' },
  tag: { backgroundColor: 'rgba(20,184,166,0.10)', borderColor: MC.border2, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  priceBox: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: MC.border, backgroundColor: MC.bg2 },

  idCard: { borderRadius: 18, padding: 22, borderWidth: 1, borderColor: MC.border2 },
  idDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: MC.tealP },
  idStats: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: MC.border },
  idDivider: { width: 1, height: 24, backgroundColor: MC.border },
  qrBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 14 },
  shareBtn: { backgroundColor: MC.tealP, paddingVertical: 11, alignItems: 'center', borderRadius: 10, marginTop: 12 },
});
