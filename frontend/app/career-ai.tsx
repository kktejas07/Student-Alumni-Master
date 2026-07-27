/**
 * /career-ai — AI Career Roadmap  (Architectural Refactor)
 *
 * ARCHITECTURE: Pure composition file.
 *   - All data fetching, derived state, and business logic → useCareerAI()
 *   - All UI patterns → src/views/web/career/ components
 *   - All design tokens → src/lib/designTokens.ts
 *   - All constants → src/lib/careerConstants.ts
 *
 * Layout (unchanged from Premium Redesign):
 *   1. Hero Goal Section
 *   2. KPI Strip (4 cards)
 *   3. Two-column grid:
 *        Left  – Next Best Actions · Skills Breakdown · AI Insights
 *        Right – Career Journey    · Goal Simulator   · Recruiter View
 *   4. Weekly Focus checklist
 *   5. Score Explainability Modal
 *
 * APIs (unchanged):
 *   POST /ai/career-roadmap          – LLM-generated roadmap (cached)
 *   POST /ai/career-roadmap {force}  – regenerate
 *   GET  /users/me/completion        – profile strength %
 *   GET  /users/me/stats             – streak
 *   GET  /users/me/skill-intelligence – readiness / skill scores
 *   POST /career/simulate            – Goal Simulator (in CareerGoalSimulator)
 */
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator, LogBox, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Award, Briefcase, ChevronDown, ChevronRight, ChevronUp,
  CircleCheck as CheckCircle2, Download, FileText, Flame,
  HelpCircle, Link2, MessageSquare, Mic, RotateCcw, Sparkles,
  Star, Target, TrendingUp, User as UserIcon, X, ArrowUpRight,
} from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components/Toast';
import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { useCareerAI } from '@/src/viewmodels/hooks/useCareerAI';
import { GAINS, getDifficultyLabel, getTimeEstimate } from '@/src/lib/careerConstants';
import { SKILL_META } from '@/src/lib/skillMeta';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING, PROGRESS_HEIGHTS, BREAKPOINTS } from '@/src/lib/designTokens';
import {
  CareerSectionCard,
  SectionHeader,
  InfoChip,
  MetricCard,
  ActionCard,
  SkillBar,
  AIInsightBubble,
  MilestoneCard,
  WeeklyTaskCard,
  CareerGoalSimulator,
  CareerPageSkeleton,
} from '@/src/views/web/career';

LogBox.ignoreAllLogs();

