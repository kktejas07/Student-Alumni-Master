/**
 * Register screen - basic credentials + role selection.
 */
import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, GraduationCap, Briefcase, Users, Building2 } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, Input, NeoCard } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import type { UserRole } from '@/src/models/entities';

const C = Colors.light;

const ROLES: { id: UserRole; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'student', label: 'Student', desc: 'Class 11+ / College', icon: GraduationCap, color: C.accentMint },
  { id: 'alumni', label: 'Alumni', desc: 'Graduated from a school/college', icon: Users, color: C.accentBlue },
  { id: 'mentor', label: 'Mentor', desc: 'Industry / Faculty professional', icon: Briefcase, color: C.accentYellow },
  { id: 'college', label: 'College', desc: 'Institution admin', icon: Building2, color: C.accentPink },
];

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password || !fullName) {
      setError('Please fill name, email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        phone: phone.trim() || undefined,
      });
      router.replace('/(onboarding)/role-info');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="register-back-btn" style={styles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.h1}>Create your account</Text>
          <Text style={styles.subtitle}>Tell us who you are — we'll personalize the rest.</Text>

          <Text style={styles.sectionLabel}>I am a</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  activeOpacity={0.85}
                  testID={`register-role-${r.id}`}
                  style={styles.roleItem}
                >
                  <NeoCard bg={active ? r.color : C.surface} shadow={active ? 'md' : 'sm'}>
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Icon size={28} color={C.textPrimary} />
                      <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{r.label}</Text>
                      <Text style={[Typography.bodySm, { color: C.textSecondary, textAlign: 'center' }]}>
                        {r.desc}
                      </Text>
                    </View>
                  </NeoCard>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.form}>
            <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Aarav Kumar" testID="register-name-input" />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              testID="register-email-input"
            />
            <Input
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              testID="register-phone-input"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              testID="register-password-input"
            />
            <Input
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="Repeat password"
              testID="register-confirm-input"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Create account"
              onPress={onSubmit}
              loading={loading}
              testID="register-submit-btn"
              style={{ marginTop: Spacing.md }}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              testID="register-go-login-btn"
              style={styles.switch}
            >
              <Text style={styles.switchText}>
                Already have an account?{' '}
                <Text style={{ color: C.accentPink, fontFamily: 'Manrope_600SemiBold' }}>Log in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  h1: { ...Typography.h2, color: C.textPrimary },
  subtitle: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md },
  sectionLabel: { ...Typography.caption, color: C.textSecondary, marginTop: Spacing.sm },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.md },
  roleItem: { flexBasis: '47%', flexGrow: 1 },
  form: { gap: Spacing.md, marginTop: Spacing.sm },
  error: { ...Typography.bodySm, color: C.danger },
  switch: { alignItems: 'center', marginTop: Spacing.lg },
  switchText: { ...Typography.body, color: C.textSecondary },
});
