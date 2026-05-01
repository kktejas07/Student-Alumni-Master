/**
 * FeaturePageShell — shared sidebar-wrapped page layout used by
 *   /deals, /rentals, /financial, /career-ai, /higher-education
 *
 * Keeps the left-side Student Alumni nav + top-bar + purple theme
 * consistent across every dashboard sub-route. Each page just
 * provides its own heading + body via <FeaturePageShell ...>{children}.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';

const C = {
  bg: '#0C0818',
  side: '#0E0A1F',
  border: 'rgba(255,255,255,0.08)',
  text: '#fff',
  text2: 'rgba(255,255,255,0.70)',
  text3: 'rgba(255,255,255,0.45)',
  purple: '#7C3AED',
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
      {/* Main column (full width — sidebar removed) */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isMobile ? 16 : 28, gap: 22, maxWidth: 1400, width: '100%', alignSelf: 'center' }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.replace('/platform')} style={styles.backBtn}>
            <ArrowLeft size={14} color="#fff" />
            <Text style={styles.backText}>Dashboard</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={styles.bellBtn}><Bell size={16} color="#fff" /></View>
        </View>

        {/* Hero */}
        <LinearGradient
          colors={[accent + '44', accent + '22', 'rgba(30,20,55,0.90)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={styles.heroEmoji}>{heroEmoji}</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
          </View>
          {rightSlot}
        </LinearGradient>

        {/* Page body */}
        <View style={{ gap: 18 }}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 260, padding: 18, backgroundColor: C.side, borderRightWidth: 1, borderRightColor: C.border, gap: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, ...({ cursor: 'pointer' } as any) },
  logoBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ backgroundImage: 'linear-gradient(135deg, #A78BFA, #7C3AED 55%, #6D28D9)' } as any) : {}) },
  logoTxt: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  brandTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  brandSub: { color: C.text3, fontFamily: 'DMSans_500Medium', fontSize: 11 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10, letterSpacing: 1.2, marginTop: 8, marginBottom: 6 },
  navRow: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 9, ...({ cursor: 'pointer' } as any) },
  navRowText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12.5 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  backText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { flexDirection: 'row', padding: 24, borderRadius: 18, gap: 18, alignItems: 'center', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1 },
  heroEmoji: { fontSize: 28 },
  heroTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 26, letterSpacing: -0.3 },
  heroSub: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 13.5, marginTop: 2 },
});
