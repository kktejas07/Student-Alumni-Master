/**
 * HoverGlowCard — subtle single-color glow on hover (web) / press (mobile).
 *
 * Drop-in wrapper that:
 *  • adds a soft animated glow + border tint on hover (web)
 *  • lifts the card 1-2px and amplifies shadow
 *  • on mobile: slight scale on press, glow flashes briefly
 *  • respects existing children's borderRadius & padding (it acts as outer)
 *
 * Usage:
 *   <HoverGlowCard tint="#A78BFA" radius={14}>
 *     <YourCardContent />
 *   </HoverGlowCard>
 *
 * Tints (recommended palette):
 *   purple #A78BFA   teal #2DD4BF   amber #F59E0B   green #10B981
 */
import { useState, useRef, useEffect } from 'react';
import { Pressable, View, StyleSheet, Animated, Platform, ViewStyle, StyleProp } from 'react-native';

interface Props {
  children: React.ReactNode;
  tint?: string;
  radius?: number;
  intensity?: 'low' | 'medium' | 'high';
  onPress?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const INTENSITY = {
  low:    { borderAlpha: 0.32, glowAlpha: 0.16, lift: 1, blur: 14 },
  medium: { borderAlpha: 0.55, glowAlpha: 0.32, lift: 2, blur: 24 },
  high:   { borderAlpha: 0.85, glowAlpha: 0.55, lift: 4, blur: 36 },
} as const;

export function HoverGlowCard({
  children, tint = '#A78BFA', radius = 14, intensity = 'medium',
  onPress, testID, style, disabled = false,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const lift = useRef(new Animated.Value(0)).current;
  const cfg = INTENSITY[intensity];

  useEffect(() => {
    Animated.timing(lift, {
      toValue: hovered || pressed ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [hovered, pressed, lift]);

  const translateY = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -cfg.lift],
  });
  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, pressed && Platform.OS !== 'web' ? 0.98 : 1.005],
  });

  const active = hovered || pressed;
  const webGlowStyle: any = Platform.OS === 'web' ? {
    boxShadow: active
      ? `0 ${cfg.lift * 4}px ${cfg.blur}px ${tint}${Math.round(cfg.glowAlpha * 255).toString(16).padStart(2, '0')}, 0 0 0 1px ${tint}${Math.round(cfg.borderAlpha * 255).toString(16).padStart(2, '0')} inset`
      : `0 1px 4px rgba(0,0,0,0.20), 0 0 0 1px rgba(255,255,255,0.06) inset`,
    transition: 'box-shadow 200ms ease, transform 180ms ease',
  } : {};

  const Wrapper: any = onPress && !disabled ? Pressable : View;
  const wrapperProps: any = onPress && !disabled
    ? {
        onPress,
        onHoverIn: () => setHovered(true),
        onHoverOut: () => setHovered(false),
        onPressIn: () => setPressed(true),
        onPressOut: () => setPressed(false),
      }
    : {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      };

  return (
    <Wrapper {...wrapperProps} testID={testID} style={[{ borderRadius: radius }, style]}>
      <Animated.View
        style={[
          styles.shell,
          {
            borderRadius: radius,
            borderColor: active ? tint + '70' : 'rgba(255,255,255,0.09)',
            transform: [{ translateY }, { scale }],
          },
          webGlowStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
