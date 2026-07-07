/**
 * /career-ai — AI Career Roadmap
 *
 * Layout matches the design reference:
 *   1. Header: title + Online pill + suggestion + Download Roadmap button
 *   2. Four KPI tiles (readiness ring / career level / target / profile)
 *   3. Goal banner (target role, level, ETA, steps remaining, progress bar)
 *   4. Two-column:
 *        Left  – Radar (spider) skill chart + Score Contribution action grid
 *        Right – Career Journey vertical timeline
 *   5. Footer timestamp
 *
 * All data from real backend:
 *   POST /ai/career-roadmap          – LLM-generated roadmap (cached)
 *   POST /ai/career-roadmap {force}  – regenerate
 *   GET  /users/me/completion        – profile strength %
 *   GET  /users/me/stats             – streak
 *   GET  /users/me/skill-intelligence – readiness / skill scores
 */
import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs();
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Award, Briefcase, ChevronRight, CircleCheck as CheckCircle2,
  Code, Download, FileText, Flame, Folder, HelpCircle, Link2, MessageSquare,
  Mic, Star, Target, TrendingUp, User as UserIcon, X,
} from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components/Toast';
import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { CompletionRing } from '@/src/views/web/profile/CompletionRing';
import { generateCareerReportPdf, type CareerReportData } from '@/src/lib/careerReportPdf';
import {
  GAINS,
  ROADMAP_SKILL_KEY_MAP,
  SKILL_CATEGORY_KEYS,
  normalizeRoadmapSkillScores,
  getImpactLabel,
} from '@/src/lib/careerConstants';
import { PredictionTimeline } from '@/src/views/web/PredictionTimeline';
import { ReadinessEstimates } from '@/src/views/web/ReadinessEstimates';
import { GoalSimulator } from '@/src/views/web/GoalSimulator';

/* ────────── Design tokens ────────── */
const C = {
  bg: '#0d0b1f',
  bgCard: 'rgba(255,255,255,0.032)',
  bgCardH: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.14)',
  text: '#f0eeff',
  text2: 'rgba(240,238,255,0.60)',
  textSub: 'rgba(240,238,255,0.70)',
  dim: 'rgba(240,238,255,0.30)',
  purple: '#6d28d9',
  purple2: '#7c3aed',
  purpleL: '#a78bfa',
  purpleXL: '#c4b5fd',
  teal: '#2dd4bf',
  blue: '#60a5fa',
  amber: '#fbbf24',
  red: '#f87171',
  green: '#34d399',
  pink: '#f472b6',
};
const FT = {
  med: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  xbold: 'DMSans_800ExtraBold',
};

/* ────────── Skill metadata ────────── */
const SKILL_META = [
  { key: 'Technical Excellence',         label: 'Technical\nExcellence',      short: 'Technical Excellence',      color: '#5EEAD4', Icon: Code },
  { key: 'Professional Communication',   label: 'Professional\nCommunication', short: 'Professional Communication', color: '#A78BFA', Icon: MessageSquare },
  { key: 'Personal Brand',               label: 'Personal\nBrand',             short: 'Personal Brand',             color: '#F472B6', Icon: Star },
  { key: 'Leadership & Collaboration',   label: 'Leadership &\nCollaboration',  short: 'Leadership & Collaboration', color: '#F59E0B', Icon: Award },
  { key: 'Career Preparation',           label: 'Career\nPreparation',          short: 'Career Preparation',         color: '#3B82F6', Icon: Mic },
  { key: 'Industry Presence',            label: 'Industry\nPresence',           short: 'Industry Presence',          color: '#C4B5FD', Icon: UserIcon },
];

// GAINS and getImpactLabel are imported from careerConstants.ts (single source of truth)
// IMPACT_LABEL local constant removed — use getImpactLabel(gain) for robust threshold matching

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
   Radar Chart (SVG hexagon spider chart)
