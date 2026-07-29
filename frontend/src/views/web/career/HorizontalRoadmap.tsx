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
import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { CircleCheck as CheckCircle2, ChevronRight, Lock } from 'lucide-react-native';
import { COLORS, FONT_FAMILIES, FONT_SIZES, RADIUS, SPACING } from '@/src/lib/designTokens';

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
  // Take up to 5 steps for the horizontal display
  const displaySteps = milestones.slice(0, 5);

  // If fewer than 5, pad with default milestone items
  const DEFAULT_STEPS = [
    { id: 'step-1', title: 'Complete Profile', progress: '+5%', status: 'completed' },
    { id: 'step-2', title: 'Build Your Resume', progress: '60%', status: 'current' },
    { id: 'step-3', title: 'Build Portfolio', progress: '0%', status: 'next' },
    { id: 'step-4', title: 'Network with Alumni', progress: 'Locked', status: 'upcoming' },
    { id: 'step-5', title: 'Practice Interviews', progress: 'Locked', status: 'upcoming' },
  ];

  const firstPendingIdx = milestones.findIndex(m => !m.completed);

  return (
    <View style={s.card}>
      {/* Section Header */}
      <View style={s.headerRow}>
        <Text style={s.headerTitle}>YOUR CAREER JOURNEY</Text>
        <View style={s.subHeaderLegend}>
          <Text style={[s.legendItem, { color: COLORS.green }]}>Completed ●</Text>
          <Text style={[s.legendItem, { color: COLORS.purpleL }]}>Current Step ➔</Text>
          <Text style={[s.legendItem, { color: COLORS.text2 }]}>Next Step ➔</Text>
          <Text style={s.legendItem}>Upcoming</Text>
        </View>
      </View>

      {/* Horizontal Stepper Timeline */}
      <View style={s.stepperContainer}>
        {/* Connecting background line */}
        <View style={s.connectingLine} />

        <View style={s.stepsRow}>
          {displaySteps.map((m, idx) => {
            const isCompleted = m.completed;
            const isCurrent = idx === (firstPendingIdx >= 0 ? firstPendingIdx : displaySteps.length - 1);
            const isNext = idx === firstPendingIdx + 1;
            const isUpcoming = idx > firstPendingIdx + 1;

            const stepNum = idx + 1;
            const defaultStep = DEFAULT_STEPS[idx] || DEFAULT_STEPS[4];

            let statusLabel = 'Upcoming';
            let statusColor = COLORS.dim;
            let nodeBg = 'rgba(255,255,255,0.06)';
            let nodeBorder = 'rgba(255,255,255,0.12)';
            let progressBadge = defaultStep.progress;

            if (isCompleted) {
              statusLabel = 'Completed';
              statusColor = COLORS.green;
              nodeBg = COLORS.green;
              nodeBorder = COLORS.green;
              progressBadge = '+5%';
            } else if (isCurrent) {
              statusLabel = 'Current Step';
              statusColor = COLORS.purpleL;
              nodeBg = COLORS.purple;
              nodeBorder = COLORS.purpleL;
              progressBadge = '60%';
            } else if (isNext) {
              statusLabel = 'Next Step';
              statusColor = COLORS.text2;
              nodeBg = 'rgba(124, 58, 237, 0.20)';
              nodeBorder = 'rgba(167, 139, 250, 0.40)';
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
                    <Text style={[s.nodeNumber, { color: isCurrent ? '#FFF' : COLORS.text2 }]}>
                      {stepNum}
                    </Text>
                  )}
                </View>

                {/* Title */}
                <Text style={[s.stepTitle, isCurrent && s.stepTitleCurrent]} numberOfLines={2}>
                  {m.title || defaultStep.title}
                </Text>

                {/* Progress / Gain Badge */}
                <Text style={[s.progressBadge, { color: isCompleted ? COLORS.green : isCurrent ? COLORS.purpleL : COLORS.dim }]}>
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
        <ChevronRight size={14} color={COLORS.purpleL} />
      </Pressable>
    </View>
  );
});

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(18, 22, 35, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    gap: SPACING.lg,
    width: '100%',
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' } as any : {}),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  headerTitle: {
    color: 'rgba(238,240,255,0.45)',
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
  legendItem: {
    fontFamily: FONT_FAMILIES.med,
    fontSize: 11,
    color: COLORS.dim,
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    color: COLORS.text2,
    fontFamily: FONT_FAMILIES.med,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 110,
  },
  stepTitleCurrent: {
    color: '#FFF',
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
    color: COLORS.purpleL,
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 13,
  },
});
