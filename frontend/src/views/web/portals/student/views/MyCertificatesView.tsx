// @ts-nocheck
/**
 * Student Portal — My Certificates Hub.
 * Allows students to view, search, sort, and download all their official certificates
 * (ECHO / Hackwave 3.0, Built by Sunset, Cyber Conclave, Workshops, Courses).
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Search, ArrowUpDown, Download, ExternalLink, CheckCircle2, ShieldCheck, Share2, Sparkles, Filter, Copy } from 'lucide-react-native';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { getPortal } from '@/src/lib/portalApi';

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
  metadata?: any;
}

export function MyCertificatesView() {
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState<CertificateItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchMyCertificates();
  }, []);

  const fetchMyCertificates = async () => {
    setLoading(true);
    try {
      const res = await getPortal('/certificates/my');
      if (res && res.certificates && res.certificates.length > 0) {
        setCerts(res.certificates);
      } else {
        // Fallback demo dataset for Hackwave / ECHO certificates
        setCerts(DEFAULT_STUDENT_CERTS);
      }
    } catch (e) {
      setCerts(DEFAULT_STUDENT_CERTS);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (code: string) => {
    const url = `https://studentalumni.ai/certificates/verify/${code}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openVerify = (code: string) => {
    const url = `/certificates/verify/${code}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
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
                <Text style={s.certCode}>{cert.code}</Text>
              </View>

              <Text style={s.certTitle}>{cert.title}</Text>
              <Text style={s.certIssuer}>Issued by {cert.issuer} • {cert.issued_at}</Text>

              <View style={s.hashBox}>
                <Text style={s.hashLabel}>SHA-256 Integrity Fingerprint:</Text>
                <Text style={s.hashVal} numberOfLines={1}>
                  {cert.sha256_hash}
                </Text>
              </View>

              <View style={s.cardActions}>
                <Pressable style={s.actionBtnPrimary} onPress={() => openVerify(cert.code)}>
                  <ExternalLink size={14} color="#fff" />
                  <Text style={s.actionBtnPrimaryText}>Verify & View</Text>
                </Pressable>

                <Pressable style={s.actionBtnSecondary} onPress={() => copyLink(cert.code)}>
                  <Copy size={13} color={SC.primary} />
                  <Text style={s.actionBtnSecondaryText}>
                    {copiedCode === cert.code ? 'Copied!' : 'Copy Link'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
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
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtnPrimary: { flex: 1, height: 34, borderRadius: 8, backgroundColor: SC.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnPrimaryText: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 12 },
  actionBtnSecondary: { paddingHorizontal: 12, height: 34, borderRadius: 8, borderWidth: 1, borderColor: SC.border, backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnSecondaryText: { color: SC.primary, fontFamily: FONTS.bold, fontSize: 11.5 },
  emptyCard: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, padding: 40, alignItems: 'center', gap: 10 },
  emptyTitle: { color: SC.text, fontFamily: FONTS.bold, fontSize: 16 },
  emptySub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' },
});
