// @ts-nocheck
/**
 * /higher-education — SA Higher Education v2
 *
 * Tabs: Programmes | Scholarships | Countries
 * Programme card with match%, tags, Apply→/Details/Draft SOP/Compare
 * Sticky compare bar → side-by-side modal
 * AI Tools drawer (SOP, CV, Cover Letter, LOR, Eligibility, Profile)
 * Apply → creates Application + opens applyUrl + routes to /applications/{app_id}
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
  TextInput, Modal, Linking, Platform, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { request } from '@/src/models/services/api';
import { useTheme } from '@/src/theme/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Programme = {
  id: string; degree: string; country: string; match: number; name: string;
  institution: string; duration: string; fee: string; currency: string;
  fee_amount: number; fee_inr?: number; mode: string; intake: string;
  apply_url: string; deadline?: string; decision_days?: number;
  total_cost_inr?: number; tags?: string[]; min_cgpa?: number;
  acceptance_rate?: number; qs_rank?: number; gre_required?: boolean;
  ielts_required?: boolean; post_grad_salary_inr?: number;
};
type Scholarship = {
  id: string; name: string; funder: string; country: string;
  degree_levels: string[]; award_inr: number; coverage: string;
  deadline: string; eligibility: string; url: string;
};
type Country = {
  id: string; flag: string; name: string; programmes: number;
  scholarships: number; avg_fee_inr: number; avg_living_inr: number;
};

const TAG_META: Record<string, { label: string; icon: IconName; color: string }> = {
  TOP_RANKED:    { label: 'Top-Ranked',     icon: 'trophy',          color: '#F59E0B' },
  FULLY_FUNDED:  { label: 'Fully Funded',   icon: 'cash-multiple',   color: '#10B981' },
  DEADLINE_SOON: { label: 'Deadline Soon',  icon: 'clock-alert',     color: '#F59E0B' },
  SAFE_BET:      { label: 'Safe Bet',       icon: 'shield-check',    color: '#7C3AED' },
  STRETCH:       { label: 'Stretch',        icon: 'rocket-launch',   color: '#EF4444' },
  INDIA_TOP:     { label: 'India Top',      icon: 'flag',            color: '#6366F1' },
  GLOBAL_TOP_50: { label: 'Global Top-50',  icon: 'earth',           color: '#06B6D4' },
  HIGH_ROI:      { label: 'High ROI',       icon: 'trending-up',     color: '#059669' },
  NEW_INTAKE:    { label: 'New Intake',     icon: 'sparkles',        color: '#EC4899' },
};

const fmtINR = (n: number) => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

const matchTier = (n: number, isDark: boolean) => {
  if (n >= 95) return { bg: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', fg: isDark ? '#34D399' : '#059669', border: isDark ? 'transparent' : '#A7F3D0' };
  if (n >= 85) return { bg: isDark ? 'rgba(34,211,238,0.15)' : '#ECFEFF', fg: isDark ? '#67E8F9' : '#0891B2', border: isDark ? 'transparent' : '#A5F3FC' };
  if (n >= 75) return { bg: isDark ? 'rgba(167,139,250,0.15)' : '#F5F3FF', fg: isDark ? '#C4B5FD' : '#7C3AED', border: isDark ? 'transparent' : '#DDD6FE' };
  return { bg: isDark ? 'rgba(110,105,130,0.15)' : '#F1F5F9', fg: isDark ? '#B7B3C6' : '#64748B', border: isDark ? 'transparent' : '#CBD5E1' };
};

function useRoleTheme() {
  const user = useAuthStore((st) => st.user);
  const role = user?.role || 'student';

  const themeColor =
    role === 'alumni' ? '#60A5FA' :
    role === 'mentor' ? '#5EEAD4' :
    role === 'college' || role === 'admin' ? '#818CF8' :
    '#A78BFA';

  const activeTabColor =
    role === 'alumni' ? '#3B82F6' :
    role === 'mentor' ? '#14B8A6' :
    role === 'college' || role === 'admin' ? '#6366F1' :
    '#7C3AED';

  const activeTabBorder =
    role === 'alumni' ? '#60A5FA' :
    role === 'mentor' ? '#5EEAD4' :
    role === 'college' || role === 'admin' ? '#818CF8' :
    '#A78BFA';

  return { role, themeColor, activeTabColor, activeTabBorder };
}

export default function HigherEducationScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const user = useAuthStore((st) => st.user);
  const initialized = useAuthStore((st) => st.initialized);
  const { role, themeColor, activeTabColor, activeTabBorder } = useRoleTheme();
  const isEmbedded = React.useContext(EmbeddedShellContext);

  const colors = useMemo(() => ({
    bg: isDark ? '#0A1628' : '#F8FAFC',
    card: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
    cardShadow: isDark ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? 'rgba(255,255,255,0.72)' : '#334155',
    text3: isDark ? 'rgba(255,255,255,0.46)' : '#64748B',
    border: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
    statBg: isDark ? 'rgba(0,0,0,0.20)' : '#F8FAFC',
    statBorder: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    statValue: isDark ? '#FFFFFF' : '#0F172A',
    statLabel: isDark ? '#94A3B8' : '#64748B',
    tabInactiveBg: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    tabInactiveBorder: isDark ? 'rgba(255,255,255,0.10)' : '#CBD5E1',
    tabInactiveText: isDark ? 'rgba(255,255,255,0.72)' : '#475569',
    detailsBtnBg: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    detailsBtnBorder: isDark ? 'rgba(255,255,255,0.10)' : '#CBD5E1',
    detailsBtnText: isDark ? 'rgba(255,255,255,0.85)' : '#334155',
    compareChkBg: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
    compareChkBorder: isDark ? 'rgba(255,255,255,0.10)' : '#CBD5E1',
    compareChkText: isDark ? 'rgba(255,255,255,0.50)' : '#64748B',
    modalBg: isDark ? '#1A1626' : '#FFFFFF',
    modalBorder: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
    inputBg: isDark ? 'rgba(0,0,0,0.20)' : '#F8FAFC',
    inputBorder: isDark ? 'rgba(255,255,255,0.10)' : '#CBD5E1',
    inputText: isDark ? '#FFFFFF' : '#0F172A',
    inputPlaceholder: isDark ? 'rgba(255,255,255,0.46)' : '#94A3B8',
    aiResultBg: isDark ? 'rgba(0,0,0,0.30)' : '#F8FAFC',
    degreePillBg: isDark ? 'rgba(59,130,246,0.20)' : '#EFF6FF',
    degreePillBorder: isDark ? 'transparent' : '#BFDBFE',
    degreePillText: isDark ? '#93C5FD' : '#2563EB',
    countryPillBg: isDark ? 'rgba(16,185,129,0.20)' : '#ECFDF5',
    countryPillBorder: isDark ? 'transparent' : '#A7F3D0',
    countryPillText: isDark ? '#86EFAC' : '#059669',
  }), [isDark]);

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') {
        router.replace('/alumni-portal?tab=higher-ed' as any);
      } else if (user.role === 'student') {
        router.replace('/student-portal?tab=higher-ed' as any);
      }
    }
  }, [isEmbedded, initialized, user, router]);

  const [tab, setTab] = useState<'programmes' | 'scholarships' | 'countries'>('programmes');
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [aiTool, setAiTool] = useState<null | { type: 'sop' | 'cv' | 'cover' | 'lor' | 'elig' | 'profile'; programmeId?: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAfterRedirectProg, setConfirmAfterRedirectProg] = useState<Programme | null>(null);
  const [appliedAppMap, setAppliedAppMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [p, s, c, a] = await Promise.all([
        request<{ programmes: Programme[] }>('/he/programmes'),
        request<{ scholarships: Scholarship[] }>('/he/scholarships'),
        request<{ countries: Country[] }>('/he/countries'),
        request<{ applications: any[] }>('/he/applications').catch(() => ({ applications: [] })),
      ]);
      setProgrammes(p.programmes || []);
      setScholarships(s.scholarships || []);
      setCountries(c.countries || []);

      const appMap: Record<string, string> = {};
      if (a?.applications) {
        a.applications.forEach((app: any) => {
          if (app.programme_id) {
            appMap[app.programme_id] = app.app_id;
          }
        });
      }
      setAppliedAppMap(appMap);
    } catch (e: any) {
      setError(e?.message || 'Could not load data');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleCompare = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else if (next.size < 4) next.add(id);
    setSelectedIds(next);
  };

  const onApplyClick = async (p: Programme) => {
    try {
      const url = p.apply_url || 'https://google.com';
      if (Platform.OS === 'web') {
        (window as any).open(url, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      console.warn("Could not open apply URL:", e);
    }
    setConfirmAfterRedirectProg(p);
  };

  const executeApply = async (p: Programme) => {
    try {
      const r = await request<any>('/he/apply', { method: 'POST', body: { programme_id: p.id } });
      const aid = r?.application?.app_id;
      if (aid) {
        setAppliedAppMap((prev) => ({ ...prev, [p.id]: aid }));
        router.push(`/applications/${aid}` as any);
      }
    } catch (e: any) {
      setError(e?.message || 'Apply failed');
    }
  };

  return (
    <FeaturePageShell
      title="Higher Education"
      subtitle="AI-powered programme discovery + Application Tracker"
      heroEmoji="🎓"
      accent={themeColor}
      rightSlot={
        <Pressable
          style={[s.toolsBtn, { backgroundColor: activeTabColor + '4d', borderColor: activeTabBorder + '8c' }]}
          onPress={() => setAiTool({ type: 'profile' })}
        >
          <MaterialCommunityIcons name="auto-fix" size={14} color="#fff" />
          <Text style={s.toolsBtnText}>AI Tools</Text>
        </Pressable>
      }
    >
      {error ? (
        <View style={s.errBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F87171" />
          <Text style={s.errText}>{error}</Text>
        </View>
      ) : null}

      {/* Tabs */}
      <View style={s.tabsRow}>
        {([
          { id: 'programmes',  label: 'Programmes',  icon: 'school' as IconName },
          { id: 'scholarships',label: 'Funding', icon: 'medal' as IconName },
          { id: 'countries',   label: 'Countries',    icon: 'earth' as IconName },
        ] as const).map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              style={[
                s.tab,
                {
                  backgroundColor: active ? activeTabColor : colors.tabInactiveBg,
                  borderColor: active ? activeTabBorder : colors.tabInactiveBorder,
                },
              ]}
              onPress={() => setTab(t.id)}
            >
              <MaterialCommunityIcons name={t.icon} size={14} color={active ? '#fff' : colors.tabInactiveText} />
              <Text style={[s.tabText, { color: active ? '#fff' : colors.tabInactiveText }, active && s.tabTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color={themeColor} size="large" />
          <Text style={{ color: colors.text2, marginTop: 10 }}>Loading…</Text>
        </View>
      ) : (
        <>
          {tab === 'programmes' && (
            <>
              <View style={s.sectionHead}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Recommended Programmes</Text>
                <Text style={[s.sectionSub, { color: colors.text3 }]}>{programmes.length} options matched to your profile</Text>
              </View>
              <View style={s.grid}>
                {programmes.map((p) => (
                  <ProgrammeCard
                    key={p.id} p={p}
                    colors={colors}
                    isDark={isDark}
                    selected={selectedIds.has(p.id)}
                    onCompareToggle={() => toggleCompare(p.id)}
                    onApply={() => onApplyClick(p)}
                    onDraftSOP={() => setAiTool({ type: 'sop', programmeId: p.id })}
                    onDetails={() => setAiTool({ type: 'elig', programmeId: p.id })}
                    onCoverLetter={() => setAiTool({ type: 'cover', programmeId: p.id })}
                    appId={appliedAppMap[p.id]}
                  />
                ))}
              </View>

              {/* AdvisorAIBlock */}
              <View style={{ marginTop: 18 }}>
                <AdvisorAIBlock
                  context="higher-education"
                  advisorTitle="Talk to a Higher-Ed Advisor"
                  advisorDesc="Need 1-on-1 guidance on programmes, visas, or funding? Connect with our advisors."
                  aiTitle="Ask the Higher-Ed AI"
                  aiDesc="Eligibility, fees, funding, SOP/CV — ask anything 24×7."
                  advisorAccent="#A78BFA"
                  aiAccent="#10B981"
                  advisorIcon="account-tie"
                  aiIcon="robot-excited"
                />
              </View>
            </>
          )}

          {tab === 'scholarships' && (
            <View style={s.grid}>
              {scholarships.map((sch) => (
                <View
                  key={sch.id}
                  style={[
                    s.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: isDark ? '#10B98155' : '#A7F3D0',
                    },
                    colors.cardShadow,
                  ]}
                >
                  <View style={{ flex: 1, gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={[s.pill, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', borderColor: isDark ? 'transparent' : '#A7F3D0', borderWidth: isDark ? 0 : 1 }]}>
                        <Text style={[s.pillText, { color: isDark ? '#34D399' : '#059669' }]}>{sch.degree_levels.join('/')}</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: isDark ? 'rgba(124,58,237,0.20)' : '#F5F3FF', borderColor: isDark ? 'transparent' : '#DDD6FE', borderWidth: isDark ? 0 : 1 }]}>
                        <Text style={[s.pillText, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>{sch.country}</Text>
                      </View>
                    </View>
                    <Text style={[s.cardTitle, { color: colors.text }]}>{sch.name}</Text>
                    <Text style={[s.cardSub, { color: colors.text2 }]}>{sch.funder}</Text>
                    <View style={s.statsGrid}>
                      <Stat label="Award" value={fmtINR(sch.award_inr)} good colors={colors} />
                      <Stat label="Coverage" value={sch.coverage.length > 22 ? sch.coverage.slice(0, 22) + '…' : sch.coverage} colors={colors} />
                      <Stat label="Deadline" value={new Date(sch.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} colors={colors} />
                      <Stat label="Eligibility" value={sch.eligibility.length > 22 ? sch.eligibility.slice(0, 22) + '…' : sch.eligibility} colors={colors} />
                    </View>
                  </View>
                  <Pressable style={[s.applyBtn, { backgroundColor: '#10B981' }]} onPress={() => Linking.openURL(sch.url)}>
                    <Text style={s.applyBtnText}>Apply →</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {tab === 'countries' && (
            <View style={s.grid}>
              {countries.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    s.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: isDark ? '#06B6D455' : '#BAE6FD',
                    },
                    colors.cardShadow,
                  ]}
                  onPress={() => { setTab('programmes'); }}
                >
                  <Image
                    source={{
                      uri: `https://flagcdn.com/w80/${(({
                        india: 'in',
                        usa: 'us',
                        uk: 'gb',
                        canada: 'ca',
                        germany: 'de',
                        australia: 'au',
                        singapore: 'sg',
                        netherlands: 'nl',
                      } as Record<string, string>)[c.id.toLowerCase()] ?? c.id.toLowerCase())}.png`,
                    }}
                    style={{
                      width: 44,
                      height: 32,
                      borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                    }}
                  />
                  <Text style={[s.cardTitle, { color: colors.text }]}>{c.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                    <Text style={[s.cardSub, { color: colors.text2 }]}>📚 {c.programmes} programmes</Text>
                    <Text style={[s.cardSub, { color: colors.text2 }]}>🎖️ {c.scholarships} funding options</Text>
                  </View>
                  <View style={s.statsGrid}>
                    <Stat label="Avg fee/yr" value={fmtINR(c.avg_fee_inr)} colors={colors} />
                    <Stat label="Avg living/yr" value={fmtINR(c.avg_living_inr)} colors={colors} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {/* Sticky compare bar */}
      {selectedIds.size >= 2 && (
        <View style={[s.compareBar, { backgroundColor: colors.modalBg, borderColor: themeColor + '8c' }]}>
          <MaterialCommunityIcons name="compare-horizontal" size={16} color={colors.text} />
          <Text style={[s.compareText, { color: colors.text }]}>Compare {selectedIds.size} programmes</Text>
          <Pressable onPress={() => setSelectedIds(new Set())}>
            <Text style={[s.compareClear, { color: colors.text3 }]}>Clear</Text>
          </Pressable>
          <Pressable style={[s.compareCTA, { backgroundColor: activeTabColor }]} onPress={() => setCompareOpen(true)}>
            <Text style={s.compareCTAText}>Compare →</Text>
          </Pressable>
        </View>
      )}

      {/* Compare modal */}
      <CompareModal
        visible={compareOpen}
        ids={Array.from(selectedIds)}
        colors={colors}
        onClose={() => setCompareOpen(false)}
        onApply={(p) => {
          setCompareOpen(false);
          onApplyClick(p);
        }}
        appliedAppMap={appliedAppMap}
      />

      {/* Confirmation Modal */}
      <Modal
        visible={!!confirmAfterRedirectProg}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAfterRedirectProg(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={[s.confirmModal, { backgroundColor: colors.modalBg, borderColor: colors.modalBorder }]}>
            <View style={[s.confirmHead, { borderBottomColor: colors.modalBorder }]}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
              <Text style={[s.confirmTitle, { color: colors.text }]}>Application Status</Text>
            </View>

            <View style={s.confirmBody}>
              <Text style={[s.confirmText, { color: colors.text }]}>
                Did you complete your application for <Text style={[s.boldText, { color: themeColor }]}>{confirmAfterRedirectProg?.name}</Text> at <Text style={[s.boldText, { color: themeColor }]}>{confirmAfterRedirectProg?.institution}</Text>?
              </Text>
              <Text style={[s.confirmSubtext, { color: colors.text2 }]}>
                We opened the official university portal in a new tab. If you successfully completed and submitted the application, click "Yes, I Applied" to begin tracking.
              </Text>
            </View>

            <View style={s.confirmActions}>
              <Pressable
                style={[s.cancelBtn, { backgroundColor: colors.detailsBtnBg, borderColor: colors.detailsBtnBorder }]}
                onPress={() => setConfirmAfterRedirectProg(null)}
              >
                <Text style={[s.cancelBtnText, { color: colors.detailsBtnText }]}>No, Cancelled</Text>
              </Pressable>
              <Pressable
                style={[s.confirmBtn, { backgroundColor: activeTabColor }]}
                onPress={() => {
                  if (confirmAfterRedirectProg) {
                    const p = confirmAfterRedirectProg;
                    setConfirmAfterRedirectProg(null);
                    executeApply(p);
                  }
                }}
              >
                <Text style={s.confirmBtnText}>Yes, I Applied</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Tools modal */}
      <AIToolsModal
        tool={aiTool}
        colors={colors}
        isDark={isDark}
        onClose={() => setAiTool(null)}
        onSwitch={(t) => setAiTool(t)}
      />
    </FeaturePageShell>
  );
}

// ─── Programme Card ──────────────────────────────────────────────────────
function ProgrammeCard({
  p, selected, onCompareToggle, onApply, onDraftSOP, onDetails, onCoverLetter, appId, colors, isDark,
}: {
  p: Programme; selected: boolean; onCompareToggle: () => void;
  onApply: () => void; onDraftSOP: () => void; onDetails: () => void; onCoverLetter: () => void;
  appId?: string; colors: any; isDark: boolean;
}) {
  const router = useRouter();
  const { themeColor, activeTabColor } = useRoleTheme();
  const tier = matchTier(p.match, isDark);
  const tags = (p.tags || []).slice(0, 3);
  const overflow = (p.tags || []).length - tags.length;

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? themeColor : colors.cardBorder,
          borderWidth: selected ? 2 : 1,
        },
        colors.cardShadow,
      ]}
    >
      <View style={{ flex: 1, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={[s.pill, { backgroundColor: colors.degreePillBg, borderColor: colors.degreePillBorder, borderWidth: isDark ? 0 : 1 }]}>
              <Text style={[s.pillText, { color: colors.degreePillText }]}>{p.degree}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: colors.countryPillBg, borderColor: colors.countryPillBorder, borderWidth: isDark ? 0 : 1 }]}>
              <Text style={[s.pillText, { color: colors.countryPillText }]}>{p.country}</Text>
            </View>
          </View>
          <View style={[s.matchPill, { backgroundColor: tier.bg, borderColor: tier.border, borderWidth: tier.border !== 'transparent' ? 1 : 0 }]}>
            <MaterialCommunityIcons name="sparkles" size={11} color={tier.fg} />
            <Text style={[s.matchText, { color: tier.fg }]}>{p.match}% match</Text>
          </View>
        </View>
   
        <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
        <Text style={[s.cardSub, { color: colors.text2 }]}>{p.institution}</Text>
   
        <View style={s.statsGrid}>
          <Stat label="Duration" value={p.duration} colors={colors} />
          <Stat label="Fee" value={p.fee} good={p.fee.toLowerCase().includes('funded') || p.fee_amount === 0} colors={colors} />
          <Stat label="Mode" value={p.mode} colors={colors} />
          <Stat label="Intake" value={p.intake} colors={colors} />
        </View>
   
        {tags.length > 0 && (
          <View style={s.tagRow}>
            {tags.map((t) => {
              const m = TAG_META[t]; if (!m) return null;
              return (
                <View key={t} style={[s.tagPill, { backgroundColor: m.color + '22', borderColor: m.color + '66' }]}>
                  <MaterialCommunityIcons name={m.icon} size={10} color={m.color} />
                  <Text style={[s.tagText, { color: m.color }]}>{m.label}</Text>
                </View>
              );
            })}
            {overflow > 0 && (
              <View style={[s.tagPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: colors.border }]}>
                <Text style={[s.tagText, { color: colors.text2 }]}>+{overflow}</Text>
              </View>
            )}
          </View>
        )}
      </View>
 
      <View style={{ gap: 6, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {appId ? (
            <Pressable
              style={[s.applyBtn, { flex: 1, backgroundColor: isDark ? 'rgba(52,211,153,0.15)' : '#ECFDF5', borderColor: '#10B981', borderWidth: 1 }]}
              onPress={() => router.push(`/applications/${appId}` as any)}
            >
              <Text style={[s.applyBtnText, { color: '#059669' }]}>Applied ✓</Text>
            </Pressable>
          ) : (
            <Pressable style={[s.applyBtn, { flex: 1, backgroundColor: activeTabColor }]} onPress={onApply}>
              <Text style={s.applyBtnText}>Apply →</Text>
            </Pressable>
          )}
          <Pressable style={[s.detailsBtn, { backgroundColor: colors.detailsBtnBg, borderColor: colors.detailsBtnBorder }]} onPress={onDetails}>
            <Text style={[s.detailsBtnText, { color: colors.detailsBtnText }]}>Eligibility</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable style={[s.draftBtn, { backgroundColor: isDark ? themeColor + '1a' : '#F5F3FF', borderColor: isDark ? themeColor + '66' : '#DDD6FE' }]} onPress={onDraftSOP}>
            <MaterialCommunityIcons name="file-document-edit" size={12} color={isDark ? themeColor : '#7C3AED'} />
            <Text style={[s.draftBtnText, { color: isDark ? themeColor : '#7C3AED' }]}>Draft SOP</Text>
          </Pressable>
          <Pressable style={[s.draftBtn, { backgroundColor: isDark ? themeColor + '1a' : '#F5F3FF', borderColor: isDark ? themeColor + '66' : '#DDD6FE' }]} onPress={onCoverLetter}>
            <MaterialCommunityIcons name="email-edit" size={12} color={isDark ? themeColor : '#7C3AED'} />
            <Text style={[s.draftBtnText, { color: isDark ? themeColor : '#7C3AED' }]}>Cover letter</Text>
          </Pressable>
          <Pressable
            style={[
              s.compareChk,
              { backgroundColor: colors.compareChkBg, borderColor: selected ? (themeColor + '8c') : colors.compareChkBorder },
            ]}
            onPress={onCompareToggle}
          >
            <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={14} color={selected ? themeColor : colors.compareChkText} />
            <Text style={[s.compareChkText, { color: selected ? themeColor : colors.compareChkText }]}>Compare</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, good, colors }: { label: string; value: string; good?: boolean; colors: any }) {
  return (
    <View style={[s.stat, { backgroundColor: colors.statBg, borderColor: colors.statBorder }]}>
      <Text style={[s.statValue, { color: good ? '#10B981' : colors.statValue }]}>{value}</Text>
      <Text style={[s.statLabel, { color: colors.statLabel }]}>{label}</Text>
    </View>
  );
}

function CompareModal({ visible, ids, onClose, onApply, appliedAppMap, colors }: {
  visible: boolean; ids: string[]; onClose: () => void; onApply: (p: Programme) => void;
  appliedAppMap: Record<string, string>; colors: any;
}) {
  const router = useRouter();
  const { activeTabColor } = useRoleTheme();
  const [data, setData] = useState<{ programmes: Programme[]; rows: any[]; tied: boolean; tie_breaker_note?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || ids.length < 2) return;
    setLoading(true);
    request<any>('/he/compare', { method: 'POST', body: { programme_ids: ids } })
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [visible, ids]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={[s.compareModal, { backgroundColor: colors.modalBg, borderColor: colors.modalBorder }]}>
          <View style={[s.modalHead, { borderBottomColor: colors.modalBorder }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Compare {ids.length} Programmes</Text>
            <Pressable onPress={onClose}><MaterialCommunityIcons name="close" size={20} color={colors.text2} /></Pressable>
          </View>
          {loading || !data ? (
            <ActivityIndicator color="#A78BFA" size="large" style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }}>
              {data.tied && data.tie_breaker_note && (
                <View style={s.tieNote}>
                  <MaterialCommunityIcons name="information" size={14} color="#D97706" />
                  <Text style={[s.tieNoteText, { color: '#D97706' }]}>{data.tie_breaker_note}</Text>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header row */}
                  <View style={[s.compareRow, { borderBottomColor: colors.modalBorder }]}>
                    <View style={s.compareLabelCell}><Text style={s.compareLabel}> </Text></View>
                    {data.programmes.map((p) => (
                      <View key={p.id} style={[s.compareCell, { borderLeftColor: colors.modalBorder }]}>
                        <Text style={[s.compareCellTitle, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
                        <Text style={[s.compareCellSub, { color: colors.text3 }]}>{p.institution}</Text>
                      </View>
                    ))}
                  </View>
                  {data.rows.map((row: any) => {
                    const values = data.programmes.map((p: any) => p[row.key]);
                    let bestIdx = -1, worstIdx = -1;
                    if (row.best === 'min') {
                      const nums = values.map((v: any) => typeof v === 'number' ? v : 9e15);
                      bestIdx = nums.indexOf(Math.min(...nums));
                      worstIdx = nums.indexOf(Math.max(...nums));
                    } else if (row.best === 'max') {
                      const nums = values.map((v: any) => typeof v === 'number' ? v : -1);
                      bestIdx = nums.indexOf(Math.max(...nums));
                      worstIdx = nums.indexOf(Math.min(...nums));
                    }
                    return (
                      <View key={row.key} style={[s.compareRow, { borderBottomColor: colors.modalBorder }]}>
                        <View style={s.compareLabelCell}>
                          <Text style={[s.compareLabel, { color: colors.text2 }]}>{row.label}</Text>
                        </View>
                        {data.programmes.map((p: any, i: number) => {
                          let v = p[row.key];
                          if (row.key.includes('inr')) v = fmtINR(Number(v));
                          else if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
                          else if (v == null) v = '—';
                          const tint = i === bestIdx ? '#10B981' : i === worstIdx && bestIdx !== worstIdx ? '#EF4444' : colors.text;
                          return (
                            <View key={i} style={[s.compareCell, { borderLeftColor: colors.modalBorder }]}>
                              <Text style={[s.compareValue, { color: tint }]}>{String(v)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                  {/* Apply row */}
                  <View style={[s.compareRow, { borderBottomColor: colors.modalBorder }]}>
                    <View style={s.compareLabelCell} />
                    {data.programmes.map((p) => {
                      const appId = appliedAppMap[p.id];
                      return (
                        <View key={p.id} style={[s.compareCell, { borderLeftColor: colors.modalBorder }]}>
                          {appId ? (
                            <Pressable
                              style={[s.applyBtn, { backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1 }]}
                              onPress={() => {
                                onClose();
                                router.push(`/applications/${appId}` as any);
                              }}
                            >
                              <Text style={[s.applyBtnText, { color: '#059669' }]}>Applied ✓</Text>
                            </Pressable>
                          ) : (
                            <Pressable style={[s.applyBtn, { backgroundColor: activeTabColor }]} onPress={() => onApply(p)}>
                              <Text style={s.applyBtnText}>Apply →</Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── AI Tools Modal ──────────────────────────────────────────────────────
type ToolType = 'sop' | 'cv' | 'cover' | 'lor' | 'elig' | 'profile';

function AIToolsModal({
  tool, onClose, onSwitch, colors, isDark,
}: {
  tool: { type: ToolType; programmeId?: string } | null;
  onClose: () => void;
  onSwitch: (t: any) => void;
  colors: any;
  isDark: boolean;
}) {
  const { themeColor, activeTabColor, activeTabBorder } = useRoleTheme();
  const [stage, setStage] = useState<'pick' | 'questions' | 'draft'>('pick');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [content, setContent] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState('');
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!tool) { setStage('pick'); setQuestions([]); setAnswers({}); setContent(''); setBio(''); setProfileData(null); return; }
    const t = tool.type;
    if (t === 'profile') { setStage('questions'); setQuestions([{ id: 'bio', label: 'Tell me about yourself in 2-3 paragraphs (skills, projects, goals)' }]); return; }
    if (t === 'elig') {
      setStage('draft'); setBusy(true); setContent('');
      request<any>('/he/ai/eligibility', { method: 'POST', body: { programme_id: tool.programmeId } })
        .then((r) => setContent(r.content || '')).catch((e) => setContent(`Error: ${e.message}`)).finally(() => setBusy(false));
      return;
    }
    // SOP / CV / Cover / LOR — fetch questions first
    setBusy(true); setStage('questions');
    const path = t === 'sop' ? '/he/ai/sop' : t === 'cv' ? '/he/ai/cv' : t === 'cover' ? '/he/ai/cover-letter' : '/he/ai/lor-email';
    const body: any = {};
    if (tool.programmeId && t !== 'cv') body.programme_id = tool.programmeId;
    request<any>(path, { method: 'POST', body })
      .then((r) => setQuestions(r.questions || []))
      .catch((e) => setContent(`Error: ${e.message}`))
      .finally(() => setBusy(false));
  }, [tool]);

  const submit = async () => {
    if (!tool) return;
    if (tool.type === 'profile') {
      setBusy(true); setStage('draft');
      try {
        const r = await request<any>('/he/ai/profile-parse', { method: 'POST', body: { bio_text: bio } });
        setProfileData(r.profile);
      } catch (e: any) { setContent(`Error: ${e.message}`); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true); setStage('draft');
    try {
      const path = tool.type === 'sop' ? '/he/ai/sop'
                  : tool.type === 'cv' ? '/he/ai/cv'
                  : tool.type === 'cover' ? '/he/ai/cover-letter'
                  : '/he/ai/lor-email';
      const body: any = { answers };
      if (tool.type === 'lor') {
        body.prof_name = answers.prof_name || 'Professor';
        body.relationship = answers.relationship;
        body.outcome = answers.outcome;
      }
      if (tool.programmeId && tool.type !== 'cv') body.programme_id = tool.programmeId;
      const r = await request<any>(path, { method: 'POST', body });
      setContent(r.content || JSON.stringify(r, null, 2));
    } catch (e: any) { setContent(`Error: ${e.message}`); }
    finally { setBusy(false); }
  };

  if (!tool) return null;

  const titleByType: Record<ToolType, string> = {
    sop: '✨ Draft Statement of Purpose',
    cv: '📄 Build Graduate-School CV',
    cover: '✉️ Write Cover Letter',
    lor: '📨 LOR Request Email',
    elig: '🎯 Eligibility Check',
    profile: '👤 Build Profile from Bio',
  };

  return (
    <Modal visible={!!tool} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={[s.aiModal, { backgroundColor: colors.modalBg, borderColor: colors.modalBorder }]}>
          <View style={[s.modalHead, { borderBottomColor: colors.modalBorder }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>{titleByType[tool.type]}</Text>
            <Pressable onPress={onClose}><MaterialCommunityIcons name="close" size={20} color={colors.text2} /></Pressable>
          </View>

          {/* Tool switcher */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8, alignItems: 'center' }} style={{ flexGrow: 0 }}>
            {(['sop','cv','cover','lor','elig','profile'] as ToolType[]).map((t) => (
              <Pressable key={t}
                style={[
                  s.toolChip,
                  {
                    backgroundColor: tool.type === t ? activeTabColor : (isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9'),
                    borderColor: tool.type === t ? activeTabBorder : colors.cardBorder,
                  },
                ]}
                onPress={() => onSwitch({ type: t, programmeId: tool.programmeId })}
              >
                <Text style={[s.toolChipText, { color: tool.type === t ? '#fff' : colors.text2 }]}>
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {busy && <ActivityIndicator color={themeColor} size="large" style={{ marginVertical: 30 }} />}

            {tool.type === 'profile' && stage === 'questions' && !busy && (
              <View style={{ gap: 8 }}>
                <Text style={[s.aiLabel, { color: colors.text2 }]}>Paste your bio / about-me / LinkedIn summary:</Text>
                <TextInput
                  value={bio} onChangeText={setBio}
                  multiline numberOfLines={6}
                  placeholder="I'm a final-year CSE student at IIT Bombay with CGPA 8.6…"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={[s.aiInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText, minHeight: 140, textAlignVertical: 'top' }]}
                />
                <Pressable style={[s.aiSubmit, { backgroundColor: activeTabColor }]} onPress={submit} disabled={!bio.trim()}>
                  <Text style={s.aiSubmitText}>Parse Profile →</Text>
                </Pressable>
              </View>
            )}

            {tool.type !== 'profile' && tool.type !== 'elig' && stage === 'questions' && !busy && questions.length > 0 && (
              <View style={{ gap: 12 }}>
                {questions.map((q) => (
                  <View key={q.id} style={{ gap: 4 }}>
                    <Text style={[s.aiLabel, { color: colors.text2 }]}>{q.label}</Text>
                    <TextInput
                      value={answers[q.id] || ''}
                      onChangeText={(v) => setAnswers({ ...answers, [q.id]: v })}
                      multiline
                      placeholder="Type here…"
                      placeholderTextColor={colors.inputPlaceholder}
                      style={[s.aiInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText, minHeight: 70, textAlignVertical: 'top' }]}
                    />
                  </View>
                ))}
                <Pressable
                  style={[s.aiSubmit, { backgroundColor: activeTabColor, opacity: questions.every((q) => (answers[q.id] || '').trim()) ? 1 : 0.5 }]}
                  onPress={submit}
                  disabled={!questions.every((q) => (answers[q.id] || '').trim())}
                >
                  <Text style={s.aiSubmitText}>Generate ✨</Text>
                </Pressable>
              </View>
            )}

            {stage === 'draft' && !busy && (content || profileData) && (
              <View style={{ gap: 12 }}>
                {profileData ? (
                  <View style={[s.aiResult, { backgroundColor: colors.aiResultBg, borderColor: colors.cardBorder }]}>
                    <Text style={[s.aiResultTitle, { color: themeColor }]}>Parsed Profile</Text>
                    <Text style={[s.aiResultBody, { color: colors.text }]}>{JSON.stringify(profileData, null, 2)}</Text>
                  </View>
                ) : (
                  <View style={[s.aiResult, { backgroundColor: colors.aiResultBg, borderColor: colors.cardBorder }]}>
                    <Text style={[s.aiResultBody, { color: colors.text }]}>{content}</Text>
                  </View>
                )}
                <Text style={s.aiNote}>✓ Saved to your SA Drive — retrievable from the AI Tools menu.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  toolsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1,
  },
  toolsBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.40)', borderWidth: 1,
  },
  errText: { color: '#FCA5A5', fontSize: 12, flex: 1 },

  tabsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1,
  },
  tabActive: { backgroundColor: '#7C3AED', borderColor: '#A78BFA' },
  tabText: { fontSize: 12.5, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  sectionHead: { gap: 4, marginVertical: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
  sectionSub: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    flexGrow: 1, flexBasis: 300, maxWidth: 360,
    padding: 16, borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10.5, fontWeight: '800' },
  matchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  matchText: { fontSize: 11.5, fontWeight: '800' },

  cardTitle: { fontSize: 15, fontWeight: '800', marginTop: 4, fontFamily: 'Outfit_800ExtraBold' },
  cardSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  stat: {
    flexBasis: '47%', flexGrow: 1,
    padding: 10, borderRadius: 10,
    borderWidth: 1,
  },
  statValue: { fontSize: 13, fontWeight: '700' },
  statLabel: { fontSize: 10.5, marginTop: 2 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '700' },

  applyBtn: {
    paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#7C3AED', alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  detailsBtn: {
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, alignItems: 'center',
  },
  detailsBtnText: { fontSize: 12, fontWeight: '700' },

  draftBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1,
  },
  draftBtnText: { fontSize: 11, fontWeight: '700' },

  compareChk: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
    marginLeft: 'auto',
    borderWidth: 1,
  },
  compareChkActive: { borderColor: 'rgba(167,139,250,0.55)' },
  compareChkText: { fontSize: 11, fontWeight: '700' },

  // Sticky compare bar
  compareBar: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1,
    zIndex: 50,
  },
  compareText: { fontSize: 13, fontWeight: '700', flex: 1 },
  compareClear: { fontSize: 12 },
  compareCTA: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  compareCTAText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Modals
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.70)',
    alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 12, borderBottomWidth: 1,
  },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '800' },

  compareModal: {
    width: '100%', maxWidth: 1100, height: '90%',
    borderRadius: 16, padding: 16,
    borderWidth: 1,
  },
  tieNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, marginBottom: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A', borderWidth: 1,
  },
  tieNoteText: { fontSize: 12, flex: 1, fontWeight: '600' },

  compareRow: { flexDirection: 'row', borderBottomWidth: 1, minHeight: 50 },
  compareLabelCell: { width: 160, padding: 10, justifyContent: 'center' },
  compareLabel: { fontSize: 12, fontWeight: '700' },
  compareCell: { width: 200, padding: 10, justifyContent: 'center', borderLeftWidth: 1 },
  compareCellTitle: { fontSize: 13, fontWeight: '700' },
  compareCellSub: { fontSize: 11, marginTop: 2 },
  compareValue: { fontSize: 13, fontWeight: '600' },

  // AI modal
  aiModal: {
    width: '100%', maxWidth: 700, height: '90%',
    borderRadius: 16, padding: 16,
    borderWidth: 1,
  },
  toolChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1,
  },
  toolChipActive: { backgroundColor: '#7C3AED', borderColor: '#A78BFA' },
  toolChipText: { fontSize: 10.5, fontWeight: '800' },

  aiLabel: { fontSize: 12.5, fontWeight: '600' },
  aiInput: {
    fontSize: 13,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
    ...Platform.select({ web: { outlineWidth: 0 as any } as any, default: {} }),
  },
  aiSubmit: {
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#7C3AED', alignItems: 'center',
  },
  aiSubmitText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  aiResult: {
    padding: 14, borderRadius: 12,
    borderWidth: 1,
  },
  aiResultTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  aiResultBody: { fontSize: 13, lineHeight: 20 },
  aiNote: { color: '#10B981', fontSize: 11, fontStyle: 'italic' },

  // Confirm modal
  confirmModal: {
    width: '90%', maxWidth: 440,
    borderRadius: 16, padding: 20,
    borderWidth: 1,
    gap: 16,
  },
  confirmHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 12, borderBottomWidth: 1,
  },
  confirmTitle: { fontSize: 16, fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
  confirmBody: { gap: 8 },
  confirmText: { fontSize: 13.5, lineHeight: 20, fontFamily: 'PlusJakartaSans_500Medium' },
  boldText: { fontWeight: '700' },
  confirmSubtext: { fontSize: 12, lineHeight: 18, fontFamily: 'PlusJakartaSans_500Medium' },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700' },
  confirmBtn: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8,
    backgroundColor: '#7C3AED',
  },
  confirmBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
