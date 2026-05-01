/**
 * AuthBrand — Left panel showing the SA logo, tagline, and stat pills.
 * Only rendered on web/desktop (>= 980px).
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { AC, FONTS } from './tokens';

function SALogoBig({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 200 240" fill="none">
      <Path d="M100 4L196 36L196 120Q196 190 100 236Q4 190 4 120L4 36Z" fill="white" />
      <SvgText x="100" y="158" textAnchor="middle" fontFamily="DM Sans" fontWeight="700" fontSize="88" fill="#7C3AED" letterSpacing="-4">SA</SvgText>
    </Svg>
  );
}

const PILLS = [
  { emoji: '🎓', text: '12,400+ Students' },
  { emoji: '👨\u200D💼', text: '500+ Mentors' },
  { emoji: '🏆', text: '200+ Colleges' },
];

export function AuthBrand({ minWidth = 980 }: { minWidth?: number }) {
  return (
    <LinearGradient
      colors={[AC.brandFrom, AC.brandTo] as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.wrap}
    >
      {/* Floating gradient circles */}
      <View style={[s.blob, { top: -60, right: -50, width: 280, height: 280, backgroundColor: 'rgba(255,255,255,0.10)' }]} />
      <View style={[s.blob, { bottom: 40, left: -60, width: 220, height: 220, backgroundColor: 'rgba(157,92,246,0.18)' }]} />

      <View style={s.center}>
        <View style={s.logoWrap}>
          <SALogoBig size={72} />
        </View>
        <Text style={s.title}>Student Alumni</Text>
        <Text style={s.tagline}>AI-powered career guidance, internships, mentorship, and alumni networking.</Text>
        <View style={s.pills}>
          {PILLS.map((p) => (
            <View key={p.text} style={s.pill}>
              <Text style={s.pillEmoji}>{p.emoji}</Text>
              <Text style={s.pillText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 40, justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  blob: { position: 'absolute', borderRadius: 999, ...(Platform.OS === 'web' ? ({ filter: 'blur(70px)' } as any) : {}) },
  center: { alignItems: 'center', maxWidth: 360, alignSelf: 'center' },
  logoWrap: { marginBottom: 24, ...(Platform.OS === 'web' ? ({ filter: 'drop-shadow(0 4px 24px rgba(255,255,255,0.30))' } as any) : {}) },
  title: { fontSize: 36, fontFamily: FONTS.xbold, color: '#fff', letterSpacing: -1, marginBottom: 12, textAlign: 'center' },
  tagline: { fontSize: 14, fontFamily: FONTS.med, color: 'rgba(255,255,255,0.75)', lineHeight: 22, textAlign: 'center', maxWidth: 280, marginBottom: 24 },
  pills: { gap: 10, width: '100%', maxWidth: 260 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  pillEmoji: { fontSize: 18 },
  pillText: { fontSize: 13, fontFamily: FONTS.bold, color: '#fff' },
});
