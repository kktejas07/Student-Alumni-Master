/**
 * Bento + Glow Components
 *
 * Visual language used across category browser pages (Courses, Internships,
 * Network, Resources) and dashboard accents.
 *
 *   GlowCard      - rounded glass card with animated radial glow on hover
 *   IconBubble    - circular dark glass bubble with white line icon + label
 *   CategorySection - title + IconBubble grid wrapper inside a GlowCard
 *   BentoTile     - varying-size bento grid tile with glow + content slot
 */
import { ReactNode, useRef, useState } from 'react';
import {
  View, Text, Pressable, Animated, Easing, Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const IS_WEB = Platform.OS === 'web';

// ─── GlowCard ────────────────────────────────────────────────────────────────
/**
 * Glass card with an animated gradient ring that softly glows on hover (web).
 * Native: static glass card with subtle shadow.
 */
export function GlowCard({
  children,
  style,
  onPress,
  testID,
  intensity = 'normal',
}: {
  children: ReactNode;
  style?: any;
  onPress?: () => void;
  testID?: string;
  intensity?: 'subtle' | 'normal' | 'strong';
}) {
  const [hovered, setHovered] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;

  // Animate glow opacity
  useRef(() => {
    Animated.timing(glow, {
      toValue: hovered ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  });

  const Wrapper: any = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? {
        onPress,
        testID,
        onHoverIn: () => setHovered(true),
        onHoverOut: () => setHovered(false),
        style: ({ pressed }: any) => [
          glowStyles.outer,
          style,
          pressed && { transform: [{ scale: 0.99 }] },
        ],
      }
    : { style: [glowStyles.outer, style], testID };

  const glowOpacity = intensity === 'strong' ? 1 : intensity === 'subtle' ? 0.5 : 0.75;

  return (
    <Wrapper {...wrapperProps}>
      {hovered && (
        <View pointerEvents="none" className="absolute inset-0" style={{ opacity: glowOpacity }}>
          <LinearGradient
            colors={['rgba(176,127,223,0.55)', 'rgba(124,58,237,0.0)', 'rgba(236,72,153,0.45)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0"
          />
        </View>
      )}

      <View
        className="rounded-3xl p-px overflow-hidden"
        style={{ ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '240ms' } as any : {}) }}
      >
        <View
          className="bg-white/5 border rounded-[21px] p-4 overflow-hidden"
          style={{
            borderColor: hovered ? 'rgba(196,181,253,0.30)' : 'rgba(255,255,255,0.10)',
            backgroundColor: hovered ? 'rgba(255,255,255,0.08)' : undefined,
            ...(Platform.OS === 'web' ? { transitionDuration: '240ms' } as any : {}),
          }}
        >
          {children}
        </View>
      </View>
    </Wrapper>
  );
}

// ─── IconBubble ──────────────────────────────────────────────────────────────
/**
 * Circular dark glass bubble with a centered icon and label below.
 * Matches the screenshot's "Fitness/Sports" tile pattern.
 */
export function IconBubble({
  icon,
  label,
  onPress,
  testID,
  size = 64,
  glowColor = '#B07FDF',
}: {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  testID?: string;
  size?: number;
  glowColor?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className="items-center justify-center py-2 gap-2"
      style={{ ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}) }}
      style={({ pressed }: any) => [
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      {hovered && (
        <View
          pointerEvents="none"
          className="absolute"
          style={{
            width: size + 18,
            height: size + 18,
            borderRadius: (size + 18) / 2,
            backgroundColor: glowColor + '33',
            filter: 'blur(18px)' as any,
            top: 0,
            zIndex: 0,
          }}
        />
      )}
      <View
        className="bg-white/6 border items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: hovered ? glowColor + '66' : 'rgba(255,255,255,0.12)',
          backgroundColor: hovered ? 'rgba(255,255,255,0.10)' : undefined,
          transform: hovered ? [{ translateY: -2 }] : [],
          ...(Platform.OS === 'web' ? { transitionDuration: '200ms' } as any : {}),
        }}
      >
        {icon}
      </View>
      <Text className="text-white/85 font-body-medium text-xs text-center px-1" style={{ lineHeight: 14 }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── CategorySection ─────────────────────────────────────────────────────────
/**
 * A bordered glass section with a title and a grid of IconBubbles.
 *   Section header + grid of items
 */
export function CategorySection({
  title,
  emoji,
  items,
  columns,
}: {
  title: string;
  emoji?: string;
  items: { id: string; label: string; icon: ReactNode; onPress?: () => void; glow?: string }[];
  columns?: number;
}) {
  const { width } = useWindowDimensions();
  const cols = columns ?? (width >= 980 ? 6 : width >= 600 ? 5 : 4);

  return (
    <GlowCard style={{ marginBottom: 14 }}>
      <View className="mb-4">
        <Text className="text-white font-body-bold text-lg tracking-tight">
          {emoji ? `${emoji}  ` : ''}{title}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-1">
        {items.map((it) => (
          <View key={it.id} className="px-1 py-1.5" style={{ flexBasis: `${100 / cols}%`, minWidth: 70 }}>
            <IconBubble
              icon={it.icon}
              label={it.label}
              onPress={it.onPress}
              testID={`bubble-${it.id}`}
              glowColor={it.glow}
            />
          </View>
        ))}
      </View>
    </GlowCard>
  );
}

// ─── BentoTile ───────────────────────────────────────────────────────────────
/**
 * A bento-grid tile that supports varying spans (1×1, 2×1, 1×2, 2×2).
 * Use for hero tiles in the dashboard / explore pages.
 */
export function BentoTile({
  span = 1,
  children,
  onPress,
  gradient,
  testID,
  minHeight = 140,
}: {
  span?: 1 | 2 | 3;
  children: ReactNode;
  onPress?: () => void;
  gradient?: string[];
  testID?: string;
  minHeight?: number;
}) {
  return (
    <View style={{ flex: span, minHeight }}>
      <GlowCard
        onPress={onPress}
        testID={testID}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        {gradient && (
          <View pointerEvents="none" className="absolute inset-0">
            <LinearGradient
              colors={gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="absolute inset-0"
            />
          </View>
        )}
        <View className="flex-1 p-4">{children}</View>
      </GlowCard>
    </View>
  );
}
