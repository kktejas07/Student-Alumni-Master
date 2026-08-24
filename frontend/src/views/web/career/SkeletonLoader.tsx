/**
 * SkeletonLoader.tsx
 * Premium skeleton loading placeholders for the Career AI page.
 * Replaces the page-level spinner with section-accurate shape hints.
 */
import React, { useEffect, useRef, memo } from 'react';
import { Platform, View, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING } from '@/src/lib/designTokens';

// ── Primitive animated block ──────────────────────────────────────────────────
const SkeletonBlock = memo(function SkeletonBlock({
  width, height, radius = RADIUS.chip, style,
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
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: radius,
          backgroundColor: 'rgba(255,255,255,0.07)',
          opacity: anim,
        },
        style,
      ]}
    />
  );
});

// ── Hero skeleton ─────────────────────────────────────────────────────────────
export const HeroSkeleton = memo(function HeroSkeleton() {
  return (
    <View style={sk.heroCard}>
      <View style={{ flex: 1, gap: SPACING.sm }}>
        <SkeletonBlock height={10} width={80} />
        <SkeletonBlock height={28} width="70%" radius={RADIUS.chip} />
        <SkeletonBlock height={14} width="40%" />
        <View style={{ flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs }}>
          <SkeletonBlock height={10} width={80} />
          <SkeletonBlock height={10} width={80} />
          <SkeletonBlock height={10} width={80} />
        </View>
        <SkeletonBlock height={6} radius={3} style={{ marginTop: SPACING.md }} />
      </View>
      <SkeletonBlock height={88} width={88} radius={44} />
    </View>
  );
});

// ── KPI strip skeleton ────────────────────────────────────────────────────────
export const KpiStripSkeleton = memo(function KpiStripSkeleton() {
  return (
    <View style={sk.kpiRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={sk.kpiCard}>
          <SkeletonBlock height={10} width={60} />
          <SkeletonBlock height={28} width={70} radius={4} />
          <SkeletonBlock height={3}  radius={2} />
          <SkeletonBlock height={10} width={90} />
          <SkeletonBlock height={10} width={110} />
        </View>
      ))}
    </View>
  );
});

// ── Generic section card skeleton ─────────────────────────────────────────────
export const SectionCardSkeleton = memo(function SectionCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={sk.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.md }}>
        <View style={{ gap: 6 }}>
          <SkeletonBlock height={14} width={130} />
          <SkeletonBlock height={10} width={90} />
        </View>
        <SkeletonBlock height={28} width={70} radius={RADIUS.btn} />
      </View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: SPACING.xs, alignItems: 'center', marginBottom: 8 }}>
          <SkeletonBlock height={32} width={32} radius={RADIUS.chip} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock height={13} width="80%" />
            <SkeletonBlock height={10} width="50%" />
          </View>
          <SkeletonBlock height={20} width={40} />
        </View>
      ))}
    </View>
  );
});

// ── Full page skeleton ────────────────────────────────────────────────────────
export const CareerPageSkeleton = memo(function CareerPageSkeleton({
  isLarge,
}: { isLarge: boolean }) {
  return (
    <View style={{ gap: SPACING.md }}>
      <HeroSkeleton />
      <KpiStripSkeleton />
      <View style={isLarge ? sk.grid : {}}>
        <SectionCardSkeleton rows={4} />
        <SectionCardSkeleton rows={3} />
      </View>
    </View>
  );
});

const sk = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xl,
    backgroundColor: COLORS.cardSolid,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    overflow: 'hidden',
  },
  kpiRow:  { flexDirection: 'row', gap: SPACING.sm },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.md,
    gap: SPACING.xxs,
  },
  section: {
    backgroundColor: COLORS.cardSolid,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
