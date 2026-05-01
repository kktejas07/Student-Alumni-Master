/**
 * /financial — Scholarships, Startup Funding, Investors, Loans + tools.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import {
  Award, Rocket, TrendingUp, Landmark, Sparkles, Calculator, ArrowRight,
  BadgeCheck, Wallet, Target,
} from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const TABS = [
  { id: 'scholarships', label: 'Scholarships', Icon: Award, count: 6, color: '#F97316' },
  { id: 'startup', label: 'Startup Funding', Icon: Rocket, count: 6, color: '#14B8A6' },
  { id: 'investors', label: 'Investors & VCs', Icon: TrendingUp, count: 6, color: '#6366F1' },
  { id: 'loans', label: 'Loans', Icon: Landmark, count: 6, color: '#3B82F6' },
];

const SCHOLARSHIPS = [
  { id: 'sch1', title: 'Google Generation Scholarship', provider: 'Google India', amount: '₹1,00,000 (one-time)', highlights: ['CSE/IT/EE student', 'Women preferred'], color: '#6366F1' },
  { id: 'sch2', title: 'Tata Scholarship', provider: 'Tata Education Trust', amount: '₹50,000/yr', highlights: ['CGPA 8.0+', 'Annual income <₹8L'], color: '#3B82F6' },
  { id: 'sch3', title: 'Reliance Foundation UG', provider: 'Reliance Foundation', amount: 'Up to ₹2L/yr', highlights: ['Merit-cum-need', '5,000 scholars'], color: '#EF4444' },
  { id: 'sch4', title: 'Aditya Birla Scholarship', provider: 'ABG', amount: '₹1.75L/yr', highlights: ['IIT/NIT/IIM only', 'Top 20% of class'], color: '#8B5CF6' },
  { id: 'sch5', title: 'KC Mahindra Scholarship', provider: 'KC Mahindra Trust', amount: '₹8.5L total', highlights: ['For PG abroad', 'Merit-based'], color: '#F59E0B' },
  { id: 'sch6', title: 'OP Jindal Scholarship', provider: 'OPJEMS', amount: '₹2L/yr', highlights: ['Engineering, Law, MBA', 'B.Tech 2nd yr+'], color: '#22C55E' },
];

const STARTUPS = [
  { id: 'st1', title: 'Nasscom Deep Tech Club', provider: 'Nasscom', amount: '₹10–25 Lakhs', highlights: ['AI / ML / IoT', 'MVP stage'], color: '#3B82F6' },
  { id: 'st2', title: 'iCreate Incubator Funding', provider: 'iCreate Ahmedabad', amount: '₹25L + infra', highlights: ['Tech startup', 'Any domain'], color: '#5F259F' },
  { id: 'st3', title: 'T-Hub Lab32', provider: 'T-Hub Hyderabad', amount: '₹5–15 Lakhs', highlights: ['Early-stage', '6-month cohort'], color: '#14B8A6' },
  { id: 'st4', title: 'Startup India Seed Fund', provider: 'DPIIT', amount: 'Up to ₹50 Lakhs', highlights: ['DPIIT registered', 'PoC to market'], color: '#F97316' },
  { id: 'st5', title: 'Atal Innovation Mission', provider: 'NITI Aayog', amount: '₹10L grants', highlights: ['Tinkering labs', 'School/UG'], color: '#6366F1' },
  { id: 'st6', title: 'CIIE.CO Bridge Fund', provider: 'IIM-A CIIE', amount: '₹10–20 Lakhs', highlights: ['Cleantech, fintech, edtech', 'Pre-seed'], color: '#22C55E' },
];

const INVESTORS = [
  { id: 'in1', title: 'SA Alumni Angels', provider: 'Alumni Network', amount: '₹10L–₹2Cr', highlights: ['Pre-seed stage', 'Alumni-led startups'], color: '#5F259F' },
  { id: 'in2', title: 'Sequoia Surge', provider: 'Peak XV Partners', amount: '$1M–$2M', highlights: ['SaaS, Fintech, Consumer', 'Pre-seed to Seed'], color: '#3B82F6' },
  { id: 'in3', title: 'Blume Ventures Fellowship', provider: 'Blume Ventures', amount: '$150K–$500K', highlights: ['Idea to seed', 'Tech-first founders'], color: '#EC4899' },
  { id: 'in4', title: 'Accel Atoms', provider: 'Accel Partners', amount: '$250K', highlights: ['India-born seed', '3-month programme'], color: '#EF4444' },
  { id: 'in5', title: 'Y Combinator', provider: 'YC', amount: '$500K (SAFE)', highlights: ['Global · Any stage', '3-month Bay Area'], color: '#F97316' },
  { id: 'in6', title: 'Better Capital', provider: 'Better Capital', amount: '$100K–$1M', highlights: ['Solo checks · Fast', 'India + SEA focus'], color: '#22C55E' },
];

const LOANS = [
  { id: 'l1', title: 'SBI Scholar Loan', provider: 'State Bank of India', amount: 'Up to ₹40 Lakhs', highlights: ['8.15% p.a.', '15 yrs tenure', 'No margin money'], color: '#3B82F6' },
  { id: 'l2', title: 'KreditBee Student Credit', provider: 'KreditBee', amount: '₹1K–₹2L', highlights: ['18–24% p.a.', 'Instant disbursal', 'No CIBIL'], color: '#EC4899' },
  { id: 'l3', title: 'HDFC Credila Abroad', provider: 'HDFC Credila', amount: 'Up to ₹1 Cr', highlights: ['10.25% p.a.', 'For MS/MBA', 'No collateral <₹40L'], color: '#EF4444' },
  { id: 'l4', title: 'Axis Bank Education Loan', provider: 'Axis Bank', amount: 'Up to ₹75L', highlights: ['Women 0.5% off', '15 yrs tenure', 'Moratorium + 6mo'], color: '#F97316' },
  { id: 'l5', title: 'Avanse Abroad Loan', provider: 'Avanse Financial', amount: 'Up to ₹1 Cr', highlights: ['11% p.a.', 'Pre-visa disbursal', '500+ courses'], color: '#6366F1' },
  { id: 'l6', title: 'Prodigy Finance (US)', provider: 'Prodigy Finance', amount: 'Up to $120K', highlights: ['No collateral', 'For top 250 unis', 'No Indian co-signer'], color: '#22C55E' },
];

export default function FinancialPage() {
  const [tab, setTab] = useState('scholarships');
  const list = tab === 'scholarships' ? SCHOLARSHIPS : tab === 'startup' ? STARTUPS : tab === 'investors' ? INVESTORS : LOANS;
  const tabInfo = TABS.find(t => t.id === tab)!;

  return (
    <FeaturePageShell
      title="Financial Services"
      subtitle="Scholarships, funding, investors and student loans — matched to your profile."
      heroEmoji="💰"
      accent="#5F259F"
      rightSlot={<View style={s.savPill}><Wallet size={12} color="#86EFAC" /><Text style={s.savPillText}>SA Savings Advisor</Text></View>}
    >
      <View style={s.statsRow}>
        <Stat label="HIGH MATCH SCHOLARSHIPS" value="3+" sub="Matched to you" color="#F97316" Icon={Award} />
        <Stat label="FREE GRANTS" value="4+" sub="Zero repayment" color="#14B8A6" Icon={Sparkles} />
        <Stat label="ALUMNI INVESTORS" value="2+" sub="Active pitch pipeline" color="#6366F1" Icon={TrendingUp} />
        <Stat label="TAX BENEFIT" value="Available" sub="Under Sec 80C / 80E" color="#22C55E" Icon={BadgeCheck} />
      </View>

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

      <View style={s.grid}>
        {list.map((p) => (
          <View key={p.id} style={[s.card, { borderColor: p.color + '44' }]}>
            <View style={s.cardHead}>
              <View style={[s.iconBox, { backgroundColor: p.color + '22', borderColor: p.color + '55' }]}>
                <tabInfo.Icon size={18} color={p.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.title}</Text>
                <Text style={s.cardSub}>{p.provider}</Text>
              </View>
            </View>
            <View style={[s.amtBar, { backgroundColor: p.color + '18', borderColor: p.color + '55' }]}>
              <Text style={s.amtLabel}>AMOUNT / RATE</Text>
              <Text style={[s.amtValue, { color: p.color }]}>{p.amount}</Text>
            </View>
            <View style={{ gap: 5 }}>
              {p.highlights.map((h, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={[s.bullet, { backgroundColor: p.color }]} />
                  <Text style={s.highlightText}>{h}</Text>
                </View>
              ))}
            </View>
            <Pressable style={[s.applyBtn, { backgroundColor: p.color }]}>
              <Text style={s.applyText}>{tab === 'investors' ? 'Pitch / Connect' : tab === 'loans' ? 'Apply for Loan' : 'Apply Now'}</Text>
              <ArrowRight size={12} color="#fff" />
            </Pressable>
          </View>
        ))}
      </View>

      {/* EMI Calculator Widget */}
      <View style={s.widgetCard}>
        <View style={{ flex: 1, gap: 8, minWidth: 240 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.widgetIcon}><Calculator size={20} color="#93C5FD" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.widgetTitle}>AI EMI Calculator</Text>
              <Text style={s.widgetSub}>Plan your monthly repayment and total interest instantly.</Text>
            </View>
          </View>
          <View style={{ gap: 6, marginTop: 4 }}>
            <Slider label="Loan Amount" value="₹10,00,000" color="#3B82F6" />
            <Slider label="Interest Rate" value="9.25% p.a." color="#14B8A6" />
            <Slider label="Tenure" value="10 years" color="#8B5CF6" />
          </View>
          <View style={s.emiResult}>
            <View>
              <Text style={s.emiLabel}>MONTHLY EMI</Text>
              <Text style={s.emiValue}>₹12,858</Text>
            </View>
            <View>
              <Text style={s.emiLabel}>TOTAL INTEREST</Text>
              <Text style={[s.emiValue, { color: '#F59E0B' }]}>₹5,42,960</Text>
            </View>
            <Pressable style={s.optimizeBtn}>
              <Sparkles size={12} color="#fff" />
              <Text style={s.optimizeText}>AI Loan Optimiser</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Advisor + AI Chat CTAs */}
      <View style={s.ctaRow}>
        <View style={[s.ctaCard, { backgroundColor: 'rgba(95,37,159,0.12)', borderColor: 'rgba(95,37,159,0.35)' }]}>
          <Target size={22} color="#C4B5FD" />
          <Text style={s.ctaTitle}>Talk to a Student Advisor</Text>
          <Text style={s.ctaSub}>Need personalised financial advice? Connect with our dedicated student advisors.</Text>
          <Pressable style={[s.ctaBtn, { backgroundColor: '#8B5CF6' }]}><Text style={s.ctaBtnText}>Connect with Advisor</Text></Pressable>
        </View>
        <View style={[s.ctaCard, { backgroundColor: 'rgba(20,184,166,0.10)', borderColor: 'rgba(20,184,166,0.35)' }]}>
          <Sparkles size={22} color="#5EEAD4" />
          <Text style={s.ctaTitle}>Ask the Financial AI</Text>
          <Text style={s.ctaSub}>Got a question about financial products? Chat with our AI assistant 24x7.</Text>
          <Pressable style={[s.ctaBtn, { backgroundColor: '#14B8A6' }]}><Text style={s.ctaBtnText}>Chat with AI</Text></Pressable>
        </View>
      </View>
    </FeaturePageShell>
  );
}

