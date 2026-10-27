/**
 * ExplainModal.tsx
 *
 * Readiness / Skills explanation modal for the Career AI page. Renders the
 * backend's `score_explanations` (one line per category) plus the readiness
 * score block, and the ranked action that moves the score the most.
 * Shows an empty state when no explanations have been computed yet.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, StyleSheet, Platform } from 'react-native';
import { X, Target, Zap } from 'lucide-react-native';
import {
  deriveExplanations,
  deriveReadiness,
  deriveReadinessScoreInfo,
  deriveRankedActions,
} from '@/src/lib/careerDerivations';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING, WEB_TRANSITIONS } from '@/src/lib/designTokens';

type Tab = 'readiness' | 'skills';

interface Props {
  visible: boolean;
  onClose: () => void;
  careerIntel: any;
  initialTab?: Tab;
}

export const ExplainModal: React.FC<Props> = ({ visible, onClose, careerIntel, initialTab = 'readiness' }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    if (visible) setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const readiness = useMemo(() => deriveReadiness(careerIntel), [careerIntel]);
  const readinessInfo = useMemo(() => deriveReadinessScoreInfo(careerIntel), [careerIntel]);
  const explanations = useMemo(() => deriveExplanations(careerIntel), [careerIntel]);
  const topAction = useMemo(() => deriveRankedActions(careerIntel, 1)[0], [careerIntel]);

  const categories = useMemo(
    () =>
      Object.entries(explanations.categories || {})
        .map(([name, c]) => ({ name, ...c }))
        .sort((a, b) => b.missingPoints - a.missingPoints),
    [explanations],
  );

  const hasContent =
    (explanations.readiness && explanations.readiness.factors.length > 0) ||
    (explanations.categories && Object.keys(explanations.categories).length > 0) ||
    readinessInfo !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable
          style={s.ripple}
          accessibilityRole="button"
          accessibilityLabel="Close explanation"
          onPress={onClose}
        />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Score Explanation</Text>
              <Text style={s.subtitle}>How your scores are calculated</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={s.close}
              onPress={onClose}
            >
              <X size={16} color={COLORS.dim} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={s.tabs}>
            <Pressable
              accessibilityRole="button"
              style={[s.tab, tab === 'readiness' && s.tabActive]}
              onPress={() => setTab('readiness')}
            >
              <Text style={[s.tabLabel, tab === 'readiness' && s.tabLabelActive]}>Readiness</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[s.tab, tab === 'skills' && s.tabActive]}
              onPress={() => setTab('skills')}
            >
              <Text style={[s.tabLabel, tab === 'skills' && s.tabLabelActive]}>Skills</Text>
            </Pressable>
          </View>

          {!hasContent ? (
            <View style={s.empty}>
              <Target size={22} color={COLORS.dim} />
              <Text style={s.emptyTitle}>No explanation yet</Text>
              <Text style={s.emptyBody}>
                Explanations appear after your first readiness score is calculated.
              </Text>
            </View>
          ) : (
            <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
              {tab === 'readiness' ? (
                <ReadinessTab
                  readiness={readiness}
                  info={readinessInfo}
                  explanations={explanations}
                  topAction={topAction}
                />
              ) : (
                <SkillsTab categories={categories} topAction={topAction} />
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

/* ── Readiness tab ─────────────────────────────────────────────────────── */

interface ReadinessTabProps {
  readiness: ReturnType<typeof deriveReadiness>;
  info: ReturnType<typeof deriveReadinessScoreInfo>;
  explanations: ReturnType<typeof deriveExplanations>;
  topAction: ReturnType<typeof deriveRankedActions>[0];
}

const ReadinessTab: React.FC<ReadinessTabProps> = ({ readiness, info, explanations, topAction }) => {
  const factors = explanations.readiness?.factors || [];
  return (
    <View>
      <View style={s.scoreRow}>
        <View style={s.scoreBox}>
          <Text style={s.scoreValue}>{info ? info.score : readiness.readinessScore}%</Text>
          <Text style={s.scoreLevel}>{info ? info.level : readiness.readinessLevel}</Text>
        </View>
        <View>
          <Text style={s.metaLabel}>Next level</Text>
          <Text style={s.metaValue}>
            {info?.nextLevel
              ? `${info.nextLevel} at ${info.nextThreshold ?? '—'}%`
              : 'Industry Ready at 100%'}
          </Text>
          <Text style={[s.metaLabel, { marginTop: SPACING.xs }]}>Within current band</Text>
          <Text style={s.metaValue}>{readiness.bandProgress}%</Text>
        </View>
      </View>

      {factors.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>What's driving your readiness score</Text>
          {factors.map((f, i) => (
            <View key={i} style={s.factorRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.factorLabel}>{f.label}</Text>
                {f.weightPct != null && (
                  <Text style={s.factorWeight}>{f.weightPct}% of score</Text>
                )}
              </View>
              <Text style={s.factorEarned}>
                {Math.round(f.earned)} / {Math.round(f.max)} pts
              </Text>
            </View>
          ))}
        </View>
      )}

      <TopAction action={topAction} />
    </View>
  );
};

