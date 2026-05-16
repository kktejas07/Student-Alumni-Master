import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  UserCog, Building2, GraduationCap, Briefcase, MapPin, Calendar,
  ShieldCheck, BookOpen, Award, Mail, ChevronLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { FONTS } from '@/src/views/web/portals/superadmin/tokens';

const GRAD_FROM = '#FB923C';
const GRAD_TO = '#F59E0B';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/id-cards/${encodeURIComponent(id)}`);
        if (!resp.ok) {
          setError(resp.status === 404 ? 'Invalid ID card' : 'Verification failed');
          return;
        }
        setData(await resp.json());
      } catch {
        setError('Could not connect to server');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={GRAD_FROM} />
        <Text style={s.loadingText}>Verifying ID card...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <MaterialCommunityIcons name="shield-off-outline" size={64} color="#ef4444" />
        <Text style={s.errorTitle}>{error}</Text>
        <Text style={s.errorSub}>The ID could not be verified.</Text>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={16} color="#fff" />
          <Text style={s.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  const role = (data.role || '').toLowerCase();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backArrow}>
            <ChevronLeft size={20} color="#fff" />
          </Pressable>
          <Text style={s.title}>Digital ID Card</Text>
        </View>

        {/* ID Card */}
        <LinearGradient colors={['#FBBF24', '#F97316', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
          <View style={s.cardInner}>
            {/* Photo + Name */}
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

            {/* ID */}
            <View style={s.idRow}>
              <Text style={s.idLabel}>ID</Text>
              <Text style={s.idValue}>{data.id}</Text>
            </View>

            {/* Status */}
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
          <Text style={s.sectionTitle}>Details</Text>

          {/* Common fields */}
          <DetailRow icon={Mail} label="Email" value={data.email} />
          <DetailRow icon={Building2} label="Organization" value={data.org} />

          {/* Role-specific fields */}
          {role === 'student' && (
            <>
              <DetailRow icon={GraduationCap} label="Institution" value={data.institution} />
              <DetailRow icon={BookOpen} label="Branch" value={data.branch} />
              <DetailRow icon={Calendar} label="Batch" value={data.batch} />
              <DetailRow icon={MapPin} label="Location" value={[data.city, data.state].filter(Boolean).join(', ')} />
              <DetailRow icon={Award} label="Class" value={data.class_or_year} />
            </>
          )}

          {role === 'alumni' && (
            <>
              <DetailRow icon={GraduationCap} label="Institution" value={data.institution} />
              <DetailRow icon={Calendar} label="Graduated" value={data.graduation_year} />
              <DetailRow icon={Briefcase} label="Company" value={data.company} />
              <DetailRow icon={Award} label="Position" value={data.position} />
              <DetailRow icon={BookOpen} label="Branch" value={data.branch} />
              <DetailRow icon={MapPin} label="Location" value={[data.city, data.state].filter(Boolean).join(', ')} />
            </>
          )}

          {role === 'mentor' && (
            <>
              <DetailRow icon={Briefcase} label="Company" value={data.company} />
              <DetailRow icon={Award} label="Position" value={data.position} />
              <DetailRow icon={GraduationCap} label="Institution" value={data.institution} />
              <DetailRow icon={Calendar} label="Experience" value={data.years_experience ? `${data.years_experience} years` : ''} />
              {data.expertise?.length > 0 && (
                <View style={s.detailRow}>
                  <View style={s.detailIconWrap}>
                    <Award size={16} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailLabel}>Expertise</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {data.expertise.map((s: string, i: number) => (
                        <View key={i} style={s.skillPill}>
                          <Text style={s.skillText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {role === 'college' && (
            <>
              <DetailRow icon={GraduationCap} label="Institution" value={data.institution} />
              <DetailRow icon={Building2} label="Affiliation" value={data.affiliation} />
              <DetailRow icon={MapPin} label="Location" value={[data.city, data.state].filter(Boolean).join(', ')} />
              <DetailRow icon={Award} label="Students" value={data.students_count} />
              {data.departments?.length > 0 && (
                <View style={s.detailRow}>
                  <View style={s.detailIconWrap}>
                    <BookOpen size={16} color="#22D3EE" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailLabel}>Departments</Text>
                    <Text style={s.detailValue}>{data.departments.join(', ')}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {(role === 'admin' || role === 'superadmin' || role === 'super_admin') && (
            <>
              <DetailRow icon={Award} label="Title" value={data.title} />
              <DetailRow icon={ShieldCheck} label="Access" value={data.access_label} />
              <DetailRow icon={Building2} label="Colleges" value={data.colleges_count ? `${data.colleges_count} institutions` : ''} />
              <DetailRow icon={Briefcase} label="Admin ID" value={data.admin_id} />
              {data.permissions?.length > 0 && (
                <View style={s.detailRow}>
                  <View style={s.detailIconWrap}>
                    <ShieldCheck size={16} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.detailLabel}>Permissions</Text>
                    <Text style={s.detailValue}>{data.permissions.join(', ')}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {data.issued_at && (
            <DetailRow icon={Calendar} label="Issued" value={new Date(data.issued_at).toLocaleDateString()} />
          )}
        </View>

        {/* Verified Badge */}
        <View style={s.verifiedBanner}>
          <ShieldCheck size={20} color="#065f46" />
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
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, marginTop: 12 },
  errorTitle: { color: '#ef4444', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 12 },
  errorSub: { color: '#94a3b8', fontFamily: FONTS.med, fontSize: 14, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  backBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: Platform.OS === 'web' ? 20 : 50 },
  backArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20 },
  card: { padding: 6, borderRadius: 22, ...(Platform.OS === 'web' ? { boxShadow: '0 20px 50px rgba(217,119,6,0.25)' } as any : {}) },
  cardInner: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...(Platform.OS === 'web' ? { backdropFilter: 'blur(6px)' } as any : {}) },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(31,17,7,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  photo: { width: 60, height: 60, borderRadius: 30 },
  cardName: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 22 },
  roleBadge: { backgroundColor: 'rgba(31,17,7,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4, borderWidth: 1, borderColor: 'rgba(31,17,7,0.25)' },
  roleText: { color: '#1f1107', fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 1 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  idLabel: { color: 'rgba(31,17,7,0.55)', fontFamily: FONTS.xbold, fontSize: 9.5, letterSpacing: 1.4 },
  idValue: { color: '#1f1107', fontFamily: (Platform.OS === 'web' ? '"JetBrains Mono", "SF Mono", monospace' : FONTS.xbold) as any, fontSize: 17, letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(5,150,105,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(5,150,105,0.25)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#065f46', fontFamily: FONTS.bold, fontSize: 11 },
  detailsCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { color: '#94a3b8', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1.4, marginBottom: 14, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(51,65,85,0.4)' },
  detailIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(245,158,11,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  detailLabel: { color: '#64748b', fontFamily: FONTS.bold, fontSize: 11, marginBottom: 2 },
  detailValue: { color: '#e2e8f0', fontFamily: FONTS.med, fontSize: 14, lineHeight: 20 },
  skillPill: { backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  skillText: { color: '#fbbf24', fontFamily: FONTS.bold, fontSize: 11 },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, backgroundColor: 'rgba(5,150,105,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(5,150,105,0.2)' },
  verifiedText: { color: '#10B981', fontFamily: FONTS.bold, fontSize: 12 },
});
