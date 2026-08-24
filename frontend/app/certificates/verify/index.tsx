// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Award,
  BookOpen,
  User,
  Hash,
  Calendar,
  Building2,
  ChevronRight,
  UserCheck,
  X,
  FileCheck,
  Copy,
  Check,
  Lock,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { SAModernLoader } from '@/src/views/components/SAModernLoader';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

const SAMPLE_CERT_IDS = [
  { label: 'SA-EXC-2026-0002 (Excellence)', id: 'SA-EXC-2026-0002' },
  { label: 'SA-FAC-2026-0001 (Faculty)', id: 'SA-FAC-2026-0001' },
  { label: 'SA-AMB-2026-0012 (Ambassador)', id: 'SA-AMB-2026-0012' },
  { label: 'ECHO26-P-0001 (Specialization)', id: 'ECHO26-P-0001' },
];

const SAMPLE_RECORDS: Record<string, any> = {
  'SA-EXC-2026-0002': {
    type: 'certificate',
    title: 'Certificate of Excellence',
    recipient_name: 'Ananya Sharma',
    issuing_organization: 'Sreenidhi Institute of Science & Technology',
    issued_date: 'Feb 14, 2026',
    ledger_hash: 'a7f31c9e4b20d881ab3f902c',
    certificate: {
      id: 'SA-EXC-2026-0002',
      title: 'Certificate of Excellence',
      recipient_name: 'Ananya Sharma',
      issuing_organization: 'Sreenidhi Institute of Science & Technology',
      issued_date: 'Feb 14, 2026',
      hash: 'a7f31c9e4b20d881ab3f902c',
      is_valid: true,
      status: 'VERIFIED',
    }
  },
  'SA-FAC-2026-0001': {
    type: 'certificate',
    title: 'Faculty Award — Mentorship',
    recipient_name: 'Dr. Ramesh Chandra',
    issuing_organization: 'StudentAlumni Academic Council',
    issued_date: 'Jan 09, 2026',
    ledger_hash: 'd881ab3f902ca7f31c9e4b20',
    certificate: {
      id: 'SA-FAC-2026-0001',
      title: 'Faculty Award — Mentorship',
      recipient_name: 'Dr. Ramesh Chandra',
      issuing_organization: 'StudentAlumni Academic Council',
      issued_date: 'Jan 09, 2026',
      hash: 'd881ab3f902ca7f31c9e4b20',
      is_valid: true,
      status: 'VERIFIED',
    }
  },
  'SA-AMB-2026-0012': {
    type: 'certificate',
    title: 'Campus Ambassador Badge',
    recipient_name: 'Kavya Reddy',
    issuing_organization: 'StudentAlumni Campus Relations',
    issued_date: 'Mar 02, 2026',
    ledger_hash: '1c9e4b20a7f3d881ab3f902c',
    certificate: {
      id: 'SA-AMB-2026-0012',
      title: 'Campus Ambassador Badge',
      recipient_name: 'Kavya Reddy',
      issuing_organization: 'StudentAlumni Campus Relations',
      issued_date: 'Mar 02, 2026',
      hash: '1c9e4b20a7f3d881ab3f902c',
      is_valid: true,
      status: 'VERIFIED',
    }
  },
  'ECHO26-P-0001': {
    type: 'certificate',
    title: 'ECHO Specialization — Product',
    recipient_name: 'Vikram Mehta',
    issuing_organization: 'ECHO 2026 · VNR VJIET',
    issued_date: 'Jul 31, 2026',
    ledger_hash: '3f902ca7f31c9e4b20d881ab',
    certificate: {
      id: 'ECHO26-P-0001',
      title: 'ECHO Specialization — Product',
      recipient_name: 'Vikram Mehta',
      issuing_organization: 'ECHO 2026 · VNR VJIET',
      issued_date: 'Jul 31, 2026',
      hash: '3f902ca7f31c9e4b20d881ab',
      is_valid: true,
      status: 'VERIFIED',
    }
  }
};

const TRUST_FEATURES = [
  {
    num: '01',
    title: 'Cryptographic SHA-256 Ledger',
    desc: 'Every certificate and credential is signed with an immutable hash, preventing forgery and unauthorized duplication.',
  },
  {
    num: '02',
    title: 'Instant Multi-Campus BGV',
    desc: 'Instant verification for recruiters, HR teams, and academic institutions across thousands of partner colleges.',
  },
  {
    num: '03',
    title: 'Tamper-Proof Digital ID Cards',
    desc: 'Unified member IDs linked to verified student portfolios, campus achievements, and alumni career roadmaps.',
  },
  {
    num: '04',
    title: 'Autonomous Verification API',
    desc: 'Real-time programmatic query support for background verification agencies, automated scanners, and ATS systems.',
  },
];

