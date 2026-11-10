import React from 'react';
import { Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { COLORS } from '@/src/theme/tokens';

interface LegalShellProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalShell({ title, children }: LegalShellProps) {
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Animated.View entering={FadeIn.duration(300)}>
        <Pressable onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }} style={s.back}>
          <ChevronLeft size={18} color={COLORS.textS} />
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.title}>{title}</Text>
        <Text style={s.divider} />
        {children}
      </Animated.View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 140, paddingBottom: 80, maxWidth: 800, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 50, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  backText: { color: COLORS.textS, fontFamily: FONTS.med, fontSize: 14 },
  title: { color: COLORS.text, fontFamily: FONTS.xbold, fontSize: 28, lineHeight: 37, overflow: 'visible', letterSpacing: -0.5, marginBottom: 8 },
  divider: { height: 2, width: 60, backgroundColor: COLORS.amber, borderRadius: 2, marginBottom: 24 },
});
