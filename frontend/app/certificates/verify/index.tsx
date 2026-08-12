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
  ActivityIndicator,
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
  Sparkles,
  ChevronRight,
  UserCheck,
  UserPlus,
  X,
  FileCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

const SAMPLE_CERT_IDS = [
  { label: 'SA-EXC-2026-0002 (Excellence)', id: 'SA-EXC-2026-0002' },
  { label: 'SA-FAC-2026-0001 (Faculty)', id: 'SA-FAC-2026-0001' },
  { label: 'SA-AMB-2026-0012 (Ambassador)', id: 'SA-AMB-2026-0012' },
  { label: 'ECHO26-P-0001 (Specialization)', id: 'ECHO26-P-0001' },
];

export default function CertificateVerifyPortal() {
  const { id: queryId } = useLocalSearchParams<{ id?: string }>();
  const [searchId, setSearchId] = useState(queryId || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showSignupModal, setShowSignupModal] = useState(false);

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

      if (!resp.ok) {
        setError(data.detail || 'Credential not found. Please verify the ID.');
      } else {
        setResult(data);
        if (data.type === 'certificate' && !data.is_registered_member) {
          setTimeout(() => setShowSignupModal(true), 1200);
        }
      }
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

  const downloadCertificate = (url: string, name: string) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.download = `${name.replace(/\s+/g, '_')}_Certificate.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Linking.openURL(fullUrl);
    }
  };

  const downloadBGVReport = (memberData: any) => {
    const reportContent =
      "STUDENT ALUMNI NETWORK — BACKGROUND VERIFICATION (BGV) REPORT\n" +
      "=================================================================\n" +
      "VERIFICATION STATUS: OFFICIALLY VERIFIED ACTIVE MEMBER\n" +
      `MEMBER SA ID: ${memberData.sa_id}\n` +
      `FULL NAME: ${memberData.full_name}\n` +
      `ROLE: ${memberData.role}\n` +
      `INSTITUTION: ${memberData.institution}\n` +
      `VERIFIED AT: ${new Date().toISOString()}\n` +
      "VERIFICATION AUTHORITY: Student Alumni Network Cryptographic BGV Registry\n" +
      "=================================================================";

    if (Platform.OS === 'web') {
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BGV_Report_${memberData.sa_id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const certData = result?.certificate;
  const userData = result?.user;
  const isMember = result?.is_registered_member;
  const memberInfo = result?.member_info;
  const dynamicAttrs = result?.dynamic_attributes || {};
  const suggestedRoleLabel = result?.suggested_role_label || 'Member';
  const suggestedRole = result?.suggested_role || 'student';

  return (
    <View style={{ flex: 1, backgroundColor: '#090d16' }}>
      <EchoHeader />
      <ScrollView style={styles.scroll}>
        <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.wrapper}>
        
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.heroBadge}>
            <ShieldCheck size={16} color="#10B981" />
            <Text style={styles.heroBadgeText}>Background Verification (BGV) Engine</Text>
          </LinearGradient>

          <Text style={styles.heroTitle}>
            Verify <Text style={styles.gradientText}>Certificate & SA Member ID</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Instant BGV validation for unique Certificate IDs, Faculty Awards, and SA Member IDs across campuses.
          </Text>

          {/* Search Box */}
          <View style={styles.searchBoxContainer}>
            <View style={styles.inputWrapper}>
              <Search size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter Certificate Unique ID (e.g. SA-EXC-2026-0002 or ECHO26-P-0001)..."
                placeholderTextColor="#64748b"
                value={searchId}
                onChangeText={setSearchId}
                onSubmitEditing={() => handleVerify()}
                autoCapitalize="characters"
              />
              {searchId.length > 0 && (
                <Pressable onPress={() => setSearchId('')} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>×</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => handleVerify()}
              disabled={loading}
              style={({ pressed }) => [styles.verifyBtn, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verifyBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.verifyBtnText}>Verify Credential</Text>
                    <ChevronRight size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Sample IDs */}
          <View style={styles.samplesRow}>
            <Text style={styles.sampleLabel}>Sample Unique IDs:</Text>
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
        </View>

        {/* Error Banner */}
        {error ? (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.errorCard}>
            <AlertCircle size={24} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Verification Unsuccessful</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Verification Result Card */}
        {result && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.resultCard}>
            
            {/* Status Bar */}
            <View style={styles.verifiedHeader}>
              <View style={styles.statusBadge}>
                <CheckCircle2 size={18} color="#10B981" />
                <Text style={styles.statusBadgeText}>BGV STATUS: OFFICIALLY VERIFIED</Text>
              </View>

              <View style={styles.uniqueIdPill}>
                <Hash size={14} color="#38BDF8" />
                <Text style={styles.uniqueIdPillText}>ID: {result.identifier || certData?.id}</Text>
              </View>
            </View>

            {/* Case A: Certificate Result */}
            {result.type === 'certificate' && certData ? (
              <View>
                {/* Member vs Non-Member Banner */}
                {isMember ? (
                  <View style={styles.memberBanner}>
                    <UserCheck size={20} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberBannerTitle}>Linked Student Alumni Member Account</Text>
                      <Text style={styles.memberBannerText}>
                        Recipient: <Text style={{ color: '#fff', fontWeight: '700' }}>{memberInfo?.full_name}</Text> (Member SA ID: {memberInfo?.sa_id})
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.nonMemberBanner}>
                    <UserPlus size={20} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nonMemberBannerTitle}>Not a Registered Member Yet?</Text>
                      <Text style={styles.nonMemberBannerText}>
                        Register as a <Text style={{ color: '#F97316', fontWeight: '700' }}>{suggestedRoleLabel}</Text> to claim and showcase this credential on your public profile.
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push(`/get-started?role=${suggestedRole}`)}
                      style={styles.claimBtn}
                    >
                      <Text style={styles.claimBtnText}>Register as {suggestedRoleLabel}</Text>
                    </Pressable>
                  </View>
                )}

                {/* Certificate Preview Image */}
                {certData.image_url && (
                  <View style={styles.imageCardContainer}>
                    <Image
                      source={{ uri: certData.image_url.startsWith('http') ? certData.image_url : `${API_BASE}${certData.image_url}` }}
                      style={styles.certImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Dynamic Metadata Attributes */}
                <View style={styles.metaGrid}>
                  <Text style={styles.metaTitle}>Background Verification (BGV) Attributes</Text>

                  <View style={styles.gridRowWrap}>
                    {Object.entries(dynamicAttrs).map(([attrKey, attrVal]) => (
                      <View key={attrKey} style={styles.gridItemDynamic}>
                        <Text style={styles.itemLabel}>{attrKey}</Text>
                        <Text style={styles.itemValueBold}>{String(attrVal)}</Text>
                      </View>
                    ))}
                  </View>

                  {certData.verification_hash && (
                    <View style={styles.hashBox}>
                      <Text style={styles.hashLabel}>Cryptographic SHA-256 Signature:</Text>
                      <Text style={styles.hashValue}>{certData.verification_hash}</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {certData.image_url && (
                    <Pressable
                      onPress={() => downloadCertificate(certData.image_url, certData.recipient_name)}
                      style={styles.downloadBtn}
                    >
                      <Download size={18} color="#fff" />
                      <Text style={styles.downloadBtnText}>Download Official Certificate</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : result.type === 'id_card' && userData ? (
              /* Case B: SA Member ID Card & BGV Profile */
              <View style={styles.userCardBody}>
                <View style={styles.memberBanner}>
                  <UserCheck size={20} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberBannerTitle}>Verified Active Member Profile</Text>
                    <Text style={styles.memberBannerText}>SA ID: {userData.sa_id} — {userData.role}</Text>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <Text style={styles.metaTitle}>Member Profile Details</Text>
                  <View style={styles.gridRowWrap}>
                    <View style={styles.gridItemDynamic}>
                      <Text style={styles.itemLabel}>Full Name</Text>
                      <Text style={styles.itemValueBold}>{userData.full_name}</Text>
                    </View>
                    <View style={styles.gridItemDynamic}>
                      <Text style={styles.itemLabel}>Member SA ID</Text>
                      <Text style={styles.itemValueMono}>{userData.sa_id}</Text>
                    </View>
                    <View style={styles.gridItemDynamic}>
                      <Text style={styles.itemLabel}>Role</Text>
                      <Text style={styles.itemValueBold}>{userData.role}</Text>
                    </View>
                    <View style={styles.gridItemDynamic}>
                      <Text style={styles.itemLabel}>Institution</Text>
                      <Text style={styles.itemValueBold}>{userData.institution}</Text>
                    </View>
                  </View>

                  {result.linked_system_certificates?.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.metaTitle}>Issued System Certificates ({result.linked_system_certificates.length})</Text>
                      {result.linked_system_certificates.map((lc: any) => (
                        <View key={lc.id} style={styles.linkedCertRow}>
                          <Award size={16} color="#F59E0B" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{lc.title || lc.certification_name}</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 11 }}>ID: {lc.id} • {lc.issuer}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => downloadBGVReport(userData)}
                    style={styles.downloadBtn}
                  >
                    <FileCheck size={18} color="#fff" />
                    <Text style={styles.downloadBtnText}>Download Complete BGV Profile Report</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

          </Animated.View>
        )}

      </Animated.View>
        </View>

      <EchoFooter />

      {/* Role-specific Registration Modal Prompt */}
      <Modal
        visible={showSignupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Pressable onPress={() => setShowSignupModal(false)} style={styles.modalClose}>
              <X size={20} color="#94a3b8" />
            </Pressable>

            <View style={styles.modalIconWrap}>
              <Sparkles size={28} color="#F59E0B" />
            </View>

            <Text style={styles.modalTitle}>Claim Your Credential!</Text>
            <Text style={styles.modalSubtitle}>
              Register as a <Text style={{ color: '#F97316', fontWeight: '700' }}>{suggestedRoleLabel}</Text> on Student Alumni Network to link this certificate to your official profile!
            </Text>

            <Pressable
              onPress={() => {
                setShowSignupModal(false);
                router.push(`/get-started?role=${suggestedRole}`);
              }}
              style={styles.modalPrimaryBtn}
            >
              <Text style={styles.modalPrimaryBtnText}>Register as {suggestedRoleLabel}</Text>
              <ChevronRight size={18} color="#fff" />
            </Pressable>

            <Pressable
              onPress={() => setShowSignupModal(false)}
              style={styles.modalSecondaryBtn}
            >
              <Text style={styles.modalSecondaryBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    paddingTop: ECHO_TOP_PADDING + 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  wrapper: {
    width: '100%',
    maxWidth: 860,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 34 : 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  gradientText: {
    color: '#F59E0B',
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 580,
    lineHeight: 22,
    marginBottom: 28,
  },
  searchBoxContainer: {
    width: '100%',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    height: '100%',
  },
  clearBtn: {
    paddingHorizontal: 8,
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 20,
  },
  verifyBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  verifyBtnGradient: {
    height: 50,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  samplesRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  sampleLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  samplePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  samplePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  samplePillText: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    marginTop: 2,
  },
  resultCard: {
    backgroundColor: '#131c2e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: Platform.OS === 'web' ? 24 : 16,
    marginBottom: 30,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 16,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
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
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  uniqueIdPillText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
  },
  memberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16,
  },
  memberBannerTitle: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  memberBannerText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  nonMemberBanner: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 16,
  },
  nonMemberBannerTitle: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '700',
  },
  nonMemberBannerText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 2,
  },
  claimBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  claimBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  imageCardContainer: {
    backgroundColor: '#090d16',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 20,
  },
  certImage: {
    width: '100%',
    height: Platform.OS === 'web' ? 450 : 260,
    borderRadius: 12,
  },
  metaGrid: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  metaTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  gridRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItemDynamic: {
    minWidth: Platform.OS === 'web' ? '47%' : '100%',
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  itemValueBold: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  itemValueMono: {
    color: '#38BDF8',
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
    fontWeight: '700',
    marginTop: 2,
  },
  linkedCertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  hashBox: {
    marginTop: 6,
    backgroundColor: '#090d16',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  hashLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  hashValue: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
    marginTop: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D97706',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  userCardBody: {
    gap: 16,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  footerNoteText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
  },
  modalSecondaryBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
});
