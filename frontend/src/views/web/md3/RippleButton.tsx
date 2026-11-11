/**
 * RippleButton — Pressable with MD3 scale-down + opacity ripple effect.
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
  disabled?: boolean;
  children: React.ReactNode;
};

export function RippleButton({ onPress, style, disabled, children }: Props) {
  const scale = useSharedValue(1);
  const op    = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: op.value,
  }));

  const onIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.95, { duration: 110, easing: Easing.out(Easing.quad) });
    op.value    = withTiming(0.85, { duration: 110 });
  };
  const onOut = () => {
    scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
    op.value    = withTiming(1, { duration: 160 });
  };

  return (
    <AView
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      disabled={disabled}
      style={[style as any, aStyle, Platform.OS === 'web' ? ({ cursor: disabled ? 'default' : 'pointer' } as any) : null]}
    >
      {children}
    </AView>
  );
}
