// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { WebOnlyRoute } from '@/src/lib/nativeGuard';
import {
  View, Text, Pressable, StyleSheet, Platform, Linking, Image, ScrollView, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ShieldCheck, ExternalLink, Award, Mail, Calendar, User, ArrowLeft, FileText, CheckCircle2,
  Lock, Copy, Check, AlertCircle, Hash, Building2, Download, CreditCard, IdCard,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { SAModernLoader } from '@/src/views/components/SAModernLoader';
import { getBaseUrl } from '@/src/lib/env';

const API_BASE = getBaseUrl();

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
  verification_hash?: string;
};

function absUrl(u?: string): string {
  if (!u) return '';
  if (u.startsWith('http')) return u;
  return `${API_BASE}${u}`;
}

function CertificateVerifyResult() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(code)}`);
        if (resp.status === 404 || !resp.ok) {
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

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (loading) {
    return (
      <View style={s.outerWrap}>
        <EchoHeader />
        <SAModernLoader subtitle="CHECKING CRYPTOGRAPHIC LEDGER" />
        <EchoFooter />
      </View>
    );
  }

  if (notFound || !data) {
    return (
      <View style={s.outerWrap}>
        <EchoHeader />
        <View style={s.centerWrap}>
          <View style={s.errorIconCircle}>
            <AlertCircle size={44} color="#EF4444" />
          </View>
          <Text style={s.errorTitle}>Certificate Not Found</Text>
          <Text style={s.errorSub}>
            No certificate matching "{code?.toUpperCase()}" was registered with Student Alumni.
          </Text>
          <Pressable onPress={() => router.replace('/certificates/verify')} style={s.backPill}>
            <ArrowLeft size={14} color="#ffffff" />
            <Text style={s.backPillText}>Try Another Unique ID</Text>
          </Pressable>
        </View>
        <EchoFooter />
      </View>
    );
  }

  const isPlatform = data.issuer_type !== 'external';
  const issuedAt = data.issued_at ? new Date(data.issued_at).toLocaleDateString() : '';
  const isImageFile = (ct?: string) => !!ct && ct.startsWith('image/');
  const docUrl = data.file_url || (data as any).image_url;
  const docIsImage =
    isImageFile(data.content_type) ||
    (!data.file_url && !!(data as any).image_url) ||
    (docUrl ? /\.(png|jpe?g|webp|gif)(\?|$)/i.test(docUrl) : false);

  return (
    <View style={s.outerWrap}>
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background: #05060F !important;
                color: #F4F5FB !important;
              }
            `,
          }}
        />
      )}
      <View style={s.ambientGlowTop} />
      <SAWatermark opacity={0.09} rotation="0deg" top={110} right={24} size={520} />
      <EchoHeader />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.container}>
          <Animated.View entering={FadeIn.duration(300)} style={s.wrapper}>

            {/* Back button */}
            <Pressable onPress={() => router.push('/certificates/verify')} style={s.backPill}>
              <ArrowLeft size={14} color="#8B84FF" />
              <Text style={s.backPillText}>Verify Another Credential</Text>
            </Pressable>

            {/* Status Card */}
            <View style={s.resultCard}>

              <View style={s.verifiedHeader}>
                <View style={s.statusBadge}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={s.statusBadgeText}>
                    {isPlatform ? 'OFFICIALLY VERIFIED & VALID' : 'THIRD-PARTY ACCREDITED CERTIFICATE'}
                  </Text>
                </View>

                {data.verification_code && (
                  <View style={s.uniqueIdPill}>
                    <Hash size={13} color="#8B84FF" />
                    <Text style={s.uniqueIdPillText}>CODE: {data.verification_code}</Text>
                  </View>
                )}
              </View>

              {/* Public verification — this link is the credential; no login or ID documents collected */}
              <View style={{ backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', padding: 12, marginVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#34D399" />
                <Text style={{ fontFamily: 'Outfit', fontWeight: 'bold', fontSize: 13, color: '#34D399', flex: 1 }}>
                  Publicly verifiable credential — no login or ID documents required
                </Text>
              </View>

              {/* Certificate Document */}
              {!!docUrl && (
                <View style={s.imageWrapper}>
                  {docIsImage ? (
                    <Image
                      source={{ uri: absUrl(docUrl) }}
                      style={s.fileImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Pressable
                      onPress={() => Linking.openURL(absUrl(docUrl))}
                      style={s.pdfBtn}
                    >
                      <FileText size={24} color="#8B84FF" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.pdfName} numberOfLines={1}>
                          {data.file_name || 'Official_Certificate.pdf'}
                        </Text>
                        <Text style={s.pdfHint}>Click to view high-resolution PDF</Text>
                      </View>
                      <ExternalLink size={16} color="#8B84FF" />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Certificate Metadata */}
              <View style={s.metaCard}>
                <Text style={s.metaCardTitle}>Certificate Metadata</Text>
                <View style={s.metaGrid}>
                  <MetaItem icon={Award} label="Title / Award" value={data.title} />
                  <MetaItem icon={User} label="Recipient Name" value={data.recipient_name} />
                  <MetaItem icon={Mail} label="Email Address" value={data.recipient_email} />
                  <MetaItem icon={Building2} label="Issuing Authority" value={data.issuer} />
                  {issuedAt ? <MetaItem icon={Calendar} label="Issued On" value={issuedAt} /> : null}
                </View>

                {/* Cryptographic SHA-256 Hash */}
                {data.verification_hash && (
                  <View style={s.hashBox}>
                    <View style={s.hashHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Lock size={12} color="#10B981" />
                        <Text style={s.hashLabel}>Cryptographic SHA-256 Signature</Text>
                      </View>
                      <Pressable
                        onPress={() => copyToClipboard(data.verification_hash)}
                        style={s.copyBtn}
                      >
                        {copiedHash ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#8B84FF" />}
                        <Text style={[s.copyBtnText, copiedHash && { color: '#10B981' }]}>
                          {copiedHash ? 'Copied' : 'Copy'}
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={s.hashValue}>{data.verification_hash}</Text>
                  </View>
                )}
              </View>

              {/* External Verification link if applicable */}
              {!isPlatform && (
                <View style={s.externalCard}>
                  <Text style={s.externalTitle}>Verify at Partner Authority</Text>
                  <Text style={s.externalDesc}>
                    This credential was issued through an external partner program. You can verify the source certificate
                    directly on the partner platform.
                  </Text>
                  {(data.verify_url || data.credential_url) && (
                    <Pressable
                      onPress={() => Linking.openURL(data.verify_url || data.credential_url!)}
                      style={s.externalBtn}
                    >
                      <ExternalLink size={15} color="#8B84FF" />
                      <Text style={s.externalBtnText}>Open Issuer Portal ({data.issuer})</Text>
                    </Pressable>
                  )}
                  {data.hint ? <Text style={s.externalHint}>{data.hint}</Text> : null}
                </View>
              )}

              {/* Verified Authority Banner */}
              <View style={s.verifiedBanner}>
                <ShieldCheck size={18} color="#10B981" />
                <Text style={s.verifiedText}>
                  {isPlatform
                    ? 'Cryptographically Verified by Student Alumni Network'
                    : 'Accredited Authenticity Confirmed'}
                </Text>
              </View>

            </View>

          </Animated.View>
        </View>

        <EchoFooter />
      </ScrollView>
    </View>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={s.metaItem}>
      <View style={s.metaIconWrap}>
        <Icon size={14} color="#8B84FF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.metaItemLabel}>{label}</Text>
        <Text style={s.metaItemValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: '#05060F',
    position: 'relative',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -400 }],
    width: 800,
    height: 500,
    borderRadius: 400,
    backgroundColor: 'rgba(91, 79, 233, 0.14)',
    pointerEvents: 'none',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#05060F',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#05060F',
  },
  container: {
    paddingTop: ECHO_TOP_PADDING + 10,
    paddingBottom: 70,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    width: '100%',
    alignItems: 'center',
  },
  wrapper: {
    width: '100%',
    maxWidth: 1240,
  },
  centerWrap: {
    flex: 1,
    backgroundColor: '#05060F',
    paddingTop: ECHO_TOP_PADDING + 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorSub: {
    color: '#9AA0B4',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(91, 79, 233, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  backPillText: {
    color: '#8B84FF',
    fontSize: 13,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#0C0E1B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1B1E33',
    padding: Platform.OS === 'web' ? 28 : 18,
    gap: 22,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#171A2C',
    paddingBottom: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  uniqueIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(91, 79, 233, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.25)',
  },
  uniqueIdPillText: {
    color: '#8B84FF',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
  },
  imageWrapper: {
    backgroundColor: '#070A1A',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1B1E33',
    padding: 14,
    alignItems: 'center',
  },
  fileImage: {
    width: '100%',
    height: Platform.OS === 'web' ? 520 : 250,
    borderRadius: 12,
  },
  pdfBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#0C0E1B',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1B1E33',
  },
  pdfName: {
    color: '#F4F5FB',
    fontSize: 14.5,
    fontWeight: '700',
  },
  pdfHint: {
    color: '#9AA0B4',
    fontSize: 12.5,
    marginTop: 2,
  },
  metaCard: {
    backgroundColor: '#0A0C18',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#171A2C',
    gap: 16,
  },
  metaCardTitle: {
    color: '#8B84FF',
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: {
    minWidth: Platform.OS === 'web' ? '48%' : '100%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#0C0E1B',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  metaIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(91, 79, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  metaItemLabel: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
  },
  metaItemValue: {
    color: '#F4F5FB',
    fontSize: 14.5,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
  },
  hashBox: {
    marginTop: 8,
    backgroundColor: '#05060F',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1B1E33',
  },
  hashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  hashLabel: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(91, 79, 233, 0.12)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#8B84FF',
    fontSize: 12,
    fontWeight: '700',
  },
  hashValue: {
    color: '#10B981',
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
    letterSpacing: 0.5,
  },
  externalCard: {
    backgroundColor: 'rgba(91, 79, 233, 0.06)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.2)',
  },
  externalTitle: {
    color: '#8B84FF',
    fontSize: 14,
    fontWeight: '700',
  },
  externalDesc: {
    color: '#9AA0B4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(91, 79, 233, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.3)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  externalBtnText: {
    color: '#8B84FF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  externalHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 10,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
});

/**
 * Native guard — this route renders web-only UI. On iOS/Android show a
 * placeholder that opens the page on studentalumni.ai instead of crashing.
 */
export default function CertificateVerifyResultRoute() {
  if (Platform.OS !== 'web') return <WebOnlyRoute />;
  return <CertificateVerifyResult />;
}
