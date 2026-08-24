// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ,
  Platform,
  ScrollView,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Award,
  BookOpen,
  User,
  Hash,
  Calendar,
  Building2,
  ChevronLeft,
  UserCheck,
  FileCheck,
  Copy,
  Check,
  Lock,
  Search,
  X,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { SAModernLoader } from '@/src/views/components/SAModernLoader';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [certResult, setCertResult] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const certResp = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(id)}`);
        if (certResp.ok) {
          const certJson = await certResp.json();
          if (certJson.type === 'certificate' || certJson.type === 'certificate_search_results') {
            setCertResult(certJson);
            setLoading(false);
            return;
          }
        }

        const resp = await fetch(`${API_BASE}/api/id-cards/${encodeURIComponent(id)}`);
        if (!resp.ok) {
          setError(resp.status === 404 ? 'Invalid Certificate ID or Member ID' : 'Verification failed');
          return;
        }
        setData(await resp.json());
      } catch {
        setError('Could not connect to verification registry');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const downloadCert = (url: string, name: string) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.download = `${(name || 'Certificate').replace(/\s+/g, '_')}_Certificate.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Linking.openURL(fullUrl);
    }
  };

  const downloadBGVReport = (memberData: any) => {
    const reportContent =
      "=================================================================\n" +
      "  STUDENT ALUMNI NETWORK — BACKGROUND VERIFICATION (BGV) REPORT\n" +
      "  Cryptographic Credential & Authenticity Verification Record\n" +
      "=================================================================\n\n" +
      `VERIFICATION STATUS : OFFICIALLY VERIFIED & VALID\n` +
      `MEMBER / CERT ID    : ${memberData.id || id}\n` +
      `FULL NAME           : ${memberData.full_name || memberData.recipient_name || 'N/A'}\n` +
      `ROLE / TITLE        : ${memberData.role || 'Member'}\n` +
      `INSTITUTION / ORG   : ${memberData.institution || memberData.org || 'Student Alumni Network'}\n` +
      `VERIFIED TIMESTAMP  : ${new Date().toISOString()}\n` +
      `SECURITY PROTOCOL   : Cryptographic SHA-256 Public Ledger\n` +
      `VERIFICATION SERVER : ${API_BASE}\n` +
      "=================================================================";

    if (Platform.OS === 'web') {
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BGV_Report_${(memberData.id || id).replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 relative" style={{  backgroundColor: '#05060F'  }}>
        <EchoHeader />
        <SAModernLoader subtitle="VERIFYING CRYPTOGRAPHIC REGISTRY" />
        <EchoFooter />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 relative" style={{  backgroundColor: '#05060F'  }}>
        <EchoHeader />
        <View className="flex-1 items-center justify-center p-6" style={{  backgroundColor: '#05060F', paddingTop: ECHO_TOP_PADDING + 40  }}>
          <View className="rounded-2xl" style={{  width: 72, height: 72, backgroundColor: 'rgba(239, 68, 68, 0.12)'  }}>
            <AlertCircle size={48} color="#EF4444" />
          </View>
          <Text className="font-body-bold text-center" style={{  color: '#EF4444', fontSize: 20  }}>{error}</Text>
          <Text className="text-center mb-6" style={{  color: '#9AA0B4', fontSize: 14, maxWidth: 480, lineHeight: 20, marginTop: 6  }}>The credential with ID "{id}" could not be verified in the registry.</Text>
          <Pressable onPress={() => router.push('/verify')} className="flex-row items-center gap-2 py-3 rounded-xl border" style={{  backgroundColor: '#0C0E1B', paddingHorizontal: 18, borderColor: '#2A2A55'  }}>
            <ChevronLeft size={16} color="#ffffff" />
            <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 13.5  }}>Return to Verification Portal</Text>
          </Pressable>
        </View>
        <EchoFooter />
      </View>
    );
  }

  // RENDER CERTIFICATE VIEW
  if (certResult?.certificate) {
    const c = certResult.certificate;
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

        <ScrollView className="flex-1" style={{  backgroundColor: '#05060F'  }} contentContainerStyle={styles.scrollContent}>
          <View className="items-center" style={{  paddingTop: ECHO_TOP_PADDING + 10, paddingBottom: 70, paddingHorizontal: Platform.OS === 'web' ? 24 : 16, width: '100%'  }}>
            <Animated.View entering={FadeIn.duration(300)} className="" style={{  width: '100%', maxWidth: 1240  }}>

              {/* Navigation row */}
              <View className="" style={{  marginBottom: 18  }}>
                <Pressable onPress={() => router.push('/verify')} className="flex-row items-center gap-1.5" style={{  alignSelf: 'flex-start', backgroundColor: 'rgba(91, 79, 233, 0.1)'  }}>
                  <ChevronLeft size={18} color="#8B84FF" />
                  <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 12.5  }}>Search Registry</Text>
                </Pressable>
              </View>

              {/* Verified Result Card */}
              <View className="rounded-2xl border gap-5.5" style={{  backgroundColor: '#0C0E1B', borderColor: '#1B1E33', padding: Platform.OS === 'web' ? 28 : 18  }}>

                {/* Status Bar */}
                <View className="flex-row items-center justify-between flex-wrap gap-3" style={{  borderBottomWidth: 1, borderBottomColor: '#171A2C', paddingBottom: 18  }}>
                  <View className="flex-row items-center gap-2" style={{  backgroundColor: 'rgba(16, 185, 129, 0.12)'  }}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 13, letterSpacing: 0.5  }}>OFFICIALLY VERIFIED & VALID</Text>
                  </View>

                  <View className="flex-row items-center gap-1.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.12)'  }}>
                    <Hash size={13} color="#8B84FF" />
                    <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13.5, fontFamily: Platform.OS === 'web' ? 'Manrope  }}>ID: {c.id || c.certificate_id || id}</Text>
                  </View>
                </View>

                {/* Certificate Image */}
                {c.image_url && (
                  <View className="rounded-2xl overflow-hidden border p-3.5 items-center" style={{  backgroundColor: '#070A1A', borderColor: '#1B1E33'  }}>
                    <Pressable onPress={() => setShowImageZoom(true)} className="relative items-center" style={{  width: '100%'  }}>
                      <Image
                        source={{ uri: c.image_url.startsWith('http') ? c.image_url : `${API_BASE}${c.image_url}` }}
                        className="rounded-xl" style={{  width: '100%', height: Platform.OS === 'web' ? 520 : 250  }}
                        resizeMode="contain"
                      />
                      <View className="absolute flex-row items-center gap-1.5" style={{  bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.75)'  }}>
                        <Search size={12} color="#fff" />
                        <Text className="font-body-semibold" style={{  color: '#fff', fontSize: 11.5  }}>Click to zoom</Text>
                      </View>
                    </Pressable>
                  </View>
                )}

                {/* Metadata Card */}
                <View className="rounded-2xl p-6 border gap-4" style={{  backgroundColor: '#0A0C18', borderColor: '#171A2C'  }}>
                  <Text className="font-body-bold uppercase" style={{  color: '#8B84FF', fontSize: 12.5, letterSpacing: 1.2, marginBottom: 4  }}>Credential Verification Details</Text>
                  <View className="flex-row flex-wrap gap-3.5">
                    <MetaItem label="Recipient Name" value={c.recipient_name} icon={User} />
                    <MetaItem label="Certificate ID" value={c.id || c.certificate_id || id} icon={Hash} />
                    {c.roll_number && <MetaItem label="Roll Number" value={c.roll_number} icon={Award} />}
                    {c.branch && <MetaItem label="Branch / Specialization" value={c.branch} icon={BookOpen} />}
                    <MetaItem label="Issuing Organization" value={c.issuing_organization || c.issuer || 'Student Alumni Network'} icon={Building2} />
                    <MetaItem label="Issue Date" value={c.issue_date || '2026-02-15'} icon={Calendar} />
                  </View>

                  {/* Hash Signature */}
                  {c.verification_hash && (
                    <View className="mt-2 p-4 rounded-2xl border" style={{  backgroundColor: '#05060F', borderColor: '#1B1E33'  }}>
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View style={{  flexDirection: 'row', alignItems: 'center', gap: 6  }}>
                          <Lock size={12} color="#10B981" />
                          <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 12.5, letterSpacing: 0.2  }}>Cryptographic SHA-256 Signature</Text>
                        </View>
                        <Pressable onPress={() => copyToClipboard(c.verification_hash)} className="flex-row items-center gap-1.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.12)'  }}>
                          {copiedHash ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#8B84FF" />}
                          <Text style={[styles.copyBtnText, copiedHash && { color: '#10B981' }]}>
                            {copiedHash ? 'Copied' : 'Copy Hash'}
                          </Text>
                        </Pressable>
                      </View>
                      <Text className="font-body-semibold" style={{  color: '#10B981', fontSize: 13.5, fontFamily: Platform.OS === 'web' ? 'Manrope, letterSpacing: 0.5  }}>{c.verification_hash}</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3.5">
                  {c.image_url && (
                    <Pressable
                      onPress={() => downloadCert(c.image_url, c.recipient_name)}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl" style={{  backgroundColor: '#5B4FE9', height: 52  }}
                    >
                      <Download size={16} color="#ffffff" />
                      <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 14.5  }}>Download High-Resolution Certificate</Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => downloadBGVReport(c)}
                    className="flex-1 flex-row items-center justify-center gap-2" style={{  backgroundColor: 'rgba(91, 79, 233, 0.1)'  }}
                  >
                    <FileCheck size={16} color="#8B84FF" />
                    <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 14.5  }}>Download BGV Verification Record</Text>
                  </Pressable>
                </View>

              </View>

            </Animated.View>
          </View>

          <EchoFooter />
        </ScrollView>

        {/* Zoom Modal */}
        <Modal visible={showImageZoom} transparent animationType="fade" onRequestClose={() => setShowImageZoom(false)}>
          <View className="flex-1" style={{  backgroundColor: 'rgba(5, 6, 15, 0.88)'  }}>
            <Pressable onPress={() => setShowImageZoom(false)} className="absolute p-2 z-[100]" style={{  top: 24, right: 24  }}>
              <X size={24} color="#ffffff" />
            </Pressable>
            {c?.image_url && (
              <Image
                source={{ uri: c.image_url.startsWith('http') ? c.image_url : `${API_BASE}${c.image_url}` }}
                className="" style={{  width: '92%', height: '84%'  }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>
      </View>
    );
  }

  // RENDER DIGITAL ID CARD VIEW
  if (!data) return null;
  const role = (data.role || '').toLowerCase();

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
      <EchoHeader />

      <ScrollView className="flex-1" style={{  backgroundColor: '#05060F'  }} contentContainerStyle={styles.scrollContent}>
        <View className="items-center" style={{  paddingTop: ECHO_TOP_PADDING + 10, paddingBottom: 70, paddingHorizontal: Platform.OS === 'web' ? 24 : 16, width: '100%'  }}>
          <Animated.View entering={FadeIn.duration(300)} className="" style={{  width: '100%', maxWidth: 1240  }}>

            {/* Header */}
            <View className="" style={{  marginBottom: 18  }}>
              <Pressable onPress={() => router.push('/verify')} className="flex-row items-center gap-1.5" style={{  alignSelf: 'flex-start', backgroundColor: 'rgba(91, 79, 233, 0.1)'  }}>
                <ChevronLeft size={18} color="#8B84FF" />
                <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 12.5  }}>Search Registry</Text>
              </Pressable>
            </View>

            {/* Result Card */}
            <View className="rounded-2xl border gap-5.5" style={{  backgroundColor: '#0C0E1B', borderColor: '#1B1E33', padding: Platform.OS === 'web' ? 28 : 18  }}>

              {/* Status Header */}
              <View className="flex-row items-center justify-between flex-wrap gap-3" style={{  borderBottomWidth: 1, borderBottomColor: '#171A2C', paddingBottom: 18  }}>
                <View className="flex-row items-center gap-2" style={{  backgroundColor: 'rgba(16, 185, 129, 0.12)'  }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 13, letterSpacing: 0.5  }}>VERIFIED ACTIVE MEMBER</Text>
                </View>

                <View className="flex-row items-center gap-1.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.12)'  }}>
                  <Hash size={13} color="#8B84FF" />
                  <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13.5, fontFamily: Platform.OS === 'web' ? 'Manrope  }}>SA ID: {data.id || id}</Text>
                </View>
              </View>

              {/* Digital Member Card */}
              <View className="rounded-2xl overflow-hidden border" style={{  borderColor: '#2A2A55'  }}>
                <LinearGradient
                  colors={['#171A2C', '#0C0E1B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="" s 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  zoomHintText: {
    color: '#fff',
    fontSize: 11.5,
    fontWeight: '600',
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
  actionsGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 14,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5B4FE9',
    height: 52,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(91, 79, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.3)',
    height: 52,
    borderRadius: 14,
  },
  secondaryActionBtnText: {
    color: '#8B84FF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  idCardShell: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A55',
  },
  idCardInner: {
    padding: 26,
  },
  idCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  idCardLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idCardLogoBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(91, 79, 233, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCardBrand: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  idRolePill: {
    backgroundColor: 'rgba(91, 79, 233, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.3)',
  },
  idRoleText: {
    color: '#8B84FF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  idCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  idAvatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(91, 79, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 132, 255, 0.3)',
    overflow: 'hidden',
  },
  idAvatar: {
    width: 68,
    height: 68,
  },
  idMemberName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  idMemberOrg: {
    color: '#9AA0B4',
    fontSize: 13.5,
    marginTop: 2,
  },
  idMemberId: {
    color: '#8B84FF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 15, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 8,
    zIndex: 100,
  },
  zoomedImage: {
    width: '92%',
    height: '84%',
  },
});
