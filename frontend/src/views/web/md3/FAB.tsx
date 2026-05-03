/**
 * FAB — Material Design 3 Floating Action Button.
 * - Bottom-right anchored (web: position: 'fixed', native: 'absolute')
 * - Entrance animation: scale-in + fade-in
 * - Press: scale-down 0.92
 * - Hover (web): expand label inline
 */
import React, { useEffect } from 'react';
import { Text, StyleSheet, Pressable, Platform, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
} from 'react-native-reanimated';

const AView = Animated.createAnimatedComponent(Pressable as any);

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  onPress: () => void;
  icon: IconName;
  label?: string;
  color?: string;
  bottom?: number;
  right?: number;
};

export function FAB({ onPress, icon, label, color = '#7C3AED',
                       bottom = 24, right = 24 }: Props) {
  const scale  = useSharedValue(0);
  const opacity = useSharedValue(0);
  const hovered = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220 });
    scale.value = withSpring(1, { damping: 12, stiffness: 130 });
  }, []);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const aLabelStyle = useAnimatedStyle(() => ({
    width: hovered.value === 1
      ? withTiming(label ? label.length * 7.4 + 16 : 0, { duration: 180 })
      : withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
    opacity: withTiming(hovered.value === 1 ? 1 : 0, { duration: 180 }),
  }));

  const onIn = () => { scale.value = withTiming(0.92, { duration: 100 }); };
  const onOut = () => { scale.value = withSpring(1, { damping: 10, stiffness: 120 }); };
  const onHoverIn = () => {
    if (Platform.OS !== 'web') return;
    hovered.value = 1;
  };
  const onHoverOut = () => {
    if (Platform.OS !== 'web') return;
    hovered.value = 0;
  };

  return (
    <AView
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      onHoverIn={onHoverIn as any}
      onHoverOut={onHoverOut as any}
      style={[
        s.fab,
        {
          bottom, right,
          backgroundColor: color,
          boxShadow: `0 12px 36px -8px ${color}AA, 0 2px 8px rgba(0,0,0,0.30)` as any,
          ...(Platform.OS === 'web' ? { position: 'fixed', cursor: 'pointer' } as any : {}),
        },
        aStyle,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color="#fff" />
      {!!label && Platform.OS === 'web' && (
        <Animated.View style={[s.labelWrap, aLabelStyle]}>
          <Text style={s.label} numberOfLines={1}>{label}</Text>
        </Animated.View>
      )}
    </AView>
  );
}

const s = StyleSheet.create({
  fab: {
    minWidth: 56, height: 56, paddingHorizontal: 18,
    borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, zIndex: 100,
  },
  labelWrap: { overflow: 'hidden' },
  label: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 13.5, letterSpacing: 0.2 },
});
