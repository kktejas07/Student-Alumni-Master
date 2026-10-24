// @ts-nocheck
/**
 * Student Portal — My Certificates Hub.
 * Allows students to view, search, sort, and download all their official certificates
 * (ECHO / Hackwave 3.0, Built by Sunset, Cyber Conclave, Workshops, Courses).
 */
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Linking, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Search, ArrowUpDown, Download, ExternalLink, CheckCircle2, ShieldCheck, Share2, Sparkles, Filter, Copy, Shield, Lock, X } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { EmptyState } from '../EmptyState';
import { fetchPortal } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { StudentPortalNavContext } from '../StudentPortalNavContext';
import { useTheme } from '@/src/theme/ThemeContext';

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
  const { isDark } = useTheme();
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
  // Admins/super-admins bypass the 100% gate so the owner can QA issued certs.
  const isAdmin = ['admin', 'superadmin', 'super_admin', 'super-admin'].includes(String((user as any)?.role || '').toLowerCase());
  const isLocked = !isAdmin && pct < 100;
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
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(`https://studentalumni.ai${url}`).catch(() => {});
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
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
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
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(abs, '_blank');
      else Linking.openURL(abs).catch(() => {});
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
        colors={isDark ? ['#1E1B4B', '#312E81'] : ['#2E1065', '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerBanner}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={24} color="#A5B4FC" />
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
        <View style={[s.lockBanner, { backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : '#FFFBEB', borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FCD34D' }]}>
          <Lock size={20} color={isDark ? '#FBBF24' : '#D97706'} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.lockTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>Login required to view certificates</Text>
            <Text style={[s.lockSub, { color: isDark ? '#E5E7EB' : '#78350F' }]}>No SA account found. Create an account or login to access your issued certificates.</Text>
          </View>
        </View>
      )}

      {/* 100% profile gate banner — masks certificates until complete */}
      {!!user && !compLoading && isLocked && (
        <View style={[s.lockBanner, { backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : '#FFFBEB', borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FCD34D' }]}>
          <Lock size={20} color={isDark ? '#FBBF24' : '#D97706'} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={[s.lockTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              {certs.length > 0
                ? `${certs.length} certificate${certs.length === 1 ? '' : 's'} issued — profile is ${pct}%`
                : `Complete your profile to 100% to unlock certificates (${pct}%)`}
            </Text>
            <Text style={[s.lockSub, { color: isDark ? '#E5E7EB' : '#78350F' }]}>
              {certs.length > 0
                ? `Your certificates are issued and verified but locked until your profile reaches 100%. Complete the missing items below to view codes, verify, and download. Missing: ${missingItems.join(', ')}`
                : 'Your certificates are issued but masked. Finish the remaining items to view codes and verify links.'}
              {missingItems.length > 0 && certs.length === 0 ? ` Missing: ${missingItems.join(', ')}` : ''}
            </Text>
            <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#FDE68A' }]}>
              <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: isDark ? '#F59E0B' : '#D97706' }]} />
            </View>
            <Pressable style={s.lockCta} onPress={goToProfile}>
              <Text style={s.lockCtaText}>Complete Profile Now →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Controls Bar: Search, Category Chips & Sorting */}
      <View style={[s.controlsCard, { backgroundColor: isDark ? SC.card : '#FFFFFF', borderColor: isDark ? SC.border : 'rgba(0,0,0,0.08)' }]}>
        {/* Search Bar */}
        <View style={[s.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC', borderColor: isDark ? 'transparent' : '#E2E8F0', borderWidth: isDark ? 0 : 1 }]}>
          <Search size={16} color={isDark ? SC.muted : '#64748B'} />
          <TextInput
            style={[s.searchInput, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
            placeholder="Search by title, issuer, or verification code..."
            placeholderTextColor={isDark ? SC.muted : '#94A3B8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Category Chips */}
        <View style={s.filterRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            <Text style={[s.filterLabel, { color: isDark ? SC.muted : '#475569' }]}>Category:</Text>
            {[
              { id: 'all', label: 'All Certs' },
              { id: 'echo', label: 'Hackwave 3.0' },
              { id: 'sunset', label: 'Built by Sunset' },
              { id: 'cyber', label: 'Cyber Conclave' },
              { id: 'workshop', label: 'Workshops' },
              { id: 'course', label: 'Courses' },
            ].map((cat) => {
              const isActive = filterCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setFilterCategory(cat.id)}
                  style={[
                    s.chip,
                    {
                      backgroundColor: isActive ? SC.primary : isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                      borderColor: isActive ? SC.primary : isDark ? SC.border : '#E2E8F0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.chipText,
                      {
                        color: isActive ? '#FFFFFF' : isDark ? SC.muted : '#475569',
                        fontFamily: isActive ? FONTS.bold : FONTS.med,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Sort Dropdown Selector */}
          <View style={s.sortBox}>
            <ArrowUpDown size={14} color={isDark ? SC.muted : '#64748B'} />
            <Text style={[s.sortLabel, { color: isDark ? SC.muted : '#475569' }]}>Sort:</Text>
            {[
              { id: 'newest', label: 'Newest First' },
              { id: 'oldest', label: 'Oldest First' },
              { id: 'title', label: 'Title (A-Z)' },
            ].map((sOption) => {
              const isActive = sortBy === sOption.id;
              return (
                <Pressable
                  key={sOption.id}
                  onPress={() => setSortBy(sOption.id as any)}
                  style={[
                    s.sortOption,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(99,102,241,0.20)'
                          : '#EEF2FF'
                        : isDark
                        ? 'rgba(255,255,255,0.04)'
                        : '#F8FAFC',
                      borderColor: isActive ? (isDark ? 'rgba(99,102,241,0.5)' : '#C7D2FE') : isDark ? 'transparent' : '#E2E8F0',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.sortOptionText,
                      {
                        color: isActive ? (isDark ? '#A5B4FC' : '#4F46E5') : isDark ? SC.muted : '#64748B',
                        fontFamily: isActive ? FONTS.bold : FONTS.med,
                      },
                    ]}
                  >
                    {sOption.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Certificates Grid List */}
      {loading ? (
        <ActivityIndicator size="large" color={SC.primary} style={{ marginVertical: 40 }} />
      ) : sortedCerts.length === 0 ? (
        <EmptyState
          variant="generic"
          title="No Certificates Found"
          body="No certificates match your search query or filter criteria."
          compact
        />
      ) : (
        <View style={s.grid}>
          {sortedCerts.map((cert) => (
            <View
              key={cert.id}
              style={[
                s.certCard,
                {
                  backgroundColor: isDark ? SC.card : '#FFFFFF',
                  borderColor: isDark ? SC.border : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
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
                  <View style={[s.verifiedTag, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5', borderColor: isDark ? 'transparent' : '#A7F3D0', borderWidth: isDark ? 0 : 1 }]}>
                    <ShieldCheck size={12} color="#059669" />
                    <Text style={s.verifiedTagText}>SHA-256 Verified</Text>
                  </View>
                </View>
                <Text style={[s.certCode, { color: isDark ? SC.muted : '#64748B' }]}>{maskCode(cert.code)}</Text>
              </View>

              {/* Split row: info left, verify & download right */}
              <View style={s.cardSplitRow}>
                <View style={s.cardInfoCol}>
                  <Text style={[s.certTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={2}>{cert.title}</Text>
                  <Text style={[s.certIssuer, { color: isDark ? SC.muted : '#64748B' }]} numberOfLines={1}>Issued by {cert.issuer} • {cert.issued_at}</Text>
                </View>

                <View style={s.cardActionCol}>
                  <Pressable style={[s.actionBtnPrimary, isLocked && { opacity: 0.85 }]} onPress={() => openVerifyGated(cert.code)}>
                    {isLocked ? <Lock size={13} color="#fff" /> : <ShieldCheck size={13} color="#fff" />}
                    <Text style={s.actionBtnPrimaryText}>{isLocked ? `Unlock (${pct}%)` : 'Verify & Download'}</Text>
                  </Pressable>

                  <View style={s.actionIconRow}>
                    <Pressable
                      style={[
                        s.actionIconBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                          borderColor: isDark ? SC.border : '#E2E8F0',
                        },
                      ]}
                      onPress={() => copyLink(cert.code)}
                    >
                      <Copy size={13} color={isDark ? SC.primary : '#6D28D9'} />
                      <Text style={[s.actionIconText, { color: isDark ? SC.primary : '#6D28D9' }]}>{copiedCode === cert.code ? 'Copied!' : 'Copy'}</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        s.actionIconBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                          borderColor: isDark ? SC.border : '#E2E8F0',
                        },
                      ]}
                      onPress={() => handleDownload(cert)}
                    >
                      {downloading === cert.id ? (
                        <ActivityIndicator size="small" color={isDark ? SC.primary : '#6D28D9'} />
                      ) : (
                        <Download size={13} color={isDark ? SC.primary : '#6D28D9'} />
                      )}
                      <Text style={[s.actionIconText, { color: isDark ? SC.primary : '#6D28D9' }]}>{downloading === cert.id ? 'Saving…' : 'Download'}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Integrity fingerprint */}
              <View style={[s.hashBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', borderColor: isDark ? 'transparent' : '#E2E8F0', borderWidth: isDark ? 0 : 1 }]}>
                <Text style={[s.hashLabel, { color: isDark ? SC.muted : '#64748B' }]}>SHA-256 Integrity Fingerprint:</Text>
                <Text style={[s.hashVal, { color: isDark ? '#A5B4FC' : '#4F46E5' }]} numberOfLines={1}>
                  {isLocked ? '••••••••••••••••••••••••••••••••' : cert.sha256_hash}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 100% Profile Gate Modal */}
      <Modal transparent visible={gateModalVisible} animationType="fade" onRequestClose={() => setGateModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 }} onPress={() => setGateModalVisible(false)}>
          <Pressable
            onPress={(e: any) => e?.stopPropagation?.()}
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: isDark ? '#18182B' : '#FFFFFF',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(245,158,11,0.4)' : '#FCD34D',
              padding: 24,
              gap: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Lock size={20} color="#F59E0B" />
                <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: isDark ? '#FFFFFF' : '#0F172A' }}>Complete Profile to Unlock</Text>
              </View>
              <Pressable onPress={() => setGateModalVisible(false)}><X size={18} color={isDark ? SC.muted : '#64748B'} /></Pressable>
            </View>

            <Text style={{ fontFamily: FONTS.med, fontSize: 13, color: isDark ? '#C7D2FE' : '#334155', lineHeight: 19 }}>
              <Text style={{ fontFamily: FONTS.bold, color: isDark ? '#FFF' : '#0F172A' }}>{pendingCode || 'This certificate'}</Text> is masked until your SA profile reaches 100% (currently {pct}%).
            </Text>

            {missingItems.length > 0 && (
              <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFFBEB', borderColor: isDark ? 'transparent' : '#FDE68A', borderWidth: isDark ? 0 : 1, borderRadius: 10, padding: 12, gap: 6 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 12, color: isDark ? '#FBBF24' : '#92400E' }}>Remaining to reach 100%:</Text>
                {missingItems.slice(0, 6).map((m) => (
                  <Text key={m} style={{ fontFamily: FONTS.med, fontSize: 12, color: isDark ? '#E5E7EB' : '#78350F' }}>• {m}</Text>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <Pressable
                style={{
                  paddingHorizontal: 14,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setGateModalVisible(false)}
              >
                <Text style={{ color: isDark ? SC.muted : '#64748B', fontFamily: FONTS.bold, fontSize: 12 }}>Later</Text>
              </Pressable>
              <Pressable
                style={{
                  paddingHorizontal: 16,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: SC.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onPress={goToProfile}
              >
                <Text style={{ color: '#FFF', fontFamily: FONTS.bold, fontSize: 12 }}>Complete Profile Now →</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  headerBanner: { padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 18 },
  headerSub: { color: '#C7D2FE', fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  controlsCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontFamily: FONTS.med, fontSize: 13, outlineStyle: 'none' as any },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  filterLabel: { fontFamily: FONTS.bold, fontSize: 11 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11 },
  sortBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontFamily: FONTS.bold, fontSize: 11 },
  sortOption: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sortOptionText: { fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  certCard: { width: '48%' as any, minWidth: 320, flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  certBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedTagText: { color: '#059669', fontFamily: FONTS.bold, fontSize: 10 },
  certCode: { fontFamily: FONTS.mono || FONTS.bold, fontSize: 11 },
  certTitle: { fontFamily: FONTS.bold, fontSize: 15 },
  certIssuer: { fontFamily: FONTS.med, fontSize: 12 },
  hashBox: { padding: 8, borderRadius: 8, gap: 2 },
  hashLabel: { fontFamily: FONTS.bold, fontSize: 9.5 },
  hashVal: { fontFamily: FONTS.mono || FONTS.med, fontSize: 10 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cardSplitRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  cardInfoCol: { flex: 1, minWidth: 0, gap: 4 },
  cardActionCol: { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  actionIconRow: { flexDirection: 'row', gap: 8 },
  actionIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 28, borderRadius: 7, borderWidth: 1, justifyContent: 'center' },
  actionIconText: { fontFamily: FONTS.bold, fontSize: 10.5 },
  actionBtnPrimary: { height: 34, paddingHorizontal: 14, borderRadius: 8, backgroundColor: SC.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnPrimaryText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12 },
  lockBanner: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'flex-start' },
  lockTitle: { fontFamily: FONTS.bold, fontSize: 14 },
  lockSub: { fontFamily: FONTS.med, fontSize: 12, lineHeight: 18 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  lockCta: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center' },
  lockCtaText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12 },
});

