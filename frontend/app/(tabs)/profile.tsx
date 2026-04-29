/**
 * Profile tab — User profile, QR code, unique ID, settings, logout.
 */
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  LogOut,
  Sparkles,
  Settings,
  Shield,
  HelpCircle,
  ChevronRight,
  Briefcase,
  Home as HomeIcon,
  CreditCard,
} from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, NeoCard } from '@/src/views/components';
import { useAuth } from '@/src/viewmodels/hooks';

const C = Colors.light;

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  if (!user) return null;

  const initial = user.full_name?.[0]?.toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {/* User Card */}
        <NeoCard shadow="md">
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
              <View style={[styles.roleTag, { backgroundColor: C.accentYellow }]}>
                <Text style={[Typography.caption, { color: C.textPrimary }]}>{user.role.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </NeoCard>

        {/* QR Code Card */}
        {user.qr_code_base64 && (
          <NeoCard bg={C.accentMint} shadow="md" style={{ marginTop: Spacing.md }}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={[Typography.caption, { color: C.textPrimary }]}>YOUR PLATFORM ID</Text>
              <Text style={[Typography.h3, { color: C.textPrimary }]} testID="profile-unique-id">
                {user.unique_id}
              </Text>
              <Image
                source={{ uri: `data:image/png;base64,${user.qr_code_base64}` }}
                style={styles.qr}
                testID="profile-qr-image"
              />
              <Text style={[Typography.bodySm, { color: C.textPrimary, opacity: 0.85, textAlign: 'center' }]}>
                Show this QR to mentors or alumni to connect.
              </Text>
            </View>
          </NeoCard>
        )}

        {/* School info */}
        {user.school_info && (
          <NeoCard shadow="sm" style={{ marginTop: Spacing.md }}>
            <Text style={[Typography.caption, { color: C.textSecondary }]}>INSTITUTION</Text>
            <Text style={[Typography.bodyBold, { color: C.textPrimary, marginTop: 4 }]}>
              {user.school_info.institution_name}
            </Text>
            <Text style={[Typography.bodySm, { color: C.textSecondary }]}>
              {user.school_info.class_or_year}
              {user.school_info.branch_or_stream ? ` · ${user.school_info.branch_or_stream}` : ''}
            </Text>
            {user.career_path && (
              <View style={{ marginTop: 8 }}>
                <Text style={[Typography.caption, { color: C.textSecondary }]}>CAREER PATH</Text>
                <Text style={[Typography.bodyBold, { color: C.textPrimary, marginTop: 2 }]}>
                  {user.career_path.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            )}
          </NeoCard>
        )}

        {/* Quick links */}
        <View style={{ marginTop: Spacing.lg, gap: 10 }}>
          <Text style={styles.sectionTitle}>Quick links</Text>
          <Row icon={Sparkles} color={C.accentPink} label="My AI Career Roadmap" onPress={() => router.push('/(tabs)')} testID="profile-row-roadmap" />
          <Row icon={Briefcase} color={C.accentMint} label="Internships" onPress={() => router.push('/internships')} testID="profile-row-internships" />
          <Row icon={HomeIcon} color={C.accentBlue} label="Housing & Insurance" onPress={() => router.push('/resources')} testID="profile-row-resources" />
          <Row icon={CreditCard} color={C.accentYellow} label="Education Loans" onPress={() => router.push('/resources?cat=loans')} testID="profile-row-loans" />
        </View>

        <View style={{ marginTop: Spacing.lg, gap: 10 }}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Row icon={Settings} color={C.surfaceMuted} label="Settings" onPress={() => {}} testID="profile-row-settings" />
          <Row icon={Shield} color={C.surfaceMuted} label="Privacy & Security" onPress={() => {}} testID="profile-row-privacy" />
          <Row icon={HelpCircle} color={C.surfaceMuted} label="Help & Support" onPress={() => {}} testID="profile-row-help" />
        </View>

        <Button
          title="Log out"
          variant="secondary"
          icon={<LogOut size={18} color={C.primary} />}
          onPress={handleLogout}
          testID="profile-logout-btn"
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon: Icon, color, label, onPress, testID }: any) {
  return (
    <TouchableOpacity onPress={onPress} testID={testID} activeOpacity={0.85}>
      <NeoCard shadow="sm">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.rowIcon, { backgroundColor: color }]}>
            <Icon size={18} color={C.textPrimary} />
          </View>
          <Text style={[Typography.bodyBold, { color: C.textPrimary, flex: 1 }]}>{label}</Text>
          <ChevronRight size={20} color={C.textSecondary} />
        </View>
      </NeoCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 100 },
  title: { ...Typography.h2, color: C.textPrimary, marginBottom: Spacing.md },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: C.border, backgroundColor: C.surfaceMuted },
  avatarFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: 'Outfit_700Bold', fontSize: 30, color: C.textPrimary },
  roleTag: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  qr: { width: 180, height: 180, borderRadius: 8, backgroundColor: C.surface, marginVertical: 8 },
  sectionTitle: { ...Typography.caption, color: C.textSecondary, marginBottom: 4 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
