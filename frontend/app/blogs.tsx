/**
 * Blogs - stub page (shared web + mobile). Will be expanded later.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react-native';
import { Colors as C, Typography, Spacing, Radius } from '@/src/theme';
import { GradientBackground } from '@/src/views/components';

const SAMPLE_POSTS = [
  {
    title: 'How I Landed My Dream Internship via Student Alumni',
    excerpt:
      'A second-year IIT Delhi student shares the exact playbook — from cold-emailing alumni to acing the case study round.',
    author: 'Aanya Sharma · IIT Delhi',
    minutes: 5,
  },
  {
    title: 'The Hidden Cost of Student Housing (and How to Avoid It)',
    excerpt:
      'Brokerage, security deposits, hidden maintenance fees — here’s a transparent breakdown of what every student should ask before signing.',
    author: 'Editorial Team',
    minutes: 7,
  },
  {
    title: 'Top 10 Hackathons to Win This Semester',
    excerpt:
      'Curated list of open hackathons across India and abroad — with prize pools, eligibility, and registration deadlines.',
    author: 'Community Curator',
    minutes: 4,
  },
  {
    title: 'Building a Startup While in College: Real Stories',
    excerpt:
      'Three founders share what worked, what failed, and how they balanced GPA with growth metrics.',
    author: 'Startup Desk',
    minutes: 9,
  },
];

export default function BlogsPage() {
  const router = useRouter();
  return (
    <GradientBackground colors={['#3D1468', '#5F259F'] as const}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={18} color={C.white} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.headerRow}>
            <View style={styles.iconBubble}>
              <BookOpen size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Community Blogs</Text>
              <Text style={styles.sub}>
                Stories from peers, guides from mentors, news from your campus.
              </Text>
            </View>
          </View>

          <View style={styles.comingSoonPill}>
            <Sparkles size={14} color={C.lightPurple} />
            <Text style={styles.comingSoonText}>Editorial launching soon — sneak peek below</Text>
          </View>

          {SAMPLE_POSTS.map((p, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <Text style={styles.cardExcerpt}>{p.excerpt}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{p.author}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{p.minutes} min read</Text>
              </View>
            </View>
          ))}

          <View style={{ height: 60 }} />
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

  comingSoonPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  comingSoonText: {
    ...Typography.bodySm,
    color: C.white,
    fontFamily: 'DMSans_600SemiBold',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
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
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaText: { ...Typography.bodySm, color: C.textOnPurpleMuted },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
});
