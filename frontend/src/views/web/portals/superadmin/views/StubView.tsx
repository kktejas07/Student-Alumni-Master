/**
 * Super Admin Portal — stub view for unbuilt nav items.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { SAC, useSAC, FONTS, resolveColors } from '../tokens';

export function StubView({ title, note }: { title: string; note: string }) {
  const T = useSAC();
  Object.assign(s, resolveColors(s, T));
  return (
    <View style={s.wrap}>
      <View style={s.icon}><Sparkles size={26} color={SAC.accent} /></View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.note}>{note}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  icon: { width: 60, height: 60, borderRadius: 16, backgroundColor: SAC.card, borderColor: SAC.border2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginBottom: 8 },
  note:  { color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', maxWidth: 460, lineHeight: 20 },
});
