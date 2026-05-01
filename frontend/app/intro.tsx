/**
 * Intro / Onboarding Carousel — mobile-only first-time experience.
 *
 * Flow:
 *   Splash (app/index.tsx)
 *     → Intro carousel (this file)  [first launch only]
 *     → Login / Register
 *
 * On finish (or skip), we set AsyncStorage key `hasSeenIntro = "true"` so
 * subsequent launches go straight from splash → login.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Pressable,
  useWindowDimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

const SLIDES = [
  {
    emoji: '🚀',
    accent: ['rgba(124,58,237,0.55)', 'rgba(91,33,182,0.25)'],
    title: 'Your AI Career\nRoadmap',
    body: 'Personalized milestones, courses, and skills based on the career you want to build.',
  },
  {
    emoji: '🤝',
    accent: ['rgba(16,185,129,0.55)', 'rgba(5,150,105,0.25)'],
    title: '500+ Verified\nMentors',
    body: 'Book 1:1 sessions with alumni and industry experts who actually want to help you grow.',
  },
  {
    emoji: '💼',
    accent: ['rgba(245,158,11,0.55)', 'rgba(217,119,6,0.25)'],
    title: '10,000+ Internships\n& Jobs',
    body: 'Discover global opportunities curated to your goals — from tech to creative to research.',
  },
  {
    emoji: '🎉',
    accent: ['rgba(236,72,153,0.55)', 'rgba(190,24,93,0.25)'],
    title: "Let's Build\nYour Future",
    body: 'Create your free account and unlock your personalized dashboard, deals, and community.',
  },
];

export default function IntroCarousel() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const previewMode = params.preview === '1';
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // Mark intro as seen and route to auth.
  const finish = async (target: '/login' | '/register' = '/login') => {
    try { await AsyncStorage.setItem('hasSeenIntro', 'true'); } catch {}
    router.replace(`/(auth)${target}`);
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      setIndex((i) => i + 1);
    } else {
      finish('/register');
    }
  };

  // NOTE: index.tsx never routes web users here automatically (per spec).
  // If someone navigates to /intro directly on web, we still render so the
  // experience is previewable; native users get this naturally on first launch.

  return (
    <View style={styles.shell}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1A0438', '#2D0760', '#5F259F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative blurred orbs */}
      <View pointerEvents="none" style={[styles.orb, { top: '-12%', right: '-25%', backgroundColor: 'rgba(124,58,237,0.40)' }]} />
      <View pointerEvents="none" style={[styles.orb, { bottom: '-15%', left: '-25%', backgroundColor: 'rgba(236,72,153,0.30)' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Top bar — skip */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => finish('/login')} hitSlop={12} testID="intro-skip-btn">
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Carousel — render only active slide; transition via key change. */}
        <View style={{ flex: 1 }}>
          <Slide
            key={`slide-${index}`}
            item={SLIDES[index]}
            width={width}
          />
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, index === i && styles.dotActive]} />
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.ctaWrap}>
          {index === SLIDES.length - 1 ? (
            <>
              <Pressable
                onPress={() => finish('/register')}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                testID="intro-create-account-btn"
              >
                <Text style={styles.primaryText}>Create your account</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => finish('/login')}
                style={({ pressed }) => [
                  styles.ghostBtn,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                testID="intro-login-btn"
              >
                <Text style={styles.ghostText}>I already have an account</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              testID="intro-next-btn"
            >
              <Text style={styles.primaryText}>Next</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Slide ───────────────────────────────────────────────────────────────────
function Slide({
  item, width,
}: {
  item: typeof SLIDES[number];
  width: number;
}) {
  // Subtle "rise" animation when slide becomes active (only on initial mount).
  // We don't gate visibility on `active` so all slides remain visible during
  // horizontal paging on web (where FlatList paging behaves differently).
  const y = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 460, useNativeDriver: true }),
    ]).start();
  }, [y, op]);

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={{ opacity: op, transform: [{ translateY: y }], alignItems: 'center' }}>
        {/* Icon halo */}
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={item.accent as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGlow}
          />
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 64 }}>{item.emoji}</Text>
          </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </Animated.View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0F0820', overflow: 'hidden' },
  orb: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 999,
    ...({ filter: 'blur(120px)' } as any),
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 4,
  },
  skipText: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },
  iconGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 110,
    ...({ filter: 'blur(40px)' } as any),
  },
  iconCircle: {
    width: 156, height: 156,
    borderRadius: 78,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 12px 32px rgba(0,0,0,0.4)',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 320,
  },

  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  dotActive: {
    width: 28,
    backgroundColor: '#FFFFFF',
  },

  ctaWrap: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    paddingTop: 6,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 16,
    boxShadow: '0px 12px 24px rgba(124,58,237,0.5)',
  },
  primaryText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15.5,
  },
  ghostBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
  },
  ghostText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
});
