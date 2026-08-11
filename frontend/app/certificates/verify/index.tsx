import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import {
  ShieldCheck, Award, ScanSearch, ArrowRight, BadgeCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

export default function CertificateVerifyIndex() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      setError('Enter a certificate code to verify.');
      return;
    }
    setError('');
    router.push(`/certificates/verify/${encodeURIComponent(c)}`);
  };

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backArrow}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          </Pressable>
          <Text style={s.title}>Verify Certificate</Text>
        </View>

        <LinearGradient
          colors={['rgba(167,139,250,0.16)', 'rgba(124,58,237,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroIconWrap}>
            <BadgeCheck size={30} color="#C4B5FD" />
          </View>
          <Text style={s.heroTitle}>Is this certificate genuine?</Text>
          <Text style={s.heroSub}>
            Enter the verification code printed on the certificate. If it was
            issued by Student Alumni, we'll confirm it instantly — the same way
            Coursera verifies credentials.
          </Text>
          <View style={s.codeInputRow}>
            <TextInput
              value={code}
              onChangeText={(t) => { setCode(t); setError(''); }}
              placeholder="e.g. SA-XXXX-XXXX"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="characters"
              autoCorrect={false}
              style={s.codeInput}
              onSubmitEditing={submit}
              testID="cert-code-input"
            />
            <Pressable onPress={submit} style={s.verifyBtn} testID="cert-verify-btn">
              <Text style={s.verifyBtnText}>Verify</Text>
              <ArrowRight size={16} color="#1e1b4b" />
            </Pressable>
          </View>
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </LinearGradient>

        <View style={s.infoCard}>
          <Text style={s.sectionTitle}>How it works</Text>

          <View style={s.stepRow}>
            <View style={[s.stepIcon, { backgroundColor: 'rgba(167,139,250,0.12)' }]}>
              <Award size={18} color="#A78BFA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>Student Alumni issued</Text>
              <Text style={s.stepDesc}>
                Every certificate we issue carries a unique code (SA-XXXX-XXXX).
                Look it up here to see who it was issued to and when.
              </Text>
            </View>
          </View>

          <View style={s.stepRow}>
            <View style={[s.stepIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <ShieldCheck size={18} color="#FCD34D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>Third-party certificates</Text>
              <Text style={s.stepDesc}>
                Certificates from Udemy, Coursera, LinkedIn, CodeSpectra and
                other platforms are verified by the issuing platform itself.
                We link to their official verification page.
              </Text>
            </View>
          </View>

          <View style={s.stepRow}>
            <View style={[s.stepIcon, { backgroundColor: 'rgba(52,211,153,0.12)' }]}>
              <ScanSearch size={18} color="#6EE7B7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>No login required</Text>
              <Text style={s.stepDesc}>
                Anyone with the code can verify — recruiters, employers, and
                admissions teams included.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 50 },
  backArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  heroCard: { borderRadius: 20, padding: 22, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', ...(Platform.OS === 'web' ? { boxShadow: '0 20px 50px rgba(124,58,237,0.18)' } as any : {}) },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  heroTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20, lineHeight: 26 },
  heroSub: { color: 'rgba(255,255,255,0.66)', fontFamily: FONTS.med, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  codeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  codeInput: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', paddingHorizontal: 14,
    color: '#fff', fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.bold) as any,
    fontSize: 15, letterSpacing: 1,
  },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#A78BFA', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  verifyBtnText: { color: '#1e1b4b', fontFamily: FONTS.xbold, fontSize: 13 },
  errorText: { color: '#fca5a5', fontFamily: FONTS.bold, fontSize: 12, marginTop: 10 },
  infoCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: '#334155', gap: 16 },
  sectionTitle: { color: '#94a3b8', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  stepTitle: { color: '#e2e8f0', fontFamily: FONTS.bold, fontSize: 13.5 },
  stepDesc: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
});
