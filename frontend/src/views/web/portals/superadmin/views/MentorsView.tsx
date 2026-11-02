/**
 * MentorsView — Super Admin mentor management (MT1–MT14).
 *
 * Sub-tabs (URL-persisted via useSubTab, like the Talent Pool suite):
 *   directory   — shared user directory in mentor mode (KPIs, taxonomy chips,
 *                 approve/reject workflow, enriched MT4 profile cards)
 *   sessions    — booking & revenue analytics (MT5)
 *   connections — mentor↔student connection map + manual assignment (MT6)
 *   alumni      — alumni → mentor promotion pipeline (MT7)
 *   agents      — MT8–MT14 agent suite status + on-demand runs
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, StyleSheet, Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Users, Star, Calendar, FileText, TrendingUp, IndianRupee, Award,
  Network, UserPlus, Bot, Zap, CheckCircle2, XCircle, Sparkles,
  Target, ArrowRight,
} from 'lucide-react-native';
import { GRAD, GradientButton, SecondaryButton, Card, IconBox, SectionLabel,
  KpiTile, useToast, Toast, EmptyState, LoadingBox } from '../applekit';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';
import { useSubTab } from '@/src/views/web/portals/portalUrl';
import { request } from '@/src/models/services/api';
import { UserDirectoryView } from './UserDirectoryView';

const TAB_IDS = ['directory', 'sessions', 'connections', 'alumni', 'agents'] as const;
type TabId = (typeof TAB_IDS)[number];
const TAB_LABELS: Record<TabId, string> = {
  directory: 'Directory',
  sessions: 'Sessions & Revenue',
  connections: 'Connections',
  alumni: 'Alumni Pipeline',
  agents: 'AI Agents',
};

export function MentorsView({ sub, onSub }: { sub?: string; onSub?: (s: string) => void }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  const [tab, setTab] = useSubTab<TabId>(TAB_IDS, 'directory', { sub, onSub });
  const { toast, flash, hide } = useToast();

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
        {TAB_IDS.map((id) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[s.filterChip, tab === id && s.filterChipActive]}
          >
            <Text style={[s.filterChipText, tab === id && s.filterChipTextActive]}>{TAB_LABELS[id]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'directory' && (
        <UserDirectoryView
          category="mentor"
          title="Mentors"
          subtitle="Senior professionals with 4+ years of experience. Approve newly imported mentors to make them visible to students — or reject with a reason that is emailed back to them."
          mentorMode
        />
      )}
      {tab === 'sessions' && <SessionsPanel flash={flash} />}
      {tab === 'connections' && <ConnectionsPanel flash={flash} />}
      {tab === 'alumni' && <AlumniPanel flash={flash} />}
      {tab === 'agents' && <AgentsPanel flash={flash} />}

      <Toast text={toast.text} visible={toast.visible} kind={toast.kind} onDismiss={hide} />
    </View>
  );
}

/* ── MT5 — Sessions & Revenue ─────────────────────────────────────── */
function SessionsPanel({ flash }: { flash: (m: string, kind?: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    request<any>('/admin/mentors/session-analytics')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <LoadingBox />;
  if (!data) return <EmptyState icon={Calendar} title="No booking data" sub="Session analytics will appear once mentors book sessions." />;

  const trend: any[] = data.trend_6mo || [];
  const maxBooked = Math.max(1, ...trend.map((t) => t.booked || 0), ...trend.map((t) => t.completed || 0));

  return (
    <View style={{ gap: 12 }}>
      <View style={s.kpiRow}>
        <KpiTile Icon={Calendar}       label="BOOKED"           value={String(data.booked ?? 0)} />
        <KpiTile Icon={CheckCircle2}   label="COMPLETED"        value={String(data.completed ?? 0)} delta="finished" deltaKind="success" />
        <KpiTile Icon={XCircle}        label="CANCELLED"        value={String(data.cancelled ?? 0)} deltaKind={data.cancelled > 10 ? 'warn' : 'success'} />
        <KpiTile Icon={TrendingUp}     label="COMPLETION RATE"  value={data.completion_rate != null ? `${Math.round(data.completion_rate * 100)}%` : '—'} delta="target ≥ 80%" deltaKind="success" />
        <KpiTile Icon={IndianRupee}    label="REVENUE (MTD)"    value={`₹${(data.revenue_inr ?? 0).toLocaleString('en-IN')}`} delta={`${data.revenue_sessions ?? 0} paid sessions`} deltaKind="success" />
      </View>

      <Card>
        <SectionLabel>6-MONTH BOOKING TREND</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 120, paddingVertical: 8 }}>
          {trend.map((t: any) => (
            <View key={t.month} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100 }}>
                <View style={[s.trendBar, { height: Math.max(3, ((t.booked || 0) / maxBooked) * 100), backgroundColor: GRAD.to }]} />
                <View style={[s.trendBar, { height: Math.max(3, ((t.completed || 0) / maxBooked) * 100), backgroundColor: '#22C55E' }]} />
              </View>
              <Text style={s.trendMonth}>{t.month}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: GRAD.to }} />
            <Text style={s.legendText}>Booked</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#22C55E' }} />
            <Text style={s.legendText}>Completed</Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionLabel>TOP MENTORS BY SESSIONS</SectionLabel>
        {(data.leaderboard_top10 || []).length === 0 ? (
          <Text style={s.emptyText}>No sessions recorded yet.</Text>
        ) : (
          (data.leaderboard_top10 || []).map((m: any, i: number) => (
            <View key={m._id || i} style={s.leaderRow}>
              <Text style={s.leaderRank}>{i + 1}</Text>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <View style={[s.leaderDot, i === 0 ? { backgroundColor: GRAD.to } : null]} />
                <Text style={s.leaderName} numberOfLines={1}>{m.name}</Text>
              </View>
              <Text style={s.leaderN}>{m.n} sessions</Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

/* ── MT6 — Connection Map ─────────────────────────────────────────── */
function ConnectionsPanel({ flash }: { flash: (m: string, kind?: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mentorId, setMentorId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    setLoading(true);
    request<any>('/admin/mentors/connections')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const assign = async () => {
    if (!mentorId.trim() || !studentId.trim()) { flash('Both mentor and student IDs are required', 'error'); return; }
    setAssigning(true);
    try {
      await request('/admin/mentors/connections/assign', { method: 'POST', body: { mentor_id: mentorId.trim(), student_id: studentId.trim() } });
      flash('Mentor assigned to student');
      setMentorId(''); setStudentId('');
      load();
    } catch { flash('Assignment failed', 'error'); }
    setAssigning(false);
  };

  if (loading) return <LoadingBox />;
  if (!data) return <EmptyState icon={Network} title="Connection data unavailable" sub="Retry or check backend health." />;

  const overloaded: any[] = data.overloaded_mentors || [];

  return (
    <View style={{ gap: 12 }}>
      <View style={s.kpiRow}>
        <KpiTile Icon={Network}       label="MENTORS WITH MENTEES"  value={String((data.mentor_counts || []).length)} />
        <KpiTile Icon={Users}         label="ORPHANED STUDENTS"     value={String(data.orphaned_students ?? 0)} deltaKind={(data.orphaned_students ?? 0) > 0 ? 'warn' : 'success'} />
        <KpiTile Icon={XCircle}       label="OVERLOADED MENTORS"    value={String(overloaded.length)} deltaKind={overloaded.length > 0 ? 'warn' : 'success'} />
      </View>

      <Card>
        <SectionLabel>MENTEE LOAD BY MENTOR</SectionLabel>
        {(data.mentor_counts || []).length === 0 ? (
          <Text style={s.emptyText}>No active mentor↔student connections yet.</Text>
        ) : (
          (data.mentor_counts || []).map((m: any) => (
            <View key={m._id} style={s.leaderRow}>
              <View style={{ flex: 1 }}><Text style={s.leaderName} numberOfLines={1}>{m.name}</Text></View>
              <Text style={s.leaderN}>{m.n} mentees</Text>
            </View>
          ))
        )}
      </Card>

      <Card>
        <SectionLabel>MANUAL ASSIGNMENT</SectionLabel>
        <View style={{ gap: 10 }}>
          <TextInput style={s.input} placeholder="Mentor ID (MongoDB ObjectId)" placeholderTextColor={T.muted} value={mentorId} onChangeText={setMentorId} autoCapitalize="none" />
          <TextInput style={s.input} placeholder="Student ID (MongoDB ObjectId)" placeholderTextColor={T.muted} value={studentId} onChangeText={setStudentId} autoCapitalize="none" />
          <SecondaryButton title={assigning ? 'Assigning…' : 'Assign Mentor'} onPress={assign} disabled={assigning} />
        </View>
      </Card>
    </View>
  );
}

/* ── MT7 — Alumni → Mentor Pipeline ──────────────────────────────── */
function AlumniPanel({ flash }: { flash: (m: string, kind?: any) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [tax, setTax] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteTarget, setInviteTarget] = useState<any>(null);
  const [inviteCat, setInviteCat] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    request<any>('/admin/mentors/eligible-alumni')
      .then((r) => setItems(r?.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    request<any>('/admin/mentors/taxonomy')
      .then((r) => { setTax(r); })
      .catch(() => {});
  };
  useEffect(load, []);

  const invite = async (a: any) => {
    setBusy(true);
    try {
      await request('/admin/mentors/invite', { method: 'POST', body: { alumni_id: a.id, category: inviteCat || undefined } });
      flash(`Mentor invite sent to ${a.name}`);
      setInviteTarget(null);
      load();
    } catch { flash('Invite failed', 'error'); }
    setBusy(false);
  };

  const eligible = items.filter((a) => a.is_eligible);

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <SectionLabel>ALUMNI ELIGIBLE FOR MENTOR PROMOTION</SectionLabel>
        <Text style={s.emptyText}>
          Graduated alumni with 4+ years of experience who have not yet applied to the mentor program. Send them an invitation with an optional category.
        </Text>
      </Card>

      {loading ? <LoadingBox /> : (
        eligible.length === 0 ? (
          <EmptyState icon={Users} title="No eligible alumni" sub="Everyone meeting the 4+ year threshold has already been invited." />
        ) : (
          <View style={{ gap: 10 }}>
            {eligible.map((a: any) => (
              <Card key={a.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <IconBox size={38}><Users size={16} color={GRAD.to} /></IconBox>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.roleName} numberOfLines={1}>{a.name}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {a.org ? `${a.org}${a.title ? ' · ' + a.title : ''}` : 'Alumni'} · {a.years != null ? `${a.years} yrs` : '—'}
                    </Text>
                  </View>
                  {a.mentor_status ? (
                    <View style={[s.statusPill, { backgroundColor: a.mentor_status === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)' }]}>
                      <Text style={{ color: a.mentor_status === 'approved' ? '#86EFAC' : '#FCD34D', fontFamily: FONTS.bold, fontSize: 11 }}>
                        {a.mentor_status}
                      </Text>
                    </View>
                  ) : null}
                  <SecondaryButton title={inviteTarget === a ? 'Picking…' : 'Invite'} onPress={() => { setInviteTarget(a); setInviteCat(''); }} />
                </View>

                {inviteTarget === a && (
                  <View style={{ marginTop: 10, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
                      {(tax?.items || []).map((t: any) => (
                        <Pressable key={t.slug} onPress={() => setInviteCat(inviteCat === t.slug ? '' : t.slug)}
                          style={[s.filterChip, inviteCat === t.slug && s.filterChipActive]}>
                          <Text style={[s.filterChipText, inviteCat === t.slug && s.filterChipTextActive]}>{t.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <Pressable onPress={() => invite(a)} style={s.inviteBtn}>
                      <ArrowRight size={13} color="#FFF" /><Text style={s.inviteBtnText}>{busy ? 'Sending…' : 'Send'}</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )
      )}
    </View>
  );
}

/* ── MT8–MT14 — Agent Suite Panel ────────────────────────────────── */
function AgentsPanel({ flash }: { flash: (m: string, kind?: any) => void }) {
  const [status, setStatus] = useState<any>(null);
  const [matchGoal, setMatchGoal] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [lastRun, setLastRun] = useState<string>('');

  const load = () => {
    request<any>('/admin/mentors/agent-status')
      .then(setStatus)
      .catch(() => setStatus(null));
  };
  useEffect(load, []);

  const run = async (label: string, fn: () => Promise<any>) => {
    setLastRun(`Running ${label}…`);
    try {
      const out = await fn();
      const msg = out ? (typeof out === 'string' ? out : JSON.stringify(out)) : '';
      setLastRun(`${label} done ${msg ? '· ' + msg.slice(0, 80) : ''}`);
      flash(`${label} completed`);
      load();
    } catch (e: any) {
      setLastRun(`${label} failed — ${e?.message || e}`);
      flash(`${label} failed`, 'error');
    }
  };

  const runMatch = async () => {
    setLastRun('Matching mentors…');
    try {
      const out = await request<any>('/admin/mentors/match', { method: 'POST', body: { goal: matchGoal, limit: 5 } });
      setMatchResult(out);
      setLastRun(`Match run done · ${out?.matches?.length || 0} matches`);
      flash(`${out?.matches?.length || 0} mentor matches for “${matchGoal}”`);
    } catch (e: any) {
      setLastRun(`Match failed — ${e?.message || e}`);
      flash('Match failed', 'error');
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {status ? (
        <View style={s.kpiRow}>
          <KpiTile Icon={Sparkles}    label="CATEGORY SUGGESTIONS" value={String(status.category_suggestions ?? 0)} />
          <KpiTile Icon={Zap}         label="ENGAGEMENT SCORED"   value={String(status.engagement_scored ?? 0)} />
          <KpiTile Icon={XCircle}     label="DISENGAGED FLAGGED"  value={String(status.disengaged_flagged ?? 0)} deltaKind={(status.disengaged_flagged ?? 0) > 0 ? 'warn' : 'success'} />
          <KpiTile Icon={Star}        label="QUALITY FLAGS"       value={String(status.quality_flagged ?? 0)} deltaKind={(status.quality_flagged ?? 0) > 0 ? 'warn' : 'success'} />
          <KpiTile Icon={Award}       label="BADGE HOLDERS"       value={String(status.badge_holders ?? 0)} deltaKind="success" />
        </View>
      ) : (
        <Card>
          <Text style={s.emptyText}>Agent status unavailable — run a step below to initialize the suite. Last scheduler run: {status?.generated_at || 'n/a'}</Text>
        </Card>
      )}

      <Card>
        <SectionLabel>ON-DEMAND AGENT RUNS</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <SecondaryButton title="Categorize Mentors" onPress={() => run('Categorize', () => request('/admin/mentors/categorize', { method: 'POST' }))} />
          <SecondaryButton title="Engagement Scores"  onPress={() => run('Engagement', () => request('/admin/mentors/engagement/run', { method: 'POST' }))} />
          <SecondaryButton title="Quality Flags"       onPress={() => run('Quality', () => request('/admin/mentors/quality/run', { method: 'POST' }))} />
          <SecondaryButton title="Content Digest"      onPress={() => run('Content Digest', () => request('/admin/mentors/content-digest', { method: 'POST' }))} />
          <SecondaryButton title="Award Badges"        onPress={() => run('Badges', () => request('/admin/mentors/badges/run', { method: 'POST' }))} />
        </View>
      </Card>

      <Card>
        <SectionLabel>MENTOR ↔ STUDENT MATCH (MT9)</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="Student goal, e.g. “break into product management at a startup”"
            placeholderTextColor={T.muted}
            value={matchGoal}
            onChangeText={setMatchGoal}
          />
          <Pressable accessibilityLabel="Run mentor match" onPress={runMatch} style={s.inviteBtn}>
            <Target size={13} color="#FFF" /><Text style={s.inviteBtnText}>Match</Text>
          </Pressable>
        </View>
        {matchResult ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            {(matchResult.matches || []).map((m: any, i: number) => (
              <View key={m.mentor_id || i} style={s.matchRow}>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.roleName}>{m.name}</Text>
                    {m.category ? <View style={s.statusPill}><Text style={{ color: '#FDBA74', fontFamily: FONTS.bold, fontSize: 10 }}>{m.category}</Text></View> : null}
                  </View>
                  <Text style={s.rowSub} numberOfLines={1}>
                    {(m.matched_terms || []).length ? `matched: ${(m.matched_terms || []).join(', ')}` : 'no keyword overlap'}
                    {m.avg_rating != null ? ` · ★ ${Number(m.avg_rating).toFixed(1)}` : ''}
                  </Text>
                </View>
                <Text style={{ color: GRAD.to, fontFamily: FONTS.xbold, fontSize: 14 }}>{Math.round((m.score || 0) * 100)}%</Text>
              </View>
            ))}
            {(matchResult.matches || []).length === 0 ? <Text style={s.emptyText}>No mentors matched this goal.</Text> : null}
            <Text style={s.tinyNote}>engine: {matchResult.engine || 'keyword-fallback'}</Text>
          </View>
        ) : null}
      </Card>

      {lastRun ? <Card><Text style={s.emptyText}>{lastRun}</Text></Card> : null}
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  filterChipActive: { backgroundColor: 'rgba(249,115,22,0.18)', borderColor: '#F97316' },
  filterChipText: { color: T.muted, fontFamily: FONTS.bold, fontSize: 12 },
  filterChipTextActive: { color: '#F4F4FA' },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  input: {
    color: '#F4F4FA', fontFamily: FONTS.med, fontSize: 13,
    backgroundColor: T.cardSolid, borderRadius: 9, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 12, paddingVertical: 9,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 9, backgroundColor: GRAD.from,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  inviteBtnText: { color: '#FFF', fontFamily: FONTS.xbold, fontSize: 12 },
  emptyText: { color: T.muted, fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 17 },
  tinyNote: { color: T.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 4 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.border },
  leaderRank: { width: 18, color: T.muted, fontFamily: FONTS.xbold, fontSize: 12 },
  leaderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.muted, marginRight: 8 },
  leaderName: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 13, flex: 1 },
  leaderN: { color: GRAD.to, fontFamily: FONTS.bold, fontSize: 12 },
  trendBar: { width: 14, borderRadius: 4 },
  trendMonth: { color: T.muted, fontFamily: FONTS.bold, fontSize: 10.5 },
  legendText: { color: T.muted, fontFamily: FONTS.med, fontSize: 11 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.border },
  roleName: { color: '#F4F4FA', fontFamily: FONTS.bold, fontSize: 13 },
  rowSub: { color: T.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
});
