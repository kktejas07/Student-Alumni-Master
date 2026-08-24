import React, { memo } from 'react';
import {View, Text, Pressable, Platform} from "react-native";
import { CircleCheck as CheckCircle2, ChevronRight, Lock } from 'lucide-react-native';
import { COLORS } from '@/src/lib/designTokens';

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
  const DEFAULT_STEPS = [
    { id: 'step-1', title: 'Complete Profile', progress: '+5%', completed: true },
    { id: 'step-2', title: 'Build Your Resume', progress: '60%', completed: false },
    { id: 'step-3', title: 'Build Portfolio', progress: '0%', completed: false },
    { id: 'step-4', title: 'Network with Alumni', progress: 'Locked', completed: false },
    { id: 'step-5', title: 'Practice Interviews', progress: 'Locked', completed: false },
  ];

  const rawSteps = (milestones && milestones.length > 0) ? milestones : DEFAULT_STEPS;

  const sortedSteps = [...rawSteps].sort((a, b) => {
    if (a.completed && !b.completed) return -1;
    if (!a.completed && b.completed) return 1;
    return 0;
  });

  const displaySteps = sortedSteps.slice(0, 5);

  while (displaySteps.length < 5) {
    const nextDefault = DEFAULT_STEPS[displaySteps.length];
    if (nextDefault) displaySteps.push(nextDefault as any);
    else break;
  }

  const firstPendingIdx = displaySteps.findIndex(m => !m.completed);

  return (
    <View
      className="bg-[rgba(18,22,35,0.75)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5 gap-5 w-full"
      style={Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0,0,0,0.35)' } : undefined}
    >
      <View className="flex-row items-center justify-between flex-wrap gap-1">
        <Text className="text-white/45 font-body-bold text-lg tracking-wider uppercase">YOUR CAREER JOURNEY</Text>
        <View className="flex-row items-center gap-4">
          <Text className="font-body-semibold text-[11px] text-green-400">Completed ●</Text>
          <Text className="font-body-semibold text-[11px] text-indigo-400">Current Step ➔</Text>
          <Text className="font-body-semibold text-[11px] text-white/50">Next Step ➔</Text>
          <Text className="font-body-semibold text-[11px] text-white/30">Upcoming</Text>
        </View>
      </View>

      <View className="relative py-5">
        <View className="absolute left-[10%] right-[10%] top-[54px] h-0.5 bg-white/[0.12] z-0" />

        <View className="flex-row justify-between items-start z-[1]">
          {displaySteps.map((m, idx) => {
            const isCompleted = idx < (firstPendingIdx >= 0 ? firstPendingIdx : displaySteps.length);
            const isCurrent = idx === (firstPendingIdx >= 0 ? firstPendingIdx : displaySteps.length - 1);
            const isNext = idx === firstPendingIdx + 1;
            const isUpcoming = idx > firstPendingIdx + 1;

            const stepNum = idx + 1;
            const defaultStep = DEFAULT_STEPS[idx] || DEFAULT_STEPS[4];

            let statusLabel = 'Upcoming';
            let statusColor = COLORS.dim;
            let progressBadge = defaultStep.progress || 'Locked';

            if (isCompleted) {
              statusLabel = 'Completed';
              statusColor = COLORS.green;
              progressBadge = '+5%';
            } else if (isCurrent) {
              statusLabel = 'Current Step';
              statusColor = COLORS.purpleL;
              progressBadge = '60%';
            } else if (isNext) {
              statusLabel = 'Next Step';
              statusColor = COLORS.text2;
              progressBadge = '0%';
            }

            return (
              <Pressable
                key={`hstep-${m.id || idx}`}
                onPress={() => onSelectMilestone?.(m)}
                className="items-center flex-1 gap-2.5"
              >
                <Text className="font-body-bold text-[11px] mb-0.5" style={{ color: statusColor }}>{statusLabel}</Text>

                <View className="w-9 h-9 rounded-[18px] items-center justify-center border-2 elevation-3"
                  style={{
                    backgroundColor: isCompleted ? '#34D399' : isCurrent ? '#7C3AED' : isNext ? 'rgba(79, 70, 229, 0.20)' : 'rgba(255,255,255,0.06)',
                    borderColor: isCompleted ? '#34D399' : isCurrent ? '#818CF8' : isNext ? 'rgba(129, 140, 248, 0.40)' : 'rgba(255,255,255,0.12)',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={16} color="#FFF" />
                  ) : (
                    <Text className="font-body-bold text-sm" style={{ color: isCurrent ? '#FFF' : 'rgba(238,240,255,0.5)' }}>
                      {stepNum}
                    </Text>
                  )}
                </View>

                <Text className="text-white/50 font-body-semibold text-[13px] text-center max-w-[110px]" style={isCurrent ? { color: '#FFF', fontFamily: 'DMSans_700Bold' } : undefined} numberOfLines={2}>
                  {m.title || defaultStep.title}
                </Text>

                <Text className="font-body-bold text-xs" style={{ color: isCompleted ? '#34D399' : isCurrent ? '#818CF8' : 'rgba(238,240,255,0.3)' }}>
                  {progressBadge}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable onPress={onViewAll} className="flex-row items-center justify-end gap-1">
        <Text className="text-indigo-400 font-body-bold text-[13px]">View Complete Roadmap</Text>
        <ChevronRight size={14} color="#818CF8" />
      </Pressable>
    </View>
  );
});
