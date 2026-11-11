/**
 * careerDerivations.ts
 *
 * Pure derivations over the /users/me/skill-intelligence payload, used by
 * app/career-ai.tsx. No UI, no React, no fallback numbers: when a value has
 * not been computed yet, the derivation reports 0, null, or undefined —
 * never an invented score.
 */

export interface ReadinessDerivation {
  readinessScore: number;
  readinessLevel: string;
  nextGoal: string;
  bandProgress: number;
}

export interface ReadinessScoreInfo {
  score: number;
  level: string;
  nextLevel: string | null;
  nextThreshold: number | null;
}

export interface RankedAction {
  rank: number;
  title: string;
  desc: string;
  gain: number;
  type: string;
}

export interface RecruiterView {
  /** 'Career Preparation' score; null when the source key is absent. */
  resume: number | null;
  /** 'Technical Excellence' score; null when the source key is absent. */
  portfolio: number | null;
  /** 'Professional Communication' score; null when the source key is absent. */
  communication: number | null;
  /** Readiness score; null when no skill data exists at all. */
  overall: number | null;
}

export interface Trend {
  text: string;
  positive: boolean;
}

export interface ExplanationFactor {
  label: string;
  earned: number;
  max: number;
  weightPct?: number;
  done?: boolean;
}

export interface Explanations {
  readiness: {
    current: number;
    target: number;
    missingPoints: number;
    factors: ExplanationFactor[];
  } | null;
  categories: Record<
    string,
    {
      currentScore: number;
      weightPct: number;
      missingPoints: number;
      factors: ExplanationFactor[];
    }
  > | null;
}

function finiteNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function roundedOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** 20-point readiness bands (matches the level labels shown across the app). */
export function getLevelForScore(score: number): string {
  const s = Number.isFinite(score) ? score : 0;
  if (s <= 20) return 'Explorer';
  if (s <= 40) return 'Builder';
  if (s <= 60) return 'Developing Professional';
  if (s <= 80) return 'Career Ready';
  return 'Industry Ready';
}

/**
 * Normalize the readiness block. `readiness_score` may be the service's
 * object shape ({score, level, next_level, next_threshold}) or a bare number.
 */
export function deriveReadiness(careerIntel: any): ReadinessDerivation {
  const rs = careerIntel?.readiness_score;
  const raw = typeof rs === 'object' && rs !== null ? Number(rs.score ?? 0) : Number(rs ?? 0);
  const score = Math.round(Number.isFinite(raw) ? raw : 0);
  const level = (typeof rs === 'object' && rs !== null && rs.level) || getLevelForScore(score);
  const nextLevel = typeof rs === 'object' && rs !== null ? rs.next_level || null : null;
  const nextScore =
    typeof rs === 'object' && rs !== null && rs.next_threshold != null ? Number(rs.next_threshold) : null;
  // Progress through the current 20-point band.
  const band = score >= 100 ? 100 : Math.round(((score % 20) / 20) * 100);
  return {
    readinessScore: score,
    readinessLevel: level,
    nextGoal:
      nextLevel && Number.isFinite(nextScore) ? `${nextLevel} (${nextScore}%)` : 'Industry Ready (100%)',
    bandProgress: band,
  };
}

/** Structured readiness block for the explain modal; null when not computed. */
export function deriveReadinessScoreInfo(careerIntel: any): ReadinessScoreInfo | null {
  const rs = careerIntel?.readiness_score;
  if (rs == null) return null;
  const raw = typeof rs === 'object' ? Number(rs.score ?? 0) : Number(rs);
  if (!Number.isFinite(raw)) return null;
  const score = Math.round(raw);
  return {
    score,
    level: (typeof rs === 'object' && rs.level) || getLevelForScore(score),
    nextLevel: typeof rs === 'object' ? rs.next_level || null : null,
    nextThreshold:
      typeof rs === 'object' && rs.next_threshold != null && Number.isFinite(Number(rs.next_threshold))
        ? Number(rs.next_threshold)
        : null,
  };
}

/** Potential (target) readiness — never below the current score, capped at 100. */
export function derivePotentialScore(careerIntel: any, readinessScore: number): number {
  const raw = Number(careerIntel?.potential_score);
  const base = Number.isFinite(raw) && raw > 0 ? raw : readinessScore;
  return Math.min(100, Math.max(readinessScore, Math.round(base)));
}

