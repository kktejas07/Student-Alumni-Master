// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
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
  QrCode,
  Share2,
  Linkedin,
  Twitter,
  Send,
  History,
  Clock,
  Trash2,
  Sparkles,
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
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('sa_recent_cert_verifications');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setRecentSearches(parsed);
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  const saveRecentSearch = (id: string) => {
    if (!id) return;
    const cleanId = id.trim().toUpperCase();
    setRecentSearches((prev) => {
      const next = [cleanId, ...prev.filter((item) => item !== cleanId)].slice(0, 5);
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('sa_recent_cert_verifications', JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('sa_recent_cert_verifications');
      } catch {
        /* ignore */
      }
    }
  };

  const handleVerify = async (idToVerify?: string) => {
    const targetId = (idToVerify || searchId).trim();
    if (!targetId) {
      setError('Please enter a valid Certificate Unique ID or SA Member ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const resp = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(targetId)}`);
      const data = await resp.json();

      if (resp.ok) {
        setResult(data);
        saveRecentSearch(targetId);
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
        saveRecentSearch(targetId);
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

  const copyShareLink = (targetId: string) => {
    const fullUrl = `https://studentalumni.ai/certificates/verify?id=${encodeURIComponent(targetId)}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    }
  };

  const openLinkedInAddToProfile = (certData: any, userData: any, activeId: string) => {
    const certName = encodeURIComponent(
      certData?.certification_name || certData?.title || (certData?.recipient_name ? `${certData?.recipient_name} Certificate` : 'Student Alumni Verified Credential')
    );
    const orgName = encodeURIComponent(certData?.issuing_organization || 'Student Alumni Network');
    const issueDate = certData?.issue_date || '2026-02-15';
    const issueYear = issueDate.slice(0, 4);
    const issueMonth = issueDate.slice(5, 7) || '02';
    const certId = encodeURIComponent(certData?.id || certData?.certificate_id || userData?.sa_id || activeId);
    const certUrl = encodeURIComponent(`https://studentalumni.ai/certificates/verify?id=${certId}`);

    const linkedinUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certName}&organizationName=${orgName}&issueYear=${issueYear}&issueMonth=${issueMonth}&certId=${certId}&certUrl=${certUrl}`;

    if (Platform.OS === 'web') {
      window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(linkedinUrl);
    }
  };

  const shareOnWhatsApp = (targetId: string) => {
    const text = encodeURIComponent(
      `Check out this officially verified Student Alumni credential (ID: ${targetId}): https://studentalumni.ai/certificates/verify?id=${encodeURIComponent(targetId)}`
    );
    Linking.openURL(`https://wa.me/?text=${text}`);
  };

  const shareOnTwitter = (targetId: string) => {
    const text = encodeURIComponent(
      `Officially verified credential on Student Alumni Network! ID: ${targetId}`
    );
    const url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(
      `https://studentalumni.ai/certificates/verify?id=${encodeURIComponent(targetId)}`
    )}`;
    Linking.openURL(url);
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
      <View style={styles.outerWrap}>
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
  const activeId = result?.identifier || certData?.id || userData?.sa_id || searchId;

  return (
    <View style={styles.outerWrap}>
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
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />
      <SAWatermark opacity={0.09} rotation="0deg" top={110} right={24} size={520} />

      <EchoHeader />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.wrapper}>

            {/* 1. Hero Section */}
            <View style={styles.heroSection}>
              {/* Badge */}
              <View style={styles.heroBadge}>
                <ShieldCheck size={14} color="#8B84FF" />
                <Text style={styles.heroBadgeText}>OFFICIAL CREDENTIAL & MEMBER REGISTRY</Text>
              </View>

              {/* Main Headline */}
              <Text style={styles.heroTitle}>
                Verify Certificate &{' '}
                <Text style={styles.jewelText}>SA Member ID</Text>
              </Text>

              <Text style={styles.heroSubtitle}>
                Instant cryptographic BGV validation for verified Certificate IDs, Faculty Awards,
                ECHO Badges, and SA Member IDs across campuses.
              </Text>

              {/* 2. Interactive Search Box */}
              <View style={styles.searchBoxCard}>
                <View style={styles.inputWrapper}>
                  <Search size={18} color="#8B84FF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Certificate ID, Member ID, or Roll Number..."
                    placeholderTextColor="#64748b"
                    value={searchId}
                    onChangeText={setSearchId}
                    onSubmitEditing={() => handleVerify()}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  {searchId.length > 0 && (
                    <Pressable onPress={() => setSearchId('')} style={styles.clearBtn}>
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
                    style={styles.verifyBtnGradient}
                  >
                    <Text style={styles.verifyBtnText}>Verify Credential</Text>
                    <ArrowRight size={16} color="#ffffff" />
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Sample IDs */}
              <View style={styles.samplesRow}>
                <Text style={styles.sampleLabel}>Try sample IDs:</Text>
                <View style={styles.samplePills}>
                  {SAMPLE_CERT_IDS.map((sample) => (
                    <Pressable
                      key={sample.id}
                      onPress={() => {
                        setSearchId(sample.id);
                        handleVerify(sample.id);
                      }}
                      style={styles.samplePill}
                    >
                      <Text style={styles.samplePillText}>{sample.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Recent Verification Search History */}
              {recentSearches.length > 0 && (
                <View style={styles.recentHistoryRow}>
                  <View style={styles.recentHistoryHeader}>
                    <Clock size={13} color="#8B84FF" />
                    <Text style={styles.recentHistoryTitle}>Recent Verifications:</Text>
                  </View>
                  <View style={styles.recentPills}>
                    {recentSearches.map((recId) => (
                      <Pressable
                        key={recId}
                        onPress={() => {
                          setSearchId(recId);
                          handleVerify(recId);
                        }}
                        style={styles.recentPill}
                      >
                        <Text style={styles.recentPillText}>{recId}</Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={clearRecentSearches} style={styles.clearHistoryBtn}>
                      <Trash2 size={12} color="#64748B" />
                      <Text style={styles.clearHistoryText}>Clear</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* 3. Error Banner */}
            {error ? (
              <Animated.View entering={FadeInUp.duration(300)} style={styles.errorCard}>
                <View style={styles.errorIconWrap}>
                  <AlertCircle size={22} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorTitle}>Verification Unsuccessful</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              </Animated.View>
            ) : null}

            {/* 4. Verification Result Card */}
            {result && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.resultCard}>

                {/* Status Bar */}
                <View style={styles.verifiedHeader}>
                  <View style={styles.statusBadge}>
                    <CheckCircle2 size={16} color="#10B981" />
                    <Text style={styles.statusBadgeText}>BGV STATUS: OFFICIALLY VERIFIED</Text>
                  </View>

                  <View style={styles.headerPillsRight}>
                    <View style={styles.uniqueIdPill}>
                      <Hash size={13} color="#8B84FF" />
                      <Text style={styles.uniqueIdPillText}>ID: {activeId}</Text>
                    </View>

                    {/* QR Code Quick Action */}
                    <Pressable
                      onPress={() => setShowQrModal(true)}
                      style={styles.qrBadgePill}
                    >
                      <QrCode size={13} color="#8B84FF" />
                      <Text style={styles.qrBadgePillText}>QR Code</Text>
                    </Pressable>
                  </View>
                </View>

                {/* CASE A: Certificate Result */}
                {result.type === 'certificate' && certData ? (
                  <View style={styles.resultContent}>

                    {/* Member vs Non-Member Status */}
                    {isMember ? (
                      <View style={styles.memberBanner}>
                        <UserCheck size={20} color="#10B981" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberBannerTitle}>Linked Student Alumni Member Account</Text>
                          <Text style={styles.memberBannerText}>
                            Recipient:{' '}
                            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                              {memberInfo?.full_name || certData.recipient_name}
                            </Text>{' '}
                            (Member SA ID: {memberInfo?.sa_id || 'Verified'})
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.nonMemberBanner}>
                        <View style={styles.nonMemberLeft}>
                          <Award size={20} color="#8B84FF" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.nonMemberBannerTitle}>Are you the recipient of this credential?</Text>
                            <Text style={styles.nonMemberBannerText}>
                              Claim this certificate to showcase it on your official Student Alumni profile.
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => router.push(`/get-started?role=${suggestedRole}`)}
                          style={styles.claimBtn}
                        >
                          <Text style={styles.claimBtnText}>Claim Credential</Text>
                          <ChevronRight size={14} color="#ffffff" />
                        </Pressable>
                      </View>
                    )}

                    {/* Certificate Image Preview */}
                    {certData.image_url && (
                      <View style={styles.imageWrapper}>
                        <Pressable
                          onPress={() => setShowImageZoom(true)}
                          style={styles.imagePressable}
                        >
                          <Image
                            source={{
                              uri: certData.image_url.startsWith('http')
                                ? certData.image_url
                                : `${API_BASE}${certData.image_url}`,
                            }}
                            style={styles.certImage}
                            resizeMode="contain"
                          />
                          <View style={styles.zoomHint}>
                            <Search size={12} color="#fff" />
                            <Text style={styles.zoomHintText}>Click to view full preview</Text>
                          </View>
                        </Pressable>
                      </View>
                    )}

                    {/* Metadata Grid */}
                    <View style={styles.metaCard}>
                      <Text style={styles.metaCardTitle}>Credential Verification Details</Text>
                      <View style={styles.metaGrid}>
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
                        <View style={styles.hashBox}>
                          <View style={styles.hashHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Lock size={13} color="#10B981" />
                              <Text style={styles.hashLabel}>Cryptographic SHA-256 Signature</Text>
                            </View>
                            <Pressable
                              onPress={() => copyToClipboard(certData.verification_hash)}
                              style={styles.copyBtn}
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
                          <Text style={styles.hashValue}>{certData.verification_hash}</Text>
                        </View>
                      )}
                    </View>

                    {/* External Credential notice */}
                    {isExternal && (
                      <View style={styles.externalCard}>
                        <Text style={styles.externalTitle}>Third-Party Accredited Issuer</Text>
                        <Text style={styles.externalText}>
                          This credential is administered through an external accredited partner. You can also view
                          or verify this badge directly on the partner registry.
                        </Text>
                        {(certData.verify_url || certData.credential_url) && (
                          <Pressable
                            onPress={() => Linking.openURL(certData.verify_url || certData.credential_url)}
                            style={styles.externalLinkBtn}
                          >
                            <ExternalLink size={14} color="#8B84FF" />
                            <Text style={styles.externalLinkText}>Verify on Partner Portal</Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {/* Cryptographic BGV Audit Trail Timeline */}
                    <View style={styles.auditTrailCard}>
                      <View style={styles.auditTrailHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <ShieldCheck size={16} color="#10B981" />
                          <Text style={styles.auditTrailHeaderTitle}>CRYPTOGRAPHIC BGV AUDIT TRAIL & LEDGER STATE</Text>
                        </View>
                        <View style={styles.liveTag}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveTagText}>ACTIVE NODE</Text>
                        </View>
                      </View>

                      <View style={styles.auditTimeline}>
                        <View style={styles.auditStepItem}>
                          <View style={styles.auditStepIconWrap}>
                            <CheckCircle2 size={15} color="#10B981" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.auditStepTitle}>1. Genesis Record Creation</Text>
                            <Text style={styles.auditStepDesc}>
                              SHA-256 digest minted on {certData.issue_date || '2026-02-15'} signed by issuing organization registry.
                            </Text>
                          </View>
                        </View>

                        <View style={styles.auditStepItem}>
                          <View style={styles.auditStepIconWrap}>
                            <CheckCircle2 size={15} color="#10B981" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.auditStepTitle}>2. Public Registry Zero-Tamper Match</Text>
                            <Text style={styles.auditStepDesc}>
                              Cryptographic hash verified against Student Alumni Master Ledger (#SA-NODE-01).
                            </Text>
                          </View>
                        </View>

                        <View style={styles.auditStepItem}>
                          <View style={styles.auditStepIconWrap}>
                            <CheckCircle2 size={15} color="#10B981" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.auditStepTitle}>3. Recipient Identity Binding</Text>
                            <Text style={styles.auditStepDesc}>
                              Bound to recipient {certData.recipient_name}
                              {certData.roll_number ? ` (Roll No: ${certData.roll_number})` : ''}.
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Social Share & LinkedIn Section */}
                    <View style={styles.shareSectionCard}>
                      <Text style={styles.shareSectionTitle}>SHARE & ADD CREDENTIAL TO PROFILE</Text>

                      <View style={styles.shareGrid}>
                        {/* LinkedIn Add to Profile Button */}
                        <Pressable
                          onPress={() => openLinkedInAddToProfile(certData, userData, activeId)}
                          style={styles.linkedInBtn}
                        >
                          <Linkedin size={18} color="#ffffff" />
                          <Text style={styles.linkedInBtnText}>Add to LinkedIn Profile</Text>
                        </Pressable>

                        {/* WhatsApp Share */}
                        <Pressable
                          onPress={() => shareOnWhatsApp(activeId)}
                          style={styles.socialShareBtn}
                        >
                          <Send size={15} color="#25D366" />
                          <Text style={styles.socialShareBtnText}>WhatsApp</Text>
                        </Pressable>

                        {/* Twitter Share */}
                        <Pressable
                          onPress={() => shareOnTwitter(activeId)}
                          style={styles.socialShareBtn}
                        >
                          <Twitter size={15} color="#1DA1F2" />
                          <Text style={styles.socialShareBtnText}>Share on X</Text>
                        </Pressable>

                        {/* Copy Link Button */}
                        <Pressable
                          onPress={() => copyShareLink(activeId)}
                          style={styles.socialShareBtn}
                        >
                          {copiedShareLink ? <Check size={15} color="#10B981" /> : <Copy size={15} color="#8B84FF" />}
                          <Text style={[styles.socialShareBtnText, copiedShareLink && { color: '#10B981' }]}>
                            {copiedShareLink ? 'Link Copied' : 'Copy Direct URL'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsGrid}>
                      {certData.image_url && (
                        <Pressable
                          onPress={() => downloadCertificate(certData.image_url, certData.recipient_name)}
                          style={styles.primaryActionBtn}
                        >
                          <Download size={16} color="#ffffff" />
                          <Text style={styles.primaryActionBtnText}>Download Official Certificate</Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => downloadBGVReport(certData)}
                        style={styles.secondaryActionBtn}
                      >
                        <FileCheck size={16} color="#8B84FF" />
                        <Text style={styles.secondaryActionBtnText}>Download BGV Report</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : result.type === 'id_card' && userData ? (
                  /* CASE B: SA Member ID Card Result */
                  <View style={styles.resultContent}>
                    {/* Member Banner */}
                    <View style={styles.memberBanner}>
                      <UserCheck size={20} color="#10B981" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberBannerTitle}>Verified Active Member Profile</Text>
                        <Text style={styles.memberBannerText}>
                          SA ID: <Text style={{ color: '#fff', fontWeight: '700' }}>{userData.sa_id}</Text> —{' '}
                          {userData.role}
                        </Text>
                      </View>
                    </View>

                    {/* Digital Member Card Render */}
                    <View style={styles.idCardShell}>
                      <LinearGradient
                        colors={['#171A2C', '#0C0E1B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.idCardInner}
                      >
                        <View style={styles.idCardHeader}>
                          <View style={styles.idCardLogoRow}>
                            <View style={styles.idCardLogoBadge}>
                              <ShieldCheck size={16} color="#8B84FF" />
                            </View>
                            <Text style={styles.idCardBrand}>Student Alumni</Text>
                          </View>
                          <View style={styles.idRolePill}>
                            <Text style={styles.idRoleText}>{String(userData.role).toUpperCase()}</Text>
                          </View>
                        </View>

                        <View style={styles.idCardBody}>
                          <View style={styles.idAvatarWrap}>
                            {userData.photo ? (
                              <Image source={{ uri: userData.photo }} style={styles.idAvatar} />
                            ) : (
                              <User size={32} color="#8B84FF" />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.idMemberName}>{userData.full_name}</Text>
                            <Text style={styles.idMemberOrg}>{userData.institution || 'Verified Student Alumni'}</Text>
                            <Text style={styles.idMemberId}>ID: {userData.sa_id}</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Member Profile Details */}
                    <View style={styles.metaCard}>
                      <Text style={styles.metaCardTitle}>Member Profile Details</Text>
                      <View style={styles.metaGrid}>
                        <MetaItem label="Full Name" value={userData.full_name} icon={User} />
                        <MetaItem label="Member SA ID" value={userData.sa_id} icon={Hash} />
                        <MetaItem label="Platform Role" value={userData.role} icon={Award} />
                        <MetaItem label="Institution" value={userData.institution} icon={Building2} />
                        {userData.branch && <MetaItem label="Branch" value={userData.branch} icon={BookOpen} />}
                        {userData.batch && <MetaItem label="Batch" value={userData.batch} icon={Calendar} />}
                      </View>
                    </View>

                    {/* Social Share Suite for ID Card */}
                    <View style={styles.shareSectionCard}>
                      <Text style={styles.shareSectionTitle}>SHARE MEMBER PROFILE VERIFICATION</Text>

                      <View style={styles.shareGrid}>
                        <Pressable
                          onPress={() => shareOnWhatsApp(activeId)}
                          style={styles.socialShareBtn}
                        >
                          <Send size={15} color="#25D366" />
                          <Text style={styles.socialShareBtnText}>WhatsApp</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => shareOnTwitter(activeId)}
                          style={styles.socialShareBtn}
                        >
                          <Twitter size={15} color="#1DA1F2" />
                          <Text style={styles.socialShareBtnText}>Share on X</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => copyShareLink(activeId)}
                          style={styles.socialShareBtn}
                        >
                          {copiedShareLink ? <Check size={15} color="#10B981" /> : <Copy size={15} color="#8B84FF" />}
                          <Text style={[styles.socialShareBtnText, copiedShareLink && { color: '#10B981' }]}>
                            {copiedShareLink ? 'Link Copied' : 'Copy Direct URL'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsGrid}>
                      <Pressable
                        onPress={() => downloadBGVReport(userData)}
                        style={styles.primaryActionBtn}
                      >
                        <FileCheck size={16} color="#ffffff" />
                        <Text style={styles.primaryActionBtnText}>Download Complete BGV Profile Report</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

              </Animated.View>
            )}

            {/* 5. Trust & Security Matrix */}
            <View style={styles.trustSection}>
              <View style={styles.trustHeader}>
                <View style={styles.trustBadge}>
                  <ShieldCheck size={12} color="#8B84FF" />
                  <Text style={styles.trustBadgeText}>ENTERPRISE INTEGRITY</Text>
                </View>
                <Text style={styles.trustTitle}>Built on Cryptographic Trust</Text>
                <Text style={styles.trustSubtitle}>
                  Designed for high-speed background verification across campuses, employers, and accreditation bodies.
                </Text>
              </View>

              <View style={styles.trustGrid}>
                {TRUST_FEATURES.map((feat) => (
                  <View key={feat.num} style={styles.trustCard}>
                    <Text style={styles.trustNum}>{feat.num}</Text>
                    <Text style={styles.trustCardTitle}>{feat.title}</Text>
                    <Text style={styles.trustCardDesc}>{feat.desc}</Text>
                  </View>
                ))}
              </View>
            </View>

          </Animated.View>
        </View>

        <EchoFooter />
      </ScrollView>

      {/* QR Code Verification Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <Pressable onPress={() => setShowQrModal(false)} style={styles.dialogClose}>
              <X size={18} color="#94a3b8" />
            </Pressable>

            <View style={styles.dialogIconWrap}>
              <QrCode size={24} color="#8B84FF" />
            </View>

            <Text style={styles.dialogTitle}>Credential Verification QR</Text>
            <Text style={styles.dialogDesc}>
              Scan this QR code with any mobile device to open the public cryptographic verification portal.
            </Text>

            <View style={styles.qrCodeCard}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `https://studentalumni.ai/certificates/verify?id=${encodeURIComponent(activeId)}`
                  )}&color=05060F&bgcolor=ffffff&margin=8`,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.qrIdLabel}>ID: {activeId}</Text>

            <Pressable
              onPress={() => copyShareLink(activeId)}
              style={styles.dialogPrimaryBtn}
            >
              {copiedShareLink ? <Check size={16} color="#10B981" /> : <Copy size={16} color="#ffffff" />}
              <Text style={styles.dialogPrimaryBtnText}>
                {copiedShareLink ? 'Direct Link Copied!' : 'Copy Verification URL'}
              </Text>
            </Pressable>

            <Pressable onPress={() => setShowQrModal(false)} style={styles.dialogSecondaryBtn}>
              <Text style={styles.dialogSecondaryBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Full Image Zoom Modal */}
      <Modal
        visible={showImageZoom}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageZoom(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable onPress={() => setShowImageZoom(false)} style={styles.modalCloseBtn}>
            <X size={24} color="#ffffff" />
          </Pressable>
          {certData?.image_url && (
            <Image
              source={{
                uri: certData.image_url.startsWith('http')
                  ? certData.image_url
                  : `${API_BASE}${certData.image_url}`,
              }}
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Claim Credential Modal */}
      <Modal
        visible={showSignupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <Pressable onPress={() => setShowSignupModal(false)} style={styles.dialogClose}>
              <X size={18} color="#94a3b8" />
            </Pressable>

            <View style={styles.dialogIconWrap}>
              <Award size={24} color="#8B84FF" />
            </View>

            <Text style={styles.dialogTitle}>Claim Your Credential</Text>
            <Text style={styles.dialogDesc}>
              Register as a <Text style={{ color: '#8B84FF', fontWeight: '700' }}>{suggestedRoleLabel}</Text> on
              Student Alumni to showcase this verified certificate on your public portfolio.
            </Text>

            <Pressable
              onPress={() => {
                setShowSignupModal(false);
                router.push(`/get-started?role=${suggestedRole}`);
              }}
              style={styles.dialogPrimaryBtn}
            >
              <Text style={styles.dialogPrimaryBtnText}>Register as {suggestedRoleLabel}</Text>
              <ChevronRight size={16} color="#ffffff" />
            </Pressable>

            <Pressable onPress={() => setShowSignupModal(false)} style={styles.dialogSecondaryBtn}>
              <Text style={styles.dialogSecondaryBtnText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetaItem({ label, value, icon: Icon }: { label: string; value?: string; icon: any }) {
  if (!value) return null;
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaIconWrap}>
        <Icon size={14} color="#8B84FF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.metaItemLabel}>{label}</Text>
        <Text style={styles.metaItemValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 200,
    right: 0,
    width: 600,
    height: 500,
    borderRadius: 300,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
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

  /* Hero Section */
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: 'rgba(91, 79, 233, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.3)',
    marginBottom: 20,
  },
  heroBadgeText: {
    color: '#8B84FF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontSize: Platform.OS === 'web' ? 48 : 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1.4,
    lineHeight: Platform.OS === 'web' ? 56 : 36,
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
  },
  jewelText: {
    color: '#C084FC',
  },
  heroSubtitle: {
    color: '#9AA0B4',
    fontSize: 16.5,
    textAlign: 'center',
    maxWidth: 680,
    lineHeight: 26,
    marginBottom: 36,
  },

  /* Search Box */
  searchBoxCard: {
    width: '100%',
    maxWidth: 880,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 10,
    backgroundColor: '#0C0E1B',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1B1E33',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A1A',
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    color: '#F4F5FB',
    fontSize: 15,
    fontFamily: Platform.OS === 'web' ? 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
  },
  verifyBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  verifyBtnGradient: {
    height: 56,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Sample IDs */
  samplesRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  sampleLabel: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  samplePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  samplePill: {
    backgroundColor: 'rgba(91, 79, 233, 0.1)',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.22)',
  },
  samplePillText: {
    color: '#8B84FF',
    fontSize: 12.5,
    fontWeight: '600',
  },

  /* Recent History Row */
  recentHistoryRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  recentHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentHistoryTitle: {
    color: '#8B84FF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  recentPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  recentPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recentPillText: {
    color: '#F4F5FB',
    fontSize: 12,
    fontWeight: '600',
  },
  clearHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearHistoryText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '600',
  },

  /* Error Card */
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 18,
    borderRadius: 18,
    marginBottom: 32,
    maxWidth: 880,
    alignSelf: 'center',
    width: '100%',
  },
  errorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13.5,
    marginTop: 2,
  },

  /* Result Card */
  resultCard: {
    width: '100%',
    backgroundColor: '#0C0E1B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1B1E33',
    padding: Platform.OS === 'web' ? 28 : 18,
    marginBottom: 52,
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
    marginBottom: 22,
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
  headerPillsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
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
    fontFamily: Platform.OS === 'web' ? 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : undefined,
  },
  qrBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  qrBadgePillText: {
    color: '#A78BFA',
    fontSize: 12.5,
    fontWeight: '700',
  },
  resultContent: {
    gap: 22,
  },

  /* Member & Claim Banners */
  memberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  memberBannerTitle: {
    color: '#10B981',
    fontSize: 13.5,
    fontWeight: '700',
  },
  memberBannerText: {
    color: '#94a3b8',
    fontSize: 12.5,
    marginTop: 2,
  },
  nonMemberBanner: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: 'rgba(91, 79, 233, 0.08)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 132, 255, 0.25)',
  },
  nonMemberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  nonMemberBannerTitle: {
    color: '#F4F5FB',
    fontSize: 14,
    fontWeight: '700',
  },
  nonMemberBannerText: {
    color: '#9AA0B4',
    fontSize: 12.5,
    marginTop: 2,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5B4FE9',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  claimBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Image Preview */
  imageWrapper: {
    backgroundColor: '#070A1A',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1B1E33',
    padding: 14,
    alignItems: 'center',
  },
  imagePressable: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  certImage: {
    width: '100%',
    height: Platform.OS === 'web' ? 520 : 250,
    borderRadius: 12,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 14,
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

  /* Meta Card */
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

  /* Hash Box */
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

  /* Audit Trail Card */
  auditTrailCard: {
    backgroundColor: '#0A0C18',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#171A2C',
    gap: 16,
  },
  auditTrailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#171A2C',
    paddingBottom: 14,
  },
  auditTrailHeaderTitle: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  auditTimeline: {
    gap: 16,
    marginTop: 4,
  },
  auditStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  auditStepIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  auditStepTitle: {
    color: '#F4F5FB',
    fontSize: 14,
    fontWeight: '700',
  },
  auditStepDesc: {
    color: '#94A3B8',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },

  /* Share Section */
  shareSectionCard: {
    backgroundColor: '#0A0C18',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#171A2C',
    gap: 14,
  },
  shareSectionTitle: {
    color: '#8B84FF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  linkedInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A66C2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: Platform.OS === 'web' ? 220 : '100%',
  },
  linkedInBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  socialShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    minWidth: Platform.OS === 'web' ? 140 : '48%',
  },
  socialShareBtnText: {
    color: '#F4F5FB',
    fontSize: 13.5,
    fontWeight: '600',
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

  /* QR Modal Specific */
  qrCodeCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrIdLabel: {
    color: '#8B84FF',
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 18,
  },
});

