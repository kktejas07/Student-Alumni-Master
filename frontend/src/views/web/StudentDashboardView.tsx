/**
 * StudentDashboardView — Job Readiness Command Center (Phase 2: AI Coach)
 *
 * Phase 1: All 9 mock data blocks replaced with live API data.
 * Phase 2: AI Daily Brief, AI Coach Card, Career Insights added.
 *
 *  Answers:
 *  1. What happened yesterday? → AI Daily Brief + Yesterday's Wins
 *  2. What should I do NOW?    → AI Coach Card (WHY explanation + impact)
 *  3. What's blocking me?      → Career Insights strip (dynamic signals)
 *  4. Where am I?              → Career Readiness Hero
 *  5. What are my numbers?     → Activity Pulse KPIs
 *  6. Skills breakdown         → Skill Score Bars
 *  7. Career Journey           → Roadmap milestones
 *  8. Act today                → Internships + Mentors + Events
 */
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  useWindowDimensions, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Search, Briefcase, Users, Trophy, Rocket, Sparkles, ArrowRight,
  MapPin, Coins, Calendar, Target, Flame, Zap, BarChart2, RefreshCw,
  ChevronRight, Award, Building2, GraduationCap, FileText, Code,
  MessageSquare, TrendingUp, AlertTriangle, Eye, Bot, Lightbulb,
  CheckCircle, XCircle, Info, Star,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { request } from '@/src/models/services/api';
import { useScreenAnalytics } from '@/src/analytics';
import { UserBadgesInline } from './UserBadgesInline';
import { StudentDashboardMobileView } from './StudentDashboardMobileView';
import { PredictionTimeline } from './PredictionTimeline';
import { ReadinessEstimates } from './ReadinessEstimates';
import { GoalSimulator } from './GoalSimulator';

// ─── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  card:   'rgba(255,255,255,0.05)',
  cardH:  'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.08)',
  purple: '#7C3AED', purpleL: '#A78BFA', purpleXL: '#C4B5FD',
  teal: '#2DD4BF', green: '#34D399', amber: '#F59E0B',
  blue: '#60A5FA', pink: '#F472B6',
  text: 'rgba(255,255,255,0.55)', dim: 'rgba(255,255,255,0.28)',
};
const FT = { bold: 'DMSans_700Bold', semi: 'DMSans_600SemiBold', med: 'DMSans_500Medium', reg: 'DMSans_400Regular' };

const SKILL_AXES = [
  { key: 'Technical Excellence',       color: '#2DD4BF' },
  { key: 'Professional Communication', color: '#A78BFA' },
  { key: 'Personal Brand',             color: '#F472B6' },
  { key: 'Leadership & Collaboration', color: '#F59E0B' },
  { key: 'Career Preparation',         color: '#60A5FA' },
  { key: 'Industry Presence',          color: '#C4B5FD' },
];

const MILESTONE_META: Record<string, { color: string }> = {
  RESUME: { color: '#A78BFA' }, PORTFOLIO: { color: '#2DD4BF' }, PROFILE: { color: '#60A5FA' },
  NETWORKING: { color: '#2DD4BF' }, SKILLS: { color: '#F59E0B' }, MOCK_INTERVIEW: { color: '#F472B6' },
  PROJECT: { color: '#A78BFA' }, CERTIFICATION: { color: '#34D399' }, LINKEDIN: { color: '#60A5FA' },
  JOB_APPLICATION: { color: '#F59E0B' },
};

const ACTION_META: Record<string, { color: string; Icon: any }> = {
  PORTFOLIO: { color: '#2DD4BF', Icon: Code }, MOCK_INTERVIEW: { color: '#F472B6', Icon: MessageSquare },
  PROJECT: { color: '#A78BFA', Icon: Rocket }, RESUME: { color: '#7C3AED', Icon: FileText },
  LINKEDIN: { color: '#60A5FA', Icon: Users }, SKILLS: { color: '#F59E0B', Icon: Zap },
  CERTIFICATION: { color: '#34D399', Icon: Award }, NETWORKING: { color: '#2DD4BF', Icon: Users },
  JOB_APPLICATION: { color: '#F59E0B', Icon: Briefcase },
};

// Static nav shortcuts (no mock data — these are routing links only)
const QUICK_ACTIONS_NAV = [
  { id: 'career-ai',   label: 'Career AI',   Icon: Sparkles,      color: '#A78BFA' },
  { id: 'internships', label: 'Internships', Icon: Briefcase,     color: '#60A5FA' },
  { id: 'mentors',     label: 'Book Mentor', Icon: Users,         color: '#34D399' },
  { id: 'events',      label: 'Events',      Icon: Calendar,      color: '#F472B6' },
  { id: 'network',     label: 'Network',     Icon: GraduationCap, color: '#2DD4BF' },
  { id: 'profile',     label: 'Profile',     Icon: Target,        color: '#F59E0B' },
];