/* ─────────────────────────────────────────────────────────────────────────────
   getMilestoneMeta — route + icon mapping (page-level only, uses router)
───────────────────────────────────────────────────────────────────────────── */
function useMilestoneMeta(router: ReturnType<typeof useRouter>) {
  const toastRef = useRef<any>(null);
  const toast = useToast();
  useEffect(() => { toastRef.current = toast; });

  return useCallback((type?: string) => {
    const t = (type || '').toUpperCase();
    const tst = toastRef.current || toast;
    if (t === 'RESUME')         return { Icon: FileText,      color: COLORS.purpleL,  onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=resume' as any) };
    if (t === 'PORTFOLIO')      return { Icon: Briefcase,     color: COLORS.cyan,     onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info' as any) };
    if (t === 'SKILLS')         return { Icon: Star,          color: COLORS.amber,    onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info&section=skills' as any) };
    if (t === 'CERTIFICATION')  return { Icon: Award,         color: COLORS.green,    onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=certifications' as any) };
    if (t === 'PROJECT')        return { Icon: Briefcase,     color: COLORS.purpleL,  onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=projects' as any) };
    if (t === 'LINKEDIN')       return { Icon: Link2,         color: COLORS.blue,     onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info&section=linkedin' as any) };
    if (t === 'MOCK_INTERVIEW') return { Icon: Mic,           color: COLORS.pink,     onPress: () => tst?.info('Mock Interview', 'AI mock interviewer coming soon!') };
    if (t === 'NETWORKING')     return { Icon: MessageSquare, color: COLORS.cyan,     onPress: () => router.push('/student-portal?tab=network' as any) };
    if (t === 'PROFILE')        return { Icon: UserIcon,      color: COLORS.blue,     onPress: () => router.push('/student-portal?tab=profile&ptab=manage' as any) };
    if (t === 'JOB_APPLICATION') return { Icon: Briefcase,   color: COLORS.amber,    onPress: () => router.push('/student-portal?tab=jobs' as any) };
    return { Icon: Target, color: COLORS.dim, onPress: () => tst?.info('Milestone', 'Check profile settings') };
  }, [router]); // toast via ref, router is stable
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page Component
───────────────────────────────────────────────────────────────────────────── */
export default function CareerAIPage({ embedded = false }: { embedded?: boolean } = {}) {
  const router      = useRouter();
  const isEmbedded  = React.useContext(EmbeddedShellContext) || embedded;
  const { width: winW } = useWindowDimensions();

  // Responsive breakpoints (3 tiers)
  const isDesktop = winW >= BREAKPOINTS.desktop;
  const isTablet  = winW >= BREAKPOINTS.tablet;
  const isLarge   = isDesktop; // alias for layout decisions

  // ── Data from hook ──────────────────────────────────────────────────────────
  const {
    loading, regenerating, generatingPdf, isOffline, hasData,
    roadmap, careerIntel, allMilestones, pendingMilestones, firstPendingIdx,
    readinessScore, readinessLevel, nextGoal, bandProgress,
    potentialScore, getLevelForScore,
    skillScores, rankedActions, aiInsights, recruiterView,
    profileStrength, skillStreak,
    targetRole, targetCo, progress, isActuallyComplete, estimatedWeeks,
    motivationalText, weeklyFocus, weeklyGain,
    fetchData, generateCareerReport,
  } = useCareerAI();

  const getMilestoneMeta = useMilestoneMeta(router);

  // ── Local UI state (not data) ───────────────────────────────────────────────
  const [showExplainModal,  setShowExplainModal]  = useState(false);
  const [explainTab,        setExplainTab]        = useState('readiness');
  const [journeyExpanded,   setJourneyExpanded]   = useState(false);

  // Redirect standalone (non-embedded) users to their portal tab.
  // Use separate selectors to get stable primitive values
  const initialized = useAuthStore((u: any) => u.initialized);
  const userRole    = useAuthStore((u: any) => u.user?.role);
  useEffect(() => {
    if (!isEmbedded && initialized && userRole) {
      if (userRole === 'alumni') router.replace('/alumni-portal?tab=career-ai' as any);
      else if (userRole === 'student') router.replace('/student-portal?tab=career-ai' as any);
    }
  }, [isEmbedded, initialized, userRole, router]);

  // Escape key → close modal
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExplainModal(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Container ───────────────────────────────────────────────────────────────
  const Container: any = embedded ? View : ScrollView;
  const containerProps: any = embedded
    ? { style: s.embeddedShell }
    : {
        style: [s.shell, { paddingHorizontal: isDesktop ? 24 : isTablet ? 20 : 16 }],
        contentContainerStyle: s.content,
        accessibilityRole: 'main',
      };

  const visibleMilestones = journeyExpanded ? allMilestones : allMilestones.slice(0, 4);

  // ── Offline banner ──────────────────────────────────────────────────────────
  if (isOffline) {
    return (
      <View style={[embedded ? s.embeddedShell : [s.shell], s.loadingContainer]}>
        <View style={s.loadingIcon}>
          <Sparkles size={24} color={COLORS.purpleL} />
        </View>
        <Text style={s.loadingTitle}>You're offline</Text>
        <Text style={s.loadingDesc}>Connect to the internet to load your Career AI roadmap.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => fetchData()}
          style={s.primaryBtn}
        >
          <Text style={s.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <View style={[embedded ? s.embeddedShell : [s.shell, { paddingHorizontal: isDesktop ? 24 : 16 }], { padding: 24 }]}>
        {loading
          ? <CareerPageSkeleton isLarge={isLarge} />
          : (
            <View style={s.loadingContainer}>
              <Text style={s.loadingDesc}>Failed to load career roadmap.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => fetchData()}
                style={[s.ghostBtn, { marginTop: 16 }]}
              >
                <RotateCcw size={13} color={COLORS.purpleL} />
                <Text style={s.ghostBtnText}>Try Again</Text>
              </Pressable>
            </View>
          )
        }
      </View>
    );
  }

  // ── Rendered page ───────────────────────────────────────────────────────────
  return (
    <Container {...containerProps}>

      {/* ══════════════ HEADER BAR ══════════════ */}
      <View style={s.headerBar}>
        <View style={s.headerLeft}>
          <View style={s.topNav}>
            {!embedded && (
              <Pressable
                onPress={() => router.back()}
                style={s.backBtn}
                testID="career-back"
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={20} color={COLORS.text} />
              </Pressable>
            )}
          </View>
          <View>
            <View style={s.headerTitleRow}>
              <Text style={s.headerTitle}>Career AI</Text>
              <View style={s.onlinePill}>
                <View style={s.onlineDot} />
                <Text style={s.onlinePillText}>Live</Text>
              </View>
              {skillStreak > 0 && (
                <View style={[s.onlinePill, s.streakPill]}>
                  <Flame size={10} color={COLORS.red} fill={COLORS.red} />
                  <Text style={[s.onlinePillText, { color: COLORS.red }]}>{skillStreak}d streak</Text>
                </View>
              )}
            </View>
            <Text style={s.headerSub} numberOfLines={1}>
              {roadmap.suggestion || `${targetRole} · ${targetCo}`}
            </Text>
          </View>
        </View>

        <View style={s.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => fetchData(true)}
            disabled={regenerating}
            style={({ pressed, hovered }: any) => [s.ghostBtn, (pressed || hovered) && s.ghostBtnHover]}
          >
            {regenerating
              ? <ActivityIndicator size={13} color={COLORS.purpleL} />
              : <RotateCcw size={13} color={COLORS.purpleL} />}
            <Text style={s.ghostBtnText}>{regenerating ? 'Regenerating…' : 'Regenerate'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => generateCareerReport()}
            disabled={generatingPdf}
            style={({ pressed, hovered }: any) => [
              s.primaryBtn,
              (pressed || hovered) && s.primaryBtnHover,
              generatingPdf && { opacity: 0.7 },
            ]}
          >
            {generatingPdf
              ? <ActivityIndicator size={13} color="#fff" />
              : <Download size={13} color="#fff" />}
            <Text style={s.primaryBtnText}>{generatingPdf ? 'Generating…' : 'Export PDF'}</Text>
          </Pressable>
        </View>
      </View>

      {/* ══════════════ SECTION 1 — HERO GOAL ══════════════ */}
      <LinearGradient
        colors={['rgba(109,40,217,0.12)', 'rgba(18,22,35,0.00)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.heroCard}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.heroLabelRow}>
            <View style={s.heroLabelDot} />
            <Text style={s.heroLabel}>CURRENT GOAL</Text>
          </View>
          <Text style={s.heroRole} numberOfLines={2}>{targetRole}</Text>
          <Text style={s.heroCompany}>{targetCo}</Text>
          <View style={s.heroMeta}>
            <View style={s.heroMetaChip}>
              <View style={[s.heroMetaDot, { backgroundColor: COLORS.purpleL }]} />
              <Text style={s.heroMetaText}>Level: <Text style={[s.heroMetaVal, { color: COLORS.purpleL }]}>{readinessLevel}</Text></Text>
            </View>
            <View style={s.heroMetaChip}>
              <View style={[s.heroMetaDot, { backgroundColor: COLORS.cyan }]} />
              <Text style={s.heroMetaText}>Target: <Text style={[s.heroMetaVal, { color: COLORS.cyan }]}>{getLevelForScore(potentialScore)}</Text></Text>
            </View>
            <View style={s.heroMetaChip}>
              <View style={[s.heroMetaDot, { backgroundColor: COLORS.amber }]} />
              <Text style={s.heroMetaText}>ETA: <Text style={[s.heroMetaVal, { color: COLORS.amber }]}>{estimatedWeeks}</Text></Text>
            </View>
          </View>
          <View style={{ marginTop: 20 }}>
            <View style={s.heroProgressHeader}>
              <Text style={s.heroProgressLabel}>Milestone Progress</Text>
              <Text style={[s.heroProgressPct, { color: COLORS.purpleL }]}>{progress}%</Text>
            </View>
            <View style={s.heroTrack}>
              <LinearGradient
                colors={['#7c3aed', '#a78bfa', '#c4b5fd']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.heroFill, { width: `${progress}%` as any }]}
              />
            </View>
            <Text style={s.heroMicrocopy}>{motivationalText}</Text>
          </View>
        </View>

        <View style={s.heroRight}>
          <View style={s.heroRingWrap}>
            <CompletionRing
              pct={readinessScore}
              size={isLarge ? 88 : 72}
              stroke={7}
              color={COLORS.purpleL}
              trackColor="rgba(255,255,255,0.06)"
            />
            <View style={s.heroRingLabel}>
              <Text style={s.heroRingPct}>{readinessScore}</Text>
              <Text style={s.heroRingUnit}>%</Text>
            </View>
          </View>
          <Text style={s.heroRingCaption}>Readiness</Text>
          {pendingMilestones.length > 0 && (
            <View style={s.heroStepsBadge}>
              <Text style={s.heroStepsNum}>{pendingMilestones.length}</Text>
              <Text style={s.heroStepsLabel}>steps left</Text>
            </View>
          )}
          {isActuallyComplete && (
            <View style={[s.heroStepsBadge, { backgroundColor: 'rgba(52,211,153,0.15)', borderColor: 'rgba(52,211,153,0.30)' }]}>
              <CheckCircle2 size={16} color={COLORS.green} />
              <Text style={[s.heroStepsLabel, { color: COLORS.green }]}>Done!</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ══════════════ SECTION 2 — KPI STRIP ══════════════ */}
      <View style={[s.kpiRow, !isTablet && { flexWrap: 'wrap' }]}>
        <MetricCard
          label="READINESS"
          value={readinessScore}
          unit="%"
          color={COLORS.purpleL}
          barValue={readinessScore}
          subText={readinessLevel}
          hintText={`Next: ${nextGoal.split(' (')[0]}`}
          onPress={() => setShowExplainModal(true)}
          style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 0 : '47%' }}
        />
        <MetricCard
          label="CAREER LEVEL"
          value={readinessLevel}
          color={COLORS.amber}
          barValue={Math.min(100, readinessScore)}
          subText="Current standing"
          hintText={`Target: ${getLevelForScore(potentialScore)}`}
          iconElement={<Award size={14} color={COLORS.amber} />}
          style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 0 : '47%' }}
        />
        <MetricCard
          label="PROFILE"
          value={profileStrength}
          unit="%"
          color={COLORS.blue}
          barValue={profileStrength}
          subText={profileStrength >= 100 ? 'Complete!' : `${100 - profileStrength}% remaining`}
          hintText="Complete to boost score"
          style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 0 : '47%' }}
        />
        <MetricCard
          label="TARGET"
          value={potentialScore}
          unit="%"
          color={COLORS.cyan}
          barValue={potentialScore}
          subText={getLevelForScore(potentialScore)}
          hintText={`${estimatedWeeks} to reach goal`}
          style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 0 : '47%' }}
        />
      </View>

      {/* ══════════════ MAIN TWO-COLUMN GRID ══════════════ */}
      <View style={[s.mainGrid, !isLarge && { flexDirection: 'column' }]}>

        {/* ── LEFT COLUMN ── */}
        <View style={[s.leftCol, !isLarge && { width: '100%' }]}>

          {/* Next Best Actions */}
          <CareerSectionCard>
            <SectionHeader
              title="Next Best Actions"
              subtitle="Ranked by readiness impact"
              rightElement={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/student-portal?tab=profile' as any)}
                  style={({ pressed, hovered }: any) => [s.ghostBtnSm, (pressed || hovered) && s.ghostBtnHover]}
                >
                  <Text style={[s.ghostBtnText, { fontSize: FONT_SIZES.sm }]}>View Profile</Text>
                  <ArrowUpRight size={12} color={COLORS.purpleL} />
                </Pressable>
              }
            />
            {rankedActions.length === 0 ? (
              <View style={s.emptyState}>
                <CheckCircle2 size={28} color={COLORS.green} />
                <Text style={s.emptyStateText}>All actions complete!</Text>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                {rankedActions.map((act: any, idx: number) => {
                  const actType  = act.type || act.action || act.milestone_type || '';
                  const actTitle = typeof act.title === 'string' ? act.title : (actType || 'Action');
                  const meta     = getMilestoneMeta(actType);
                  const gain     = Number(act.gain) || GAINS[actType] || 3;
                  const diff     = getDifficultyLabel(gain);
                  return (
                    <ActionCard
                      key={`act-${idx}`}
                      rank={idx + 1}
                      icon={meta.Icon}
                      color={meta.color}
                      title={actTitle}
                      difficultyLabel={diff.text}
                      difficultyColor={diff.color}
                      timeEstimate={getTimeEstimate(actType)}
                      gain={gain}
                      onPress={meta.onPress}
                    />
                  );
                })}
              </View>
            )}
          </CareerSectionCard>

          {/* Skills Breakdown */}
          <CareerSectionCard>
            <SectionHeader
              title="Skills Breakdown"
              subtitle="Six career pillars · out of 100"
              rightElement={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Explain Actions"
                  onPress={() => setShowExplainModal(true)}
                  style={({ pressed, hovered }: any) => [s.ghostBtnSm, (pressed || hovered) && s.ghostBtnHover]}
                >
                  <HelpCircle size={12} color={COLORS.purpleL} />
                  <Text style={[s.ghostBtnText, { fontSize: FONT_SIZES.sm }]}>Explain</Text>
                </Pressable>
              }
            />
            <View style={{ gap: 10 }}>
              {SKILL_META.map((skill) => (
                <SkillBar
                  key={skill.key}
                  label={skill.short}
                  score={skillScores[skill.key] || 0}
                  baseColor={skill.color}
                  icon={skill.Icon}
                />
              ))}
            </View>
          </CareerSectionCard>

          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <CareerSectionCard>
              <SectionHeader
                title="AI Insights"
                subtitle="Personalized career intelligence"
                rightElement={
                  <InfoChip
                    label="AI"
                    color={COLORS.purpleL}
                    backgroundColor={COLORS.chipBg}
                    borderColor={COLORS.purpleL + '35'}
                    icon={<Sparkles size={11} color={COLORS.purpleL} />}
                  />
                }
              />
              <View style={{ gap: 8 }}>
                {aiInsights.map((text, idx) => (
                  <AIInsightBubble key={`insight-${idx}`} text={text} />
                ))}
              </View>
            </CareerSectionCard>
          )}
        </View>

        {/* ── RIGHT COLUMN ── */}
        <View style={[s.rightCol, !isLarge && { width: '100%' }]}>

          {/* Career Journey */}
          <CareerSectionCard>
            <SectionHeader
              title="Career Journey"
              subtitle={targetRole}
              rightElement={
                pendingMilestones.length > 0 ? (
                  <InfoChip
                    label={`${pendingMilestones.length} left`}
                    color={COLORS.cyan}
                    backgroundColor={COLORS.chipBg}
                    borderColor={COLORS.cyan + '30'}
                  />
                ) : undefined
              }
            />
            {allMilestones.length === 0 ? (
              <View style={s.emptyState}>
                <Target size={28} color={COLORS.dim} />
                <Text style={s.emptyStateText}>No roadmap yet. Click Regenerate.</Text>
              </View>
            ) : isActuallyComplete ? (
              <View style={s.emptyState}>
                <CheckCircle2 size={28} color={COLORS.green} />
                <Text style={[s.emptyStateText, { color: COLORS.green }]}>All steps completed!</Text>
              </View>
            ) : (
              <>
                <View style={{ gap: 0 }}>
                  {visibleMilestones.map((m, idx) => {
                    const globalIdx   = allMilestones.indexOf(m);
                    const isCompleted = m.completed;
                    const isActive    = globalIdx === firstPendingIdx;
                    const isFuture    = !isCompleted && !isActive;
                    const meta        = getMilestoneMeta(m.milestone_type);
                    const gain        = GAINS[m.milestone_type] || 3;
                    return (
                      <MilestoneCard
                        key={`step-${m.id}`}
                        milestone={m}
                        isFirst={idx === 0}
                        isActive={isActive}
                        isFuture={isFuture}
                        isLast={idx === visibleMilestones.length - 1}
                        showTopConnector={idx > 0}
                        gain={gain}
                        onPress={meta.onPress}
                        icon={meta.Icon}
                        color={meta.color}
                      />
                    );
                  })}
                </View>
                {allMilestones.length > 4 && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setJourneyExpanded((v) => !v)}
                    style={({ pressed, hovered }: any) => [s.expandBtn, (pressed || hovered) && s.ghostBtnHover]}
                  >
                    {journeyExpanded
                      ? <ChevronUp size={14} color={COLORS.purpleL} />
                      : <ChevronDown size={14} color={COLORS.purpleL} />}
                    <Text style={s.expandBtnText}>
                      {journeyExpanded ? 'Show Less' : `Show All (${allMilestones.length})`}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </CareerSectionCard>

          {/* Goal Simulator (unified component) */}
          <CareerSectionCard>
            <CareerGoalSimulator currentReadiness={readinessScore} collapsible />
          </CareerSectionCard>

          {/* Recruiter View */}
          <CareerSectionCard>
            <SectionHeader
              title="Recruiter View"
              subtitle="How a recruiter sees your profile"
              rightElement={
                <InfoChip
                  label="Derived"
                  color={COLORS.text2}
                  backgroundColor="rgba(255,255,255,0.05)"
                  borderColor={COLORS.borderMed}
                />
              }
            />
            <View style={s.recruiterOverall}>
              <View style={s.recruiterRingWrap}>
                <CompletionRing
                  pct={recruiterView.overall}
                  size={64}
                  stroke={6}
                  color={recruiterView.overall >= 60 ? COLORS.green : recruiterView.overall >= 40 ? COLORS.amber : COLORS.red}
                  trackColor="rgba(255,255,255,0.06)"
                />
                <View style={s.recruiterRingLabel}>
                  <Text style={s.recruiterRingPct}>{recruiterView.overall}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.recruiterScoreTitle}>Recruiter Score</Text>
                <Text style={s.recruiterScoreSub}>
                  {recruiterView.overall >= 70 ? 'Strong candidate profile' :
                   recruiterView.overall >= 50 ? 'Developing profile — keep going' :
                   'Profile needs improvement for recruiter screening'}
                </Text>
              </View>
            </View>
            {[
              { label: 'Resume & Career Prep', score: recruiterView.resume,         color: COLORS.purpleL },
              { label: 'Communication',        score: recruiterView.communication,  color: COLORS.blue   },
              { label: 'Personal Brand',       score: recruiterView.brand,          color: COLORS.pink   },
              { label: 'Technical Skills',     score: recruiterView.technical,      color: COLORS.cyan   },
            ].map(({ label, score, color }) => (
              <View key={label} style={s.recruiterRow}>
                <Text style={s.recruiterRowLabel}>{label}</Text>
                <View style={s.recruiterBarWrap}>
                  <View style={s.recruiterTrack}>
                    <View style={[s.recruiterFill, { width: `${score}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={[s.recruiterPct, { color }]}>{score}%</Text>
                </View>
              </View>
            ))}
          </CareerSectionCard>
        </View>
      </View>

      {/* ══════════════ WEEKLY FOCUS ══════════════ */}
      {weeklyFocus.length > 0 && (
        <CareerSectionCard>
          <SectionHeader
            title="Weekly Focus"
            subtitle={`Complete these to gain up to +${weeklyGain}% readiness this week`}
            rightElement={
              <InfoChip
                label="This Week"
                color={COLORS.amber}
                backgroundColor={COLORS.chipBg}
                borderColor={COLORS.amber + '35'}
                icon={<Flame size={11} color={COLORS.amber} />}
              />
            }
          />
          <View style={{ gap: 8 }}>
            {weeklyFocus.map((m, idx) => {
              const meta = getMilestoneMeta(m.milestone_type);
              const gain = GAINS[m.milestone_type] || 3;
              return (
                <WeeklyTaskCard
                  key={`wf-${m.id}`}
                  num={idx + 1}
                  icon={meta.Icon}
                  color={meta.color}
                  title={m.title}
                  description={m.description}
                  gain={gain}
                  onPress={meta.onPress}
                />
              );
            })}
          </View>
        </CareerSectionCard>
      )}

      {/* ══════════════ FOOTER ══════════════ */}
      <Text style={s.footer}>
        Last updated {roadmap.generated_at ? new Date(roadmap.generated_at).toLocaleString() : '—'} · Powered by Student Alumni AI
      </Text>

      {/* ══════════════ SCORE EXPLAINABILITY MODAL ══════════════ */}
      <Modal
        visible={showExplainModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExplainModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <View style={s.modalHeaderLeft}>
                <View style={s.modalHeaderIcon}><HelpCircle size={17} color={COLORS.purpleL} /></View>
                <View>
                  <Text style={s.modalTitle}>Score Explainability</Text>
                  <Text style={s.modalSub}>How your career scores are calculated</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowExplainModal(false)}
                style={s.modalClose}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <X size={17} color={COLORS.text2} />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={s.tabRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setExplainTab('readiness')}
                  style={[s.tab, explainTab === 'readiness' && s.tabActive]}
                >
                  <Text style={[s.tabText, explainTab === 'readiness' && s.tabTextActive]}>Overall Readiness</Text>
                </Pressable>
                {Object.keys(careerIntel?.score_explanations?.categories || {}).map((catName) => (
                  <Pressable
                    accessibilityRole="button"
                    key={catName}
                    onPress={() => setExplainTab(catName)}
                    style={[s.tab, explainTab === catName && s.tabActive]}
                  >
                    <Text style={[s.tabText, explainTab === catName && s.tabTextActive]}>
                      {catName.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {explainTab === 'readiness' ? (
                <View style={{ gap: 10 }}>
                  <View style={s.explainInfoBox}>
                    <Text style={s.explainInfoTitle}>How Readiness is Computed</Text>
                    <Text style={s.explainInfoBody}>
                      Your Overall Readiness ({readinessScore}%) is a weighted sum of your 6 core career pillars. Each category contributes points proportional to its industry importance for {targetRole}.
                    </Text>
                  </View>
                  <Text style={s.explainSubhead}>Contributing Pillars:</Text>
                  {(careerIntel?.score_explanations?.readiness?.factors || []).map((fac: any, fIdx: number) => (
                    <View key={`rf-${fIdx}`} style={s.explainFactorRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.explainFactorLabel}>{fac.label}</Text>
                        <Text style={s.explainFactorSub}>Weight: {fac.weight_pct}% of total score</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.explainFactorPts, { color: COLORS.purpleL }]}>+{fac.earned} / {fac.max} pts</Text>
                        <Text style={s.explainFactorSub}>Category: {fac.score_pct}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {(() => {
                    const catData = careerIntel?.score_explanations?.categories?.[explainTab];
                    if (!catData) return <Text style={{ color: COLORS.text2 }}>Select a category to view details.</Text>;
                    return (
                      <>
                        <View style={[s.explainInfoBox, { borderColor: 'rgba(34,211,238,0.20)', backgroundColor: 'rgba(34,211,238,0.05)' }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={[s.explainInfoTitle, { color: COLORS.cyan }]}>{explainTab}</Text>
                            <Text style={[s.kpiValue, { fontSize: 18, color: COLORS.text }]}>{catData.current_score}%</Text>
                          </View>
                          <Text style={s.explainInfoBody}>
                            This pillar accounts for {catData.weight_pct}% of your Total Readiness. You currently have {catData.missing_points} potential growth points remaining.
                          </Text>
                        </View>
                        <Text style={s.explainSubhead}>Evaluation Checklist:</Text>
                        {(catData.factors || []).map((item: any, idx: number) => (
                          <View key={`cf-${idx}`} style={[s.explainFactorRow, item.done && { borderColor: 'rgba(52,211,153,0.20)', backgroundColor: 'rgba(52,211,153,0.04)' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              {item.done
                                ? <CheckCircle2 size={15} color={COLORS.green} />
                                : <View style={{ width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.dim }} />
                              }
                              <Text style={[s.explainFactorLabel, !item.done && { color: COLORS.text2 }]}>{item.label}</Text>
                            </View>
                            <Text style={[s.explainFactorPts, { color: item.done ? COLORS.green : COLORS.dim }]}>
                              +{item.earned} / {item.max} pts
                            </Text>
                          </View>
                        ))}
                      </>
                    );
                  })()}
                </View>
              )}
            </ScrollView>

            <View style={s.modalFooter}>
              <Pressable
                onPress={() => setShowExplainModal(false)}
                style={s.primaryBtn}
                accessibilityRole="button"
              >
                <Text style={s.primaryBtnText}>Got It</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   StyleSheet — page-level only. Component styles live in their own files.
   Uses design tokens exclusively — no hardcoded values.
═══════════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  shell:         { flex: 1, backgroundColor: COLORS.bg },
  embeddedShell: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  content:       { padding: SPACING.xl, paddingBottom: 64, gap: SPACING.md },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  loadingIcon: {
    width: 56, height: 56, borderRadius: RADIUS.card,
    backgroundColor: 'rgba(109,40,217,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.20)',
  },
  loadingTitle: { color: COLORS.text,  fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.md },
  loadingDesc:  { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,  fontSize: FONT_SIZES.sm, textAlign: 'center' },

  /* Header */
  headerBar:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  headerLeft:   { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, flex: 1, minWidth: 0 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flexWrap: 'wrap' },
  headerTitle:  { color: COLORS.text, fontFamily: FONT_FAMILIES.xbold, fontSize: 20, letterSpacing: -0.4 },
  headerSub:    { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', flexShrink: 0 },
  topNav: {},
  backBtn: {
    width: 34, height: 34, borderRadius: RADIUS.btn,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease', outlineStyle: 'solid', outlineColor: COLORS.purpleL, outlineWidth: 2 } as any) : {}),
  },

  /* Buttons */
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.btn, backgroundColor: COLORS.purple2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease', outlineStyle: 'solid', outlineColor: COLORS.purpleL, outlineWidth: 2 } as any) : {}),
  },
  primaryBtnHover: { backgroundColor: '#8b5cf6' },
  primaryBtnText:  { color: '#fff', fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },

  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.btn,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.20)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease', outlineStyle: 'solid', outlineColor: COLORS.purpleL, outlineWidth: 2 } as any) : {}),
  },
  ghostBtnSm: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xxs,
    paddingHorizontal: SPACING.xs, paddingVertical: 6, borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(255,255,255,0.02)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease', outlineStyle: 'solid', outlineColor: COLORS.purpleL, outlineWidth: 2 } as any) : {}),
  },
  ghostBtnHover: { backgroundColor: 'rgba(167,139,250,0.14)' },
  ghostBtnText:  { color: COLORS.purpleL, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },

  /* Pills */
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xxs,
    paddingHorizontal: SPACING.xs, paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderColor: 'rgba(52,211,153,0.25)', borderWidth: 1,
  },
  onlineDot:     { width: 6, height: 6, borderRadius: RADIUS.dot, backgroundColor: COLORS.green },
  onlinePillText: { color: COLORS.green, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },
  streakPill:    { backgroundColor: 'rgba(248,113,113,0.10)', borderColor: 'rgba(248,113,113,0.25)' },

  /* Hero */
  heroCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xl,
    backgroundColor: COLORS.card,
    borderColor: 'rgba(109,40,217,0.20)', borderWidth: 1,
    borderRadius: RADIUS.card, padding: SPACING.xl,
    overflow: 'hidden',
  },
  heroLabelRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  heroLabelDot:      { width: 6, height: 6, borderRadius: RADIUS.dot, backgroundColor: COLORS.purpleL },
  heroLabel:         { color: COLORS.purpleXL, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm, letterSpacing: 1.2 },
  heroRole:          { color: COLORS.text,  fontFamily: FONT_FAMILIES.xbold, fontSize: FONT_SIZES.lg, letterSpacing: -0.5, lineHeight: 30 },
  heroCompany:       { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,   fontSize: FONT_SIZES.md, marginTop: SPACING.xxs },
  heroMeta:          { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.md },
  heroMetaChip:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaDot:       { width: 5, height: 5, borderRadius: RADIUS.dot },
  heroMetaText:      { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm },
  heroMetaVal:       { fontFamily: FONT_FAMILIES.bold },
  heroProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  heroProgressLabel: { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm },
  heroProgressPct:   { fontFamily: FONT_FAMILIES.xbold, fontSize: FONT_SIZES.md },
  heroTrack:         { height: PROGRESS_HEIGHTS.hero, borderRadius: RADIUS.dot, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  heroFill:          { height: '100%' as any, borderRadius: RADIUS.dot },
  heroMicrocopy:     { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, fontStyle: 'italic', marginTop: 10, lineHeight: 17 },
  heroRight:         { alignItems: 'center', gap: SPACING.sm, flexShrink: 0 },
  heroRingWrap:      { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  heroRingLabel:     { position: 'absolute', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', alignSelf: 'center' },
  heroRingPct:       { color: COLORS.text,  fontFamily: FONT_FAMILIES.xbold, fontSize: 20, letterSpacing: -1 },
  heroRingUnit:      { color: COLORS.text2, fontFamily: FONT_FAMILIES.bold,  fontSize: FONT_SIZES.sm, marginTop: SPACING.xxs },
  heroRingCaption:   { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,   fontSize: FONT_SIZES.sm },
  heroStepsBadge:    {
    alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.20)', borderWidth: 1, borderRadius: RADIUS.card,
    flexDirection: 'row', gap: 6,
  },
  heroStepsNum:   { color: COLORS.purpleL, fontFamily: FONT_FAMILIES.xbold, fontSize: 20, letterSpacing: -0.5 },
  heroStepsLabel: { color: COLORS.text2,   fontFamily: FONT_FAMILIES.med,   fontSize: FONT_SIZES.sm },

  /* KPI Strip */
  kpiRow: { flexDirection: 'row', gap: SPACING.sm },

  /* Grid */
  mainGrid: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  leftCol:  { flex: 3, gap: SPACING.md },
  rightCol: { flex: 2, gap: SPACING.md },

  /* Empty state */
  emptyState:     { alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xl },
  emptyStateText: { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, textAlign: 'center' },

  /* Expand button */
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, justifyContent: 'center', marginTop: SPACING.xxs,
    borderRadius: RADIUS.btn, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.02)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease', outlineStyle: 'solid', outlineColor: COLORS.purpleL, outlineWidth: 2 } as any) : {}),
  },
  expandBtnText: { color: COLORS.purpleL, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },

  /* Recruiter View */
  recruiterOverall:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  recruiterRingWrap:   { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  recruiterRingLabel:  { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  recruiterRingPct:    { color: COLORS.text, fontFamily: FONT_FAMILIES.xbold, fontSize: 16 },
  recruiterScoreTitle: { color: COLORS.text,  fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.md },
  recruiterScoreSub:   { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,  fontSize: FONT_SIZES.sm, marginTop: 4 },
  recruiterRow:        { marginBottom: 10 },
  recruiterRowLabel:   { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,  fontSize: FONT_SIZES.sm, marginBottom: 4 },
  recruiterBarWrap:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  recruiterTrack:      { flex: 1, height: PROGRESS_HEIGHTS.recruiter, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  recruiterFill:       { height: '100%' as any, borderRadius: 2 },
  recruiterPct:        { fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm, width: 36, textAlign: 'right' },

  /* Footer */
  footer: { color: COLORS.dim, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, textAlign: 'center', paddingVertical: SPACING.sm },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  modalBox: {
    width: '100%', maxWidth: 540,
    backgroundColor: COLORS.cardSolid,
    borderColor: COLORS.borderMed, borderWidth: 1,
    borderRadius: RADIUS.card, padding: SPACING.xl,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 48px rgba(0,0,0,0.6)' } as any) : {}),
  },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  modalHeaderIcon: {
    width: 36, height: 36, borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(167,139,250,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.20)',
  },
  modalTitle:  { color: COLORS.text,  fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.md },
  modalSub:    { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,  fontSize: FONT_SIZES.sm, marginTop: 2 },
  modalClose:  {
    width: 32, height: 32, borderRadius: RADIUS.chip,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', outlineStyle: 'solid', outlineColor: COLORS.purpleL, outlineWidth: 2 } as any) : {}),
  },
  modalFooter: { marginTop: SPACING.md, alignItems: 'flex-end' },

  /* Modal tabs */
  tabRow:       { flexDirection: 'row', gap: 6 },
  tab:          { paddingHorizontal: SPACING.sm, paddingVertical: 7, borderRadius: RADIUS.chip, backgroundColor: 'rgba(255,255,255,0.04)' },
  tabActive:    { backgroundColor: 'rgba(167,139,250,0.15)' },
  tabText:      { color: COLORS.text2, fontFamily: FONT_FAMILIES.med,  fontSize: FONT_SIZES.sm },
  tabTextActive: { color: COLORS.purpleL, fontFamily: FONT_FAMILIES.bold },

  /* Explainability */
  explainInfoBox: {
    backgroundColor: 'rgba(109,40,217,0.06)',
    borderColor: 'rgba(109,40,217,0.15)', borderWidth: 1,
    borderRadius: RADIUS.card, padding: SPACING.sm,
  },
  explainInfoTitle: { color: COLORS.purpleL, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm, marginBottom: 6 },
  explainInfoBody:  { color: COLORS.text2,   fontFamily: FONT_FAMILIES.med,  fontSize: FONT_SIZES.sm, lineHeight: 18 },
  explainSubhead:   { color: COLORS.textSub, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm, letterSpacing: 0.4 },
  explainFactorRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.chip,
  },
  explainFactorLabel: { color: COLORS.text,  fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },
  explainFactorSub:   { color: COLORS.textSub, fontFamily: FONT_FAMILIES.med, fontSize: 11, marginTop: 2 },
  explainFactorPts:   { fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },

  /* KPI value (reused in modal) */
  kpiValue: { color: COLORS.text, fontFamily: FONT_FAMILIES.xbold, fontSize: 24, letterSpacing: -0.5 },
});