export default function CertificateVerifyPortal() {
  const { id: queryId } = useLocalSearchParams<{ id?: string }>();
  const [searchId, setSearchId] = useState(queryId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  // BGV Request Form states
  const [bgvKind, setBgvKind] = useState<'single' | 'bulk' | 'api' | 'dispute'>('single');
  const [bgvConsent, setBgvConsent] = useState(false);
  const [bgvSubmitting, setBgvSubmitting] = useState(false);
  const [bgvSubmittedRef, setBgvSubmittedRef] = useState<string | null>(null);
  const [bgvForm, setBgvForm] = useState({
    name: '',
    email: '',
    org: '',
    phone: '',
    candidateName: '',
    credId: '',
    notes: '',
  });

  const handleBgvSubmit = () => {
    if (!bgvConsent || bgvSubmitting) return;
    setBgvSubmitting(true);
    setTimeout(() => {
      const ref = 'SA-BGV-' + Math.floor(100000 + Math.random() * 899999);
      setBgvSubmittedRef(ref);
      setBgvSubmitting(false);
      setTimeout(() => {
        setBgvSubmittedRef(null);
        setBgvConsent(false);
        setBgvForm({ name: '', email: '', org: '', phone: '', candidateName: '', credId: '', notes: '' });
      }, 5000);
    }, 700);
  };

  const handleVerify = async (idToVerify?: string) => {
    const targetId = (idToVerify || searchId).trim().toUpperCase();
    if (!targetId) {
      setError('Please enter a valid Certificate Unique ID or SA Member ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    // Instant local sample record check
    if (SAMPLE_RECORDS[targetId]) {
      setTimeout(() => {
        setResult(SAMPLE_RECORDS[targetId]);
        setLoading(false);
      }, 350);
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(targetId)}`);
      const data = await resp.json();

      if (resp.ok) {
        setResult(data);
        if (data.type === 'certificate' && !data.is_registered_member) {
          setTimeout(() => setShowSignupModal(true), 1200);
        }
        return;
      }

      const idResp = await fetch(`${API_BASE}/api/id-cards/${encodeURIComponent(targetId)}`);
      if (idResp.ok) {
        const idData = await idResp.json();
        setResult({
          type: 'id_card',
          user: {
            sa_id: idData.id || targetId,
            full_name: idData.full_name,
            role: idData.role_label || idData.role,
            institution: idData.institution || idData.org,
            branch: idData.branch,
            batch: idData.batch,
            email: idData.email,
            photo: idData.photo,
            status: idData.status,
            issued_at: idData.issued_at,
          },
          dynamic_attributes: {
            'Full Name': idData.full_name,
            'Role': idData.role_label || idData.role,
            'Institution': idData.institution || idData.org,
            'Batch / Year': idData.batch || '2026',
            'Location': [idData.city, idData.state].filter(Boolean).join(', ') || 'National Network',
          },
        });
        return;
      }

      setError(data?.detail || 'Credential not found in cryptographic registry. Please verify the ID.');
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (queryId) {
      setSearchId(queryId);
      handleVerify(queryId);
    }
  }, [queryId]);

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const downloadCertificate = (url: string, name: string) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.download = `${(name || 'Certificate').replace(/\s+/g, '_')}_StudentAlumni.png`;
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
      `MEMBER / CERT ID    : ${memberData.sa_id || memberData.id || searchId}\n` +
      `FULL NAME           : ${memberData.full_name || memberData.recipient_name || 'N/A'}\n` +
      `ROLE / TITLE        : ${memberData.role || memberData.title || 'Member'}\n` +
      `INSTITUTION / ORG   : ${memberData.institution || memberData.issuing_organization || 'Student Alumni Network'}\n` +
      `VERIFIED TIMESTAMP  : ${new Date().toISOString()}\n` +
      `SECURITY PROTOCOL   : Cryptographic SHA-256 Public Ledger\n` +
      `VERIFICATION SERVER : ${API_BASE}\n` +
      "=================================================================\n" +
      "This document confirms that the holder has an official, verified record\n" +
      "in the Student Alumni Network National Registry.\n" +
      "=================================================================";

    if (Platform.OS === 'web') {
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BGV_Report_${(memberData.sa_id || searchId).replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading && !result) {
    return (
      <View className="flex-1 relative" style={{  backgroundColor: '#05060F'  }}>
        <EchoHeader />
        <SAModernLoader subtitle="VERIFYING CRYPTOGRAPHIC REGISTRY" />
        <EchoFooter />
      </View>
    );
  }

  const certData = result?.certificate;
  const userData = result?.user;
  const isMember = result?.is_registered_member;
  const memberInfo = result?.member_info;
  const dynamicAttrs = result?.dynamic_attributes || {};
  const suggestedRoleLabel = result?.suggested_role_label || 'Member';
  const suggestedRole = result?.suggested_role || 'student';
  const isExternal = result?.type === 'certificate' && result?.issuer_type === 'external';

  return (
    <View className="flex-1 relative" style={{  backgroundColor: '#05060F'  }}>
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                background: #05060F !important;
                color: #F4F5FB !important;
                font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              }
              .sa-jewel-text {
                background: linear-gradient(135deg, #F5D0FE 0%, #C084FC 25%, #818CF8 50%, #38BDF8 75%, #E879F9 100%) !important;
                -webkit-background-clip: text !important;
                background-clip: text !important;
                -webkit-text-fill-color: transparent !important;
                display: inline-block !important;
              }
            `,
          }}
        />
      )}

      {/* Background Ambient Glows & Luxury SA Watermark */}
      <View className="absolute rounded-2xl" style={{  top: 0, left: '50%', transform: [{ translateX: -400 }], width: 800, height: 500, backgroundColor: 'rgba(91, 79, 233, 0.14)'  }} />
      <View className="absolute rounded-2xl" style={{  bottom: 200, right: 0, width: 600, height: 500, backgroundColor: 'rgba(124, 58, 237, 0.08)'  }} />
      <SAWatermark opacity={0.09} rotation="0deg" top={110} right={24} size={520} />

      <EchoHeader />

      <ScrollView className="flex-1" style={{  backgroundColor: '#05060F'  }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View className="items-center" style={{  paddingTop: ECHO_TOP_PADDING + 10, paddingBottom: 70, paddingHorizontal: Platform.OS === 'web' ? 24 : 16, width: '100%'  }}>
          <Animated.View entering={FadeIn.duration(400)} className="" style={{  width: '100%', maxWidth: 1240  }}>

            {/* 1. Hero Section */}
            <View className="items-center mb-10">
              {/* Badge */}
              <View className="flex-row items-center gap-2 px-4 rounded-2xl" style={{  paddingVertical: 7, backgroundColor: 'rgba(91, 79, 233, 0.15)'  }}>
                <ShieldCheck size={14} color="#8B84FF" />
                <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 11.5, letterSpacing: 1.4  }}>OFFICIAL CREDENTIAL & MEMBER REGISTRY</Text>
              </View>

              {/* Main Headline */}
              <Text className="font-body-bold text-center mb-4" style={{  fontSize: Platform.OS === 'web' ? 48 : 28, color: '#FFFFFF', letterSpacing: -1.4, lineHeight: Platform.OS === 'web' ? 56 : 36, fontFamily: Platform.OS === 'web' ? 'Manrope  }}>
                Verify Certificate &{' '}
                <Text className="" style={{  color: '#C084FC'  }}>SA Member ID</Text>
              </Text>

              <Text className="text-center mb-9" style={{  color: '#9AA0B4', fontSize: 16.5, maxWidth: 680, lineHeight: 26  }}>
                Instant cryptographic BGV validation for verified Certificate IDs, Faculty Awards,
                ECHO Badges, and SA Member IDs across campuses.
              </Text>

              {/* 2. Interactive Search Box */}
              <View className="flex-row gap-2.5 p-2.5 rounded-2xl border" style={{  width: '100%', maxWidth: 880, backgroundColor: '#0C0E1B', borderColor: '#1B1E33'  }}>
                <View className="flex-1 flex-row items-center rounded-2xl border" style={{  backgroundColor: '#070A1A', paddingHorizontal: 18, height: 56, borderColor: 'rgba(255, 255, 255, 0.06)'  }}>
                  <Search size={18} color="#8B84FF" className="mr-3.5" />
                  <TextInput
                    className="flex-1" style={{  color: '#F4F5FB', fontSize: 15, fontFamily: Platform.OS === 'web' ? 'Manrope, height: '100%'  }}
                    placeholder="Enter Certificate ID, Member ID, or Roll Number..."
                    placeholderTextColor="#64748b"
                    value={searchId}
                    onChangeText={setSearchId}
                    onSubmitEditing={() => handleVerify()}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  {searchId.length > 0 && (
                    <Pressable onPress={() => setSearchId('')} className="" style={{  padding: 6  }}>
                      <X size={16} color="#94a3b8" />
                    </Pressable>
                  )}
                </View>

                <Pressable
                  onPress={() => handleVerify()}
                  disabled={loading}
                  style={({ pressed }) => [styles.verifyBtn, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={['#5B4FE9', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="px-7 flex-row items-center justify-center gap-2" style={{  height: 56  }}
                  >
                    <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 15, letterSpacing: 0.2  }}>Verify Credential</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Sample IDs */}
              <View className="mt-5 flex-row items-center flex-wrap gap-2.5 justify-center">
                <Text className="font-body-semibold" style={{  color: '#64748B', fontSize: 12.5  }}>Try sample IDs:</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SAMPLE_CERT_IDS.map((sample) => (
                    <Pressable
                      key={sample.id}
                      onPress={() => {
                        setSearchId(sample.id);
                        handleVerify(sample.id);
                      }}
                      className="" style={{  backgroundColor: 'rgba(91, 79, 233, 0.1)'  }}
                    >
                      <Text className="font-body-semibold" style={{  color: '#8B84FF', fontSize: 12.5  }}>{sample.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* 3. Error Banner */}
            {error ? (
              <Animated.View entering={FadeInUp.duration(300)} className="flex-row items-center gap-3.5" style={{  backgroundColor: 'rgba(239, 68, 68, 0.08)'  }}>
                <View className="rounded-xl" style={{  width: 44, height: 44, backgroundColor: 'rgba(239, 68, 68, 0.15)'  }}>
                  <AlertCircle size={22} color="#EF4444" />
                </View>
                <View style={{  flex: 1  }}>
                  <Text className="font-body-bold" style={{  color: '#EF4444', fontSize: 16  }}>Verification Unsuccessful</Text>
                  <Text className="" style={{  color: '#fca5a5', fontSize: 13.5, marginTop: 2  }}>{error}</Text>
                </View>
              </Animated.View>
            ) : null}

            {/* 4. Verification Result Card */}
            {result && (
              <Animated.View entering={FadeInDown.duration(400)} className="rounded-2xl border mb-13" style={{  width: '100%', backgroundColor: '#0C0E1B', borderColor: '#1B1E33', padding: Platform.OS === 'web' ? 28 : 18  }}>

                {/* Status Bar */}
                <View className="flex-row items-center justify-between flex-wrap gap-3" style={{  borderBottomWidth: 1, borderBottomColor: '#171A2C', paddingBottom: 18, marginBottom: 22  }}>
                  <View className="flex-row items-center gap-2" style={{  backgroundColor: 'rgba(16, 185, 129, 0.12)'  }}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 13, letterSpacing: 0.5  }}>BGV STATUS: OFFICIALLY VERIFIED</Text>
                  </View>

                  <View className="flex-row items-center gap-1.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.12)'  }}>
                    <Hash size={13} color="#8B84FF" />
                    <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13.5, fontFamily: Platform.OS === 'web' ? 'Manrope  }}>
                      ID: {result.identifier || certData?.id || userData?.sa_id || searchId}
                    </Text>
                  </View>
                </View>

                {/* CASE A: Certificate Result */}
                {result.type === 'certificate' && certData ? (
                  <View className="gap-5.5">

                    {/* Member vs Non-Member Status */}
                    {isMember ? (
                      <View className="flex-row items-center gap-3.5" style={{  backgroundColor: 'rgba(16, 185, 129, 0.08)'  }}>
                        <UserCheck size={20} color="#10B981" />
                        <View style={{  flex: 1  }}>
                          <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 13.5  }}>Linked Student Alumni Member Account</Text>
                          <Text className="" style={{  color: '#94a3b8', fontSize: 12.5, marginTop: 2  }}>
                            Recipient:{' '}
                            <Text style={{  color: '#ffffff', fontWeight: '700'  }}>
                              {memberInfo?.full_name || certData.recipient_name}
                            </Text>{' '}
                            (Member SA ID: {memberInfo?.sa_id || 'Verified'})
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row items-center justify-between gap-3.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.08)'  }}>
                        <View className="flex-row items-center gap-3.5 flex-1">
                          <Award size={20} color="#8B84FF" />
                          <View style={{  flex: 1  }}>
                            <Text className="font-body-bold" style={{  color: '#F4F5FB', fontSize: 14  }}>Are you the recipient of this credential?</Text>
                            <Text className="" style={{  color: '#9AA0B4', fontSize: 12.5, marginTop: 2  }}>
                              Claim this certificate to showcase it on your official Student Alumni profile.
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => router.push(`/get-started?role=${suggestedRole}`)}
                          className="flex-row items-center gap-1.5 px-4 rounded-xl" style={{  backgroundColor: '#5B4FE9', paddingVertical: 9  }}
                        >
                          <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 13  }}>Claim Credential</Text>
                          <ChevronRight size={14} color="#ffffff" />
                        </Pressable>
                      </View>
                    )}

                    {/* Certificate Image Preview */}
                    {certData.image_url && (
                      <View className="rounded-2xl overflow-hidden border p-3.5 items-center" style={{  backgroundColor: '#070A1A', borderColor: '#1B1E33'  }}>
                        <Pressable
                          onPress={() => setShowImageZoom(true)}
                          className="relative items-center" style={{  width: '100%'  }}
                        >
                          <Image
                            source={{
                              uri: certData.image_url.startsWith('http')
                                ? certData.image_url
                                : `${API_BASE}${certData.image_url}`,
                            }}
                            className="rounded-xl" style={{  width: '100%', height: Platform.OS === 'web' ? 520 : 250  }}
                            resizeMode="contain"
                          />
                          <View className="absolute flex-row items-center gap-1.5" style={{  bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.75)'  }}>
                            <Search size={12} color="#fff" />
                            <Text className="font-body-semibold" style={{  color: '#fff', fontSize: 11.5  }}>Click to view full preview</Text>
                          </View>
                        </Pressable>
                      </View>
                    )}

                    {/* Metadata Grid */}
                    <View className="rounded-2xl p-6 border gap-4" style={{  backgroundColor: '#0A0C18', borderColor: '#171A2C'  }}>
                      <Text className="font-body-bold uppercase" style={{  color: '#8B84FF', fontSize: 12.5, letterSpacing: 1.2, marginBottom: 4  }}>Credential Verification Details</Text>
                      <View className="flex-row flex-wrap gap-3.5">
                        <MetaItem label="Recipient Name" value={certData.recipient_name} icon={User} />
                        <MetaItem label="Certificate ID" value={certData.id || certData.certificate_id} icon={Hash} />
                        {certData.roll_number && (
                          <MetaItem label="Roll / Registration No" value={certData.roll_number} icon={Award} />
                        )}
                        {certData.branch && (
                          <MetaItem label="Branch / Program" value={certData.branch} icon={BookOpen} />
                        )}
                        <MetaItem
                          label="Issuing Organization"
                          value={certData.issuing_organization || certData.issuer || 'Student Alumni Network'}
                          icon={Building2}
                        />
                        <MetaItem
                          label="Issue Date"
                          value={certData.issue_date || '2026-02-15'}
                          icon={Calendar}
                        />

                        {Object.entries(dynamicAttrs).map(([attrKey, attrVal]) => {
                          if (['Recipient Name', 'Certificate ID', 'Roll Number', 'Branch', 'Issue Date'].includes(attrKey)) {
                            return null;
                          }
                          return (
                            <MetaItem
                              key={attrKey}
                              label={attrKey}
                              value={String(attrVal)}
                              icon={Layers}
                            />
                          );
                        })}
                      </View>

                      {/* Cryptographic SHA-256 Hash Box */}
                      {certData.verification_hash && (
                        <View className="mt-2 p-4 rounded-2xl border" style={{  backgroundColor: '#05060F', borderColor: '#1B1E33'  }}>
                          <View className="flex-row items-center justify-between mb-2.5">
                            <View style={{  flexDirection: 'row', alignItems: 'center', gap: 6  }}>
                              <Lock size={13} color="#10B981" />
                              <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 12.5, letterSpacing: 0.2  }}>Cryptographic SHA-256 Signature</Text>
                            </View>
                            <Pressable
                              onPress={() => copyToClipboard(certData.verification_hash)}
                              className="flex-row items-center gap-1.5" style={{  backgroundColor: 'rgba(91, 79, 233, 0.12)'  }}
                            >
                              {copiedHash ? (
                                <Check size={12} color="#10B981" />
                              ) : (
                                <Copy size={12} color="#8B84FF" />
                              )}
                              <Text style={[styles.copyBtnText, copiedHash && { color: '#10B981' }]}>
                                {copiedHash ? 'Copied' : 'Copy Hash'}
                              </Text>
                            </Pressable>
                          </View>
                          <Text className="font-body-semibold" style={{  color: '#10B981', fontSize: 13.5, fontFamily: Platform.OS === 'web' ? 'Manrope, letterSpacing: 0.5  }}>{certData.verification_hash}</Text>
                        </View>
                      )}
                    </View>

                    {/* External Credential notice */}
                    {isExternal && (
                      <View className="" style={{  backgroundColor: 'rgba(91, 79, 233, 0.06)'  }}>
                        <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 14  }}>Third-Party Accredited Issuer</Text>
                        <Text className="" style={{  color: '#9AA0B4', fontSize: 13, lineHeight: 19, marginTop: 4  }}>
                          This credential is administered through an external accredited partner. You can also view
                          or verify this badge directly on the partner registry.
                        </Text>
                        {(certData.verify_url || certData.credential_url) && (
                          <Pressable
                            onPress={() => Linking.openURL(certData.verify_url || certData.credential_url)}
                            className="flex-row items-center gap-1.5 mt-3" style={{  alignSelf: 'flex-start'  }}
                          >
                            <ExternalLink size={14} color="#8B84FF" />
                            <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13  }}>Verify on Partner Portal</Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row gap-3.5 mt-2.5">
                      {certData.image_url && (
                        <Pressable
                          onPress={() => downloadCertificate(certData.image_url, certData.recipient_name)}
                          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl" style={{  backgroundColor: '#5B4FE9', height: 52  }}
                        >
                          <Download size={16} color="#ffffff" />
                          <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 14.5  }}>Download Official Certificate</Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => downloadBGVReport(certData)}
                        className="flex-1 flex-row items-center justify-center gap-2" style={{  backgroundColor: 'rgba(91, 79, 233, 0.1)'  }}
                      >
                        <FileCheck size={16} color="#8B84FF" />
                        <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 14.5  }}>Download BGV Report</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : result.type === 'id_card' && userData ? (
                  /* CASE B: SA Member ID Card Result */
                  <View className="gap-5.5">
                    {/* Member Banner */}
                    <View className="flex-row items-center gap-3.5" style={{  backgroundColor: 'rgba(16, 185, 129, 0.08)'  }}>
                      <UserCheck size={20} color="#10B981" />
                      <View style={{  flex: 1  }}>
                        <Text className="font-body-bold" style={{  color: '#10B981', fontSize: 13.5  }}>Verified Active Member Profile</Text>
                        <Text className="" style={{  color: '#94a3b8', fontSize: 12.5, marginTop: 2  }}>
                          SA ID: <Text style={{  color: '#fff', fontWeight: '700'  }}>{userData.sa_id}</Text> —{' '}
                          {userData.role}
                        </Text>
                      </View>
                    </View>

                    {/* Digital Member Card Render */}
                    <View className="rounded-2xl overflow-hidden border" style={{  borderColor: '#2A2A55'  }}>
                      <LinearGradient
                        colors={['#171A2C', '#0C0E1B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="" style={{  padding: 26  }}
                      >
                        <View className="flex-row items-center justify-between" style={{  marginBottom: 22  }}>
                          <View className="flex-row items-center gap-2">
                            <View className="rounded-lg" style={{  width: 30, height: 30, backgroundColor: 'rgba(91, 79, 233, 0.2)'  }}>
                              <ShieldCheck size={16} color="#8B84FF" />
                            </View>
                            <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 14.5  }}>Student Alumni</Text>
                          </View>
                          <View className="" style={{  backgroundColor: 'rgba(91, 79, 233, 0.2)'  }}>
                            <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 10.5, letterSpacing: 1  }}>{String(userData.role).toUpperCase()}</Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-4.5">
                          <View className="rounded-2xl" style={{  width: 68, height: 68, backgroundColor: 'rgba(91, 79, 233, 0.15)'  }}>
                            {userData.photo ? (
                              <Image source={{ uri: userData.photo }} className="" style={{  width: 68, height: 68  }} />
                            ) : (
                              <User size={32} color="#8B84FF" />
                            )}
                          </View>
                          <View style={{  flex: 1  }}>
                            <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 22  }}>{userData.full_name}</Text>
                            <Text className="" style={{  color: '#9AA0B4', fontSize: 13.5, marginTop: 2  }}>{userData.institution || 'Verified Student Alumni'}</Text>
                            <Text className="font-body-bold" style={{  color: '#8B84FF', fontSize: 13, fontFamily: Platform.OS === 'web' ? 'Manrope, marginTop: 4  }}>ID: {userData.sa_id}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Member Profile Details */}
                    <View className="rounded-2xl p-6 border gap-4" style={{  backgroundColor: '#0A0C18', borderColor: '#171A2C'  }}>
                      <Text className="font-body-bold uppercase" style={{  color: '#8B84FF', fontSize: 12.5, letterSpacing: 1.2, marginBottom: 4  }}>Member Profile Details</Text>
                      <View className="flex-row flex-wrap gap-3.5">
                        <MetaItem label="Full Name" value={userData.full_name} icon={User} />
                        <MetaItem label="Member SA ID" value={userData.sa_id} icon={Hash} />
                        <MetaItem label="Platform Role" value={userData.role} icon={Award} />
                        <MetaItem label="Institution" value={userData.institution} icon={Building2} />
                        {userData.branch && <MetaItem label="Branch" value={userData.branch} icon={BookOpen} />}
                        {userData.batch && <MetaItem label="Batch" value={userData.batch} icon={Calendar} />}
                      </View>
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-3.5 mt-2.5">
                      <Pressable
                        onPress={() => downloadBGVReport(userData)}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl" style={{  backgroundColor: '#5B4FE9', height: 52  }}
                      >
                        <FileCheck size={16} color="#ffffff" />
                        <Text className="font-body-bold" style={{  color: '#ffffff', fontSize: 14.5  }}>Download Complete BGV Profile Report</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

              </Animated.View>
            )}

            {/* 5. What We Verify Section */}
            <View style={{  marginTop: 50, width: '100%'  }}>
              <Text style={{  fontSize: 11.5, fontWeight: '700', letterSpacing: 1.6, color: '#9AA0B4', marginBottom: 16  }}>
                WHAT WE VERIFY
              </Text>
              <View className="flex-row flex-wrap gap-4">
                <View className="flex-1 border rounded-2xl p-6" style={{  minWidth: 260, backgroundColor: '#0C0E1B', borderColor: '#1B1E33'  }}>
                  <View style={[styles.whatIconWrap, { backgroundColor: 'rgba(14, 110, 140, 0.15)', borderColor: 'rgba(14, 110, 140, 0.35)' }]}>
                    <CheckCircle2 size={18} color="#0E6E8C" />
                  </View>
                  <Text className="font-body-bold" style={{  fontSize: 17, color: '#FFFFFF', marginBottom: 6  }}>Certificates</Text>
                  <Text className="" style={{  fontSize: 13.5, lineHeight: 20, color: '#9AA0B4'  }}>
                    Workshop and course completion, with the issuing body and verified date.
                  </Text>
                </View>

                <View className="flex-1 border rounded-2xl p-6" style={{  minWidth: 260, backgroundColor: '#0C0E1B', borderColor: '#1B1E33'  }}>
                  <View style={[styles.whatIconWrap, { backgroundColor: 'rgba(91, 79, 233, 0.15)', borderColor: 'rgba(91, 79, 233, 0.35)' }]}>
                    <ShieldCheck size={18} color="#5B4FE9" />
                  </View>
                  <Text className="font-body-bold" style={{  fontSize: 17, color: '#FFFFFF', marginBottom: 6  }}>Member IDs</Text>
                  <Text className="" style={{  fontSize: 13.5, lineHeight: 20, color: '#9AA0B4'  }}>
                    Confirms a live college affiliation, student portfolio, and graduation year.
                  </Text>
                </View>

                <View className="flex-1 border rounded-2xl p-6" style={{  minWidth: 260, backgroundColor: '#0C0E1B', borderColor: '#1B1E33'  }}>
                  <View style={[styles.whatIconWrap, { backgroundColor: 'rgba(180, 83, 9, 0.15)', borderColor: 'rgba(180, 83, 9, 0.35)' }]}>
                    <Award size={18} color="#B45309" />
                  </View>
                  <Text className="font-body-bold" style={{  fontSize: 17, color: '#FFFFFF', marginBottom: 6  }}>ECHO Badges</Text>
                  <Text className="" style={{  fontSize: 13.5, lineHeight: 20, color: '#9AA0B4'  }}>
                    Non-transferable, tied to one SA ID, scannable at the national tech fest gate.
                  </Text>
                </View>
              </View>
            </View>

            {/* 6. Bulk & Enterprise BGV Request Section */}
            <View id="sa-bgv" className="border rounded-2xl p-7" style={{  marginTop: 50, width: '100%', backgroundColor: '#0C0E1B', borderColor: '#2A2A55'  }}>
              <View className="flex-row gap-8 items-start">
                {/* Left Column: Form */}
                <View style={{  flex: 1, minWidth: 280  }}>
                  <View style={{  display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 9  }}>
                    <FileCheck size={16} color="#8B84FF" />
                    <Text style={{  fontSize: 11.5, fontWeight: '700', letterSpacing: 1.6, color: '#8B84FF'  }}>
                      BULK & ENTERPRISE BGV
                    </Text>
                  </View>

                  <Text style={{  fontSize: 28, fontWeight: '700', letterSpacing: -1.1, color: '#FFFFFF', marginVertical: 10  }}>
                    Request a BGV check
                  </Text>
                  <Text style={{  fontSize: 14.5, lineHeight: 22, color: '#B6BACB', marginBottom: 22  }}>
                    Checking a batch of candidates, or verifying something that has no ID to hand? Send the details and our verification desk responds within one working day.
                  </Text>

                  {/* Purpose Selector Chips */}
                  <Text style={{  fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#9AA0B4', marginBottom: 10  }}>
                    WHAT DO YOU NEED VERIFIED?
                  </Text>
                  <View style={{  display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22  }}>
                    {(['single', 'bulk', 'api', 'dispute'] as const).map((k) => {
                      const labels = {
                        single: 'Single candidate',
                        bulk: 'Bulk batch (10+)',
                        api: 'API access',
                        dispute: 'Dispute a result',
                      };
                      const isSelected = bgvKind === k;
                      return (
                        <Pressable
                          key={k}
                          onPress={() => setBgvKind(k)}
                          style={[
                            styles.bgvChip,
                            isSelected && { backgroundColor: '#5B4FE9', borderColor: '#5B4FE9' },
                          ]}
                        >
                          <Text style={[styles.bgvChipText, isSelected && { color: '#FFFFFF' }]}>
                            {labels[k]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Form Fields */}
                  <View className="flex-row flex-wrap gap-3.5">
                    <View className="flex-1" style={{  minWidth: 220  }}>
                      <Text className="font-body-semibold" style={{  fontSize: 13, color: '#D5D8E4', marginBottom: 6  }}>Your name *</Text>
                      <TextInput
                        className="border rounded-xl px-3.5 py-3" style={{  backgroundColor: '#0A0C18', borderColor: '#1B1E33', fontSize: 14, color: '#FFFFFF'  }}
                        placeholder="e.g. Priya Menon"
                        placeholderTextColor="#555A70"
                        value={bgvForm.name}
                        onChangeText={(t) => setBgvForm({ ...bgvForm, name: t })}
                      />
                    </View>

                    <View className="flex-1" style={{  minWidth: 220  }}>
                      <Text className="font-body-semibold" style={{  fontSize: 13, color: '#D5D8E4', marginBottom: 6  }}>Work email *</Text>
                      <TextInput
                        className="border rounded-xl px-3.5 py-3" style={{  backgroundColor: '#0A0C18', borderColor: '#1B1E33', fontSize: 14, color: '#FFFFFF'  }}
                        placeholder="you@company.com"
                        placeholderTextColor="#555A70"
                        keyboardType="email-address"
                        value={bgvForm.email}
                        onChangeText={(t) => setBgvForm({ ...bgvForm, email: t })}
                      />
                    </View>

                    <View className="flex-1" style={{  minWidth: 220  }}>
                      <Text className="font-body-semibold" style={{  fontSize: 13, color: '#D5D8E4', marginBottom: 6  }}>Organisation *</Text>
                      <TextInput
                        className="border rounded-xl px-3.5 py-3" style={{  backgroundColor: '#0A0C18', borderColor: '#1B1E33', fontSize: 14, color: '#FFFFFF'  }}
                        placeholder="e.g. Deloitte India"
                        placeholderTextColor="#555A70"
                        value={bgvForm.org}
                        onChangeText={(t) => setBgvForm({ ...bgvForm, org: t })}
                      />
                    </View>

                    <View className="flex-1" style={{  minWidth: 220  }}>
                      <Text className="font-body-semibold" style={{  fontSize: 13, color: '#D5D8E4', marginBottom: 6  }}>Phone</Text>
                      <TextInput
                        className="border rounded-xl px-3.5 py-3" style={{  backgroundColor: '#0A0C18', borderColor: '#1B1E33', fontSize: 14, color: '#FFFFFF'  }}
                        placeholder="+91 ..."
                        placeholderTextColor="#555A70"
                        keyboardType="phone-pad"
                        value={bgvForm.phone}
                        onChangeText={(t) => setBgvForm({ ...bgvForm, phone: t })}
                      />
                    </View>

                    <View className="flex-1" style={{  minWidth: 220  }}>
                      <Text className="font-body-semibold" style={{  fontSize: 13, color: '#D5D8E4', marginBottom: 6  }}>Candidate name</Text>
                      <TextInput
                        className="border rounded-xl px-3.5 py-3" style={{  backgroundColor: '#0A0C18', borderColor: '#1B1E33', fontSize: 14, color: '#FFFFFF'  }}
                        placeholder="Name as on credential"
                        placeholderTextColor="#555A70"
                        value={bgvForm.candidateName}
                        onChangeText={(t) => setBgvForm({ ...bgvForm, candidateName: t })}
                      />
                    </View>

                    <View className="flex-1" style={{  minWidth: 220  }}>
                      <Text className="font-body-semibold" style={{  fontSize: 13, color: '#D5D8E4', marginBottom: 6  }}>Credential or roll number</Text>
                      <TextInput
                        className="border rounded-xl px-3.5 py-3" style={{  backgroundColor: '#0A0C18', borderColor: '#1B1E33', fontSize: 14, color: '#FFFFFF'  }}
                        placeholder="If you have one"
                        placeholderTextColor="#555A70"
                        value={bgvForm.credId}
                        onChangeText={(t) => setBgvForm({ ...bgvForm, credId: t })}
                      />
                    </View>
                  </View>

                  <View style={{  marginTop: 14  }}>
                    <Text className="font-body-semibold" style={{  fontSize: 13, color: '#D5D8E4', marginBottom: 6  }}>Anything else we should know</Text>
                    <TextInput
                      style={[styles.bgvInput, { minHeight: 70, textAlignVertical: 'top' }]}
                      placeholder="Volume, turnaround needed, or issuing institution..."
                      placeholderTextColor="#555A70"
                      multiline
                      value={bgvForm.notes}
                      onChangeText={(t) => setBgvForm({ ...bgvForm, notes: t })}
                    />
                  </View>

                  {/* DPDP Act 2023 Consent Checkbox */}
                  <Pressable
                    onPress={() => setBgvConsent(!bgvConsent)}
                    style={{  display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18  }}
                  >
                    <View
                      style={[
                        styles.checkboxWrap,
                        bgvConsent && { backgroundColor: '#5B4FE9', borderColor: '#5B4FE9' },
                      ]}
                    >
                      {bgvConsent && <Check size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={{  fontSize: 13, lineHeight: 18, color: '#B6BACB', flex: 1  }}>
                      I confirm the candidate has consented to this verification, as required under the DPDP Act 2023.
                    </Text>
                  </Pressable>

                  {/* Submit Button */}
                  <Pressable
                    onPress={handleBgvSubmit}
                    disabled={!bgvConsent || bgvSubmitting}
                    style={[
                      styles.bgvSubmitBtn,
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

  /* External Card */
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
  externalText: {
    color: '#9AA0B4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  externalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  externalLinkText: {
    color: '#8B84FF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Actions Grid */
  actionsGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 14,
    marginTop: 10,
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

  /* Digital ID Card Preview */
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

  /* Trust Section */
  trustSection: {
    marginTop: 24,
    marginBottom: 40,
    width: '100%',
  },
  trustHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  trustBadgeText: {
    color: '#8B84FF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  trustTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  trustSubtitle: {
    color: '#9AA0B4',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 580,
    lineHeight: 23,
    marginTop: 8,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  trustCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? '46%' : '100%',
    backgroundColor: '#0C0E1B',
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: '#1B1E33',
  },
  trustNum: {
    color: '#2A2E45',
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 12,
  },
  trustCardTitle: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  trustCardDesc: {
    color: '#9AA0B4',
    fontSize: 13.5,
    lineHeight: 21,
  },

  /* Modals */
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
  modalDialog: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#0C0E1B',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A55',
  },
  dialogClose: {
    position: 'absolute',
    top: 18,
    right: 18,
    padding: 6,
  },
  dialogIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(91, 79, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.3)',
  },
  dialogTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogDesc: {
    color: '#9AA0B4',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  dialogPrimaryBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#5B4FE9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dialogPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  dialogSecondaryBtn: {
    paddingVertical: 8,
  },
  dialogSecondaryBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },

  /* What We Verify Grid */
  whatWeVerifyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  whatCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#0C0E1B',
    borderWidth: 1,
    borderColor: '#1B1E33',
    borderRadius: 18,
    padding: 24,
  },
  whatIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  whatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  whatDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#9AA0B4',
  },

  /* BGV Section */
  bgvSection: {
    marginTop: 50,
    width: '100%',
    backgroundColor: '#0C0E1B',
    borderWidth: 1,
    borderColor: '#2A2A55',
    borderRadius: 22,
    padding: 30,
  },
  bgvLayout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 32,
    alignItems: 'flex-start',
  },
  bgvChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#0A0C18',
    borderWidth: 1,
    borderColor: '#1B1E33',
  },
  bgvChipText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#B6BACB',
  },
  bgvFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  bgvInputWrap: {
    flex: 1,
    minWidth: 220,
  },
  bgvLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D5D8E4',
    marginBottom: 6,
  },
  bgvInput: {
    backgroundColor: '#0A0C18',
    borderWidth: 1,
    borderColor: '#1B1E33',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  checkboxWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#2A2A55',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bgvSubmitBtn: {
    marginTop: 20,
    height: 50,
    backgroundColor: '#5B4FE9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgvSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bgvSidebar: {
    width: Platform.OS === 'web' ? 320 : '100%',
    gap: 14,
  },
  sidebarCard: {
    backgroundColor: '#0A0C18',
    borderWidth: 1,
    borderColor: '#1B1E33',
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  sidebarHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#9AA0B4',
    marginBottom: 4,
  },
  turnaroundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  turnaroundLabel: {
    fontSize: 13,
    color: '#B6BACB',
  },
  turnaroundVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  complianceText: {
    fontSize: 13,
    color: '#D5D8E4',
  },
});