// ─── Types ─────────────────────────────────────────────────────────────────
interface Insight {
  icon: string; color: string; text: string; type: string; priority?: number;
}
interface CoachAction {
  type: string; title: string; gain: number; reason: string;
  impact_breakdown?: string[]; estimated_readiness?: number;
}
interface AiCoach {
  current_readiness: number; current_tier: string; next_tier: string; points_to_next: number;
  weakest_category: string; weakest_score: number;
  strongest_category: string; strongest_score: number;
  top_action: CoachAction | null;
  total_potential_gain_today: number; confidence_score: number;
  score_factors?: Array<{ label: string; earned: number; max: number; done: boolean }>;
}
interface DashSummary {
  skill_intelligence: {
    readiness_score: { score: number; level: string; next_level: string; next_threshold: number };
    skill_scores: Record<string, number>;
    potential_score: number;
    ranked_actions: Array<{ type: string; title: string; gain: number; reason: string; impact_breakdown?: string[] }>;
  };
  profile_completion: { percentage: number; items: Array<{ label: string; done: boolean; weight: number }> };
  stats: { connections: number; sessions: number; applications: number; streak: number };
  career_roadmap: {
    target_role: string; progress_pct: number;
    milestones_total: number; milestones_completed: number;
    next_milestone: { title: string; milestone_type: string } | null;
  } | null;
  featured: {
    internships: Array<{ title: string; company: string; location: string; stipend: string }>;
    mentors: Array<{ id: string; full_name: string; designation: string; organization: string; rating: number }>;
    events: Array<{ title: string; date_str: string; time_str: string; mode: string; category: string; coverColor: string }>;
  };
  notification_count: number;
  ai_coach: AiCoach;
  career_insights: Insight[];
  yesterday_wins: Array<{ label: string; detail: string; icon: string; color: string }>;
  predictions: {
    current: number;
    predictions: {
      '7d': { score: number; gain: number; actions: Array<{ type: string; gain: number; title: string }> };
      '30d': { score: number; gain: number; actions: Array<{ type: string; gain: number; title: string }> };
      '90d': { score: number; gain: number; actions: Array<{ type: string; gain: number; title: string }> };
    };
  };
  readiness_estimates: {
    internship_readiness: { label: string; percentage: number; is_ready: boolean; met_weight: number; total_weight: number; details: Array<{ criteria: string; met: boolean; weight: number }> };
    placement_readiness: { label: string; percentage: number; is_ready: boolean; met_weight: number; total_weight: number; details: Array<{ criteria: string; met: boolean; weight: number }> };
    interview_readiness: { label: string; percentage: number; is_ready: boolean; met_weight: number; total_weight: number; details: Array<{ criteria: string; met: boolean; weight: number }> };
  };
  user: { full_name: string; role: string; career_path: string; career_goal: string };
}

// ─── Data Hook ─────────────────────────────────────────────────────────────
function useStudentDashboard() {
  const [data, setData]       = useState<DashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await request<DashSummary>('/dashboard/student-summary');
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load };
}

