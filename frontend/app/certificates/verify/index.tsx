// @ts-nocheck
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import {
  ShieldCheck, Award, ScanSearch, ArrowRight, BadgeCheck, ArrowLeft,
} from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
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
      <EchoHeader />
      <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.push('/welcome')} style={s.backPill}>
          <ArrowLeft size={14} color="#fff" />
          <Text style={s.backPillText}>Home</Text>
        </Pressable>

        <View style={s.heroCard}>
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
              <ArrowRight size={16} color="#fff" />
            </Pressable>
          </View>
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </View>

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
      <EchoFooter />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0a0f1e' },
  scroll: { flex: 1 },
  container: { paddingTop: ECHO_TOP_PADDING, padding: 20, paddingBottom: 40, maxWidth: 800, alignSelf: 'center', width: '100%' },
  backPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 20, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  backPillText: { color: '#fff', fontFamily: FONTS.med, fontSize: 13 },
  heroCard: { borderRadius: 18, padding: 24, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', ...(Platform.OS === 'web' ? { boxShadow: '0 20px 50px rgba(124,58,237,0.18)' } as any : {}) },
  heroIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  heroTitle: { color: '#F4F4F8', fontFamily: FONTS.xbold, fontSize: 20, lineHeight: 26 },
  heroSub: { color: '#A1A6B7', fontFamily: FONTS.med, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  codeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  codeInput: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', paddingHorizontal: 14,
    color: '#F4F4F8', fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.bold) as any,
    fontSize: 15, letterSpacing: 1,
  },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#7B3DBF', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  verifyBtnText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 },
  errorText: { color: '#fca5a5', fontFamily: FONTS.bold, fontSize: 12, marginTop: 10 },
  infoCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 20, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 16 },
  sectionTitle: { color: '#A1A6B7', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  stepTitle: { color: '#F4F4F8', fontFamily: FONTS.bold, fontSize: 13.5 },
  stepDesc: { color: '#A1A6B7', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
});
