import React, { memo } from 'react';
import {Platform, Text, View} from "react-native";
import { Sparkles } from 'lucide-react-native';

interface Props {
  text: string;
}

export const AIInsightBubble = memo(function AIInsightBubble({ text }: Props) {
  return (
    <View
      className="flex-row items-stretch bg-[rgba(67,56,202,0.08)] border border-[rgba(129,140,248,0.22)] rounded-xl overflow-hidden"
      style={Platform.OS === 'web' ? { transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 0 12px rgba(129, 140, 248, 0.12)' } : undefined}
    >
      <View className="w-[3px] bg-indigo-400 opacity-[0.9]" />

      <View className="flex-1 p-4 gap-2">
        <View className="flex-row items-center justify-between">
          <View className="w-7 h-7 rounded-lg bg-indigo-400/[0.18] border border-indigo-400/[0.25] items-center justify-center" style={Platform.OS === 'web' ? { boxShadow: '0 0 10px rgba(129,140,248,0.25)' } : undefined}>
            <Sparkles size={12} color="#818CF8" />
          </View>
          <View className="px-1 py-0.5 rounded-full bg-indigo-400/[0.12] border border-indigo-400/[0.22]">
            <Text className="text-indigo-400 font-body-bold text-xs tracking-widest">AI</Text>
          </View>
        </View>

        <Text className="text-white/50 font-body-semibold text-[13px] leading-[19px] flex-1">{text}</Text>
      </View>
    </View>
  );
});
