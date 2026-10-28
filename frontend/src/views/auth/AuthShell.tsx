/**
 * AuthShell — Responsive 2-pane wrapper.
 * Desktop (>= 980px): left brand panel + right form panel.
 * Mobile (< 980px):   single column, top compact brand strip.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Platform, KeyboardAvoidingView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AuthBrand } from './AuthBrand';
import { AC, FONTS } from './tokens';
import { RoleThemeProvider } from './RoleTheme';
import { StarryBackground } from '../web/nexus-glow-landing/StarryBackground';
import { SAWatermark } from '../web/components/SAWatermark';

function MobileBrand() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/')}>
      <LinearGradient colors={[AC.brandFrom, AC.brandTo] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ms.bar}>
        <Svg width={28} height={33} viewBox="0 0 32 36" fill="none">
          <Path d="M16 2 L29 6.5 v13.5 c0 9 -7.5 13.5 -13 16 C10.5 33.5 3 29 3 20 V6.5 Z" fill="#D8B6FF" />
          <Path d="M16 4.5 L26.5 8.2 v11.8 c0 7 -6 11 -10.5 13 C11.5 31 5.5 27 5.5 20 V8.2 Z" fill="#7C3AED" />
          <SvgText x="16" y="22.5" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontWeight="800" fontSize="12" fill="#FFFFFF">SA</SvgText>
        </Svg>
        <View>
          <Text style={ms.title}>StudentAlumni</Text>
          <Text style={ms.sub}>AI-powered career platform</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const ms = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  sub: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
});

export function AuthShell({ children, role }: { children: React.ReactNode; role?: 'student' | 'mentor' | 'alumni' | 'college' | null }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;

  return (
    <RoleThemeProvider role={role}>
    <View style={[s.root, Platform.OS !== 'web' && { backgroundColor: AC.bgVia }]}>
      <SAWatermark opacity={0.11} size={720} top={80} right={20} rotation="0deg" />
      {Platform.OS === 'web' ? (
        <StarryBackground />
      ) : (
        <LinearGradient colors={[AC.bgFrom, AC.bgVia, AC.bgTo] as any} style={StyleSheet.absoluteFill} />
      )}

      {isDesktop ? (
        <View style={s.row}>
          <View style={s.left}><AuthBrand role={role || undefined} /></View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.right}>
            <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
              <View style={s.formCol}>{children}</View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      ) : (
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <MobileBrand />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.mobileScroll} keyboardShouldPersistTaps="handled">
              <View style={s.mobileForm}>{children}</View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </View>
    </RoleThemeProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  left: { flex: 1 },
  right: { flex: 1, minWidth: 480 },
  formScroll: { flexGrow: 1, paddingHorizontal: 56, paddingVertical: 24, justifyContent: 'center' },
  formCol: { 
    width: '100%', 
    maxWidth: 480, 
    alignSelf: 'center',
    backgroundColor: 'rgba(12, 14, 27, 0.88)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.25)',
    paddingHorizontal: 36,
    paddingVertical: 36,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 24px 60px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,132,255,0.15)',
    } as any) : {}),
  },
  mobileScroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  mobileForm: { 
    width: '100%', 
    maxWidth: 460, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(12, 14, 27, 0.88)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.25)',
    paddingHorizontal: 22,
    paddingVertical: 28,
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 20px 50px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(139,132,255,0.15)',
    } as any) : {}),
  },
});
