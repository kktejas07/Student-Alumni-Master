/**
 * College Admin Portal — stub view for nav items not yet ported.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';

export function StubView({ title, note }: { title: string; note: string }) {
  return (
    <View style={s.wrap}>
      <View style={s.icon}><Sparkles size={26} color={CC.accent} /></View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.note}>{note}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  icon: { width: 60, height: 60, borderRadius: 16, backgroundColor: CC.card, borderColor: CC.border2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginBottom: 8 },
  note:  { color: CC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', maxWidth: 460, lineHeight: 20 },
});
