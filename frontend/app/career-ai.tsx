/**
 * /career-ai — AI Career Roadmap (Phase 1 implementation).
 *
 * Sections rendered:
 *   1. Header  ............. title + Online pill + Regenerate button
 *   2. Overview metrics .... Skill Score · Career Level · Target Readiness
 *   3. Goal banner ......... target role + progress bar
 *   4. Two-column .......... Skill Intelligence (left) + Career Journey (right)
 *   5. Three-column ........ AI Recommendations + Skill Breakdown + Score Actions
 *
 * Backend:
 *   POST /ai/career-roadmap          — generate / cached
 *   POST /ai/career-roadmap {force:true} — regenerate
 *   GET  /users/me/completion        — for Profile Strength
 *   GET  /users/me/stats             — for AI Sessions / streak (graceful fallback)
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target, User as UserIcon, Sparkles, Flame, ArrowLeft,
  MessageSquare, Briefcase, Star, Award, Folder, Link2, Code,
  CircleCheck as CheckCircle2, FileText, Mic, ChevronRight, TrendingUp,
} from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components/Toast';
import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';

const C = {
  bg: '#0d0b1f',
  card: 'rgba(255,255,255,0.032)',
  cardH: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.14)',
  text: '#f0eeff',
  text2: 'rgba(240,238,255,0.60)',
  dim: 'rgba(240,238,255,0.32)',
  purple: '#6d28d9',
  purple2: '#7c3aed',
  purpleL: '#a78bfa',
  purpleXL: '#c4b5fd',
  teal: '#2dd4bf',
  blue: '#60a5fa',
  amber: '#fbbf24',
  red: '#f87171',
  green: '#34d399',
  orange: '#fb923c',
  pink: '#f472b6',
};
const FT = { med: 'DMSans_500Medium', bold: 'DMSans_700Bold', xbold: 'DMSans_800ExtraBold' };

interface RoadmapResp {
  target_role?: string;
  target_company_type?: string;
  progress_pct?: number;
  skill_scores?: Record<string, number>;
  milestones?: {
    id: string;
    title: string;
    description: string;
    milestone_type: string;
    completion_rule?: string;
    completed: boolean;
    completed_at?: string;
  }[];
  milestones_completed?: string[];
  suggestion?: string;
  generated_at?: string;
}

const SKILL_META: { key: string; label: string; color: string; Icon: any }[] = [
  { key: 'Technical Excellence',  label: 'Technical Excellence',  color: '#5EEAD4', Icon: Code },
  { key: 'Professional Communication', label: 'Professional Communication', color: '#A78BFA', Icon: MessageSquare },
  { key: 'Personal Brand', label: 'Personal Brand', color: '#F472B6', Icon: Star },
  { key: 'Leadership & Collaboration', label: 'Leadership & Collaboration', color: '#F59E0B', Icon: Award },
  { key: 'Career Preparation', label: 'Career Preparation', color: '#3B82F6', Icon: Mic },
  { key: 'Industry Presence', label: 'Industry Presence', color: '#C4B5FD', Icon: UserIcon },
];

const GAINS: Record<string, number> = {
  RESUME: 8,
  PROJECT: 12,
  LINKEDIN: 5,
  PORTFOLIO: 7,
  CERTIFICATION: 6,
  MOCK_INTERVIEW: 8,
  NETWORKING: 4,
  SKILLS: 5,
  PROFILE: 3,
  JOB_APPLICATION: 2,
};

export default function CareerAIPage({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const initialized = useAuthStore((u) => u.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext) || embedded;

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') {
        router.replace('/alumni-portal?tab=career-ai' as any);
      } else if (user.role === 'student') {
        router.replace('/student-portal?tab=career-ai' as any);
      }
    }
  }, [isEmbedded, initialized, user, router]);

  const { width: winW } = useWindowDimensions();
  const isLarge = winW >= 900;

  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<RoadmapResp>({});
  const [profileStrength, setProfileStrength] = useState(0);
  const [skillStreak, setSkillStreak] = useState(0);
  const [careerIntel, setCareerIntel] = useState<any>(null);

  const allMilestones = useMemo(() => roadmap.milestones || [], [roadmap]);
  const pendingMilestones = useMemo(() => allMilestones.filter(m => !m.completed), [allMilestones]);
  const firstPendingIdx = useMemo(() => allMilestones.findIndex(m => !m.completed), [allMilestones]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [rm, comp, stats, intel] = await Promise.all([
        request<RoadmapResp>('/ai/career-roadmap', { method: 'POST' } as any).catch(() => ({})),
        request<any>('/users/me/completion').catch(() => ({})),
        request<any>('/users/me/stats').catch(() => ({})),
        request<any>('/users/me/skill-intelligence').catch(() => ({})),
      ]);
      setRoadmap(rm || {});
      setProfileStrength(Number(comp?.percentage || 0));
      setSkillStreak(Number(stats?.skill_streak || 0));
      setCareerIntel(intel || null);
    } catch (e: any) {
      toast.error('Could not load', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  const { readinessScore, readinessLevel, nextGoal, bandProgress } = useMemo(() => {
    let score = 0;
    let level = 'Explorer';
    let nextLevel = 'Builder';
    let nextScore = 21;

    if (careerIntel?.readiness_score !== undefined) {
      if (typeof careerIntel.readiness_score === 'object') {
        score = careerIntel.readiness_score.score || 0;
        level = careerIntel.readiness_score.level || 'Explorer';
        nextLevel = careerIntel.readiness_score.next_level || nextLevel;
        nextScore = careerIntel.readiness_score.next_threshold || nextScore;
      } else {
        score = Number(careerIntel.readiness_score) || 0;
      }
    } else {
      const ss = roadmap.skill_scores || {};
      const vals = SKILL_META.map((s) => Number(ss[s.key] || 0));
      if (vals.length) score = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    score = Math.round(score);

    if (nextLevel === 'Builder' && nextScore === 21) {
      if (score > 20) { nextLevel = 'Developing Professional'; nextScore = 41; }
      if (score > 40) { nextLevel = 'Career Ready'; nextScore = 61; }
      if (score > 60) { nextLevel = 'Industry Ready'; nextScore = 81; }
      if (score > 80) { nextLevel = 'Industry Ready'; nextScore = 100; }
    }

    const BAND_FLOORS: Record<string, number> = {
      'Explorer': 0,
      'Builder': 21,
      'Developing Professional': 41,
      'Career Ready': 61,
      'Industry Ready': 81,
    };
    const floor = BAND_FLOORS[level] ?? 0;
    const ceiling = nextScore;
    const bandRange = ceiling - floor;
    const bandProgress = bandRange > 0
      ? Math.min(100, Math.round(((score - floor) / bandRange) * 100))
      : 100;

    return {
      readinessScore: score,
      readinessLevel: level,
      nextGoal: `${nextLevel} (${nextScore}%)`,
      bandProgress,
    };
  }, [roadmap, careerIntel]);

  const { potentialScore, getLevelForScore } = useMemo(() => {
    const getLevelForScore = (s: number) => {
      if (s <= 20) return 'Explorer';
      if (s <= 40) return 'Builder';
      if (s <= 60) return 'Developing Professional';
      if (s <= 80) return 'Career Ready';
      return 'Industry Ready';
    };

    if (careerIntel?.potential_score !== undefined) {
      const pScore = Number(careerIntel.potential_score) || 0;
      const calculatedGap = Number(careerIntel.readiness_gap) || 0;
      const numRemaining = Math.max(1, pendingMilestones.length);
      const gainPerMilestone = Math.max(1, Math.round(calculatedGap / numRemaining));
      return { potentialScore: pScore, gap: calculatedGap, gainPerMilestone, getLevelForScore };
    }

    const aiSkillVals = SKILL_META.map((s) => Number((roadmap.skill_scores || {})[s.key] || 0));
    const aiSkillAvg = aiSkillVals.length ? aiSkillVals.reduce((a, b) => a + b, 0) / aiSkillVals.length : 0;
    const potentialProfilePoints = profileStrength * 0.15;
    const potentialMilestonePoints = 25;
    let pScore = (aiSkillAvg * 0.60) + potentialProfilePoints + potentialMilestonePoints;
    pScore = Math.min(100, Math.round(pScore));
    const calculatedGap = Math.max(0, pScore - readinessScore);
    const numRemaining = Math.max(1, pendingMilestones.length);
    const gainPerMilestone = Math.max(1, Math.round(calculatedGap / numRemaining));

    return { potentialScore: pScore, gap: calculatedGap, gainPerMilestone, getLevelForScore };
  }, [careerIntel, roadmap.skill_scores, pendingMilestones.length, profileStrength, readinessScore]);

  const getMilestoneMeta = useCallback((type?: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'RESUME') return { Icon: FileText, color: C.purpleL, onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=resume' as any) };
    if (t === 'PORTFOLIO') return { Icon: Briefcase, color: '#22D3EE', onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info' as any) };
    if (t === 'SKILLS') return { Icon: Star, color: '#F59E0B', onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info&section=skills' as any) };
    if (t === 'CERTIFICATION') return { Icon: Award, color: '#10B981', onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=certifications' as any) };
    if (t === 'PROJECT') return { Icon: Folder, color: '#A78BFA', onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=projects' as any) };
    if (t === 'LINKEDIN') return { Icon: Link2, color: '#3B82F6', onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info&section=linkedin' as any) };
    if (t === 'MOCK_INTERVIEW') return { Icon: Code, color: '#EC4899', onPress: () => toast.info('Mock Interview', 'AI mock interviewer coming soon!') };
    if (t === 'NETWORKING') return { Icon: MessageSquare, color: C.teal, onPress: () => router.push('/student-portal?tab=network' as any) };
    if (t === 'PROFILE') return { Icon: UserIcon, color: C.blue, onPress: () => router.push('/student-portal?tab=profile&ptab=manage' as any) };
    if (t === 'JOB_APPLICATION') return { Icon: Briefcase, color: C.amber, onPress: () => router.push('/student-portal?tab=jobs' as any) };
    return { Icon: Target, color: C.dim, onPress: () => toast.info('Milestone', 'Check profile settings') };
  }, [router, toast]);

  if (loading && !roadmap.milestones) {
    return (
      <View style={[embedded ? s.embeddedShell : s.shell, { alignItems: 'center', justifyContent: 'center', padding: 40 }]}>
        <ActivityIndicator size="large" color={C.purpleL} />
        <Text style={{ color: C.text2, marginTop: 14, fontFamily: FT.med, fontSize: 15 }}>Generating your roadmap…</Text>
      </View>
    );
  }

  const targetRole = roadmap.target_role || 'Software Engineer';
  const targetCo = roadmap.target_company_type || 'Top Tech Company';
  const progress = roadmap.progress_pct ?? 42;
  const estimatedWeeks = pendingMilestones.length > 0 ? `~${pendingMilestones.length * 2} Weeks` : 'Goal Reached';
  const skillScores = careerIntel?.skill_scores || {};

  const Container: any = embedded ? View : ScrollView;
  const containerProps: any = embedded
    ? { style: s.embeddedShell }
    : { style: s.shell, contentContainerStyle: { padding: 22, paddingBottom: 80, gap: 16 } };

  return (
    <Container {...containerProps}>

      {/* ── Header ── */}
      <View style={s.header}>
        {!embedded && (
          <Pressable onPress={() => router.back()} style={s.backBtn} testID="career-back">
            <ArrowLeft size={18} color={C.text} />
          </Pressable>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={s.title}>AI Career Roadmap</Text>
            <View style={s.onlinePill}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }} />
              <Text style={s.onlinePillText}>Online</Text>
            </View>
            {skillStreak > 0 && (
              <View style={[s.onlinePill, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }]}>
                <Flame size={11} color={C.red} fill={C.red} />
                <Text style={[s.onlinePillText, { color: C.red }]}>{skillStreak} Day Streak</Text>
              </View>
            )}
          </View>
          {!!roadmap.suggestion && (
            <Text style={s.suggest}>"{roadmap.suggestion}"</Text>
          )}
        </View>
      </View>

      {/* ── Row 1: Three KPI Stat Tiles ── */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Readiness */}
        <View style={[s.kpiCard, { flex: 1 }]}>
          <View style={[s.kpiIconWrap, { backgroundColor: C.purple + '25', borderColor: C.purpleL + '50' }]}>
            <Target size={16} color={C.purpleL} />
          </View>
          <Text style={s.kpiLabel}>CURRENT READINESS</Text>
          <Text style={[s.kpiValue, { color: C.purpleL }]}>{readinessScore}%</Text>
          <Text style={s.kpiSub}>{readinessLevel}</Text>
          {/* Progress band */}
          <View style={s.kpiBandTrack}>
            <View style={[s.kpiBandFill, { width: `${bandProgress}%`, backgroundColor: C.purpleL }]} />
          </View>
          <Text style={s.kpiBandLabel}>Next: {nextGoal}</Text>
        </View>

        {/* Career Level */}
        <View style={[s.kpiCard, { flex: 1 }]}>
          <View style={[s.kpiIconWrap, { backgroundColor: C.amber + '25', borderColor: C.amber + '60' }]}>
            <Award size={16} color={C.amber} />
          </View>
          <Text style={s.kpiLabel}>CAREER LEVEL</Text>
          <Text style={[s.kpiValue, { color: C.amber, fontSize: 20 }]}>{readinessLevel}</Text>
          <Text style={s.kpiSub}>Current standing</Text>
          <View style={s.kpiBandTrack}>
            <View style={[s.kpiBandFill, { width: `${Math.min(100, readinessScore)}%`, backgroundColor: C.amber }]} />
          </View>
          <Text style={s.kpiBandLabel}>Target: {getLevelForScore(potentialScore)}</Text>
        </View>

        {/* Target Readiness */}
        <View style={[s.kpiCard, { flex: 1 }]}>
          <View style={[s.kpiIconWrap, { backgroundColor: C.teal + '22', borderColor: C.teal + '55' }]}>
            <TrendingUp size={16} color={C.teal} />
          </View>
          <Text style={s.kpiLabel}>TARGET READINESS</Text>
          <Text style={[s.kpiValue, { color: C.teal }]}>{potentialScore}%</Text>
          <Text style={s.kpiSub}>{getLevelForScore(potentialScore)}</Text>
          <View style={s.kpiBandTrack}>
            <View style={[s.kpiBandFill, { width: `${potentialScore}%`, backgroundColor: C.teal }]} />
          </View>
          <Text style={s.kpiBandLabel}>{estimatedWeeks} to reach goal</Text>
        </View>

        {/* Profile Strength — only on large */}
        {isLarge && (
          <View style={[s.kpiCard, { flex: 1 }]}>
            <View style={[s.kpiIconWrap, { backgroundColor: C.blue + '22', borderColor: C.blue + '55' }]}>
              <UserIcon size={16} color={C.blue} />
            </View>
            <Text style={s.kpiLabel}>PROFILE STRENGTH</Text>
            <Text style={[s.kpiValue, { color: C.blue }]}>{profileStrength}%</Text>
            <Text style={s.kpiSub}>{profileStrength >= 100 ? 'Complete!' : `${100 - profileStrength}% remaining`}</Text>
            <View style={s.kpiBandTrack}>
              <View style={[s.kpiBandFill, { width: `${profileStrength}%`, backgroundColor: C.blue }]} />
            </View>
            <Text style={s.kpiBandLabel}>Complete to boost score</Text>
          </View>
        )}
      </View>

      {/* ── Row 2: Goal Banner ── */}
      <LinearGradient
        colors={['rgba(109,40,217,0.40)', 'rgba(91,33,182,0.22)', 'rgba(49,46,129,0.14)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.goalCard}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={s.goalIcon}><Target size={16} color={C.purpleL} /></View>
              <Text style={s.goalLabel}>CURRENT GOAL</Text>
            </View>
            <Text style={s.goalRole}>
              {targetRole}{' '}
              <Text style={{ color: C.purpleL }}>at a {targetCo}</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 }}>
              <Text style={{ color: C.text2, fontSize: 13, fontFamily: FT.bold }}>
                Level: <Text style={{ color: C.purpleXL }}>{readinessLevel}</Text>
              </Text>
              <Text style={{ color: C.text2, fontSize: 13, fontFamily: FT.bold }}>
                Target: <Text style={{ color: C.teal }}>{getLevelForScore(potentialScore)}</Text>
              </Text>
              <Text style={{ color: C.text2, fontSize: 13, fontFamily: FT.bold }}>
                ETA: <Text style={{ color: C.amber }}>{estimatedWeeks}</Text>
              </Text>
            </View>
          </View>
          <View style={s.goalTimeline}>
            <Text style={s.goalTimelineNum}>{pendingMilestones.length}</Text>
            <Text style={s.goalTimelineLabel}>Steps{'\n'}Remaining</Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: C.text2, fontSize: 12, fontFamily: FT.bold }}>Career Progress</Text>
            <Text style={{ color: C.purpleXL, fontSize: 12, fontFamily: FT.xbold }}>{Math.min(100, progress)}%</Text>
          </View>
          <View style={s.goalBarTrack}>
            <LinearGradient
              colors={['#6d28d9', '#a78bfa', '#c4b5fd']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.goalBarFill, { width: `${Math.min(100, progress)}%` }]}
            />
          </View>
        </View>
      </LinearGradient>

      {/* ── Row 3: Skill Intelligence + Career Journey ── */}
      <View style={{ flexDirection: isLarge ? 'row' : 'column', gap: 16, alignItems: 'stretch' }}>

        {/* Left: Skill Score */}
        <View style={[s.card, { width: isLarge ? '38%' : '100%', minWidth: isLarge ? 320 : undefined }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <CompletionRing
              pct={readinessScore}
              size={72}
              stroke={6}
              color={C.purpleL}
              trackColor="rgba(255,255,255,0.08)"
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.cardTitle}>Skill Score</Text>
              <Text style={[s.cardSubtitle, { marginTop: 3 }]}>
                {readinessLevel === 'Explorer' ? 'Needs Focus' :
                 readinessLevel === 'Builder' ? 'Developing' :
                 readinessLevel === 'Developing Professional' ? 'Making Progress' :
                 readinessLevel === 'Career Ready' ? 'Good Progress' :
                 'Excellent'}
              </Text>
              <Text style={{ color: C.dim, fontFamily: FT.med, fontSize: 11, marginTop: 4, lineHeight: 15 }}>
                Dynamically calculated from profile, projects, and credentials.
              </Text>
            </View>
          </View>

          {/* Skill breakdown bars */}
          <View style={{ gap: 11 }}>
            {SKILL_META.map((skill) => {
              const score = skillScores[skill.key] !== undefined
                ? skillScores[skill.key]
                : Math.round(Number((roadmap.skill_scores || {})[skill.key] || 45));
              return (
                <View key={skill.key} style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <skill.Icon size={13} color={skill.color} />
                      <Text style={[s.breakdownName, { fontSize: 12.5 }]}>{skill.label}</Text>
                    </View>
                    <Text style={[s.breakdownPct, { color: skill.color, fontSize: 12.5 }]}>{score}%</Text>
                  </View>
                  <View style={s.breakdownTrack}>
                    <View style={[s.breakdownFill, { width: `${score}%`, backgroundColor: skill.color }]} />
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => router.push('/student-portal?tab=profile' as any)}
            style={({ pressed, hovered }: any) => [
              s.ctaButton,
              (pressed || hovered) && { backgroundColor: C.purple2 }
            ]}
          >
            <Text style={s.ctaText}>View Detailed Skill Intelligence</Text>
          </Pressable>
        </View>

        {/* Right: Career Journey */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[s.card, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={s.cardTitle}>Your Career Journey</Text>
                <Text style={s.cardSubtitle}>{targetRole}</Text>
              </View>
              {pendingMilestones.length > 0 && (
                <View style={{ backgroundColor: 'rgba(45,212,191,0.10)', borderColor: 'rgba(45,212,191,0.30)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                  <Text style={{ color: C.teal, fontFamily: FT.bold, fontSize: 12 }}>
                    {pendingMilestones.length} Step{pendingMilestones.length > 1 ? 's' : ''} Left
                  </Text>
                </View>
              )}
            </View>

            {allMilestones.length > 0 ? (
              <View style={{ gap: 0 }}>
                {allMilestones.map((m, idx) => {
                  const isCompleted = m.completed;
                  const isActive = idx === firstPendingIdx;
                  const isFuture = !isCompleted && !isActive;
                  const meta = getMilestoneMeta(m.milestone_type);
                  const Icon = meta?.Icon || Target;
                  const gain = GAINS[m.milestone_type] || 3;

                  return (
                    <View key={`timeline-item-${m.id}`} style={s.timelineItem}>
                      {/* Indicator column */}
                      <View style={s.timelineIndicatorContainer}>
                        {idx > 0 && (
                          <View style={[
                            s.timelineLine,
                            idx <= (firstPendingIdx === -1 ? allMilestones.length : firstPendingIdx) ? s.timelineLineCompleted : null
                          ]} />
                        )}
                        <Pressable
                          onPress={meta.onPress}
                          style={[
                            s.timelineCircle,
                            isCompleted && { backgroundColor: C.green, borderColor: C.green },
                            isActive && { backgroundColor: 'rgba(124,58,237,0.18)', borderColor: C.purpleL, borderWidth: 2 },
                            isFuture && { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: C.border, borderWidth: 1 }
                          ]}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={12} color={C.bg} fill={C.green} />
                          ) : isActive ? (
                            <Icon size={11} color={C.purpleL} />
                          ) : (
                            <Icon size={11} color={C.text2} />
                          )}
                        </Pressable>
                        {idx < allMilestones.length - 1 && (
                          <View style={[
                            s.timelineLine,
                            isCompleted ? s.timelineLineCompleted : null
                          ]} />
                        )}
                      </View>

                      {/* Card */}
                      <Pressable
                        onPress={meta.onPress}
                        style={({ pressed, hovered }: any) => [
                          s.timelineCard,
                          isCompleted && s.timelineCardCompleted,
                          isActive && s.timelineCardActive,
                          isFuture && s.timelineCardFuture,
                          (pressed || hovered) && { backgroundColor: C.cardH, borderColor: C.border2 }
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <Text style={[s.timelineStepText, isActive && { color: C.purpleL }]}>STEP {idx + 1}</Text>
                            {isCompleted && (
                              <View style={s.timelineBadgeCompleted}>
                                <Text style={s.timelineBadgeTextCompleted}>Completed</Text>
                              </View>
                            )}
                            {isActive && (
                              <View style={s.timelineBadgeActive}>
                                <Text style={s.timelineBadgeTextActive}>Next Action</Text>
                              </View>
                            )}
                            {isFuture && (
                              <View style={[s.timelineBadgeActive, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                <Text style={[s.timelineBadgeTextActive, { color: C.text2 }]}>Locked</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[
                            s.timelineCardTitle,
                            isCompleted && { textDecorationLine: 'line-through', color: C.text2 }
                          ]} numberOfLines={1}>
                            {m.title}
                          </Text>
                          <Text style={[
                            s.timelineCardDesc,
                            isCompleted && { color: C.dim }
                          ]} numberOfLines={2}>
                            {m.description}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={s.gainPill}>
                            <Sparkles size={11} color={C.teal} />
                            <Text style={s.gainPillText}>+{gain}%</Text>
                          </View>
                          <ChevronRight size={15} color={C.dim} />
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={s.emptyStateBox}>
                <CheckCircle2 size={32} color={C.green} style={{ marginBottom: 8 }} />
                <Text style={s.emptyStateTitle}>All Milestones Completed!</Text>
                <Text style={s.emptyStateDesc}>You've completed all items on your roadmap. Keep adding new achievements to your profile.</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Row 4: AI Recommendations + Skill Health + Score Actions ── */}
      <View style={{ flexDirection: isLarge ? 'row' : 'column', gap: 16, alignItems: 'stretch' }}>

        {/* AI Recommendations */}
        <View style={[s.card, { flex: 1, minWidth: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={15} color={C.purpleL} />
            </View>
            <Text style={s.cardTitle}>AI Recommendations</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 12.5, fontFamily: FT.med, marginBottom: 14 }}>
            Tailored guidance from Career Intelligence models.
          </Text>

          {careerIntel?.recommendation ? (
            <View style={s.insightBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[s.insightTitle, { color: C.purpleL, fontSize: 12 }]}>{careerIntel.recommendation.category}</Text>
                <View style={s.insightGainPill}>
                  <Text style={[s.insightGainText, { fontSize: 11 }]}>{careerIntel.recommendation.gain} Readiness</Text>
                </View>
              </View>
              <Text style={[s.insightDesc, { color: C.text, fontSize: 13, lineHeight: 19 }]}>
                {careerIntel.recommendation.description}
              </Text>
            </View>
          ) : (
            <View style={[s.emptyStateBox, { padding: 16 }]}>
              <Text style={s.emptyStateTitle}>Analyzing Profile...</Text>
              <Text style={s.emptyStateDesc}>Completing your profile will trigger more precise AI advice.</Text>
            </View>
          )}

          {/* Top Opportunities below */}
          <View style={{ marginTop: 14, gap: 8 }}>
            <Text style={{ color: C.text2, fontFamily: FT.bold, fontSize: 12, letterSpacing: 0.5, marginBottom: 4 }}>TOP OPPORTUNITIES</Text>
            <Pressable
              onPress={() => router.push('/network' as any)}
              style={({ pressed, hovered }: any) => [
                s.opRow,
                (pressed || hovered) && { backgroundColor: C.cardH, borderColor: C.border2 }
              ]}
            >
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(45,212,191,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={15} color={C.teal} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: FT.bold }} numberOfLines={1}>Mock Interview Practice</Text>
                <Text style={{ color: C.text2, fontSize: 11, fontFamily: FT.med }} numberOfLines={1}>Book a session with a {targetRole} mentor</Text>
              </View>
              <Text style={{ color: C.teal, fontSize: 12, fontFamily: FT.bold }}>+{GAINS['MOCK_INTERVIEW'] || 8}%</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/internships' as any)}
              style={({ pressed, hovered }: any) => [
                s.opRow,
                (pressed || hovered) && { backgroundColor: C.cardH, borderColor: C.border2 }
              ]}
            >
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={15} color={C.purpleL} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: FT.bold }} numberOfLines={1}>Explore Jobs & Internships</Text>
                <Text style={{ color: C.text2, fontSize: 11, fontFamily: FT.med }} numberOfLines={1}>Openings matching {targetRole} goals</Text>
              </View>
              <Text style={{ color: C.purpleL, fontSize: 12, fontFamily: FT.bold }}>+{GAINS['JOB_APPLICATION'] || 2}%</Text>
            </Pressable>
          </View>
        </View>

        {/* Skill Health — contributors */}
        <View style={[s.card, { flex: 1, minWidth: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={15} color={C.amber} />
            </View>
            <Text style={s.cardTitle}>Skill Health</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 12.5, fontFamily: FT.med, marginBottom: 14 }}>
            Readiness breakdown for <Text style={{ color: C.purpleL, fontFamily: FT.bold }}>{careerIntel?.profile_name || 'your target goal'}</Text>
          </Text>

          <View style={{ gap: 10 }}>
            {SKILL_META.map(skill => {
              const score = skillScores[skill.key] !== undefined
                ? skillScores[skill.key]
                : Math.round(Number((roadmap.skill_scores || {})[skill.key] || 45));
              const isStrong = score >= 60;
              const status = isStrong ? 'Strong' : score >= 40 ? 'Developing' : 'Needs Focus';
              return (
                <View key={`health-${skill.key}`} style={s.healthRow}>
                  <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: skill.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <skill.Icon size={13} color={skill.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 12.5 }} numberOfLines={1}>{skill.label}</Text>
                      <Text style={{ color: skill.color, fontFamily: FT.xbold, fontSize: 13 }}>{score}%</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <View style={s.breakdownTrack}>
                        <View style={[s.breakdownFill, { width: `${score}%`, backgroundColor: skill.color }]} />
                      </View>
                      <View style={{ backgroundColor: isStrong ? 'rgba(52,211,153,0.10)' : 'rgba(251,191,36,0.10)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: isStrong ? C.green : C.amber, fontFamily: FT.bold, fontSize: 10 }}>{status}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Score Contribution Analysis */}
        <View style={[s.card, { flex: 1, minWidth: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={15} color={C.red} />
            </View>
            <Text style={s.cardTitle}>Score Contribution</Text>
          </View>
          <Text style={{ color: C.text2, fontSize: 12.5, fontFamily: FT.med, marginBottom: 14 }}>
            Top pending actions ranked by readiness impact.
          </Text>

          <View style={{ gap: 10 }}>
            {careerIntel?.ranked_actions && careerIntel.ranked_actions.length > 0 ? (
              careerIntel.ranked_actions.map((act: any, idx: number) => {
                const meta = getMilestoneMeta(act.type);
                const Icon = meta?.Icon || Target;
                return (
                  <Pressable
                    key={`ranked-act-${idx}`}
                    onPress={meta.onPress}
                    style={({ pressed, hovered }: any) => [
                      s.gainItemCard,
                      (pressed || hovered) && { backgroundColor: C.cardH, borderColor: C.border2 }
                    ]}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[s.buildIcon, { backgroundColor: meta.color + '18', borderColor: meta.color + '45', width: 32, height: 32, borderRadius: 8 }]}>
                        <Icon size={15} color={meta.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.gainItemTitle, { fontSize: 13 }]} numberOfLines={1}>{act.title}</Text>
                        <Text style={[s.gainItemDesc, { fontSize: 11 }]} numberOfLines={2}>{act.description}</Text>
                      </View>
                    </View>
                    <View style={[s.gainPill, { paddingHorizontal: 7, paddingVertical: 4 }]}>
                      <Sparkles size={11} color={C.teal} />
                      <Text style={[s.gainPillText, { fontSize: 11 }]}>+{act.gain}%</Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={[s.emptyStateBox, { padding: 20 }]}>
                <CheckCircle2 size={28} color={C.green} style={{ marginBottom: 6 }} />
                <Text style={s.emptyStateTitle}>High Impact Items Done!</Text>
                <Text style={s.emptyStateDesc}>All profile details are optimized. Work on roadmap tasks to grow further.</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Text style={{ color: C.dim, fontFamily: FT.med, fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>
        Roadmap last generated {roadmap.generated_at ? new Date(roadmap.generated_at).toLocaleString() : '—'} · Powered by Student Alumni AI
      </Text>
    </Container>
  );
}

/* ---------- helpers ---------- */

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: C.bg },
  embeddedShell: { flex: 1, backgroundColor: 'transparent' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  title: { color: C.text, fontFamily: FT.xbold, fontSize: 22, letterSpacing: -0.5 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.35)', borderWidth: 1,
  },
  onlinePillText: { color: C.green, fontFamily: FT.bold, fontSize: 11 },
  suggest: { color: C.text2, fontFamily: FT.med, fontSize: 12.5, marginTop: 5, fontStyle: 'italic' },

  // KPI tiles
  kpiCard: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  kpiIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 10,
  },
  kpiLabel: { color: C.text2, fontFamily: FT.bold, fontSize: 10, letterSpacing: 0.9, marginBottom: 4 },
  kpiValue: { fontFamily: FT.xbold, fontSize: 24, letterSpacing: -0.5 },
  kpiSub: { color: C.dim, fontFamily: FT.med, fontSize: 11.5, marginTop: 2, marginBottom: 8 },
  kpiBandTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 5 },
  kpiBandFill: { height: '100%', borderRadius: 2 },
  kpiBandLabel: { color: C.dim, fontFamily: FT.med, fontSize: 10.5 },

  // Goal Card
  goalCard: {
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    borderRadius: 16, padding: 20, overflow: 'hidden',
  },
  goalIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(167,139,250,0.25)' },
  goalLabel: { color: C.purpleXL, fontFamily: FT.bold, fontSize: 11, letterSpacing: 0.9 },
  goalRole: { color: C.text, fontFamily: FT.xbold, fontSize: 20, marginTop: 6, letterSpacing: -0.3 },
  goalTimeline: { alignItems: 'center', justifyContent: 'center', paddingLeft: 12 },
  goalTimelineNum: { color: C.purpleL, fontFamily: FT.xbold, fontSize: 32, letterSpacing: -1 },
  goalTimelineLabel: { color: C.text2, fontFamily: FT.med, fontSize: 11, textAlign: 'center', lineHeight: 15 },
  goalBarTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  goalBarFill: { height: '100%', borderRadius: 3 },

  card: {
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 14, padding: 18,
  },
  cardTitle: { color: C.text, fontFamily: FT.xbold, fontSize: 16, letterSpacing: -0.2 },
  cardSubtitle: { color: C.text2, fontFamily: FT.med, fontSize: 12 },

  // Skill bars
  breakdownName: { color: C.text, fontFamily: FT.bold, fontSize: 12 },
  breakdownPct: { fontFamily: FT.xbold, fontSize: 12 },
  breakdownTrack: { height: 5, flex: 1, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 3 },

  ctaButton: {
    backgroundColor: C.purple, borderRadius: 10,
    paddingVertical: 11, alignItems: 'center', justifyContent: 'center', marginTop: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  ctaText: { color: '#fff', fontFamily: FT.bold, fontSize: 13 },

  // Journey timeline
  timelineItem: { flexDirection: 'row', alignItems: 'stretch', minHeight: 70 },
  timelineIndicatorContainer: { width: 36, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  timelineLine: { width: 2, backgroundColor: 'rgba(255,255,255,0.07)', flex: 1 },
  timelineLineCompleted: { backgroundColor: C.green },
  timelineCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginVertical: 4, zIndex: 2,
  },
  timelineCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1,
    borderRadius: 12, padding: 12, marginLeft: 8, marginBottom: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  timelineCardCompleted: { backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(52,211,153,0.12)' },
  timelineCardActive: { backgroundColor: 'rgba(124,58,237,0.05)', borderColor: 'rgba(124,58,237,0.35)', borderWidth: 1.5 },
  timelineCardFuture: { opacity: 0.60 },
  timelineStepText: { color: C.text2, fontSize: 9.5, fontFamily: FT.bold, letterSpacing: 0.6 },
  timelineBadgeCompleted: { backgroundColor: 'rgba(52,211,153,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  timelineBadgeTextCompleted: { color: C.green, fontSize: 9.5, fontFamily: FT.bold },
  timelineBadgeActive: { backgroundColor: 'rgba(124,58,237,0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  timelineBadgeTextActive: { color: C.purpleL, fontSize: 9.5, fontFamily: FT.bold },
  timelineCardTitle: { color: C.text, fontFamily: FT.bold, fontSize: 14, marginTop: 3 },
  timelineCardDesc: { color: C.text2, fontFamily: FT.med, fontSize: 12, marginTop: 2, lineHeight: 17 },

  gainPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(45,212,191,0.10)', borderColor: 'rgba(45,212,191,0.25)', borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7,
  },
  gainPillText: { color: C.teal, fontFamily: FT.bold, fontSize: 11 },

  // Insight box
  insightBox: {
    backgroundColor: 'rgba(109,40,217,0.08)', borderColor: 'rgba(109,40,217,0.22)',
    borderWidth: 1, borderRadius: 10, padding: 14,
  },
  insightTitle: { fontFamily: FT.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  insightGainPill: {
    backgroundColor: 'rgba(45,212,191,0.10)', borderColor: 'rgba(45,212,191,0.25)', borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  insightGainText: { color: C.teal, fontFamily: FT.bold },
  insightDesc: { fontFamily: FT.med, marginTop: 6 },

  // Opportunity rows
  opRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.025)', borderColor: C.border, borderWidth: 1,
    borderRadius: 10, padding: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  // Health rows
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Score contribution
  gainItemCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(109,40,217,0.04)', borderColor: 'rgba(109,40,217,0.14)',
    borderWidth: 1, borderRadius: 10, padding: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  gainItemTitle: { color: C.text, fontFamily: FT.bold },
  gainItemDesc: { color: C.text2, fontFamily: FT.med, marginTop: 2 },

  buildIcon: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  emptyStateBox: {
    alignItems: 'center', justifyContent: 'center', padding: 24,
    backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12,
  },
  emptyStateTitle: { color: C.text, fontFamily: FT.bold, fontSize: 15 },
  emptyStateDesc: { color: C.text2, fontFamily: FT.med, fontSize: 12, textAlign: 'center', marginTop: 5, lineHeight: 17 },
});
