/**
 * Splash / Welcome - Student Alumni branded
 *
 * Platform routing:
 *   - Web  -> renders new marketing LandingPage (purple dark theme, 8 sections).
 *   - iOS / Android -> keeps existing native welcome experience untouched.
 */
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Sparkles, Users, Globe, Calendar } from 'lucide-react-native';
import { Button, GlassCard, GradientBackground, SALogo } from '@/src/views/components';
import { Colors as C, Gradients, Spacing, Typography } from '@/src/theme';
import LandingPage from '@/src/views/web/LandingPage';

const { width } = Dimensions.get('window');

export default function Welcome() {
  // Web users see the marketing landing page instead of the mobile splash.
  if (Platform.OS === 'web') {
    return <LandingPage />;
  }
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <GradientBackground colors={Gradients.splash}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Decorative blobs */}
        <View style={[styles.blob, { top: -120, right: -80, backgroundColor: 'rgba(176,127,223,0.35)' }]} />
        <View style={[styles.blob, { bottom: -140, left: -100, backgroundColor: 'rgba(123,61,191,0.4)' }]} />

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            {/* Logo */}
            <View style={styles.logoRow}>
              <SALogo size={48} variant="glass" testID="welcome-logo" />
              <View>
                <Text style={styles.brand}>Student Alumni</Text>
                <Text style={styles.brandSub}>Career · Mentorship · Network</Text>
              </View>
            </View>

            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.tag}>
                <Sparkles size={12} color={C.white} />
                <Text style={styles.tagText}>AI POWERED · CLASS 11+</Text>
              </View>

              <Text style={styles.heroTitle}>
                Your career,{'\n'}
                <Text style={{ color: C.lightPurple }}>your roadmap.</Text>
              </Text>

              <Text style={styles.heroSubtitle}>
                Connect with global mentors & alumni, discover free courses, internships, exclusive
                deals — and build your future with AI guidance.
              </Text>

              <View style={styles.actions}>
                <Button
                  title="Get started"
                  variant="glass"
                  icon={<ArrowRight size={18} color={C.white} />}
                  onPress={() => router.push('/(auth)/email-detect')}
                  testID="welcome-get-started-btn"
                  size="lg"
                />
                <View style={{ height: 12 }} />
                <Button
                  title="I already have an account"
                  variant="ghost"
                  onPress={() => router.push('/(auth)/login')}
                  testID="welcome-login-btn"
                />
              </View>
            </View>

            {/* Stats glass row */}
            <View style={styles.stats}>
              <GlassCard style={styles.statCard} intensity="medium">
                <Users size={20} color={C.white} />
                <Text style={styles.statValue}>12,400+</Text>
                <Text style={styles.statLabel}>MEMBERS</Text>
              </GlassCard>
              <GlassCard style={styles.statCard} intensity="medium">
                <Globe size={20} color={C.white} />
                <Text style={styles.statValue}>46</Text>
                <Text style={styles.statLabel}>COUNTRIES</Text>
              </GlassCard>
              <GlassCard style={styles.statCard} intensity="medium">
                <Calendar size={20} color={C.white} />
                <Text style={styles.statValue}>200+</Text>
                <Text style={styles.statLabel}>EVENTS / YR</Text>
              </GlassCard>
            </View>

            {/* Roles */}
            <Text style={styles.section}>FOR EVERYONE IN YOUR JOURNEY</Text>
            <View style={styles.roles}>
              {[
                { label: 'Students', desc: 'Class 11+ onwards' },
                { label: 'Alumni', desc: 'Mentor the next gen' },
                { label: 'Mentors', desc: 'Industry leaders' },
                { label: 'Colleges', desc: 'Tenants & faculty' },
              ].map((r) => (
                <GlassCard key={r.label} style={styles.roleCard} intensity="low">
                  <Text style={styles.roleLabel}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </GlassCard>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.6 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.xl },
  brand: { ...Typography.subheading, color: C.white, fontSize: 18 },
  brandSub: { ...Typography.bodySm, color: C.textOnPurpleMuted, fontSize: 12 },
  hero: { marginTop: Spacing.md },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  tagText: { ...Typography.label, color: C.white, fontSize: 10 },
  heroTitle: { ...Typography.display, color: C.white, fontSize: 44, lineHeight: 48 },
  heroSubtitle: {
    ...Typography.bodyLg,
    color: C.textOnPurpleMuted,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actions: { gap: 4 },
  stats: { flexDirection: 'row', gap: 10, marginTop: Spacing.xl },
  statCard: { flex: 1, gap: 6, alignItems: 'flex-start', padding: 14 },
  statValue: { ...Typography.h3, color: C.white },
  statLabel: { ...Typography.label, color: C.textOnPurpleMuted, fontSize: 10 },
  section: { ...Typography.label, color: C.textOnPurpleMuted, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleCard: { width: (width - Spacing.lg * 2 - 10) / 2, padding: 14 },
  roleLabel: { ...Typography.subheading, color: C.white },
  roleDesc: { ...Typography.bodySm, color: C.textOnPurpleMuted, marginTop: 2 },
});
