/**
 * FeaturePageShell — shared layout for /deals, /rentals, /financial,
 * /career-ai, /higher-education.
 *
 * Uses the EXACT same purple gradient background + glass card treatment
 * as the main Student Dashboard (/platform), so every dashboard flow
 * shares the signature theme.
 *
 * Design reference: Student Alumni — Desktop.html
 *   • Page background: LinearGradient ['#1A0438','#2D0760','#5F259F']
 *     at stops [0, 0.45, 1]  (SA.pageBgStudent)
 *   • Glass hero card: rgba(95,37,159,0.28) with rgba(176,127,223,0.30)
 *     border + backdrop-filter blur(20px)
 *   • Ambient purple orbs floating in the gradient
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { SA } from '@/src/views/web/platform/tokens';

export default function FeaturePageShell({
  title, subtitle, accent = SA.purpleLight,
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
    <View style={{ flex: 1 }}>
      {/* Full-page purple gradient — identical to /platform dashboard */}
      <LinearGradient
        colors={SA.pageBgStudent as any}
        locations={SA.pageBgGradientStops as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient floating purple orbs for depth */}
      <View pointerEvents="none" style={[styles.ambientOrb, { top: -160, right: -140, width: 520, height: 520, backgroundColor: 'rgba(176,127,223,0.22)' }]} />
      <View pointerEvents="none" style={[styles.ambientOrb, { top: 280, left: -180, width: 440, height: 440, backgroundColor: 'rgba(95,37,159,0.28)' }]} />
      <View pointerEvents="none" style={[styles.ambientOrb, { bottom: -200, right: 100, width: 380, height: 380, backgroundColor: 'rgba(123,61,191,0.22)' }]} />

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

        {/* Hero — glass card with purple tint, matches platform hero */}
        <View style={styles.heroShell}>
          {/* Decorative orbs inside the hero for extra depth */}
          <View pointerEvents="none" style={[styles.heroOrb, { width: 280, height: 280, top: -80, right: -40, backgroundColor: 'rgba(176,127,223,0.22)' }]} />
          <View pointerEvents="none" style={[styles.heroOrb, { width: 180, height: 180, bottom: -50, left: 20, backgroundColor: 'rgba(212,170,255,0.18)' }]} />

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
  // Soft, blurred ambient orbs over the gradient
  ambientOrb: {
    position: 'absolute',
    borderRadius: 9999,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}),
  },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 32, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1,
    ...({ backdropFilter: 'blur(12px)', cursor: 'pointer' } as any),
  },
  backText: { color: '#fff', fontFamily: SA.fontBold, fontSize: 11.5 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ backdropFilter: 'blur(12px)' } as any),
  },

  // Glass hero — matches Platform "info" panel spec
  heroShell: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(176,127,223,0.30)',
    backgroundColor: 'rgba(95,37,159,0.28)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px -12px rgba(95,37,159,0.40), 0 0 0 1px rgba(176,127,223,0.15) inset',
        } as any)
      : {}),
  },
  heroBody: {
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    minHeight: 150,
    zIndex: 2,
  },
  heroOrb: { position: 'absolute', borderRadius: 9999 },
  heroEmoji: { fontSize: 30 },
  heroTitle: {
    color: '#fff',
    fontFamily: SA.fontBold,
    fontSize: 28,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: SA.fontMedium,
    fontSize: 14,
    marginTop: 4,
    maxWidth: 720,
  },
});
