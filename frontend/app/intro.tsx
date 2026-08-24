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
  View, Text, Animated, Easing, Pressable,
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
    emoji: '🚀',
    accent: ['rgba(245,158,11,0.55)', 'rgba(217,119,6,0.25)'],
    title: 'Skill & Career\nRoadmaps',
    body: 'Discover AI-driven learning pathways curated to your goals — from tech to creative to research.',
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

  return (
    <View className="flex-1 overflow-hidden bg-navy">
      <LinearGradient
        colors={['#1A0438', '#2D0760', '#5F259F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View pointerEvents="none" className="absolute w-90 h-90 rounded-full" style={{ top: '-12%', right: '-25%', backgroundColor: 'rgba(124,58,237,0.40)', filter: 'blur(120px)' } as any} />
      <View pointerEvents="none" className="absolute w-90 h-90 rounded-full" style={{ bottom: '-15%', left: '-25%', backgroundColor: 'rgba(236,72,153,0.30)', filter: 'blur(120px)' } as any} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-5 pt-1.5 pb-1">
          <View className="flex-1" />
          <Pressable onPress={() => finish('/login')} hitSlop={12} testID="intro-skip-btn">
            <Text className="text-muted text-base font-body-semibold py-2 px-1.5">Skip</Text>
          </Pressable>
        </View>

        <View className="flex-1">
          <Slide key={`slide-${index}`} item={SLIDES[index]} width={width} />
        </View>

        <View className="flex-row justify-center items-center gap-2 pt-2 pb-2.5">
          {SLIDES.map((_, i) => (
            <View key={i} className="w-2 h-2 rounded-full" style={index === i ? { width: 28, backgroundColor: '#FFFFFF' } : { backgroundColor: 'rgba(255,255,255,0.20)' }} />
          ))}
        </View>

        <View className="px-5 pb-4.5 pt-1.5 gap-2.5">
          {index === SLIDES.length - 1 ? (
            <>
              <Pressable
                onPress={() => finish('/register')}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 16, boxShadow: '0px 12px 24px rgba(124,58,237,0.5)' },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                testID="intro-create-account-btn"
              >
                <Text className="text-text font-body-bold text-sm">Create your account</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                onPress={() => finish('/login')}
                style={({ pressed }) => [
                  { paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                testID="intro-login-btn"
              >
                <Text className="text-muted text-base font-body-semibold">I already have an account</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 16, boxShadow: '0px 12px 24px rgba(124,58,237,0.5)' },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              testID="intro-next-btn"
            >
              <Text className="text-text font-body-bold text-sm">Next</Text>
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
  const y = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(op, { toValue: 1, duration: 460, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [y, op]);

  return (
    <View className="flex-1 items-center justify-center px-8" style={{ width }}>
      <Animated.View style={{ opacity: op, transform: [{ translateY: y }], alignItems: 'center' }}>
        <View className="w-55 h-55 items-center justify-center mb-9">
          <LinearGradient
            colors={item.accent as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 110, filter: 'blur(40px)' } as any}
          />
          <View className="w-39 h-39 rounded-full bg-glass border border-glass-border items-center justify-center" style={{ boxShadow: '0px 12px 32px rgba(0,0,0,0.4)' }}>
            <Text className="text-6xl">{item.emoji}</Text>
          </View>
        </View>

        <Text className="text-text font-body-bold text-3xl text-center mb-3.5" style={{ lineHeight: 38, letterSpacing: -0.6 }}>{item.title}</Text>
        <Text className="text-muted text-base text-center" style={{ lineHeight: 23, maxWidth: 320 }}>{item.body}</Text>
      </Animated.View>
    </View>
  );
}
