// @ts-nocheck
/**
 * FAB — Material Design 3 Floating Action Button.
 * - Bottom-right anchored (web: position: 'fixed', native: 'absolute')
 * - Entrance animation: scale-in + fade-in
 * - Press: scale-down 0.92
 * - Hover (web): expand label inline
 */
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable, Platform, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
} from 'react-native-reanimated';

const AView = Animated.createAnimatedComponent(Pressable as any);

const ReactDOM = Platform.OS === 'web' ? require('react-dom') : null;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  onPress: () => void;
  icon: IconName;
  label?: string;
  color?: string;
  bottom?: number;
  right?: number;
  left?: number;
};

export function FAB({ onPress, icon, label, color = '#7C3AED',
                       bottom = 90, right, left }: Props) {
  const scale  = useSharedValue(0);
  const opacity = useSharedValue(0);
  const hovered = useSharedValue(0);

  const [webHovered, setWebHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hasLeft = left !== undefined;
  const finalRight = hasLeft ? undefined : (right ?? 24);

  useEffect(() => {
    setMounted(true);
    opacity.value = withTiming(1, { duration: 220 });
    scale.value = withSpring(1, { damping: 12, stiffness: 130 });
  }, []);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const aFABStyle = useAnimatedStyle(() => {
    const isHovered = hovered.value === 1;
    const targetWidth = isHovered
      ? 56 + (label ? label.length * 7.4 + 24 : 0)
      : 56;
    return {
      width: withTiming(targetWidth, { duration: 180 }),
    };
  });

  const aLabelStyle = useAnimatedStyle(() => {
    const isHovered = hovered.value === 1;
    return {
      width: isHovered
        ? withTiming(label ? label.length * 7.4 + 16 : 0, { duration: 180 })
        : withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
      marginLeft: isHovered
        ? withTiming(8, { duration: 180 })
        : withTiming(0, { duration: 180 }),
      opacity: withTiming(isHovered ? 1 : 0, { duration: 180 }),
    };
  });

  const onIn = () => { scale.value = withTiming(0.92, { duration: 100 }); };
  const onOut = () => { scale.value = withSpring(1, { damping: 10, stiffness: 120 }); };
  const onHoverIn = () => {
    if (Platform.OS !== 'web') return;
    setWebHovered(true);
    hovered.value = 1;
  };
  const onHoverOut = () => {
    if (Platform.OS !== 'web') return;
    setWebHovered(false);
    hovered.value = 0;
  };

  if (Platform.OS === 'web' && ReactDOM) {
    const targetWidth = webHovered
      ? 56 + (label ? label.length * 7.4 + 24 : 0)
      : 56;
    const labelWidth = webHovered
      ? (label ? label.length * 7.4 + 16 : 0)
      : 0;

    return ReactDOM.createPortal(
      <div
        onClick={onPress}
        onMouseEnter={onHoverIn}
        onMouseLeave={onHoverOut}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        style={{
          position: 'fixed',
          bottom,
          ...(hasLeft ? { left } : { right: finalRight }),
          height: 56,
          borderRadius: 28,
          backgroundColor: color,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: 17,
          zIndex: 1000,
          cursor: 'pointer',
          boxShadow: `0 12px 36px -8px ${color}AA, 0 2px 8px rgba(0,0,0,0.30)`,
          transition: 'width 180ms ease, transform 180ms ease, opacity 220ms ease',
          transform: pressed ? 'scale(0.92)' : (mounted ? 'scale(1)' : 'scale(0)'),
          opacity: mounted ? 1 : 0,
          width: targetWidth,
          boxSizing: 'border-box',
        }}
      >
        <MaterialCommunityIcons name={icon} size={22} color="#fff" style={{ width: 22, height: 22 }} />
        {!!label && (
          <div
            style={{
              overflow: 'hidden',
              transition: 'width 180ms ease, margin-left 180ms ease, opacity 180ms ease',
              width: labelWidth,
              marginLeft: webHovered ? 8 : 0,
              opacity: webHovered ? 1 : 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontFamily: 'DMSans_800ExtraBold',
                fontSize: 13.5,
                letterSpacing: 0.2,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </div>
        )}
      </div>,
      document.body
    );
  }

  return (
    <AView
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      style={[
        s.fab,
        {
          bottom,
          ...(hasLeft ? { left } : { right: finalRight }),
          backgroundColor: color,
        },
        aStyle,
        aFABStyle,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color="#fff" style={{ width: 22, height: 22 }} />
    </AView>
  );
}

const s = StyleSheet.create({
  fab: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
    paddingLeft: 17, zIndex: 100,
  },
  labelWrap: { overflow: 'hidden' },
  label: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 13.5, letterSpacing: 0.2 },
});
