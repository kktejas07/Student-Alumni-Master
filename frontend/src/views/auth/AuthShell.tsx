/**
 * AuthShell — Responsive 2-pane wrapper.
 * Desktop (>= 980px): left brand panel + right form panel.
 * Mobile (< 980px):   single column, top compact brand strip.
 * Migrated to NativeWind className.
 */
import React from 'react';
import {View, Text, ScrollView, useWindowDimensions, Platform, KeyboardAvoidingView, Pressable, StyleSheet} from "react-native";
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AuthBrand } from './AuthBrand';
import { AC } from './tokens';
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
          <SvgText x="16" y="22.5" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="12" fill="#FFFFFF">SA</SvgText>
        </Svg>
        <View>
          <Text className="text-white font-display text-lg">StudentAlumni</Text>
          <Text className="text-white/85 font-body text-xs mt-0.5">AI-powered career platform</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

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
        <LinearGradient colors={[AC.bgFrom, AC.bgVia, AC.bgTo] as any} className="absolute inset-0" />
      )}

      {isDesktop ? (
        <View className="flex-1 flex-row">
          <View className="flex-1"><AuthBrand role={role || undefined} /></View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 min-w-[480px]">
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 56, paddingVertical: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
              <View className="w-full max-w-[460px] self-center bg-white rounded-3xl px-10 py-10"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.1, shadowRadius: 48, elevation: 10 }}>
                {children}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      ) : (
        <SafeAreaView className="flex-1" edges={['top']}>
          <MobileBrand />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 22, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
              <View className="w-full max-w-[460px] self-center bg-white rounded-3xl px-6 py-8"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 }}>
                {children}
              </View>
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
