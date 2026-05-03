/**
 * /higher-education — Global education explorer.
 * Tabs: Courses · Universities · Countries · Scholarships · Research
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import {
  GraduationCap, Building2, Earth, Award, Microscope, Sparkles,
  MapPin, Clock, Flag, TrendingUp, ArrowRight, BadgeCheck, Target,
} from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const TABS = [
  { id: 'courses', label: 'Courses', Icon: GraduationCap, count: 8, color: '#3B82F6' },
  { id: 'unis', label: 'Universities', Icon: Building2, count: 8, color: '#6366F1' },
  { id: 'countries', label: 'Countries', Icon: Earth, count: 7, color: '#14B8A6' },
  { id: 'scholarships', label: 'Scholarships', Icon: Award, count: 8, color: '#F59E0B' },
  { id: 'research', label: 'Research', Icon: Microscope, count: 6, color: '#22C55E' },
];

const COURSES = [
  { id: 'c1', title: 'M.Tech in AI & Machine Learning', provider: 'IIT Bombay', fee: '₹2.5L/yr', duration: '2 yrs', intake: 'Jul 2026', seats: 40, match: 96, featured: true, emoji: '🧠' },
  { id: 'c2', title: 'MS Computer Science', provider: 'Carnegie Mellon University', fee: '$57K/yr', duration: '2 yrs', intake: 'Fall 2026', seats: 120, match: 88, emoji: '💻' },
  { id: 'c3', title: 'MBA (PGP)', provider: 'IIM Ahmedabad', fee: '₹23L total', duration: '2 yrs', intake: 'Jun 2026', seats: 395, match: 82, emoji: '📊' },
  { id: 'c4', title: 'MS Data Science', provider: 'NYU · Tandon', fee: '$52K/yr', duration: '1.5 yrs', intake: 'Spring 2027', seats: 80, match: 86, emoji: '📈' },
  { id: 'c5', title: 'MSc Robotics', provider: 'ETH Zurich', fee: 'CHF 1.5K/sem', duration: '2 yrs', intake: 'Sep 2026', seats: 35, match: 79, emoji: '🤖' },
  { id: 'c6', title: 'PG Diploma in Fintech', provider: 'ISB Hyderabad', fee: '₹8L total', duration: '1 yr', intake: 'Aug 2026', seats: 60, match: 74, emoji: '💹' },
  { id: 'c7', title: 'MSc Quantum Computing', provider: 'Univ. of Waterloo', fee: 'CAD 18K/yr', duration: '2 yrs', intake: 'Sep 2026', seats: 20, match: 71, emoji: '⚛️' },
  { id: 'c8', title: 'M.Des Interaction', provider: 'IDC IIT Bombay', fee: '₹3L/yr', duration: '2.5 yrs', intake: 'Jul 2026', seats: 25, match: 68, emoji: '🎨' },
];

const UNIS = [
  { id: 'u1', title: 'MIT', location: 'Cambridge, USA', flag: '🇺🇸', tuition: '$57K/yr', accept: '3.9%', known: 'AI, Robotics, Quantum', rights: 'OPT/STEM 3yrs', color: '#EF4444' },
  { id: 'u2', title: 'Stanford', location: 'California, USA', flag: '🇺🇸', tuition: '$62K/yr', accept: '3.7%', known: 'CS, Medicine, Business', rights: 'OPT/STEM 3yrs', color: '#DC2626' },
  { id: 'u3', title: 'Oxford', location: 'Oxford, UK', flag: '🇬🇧', tuition: '£30K/yr', accept: '17%', known: 'Humanities, Science', rights: 'Grad visa 2yrs', color: '#1D4ED8' },
  { id: 'u4', title: 'Cambridge', location: 'Cambridge, UK', flag: '🇬🇧', tuition: '£30K/yr', accept: '21%', known: 'Engineering, Physics', rights: 'Grad visa 2yrs', color: '#1E40AF' },
  { id: 'u5', title: 'ETH Zurich', location: 'Zurich, Switzerland', flag: '🇨🇭', tuition: 'CHF 1.5K/sem', accept: '27%', known: 'Engineering, CS', rights: 'EU work eligible', color: '#DC2626' },
  { id: 'u6', title: 'NUS', location: 'Singapore', flag: '🇸🇬', tuition: 'S$37K/yr', accept: '9%', known: 'Business, CS', rights: '1-yr EP', color: '#EA580C' },
  { id: 'u7', title: 'IIT Bombay', location: 'Mumbai, India', flag: '🇮🇳', tuition: '₹2.5L/yr', accept: '1%', known: 'Engineering, CS', rights: 'Direct work', color: '#5F259F' },
  { id: 'u8', title: 'IISc Bengaluru', location: 'Bengaluru, India', flag: '🇮🇳', tuition: '₹1.5L/yr', accept: '2%', known: 'Research, Sciences', rights: 'Direct work', color: '#6366F1' },
];

const COUNTRIES = [
  { id: 'co1', title: 'United States', flag: '🇺🇸', visa: 'F-1 Student', rights: 'OPT/STEM 3yrs', salary: '$120K avg', scholarship: 'Fulbright, TA/RA', popular: true, color: '#EF4444' },
  { id: 'co2', title: 'United Kingdom', flag: '🇬🇧', visa: 'Tier-4 Student', rights: 'Grad 2yrs', salary: '£45K avg', scholarship: 'Chevening, Rhodes', popular: true, color: '#1D4ED8' },
  { id: 'co3', title: 'Germany', flag: '🇩🇪', visa: 'National Visa D', rights: '18 mo job seek', salary: '€55K avg', scholarship: 'DAAD, ERASMUS', color: '#FCD34D' },
  { id: 'co4', title: 'Canada', flag: '🇨🇦', visa: 'Study permit', rights: 'PGWP 3yrs', salary: 'CAD 75K avg', scholarship: 'Vanier, Trudeau', color: '#DC2626' },
  { id: 'co5', title: 'Australia', flag: '🇦🇺', visa: 'Subclass 500', rights: 'PSW 2-4yrs', salary: 'AUD 85K avg', scholarship: 'AAS, Endeavour', color: '#22C55E' },
  { id: 'co6', title: 'Singapore', flag: '🇸🇬', visa: 'Student pass', rights: '1-yr EP', salary: 'S$72K avg', scholarship: 'SINGA, NTU', color: '#EA580C' },
  { id: 'co7', title: 'Netherlands', flag: '🇳🇱', visa: 'MVV', rights: '1-yr orientation', salary: '€48K avg', scholarship: 'HSP, Orange Tulip', color: '#F59E0B' },
];

const SCHOLARSHIPS = [
  { id: 's1', title: 'Fulbright-Nehru Masters', provider: 'US Govt', host: 'USA', deadline: 'Jun 2026', type: 'Merit', amount: 'Full + stipend', elig: '3yr work exp, any field', match: 78, color: '#EF4444' },
  { id: 's2', title: 'Chevening Scholarship', provider: 'UK Govt', host: 'UK', deadline: 'Nov 2026', type: 'Merit', amount: 'Full funding', elig: '2yr work exp, leadership', match: 82, color: '#1D4ED8' },
  { id: 's3', title: 'DAAD Masters', provider: 'German Govt', host: 'Germany', deadline: 'Oct 2026', type: 'Merit-Need', amount: '€861/mo stipend', elig: 'B.Tech 70%+', match: 74, color: '#FCD34D' },
  { id: 's4', title: 'Rhodes Scholarship', provider: 'Rhodes Trust', host: 'UK (Oxford)', deadline: 'Jul 2026', type: 'Merit', amount: 'Full + £18K living', elig: 'Age <=24, UG 75%+', match: 64, color: '#5F259F' },
  { id: 's5', title: 'Vanier CGS', provider: 'Canadian Govt', host: 'Canada', deadline: 'Nov 2026', type: 'Merit', amount: 'CAD $50K/yr', elig: 'PhD · Top 3%', match: 58, color: '#DC2626' },
  { id: 's6', title: 'Commonwealth Scholarship', provider: 'Commonwealth', host: 'UK / AUS / CA', deadline: 'Dec 2026', type: 'Need', amount: 'Full funding', elig: 'Developing nations', match: 69, color: '#22C55E' },
  { id: 's7', title: 'Inlaks Scholarship', provider: 'Inlaks Foundation', host: 'Global', deadline: 'Mar 2026', type: 'Merit', amount: 'Up to $100K', elig: 'Admitted to top 50 uni', match: 72, color: '#6366F1' },
  { id: 's8', title: 'Narotam Sekhsaria', provider: 'NS Foundation', host: 'Global', deadline: 'Feb 2026', type: 'Need-Merit', amount: '₹20L interest-free', elig: 'Indian · grad admit', match: 67, color: '#14B8A6' },
];

const RESEARCH = [
  { id: 'r1', title: 'IISc Summer Research Program', provider: 'IISc Bengaluru', duration: '2 mo', stipend: '₹15,000/mo', field: 'CS, EE, Physics, Biology', match: 94, color: '#22C55E' },
  { id: 'r2', title: 'SURGE IIT Kanpur', provider: 'IIT Kanpur', duration: '8 weeks', stipend: '₹10,000/mo', field: 'Engineering, Sciences', match: 88, color: '#3B82F6' },
  { id: 'r3', title: 'DAAD WISE', provider: 'DAAD Germany', duration: '2–3 mo', stipend: '€925/mo', field: 'STEM at German unis', match: 80, color: '#FCD34D' },
  { id: 'r4', title: 'MITACS Globalink', provider: 'MITACS Canada', duration: '12 weeks', stipend: 'CAD 6K', field: 'All STEM + HSS', match: 77, color: '#DC2626' },
  { id: 'r5', title: 'ETH Pauli Center', provider: 'ETH Zurich', duration: '10 weeks', stipend: 'CHF 3.2K', field: 'CS, Theoretical Physics', match: 69, color: '#6366F1' },
  { id: 'r6', title: 'Caltech SURF', provider: 'Caltech', duration: '10 weeks', stipend: '$7,000', field: 'Biology, Chemistry, Physics', match: 65, color: '#EF4444' },
];

export default function HigherEducationPage() {
  const [tab, setTab] = useState('courses');

  return (
    <FeaturePageShell
      title="Higher Education"
      subtitle="Explore opportunities, find scholarships, and plan your global education journey."
      heroEmoji="🎓"
      accent="#8B5CF6"
      rightSlot={<View style={s.aiPill}><Sparkles size={12} color="#C4B5FD" /><Text style={s.aiPillText}>HE AI Advisor</Text></View>}
    >
      <View style={s.statsRow}>
        <Stat label="COURSES" value="8" sub="Matched to your profile" color="#3B82F6" Icon={GraduationCap} />
        <Stat label="TOP UNIVERSITIES" value="8" sub="From around the globe" color="#6366F1" Icon={Building2} />
        <Stat label="DESTINATIONS" value="7" sub="Compare countries" color="#14B8A6" Icon={Earth} />
        <Stat label="SCHOLARSHIPS" value="8" sub="Funding opportunities" color="#F59E0B" Icon={Award} />
        <Stat label="RESEARCH" value="6" sub="Internships & Fellowships" color="#22C55E" Icon={Microscope} />
      </View>

      <AdvisorAIBlock
        context="higher-education"
        advisorTitle="Talk to a Student Advisor"
        advisorDesc="Need personalised education advice? Connect with our dedicated student advisors."
        aiTitle="Ask the Higher-Ed AI"
        aiDesc="Got questions about programmes, scholarships, or visas? Chat with our AI assistant 24×7."
        advisorAccent="#A78BFA"
        aiAccent="#10B981"
        advisorIcon="account-tie"
        aiIcon="robot-excited"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={[s.tab, active && { backgroundColor: t.color + '22', borderColor: t.color + '66' }]}>
              <t.Icon size={14} color={active ? t.color : 'rgba(255,255,255,0.65)'} />
              <Text style={[s.tabText, active && { color: t.color }]}>{t.label}</Text>
              <View style={s.tabCount}><Text style={s.tabCountText}>{t.count}</Text></View>
            </Pressable>
          );
        })}
      </ScrollView>

      {tab === 'courses' && (
        <View style={s.grid}>
          {COURSES.map((c) => (
            <View key={c.id} style={[s.card, { borderColor: '#3B82F644' }]}>
              <View style={s.cardHead}>
                <Text style={s.cardEmoji}>{c.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{c.title}</Text>
                  <Text style={s.cardSub}>{c.provider}</Text>
                </View>
                <View style={[s.matchPill, { backgroundColor: '#22C55E22', borderColor: '#22C55E55' }]}>
                  <Target size={10} color="#86EFAC" />
                  <Text style={s.matchText}>{c.match}% match</Text>
                </View>
              </View>
              <View style={s.kvGrid}>
                <KV label="Fee" value={c.fee} />
                <KV label="Duration" value={c.duration} />
                <KV label="Intake" value={c.intake} />
                <KV label="Seats" value={String(c.seats)} />
              </View>
              <Pressable style={[s.applyBtn, { backgroundColor: '#3B82F6' }]}>
                <Text style={s.applyText}>Apply Now</Text>
                <ArrowRight size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {tab === 'unis' && (
        <View style={s.grid}>
          {UNIS.map((u) => (
            <View key={u.id} style={[s.card, { borderColor: u.color + '44' }]}>
              <View style={s.cardHead}>
                <Text style={s.flagBig}>{u.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{u.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MapPin size={10} color={C.text3} />
                    <Text style={s.cardSub}>{u.location}</Text>
                  </View>
                </View>
              </View>
              <View style={s.kvGrid}>
                <KV label="Tuition" value={u.tuition} />
                <KV label="Accept" value={u.accept} />
                <KV label="Work" value={u.rights} />
                <KV label="Known for" value={u.known} />
              </View>
              <Pressable style={[s.applyBtn, { backgroundColor: u.color }]}>
                <Text style={s.applyText}>Explore University</Text>
                <ArrowRight size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {tab === 'countries' && (
        <View style={s.grid}>
          {COUNTRIES.map((co) => (
            <View key={co.id} style={[s.card, { borderColor: co.color + '44' }]}>
              <View style={s.cardHead}>
                <Text style={s.flagBig}>{co.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{co.title}</Text>
                  {co.popular && <View style={[s.popPill, { marginTop: 4 }]}><Text style={s.popText}>POPULAR</Text></View>}
                </View>
              </View>
              <View style={s.kvGrid}>
                <KV label="Visa" value={co.visa} />
                <KV label="Work rights" value={co.rights} />
                <KV label="Avg salary" value={co.salary} />
                <KV label="Scholarships" value={co.scholarship} />
              </View>
              <Pressable style={[s.applyBtn, { backgroundColor: co.color }]}>
                <Text style={s.applyText}>Explore Country</Text>
                <ArrowRight size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {tab === 'scholarships' && (
        <View style={s.grid}>
          {SCHOLARSHIPS.map((sc) => (
            <View key={sc.id} style={[s.card, { borderColor: sc.color + '44' }]}>
              <View style={s.cardHead}>
                <View style={[s.iconBox, { backgroundColor: sc.color + '22', borderColor: sc.color + '55' }]}>
                  <Award size={18} color={sc.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{sc.title}</Text>
                  <Text style={s.cardSub}>{sc.provider}</Text>
                </View>
                <View style={[s.matchPill, { backgroundColor: '#22C55E22', borderColor: '#22C55E55' }]}>
                  <Target size={10} color="#86EFAC" />
                  <Text style={s.matchText}>{sc.match}%</Text>
                </View>
              </View>
              <View style={s.kvGrid}>
                <KV label="Host" value={sc.host} />
                <KV label="Deadline" value={sc.deadline} />
                <KV label="Type" value={sc.type} />
                <KV label="Amount" value={sc.amount} />
              </View>
              <Text style={s.elig}><Flag size={10} color={C.text3} />  {sc.elig}</Text>
              <Pressable style={[s.applyBtn, { backgroundColor: sc.color }]}>
                <Text style={s.applyText}>Apply</Text>
                <ArrowRight size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {tab === 'research' && (
        <View style={s.grid}>
          {RESEARCH.map((r) => (
            <View key={r.id} style={[s.card, { borderColor: r.color + '44' }]}>
              <View style={s.cardHead}>
                <View style={[s.iconBox, { backgroundColor: r.color + '22', borderColor: r.color + '55' }]}>
                  <Microscope size={18} color={r.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{r.title}</Text>
                  <Text style={s.cardSub}>{r.provider}</Text>
                </View>
                <View style={[s.matchPill, { backgroundColor: '#22C55E22', borderColor: '#22C55E55' }]}>
                  <Target size={10} color="#86EFAC" />
                  <Text style={s.matchText}>{r.match}%</Text>
                </View>
              </View>
              <View style={s.kvGrid}>
                <KV label="Duration" value={r.duration} />
                <KV label="Stipend" value={r.stipend} />
                <KV label="Field" value={r.field} />
              </View>
              <Pressable style={[s.applyBtn, { backgroundColor: r.color }]}>
                <Text style={s.applyText}>Apply</Text>
                <ArrowRight size={12} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* AI Advisor CTA */}
      <View style={s.aiCard}>
        <View style={s.aiIcon}><Sparkles size={22} color="#C4B5FD" /></View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={s.aiTitle}>Personalised HE AI Advisor</Text>
          <Text style={s.aiSub}>Shortlist universities, match scholarships, review SOPs and plan your application timeline — all with AI.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {['University shortlisting', 'Scholarship matching', 'SOP review', 'Research guidance', 'Visa timeline'].map((x) => (
              <View key={x} style={s.aiChip}><Text style={s.aiChipText}>{x}</Text></View>
            ))}
          </View>
        </View>
        <Pressable style={s.aiBtn}><Text style={s.aiBtnText}>Start Chat</Text></Pressable>
      </View>
    </FeaturePageShell>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: '45%', gap: 2 }}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Stat({ label, value, sub, color, Icon }: any) {
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.statIcon, { backgroundColor: color + '22', borderColor: color + '55' }]}><Icon size={14} color={color} /></View>
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.45)', borderWidth: 1 },
  aiPillText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 160, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 6 },
  statIcon: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1, flex: 1 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, marginTop: 2 },
  statSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  tabCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  tabCountText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flexGrow: 1, flexBasis: 320, maxWidth: 400, padding: 16, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)', gap: 12 },

  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardEmoji: { fontSize: 24 },
  flagBig: { fontSize: 28 },
  iconBox: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14.5 },
  cardSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },

  matchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  matchText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5 },

  popPill: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1 },
  popText: { color: '#FCA5A5', fontFamily: 'DMSans_800ExtraBold', fontSize: 9, letterSpacing: 0.4 },

  kvGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6, borderTopColor: 'rgba(255,255,255,0.06)', borderTopWidth: 1 },
  kvLabel: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  kvValue: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  elig: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 2 },

  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9, ...({ cursor: 'pointer' } as any) },
  applyText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12, letterSpacing: 0.3 },

  aiCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 18, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.30)', borderWidth: 1, flexWrap: 'wrap' },
  aiIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.20)', borderColor: 'rgba(139,92,246,0.45)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  aiSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  aiChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.32)', borderWidth: 1 },
  aiChipText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },
  aiBtn: { paddingHorizontal: 18, height: 38, borderRadius: 999, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  aiBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
});
