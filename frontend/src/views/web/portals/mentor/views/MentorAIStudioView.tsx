import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
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

const AI_INSIGHTS = [
  { title: 'Conduct SQL Workshop next week', icon: 'database' },
  { title: 'Schedule Mock Interviews for 12 students', icon: 'account-voice' },
  { title: 'Share Python Practice Resources', icon: 'language-python' },
];

const RECENT_ACTIVITY = [
  { text: 'Rahul completed SQL Assessment', icon: 'check-circle', color: '#10B981' },
  { text: 'Priya booked a session', icon: 'calendar-check', color: '#3B82F6' },
  { text: 'Sai uploaded resume', icon: 'file-upload', color: '#F59E0B' },
  { text: 'Ananya earned Python Badge', icon: 'medal', color: '#8B5CF6' },
];

const RESOURCES = [
  'Python Interview Questions',
  'SQL Cheat Sheet',
  'Data Science Roadmap',
  'Resume Templates',
  'Mock Interview Videos',
];

export function MentorAIStudioView() {
  const [pulse, setPulse] = useState<Mentee[]>([]);
  const [gaps, setGaps] = useState<SkillGap[]>([]);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, setLoading] = useState(true);
  const [prep, setPrep] = useState<Prep | null>(null);
  const [prepLoading, setPrepLoading] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);

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
    <View className="flex-row items-center gap-2.5">
      <View className="w-7 h-7 rounded-lg items-center justify-center border" style={{ backgroundColor: `${color}24`, borderColor: `${color}66` }}>
        <MCI name={icon as any} size={14} color={color} />
      </View>
      <Text className="text-white font-display-bold text-[15px]">{title}</Text>
    </View>
  );

  const getRisk = (m: Mentee) => {
    if (m.progress_pct >= 80) return { label: 'Very Low', color: '#10B981' };
    if (m.progress_pct >= 60) return { label: 'Moderate', color: '#F59E0B' };
    return { label: 'High', color: '#EF4444' };
  };

  const topPerformers = [...pulse].sort((a, b) => b.progress_pct - a.progress_pct).slice(0, 5);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 22, paddingBottom: 60, gap: 24 }}>
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-1">
          <View className="w-[44px] h-[44px] rounded-[12px] items-center justify-center border" style={{ backgroundColor: TINT_GLOW, borderColor: `${TINT}80` }}>
            <MCI name="head-cog-outline" size={20} color={TINT} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-display-bold text-xl">Mentor AI Studio</Text>
            <Text className="text-muted font-body-semibold text-[13px] mt-0.5">Comprehensive analytics, risk tracking, and AI session preparation.</Text>
          </View>
          <Pressable onPress={load} disabled={loading} className="flex-row items-center gap-[5px] h-8 px-3 rounded-[9px] bg-card border" style={{ borderColor: MC.border2, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }}>
            {loading ? <ActivityIndicator size="small" color={TINT} /> : <MCI name="refresh" size={14} color={TINT} />}
            <Text className="text-teal font-body-bold text-[11.5px]">{loading ? 'Loading' : 'Refresh'}</Text>
          </Pressable>
        </View>

        {/* Overview Cards */}
        <View className="flex-row flex-wrap gap-3">
          <ImpactTile icon="account-multiple" label="Total Mentees" value={impact?.mentees_total ?? '—'} accent={TINT} />
          <ImpactTile icon="calendar-check" label="Active Sessions" value={impact?.sessions_last_30d ?? '—'} accent={GOLD} />
          <ImpactTile icon="flag-checkered" label="Milestones" value={impact?.milestones_completed_total ?? '—'} accent="#3B82F6" />
          <ImpactTile icon="medal" label="Badges Earned" value={impact?.badges_earned_total ?? '—'} accent="#8B5CF6" />
          <ImpactTile icon="trending-up" label="Avg Progress" value={impact ? `${impact.avg_mentee_progress_pct}%` : '—'} accent="#10B981" />
        </View>

        <View style={{ flexDirection: Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth > 1000 ? 'row' : 'column', gap: 24 }}>
          {/* LEFT COLUMN */}
          <View className="flex-[2] gap-6">
            {/* Top Skill Gaps */}
            <View className="bg-card border border-glass-border rounded-[14px] p-4">
              {renderSectionHeader('Top Skill Gaps', 'chart-bar', '#F59E0B')}
              <View className="gap-3 mt-3">
                {gaps.length === 0 && !loading && <Text className="text-dim mt-2.5">No skill gaps detected.</Text>}
                {gaps.map((g, i) => (
                  <View key={g.skill} className="flex-row items-center gap-2.5">
                    <Text className="text-white font-body-bold text-xs w-[120px]">{g.skill}</Text>
                    <View className="flex-1 h-2 rounded bg-white/[0.06] overflow-hidden">
                      <View className="h-full rounded" style={{ width: `${g.avg_score}%` as any, backgroundColor: ['#3B82F6','#F59E0B','#10B981','#8B5CF6','#EC4899'][i%5] }} />
                    </View>
                    <Text className="text-muted font-body-semibold text-[11px] w-[130px] text-right">{g.mentees_below_60} mentees under 60%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Mentee Pulse */}
            <View className="bg-card border border-glass-border rounded-[14px] p-4">
              {renderSectionHeader('Mentee Pulse', 'heart-pulse', TINT)}
              <View className="gap-2 mt-3">
                <View className="flex-row px-2 pb-2 border-b border-glass-border">
                  <Text className="text-dim font-body-bold text-[11px] uppercase flex-[2]">Student</Text>
                  <Text className="text-dim font-body-bold text-[11px] uppercase flex-1">Progress</Text>
                  <Text className="text-dim font-body-bold text-[11px] uppercase flex-1">Risk Level</Text>
                  <View className="w-20" />
                </View>
                {pulse.length === 0 && !loading && <Text className="text-dim mt-2.5 pl-2">No mentees found.</Text>}
                {pulse.map(m => {
                  const risk = getRisk(m);
                  return (
                    <View key={m.user_id} className="flex-row py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <View className="flex-[2]">
                        <Text className="text-white font-body-bold text-[13px]">{m.name}</Text>
                        {m.stuck && <Text className="text-rose text-[10px] mt-0.5">⚠️ Stuck on roadmap</Text>}
                      </View>
                      <Text className="text-white font-body-bold text-[13px] flex-1">{m.progress_pct}%</Text>
                      <View className="flex-1 flex-row">
                        <View className="px-2 py-1 rounded-md border" style={{ backgroundColor: `${risk.color}22`, borderColor: risk.color }}>
                          <Text className="font-body-bold text-[10px] uppercase" style={{ color: risk.color }}>{risk.label}</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => generatePrep(m)} disabled={!!prepLoading} className="flex-row items-center gap-[5px] px-[11px] h-[30px] rounded-lg bg-teal" style={{ ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}), ...(!!prepLoading ? { opacity: 0.6 } : {}) }}>
                        {prepLoading === m.user_id ? <ActivityIndicator size="small" color="#fff" /> : <MCI name="lightbulb-on-outline" size={12} color="#fff" />}
                        <Text className="text-white font-display-bold text-[11px]">{prepLoading === m.user_id ? 'Wait' : 'AI Prep'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* AI Session Preparation Panel */}
            {prep && (
              <View className="bg-card border-2 rounded-[14px] p-4" style={{ borderColor: TINT }}>
                <View className="flex-row justify-between items-center">
                  {renderSectionHeader(`AI Prep Brief: ${prep.mentee.name}`, 'robot-outline', TINT)}
                  <Pressable onPress={() => setPrep(null)}><MCI name="close" size={20} color={MC.muted} /></Pressable>
                </View>
                <View className="gap-3 mt-3">
                  <View className="flex-row gap-2"><Text className="text-teal font-body-bold text-xs w-[60px]">Goal:</Text><Text className="text-white font-body-semibold text-xs flex-1 leading-[18px]">{prep.mentee.target_role}</Text></View>
                  <View className="flex-row gap-2">
                    <Text className="text-teal font-body-bold text-xs w-[60px]">Plan:</Text>
                    <View className="flex-1 gap-1.5">
                      {prep.bullets.map((b, i) => (
                        <Text key={i} className="text-white font-body-semibold text-xs flex-1 leading-[18px]">• {b}</Text>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* RIGHT COLUMN */}
          <View className="flex-1 gap-6">
            {/* AI Recommendations */}
            <View className="bg-card border border-glass-border rounded-[14px] p-4">
              {renderSectionHeader('💡 AI Recommendations', 'lightbulb-on', '#FCD34D')}
              <View className="gap-2.5 mt-3">
                {AI_INSIGHTS.map((ins, i) => (
                  <View key={i} className="flex-row items-center gap-2.5 bg-white/[0.03] p-3 rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <MCI name={ins.icon as any} size={18} color={TINT} />
                    <Text className="text-white font-body-semibold text-[13px] flex-1">{ins.title}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Student Leaderboard */}
            <View className="bg-card border border-glass-border rounded-[14px] p-4">
              {renderSectionHeader('🏆 Top Performers', 'trophy', '#F59E0B')}
              <View className="gap-3 mt-3">
                {topPerformers.length === 0 && !loading && <Text className="text-dim">No data.</Text>}
                {topPerformers.map((l, i) => (
                  <View key={l.user_id} className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-display-bold text-[14px]" style={{ color: GOLD }}>#{i+1}</Text>
                      <Text className="text-white font-body-bold text-[13px]">{l.name}</Text>
                    </View>
                    <Text className="text-white font-body-bold text-[14px]">{l.progress_pct}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Upcoming Sessions & Activity */}
            <View className="bg-card border border-glass-border rounded-[14px] p-4">
              {renderSectionHeader('Upcoming Sessions', 'calendar', '#3B82F6')}
              <View className="gap-3 mt-3">
                {upcoming.length === 0 && !loading && (
                  <Text className="text-dim text-[12.5px]">No upcoming sessions scheduled.</Text>
                )}
                {upcoming.map((sess, i) => (
                  <View key={sess.id || i} className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1 bg-blue/[0.1] px-1.5 py-0.5 rounded">
                      <MCI name="calendar-blank" size={14} color="#3B82F6" />
                      <Text className="font-body-bold text-[11px]" style={{ color: '#3B82F6' }}>
                        {formatSessionDate(sess.slot_start_iso || sess.scheduled_at)}
                      </Text>
                    </View>
                    <Text className="text-gray-300 font-body-semibold text-[12.5px] flex-1" numberOfLines={1}>
                      {sess.student_name ? `${sess.student_name}: ` : ''}{sess.topic}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="bg-card border border-glass-border rounded-[14px] p-4">
              {renderSectionHeader('📚 Recommended Resources', 'book-open-variant', '#10B981')}
              <View className="gap-2 mt-3">
                {RESOURCES.map((r, i) => (
                  <View key={i} className="flex-row items-center gap-1.5">
                    <MCI name="link-variant" size={14} color="#10B981" />
                    <Text className="text-white font-body-semibold text-[12.5px] underline">{r}</Text>
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
    <View className="min-w-[140px] flex-1 bg-card border rounded-xl p-3.5" style={{ borderColor: `${accent}40` }}>
      <View className="flex-row items-center gap-1.5 mb-2">
        <MCI name={icon} size={14} color={accent} />
        <Text className="font-body-bold text-[11px] tracking-[0.5px]" style={{ color: accent }}>{label}</Text>
      </View>
      <Text className="text-white font-display-bold text-[24px]">{value}</Text>
    </View>
  );
}
