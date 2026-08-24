import React, { memo } from 'react';
import {View, Text, Pressable, Platform} from "react-native";
import { ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/src/lib/designTokens';

interface Props {
  num: number;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  title: string;
  description: string;
  gain: number;
  onPress: () => void;
}

export const WeeklyTaskCard = memo(function WeeklyTaskCard({
  num, icon: Icon, color, title, description, gain, onPress,
}: Props) {
  const isTop = num === 1;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-1 px-2 py-3 rounded-xl border"
      style={({ pressed, hovered }: any) => ({
        backgroundColor: isTop ? 'rgba(79,70,229,0.05)' : 'rgba(255,255,255,0.03)',
        borderColor: isTop ? 'rgba(79,70,229,0.22)' : 'rgba(255,255,255,0.08)',
        ...(Platform.OS === 'web' ? { transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer' } : {}),
        ...(pressed || hovered) ? {
          backgroundColor: COLORS.cardHover,
          borderColor: COLORS.borderMed,
          ...(Platform.OS === 'web' ? { transform: 'translateY(-1px)' } : {}),
        } : {},
      })}
    >
      <View className="w-[26px] h-[26px] rounded-lg items-center justify-center shrink-0" style={{ backgroundColor: isTop ? 'rgba(79,70,229,0.22)' : 'rgba(255,255,255,0.06)' }}>
        <Text className="font-body-bold text-sm" style={{ color: isTop ? '#818CF8' : 'rgba(238,240,255,0.5)' }}>{num}</Text>
      </View>

      <View className="w-8 h-8 rounded-lg items-center justify-center border shrink-0" style={{ backgroundColor: color + '18', borderColor: color + '30' }}>
        <Icon size={15} color={color} />
      </View>

      <View className="flex-1 min-w-0">
        <Text className="text-white font-body-bold text-base leading-[19px]" numberOfLines={1}>{title}</Text>
        <Text className="text-white/50 font-body-semibold text-sm mt-0.5 leading-4" numberOfLines={1}>{description}</Text>
      </View>

      <View className="px-2 py-1 rounded-full bg-[rgba(34,211,238,0.10)] border border-[rgba(34,211,238,0.22)] shrink-0">
        <Text className="text-cyan-400 font-body-bold text-xs tracking-wider">+{gain}%</Text>
      </View>

      <ChevronRight size={13} color="rgba(238,240,255,0.3)" />
    </Pressable>
  );
});
