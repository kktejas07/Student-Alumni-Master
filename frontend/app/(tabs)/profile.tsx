/**
 * Profile Tab — purple/Material rebrand + admin queue link + REAL stats
 *
 * Stats (booking count, sessions completed) are fetched from /api/bookings/me
 * for both students and mentors.
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  LogOut, Sparkles, Settings, Shield, HelpCircle, ChevronRight,
  Briefcase, Home as HomeIcon, CreditCard, ShieldCheck, Calendar,
  Users as UsersIcon,
} from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Button, Card, SALogo } from '@/src/views/components';
import { useAuth } from '@/src/viewmodels/hooks';
import { api } from '@/src/models/services/api';

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [bookingsCount, setBookingsCount] = useState(0);

  // Fetch real bookings to power live stats (instead of mock numbers)
  useEffect(() => {
    if (user?.role === 'student' || user?.role === 'mentor') {
      api.myBookings()
        .then((res) => setBookingsCount(res.bookings?.length || 0))
        .catch(() => {});
    }
  }, [user?.role]);

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  if (!user) return null;
  const initial = user.full_name?.[0]?.toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <SALogo size={28} variant="gradient" />
        </View>

        {/* User card with avatar */}
        <Card style={styles.userCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {user.face_image_base64 ? (
              <Image source={{ uri: user.face_image_base64 }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[Typography.h3, { color: C.textPrimary }]}>{user.full_name}</Text>
              <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{user.email}</Text>
              <View style={styles.roleTag}>
                <Text style={[Typography.label, { color: C.deepPurple, fontSize: 10 }]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Real stats grid */}
          {(user.role === 'student' || user.role === 'mentor') && (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Calendar size={16} color={C.brandPurple} />
                <Text style={styles.statValue}>{bookingsCount}</Text>
                <Text style={styles.statLabel}>
                  {user.role === 'mentor' ? 'SESSIONS' : 'BOOKINGS'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <UsersIcon size={16} color={C.brandPurple} />
                <Text style={styles.statValue}>{user.interests?.length || 0}</Text>
                <Text style={styles.statLabel}>INTERESTS</Text>
              </View>
              <View style={styles.statBox}>
                <Briefcase size={16} color={C.brandPurple} />
                <Text style={styles.statValue}>{user.skills?.length || 0}</Text>
                <Text style={styles.statLabel}>SKILLS</Text>
              </View>
            </View>
          )}
        </Card>

        {/* QR + Unique ID */}
        {user.qr_code_base64 && (
          <Card style={[styles.qrCard]} bg={C.deepPurple}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={[Typography.label, { color: C.lightPurple }]}>YOUR PLATFORM ID</Text>
              <Text style={[Typography.h3, { color: C.white }]} testID="profile-unique-id">
                {user.unique_id}
              </Text>
              <View style={styles.qrFrame}>
                <Image source={{ uri: `data:image/png;base64,${user.qr_code_base64}` }}
                  style={styles.qr} testID="profile-qr-image" />
              </View>
              <Text style={[Typography.bodySm, { color: C.lightPurple, textAlign: 'center' }]}>
                Mentors & alumni can scan to connect with you instantly.
              </Text>
            </View>
          </Card>
        )}

        {/* Institution info */}
        {user.school_info && (
          <Card style={{ marginTop: 14 }}>
            <Text style={[Typography.label, { color: C.textSecondary }]}>INSTITUTION</Text>
            <Text style={[Typography.bodyBold, { color: C.textPrimary, marginTop: 4 }]}>
              {user.school_info.institution_name}
            </Text>
            <Text style={[Typography.bodySm, { color: C.textSecondary }]}>
              {user.school_info.class_or_year}
              {user.school_info.branch_or_stream ? ` · ${user.school_info.branch_or_stream}` : ''}
            </Text>
            {user.career_path && (
              <View style={{ marginTop: 8 }}>
                <Text style={[Typography.label, { color: C.textSecondary }]}>CAREER PATH</Text>
                <Text style={[Typography.bodyBold, { color: C.brandPurple, marginTop: 2 }]}>
                  {user.career_path.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Quick links */}
        <Text style={styles.sectionTitle}>Quick links</Text>
        <View style={{ gap: 10 }}>
          <Row icon={Sparkles} label="My AI Career Roadmap"
            onPress={() => router.push('/(tabs)')} testID="profile-row-roadmap" />
          <Row icon={Calendar} label="My Bookings"
            onPress={() => router.push('/(tabs)/network')} testID="profile-row-bookings" />
          <Row icon={Briefcase} label="Internships"
            onPress={() => router.push('/internships')} testID="profile-row-internships" />
          <Row icon={HomeIcon} label="Housing & Insurance"
            onPress={() => router.push('/resources')} testID="profile-row-resources" />
          <Row icon={CreditCard} label="Education Loans"
            onPress={() => router.push('/resources?cat=loans')} testID="profile-row-loans" />
        </View>

        {/* Admin-only section: mentor approval queue */}
        {user.role === 'admin' && (
          <>
            <Text style={styles.sectionTitle}>Admin</Text>
            <Row icon={ShieldCheck} label="Mentor Approval Queue"
              tint={C.brandPurple}
              onPress={() => router.push('/admin/mentors')}
              testID="profile-row-admin-mentors" />
          </>
        )}

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={{ gap: 10 }}>
          <Row icon={Settings} label="Settings" onPress={() => {}} testID="profile-row-settings" />
          <Row icon={Shield} label="Privacy & Security" onPress={() => {}} testID="profile-row-privacy" />
          <Row icon={HelpCircle} label="Help & Support" onPress={() => {}} testID="profile-row-help" />
        </View>

        <Button title="Log out" variant="secondary"
          icon={<LogOut size={18} color={C.brandPurple} />}
          onPress={handleLogout} testID="profile-logout-btn"
          style={{ marginTop: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Row component — clickable list item with icon, label, chevron. */
function Row({ icon: Icon, label, onPress, testID, tint }: any) {
  return (
    <TouchableOpacity onPress={onPress} testID={testID} activeOpacity={0.7}>
      <Card style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: tint || C.palePurple }]}>
          <Icon size={18} color={tint ? C.white : C.deepPurple} />
        </View>
        <Text style={[Typography.bodyBold, { color: C.textPrimary, flex: 1 }]}>{label}</Text>
        <ChevronRight size={20} color={C.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h2, color: C.textPrimary },
  userCard: { padding: 18 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: C.surfaceMuted },
  avatarFallback: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: C.palePurple, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontFamily: 'DMSans_700Bold', fontSize: 30, color: C.deepPurple },
  roleTag: {
    alignSelf: 'flex-start', backgroundColor: C.palePurple,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 6,
  },
  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statBox: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: C.surfaceMuted, padding: 12, borderRadius: 12,
  },
  statValue: { ...Typography.h3, color: C.textPrimary, fontSize: 22 },
  statLabel: { ...Typography.label, color: C.textSecondary, fontSize: 9 },
  qrCard: { marginTop: 14, padding: 18 },
  qrFrame: { backgroundColor: C.white, padding: 8, borderRadius: 12, marginVertical: 4 },
  qr: { width: 160, height: 160 },
  sectionTitle: { ...Typography.label, color: C.textSecondary, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
