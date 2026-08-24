// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, Platform, Linking, Image, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ShieldCheck, ExternalLink, Award, Mail, Calendar, User, ArrowLeft, FileText, CheckCircle2,
  Lock, Copy, Check, AlertCircle, Hash, Building2,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { SAModernLoader } from '@/src/views/components/SAModernLoader';

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
  verification_hash?: string;
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
      <View className="flex-1 relative" style={{  backgroundColor: '#05060F'  }}>
        <EchoHeader />
        <SAModernLoader subtitle="CHECKING CRYPTOGRAPHIC LEDGER" />
        <EchoFooter />
      </View>
    );
  }

  if (notFound || !data) {
    return (
      <View className="flex-1 relative" style={{  backgroundColor: '#05060F'  }}>
        <EchoHeader />
        <View className="flex-1 items-center justify-center p-6" style={{  backgroundColor: '#05060F', paddingTop: ECHO_TOP_PADDING + 40  }}>
          <View className="rounded-2xl" style={{  width: 72, height: 72, backgroundColor: 'rgba(239, 68, 68, 0.12)'  }}>
            <AlertCircle size={44} color="#EF4444" />
          </View>
          <Text className="font-body-bold text-center" style={{  color: '#EF4444', fontSize: 20  }}>Certificate Not Found</Text>
          <Text className="text-center mb-5" style={{  color: '#9AA0B4', fontSize: 14, maxWidth: 480, lineHeight: 20, marginTop: 6  }}>
            No certificate matching "{code?.toUpperCase()}" was registered with Student Alumni.
          </Text>
          <Pressable onPress={() => router.replace('/certificates/verify')} className="flex-row items-center gap-1.5" style={{  alignSelf: 'flex-start', backgroundColor: 'rgba(91, 79, 233, 0.1)'  }}>
            <ArrowLeft size={14} color="#ffffff" />
            <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13  }}>Try Another Unique ID</Text>
          </Pressable>
        </View>
        <EchoFooter />
      </View>
    );
  }

  const isPlatform = data.issuer_type !== 'external';
  const issuedAt = data.issued_at ? new Date(data.issued_at).toLocaleDateString() : '';
  const isImageFile = (ct?: string) => !!ct && ct.startsWith('image/');

  return (
    <View className="flex-1 relative" style={{  backgroundColor: '#05060F'  }}>
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
      <View className="absolute rounded-2xl" style={{  top: 0, left: '50%', transform: [{ translateX: -400 }], width: 800, height: 500, backgroundColor: 'rgba(91, 79, 233, 0.14)'  }} />
      <SAWatermark opacity={0.09} rotation="0deg" top={110} right={24} size={520} />
      <EchoHeader />

      <ScrollView className="flex-1" style={{  backgroundColor: '#05060F'  }} contentContainerStyle={s.scrollContent}>
        <View className="items-center" style={{  paddingTop: ECHO_TOP_PADDING + 10, paddingBottom: 70, paddingHorizontal: Platform.OS === 'web' ? 24 : 16, width: '100%'  }}>
          <Animated.View entering={FadeIn.duration(300)} className="" style={{  width: '100%', maxWidth: 1240  }}>

            {/* Back button */}
            <Pressable onPress={() => router.push('/certificates/verify')} className="flex-row items-center gap-1.5" style={{  alignSelf: 'flex-start', backgroundColor: 'rgba(91, 79, 233, 0.1)'  }}>
              <ArrowLeft size={14} color="#8B84FF" />
              <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13  }}>Verify Another Credential</Text>
            </Pressable>

            {/* Status Card */}
            <View className="rounded-2xl border gap-5.5" style={{  backgroundColor: '#0C0E1B', borderColor: '#1B1E33', padding: Platform.OS === 'web' ? 28 : 18  }}>

              <View className="flex-row items-center justify-between flex-wrap gap-3" style={{  borderBottomWidth: 1, borderBottomColor: '#171A2C', paddingBottom: 18  }}>
                <View className="flex-row items-center gap-2" style={{  backgroundColor: 'rgba(16, 185, 129, 0.12)'  }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 13, letterSpacing: 0.5  }}>
                    {isPlatform ? 'OFFICIALLY VERIFIED & VALID' : 'THIRD-PARTY ACCREDITED CERTIFICATE'}
                  </Text>
                </View>

                {data.verification_code && (
                  <View className="flex-row items-center gap-1.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.12)'  }}>
                    <Hash size={13} color="#8B84FF" />
                    <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13.5, fontSize: 13.5 }}>CODE: {data.verification_code}</Text>
                  </View>
                )}
              </View>

              {/* Certificate Document */}
              {data.file_url && (
                <View className="rounded-2xl overflow-hidden border p-3.5 items-center" style={{  backgroundColor: '#070A1A', borderColor: '#1B1E33'  }}>
                  {isImageFile(data.content_type) ? (
                    <Image
                      source={{ uri: absUrl(data.file_url) }}
                      className="rounded-xl" style={{  width: '100%', height: Platform.OS === 'web' ? 520 : 250  }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Pressable
                      onPress={() => Linking.openURL(absUrl(data.file_url))}
                      className="flex-row items-center gap-3.5 rounded-2xl border" style={{  width: '100%', backgroundColor: '#0C0E1B', padding: 18, borderColor: '#1B1E33'  }}
                    >
                      <FileText size={24} color="#8B84FF" />
                      <View style={{  flex: 1  }}>
                        <Text className="font-body-bold" style={{  color: '#F4F5FB', fontSize: 14.5  }} numberOfLines={1}>
                          {data.file_name || 'Official_Certificate.pdf'}
                        </Text>
                        <Text className="" style={{  color: '#9AA0B4', fontSize: 12.5, marginTop: 2  }}>Click to view high-resolution PDF</Text>
                      </View>
                      <ExternalLink size={16} color="#8B84FF" />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Certificate Metadata */}
              <View className="rounded-2xl p-6 border gap-4" style={{  backgroundColor: '#0A0C18', borderColor: '#171A2C'  }}>
                <Text className="font-body-bold uppercase" style={{  color: '#8B84FF', fontSize: 12.5, letterSpacing: 1.2, marginBottom: 4  }}>Certificate Metadata</Text>
                <View className="flex-row flex-wrap gap-3.5">
                  <MetaItem icon={Award} label="Title / Award" value={data.title} />
                  <MetaItem icon={User} label="Recipient Name" value={data.recipient_name} />
                  <MetaItem icon={Mail} label="Email Address" value={data.recipient_email} />
                  <MetaItem icon={Building2} label="Issuing Authority" value={data.issuer} />
                  {issuedAt ? <MetaItem icon={Calendar} label="Issued On" value={issuedAt} /> : null}
                </View>

                {/* Cryptographic SHA-256 Hash */}
                {data.verification_hash && (
                  <View className="mt-2 p-4 rounded-2xl border" style={{  backgroundColor: '#05060F', borderColor: '#1B1E33'  }}>
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View style={{  flexDirection: 'row', alignItems: 'center', gap: 6  }}>
                        <Lock size={12} color="#10B981" />
                        <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 12.5, letterSpacing: 0.2  }}>Cryptographic SHA-256 Signature</Text>
                      </View>
                      <Pressable
                        onPress={() => copyToClipboard(data.verification_hash)}
                        className="flex-row items-center gap-1.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.12)'  }}
    ding: 18,
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
    fontFamily: Platform.OS === 'web' ? 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
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
    fontFamily: Platform.OS === 'web' ? 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
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
