import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { Sparkles, Users, Briefcase, GraduationCap } from 'lucide-react-native';
import { AC, FONTS } from './tokens';

function SALogoBig({ size = 48 }: { size?: number }) {
  return (
    <View style={s.logoRow}>
      <Image
        source={require('../../../assets/images/sa-icon.png')}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
      <View>
        <Text style={s.logoTitle}>StudentAlumni</Text>
      </View>
    </View>
  );
}

export function AuthBrand({ role, minWidth = 980 }: { role?: any; minWidth?: number }) {
  const router = useRouter();
  return (
    <View style={s.wrap}>
      <Pressable style={s.topLogo} onPress={() => router.push('/')}>
        <SALogoBig size={40} />
      </Pressable>

      {/* Subtle purple glow matching the design */}
      <View style={[s.blob, { top: '20%', left: '-20%', width: 500, height: 500, backgroundColor: 'rgba(124,58,237,0.15)' }]} />

      <View style={s.content}>
        <Text style={s.title}>
          Turn ambition{'\n'}into <Text style={s.purpleText}>opportunity.</Text>
        </Text>
        
        <Text style={s.tagline}>
          Connect with mentors, discover internships, and accelerate your future all in one place built for students.
        </Text>

        <View style={s.features}>
          <View style={s.featureRow}>
            <View style={s.iconBox}><Sparkles size={20} color="#C4B5FD" /></View>
            <Text style={s.featureText}>AI Career Guidance</Text>
          </View>
          <View style={s.featureRow}>
            <View style={s.iconBox}><Users size={20} color="#C4B5FD" /></View>
            <Text style={s.featureText}>Mentor Connections</Text>
          </View>
          <View style={s.featureRow}>
            <View style={s.iconBox}><Briefcase size={20} color="#C4B5FD" /></View>
            <Text style={s.featureText}>Jobs & Internships</Text>
          </View>
          <View style={s.featureRow}>
            <View style={s.iconBox}><GraduationCap size={20} color="#C4B5FD" /></View>
            <Text style={s.featureText}>Alumni Network</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCol}>
            <Text style={s.statNum}>12.4K+</Text>
            <Text style={s.statLabel}>Students</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.statNum}>500+</Text>
            <Text style={s.statLabel}>Mentors</Text>
          </View>
          <View style={s.statCol}>
            <Text style={s.statNum}>200+</Text>
            <Text style={s.statLabel}>Colleges</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 48, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  topLogo: { position: 'absolute', top: 24, left: 48 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 18, lineHeight: 20 },
  blob: { position: 'absolute', borderRadius: 9999, ...(Platform.OS === 'web' ? ({ filter: 'blur(100px)' } as any) : {}) },
  content: { width: '100%', maxWidth: 500, marginTop: 20 },
  title: { fontSize: 52, fontFamily: FONTS.xbold, color: '#fff', letterSpacing: -1.2, lineHeight: 60, marginBottom: 16 },
  purpleText: { color: '#6366F1' }, // Indigo/Purple match
  tagline: { fontSize: 15, fontFamily: FONTS.med, color: 'rgba(255,255,255,0.7)', lineHeight: 24, marginBottom: 40, maxWidth: 420 },
  
  features: { gap: 20, marginBottom: 48 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  featureText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 32 },
  statCol: { gap: 4 },
  statNum: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.5 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 12 },
});


