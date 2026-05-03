/**
 * Mentor AI Studio — purpose-built for mentors (NOT a copy of student Career AI).
 *
 * Sections:
 *   • Mentee Pulse — live grid of mentees + their roadmap progress + stuck flag
 *   • Common Skill Gaps — top 5 skills below 60% across all mentees
 *   • Impact — sessions, milestones, badges earned by mentees
 *   • AI Session Prep — Claude-generated talking points for the next session
 *
 * Theme: teal/gold (mentor portal tokens), MaterialCommunityIcons throughout.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as MCI } from '@expo/vector-icons';
import { MC, FONTS } from '../tokens';
import { request } from '@/src/models/services/api';

interface Mentee {
  user_id: string;
  name: string;
  email?: string;
  year?: any;
  branch?: string;
  institution?: string;
  progress_pct: number;
  current_week_index?: number | null;
  current_week_title?: string;
  milestones_done: number;
  milestones_total: number;
  skill_scores_top?: Record<string, number>;
  stuck?: boolean;
  badges_count?: number;
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
  generated_at: string;
}

const TINT = MC.teal;
const TINT_GLOW = `${MC.teal}33`;
const GOLD = '#F59E0B';

export function MentorAIStudioView() {
  const [pulse, setPulse] = useState<Mentee[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, setLoading] = useState(true);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [prepLoading, setPrepLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c]: any = await Promise.all([
        request('/mentor/ai-studio/mentee-pulse'),
        request('/mentor/ai-studio/skill-gaps'),
        request('/mentor/ai-studio/impact'),
      ]);
      setPulse(a.items || []);
      setGaps(b.items || []);
      setImpact(c || null);
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
    } catch {} finally { setPrepLoading(null); }
  }, [prepLoading]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingBottom: 60, gap: 16 }}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={[s.headerIcon, { backgroundColor: TINT_GLOW, borderColor: `${TINT}80` }]}>
          <MCI name="head-cog-outline" size={20} color={TINT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.h1}>Mentor AI Studio</Text>
          <Text style={s.h1Sub}>Track every mentee · spot common skill gaps · prep AI-driven sessions in one tap</Text>
        </View>
        <Pressable onPress={load} disabled={loading} style={s.refreshBtn}>
          {loading ? <ActivityIndicator size="small" color={TINT} /> : <MCI name="refresh" size={14} color={TINT} />}
          <Text style={s.refreshText}>{loading ? 'Loading' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {/* Impact tiles */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <ImpactTile icon="account-multiple" label="Mentees" value={impact?.mentees_total ?? '—'} accent={TINT} />
        <ImpactTile icon="calendar-clock" label="Sessions · 30d" value={impact?.sessions_last_30d ?? '—'} accent={GOLD} />
        <ImpactTile icon="flag-checkered" label="Milestones Hit" value={impact?.milestones_completed_total ?? '—'} accent={MC.green} />
        <ImpactTile icon="medal" label="Badges Earned" value={impact?.badges_earned_total ?? '—'} accent={MC.purple} />
        <ImpactTile icon="trending-up" label="Avg Progress" value={impact ? `${impact.avg_mentee_progress_pct}%` : '—'} accent={TINT} />
      </View>

      {/* Common Skill Gaps */}
      <View style={s.sectionCard}>
        <View style={s.sectionHead}>
          <View style={[s.sectionIcon, { backgroundColor: `${GOLD}24`, borderColor: `${GOLD}66` }]}>
            <MCI name="alert-circle-outline" size={14} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Common Skill Gaps Across Your Mentees</Text>
            <Text style={s.sectionSub}>Skills where multiple mentees score under 60%. Lead workshops to lift the cohort.</Text>
          </View>
        </View>
        {gaps.length === 0 ? (
          <Empty icon="party-popper" text="No common gaps detected — your mentees are crushing it." />
        ) : (
          <View style={{ gap: 8 }}>
            {gaps.map((g) => (
              <View key={g.skill} style={s.gapRow}>
                <Text style={s.gapName}>{g.skill}</Text>
                <View style={s.gapBarTrack}>
                  <LinearGradient
                    colors={[GOLD, '#FBBF24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.gapBarFill, { width: `${Math.max(8, g.avg_score)}%` as any }]}
                  />
                </View>
                <Text style={s.gapScore}>{g.avg_score}%</Text>
                <View style={[s.menteeChip]}><MCI name="account-group-outline" size={9} color={GOLD} /><Text style={s.menteeChipText}>{g.mentees_below_60}</Text></View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Mentee Pulse */}
      <View style={s.sectionCard}>
        <View style={s.sectionHead}>
          <View style={[s.sectionIcon, { backgroundColor: TINT_GLOW, borderColor: `${TINT}66` }]}>
            <MCI name="pulse" size={14} color={TINT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Mentee Pulse · {pulse.length}</Text>
            <Text style={s.sectionSub}>Tap any mentee to generate a 5-bullet AI prep for your next session.</Text>
          </View>
        </View>
        {pulse.length === 0 ? (
          <Empty icon="account-heart-outline" text="No mentees connected yet. Open Connections to invite some." />
        ) : (
          <View style={{ gap: 10 }}>
            {pulse.map((m) => (
              <Pressable
                key={m.user_id}
                onPress={() => generatePrep(m)}
                style={({ hovered }: any) => [s.menteeCard, hovered && { borderColor: `${TINT}99`, backgroundColor: `${TINT}11` }]}
                testID={`mentee-${m.user_id}`}
              >
                <View style={[s.avatar, { backgroundColor: m.stuck ? '#EF4444' : TINT }]}>
                  <Text style={s.avatarTxt}>{(m.name || '?').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text numberOfLines={1} style={s.menteeName}>{m.name}</Text>
                    {m.stuck && (
                      <View style={s.stuckPill}><MCI name="alert" size={9} color="#FCA5A5" /><Text style={s.stuckText}>Stuck 7d+</Text></View>
                    )}
                  </View>
                  <Text style={s.menteeMeta} numberOfLines={1}>
                    {m.branch || '—'} · {m.institution || '—'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={s.miniBarTrack}>
                      <View style={[s.miniBarFill, { width: `${Math.max(4, m.progress_pct)}%` as any, backgroundColor: TINT }]} />
                    </View>
                    <Text style={s.menteeProgressTxt}>{m.progress_pct}%</Text>
                    <Text style={s.menteeMeta}>· {m.milestones_done}/{m.milestones_total} milestones</Text>
                  </View>
                </View>
                <Pressable onPress={() => generatePrep(m)} disabled={!!prepLoading} style={[s.prepCta, !!prepLoading && { opacity: 0.6 }]}>
                  {prepLoading === m.user_id ? <ActivityIndicator size="small" color="#fff" /> : <MCI name="lightbulb-on-outline" size={12} color="#fff" />}
                  <Text style={s.prepCtaText}>{prepLoading === m.user_id ? 'Generating' : 'AI Prep'}</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* AI Session Prep panel */}
      {prep && (
        <View style={[s.prepPanel, { borderColor: `${TINT}80` }]}>
          <LinearGradient
            colors={[`${TINT}26`, `${TINT}05`] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <MCI name="auto-fix" size={18} color={TINT} />
            <View style={{ flex: 1 }}>
              <Text style={s.prepTitle}>Session Plan · {prep.mentee.name}</Text>
              <Text style={s.prepSub}>Goal: {prep.mentee.target_role} · {prep.mentee.progress_pct}% · {prep.provider_label}</Text>
            </View>
            <Pressable onPress={() => setPrep(null)} style={s.dismissBtn}>
              <MCI name="close" size={14} color={MC.muted} />
            </Pressable>
          </View>
          <View style={{ gap: 8, marginTop: 8 }}>
            {prep.bullets.map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <View style={[s.bulletNum, { backgroundColor: `${TINT}33`, borderColor: `${TINT}66` }]}>
                  <Text style={[s.bulletNumText, { color: TINT }]}>{i + 1}</Text>
                </View>
                <Text style={s.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={s.disclaimer}>
        AI Studio · Powered by Emergent LLM · Updates every load. Talking points are suggestions; tailor to mentee context.
      </Text>
    </ScrollView>
  );
}

function ImpactTile({ icon, label, value, accent }: { icon: any; label: string; value: any; accent: string }) {
  return (
    <View style={[s.kpi, { borderColor: `${accent}40` }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <MCI name={icon} size={13} color={accent} />
        <Text style={[s.kpiLabel, { color: accent }]}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>{value}</Text>
    </View>
  );
}

function Empty({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.emptyBox}>
      <MCI name={icon} size={26} color={MC.dim} />
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  headerIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  h1Sub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: 9,
    backgroundColor: MC.card, borderColor: MC.border2, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  refreshText: { color: TINT, fontFamily: FONTS.bold, fontSize: 11.5 },

  kpi: {
    minWidth: 160, flex: 1, backgroundColor: MC.card, borderWidth: 1, borderRadius: 14,
    padding: 14,
  },
  kpiLabel: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },
  kpiValue: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22 },

  sectionCard: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14,
    padding: 16,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sectionTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  sectionSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },

  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gapName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12, width: 160 },
  gapBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  gapBarFill: { height: '100%', borderRadius: 3 },
  gapScore: { color: GOLD, fontFamily: FONTS.bold, fontSize: 11, width: 36, textAlign: 'right' },
  menteeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: `${GOLD}1F`, borderColor: `${GOLD}55`, borderWidth: 1 },
  menteeChipText: { color: GOLD, fontFamily: FONTS.xbold, fontSize: 10 },

  menteeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)', borderColor: MC.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  avatar: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  menteeName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  menteeMeta: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11 },
  menteeProgressTxt: { color: TINT, fontFamily: FONTS.bold, fontSize: 11 },
  miniBarTrack: { width: 100, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 3 },
  stuckPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.40)', borderWidth: 1 },
  stuckText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 9.5 },

  prepCta: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8,
    backgroundColor: TINT, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  prepCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11 },

  prepPanel: {
    borderRadius: 14, padding: 16, overflow: 'hidden',
    backgroundColor: MC.card, borderWidth: 1,
  },
  prepTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5 },
  prepSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  dismissBtn: { width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  bulletNum: { width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 1 },
  bulletNumText: { fontFamily: FONTS.xbold, fontSize: 11 },
  bulletText: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 },

  emptyBox: { paddingVertical: 24, alignItems: 'center', gap: 10 },
  emptyText: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },

  disclaimer: { color: MC.dim, fontFamily: FONTS.med, fontSize: 10.5, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
});
