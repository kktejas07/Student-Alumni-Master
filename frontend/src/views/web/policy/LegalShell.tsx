import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

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
          <ChevronLeft size={18} color="#94a3b8" />
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
  scroll: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 20, paddingBottom: 60, maxWidth: 800, width: '100%', alignSelf: 'center', overflow: 'hidden' as any },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 50, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  backText: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 28, letterSpacing: -0.5, marginBottom: 8 },
  divider: { height: 2, width: 60, backgroundColor: '#F59E0B', borderRadius: 2, marginBottom: 24 },
});
