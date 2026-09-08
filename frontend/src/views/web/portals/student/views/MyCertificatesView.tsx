// @ts-nocheck
/**
 * Student Portal — My Certificates Hub.
 * Allows students to view, search, sort, and download all their official certificates
 * (ECHO / Hackwave 3.0, Built by Sunset, Cyber Conclave, Workshops, Courses).
 */
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Linking, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Search, ArrowUpDown, Download, ExternalLink, CheckCircle2, ShieldCheck, Share2, Sparkles, Filter, Copy, Shield, Lock, X } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { fetchPortal } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { StudentPortalNavContext } from '../StudentPortalNavContext';

export interface CertificateItem {
  id: string;
  code: string;
  title: string;
  category: 'echo' | 'sunset' | 'cyber' | 'workshop' | 'course';
  issuer: string;
  issued_at: string;
  recipient_name: string;
  recipient_email: string;
  sha256_hash: string;
  verified: boolean;
  download_url?: string;
  image_url?: string;
  file_url?: string;
  metadata?: any;
}

export function MyCertificatesView() {
  const user = useAuthStore((s) => s.user);
  const nav = useContext(StudentPortalNavContext);
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState<CertificateItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // 100% profile gate state (replaces Aadhaar/DigiLocker/PAN identity gate)
  const [completion, setCompletion] = useState<{ percentage: number; items: Array<{ label: string; done: boolean }> }>({ percentage: 0, items: [] });
  const [compLoading, setCompLoading] = useState(true);
  const [gateModalVisible, setGateModalVisible] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const pct = completion?.percentage ?? 0;
  const isLocked = pct < 100;
  const missingItems = (completion?.items || []).filter((i) => !i.done).map((i) => i.label);

  useEffect(() => {
    fetchMyCertificates();
    fetchCompletion();
  }, []);

  const fetchCompletion = async () => {
    setCompLoading(true);
    try {
      const comp = await request<any>('/users/me/completion');
      if (comp && typeof comp.percentage === 'number') {
        setCompletion({ percentage: comp.percentage, items: comp.items || [] });
      }
    } catch {
      setCompletion({ percentage: 0, items: [] });
    } finally {
      setCompLoading(false);
    }
  };

  const fetchMyCertificates = async () => {
    setLoading(true);
    try {
      const res = await fetchPortal<any>('/certificates/my');
      // Only show certificates actually issued to this user — never demo data.
      setCerts((res && res.certificates) || []);
    } catch (e) {
      setCerts([]);
    } finally {
      setLoading(false);
    }
  };

  const requireUnlocked = (code: string) => {
    if (isLocked) {
      setPendingCode(code);
      setGateModalVisible(true);
      return false;
    }
    return true;
  };

  const goToProfile = () => {
    setGateModalVisible(false);
    try {
      nav?.navigate('profile');
    } catch {}
  };

  const openVerifyGated = (code: string) => {
    if (!requireUnlocked(code)) return;
    const url = `/certificates/verify/${code}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const maskCode = (code: string) => {
    if (!isLocked) return code;
    if (!code || code.length < 4) return '••••••••';
    return `${code.slice(0, 4)}-••••-••••`;
  };

  const copyLink = (code: string) => {
    if (!requireUnlocked(code)) return;
    const url = `https://studentalumni.ai/certificates/verify/${code}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openVerify = (code: string) => {
    openVerifyGated(code);
  };

  const handleDownload = async (cert: CertificateItem) => {
    if (!requireUnlocked(cert.code)) return;
    const src = cert.download_url || cert.image_url || cert.file_url;
    if (!src) return;
    const abs = src.startsWith('http') ? src : `https://studentalumni.ai${src.startsWith('/') ? '' : '/'}${src}`;
    const ext = abs.toLowerCase().includes('.pdf') ? '.pdf' : '.png';
    try {
      setDownloading(cert.id);
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = abs;
        a.download = `certificate-${cert.code}${ext}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        Linking.openURL(abs);
      }
    } catch {
      if (typeof window !== 'undefined') window.open(abs, '_blank');
      else Linking.openURL(abs);
    } finally {
      setDownloading(null);
    }
  };

  // Filter & Sort logic
  const filteredCerts = certs.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === 'all' || c.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const sortedCerts = [...filteredCerts].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime();
    if (sortBy === 'oldest') return new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime();
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <View style={s.container}>
      {/* Header Banner */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerBanner}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={24} color="#818CF8" />
            <Text style={s.headerTitle}>My Issued Certificates</Text>
            <Badge label={`${certs.length} VERIFIED`} color="purple" />
          </View>
          <Text style={s.headerSub}>
            Access, download, and share your official credentials from ECHO Showcase, Hackwave 3.0, Workshops, and Courses.
          </Text>
        </View>
      </LinearGradient>

      {/* Not logged in — create account / login wall */}
      {!user && (
        <View style={s.lockBanner}>
          <Lock size={20} color="#FBBF24" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.lockTitle}>Login required to view certificates</Text>
            <Text style={s.lockSub}>No SA account found. Create an account or login to access your issued certificates.</Text>
          </View>
        </View>
      )}

      {/* 100% profile gate banner — masks certificates until complete */}
      {!!user && !compLoading && isLocked && (
        <View style={s.lockBanner}>
          <Lock size={20} color="#FBBF24" />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.lockTitle}>
              {certs.length > 0
                ? `${certs.length} certificate${certs.length === 1 ? '' : 's'} issued — profile is ${pct}%`
                : `Complete your profile to 100% to unlock certificates (${pct}%)`}
            </Text>
            <Text style={s.lockSub}>
              {certs.length > 0
                ? `Your certificates are issued and verified but locked until your profile reaches 100%. Complete the missing items below to view codes, verify, and download. Missing: ${missingItems.join(', ')}`
                : 'Your certificates are issued but masked. Finish the remaining items to view codes and verify links.'}
              {missingItems.length > 0 && certs.length === 0 ? ` Missing: ${missingItems.join(', ')}` : ''}
            </Text>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
            <Pressable style={s.lockCta} onPress={goToProfile}>
              <Text style={s.lockCtaText}>Complete Profile Now →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Controls Bar: Search, Category Chips & Sorting */}
      <View style={s.controlsCard}>
        {/* Search Bar */}
        <View style={s.searchBox}>
          <Search size={16} color={SC.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by title, issuer, or verification code..."
            placeholderTextColor={SC.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Category Chips */}
        <View style={s.filterRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            <Text style={s.filterLabel}>Category:</Text>
            {[
              { id: 'all', label: 'All Certs' },
              { id: 'echo', label: 'Hackwave 3.0' },
              { id: 'sunset', label: 'Built by Sunset' },
              { id: 'cyber', label: 'Cyber Conclave' },
              { id: 'workshop', label: 'Workshops' },
              { id: 'course', label: 'Courses' },
            ].map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setFilterCategory(cat.id)}
                style={[s.chip, filterCategory === cat.id && s.chipActive]}
              >
                <Text style={[s.chipText, filterCategory === cat.id && s.chipTextActive]}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Sort Dropdown Selector */}
          <View style={s.sortBox}>
            <ArrowUpDown size={14} color={SC.muted} />
            <Text style={s.sortLabel}>Sort:</Text>
            {[
              { id: 'newest', label: 'Newest First' },
              { id: 'oldest', label: 'Oldest First' },
              { id: 'title', label: 'Title (A-Z)' },
            ].map((sOption) => (
              <Pressable
                key={sOption.id}
                onPress={() => setSortBy(sOption.id as any)}
                style={[s.sortOption, sortBy === sOption.id && s.sortOptionActive]}
              >
                <Text style={[s.sortOptionText, sortBy === sOption.id && s.sortOptionTextActive]}>
                  {sOption.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Certificates Grid List */}
      {loading ? (
        <ActivityIndicator size="large" color={SC.primary} style={{ marginVertical: 40 }} />
      ) : sortedCerts.length === 0 ? (
        <View style={s.emptyCard}>
          <Award size={48} color={SC.muted} />
          <Text style={s.emptyTitle}>No Certificates Found</Text>
          <Text style={s.emptySub}>No certificates match your search query or filter criteria.</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {sortedCerts.map((cert) => (
            <View key={cert.id} style={s.certCard}>
              {/* Top: category badge + verified + code */}
              <View style={s.cardHeader}>
                <View style={s.certBadgeRow}>
                  <Badge
                    label={cert.category.toUpperCase()}
                    color={
                      cert.category === 'echo'
                        ? 'purple'
                        : cert.category === 'sunset'
                        ? 'amber'
                        : cert.category === 'cyber'
                        ? 'indigo'
                        : 'green'
                    }
                  />
                  <View style={s.verifiedTag}>
                    <ShieldCheck size={12} color="#10B981" />
                    <Text style={s.verifiedTagText}>SHA-256 Verified</Text>
                  </View>
                </View>
                <Text style={s.certCode}>{maskCode(cert.code)}</Text>
              </View>

              {/* Split row: info left, verify & download right */}
              <View style={s.cardSplitRow}>
                <View style={s.cardInfoCol}>
                  <Text style={s.certTitle} numberOfLines={2}>{cert.title}</Text>
                  <Text style={s.certIssuer} numberOfLines={1}>Issued by {cert.issuer} • {cert.issued_at}</Text>
                </View>

                <View style={s.cardActionCol}>
                  <Pressable style={[s.actionBtnPrimary, isLocked && { opacity: 0.85 }]} onPress={() => openVerifyGated(cert.code)}>
                    {isLocked ? <Lock size={13} color="#fff" /> : <ShieldCheck size={13} color="#fff" />}
                    <Text style={s.actionBtnPrimaryText}>{isLocked ? `Unlock (${pct}%)` : 'Verify & Download'}</Text>
                  </Pressable>

                  <View style={s.actionIconRow}>
                    <Pressable style={s.actionIconBtn} onPress={() => copyLink(cert.code)}>
                      <Copy size={13} color={SC.primary} />
                      <Text style={s.actionIconText}>{copiedCode === cert.code ? 'Copied!' : 'Copy'}</Text>
                    </Pressable>
                    <Pressable style={s.actionIconBtn} onPress={() => handleDownload(cert)}>
                      {downloading === cert.id ? (
                        <ActivityIndicator size="small" color={SC.primary} />
                      ) : (
                        <Download size={13} color={SC.primary} />
                      )}
                      <Text style={s.actionIconText}>{downloading === cert.id ? 'Saving…' : 'Download'}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Integrity fingerprint */}
              <View style={s.hashBox}>
                <Text style={s.hashLabel}>SHA-256 Integrity Fingerprint:</Text>
                <Text style={s.hashVal} numberOfLines={1}>
                  {isLocked ? '••••••••••••••••••••••••••••••••' : cert.sha256_hash}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 100% Profile Gate Modal (replaces Aadhaar/DigiLocker/PAN gate) */}
      <Modal transparent visible={gateModalVisible} animationType="fade" onRequestClose={() => setGateModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setGateModalVisible(false)}>
          <Pressable onPress={(e: any) => e?.stopPropagation?.()} style={{ width: '100%', maxWidth: 440, backgroundColor: '#18182B', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', padding: 22, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Lock size={20} color="#FBBF24" />
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#FFFFFF' }}>Complete Profile to Unlock</Text>
              </View>
              <Pressable onPress={() => setGateModalVisible(false)}><X size={18} color={SC.muted} /></Pressable>
            </View>

            <Text style={{ fontFamily: FONTS.med, fontSize: 12, color: '#C7D2FE' }}>
              <Text style={{ fontFamily: FONTS.bold, color: '#FFF' }}>{pendingCode || 'This certificate'}</Text> is masked until your SA profile reaches 100% (currently {pct}%).
            </Text>

            {missingItems.length > 0 && (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10, gap: 4 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: '#FBBF24' }}>Remaining to reach 100%:</Text>
                {missingItems.slice(0, 6).map((m) => (
                  <Text key={m} style={{ fontFamily: FONTS.med, fontSize: 11, color: '#E5E7EB' }}>• {m}</Text>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Pressable style={{ paddingHorizontal: 14, height: 34, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setGateModalVisible(false)}>
                <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>Later</Text>
              </Pressable>
              <Pressable style={{ paddingHorizontal: 16, height: 34, borderRadius: 8, backgroundColor: SC.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} onPress={goToProfile}>
                <Text style={{ color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 }}>Complete Profile Now →</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Sample fallback dataset for ECHO Hackwave 3.0 student certificates
const DEFAULT_STUDENT_CERTS: CertificateItem[] = [
  {
    id: 'cert_hw3_sunset_001',
    code: 'HW3-SUNSET-984A2C',
    title: 'Built by Sunset — Project Build Certificate',
    category: 'sunset',
    issuer: 'ECHO Showcase & Hackwave 3.0',
    issued_at: '2026-09-07',
    recipient_name: 'Student Alumni User',
    recipient_email: 'user@studentalumni.ai',
    sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    verified: true,
  },
  {
    id: 'cert_hw3_part_002',
    code: 'HW3-PART-771B89',
    title: 'Certificate of Participation — Hackwave 3.0',
    category: 'echo',
    issuer: 'Student Alumni Federation',
    issued_at: '2026-09-06',
    recipient_name: 'Student Alumni User',
    recipient_email: 'user@studentalumni.ai',
    sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    verified: true,
  },
  {
    id: 'cert_hw3_cyber_003',
    code: 'HW3-CYBER-342D11',
    title: 'Cyber Conclave Professional Certificate',
    category: 'cyber',
    issuer: 'Cyber Conclave & Student Alumni',
    issued_at: '2026-09-05',
    recipient_name: 'Student Alumni User',
    recipient_email: 'user@studentalumni.ai',
    sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    verified: true,
  },
  {
    id: 'cert_ws_004',
    code: 'WS-AI-AGENTS-109',
    title: 'Autonomous Multi-Agent Architecture Workshop',
    category: 'workshop',
    issuer: 'Student Alumni AI Academy',
    issued_at: '2026-08-20',
    recipient_name: 'Student Alumni User',
    recipient_email: 'user@studentalumni.ai',
    sha256_hash: 'bc54fe1a3597401c107593c6f8f5e7c2f6d2f3478950d885a53820257e841249',
    verified: true,
  },
];

const s = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  headerBanner: { padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 18 },
  headerSub: { color: '#C7D2FE', fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  controlsCard: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, color: SC.text, fontFamily: FONTS.med, fontSize: 13 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  filterLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: SC.border },
  chipActive: { backgroundColor: SC.primary, borderColor: SC.primary },
  chipText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11 },
  chipTextActive: { color: '#FFFFFF', fontFamily: FONTS.bold },
  sortBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  sortOption: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  sortOptionActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)' },
  sortOptionText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11 },
  sortOptionTextActive: { color: SC.primary, fontFamily: FONTS.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  certCard: { width: '48%' as any, minWidth: 320, flexGrow: 1, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  certBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.10)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedTagText: { color: '#10B981', fontFamily: FONTS.bold, fontSize: 10 },
  certCode: { color: SC.muted, fontFamily: FONTS.mono || FONTS.bold, fontSize: 11 },
  certTitle: { color: SC.text, fontFamily: FONTS.bold, fontSize: 15 },
  certIssuer: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
  hashBox: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 8, gap: 2 },
  hashLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 9.5 },
  hashVal: { color: '#A5B4FC', fontFamily: FONTS.mono || FONTS.med, fontSize: 10 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cardSplitRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  cardInfoCol: { flex: 1, minWidth: 0, gap: 4 },
  cardActionCol: { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  actionIconRow: { flexDirection: 'row', gap: 8 },
  actionIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 28, borderRadius: 7, borderWidth: 1, borderColor: SC.border, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center' },
  actionIconText: { color: SC.primary, fontFamily: FONTS.bold, fontSize: 10.5 },
  actionBtnPrimary: { flex: 1, height: 34, borderRadius: 8, backgroundColor: SC.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnPrimaryText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12 },
  actionBtnSecondary: { paddingHorizontal: 12, height: 34, borderRadius: 8, borderWidth: 1, borderColor: SC.border, backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnSecondaryText: { color: SC.primary, fontFamily: FONTS.bold, fontSize: 11.5 },
  emptyCard: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, padding: 40, alignItems: 'center', gap: 10 },
  emptyTitle: { color: SC.text, fontFamily: FONTS.bold, fontSize: 16 },
  emptySub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },
  lockBanner: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.35)', borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'flex-start' },
  lockTitle: { color: '#FDE68A', fontFamily: FONTS.bold, fontSize: 14 },
  lockSub: { color: '#E5E7EB', fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  lockCta: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center' },
  lockCtaText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12 },
});
