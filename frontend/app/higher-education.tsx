/**
 * /higher-education — SA Higher Education standalone page.
 * Matches SA Higher Education.html artifact: HE AI Advisor, Explore
 * Universities, Scholarships, Quick Stats.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { GraduationCap, Sparkles, Globe, Award, Search } from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const UNIS = [
  { name: 'Stanford University', country: 'USA', rank: '#3 Global', programs: 'MS CS, MBA, MEng', fees: '$62,000/yr' },
  { name: 'IIT Bombay', country: 'India', rank: '#172 Global', programs: 'MTech, MBA, MS', fees: '₹2.2L/yr' },
  { name: 'University of Toronto', country: 'Canada', rank: '#21 Global', programs: 'MSc, MEng, MBA', fees: 'CAD 58,000/yr' },
  { name: 'NUS Singapore', country: 'Singapore', rank: '#8 Global', programs: 'MSc, MBA', fees: 'SGD 45,000/yr' },
  { name: 'ETH Zurich', country: 'Switzerland', rank: '#7 Global', programs: 'MSc Various', fees: 'CHF 1,300/yr' },
  { name: 'TU Munich', country: 'Germany', rank: '#37 Global', programs: 'MSc Various', fees: 'Free (€150/sem)' },
];

const STATS = [
  { k: '850+', v: 'Universities' },
  { k: '120+', v: 'Scholarships' },
  { k: '45', v: 'Countries' },
  { k: '₹40L', v: 'Avg aid' },
];

export default function HigherEducationPage() {
  return (
    <FeaturePageShell
      title="Higher Education"
      subtitle="Find your university, scholarships, and counselling — powered by HE AI Advisor"
      heroEmoji="🎓"
      accent="#FCD34D"
      rightSlot={<View style={s.advisor}><Sparkles size={13} color="#FCD34D" /><Text style={s.advisorText}>HE AI Advisor</Text></View>}
    >
      <Text style={s.kicker}>QUICK STATS</Text>
      <View style={s.statsRow}>
        {STATS.map((x, i) => (
          <View key={i} style={s.stat}><Text style={s.statK}>{x.k}</Text><Text style={s.statV}>{x.v}</Text></View>
        ))}
      </View>

      <View style={s.searchRow}><Search size={15} color={C.text3} /><Text style={s.searchPlaceholder}>Search universities, programs, countries…</Text></View>

      {/* HE AI Advisor banner */}
      <View style={s.advisorBanner}>
        <View style={s.advisorIcon}><Sparkles size={22} color="#FCD34D" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.advTitle}>HE AI Advisor · Personalised guidance</Text>
          <Text style={s.advSub}>Answer 5 questions → get a shortlist of 10 universities + scholarship plan + SoP template.</Text>
        </View>
        <Pressable style={s.advBtn}><Text style={s.advBtnText}>Start Advisor →</Text></Pressable>
      </View>

      <Text style={s.kicker}>TOP UNIVERSITIES FOR YOU</Text>
      <View style={s.grid}>
        {UNIS.map((u, i) => (
          <View key={i} style={s.uni}>
            <View style={s.uniHead}>
              <View style={s.uniLogo}><GraduationCap size={18} color="#FCD34D" /></View>
              <View style={s.uniFlag}><Text style={s.uniFlagText}>{u.country}</Text></View>
            </View>
            <Text style={s.uniName}>{u.name}</Text>
            <Text style={s.uniRank}>{u.rank}</Text>
            <Text style={s.uniMeta}>Programs: {u.programs}</Text>
            <Text style={s.uniMeta}>Fees: {u.fees}</Text>
            <Pressable style={s.uniBtn}><Text style={s.uniBtnText}>Explore University →</Text></Pressable>
          </View>
        ))}
      </View>

      <View style={s.scholarshipCard}>
        <Award size={22} color="#34D399" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.schTitle}>22 scholarships available for you</Text>
          <Text style={s.schSub}>Based on your profile, merit score, and target programs.</Text>
        </View>
        <Pressable style={s.advBtn}><Text style={s.advBtnText}>View all →</Text></Pressable>
      </View>
    </FeaturePageShell>
  );
}

const s = StyleSheet.create({
  advisor: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.12)', borderColor: 'rgba(252,211,77,0.45)', borderWidth: 1 },
  advisorText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2 },
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 140, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 },
  statK: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 22 },
  statV: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1 },
  searchPlaceholder: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 13 },
  advisorBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 14, backgroundColor: 'rgba(252,211,77,0.06)', borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1 },
  advisorIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(252,211,77,0.15)', alignItems: 'center', justifyContent: 'center' },
  advTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  advSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5, marginTop: 4 },
  advBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 9, backgroundColor: '#7C3AED' },
  advBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  uni: { flex: 1, minWidth: 280, padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 6 },
  uniHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  uniLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(252,211,77,0.18)', alignItems: 'center', justifyContent: 'center' },
  uniFlag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: C.border, borderWidth: 1 },
  uniFlagText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 10.5 },
  uniName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15, marginTop: 2 },
  uniRank: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },
  uniMeta: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  uniBtn: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1 },
  uniBtnText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  scholarshipCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, backgroundColor: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.28)', borderWidth: 1 },
  schTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 15 },
  schSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 2 },
});
