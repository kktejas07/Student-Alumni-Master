/**
 * /financial — Scholarships, Startup Funding, Investors/VCs, Loans, Insurance.
 * Wired to /api/financial/* live backend.
 * Theme-aware (light/dark) for clean legibility and crisp contrast.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, TextInput, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FAB } from '@/src/views/web/md3';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useRouter } from 'expo-router';
import FinancialCoach from '@/src/views/web/FinancialCoach';
import { useTheme } from '@/src/theme/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
const Icon = (props: { name: IconName; size?: number; color?: string; style?: any }) =>
  <MaterialCommunityIcons name={props.name} size={props.size} color={props.color} style={props.style} />;

const TABS = [
  { id: 'scholarships', label: 'Funding',       icon: 'trophy-award' as IconName,    color: '#F97316', api: '/financial/scholarships/search' },
  { id: 'loans',        label: 'Education Loans', icon: 'bank-outline' as IconName,    color: '#2563EB', api: '/financial/loans/search' },
  { id: 'startup',      label: 'Startup Funding', icon: 'rocket-launch' as IconName,   color: '#0D9488', api: '/financial/startup-funding/search' },
  { id: 'investors',    label: 'Investors & VCs', icon: 'trending-up' as IconName,     color: '#6366F1', api: '/financial/venture-capital/search' },
  { id: 'insurance',    label: 'Insurance',       icon: 'shield-outline' as IconName,  color: '#059669', api: '/financial/insurance/search' },
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

// Web-friendly slider (uses native range input on web; falls back to numeric input)
function EmiSlider({ label, value, setValue, min, max, step, fmt, prefix = '', suffix = '', isDark }: any) {
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

  const colors = {
    label: isDark ? 'rgba(255,255,255,0.65)' : '#475569',
    value: isDark ? '#FFFFFF' : '#0F172A',
    inputBoxBg: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
    inputBoxBorder: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
    inputText: isDark ? '#FFFFFF' : '#0F172A',
    affix: isDark ? 'rgba(255,255,255,0.40)' : '#64748B',
    placeholder: isDark ? 'rgba(255,255,255,0.30)' : '#94A3B8',
  };

  if (Platform.OS === 'web') {
    return (
      <View style={s.emiSliderWrap}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={[s.emiSliderLabel, { color: colors.label }]}>{label}</Text>
          <Text style={[s.emiSliderValue, { color: colors.value }]}>{fmt(value)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {React.createElement('input' as any, {
            type: 'range', min, max, step, value,
            onChange: (e: any) => setValue(Number(e.target.value)),
            style: { width: '100%', accentColor: '#7C3AED', cursor: 'pointer' },
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBoxBg, borderRadius: 6, borderWidth: 1, borderColor: colors.inputBoxBorder, paddingHorizontal: 8, height: 28, marginTop: 6 }}>
          {prefix ? <Text style={{ color: colors.affix, fontSize: 11, marginRight: 2 }}>{prefix}</Text> : null}
          <TextInput
            value={typedValue}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType="numeric"
            placeholder={`Enter ${label.toLowerCase()}...`}
            placeholderTextColor={colors.placeholder}
            style={{ color: colors.inputText, fontSize: 11.5, flex: 1, paddingVertical: 0, paddingHorizontal: 0, height: '100%', backgroundColor: 'transparent', outlineStyle: 'none', borderWidth: 0 } as any}
          />
          {suffix ? <Text style={{ color: colors.affix, fontSize: 11, marginLeft: 2 }}>{suffix}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={s.emiSliderWrap}>
      <Text style={[s.emiSliderLabel, { color: colors.label }]}>{label} {fmt(value)}</Text>
      <TextInput
        value={typedValue}
        onChangeText={handleTextChange}
        onBlur={handleBlur}
        keyboardType="numeric"
        style={{ color: colors.inputText, borderWidth: 1, borderColor: colors.inputBoxBorder, borderRadius: 8, padding: 8, marginTop: 4, backgroundColor: colors.inputBoxBg }}
      />
    </View>
  );
}

export default function FinancialPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext);

  const colors = useMemo(() => ({
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255, 255, 255, 0.72)' : '#334155',
    text3: isDark ? 'rgba(255, 255, 255, 0.46)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    card: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    statCard: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
    statBorder: isDark ? 'rgba(255, 255, 255, 0.09)' : '#E2E8F0',
    tabInactiveBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
    tabInactiveBorder: isDark ? 'rgba(255, 255, 255, 0.10)' : '#CBD5E1',
    tabInactiveText: isDark ? 'rgba(255, 255, 255, 0.75)' : '#475569',
    tabInactiveIcon: isDark ? 'rgba(255, 255, 255, 0.65)' : '#64748B',
    aiHelperBg: isDark ? 'rgba(124, 58, 237, 0.14)' : '#EDE9FE',
    aiHelperBorder: isDark ? 'rgba(124, 58, 237, 0.40)' : '#C4B5FD',
    aiHelperText: isDark ? '#C4B5FD' : '#6D28D9',
    aiPanelBg: isDark ? 'rgba(124, 58, 237, 0.08)' : '#F8FAFC',
    aiPanelBorder: isDark ? 'rgba(124, 58, 237, 0.30)' : '#E2E8F0',
    aiFieldLabel: isDark ? 'rgba(255, 255, 255, 0.65)' : '#475569',
    aiInputBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
    aiInputBorder: isDark ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1',
    aiInputText: isDark ? '#FFFFFF' : '#0F172A',
    aiInputPlaceholder: isDark ? 'rgba(255, 255, 255, 0.30)' : '#94A3B8',
    metaPillBg: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    metaPillBorder: isDark ? 'rgba(255, 255, 255, 0.10)' : '#E2E8F0',
    metaPillText: isDark ? 'rgba(255, 255, 255, 0.75)' : '#475569',
    matchBadgeBg: isDark ? 'rgba(34, 197, 94, 0.18)' : '#ECFDF5',
    matchBadgeBorder: isDark ? 'rgba(34, 197, 94, 0.45)' : '#A7F3D0',
    matchText: isDark ? '#86EFAC' : '#047857',
    emiBoxBg: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
    emiBoxBorder: isDark ? 'rgba(167, 139, 250, 0.30)' : '#E2E8F0',
    emiSummaryBg: isDark ? 'rgba(124, 58, 237, 0.10)' : '#F5F3FF',
    emiSummaryBorder: isDark ? 'rgba(124, 58, 237, 0.40)' : '#DDD6FE',
    ctaCardBg: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
    ctaCardBorder: isDark ? 'rgba(255, 255, 255, 0.09)' : '#E2E8F0',
  }), [isDark]);

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
  // EMI calculator
  const [emiAmt, setEmiAmt] = useState(1500000);
  const [emiRate, setEmiRate] = useState(8.5);
  const [emiTen, setEmiTen] = useState(120);
  const [emi, setEmi] = useState<any>(null);
  const [advisorChatOpen, setAdvisorChatOpen] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);

  // Load financial profile on mount to pre-fill AI helper answers
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
    return () => {
      active = false;
    };
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

  // EMI auto-calculate (debounced)
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
      rightSlot={<View style={s.savPill}><Icon name="wallet-outline" size={12} color="#86EFAC" /><Text style={s.savPillText}>SA Savings Advisor</Text></View>}
    >
      <View style={s.statsRow}>
        <Stat isDark={isDark} label="HIGH MATCH FUNDING" value="3+" sub="Matched to you" color="#F97316" iconName="trophy-award" />
        <Stat isDark={isDark} label="FREE GRANTS" value="4+" sub="Zero repayment" color="#0D9488" iconName="auto-fix" />
        <Stat isDark={isDark} label="ALUMNI INVESTORS" value="2+" sub="Active pitch pipeline" color="#6366F1" iconName="trending-up" />
        <Stat isDark={isDark} label="TAX BENEFIT" value="Available" sub="Under Sec 80C / 80E" color="#10B981" iconName="check-decagram" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                s.tab,
                {
                  backgroundColor: active ? t.color + (isDark ? '22' : '15') : colors.tabInactiveBg,
                  borderColor: active ? t.color + (isDark ? '66' : '55') : colors.tabInactiveBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={t.icon}
                size={14}
                color={active ? t.color : colors.tabInactiveIcon}
              />
              <Text
                style={[
                  s.tabText,
                  { color: active ? t.color : colors.tabInactiveText },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* AI Helper button */}
      <Pressable
        style={[
          s.aiHelper,
          { backgroundColor: colors.aiHelperBg, borderColor: colors.aiHelperBorder },
        ]}
        onPress={() => setAiOpen(!aiOpen)}
      >
        <Icon name="auto-fix" size={14} color={colors.aiHelperText} />
        <Text style={[s.aiHelperText, { color: colors.aiHelperText }]}>{AI_LABELS[tab]}</Text>
        <Icon
          name="chevron-down"
          size={14}
          color={colors.aiHelperText}
          style={{ transform: [{ rotate: aiOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* AI Helper expandable form */}
      {aiOpen && (
        <View style={[s.aiPanel, { backgroundColor: colors.aiPanelBg, borderColor: colors.aiPanelBorder }]}>
          <Text style={[s.aiPanelTitle, { color: colors.text }]}>Tell us about you — we'll re-rank by match score</Text>
          <View style={s.aiPanelGrid}>
            {(aiQuestions[tab] || []).map((q) => (
              <View key={q.key} style={s.aiField}>
                <Text style={[s.aiFieldLabel, { color: colors.aiFieldLabel }]}>{q.label}</Text>
                <TextInput
                  value={aiAnswers[q.key] || ''}
                  onChangeText={(v) => setAiAnswers({ ...aiAnswers, [q.key]: v })}
                  placeholder={q.placeholder}
                  placeholderTextColor={colors.aiInputPlaceholder}
                  keyboardType={q.type === 'number' ? 'numeric' : 'default'}
                  style={[
                    s.aiInput,
                    {
                      backgroundColor: colors.aiInputBg,
                      borderColor: colors.aiInputBorder,
                      color: colors.aiInputText,
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <Pressable
            onPress={submitAi}
            disabled={aiSubmitting}
            style={[s.aiSubmit, { opacity: aiSubmitting ? 0.6 : 1 }]}
          >
            {aiSubmitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Icon name="auto-fix" size={14} color="#fff" />
                <Text style={s.aiSubmitText}>Re-rank by match score</Text>
              </>
            )}
          </Pressable>
          {aiTop3.length > 0 && (
            <View style={[s.aiTop3Box, { backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : '#ECFDF5', borderColor: isDark ? 'rgba(34,197,94,0.30)' : '#A7F3D0' }]}>
              <Text style={[s.aiTop3Title, { color: isDark ? '#86EFAC' : '#065F46' }]}>✨ Top 3 matches for you</Text>
              {aiTop3.map((t, i) => (
                <View key={t.financial_id} style={s.aiTop3Row}>
                  <View style={s.aiTop3Rank}><Text style={s.aiTop3RankText}>#{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.aiTop3Name, { color: colors.text }]}>{t.name}</Text>
                  </View>
                  <View style={[s.matchBadge, { backgroundColor: colors.matchBadgeBg, borderColor: colors.matchBadgeBorder }]}>
                    <Icon name="auto-fix" size={10} color={colors.matchText} />
                    <Text style={[s.matchText, { color: colors.matchText }]}>{t.match_score}%</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* EMI Calculator widget — Loans tab only */}
      {tab === 'loans' && (
        <View style={[s.emiBox, { backgroundColor: colors.emiBoxBg, borderColor: colors.emiBoxBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="calculator-variant" size={18} color="#7C3AED" />
            <Text style={[s.emiTitle, { color: colors.text }]}>EMI Calculator</Text>
          </View>
          <View style={s.emiGrid}>
            <EmiSlider isDark={isDark} label="Loan Amount" value={emiAmt} setValue={setEmiAmt} min={50000} max={10000000} step={50000} fmt={(v: any) => `₹${(v/100000).toFixed(1)} L`} prefix="₹" suffix="INR" />
            <EmiSlider isDark={isDark} label="Interest Rate" value={emiRate} setValue={setEmiRate} min={5} max={20} step={0.1} fmt={(v: any) => `${v.toFixed(2)}% p.a.`} suffix="% p.a." />
            <EmiSlider isDark={isDark} label="Tenure" value={emiTen} setValue={setEmiTen} min={12} max={240} step={6} fmt={(v: any) => `${v} mo (${(v/12).toFixed(1)} yrs)`} suffix="months" />
          </View>
          {emi && (
            <View style={[s.emiSummary, { backgroundColor: colors.emiSummaryBg, borderColor: colors.emiSummaryBorder }]}>
              <View style={s.emiCol}>
                <Text style={[s.emiColLabel, { color: colors.text3 }]}>Monthly EMI</Text>
                <Text style={[s.emiColValue, { color: '#7C3AED' }]}>₹{Math.round(emi.monthly_emi).toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.emiCol}>
                <Text style={[s.emiColLabel, { color: colors.text3 }]}>Total Payable</Text>
                <Text style={[s.emiColValue, { color: colors.text }]}>₹{Math.round(emi.total_payable).toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.emiCol}>
                <Text style={[s.emiColLabel, { color: colors.text3 }]}>Total Interest</Text>
                <Text style={[s.emiColValue, { color: '#EF4444' }]}>₹{Math.round(emi.total_interest).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#7C3AED" style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: colors.text3 }}>No items found.</Text>
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
            <View
              key={p.financial_id}
              style={[
                s.card,
                {
                  backgroundColor: colors.card,
                  borderColor: tint + (isDark ? '44' : '35'),
                },
              ]}
            >
              <View style={s.cardHead}>
                <View style={[s.iconBox, { backgroundColor: tint + (isDark ? '22' : '15'), borderColor: tint + (isDark ? '55' : '40') }]}>
                  <MaterialCommunityIcons name={tabInfo.icon} size={18} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
                  <Text style={[s.cardSub, { color: colors.text3 }]}>{p.provider}</Text>
                </View>
                {ms > 0 && (
                  <View style={[s.matchBadge, { backgroundColor: colors.matchBadgeBg, borderColor: colors.matchBadgeBorder }]}>
                    <Icon name="auto-fix" size={10} color={colors.matchText} />
                    <Text style={[s.matchText, { color: colors.matchText }]}>{ms}%</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  s.amtBar,
                  {
                    backgroundColor: tint + (isDark ? '18' : '10'),
                    borderColor: tint + (isDark ? '55' : '35'),
                  },
                ]}
              >
                <Text style={[s.amtLabel, { color: isDark ? 'rgba(255,255,255,0.60)' : '#64748B' }]}>
                  {tab === 'loans' ? 'AMOUNT · RATE' : tab === 'insurance' ? 'COVERAGE · PREMIUM' : 'AMOUNT'}
                </Text>
                <Text style={[s.amtValue, { color: tint }]}>{amountStr}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {p.subcategory && (
                  <View style={[s.metaPill, { backgroundColor: colors.metaPillBg, borderColor: colors.metaPillBorder }]}>
                    <Text style={[s.metaPillText, { color: colors.metaPillText }]}>{p.subcategory.replace(/_/g, ' ')}</Text>
                  </View>
                )}
                {p.stage && (
                  <View style={[s.metaPill, { backgroundColor: colors.metaPillBg, borderColor: colors.metaPillBorder }]}>
                    <Text style={[s.metaPillText, { color: colors.metaPillText }]}>{p.stage.replace(/_/g, ' ')}</Text>
                  </View>
                )}
                {p.status && p.status !== 'open' && (
                  <View
                    style={[
                      s.metaPill,
                      p.status === 'closing_soon' && { backgroundColor: isDark ? '#F59E0B22' : '#FFFBEB', borderColor: isDark ? '#F59E0B' : '#FDE68A' },
                      p.status === 'closed' && { backgroundColor: isDark ? '#EF444422' : '#FEF2F2', borderColor: isDark ? '#EF4444' : '#FECACA' },
                    ]}
                  >
                    <Text
                      style={[
                        s.metaPillText,
                        p.status === 'closing_soon' && { color: isDark ? '#FCD34D' : '#D97706' },
                        p.status === 'closed' && { color: isDark ? '#FCA5A5' : '#DC2626' },
                      ]}
                    >
                      {p.status === 'closing_soon' ? 'Closing soon' : 'Closed'}
                    </Text>
                  </View>
                )}
              </View>
              {p.short_desc ? (
                <Text style={[s.highlightText, { color: colors.text2, marginTop: 4 }]} numberOfLines={2}>{p.short_desc}</Text>
              ) : null}
              {p.eligibility_criteria && p.eligibility_criteria.length > 0 && (
                <View style={{ gap: 4 }}>
                  {p.eligibility_criteria.slice(0, 2).map((h, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <View style={[s.bullet, { backgroundColor: tint }]} />
                      <Text style={[s.highlightText, { color: colors.text2 }]} numberOfLines={1}>{h}</Text>
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
                <Icon name="arrow-right" size={12} color="#fff" />
              </Pressable>
            </View>
          );
        })}
      </View>
      )}

      {/* Advisor + AI Chat CTAs */}
      <View style={s.ctaRow}>
        {/* Advisor card */}
        <View style={[s.ctaCard, { backgroundColor: colors.ctaCardBg, borderColor: isDark ? '#8B5CF655' : '#E2E8F0' }]}>
          <View style={[s.iconBox, { backgroundColor: '#8B5CF61A', borderColor: '#8B5CF640', width: 38, height: 38 }]}>
            <MaterialCommunityIcons name="target" size={18} color="#8B5CF6" />
          </View>
          <Text style={[s.ctaTitle, { color: colors.text }]}>Talk to a Student Advisor</Text>
          <Text style={[s.ctaSub, { color: colors.text2 }]}>Need personalised financial advice? Connect with our dedicated student advisors.</Text>
          <Pressable
            style={[s.ctaBtn, { backgroundColor: '#8B5CF6', borderRadius: 8 }]}
            onPress={() => setAdvisorOpen(!advisorOpen)}
          >
            <Text style={s.ctaBtnText}>Connect with Advisor</Text>
          </Pressable>
          {advisorOpen && (
            <View style={{ marginTop: 8, gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('tel:+919876543210').catch(() => {})}>
                <MaterialCommunityIcons name="phone" size={14} color="#8B5CF6" />
                <Text style={{ color: '#8B5CF6', fontSize: 12.5, fontWeight: '600' }}>+919876543210</Text>
              </Pressable>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => Linking.openURL('mailto:advisor@studentalumni.in?subject=Help with financial').catch(() => {})}>
                <MaterialCommunityIcons name="email" size={14} color="#8B5CF6" />
                <Text style={{ color: '#8B5CF6', fontSize: 12.5, fontWeight: '600' }}>advisor@studentalumni.in</Text>
              </Pressable>
              <Text style={{ color: colors.text3, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>
                Mon–Fri · 9am – 7pm IST · response within 4 hours
              </Text>
            </View>
          )}
        </View>

        {/* AI card */}
        <View style={[s.ctaCard, { backgroundColor: colors.ctaCardBg, borderColor: isDark ? '#0D948855' : '#E2E8F0' }]}>
          <View style={[s.iconBox, { backgroundColor: '#0D94881A', borderColor: '#0D948840', width: 38, height: 38 }]}>
            <MaterialCommunityIcons name="auto-fix" size={18} color="#0D9488" />
          </View>
          <Text style={[s.ctaTitle, { color: colors.text }]}>Ask the Financial AI</Text>
          <Text style={[s.ctaSub, { color: colors.text2 }]}>Got a question about financial products? Chat with our AI assistant 24x7.</Text>
          <Pressable
            style={[s.ctaBtn, { backgroundColor: '#0D9488', borderRadius: 8 }]}
            onPress={() => setAdvisorChatOpen(true)}
          >
            <Text style={[s.ctaBtnText, { color: '#FFFFFF' }]}>Chat with AI</Text>
          </Pressable>
        </View>
      </View>

      {/* Floating Financial AI Coach (works same as Money Coach) */}
      <FinancialCoach open={advisorChatOpen} setOpen={setAdvisorChatOpen} />

      {/* MD3 Floating Action Button — open AI chat */}
      <FAB icon="brain" label="Financial AI" color="#5F259F"
            onPress={() => setAdvisorChatOpen(true)} />
    </FeaturePageShell>
  );
}

function Stat({ isDark, label, value, sub, color, iconName }: any) {
  return (
    <View
      style={[
        s.statCard,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.09)' : '#E2E8F0',
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[s.statIcon, { backgroundColor: color + (isDark ? '22' : '15'), borderColor: color + (isDark ? '55' : '35') }]}>
          <MaterialCommunityIcons name={iconName} size={14} color={color} />
        </View>
        <Text style={[s.statLabel, { color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B' }]}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statSub, { color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B' }]}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  savPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.40)', borderWidth: 1 },
  savPillText: { color: '#86EFAC', fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },

  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 180, padding: 14, borderRadius: 12, borderWidth: 1, gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' as any },
  statIcon: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1, flex: 1 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, marginTop: 2 },
  statSub: { fontFamily: 'DMSans_500Medium', fontSize: 11 },

  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  tabText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  tabCount: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
  tabCountText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { flexGrow: 1, flexBasis: 300, maxWidth: 380, padding: 16, borderRadius: 14, borderWidth: 1, gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' as any },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14.5 },
  cardSub: { fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },

  amtBar: { padding: 12, borderRadius: 10, borderWidth: 1 },
  amtLabel: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1 },
  amtValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, marginTop: 3 },

  bullet: { width: 6, height: 6, borderRadius: 3 },
  highlightText: { fontFamily: 'DMSans_500Medium', fontSize: 12 },

  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9, marginTop: 'auto', ...({ cursor: 'pointer' } as any) },
  applyText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12, letterSpacing: 0.3 },

  // Match% badge + AI helper + meta pills
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  matchText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  aiHelper: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, marginTop: 8, ...({ cursor: 'pointer' } as any) },
  aiHelperText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  metaPillText: { fontFamily: 'DMSans_700Bold', fontSize: 10, textTransform: 'capitalize' as any },

  // AI Helper expandable panel
  aiPanel: { marginTop: 10, padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  aiPanelTitle: { fontFamily: 'DMSans_700Bold', fontSize: 13 },
  aiPanelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  aiField: { width: '48%', minWidth: 200, gap: 4 },
  aiFieldLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },
  aiInput: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 8, fontSize: 13, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  aiSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 10, backgroundColor: '#7C3AED', alignSelf: 'flex-start', paddingHorizontal: 18, ...({ cursor: 'pointer' } as any) },
  aiSubmitText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13, letterSpacing: 0.3 },
  aiTop3Box: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  aiTop3Title: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  aiTop3Row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  aiTop3Rank: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  aiTop3RankText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11 },
  aiTop3Name: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },

  // EMI Calculator widget
  emiBox: { marginTop: 16, padding: 18, borderRadius: 14, borderWidth: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' as any },
  emiTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16 },
  emiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  emiSliderWrap: { flex: 1, minWidth: 240, gap: 4 },
  emiSliderLabel: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  emiSliderValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  emiSummary: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12 },
  emiCol: { flex: 1, gap: 4 },
  emiColLabel: { fontFamily: 'DMSans_600SemiBold', fontSize: 10, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  emiColValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 17 },

  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  ctaCard: { flex: 1, flexBasis: 260, padding: 18, borderRadius: 14, borderWidth: 1, gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' as any },
  ctaTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15, marginTop: 4 },
  ctaSub: { fontFamily: 'DMSans_500Medium', fontSize: 12.5 },
  ctaBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 4, ...({ cursor: 'pointer' } as any) },
  ctaBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },
});
