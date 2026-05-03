/**
 * AuthShell — Responsive 2-pane wrapper.
 * Desktop (>= 980px): left brand panel + right form panel.
 * Mobile (< 980px):   single column, top compact brand strip.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AuthBrand } from './AuthBrand';
import { AC, FONTS } from './tokens';
import { RoleThemeProvider } from './RoleTheme';

function MobileBrand() {
  return (
    <LinearGradient colors={[AC.brandFrom, AC.brandTo] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ms.bar}>
      <Svg width={28} height={33} viewBox="0 0 200 240" fill="none">
        <Path d="M100 4L196 36L196 120Q196 190 100 236Q4 190 4 120L4 36Z" fill="white" />
        <SvgText x="100" y="158" textAnchor="middle" fontFamily="DM Sans" fontWeight="700" fontSize="88" fill="#7C3AED" letterSpacing="-4">SA</SvgText>
      </Svg>
      <View>
        <Text style={ms.title}>Student Alumni</Text>
        <Text style={ms.sub}>AI-powered career platform</Text>
      </View>
    </LinearGradient>
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
    <View style={[s.root, { backgroundColor: AC.bgVia }]}>
      <LinearGradient colors={[AC.bgFrom, AC.bgVia, AC.bgTo] as any} style={StyleSheet.absoluteFill} />

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
  left: { flex: 1, maxWidth: 560 },
  right: { flex: 1, minWidth: 480 },
  formScroll: { flexGrow: 1, paddingHorizontal: 56, paddingVertical: 64 },
  formCol: { width: '100%', maxWidth: 460, alignSelf: 'center', flex: 1, justifyContent: 'center' },
  mobileScroll: { flexGrow: 1, padding: 22 },
  mobileForm: { width: '100%', maxWidth: 460, alignSelf: 'center', flex: 1, justifyContent: 'center', paddingTop: 24, paddingBottom: 32 },
});
