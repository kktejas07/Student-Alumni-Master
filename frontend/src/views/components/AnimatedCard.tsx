// @ts-nocheck
/**
 * Animated Card Primitives — Migrated to NativeWind className.
 */
import React, { useEffect } from 'react';
import {
  StyleProp, ViewStyle, View, Text, Pressable, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors as C, Radius, Shadows, Spacing, Typography } from '@/src/theme';

const M3_EMPHASIZED = Easing.bezier(0.2, 0.0, 0.0, 1.0);
const PRESS_SPRING = { damping: 18, stiffness: 280, mass: 0.8 };

export function AnimatedCard({
  children, onPress, onLongPress, style, testID, index = 0, staggerDelay = 60,
  pressScale = 0.97, longPressScale = 1.04, haptic = true,
  rippleColor = 'rgba(95,37,159,0.10)', bg, padded = true, noEntrance, disabled,
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
  const enter = useSharedValue(noEntrance ? 1 : 0);
  const pressVal = useSharedValue(1);

  useEffect(() => {
    if (noEntrance) return;
    enter.value = withDelay(index * staggerDelay, withTiming(1, { duration: 380, easing: M3_EMPHASIZED }));
  }, []);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 12 }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressVal.value }],
  }));

  const handlePressIn = () => { pressVal.value = withSpring(pressScale, PRESS_SPRING); };
  const handlePressOut = () => { pressVal.value = withSpring(1, PRESS_SPRING); };
  const handlePress = () => { if (haptic && Platform.OS !== 'web') Haptics.selectionAsync(); onPress?.(); };
  const handleLongPress = () => {
    if (haptic && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pressVal.value = withSpring(longPressScale, PRESS_SPRING);
    onLongPress?.();
  };

  const cardBody = (
    <Animated.View
      className="rounded-lg overflow-hidden"
      style={[{ backgroundColor: bg || C.surface, padding: padded ? Spacing.md : 0 }, style]}
    >
      {children}
    </Animated.View>
  );

  if (!onPress && !onLongPress) {
    return <Animated.View style={enterStyle} testID={testID}>{cardBody}</Animated.View>;
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

export function AnimatedTile({
  label, icon, tint = C.palePurple, iconColor = C.deepPurple, onPress, index = 0,
  testID, badge, size = 'md',
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
    transform: [{ translateY: (1 - enter.value) * 10 }, { scale: 0.92 + 0.08 * enter.value }],
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressVal.value }],
  }));

  const dim = size === 'lg' ? 60 : size === 'sm' ? 44 : 52;

  return (
    <Animated.View style={[enterStyle, pressStyle]} className="items-center w-full" testID={testID}>
      <Pressable
        onPress={() => { if (Platform.OS !== 'web') Haptics.selectionAsync(); onPress?.(); }}
        onPressIn={() => (pressVal.value = withSpring(0.92, PRESS_SPRING))}
        onPressOut={() => (pressVal.value = withSpring(1, PRESS_SPRING))}
        android_ripple={{ color: 'rgba(95,37,159,0.16)', borderless: true, radius: dim / 2 + 8 }}
        className="items-center justify-center py-1"
      >
        <View className="rounded-lg items-center justify-center" style={[{ width: dim, height: dim, backgroundColor: tint }, Shadows.sm]}>
          {icon}
          {badge != null && (
            <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 px-[5px] items-center justify-center border-2 border-white">
              <Text className="text-white text-[10px] font-bold leading-3">{badge}</Text>
            </View>
          )}
        </View>
        <Text
          className="text-gray-900 mt-2 text-center max-w-[80px]"
          style={Typography.bodySm}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function CountdownBadge({ days, testID }: { days: number; testID?: string }) {
  const isUrgent = days <= 3;
  const isSoon = days <= 7;
  const bg = isUrgent ? C.danger : isSoon ? C.warning : C.brandPurple;
  const label = days === 0 ? 'Closes today' : days === 1 ? '1 day left' : `${days} days left`;
  return (
    <View className="self-start px-2 py-[3px] rounded-full" style={{ backgroundColor: bg }} testID={testID}>
      <Text className="text-white text-[10px] font-bold tracking-widest uppercase">{label}</Text>
    </View>
  );
}

export function StaggerView({ children, style, delay = 0 }: {
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
