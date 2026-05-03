/**
 * Splash + initial router.
 *
 * Routing rules:
 *   • Web                                 → /welcome (LandingPage)            ⓘ unchanged
 *   • Native + authed + onboarding done   → /(tabs)
 *   • Native + authed + onboarding pending → /(onboarding)/role-info
 *   • Native + first launch (no intro seen) → /intro
 *   • Native + intro already seen         → /(auth)/login
 *
 * Splash itself shows ~1.6s on web, ~2.0s on native (longer reveal).
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { Colors as C, Typography } from '@/src/theme';
import { SALogo } from '@/src/views/components';

const IS_WEB = Platform.OS === 'web';

export default function Index() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);

  // Logo entrance animation
  const scale = useRef(new Animated.Value(0.55)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const dotsTrans = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 65, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotsTrans, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, [scale, opacity, tagOpacity, dotsTrans]);

  // Read intro flag once (native only — web doesn't use it).
  useEffect(() => {
    if (IS_WEB) {
      setHasSeenIntro(true); // Web never shows intro.
      return;
    }
    AsyncStorage.getItem('hasSeenIntro')
      .then((v) => setHasSeenIntro(v === 'true'))
      .catch(() => setHasSeenIntro(false));
  }, []);

  // Route once both auth and intro flags are known.
  useEffect(() => {
    if (!initialized || hasSeenIntro === null) return;
    const delay = IS_WEB ? 1400 : 2000;
    const t = setTimeout(() => {
      // Authed users go straight to their home.
      if (user) {
        if (!user.onboarding_completed) {
          // Route to role-specific spec-compliant wizard instead of the legacy
          // /role-info → /school-info → /role-details linear chain.
          const dest =
            user.role === 'student' ? '/(onboarding)/student-onboard' :
            user.role === 'mentor'  ? '/(onboarding)/mentor-onboard'  :
            user.role === 'alumni'  ? '/(onboarding)/alumni-onboard'  :
            user.role === 'college' ? '/(onboarding)/college-onboard' :
            '/(onboarding)/role-info';
          router.replace(dest as any);
        } else if (IS_WEB) {
          router.replace('/platform');
        } else {
          router.replace('/(tabs)');
        }
        return;
      }
      // Unauthed: web → landing, native → intro (first time) or login.
      if (IS_WEB) {
        router.replace('/welcome');
      } else if (!hasSeenIntro) {
        router.replace('/intro');
      } else {
        router.replace('/(auth)/login');
      }
    }, delay);
    return () => clearTimeout(t);
  }, [user, initialized, hasSeenIntro, router]);

  return (
    <View style={styles.shell}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1A0438', '#2D0760', '#5F259F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative orbs */}
      <View pointerEvents="none" style={[styles.orb, { top: '-15%', right: '-25%', backgroundColor: 'rgba(124,58,237,0.45)' }]} />
      <View pointerEvents="none" style={[styles.orb, { bottom: '-15%', left: '-25%', backgroundColor: 'rgba(236,72,153,0.30)' }]} />

      <View style={styles.center}>
        <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
          <SALogo size={108} variant="glass" />
          <Text style={styles.brand}>Student Alumni</Text>
        </Animated.View>

        <Animated.Text style={[styles.tag, { opacity: tagOpacity }]}>
          CAREER · MENTORSHIP · NETWORK
        </Animated.Text>

        <Animated.View style={[styles.dotsRow, { opacity: tagOpacity, transform: [{ translateY: dotsTrans }] }]}>
          <BouncingDot delay={0} />
          <BouncingDot delay={120} />
          <BouncingDot delay={240} />
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Bouncing loading dots ───────────────────────────────────────────────────
function BouncingDot({ delay }: { delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -8, duration: 360, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 360, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y, delay]);
  return <Animated.View style={[styles.dot, { transform: [{ translateY: y }] }]} />;
}

const styles = StyleSheet.create({
  shell: { flex: 1, overflow: 'hidden' },
  orb: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 999,
    ...({ filter: 'blur(120px)' } as any),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  brand: {
    ...Typography.h1,
    color: C.white,
    marginTop: 16,
    fontSize: 32,
    letterSpacing: -0.5,
  },
  tag: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});
