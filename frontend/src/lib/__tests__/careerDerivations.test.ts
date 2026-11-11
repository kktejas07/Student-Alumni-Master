import {
  deriveReadiness,
  derivePotentialScore,
  deriveSkillScores,
  deriveRankedActions,
  deriveRecruiterView,
  deriveTrend,
  deriveExplanations,
  deriveReadinessScoreInfo,
  getLevelForScore,
} from '../careerDerivations';

const CANON = [
  'Technical Excellence',
  'Professional Communication',
  'Leadership & Collaboration',
  'Career Preparation',
  'Personal Brand',
  'Industry Presence',
];

// Payload shaped exactly like /users/me/skill-intelligence.
const realPayload = {
  readiness_score: { score: 57, level: 'Developing Professional', next_level: 'Career Ready', next_threshold: 80 },
  potential_score: 84,
  skill_scores: {
    'Technical Excellence': 72,
    'Professional Communication': 48,
    'Leadership & Collaboration': 31,
    'Career Preparation': 64,
    'Personal Brand': 22,
    'Industry Presence': 15,
  },
  ranked_actions: [
    { type: 'RESUME', title: 'Polish your resume', description: 'Add measurable outcomes', gain: 9 },
    { type: 'PROJECT', title: 'Ship one project', description: 'Demo-day ready', gain: 7 },
    { type: 'LINKEDIN', title: 'Upload LinkedIn profile', reason: 'Visibility', gain: 4 },
    { type: 'MOCK_INTERVIEW', title: 'Practice a mock interview', gain: 3 },
    { type: 'CERTIFICATION', title: 'Earn a certification', gain: 2 },
    { type: 'EDUCATION', title: 'Add coursework', gain: 1 },
  ],
  predictions: {
    current: 57,
    predictions: {
      '7d': { score: 62, gain: 5, actions: 2 },
      '30d': { score: 74, gain: 17, actions: 8 },
      '90d': { score: 86, gain: 29, actions: 15 },
    },
  },
  score_explanations: {
    readiness: {
      current: 57,
      target: 100,
      missing_points: 43,
      factors: [
        { label: 'Technical Excellence', earned: 18, weight_pct: 25, max: 25, score_pct: 72 },
        { label: 'Career Preparation', earned: 16, weight_pct: 25, max: 25, score_pct: 64 },
      ],
    },
    categories: {
      'Technical Excellence': {
        current_score: 72,
        weight_pct: 25,
        missing_points: 28,
        factors: [
          { label: 'Skills Matching', earned: 20, max: 35, done: true },
          { label: 'Projects Built', earned: 15, max: 15, done: true },
        ],
      },
    },
  },
};

