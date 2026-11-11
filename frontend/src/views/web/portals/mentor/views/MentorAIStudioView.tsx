import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as MCI } from '@expo/vector-icons';
import { MC, FONTS } from '../tokens';
import { request } from '@/src/models/services/api';

const TINT = MC.teal;
const TINT_GLOW = `${MC.teal}33`;
const GOLD = '#F59E0B';

interface Mentee {
  user_id: string;
  name: string;
  branch?: string;
  institution?: string;
  progress_pct: number;
  milestones_done: number;
  milestones_total: number;
  stuck?: boolean;
}

interface SkillGap { skill: string; mentees_below_60: number; avg_score: number }
interface Impact {
  mentees_total: number;
  sessions_last_30d: number;
  milestones_completed_total: number;
  badges_earned_total: number;
  avg_mentee_progress_pct: number;
}
interface Prep {
  mentee: { id: string; name: string; target_role: string; progress_pct: number;
            weak_skills: { skill: string; score: number }[];
            strong_skills: { skill: string; score: number }[] };
  bullets: string[];
  provider_label: string;
}

/**
 * Recommendations are derived from the mentee skill-gap data this view
 * already loads (/mentor/ai-studio/skill-gaps). Earlier versions showed a
 * fixed list ("Conduct SQL Workshop next week", "Mock interviews for 12
 * students") that had nothing to do with the mentor's mentees.
 */
function recommendationsFromGaps(gaps: SkillGap[], upcomingCount: number): { title: string; icon: string }[] {
  const out: { title: string; icon: string }[] = [];
  const sorted = [...gaps].filter((g) => g.mentees_below_60 > 0).sort((x, y) => y.mentees_below_60 - x.mentees_below_60);
  for (const g of sorted.slice(0, 2)) {
    out.push({
      title: `Run a ${g.skill} session — ${g.mentees_below_60} mentee${g.mentees_below_60 === 1 ? '' : 's'} below 60% (avg ${Math.round(g.avg_score)}%)`,
      icon: 'school-outline',
    });
  }
  if (upcomingCount === 0) out.push({ title: 'No sessions booked — open more availability slots so mentees can book you', icon: 'calendar-plus' });
  return out;
}

