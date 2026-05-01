/**
 * AuthBrand — Left panel showing the SA logo, tagline, and stat pills.
 * Updated to match SA Auth Flow v2 spec:
 *   - Purple-violet gradient blobs (was white)
 *   - Lucide icon stat pills (was emoji pills)
 *   - Title 32px, sub 14px / line-height 1.7
 *   - Pill bg 0.08, border 0.12
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { GraduationCap, UserCheck, Building2 } from 'lucide-react-native';
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
  { Icon: GraduationCap, color: '#C4B5FD', text: '12,400+ Students' },
  { Icon: UserCheck,     color: '#5EEAD4', text: '500+ Mentors' },
  { Icon: Building2,     color: '#FCD34D', text: '200+ Colleges' },
];

export function AuthBrand({ minWidth = 980 }: { minWidth?: number }) {
  return (
    <LinearGradient
      colors={[AC.brandFrom, AC.brandTo] as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.wrap}
    >
      {/* Floating purple-violet gradient circles (matching v2 spec) */}
      <View style={[s.blob, { top: '-10%', right: '-15%', width: 280, height: 280, backgroundColor: 'rgba(124,58,237,0.20)' }]} />
      <View style={[s.blob, { bottom: '5%', left: '-10%', width: 200, height: 200, backgroundColor: 'rgba(139,92,246,0.15)' }]} />

      <View style={s.center}>
        <View style={s.logoWrap}>
          <SALogoBig size={72} />
        </View>
        <Text style={s.title}>Student Alumni</Text>
        <Text style={s.tagline}>AI-powered career guidance, internships, mentorship, and alumni networking.</Text>
        <View style={s.pills}>
          {PILLS.map((p) => (
            <View key={p.text} style={s.pill}>
              <p.Icon size={18} color={p.color} />
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
  center: { alignItems: 'center', maxWidth: 360, alignSelf: 'center', zIndex: 1 },
  logoWrap: { marginBottom: 20, ...(Platform.OS === 'web' ? ({ filter: 'drop-shadow(0 4px 24px rgba(255,255,255,0.30))' } as any) : {}) },
  title: { fontSize: 32, fontFamily: FONTS.xbold, color: '#fff', letterSpacing: -1, marginBottom: 10, textAlign: 'center', lineHeight: 37 },
  tagline: { fontSize: 14, fontFamily: FONTS.med, color: 'rgba(255,255,255,0.5)', lineHeight: 24, textAlign: 'center', maxWidth: 260, marginBottom: 16 },
  pills: { gap: 10, width: '100%', maxWidth: 260, marginTop: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pillText: { fontSize: 13, fontFamily: FONTS.bold, color: '#fff' },
});
