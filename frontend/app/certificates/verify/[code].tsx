// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ActivityIndicator, Linking, Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ShieldCheck, ExternalLink, Award, Mail, Calendar, User, ArrowLeft, FileText,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

type CertData = {
  valid: boolean;
  verification_code?: string;
  recipient_name?: string;
  recipient_email?: string;
  title?: string;
  issuer?: string;
  issuer_type?: 'platform' | 'external';
  issuer_key?: string;
  hint?: string;
  verify_url?: string;
  credential_url?: string;
  file_url?: string;
  file_name?: string;
  content_type?: string;
  issued_at?: string;
};

function absUrl(u?: string): string {
  if (!u) return '';
  if (u.startsWith('http')) return u;
  return `${API_BASE}${u}`;
}

export default function CertificateVerifyResult() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(code)}`);
        if (resp.status === 404) { setNotFound(true); return; }
        if (!resp.ok) { setNotFound(true); return; }
        setData(await resp.json());
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  if (loading) {
    return (
      <View style={s.flex}>
        <EchoHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1e', paddingTop: ECHO_TOP_PADDING }}>
          <ActivityIndicator size="large" color="#7B3DBF" />
          <Text style={s.loadingText}>Checking certificate...</Text>
        </View>
        <EchoFooter />
      </View>
    );
  }

  if (notFound || !data) {
    return (
      <View style={s.flex}>
        <EchoHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1e', paddingTop: ECHO_TOP_PADDING, padding: 20 }}>
          <ShieldCheck size={64} color="#ef4444" />
          <Text style={s.errorTitle}>Certificate not found</Text>
          <Text style={s.errorSub}>
            No certificate matching "{code?.toUpperCase()}" was issued by Student Alumni.
          </Text>
          <Pressable onPress={() => router.replace('/certificates/verify')} style={s.backPill}>
            <ArrowLeft size={14} color="#fff" />
            <Text style={s.backPillText}>Try another code</Text>
          </Pressable>
        </View>
        <EchoFooter />
      </View>
    );
  }

  const isPlatform = data.issuer_type !== 'external';
  const accent = isPlatform ? '#10B981' : '#F59E0B';
  const issuedAt = data.issued_at ? new Date(data.issued_at).toLocaleDateString() : '';
  const isImageFile = (ct?: string) => !!ct && ct.startsWith('image/');

  return (
    <View style={s.flex}>
      <EchoHeader />
      <View style={s.scroll}>
        <View style={s.container}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Pressable onPress={() => router.push('/welcome')} style={s.backPill}>
              <ArrowLeft size={14} color="#fff" />
              <Text style={s.backPillText}>Home</Text>
            </Pressable>

          <View style={[s.statusCard, isPlatform ? s.statusValid : s.statusExternal]}>
            <View style={s.statusIconWrap}>
              {isPlatform
                ? <ShieldCheck size={30} color="#fff" />
                : <ExternalLink size={28} color="#fff" />}
            </View>
            <Text style={s.statusTitle}>
              {isPlatform ? 'Valid Certificate' : 'Third-party Certificate'}
            </Text>
            <Text style={s.statusSub}>
              {isPlatform
                ? 'Issued and verified by Student Alumni.'
                : 'Issued by an external platform — verify at the source.'}
            </Text>
            {data.verification_code && (
              <View style={s.codePill}>
                <Text style={s.codeText}>{data.verification_code}</Text>
              </View>
            )}
          </View>

          {data.file_url && (
            <View style={s.card}>
              <Text style={s.sectionTitle}>Certificate Document</Text>
              {isImageFile(data.content_type) ? (
                <Image source={{ uri: absUrl(data.file_url) }} style={s.fileImage} resizeMode="contain" />
              ) : (
                <Pressable
                  onPress={() => Linking.openURL(absUrl(data.file_url))}
                  style={({ hovered }: any) => [s.pdfBtn, hovered && { borderColor: '#7B3DBF' }]}
                >
                  <FileText size={20} color="#818CF8" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pdfName} numberOfLines={1}>{data.file_name || 'Certificate.pdf'}</Text>
                    <Text style={s.pdfHint}>Tap to open the PDF</Text>
                  </View>
                  <ExternalLink size={16} color="#818CF8" />
                </Pressable>
              )}
            </View>
          )}

          <View style={s.card}>
            <Text style={s.sectionTitle}>Certificate Details</Text>
            <DetailRow icon={Award} label="Title" value={data.title} />
            <DetailRow icon={User} label="Recipient" value={data.recipient_name} />
            <DetailRow icon={Mail} label="Email" value={data.recipient_email} />
            <DetailRow icon={ShieldCheck} label="Issued by" value={data.issuer} />
            {issuedAt ? <DetailRow icon={Calendar} label="Issued on" value={issuedAt} /> : null}
          </View>

          {!isPlatform && (
            <View style={s.card}>
              <Text style={s.externalTitle}>Verify on the issuer's site</Text>
              <Text style={s.externalDesc}>
                We cannot cryptographically confirm third-party certificates —
                only the issuing platform can. Open the credential link below to
                verify authenticity at the source.
              </Text>
              {(data.verify_url || data.credential_url) && (
                <Pressable
                  onPress={() => Linking.openURL(data.verify_url || data.credential_url!)}
                  style={({ hovered }: any) => [s.externalBtn, hovered && { backgroundColor: 'rgba(245,158,11,0.2)' }]}
                >
                  <ExternalLink size={16} color="#FCD34D" />
                  <Text style={s.externalBtnText}>Verify at {data.issuer}</Text>
                </Pressable>
              )}
              {data.hint ? <Text style={s.externalHint}>{data.hint}</Text> : null}
            </View>
          )}

          <View style={[s.verifiedBanner, { borderColor: `${accent}33`, backgroundColor: `${accent}11` }]}>
            <ShieldCheck size={20} color={accent} />
            <Text style={[s.verifiedText, { color: accent }]}>
              {isPlatform
                ? 'Verified by Student Alumni Platform'
                : 'Authenticity confirmed at the issuing platform'}
            </Text>
          </View>
        </Animated.View>
        </View>
        <EchoFooter />
      </View>
    </View>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.detailRow}>
      <View style={s.detailIconWrap}>
        <Icon size={16} color="#818CF8" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0a0f1e' },
  scroll: { flex: 1, overflow: 'auto' as any },
  container: { paddingTop: ECHO_TOP_PADDING, padding: 20, paddingBottom: 40, maxWidth: 800, alignSelf: 'center', width: '100%' },
  loadingText: { color: '#A1A6B7', fontFamily: FONTS.med, fontSize: 14, marginTop: 12 },
  errorTitle: { color: '#ef4444', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 12, textAlign: 'center' },
  errorSub: { color: '#A1A6B7', fontFamily: FONTS.med, fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  backPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 20, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  backPillText: { color: '#fff', fontFamily: FONTS.med, fontSize: 13 },
  statusCard: { borderRadius: 18, padding: 24 },
  statusValid: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  statusExternal: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  statusIconWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statusTitle: { color: '#F4F4F8', fontFamily: FONTS.xbold, fontSize: 20 },
  statusSub: { color: '#A1A6B7', fontFamily: FONTS.med, fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  codePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, marginTop: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  codeText: { color: '#F4F4F8', fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.xbold) as any, fontSize: 15, letterSpacing: 1.2 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 20, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sectionTitle: { color: '#A1A6B7', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1.4, marginBottom: 14, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  detailLabel: { color: '#6E7388', fontFamily: FONTS.bold, fontSize: 11, marginBottom: 2 },
  detailValue: { color: '#F4F4F8', fontFamily: FONTS.med, fontSize: 14, lineHeight: 20 },
  externalTitle: { color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 14 },
  externalDesc: { color: '#A1A6B7', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  externalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, height: 46, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.08)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  externalBtnText: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 13 },
  externalHint: { color: '#6E7388', fontFamily: FONTS.med, fontSize: 12, marginTop: 12, lineHeight: 18 },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 12 },
  fileImage: { width: '100%', height: 320, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.06)', borderRadius: 12, padding: 16, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  pdfName: { color: '#F4F4F8', fontFamily: FONTS.bold, fontSize: 14 },
  pdfHint: { color: '#A1A6B7', fontFamily: FONTS.med, fontSize: 12, marginTop: 3 },
});
