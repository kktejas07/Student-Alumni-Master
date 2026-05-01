/**
 * Stub view — placeholder used until each spec view is fully ported.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { MC, FONTS } from './tokens';

export function StubView({ title, note }: { title: string; note?: string }) {
  return (
    <View style={s.shell}>
      <View style={s.box}>
        <View style={s.icon}><Sparkles size={22} color={MC.tealP} /></View>
        <Text style={s.title}>{title}</Text>
        <Text style={s.body}>
          {note || 'This view is being ported from the HTML spec to true React Native. Coming next.'}
        </Text>
        <Text style={s.hint}>
          Tip: while we finish porting, the original iframe version is still live at /mentor-portal?legacy=1.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  box: {
    maxWidth: 520, alignItems: 'center', gap: 12,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 18, padding: 32,
  },
  icon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderColor: MC.border2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, textAlign: 'center' },
  body: { color: MC.muted, fontFamily: FONTS.med, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  hint: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 },
});
