// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Text as SvgText, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { LandingPageModernRN } from '@/src/views/web/nexus-glow-landing/LandingPageModernRN';

const IS_WEB = Platform.OS === 'web';

export default function Index() {
  if (IS_WEB) {
    return <LandingPageModernRN />;
  }

  return <NativeSplashScreen />;
}

function NativeSplashScreen() {
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
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
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
      <View style={styles.glow} pointerEvents="none" />
      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <View style={styles.badgeWrap}>
          <Svg width={110} height={128} viewBox="0 0 300 350">
            <Defs>
              <SvgGrad id="splashGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#C9BCFF" />
                <Stop offset="0.5" stopColor="#8B6CF6" />
                <Stop offset="1" stopColor="#5B2FD0" />
              </SvgGrad>
            </Defs>
            <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#splashGrad)" />
            <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
              SA
            </SvgText>
          </Svg>
        </View>
        <Text style={styles.brandTitle}>StudentAlumni</Text>
        <Text style={styles.brandSubtitle}>Intelligent Career Platform</Text>
        <Text style={styles.counter}>{progress}%</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#05060F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(91,79,233,0.25)',
  },
  card: {
    alignItems: 'center',
  },
  badgeWrap: {
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F4F5FB',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#9AA0B4',
    marginTop: 4,
  },
  counter: {
    fontSize: 40,
    fontWeight: '800',
    color: '#8B84FF',
    marginTop: 20,
  },
});
