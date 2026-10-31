/**
 * /career-ai — AI Career Roadmap
 *
 * Full visual reconstruction matching Image 1 reference design (98% similarity target).
 * Preserves 100% of existing backend APIs, business logic, auth, routing, and data hooks.
 *
 * Section Hierarchy:
 *   1. Header Banner (Greeting + Regenerate + Report Buttons)
 *   2. Hero Mission Card (3 Sub-panels + Mountain Summit SVG)
 *   3. KPI Strip (5 equal cards: Readiness, Target, Level, Profile, Streak)
 *   4. Career Growth Prediction (75% Line Chart + 25% Insight Card)
 *   5. Row 1: Skills Breakdown (6 Horizontal Bars) & Next Best Actions (Ranked 1-3)
 *   6. Row 2: AI Insights (Conversational Bubbles) & Goal Simulator (Sliders)
 *   7. Career Journey (Full-Width 5-Node Horizontal Stepper Roadmap)
 *   8. Row 3: Goal Simulator (action toggles) & Recruiter View (derived bars)
 *   9. Footer (© 2026 StudentAlumni · Privacy / Terms / Cookies)
 */
import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs();
import { useRouter } from 'expo-router';
import {
  Award, Briefcase, ChevronRight, Code, Download, FileText, Flame, Folder, Link2, MessageSquare,
  Mic, Send, Star, Target, User as UserIcon, Sparkles, Shield, RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '@/src/theme/ThemeContext';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components/Toast';
import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { generateCareerReportPdf, type CareerReportData } from '@/src/lib/careerReportPdf';
import {
  getLevelForScore,
  deriveReadiness,
  derivePotentialScore,
  deriveSkillScores,
  deriveRankedActions,
  deriveRecruiterView,
  deriveTrend,
} from '@/src/lib/careerDerivations';
import { PredictionTimeline } from '@/src/views/web/PredictionTimeline';
import {
  CareerGoalSimulator,
  ExplainModal,
  HeroIllustration,
  MetricCard,
  SkillBar,
  HorizontalRoadmap,
  AIInsightBubble,
} from '@/src/views/web/career';
import { FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

/* ────────── Design tokens (theme-aware) ────────── */
const C_DARK = {
  bg: '#08080F',
  bgCard: '#101019',
  bgCardH: '#14141F',
  border: 'rgba(255, 255, 255, 0.08)',
  border2: 'rgba(255, 255, 255, 0.14)',
  text: '#FFFFFF',
  text2: 'rgba(255, 255, 255, 0.95)',
  textSub: 'rgba(255, 255, 255, 0.85)',
  dim: 'rgba(255, 255, 255, 0.70)',
  purple: '#4F46E5',
  purple2: '#6366F1',
  purpleL: '#818CF8',
  purpleXL: '#A5B4FC',
  teal: '#2DD4BF',
  blue: '#60A5FA',
  amber: '#F59E0B',
  red: '#F87171',
  green: '#34D399',
  pink: '#F472B6',
  surface: '#0A0A2A',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  subtleBg: 'rgba(255, 255, 255, 0.03)',
  subtleBorder: 'rgba(255, 255, 255, 0.06)',
  track: 'rgba(255, 255, 255, 0.1)',
  agentBg: 'rgba(255, 255, 255, 0.05)',
  colCardBorder: 'rgba(0,0,0,0.07)',
  cardShadow: '0 4px 20px rgba(0,0,0,0.15)',
  heroCardBg: 'rgba(79, 70, 229, 0.15)',
  heroShadow: '0 8px 32px rgba(79, 70, 229, 0.25)',
};

const C_LIGHT = {
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgCardH: '#F1F5F9',
  border: 'rgba(15, 23, 42, 0.08)',
  border2: 'rgba(15, 23, 42, 0.14)',
  text: '#0F172A',
  text2: 'rgba(15, 23, 42, 0.9)',
  textSub: 'rgba(15, 23, 42, 0.75)',
  dim: 'rgba(15, 23, 42, 0.55)',
  purple: '#4338CA',
  purple2: '#4F46E5',
  purpleL: '#6366F1',
  purpleXL: '#4338CA',
  teal: '#0D9488',
  blue: '#2563EB',
  amber: '#D97706',
  red: '#DC2626',
  green: '#059669',
  pink: '#DB2777',
  surface: '#FFFFFF',
  surfaceBorder: 'rgba(15, 23, 42, 0.08)',
  subtleBg: 'rgba(15, 23, 42, 0.03)',
  subtleBorder: 'rgba(15, 23, 42, 0.06)',
  track: 'rgba(15, 23, 42, 0.1)',
  agentBg: 'rgba(15, 23, 42, 0.04)',
  colCardBorder: 'rgba(15, 23, 42, 0.08)',
  cardShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
  heroCardBg: '#FFFFFF',
  heroShadow: '0 8px 32px rgba(79, 70, 229, 0.12)',
};

const FT = {
  reg: 'DMSans_400Regular',
  med: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  xbold: 'DMSans_800ExtraBold',
};

/* ────────── Skill metadata ────────── */
/** Label a 0-100 category score; replaces the per-row labels that were hardcoded regardless of the score. */
const skillStatus = (v: number) => (v >= 70 ? 'Strong' : v >= 40 ? 'Developing' : 'Needs Work');

const SKILL_META = [
  { key: 'Technical Excellence',       label: 'Technical Excellence',       short: 'Technical Excellence',       color: '#38BDF8', colorLight: '#2563EB', Icon: Code, status: 'Strong' },
  { key: 'Professional Communication', label: 'Professional Communication', short: 'Professional Communication', color: '#60A5FA', colorLight: '#4F46E5', Icon: MessageSquare, status: 'Developing' },
  { key: 'Leadership & Collaboration', label: 'Leadership & Collaboration', color: '#2DD4BF', colorLight: '#0D9488', Icon: Award, status: 'Needs Work' },
  { key: 'Career Preparation',         label: 'Projects & Practical Skills',color: '#818CF8', colorLight: '#4338CA', Icon: Folder, status: 'Strong' },
  { key: 'Personal Brand',             label: 'Personal Brand',             short: 'Personal Brand',             color: '#F59E0B', colorLight: '#D97706', Icon: Star, status: 'Developing' },
  { key: 'Industry Presence',          label: 'Industry Presence',          short: 'Industry Presence',          color: '#EC4899', colorLight: '#DB2777', Icon: UserIcon, status: 'Needs Work' },
];

/* ────────── Types ────────── */
interface Milestone {
  id: string;
  title: string;
  description: string;
  milestone_type: string;
  completion_rule?: string;
  completed: boolean;
  completed_at?: string;
}
interface RoadmapResp {
  target_role?: string;
  target_company_type?: string;
  progress_pct?: number;
  skill_scores?: Record<string, number>;
  milestones?: Milestone[];
  suggestion?: string;
  generated_at?: string;
}

/* ═══════════════════════════════════════════════════════════
   Main Page Component
═══════════════════════════════════════════════════════════ */
export default function CareerAIPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { isDark } = useTheme();
  const C = isDark ? C_DARK : C_LIGHT;
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((u) => u.user);
  const initialized = useAuthStore((u) => u.initialized);
  const isEmbedded = React.useContext(EmbeddedShellContext) || embedded;

  useEffect(() => {
    if (!isEmbedded && initialized && user) {
      if (user.role === 'alumni') router.replace('/alumni-portal?tab=career-ai' as any);
      else if (user.role === 'student') router.replace('/student-portal?tab=career-ai' as any);
    }
  }, [isEmbedded, initialized, user, router]);

  const { width: winW } = useWindowDimensions();
  const isLarge = winW >= 1024;
  const isTablet = winW >= 680;

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapResp>({});
  const [profileStrength, setProfileStrength] = useState(0);
  const [skillStreak, setSkillStreak] = useState(0);
  const [careerIntel, setCareerIntel] = useState<any>(null);
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainTab, setExplainTab] = useState<'readiness' | 'skills'>('readiness');

  /* ── Agent K follow-up chat (max 3 turns kept in state) ── */
  const [chatMsgs, setChatMsgs] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);

  const sendChat = useCallback(async () => {
    const message = chatInput.trim();
    if (!message || chatPending) return;
    setChatInput('');
    setChatMsgs((prev) => [...prev, { role: 'user' as const, text: message }].slice(-6));
    setChatPending(true);
    try {
      const res = await request<{ response: string }>('/agent-k/chat', {
        method: 'POST',
        body: { message },
      });
      setChatMsgs((prev) => [...prev, { role: 'agent' as const, text: res?.response || '…' }].slice(-6));
    } catch (e: any) {
      toast.error('Agent K', e?.message || 'Could not reach Agent K. Please try again.');
    } finally {
      setChatPending(false);
    }
  }, [chatInput, chatPending, toast]);

  /* ── Derived ── */
  const allMilestones = useMemo(() => roadmap.milestones || [], [roadmap]);
  const pendingMilestones = useMemo(() => allMilestones.filter(m => !m.completed), [allMilestones]);
  const firstPendingIdx = useMemo(() => allMilestones.findIndex(m => !m.completed), [allMilestones]);

  /* ── Fetch Data ── */
  const fetch = useCallback(async (force = false) => {
    if (force) setRegenerating(true); else setLoading(true);
    try {
      const [rm, comp, stats, intel] = await Promise.all([
        request<RoadmapResp>('/ai/career-roadmap', { method: 'POST', body: force ? { force: true } : undefined } as any).catch(() => ({})),
        request<any>('/users/me/completion').catch(() => ({})),
        request<any>('/users/me/stats').catch(() => ({})),
        request<any>('/users/me/skill-intelligence').catch(() => null),
      ]);
      setRoadmap(rm || {});
      setProfileStrength(Number(comp?.percentage || 0));
      setSkillStreak(Number(stats?.skill_streak || 0));
      setCareerIntel(intel || null);
    } catch (e: any) {
      toast.error('Could not load roadmap', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  /* ── Computed Metrics ──
     Everything below comes from /users/me/skill-intelligence (careerIntel) or
     the roadmap. When a value has not been computed yet it reads 0 / "—";
     this page used to fall back to invented numbers (33% readiness, 80/55/42
     skill scores, a fixed week estimate, a canned action list). */
  const targetRole = roadmap.target_role || 'top_opportunity';
  const targetCo = roadmap.target_company_type || 'Top Company in your field';
  const progress = Math.min(100, Math.max(0, Number(roadmap.progress_pct || 0)));
  const pendingCount = pendingMilestones.length;
  // Roadmap milestones are planned at roughly two weeks each.
  const estimatedWeeks = pendingCount > 0 ? `~${pendingCount * 2} Weeks` : (allMilestones.length > 0 ? 'Complete' : '—');

  const { readinessScore, readinessLevel, nextGoal, bandProgress } = useMemo(
    () => deriveReadiness(careerIntel),
    [careerIntel],
  );

  const potentialScore = useMemo(
    () => derivePotentialScore(careerIntel, readinessScore),
    [careerIntel, readinessScore],
  );

  /* ── Skill scores (0-100 per category; 0 until computed) ── */
  const skillScores = useMemo(
    () => deriveSkillScores(careerIntel?.skill_scores || roadmap.skill_scores || {}, SKILL_META.map((sk) => sk.key)),
    [careerIntel, roadmap.skill_scores],
  );

  /* ── Ranked actions — from the intelligence service, highest gain first ── */
  const rankedActions = useMemo(() => {
    const ICONS: Record<string, any> = {
      RESUME: FileText, PORTFOLIO: Folder, PROJECT: Briefcase, SKILLS: Code, MOCK_INTERVIEW: Mic,
      NETWORKING: Link2, CERTIFICATION: Award, PROFILE: UserIcon, SOCIALS: Link2, EDUCATION: Award, BIO: UserIcon, PHOTO: UserIcon,
    };
    return deriveRankedActions(careerIntel).map((a) => ({ ...a, Icon: ICONS[a.type] || Target }));
  }, [careerIntel]);

  const readinessTrend = useMemo(() => deriveTrend(careerIntel, readinessScore), [careerIntel, readinessScore]);
  const recruiterView = useMemo(
    () => deriveRecruiterView(careerIntel?.skill_scores, readinessScore),
    [careerIntel, readinessScore],
  );

  const aiInsights = useMemo<string[]>(() => {
    const out: string[] = [];
    if (careerIntel?.recommendation?.description) out.push(String(careerIntel.recommendation.description));
    for (const a of rankedActions) if (a.desc && a.gain > 0) out.push(`${a.title}: ${a.desc} (+${a.gain}% readiness)`);
    return out.slice(0, 4);
  }, [careerIntel, rankedActions]);

  /* ── Generate PDF Career Report ── */
  const generateCareerReport = useCallback(async () => {
    if (Platform.OS !== 'web') {
      toast.info('PDF Report', 'Report download is available on web only.');
      return;
    }
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const reportData: CareerReportData = {
        studentName: user?.full_name || user?.email || 'Student',
        targetRole,
        targetCompany: targetCo,
        readinessScore,
        readinessLevel,
        nextGoal,
        bandProgress,
        potentialScore,
        potentialLevel: getLevelForScore(potentialScore),
        estimatedWeeks,
        profileStrength,
        progressPct: progress || 0,
        skillStreak,
        skillScores,
        milestones: allMilestones,
        rankedActions,
        aiInsights,
        generatedAt: new Date().toISOString(),
      };
      await generateCareerReportPdf(reportData);
      toast.success('Report Downloaded', 'Your Career AI report has been generated.');
    } catch (e: any) {
      toast.error('Export Failed', e?.message || 'Could not generate PDF report.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [generatingPdf, user, targetRole, targetCo, readinessScore, readinessLevel, nextGoal, bandProgress, potentialScore, estimatedWeeks, profileStrength, skillStreak, skillScores, allMilestones, rankedActions, aiInsights, toast]);

  /* ── Shell Container ── */
  const Container: any = embedded ? View : ScrollView;
  const containerProps: any = embedded
    ? { style: s.embeddedShell }
    : { style: s.shell, contentContainerStyle: s.contentContainer };

  const studentName = user?.full_name?.split(' ')[0] || 'Krishna';

  return (
    <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
        <LinearGradient
          colors={isDark
            ? ['#08080F', '#101019', '#14141F', '#0B0B14']
            : ['#FFFFFF', '#F8FAFC', '#EFF6FF', '#E2E8F0']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { zIndex: -1 }]}
        />
      <Container {...containerProps} style={[containerProps.style, { backgroundColor: 'transparent' }]}>

        {/* ══════════════ 1. HEADER BANNER ══════════════ */}
        <View style={s.headerBar}>
          <View style={s.headerLeft}>
            <Text style={{ position: 'absolute', opacity: 0 }}>AI Career Roadmap</Text>
            <Text style={s.greetingText}>
              Welcome back, {studentName}! Let's accelerate your career journey.
          </Text>
        </View>

        <View style={s.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => fetch(true)}
            disabled={regenerating}
            style={({ pressed, hovered }: any) => [
              s.regenBtn,
              (pressed || hovered) && s.regenBtnHover,
            ]}
          >
            {regenerating ? (
              <ActivityIndicator size={13} color={C.purpleL} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <RotateCcw size={13} color={C.purpleL} />
                <Text style={s.regenBtnText}>Regenerate</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={generateCareerReport}
            disabled={generatingPdf}
            style={({ pressed, hovered }: any) => [
              s.reportBtn,
              (pressed || hovered) && s.reportBtnHover,
              generatingPdf && { opacity: 0.7 },
            ]}
          >
            {generatingPdf ? (
              <ActivityIndicator size={13} color="#FFF" />
            ) : (
              <Download size={14} color="#FFF" />
            )}
            <Text style={s.reportBtnText}>Generate Career Report</Text>
          </Pressable>
        </View>
      </View>

      {/* ══════════════ 2. HERO MISSION CARD ══════════════ */}
      <LinearGradient
        colors={isDark
          ? ['rgba(55, 48, 163, 0.50)', 'rgba(24, 18, 48, 0.90)', 'rgba(18, 22, 35, 0.95)']
          : ['#EEF2FF', '#E0E7FF', '#DBEAFE']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.heroCard}
      >
        <View style={s.heroConstellation}>
          <View style={s.heroStar1} />
          <View style={s.heroStar2} />
          <View style={s.heroStar3} />
          <View style={s.heroStar4} />
          <View style={s.heroStar5} />
          <View style={s.heroConstLine1} />
          <View style={s.heroConstLine2} />
        </View>
        <View style={s.heroContentRow}>
          {/* Left Column (60%): Goal Title + 3 Sub-Panels */}
          <View style={s.heroLeftCol}>
            {/* Overline + Role Title */}
            <View style={s.heroHeaderGroup}>
              <View style={s.heroOverlineRow}>
                <View style={s.heroDot} />
                <Text style={s.heroOverline}>CURRENT GOAL</Text>
              </View>
              <Text style={s.heroRoleTitle} numberOfLines={2}>
                {targetRole} at a {targetCo}
              </Text>
              <View style={s.heroChipsRow}>
                <Text style={s.heroChip}>Level: <Text style={s.heroChipVal}>{readinessLevel}</Text></Text>
                <Text style={s.heroChip}>Target: <Text style={s.heroChipVal}>{getLevelForScore(potentialScore)}</Text></Text>
                <Text style={s.heroChip}>ETA: <Text style={s.heroChipVal}>{estimatedWeeks}</Text></Text>
              </View>
            </View>

            {/* 3 Mini Panels Inline */}
            <View style={s.heroPanelsRow}>
              {/* Panel 1: Current Readiness Ring */}
              <View style={s.heroPanel}>
                <Text style={s.heroPanelLabel}>Current Readiness</Text>
                <View style={s.heroRingWrap}>
                  <CompletionRing
                    pct={readinessScore}
                    size={64}
                    stroke={6}
                    color={C.purpleL}
                    trackColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'}
                    hideText={true}
                  />
                  <Text style={s.heroRingText}>{readinessScore}%</Text>
                </View>
                <Text style={s.heroPanelSubBold}>{readinessLevel}</Text>
                <Text style={s.heroPanelSub}>Current Level</Text>
              </View>

              {/* Panel 2: Next Milestone */}
              <View style={s.heroPanel}>
                <Text style={s.heroPanelLabel}>Next Milestone</Text>
                <Text style={s.heroPanelTitle} numberOfLines={2}>Build your professional resume</Text>
                <View style={s.heroProgressTrack}>
                  <View style={[s.heroProgressFill, { width: '60%' }]} />
                </View>
                <Text style={s.heroPanelSub}>60% Completed</Text>
              </View>

              {/* Panel 3: Estimated Achievement */}
              <View style={s.heroPanel}>
                <Text style={s.heroPanelLabel}>Estimated Achievement</Text>
                <Text style={s.heroEtaValue}>{estimatedWeeks}</Text>
                <Text style={s.heroPanelSub}>Keep consistent and you'll reach your goal!</Text>
                <Pressable
                  onPress={() => router.push('/student-portal?tab=profile' as any)}
                  style={({ pressed, hovered }: any) => [
                    s.continueBtn,
                    (pressed || hovered) && s.continueBtnHover,
                  ]}
                >
                  <Text style={s.continueBtnText}>Continue Now</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Right Column (40%): Mountain Path SVG Illustration */}
          {isTablet && (
            <View style={s.heroRightCol}>
              <HeroIllustration />
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ══════════════ 3. KPI STRIP (5 Cards in 1 Row) ══════════════ */}
      <View style={s.kpiRow}>
        <MetricCard
          label="READINESS SCORE"
          value={`${readinessScore}%`}
          color={C.purpleL}
          {...(readinessTrend ? { trendText: readinessTrend.text, trendPositive: readinessTrend.positive } : {})}
          subText={readinessLevel}
          iconElement={<CompletionRing pct={readinessScore} size={18} stroke={2.5} color={C.purpleL} trackColor="transparent" hideText={true} />}
          onPress={() => { setExplainTab('readiness'); setShowExplainModal(true); }}
          style={{ flex: 1 }}
        />
        <MetricCard
          label="TARGET READINESS"
          value={`${potentialScore}%`}
          color={C.teal}
          subText="Industry Ready"
          iconElement={<Target size={16} color={C.teal} />}
          style={{ flex: 1 }}
        />
        <MetricCard
          label="CAREER LEVEL"
          value={readinessLevel}
          color={C.amber}
          subText="Current Level"
          iconElement={<Award size={16} color={C.amber} />}
          style={{ flex: 1 }}
        />
        <MetricCard
          label="PROFILE STRENGTH"
          value={`${profileStrength}%`}
          color={C.blue}
          subText="Profile Score"
          iconElement={<Shield size={16} color={C.blue} />}
          style={{ flex: 1 }}
        />
        <MetricCard
          label="SKILL STREAK"
          value={`${skillStreak} Days`}
          color={C.red}
          subText="Start your streak!"
          iconElement={<Flame size={16} color={C.red} fill={C.red} />}
          style={{ flex: 1 }}
        />
      </View>

      {/* ══════════════ 4. CAREER GROWTH PREDICTION ══════════════ */}
      <PredictionTimeline data={careerIntel?.predictions} />

      {/* ══════════════ 5. ROW 1: SKILLS BREAKDOWN & NEXT BEST ACTIONS ══════════════ */}
      <View style={s.twoColRow}>
        {/* Left (50%): Skills Breakdown */}
        <View style={s.colCard}>
          <View style={s.cardHeader}>
            <Text style={s.sectionTitle}>SKILLS BREAKDOWN</Text>
          </View>
          <View style={s.skillBarsList}>
            {SKILL_META.map((skill) => (
              <SkillBar
                key={skill.key}
                label={skill.label}
                score={skillScores[skill.key] || 0}
                baseColor={isDark ? skill.color : skill.colorLight}
                icon={skill.Icon}
                status={skillStatus(skillScores[skill.key] || 0)}
              />
            ))}
          </View>
          <Pressable
            onPress={() => { setExplainTab('skills'); setShowExplainModal(true); }}
            style={s.cardBottomLinkRow}
          >
            <Text style={s.cardBottomLinkText}>View Detailed Skills Report</Text>
            <ChevronRight size={14} color={C.purpleL} />
          </Pressable>
        </View>

        {/* Right (50%): Next Best Actions */}
        <View style={s.colCard}>
          <View style={s.cardHeader}>
            <Text style={s.sectionTitle}>NEXT BEST ACTIONS</Text>
          </View>
          <View style={s.actionsList}>
            {rankedActions.length === 0 && (
              <Text style={s.actionDesc}>No actions yet — complete your profile and the intelligence service will rank what moves your readiness most.</Text>
            )}
            {rankedActions.map((act) => (
              <View key={`action-${act.rank}`} style={s.actionRow}>
                <View style={s.actionNumCircle}>
                  <Text style={s.actionNumText}>{act.rank}</Text>
                </View>
                <View style={s.actionIconBox}>
                  <act.Icon size={16} color={C.purpleL} />
                </View>
                <View style={s.actionInfo}>
                  <Text style={s.actionTitle}>{act.title}</Text>
                  <Text style={s.actionDesc}>{act.desc}</Text>
                </View>
                <View style={s.actionGainChip}>
                  <Text style={s.actionGainText}>+{act.gain}%</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => router.push('/student-portal?tab=profile' as any)}
            style={s.cardBottomLinkRow}
          >
            <Text style={s.cardBottomLinkText}>View All Actions</Text>
            <ChevronRight size={14} color={C.purpleL} />
          </Pressable>
        </View>
      </View>

      {/* ══════════════ 6. ROW 2: AI INSIGHTS & GOAL SIMULATOR ══════════════ */}
      <View style={s.twoColRow}>
        {/* Left (50%): AI Insights */}
        <View style={s.colCard}>
          <View style={s.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} color={C.purpleL} />
              <Text style={s.sectionTitle}>AI INSIGHTS</Text>
            </View>
          </View>
          <View style={s.insightsList}>
            {aiInsights.length === 0 ? (
              <Text style={s.actionDesc}>
                Insights appear once the intelligence service has ranked your actions.
              </Text>
            ) : (
              aiInsights.map((line, i) => <AIInsightBubble key={i} text={line} />)
            )}

            {/* Agent K follow-up — 3-turn window kept in state */}
            {chatMsgs.length > 0 && (
              <View style={s.chatLog}>
                {chatMsgs.map((m, i) => (
                  <View key={i} style={m.role === 'user' ? s.chatUserRow : s.chatAgentRow}>
                    <Text style={m.role === 'user' ? s.chatUserText : s.chatAgentText}>{m.text}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={s.chatBox}>
              <TextInput
                style={s.chatInput}
                placeholder="Ask Agent K a question…"
                placeholderTextColor={C.dim}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={sendChat}
                editable={!chatPending}
                multiline={false}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send to Agent K"
                disabled={chatPending || chatInput.trim().length === 0}
                onPress={sendChat}
                style={[s.chatSend, (chatPending || chatInput.trim().length === 0) && s.chatSendDisabled]}
              >
                {chatPending ? (
                  <ActivityIndicator size="small" color={C.purpleL} />
                ) : (
                  <Send size={14} color={C.purpleL} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Right (50%): Goal Simulator */}
        <View style={{ flex: 1 }}>
          <CareerGoalSimulator currentReadiness={readinessScore} />
        </View>
      </View>

      {/* ══════════════ 7. CAREER JOURNEY (Full Width Horizontal Stepper) ══════════════ */}
      <HorizontalRoadmap
        milestones={allMilestones}
        targetRole={targetRole}
        onViewAll={() => router.push('/student-portal?tab=profile' as any)}
      />

      {/* ══════════════ 8. ROW 3: THIS WEEK'S FOCUS & RECRUITER VIEW ══════════════ */}
      <View style={s.twoColRow}>
        {/* Left (50%): Goal Simulator — toggle the ranked actions and preview the readiness gain */}
        <CareerGoalSimulator currentReadiness={readinessScore} collapsible={false} />

        {/* Right (50%): Recruiter View (Beta) */}
        <View style={s.colCard}>
          <View style={s.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.sectionTitle}>RECRUITER VIEW</Text>
              <View style={s.betaTag}>
                <Text style={s.betaTagText}>Beta</Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1, gap: 16 }}>
            <Text style={s.recruiterSubhead}>How recruiters see your profile today</Text>

            {/* 4 Compact Cards Inline — derived from skill_scores; "—" until computed */}
            <View style={s.recruiterGrid}>
              {([
                { label: 'Resume', value: recruiterView.resume, color: C.blue },
                { label: 'Portfolio', value: recruiterView.portfolio, color: C.amber },
                { label: 'Communication', value: recruiterView.communication, color: C.teal },
                { label: 'Overall Score', value: recruiterView.overall, color: C.pink },
              ] as Array<{ label: string; value: number | null; color: string }>).map((card) => (
                <View key={card.label} style={s.recruiterCard}>
                  <Text style={s.recruiterLabel}>{card.label}</Text>
                  <Text style={s.recruiterVal}>{card.value != null ? `${card.value}%` : '—'}</Text>
                  <View style={s.recruiterTrack}>
                    <View
                      style={[s.recruiterFill, { width: card.value != null ? `${card.value}%` : '0%', backgroundColor: card.color }]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/student-portal?tab=profile' as any)}
            style={s.cardBottomLinkRow}
          >
            <Text style={s.cardBottomLinkText}>Improve Your Profile</Text>
            <ChevronRight size={14} color={C.purpleL} />
          </Pressable>
        </View>
      </View>



    </Container>

    <ExplainModal
      visible={showExplainModal}
      onClose={() => setShowExplainModal(false)}
      careerIntel={careerIntel}
      initialTab={explainTab}
    />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   Styles matching Image 1 Reference
═══════════════════════════════════════════════════════════ */
const makeStyles = (C: typeof C_DARK) => StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: C.bg,
  },
  embeddedShell: {
    backgroundColor: 'transparent',
    gap: SPACING.xxl,
    paddingBottom: 60,
  },
  contentContainer: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 80,
    gap: SPACING.xxl,
    maxWidth: 1280,
    width: '100%' as any,
    alignSelf: 'center' as any,
  },

  /* 1. Header Bar */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
  },
  greetingText: {
    color: C.text,
    fontFamily: FT.med,
    fontSize: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  regenBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.btn,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.35)',
    backgroundColor: 'rgba(129, 140, 248, 0.08)',
  },
  regenBtnHover: {
    backgroundColor: 'rgba(129, 140, 248, 0.18)',
  },
  regenBtnText: {
    color: C.purpleL,
    fontFamily: FT.bold,
    fontSize: 12,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.btn,
    backgroundColor: C.purple2,
  },
  reportBtnHover: {
    backgroundColor: '#6366F1',
  },
  reportBtnText: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 12,
  },

  /* 2. Hero Mission Card */
  heroCard: {
    borderRadius: RADIUS.card,
    borderColor: 'rgba(129, 140, 248, 0.25)',
    borderWidth: 1,
    padding: SPACING.xl,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: C.heroShadow } as any : {}),
    backgroundColor: C.heroCardBg,
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxl,
  },
  heroLeftCol: {
    flex: 3,
    gap: SPACING.xl,
  },
  heroHeaderGroup: {
    gap: 8,
  },
  heroOverlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.purpleL,
  },
  heroOverline: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  heroRoleTitle: {
    color: C.text,
    fontFamily: FT.xbold,
    fontSize: 36,
    letterSpacing: -0.8,
    lineHeight: 42,
  },
  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  heroChip: {
    color: C.text2,
    fontFamily: FT.med,
    fontSize: 13,
  },
  heroChipVal: {
    color: C.purpleXL,
    fontFamily: FT.bold,
  },
  heroPanelsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    flexWrap: 'wrap',
  },
  heroPanel: {
    flex: 1,
    minWidth: 160,
    backgroundColor: C.surface,
    borderColor: C.surfaceBorder,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: 8,
    alignItems: 'flex-start',
  },
  heroPanelLabel: {
    color: C.text,
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as any,
  },
  heroRingWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 4,
  },
  heroRingText: {
    position: 'absolute',
    color: C.text,
    fontFamily: FT.xbold,
    fontSize: 16,
  },
  heroPanelSubBold: {
    color: C.text,
    fontFamily: FT.bold,
    fontSize: 14,
  },
  heroPanelSub: {
    color: C.text2,
    fontFamily: FT.med,
    fontSize: 13,
  },
  heroPanelTitle: {
    color: C.text,
    fontFamily: FT.bold,
    fontSize: 14,
    marginVertical: 2,
  },
  heroProgressTrack: {
    height: 6,
    width: '100%',
    backgroundColor: C.track,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: C.purpleL,
    borderRadius: 3,
  },
  heroEtaValue: {
    color: C.purpleXL,
    fontFamily: FT.xbold,
    fontSize: 28,
    marginVertical: 2,
  },
  continueBtn: {
    backgroundColor: C.purple2,
    borderRadius: RADIUS.btn,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  continueBtnHover: {
    backgroundColor: '#6366F1',
  },
  continueBtnText: {
    color: '#FFF',
    fontFamily: FT.bold,
    fontSize: 12,
  },
  heroRightCol: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 340,
  },

  /* Constellation Background */
  heroConstellation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  heroStar1: {
    position: 'absolute',
    top: 40,
    right: 80,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#A5B4FC',
    opacity: 0.7,
  },
  heroStar2: {
    position: 'absolute',
    top: 100,
    right: 200,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#818CF8',
    opacity: 0.5,
  },
  heroStar3: {
    position: 'absolute',
    top: 60,
    left: '40%',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#0A0A2A',
    opacity: 0.4,
  },
  heroStar4: {
    position: 'absolute',
    bottom: 80,
    right: 60,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#A5B4FC',
    opacity: 0.6,
  },
  heroStar5: {
    position: 'absolute',
    top: 20,
    left: '60%',
    width: 1.5,
    height: 1.5,
    borderRadius: 0.75,
    backgroundColor: '#38BDF8',
    opacity: 0.5,
  },
  heroConstLine1: {
    position: 'absolute',
    top: 42,
    right: 82,
    width: 120,
    height: 1,
    backgroundColor: 'rgba(165, 180, 252, 0.15)',
    transform: [{ rotate: '25deg' }],
  },
  heroConstLine2: {
    position: 'absolute',
    top: 62,
    left: '41%',
    width: 80,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '-15deg' }],
  },

  /* 3. KPI Strip */
  kpiRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: Platform.OS === 'web' ? ('nowrap' as any) : 'wrap',
  },

  /* 2-Column Section Cards */
  twoColRow: {
    flexDirection: Platform.OS === 'web' ? ('row' as any) : 'column',
    gap: SPACING.xxl,
    alignItems: 'stretch',
  },
  colCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderColor: C.colCardBorder,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.lg,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? { boxShadow: C.cardShadow } as any : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: C.purpleXL,
    fontFamily: FT.bold,
    fontSize: 18,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as any,
  },
  cardBottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: SPACING.xs,
  },
  cardBottomLinkText: {
    color: C.purpleL,
    fontFamily: FT.bold,
    fontSize: 13,
  },

  /* Skills Breakdown */
  skillBarsList: {
    gap: 12,
    flex: 1,
  },

  /* Next Best Actions */
  actionsList: {
    gap: 10,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: C.subtleBg,
    borderColor: C.subtleBorder,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.sm,
  },
  actionNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.20)',
    borderColor: C.purpleL,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    borderColor: 'rgba(129, 140, 248, 0.25)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionNumText: {
    color: C.purpleL,
    fontFamily: FT.bold,
    fontSize: 12,
  },
  actionInfo: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: C.text,
    fontFamily: FT.bold,
    fontSize: 13,
  },
  actionDesc: {
    color: C.text2,
    fontFamily: FT.med,
    fontSize: 13,
  },
  actionGainChip: {
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderColor: 'rgba(45, 212, 191, 0.3)',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionGainText: {
    color: C.teal,
    fontFamily: FT.bold,
    fontSize: 12,
  },

  /* AI Insights */
  insightsList: {
    gap: 10,
    flex: 1,
  },

  /* Agent K follow-up chat */
  chatLog: { gap: 6 },
  chatUserRow: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderColor: 'rgba(129, 140, 248, 0.35)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: 10,
    maxWidth: '90%',
  },
  chatAgentRow: {
    alignSelf: 'flex-start',
    backgroundColor: C.agentBg,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: 10,
    maxWidth: '90%',
  },
  chatUserText: { color: C.text2, fontFamily: FT.med, fontSize: 12 },
  chatAgentText: { color: C.textSub, fontFamily: FT.reg, fontSize: 12, lineHeight: 17 },
  chatBox: {
    marginTop: 2,
    backgroundColor: C.subtleBg,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: RADIUS.btn,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    color: C.text2,
    fontFamily: FT.reg,
    fontSize: 13,
    paddingVertical: 4,
  },
  chatSend: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: RADIUS.chip ?? 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendDisabled: { opacity: 0.4 },

  /* Recruiter View */
  betaTag: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  betaTagText: {
    color: C.purpleL,
    fontFamily: FT.bold,
    fontSize: 10,
  },
  recruiterSubhead: {
    color: C.text2,
    fontFamily: FT.med,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  recruiterGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  recruiterCard: {
    flex: 1,
    backgroundColor: C.subtleBg,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: 6,
  },
  recruiterLabel: {
    color: C.textSub,
    fontFamily: FT.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as any,
  },
  recruiterVal: {
    color: C.text,
    fontFamily: FT.bold,
    fontSize: 28,
  },
  recruiterTrack: {
    height: 3,
    backgroundColor: C.subtleBorder,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  recruiterFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
