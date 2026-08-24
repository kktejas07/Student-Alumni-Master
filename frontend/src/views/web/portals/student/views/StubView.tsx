/**
 * Generic placeholder for nav items not yet ported.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Sparkles, ArrowRight } from '../iconShims';
import { useRouter } from 'expo-router';
import { SC, FONTS } from '../tokens';

export function StubView({ title, note, deepLink }: { title: string; note: string; deepLink?: string }) {
  const router = useRouter();
  return (
    <View style={s.wrap}>
      <View style={s.icon}><Sparkles size={26} color={SC.accent} /></View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.note}>{note}</Text>
      {deepLink && (
        <Pressable onPress={() => router.push(deepLink as any)} style={({ hovered }: any) => [s.cta, hovered && { backgroundColor: SC.primaryL }]}>
          <Text style={s.ctaText}>Open standalone page</Text>
          <ArrowRight size={14} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  icon: { width: 60, height: 60, borderRadius: 16, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginBottom: 8 },
  note:  { color: SC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', maxWidth: 460, lineHeight: 20 },
  cta:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SC.primary, borderRadius: 10, paddingHorizontal: 16, height: 38, marginTop: 18 },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
});
