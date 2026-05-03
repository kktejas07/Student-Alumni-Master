/**
 * AnimatedCard — Pressable wrapper with MD3 hover/press animation.
 * Web: subtle scale + shadow lift on hover; press: scale-down 0.97.
 * Native: scale-down 0.97 on press.
 */
import React from 'react';
import { Pressable, ViewStyle, StyleProp, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';

const AView = Animated.createAnimatedComponent(Pressable as any);

type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  hoverLift?: number;
  glowColor?: string;
  disabled?: boolean;
  children: React.ReactNode;
};

export function AnimatedCard({
  onPress, style, hoverLift = 4, glowColor,
  disabled, children,
}: Props) {
  const scale  = useSharedValue(1);
  const lift   = useSharedValue(0);
  const glow   = useSharedValue(0);

  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: -lift.value },
    ],
    ...(glowColor ? {
      boxShadow: `0 ${lift.value + 4}px ${24 + glow.value * 16}px ${-(8 - glow.value * 4)}px ${glowColor}` as any,
    } : {}),
  }) as any);

  const onIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.97, { duration: 130, easing: Easing.out(Easing.quad) });
  };
  const onOut = () => {
    scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
  };
  const onHoverIn = () => {
    if (disabled || Platform.OS !== 'web') return;
    lift.value = withTiming(hoverLift, { duration: 200, easing: Easing.out(Easing.cubic) });
    glow.value = withTiming(1, { duration: 200 });
  };
  const onHoverOut = () => {
    if (Platform.OS !== 'web') return;
    lift.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    glow.value = withTiming(0, { duration: 220 });
  };

  return (
    <AView
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      onHoverIn={onHoverIn as any}
      onHoverOut={onHoverOut as any}
      disabled={disabled}
      style={[style as any, aStyle, Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'pointer' } as any) : null]}
    >
      {children}
    </AView>
  );
}
