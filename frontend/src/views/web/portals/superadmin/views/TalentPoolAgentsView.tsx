// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Modal } from 'react-native';
import {
  LayoutDashboard, Copy, Lightbulb, Briefcase, Trophy, Gauge, Clock, CalendarCheck,
  RefreshCw, Play, X, Plus, Minus, CheckCircle, AlertTriangle, Target, Sparkles, Network,
  ArrowRight, Search, Mail, FileText,
} from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { Badge, KpiCard } from '../atoms';
import { getPortal, postPortal } from '@/src/lib/portalApi';
import { useToast, Toast } from '../applekit';

/**
 * Talent Pool — AI Agents & Open-Source Expansion dashboard (TP15–TP32).
 *
 * Copy is reconciled to the actual backend stack: an in-process asyncio
 * scheduler (not celery/redis), fastembed ONNX MiniLM + numpy cosine
 * (not faiss/sentence-transformers), sklearn LogisticRegression, RapidFuzz /
 * RecordLinkage dedup, Jinja2 drips, httpx spiders (not scrapy), Fernet DPDP
 * PII, W3C Activity Stream, msal / Google Calendar.
 */

const API = '/admin/talent-pool';

const GROUPS: { key: string; label: string; blurb: string }[] = [
  { key: 'core', label: 'Core Ingestion', blurb: 'Enrichment + resume parsing feed the pool' },
  { key: 'intelligence', label: 'Intelligence', blurb: 'Matching, ranking, dedup, outreach, taxonomy' },
  { key: 'ops', label: 'Operations', blurb: 'House scheduler that drives every cadence' },
  { key: 'data-quality', label: 'Data Quality', blurb: 'Deterministic 100-pt rubric + needs-attention queue' },
  { key: 'compliance', label: 'Compliance', blurb: 'DPDP consent, PII encryption, activity audit' },
  { key: 'infrastructure', label: 'Infrastructure', blurb: 'Weekly insights & analytics rollups' },
  { key: 'integrations', label: 'Integrations', blurb: 'Job boards, WhatsApp, ATS/CRM, calendars' },
];

const OSS_STACK: { layer: string; tech: string; used: string }[] = [
  { layer: 'Scheduling', tech: 'In-process asyncio runner', used: '30-min self-gating run(db) loop driving all 16 agents' },
  { layer: 'Semantic match', tech: 'fastembed ONNX MiniLM + numpy cosine', used: 'Candidate ↔ opening vectors; no faiss dependency' },
  { layer: 'Ranking model', tech: 'scikit-learn LogisticRegression', used: 'Retrained from interview Selected/Rejected labels' },
  { layer: 'Dedup / entity', tech: 'RapidFuzz + RecordLinkage', used: 'Blocking + fuzzy resolution into open groups' },
  { layer: 'Outreach copy', tech: 'Jinja2 templates', used: 'Personalised drip sequences per stage' },
  { layer: 'Job boards', tech: 'httpx spiders', used: 'Naukri / Internshala scraping; not scrapy' },
  { layer: 'PII / DPDP', tech: 'Fernet (AES-CBC + HMAC)', used: 'Encrypted contact fields + right-to-erasure' },
  { layer: 'Audit', tech: 'W3C Activity Stream', used: 'Unified candidate communication timeline' },
  { layer: 'Calendars', tech: 'msal (M365) + Google Calendar API', used: 'Interview scheduling & two-way sync' },
  { layer: 'Resume parse', tech: 'spaCy NER + regex fallbacks', used: 'Structured extraction, degrades gracefully' },
];

function fmtDT(v?: string | null): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return v;
  }
}

function qualityColor(score: number): { bg: string; bc: string; c: string } {
  if (score >= 80) return { bg: 'rgba(16,185,129,0.15)', bc: 'rgba(16,185,129,0.3)', c: '#34D399' };
  if (score >= 30) return { bg: 'rgba(245,158,11,0.15)', bc: 'rgba(245,158,11,0.3)', c: '#F59E0B' };
  return { bg: 'rgba(239,68,68,0.15)', bc: 'rgba(239,68,68,0.35)', c: '#F87171' };
}

