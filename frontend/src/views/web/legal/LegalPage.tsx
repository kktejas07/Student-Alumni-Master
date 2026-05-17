/**
 * Shared Legal Page — used by /legal/privacy, /legal/terms, /legal/cookies.
 *
 * Theme: FinTax360 Jewel-glass. Single template; content driven by props.
 * All copy is globally applicable boilerplate — Section IDs marked
 * `[REPLACE WITH LEGAL COPY]` MUST be reviewed by counsel before going live.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Shield, FileText, Cookie } from 'lucide-react-native';

import {
  AnimatedAurora, GridOverlay, GlassCard, Kicker,
} from '@/src/views/web/portals/student/glass';
import { PALETTE, TYPO } from '@/src/views/web/portals/student/tokens';
import { DashboardFooter } from '@/src/views/web/components/SponsorStrip';

export type LegalSection = { heading: string; body: string };
export type LegalDoc = {
  slug: 'privacy' | 'terms' | 'cookies';
  title: string;
  subtitle: string;
  effective: string;
  icon: 'shield' | 'file' | 'cookie';
  sections: LegalSection[];
};

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const router = useRouter();
  const Icon = doc.icon === 'shield' ? Shield : doc.icon === 'cookie' ? Cookie : FileText;
  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.bg0 }}>
      <LinearGradient
        pointerEvents="none"
        colors={[PALETTE.bg0, PALETTE.bg2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      <AnimatedAurora intensity="normal" />
      <GridOverlay />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ maxWidth: 880, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 }}>
          <Pressable onPress={() => router.back()} style={s.back}>
            <ArrowLeft size={14} color="rgba(255,255,255,0.85)" />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <View style={s.titleRow}>
            <View style={s.iconWrap}>
              <Icon size={22} color={PALETTE.violet} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Kicker color="rgba(167,139,250,0.85)">Legal</Kicker>
              <Text style={s.title}>{doc.title}</Text>
              <Text style={s.sub}>{doc.subtitle}</Text>
              <Text style={s.eff}>Effective: {doc.effective}</Text>
            </View>
          </View>

          <GlassCard radius={16} padding={28} style={{ gap: 20, marginTop: 24 }}>
            {doc.sections.map((sec, i) => (
              <View key={i} style={{ gap: 6 }}>
                <Text style={s.h2}>{sec.heading}</Text>
                <Text style={s.body}>{sec.body}</Text>
              </View>
            ))}
            <Text style={s.disclaimer}>
              This is the current version of our {doc.title}. We may update it from time to
              time; the &quot;Effective&quot; date above tracks the latest revision. Material
              changes will be surfaced inside the app the next time you sign in.
              For questions, contact{' '}
              <Text style={s.email}>legal@studentalumni.ai</Text>.
            </Text>
          </GlassCard>
        </View>
        <DashboardFooter portal="student" />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.85)', fontFamily: TYPO.body600, fontSize: 13 },
  titleRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.30)' },
  title: { color: '#fff', fontFamily: TYPO.display800, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  sub: { color: 'rgba(255,255,255,0.70)', fontFamily: TYPO.body500, fontSize: 14, marginTop: 6, lineHeight: 20 },
  eff: { color: 'rgba(255,255,255,0.50)', fontFamily: TYPO.mono500, fontSize: 11.5, marginTop: 8 },
  h2: { color: '#fff', fontFamily: TYPO.display700, fontSize: 16, marginTop: 2 },
  body: { color: 'rgba(255,255,255,0.74)', fontFamily: TYPO.body500, fontSize: 14, lineHeight: 22 },
  disclaimer: { color: 'rgba(255,255,255,0.55)', fontFamily: TYPO.body500, fontSize: 12.5, lineHeight: 20, marginTop: 4, fontStyle: 'italic' as any },
  email: { color: PALETTE.violet, fontFamily: TYPO.body600 },
});
