/**
 * Dashboard Preview — per HTML spec screen "Dashboard Preview".
 *
 * Transition/welcome screen shown right after onboarding-success and before
 * the user lands on their role-specific portal.
 *
 *   "Welcome to SA! 🎉"
 *   "You're all set as a {Role}."
 *   "Redirecting to your {Role} Dashboard..."
 *   + 5 quick-link chips (Career AI · Internships · Network · Events · Wallet)
 *
 * Auto-redirects to the correct portal after 3s.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { FONTS } from '@/src/views/auth/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const CHIPS = [
  { id: 'career', label: 'Career AI',    emoji: '🧭' },
  { id: 'intern', label: 'Internships',  emoji: '💼' },
  { id: 'net',    label: 'Network',      emoji: '🤝' },
  { id: 'events', label: 'Events',       emoji: '📅' },
  { id: 'wallet', label: 'Wallet',       emoji: '💰' },
];

const ROLE_LABEL: Record<string, string> = {
  student: 'Student', mentor: 'Mentor', alumni: 'Alumni',
  college: 'College', admin: 'Admin',
};

export default function DashboardPreview() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'student';
  const roleName = ROLE_LABEL[role] || 'Student';

  useEffect(() => {
    // Auto-redirect after 2.5 seconds — consistent with spec demo
    const t = setTimeout(() => {
      router.replace(Platform.OS === 'web' ? '/platform' : '/(tabs)');
    }, 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <AuthShell role={role as any}>
      <View style={s.center}>
        <View style={s.spinnerCircle}>
          <ActivityIndicator size="large" color="#B07FDF" />
        </View>
        <Text style={s.title}>Welcome to SA! 🎉</Text>
        <Text style={s.sub}>
          You're all set as a <Text style={s.roleHl}>{roleName}</Text>.
        </Text>
        <Text style={s.redirect}>
          Redirecting to your <Text style={s.bold}>{roleName} Dashboard</Text>...
        </Text>

        <View style={s.chipRow}>
          {CHIPS.map((c) => (
            <View key={c.id} style={s.chip}>
              <Text style={s.chipEmoji}>{c.emoji}</Text>
              <Text style={s.chipLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 24 },
  spinnerCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.4)', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 28, marginBottom: 10, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 15, marginBottom: 6, textAlign: 'center' },
  roleHl: { color: '#B07FDF', fontFamily: FONTS.bold },
  redirect: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 13, marginBottom: 28, textAlign: 'center' },
  bold: { color: '#FFF', fontFamily: FONTS.bold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: 'rgba(124,58,237,0.38)', borderWidth: 1,
  },
  chipEmoji: { fontSize: 13 },
  chipLabel: { color: '#E9D5FF', fontFamily: FONTS.med, fontSize: 12.5 },
});
