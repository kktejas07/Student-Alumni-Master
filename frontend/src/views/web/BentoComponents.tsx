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
  View, Text, StyleSheet, Pressable, Animated, Easing, Platform,
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
      useNativeDriver: true,
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
      {/* Animated gradient glow ring (web hover-driven, fade) */}
      {hovered && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
          <LinearGradient
            colors={['rgba(176,127,223,0.55)', 'rgba(124,58,237,0.0)', 'rgba(236,72,153,0.45)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Inner card surface */}
      <View
        style={[
          glowStyles.inner,
          hovered && {
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderColor: 'rgba(196,181,253,0.30)',
          },
        ]}
      >
        {children}
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
      style={({ pressed }: any) => [
        bubbleStyles.outer,
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      {/* Glow halo on hover */}
      {hovered && (
        <View
          pointerEvents="none"
          style={[
            bubbleStyles.halo,
            {
              width: size + 18,
              height: size + 18,
              borderRadius: (size + 18) / 2,
              backgroundColor: glowColor + '33',
            },
          ]}
        />
      )}
      <View
        style={[
          bubbleStyles.bubble,
          { width: size, height: size, borderRadius: size / 2 },
          hovered && {
            borderColor: glowColor + '66',
            backgroundColor: 'rgba(255,255,255,0.10)',
            transform: [{ translateY: -2 }],
          },
        ]}
      >
        {icon}
      </View>
      <Text style={bubbleStyles.label} numberOfLines={2}>
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
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>
          {emoji ? `${emoji}  ` : ''}{title}
        </Text>
      </View>
      <View style={sectionStyles.grid}>
        {items.map((it) => (
          <View key={it.id} style={[sectionStyles.cell, { flexBasis: `${100 / cols}%` }]}>
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
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
        <View style={{ flex: 1, padding: 18 }}>{children}</View>
      </GlowCard>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const glowStyles = StyleSheet.create({
  outer: {
    borderRadius: 22,
    padding: 1,
    overflow: 'hidden',
    ...({ cursor: 'pointer', transitionDuration: '240ms' } as any),
  },
  inner: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 21,
    padding: 18,
    overflow: 'hidden',
    ...({ transitionDuration: '240ms' } as any),
  },
});

const bubbleStyles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  halo: {
    position: 'absolute',
    top: 0,
    ...({ filter: 'blur(18px)' } as any),
    zIndex: 0,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ transitionDuration: '200ms' } as any),
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 4,
  },
});

const sectionStyles = StyleSheet.create({
  header: { marginBottom: 16 },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    minWidth: 70,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
});
