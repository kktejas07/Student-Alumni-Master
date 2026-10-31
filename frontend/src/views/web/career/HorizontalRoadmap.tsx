/**
 * HorizontalRoadmap.tsx
 *
 * Full-width horizontal stepper roadmap with 5 connected nodes matching Image 1 reference:
 *   Step 1: Completed (Green ✓) | Complete Profile | +5%
 *   Step 2: Current Step (Purple '2') | Build Your Resume | 60%
 *   Step 3: Next Step (Grey '3') | Build Portfolio | 0%
 *   Step 4: Upcoming (Grey '4') | Network with Alumni | Locked
 *   Step 5: Upcoming (Grey '5') | Practice Interviews | Locked
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { CircleCheck as CheckCircle2, ChevronRight, Circle } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';
import { useTheme } from '@/src/theme/ThemeContext';

interface MilestoneItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  milestone_type?: string;
}

interface Props {
  milestones: MilestoneItem[];
  targetRole?: string;
  onSelectMilestone?: (milestone: MilestoneItem) => void;
  onViewAll?: () => void;
}

export const HorizontalRoadmap = memo(function HorizontalRoadmap({
  milestones, targetRole = 'your goal', onSelectMilestone, onViewAll,
}: Props) {
  const { isDark } = useTheme();
  const s = useMemo(() => makeStyles(isDark), [isDark]);

  // Light-theme variants for the neon status colors (wash out on white)
  const green  = isDark ? COLORS.green   : '#059669';
  const purple = isDark ? COLORS.purple   : '#4F46E5';
  const purpleL = isDark ? COLORS.purpleL : '#4338CA';
  const textSub = isDark ? COLORS.textSub : 'rgba(15,23,42,0.85)';
  const text2   = isDark ? COLORS.text2   : 'rgba(15,23,42,0.8)';
  const dim     = isDark ? COLORS.dim     : 'rgba(15,23,42,0.5)';
  const nodeBgDefault     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const nodeBorderDefault = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.15)';

  // Standard 5-step milestone defaults
  const DEFAULT_STEPS = [
    { id: 'step-1', title: 'Complete Profile', progress: '+5%', completed: true },
    { id: 'step-2', title: 'Build Your Resume', progress: '60%', completed: false },
    { id: 'step-3', title: 'Build Portfolio', progress: '0%', completed: false },
    { id: 'step-4', title: 'Network with Alumni', progress: 'Locked', completed: false },
    { id: 'step-5', title: 'Practice Interviews', progress: 'Locked', completed: false },
  ];

  // Pre-process and order steps so completed steps appear first in linear progression
  const rawSteps = (milestones && milestones.length > 0) ? milestones : DEFAULT_STEPS;

  const sortedSteps = [...rawSteps].sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return 0;
  });

  const displaySteps = sortedSteps.slice(0, 5);

  // If fewer than 5 steps provided, fill up to 5 with DEFAULT_STEPS placeholders
  while (displaySteps.length < 5) {
    const nextDefault = DEFAULT_STEPS[displaySteps.length];
    if (nextDefault) displaySteps.push(nextDefault as any);
    else break;
  }

  const firstPendingIdx = displaySteps.findIndex(m => !m.completed);

  return (
    <View style={s.card}>
      {/* Section Header */}
      <View style={s.headerRow}>
        <Text style={s.headerTitle}>YOUR CAREER JOURNEY</Text>
        <View style={s.subHeaderLegend}>
          <View style={s.legendRow}>
            <Circle size={9} color={green} fill={green} />
            <Text style={[s.legendItem, { color: green }]}>Completed</Text>
          </View>
          <View style={s.legendRow}>
            <ChevronRight size={11} color={purpleL} />
            <Text style={[s.legendItem, { color: purpleL }]}>Current Step</Text>
          </View>
          <View style={s.legendRow}>
            <ChevronRight size={11} color={text2} />
            <Text style={[s.legendItem, { color: text2 }]}>Next Step</Text>
          </View>
          <Text style={s.legendItem}>Upcoming</Text>
        </View>
      </View>

      {/* Horizontal Stepper Timeline */}
      <View style={s.stepperContainer}>
        {/* Connecting background line */}
        <View style={s.connectingLine} />

        <View style={s.stepsRow}>
          {displaySteps.map((m, idx) => {
            const isCompleted = idx < (firstPendingIdx >= 0 ? firstPendingIdx : displaySteps.length);
            const isCurrent = idx === (firstPendingIdx >= 0 ? firstPendingIdx : displaySteps.length - 1);
            const isNext = idx === firstPendingIdx + 1;
            const isUpcoming = idx > firstPendingIdx + 1;

            const stepNum = idx + 1;
            const defaultStep = DEFAULT_STEPS[idx] || DEFAULT_STEPS[4];

            let statusLabel = 'Upcoming';
            let statusColor = dim;
            let nodeBg = nodeBgDefault;
            let nodeBorder = nodeBorderDefault;
            let progressBadge = defaultStep.progress || 'Locked';

            if (isCompleted) {
              statusLabel = 'Completed';
              statusColor = green;
              nodeBg = green;
              nodeBorder = green;
              progressBadge = '+5%';
            } else if (isCurrent) {
              statusLabel = 'Current Step';
              statusColor = purpleL;
              nodeBg = purple;
              nodeBorder = purpleL;
              progressBadge = '60%';
            } else if (isNext) {
              statusLabel = 'Next Step';
              statusColor = text2;
              nodeBg = isDark ? 'rgba(79, 70, 229, 0.20)' : 'rgba(79, 70, 229, 0.15)';
              nodeBorder = isDark ? 'rgba(129, 140, 248, 0.40)' : 'rgba(99, 102, 241, 0.35)';
              progressBadge = '0%';
            }

            return (
              <Pressable
                key={`hstep-${m.id || idx}`}
                onPress={() => onSelectMilestone?.(m)}
                style={s.stepItem}
              >
                {/* Status Indicator Label Top */}
                <Text style={[s.stepStatusLabel, { color: statusColor }]}>{statusLabel}</Text>

                {/* Circle Node */}
                <View style={[s.nodeCircle, { backgroundColor: nodeBg, borderColor: nodeBorder }]}>
                  {isCompleted ? (
                    <CheckCircle2 size={16} color="#FFF" />
                  ) : (
                    <Text style={[s.nodeNumber, { color: isCurrent ? '#FFF' : text2 }]}>
                      {stepNum}
                    </Text>
                  )}
                </View>

                {/* Title */}
                <Text style={[s.stepTitle, isCurrent && s.stepTitleCurrent]} numberOfLines={2}>
                  {m.title || defaultStep.title}
                </Text>

                {/* Progress / Gain Badge */}
                <Text style={[s.progressBadge, { color: isCompleted ? green : isCurrent ? purpleL : dim }]}>
                  {progressBadge}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Bottom Action Link */}
      <Pressable onPress={onViewAll} style={s.bottomLinkRow}>
        <Text style={s.bottomLinkText}>View Complete Roadmap</Text>
        <ChevronRight size={14} color={purpleL} />
      </Pressable>
    </View>
  );
});

