import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users } from 'lucide-react-native';
import { Colors as C, Typography, Spacing, Radius } from '@/src/theme';
import { GradientBackground } from '@/src/views/components';

export default function CommunityPage() {
  const router = useRouter();
  return (
    <GradientBackground colors={['#3D1468', '#5F259F'] as const}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}>
            <ArrowLeft size={18} color={C.white} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.headerRow}>
            <View style={styles.iconBubble}>
              <Users size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Community</Text>
              <Text style={styles.sub}>
                Connect with mentors, peers, and alumni.
              </Text>
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coming Soon</Text>
            <Text style={styles.cardExcerpt}>Our community hub is currently under construction. Stay tuned!</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: Spacing.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  backText: { ...Typography.bodyBold, color: C.white },
  headerRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 8 },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: { ...Typography.h1, color: C.white, fontSize: 30 },
  sub: { ...Typography.body, color: C.textOnPurpleMuted, marginTop: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  cardTitle: {
    ...Typography.h3,
    color: C.white,
    fontSize: 20,
  },
  cardExcerpt: {
    ...Typography.body,
    color: C.textOnPurpleMuted,
    marginTop: 8,
    lineHeight: 22,
  }
});
