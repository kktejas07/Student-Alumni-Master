import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView, Image, ActivityIndicator, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  UserCog, Building2, GraduationCap, Briefcase, MapPin, Calendar,
  ShieldCheck, BookOpen, Award, Mail, ChevronLeft, Download, Hash, CheckCircle2, User,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

const GRAD_FROM = '#FB923C';
const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [certResult, setCertResult] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Try unified certificate / roll number lookup first
        const certResp = await fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(id)}`);
        if (certResp.ok) {
          const certJson = await certResp.json();
          if (certJson.type === 'certificate' || certJson.type === 'certificate_search_results') {
            setCertResult(certJson);
            setLoading(false);
            return;
          }
        }

        // Fallback to digital ID card lookup
        const resp = await fetch(`${API_BASE}/api/id-cards/${encodeURIComponent(id)}`);
        if (!resp.ok) {
          setError(resp.status === 404 ? 'Invalid Certificate ID or Member ID' : 'Verification failed');
          return;
        }
        setData(await resp.json());
      } catch {
        setError('Could not connect to verification server');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const downloadCert = (url: string, name: string) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.download = `${name.replace(/\s+/g, '_')}_Certificate.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Linking.openURL(fullUrl);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={GRAD_FROM} />
        <Text style={s.loadingText}>Verifying Credentials...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <MaterialCommunityIcons name="shield-off-outline" size={64} color="#ef4444" />
        <Text style={s.errorTitle}>{error}</Text>
        <Text style={s.errorSub}>The ID or certificate could not be verified.</Text>
        <Pressable onPress={() => router.push('/verify')} style={s.backBtn}>
          <ChevronLeft size={16} color="#fff" />
          <Text style={s.backBtnText}>Go to Verification Portal</Text>
        </Pressable>
      </View>
    );
  }

  // Render Certificate View
  if (certResult?.certificate) {
    const c = certResult.certificate;
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.container}>
        <Animated.View entering={FadeIn.duration(300)}>
          {/* Header */}
          <View style={s.header}>
            <Pressable onPress={() => router.push('/verify')} style={s.backArrow}>
              <ChevronLeft size={20} color="#fff" />
            </Pressable>
            <Text style={s.title}>Verified Certificate</Text>
          </View>

          {/* Verified Status Banner */}
          <View style={s.statusBanner}>
            <CheckCircle2 size={20} color="#10B981" />
            <Text style={s.statusBannerText}>OFFICIALLY VERIFIED & VALID</Text>
          </View>

          {/* Image Preview */}
          {c.image_url && (
            <View style={s.certImageWrapper}>
              <Image
                source={{ uri: c.image_url.startsWith('http') ? c.image_url : `${API_BASE}${c.image_url}` }}
                style={s.certImage}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Details Card */}
          <View style={s.detailsCard}>
            <Text style={s.sectionTitle}>Credential Details</Text>
            <DetailRow icon={User} label="Recipient Name" value={c.recipient_name} />
            <DetailRow icon={Hash} label="Certificate ID" value={c.id || c.certificate_id} />
            <DetailRow icon={Award} label="Roll Number" value={c.roll_number} />
            <DetailRow icon={BookOpen} label="Branch / Specialization" value={c.branch} />
            <DetailRow icon={Building2} label="Issuing Organization" value={c.issuing_organization || c.issuer} />
            <DetailRow icon={Calendar} label="Issue Date" value={c.issue_date || '2026-02-15'} />

            {c.verification_hash && (
              <View style={s.hashRow}>
                <Text style={s.hashLabel}>Security Hash Signature:</Text>
                <Text style={s.hashValue}>{c.verification_hash}</Text>
              </View>
            )}
          </View>

          {/* Download Action */}
          {c.image_url && (
            <Pressable
              onPress={() => downloadCert(c.image_url, c.recipient_name)}
              style={s.downloadBtn}
            >
              <Download size={18} color="#fff" />
              <Text style={s.downloadBtnText}>Download High-Resolution Certificate</Text>
            </Pressable>
          )}

          {/* Verified Footer */}
          <View style={s.verifiedBanner}>
            <ShieldCheck size={20} color="#10B981" />
            <Text style={s.verifiedText}>Verified by Student Alumni Network & ECHO 2026</Text>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

  // Render Digital ID Card View
  if (!data) return null;

  const role = (data.role || '').toLowerCase();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.push('/verify')} style={s.backArrow}>
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <Text style={s.title}>Digital ID Card</Text>
        </View>

        {/* ID Card */}
        <LinearGradient colors={['#FBBF24', '#F97316', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
          <View style={s.cardInner}>
            <View style={s.photoRow}>
              <View style={s.photoCircle}>
                {data.photo ? (
                  <Image source={{ uri: data.photo }} style={s.photo} />
                ) : (
                  <UserCog size={28} color="rgba(31,17,7,0.4)" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{data.full_name}</Text>
                <View style={s.roleBadge}>
                  <Text style={s.roleText}>{data.role_label || (data.role || '').toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <View style={s.idRow}>
              <Text style={s.idLabel}>ID</Text>
              <Text style={s.idValue}>{data.id}</Text>
            </View>

            {data.status && (
              <View style={s.statusRow}>
                <View style={[s.statusDot, { backgroundColor: data.status.color || '#10B981' }]} />
                <Text style={s.statusText}>{data.status.label || 'Verified'}</Text>
                <ShieldCheck size={14} color="#065f46" />
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Details Section */}
        <View style={s.detailsCard}>
          <Text style={s.sectionTitle}>Member Details</Text>
          <DetailRow icon={Mail} label="Email" value={data.email} />
          <DetailRow icon={Building2} label="Organization" value={data.org} />

          {role === 'student' && (
            <>
              <DetailRow icon={GraduationCap} label="Institution" value={data.institution} />
              <DetailRow icon={BookOpen} label="Branch" value={data.branch} />
              <DetailRow icon={Calendar} label="Batch" value={data.batch} />
              <DetailRow icon={MapPin} label="Location" value={[data.city, data.state].filter(Boolean).join(', ')} />
            </>
          )}

          {data.issued_at && (
            <DetailRow icon={Calendar} label="Issued" value={new Date(data.issued_at).toLocaleDateString()} />
          )}
        </View>

        {/* Verified Badge */}
        <View style={s.verifiedBanner}>
          <ShieldCheck size={20} color="#10B981" />
          <Text style={s.verifiedText}>Verified by Student Alumni Platform</Text>
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
        <Icon size={16} color="#F59E0B" />
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
  container: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, marginTop: 12 },
  errorTitle: { color: '#ef4444', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 12 },
  errorSub: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  backBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 50, width: '100%', maxWidth: 700 },
  backArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: 16, width: '100%', maxWidth: 700 },
  statusBannerText: { color: '#10B981', fontFamily: FONTS.bold, fontSize: 13, letterSpacing: 0.5 },
  certImageWrapper: { width: '100%', maxWidth: 700, backgroundColor: '#090d16', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155', padding: 8, marginBottom: 16 },
  certImage: { width: '100%', height: Platform.OS === 'web' ? 420 : 250, borderRadius: 10 },
  card: { width: '100%', maxWidth: 700, padding: 6, borderRadius: 22 },
  cardInner: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(31,17,7,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  photo: { width: 60, height: 60, borderRadius: 30 },
  cardName: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 22 },
  roleBadge: { backgroundColor: 'rgba(31,17,7,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: 'rgba(31,17,7,0.25)' },
  roleText: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 1 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  idLabel: { color: 'rgba(31,17,7,0.55)', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1.4 },
  idValue: { color: '#1f1107', fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", monospace' : FONTS.xbold) as any, fontSize: 17 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(5,150,105,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(5,150,105,0.25)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#065f46', fontFamily: FONTS.bold, fontSize: 11 },
  detailsCard: { width: '100%', maxWidth: 700, backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#94a3b8', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1.4, marginBottom: 14, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(51,65,85,0.4)' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  detailLabel: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 11, marginBottom: 2 },
  detailValue: { color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 14 },
  hashRow: { marginTop: 12, backgroundColor: '#090d16', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  hashLabel: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 11 },
  hashValue: { color: '#10B981', fontFamily: Platform.OS === 'web' ? 'monospace' : FONTS.med, fontSize: 12, marginTop: 2 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D97706', paddingVertical: 14, borderRadius: 12, marginTop: 16, width: '100%', maxWidth: 700 },
  downloadBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, backgroundColor: 'rgba(5,150,105,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(5,150,105,0.2)', width: '100%', maxWidth: 700 },
  verifiedText: { color: '#10B981', fontFamily: FONTS.bold, fontSize: 12 },
});
