/**
 * Animated Card Primitives
 * =========================
 * PhonePe-inspired motion + Material Design 3 ripple, layered on top of the
 * existing Student Alumni purple/glass theme.
 *
 * Components:
 *   - <AnimatedCard>    : wrapper with press scale + entrance fade-up + optional ripple
 *   - <AnimatedTile>    : compact dashboard tile (icon + label) with bouncy press
 *   - <StaggerView>     : container that staggers entrance animations of children
 *   - <CountdownBadge>  : red pill showing "X days left" for urgent events
 *
 * Motion specs (Material 3 + Spring physics):
 *   tap        → scale 1.0 → 0.96 in 80ms easeOut, spring back damping 18
 *   long-press → scale 1.05 + lift shadow (drag-to-reorder cue)
 *   entrance   → opacity 0→1 + translateY 12→0 over 380ms easeOut
 *   stagger    → 60ms delay between siblings (Material Stagger spec)
 */
import React, { useEffect } from 'react';
import {
  StyleProp,
  ViewStyle,
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors as C, Radius, Shadows, Spacing, Typography } from '@/src/theme';

// Material 3 standard easing curves
const M3_EMPHASIZED = Easing.bezier(0.2, 0.0, 0.0, 1.0);
const M3_STANDARD = Easing.bezier(0.4, 0.0, 0.2, 1.0);

// Spring config tuned for snappy-but-soft press response
const PRESS_SPRING = { damping: 18, stiffness: 280, mass: 0.8 };

// ---------------------------------------------------------------------------
// AnimatedCard — generic card with press feedback + entrance animation
// ---------------------------------------------------------------------------
export function AnimatedCard({
  children,
  onPress,
  onLongPress,
  style,
  testID,
  index = 0,
  staggerDelay = 60,
  pressScale = 0.97,
  longPressScale = 1.04,
  haptic = true,
  rippleColor = 'rgba(95,37,159,0.10)',
  bg,
  padded = true,
  noEntrance,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  index?: number;
  staggerDelay?: number;
  pressScale?: number;
  longPressScale?: number;
  haptic?: boolean;
  rippleColor?: string;
  bg?: string;
  padded?: boolean;
  noEntrance?: boolean;
  disabled?: boolean;
}) {
  // Entrance animation (fade-up + scale)
  const enter = useSharedValue(noEntrance ? 1 : 0);
  // Press / long-press scale
  const pressVal = useSharedValue(1);

  useEffect(() => {
    if (noEntrance) return;
    enter.value = withDelay(
      index * staggerDelay,
      withTiming(1, { duration: 380, easing: M3_EMPHASIZED }),
    );
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 12 }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressVal.value }],
  }));

  const handlePressIn = () => {
    pressVal.value = withSpring(pressScale, PRESS_SPRING);
  };
  const handlePressOut = () => {
    pressVal.value = withSpring(1, PRESS_SPRING);
  };
  const handlePress = () => {
    if (haptic && Platform.OS !== 'web') Haptics.selectionAsync();
    onPress?.();
  };
  const handleLongPress = () => {
    if (haptic && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pressVal.value = withSpring(longPressScale, PRESS_SPRING);
    onLongPress?.();
  };

  const cardBody = (
    <Animated.View style={[styles.card, { backgroundColor: bg || C.surface, padding: padded ? Spacing.md : 0 }, style]}>
      {children}
    </Animated.View>
  );

  if (!onPress && !onLongPress) {
    return (
      <Animated.View style={enterStyle} testID={testID}>
        {cardBody}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[enterStyle, pressStyle]} testID={testID}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress ? handleLongPress : undefined}
        disabled={disabled}
        android_ripple={{ color: rippleColor, borderless: false, foreground: true }}
        style={({ pressed }) => [
          { borderRadius: Radius.lg, overflow: 'hidden' },
          Platform.OS === 'ios' && pressed ? { opacity: 0.95 } : null,
        ]}
      >
        {cardBody}
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// AnimatedTile — compact dashboard tile (icon + label, PhonePe-style 4-col grid)
// ---------------------------------------------------------------------------
export function AnimatedTile({
  label,
  icon,
  tint = C.palePurple,
  iconColor = C.deepPurple,
  onPress,
  index = 0,
  testID,
  badge,
  size = 'md',
}: {
  label: string;
  icon: React.ReactNode;
  tint?: string;
  iconColor?: string;
  onPress?: () => void;
  index?: number;
  testID?: string;
  badge?: string | number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const enter = useSharedValue(0);
  const pressVal = useSharedValue(1);

  useEffect(() => {
    enter.value = withDelay(index * 45, withTiming(1, { duration: 320, easing: M3_EMPHASIZED }));
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 10 },
      { scale: 0.92 + 0.08 * enter.value },
    ],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressVal.value }],
  }));

  const dim = size === 'lg' ? 60 : size === 'sm' ? 44 : 52;

  return (
    <Animated.View style={[enterStyle, pressStyle, { alignItems: 'center', width: '100%' }]} testID={testID}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          onPress?.();
        }}
        onPressIn={() => (pressVal.value = withSpring(0.92, PRESS_SPRING))}
        onPressOut={() => (pressVal.value = withSpring(1, PRESS_SPRING))}
        android_ripple={{ color: 'rgba(95,37,159,0.16)', borderless: true, radius: dim / 2 + 8 }}
        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}
      >
        <View style={[styles.tileIcon, { width: dim, height: dim, backgroundColor: tint }]}>
          {icon}
          {badge != null && (
            <View style={styles.tileBadge}>
              <Text style={styles.tileBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text
          style={[Typography.bodySm, { color: C.textPrimary, marginTop: 8, textAlign: 'center', maxWidth: 80 }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// CountdownBadge — urgency indicator for events (red if < 3 days, amber else)
// ---------------------------------------------------------------------------
export function CountdownBadge({ days, testID }: { days: number; testID?: string }) {
  const isUrgent = days <= 3;
  const isSoon = days <= 7;
  const bg = isUrgent ? C.danger : isSoon ? C.warning : C.brandPurple;
  const label = days === 0 ? 'Closes today' : days === 1 ? '1 day left' : `${days} days left`;
  return (
    <View style={[styles.countdown, { backgroundColor: bg }]} testID={testID}>
      <Text style={styles.countdownText}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// StaggerView — container that orchestrates child entrance delays
// (use with manually-indexed AnimatedCard, or wrap any children for fade-up)
// ---------------------------------------------------------------------------
export function StaggerView({
  children,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: M3_EMPHASIZED }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing: M3_EMPHASIZED }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  tileIcon: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  tileBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.danger,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.surface,
  },
  tileBadgeText: {
    color: C.white,
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    lineHeight: 12,
  },
  countdown: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  countdownText: {
    color: C.white,
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
