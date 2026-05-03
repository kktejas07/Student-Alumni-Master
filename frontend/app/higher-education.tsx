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
  TextInput, Modal, Linking, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
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

export default function HigherEducationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'programmes' | 'scholarships' | 'countries'>('programmes');
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [aiTool, setAiTool] = useState<null | { type: 'sop' | 'cv' | 'cover' | 'lor' | 'elig' | 'profile'; programmeId?: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, c] = await Promise.all([
        request<{ programmes: Programme[] }>('/he/programmes'),
        request<{ scholarships: Scholarship[] }>('/he/scholarships'),
        request<{ countries: Country[] }>('/he/countries'),
      ]);
      setProgrammes(p.programmes || []);
      setScholarships(s.scholarships || []);
      setCountries(c.countries || []);
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

  const onApply = async (p: Programme) => {
    try {
      const r = await request<any>('/he/apply', { method: 'POST', body: { programme_id: p.id } });
      if (r?.apply_url) {
        if (Platform.OS === 'web') (window as any).open(r.apply_url, '_blank', 'noopener,noreferrer');
        else await Linking.openURL(r.apply_url);
      }
      const aid = r?.application?.app_id;
      if (aid) router.push(`/applications/${aid}` as any);
    } catch (e: any) { setError(e?.message || 'Apply failed'); }
  };

  const filterScholarshipsByCountry = (countryId: string) => {
    setTab('scholarships');
  };

  return (
    <FeaturePageShell
      title="Higher Education"
      subtitle="AI-powered programme discovery + Application Tracker"
      heroEmoji="🎓"
      accent="#7C3AED"
      rightSlot={
        <Pressable
          style={s.toolsBtn}
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
          { id: 'scholarships',label: 'Scholarships', icon: 'medal' as IconName },
          { id: 'countries',   label: 'Countries',    icon: 'earth' as IconName },
        ] as const).map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <MaterialCommunityIcons name={t.icon} size={14} color={active ? '#fff' : C.text2} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color="#A78BFA" size="large" />
          <Text style={{ color: C.text2, marginTop: 10 }}>Loading…</Text>
        </View>
      ) : (
        <>
          {tab === 'programmes' && (
            <>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>Recommended Programmes</Text>
                <Text style={s.sectionSub}>{programmes.length} options matched to your profile</Text>
              </View>
              <View style={s.grid}>
                {programmes.map((p) => (
                  <ProgrammeCard
                    key={p.id} p={p}
                    selected={selectedIds.has(p.id)}
                    onCompareToggle={() => toggleCompare(p.id)}
                    onApply={() => onApply(p)}
                    onDraftSOP={() => setAiTool({ type: 'sop', programmeId: p.id })}
                    onDetails={() => setAiTool({ type: 'elig', programmeId: p.id })}
                    onCoverLetter={() => setAiTool({ type: 'cover', programmeId: p.id })}
                  />
                ))}
              </View>

              {/* AdvisorAIBlock */}
              <View style={{ marginTop: 18 }}>
                <AdvisorAIBlock
                  context="higher-education"
                  advisorTitle="Talk to a Higher-Ed Advisor"
                  advisorDesc="Need 1-on-1 guidance on programmes, visas, or scholarships? Connect with our advisors."
                  aiTitle="Ask the Higher-Ed AI"
                  aiDesc="Eligibility, fees, scholarships, SOP/CV — ask anything 24×7."
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
                <View key={sch.id} style={[s.card, { borderColor: '#10B98155' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={[s.pill, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                      <Text style={[s.pillText, { color: '#34D399' }]}>{sch.degree_levels.join('/')}</Text>
                    </View>
                    <View style={[s.pill, { backgroundColor: 'rgba(124,58,237,0.20)' }]}>
                      <Text style={[s.pillText, { color: '#C4B5FD' }]}>{sch.country}</Text>
                    </View>
                  </View>
                  <Text style={s.cardTitle}>{sch.name}</Text>
                  <Text style={s.cardSub}>{sch.funder}</Text>
                  <View style={s.statsGrid}>
                    <Stat label="Award" value={fmtINR(sch.award_inr)} good />
                    <Stat label="Coverage" value={sch.coverage.length > 22 ? sch.coverage.slice(0, 22) + '…' : sch.coverage} />
                    <Stat label="Deadline" value={new Date(sch.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })} />
                    <Stat label="Eligibility" value={sch.eligibility.length > 22 ? sch.eligibility.slice(0, 22) + '…' : sch.eligibility} />
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
                <Pressable key={c.id} style={[s.card, { borderColor: '#06B6D455' }]} onPress={() => { setTab('programmes'); }}>
                  <Text style={{ fontSize: 36 }}>{c.flag}</Text>
                  <Text style={s.cardTitle}>{c.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                    <Text style={s.cardSub}>📚 {c.programmes} programmes</Text>
                    <Text style={s.cardSub}>🎖️ {c.scholarships} scholarships</Text>
                  </View>
                  <View style={s.statsGrid}>
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
        <View style={s.compareBar}>
          <MaterialCommunityIcons name="compare-horizontal" size={16} color="#fff" />
          <Text style={s.compareText}>Compare {selectedIds.size} programmes</Text>
          <Pressable onPress={() => setSelectedIds(new Set())}>
            <Text style={s.compareClear}>Clear</Text>
          </Pressable>
          <Pressable style={s.compareCTA} onPress={() => setCompareOpen(true)}>
            <Text style={s.compareCTAText}>Compare →</Text>
          </Pressable>
        </View>
      )}

      {/* Compare modal */}
      <CompareModal
        visible={compareOpen}
        ids={Array.from(selectedIds)}
        onClose={() => setCompareOpen(false)}
        onApply={onApply}
      />

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
  p, selected, onCompareToggle, onApply, onDraftSOP, onDetails, onCoverLetter,
}: {
  p: Programme; selected: boolean; onCompareToggle: () => void;
  onApply: () => void; onDraftSOP: () => void; onDetails: () => void; onCoverLetter: () => void;
}) {
  const tier = matchTier(p.match);
  const tags = (p.tags || []).slice(0, 3);
  const overflow = (p.tags || []).length - tags.length;
  return (
    <View style={[s.card, selected && { borderColor: '#A78BFA', borderWidth: 2 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={[s.pill, { backgroundColor: 'rgba(59,130,246,0.20)' }]}>
            <Text style={[s.pillText, { color: '#93C5FD' }]}>{p.degree}</Text>
          </View>
          <View style={[s.pill, { backgroundColor: 'rgba(16,185,129,0.20)' }]}>
            <Text style={[s.pillText, { color: '#86EFAC' }]}>{p.country}</Text>
          </View>
        </View>
        <View style={[s.matchPill, { backgroundColor: tier.bg }]}>
          <MaterialCommunityIcons name="sparkles" size={11} color={tier.fg} />
          <Text style={[s.matchText, { color: tier.fg }]}>{p.match}% match</Text>
        </View>
      </View>

      <Text style={s.cardTitle} numberOfLines={2}>{p.name}</Text>
      <Text style={s.cardSub}>{p.institution}</Text>

      <View style={s.statsGrid}>
        <Stat label="Duration" value={p.duration} />
        <Stat label="Fee" value={p.fee} good={p.fee.toLowerCase().includes('funded') || p.fee_amount === 0} />
        <Stat label="Mode" value={p.mode} />
        <Stat label="Intake" value={p.intake} />
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
            <View style={[s.tagPill, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: C.border }]}>
              <Text style={[s.tagText, { color: C.text2 }]}>+{overflow}</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Pressable style={[s.applyBtn, { flex: 1 }]} onPress={onApply}>
          <Text style={s.applyBtnText}>Apply →</Text>
        </Pressable>
        <Pressable style={s.detailsBtn} onPress={onDetails}>
          <Text style={s.detailsBtnText}>Eligibility</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        <Pressable style={s.draftBtn} onPress={onDraftSOP}>
          <MaterialCommunityIcons name="file-document-edit" size={12} color="#A78BFA" />
          <Text style={s.draftBtnText}>Draft SOP</Text>
        </Pressable>
        <Pressable style={s.draftBtn} onPress={onCoverLetter}>
          <MaterialCommunityIcons name="email-edit" size={12} color="#A78BFA" />
          <Text style={s.draftBtnText}>Cover letter</Text>
        </Pressable>
        <Pressable style={[s.compareChk, selected && s.compareChkActive]} onPress={onCompareToggle}>
          <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={14} color={selected ? '#A78BFA' : C.text3} />
          <Text style={[s.compareChkText, selected && { color: '#A78BFA' }]}>Compare</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, good && { color: '#34D399' }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Compare Modal ───────────────────────────────────────────────────────
function CompareModal({ visible, ids, onClose, onApply }: {
  visible: boolean; ids: string[]; onClose: () => void; onApply: (p: Programme) => void;
}) {
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
        <View style={s.compareModal}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Compare {ids.length} Programmes</Text>
            <Pressable onPress={onClose}><MaterialCommunityIcons name="close" size={20} color={C.text2} /></Pressable>
          </View>
          {loading || !data ? (
            <ActivityIndicator color="#A78BFA" size="large" style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={{ flex: 1 }}>
              {data.tied && data.tie_breaker_note && (
                <View style={s.tieNote}>
                  <MaterialCommunityIcons name="information" size={14} color="#FCD34D" />
                  <Text style={s.tieNoteText}>{data.tie_breaker_note}</Text>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {/* Header row */}
                  <View style={s.compareRow}>
                    <View style={s.compareLabelCell}><Text style={s.compareLabel}> </Text></View>
                    {data.programmes.map((p) => (
                      <View key={p.id} style={s.compareCell}>
                        <Text style={s.compareCellTitle} numberOfLines={2}>{p.name}</Text>
                        <Text style={s.compareCellSub}>{p.institution}</Text>
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
                      <View key={row.key} style={s.compareRow}>
                        <View style={s.compareLabelCell}>
                          <Text style={s.compareLabel}>{row.label}</Text>
                        </View>
                        {data.programmes.map((p: any, i: number) => {
                          let v = p[row.key];
                          if (row.key.includes('inr')) v = fmtINR(Number(v));
                          else if (typeof v === 'boolean') v = v ? 'Yes' : 'No';
                          else if (v == null) v = '—';
                          const tint = i === bestIdx ? '#34D399' : i === worstIdx && bestIdx !== worstIdx ? '#F87171' : C.text;
                          return (
                            <View key={i} style={s.compareCell}>
                              <Text style={[s.compareValue, { color: tint }]}>{String(v)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                  {/* Apply row */}
                  <View style={s.compareRow}>
                    <View style={s.compareLabelCell} />
                    {data.programmes.map((p) => (
                      <View key={p.id} style={s.compareCell}>
                        <Pressable style={s.applyBtn} onPress={() => onApply(p)}>
                          <Text style={s.applyBtnText}>Apply →</Text>
                        </Pressable>
                      </View>
                    ))}
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
        <View style={s.aiModal}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>{titleByType[tool.type]}</Text>
            <Pressable onPress={onClose}><MaterialCommunityIcons name="close" size={20} color={C.text2} /></Pressable>
          </View>

          {/* Tool switcher */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
            {(['sop','cv','cover','lor','elig','profile'] as ToolType[]).map((t) => (
              <Pressable key={t}
                style={[s.toolChip, tool.type === t && s.toolChipActive]}
                onPress={() => onSwitch({ type: t, programmeId: tool.programmeId })}
              >
                <Text style={[s.toolChipText, tool.type === t && { color: '#fff' }]}>
                  {t.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
            {busy && <ActivityIndicator color="#A78BFA" size="large" style={{ marginVertical: 30 }} />}

            {tool.type === 'profile' && stage === 'questions' && !busy && (
              <View style={{ gap: 8 }}>
                <Text style={s.aiLabel}>Paste your bio / about-me / LinkedIn summary:</Text>
                <TextInput
                  value={bio} onChangeText={setBio}
                  multiline numberOfLines={6}
                  placeholder="I'm a final-year CSE student at IIT Bombay with CGPA 8.6…"
                  placeholderTextColor={C.text3}
                  style={[s.aiInput, { minHeight: 140, textAlignVertical: 'top' }]}
                />
                <Pressable style={s.aiSubmit} onPress={submit} disabled={!bio.trim()}>
                  <Text style={s.aiSubmitText}>Parse Profile →</Text>
                </Pressable>
              </View>
            )}

            {tool.type !== 'profile' && tool.type !== 'elig' && stage === 'questions' && !busy && questions.length > 0 && (
              <View style={{ gap: 12 }}>
                {questions.map((q) => (
                  <View key={q.id} style={{ gap: 4 }}>
                    <Text style={s.aiLabel}>{q.label}</Text>
                    <TextInput
                      value={answers[q.id] || ''}
                      onChangeText={(v) => setAnswers({ ...answers, [q.id]: v })}
                      multiline
                      placeholder="Type here…"
                      placeholderTextColor={C.text3}
                      style={[s.aiInput, { minHeight: 70, textAlignVertical: 'top' }]}
                    />
                  </View>
                ))}
                <Pressable
                  style={[s.aiSubmit, { opacity: questions.every((q) => (answers[q.id] || '').trim()) ? 1 : 0.5 }]}
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
                  <View style={s.aiResult}>
                    <Text style={s.aiResultTitle}>Parsed Profile</Text>
                    <Text style={s.aiResultBody}>{JSON.stringify(profileData, null, 2)}</Text>
                  </View>
                ) : (
                  <View style={s.aiResult}>
                    <Text style={s.aiResultBody}>{content}</Text>
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
    backgroundColor: 'rgba(124,58,237,0.30)',
    borderColor: 'rgba(167,139,250,0.55)', borderWidth: 1,
  },
  toolsBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  errBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.40)', borderWidth: 1,
  },
  errText: { color: '#FCA5A5', fontSize: 12, flex: 1 },

  tabsRow: { flexDirection: 'row', gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: C.card,
    borderColor: C.border, borderWidth: 1,
  },
  tabActive: { backgroundColor: '#7C3AED', borderColor: '#A78BFA' },
  tabText: { color: C.text2, fontSize: 12.5, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  sectionHead: { gap: 4 },
  sectionTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sectionSub: { color: C.text3, fontSize: 12.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: {
    flexGrow: 1, flexBasis: 280, maxWidth: 380,
    padding: 16, borderRadius: 16,
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    gap: 10,
  },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10.5, fontWeight: '800' },
  matchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  matchText: { fontSize: 11.5, fontWeight: '800' },

  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 4 },
  cardSub: { color: C.text2, fontSize: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  stat: {
    flexBasis: '47%', flexGrow: 1,
    padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: C.border, borderWidth: 1,
  },
  statValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
  statLabel: { color: C.text3, fontSize: 10.5, marginTop: 2 },

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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: C.border, borderWidth: 1, alignItems: 'center',
  },
  detailsBtnText: { color: C.text2, fontSize: 12, fontWeight: '700' },

  draftBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1,
  },
  draftBtnText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },

  compareChk: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1,
  },
  compareChkActive: { borderColor: 'rgba(167,139,250,0.55)' },
  compareChkText: { color: C.text3, fontSize: 11, fontWeight: '700' },

  // Sticky compare bar
  compareBar: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    backgroundColor: '#1A1626',
    borderColor: 'rgba(167,139,250,0.55)', borderWidth: 1,
    zIndex: 50,
  },
  compareText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },
  compareClear: { color: C.text3, fontSize: 12 },
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
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800' },

  compareModal: {
    width: '100%', maxWidth: 1100, height: '90%',
    backgroundColor: '#1A1626', borderRadius: 16, padding: 16,
    borderColor: C.border, borderWidth: 1,
  },
  tieNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, marginBottom: 8,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1,
  },
  tieNoteText: { color: '#FCD34D', fontSize: 12, flex: 1 },

  compareRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, minHeight: 50 },
  compareLabelCell: { width: 160, padding: 10, justifyContent: 'center' },
  compareLabel: { color: C.text2, fontSize: 12, fontWeight: '700' },
  compareCell: { width: 200, padding: 10, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: C.border },
  compareCellTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  compareCellSub: { color: C.text3, fontSize: 11, marginTop: 2 },
  compareValue: { fontSize: 13, fontWeight: '600' },

  // AI modal
  aiModal: {
    width: '100%', maxWidth: 700, height: '90%',
    backgroundColor: '#1A1626', borderRadius: 16, padding: 16,
    borderColor: C.border, borderWidth: 1,
  },
  toolChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1,
  },
  toolChipActive: { backgroundColor: '#7C3AED', borderColor: '#A78BFA' },
  toolChipText: { color: C.text2, fontSize: 10.5, fontWeight: '800' },

  aiLabel: { color: C.text2, fontSize: 12.5, fontWeight: '600' },
  aiInput: {
    color: '#fff', fontSize: 13,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: 'rgba(0,0,0,0.20)',
    ...Platform.select({ web: { outlineWidth: 0 as any } as any, default: {} }),
  },
  aiSubmit: {
    paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#7C3AED', alignItems: 'center',
  },
  aiSubmitText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  aiResult: {
    padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderColor: C.border, borderWidth: 1,
  },
  aiResultTitle: { color: '#A78BFA', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  aiResultBody: { color: '#fff', fontSize: 13, lineHeight: 20 },
  aiNote: { color: '#34D399', fontSize: 11, fontStyle: 'italic' },
});
