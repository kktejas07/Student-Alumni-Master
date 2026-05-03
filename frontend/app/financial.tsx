/**
 * /financial — Scholarships, Startup Funding, Investors/VCs, Loans, Insurance.
 * Wired to /api/financial/* live backend.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import {
  Award, Rocket, TrendingUp, Landmark, Sparkles, Calculator, ArrowRight,
  BadgeCheck, Wallet, Target, Shield, ChevronDown,
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const TABS = [
  { id: 'scholarships', label: 'Scholarships', Icon: Award, color: '#F97316', api: '/financial/scholarships/search' },
  { id: 'loans', label: 'Education Loans', Icon: Landmark, color: '#3B82F6', api: '/financial/loans/search' },
  { id: 'startup', label: 'Startup Funding', Icon: Rocket, color: '#14B8A6', api: '/financial/startup-funding/search' },
  { id: 'investors', label: 'Investors & VCs', Icon: TrendingUp, color: '#6366F1', api: '/financial/venture-capital/search' },
  { id: 'insurance', label: 'Insurance', Icon: Shield, color: '#10B981', api: '/financial/insurance/search' },
];

const AI_LABELS: Record<string, string> = {
  scholarships: 'AI: Find Scholarships I Qualify For',
  loans: 'AI: Which loan is best for me?',
  startup: 'AI: Best funding for my idea',
  investors: 'AI: Right VC for my stage',
  insurance: 'AI: What coverage do I need',
};

type Item = {
  financial_id: string;
  name: string;
  provider: string;
  subcategory?: string;
  amount_min?: number;
  amount_max?: number;
  interest_rate?: number;
  tenure_months?: number;
  short_desc?: string;
  status?: string;
  match_score?: number;
  application_url?: string;
  application_deadline?: string;
  tint?: string;
  stage?: string;
  sector_focus?: string;
  eligibility_criteria?: string[];
};

function fmtINR(n?: number): string {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n >= 100000000 ? 0 : 1)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)} L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}
function rangeFmt(it: Item): string {
  if (!it.amount_max) return '—';
  if (it.amount_min && it.amount_min !== it.amount_max) return `${fmtINR(it.amount_min)}–${fmtINR(it.amount_max)}`;
  return `Up to ${fmtINR(it.amount_max)}`;
}

export default function FinancialPage() {
  const [tab, setTab] = useState('scholarships');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const tabInfo = TABS.find(t => t.id === tab)!;

  const load = useCallback(async (tabId: string) => {
    setLoading(true);
    try {
      const t = TABS.find(x => x.id === tabId)!;
      const r = await request<any>(`${t.api}?limit=20`);
      setItems(r.results || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  return (
    <FeaturePageShell
      title="Financial Services"
      subtitle="Scholarships, funding, investors, loans, insurance — matched to your profile."
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
            </Pressable>
          );
        })}
      </ScrollView>

      {/* AI Helper button */}
      <Pressable style={s.aiHelper}>
        <Sparkles size={14} color="#A78BFA" />
        <Text style={s.aiHelperText}>{AI_LABELS[tab]}</Text>
        <ChevronDown size={14} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {loading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)' }}>No items found.</Text>
        </View>
      ) : (
      <View style={s.grid}>
        {items.map((p) => {
          const tint = p.tint || tabInfo.color;
          const ms = p.match_score ?? 0;
          const amountStr = p.interest_rate && tab === 'loans'
            ? `${rangeFmt(p)} · ${p.interest_rate}% p.a.`
            : p.interest_rate && tab === 'insurance'
              ? `Cover ${rangeFmt(p)} · ₹${p.interest_rate}/yr`
              : rangeFmt(p);
          return (
            <View key={p.financial_id} style={[s.card, { borderColor: tint + '44' }]}>
              <View style={s.cardHead}>
                <View style={[s.iconBox, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
                  <tabInfo.Icon size={18} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={2}>{p.name}</Text>
                  <Text style={s.cardSub}>{p.provider}</Text>
                </View>
                {ms > 0 && (
                  <View style={s.matchBadge}>
                    <Sparkles size={10} color="#86EFAC" />
                    <Text style={s.matchText}>{ms}%</Text>
                  </View>
                )}
              </View>
              <View style={[s.amtBar, { backgroundColor: tint + '18', borderColor: tint + '55' }]}>
                <Text style={s.amtLabel}>{tab === 'loans' ? 'AMOUNT · RATE' : tab === 'insurance' ? 'COVERAGE · PREMIUM' : 'AMOUNT'}</Text>
                <Text style={[s.amtValue, { color: tint }]}>{amountStr}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {p.subcategory && (
                  <View style={s.metaPill}><Text style={s.metaPillText}>{p.subcategory.replace('_', ' ')}</Text></View>
                )}
                {p.stage && (
                  <View style={s.metaPill}><Text style={s.metaPillText}>{p.stage.replace('_', ' ')}</Text></View>
                )}
                {p.status && p.status !== 'open' && (
                  <View style={[s.metaPill, p.status === 'closing_soon' && { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' }, p.status === 'closed' && { backgroundColor: '#EF444422', borderColor: '#EF4444' }]}>
                    <Text style={[s.metaPillText, p.status === 'closing_soon' && { color: '#FCD34D' }, p.status === 'closed' && { color: '#FCA5A5' }]}>
                      {p.status === 'closing_soon' ? 'Closing soon' : 'Closed'}
                    </Text>
                  </View>
                )}
              </View>
              {p.short_desc ? (
                <Text style={[s.highlightText, { marginTop: 4 }]} numberOfLines={2}>{p.short_desc}</Text>
              ) : null}
              {p.eligibility_criteria && p.eligibility_criteria.length > 0 && (
                <View style={{ gap: 4 }}>
                  {p.eligibility_criteria.slice(0, 2).map((h, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <View style={[s.bullet, { backgroundColor: tint }]} />
                      <Text style={s.highlightText} numberOfLines={1}>{h}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                style={[s.applyBtn, { backgroundColor: tint }]}
                onPress={() => p.application_url && p.application_url !== '#' && (window as any).open(p.application_url, '_blank')}
              >
                <Text style={s.applyText}>
                  {tab === 'investors' ? 'Pitch / Connect' :
                   tab === 'loans' ? 'Check Eligibility' :
                   tab === 'insurance' ? 'Get Quote' :
                   tab === 'startup' ? 'Learn More' : 'Apply Now'}
                </Text>
                <ArrowRight size={12} color="#fff" />
              </Pressable>
            </View>
          );
        })}
      </View>
      )}

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

  // Match% badge + AI helper + meta pills
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.45)', borderWidth: 1 },
  matchText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  aiHelper: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.14)', borderColor: 'rgba(124,58,237,0.40)', borderWidth: 1, marginTop: 8, ...({ cursor: 'pointer' } as any) },
  aiHelperText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1 },
  metaPillText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_700Bold', fontSize: 10, textTransform: 'capitalize' as any },

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
