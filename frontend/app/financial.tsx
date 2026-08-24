/**
 * /financial — Scholarships, Startup Funding, Investors/VCs, Loans, Insurance.
 * Wired to /api/financial/* live backend.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FAB } from '@/src/views/web/md3';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import FinancialCoach from '@/src/views/web/FinancialCoach';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const Icon = (props: { name: IconName; size?: number; color?: string;
                       style?: any }) =>
  <MaterialCommunityIcons name={props.name} size={props.size}
    color={props.color} style={props.style} />;

const C = { text: '#fff', text2: 'rgba(255,255,255,0.70)', text3: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.09)' };

const TABS = [
  { id: 'scholarships', label: 'Funding',       icon: 'trophy-award' as IconName,    color: '#F97316', api: '/financial/scholarships/search' },
  { id: 'loans',        label: 'Education Loans', icon: 'bank-outline' as IconName,    color: '#3B82F6', api: '/financial/loans/search' },
  { id: 'startup',      label: 'Startup Funding', icon: 'rocket-launch' as IconName,   color: '#14B8A6', api: '/financial/startup-funding/search' },
  { id: 'investors',    label: 'Investors & VCs', icon: 'trending-up' as IconName,     color: '#6366F1', api: '/financial/venture-capital/search' },
  { id: 'insurance',    label: 'Insurance',       icon: 'shield-outline' as IconName,  color: '#10B981', api: '/financial/insurance/search' },
];

const AI_LABELS: Record<string, string> = {
  scholarships: 'AI: Find Funding I Qualify For',
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

function EmiSlider({ label, value, setValue, min, max, step, fmt, prefix = '', suffix = '' }: any) {
  const [typedValue, setTypedValue] = useState(String(value));

  useEffect(() => {
    setTypedValue(String(value));
  }, [value]);

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setTypedValue(cleaned);
    
    const num = Number(cleaned);
    if (!isNaN(num) && num >= 0) {
      if (num >= min && num <= max) {
        setValue(num);
      }
    }
  };

  const handleBlur = () => {
    let num = Number(typedValue);
    if (isNaN(num) || num < min) {
      num = min;
    } else if (num > max) {
      num = max;
    }
    setValue(num);
    setTypedValue(String(num));
  };

  if (Platform.OS === 'web') {
    return (
      <View className="flex-1 min-w-60 gap-1">
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-muted text-xs font-body-semibold uppercase tracking-wider">{label}</Text>
          <Text className="text-text font-body-bold text-sm">{fmt(value)}</Text>
        </View>
        <View className="flex-1">
          {React.createElement('input' as any, {
            type: 'range', min, max, step, value,
            onChange: (e: any) => setValue(Number(e.target.value)),
            style: { width: '100%', accentColor: '#7C3AED', cursor: 'pointer' },
          })}
        </View>
        <View className="flex-row items-center bg-glass rounded-md border border-glass-border px-2 h-7 mt-1.5">
          {prefix ? <Text className="text-muted text-xs mr-0.5">{prefix}</Text> : null}
          <TextInput
            value={typedValue}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType="numeric"
            placeholder={`Enter ${label.toLowerCase()}...`}
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="text-text text-xs flex-1 bg-transparent"
            style={{ paddingVertical: 0, paddingHorizontal: 0, height: '100%', outlineStyle: 'none', borderWidth: 0 } as any}
          />
          {suffix ? <Text className="text-muted text-xs ml-0.5">{suffix}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 min-w-60 gap-1">
      <Text className="text-muted text-xs font-body-semibold uppercase tracking-wider">{label} {fmt(value)}</Text>
      <TextInput
        value={typedValue}
        onChangeText={handleTextChange}
        onBlur={handleBlur}
        keyboardType="numeric"
        className="text-text text-sm border border-glass-border rounded-lg p-2 mt-1"
        style={{ color: '#fff' }}
      />
    </View>
  );
}

export default function FinancialPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') {
        router.replace('/alumni-portal?tab=financial' as any);
      } else if (user.role === 'student') {
        router.replace('/student-portal?tab=financial' as any);
      }
    }
  }, [isEmbedded, initialized, user, router]);

  const [tab, setTab] = useState('scholarships');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
  const [aiSubmitting, setAiSubmitting] = useState(false);
  const [aiTop3, setAiTop3] = useState<any[]>([]);
  const [emiAmt, setEmiAmt] = useState(1500000);
  const [emiRate, setEmiRate] = useState(8.5);
  const [emiTen, setEmiTen] = useState(120);
  const [emi, setEmi] = useState<any>(null);
  const [advisorChatOpen, setAdvisorChatOpen] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);

  useEffect(() => {
    if (!initialized || !user) return;
    let active = true;
    async function fetchProfile() {
      try {
        const p = await request<any>('/financial/me/profile');
        if (!active) return;
        if (p) {
          const loadedAnswers: Record<string, string> = {};
          const keys = [
            'cgpa', 'annual_family_income', 'course_level', 'institution_tier',
            'loan_need', 'loan_repayment_capacity', 'has_collateral', 'cibil_range',
            'startup_stage', 'startup_sector', 'funding_need', 'has_cofounder',
            'age', 'coverage_type', 'insurance_budget'
          ];
          for (const key of keys) {
            if (p[key] !== undefined && p[key] !== null) {
              loadedAnswers[key] = String(p[key]);
            }
          }
          setAiAnswers((prev) => {
            const merged = { ...prev };
            for (const key of Object.keys(loadedAnswers)) {
              if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
                merged[key] = loadedAnswers[key];
              }
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn('Failed to load financial profile:', err);
      }
    }
    fetchProfile();
    return () => { active = false; };
  }, [initialized, user]);

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

  useEffect(() => { load(tab); setAiOpen(false); setAiTop3([]); }, [tab, load]);

  useEffect(() => {
    if (tab !== 'loans') return;
    const t = setTimeout(async () => {
      try {
        const r = await request<any>('/financial/emi-calculate', {
          method: 'POST', body: { loan_amount: emiAmt, interest_rate: emiRate, tenure_months: emiTen },
        });
        setEmi(r);
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [tab, emiAmt, emiRate, emiTen]);

  const aiQuestions: Record<string, Array<{ key: string; label: string; type: string; placeholder?: string }>> = {
    scholarships: [
      { key: 'cgpa', label: 'CGPA', type: 'number', placeholder: '8.5' },
      { key: 'annual_family_income', label: 'Annual family income (₹)', type: 'number', placeholder: '600000' },
      { key: 'course_level', label: 'Course level', type: 'text', placeholder: 'undergraduate' },
      { key: 'institution_tier', label: 'Institution tier', type: 'text', placeholder: 'top_tier / tier_one' },
    ],
    loans: [
      { key: 'loan_need', label: 'Loan amount needed (₹)', type: 'number', placeholder: '1500000' },
      { key: 'loan_repayment_capacity', label: 'Monthly repayment capacity (₹)', type: 'number', placeholder: '20000' },
      { key: 'has_collateral', label: 'Have collateral? (yes/no)', type: 'text', placeholder: 'no' },
      { key: 'cibil_range', label: 'CIBIL score range', type: 'text', placeholder: '750-800' },
    ],
    startup: [
      { key: 'startup_stage', label: 'Startup stage', type: 'text', placeholder: 'pre_seed / seed / series_a' },
      { key: 'startup_sector', label: 'Sector', type: 'text', placeholder: 'fintech / saas / consumer' },
      { key: 'funding_need', label: 'Funding needed (₹)', type: 'number', placeholder: '5000000' },
      { key: 'has_cofounder', label: 'Have a co-founder?', type: 'text', placeholder: 'yes / no' },
    ],
    investors: [
      { key: 'startup_stage', label: 'Stage you\'re raising at', type: 'text', placeholder: 'seed / series_a' },
      { key: 'startup_sector', label: 'Sector focus', type: 'text', placeholder: 'fintech / saas / consumer' },
      { key: 'funding_need', label: 'Round size (₹)', type: 'number', placeholder: '50000000' },
      { key: 'has_cofounder', label: 'Have a co-founder?', type: 'text', placeholder: 'yes / no' },
    ],
    insurance: [
      { key: 'age', label: 'Your age', type: 'number', placeholder: '24' },
      { key: 'coverage_type', label: 'Coverage type', type: 'text', placeholder: 'health / accident / travel / property' },
      { key: 'insurance_budget', label: 'Annual budget (₹)', type: 'number', placeholder: '5000' },
    ],
  };

  const submitAi = async () => {
    const aiPath: Record<string, string> = {
      scholarships: '/financial/ai/scholarships',
      loans: '/financial/ai/loans',
      startup: '/financial/ai/startup-funding',
      investors: '/financial/ai/venture-capital',
      insurance: '/financial/ai/insurance',
    };
    setAiSubmitting(true);
    try {
      const payload: any = {};
      for (const q of (aiQuestions[tab] || [])) {
        const v = aiAnswers[q.key];
        if (v === undefined || v === '') continue;
        payload[q.key] = q.type === 'number' ? Number(v) : v;
      }
      const r = await request<any>(aiPath[tab], { method: 'POST', body: payload });
      setItems(r.ranked || []);
      setAiTop3(r.top_3 || []);
    } catch {} finally { setAiSubmitting(false); }
  };

  return (
    <FeaturePageShell
      title="Financial Services"
      subtitle="Funding, education loans, investors, insurance — matched to your profile."
      heroEmoji="💰"
      accent="#5F259F"
      rightSlot={<View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-glass border border-glass-border"><Icon name="wallet-outline" size={12} color="#86EFAC" /><Text className="text-teal font-body-bold text-xs">SA Savings Advisor</Text></View>}
    >
      <View className="flex-row gap-3 flex-wrap">
        <Stat label="HIGH MATCH FUNDING" value="3+" sub="Matched to you" color="#F97316" iconName="trophy-award" />
        <Stat label="FREE GRANTS" value="4+" sub="Zero repayment" color="#14B8A6" iconName="auto-fix" />
        <Stat label="ALUMNI INVESTORS" value="2+" sub="Active pitch pipeline" color="#6366F1" iconName="trending-up" />
        <Stat label="TAX BENEFIT" value="Available" sub="Under Sec 80C / 80E" color="#22C55E" iconName="check-decagram" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} className="flex-row items-center gap-2 px-3 py-2.5 rounded-xl bg-glass border border-glass-border" style={active && { backgroundColor: t.color + '22', borderColor: t.color + '66' }}>
              <MaterialCommunityIcons name={t.icon} size={14} color={active ? t.color : 'rgba(255,255,255,0.65)'} />
              <Text className="text-xs font-body-bold text-muted" style={active && { color: t.color }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable className="flex-row items-center gap-2 self-start px-3.5 py-2.5 rounded-xl bg-glass border border-glass-border mt-2" onPress={() => setAiOpen(!aiOpen)}>
        <Icon name="auto-fix" size={14} color="#A78BFA" />
        <Text className="text-violet font-body-bold text-xs">{AI_LABELS[tab]}</Text>
        <Icon name="chevron-down" size={14} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: aiOpen ? '180deg' : '0deg' }] }} />
      </Pressable>

      {aiOpen && (
        <View className="mt-2.5 p-4 rounded-2xl bg-glass border border-glass-border gap-3" style={{ backgroundColor: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.30)' }}>
          <Text className="text-text font-body-bold text-xs">Tell us about you — we'll re-rank by match score</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {(aiQuestions[tab] || []).map((q) => (
              <View key={q.key} className="gap-1" style={{ width: '48%', minWidth: 200 }}>
                <Text className="text-muted text-xs font-body-semibold">{q.label}</Text>
                <TextInput
                  value={aiAnswers[q.key] || ''}
                  onChangeText={(v) => setAiAnswers({ ...aiAnswers, [q.key]: v })}
                  placeholder={q.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  keyboardType={q.type === 'number' ? 'numeric' : 'default'}
                  className="px-2.5 py-2 bg-glass border border-glass-border rounded-lg text-text text-xs"
                />
              </View>
            ))}
          </View>
          <Pressable
            onPress={submitAi}
            disabled={aiSubmitting}
            className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl bg-violet self-start px-4"
            style={{ opacity: aiSubmitting ? 0.6 : 1 }}
          >
            {aiSubmitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Icon name="auto-fix" size={14} color="#fff" />
                <Text className="text-text font-body-bold text-xs">Re-rank by match score</Text>
              </>
            )}
          </Pressable>
          {aiTop3.length > 0 && (
            <View className="p-3 rounded-xl bg-glass border border-glass-border gap-2" style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.30)' }}>
              <Text className="text-teal font-body-bold text-xs">✨ Top 3 matches for you</Text>
              {aiTop3.map((t, i) => (
                <View key={t.financial_id} className="flex-row items-center gap-2.5 py-1">
                  <View className="w-6 h-6 rounded-full items-center justify-center bg-teal"><Text className="text-text font-body-bold text-xs">#{i + 1}</Text></View>
                  <View className="flex-1">
                    <Text className="text-text font-body-semibold text-xs">{t.name}</Text>
                  </View>
                  <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-glass border border-glass-border" style={{ backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.45)' }}>
                    <Icon name="auto-fix" size={10} color="#86EFAC" />
                    <Text className="text-teal font-body-bold text-xs">{t.match_score}%</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {tab === 'loans' && (
        <View className="mt-4 p-4 rounded-2xl bg-glass border border-glass-border" style={{ borderColor: 'rgba(167,139,250,0.30)' }}>
          <View className="flex-row items-center gap-2 mb-3.5">
            <Icon name="calculator-variant" size={18} color="#A78BFA" />
            <Text className="text-text font-body-bold text-base">EMI Calculator</Text>
          </View>
          <View className="flex-row flex-wrap gap-3.5">
            <EmiSlider label="Loan Amount" value={emiAmt} setValue={setEmiAmt} min={50000} max={10000000} step={50000} fmt={(v) => `₹${(v/100000).toFixed(1)} L`} prefix="₹" suffix="INR" />
            <EmiSlider label="Interest Rate" value={emiRate} setValue={setEmiRate} min={5} max={20} step={0.1} fmt={(v) => `${v.toFixed(2)}% p.a.`} suffix="% p.a." />
            <EmiSlider label="Tenure" value={emiTen} setValue={setEmiTen} min={12} max={240} step={6} fmt={(v) => `${v} mo (${(v/12).toFixed(1)} yrs)`} suffix="months" />
          </View>
          {emi && (
            <View className="mt-4 p-3.5 rounded-xl flex-row gap-3" style={{ backgroundColor: 'rgba(124,58,237,0.10)', borderColor: 'rgba(124,58,237,0.40)', borderWidth: 1 }}>
              <View className="flex-1 gap-1">
                <Text className="text-muted text-xs font-body-semibold uppercase tracking-wider">Monthly EMI</Text>
                <Text className="text-violet font-body-bold text-base mt-0.5">₹{Math.round(emi.monthly_emi).toLocaleString('en-IN')}</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-muted text-xs font-body-semibold uppercase tracking-wider">Total Payable</Text>
                <Text className="text-text font-body-bold text-base mt-0.5">₹{Math.round(emi.total_payable).toLocaleString('en-IN')}</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-muted text-xs font-body-semibold uppercase tracking-wider">Total Interest</Text>
                <Text className="font-body-bold text-base mt-0.5" style={{ color: '#FCA5A5' }}>₹{Math.round(emi.total_interest).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#7C3AED" className="mt-8" />
      ) : items.length === 0 ? (
        <View className="py-10 items-center">
          <Text className="text-muted text-sm">No items found.</Text>
        </View>
      ) : (
      <View className="flex-row flex-wrap gap-3.5">
        {items.map((p) => {
          const tint = p.tint || tabInfo.color;
          const ms = p.match_score ?? 0;
          const amountStr = p.interest_rate && tab === 'loans'
            ? `${rangeFmt(p)} · ${p.interest_rate}% p.a.`
            : p.interest_rate && tab === 'insurance'
              ? `Cover ${rangeFmt(p)} · ₹${p.interest_rate}/yr`
              : rangeFmt(p);
          return (
            <View key={p.financial_id} className="flex-1 p-4 rounded-2xl bg-glass border" style={{ minWidth: 300, maxWidth: 380, borderColor: tint + '44', gap: 12 }}>
              <View className="flex-row items-start gap-2.5">
                <View className="w-9 h-9 rounded-xl items-center justify-center border" style={{ backgroundColor: tint + '22', borderColor: tint + '55' }}>
                  <MaterialCommunityIcons name={tabInfo.icon} size={18} color={tint} />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-body-bold text-sm" numberOfLines={2}>{p.name}</Text>
                  <Text className="text-dim text-xs mt-0.5">{p.provider}</Text>
                </View>
                {ms > 0 && (
                  <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-glass border border-glass-border" style={{ backgroundColor: 'rgba(34,197,94,0.18)', borderColor: 'rgba(34,197,94,0.45)' }}>
                    <Icon name="auto-fix" size={10} color="#86EFAC" />
                    <Text className="text-teal font-body-bold text-xs">{ms}%</Text>
                  </View>
                )}
              </View>
              <View className="p-3 rounded-xl border" style={{ backgroundColor: tint + '18', borderColor: tint + '55' }}>
                <Text className="text-dim font-body-bold text-xs uppercase tracking-wider">{tab === 'loans' ? 'AMOUNT · RATE' : tab === 'insurance' ? 'COVERAGE · PREMIUM' : 'AMOUNT'}</Text>
                <Text className="font-body-bold text-base mt-0.5" style={{ color: tint }}>{amountStr}</Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {p.subcategory && (
                  <View className="px-2 py-0.5 rounded-md bg-glass border border-glass-border"><Text className="text-muted font-body-bold text-xs capitalize">{p.subcategory.replace('_', ' ')}</Text></View>
                )}
                {p.stage && (
                  <View className="px-2 py-0.5 rounded-md bg-glass border border-glass-border"><Text className="text-muted font-body-bold text-xs capitalize">{p.stage.replace('_', ' ')}</Text></View>
                )}
                {p.status && p.status !== 'open' && (
                  <View className="px-2 py-0.5 rounded-md border" style={p.status === 'closing_soon' ? { backgroundColor: '#F59E0B22', borderColor: '#F59E0B' } : p.status === 'closed' ? { backgroundColor: '#EF444422', borderColor: '#EF4444' } : {}}>
                    <Text className="font-body-bold text-xs" style={p.status === 'closing_soon' ? { color: '#FCD34D' } : p.status === 'closed' ? { color: '#FCA5A5' } : {}}>
                      {p.status === 'closing_soon' ? 'Closing soon' : 'Closed'}
                    </Text>
                  </View>
                )}
              </View>
              {p.short_desc ? (
                <Text className="text-muted text-xs mt-1" numberOfLines={2}>{p.short_desc}</Text>
              ) : null}
              {p.eligibility_criteria && p.eligibility_criteria.length > 0 && (
                <View className="gap-1">
                  {p.eligibility_criteria.slice(0, 2).map((h, i) => (
                    <View key={i} className="flex-row items-center gap-1.5">
                      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tint }} />
                      <Text className="text-muted text-xs" numberOfLines={1}>{h}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl mt-auto"
                style={{ backgroundColor: tint }}
                onPress={() => p.application_url && p.application_url !== '#' && (window as any).open(p.application_url, '_blank')}
              >
                <Text className="text-text font-body-bold text-xs tracking-wider">
                  {tab === 'investors' ? 'Pitch / Connect' :
                   tab === 'loans' ? 'Check Eligibility' :
                   tab === 'insurance' ? 'Get Quote' :
                   tab === 'startup' ? 'Learn More' : 'Apply Now'}
                </Text>
                <Icon name="arrow-right" size={12} color="#fff" />
              </Pressable>
            </View>
          );
        })}
      </View>
      )}

      <View className="flex-row flex-wrap gap-3.5">
        <View className="flex-1 p-4 rounded-2xl border gap-2" style={{ minWidth: 260, flexBasis: 260, borderColor: '#8B5CF655' }}>
          <View className="w-9 h-9 rounded-xl items-center justify-center border" style={{ backgroundColor: '#8B5CF622', borderColor: '#8B5CF655' }}>
            <MaterialCommunityIcons name="target" size={18} color="#8B5CF6" />
          </View>
          <Text className="text-text font-body-bold text-sm mt-1">Talk to a Student Advisor</Text>
          <Text className="text-muted text-xs">Need personalised financial advice? Connect with our dedicated student advisors.</Text>
          <Pressable
            className="self-start px-3.5 h-8.5 rounded-lg items-center justify-center mt-1"
            style={{ backgroundColor: '#8B5CF6' }}
            onPress={() => setAdvisorOpen(!advisorOpen)}
          >
            <Text className="text-text font-body-bold text-xs">Connect with Advisor</Text>
          </Pressable>
          {advisorOpen && (
            <View className="mt-2 gap-1.5">
              <Pressable className="flex-row items-center gap-2" onPress={() => Linking.openURL('tel:+919876543210').catch(() => {})}>
                <MaterialCommunityIcons name="phone" size={14} color="#8B5CF6" />
                <Text className="text-violet text-xs font-body-semibold">+919876543210</Text>
              </Pressable>
              <Pressable className="flex-row items-center gap-2" onPress={() => Linking.openURL('mailto:advisor@studentalumni.in?subject=Help with financial').catch(() => {})}>
                <MaterialCommunityIcons name="email" size={14} color="#8B5CF6" />
                <Text className="text-violet text-xs font-body-semibold">advisor@studentalumni.in</Text>
              </Pressable>
              <Text className="text-dim text-xs italic mt-1">
                Mon–Fri · 9am – 7pm IST · response within 4 hours
              </Text>
            </View>
          )}
        </View>

        <View className="flex-1 p-4 rounded-2xl border gap-2" style={{ minWidth: 260, flexBasis: 260, borderColor: '#14B8A655' }}>
          <View className="w-9 h-9 rounded-xl items-center justify-center border" style={{ backgroundColor: '#14B8A622', borderColor: '#14B8A655' }}>
            <MaterialCommunityIcons name="auto-fix" size={18} color="#14B8A6" />
          </View>
          <Text className="text-text font-body-bold text-sm mt-1">Ask the Financial AI</Text>
          <Text className="text-muted text-xs">Got a question about financial products? Chat with our AI assistant 24x7.</Text>
          <Pressable
            className="self-start px-3.5 h-8.5 rounded-lg items-center justify-center mt-1"
            style={{ backgroundColor: '#14B8A6' }}
            onPress={() => setAdvisorChatOpen(true)}
          >
            <Text className="font-body-bold text-xs" style={{ color: '#0A2E1A' }}>Chat with AI</Text>
          </Pressable>
        </View>
      </View>

      <FinancialCoach open={advisorChatOpen} setOpen={setAdvisorChatOpen} />

      <FAB icon="brain" label="Financial AI" color="#5F259F"
            onPress={() => setAdvisorChatOpen(true)} />
    </FeaturePageShell>
  );
}

function Stat({ label, value, sub, color, iconName }: any) {
  return (
    <View className="flex-1 min-w-44 p-3.5 rounded-xl bg-glass border border-glass-border gap-1.5">
      <View className="flex-row items-center gap-2">
        <View className="w-7 h-7 rounded-lg items-center justify-center border" style={{ backgroundColor: color + '22', borderColor: color + '55' }}><MaterialCommunityIcons name={iconName} size={14} color={color} /></View>
        <Text className="text-dim font-body-bold text-xs flex-1 uppercase tracking-wider">{label}</Text>
      </View>
      <Text className="font-body-bold text-xl mt-0.5" style={{ color }}>{value}</Text>
      <Text className="text-dim text-xs">{sub}</Text>
    </View>
  );
}
