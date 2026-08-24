import React, { useEffect, useRef, memo } from 'react';
import {Platform, View, Animated} from "react-native";

const SkeletonBlock = memo(function SkeletonBlock({
  width, height, radius = 8, style,
}: {
  width?: number | string;
  height: number;
  radius?: number;
  style?: any;
}) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      className="bg-white/[0.07]"
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: radius,
          opacity: anim,
        },
        style,
      ]}
    />
  );
});

export const HeroSkeleton = memo(function HeroSkeleton() {
  return (
    <View className="flex-row items-start gap-2 bg-[rgba(18,22,35,0.75)] border border-white/[0.08] rounded-xl p-5 overflow-hidden">
      <View className="flex-1 gap-2">
        <SkeletonBlock height={10} width={80} />
        <SkeletonBlock height={28} width="70%" radius={8} />
        <SkeletonBlock height={14} width="40%" />
        <View className="flex-row gap-1 mt-1">
          <SkeletonBlock height={10} width={80} />
          <SkeletonBlock height={10} width={80} />
          <SkeletonBlock height={10} width={80} />
        </View>
        <SkeletonBlock height={6} radius={3} style={{ marginTop: 16 }} />
      </View>
      <SkeletonBlock height={88} width={88} radius={44} />
    </View>
  );
});

export const KpiStripSkeleton = memo(function KpiStripSkeleton() {
  return (
    <View className="flex-row gap-2">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 gap-1">
          <SkeletonBlock height={10} width={60} />
          <SkeletonBlock height={28} width={70} radius={4} />
          <SkeletonBlock height={3} radius={2} />
          <SkeletonBlock height={10} width={90} />
          <SkeletonBlock height={10} width={110} />
        </View>
      ))}
    </View>
  );
});

export const SectionCardSkeleton = memo(function SectionCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View className="bg-[rgba(18,22,35,0.75)] border border-white/[0.08] rounded-xl p-5">
      <View className="flex-row justify-between mb-4">
        <View className="gap-1.5">
          <SkeletonBlock height={14} width={130} />
          <SkeletonBlock height={10} width={90} />
        </View>
        <SkeletonBlock height={28} width={70} radius={8} />
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="flex-row gap-1 items-center mb-2">
          <SkeletonBlock height={32} width={32} radius={8} />
          <View className="flex-1 gap-1.5">
            <SkeletonBlock height={13} width="80%" />
            <SkeletonBlock height={10} width="50%" />
          </View>
          <SkeletonBlock height={20} width={40} />
        </View>
      ))}
    </View>
  );
});

export const CareerPageSkeleton = memo(function CareerPageSkeleton({
  isLarge,
}: { isLarge: boolean }) {
  return (
    <View className="gap-4">
      <HeroSkeleton />
      <KpiStripSkeleton />
      <View className={isLarge ? 'flex-row gap-4' : ''}>
        <SectionCardSkeleton rows={4} />
        <SectionCardSkeleton rows={3} />
      </View>
    </View>
  );
});
