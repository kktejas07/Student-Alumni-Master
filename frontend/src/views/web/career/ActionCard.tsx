import React, { memo } from 'react';
import {View, Text, Pressable, Platform} from "react-native";
import { ChevronRight, Clock } from 'lucide-react-native';
import { COLORS } from '@/src/lib/designTokens';

interface Props {
  rank: number;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  title: string;
  difficultyLabel: string;
  difficultyColor: string;
  timeEstimate: string;
  gain: number;
  onPress: () => void;
}

export const ActionCard = memo(function ActionCard({
  rank, icon: Icon, color, title, difficultyLabel, difficultyColor,
  timeEstimate, gain, onPress,
}: Props) {
  const isTopAction = rank === 1;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-2 px-2 py-3.5 rounded-xl border"
      style={({ pressed, hovered }: any) => ({
        backgroundColor: isTopAction ? 'rgba(79,70,229,0.07)' : 'rgba(255,255,255,0.03)',
        borderColor: isTopAction ? 'rgba(79,70,229,0.28)' : 'rgba(255,255,255,0.08)',
        ...(Platform.OS === 'web' ? { transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer' } : {}),
        ...(Platform.OS === 'web' && isTopAction ? { boxShadow: '0 0 0 1px rgba(79,70,229,0.18) inset' } : {}),
        ...(pressed || hovered) ? {
          backgroundColor: COLORS.cardHover,
          borderColor: COLORS.borderMed,
          ...(Platform.OS === 'web' ? { transform: 'translateY(-1px)' } : {}),
        } : {},
      })}
    >
      <View className="w-6 h-6 rounded-sm items-center justify-center" style={{ backgroundColor: isTopAction ? 'rgba(79,70,229,0.20)' : 'rgba(255,255,255,0.06)' }}>
        <Text className="font-body-bold text-sm" style={{ color: isTopAction ? '#818CF8' : 'rgba(238,240,255,0.5)' }}>{rank}</Text>
      </View>

      <View className="w-9 h-9 rounded-lg items-center justify-center border" style={{ backgroundColor: color + '20', borderColor: color + '40' }}>
        <Icon size={16} color={color} />
      </View>

      <View className="flex-1 min-w-0">
        <Text className="text-white font-body-bold text-base leading-5" numberOfLines={1}>{title}</Text>
        <View className="flex-row flex-wrap items-center gap-1 mt-1">
          <View className="px-1 py-[3px] rounded-lg bg-white/[0.05] border" style={{ borderColor: difficultyColor + '40' }}>
            <Text className="font-body-bold text-xs tracking-wider" style={{ color: difficultyColor }}>{difficultyLabel}</Text>
          </View>
          <View className="flex-row items-center gap-[3px]">
            <Clock size={9} color="rgba(238,240,255,0.5)" />
            <Text className="text-white/50 font-body-semibold text-xs">{timeEstimate}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-0.5">
        <Text className="font-display-bold text-base tracking-[-0.3px]" style={{ color }}>+{gain}%</Text>
        <ChevronRight size={13} color="rgba(238,240,255,0.3)" />
      </View>
    </Pressable>
  );
});
