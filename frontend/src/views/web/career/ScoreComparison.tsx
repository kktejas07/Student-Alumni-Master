import React, { memo } from 'react';
import {View, Text} from "react-native";
import { TrendingUp } from 'lucide-react-native';

interface Props {
  current: number;
  projected: number | null;
  totalGain: number;
}

export const ScoreComparison = memo(function ScoreComparison({ current, projected, totalGain }: Props) {
  const hasResult = projected !== null && projected > 0;

  return (
    <View className="flex-row items-center gap-2 mb-1">
      <View className="flex-1 items-center p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <Text className="text-white/50 font-body-bold text-sm tracking-wider">CURRENT</Text>
        <Text className="text-white font-display-bold text-[26px] tracking-[-0.5px] mt-1">{current}%</Text>
      </View>

      <View className="items-center justify-center">
        <TrendingUp size={20} color={hasResult ? '#34D399' : 'rgba(238,240,255,0.3)'} />
      </View>

      <View className="flex-1 items-center p-2 rounded-xl border" style={{ backgroundColor: hasResult ? 'rgba(34,211,238,0.04)' : 'rgba(255,255,255,0.04)', borderColor: hasResult ? 'rgba(34,211,238,0.40)' : 'rgba(255,255,255,0.08)' }}>
        <Text className="font-body-bold text-sm tracking-wider" style={{ color: hasResult ? '#22D3EE' : 'rgba(238,240,255,0.5)' }}>PROJECTED</Text>
        <Text className="font-display-bold text-[26px] tracking-[-0.5px] mt-1" style={{ color: hasResult ? '#22D3EE' : 'white' }}>
          {hasResult ? `${projected}%` : '—'}
        </Text>
      </View>
    </View>
  );
});