const makeStyles = (dark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: dark ? '#0A0A2A' : '#FFFFFF',
    borderColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15,23,42,0.08)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.lg,
    width: '100%',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 20px rgba(15,23,42,0.08)' } as any)
      : {}),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  headerTitle: {
    color: dark ? 'rgba(238,240,255,0.45)' : 'rgba(15,23,42,0.45)',
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 18,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as any,
  },
  subHeaderLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendItem: {
    fontFamily: FONT_FAMILIES.med,
    fontSize: 11,
    color: dark ? COLORS.dim : 'rgba(15,23,42,0.5)',
  },
  stepperContainer: {
    position: 'relative',
    paddingVertical: SPACING.xl,
  },
  connectingLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: 54,
    height: 2,
    backgroundColor: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.15)',
    zIndex: 0,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  stepStatusLabel: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 11,
    marginBottom: 2,
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 3,
  },
  nodeNumber: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 14,
  },
  stepTitle: {
    color: dark ? COLORS.text2 : 'rgba(15,23,42,0.8)',
    fontFamily: FONT_FAMILIES.med,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 110,
  },
  stepTitleCurrent: {
    color: dark ? '#FFF' : '#0F172A',
    fontFamily: FONT_FAMILIES.bold,
  },
  progressBadge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 12,
  },
  bottomLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  bottomLinkText: {
    color: dark ? COLORS.purpleL : '#4338CA',
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 13,
  },
});
