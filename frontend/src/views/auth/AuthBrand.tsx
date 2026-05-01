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

/**
 * Role-specific branding — shown on the left panel below the SA shield when
 * the user has chosen a role (via get-started, register, email-detect, etc).
 * Each role gets its own emoji badge, title, tagline and 3 highlight pills.
 */
type Role = 'student' | 'mentor' | 'alumni' | 'college';

const ROLE_BRAND: Record<Role, {
  emoji: string;
  title: string;
  tagline: string;
  pills: { Icon: any; color: string; text: string }[];
}> = {
  student: {
    emoji: '🎓',
    title: 'Student',
    tagline: 'AI Career Guidance · Internships · Mentors',
    pills: [
      { Icon: GraduationCap, color: '#C4B5FD', text: 'AI Career Guidance\nPersonalised roadmap based on your goals' },
      { Icon: UserCheck,     color: '#5EEAD4', text: '10,000+ Internships\nGlobal opportunities matched to you' },
      { Icon: Building2,     color: '#FCD34D', text: '500+ Mentors\nAlumni who want to help you grow' },
    ],
  },
  mentor: {
    emoji: '👨‍💼',
    title: 'Mentor',
    tagline: 'Share your expertise · Build your brand · Earn',
    pills: [
      { Icon: UserCheck,     color: '#5EEAD4', text: 'Guide Students\n1:1 sessions on your schedule' },
      { Icon: Building2,     color: '#FCD34D', text: 'Build Credibility\nVerified mentor badge & profile' },
      { Icon: GraduationCap, color: '#C4B5FD', text: 'Earn Per Session\nSet your own price — ₹499 to ₹1499+' },
    ],
  },
  alumni: {
    emoji: '🎓',
    title: 'Alumni',
    tagline: 'Reconnect with your college · Mentor · Network',
    pills: [
      { Icon: Building2,     color: '#FCD34D', text: 'Reconnect\nFind classmates & batch-mates on SA' },
      { Icon: UserCheck,     color: '#5EEAD4', text: 'Give Back\nOptionally mentor students from your college' },
      { Icon: GraduationCap, color: '#C4B5FD', text: 'Industry Network\nConnect with alumni across top companies' },
    ],
  },
  college: {
    emoji: '🏫',
    title: 'College',
    tagline: 'Onboard students · Run events · Analytics',
    pills: [
      { Icon: GraduationCap, color: '#C4B5FD', text: 'Manage Students\nBulk onboard, verify, roster control' },
      { Icon: Building2,     color: '#FCD34D', text: 'Tenant Analytics\nEngagement, placements, outcomes' },
      { Icon: UserCheck,     color: '#5EEAD4', text: 'Alumni Engine\nRe-engage your alumni network' },
    ],
  },
};

export function AuthBrand({ role, minWidth = 980 }: { role?: Role | null; minWidth?: number }) {
  const isDefault = !role;
  const brand = !isDefault ? ROLE_BRAND[role] : null;
  const pills = brand?.pills ?? PILLS;
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
        {brand ? (
          <>
            <View style={s.roleBadge}>
              <Text style={s.roleEmoji}>{brand.emoji}</Text>
              <Text style={s.roleText}>{brand.title}</Text>
            </View>
            <Text style={s.title}>Student Alumni</Text>
            <Text style={s.tagline}>{brand.tagline}</Text>
          </>
        ) : (
          <>
            <Text style={s.title}>Student Alumni</Text>
            <Text style={s.tagline}>AI-powered career guidance, internships, mentorship, and alumni networking.</Text>
          </>
        )}
        <View style={s.pills}>
          {pills.map((p: any, i: number) => (
            <View key={p.text + i} style={s.pill}>
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
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 14,
  },
  roleEmoji: { fontSize: 15 },
  roleText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 13, letterSpacing: 0.3 },
  title: { fontSize: 32, fontFamily: FONTS.xbold, color: '#fff', letterSpacing: -1, marginBottom: 10, textAlign: 'center', lineHeight: 37 },
  tagline: { fontSize: 14, fontFamily: FONTS.med, color: 'rgba(255,255,255,0.5)', lineHeight: 24, textAlign: 'center', maxWidth: 260, marginBottom: 16 },
  pills: { gap: 10, width: '100%', maxWidth: 300, marginTop: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  pillText: { flex: 1, fontSize: 12, fontFamily: FONTS.bold, color: '#fff', lineHeight: 16 },
});
