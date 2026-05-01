/**
 * /financial — SA Financial Services standalone page.
 * Matches SA Financial Services.html artifact: loans, scholarships,
 * EMI calculator, AI Loan Optimiser.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import { Wallet, Sparkles, TrendingDown, Calculator, GraduationCap } from 'lucide-react-native';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const PRODUCTS = [
  { name: 'Education Loan', rate: '8.5% p.a.', tenure: 'up to 15 yrs', partner: 'HDFC Credila', tag: 'Popular' },
  { name: 'Laptop Loan', rate: '11.0% p.a.', tenure: '6 – 24 mo', partner: 'Bajaj Finserv', tag: 'Quick' },
  { name: 'Skill Loan', rate: '9.5% p.a.', tenure: '1 – 3 yrs', partner: 'Axis Bank', tag: 'SA · No-cosigner' },
];

const SCHOLARSHIPS = [
  { title: 'Buddy4Study Merit Scholarship', amount: '₹60,000', deadline: '15 Aug 2026' },
  { title: 'SA Future Leaders Grant', amount: '₹1,00,000', deadline: '30 Sept 2026' },
  { title: 'Dr. Reddy\'s Foundation Women in STEM', amount: '₹2,00,000', deadline: '1 Oct 2026' },
];

export default function FinancialPage() {
  const [amount, setAmount] = useState('500000');
  const [tenure, setTenure] = useState('60');
  const rateNum = 9.5;
  const amt = Number(amount) || 0;
  const ten = Number(tenure) || 1;
  const r = rateNum / 100 / 12;
  const emi = ten > 0 && amt > 0 ? (amt * r * Math.pow(1 + r, ten)) / (Math.pow(1 + r, ten) - 1) : 0;
  const total = emi * ten;
  const interest = Math.max(0, total - amt);

  return (
    <FeaturePageShell
      title="Financial Services"
      subtitle="Loans, scholarships, insurance & AI optimiser — all in one place"
      heroEmoji="💰"
      accent="#FCD34D"
      rightSlot={<View style={s.aiPill}><Sparkles size={13} color="#FCD34D" /><Text style={s.aiPillText}>AI-Powered</Text></View>}
    >
      {/* EMI Calculator + AI Optimiser */}
      <View style={s.twoCol}>
        <View style={s.bigCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Calculator size={16} color="#FCD34D" /><Text style={s.cardTitle}>EMI Calculator</Text></View>
          <Text style={s.cardSub}>Adjust loan amount & tenure to see monthly EMI instantly</Text>
          <Text style={s.label}>Loan Amount (₹)</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={s.input} placeholderTextColor={C.text3} />
          <Text style={s.label}>Loan Tenure (months)</Text>
          <TextInput value={tenure} onChangeText={setTenure} keyboardType="numeric" style={s.input} placeholderTextColor={C.text3} />
          <View style={s.emiBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.emiLabel}>MONTHLY EMI</Text>
              <Text style={s.emiValue}>₹{emi.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.emiLabel}>TOTAL INTEREST</Text>
              <Text style={[s.emiValue, { color: '#FB923C' }]}>₹{interest.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>
            </View>
          </View>
        </View>

        <View style={s.bigCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Sparkles size={16} color="#A78BFA" /><Text style={s.cardTitle}>AI Loan Optimiser</Text></View>
          <Text style={s.cardSub}>Our AI compares 40+ partners and picks the best rate for you</Text>
          {[
            { label: 'Likely approved at', v: '8.2% – 9.8%' },
            { label: 'Est. monthly EMI', v: `₹${emi ? emi.toFixed(0) : '—'}` },
            { label: 'Best partner', v: 'HDFC Credila' },
            { label: 'Processing time', v: '< 48 hrs' },
          ].map((x, i) => (
            <View key={i} style={s.aiRow}>
              <Text style={s.aiLabel}>{x.label}</Text>
              <Text style={s.aiValue}>{x.v}</Text>
            </View>
          ))}
          <Pressable style={s.cta}><TrendingDown size={14} color="#fff" /><Text style={s.ctaText}>Find Best Loan</Text></Pressable>
        </View>
      </View>

      {/* Loan Products */}
      <Text style={s.kicker}>LOAN PRODUCTS</Text>
      <View style={s.grid3}>
        {PRODUCTS.map((p, i) => (
          <View key={i} style={s.prod}>
            <View style={s.prodHead}>
              <Wallet size={16} color="#FCD34D" />
              <View style={s.prodTag}><Text style={s.prodTagText}>{p.tag}</Text></View>
            </View>
            <Text style={s.prodName}>{p.name}</Text>
            <Text style={s.prodRate}>{p.rate}</Text>
            <Text style={s.prodMeta}>Tenure: {p.tenure}</Text>
            <Text style={s.prodMeta}>Partner: {p.partner}</Text>
            <Pressable style={s.prodBtn}><Text style={s.prodBtnText}>Apply →</Text></Pressable>
          </View>
        ))}
      </View>

      {/* Scholarships */}
      <Text style={s.kicker}>SCHOLARSHIPS AVAILABLE FOR YOU</Text>
      {SCHOLARSHIPS.map((sch, i) => (
        <View key={i} style={s.schol}>
          <View style={s.scholIcon}><GraduationCap size={16} color="#34D399" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.scholTitle}>{sch.title}</Text>
            <Text style={s.scholMeta}>Deadline: {sch.deadline}</Text>
          </View>
          <Text style={s.scholAmt}>{sch.amount}</Text>
          <Pressable style={s.prodBtn}><Text style={s.prodBtnText}>Apply</Text></Pressable>
        </View>
      ))}
    </FeaturePageShell>
  );
}

const s = StyleSheet.create({
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(252,211,77,0.12)', borderColor: 'rgba(252,211,77,0.45)', borderWidth: 1 },
  aiPillText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  bigCard: { flex: 1, minWidth: 320, padding: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 8 },
  cardTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  cardSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  label: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 1, marginTop: 6 },
  input: { paddingHorizontal: 12, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border, borderWidth: 1, color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  emiBox: { flexDirection: 'row', gap: 16, padding: 14, borderRadius: 10, backgroundColor: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.30)', borderWidth: 1, marginTop: 8 },
  emiLabel: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1 },
  emiValue: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 22, marginTop: 2 },
  aiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 1 },
  aiLabel: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  aiValue: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },
  cta: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 40, borderRadius: 10, backgroundColor: '#7C3AED' },
  ctaText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 11, letterSpacing: 1.2, marginTop: 6 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  prod: { flex: 1, minWidth: 240, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, gap: 6 },
  prodHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prodTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(167,139,250,0.15)', borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1 },
  prodTagText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold', fontSize: 9.5 },
  prodName: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  prodRate: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  prodMeta: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  prodBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#7C3AED', marginTop: 4 },
  prodBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  schol: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.05)', borderColor: 'rgba(52,211,153,0.25)', borderWidth: 1 },
  scholIcon: { width: 38, height: 38, borderRadius: 9, backgroundColor: 'rgba(52,211,153,0.18)', alignItems: 'center', justifyContent: 'center' },
  scholTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 13.5 },
  scholMeta: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },
  scholAmt: { color: '#34D399', fontFamily: 'DMSans_800ExtraBold', fontSize: 15 },
});
