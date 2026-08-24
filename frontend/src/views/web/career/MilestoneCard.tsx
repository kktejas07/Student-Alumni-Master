import React, { memo } from 'react';
import {View, Text, Pressable, Platform} from "react-native";
import { ChevronRight, CircleCheck as CheckCircle2, Lock } from 'lucide-react-native';
import type { Milestone } from '@/src/viewmodels/hooks/useCareerAI';

interface Props {
  milestone: Milestone;
  isFirst: boolean;
  isActive: boolean;
  isFuture: boolean;
  isLast: boolean;
  showTopConnector: boolean;
  gain: number;
  onPress: () => void;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
}

export const MilestoneCard = memo(function MilestoneCard({
  milestone, isFirst, isActive, isFuture, isLast, showTopConnector,
  gain, onPress, icon: Icon, color,
}: Props) {
  const isCompleted = milestone.completed;

  return (
    <View className="flex-row items-stretch min-h-16">
      <View className="w-8 items-center">
        {showTopConnector && (
          <View className="w-0.5 flex-1 rounded-sm bg-white/[0.07]" style={isCompleted ? { backgroundColor: 'rgba(52,211,153,0.67)' } : undefined} />
        )}
        <View
          className="w-[26px] h-[26px] rounded-[13px] items-center justify-center border z-[2]"
          style={{
            backgroundColor: isCompleted ? '#34D399' : isActive ? 'rgba(79,70,229,0.22)' : isFuture ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.04)',
            borderColor: isCompleted ? '#34D399' : isActive ? '#818CF8' : isFuture ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)',
            borderWidth: isActive ? 2 : 1,
            opacity: isFuture ? 0.45 : 1,
            ...(Platform.OS === 'web' && isActive ? { boxShadow: '0 0 8px rgba(129,140,248,0.35)' } : {}),
          }}
        >
          {isCompleted
            ? <CheckCircle2 size={12} color="#fff" fill="#34D399" />
            : isFuture
              ? <Lock size={9} color="rgba(238,240,255,0.3)" />
              : <Icon size={10} color={isActive ? '#818CF8' : 'rgba(238,240,255,0.3)'} />
          }
        </View>
        {!isLast && (
          <View className="w-0.5 flex-1 rounded-sm bg-white/[0.07]" style={isCompleted ? { backgroundColor: 'rgba(52,211,153,0.67)' } : undefined} />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className="flex-1 flex-row items-center justify-between ml-1 mb-2 rounded-xl border overflow-hidden"
        style={({ pressed, hovered }: any) => ({
          backgroundColor: isCompleted ? 'rgba(52,211,153,0.03)' : isActive ? 'rgba(79,70,229,0.10)' : isFuture ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.025)',
          borderColor: isCompleted ? 'rgba(52,211,153,0.12)' : isActive ? 'rgba(79,70,229,0.32)' : isFuture ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.08)',
          opacity: isCompleted ? 0.65 : isFuture ? 0.52 : 1,
          ...(Platform.OS === 'web' ? { transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer' } : {}),
          ...(Platform.OS === 'web' && isActive ? { boxShadow: '0 2px 16px rgba(79,70,229,0.15)' } : {}),
          ...(pressed || hovered) && !isFuture ? {
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.15)',
            ...(Platform.OS === 'web' ? { transform: 'translateY(-1px)' } : {}),
          } : {},
        })}
      >
        {isActive && (
          <View
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-400 rounded-l-xl"
            style={Platform.OS === 'web' ? { boxShadow: '2px 0 8px rgba(129,140,248,0.40)' } : undefined}
          />
        )}

        <View className="flex-row items-center justify-between py-2 px-2 pl-4" style={{ paddingLeft: 16 }}>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5 mb-1">
              {isCompleted && (
                <View className="px-[7px] py-0.5 rounded-full bg-[rgba(52,211,153,0.12)]">
                  <Text className="text-green-400 font-body-bold text-xs tracking-wider">Completed</Text>
                </View>
              )}
              {isActive && (
                <View className="px-[7px] py-0.5 rounded-full bg-[rgba(129,140,248,0.14)]">
                  <Text className="text-indigo-400 font-body-bold text-xs tracking-wider">Next Action</Text>
                </View>
              )}
              {isFuture && (
                <View className="px-[7px] py-0.5 rounded-full bg-white/[0.04]">
                  <Text className="text-white/30 font-body-bold text-xs tracking-wider">Locked</Text>
                </View>
              )}
              <View className="px-1.5 py-0.5 rounded-full bg-[rgba(34,211,238,0.10)] border border-[rgba(34,211,238,0.22)] ml-auto">
                <Text className="text-cyan-400 font-body-bold text-xs tracking-wider">+{gain}%</Text>
              </View>
            </View>

            <Text
              className="text-white font-body-bold text-[13px] leading-[18px]"
              style={{
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                color: isFuture ? 'rgba(238,240,255,0.5)' : isCompleted ? 'rgba(238,240,255,0.5)' : 'white',
              }}
              numberOfLines={1}
            >
              {milestone.title}
            </Text>

            <Text
              className="text-white/50 font-body-semibold text-sm mt-0.5 leading-4"
              style={isFuture ? { color: 'rgba(238,240,255,0.3)' } : undefined}
              numberOfLines={2}
            >
              {milestone.description}
            </Text>
          </View>
          <ChevronRight size={13} color={isFuture ? 'rgba(238,240,255,0.3)' : 'rgba(238,240,255,0.5)'} />
        </View>
      </Pressable>
    </View>
  );
});
