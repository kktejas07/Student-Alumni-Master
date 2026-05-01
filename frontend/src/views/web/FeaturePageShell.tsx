/**
 * FeaturePageShell — shared layout for /deals, /rentals, /financial,
 * /career-ai, /higher-education.
 *
 * Enforces the signature Student Alumni purple gradient theme across
 * every dashboard sub-route:
 *   • Hero uses the same ['#5F259F','#7B3DBF','#2D0760'] gradient as
 *     the main /platform dashboard hero, with decorative purple orbs.
 *   • Subtle purple radial glow on the page background.
 *   • Top bar with "← Dashboard" pill + notifications bell.
 *
 * Individual pages may still pass their own `accent` which is used
 * only for the small right-slot pill highlight — the hero itself is
 * always purple so the dashboard feels cohesive.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, ArrowRight } from 'lucide-react-native';

const C = {
  bg: '#0C0818',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.70)',
  text3: 'rgba(255,255,255,0.45)',
};

export default function FeaturePageShell({
  title, subtitle, accent = '#A78BFA',
  heroEmoji = '✨',
  children,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  heroEmoji?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Ambient purple glow across the page background */}
      <View pointerEvents="none" style={styles.ambientOrbA} />
      <View pointerEvents="none" style={styles.ambientOrbB} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isMobile ? 16 : 28, gap: 22, maxWidth: 1400, width: '100%', alignSelf: 'center' }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.replace('/platform')} style={styles.backBtn}>
            <ArrowLeft size={14} color="#fff" />
            <Text style={styles.backText}>Dashboard</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={styles.bellBtn}><Bell size={16} color="#fff" /></View>
        </View>

        {/* Hero — signature purple gradient */}
        <View style={styles.heroShell}>
          <LinearGradient
            colors={['#5F259F', '#7B3DBF', '#2D0760']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Decorative purple orbs inside the hero */}
          <View pointerEvents="none" style={[styles.heroOrb, { width: 300, height: 300, top: -80, right: -40, backgroundColor: 'rgba(176,127,223,0.18)' }]} />
          <View pointerEvents="none" style={[styles.heroOrb, { width: 180, height: 180, bottom: -40, left: 20, backgroundColor: 'rgba(95,37,159,0.28)' }]} />
          <View pointerEvents="none" style={[styles.heroOrb, { width: 220, height: 220, top: 20, left: '38%' as any, backgroundColor: 'rgba(124,58,237,0.14)' }]} />

          <View style={[styles.heroBody, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text style={styles.heroEmoji}>{heroEmoji}</Text>
              <Text style={[styles.heroTitle, isMobile && { fontSize: 22, lineHeight: 28 }]}>{title}</Text>
              {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
            </View>
            {rightSlot}
          </View>
        </View>

        {/* Page body */}
        <View style={{ gap: 18 }}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Ambient background orbs (visible through content for subtle depth)
  ambientOrbA: {
    position: 'absolute',
    top: -160, right: -180,
    width: 520, height: 520, borderRadius: 260,
    backgroundColor: 'rgba(95,37,159,0.22)',
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}),
  },
  ambientOrbB: {
    position: 'absolute',
    top: 280, left: -200,
    width: 460, height: 460, borderRadius: 230,
    backgroundColor: 'rgba(123,61,191,0.16)',
    ...(Platform.OS === 'web' ? ({ filter: 'blur(90px)' } as any) : {}),
  },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  backText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero shell — absolute purple theme, consistent across all pages
  heroShell: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(176,127,223,0.30)',
    // match the dashboard hero glow
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px -16px rgba(95,37,159,0.55)' } as any) : {}),
  },
  heroBody: {
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    minHeight: 140,
  },
  heroOrb: { position: 'absolute', borderRadius: 999 },
  heroEmoji: { fontSize: 30 },
  heroTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 28, letterSpacing: -0.4, lineHeight: 34 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontFamily: 'DMSans_500Medium', fontSize: 14, marginTop: 4, maxWidth: 720 },
});
