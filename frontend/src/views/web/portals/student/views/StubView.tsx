import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Sparkles, ArrowRight } from '../iconShims';
import { useRouter } from 'expo-router';

export function StubView({ title, note, deepLink }: { title: string; note: string; deepLink?: string }) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center p-[60px]">
      <View className="w-15 h-15 rounded-card bg-glass-subtle border border-glass-medium items-center justify-center mb-4">
        <Sparkles size={26} color="#6366F1" />
      </View>
      <Text className="text-primary font-display text-2xl tracking-tight mb-2" style={{ fontFamily: 'Outfit_800ExtraBold' }}>{title}</Text>
      <Text className="text-muted text-base text-center max-w-[460px] leading-5" style={{ fontFamily: 'PlusJakartaSans_500Medium' }}>{note}</Text>
      {deepLink && (
        <Pressable onPress={() => router.push(deepLink as any)} className="flex-row items-center gap-2 bg-brand-purple rounded-md px-4 h-[38px] mt-[18px] hover:bg-indigo-light">
          <Text className="text-white font-semibold text-sm" style={{ fontFamily: 'Outfit_800ExtraBold' }}>Open standalone page</Text>
          <ArrowRight size={14} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}
