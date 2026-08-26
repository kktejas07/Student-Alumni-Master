/**
 * Splash + initial router.
 *
 * Web renders LandingPage directly without splash delay.
 * Native runs modern 1:1 Loading screen with 3D glowing SA Shield.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Text as SvgText, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import LandingPage from '@/src/views/web/LandingPage';

const IS_WEB = Platform.OS === 'web';

export default function Index() {
  if (IS_WEB) {
    return <LandingPage />;
  }

  return <NativeSplash />;
}

function NativeSplash() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);

  // Entrance animation
  const scale = useRef(new Animated.Value(0.75)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [scale, opacity]);

  // Loading ticker (0 to 100)
  useEffect(() => {
    let current = 0;
    const iv = setInterval(() => {
      current += Math.floor(Math.random() * 12) + 7;
      if (current >= 100) {
        setProgress(100);
        clearInterval(iv);
      } else {
        setProgress(current);
      }
    }, 32);
    return () => clearInterval(iv);
  }, []);

  // Read intro flag once
  useEffect(() => {
    AsyncStorage.getItem('hasSeenIntro')
      .then((v) => setHasSeenIntro(v === 'true'))
      .catch(() => setHasSeenIntro(false));
  }, []);

  // Route as soon as auth is ready
  useEffect(() => {
    if (!initialized || hasSeenIntro === null || progress < 100) return;
    if (user) {
      if (!user.onboarding_completed) {
        const dest =
          user.role === 'student' ? '/(onboarding)/student-onboard' :
            user.role === 'mentor' ? '/(onboarding)/mentor-onboard' :
              user.role === 'alumni' ? '/(onboarding)/alumni-onboard' :
                user.role === 'college' ? '/(onboarding)/college-onboard' :
                  '/(onboarding)/role-info';
        router.replace(dest as any);
      } else {
        router.replace('/(tabs)');
      }
      return;
    }
    if (!hasSeenIntro) {
      router.replace('/intro');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, initialized, hasSeenIntro, progress, router]);

  return (
    <View style={styles.shell}>
      {/* Radial cosmic glow */}
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.center}>
        <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
          {/* SA Shield Mark */}
          <Svg viewBox="0 0 300 350" width={104} height={122} style={{ marginBottom: 18 }}>
            <Defs>
              <SvgGrad id="saSplashGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#D8B6FF" />
                <Stop offset="0.45" stopColor="#9A5CE8" />
                <Stop offset="1" stopColor="#5B1FB0" />
              </SvgGrad>
            </Defs>
            <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#saSplashGrad)" />
            <SvgText x="150" y="215" textAnchor="middle" fontFamily="sans-serif" fontSize="128" fontWeight="800" fill="#FFFFFF">SA</SvgText>
          </Svg>

          <Text style={styles.brand}>StudentAlumni</Text>
          <Text style={styles.tag}>INITIALIZING ECOSYSTEM</Text>

          {/* Clean Percentage Counter (No bar, no hold) */}
          <Text style={styles.progressPercent}>{progress.toString().padStart(2, '0')}%</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#05060F',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(139, 90, 255, 0.35)',
    ...(Platform.OS === 'web' ? { filter: 'blur(60px)' } : {}),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
    fontFamily: Platform.OS === 'web' ? "'Manrope', sans-serif" : 'System',
  },
  tag: {
    color: '#8B84FF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 20,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'web' ? "'Manrope', sans-serif" : 'System',
  },
  progressPercent: {
    fontSize: 16,
    color: '#D5D8E4',
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : 'Courier',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
