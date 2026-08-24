import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';

export function StubView({ title, note }: { title: string; note: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: SAC.card, borderColor: SAC.border2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Sparkles size={26} color={SAC.accent} />
      </View>
      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', maxWidth: 460, lineHeight: 20 }}>{note}</Text>
    </View>
  );
}