type Tab = 'overview' | 'duplicates' | 'insights' | 'external-jobs' | 'ranker' | 'quality' | 'activity' | 'interviews';
const TABS: { key: Tab; label: string; Icon: any }[] = [
  { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { key: 'duplicates', label: 'Duplicates', Icon: Copy },
  { key: 'insights', label: 'Insights', Icon: Lightbulb },
  { key: 'external-jobs', label: 'External Jobs', Icon: Briefcase },
  { key: 'ranker', label: 'Ranker', Icon: Trophy },
  { key: 'quality', label: 'Quality', Icon: Gauge },
  { key: 'activity', label: 'Activity', Icon: Clock },
  { key: 'interviews', label: 'Interviews', Icon: CalendarCheck },
];

export function TalentPoolAgentsView() {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const { toast, flash, hide } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ── Overview (KPIs + pipeline + agent groups) ─────────────────────────────
  const [ovLoading, setOvLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [quality, setQuality] = useState<any>(null);
  const [dupOpen, setDupOpen] = useState(0);
  const [deadlines, setDeadlines] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);

  // ── Duplicates ────────────────────────────────────────────────────────────
  const [dupLoading, setDupLoading] = useState(false);
  const [dupGroups, setDupGroups] = useState<any[]>([]);
  const [rescanning, setRescanning] = useState(false);
  const [rescanResult, setRescanResult] = useState<any>(null);
  const [mergeGroup, setMergeGroup] = useState<any>(null);
  const [keepRef, setKeepRef] = useState<string>('');
  const [merging, setMerging] = useState(false);

  // ── Insights ──────────────────────────────────────────────────────────────
  const [insLoading, setInsLoading] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  // ── External jobs ─────────────────────────────────────────────────────────
  const [extLoading, setExtLoading] = useState(false);
  const [listings, setListings] = useState<any[]>([]);
  const [extDeadlines, setExtDeadlines] = useState<any>(null);
  const [fetchQuery, setFetchQuery] = useState('');
  const [fetching, setFetching] = useState(false);

  // ── Ranker ────────────────────────────────────────────────────────────────
  const [rkTitle, setRkTitle] = useState('');
  const [rkSkills, setRkSkills] = useState('');
  const [rkMinExp, setRkMinExp] = useState('');
  const [rkMaxExp, setRkMaxExp] = useState('');
  const [rkK, setRkK] = useState(20);
  const [ranking, setRanking] = useState(false);
  const [rankResult, setRankResult] = useState<any>(null);
  const [retraining, setRetraining] = useState(false);

  // ── Quality ───────────────────────────────────────────────────────────────
  const [qLoading, setQLoading] = useState(false);
  const [qReport, setQReport] = useState<any>(null);
  const [qRunning, setQRunning] = useState(false);
  const [scoreNowId, setScoreNowId] = useState('');
  const [scoreNowBusy, setScoreNowBusy] = useState(false);

  // ── Activity ──────────────────────────────────────────────────────────────
  const [aLoading, setALoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [aProfileId, setAProfileId] = useState('');
  const [aAction, setAAction] = useState('');
  const [noteProfileId, setNoteProfileId] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  // ── Interviews ────────────────────────────────────────────────────────────
  const [iLoading, setILoading] = useState(false);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [schedFor, setSchedFor] = useState<any>(null);
  const [schedOpen, setSchedOpen] = useState(false);
  const [iStart, setIStart] = useState('');
  const [iDur, setIDur] = useState(45);
  const [iOrganizer, setIOrganizer] = useState('');
  const [iInvitee, setIInvitee] = useState('');
  const [iLoc, setILoc] = useState('');
  const [iSummary, setISummary] = useState('');
  const [iCal, setICal] = useState('auto');
  const [iBusy, setIBusy] = useState(false);
  const [fbFor, setFbFor] = useState<any>(null);
  const [fbDecision, setFbDecision] = useState('Pending');
  const [fbNotes, setFbNotes] = useState('');
  const [fbRating, setFbRating] = useState<string>('');
  const [fbBusy, setFbBusy] = useState(false);

  // ── loaders ───────────────────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    const [st, qu, du, dl, ag] = await Promise.all([
      getPortal(`${API}/stats/summary`).catch(() => null),
      getPortal(`${API}/quality/report`).catch(() => null),
      getPortal(`${API}/duplicates`).catch(() => null),
      getPortal(`${API}/external-jobs/deadlines?days=7`).catch(() => null),
      getPortal(`${API}/agents/status`).catch(() => null),
    ]);
    setStats(st);
    setQuality(qu);
    setDupOpen(du?.open_groups ?? 0);
    setDeadlines(dl);
    setAgentStatus(ag);
    setOvLoading(false);
  }, []);

  const loadDuplicates = useCallback(async () => {
    setDupLoading(true);
    try {
      const r = await getPortal(`${API}/duplicates`);
      setDupGroups(r?.groups ?? []);
    } catch (e: any) {
      flash?.(e?.message || 'Failed to load duplicates', 'error');
    } finally {
      setDupLoading(false);
    }
  }, []);

  const rescan = async () => {
    setRescanning(true);
    setRescanResult(null);
    try {
      const r = await postPortal(`${API}/duplicates/rescan`, {});
      setRescanResult(r);
      setDupGroups(r?.groups ?? []);
      flash?.(`Rescan complete: ${r?.groups_found ?? 0} groups across ${r?.pairs_checked ?? 0} pairs`);
    } catch (e: any) {
      flash?.(e?.message || 'Rescan failed', 'error');
    } finally {
      setRescanning(false);
    }
  };

  const openMerge = (g: any) => {
    const first = g?.members?.[0];
    setMergeGroup(g);
    setKeepRef(first ? `${first.collection}:${first.id}` : '');
  };

  const doMerge = async () => {
    if (!mergeGroup || !keepRef) return;
    setMerging(true);
    try {
      const drop_refs = (mergeGroup.members || [])
        .filter((m: any) => `${m.collection}:${m.id}` !== keepRef)
        .map((m: any) => `${m.collection}:${m.id}`);
      const reasons = mergeGroup.reasons?.length ? mergeGroup.reasons.join('; ') : 'admin merge';
      await postPortal(`${API}/duplicates/merge`, {
        group_id: mergeGroup.group_id, keep_ref: keepRef, drop_refs, reasons,
      });
      flash?.('Merged duplicates into keeper');
      setMergeGroup(null);
      setKeepRef('');
      loadDuplicates();
    } catch (e: any) {
      flash?.(e?.message || 'Merge failed', 'error');
    } finally {
      setMerging(false);
    }
  };

  const loadInsights = useCallback(async () => {
    setInsLoading(true);
    try {
      const r = await getPortal(`${API}/insights?limit=8`);
      setInsights(r?.insights ?? []);
    } catch (e: any) {
      flash?.(e?.message || 'Failed to load insights', 'error');
    } finally {
      setInsLoading(false);
    }
  }, []);

  const generateInsight = async () => {
    setGenerating(true);
    try {
      const r = await postPortal(`${API}/insights/generate`, {});
      flash?.(`Insights generated for ${r?.week_start ?? 'current week'}`);
      loadInsights();
    } catch (e: any) {
      flash?.(e?.message || 'Generate failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const loadExternal = useCallback(async () => {
    setExtLoading(true);
    try {
      const [lj, dl] = await Promise.all([
        getPortal(`${API}/external-jobs?limit=50`).catch(() => null),
        getPortal(`${API}/external-jobs/deadlines?days=7`).catch(() => null),
      ]);
      setListings(lj?.listings ?? []);
      setExtDeadlines(dl);
    } catch (e: any) {
      flash?.(e?.message || 'Failed to load external jobs', 'error');
    } finally {
      setExtLoading(false);
    }
  }, []);

  const fetchJobs = async () => {
    setFetching(true);
    try {
      const r = await postPortal(`${API}/external-jobs/fetch?query=${encodeURIComponent(fetchQuery)}&limit=50`, {});
      setListings(r?.listings ?? []);
      flash?.(`Fetched ${r?.listings?.length ?? 0} listings`);
    } catch (e: any) {
      flash?.(e?.message || 'Fetch failed', 'error');
    } finally {
      setFetching(false);
    }
  };

  const runRanker = async () => {
    setRanking(true);
    try {
      const qs = new URLSearchParams();
      if (rkTitle) qs.set('title', rkTitle);
      if (rkSkills) qs.set('skills', rkSkills);
      if (rkMinExp) qs.set('min_experience', rkMinExp);
      if (rkMaxExp) qs.set('max_experience', rkMaxExp);
      qs.set('k', String(rkK));
      const r = await getPortal(`${API}/ranker?${qs.toString()}`);
      setRankResult(r);
    } catch (e: any) {
      flash?.(e?.message || 'Ranker failed', 'error');
    } finally {
      setRanking(false);
    }
  };

  const retrain = async () => {
    setRetraining(true);
    try {
      const r = await postPortal(`${API}/ranker/retrain`, {});
      flash?.(r?.trained ? `Retrained model (${r?.label_count ?? 0} labels)` : 'Not enough labels yet — feed interview decisions first');
    } catch (e: any) {
      flash?.(e?.message || 'Retrain failed', 'error');
    } finally {
      setRetraining(false);
    }
  };

  const loadQuality = useCallback(async () => {
    setQLoading(true);
    try {
      setQReport(await getPortal(`${API}/quality/report`));
    } catch (e: any) {
      flash?.(e?.message || 'Failed to load quality report', 'error');
    } finally {
      setQLoading(false);
    }
  }, []);

  const runQuality = async () => {
    setQRunning(true);
    try {
      const r = await postPortal(`${API}/quality/run`, {});
      flash?.(`Scored ${r?.scored ?? 0} profiles, ${r?.changed ?? 0} changed, ${r?.needs_attention ?? 0} need attention`);
      loadQuality();
    } catch (e: any) {
      flash?.(e?.message || 'Quality run failed', 'error');
    } finally {
      setQRunning(false);
    }
  };

  const scoreNow = async () => {
    if (!scoreNowId) return;
    setScoreNowBusy(true);
    try {
      const r = await postPortal(`${API}/quality/score-now`, { profile_id: scoreNowId });
      flash?.(r?.score != null ? `Scored ${r.score} (missing: ${r?.missing?.join(', ') || 'none'})` : 'Profile not found');
      loadQuality();
    } catch (e: any) {
      flash?.(e?.message || 'Score-now failed', 'error');
    } finally {
      setScoreNowBusy(false);
    }
  };

  const loadActivity = useCallback(async () => {
    setALoading(true);
    try {
      const qs = new URLSearchParams();
      if (aProfileId) qs.set('profile_id', aProfileId);
      if (aAction) qs.set('action', aAction);
      qs.set('limit', '80');
      const r = await getPortal(`${API}/activity?${qs.toString()}`);
      setEvents(r?.events ?? []);
    } catch (e: any) {
      flash?.(e?.message || 'Failed to load activity', 'error');
    } finally {
      setALoading(false);
    }
  }, []);

  const addNote = async () => {
    if (!noteProfileId || !noteText.trim()) return;
    setNoteBusy(true);
    try {
      await postPortal(`${API}/notes`, { profile_id: noteProfileId, note: noteText.trim() });
      flash?.('Note recorded to activity timeline');
      setNoteText('');
      loadActivity();
    } catch (e: any) {
      flash?.(e?.message || 'Note failed', 'error');
    } finally {
      setNoteBusy(false);
    }
  };

  const loadInterviews = useCallback(async () => {
    setILoading(true);
    try {
      const [iv, pl] = await Promise.all([
        getPortal(`${API}/interviews?limit=50`).catch(() => null),
        getPortal(`${API}?limit=200`).catch(() => null),
      ]);
      setInterviews(iv?.interviews ?? []);
      setProfiles(pl?.items ?? []);
    } catch (e: any) {
      flash?.(e?.message || 'Failed to load interviews', 'error');
    } finally {
      setILoading(false);
    }
  }, []);

  const openSchedule = (p?: any) => {
    setSchedFor(p || null);
    setSchedOpen(true);
    setIStart('');
    setIDur(45);
    setIOrganizer('');
    setIInvitee('');
    setILoc('');
    setISummary('');
    setICal('auto');
  };

  const scheduleInterview = async () => {
    const profileId = schedFor?.id;
    if (!profileId) {
      flash?.('Pick a candidate first', 'error');
      return;
    }
    setIBusy(true);
    try {
      const r = await postPortal(`${API}/interviews`, {
        profile_id: profileId,
        start: iStart || new Date(Date.now() + 3600_000).toISOString(),
        duration_min: iDur,
        organizer_email: iOrganizer || undefined,
        invitee_email: iInvitee || undefined,
        location: iLoc,
        summary: iSummary || undefined,
        description: '',
        calendar: iCal,
      });
      if (r?.error) {
        flash?.(`Could not create: ${r.error}`, 'error');
      } else {
        flash?.('Interview scheduled');
        setSchedFor(null);
        setSchedOpen(false);
        loadInterviews();
      }
    } catch (e: any) {
      flash?.(e?.message || 'Schedule failed', 'error');
    } finally {
      setIBusy(false);
    }
  };

  const openFeedback = (iv: any) => {
    setFbFor(iv);
    setFbDecision('Pending');
    setFbNotes('');
    setFbRating('');
  };

  const submitFeedback = async () => {
    if (!fbFor) return;
    setFbBusy(true);
    try {
      await postPortal(`${API}/interviews/${fbFor.interview_id || fbFor._id}/feedback`, {
        decision: fbDecision,
        notes: fbNotes,
        rating: fbRating === '' ? null : Number(fbRating),
      });
      flash?.('Feedback recorded');
      setFbFor(null);
      loadInterviews();
    } catch (e: any) {
      flash?.(e?.message || 'Feedback failed', 'error');
    } finally {
      setFbBusy(false);
    }
  };

  // fetch per tab
  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    else if (activeTab === 'duplicates') loadDuplicates();
    else if (activeTab === 'insights') loadInsights();
    else if (activeTab === 'external-jobs') loadExternal();
    else if (activeTab === 'quality') loadQuality();
    else if (activeTab === 'activity') loadActivity();
    else if (activeTab === 'interviews') loadInterviews();
  }, [activeTab]);

  // group agents
  const agentCards: any[] = agentStatus?.agents ? Object.values(agentStatus.agents) : [];
  const byGroup = (gk: string) => agentCards.filter((a: any) => a?.group === gk);

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.headIcon}><Network size={20} color="#A78BFA" /></View>
          <View>
            <Text style={s.headTitle}>Talent Pool · AI Agents</Text>
            <Text style={s.headSub}>TP15–TP32 — every agent is a real open-source implementation</Text>
          </View>
        </View>
        <Badge label={`${agentCards.length || 16} agents`} color="green" />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {TABS.map(({ key, label, Icon }) => (
          <Pressable key={key} style={[s.tabBtn, activeTab === key && s.tabActive]} onPress={() => setActiveTab(key)}>
            <Icon size={13} color={activeTab === key ? '#fff' : T.muted} />
            <Text style={[s.tabText, activeTab === key && s.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <View style={{ gap: 16 }}>
          {ovLoading && !stats ? <View style={s.centered}><ActivityIndicator color="#8B5CF6" /></View> : null}

          {/* KPI tiles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <KpiCard Icon={LayoutDashboard} label="Candidates" value={String(stats?.total ?? '—')} delta={`${stats?.skill_count ?? 0} canonical skills`} color="blue" />
            <KpiCard Icon={Gauge} label="Avg Quality" value={quality ? `${quality.mean_score}` : '—'} delta={`${quality?.scored ?? 0} scored`} color="green" />
            <KpiCard Icon={AlertTriangle} label="Needs Attention" value={String(quality?.needs_attention ?? '—')} delta="score < 30" color="red" />
            <KpiCard Icon={Copy} label="Open Duplicate Groups" value={String(dupOpen)} delta="RapidFuzz + RecordLinkage" color="amber" />
            <KpiCard Icon={Briefcase} label="Deadlines ≤ 7d" value={String(deadlines?.count ?? '—')} delta="Naukri / Internshala" color="purple" />
          </View>

          {/* Pipeline flow */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Candidate Pipeline</Text>
            <Text style={s.cardSub}>In-process asyncio scheduler drives each stage on a self-gating cadence</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.pipeline}>
                {[
                  { l: 'Source', t: 'CSV / LinkedIn' }, { l: 'Enrich', t: 'TP15·16' }, { l: 'Parse', t: 'TP17' },
                  { l: 'Dedup', t: 'TP20' }, { l: 'Match', t: 'TP18' }, { l: 'Rank', t: 'TP19' },
                  { l: 'Outreach', t: 'TP21' }, { l: 'Quality', t: 'TP24' }, { l: 'Interview', t: 'TP32' },
                ].map((st, i, arr) => (
                  <View key={st.l} style={s.pipeStage}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={s.pipeDot}><Text style={s.pipeNum}>{i + 1}</Text></View>
                      <View>
                        <Text style={s.pipeLabel}>{st.l}</Text>
                        <Text style={s.pipeSub}>{st.t}</Text>
                      </View>
                    </View>
                    {i < arr.length - 1 && <View style={s.pipeArrow}><ArrowRight size={14} color={T.muted} /></View>}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Agent groups */}
          {GROUPS.map((g) => {
            const cards = byGroup(g.key);
            if (!cards.length) return null;
            return (
              <View key={g.key} style={s.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View>
                    <Text style={s.cardTitle}>{g.label}</Text>
                    <Text style={s.cardSub}>{g.blurb}</Text>
                  </View>
                  <Badge label={String(cards.length)} color="gray" />
                </View>
                <View style={{ gap: 8 }}>
                  {cards.map((a: any, i: number) => (
                    <View key={a?.name || i} style={s.agentCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={13} color="#A78BFA" />
                        <Text style={s.agentName}>{a?.name}</Text>
                        {a?.available === false
                          ? <Badge label="offline" color="red" />
                          : <Badge label={a?.status || 'ok'} color="green" />}
                        <View style={{ flex: 1 }} />
                        <Badge label={a?.priority || '—'} color="amber" />
                      </View>
                      {a?.available === false ? <Text style={s.agentMeta}>⚠ {a?.reason || 'Agent unavailable'}</Text> : null}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        <Text style={s.agentCost}>{a?.est_cost_per_month ? a.est_cost_per_month : 'local · $0'}</Text>
                        {a?.last_run_at ? <Text style={s.agentCost}>last run {fmtDT(a.last_run_at)}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* OSS stack table */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Open-Source Stack</Text>
            <Text style={s.cardSub}>Exactly what runs in production — no proprietary SaaS, no celery/redis</Text>
            <View style={{ gap: 6 }}>
              {OSS_STACK.map((row) => (
                <View key={row.layer} style={s.ossRow}>
                  <Text style={s.ossLayer}>{row.layer}</Text>
                  <Text style={s.ossTech}>{row.tech}</Text>
                  <Text style={s.ossUsed}>{row.used}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ── DUPLICATES ── */}
      {activeTab === 'duplicates' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={s.cardTitle}>Duplicate Groups</Text>
              <Text style={s.cardSub}>Blocking + RapidFuzz entity resolution ({dupGroups.length} open)</Text>
            </View>
            <Pressable style={[s.specBtn, rescanning && s.specBtnDisabled]} onPress={rescan}>
              <RefreshCw size={13} color="#fff" /><Text style={s.specBtnText}>{rescanning ? 'Scanning…' : 'Rescan'}</Text>
            </Pressable>
          </View>
          {rescanResult && (
            <View style={s.artifactCard}><Text style={s.artifactText}>Scanned {rescanResult.pairs_checked ?? 0} pairs → {rescanResult.groups_found ?? 0} groups.</Text></View>
          )}
          {dupLoading ? <View style={s.centered}><ActivityIndicator color="#8B5CF6" /></View> : null}
          <View style={{ gap: 10 }}>
            {dupGroups.map((g: any) => (
              <View key={g.group_id} style={s.dupGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.dupTitle}>{g.members?.length ?? 0} candidates</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Badge label={(g.reasons ?? []).slice(0, 2).join(' · ') || 'possible match'} color="amber" />
                    <Pressable style={s.specBtn} onPress={() => openMerge(g)}><Text style={s.specBtnText}>Merge</Text></Pressable>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {(g.members ?? []).map((m: any) => (
                    <View key={`${m.collection}:${m.id}`} style={s.dupMember}>
                      <Text style={s.dupMemberText}>{m.full_name || m.id}</Text>
                      <Text style={s.dupMemberSub}>{m.collection}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            {!dupGroups.length && !dupLoading ? <Text style={s.empty}>No open duplicate groups — run a rescan.</Text> : null}
          </View>
        </View>
      )}

      {/* ── INSIGHTS ── */}
      {activeTab === 'insights' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={s.cardTitle}>Weekly Insights</Text>
              <Text style={s.cardSub}>Rollups across source, skills, geo, velocity & funnel</Text>
            </View>
            <Pressable style={[s.specBtn, generating && s.specBtnDisabled]} onPress={generateInsight}>
              <Play size={13} color="#fff" /><Text style={s.specBtnText}>{generating ? 'Generating…' : 'Generate'}</Text>
            </Pressable>
          </View>
          {insLoading ? <View style={s.centered}><ActivityIndicator color="#8B5CF6" /></View> : null}
          <View style={{ gap: 12 }}>
            {insights.map((ins: any, i: number) => (
              <View key={i} style={s.insightCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.insightWeek}>{ins.week_start}</Text>
                  <Text style={s.insightSub}>computed {fmtDT(ins.computed_at)}</Text>
                </View>
                {ins.payload ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {Object.entries(ins.payload).map(([k, v]) => (
                      <View key={k} style={s.chip}>
                        <Text style={s.chipText}>{k.replace(/_/g, ' ')}</Text>
                        <Text style={s.chipVal}>{Array.isArray(v) ? `${v.length} items` : JSON.stringify(v)?.slice(0, 24) ?? '—'}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
            {!insights.length && !insLoading ? <Text style={s.empty}>No insight rollups yet — click Generate.</Text> : null}
          </View>
        </View>
      )}

      {/* ── EXTERNAL JOBS ── */}
      {activeTab === 'external-jobs' && (
        <View style={{ gap: 14 }}>
          {extDeadlines && extDeadlines.count > 0 && (
            <View style={[s.card, { borderColor: 'rgba(245,158,11,0.35)' }]}>
              <Text style={s.cardTitle}>{extDeadlines.count} deadlines within {extDeadlines.window_days}d</Text>
            </View>
          )}
          <View style={s.card}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Search query (e.g. React engineer)" placeholderTextColor={T.muted} value={fetchQuery} onChangeText={setFetchQuery} />
              <Pressable style={[s.specBtn, fetching && s.specBtnDisabled]} onPress={fetchJobs}>
                <Search size={13} color="#fff" /><Text style={s.specBtnText}>{fetching ? 'Fetching…' : 'Fetch'}</Text>
              </Pressable>
            </View>
            {extLoading ? <View style={s.centered}><ActivityIndicator color="#8B5CF6" /></View> : null}
            <View style={{ gap: 8 }}>
              {listings.map((lj: any) => (
                <View key={lj.id} style={s.listingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listingTitle}>{lj.title}</Text>
                    <Text style={s.listingSub}>{lj.company} · {lj.location || '—'} · {lj.board}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                      <Badge label={lj.board} color="blue" />
                      {lj.days_left != null && <Badge label={`${lj.days_left}d left`} color="amber" />}
                      {lj.salary && <Text style={s.listingSalary}>{lj.salary}</Text>}
                    </View>
                  </View>
                </View>
              ))}
              {!listings.length && !extLoading ? <Text style={s.empty}>No listings yet — run a fetch.</Text> : null}
            </View>
          </View>
        </View>
      )}

      {/* ── RANKER ── */}
      {activeTab === 'ranker' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={s.cardTitle}>Candidate Ranker</Text>
              <Text style={s.cardSub}>sklearn LogisticRegression · semantic + skill + experience factors</Text>
            </View>
            <Pressable style={[s.specBtn, retraining && s.specBtnDisabled]} onPress={retrain}>
              <RefreshCw size={13} color="#fff" /><Text style={s.specBtnText}>{retraining ? 'Retraining…' : 'Retrain'}</Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            <TextInput style={s.input} placeholder="Job title" placeholderTextColor={T.muted} value={rkTitle} onChangeText={setRkTitle} />
            <TextInput style={s.input} placeholder="Skills (comma separated)" placeholderTextColor={T.muted} value={rkSkills} onChangeText={setRkSkills} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Min exp (yrs)" placeholderTextColor={T.muted} keyboardType="numeric" value={rkMinExp} onChangeText={setRkMinExp} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Max exp (yrs)" placeholderTextColor={T.muted} keyboardType="numeric" value={rkMaxExp} onChangeText={setRkMaxExp} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.label}>Top K</Text>
                <Pressable style={s.iconBtn} onPress={() => setRkK((k) => Math.max(1, k - 1))}><Minus size={14} color={T.muted} /></Pressable>
                <Text style={s.chipVal}>{rkK}</Text>
                <Pressable style={s.iconBtn} onPress={() => setRkK((k) => Math.min(100, k + 1))}><Plus size={14} color={T.muted} /></Pressable>
              </View>
              <Pressable style={[s.specBtn, ranking && s.specBtnDisabled]} onPress={runRanker}>
                <Target size={13} color="#fff" /><Text style={s.specBtnText}>{ranking ? 'Ranking…' : 'Run Ranker'}</Text>
              </Pressable>
            </View>
          </View>

          {rankResult && (
            <View style={{ gap: 10, marginTop: 14 }}>
              {rankResult.health && (
                <View style={s.artifactCard}><Text style={s.artifactText}>
                  {rankResult.health.ml_available ? 'ML model' : 'Fallback heuristics'} · {rankResult.health.label_count} labels · unlinked {rankResult.health.unlinked} · {rankResult.health.model_used_now}
                </Text></View>
              )}
              <Text style={s.sectionHeader}>Results ({rankResult.results?.length ?? 0})</Text>
              <View style={{ gap: 8 }}>
                {(rankResult.results ?? []).map((r: any, i: number) => {
                  const c = qualityColor(r.score ?? 0);
                  return (
                    <View key={i} style={s.rankRow}>
                      <View style={[s.rankScore, { backgroundColor: c.bg, borderColor: c.bc }]}>
                        <Text style={{ color: c.c, fontFamily: FONTS.xbold, fontSize: 15 }}>{Math.round(r.score ?? 0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rankName}>{r.full_name || r.candidate_id}</Text>
                        <Text style={s.rankSub}>matched: {(r.matched_skills ?? []).slice(0, 4).join(', ') || '—'}{r.missing_skills?.length ? ` · missing: ${r.missing_skills.slice(0, 4).join(', ')}` : ''}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── QUALITY ── */}
      {activeTab === 'quality' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={s.cardTitle}>Data Quality</Text>
              <Text style={s.cardSub}>Deterministic 100-pt rubric · &lt;30 flagged “needs attention”</Text>
            </View>
            <Pressable style={[s.specBtn, qRunning && s.specBtnDisabled]} onPress={runQuality}>
              <Play size={13} color="#fff" /><Text style={s.specBtnText}>{qRunning ? 'Scanning…' : 'Run Scan'}</Text>
            </Pressable>
          </View>

          {qLoading ? <View style={s.centered}><ActivityIndicator color="#8B5CF6" /></View> : qReport ? (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <View style={s.qStat}><Text style={s.qStatVal}>{qReport.mean_score}</Text><Text style={s.qStatLabel}>mean</Text></View>
                <View style={s.qStat}><Text style={s.qStatVal}>{qReport.scored}/{qReport.total}</Text><Text style={s.qStatLabel}>scored</Text></View>
                <View style={s.qStat}><Text style={[s.qStatVal, { color: '#F87171' }]}>{qReport.needs_attention}</Text><Text style={s.qStatLabel}>needs attention</Text></View>
              </View>
              <View>
                <Text style={s.sectionHeader}>Distribution</Text>
                <View style={{ gap: 6 }}>
                  {Object.entries(qReport.buckets ?? {}).map(([band, n]) => {
                    const max = Math.max(1, ...Object.values(qReport.buckets ?? {}) as number[]);
                    const c = band === '0-29' ? '#F87171' : band === '30-59' ? '#F59E0B' : band === '60-79' ? '#60A5FA' : '#34D399';
                    return (
                      <View key={band} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.bandLabel}>{band}</Text>
                        <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <View style={{ height: 8, borderRadius: 4, backgroundColor: c, width: `${Math.round((Number(n) / max) * 100)}%` }} />
                        </View>
                        <Text style={s.bandVal}>{n}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View>
                <Text style={s.sectionHeader}>Score Now</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Profile id" placeholderTextColor={T.muted} value={scoreNowId} onChangeText={setScoreNowId} />
                  <Pressable style={[s.specBtn, scoreNowBusy && s.specBtnDisabled]} onPress={scoreNow}><Text style={s.specBtnText}>{scoreNowBusy ? '…' : 'Score'}</Text></Pressable>
                </View>
              </View>
              {qReport.low_scoring?.length ? (
                <View>
                  <Text style={s.sectionHeader}>Lowest Scoring</Text>
                  <View style={{ gap: 6, marginTop: 6 }}>
                    {qReport.low_scoring.map((p: any) => {
                      const c = qualityColor(p.quality_score ?? 0);
                      return (
                        <View key={p.id} style={s.lowRow}>
                          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.bg, borderColor: c.bc, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: c.c, fontFamily: FONTS.xbold, fontSize: 14 }}>{p.quality_score}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.lowName}>{p.full_name || p.id}</Text>
                            <Text style={s.lowSub}>missing: {(p.missing ?? []).join(', ') || '—'}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : <Text style={s.empty}>No quality report yet — run a scan.</Text>}
        </View>
      )}

      {/* ── ACTIVITY ── */}
      {activeTab === 'activity' && (
        <View style={{ gap: 14 }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Activity Timeline</Text>
            <Text style={s.cardSub}>W3C Activity Stream — unified across all agents</Text>
            <View style={{ gap: 8, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Filter: profile id (optional)" placeholderTextColor={T.muted} value={aProfileId} onChangeText={setAProfileId} />
                <TextInput style={[s.input, { flex: 1 }]} placeholder="Action (optional)" placeholderTextColor={T.muted} value={aAction} onChangeText={setAAction} />
              </View>
              <Pressable style={s.specBtn} onPress={loadActivity}><RefreshCw size={13} color="#fff" /><Text style={s.specBtnText}>Load</Text></Pressable>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Add Note</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              <TextInput style={s.input} placeholder="Profile id" placeholderTextColor={T.muted} value={noteProfileId} onChangeText={setNoteProfileId} />
              <TextInput style={[s.input, { height: 72 }]} placeholder="Recruiter note / call log / thread…" placeholderTextColor={T.muted} multiline value={noteText} onChangeText={setNoteText} />
              <Pressable style={[s.specBtn, noteBusy && s.specBtnDisabled]} onPress={addNote}>
                <Mail size={13} color="#fff" /><Text style={s.specBtnText}>{noteBusy ? 'Recording…' : 'Record Note'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={s.card}>
            {aLoading ? <View style={s.centered}><ActivityIndicator color="#8B5CF6" /></View> : (
              <View style={{ gap: 10 }}>
                {events.map((ev: any) => (
                  <View key={ev.id} style={s.evtRow}>
                    <View style={s.evtDot} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={s.evtAction}>{ev.action} · {ev.actor}</Text>
                        <Text style={s.evtAt}>{fmtDT(ev.at)}</Text>
                      </View>
                      {ev.summary ? <Text style={s.evtSummary}>{ev.summary}</Text> : null}
                      {ev.object_id ? <Text style={s.evtObj}>object {ev.object_id} ({ev.object_type})</Text> : null}
                    </View>
                  </View>
                ))}
                {!events.length ? <Text style={s.empty}>No events in this view yet.</Text> : null}
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── INTERVIEWS ── */}
      {activeTab === 'interviews' && (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={s.cardTitle}>Interviews</Text>
              <Text style={s.cardSub}>TP32 · msal / Google Calendar two-way sync</Text>
            </View>
            <Pressable style={s.specBtn} onPress={() => openSchedule()}><Plus size={13} color="#fff" /><Text style={s.specBtnText}>Schedule</Text></Pressable>
          </View>
          {iLoading ? <View style={s.centered}><ActivityIndicator color="#8B5CF6" /></View> : (
            <View style={{ gap: 8 }}>
              {interviews.map((iv: any) => (
                <View key={iv._id} style={s.ivRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ivTitle}>{iv.profile_name || iv.profile_id}</Text>
                    <Text style={s.ivSub}>{fmtDT(iv.start_at)} · {iv.calendar} · {iv.status}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Badge label={iv.status || '—'} color={iv.status === 'Selected' ? 'green' : iv.status === 'Rejected' ? 'red' : 'gray'} />
                    <Pressable style={s.iconBtn} onPress={() => openFeedback(iv)}><FileText size={14} color={T.muted} /></Pressable>
                  </View>
                </View>
              ))}
              {!interviews.length ? <Text style={s.empty}>No interviews scheduled.</Text> : null}
            </View>
          )}
        </View>
      )}

      {/* ── Merge modal ── */}
      <Modal visible={!!mergeGroup} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Merge Duplicate Group</Text>
              <Pressable onPress={() => setMergeGroup(null)}><X size={18} color={T.muted} /></Pressable></View>
            <Text style={s.label}>Keeper (the profile to keep)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(mergeGroup?.members ?? []).map((m: any) => {
                const key = `${m.collection}:${m.id}`;
                const active = keepRef === key;
                return (
                  <Pressable key={key} onPress={() => setKeepRef(key)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: active ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)', backgroundColor: active ? 'rgba(139,92,246,0.15)' : 'transparent' }}>
                    {active && <CheckCircle size={12} color="#A78BFA" />}
                    <Text style={{ color: active ? '#C4B5FD' : T.muted, fontFamily: FONTS.med, fontSize: 11 }}>{m.full_name || m.id}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.cardSub}>The other {(mergeGroup?.members?.length ?? 1) - 1} will be soft-merged (reversible, audited).</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <Pressable style={s.cancelBtn} onPress={() => setMergeGroup(null)}><Text style={s.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[s.saveBtn, (merging || !keepRef) && s.btnDisabled]} onPress={doMerge}><Text style={s.btnText}>{merging ? 'Merging…' : 'Merge'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Schedule modal ── */}
      <Modal visible={schedOpen} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Schedule Interview</Text>
              <Pressable onPress={() => setSchedOpen(false)}><X size={18} color={T.muted} /></Pressable></View>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
              <View>
                <Text style={s.label}>Candidate</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {profiles.slice(0, 12).map((p: any) => (
                    <Pressable key={p.id} onPress={() => setSchedFor(p)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: schedFor?.id === p.id ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)', backgroundColor: schedFor?.id === p.id ? 'rgba(139,92,246,0.15)' : 'transparent' }}>
                      <Text style={{ color: schedFor?.id === p.id ? '#C4B5FD' : T.muted, fontFamily: FONTS.med, fontSize: 11 }}>{p.full_name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text style={s.label}>Start (ISO datetime)</Text>
                <TextInput style={s.input} placeholder="2026-11-05T10:00:00Z" placeholderTextColor={T.muted} value={iStart} onChangeText={setIStart} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Duration (min)</Text>
                  <TextInput style={s.input} keyboardType="numeric" value={String(iDur)} onChangeText={(v) => setIDur(Number(v) || 0)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Calendar</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {['auto', 'gcal', 'ms365', 'ics'].map((c) => (
                      <Pressable key={c} onPress={() => setICal(c)} style={[s.catChip, iCal === c && s.catChipActive]}>
                        <Text style={[s.catChipText, iCal === c && { color: '#fff' }]}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <TextInput style={s.input} placeholder="Organizer email" placeholderTextColor={T.muted} value={iOrganizer} onChangeText={setIOrganizer} />
              <TextInput style={s.input} placeholder="Invitee email" placeholderTextColor={T.muted} value={iInvitee} onChangeText={setIInvitee} />
              <TextInput style={s.input} placeholder="Location / link" placeholderTextColor={T.muted} value={iLoc} onChangeText={setILoc} />
              <TextInput style={s.input} placeholder="Agenda / summary" placeholderTextColor={T.muted} value={iSummary} onChangeText={setISummary} />
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <Pressable style={s.cancelBtn} onPress={() => setSchedOpen(false)}><Text style={s.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[s.saveBtn, (iBusy || !schedFor) && s.btnDisabled]} onPress={scheduleInterview}>
                <CheckCircle size={14} color="#fff" /><Text style={s.btnText}>{iBusy ? 'Scheduling…' : 'Schedule'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Feedback modal ── */}
      <Modal visible={!!fbFor} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Interview Feedback</Text>
              <Pressable onPress={() => setFbFor(null)}><X size={18} color={T.muted} /></Pressable></View>
            <Text style={s.cardSub}>Decision feeds back into the ranker for the next retrain.</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              <Text style={s.label}>Decision</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['Selected', 'Rejected', 'Pending'].map((d) => (
                  <Pressable key={d} onPress={() => setFbDecision(d)} style={[s.catChip, fbDecision === d && s.catChipActive]}>
                    <Text style={[s.catChipText, fbDecision === d && { color: '#fff' }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
              <View>
                <Text style={s.label}>Rating (1–5)</Text>
                <TextInput style={s.input} keyboardType="numeric" value={String(fbRating)} onChangeText={(v) => setFbRating(v)} />
              </View>
              <View>
                <Text style={s.label}>Notes</Text>
                <TextInput style={[s.input, { height: 64 }]} multiline placeholder="Why?" placeholderTextColor={T.muted} value={fbNotes} onChangeText={setFbNotes} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <Pressable style={s.cancelBtn} onPress={() => setFbFor(null)}><Text style={s.cancelText}>Cancel</Text></Pressable>
              <Pressable style={[s.saveBtn, fbBusy && s.btnDisabled]} onPress={submitFeedback}>
                <CheckCircle size={14} color="#fff" /><Text style={s.btnText}>{fbBusy ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SAC.bg, padding: 16, gap: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.18)', borderColor: 'rgba(139,92,246,0.35)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.3 },
  headSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  tabRow: { paddingHorizontal: -16 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 6, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  tabActive: { backgroundColor: 'rgba(139,92,246,0.22)', borderColor: 'rgba(139,92,246,0.5)' },
  tabText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  tabTextActive: { color: '#F4F4FA' },
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  cardTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 14 },
  cardSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  centered: { paddingVertical: 30, alignItems: 'center' },
  empty: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center', paddingVertical: 20 },
  // pipeline
  pipeline: { flexDirection: 'row', alignItems: 'stretch', gap: 4, paddingVertical: 4 },
  pipeStage: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pipeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.2)', alignItems: 'center', justifyContent: 'center' },
  pipeNum: { color: '#C4B5FD', fontFamily: FONTS.xbold, fontSize: 11 },
  pipeLabel: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 },
  pipeSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10 },
  pipeArrow: { justifyContent: 'center', paddingHorizontal: 2 },
  // agent cards
  agentCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 10, padding: 12 },
  agentName: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  agentMeta: { color: SAC.danger, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 },
  agentCost: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  // oss table
  ossRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  ossLayer: { width: 110, color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  ossTech: { flex: 1, color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 11 },
  ossUsed: { flex: 1.2, color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  // controls
  label: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, marginBottom: 5 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 13 },
  sectionHeader: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  specBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(139,92,246,0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  specBtnDisabled: { opacity: 0.5 },
  specBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },
  artifactCard: { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  artifactText: { color: '#86EFAC', fontFamily: FONTS.med, fontSize: 12 },
  catChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 },
  catChipActive: { backgroundColor: 'rgba(139,92,246,0.25)', borderColor: 'rgba(139,92,246,0.6)' },
  catChipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: { width: '100%', maxWidth: 560, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 15 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  cancelText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(139,92,246,0.9)' },
  btnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  btnDisabled: { opacity: 0.5 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  // duplicates
  dupGroup: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 10, padding: 12 },
  dupTitle: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 },
  dupMember: { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', borderWidth: 1, borderRadius: 8, padding: 6, paddingHorizontal: 8 },
  dupMemberText: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11 },
  dupMemberSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 9.5 },
  // insights
  insightCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 10, padding: 12 },
  insightWeek: { color: '#C4B5FD', fontFamily: FONTS.bold, fontSize: 12 },
  insightSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  chip: { backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.25)', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 9, textTransform: 'uppercase' },
  chipVal: { color: '#C4B5FD', fontFamily: FONTS.med, fontSize: 11 },
  // listings
  listingRow: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 10, padding: 12 },
  listingTitle: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 13 },
  listingSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  listingSalary: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 11 },
  // ranker
  rankRow: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 10, padding: 10 },
  rankScore: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rankName: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12.5 },
  rankSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },
  // quality
  qStat: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, alignItems: 'center', minWidth: 90 },
  qStatVal: { color: '#F4F4FA', fontFamily: FONTS.xbold, fontSize: 22 },
  qStatLabel: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 2 },
  bandLabel: { width: 52, color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  bandVal: { width: 32, textAlign: 'right', color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 11 },
  lowRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  lowName: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 },
  lowSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  // activity
  evtRow: { flexDirection: 'row', gap: 10 },
  evtDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(139,92,246,0.8)', marginTop: 4 },
  evtAction: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12 },
  evtAt: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  evtSummary: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 3 },
  evtObj: { color: 'rgba(139,92,246,0.8)', fontFamily: FONTS.med, fontSize: 10, marginTop: 3 },
  // interviews
  ivRow: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 10, padding: 12 },
  ivTitle: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 12.5 },
  ivSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },
});
