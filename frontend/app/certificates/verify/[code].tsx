import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ShieldCheck, ExternalLink, Award, Mail, Calendar, User, ChevronLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
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
  issued_at?: string;
};

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
        if (resp.status === 404) {
          setNotFound(true);
          return;
        }
        if (!resp.ok) {
          setNotFound(true);
          return;
        }
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
      <View style={s.center}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={s.loadingText}>Checking certificate...</Text>
      </View>
    );
  }

  if (notFound || !data) {
    return (
      <View style={s.center}>
        <MaterialCommunityIcons name="shield-off-outline" size={64} color="#ef4444" />
        <Text style={s.errorTitle}>Certificate not found</Text>
        <Text style={s.errorSub}>
          No certificate matching "{code?.toUpperCase()}" was issued by Student Alumni.
        </Text>
        <Pressable onPress={() => router.replace('/certificates/verify')} style={s.backBtn}>
          <ChevronLeft size={16} color="#fff" />
          <Text style={s.backBtnText}>Try another code</Text>
        </Pressable>
      </View>
    );
  }

  const isPlatform = data.issuer_type !== 'external';
  const accent = isPlatform ? '#10B981' : '#F59E0B';
  const issuedAt = data.issued_at ? new Date(data.issued_at).toLocaleDateString() : '';

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Animated.View entering={FadeIn.duration(300)}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backArrow}>
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <Text style={s.title}>Certificate Verification</Text>
        </View>

        {/* Status banner */}
        <LinearGradient
          colors={isPlatform ? ['#065F46', '#10B981'] : ['#92400E', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.statusCard}
        >
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
        </LinearGradient>

        {/* Details */}
        <View style={s.detailsCard}>
          <Text style={s.sectionTitle}>Certificate Details</Text>
          <DetailRow icon={Award} label="Title" value={data.title} />
          <DetailRow icon={User} label="Recipient" value={data.recipient_name} />
          <DetailRow icon={Mail} label="Email" value={data.recipient_email} />
          <DetailRow icon={ShieldCheck} label="Issued by" value={data.issuer} />
          {issuedAt ? <DetailRow icon={Calendar} label="Issued on" value={issuedAt} /> : null}
        </View>

        {!isPlatform && (
          <View style={s.externalCard}>
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

        {/* Verified badge */}
        <View style={[s.verifiedBanner, { borderColor: `${accent}33`, backgroundColor: `${accent}11` }]}>
          <ShieldCheck size={20} color={accent} />
          <Text style={[s.verifiedText, { color: accent }]}>
            {isPlatform
              ? 'Verified by Student Alumni Platform'
              : 'Authenticity confirmed at the issuing platform'}
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.detailRow}>
      <View style={s.detailIconWrap}>
        <Icon size={16} color="#A78BFA" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, marginTop: 12 },
  errorTitle: { color: '#ef4444', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 12, textAlign: 'center' },
  errorSub: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  backBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 50 },
  backArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  statusCard: { borderRadius: 20, padding: 22, ...(Platform.OS === 'web' ? { boxShadow: '0 20px 50px rgba(16,185,129,0.18)' } as any : {}) },
  statusIconWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  statusTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  statusSub: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.med, fontSize: 13.5, marginTop: 4, lineHeight: 19 },
  codePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, marginTop: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  codeText: { color: '#fff', fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.xbold) as any, fontSize: 15, letterSpacing: 1.2 },
  detailsCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#94a3b8', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1.4, marginBottom: 14, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(51,65,85,0.4)' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(167,139,250,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  detailLabel: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 11, marginBottom: 2 },
  detailValue: { color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 14, lineHeight: 20 },
  externalCard: { backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  externalTitle: { color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 14 },
  externalDesc: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 19, marginTop: 6 },
  externalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, height: 46, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.12)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) },
  externalBtnText: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 13 },
  externalHint: { color: '#a3a3a3', fontFamily: FONTS.med, fontSize: 12, marginTop: 12, lineHeight: 18 },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 12 },
});