function Slider({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.sliderLabel}>{label}</Text>
        <Text style={[s.sliderValue, { color }]}>{value}</Text>
      </View>
      <View style={s.sliderTrack}>
        <View style={[s.sliderFill, { backgroundColor: color, width: '62%' }]} />
        <View style={[s.sliderKnob, { backgroundColor: color, left: '60%' }]} />
      </View>
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
  savPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.40)', borderWidth: 1 },
  savPillText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 180, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 6 },
  statIcon: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1, flex: 1 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, marginTop: 2 },
  statSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  tabCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  tabCountText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flexGrow: 1, flexBasis: 300, maxWidth: 380, padding: 16, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)', gap: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 14.5 },
  cardSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },

  amtBar: { padding: 12, borderRadius: 10, borderWidth: 1 },
  amtLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1 },
  amtValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, marginTop: 3 },

  bullet: { width: 6, height: 6, borderRadius: 3 },
  highlightText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9, ...({ cursor: 'pointer' } as any) },
  applyText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12, letterSpacing: 0.3 },

  widgetCard: { padding: 18, borderRadius: 16, backgroundColor: 'rgba(59,130,246,0.07)', borderColor: 'rgba(59,130,246,0.30)', borderWidth: 1, flexDirection: 'row', gap: 18, flexWrap: 'wrap' },
  widgetIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(59,130,246,0.40)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  widgetTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  widgetSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  sliderLabel: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },
  sliderValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', position: 'relative' },
  sliderFill: { height: '100%', borderRadius: 3 },
  sliderKnob: { position: 'absolute', top: -3, width: 12, height: 12, borderRadius: 6 },

  emiResult: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 8, paddingTop: 10, borderTopColor: 'rgba(255,255,255,0.07)', borderTopWidth: 1 },
  emiLabel: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5, letterSpacing: 1 },
  emiValue: { color: '#93C5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 18, marginTop: 2 },
  optimizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: '#3B82F6', ...({ cursor: 'pointer' } as any) },
  optimizeText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },

  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  ctaCard: { flex: 1, flexBasis: 260, padding: 18, borderRadius: 14, borderWidth: 1, gap: 8 },
  ctaTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 15, marginTop: 4 },
  ctaSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  ctaBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4, ...({ cursor: 'pointer' } as any) },
  ctaBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },
});