═══════════════════════════════════════════════════════════ */
function RadarChart({
  scores, size = 220,
}: {
  scores: Record<string, number>;
  size?: number;
}) {
  const n = SKILL_META.length;          // 6
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;            // max radius of data polygon
  const labelR = size * 0.50;          // label radius

  // Compute polygon points for a given fraction (0-1)
  const polyPts = (frac: number) =>
    SKILL_META.map((_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        x: cx + frac * maxR * Math.cos(angle),
        y: cy + frac * maxR * Math.sin(angle),
      };
    });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolys = gridLevels.map(f => polyPts(f));

  // Actual data polygon
  const dataFracs = SKILL_META.map(s => {
    const v = Number(scores[s.key] || 0);
    return Math.min(1, v / 100);
  });
  const dataPts = SKILL_META.map((s, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: cx + dataFracs[i] * maxR * Math.cos(angle),
      y: cy + dataFracs[i] * maxR * Math.sin(angle),
    };
  });
  const dataPolygon = dataPts.map(p => `${p.x},${p.y}`).join(' ');

  // Label positions (per skill)
  const labelPts = SKILL_META.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
    };
  });

  const pts2Str = (pts: { x: number; y: number }[]) =>
    pts.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <SvgLinearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#7c3aed" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#a78bfa" stopOpacity="0.25" />
        </SvgLinearGradient>
        <SvgLinearGradient id="radarStroke" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#c4b5fd" stopOpacity="1" />
          <Stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>

      {/* Grid polygons */}
      {gridPolys.map((pts, gi) => (
        <Polygon
          key={`grid-${gi}`}
          points={pts2Str(pts)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {SKILL_META.map((_, i) => {
        const outerPts = polyPts(1);
        return (
          <Line
            key={`axis-${i}`}
            x1={cx} y1={cy}
            x2={outerPts[i].x} y2={outerPts[i].y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        );
      })}

      {/* Data fill */}
      <Polygon
        points={dataPolygon}
        fill="url(#radarFill)"
        stroke="url(#radarStroke)"
        strokeWidth={2}
      />

      {/* Data dots */}
      {dataPts.map((p, i) => (
        <Circle
          key={`dot-${i}`}
          cx={p.x} cy={p.y} r={3.5}
          fill={SKILL_META[i].color}
          stroke="#0d0b1f"
          strokeWidth={1.5}
        />
      ))}

      {/* Labels */}
      {SKILL_META.map((skill, i) => {
        const lp = labelPts[i];
        const score = Math.round(Number(scores[skill.key] || 0));
        const lines = skill.label.split('\n');
        // Anchor based on position
        const anchor = lp.x < cx - 10 ? 'end' : lp.x > cx + 10 ? 'start' : 'middle';
        const lineH = 11;
        const totalH = lines.length * lineH;
        const startY = lp.y - totalH / 2;

        return (
          <React.Fragment key={`lbl-${i}`}>
            {/* Score % */}
            <SvgText
              x={lp.x}
              y={startY - 2}
              textAnchor={anchor}
              fontSize={10}
              fontWeight="700"
              fill={skill.color}
            >
              {score}%
            </SvgText>
            {/* Label lines */}
            {lines.map((line, li) => (
              <SvgText
                key={li}
                x={lp.x}
                y={startY + li * lineH + lineH}
                textAnchor={anchor}
                fontSize={9}
                fill="rgba(240,238,255,0.60)"
              >
                {line}
              </SvgText>
            ))}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════ */
export default function CareerAIPage({ embedded = false }: { embedded?: boolean } = {}) {
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
  const isLarge = winW >= 860;

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapResp>({});
  const [profileStrength, setProfileStrength] = useState(0);
  const [skillStreak, setSkillStreak] = useState(0);
  const [careerIntel, setCareerIntel] = useState<any>(null);
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [explainTab, setExplainTab] = useState('readiness');

  /* ── Derived ── */
  const allMilestones = useMemo(() => roadmap.milestones || [], [roadmap]);
  const pendingMilestones = useMemo(() => allMilestones.filter(m => !m.completed), [allMilestones]);
  const firstPendingIdx = useMemo(() => allMilestones.findIndex(m => !m.completed), [allMilestones]);

  /* ── Fetch ── */
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

  /* ── Readiness computation ── */
  const { readinessScore, readinessLevel, nextGoal, bandProgress } = useMemo(() => {
    let score = 0; let level = 'Explorer'; let nextLevel = 'Builder'; let nextScore = 21;
    if (careerIntel?.readiness_score !== undefined) {
      if (typeof careerIntel.readiness_score === 'object') {
        score = careerIntel.readiness_score.score || 0;
        level = careerIntel.readiness_score.level || 'Explorer';
        nextLevel = careerIntel.readiness_score.next_level || nextLevel;
        nextScore = careerIntel.readiness_score.next_threshold || nextScore;
      } else { score = Number(careerIntel.readiness_score) || 0; }
    } else {
      const rawRoadmap = roadmap.skill_scores || {};
      const normalized = normalizeRoadmapSkillScores(rawRoadmap);
      const vals = SKILL_META.map(s => Number(normalized[s.key] || 0));
      if (vals.length) score = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    score = Math.round(score);
    if (nextLevel === 'Builder' && nextScore === 21) {
      if (score > 20) { nextLevel = 'Developing Professional'; nextScore = 41; }
      if (score > 40) { nextLevel = 'Career Ready'; nextScore = 61; }
      if (score > 60) { nextLevel = 'Industry Ready'; nextScore = 81; }
    }
    const FLOORS: Record<string, number> = { Explorer: 0, Builder: 21, 'Developing Professional': 41, 'Career Ready': 61, 'Industry Ready': 81 };
    const floor = FLOORS[level] ?? 0;
    const bRange = Math.max(1, nextScore - floor);
    const bandProgress = Math.min(100, Math.round(((score - floor) / bRange) * 100));
    return { readinessScore: score, readinessLevel: level, nextGoal: `${nextLevel} (${nextScore}%)`, bandProgress };
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
      return { potentialScore: Number(careerIntel.potential_score) || 0, getLevelForScore };
    }
    const rawRoadmap = roadmap.skill_scores || {};
    const normalized = normalizeRoadmapSkillScores(rawRoadmap);
    const aiSkillVals = SKILL_META.map(s => Number(normalized[s.key] || 0));
    const avg = aiSkillVals.length ? aiSkillVals.reduce((a, b) => a + b, 0) / aiSkillVals.length : 0;
    const pScore = Math.min(100, Math.round(avg * 0.60 + profileStrength * 0.15 + 25));
    return { potentialScore: pScore, getLevelForScore };
  }, [careerIntel, roadmap.skill_scores, profileStrength]);

  /* ── Skill scores (normalised to 0-100) ── */
  const skillScores = useMemo<Record<string, number>>(() => {
    // Prefer skill-intelligence API scores (canonical keys)
    if (careerIntel?.skill_scores) {
      const base = careerIntel.skill_scores;
      return SKILL_META.reduce<Record<string, number>>((acc, s) => {
        acc[s.key] = base[s.key] !== undefined ? Number(base[s.key]) : 0;
        return acc;
      }, {});
    }
    // Fix 1: Fallback to roadmap skill_scores — normalize LLM short keys → canonical keys
    const rawRoadmap = roadmap.skill_scores || {};
    const normalized = normalizeRoadmapSkillScores(rawRoadmap);
    return SKILL_META.reduce<Record<string, number>>((acc, s) => {
      // Use normalized canonical key, then check short-key alias, else 0 (never hardcode a default score)
      acc[s.key] = normalized[s.key] !== undefined
        ? Math.round(Number(normalized[s.key]))
        : 0;
      return acc;
    }, {});
  }, [careerIntel, roadmap.skill_scores]);

  /* ── Ranked actions for Score Contribution ── */
  const rankedActions = useMemo(() => {
    if (careerIntel?.ranked_actions?.length) return careerIntel.ranked_actions.slice(0, 4);
    // Derive from pending milestone types
    const seen = new Set<string>();
    const actions: { type: string; title: string; gain: number }[] = [];
    for (const m of pendingMilestones) {
      const t = m.milestone_type;
      if (!seen.has(t) && GAINS[t]) {
        seen.add(t);
        actions.push({ type: t, title: m.title, gain: GAINS[t] });
      }
    }
    return actions.sort((a, b) => b.gain - a.gain).slice(0, 4);
  }, [careerIntel, pendingMilestones]);

  /* ── Milestone meta ── */
  const getMilestoneMeta = useCallback((type?: string) => {
    const t = (type || '').toUpperCase();
    if (t === 'RESUME')        return { Icon: FileText,    color: C.purpleL,  onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=resume' as any) };
    if (t === 'PORTFOLIO')     return { Icon: Briefcase,   color: '#22D3EE',  onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info' as any) };
    if (t === 'SKILLS')        return { Icon: Star,        color: '#F59E0B',  onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info&section=skills' as any) };
    if (t === 'CERTIFICATION') return { Icon: Award,       color: '#10B981',  onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=certifications' as any) };
    if (t === 'PROJECT')       return { Icon: Folder,      color: '#A78BFA',  onPress: () => router.push('/student-portal?tab=profile&ptab=manage&section=projects' as any) };
    if (t === 'LINKEDIN')      return { Icon: Link2,       color: '#3B82F6',  onPress: () => router.push('/student-portal?tab=profile&ptab=profile-info&section=linkedin' as any) };
    if (t === 'MOCK_INTERVIEW')return { Icon: Code,        color: '#EC4899',  onPress: () => toast.info('Mock Interview', 'AI mock interviewer coming soon!') };
    if (t === 'NETWORKING')    return { Icon: MessageSquare, color: C.teal,   onPress: () => router.push('/student-portal?tab=network' as any) };
    if (t === 'PROFILE')       return { Icon: UserIcon,    color: C.blue,     onPress: () => router.push('/student-portal?tab=profile&ptab=manage' as any) };
    if (t === 'JOB_APPLICATION')return{ Icon: Briefcase,   color: C.amber,    onPress: () => router.push('/student-portal?tab=jobs' as any) };
    return { Icon: Target, color: C.dim, onPress: () => toast.info('Milestone', 'Check profile settings') };
  }, [router, toast]);

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
        targetRole: roadmap.target_role || 'Software Engineer',
        targetCompany: roadmap.target_company_type || 'Top Tech Company',
        readinessScore,
        readinessLevel,
        nextGoal,
        bandProgress,
        potentialScore,
        potentialLevel: getLevelForScore(potentialScore),
        profileStrength,
        progressPct: Math.min(100, roadmap.progress_pct ?? 0),
        generatedAt: roadmap.generated_at,
        estimatedWeeks: pendingMilestones.length > 0 ? `~${pendingMilestones.length * 2} Weeks` : 'Goal Reached!',
        suggestion: roadmap.suggestion,
        skillScores,
        milestones: allMilestones,
        rankedActions,
        recommendation: careerIntel?.recommendation,
      };
      await generateCareerReportPdf(reportData);
      toast.success('Report Ready', 'Your career report PDF has been downloaded.');
    } catch (err: any) {
      toast.error('Report Failed', err?.message || 'Could not generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [
    generatingPdf, user, roadmap, readinessScore, readinessLevel, nextGoal, bandProgress,
    potentialScore, getLevelForScore, profileStrength, pendingMilestones, skillScores,
    allMilestones, rankedActions, careerIntel, toast,
  ]);

  /* ── Loading state ── */
  if (loading && !roadmap.milestones) {
    return (
      <View style={[embedded ? s.embeddedShell : s.shell, { alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
        <ActivityIndicator size="large" color={C.purpleL} />
        <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 15 }}>Generating your roadmap…</Text>
      </View>
    );
  }

  const targetRole = roadmap.target_role || 'Software Engineer';
  const targetCo   = roadmap.target_company_type || 'Top Tech Company';
  // Fix 2: progress_pct is now computed server-side from milestone completion, default 0
  const progress   = Math.min(100, roadmap.progress_pct ?? 0);
  const isActuallyComplete = allMilestones.length > 0 && pendingMilestones.length === 0 && progress === 100;
  const estimatedWeeks = pendingMilestones.length > 0 ? `~${pendingMilestones.length * 2} Weeks` : (isActuallyComplete ? 'Goal Reached!' : 'Not Started');
  const radarSize = Math.min(isLarge ? 280 : winW * 0.72, 310);

  const Container: any = embedded ? View : ScrollView;
  const containerProps: any = embedded
    ? { style: s.embeddedShell }
    : { style: s.shell, contentContainerStyle: { padding: isLarge ? 22 : 14, paddingBottom: 80, gap: 14 } };

  return (
    <Container {...containerProps}>

      {/* ──────── HEADER ──────── */}
      <View style={s.header}>
        {!embedded && (
          <Pressable onPress={() => router.back()} style={s.backBtn} testID="career-back">
            <ArrowLeft size={18} color={C.text} />
          </Pressable>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text style={s.title}>AI Career Roadmap</Text>
            <View style={s.onlinePill}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }} />
              <Text style={s.onlinePillText}>Online</Text>
            </View>
            {skillStreak > 0 && (
              <View style={[s.onlinePill, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.30)' }]}>
                <Flame size={11} color={C.red} fill={C.red} />
                <Text style={[s.onlinePillText, { color: C.red }]}>{skillStreak} Day Streak</Text>
              </View>
            )}
          </View>
        {/* Fix 10: Reserve min-height for suggestion area to prevent layout jump */}
        <View style={{ minHeight: 20 }}>
          {!!roadmap.suggestion && (
            <Text style={s.suggest} numberOfLines={2}>{roadmap.suggestion}</Text>
          )}
        </View>
        </View>

        {/* Download + Regenerate */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable
            onPress={() => fetch(true)}
            disabled={regenerating}
            style={({ pressed, hovered }: any) => [
              s.regenBtn,
              (pressed || hovered) && { opacity: 0.8 },
            ]}
          >
            {regenerating
              ? <ActivityIndicator size={14} color="#fff" />
              : <Text style={s.regenBtnText}>↺ Regenerate</Text>}
          </Pressable>
          <Pressable
            onPress={generateCareerReport}
            disabled={generatingPdf}
            style={({ pressed, hovered }: any) => [
              s.downloadBtn,
              (pressed || hovered) && !generatingPdf && { opacity: 0.8 },
              generatingPdf && { opacity: 0.7 },
            ]}
          >
            {generatingPdf
              ? <ActivityIndicator size={14} color="#fff" />
              : <Download size={14} color="#fff" />}
            <Text style={s.downloadBtnText}>
              {generatingPdf ? 'Generating…' : 'Generate Career Report'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ──────── KPI TILES ──────── */}
      {/* Fix 8: 5-tile row with Skill Streak added */}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: isLarge ? 'nowrap' : 'wrap' }}>

        {/* 1 – Current Readiness (ring) */}
        <View style={[s.kpiCard, { flex: isLarge ? 1 : 0, minWidth: isLarge ? 0 : '47%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.kpiLabel}>CURRENT READINESS</Text>
            <Pressable
              onPress={() => setShowExplainModal(true)}
              style={({ pressed, hovered }: any) => [
                { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
                (pressed || hovered) && { backgroundColor: 'rgba(167,139,250,0.25)' },
              ]}
            >
              <Text style={{ color: C.purpleL, fontSize: 10, fontFamily: FT.bold }}>Why?</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <CompletionRing
              pct={readinessScore}
              size={54}
              stroke={5}
              color={C.purpleL}
              trackColor="rgba(255,255,255,0.08)"
            />
            <View>
              <Text style={[s.kpiValue, { color: C.purpleL }]}>{readinessScore}%</Text>
              <Text style={s.kpiSub}>{readinessLevel}</Text>
            </View>
          </View>
          <View style={[s.kpiBandTrack, { marginTop: 10 }]}>
            <View style={[s.kpiBandFill, { width: `${bandProgress}%`, backgroundColor: C.purpleL }]} />
          </View>
          <Text style={s.kpiBandLabel}>Next: {nextGoal}</Text>
        </View>

        {/* 2 – Career Level */}
        <View style={[s.kpiCard, { flex: isLarge ? 1 : 0, minWidth: isLarge ? 0 : '47%' }]}>
          <Text style={s.kpiLabel}>CAREER LEVEL</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View style={[s.kpiIconWrap, { backgroundColor: C.amber + '25', borderColor: C.amber + '60' }]}>
              <Award size={15} color={C.amber} />
            </View>
            <Text style={[s.kpiValue, { color: C.amber, fontSize: isLarge ? 18 : 16 }]}>{readinessLevel}</Text>
          </View>
          <Text style={[s.kpiSub, { marginTop: 4 }]}>Current standing</Text>
          <View style={[s.kpiBandTrack, { marginTop: 10 }]}>
            <View style={[s.kpiBandFill, { width: `${Math.min(100, readinessScore)}%`, backgroundColor: C.amber }]} />
          </View>
          <Text style={s.kpiBandLabel}>Target: {getLevelForScore(potentialScore)}</Text>
        </View>

        {/* 3 – Target Readiness */}
        <View style={[s.kpiCard, { flex: isLarge ? 1 : 0, minWidth: isLarge ? 0 : '47%' }]}>
          <Text style={s.kpiLabel}>TARGET READINESS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View style={[s.kpiIconWrap, { backgroundColor: C.teal + '22', borderColor: C.teal + '55' }]}>
              <TrendingUp size={15} color={C.teal} />
            </View>
            <Text style={[s.kpiValue, { color: C.teal }]}>{potentialScore}%</Text>
          </View>
          <Text style={[s.kpiSub, { marginTop: 4 }]}>{getLevelForScore(potentialScore)}</Text>
          <View style={[s.kpiBandTrack, { marginTop: 10 }]}>
            <View style={[s.kpiBandFill, { width: `${potentialScore}%`, backgroundColor: C.teal }]} />
          </View>
          <Text style={s.kpiBandLabel}>{estimatedWeeks} to reach goal</Text>
        </View>

        {/* 4 – Profile Strength */}
        <View style={[s.kpiCard, { flex: isLarge ? 1 : 0, minWidth: isLarge ? 0 : '47%' }]}>
          <Text style={s.kpiLabel}>PROFILE STRENGTH</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View style={[s.kpiIconWrap, { backgroundColor: C.blue + '22', borderColor: C.blue + '55' }]}>
              <UserIcon size={15} color={C.blue} />
            </View>
            <Text style={[s.kpiValue, { color: C.blue }]}>{profileStrength}%</Text>
          </View>
          <Text style={[s.kpiSub, { marginTop: 4 }]}>{profileStrength >= 100 ? 'Complete!' : `${100 - profileStrength}% remaining`}</Text>
          <View style={[s.kpiBandTrack, { marginTop: 10 }]}>
            <View style={[s.kpiBandFill, { width: `${profileStrength}%`, backgroundColor: C.blue }]} />
          </View>
          <Text style={s.kpiBandLabel}>Complete to boost score</Text>
        </View>

        {/* 5 – Skill Streak (Fix 8) */}
        <View style={[s.kpiCard, { flex: isLarge ? 1 : 0, minWidth: isLarge ? 0 : '47%' }]}>
          <Text style={s.kpiLabel}>SKILL STREAK</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <View style={[s.kpiIconWrap, { backgroundColor: C.red + '22', borderColor: C.red + '55' }]}>
              <Flame size={15} color={C.red} fill={C.red} />
            </View>
            <Text style={[s.kpiValue, { color: C.red }]}>{skillStreak}</Text>
          </View>
          <Text style={[s.kpiSub, { marginTop: 4 }]}>{skillStreak === 0 ? 'No active streak' : skillStreak === 1 ? '1 day streak' : `${skillStreak} days`}</Text>
          <View style={[s.kpiBandTrack, { marginTop: 10 }]}>
            <View style={[s.kpiBandFill, { width: `${Math.min(100, skillStreak * 10)}%`, backgroundColor: C.red }]} />
          </View>
          <Text style={s.kpiBandLabel}>Activity streak</Text>
        </View>
      </View>

      {/* ──────── GOAL BANNER ──────── */}
      <LinearGradient
        colors={['rgba(91,33,182,0.55)', 'rgba(67,20,160,0.35)', 'rgba(30,20,90,0.20)']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.goalCard}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          {/* Icon + label */}
          <View style={s.goalIconWrap}>
            <Briefcase size={20} color={C.purpleL} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.goalSmallLabel}>CURRENT GOAL</Text>
            <Text style={s.goalRole} numberOfLines={2}>{targetRole} at a {targetCo}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.text2 }} />
                <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 13 }}>
                  Level: <Text style={{ color: C.purpleXL, fontFamily: FT.bold }}>{readinessLevel}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.teal }} />
                <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 13 }}>
                  Target: <Text style={{ color: C.teal, fontFamily: FT.bold }}>{getLevelForScore(potentialScore)}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.amber }} />
                <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 13 }}>
                  ETA: <Text style={{ color: C.amber, fontFamily: FT.bold }}>{estimatedWeeks}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Steps remaining badge */}
          <View style={s.stepsRemainingBadge}>
            <Text style={s.stepsRemainingNum}>{pendingMilestones.length}</Text>
            <Text style={s.stepsRemainingLabel}>{'Steps\nRemaining'}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 12 }}>Overall Progress</Text>
            <Text style={{ color: C.purpleXL, fontFamily: FT.xbold, fontSize: 12 }}>{progress}%</Text>
          </View>
          <View style={s.goalBarTrack}>
            <LinearGradient
              colors={['#6d28d9', '#a78bfa', '#c4b5fd']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.goalBarFill, { width: `${progress}%` }]}
            />
          </View>
        </View>
      </LinearGradient>

      {/* ──────── PREDICTIONS ──────── */}
      <View style={{ flexDirection: isLarge ? 'row' : 'column', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <PredictionTimeline data={careerIntel?.predictions ?? null} />
        </View>
        <View style={{ width: isLarge ? 260 : undefined }}>
          <ReadinessEstimates data={careerIntel?.readiness_estimates ?? null} />
        </View>
      </View>

      {/* ──────── MAIN CONTENT: two columns ──────── */}
      <View style={{ flexDirection: isLarge ? 'row' : 'column', gap: 14, alignItems: 'stretch' }}>

        {/* ── LEFT: Skills & Score ── */}
        <View style={{ width: isLarge ? '40%' : '100%', gap: 14 }}>
          <View style={s.card}>
            {/* Card header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View>
                <Text style={s.cardTitle}>Skills & Score</Text>
                <Text style={s.cardSubtitle}>{readinessScore}%  {readinessLevel}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => setShowExplainModal(true)}
                  style={({ pressed, hovered }: any) => [
                    s.viewDetailsBtn,
                    { backgroundColor: 'rgba(45,212,191,0.12)', borderColor: 'rgba(45,212,191,0.3)' },
                    (pressed || hovered) && { backgroundColor: 'rgba(45,212,191,0.2)' },
                  ]}
                >
                  <Text style={[s.viewDetailsBtnText, { color: C.teal }]}>Explain Scores</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/student-portal?tab=profile' as any)}
                  style={({ pressed, hovered }: any) => [
                    s.viewDetailsBtn,
                    (pressed || hovered) && { backgroundColor: 'rgba(167,139,250,0.15)' },
                  ]}
                >
                  <Text style={s.viewDetailsBtnText}>View Details</Text>
                </Pressable>
              </View>
            </View>

            {/* Radar chart */}
            <View style={{ alignItems: 'center', marginVertical: 6 }}>
              <RadarChart scores={skillScores} size={radarSize} />
            </View>
          </View>

          {/* ── Score Contribution ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Score Contribution</Text>
            <Text style={[s.cardSubtitle, { marginBottom: 14 }]}>Top actions ranked by readiness gain</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {rankedActions.map((act: any, idx: number) => {
                const meta = getMilestoneMeta(act.type || act.milestone_type);
                const Icon = meta.Icon;
                const gain = act.gain ?? GAINS[act.type] ?? 3;
                const impact = getImpactLabel(gain);
                return (
                  <Pressable
                    key={`sa-${idx}`}
                    onPress={meta.onPress}
                    style={({ pressed, hovered }: any) => [
                      s.scoreActionCard,
                      (pressed || hovered) && { backgroundColor: C.bgCardH, borderColor: C.border2 },
                    ]}
                  >
                    <View style={[s.scoreActionIcon, { backgroundColor: meta.color + '20', borderColor: meta.color + '45' }]}>
                      <Icon size={18} color={meta.color} />
                    </View>
                    <Text style={[s.scoreActionPct, { color: meta.color }]}>+{gain}%</Text>
                    <Text style={s.scoreActionTitle} numberOfLines={2}>{act.title || act.type}</Text>
                    <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 11, textAlign: 'center', marginTop: 2, lineHeight: 14 }} numberOfLines={3}>
                      {act.reason || act.description || 'Boost your readiness score.'}
                    </Text>
                    {act.impact_breakdown && Array.isArray(act.impact_breakdown) && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                        {act.impact_breakdown.slice(0, 2).map((impText: string, impIdx: number) => (
                          <View key={`imp-${impIdx}`} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Text style={{ color: C.textSub, fontSize: 9.5, fontFamily: FT.med }}>{impText}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {(act.current_readiness !== undefined && act.estimated_readiness !== undefined) ? (
                      <View style={{ backgroundColor: 'rgba(45,212,191,0.12)', borderColor: 'rgba(45,212,191,0.3)', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 }}>
                        <Text style={{ color: C.teal, fontSize: 10, fontFamily: FT.bold }}>
                          Expected: {act.current_readiness}% ➔ {act.estimated_readiness}%
                        </Text>
                      </View>
                    ) : (
                      <Text style={[s.scoreActionImpact, { color: impact.color, marginTop: 2 }]}>{impact.text}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => router.push('/student-portal?tab=profile' as any)}
              style={({ pressed, hovered }: any) => [
                s.viewAllBtn,
                (pressed || hovered) && { backgroundColor: C.purple2 },
              ]}
            >
              <Text style={s.viewAllBtnText}>View All Actions</Text>
            </Pressable>
          </View>

          {/* ── Goal Simulator ── */}
          <GoalSimulator currentReadiness={readinessScore} />
        </View>

        {/* ── RIGHT: Career Journey ── */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[s.card, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={s.cardTitle}>Your Career Journey</Text>
                <Text style={s.cardSubtitle}>{targetRole}</Text>
              </View>
              {pendingMilestones.length > 0 && (
                <View style={s.stepsLeftBadge}>
                  <Text style={s.stepsLeftText}>{pendingMilestones.length} Steps Left</Text>
                </View>
              )}
            </View>

            {allMilestones.length === 0 ? (
              <View style={s.emptyState}>
                <Target size={32} color={C.dim} />
                <Text style={[s.emptyStateTitle, { marginTop: 8 }]}>No Roadmap Yet</Text>
                <Text style={s.emptyStateDesc}>Click "Regenerate" to build your personalized career journey.</Text>
              </View>
            ) : isActuallyComplete ? (
              <View style={s.emptyState}>
                <CheckCircle2 size={32} color={C.green} />
                <Text style={[s.emptyStateTitle, { marginTop: 8 }]}>All Steps Completed!</Text>
                <Text style={s.emptyStateDesc}>Keep building your profile to unlock more opportunities.</Text>
              </View>
            ) : (
              <View style={{ gap: 0 }}>
                {allMilestones.map((m, idx) => {
                  const isCompleted = m.completed;
                  const isActive    = idx === firstPendingIdx;
                  const isFuture    = !isCompleted && !isActive;
                  const meta = getMilestoneMeta(m.milestone_type);
                  const gain = GAINS[m.milestone_type] || 3;

                  return (
                    <View key={`step-${m.id}`} style={s.journeyRow}>
                      {/* Fix 9: Timeline connector line — correctly propagate green for completed chain */}
                      <View style={s.journeyIndicator}>
                        {/* Top connector: green if current or previous item is completed */}
                        {idx > 0 && (
                          <View style={[
                            s.journeyLine,
                            (isCompleted || (idx <= firstPendingIdx && firstPendingIdx > 0)) ? s.journeyLineActive : null,
                          ]} />
                        )}
                        <View style={[
                          s.journeyDot,
                          isCompleted && { backgroundColor: C.green, borderColor: C.green },
                          isActive    && { backgroundColor: 'rgba(124,58,237,0.22)', borderColor: C.purpleL, borderWidth: 2.5 },
                          isFuture    && { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border },
                        ]}>
                          {isCompleted ? (
                            <CheckCircle2 size={13} color="#fff" fill={C.green} />
                          ) : (
                            <meta.Icon size={11} color={isActive ? C.purpleL : C.dim} />
                          )}
                        </View>
                        {/* Bottom connector: green only if this milestone is completed */}
                        {idx < allMilestones.length - 1 && (
                          <View style={[s.journeyLine, isCompleted ? s.journeyLineActive : null]} />
                        )}
                      </View>

                      {/* Card */}
                      <Pressable
                        onPress={meta.onPress}
                        style={({ pressed, hovered }: any) => [
                          s.journeyCard,
                          isCompleted && s.journeyCardDone,
                          isActive    && s.journeyCardActive,
                          isFuture    && s.journeyCardFuture,
                          (pressed || hovered) && { backgroundColor: C.bgCardH, borderColor: C.border2 },
                        ]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          {/* Step row */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={[s.journeyStep, isActive && { color: C.purpleL }]}>
                              STEP {idx + 1}
                            </Text>
                            {isCompleted && (
                              <View style={[s.journeyBadge, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
                                <Text style={[s.journeyBadgeText, { color: C.green }]}>Completed</Text>
                              </View>
                            )}
                            {isActive && (
                              <View style={[s.journeyBadge, { backgroundColor: 'rgba(124,58,237,0.18)' }]}>
                                <Text style={[s.journeyBadgeText, { color: C.purpleL }]}>Next Action</Text>
                              </View>
                            )}
                            {isFuture && (
                              <View style={[s.journeyBadge, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                <Text style={[s.journeyBadgeText, { color: C.dim }]}>Locked</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[s.journeyTitle, isCompleted && { textDecorationLine: 'line-through', color: C.text2 }]} numberOfLines={1}>
                            {m.title}
                          </Text>
                          <Text style={[s.journeyDesc, isCompleted && { color: C.dim }]} numberOfLines={2}>
                            {m.description}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <View style={s.gainPill}>
                            <Text style={s.gainPillText}>+{gain}%</Text>
                          </View>
                          <ChevronRight size={15} color={C.dim} />
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ──────── AI SCORE EXPLAINABILITY MODAL ──────── */}
      <Modal visible={showExplainModal} transparent animationType="fade" onRequestClose={() => setShowExplainModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ width: '100%', maxWidth: 580, backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 22, maxHeight: '85%', ...(Platform.OS === 'web' ? { boxShadow: '0 20px 50px rgba(0,0,0,0.5)' } as any : {}) }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[s.kpiIconWrap, { backgroundColor: C.purple + '25', borderColor: C.purpleL }]}>
                  <HelpCircle size={18} color={C.purpleL} />
                </View>
                <View>
                  <Text style={[s.cardTitle, { fontSize: 18 }]}>AI Score Explainability</Text>
                  <Text style={s.cardSubtitle}>Transparent breakdown of how your career scores are calculated</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowExplainModal(false)} style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <X size={18} color={C.text2} />
              </Pressable>
            </View>

            {/* Category Tabs */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', paddingBottom: 12 }}>
              <Pressable
                onPress={() => setExplainTab('readiness')}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: explainTab === 'readiness' ? C.purple : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: explainTab === 'readiness' ? C.purpleL : C.border }}
              >
                <Text style={{ color: explainTab === 'readiness' ? '#fff' : C.text2, fontFamily: FT.bold, fontSize: 12 }}>Overall Readiness</Text>
              </Pressable>
              {Object.keys(careerIntel?.score_explanations?.categories || {}).map((catName) => (
                <Pressable
                  key={catName}
                  onPress={() => setExplainTab(catName)}
                  style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: explainTab === catName ? C.purple : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: explainTab === catName ? C.purpleL : C.border }}
                >
                  <Text style={{ color: explainTab === catName ? '#fff' : C.text2, fontFamily: FT.bold, fontSize: 11.5 }}>{catName.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </View>

            {/* Modal Body ScrollView */}
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {explainTab === 'readiness' ? (
                <View style={{ gap: 12 }}>
                  <View style={{ backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }}>
                    <Text style={{ color: C.purpleL, fontFamily: FT.xbold, fontSize: 15, marginBottom: 4 }}>How Readiness is Computed</Text>
                    <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 12.5, lineHeight: 18 }}>
                      Your Overall Readiness ({readinessScore}%) is a weighted sum of your 6 core career pillars. Each category contributes points proportional to its industry importance for {targetRole}.
                    </Text>
                  </View>
                  <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 14, marginTop: 4 }}>Contributing Pillars:</Text>
                  {(careerIntel?.score_explanations?.readiness?.factors || []).map((fac: any, fIdx: number) => (
                    <View key={`rf-${fIdx}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 13 }}>{fac.label}</Text>
                        <Text style={{ color: C.dim, fontFamily: FT.med, fontSize: 11, marginTop: 2 }}>Weight: {fac.weight_pct}% of total score</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: C.purpleL, fontFamily: FT.xbold, fontSize: 14 }}>+{fac.earned} / {fac.max} pts</Text>
                        <Text style={{ color: C.textSub, fontSize: 10.5, fontFamily: FT.med }}>Category Score: {fac.score_pct}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {(() => {
                    const catData = careerIntel?.score_explanations?.categories?.[explainTab];
                    if (!catData) return <Text style={{ color: C.textSub }}>Select a category to view details.</Text>;
                    return (
                      <>
                        <View style={{ backgroundColor: 'rgba(45,212,191,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(45,212,191,0.2)' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: C.teal, fontFamily: FT.xbold, fontSize: 15 }}>{explainTab}</Text>
                            <Text style={{ color: C.text, fontFamily: FT.xbold, fontSize: 16 }}>{catData.current_score}%</Text>
                          </View>
                          <Text style={{ color: C.text2, fontFamily: FT.med, fontSize: 12.5, marginTop: 4 }}>
                            This pillar accounts for {catData.weight_pct}% of your Total Readiness. You currently have {catData.missing_points} potential growth points remaining.
                          </Text>
                        </View>
                        <Text style={{ color: C.text, fontFamily: FT.bold, fontSize: 14, marginTop: 4 }}>Evaluation Checklist & Formula:</Text>
                        {(catData.factors || []).map((item: any, idx: number) => (
                          <View key={`cf-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: item.done ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: item.done ? 'rgba(52,211,153,0.2)' : C.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              {item.done ? <CheckCircle2 size={16} color={C.green} /> : <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: C.dim }} />}
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: item.done ? C.text : C.text2, fontFamily: item.done ? FT.bold : FT.med, fontSize: 13 }}>{item.label}</Text>
                              </View>
                            </View>
                            <Text style={{ color: item.done ? C.green : C.dim, fontFamily: FT.bold, fontSize: 13 }}>+{item.earned} / {item.max} pts</Text>
                          </View>
                        ))}
                      </>
                    );
                  })()}
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={{ marginTop: 18, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 14 }}>
              <Pressable onPress={() => setShowExplainModal(false)} style={{ backgroundColor: C.purple, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontFamily: FT.bold, fontSize: 13 }}>Got It</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ──────── FOOTER ──────── */}
      <Text style={s.footer}>
        Roadmap last generated {roadmap.generated_at ? new Date(roadmap.generated_at).toLocaleString() : '—'} · Powered by Student Alumni AI
      </Text>
    </Container>
  );
}

/* ═══════════════════════════════════════════════════════════
   Styles
═══════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  shell:         { flex: 1, backgroundColor: C.bg },
  embeddedShell: { flex: 1, backgroundColor: 'transparent' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  title:       { color: C.text, fontFamily: FT.xbold, fontSize: 22, letterSpacing: -0.5 },
  onlinePill:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.35)', borderWidth: 1,
  },
  onlinePillText: { color: C.green, fontFamily: FT.bold, fontSize: 11 },
  suggest:     { color: C.text2, fontFamily: FT.med, fontSize: 12.5, marginTop: 4, fontStyle: 'italic' },
  regenBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(109,40,217,0.25)', borderColor: 'rgba(167,139,250,0.35)', borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  regenBtnText: { color: C.purpleL, fontFamily: FT.bold, fontSize: 12 },
  downloadBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: C.purple,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  downloadBtnText: { color: '#fff', fontFamily: FT.bold, fontSize: 12 },

  /* KPI tiles */
  kpiCard: {
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1,
    borderRadius: 14, padding: 14,
  },
  // Fix 13: KPI label font raised from 9.5px to 12px for accessibility (WCAG AA)
  kpiLabel:     { color: C.text2, fontFamily: FT.bold, fontSize: 12, letterSpacing: 0.6 },
  kpiValue:     { fontFamily: FT.xbold, fontSize: 22, letterSpacing: -0.5 },
  kpiSub:       { color: C.dim, fontFamily: FT.med, fontSize: 11 },
  kpiBandTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  kpiBandFill:  { height: '100%', borderRadius: 2 },
  kpiBandLabel: { color: C.dim, fontFamily: FT.med, fontSize: 10, marginTop: 5 },
  kpiIconWrap:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  /* Goal banner */
  goalCard: {
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    borderRadius: 16, padding: 20, overflow: 'hidden',
  },
  goalIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.22)', alignItems: 'center', justifyContent: 'center',
  },
  goalSmallLabel: { color: C.purpleXL, fontFamily: FT.bold, fontSize: 10, letterSpacing: 0.9 },
  goalRole:       { color: C.text, fontFamily: FT.xbold, fontSize: 20, marginTop: 4, letterSpacing: -0.3, lineHeight: 26 },
  goalBarTrack:   { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  goalBarFill:    { height: '100%', borderRadius: 4 },
  stepsRemainingBadge: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(167,139,250,0.14)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 70,
  },
  stepsRemainingNum:   { color: C.purpleL, fontFamily: FT.xbold, fontSize: 30, letterSpacing: -1, lineHeight: 34 },
  stepsRemainingLabel: { color: C.text2, fontFamily: FT.med, fontSize: 10.5, textAlign: 'center', lineHeight: 14, marginTop: 2 },

  /* Generic card */
  card: {
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1,
    borderRadius: 14, padding: 16,
  },
  cardTitle:    { color: C.text, fontFamily: FT.xbold, fontSize: 16, letterSpacing: -0.2 },
  cardSubtitle: { color: C.text2, fontFamily: FT.med, fontSize: 12, marginTop: 2 },

  viewDetailsBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7,
    backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.25)', borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  viewDetailsBtnText: { color: C.purpleL, fontFamily: FT.bold, fontSize: 12 },

  /* Score action cards (2x2 grid) */
  scoreActionCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderColor: C.border, borderWidth: 1, borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  scoreActionIcon:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scoreActionPct:    { fontFamily: FT.xbold, fontSize: 18, marginTop: 6 },
  scoreActionTitle:  { color: C.text, fontFamily: FT.bold, fontSize: 11.5, textAlign: 'center' },
  scoreActionImpact: { fontFamily: FT.bold, fontSize: 10, textAlign: 'center' },

  viewAllBtn: {
    backgroundColor: C.purple, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 14,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  viewAllBtnText: { color: '#fff', fontFamily: FT.bold, fontSize: 13.5 },

  /* Career Journey */
  stepsLeftBadge: {
    backgroundColor: 'rgba(45,212,191,0.10)', borderColor: 'rgba(45,212,191,0.30)', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  stepsLeftText: { color: C.teal, fontFamily: FT.bold, fontSize: 12 },

  journeyRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 68 },
  journeyIndicator: { width: 38, alignItems: 'center', position: 'relative' },
  journeyLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  journeyLineActive: { backgroundColor: C.green },
  journeyDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border, zIndex: 2,
  },
  journeyCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1,
    borderRadius: 12, padding: 12, marginLeft: 6, marginBottom: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  journeyCardDone:   { backgroundColor: 'rgba(52,211,153,0.02)', borderColor: 'rgba(52,211,153,0.14)' },
  journeyCardActive: { backgroundColor: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.40)', borderWidth: 1.5 },
  journeyCardFuture: { opacity: 0.60 },

  journeyStep: { color: C.text2, fontSize: 10, fontFamily: FT.bold, letterSpacing: 0.6 },
  journeyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  journeyBadgeText: { fontSize: 10, fontFamily: FT.bold },
  journeyTitle: { color: C.text, fontFamily: FT.bold, fontSize: 14, marginTop: 2 },
  journeyDesc:  { color: C.text2, fontFamily: FT.med, fontSize: 12, marginTop: 2, lineHeight: 17 },

  gainPill: {
    backgroundColor: 'rgba(45,212,191,0.10)', borderColor: 'rgba(45,212,191,0.25)', borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7,
  },
  gainPillText: { color: C.teal, fontFamily: FT.bold, fontSize: 11 },

  /* Empty state */
  emptyState: {
    alignItems: 'center', padding: 28,
    backgroundColor: 'rgba(255,255,255,0.015)', borderRadius: 12,
    borderColor: C.border, borderWidth: 1,
  },
  emptyStateTitle: { color: C.text, fontFamily: FT.bold, fontSize: 15 },
  emptyStateDesc:  { color: C.text2, fontFamily: FT.med, fontSize: 12.5, textAlign: 'center', marginTop: 4, lineHeight: 18 },

  /* Footer */
  footer: { color: C.dim, fontFamily: FT.med, fontSize: 11.5, textAlign: 'center', marginTop: 4 },
});
