/**
 * AuthShell — Responsive 2-pane wrapper.
 * Desktop (>= 980px): left brand panel + right form panel.
 * Mobile (< 980px):   single column, top compact brand strip.
 * Migrated to NativeWind className.
 */
import React from 'react';
import { View, Text, ScrollView, useWindowDimensions, Platform, KeyboardAvoidingView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AuthBrand } from './AuthBrand';
import { AC } from './tokens';
import { RoleThemeProvider } from './RoleTheme';
import { StarryBackground } from '../web/nexus-glow-landing/StarryBackground';

function MobileBrand() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/')}>
      <LinearGradient colors={[AC.brandFrom, AC.brandTo] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} className="flex-row items-center gap-3 px-[18px] py-3.5">
        <Svg width={28} height={33} viewBox="0 0 200 240" fill="none">
          <Path d="M100 4L196 36L196 120Q196 190 100 236Q4 190 4 120L4 36Z" fill="#7C3AED" />
          <SvgText x="100" y="158" textAnchor="middle" fontFamily="DM Sans" fontWeight="700" fontSize="88" fill="#FFFFFF" letterSpacing="-4">SA</SvgText>
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
    <View className="flex-1" style={Platform.OS !== 'web' ? { backgroundColor: AC.bgVia } : undefined}>
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