// ─── AI Daily Brief Hook (separate — may be slow, cached per day) ──────────
function useDailyBrief() {
  const [brief, setBrief]       = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [provider, setProvider] = useState<string>('AI');
  const load = useCallback(async () => {
    try {
      setBriefLoading(true);
      const result = await request<{ brief: string; provider_label?: string; cached?: boolean }>(
        '/ai/daily-brief', { method: 'POST' }
      );
      setBrief(result.brief || null);
      setProvider(result.provider_label || 'AI');
    } catch {
      setBrief(null);
    } finally {
      setBriefLoading(false);
    }
  }, []);
  const refresh = useCallback(async () => {
    try {
      setBriefLoading(true);
      const result = await request<{ brief: string; provider_label?: string }>(
        '/ai/daily-brief', { method: 'POST', body: { force: true } }
      );
      setBrief(result.brief || null);
      setProvider(result.provider_label || 'AI');
    } catch {
      setBrief(null);
    } finally {
      setBriefLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { brief, briefLoading, provider, refreshBrief: refresh };
}

// ─── Insight Icon Map ───────────────────────────────────────────────────────
function InsightIcon({ name, color, size = 13 }: { name: string; color: string; size?: number }) {
  const map: Record<string, any> = {
    'file-text': FileText, 'eye': Eye, 'alert-triangle': AlertTriangle,
    'users': Users, 'briefcase': Briefcase, 'zap': Zap, 'target': Target,
    'trophy': Trophy, 'trending-up': TrendingUp, 'check-circle': CheckCircle,
    'info': Info, 'star': Star,
  };
  const IconC = map[name] || Info;
  return <IconC size={size} color={color} />;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export type StudentDashboardViewProps = {
  showTopBar?: boolean;
  userName?: string;
  notifCount?: number;
  onSeeAllInternships?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function StudentDashboardView({ showTopBar = true, onOpenNotifications, onOpenProfile }: StudentDashboardViewProps) {
  useScreenAnalytics('student_dashboard');
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const router = useRouter();
  const { data, loading, error, refresh } = useStudentDashboard();
  const { brief, briefLoading, provider, refreshBrief } = useDailyBrief();
  const [coachExpanded, setCoachExpanded] = useState(false);

  const intel      = data?.skill_intelligence;
  const completion = data?.profile_completion;
  const stats      = data?.stats;
  const roadmap    = data?.career_roadmap;
  const featured   = data?.featured;
  const coach      = data?.ai_coach;
  const insights   = data?.career_insights ?? [];
  const yesterdayWins = data?.yesterday_wins ?? [];
  const notifCount = data?.notification_count ?? 0;
  const userName   = data?.user?.full_name || 'there';
  const readiness  = intel?.readiness_score?.score ?? 0;
  const level      = intel?.readiness_score?.level ?? '';
  const nextLevel  = intel?.readiness_score?.next_level ?? '';
  const nextThresh = intel?.readiness_score?.next_threshold ?? 100;
  const potential  = intel?.potential_score ?? 100;
  const skillScores= intel?.skill_scores ?? {};
  const actions    = intel?.ranked_actions ?? [];
  const profilePct = completion?.percentage ?? 0;
  const completionItems = completion?.items ?? [];
  const readinessColor = readiness >= 75 ? C.green : readiness >= 50 ? C.amber : C.purpleL;
  const ptsToNext = Math.max(0, nextThresh - readiness);
  const totalPotential = coach?.total_potential_gain_today ?? 0;

  const handleNav = (id: string) => {
    switch (id) {
      case 'career-ai':   router.push('/career-ai' as any); break;
      case 'internships': router.push('/internships' as any); break;
      case 'mentors':     router.push('/network' as any); break;
      case 'events':      router.push('/events' as any); break;
      case 'network':     router.push('/network' as any); break;
      case 'profile':     router.push('/student-portal?tab=profile' as any); break;
    }
  };

  if (width < 768) {
    return <StudentDashboardMobileView userName={userName} notifCount={notifCount} onOpenNotifications={onOpenNotifications} onOpenProfile={onOpenProfile} />;
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.content, !isWide && s.contentNarrow]} showsVerticalScrollIndicator={false}>

      {/* TOP BAR */}
      {showTopBar && (
        <View style={[s.topBar, !isWide && s.topBarNarrow]}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Good morning, {userName} 👋</Text>
            <Text style={s.greetingSub}>
              {loading ? 'Loading your Career AI data…' : `Readiness: ${readiness}% · ${level}`}
            </Text>
            <UserBadgesInline max={4} compact />
          </View>
          {isWide && (
            <View style={s.searchBox}>
              <Search size={14} color={C.dim} />
              <TextInput placeholder="Search internships, mentors, events…" placeholderTextColor={C.dim} style={s.searchInput} />
            </View>
          )}
          <Pressable onPress={refresh} style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: C.cardH }]}>
            <RefreshCw size={16} color={C.purpleL} />
          </Pressable>
          <Pressable onPress={onOpenNotifications} testID="dash-notif-btn" style={({ hovered }: any) => [s.iconBtn, hovered && { backgroundColor: C.cardH }]}>
            <Bell size={18} color={C.purpleL} />
            {notifCount > 0 && <View style={s.notifDot}><Text style={s.notifDotText}>{notifCount > 9 ? '9+' : notifCount}</Text></View>}
          </Pressable>
        </View>
      )}

      {/* LOADING */}
      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={C.purpleL} />
          <Text style={[s.dimText, { marginTop: 12 }]}>Loading your Career Command Center…</Text>
        </View>
      )}

      {/* ERROR */}
      {!loading && error && (
        <View style={[s.card, { alignItems: 'center', padding: 32 }]}>
          <Text style={{ color: '#fff', fontFamily: FT.semi, marginBottom: 12 }}>Failed to load dashboard</Text>
          <Pressable onPress={refresh} style={s.primaryBtn}>
            <RefreshCw size={13} color="#fff" />
            <Text style={s.primaryBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && data && (<>

        {/* ── AI DAILY BRIEF BANNER ── */}
        <View style={s.briefCard}>
          <LinearGradient colors={['rgba(88,28,135,0.6)', 'rgba(30,20,70,0.4)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
            <View style={s.briefBotIcon}>
              <Bot size={20} color={C.purpleXL} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={s.briefEyebrow}>AI DAILY BRIEF</Text>
                <View style={s.briefBadge}><Text style={s.briefBadgeText}>{provider}</Text></View>
                {!briefLoading && yesterdayWins.length > 0 && (
                  <View style={[s.briefBadge, { backgroundColor: C.green + '22', borderColor: C.green + '44' }]}>
                    <Text style={[s.briefBadgeText, { color: C.green }]}>{yesterdayWins.length} win{yesterdayWins.length !== 1 ? 's' : ''} yesterday</Text>
                  </View>
                )}
              </View>
              {briefLoading ? (
                <View style={{ gap: 8 }}>
                  <View style={{ height: 14, width: '90%', backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 7 }} />
                  <View style={{ height: 14, width: '75%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 7 }} />
                </View>
              ) : (
                <Text style={s.briefText}>{brief || `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${userName.split(' ')[0]}! Your career readiness is at ${readiness}% — you're ${ptsToNext > 0 ? `${ptsToNext}% away from ${nextLevel}` : 'at the top tier!'}. Focus on today's top actions to keep advancing.`}</Text>
              )}
              {/* Yesterday's Wins */}
              {yesterdayWins.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {yesterdayWins.slice(0, 3).map((w, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.30)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <CheckCircle size={11} color={C.green} />
                      <Text style={{ color: C.green, fontFamily: FT.med, fontSize: 11 }}>{w.label}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Potential gain summary */}
              {totalPotential > 0 && !briefLoading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <Zap size={12} color={C.teal} />
                  <Text style={{ color: C.teal, fontFamily: FT.bold, fontSize: 11.5 }}>+{totalPotential}% potential readiness gain today</Text>
                </View>
              )}
            </View>
            <Pressable onPress={refreshBrief} testID="dash-refresh-brief" style={({ hovered }: any) => [s.iconBtn, { width: 32, height: 32, borderRadius: 9 }, hovered && { backgroundColor: C.cardH }]}>
              <RefreshCw size={13} color={C.dim} />
            </Pressable>
          </View>
        </View>

        {/* ── CAREER INSIGHTS STRIP ── */}
        {insights.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 2 }}>
            {insights.map((ins, idx) => {
              const isPriority = ins.type === 'blocker' || ins.type === 'highlight';
              return (
                <Pressable key={idx} style={({ hovered }: any) => [{
                  flexDirection: 'row', alignItems: 'center', gap: 7,
                  backgroundColor: ins.color + (isPriority ? '18' : '12'),
                  borderColor: ins.color + (isPriority ? '55' : '33'),
                  borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
                  ...({ cursor: 'pointer', transitionDuration: '150ms', whiteSpace: 'nowrap' } as any),
                }, hovered && { backgroundColor: ins.color + '28' }]}>
                  <InsightIcon name={ins.icon} color={ins.color} size={12} />
                  <Text style={{ color: '#fff', fontFamily: isPriority ? FT.semi : FT.med, fontSize: 12, flexShrink: 0 }} numberOfLines={1}>{ins.text}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* ── AI COACH CARD ── */}
        {coach && (
          <View style={s.coachCard}>
            <LinearGradient colors={['rgba(109,40,217,0.25)', 'rgba(30,20,70,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={[{ position: 'relative' }, isWide && { flexDirection: 'row', gap: 24, alignItems: 'flex-start' }]}>
              {/* Left: Coach Summary */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ backgroundColor: C.purple + '44', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: C.purpleL + '44' }}><Lightbulb size={16} color={C.purpleXL} /></View>
                  <Text style={s.sectionLabel}>AI CAREER COACH</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                    <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 9.5 }}>{coach.confidence_score}% confidence</Text>
                  </View>
                </View>
                {/* Tier progression */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <View style={[s.tierPill, { borderColor: readinessColor + '55', backgroundColor: readinessColor + '18' }]}>
                    <Text style={[s.tierText, { color: readinessColor }]}>{coach.current_tier}</Text>
                  </View>
                  <ChevronRight size={14} color={C.dim} />
                  <View style={[s.tierPill, { borderColor: C.teal + '55', backgroundColor: C.teal + '18' }]}>
                    <Text style={[s.tierText, { color: C.teal }]}>{coach.next_tier}</Text>
                  </View>
                  <Text style={{ color: C.text, fontFamily: FT.med, fontSize: 11 }}>  {coach.points_to_next} pts</Text>
                </View>
                {/* Weakness + Strength row */}
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  <View style={{ flex: 1, minWidth: 140, backgroundColor: '#F87171' + '14', borderColor: '#F87171' + '44', borderWidth: 1, borderRadius: 10, padding: 10 }}>
                    <Text style={{ color: '#F87171', fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.8, marginBottom: 4 }}>WEAKEST</Text>
                    <Text style={{ color: '#fff', fontFamily: FT.semi, fontSize: 12.5 }}>{coach.weakest_category}</Text>
                    <Text style={{ color: '#F87171', fontFamily: FT.bold, fontSize: 11, marginTop: 2 }}>{coach.weakest_score}%</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 140, backgroundColor: C.green + '14', borderColor: C.green + '44', borderWidth: 1, borderRadius: 10, padding: 10 }}>
                    <Text style={{ color: C.green, fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.8, marginBottom: 4 }}>STRONGEST</Text>
                    <Text style={{ color: '#fff', fontFamily: FT.semi, fontSize: 12.5 }}>{coach.strongest_category}</Text>
                    <Text style={{ color: C.green, fontFamily: FT.bold, fontSize: 11, marginTop: 2 }}>{coach.strongest_score}%</Text>
                  </View>
                </View>
              </View>
              {/* Right: Top Action with WHY */}
              {coach.top_action && (
                <View style={[s.coachActionBox, !isWide && { marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: (ACTION_META[coach.top_action.type]?.color || C.purpleL) + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: (ACTION_META[coach.top_action.type]?.color || C.purpleL) + '44' }}>
                      {(() => { const m = ACTION_META[coach.top_action.type]; const I = m?.Icon || Zap; return <I size={13} color={m?.color || C.purpleL} />; })()}
                    </View>
                    <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 10, letterSpacing: 0.8 }}>HIGHEST IMPACT ACTION</Text>
                  </View>
                  <Text style={{ color: '#fff', fontFamily: FT.bold, fontSize: 15, marginBottom: 4 }}>{coach.top_action.title}</Text>
                  <Text style={{ color: C.text, fontFamily: FT.reg, fontSize: 12, lineHeight: 17, marginBottom: 10 }}>{coach.top_action.reason}</Text>
                  {/* WHY expand */}
                  <Pressable onPress={() => setCoachExpanded(!coachExpanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <Info size={11} color={C.purpleL} />
                    <Text style={{ color: C.purpleL, fontFamily: FT.bold, fontSize: 11 }}>WHY THIS? {coachExpanded ? '▲' : '▼'}</Text>
                  </Pressable>
                  {coachExpanded && coach.top_action.impact_breakdown && (
                    <View style={{ gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                      {coach.top_action.impact_breakdown.map((line, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.purpleXL }} />
                          <Text style={{ color: C.purpleXL, fontFamily: FT.med, fontSize: 11.5 }}>{line}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* Gain row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.green + '18', borderColor: C.green + '44', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <TrendingUp size={12} color={C.green} />
                      <Text style={{ color: C.green, fontFamily: FT.bold, fontSize: 12 }}>+{coach.top_action.gain}% readiness</Text>
                    </View>
                    {coach.top_action.estimated_readiness && (
                      <Text style={{ color: C.text, fontFamily: FT.med, fontSize: 11 }}>{coach.current_readiness}% → {coach.top_action.estimated_readiness}%</Text>
                    )}
                  </View>
                  <Pressable onPress={() => handleNav('career-ai')} style={({ hovered, pressed }: any) => [{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.purple, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, marginTop: 12, alignSelf: 'flex-start', ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) }, hovered && { backgroundColor: '#6D28D9' }, pressed && { transform: [{ scale: 0.97 }] }]}>
                    <Sparkles size={12} color="#fff" />
                    <Text style={{ color: '#fff', fontFamily: FT.bold, fontSize: 12 }}>Start in Career AI</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── CAREER READINESS HERO ── */}
        <View style={s.heroShell}>
          <LinearGradient colors={['#4C1D95', '#5B21B6', '#1E1147']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

          <View style={[s.heroBody, !isWide && { flexDirection: 'column', gap: 20 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.heroEyebrow}>🤖 CAREER AI · JOB READINESS COMMAND CENTER</Text>
              <Text style={[s.heroTitle, !isWide && { fontSize: 20, lineHeight: 26 }]}>
                {'You\'re '}<Text style={{ color: readinessColor }}>{readiness}% Career Ready</Text>
                {(roadmap?.target_role || data.user.career_goal) ? (<>{'\ntargeting '}<Text style={{ color: C.purpleXL }}>{roadmap?.target_role || data.user.career_goal}</Text></>) : null}
              </Text>
              <View style={{ marginBottom: 14 }}>
                <View style={s.rowSplit}>
                  <Text style={s.heroPLabel}>Career Readiness</Text>
                  <Text style={[s.heroPVal, { color: readinessColor }]}>{readiness}% · {level}</Text>
                </View>
                <View style={s.heroPTrack}>
                  <View style={[s.heroPFill, { width: `${readiness}%`, backgroundColor: readinessColor }]} />
                </View>
                <Text style={[s.dimText, { fontSize: 11, marginTop: 4, textAlign: 'left' }]}>
                  {ptsToNext > 0 ? `+${ptsToNext}% to reach ${nextLevel}` : 'At maximum level ✓'}
                </Text>
              </View>
              {(roadmap?.progress_pct ?? 0) > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <View style={s.rowSplit}>
                    <Text style={s.heroPLabel}>Career Journey</Text>
                    <Text style={[s.heroPVal, { color: C.teal }]}>{roadmap!.progress_pct}% complete</Text>
                  </View>
                  <View style={s.heroPTrack}>
                    <View style={[s.heroPFill, { width: `${roadmap!.progress_pct}%`, backgroundColor: C.teal }]} />
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                <Pressable onPress={() => handleNav('career-ai')} style={({ hovered, pressed }: any) => [s.heroPrimaryBtn, hovered && { transform: [{ translateY: -1 }] }, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <Text style={s.heroPrimaryText}>View Full Roadmap</Text>
                  <ArrowRight size={13} color="#5B21B6" />
                </Pressable>
                <Pressable onPress={() => handleNav('internships')} style={({ hovered }: any) => [s.heroGhostBtn, hovered && { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={s.heroGhostText}>Browse Internships</Text>
                </Pressable>
              </View>
            </View>
            <View style={[s.heroStats, !isWide && { width: '100%', justifyContent: 'space-between' }]}>
              {[
                { label: 'Readiness', value: `${readiness}%`, color: readinessColor, Icon: Trophy },
                { label: 'Potential', value: `${potential}%`, color: C.teal, Icon: TrendingUp },
                { label: 'Profile',   value: `${profilePct}%`, color: C.blue, Icon: Target },
              ].map((st) => (
                <View key={st.label} style={[s.heroStatTile, !isWide && { flex: 1 }]}>
                  <st.Icon size={18} color={st.color} />
                  <Text style={[s.heroStatVal, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.heroStatLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── PREDICTIONS & READINESS ESTIMATES ── */}
        <View style={[s.grid2, !isWide && s.grid2Narrow]}>
          <View style={{ flex: 1 }}>
            <PredictionTimeline data={data?.predictions ?? null} />
          </View>
          <View style={{ width: isWide ? 280 : undefined }}>
            <ReadinessEstimates data={data?.readiness_estimates ?? null} />
          </View>
        </View>

        {/* ── ACTIVITY PULSE KPIs ── */}
        <View style={[s.kpiRow, !isWide && s.kpiRowNarrow]}>
          {[
            { label: 'CONNECTIONS',  value: stats?.connections ?? 0,  note: 'Professional network', color: C.teal,    Icon: Users },
            { label: 'SESSIONS',     value: stats?.sessions ?? 0,     note: 'Mentor sessions done',  color: C.purpleL, Icon: Award },
            { label: 'APPLICATIONS', value: stats?.applications ?? 0, note: 'Jobs applied',          color: C.blue,    Icon: Briefcase },
            { label: 'SKILL STREAK', value: stats?.streak ?? 0,       note: (stats?.streak ?? 0) === 0 ? 'Start your streak' : `${stats?.streak} day streak 🔥`, color: C.amber, Icon: Flame },
          ].map((k) => (
            <Pressable key={k.label} style={({ hovered }: any) => [s.kpiCard, !isWide && { flexBasis: '47%', flexGrow: 1 }, hovered && { backgroundColor: C.cardH, transform: [{ translateY: -2 }] }]}>
              <View style={[s.kpiIconWrap, { backgroundColor: k.color + '22', borderColor: k.color + '44', borderWidth: 1 }]}>
                <k.Icon size={18} color={k.color} />
              </View>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={[s.kpiNote, { color: k.color }]}>{k.note}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── MAIN 2-COLUMN GRID ── */}
        <View style={[s.grid2, !isWide && s.grid2Narrow]}>

          {/* LEFT */}
          <View style={[s.leftCol, isWide && { flex: 1.6 }]}>

            {/* AI Action Plan */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Sparkles size={14} color={C.purpleL} /><Text style={s.sectionLabel}>TODAY'S AI ACTION PLAN</Text></View>
                <Pressable onPress={() => handleNav('career-ai')} style={s.seeAllBtn}><Text style={s.seeAllText}>Full Plan</Text><ChevronRight size={11} color={C.purpleL} /></Pressable>
              </View>
              {actions.length === 0 ? (
                <View style={[s.emptyState, { paddingVertical: 16 }]}>
                  <Sparkles size={26} color={C.dim} />
                  <Text style={[s.dimText, { marginTop: 8 }]}>Complete your profile to unlock personalized AI recommendations.</Text>
                  <Pressable onPress={() => handleNav('career-ai')} style={[s.primaryBtn, { marginTop: 12 }]}><Text style={s.primaryBtnText}>Open Career AI</Text></Pressable>
                </View>
              ) : (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {actions.slice(0, 3).map((act, idx) => {
                    const meta = ACTION_META[act.type] || { color: C.purpleL, Icon: Zap };
                    return (
                      <Pressable key={idx} onPress={() => handleNav('career-ai')} style={({ hovered, pressed }: any) => [s.actionRow, hovered && { backgroundColor: C.cardH, borderColor: meta.color + '44' }, pressed && { transform: [{ scale: 0.99 }] }]}>
                        <View style={[s.actionIcon, { backgroundColor: meta.color + '22', borderColor: meta.color + '44' }]}><meta.Icon size={14} color={meta.color} /></View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.actionTitle}>{act.title}</Text>
                          <Text style={s.actionReason} numberOfLines={2}>{act.reason}</Text>
                        </View>
                        <View style={[s.actionGain, { borderColor: meta.color + '44' }]}><Text style={[s.actionGainText, { color: meta.color }]}>+{act.gain}%</Text></View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Skill Score Bars */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><BarChart2 size={14} color={C.purpleL} /><Text style={s.sectionLabel}>SKILL SCORE BREAKDOWN</Text></View>
              </View>
              <View style={{ gap: 10, marginTop: 10 }}>
                {SKILL_AXES.map((ax) => {
                  const pct = skillScores[ax.key] ?? 0;
                  return (
                    <View key={ax.key}>
                      <View style={s.rowSplit}><Text style={s.skillLabel}>{ax.key}</Text><Text style={[s.skillPct, { color: ax.color }]}>{pct}%</Text></View>
                      <View style={s.skillTrack}><View style={[s.skillFill, { width: `${pct}%`, backgroundColor: ax.color }]} /></View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Internship Matches */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Briefcase size={14} color={C.purpleL} /><Text style={s.sectionLabel}>TOP INTERNSHIP MATCHES</Text></View>
                <Pressable onPress={() => handleNav('internships')} style={s.seeAllBtn}><Text style={s.seeAllText}>See All</Text><ChevronRight size={11} color={C.purpleL} /></Pressable>
              </View>
              {(featured?.internships ?? []).length === 0 ? (
                <View style={[s.emptyState, { paddingVertical: 16 }]}><Building2 size={24} color={C.dim} /><Text style={[s.dimText, { marginTop: 6 }]}>No internships in catalog yet</Text></View>
              ) : (
                <View style={{ gap: 0, marginTop: 10 }}>
                  {(featured?.internships ?? []).slice(0, 4).map((job, idx) => (
                    <Pressable key={idx} style={({ hovered }: any) => [s.internRow, hovered && { backgroundColor: C.cardH }]}>
                      <View style={s.internLogo}><Building2 size={18} color={C.blue} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.internTitle} numberOfLines={1}>{job.title}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          <Text style={s.internMeta}>{job.company}</Text>
                          {job.location && <View style={s.metaPill}><MapPin size={9} color={C.dim} /><Text style={s.metaText}>{job.location}</Text></View>}
                          {job.stipend && <View style={s.metaPill}><Coins size={9} color={C.dim} /><Text style={s.metaText}>{job.stipend}</Text></View>}
                        </View>
                      </View>
                      <Pressable style={({ hovered, pressed }: any) => [s.applyBtn, hovered && { backgroundColor: '#6D28D9' }, pressed && { transform: [{ scale: 0.97 }] }]}>
                        <Text style={s.applyBtnText}>Apply</Text>
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Rocket size={14} color={C.purpleL} /><Text style={s.sectionLabel}>QUICK ACTIONS</Text></View>
              </View>
              <View style={s.qaGrid}>
                {QUICK_ACTIONS_NAV.map((qa) => (
                  <Pressable key={qa.id} onPress={() => handleNav(qa.id)} testID={`dash-qa-${qa.id}`} style={({ hovered, pressed }: any) => [s.qaTile, hovered && { backgroundColor: qa.color + '22', borderColor: qa.color + '44', transform: [{ translateY: -1 }] }, pressed && { transform: [{ scale: 0.97 }] }]}>
                    <qa.Icon size={16} color={qa.color} />
                    <Text style={s.qaLabel}>{qa.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* RIGHT */}
          <View style={[s.rightCol, isWide && { flex: 1, width: undefined }]}>

            {/* Profile Completion */}
            {(() => {
              const col = profilePct >= 80 ? C.green : profilePct >= 50 ? C.amber : C.purpleL;
              const remaining = completionItems.filter((i: any) => !i.done);
              return (
                <Pressable onPress={() => handleNav('profile')} style={({ hovered }: any) => [s.card, hovered && { borderColor: col + '66' }]}>
                  <View style={s.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Target size={14} color={C.purpleL} /><Text style={s.sectionLabel}>PROFILE STRENGTH</Text></View>
                  </View>
                  <View style={{ alignItems: 'center', marginVertical: 12 }}>
                    <View style={[s.ringOuter, { borderColor: col + '33' }]}>
                      <View style={[s.ringInner, { borderColor: col }]}>
                        <Text style={[s.ringVal, { color: col }]}>{profilePct}%</Text>
                        <Text style={s.ringLabel}>Complete</Text>
                      </View>
                    </View>
                  </View>
                  {remaining.length > 0 && (
                    <View style={{ gap: 6, marginTop: 4 }}>
                      <Text style={s.sectionLabel}>NEXT STEPS</Text>
                      {remaining.slice(0, 3).map((item: any, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.amber }} />
                          <Text style={[s.dimText, { flex: 1, textAlign: 'left', fontSize: 11.5 }]}>{item.label}</Text>
                          <Text style={{ color: C.amber, fontFamily: FT.bold, fontSize: 11 }}>+{item.weight}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })()}

            {/* Goal Simulator */}
            <GoalSimulator currentReadiness={readiness} />

            {/* Career Journey */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Target size={14} color={C.purpleL} /><Text style={s.sectionLabel}>CAREER JOURNEY</Text></View>
                <Pressable onPress={() => handleNav('career-ai')} style={s.seeAllBtn}><Text style={s.seeAllText}>Full View</Text><ChevronRight size={11} color={C.purpleL} /></Pressable>
              </View>
              {!roadmap ? (
                <View style={[s.emptyState, { paddingVertical: 16 }]}>
                  <Target size={24} color={C.dim} />
                  <Text style={[s.dimText, { marginTop: 6 }]}>Generate your career roadmap in Career AI</Text>
                  <Pressable onPress={() => handleNav('career-ai')} style={[s.primaryBtn, { marginTop: 10 }]}><Sparkles size={13} color="#fff" /><Text style={s.primaryBtnText}>Open Career AI</Text></Pressable>
                </View>
              ) : (
                <>
                  <Text style={{ color: C.purpleXL, fontFamily: FT.semi, fontSize: 12, marginTop: 6 }} numberOfLines={1}>{roadmap.target_role}</Text>
                  <View style={{ marginTop: 10 }}>
                    <View style={s.rowSplit}><Text style={s.heroPLabel}>Journey Progress</Text><Text style={[s.heroPVal, { color: C.teal }]}>{roadmap.milestones_completed}/{roadmap.milestones_total} steps</Text></View>
                    <View style={s.heroPTrack}>
                      <LinearGradient colors={[C.teal, C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.heroPFill, { width: `${roadmap.progress_pct}%` }]} />
                    </View>
                  </View>
                  {roadmap.next_milestone && (() => {
                    const mm = MILESTONE_META[roadmap.next_milestone!.milestone_type] || { color: C.purpleL };
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: mm.color + '44', borderRadius: 10, padding: 10, marginTop: 10 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: mm.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                          <ChevronRight size={14} color={mm.color} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: mm.color, fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.8 }}>NEXT STEP</Text>
                          <Text style={{ color: '#fff', fontFamily: FT.semi, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{roadmap.next_milestone!.title}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </>
              )}
            </View>

            {/* Suggested Mentors */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Users size={14} color={C.purpleL} /><Text style={s.sectionLabel}>SUGGESTED MENTORS</Text></View>
                <Pressable onPress={() => handleNav('mentors')} style={s.seeAllBtn}><Text style={s.seeAllText}>View All</Text><ChevronRight size={11} color={C.purpleL} /></Pressable>
              </View>
              {(featured?.mentors ?? []).length === 0 ? (
                <View style={[s.emptyState, { paddingVertical: 16 }]}><Users size={24} color={C.dim} /><Text style={[s.dimText, { marginTop: 6 }]}>No approved mentors yet</Text></View>
              ) : (
                <View style={{ gap: 0, marginTop: 8 }}>
                  {(featured?.mentors ?? []).slice(0, 3).map((m, idx) => {
                    const initials = (m.full_name || 'M').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                    const av: [string, string][] = [['#5F259F','#B07FDF'],['#1D4ED8','#60A5FA'],['#10B981','#34D399']];
                    return (
                      <View key={m.id || idx} style={[s.mentorRow, idx < Math.min((featured?.mentors ?? []).length, 3) - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
                        <LinearGradient colors={av[idx % 3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.mentorAvatar}>
                          <Text style={s.mentorInitials}>{initials}</Text>
                        </LinearGradient>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.mentorName} numberOfLines={1}>{m.full_name}</Text>
                          <Text style={s.mentorRole} numberOfLines={1}>{[m.designation, m.organization].filter(Boolean).join(' · ')}{m.rating > 0 ? ` · ⭐ ${m.rating.toFixed(1)}` : ''}</Text>
                        </View>
                        <Pressable onPress={() => handleNav('mentors')} style={({ hovered }: any) => [s.connectBtn, hovered && { backgroundColor: C.purpleL + '33' }]}>
                          <Text style={s.connectBtnText}>Connect</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Upcoming Events */}
            <View style={s.card}>
              <View style={s.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Calendar size={14} color={C.purpleL} /><Text style={s.sectionLabel}>UPCOMING EVENTS</Text></View>
                <Pressable onPress={() => handleNav('events')} style={s.seeAllBtn}><Text style={s.seeAllText}>See All</Text><ChevronRight size={11} color={C.purpleL} /></Pressable>
              </View>
              {(featured?.events ?? []).length === 0 ? (
                <View style={[s.emptyState, { paddingVertical: 16 }]}><Calendar size={24} color={C.dim} /><Text style={[s.dimText, { marginTop: 6 }]}>No upcoming events</Text></View>
              ) : (
                <View style={{ gap: 0, marginTop: 8 }}>
                  {(featured?.events ?? []).slice(0, 3).map((ev, idx) => {
                    const col = ev.coverColor || C.pink;
                    return (
                      <Pressable key={idx} style={({ hovered }: any) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderRadius: 8 }, idx < Math.min((featured?.events ?? []).length, 3) - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }, hovered && { backgroundColor: C.cardH }]}>
                        <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, backgroundColor: col + '22', borderColor: col + '55' }}>
                          <Text style={{ color: col, fontFamily: FT.bold, fontSize: 9, letterSpacing: 0.4 }}>{(ev.category || 'Event').toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: '#fff', fontFamily: FT.semi, fontSize: 12.5 }} numberOfLines={2}>{ev.title}</Text>
                          <Text style={{ color: C.text, fontFamily: FT.reg, fontSize: 10.5, marginTop: 2 }}>{[ev.date_str, ev.time_str, ev.mode].filter(Boolean).join(' · ')}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </>)}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 22, gap: 16, paddingBottom: 60 },
  contentNarrow: { padding: 14, gap: 12, paddingBottom: 90 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarNarrow: { paddingTop: Platform.OS === 'ios' ? 6 : 4 },
  greeting: { color: '#FFFFFF', fontFamily: FT.bold, fontSize: 22, letterSpacing: -0.4 },
  greetingSub: { color: C.text, fontFamily: FT.reg, fontSize: 13, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, minWidth: 260 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FT.reg, fontSize: 13, ...({ outlineStyle: 'none' } as any) },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative', ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  notifDot: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#1A0438', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  notifDotText: { color: '#fff', fontFamily: FT.bold, fontSize: 9 },
  heroShell: { borderRadius: 20, padding: 28, overflow: 'hidden', position: 'relative' },
  heroBody: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  heroEyebrow: { color: C.text, fontFamily: FT.bold, fontSize: 10, letterSpacing: 1.4, marginBottom: 8, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontFamily: FT.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, marginBottom: 10 },
  heroPLabel: { color: C.text, fontFamily: FT.semi, fontSize: 11 },
  heroPVal: { fontFamily: FT.bold, fontSize: 11 },
  heroPTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden', marginTop: 5 },
  heroPFill: { height: '100%', borderRadius: 2 },
  heroPrimaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  heroPrimaryText: { color: '#5B21B6', fontFamily: FT.bold, fontSize: 13 },
  heroGhostBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  heroGhostText: { color: '#fff', fontFamily: FT.semi, fontSize: 13 },
  heroStats: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  heroStatTile: { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, alignItems: 'center', minWidth: 80 },
  heroStatVal: { fontFamily: FT.bold, fontSize: 20, marginTop: 6 },
  heroStatLabel: { color: C.text, fontFamily: FT.semi, fontSize: 9.5, letterSpacing: 0.4, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpiRowNarrow: { gap: 10 },
  kpiCard: { flexBasis: '23%', flexGrow: 1, minWidth: 140, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 16, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  kpiIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { color: C.text, fontFamily: FT.bold, fontSize: 10, letterSpacing: 0.6, marginTop: 12, marginBottom: 3 },
  kpiValue: { fontFamily: FT.bold, fontSize: 24, letterSpacing: -0.4 },
  kpiNote: { fontFamily: FT.bold, fontSize: 10.5, marginTop: 4 },
  grid2: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  grid2Narrow: { flexDirection: 'column', gap: 12 },
  leftCol: { gap: 14, minWidth: 0 },
  rightCol: { width: 320, gap: 14 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 18, ...({ backdropFilter: 'blur(20px)', transitionDuration: '200ms' } as any) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sectionLabel: { color: C.text, fontFamily: FT.bold, fontSize: 10, letterSpacing: 1.2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText: { color: C.purpleL, fontFamily: FT.bold, fontSize: 11 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  actionIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionTitle: { color: '#fff', fontFamily: FT.semi, fontSize: 12.5 },
  actionReason: { color: C.text, fontFamily: FT.reg, fontSize: 11, marginTop: 2 },
  actionGain: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  actionGainText: { fontFamily: FT.bold, fontSize: 11 },
  skillLabel: { color: C.text, fontFamily: FT.med, fontSize: 11.5, flex: 1 },
  skillPct: { fontFamily: FT.bold, fontSize: 11.5 },
  skillTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', marginTop: 5 },
  skillFill: { height: '100%', borderRadius: 2 },
  internRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderRadius: 10, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  internLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#60A5FA18', borderWidth: 1, borderColor: '#60A5FA33', alignItems: 'center', justifyContent: 'center' },
  internTitle: { color: '#fff', fontFamily: FT.semi, fontSize: 13 },
  internMeta: { color: C.text, fontFamily: FT.med, fontSize: 11 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.card, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  metaText: { color: C.text, fontFamily: FT.med, fontSize: 10.5 },
  applyBtn: { backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  applyBtnText: { color: '#fff', fontFamily: FT.bold, fontSize: 11 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  qaTile: { flexBasis: '30%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 11, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, ...({ cursor: 'pointer', transitionDuration: '180ms' } as any) },
  qaLabel: { color: '#fff', fontFamily: FT.semi, fontSize: 11.5, flexShrink: 1 },
  ringOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 78, height: 78, borderRadius: 39, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  ringVal: { fontFamily: FT.bold, fontSize: 18, letterSpacing: -0.5 },
  ringLabel: { color: C.text, fontFamily: FT.med, fontSize: 9.5, marginTop: 1 },
  mentorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  mentorAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mentorInitials: { color: '#fff', fontFamily: FT.bold, fontSize: 12 },
  mentorName: { color: '#fff', fontFamily: FT.bold, fontSize: 13 },
  mentorRole: { color: C.text, fontFamily: FT.reg, fontSize: 10.5, marginTop: 1 },
  connectBtn: { backgroundColor: '#A78BFA1A', borderColor: '#A78BFA44', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  connectBtnText: { color: '#A78BFA', fontFamily: FT.bold, fontSize: 11 },
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dimText: { color: C.text, fontFamily: FT.med, fontSize: 12, textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, ...({ cursor: 'pointer' } as any) },
  primaryBtnText: { color: '#fff', fontFamily: FT.bold, fontSize: 12 },
  // ─── Phase 2: AI Coach styles ───────────────────────────────────────────
  briefCard: {
    borderRadius: 18, padding: 20, overflow: 'hidden', position: 'relative',
    backgroundColor: 'rgba(88,28,135,0.20)', borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1,
  },
  briefBotIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.30)',
    borderColor: 'rgba(196,181,253,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  briefEyebrow: { color: C.purpleXL, fontFamily: FT.bold, fontSize: 10, letterSpacing: 1.2 },
  briefBadge: {
    backgroundColor: 'rgba(167,139,250,0.18)', borderColor: 'rgba(167,139,250,0.35)', borderWidth: 1,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  briefBadgeText: { color: C.purpleXL, fontFamily: FT.bold, fontSize: 10 },
  briefText: { color: '#FFFFFF', fontFamily: FT.med, fontSize: 14, lineHeight: 22 },
  coachCard: {
    borderRadius: 18, padding: 22, overflow: 'hidden', position: 'relative',
    backgroundColor: 'rgba(109,40,217,0.12)', borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1,
  },
  coachActionBox: {
    minWidth: 280,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 14, padding: 16,
  },
  tierPill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  tierText: { fontFamily: FT.bold, fontSize: 12 },
});
