/**
 * Profile Tab — native account screen.
 *
 * The full profile editor (ProfileSettingsView) is built for the web portals,
 * so the native tab shows the essentials: identity card, a few native-safe
 * shortcuts (Digital ID, Preferences, Notifications) and Sign out.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { IdCard, Settings, Bell, LogOut, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { Colors } from '@/src/theme';

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  alumni: 'Alumni',
  mentor: 'Mentor',
  college: 'College',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

type Row = { key: string; label: string; hint?: string; Icon: any; onPress: () => void };

export default function ProfileTab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [signingOut, setSigningOut] = useState(false);

  const name = displayName(user, 'Your account');
  const initials = displayInitials(user);
  const role = String(user?.role || 'student').toLowerCase();
  const roleLabel = ROLE_LABEL[role] || role;

  const doSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      router.replace('/(auth)/login' as any);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') { doSignOut(); return; }
    Alert.alert('Sign out', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  };

  const rows: Row[] = [
    { key: 'id-card', label: 'Digital ID', hint: 'Your verified SA student ID', Icon: IdCard, onPress: () => router.push('/id-card' as any) },
    { key: 'preferences', label: 'Preferences', hint: 'Theme, notifications, privacy', Icon: Settings, onPress: () => router.push('/preferences' as any) },
    { key: 'notifications', label: 'Notifications', Icon: Bell, onPress: () => router.push('/notifications' as any) },
  ];

  return (
    <View style={s.shell}>
      <LinearGradient colors={['#1A0438', '#2D0760']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.heading}>Profile</Text>

          <View style={s.card} testID="profile-identity">
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>{name}</Text>
              {user?.email ? <Text style={s.email} numberOfLines={1}>{user.email}</Text> : null}
              <View style={s.roleChip}>
                <ShieldCheck size={12} color="#C4B5FD" />
                <Text style={s.roleText}>{roleLabel}</Text>
              </View>
            </View>
          </View>

          <View style={s.list}>
            {rows.map((r, i) => (
              <Pressable
                key={r.key}
                onPress={r.onPress}
                style={({ pressed }) => [s.row, i < rows.length - 1 && s.rowDivider, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={r.label}
                testID={`profile-row-${r.key}`}
              >
                <View style={s.rowIcon}><r.Icon size={18} color="#DDD6FE" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{r.label}</Text>
                  {r.hint ? <Text style={s.rowHint}>{r.hint}</Text> : null}
                </View>
                <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={confirmSignOut}
            disabled={signingOut}
            style={({ pressed }) => [s.signOut, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            testID="profile-sign-out"
          >
            {signingOut ? (
              <ActivityIndicator color="#FCA5A5" />
            ) : (
              <>
                <LogOut size={18} color="#FCA5A5" />
                <Text style={s.signOutText}>Sign out</Text>
              </>
            )}
          </Pressable>

          <Text style={s.footnote}>Manage your full profile at studentalumni.ai</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#1A0438' },
  scroll: { padding: 20, paddingBottom: 40, gap: 16 },
  heading: { color: '#fff', fontSize: 28, fontFamily: 'Manrope_800ExtraBold', marginBottom: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
    borderRadius: 18, padding: 16,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  name: { color: '#fff', fontSize: 17, fontFamily: 'Manrope_700Bold' },
  email: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 8,
    backgroundColor: 'rgba(124,58,237,0.25)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  roleText: { color: '#C4B5FD', fontSize: 11, fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  list: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
    borderRadius: 18, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.25)', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: '#fff', fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  rowHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  signOut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.35)', backgroundColor: 'rgba(239,68,68,0.12)',
  },
  signOutText: { color: '#FCA5A5', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  footnote: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'Manrope_500Medium', textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
