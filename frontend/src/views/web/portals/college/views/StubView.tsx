import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { CC } from '../tokens';

export function StubView({ title, note }: { title: string; note: string }) {
  return (
    <View className="flex-1 items-center justify-center p-[60px]">
      <View className="w-[60px] h-[60px] rounded-2xl bg-glass-soft border border-glass-border items-center justify-center mb-4">
        <Sparkles size={26} color={CC.accent} />
      </View>
      <Text className="text-text font-display-bold text-[22px] tracking-tight mb-2">{title}</Text>
      <Text className="text-muted font-body text-[13px] text-center max-w-[460px] leading-5">{note}</Text>
    </View>
  );
}