/** Fill every canonical category key with its rounded score; absent keys read 0. */
export function deriveSkillScores(
  rawSource: Record<string, number> | null | undefined,
  keys: readonly string[],
): Record<string, number> {
  const base: Record<string, unknown> = rawSource || {};
  return keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = Math.round(Number(base[key] ?? 0)) || 0;
    return acc;
  }, {});
}

/** Highest-gain actions from the intelligence service, capped at `max`. */
export function deriveRankedActions(careerIntel: any, max = 5): RankedAction[] {
  const list: unknown = careerIntel?.ranked_actions;
  if (!Array.isArray(list)) return [];
  const out: RankedAction[] = [];
  for (const a of list.slice(0, max)) {
    if (!a || typeof a !== 'object') continue;
    const item = a as Record<string, unknown>;
    out.push({
      rank: out.length + 1,
      title: String(item.title || 'Improve your profile'),
      desc: String(item.description || item.reason || ''),
      gain: Math.round(finiteNum(item.gain)),
      type: String(item.type || item.milestone_type || 'PROFILE').toUpperCase(),
    });
  }
  return out;
}

/**
 * Recruiter-view bars. Each bar reads the raw (unfilled) skill source so an
 * absent key reports null ("—" in the UI) instead of a fabricated 0%.
 * `overall` reads the live readiness score.
 */
export function deriveRecruiterView(
  rawSkillScores: Record<string, number> | null | undefined,
  readinessScore: number,
): RecruiterView {
  const src = rawSkillScores && Object.keys(rawSkillScores).length > 0 ? rawSkillScores : null;
  const pick = (key: string): number | null => (src ? roundedOrNull(src[key]) : null);
  return {
    resume: pick('Career Preparation'),
    portfolio: pick('Technical Excellence'),
    communication: pick('Professional Communication'),
    overall: src ? Math.round(finiteNum(readinessScore)) : null,
  };
}

/**
 * Trend badge for the readiness KPI — the 30-day projected score minus the
 * current one. null when the service has not returned 30d predictions, so
 * the UI shows no trend arrow instead of a hardcoded one.
 */
export function deriveTrend(careerIntel: any, readinessScore: number): Trend | null {
  // The service nests horizon scores under predictions.predictions; also accept a flat list.
  const p30 = careerIntel?.predictions?.predictions?.['30d'] ?? careerIntel?.predictions?.['30d'];
  if (!p30) return null;
  const score = Number(p30.score);
  if (!Number.isFinite(score)) return null;
  const delta = Math.round(score) - Math.round(finiteNum(readinessScore));
  if (delta > 0) return { text: `+${delta} pts in 30 days`, positive: true };
  if (delta < 0) return { text: `${delta} pts in 30 days`, positive: false };
  return { text: 'No change in 30 days', positive: true };
}

/** Normalize score_explanations for the explain modal; nulls when not computed. */
export function deriveExplanations(careerIntel: any): Explanations {
  const raw = careerIntel?.score_explanations;
  if (!raw || typeof raw !== 'object') return { readiness: null, categories: null };

  let readiness: Explanations['readiness'] = null;
  if (raw.readiness && typeof raw.readiness === 'object') {
    const factors: ExplanationFactor[] = (Array.isArray(raw.readiness.factors) ? raw.readiness.factors : []).map(
      (f: any) => ({
        label: String(f?.label ?? '—'),
        earned: finiteNum(f?.earned),
        max: finiteNum(f?.max),
        weightPct: f?.weight_pct != null ? finiteNum(f.weight_pct) : undefined,
        done: typeof f?.done === 'boolean' ? f.done : undefined,
      }),
    );
    readiness = {
      current: finiteNum(raw.readiness.current),
      target: finiteNum(raw.readiness.target),
      missingPoints: finiteNum(raw.readiness.missing_points),
      factors,
    };
  }

  let categories: Explanations['categories'] = null;
  if (raw.categories && typeof raw.categories === 'object') {
    const out: Explanations['categories'] = {};
    for (const [name, c] of Object.entries(raw.categories)) {
      if (!c || typeof c !== 'object') continue;
      const cat = c as Record<string, any>;
      out[name] = {
        currentScore: finiteNum(cat.current_score),
        weightPct: finiteNum(cat.weight_pct),
        missingPoints: finiteNum(cat.missing_points),
        factors: (Array.isArray(cat.factors) ? cat.factors : []).map((f: any) => ({
          label: String(f?.label ?? '—'),
          earned: finiteNum(f?.earned),
          max: finiteNum(f?.max),
          done: typeof f?.done === 'boolean' ? f.done : undefined,
        })),
      };
    }
    if (Object.keys(out).length > 0) categories = out;
  }

  return { readiness, categories };
}