/* ── Skills tab ────────────────────────────────────────────────────────── */

interface SkillsTabProps {
  categories: Array<{ name: string; currentScore: number; weightPct: number; missingPoints: number }>;
  topAction: ReadinessTabProps['topAction'];
}

const SkillsTab: React.FC<SkillsTabProps> = ({ categories, topAction }) => (
  <View>
    {categories.length === 0 ? (
      <View style={s.empty}>
        <Target size={22} color={COLORS.dim} />
        <Text style={s.emptyTitle}>No skill breakdown yet</Text>
        <Text style={s.emptyBody}>
          Skill explanations appear after your first readiness score is calculated.
        </Text>
      </View>
    ) : (
      <View style={s.section}>
        {categories.map((c) => (
          <View key={c.name} style={s.categoryRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.factorLabel}>{c.name}</Text>
              <Text style={s.factorWeight}>
                {c.currentScore}% · {c.weightPct}% weight
              </Text>
            </View>
            <Text style={[s.factorEarned, { color: c.missingPoints > 0 ? COLORS.red : COLORS.green }]}>
              {c.missingPoints > 0 ? `-${c.missingPoints} pts` : 'Maxed'}
            </Text>
          </View>
        ))}
      </View>
    )}
    <TopAction action={topAction} />
  </View>
);

/* ── Top ranked action ─────────────────────────────────────────────────── */

const TopAction: React.FC<{ action: ReadinessTabProps['topAction'] }> = ({ action }) =>
  action ? (
    <View style={s.actionCard}>
      <View style={s.actionHeader}>
        <Zap size={13} color={COLORS.purpleL} />
        <Text style={s.actionTitle}>Biggest next move</Text>
        {action.gain > 0 && <Text style={s.actionGain}>+{action.gain} pts</Text>}
      </View>
      <Text style={s.actionName}>{action.title}</Text>
      {action.desc ? <Text style={s.actionDesc}>{action.desc}</Text> : null}
    </View>
  ) : null;

/* ── Styles ────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.72)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  // Invisible full-screen tap catcher (sheet blocks its own area).
  ripple: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  sheet: {
    backgroundColor: '#121526',
    borderColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderRadius: RADIUS.modal ?? 16,
    maxHeight: '80%',
    overflow: 'hidden',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
  },
  title: { color: COLORS.text, fontFamily: FONT_FAMILIES.xbold, fontSize: 16, letterSpacing: -0.3 },
  subtitle: { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, marginTop: 2 },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: WEB_TRANSITIONS.all200 } : {}),
  },

  tabs: { flexDirection: 'row', gap: SPACING.xs, padding: SPACING.md, paddingBottom: 0 },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.btn,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: WEB_TRANSITIONS.all200 } : {}),
  },
  tabActive: { backgroundColor: COLORS.purpleL + '1F', borderColor: COLORS.purpleL + '50' },
  tabLabel: { color: COLORS.text2, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },
  tabLabelActive: { color: COLORS.text },

  body: { padding: SPACING.md },

  empty: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.xs },
  emptyTitle: { color: COLORS.text, fontFamily: FONT_FAMILIES.bold, fontSize: 14 },
  emptyBody: { color: COLORS.dim, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, textAlign: 'center', maxWidth: 260 },

  scoreRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: 'rgba(167,139,250,0.07)',
    borderColor: 'rgba(167,139,250,0.2)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  scoreBox: { alignItems: 'center', minWidth: 84 },
  scoreValue: { color: COLORS.purpleL, fontFamily: FONT_FAMILIES.xbold, fontSize: 28, letterSpacing: -0.5 },
  scoreLevel: { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, marginTop: 2 },
  metaLabel: { color: COLORS.dim, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.xs },
  metaValue: { color: COLORS.text, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.md },

  section: { marginTop: SPACING.md },
  sectionTitle: {
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },

  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  factorLabel: { color: COLORS.text, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },
  factorWeight: { color: COLORS.dim, fontFamily: FONT_FAMILIES.med, fontSize: 11, marginTop: 1 },
  factorEarned: { color: COLORS.text, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.sm },

  actionCard: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(52,211,153,0.06)',
    borderColor: 'rgba(52,211,153,0.22)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  actionTitle: { flex: 1, color: COLORS.green, fontFamily: FONT_FAMILIES.bold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  actionGain: { color: COLORS.green, fontFamily: FONT_FAMILIES.xbold, fontSize: FONT_SIZES.md },
  actionName: { color: COLORS.text, fontFamily: FONT_FAMILIES.bold, fontSize: FONT_SIZES.md, marginTop: SPACING.xs },
  actionDesc: { color: COLORS.text2, fontFamily: FONT_FAMILIES.med, fontSize: FONT_SIZES.sm, marginTop: 3 },
});