describe('careerDerivations', () => {
  describe('deriveReadiness (real-shaped payload)', () => {
    test('maps score, level, next goal and band progress', () => {
      const d = deriveReadiness(realPayload);
      expect(d.readinessScore).toBe(57);
      expect(d.readinessLevel).toBe('Developing Professional');
      expect(d.nextGoal).toBe('Career Ready (80%)');
      expect(d.bandProgress).toBe(85); // 57 % 20 = 17, 17/20
    });

    test('tolerates a bare-number readiness_score', () => {
      const d = deriveReadiness({ readiness_score: 42 });
      expect(d.readinessScore).toBe(42);
      expect(d.readinessLevel).toBe('Developing Professional'); // 41–60 band
      expect(d.nextGoal).toBe('Industry Ready (100%)');
      expect(d.bandProgress).toBe(10); // (42 % 20) / 20
    });
  });

  describe('empty / missing payload — no fabricated numbers', () => {
    test('undefined payload yields 0 score and no NaN', () => {
      const d = deriveReadiness(undefined);
      expect(d.readinessScore).toBe(0);
      expect(d.readinessLevel).toBe('Explorer');
      expect(d.nextGoal).toBe('Industry Ready (100%)');
      expect(d.bandProgress).toBe(0);
      expect(Number.isNaN(d.bandProgress)).toBe(false);
    });

    test('skill scores: absent keys read 0, no fallback numbers', () => {
      const scores = deriveSkillScores({}, CANON);
      expect(scores).toEqual(
        CANON.reduce<Record<string, number>>((acc, k) => {
          acc[k] = 0;
          return acc;
        }, {}),
      );
    });

    test('recruiter view with no data: every bar is null (—), no zeros', () => {
      const rv = deriveRecruiterView(null, 0);
      expect(rv.resume).toBeNull();
      expect(rv.portfolio).toBeNull();
      expect(rv.communication).toBeNull();
      expect(rv.overall).toBeNull();
    });

    test('trend is null when predictions are absent', () => {
      expect(deriveTrend(realPayload, 0)).not.toBeNull();
      expect(deriveTrend({ predictions: {} }, 0)).toBeNull();
      expect(deriveTrend({}, 0)).toBeNull();
      expect(deriveTrend(undefined, 0)).toBeNull();
    });

    test('ranked actions: no list → empty array', () => {
      expect(deriveRankedActions(undefined)).toEqual([]);
      expect(deriveRankedActions({ ranked_actions: 'nope' })).toEqual([]);
    });

    test('explanations: missing block → nulls, not empty objects', () => {
      const e = deriveExplanations({});
      expect(e.readiness).toBeNull();
      expect(e.categories).toBeNull();
      expect(deriveReadinessScoreInfo({})).toBeNull();
    });
  });

  describe('recruiter-view mapping', () => {
    test('maps categories to bars: Resume←Career Preparation, Portfolio←Technical Excellence', () => {
      const rv = deriveRecruiterView(
        {
          'Career Preparation': 64.4,
          'Technical Excellence': 71.6,
          'Professional Communication': 47.9,
        },
        57,
      );
      expect(rv.resume).toBe(64);
      expect(rv.portfolio).toBe(72);
      expect(rv.communication).toBe(48);
      expect(rv.overall).toBe(57);
    });

    test('absent category → null bar, others still mapped', () => {
      const rv = deriveRecruiterView({ 'Technical Excellence': 50 }, 30);
      expect(rv.portfolio).toBe(50);
      expect(rv.resume).toBeNull();
      expect(rv.communication).toBeNull();
      expect(rv.overall).toBe(30);
    });

    test('empty skill source → all null even with a readiness score', () => {
      const rv = deriveRecruiterView({}, 70);
      expect(rv).toEqual({ resume: null, portfolio: null, communication: null, overall: null });
    });
  });

  describe('trends from predictions', () => {
    test('30d above current → positive trend text', () => {
      const t = deriveTrend(realPayload, 57);
      expect(t).toEqual({ text: '+17 pts in 30 days', positive: true });
    });

    test('30d equal to current → flat', () => {
      const t = deriveTrend({ predictions: { '30d': { score: 57 } } }, 57);
      expect(t).toEqual({ text: 'No change in 30 days', positive: true });
    });

    test('30d below current → negative trend', () => {
      const t = deriveTrend({ predictions: { '30d': { score: 41 } } }, 57);
      expect(t).toEqual({ text: '-16 pts in 30 days', positive: false });
    });

    test('non-numeric 30d score → null', () => {
      expect(deriveTrend({ predictions: { '30d': { score: 'soon' } } }, 10)).toBeNull();
    });
  });

  describe('potential, skill scores, ranked actions', () => {
    test('potential score is never below current and capped at 100', () => {
      expect(derivePotentialScore({ potential_score: 84 }, 57)).toBe(84);
      expect(derivePotentialScore({ potential_score: 20 }, 57)).toBe(57);
      expect(derivePotentialScore({ potential_score: 140 }, 57)).toBe(100);
      expect(derivePotentialScore({}, 57)).toBe(57);
    });

    test('skill scores round the payload values', () => {
      const scores = deriveSkillScores(
        { 'Technical Excellence': 71.6, 'Personal Brand': 22.2 } as Record<string, number>,
        CANON,
      );
      expect(scores['Technical Excellence']).toBe(72);
      expect(scores['Personal Brand']).toBe(22);
      expect(scores['Industry Presence']).toBe(0);
    });

    test('ranked actions: capped, gain rounded, reason falls back into desc', () => {
      const actions = deriveRankedActions(realPayload);
      expect(actions).toHaveLength(5);
      expect(actions[0]).toEqual({
        rank: 1,
        title: 'Polish your resume',
        desc: 'Add measurable outcomes',
        gain: 9,
        type: 'RESUME',
      });
      expect(actions[2].desc).toBe('Visibility');
      expect(deriveRankedActions(realPayload, 2)).toHaveLength(2);
    });

    test('level bands', () => {
      expect(getLevelForScore(0)).toBe('Explorer');
      expect(getLevelForScore(20)).toBe('Explorer');
      expect(getLevelForScore(21)).toBe('Builder');
      expect(getLevelForScore(60)).toBe('Developing Professional');
      expect(getLevelForScore(81)).toBe('Industry Ready');
    });

    test('explanations normalize the real payload', () => {
      const e = deriveExplanations(realPayload);
      expect(e.readiness?.current).toBe(57);
      expect(e.readiness?.factors).toHaveLength(2);
      expect(e.categories?.['Technical Excellence']?.factors[0]).toEqual({
        label: 'Skills Matching',
        earned: 20,
        max: 35,
        done: true,
      });
    });
  });
});