export function MentorAIStudioView() {
  const [pulse, setPulse] = useState<Mentee[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, setLoading] = useState(true);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [prepLoading, setPrepLoading] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const recommendations = recommendationsFromGaps(gaps, upcoming.length);

  const formatSessionDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Upcoming';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch {
      return 'Upcoming';
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c, d]: any = await Promise.all([
        request('/mentor/ai-studio/mentee-pulse'),
        request('/mentor/ai-studio/skill-gaps'),
        request('/mentor/ai-studio/impact'),
        request('/bookings/me').catch(() => ({ bookings: [] })),
      ]);
      setPulse(a.items || []);
      setGaps(b.items || []);
      setImpact(c || null);

      const books = d.bookings || [];
      const now = new Date();
      const filtered = books.filter((b: any) => {
        const schedDate = b.slot_start_iso ? new Date(b.slot_start_iso) : (b.scheduled_at ? new Date(b.scheduled_at) : null);
        return schedDate && schedDate > now && ['confirmed', 'accepted', 'pending'].includes(b.status);
      });
      filtered.sort((x: any, y: any) => {
        const dx = x.slot_start_iso ? new Date(x.slot_start_iso).getTime() : new Date(x.scheduled_at).getTime();
        const dy = y.slot_start_iso ? new Date(y.slot_start_iso).getTime() : new Date(y.scheduled_at).getTime();
        return dx - dy;
      });
      setUpcoming(filtered.slice(0, 5));
    } catch (e: any) {
      console.warn('Mentor AI load failed', e?.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generatePrep = useCallback(async (mentee: Mentee) => {
    if (prepLoading) return;
    setPrepLoading(mentee.user_id);
    try {
      const r: any = await request('/mentor/ai-studio/session-prep', {
        method: 'POST',
        body: { mentee_id: mentee.user_id },
      } as any);
      setPrep(r);
    } catch (e: any) {
      console.error('AI session prep failed:', e?.message || e);
    } finally { setPrepLoading(null); }
  }, [prepLoading]);

  const renderSectionHeader = (title: string, icon: string, color: string = TINT) => (
    <View style={s.sectionHead}>
      <View style={[s.sectionIcon, { backgroundColor: `${color}24`, borderColor: `${color}66` }]}>
        <MCI name={icon as any} size={14} color={color} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );

  const getRisk = (m: Mentee) => {
    if (m.progress_pct >= 80) return { label: 'Very Low', color: '#10B981' };
    if (m.progress_pct >= 60) return { label: 'Moderate', color: '#F59E0B' };
    return { label: 'High', color: '#EF4444' };
  };

  const topPerformers = [...pulse].sort((a, b) => b.progress_pct - a.progress_pct).slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: MC.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: 60, gap: 24 }}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={[s.headerIcon, { backgroundColor: TINT_GLOW, borderColor: `${TINT}80` }]}>
            <MCI name="head-cog-outline" size={20} color={TINT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Mentor AI Studio</Text>
            <Text style={s.h1Sub}>Comprehensive analytics, risk tracking, and AI session preparation.</Text>
          </View>
          <Pressable onPress={load} disabled={loading} style={s.refreshBtn}>
            {loading ? <ActivityIndicator size="small" color={TINT} /> : <MCI name="refresh" size={14} color={TINT} />}
            <Text style={s.refreshText}>{loading ? 'Loading' : 'Refresh'}</Text>
          </Pressable>
        </View>

        {/* Overview Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <ImpactTile icon="account-multiple" label="Total Mentees" value={impact?.mentees_total ?? '—'} accent={TINT} />
          <ImpactTile icon="calendar-check" label="Active Sessions" value={impact?.sessions_last_30d ?? '—'} accent={GOLD} />
          <ImpactTile icon="flag-checkered" label="Milestones" value={impact?.milestones_completed_total ?? '—'} accent="#3B82F6" />
          <ImpactTile icon="medal" label="Badges Earned" value={impact?.badges_earned_total ?? '—'} accent="#8B5CF6" />
          <ImpactTile icon="trending-up" label="Avg Progress" value={impact ? `${impact.avg_mentee_progress_pct}%` : '—'} accent="#10B981" />
        </View>

        <View style={{ flexDirection: Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth > 1000 ? 'row' : 'column', gap: 24 }}>
          {/* LEFT COLUMN */}
          <View style={{ flex: 2, gap: 24 }}>
            
            {/* Top Skill Gaps */}
            <View style={s.sectionCard}>
              {renderSectionHeader('Top Skill Gaps', 'chart-bar', '#F59E0B')}
              <View style={{ gap: 12, marginTop: 12 }}>
                {gaps.length === 0 && !loading && <Text style={{color: MC.dim, marginTop: 10}}>No skill gaps detected.</Text>}
                {gaps.map((g, i) => (
                  <View key={g.skill} style={s.gapRow}>
                    <Text style={s.gapName}>{g.skill}</Text>
                    <View style={s.gapBarTrack}>
                      <View style={[s.gapBarFill, { width: `${g.avg_score}%` as any, backgroundColor: ['#3B82F6','#F59E0B','#10B981','#8B5CF6','#EC4899'][i%5] }]} />
                    </View>
                    <Text style={s.gapScore}>{g.mentees_below_60} mentees under 60%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Mentee Pulse */}
            <View style={s.sectionCard}>
              {renderSectionHeader('Mentee Pulse', 'heart-pulse', TINT)}
              <View style={{ gap: 8, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: MC.border }}>
                  <Text style={[s.colHeader, { flex: 2 }]}>Student</Text>
                  <Text style={[s.colHeader, { flex: 1 }]}>Progress</Text>
                  <Text style={[s.colHeader, { flex: 1 }]}>Risk Level</Text>
                  <View style={{ width: 80 }} />
                </View>
                {pulse.length === 0 && !loading && <Text style={{color: MC.dim, marginTop: 10, paddingLeft: 8}}>No mentees found.</Text>}
                {pulse.map(m => {
                  const risk = getRisk(m);
                  return (
                    <View key={m.user_id} style={s.tableRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={s.menteeName}>{m.name}</Text>
                        {m.stuck && <Text style={s.flagText}>Stuck on roadmap</Text>}
                      </View>
                      <Text style={[s.menteeName, { flex: 1 }]}>{m.progress_pct}%</Text>
                      <View style={{ flex: 1, flexDirection: 'row' }}>
                        <View style={[s.riskBadge, { backgroundColor: `${risk.color}22`, borderColor: risk.color }]}>
                          <Text style={[s.riskText, { color: risk.color }]}>{risk.label}</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => generatePrep(m)} disabled={!!prepLoading} style={[s.prepCta, !!prepLoading && { opacity: 0.6 }]}>
                        {prepLoading === m.user_id ? <ActivityIndicator size="small" color="#fff" /> : <MCI name="lightbulb-on-outline" size={12} color="#fff" />}
                        <Text style={s.prepCtaText}>{prepLoading === m.user_id ? 'Wait' : 'AI Prep'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* AI Session Preparation Panel (Appears when prep generated) */}
            {prep && (
              <View style={[s.sectionCard, { borderColor: TINT, borderWidth: 2 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  {renderSectionHeader(`AI Prep Brief: ${prep.mentee.name}`, 'robot-outline', TINT)}
                  <Pressable onPress={() => setPrep(null)}><MCI name="close" size={20} color={MC.muted} /></Pressable>
                </View>
                <View style={{ gap: 12, marginTop: 12 }}>
                  <View style={s.prepRow}><Text style={s.prepLabel}>Goal:</Text><Text style={s.prepValue}>{prep.mentee.target_role}</Text></View>
                  <View style={s.prepRow}>
                    <Text style={s.prepLabel}>Plan:</Text>
                    <View style={{ flex: 1, gap: 6 }}>
                      {prep.bullets.map((b, i) => (
                        <Text key={i} style={s.prepValue}>• {b}</Text>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

          </View>

          {/* RIGHT COLUMN */}
          <View style={{ flex: 1, gap: 24 }}>
            
            {/* AI Recommendations */}
            <View style={s.sectionCard}>
              {renderSectionHeader(' AI Recommendations', 'lightbulb-on', '#FCD34D')}
              <View style={{ gap: 10, marginTop: 12 }}>
                {recommendations.length === 0 && !loading && (
                  <Text style={{ color: MC.dim, fontSize: 12.5 }}>No recommendations yet — they appear once your mentees have skill scores.</Text>
                )}
                {recommendations.map((ins, i) => (
                  <View key={i} style={s.insightCard}>
                    <MCI name={ins.icon as any} size={18} color={TINT} />
                    <Text style={s.insightText}>{ins.title}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Student Leaderboard (Synced with Pulse) */}
            <View style={s.sectionCard}>
              {renderSectionHeader(' Top Performers', 'trophy', '#F59E0B')}
              <View style={{ gap: 12, marginTop: 12 }}>
                {topPerformers.length === 0 && !loading && <Text style={{color: MC.dim}}>No data.</Text>}
                {topPerformers.map((l, i) => (
                  <View key={l.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.rankNum}>#{i+1}</Text>
                      <Text style={s.menteeName}>{l.name}</Text>
                    </View>
                    <Text style={s.scoreText}>{l.progress_pct}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Upcoming Sessions & Activity */}
            <View style={s.sectionCard}>
              {renderSectionHeader('Upcoming Sessions', 'calendar', '#3B82F6')}
              <View style={{ gap: 12, marginTop: 12 }}>
                {upcoming.length === 0 && !loading && (
                  <Text style={{ color: MC.dim, fontSize: 12.5 }}>No upcoming sessions scheduled.</Text>
                )}
                {upcoming.map((sess, i) => (
                  <View key={sess.id || i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={s.dateBox}>
                      <MCI name="calendar-blank" size={14} color="#3B82F6" />
                      <Text style={[s.dateText, { color: '#3B82F6' }]}>
                        {formatSessionDate(sess.slot_start_iso || sess.scheduled_at)}
                      </Text>
                    </View>
                    <Text style={s.activityText} numberOfLines={1}>
                      {sess.student_name ? `${sess.student_name}: ` : ''}{sess.topic}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ImpactTile({ icon, label, value, accent }: { icon: any; label: string; value: any; accent: string }) {
  return (
    <View style={[s.kpi, { borderColor: `${accent}40` }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <MCI name={icon} size={14} color={accent} />
        <Text style={[s.kpiLabel, { color: accent }]}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  h1: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 20 },
  h1Sub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: 9,
    backgroundColor: MC.card, borderColor: MC.border2, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  refreshText: { color: TINT, fontFamily: FONTS.bold, fontSize: 11.5 },
  
  kpi: { minWidth: 140, flex: 1, backgroundColor: MC.card, borderWidth: 1, borderRadius: 12, padding: 14 },
  kpiLabel: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.5 },
  kpiValue: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 24 },

  sectionCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sectionTitle: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 15 },

  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gapName: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12, width: 120 },
  gapBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  gapBarFill: { height: '100%', borderRadius: 4 },
  gapScore: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11, width: 130, textAlign: 'right' },

  colHeader: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 11, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  menteeName: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 13 },
  flagText: { color: '#FCA5A5', fontSize: 10, marginTop: 2 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  riskText: { fontFamily: FONTS.bold, fontSize: 10, textTransform: 'uppercase' },

  prepCta: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8,
    backgroundColor: TINT, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  prepCtaText: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 11 },

  prepRow: { flexDirection: 'row', gap: 8 },
  prepLabel: { color: TINT, fontFamily: FONTS.bold, fontSize: 12, width: 60 },
  prepValue: { color: '#FFFFFF', fontFamily: FONTS.med, fontSize: 12, flex: 1, lineHeight: 18 },

  insightCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  insightText: { color: '#FFFFFF', fontFamily: FONTS.med, fontSize: 13, flex: 1 },

  activityText: { color: '#D1D5DB', fontFamily: FONTS.med, fontSize: 12.5 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `rgba(59,130,246,0.1)`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dateText: { fontFamily: FONTS.bold, fontSize: 11 },

  rankNum: { color: GOLD, fontFamily: FONTS.xbold, fontSize: 14 },
  scoreText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 },

});
