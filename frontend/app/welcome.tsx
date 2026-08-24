/**
 * Splash / Welcome - Student Alumni branded
 *
 * Platform routing:
 *   - Web  -> renders new marketing LandingPage (purple dark theme, 8 sections).
 *   - iOS / Android -> keeps existing native welcome experience untouched.
 */
import { useEffect, useRef } from 'react';
import { View, Text, Animated, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Sparkles, Users, Globe, Calendar } from 'lucide-react-native';
import { Button, GlassCard, GradientBackground, SALogo } from '@/src/views/components';
import { Colors as C, Gradients, Spacing, Typography } from '@/src/theme';
import { LandingPageModernRN } from '@/src/views/web/nexus-glow-landing/LandingPageModernRN';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  if (Platform.OS === 'web') {
    return <LandingPageModernRN />;
  }

  return (
    <GradientBackground colors={Gradients.splash}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="absolute w-80 h-80 rounded-full opacity-60" style={{ top: -120, right: -80, backgroundColor: 'rgba(176,127,223,0.35)' }} />
        <View className="absolute w-80 h-80 rounded-full opacity-60" style={{ bottom: -140, left: -100, backgroundColor: 'rgba(123,61,191,0.4)' }} />

        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <View className="flex-row items-center gap-3 mb-5">
              <SALogo size={48} variant="glass" testID="welcome-logo" />
              <View>
                <Text className="font-display-bold text-lg text-text">Student Alumni</Text>
                <Text className="text-muted text-xs">Career · Mentorship · Network</Text>
              </View>
            </View>

            <View className="mt-4">
              <View className="flex-row items-center gap-1.5 self-start bg-glass border border-glass-border rounded-full px-3 py-1.5 mb-4">
                <Sparkles size={12} color={C.white} />
                <Text className="text-text text-xs font-body-semibold">AI POWERED · CLASS 11+</Text>
              </View>

              <Text className="text-text text-5xl font-body-bold leading-12">
                Your career,{'\n'}
                <Text className="text-violet">your roadmap.</Text>
              </Text>

              <Text className="text-muted text-base mt-4 mb-5">
                Connect with global mentors & alumni, discover free courses, exclusive
                deals — and build your future with AI guidance.
              </Text>

              <View className="gap-1">
                <Button
                  title="Get started"
                  variant="glass"
                  icon={<ArrowRight size={18} color={C.white} />}
                  onPress={() => router.push('/(auth)/email-detect')}
                  testID="welcome-get-started-btn"
                  size="lg"
                />
                <View className="h-3" />
                <Button
                  title="I already have an account"
                  variant="ghost"
                  onPress={() => router.push('/(auth)/login')}
                  testID="welcome-login-btn"
                />
              </View>
            </View>

            <View className="flex-row gap-2.5 mt-5">
              <GlassCard className="flex-1 gap-1.5 items-start p-3.5" intensity="medium">
                <Users size={20} color={C.white} />
                <Text className="text-text font-display-bold text-base">12,400+</Text>
                <Text className="text-muted text-xs font-body-semibold">MEMBERS</Text>
              </GlassCard>
              <GlassCard className="flex-1 gap-1.5 items-start p-3.5" intensity="medium">
                <Globe size={20} color={C.white} />
                <Text className="text-text font-display-bold text-base">46</Text>
                <Text className="text-muted text-xs font-body-semibold">COUNTRIES</Text>
              </GlassCard>
              <GlassCard className="flex-1 gap-1.5 items-start p-3.5" intensity="medium">
                <Calendar size={20} color={C.white} />
                <Text className="text-text font-display-bold text-base">200+</Text>
                <Text className="text-muted text-xs font-body-semibold">EVENTS / YR</Text>
              </GlassCard>
            </View>

            <Text className="text-muted text-xs mt-5 mb-2 font-body-semibold">FOR EVERYONE IN YOUR JOURNEY</Text>
            <View className="flex-row flex-wrap gap-2.5">
              {[
                { label: 'Students', desc: 'Class 11+ onwards' },
                { label: 'Alumni', desc: 'Mentor the next gen' },
                { label: 'Mentors', desc: 'Industry leaders' },
                { label: 'Colleges', desc: 'Tenants & faculty' },
              ].map((r) => (
                <GlassCard key={r.label} className="p-3.5" intensity="low" style={{ width: (width - Spacing.lg * 2 - 10) / 2 }}>
                  <Text className="font-display-bold text-base text-text">{r.label}</Text>
                  <Text className="text-muted text-xs mt-0.5">{r.desc}</Text>
                </GlassCard>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
