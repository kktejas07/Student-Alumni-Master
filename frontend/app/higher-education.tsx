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
  View, Text, Pressable, ScrollView, ActivityIndicator,
  TextInput, Modal, Linking, Platform, Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FeaturePageShell, { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { request } from '@/src/models/services/api';

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

const C = {
  text: '#fff', text2: 'rgba(255,255,255,0.72)', text3: 'rgba(255,255,255,0.46)',
  border: 'rgba(255,255,255,0.10)', card: 'rgba(255,255,255,0.04)',
};

const fmtINR = (n: number) => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

const matchTier = (n: number) => {
  if (n >= 95) return { bg: 'rgba(16,185,129,0.15)', fg: '#34D399' };
  if (n >= 85) return { bg: 'rgba(34,211,238,0.15)', fg: '#67E8F9' };
  if (n >= 75) return { bg: 'rgba(167,139,250,0.15)', fg: '#C4B5FD' };
  return { bg: 'rgba(110,105,130,0.15)', fg: '#B7B3C6' };
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
  const user = useAuthStore((st) => st.user);
  const initialized = useAuthStore((st) => st.initialized);
  const { role, themeColor, activeTabColor, activeTabBorder } = useRoleTheme();
  const isEmbedded = React.useContext(EmbeddedShellContext);

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

  const filterScholarshipsByCountry = (countryId: string) => {
    setTab('scholarships');
  };

  return (
    <FeaturePageShell
      title="Higher Education"
      subtitle="AI-powered programme discovery + Application Tracker"
      heroEmoji=""
      accent={themeColor}
      rightSlot={
        <Pressable
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet bg-glass"
          style={{ backgroundColor: activeTabColor + '4d', borderColor: activeTabBorder + '8c' }}
          onPress={() => setAiTool({ type: 'profile' })}
        >
          <MaterialCommunityIcons name="auto-fix" size={14} color="#fff" />
          <Text className="text-text font-body-bold text-xs">AI Tools</Text>
        </Pressable>
      }
    >
      {error ? (
        <View className="flex-row items-center gap-2 p-3 rounded-xl bg-glass border border-glass-border">
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F87171" />
          <Text className="text-rose text-xs flex-1">{error}</Text>
        </View>
      ) : null}

      {/* Tabs */}
      <View className="flex-row gap-2">
        {([
          { id: 'programmes',  label: 'Programmes',  icon: 'school' as IconName },
          { id: 'scholarships',label: 'Funding', icon: 'medal' as IconName },
          { id: 'countries',   label: 'Countries',    icon: 'earth' as IconName },
        ] as const).map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-glass border border-glass-border"
              style={active && { backgroundColor: activeTabColor, borderColor: activeTabBorder }}
              onPress={() => setTab(t.id)}
            >
              <MaterialCommunityIcons name={t.icon} size={14} color={active ? '#fff' : C.text2} />
              <Text className={`text-xs font-body-semibold ${active ? 'text-text' : 'text-muted'}`}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View className="items-center py-16" style={{ paddingVertical: 60 }}>
          <ActivityIndicator color={themeColor} size="large" />
          <Text className="text-muted text-sm mt-2">Loading…</Text>
        </View>
      ) : (
        <>
          {tab === 'programmes' && (
            <>
              <View className="gap-1">
                <Text className="text-text font-display-bold text-lg">Recommended Programmes</Text>
                <Text className="text-dim text-xs">{programmes.length} options matched to your profile</Text>
              </View>
              <View className="flex-row flex-wrap gap-3.5">
                {programmes.map((p) => (
                  <ProgrammeCard
                    key={p.id} p={p}
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
              <View className="mt-4">
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
            <View className="flex-row flex-wrap gap-3.5">
              {scholarships.map((sch) => (
                <View key={sch.id} className="flex-1 p-4 rounded-2xl bg-glass border border-glass-border" style={{ minWidth: 300, maxWidth: 360, borderColor: '#10B98155' }}>
                  <View className="flex-1 gap-2.5">
                    <View className="flex-row justify-between">
                      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}>
                        <Text className="text-xs font-body-bold" style={{ color: '#34D399' }}>{sch.degree_levels.join('/')}</Text>
                      </View>
                      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(124,58,237,0.20)' }}>
                        <Text className="text-xs font-body-bold" style={{ color: '#C4B5FD' }}>{sch.country}</Text>
                      </View>
                    </View>
                    <Text className="text-text font-display-bold text-sm mt-1">{sch.name}</Text>
                    <Text className="text-muted text-xs">{sch.funder}</Text>
                    <View className="flex-row flex-wrap gap-2 mt-1">
                      <Stat label="Award" value={fmtINR(sch.award_inr)} good />
                      <Stat label="Coverage" value={sch.coverage.length > 22 ? sch.coverage.slice(0, 22) + '…' : sch.coverage} />
                      <Stat label="Deadline" value={new Date(sch.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} />
                      <Stat label="Eligibility" value={sch.eligibility.length > 22 ? sch.eligibility.slice(0, 22) + '…' : sch.eligibility} />
                    </View>
                  </View>
                  <Pressable className="py-2.5 rounded-xl items-center bg-teal mt-2" onPress={() => Linking.openURL(sch.url)}>
                    <Text className="text-text font-body-bold text-xs">Apply →</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {tab === 'countries' && (
            <View className="flex-row flex-wrap gap-3.5">
              {countries.map((c) => (
                <Pressable key={c.id} className="flex-1 p-4 rounded-2xl bg-glass border border-glass-border" style={{ minWidth: 300, maxWidth: 360, borderColor: '#06B6D455' }} onPress={() => { setTab('programmes'); }}>
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
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }}
                  />
                  <Text className="text-text font-display-bold text-sm mt-1">{c.name}</Text>
                  <View className="flex-row gap-3.5 mt-1 flex-wrap">
                    <Text className="text-muted text-xs">📚 {c.programmes} programmes</Text>
                    <Text className="text-muted text-xs">🎖️ {c.scholarships} funding options</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    <Stat label="Avg fee/yr" value={fmtINR(c.avg_fee_inr)} />
                    <Stat label="Avg living/yr" value={fmtINR(c.avg_living_inr)} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {/* Sticky compare bar */}
      {selectedIds.size >= 2 && (
        <View className="absolute bottom-4 left-4 right-4 flex-row items-center gap-3 px-3.5 py-3 bg-glass border border-glass-border z-50 rounded-2xl" style={{ borderColor: themeColor + '8c' }}>
          <MaterialCommunityIcons name="compare-horizontal" size={16} color="#fff" />
          <Text className="text-text font-body-bold text-xs flex-1">Compare {selectedIds.size} programmes</Text>
          <Pressable onPress={() => setSelectedIds(new Set())}>
            <Text className="text-dim text-xs">Clear</Text>
          </Pressable>
          <Pressable className="px-3.5 py-2 rounded-full" style={{ backgroundColor: activeTabColor }} onPress={() => setCompareOpen(true)}>
            <Text className="text-text font-body-bold text-xs">Compare →</Text>
          </Pressable>
        </View>
      )}

      {/* Compare modal */}
      <CompareModal
        visible={compareOpen}
        ids={Array.from(selectedIds)}
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
        <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.70)' }}>
          <View className="w-11/12 rounded-2xl p-5 gap-4 bg-glass border border-glass-border" style={{ maxWidth: 440, borderColor: activeTabColor + '4d' }}>
            <View className="flex-row items-center gap-2.5 pb-3 border-b border-glass-border">
              <MaterialCommunityIcons name="check-decagram" size={20} color="#34D399" />
              <Text className="text-text font-display-bold text-base">Application Status</Text>
            </View>

            <View className="gap-2">
              <Text className="text-text text-xs leading-5">
                Did you complete your application for <Text className="font-body-bold" style={{ color: themeColor }}>{confirmAfterRedirectProg?.name}</Text> at <Text className="font-body-bold" style={{ color: themeColor }}>{confirmAfterRedirectProg?.institution}</Text>?
              </Text>
              <Text className="text-muted text-xs leading-4">
                We opened the official university portal in a new tab. If you successfully completed and submitted the application, click "Yes, I Applied" to begin tracking.
              </Text>
            </View>

            <View className="flex-row justify-end gap-2.5">
              <Pressable
                className="py-2 px-3.5 rounded-lg bg-glass border border-glass-border"
                onPress={() => setConfirmAfterRedirectProg(null)}
              >
                <Text className="text-muted text-xs font-body-bold">No, Cancelled</Text>
              </Pressable>
              <Pressable
                className="py-2 px-3.5 rounded-lg"
                style={{ backgroundColor: activeTabColor }}
                onPress={() => {
                  if (confirmAfterRedirectProg) {
                    const p = confirmAfterRedirectProg;
                    setConfirmAfterRedirectProg(null);
                    executeApply(p);
                  }
                }}
              >
                <Text className="text-text font-body-bold text-xs">Yes, I Applied</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Tools modal */}
      <AIToolsModal
        tool={aiTool}
        onClose={() => setAiTool(null)}
        onSwitch={(t) => setAiTool(t)}
      />
    </FeaturePageShell>
  );
}

// ─── Programme Card ──────────────────────────────────────────────────────
function ProgrammeCard({
  p, selected, onCompareToggle, onApply, onDraftSOP, onDetails, onCoverLetter, appId,
}: {
  p: Programme; selected: boolean; onCompareToggle: () => void;
  onApply: () => void; onDraftSOP: () => void; onDetails: () => void; onCoverLetter: () => void;
  appId?: string;
}) {
  const router = useRouter();
  const { themeColor, activeTabColor } = useRoleTheme();
  const tier = matchTier(p.match);
  const tags = (p.tags || []).slice(0, 3);
  const overflow = (p.tags || []).length - tags.length;
  return (
    <View className="flex-1 p-4 rounded-2xl bg-glass border border-glass-border gap-2.5" style={{ minWidth: 300, maxWidth: 360, ...(selected && { borderColor: themeColor, borderWidth: 2 }) }}>
      <View className="flex-1 gap-2.5">
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-1.5">
            <View className="px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.20)' }}>
              <Text className="text-xs font-body-bold" style={{ color: '#93C5FD' }}>{p.degree}</Text>
            </View>
            <View className="px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.20)' }}>
              <Text className="text-xs font-body-bold" style={{ color: '#86EFAC' }}>{p.country}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: tier.bg }}>
            <MaterialCommunityIcons name="sparkles" size={11} color={tier.fg} />
            <Text className="text-xs font-body-bold" style={{ color: tier.fg }}>{p.match}% match</Text>
          </View>
        </View>
   
        <Text className="text-text font-display-bold text-sm mt-1" numberOfLines={2}>{p.name}</Text>
        <Text className="text-muted text-xs">{p.institution}</Text>
   
        <View className="flex-row flex-wrap gap-2 mt-1">
          <Stat label="Duration" value={p.duration} />
          <Stat label="Fee" value={p.fee} good={p.fee.toLowerCase().includes('funded') || p.fee_amount === 0} />
          <Stat label="Mode" value={p.mode} />
          <Stat label="Intake" value={p.intake} />
        </View>
   
        {tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5">
            {tags.map((t) => {
              const m = TAG_META[t]; if (!m) return null;
              return (
                <View key={t} className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full border" style={{ backgroundColor: m.color + '22', borderColor: m.color + '66' }}>
                  <MaterialCommunityIcons name={m.icon} size={10} color={m.color} />
                  <Text className="text-xs font-body-bold" style={{ color: m.color }}>{m.label}</Text>
                </View>
              );
            })}
            {overflow > 0 && (
              <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-glass-border" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <Text className="text-xs font-body-bold text-muted">+{overflow}</Text>
              </View>
            )}
          </View>
        )}
      </View>
 
      <View className="gap-1.5 mt-2">
        <View className="flex-row gap-2">
          {appId ? (
            <Pressable
              className="flex-1 py-2.5 rounded-xl items-center border"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', borderColor: '#34D399', borderWidth: 1 }}
              onPress={() => router.push(`/applications/${appId}` as any)}
            >
              <Text className="text-xs font-body-bold" style={{ color: '#34D399' }}>Applied ✓</Text>
            </Pressable>
          ) : (
            <Pressable className="flex-1 py-2.5 rounded-xl items-center" style={{ backgroundColor: activeTabColor }} onPress={onApply}>
              <Text className="text-text font-body-bold text-xs">Apply →</Text>
            </Pressable>
          )}
          <Pressable className="py-2.5 px-3.5 rounded-xl items-center bg-glass border border-glass-border" onPress={onDetails}>
            <Text className="text-muted text-xs font-body-bold">Eligibility</Text>
          </Pressable>
        </View>

        <View className="flex-row gap-2">
          <Pressable className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg border" style={{ backgroundColor: themeColor + '1a', borderColor: themeColor + '66' }} onPress={onDraftSOP}>
            <MaterialCommunityIcons name="file-document-edit" size={12} color={themeColor} />
            <Text className="text-xs font-body-bold" style={{ color: themeColor }}>Draft SOP</Text>
          </Pressable>
          <Pressable className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg border" style={{ backgroundColor: themeColor + '1a', borderColor: themeColor + '66' }} onPress={onCoverLetter}>
            <MaterialCommunityIcons name="email-edit" size={12} color={themeColor} />
            <Text className="text-xs font-body-bold" style={{ color: themeColor }}>Cover letter</Text>
          </Pressable>
          <Pressable className="flex-row items-center gap-1 px-2 py-1.5 rounded-lg ml-auto bg-glass border border-glass-border" style={selected && { borderColor: themeColor + '8c' }} onPress={onCompareToggle}>
            <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={14} color={selected ? themeColor : C.text3} />
            <Text className="text-xs font-body-bold text-dim" style={selected && { color: themeColor }}>Compare</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <View className="flex-1 p-2.5 rounded-xl bg-glass border border-glass-border" style={{ minWidth: '47%' }}>
      <Text className="text-text text-xs font-body-bold" style={good && { color: '#34D399' }}>{value}</Text>
      <Text className="text-dim text-xs mt-0.5">{label}</Text>
    </View>
  );
}

function CompareModal({ visible, ids, onClose, onApply, appliedAppMap }: {
  visible: boolean; ids: string[]; onClose: () => void; onApply: (p: Programme) => void;
  appliedAppMap: Record<string, string>;
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
      <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.70)' }}>
        <View className="w-full rounded-2xl p-4 bg-glass border border-glass-border" style={{ maxWidth: 1100, height: '90%' }}>
          <View className="flex-row items-center pb-3 border-b border-glass-border">
            <Text className="flex-1 text-text font-body-bold text-base">Compare {ids.length} Programmes</Text>
            <Pressable onPress={onClose}><MaterialCommunityIcons name="close" size={20} color={C.text2} /></Pressable>
          </View>
          {loading || !data ? (
            <ActivityIndicator color="#A78BFA" size="large" className="my-10" />
          ) : (
            <ScrollView className="flex-1">
              {data.tied && data.tie_breaker_note && (
                <View className="flex-row items-center gap-2 p-2.5 rounded-xl mb-2 bg-glass border border-glass-border" style={{ backgroundColor: 'rgba(252,211,77,0.10)', borderColor: 'rgba(252,211,77,0.40)' }}>
                  <MaterialCommunityIcons name="information" size={14} color="#FCD34D" />
                  <Text className="text-xs flex-1" style={{ color: '#FCD34D' }}>{data.tie_breaker_note}</Text>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View className="flex-row border-b border-glass-border min-h-12">
                    <View className="w-40 p-2.5 justify-center"><Text className="text-muted text-xs font-body-bold"> </Text></View>
                    {data.programmes.map((p) => (
                      <View key={p.id} className="w-50 p-2.5 justify-center border-l border-glass-border">
                        <Text className="text-text text-xs font-body-bold" numberOfLines={2}>{p.name}</Text>
                        <Text className="text-dim text-xs mt-0.5">{p.institution}</Text>
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
                      <View key={row.key} className="flex-row border-b border-glass-border min-h-12">
                        <View className="w-40 p-2.5 justify-center">
                          <Text className="text-muted text-xs font-body-bold">{row.label}</Text>
                        </View>
                        {data.programmes.map((p: any, i: number) => {
                          let v = p[row.key];
                          if (row.key.includes('inr')) v = fmtINR(Number(v));
                          else if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
                          else if (v == null) v = '—';
                          const tint = i === bestIdx ? '#34D399' : i === worstIdx && bestIdx !== worstIdx ? '#F87171' : C.text;
                          return (
                            <View key={i} className="w-50 p-2.5 justify-center border-l border-glass-border">
                              <Text className="text-xs font-body-semibold" style={{ color: tint }}>{String(v)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                  <View className="flex-row border-b border-glass-border min-h-12">
                    <View className="w-40" />
                    {data.programmes.map((p) => {
                      const appId = appliedAppMap[p.id];
                      return (
                        <View key={p.id} className="w-50 p-2.5 justify-center border-l border-glass-border">
                          {appId ? (
                            <Pressable
                              className="py-2.5 rounded-xl items-center border"
                              style={{ backgroundColor: 'rgba(52,211,153,0.15)', borderColor: '#34D399', borderWidth: 1 }}
                              onPress={() => {
                                onClose();
                                router.push(`/applications/${appId}` as any);
                              }}
                            >
                              <Text className="text-xs font-body-bold" style={{ color: '#34D399' }}>Applied ✓</Text>
                            </Pressable>
                          ) : (
                            <Pressable className="py-2.5 rounded-xl items-center" style={{ backgroundColor: activeTabColor }} onPress={() => onApply(p)}>
                              <Text className="text-text font-body-bold text-xs">Apply →</Text>
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
  tool, onClose, onSwitch,
}: { tool: { type: ToolType; programmeId?: string } | null; onClose: () => void; onSwitch: (t: any) => void }) {
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
      <View className="flex-1 items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.70)' }}>
        <View className="w-full rounded-2xl p-4 bg-glass border border-glass-border" style={{ maxWidth: 700, height: '90%' }}>
          <View className="flex-row items-center pb-3 border-b border-glass-border">
            <Text className="flex-1 text-text font-body-bold text-base">{titleByType[tool.type]}</Text>
            <Pressable onPress={onClose}><MaterialCommunityIcons name="close" size={20} color={C.text2} /></Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8, alignItems: 'center' }} style={{ flexGrow: 0 }}>
            {(['sop','cv','cover','lor','elig','profile'] as ToolType[]).map((t) => (
              <Pressable key={t}
                className="px-3 py-2 rounded-lg bg-glass border border-glass-border"
                style={tool.type === t && { backgroundColor: activeTabColor, borderColor: activeTabBorder }}
                onPress={() => onSwitch({ type: t, programmeId: tool.programmeId })}
              >
                <Text className="text-xs font-body-bold text-muted" style={tool.type === t && { color: '#fff' }}>
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
            {busy && <ActivityIndicator color={themeColor} size="large" className="my-7" />}

            {tool.type === 'profile' && stage === 'questions' && !busy && (
              <View className="gap-2">
                <Text className="text-muted text-xs font-body-semibold">Paste your bio / about-me / LinkedIn summary:</Text>
                <TextInput
                  value={bio} onChangeText={setBio}
                  multiline numberOfLines={6}
                  placeholder="I'm a final-year CSE student at IIT Bombay with CGPA 8.6…"
                  placeholderTextColor={C.text3}
                  className="text-text text-xs p-3 rounded-xl border border-glass-border bg-glass"
                  style={{ minHeight: 140, textAlignVertical: 'top' }}
                />
                <Pressable className="py-3 rounded-xl items-center bg-violet self-start px-4" onPress={submit} disabled={!bio.trim()}>
                  <Text className="text-text font-body-bold text-sm">Parse Profile →</Text>
                </Pressable>
              </View>
            )}

            {tool.type !== 'profile' && tool.type !== 'elig' && stage === 'questions' && !busy && questions.length > 0 && (
              <View className="gap-3">
                {questions.map((q) => (
                  <View key={q.id} className="gap-1">
                    <Text className="text-muted text-xs font-body-semibold">{q.label}</Text>
                    <TextInput
                      value={answers[q.id] || ''}
                      onChangeText={(v) => setAnswers({ ...answers, [q.id]: v })}
                      multiline
                      placeholder="Type here…"
                      placeholderTextColor={C.text3}
                      className="text-text text-xs p-3 rounded-xl border border-glass-border bg-glass"
                      style={{ minHeight: 70, textAlignVertical: 'top' }}
                    />
                  </View>
                ))}
                <Pressable
                  className="py-3 rounded-xl items-center bg-violet"
                  style={{ opacity: questions.every((q) => (answers[q.id] || '').trim()) ? 1 : 0.5 }}
                  onPress={submit}
                  disabled={!questions.every((q) => (answers[q.id] || '').trim())}
                >
                  <Text className="text-text font-body-bold text-sm">Generate ✨</Text>
                </Pressable>
              </View>
            )}

            {stage === 'draft' && !busy && (content || profileData) && (
              <View className="gap-3">
                {profileData ? (
                  <View className="p-3.5 rounded-xl bg-glass border border-glass-border">
                    <Text className="text-xs font-body-bold mb-2" style={{ color: '#A78BFA' }}>Parsed Profile</Text>
                    <Text className="text-text text-xs leading-5">{JSON.stringify(profileData, null, 2)}</Text>
                  </View>
                ) : (
                  <View className="p-3.5 rounded-xl bg-glass border border-glass-border">
                    <Text className="text-text text-xs leading-5">{content}</Text>
                  </View>
                )}
                <Text className="text-teal text-xs italic">✓ Saved to your SA Drive — retrievable from the AI Tools menu.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
