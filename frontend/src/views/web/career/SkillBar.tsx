import React, { memo } from 'react';
import {View, Text} from "react-native";

interface Props {
  label: string;
  score: number;
  baseColor: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  status?: string;
}

export const SkillBar = memo(function SkillBar({ label, score, baseColor, icon: Icon, status }: Props) {
  const clampedScore = Math.min(100, Math.max(0, Number(score) || 0));
  const statusColor = clampedScore >= 70 ? '#34D399' : clampedScore >= 40 ? '#F59E0B' : '#F87171';
  const statusLabel = status || (clampedScore >= 70 ? 'Strong' : clampedScore >= 40 ? 'Developing' : 'Needs Work');

  return (
    <View className="flex-row items-center gap-4 py-1">
      <View className="flex-row items-center gap-2.5 w-[190px]">
        <View className="w-7 h-7 rounded-lg items-center justify-center border border-white/10 shrink-0" style={{ backgroundColor: baseColor + '1F', borderColor: baseColor + '35' }}>
          <Icon size={14} color={baseColor} />
        </View>
        <Text className="text-white/50 font-body-semibold text-xs flex-1" style={{ color: baseColor }} numberOfLines={1}>{label}</Text>
      </View>

      <View className="flex-1">
        <View className="h-1.5 rounded-[3px] bg-white/[0.06] overflow-hidden">
          <View className="h-full rounded-[3px]" style={{ width: `${clampedScore}%` as any, backgroundColor: baseColor }} />
        </View>
      </View>

      <Text className="font-body-bold text-xs w-9 text-right text-white">{clampedScore}%</Text>

      <View className="px-1.5 py-0.5 rounded-full border min-w-[60px] items-center" style={{ backgroundColor: statusColor + '18', borderColor: statusColor + '35' }}>
        <Text className="font-body-bold text-[10px] tracking-wider" style={{ color: statusColor }}>{statusLabel}</Text>
      </View>
    </View>
  );
});
