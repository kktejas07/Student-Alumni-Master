// @ts-nocheck
/**
 * AppLoader — sleek glowing top progress bar & live data loading overlay.
 *
 * Provides:
 *  1. GlobalTopProgressBar — animated top progress line on view switch / route change
 *  2. LiveDataLoader — glassmorphic skeleton & spinner overlay when updating live data
 *  3. SkeletonPulse — pulsing shimmer block for placeholder data cards
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/src/theme/ThemeContext';

/**
 * Top progress bar that animates from 0% -> 90% -> 100% when active.
 */
export function GlobalTopProgressBar({ active = false }: { active?: boolean }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      widthAnim.setValue(0);
      opacityAnim.setValue(1);
      Animated.sequence([
        Animated.timing(widthAnim, {
          toValue: 0.75,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(widthAnim, {
          toValue: 0.92,
          duration: 350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.timing(widthAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          widthAnim.setValue(0);
        });
      });
    }
  }, [active, widthAnim, opacityAnim]);

  const widthStyle = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[s.topBarWrap, { opacity: opacityAnim }]} pointerEvents="none">
      <Animated.View style={[s.topBarFill, { width: widthStyle }]}>
        <LinearGradient
          colors={['#7C3AED', '#C4B5FD', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.gradientFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * LiveDataLoader — glassmorphic overlay for live data fetching / background updates.
 */
export function LiveDataLoader({
  loading = false,
  message = 'Updating live data…',
  children,
}: {
  loading?: boolean;
  message?: string;
  children?: React.ReactNode;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1100,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulseOpacity, { toValue: 0.4, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      ).start();
    }
  }, [loading, spinValue, pulseOpacity]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!loading) return children ? <>{children}</> : null;

  const { isDark } = useTheme();

  return (
    <View style={s.loaderContainer}>
      {children ? <View style={{ opacity: 0.35 }}>{children}</View> : null}

      <View style={s.overlayCenter}>
        <View style={[s.glassCard, {
          backgroundColor: isDark ? 'rgba(13, 19, 38, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: isDark ? 'rgba(167, 139, 250, 0.35)' : 'rgba(106, 79, 224, 0.25)',
          ...(Platform.OS === 'web' ? {
            boxShadow: isDark ? '0 8px 32px rgba(124, 58, 237, 0.35)' : '0 8px 32px rgba(106, 79, 224, 0.15)',
          } : {}),
        }]}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw size={22} color={isDark ? '#C4B5FD' : '#6A4FE0'} />
          </Animated.View>

          <Animated.View style={{ opacity: pulseOpacity, alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} color="#34D399" />
              <Text style={[s.loadingTitle, { color: isDark ? '#fff' : '#141726' }]}>{message}</Text>
            </View>
            <Text style={[s.loadingSub, { color: isDark ? '#94A3B8' : '#6B7280' }]}>Syncing live data from backend servers…</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

/**
 * SkeletonPulse — placeholder shimmer for cards and tables.
 */
export function SkeletonPulse({
  width = '100%',
  height = 20,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: any;
}) {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.3, duration: 750, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
  }, [pulse]);

  const { isDark } = useTheme();
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

const s = StyleSheet.create({
  topBarWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 9999,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  topBarFill: {
    height: '100%',
  },
  gradientFill: {
    width: '100%',
    height: '100%',
  },

  loaderContainer: {
    position: 'relative',
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(13, 19, 38, 0.88)',
    borderColor: 'rgba(167, 139, 250, 0.35)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(124, 58, 237, 0.35)',
        } as any)
      : {}),
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
});
