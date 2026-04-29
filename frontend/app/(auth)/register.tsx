/**
 * Register screen — basic credentials + role selection.
 *
 * Web (≥980px): split-screen with brand pane on the left and form on the right
 *               (matches Login/Email Verification/2FA visual language).
 * Native:       original single-column form layout.
 */
import { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, StyleSheet, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, GraduationCap, Briefcase, Users, Building2 } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, Input, NeoCard, useToast } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import type { UserRole } from '@/src/models/entities';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebField, WebPrimaryBtn } from '@/src/views/web/AuthWebControls';

const C = Colors.light;
const IS_WEB = Platform.OS === 'web';

const ROLES: { id: UserRole; label: string; desc: string; icon: any; color: string; emoji: string }[] = [
  { id: 'student', label: 'Student', desc: 'Class 11+ / College',           emoji: '🎓', icon: GraduationCap, color: C.accentMint },
  { id: 'alumni',  label: 'Alumni',  desc: 'Graduated from a school/college', emoji: '🤝', icon: Users,         color: C.accentBlue },
  { id: 'mentor',  label: 'Mentor',  desc: 'Industry / Faculty professional', emoji: '💼', icon: Briefcase,     color: C.accentYellow },
  { id: 'college', label: 'College', desc: 'Institution admin',               emoji: '🏛️', icon: Building2,     color: C.accentPink },
];

export default function Register() {
  const router = useRouter();
  const toast = useToast();
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
      const msg = 'Please fill name, email and password';
      setError(msg);
      toast.error('Missing details', msg);
      return;
    }
    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setError(msg);
      toast.error('Weak password', msg);
      return;
    }
    if (password !== confirm) {
      const msg = 'Passwords do not match';
      setError(msg);
      toast.error('Password mismatch', msg);
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
      toast.success('Account created!', 'Verify your email to continue.');
      // Web users go through email-verify → 2FA → platform.
      // Native users continue with the native onboarding flow.
      if (IS_WEB) {
        router.replace({ pathname: '/(auth)/email-verify', params: { email: email.trim() } });
      } else {
        router.replace('/(onboarding)/role-info');
      }
    } catch (e: any) {
      setError(e.message);
      toast.error('Registration failed', e.message);
    }
  };

  // ─── WEB ──────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <AuthWebShell variant="split">
        <View>
          <Pressable
            onPress={() => router.back()}
            testID="register-back-btn"
            style={({ hovered }: any) => [styles.webBack, hovered && { opacity: 1 }]}
          >
            <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
            <Text style={styles.webBackText}>Back</Text>
          </Pressable>

          <Text style={styles.webH1}>Create your account</Text>
          <Text style={styles.webSub}>Join 12,400+ students unlocking their next chapter.</Text>

          {/* Role selector */}
          <Text style={styles.webSection}>I am a</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  testID={`register-role-${r.id}`}
                  style={({ hovered, pressed }: any) => [
                    styles.roleTile,
                    hovered && !active && { borderColor: 'rgba(196,181,253,0.35)', backgroundColor: 'rgba(124,58,237,0.10)' },
                    active && styles.roleTileActive,
                    pressed && { transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                  <Text style={[styles.roleLabel, active && { color: '#FFFFFF' }]}>{r.label}</Text>
                  <Text style={styles.roleDesc} numberOfLines={2}>{r.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form */}
          <View style={{ marginTop: 8 }}>
            <WebField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Aarav Kumar" autoCapitalize="words" testID="register-name-input" />
            <WebField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" testID="register-email-input" />
            <WebField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" testID="register-phone-input" />
            <WebField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" testID="register-password-input" />
            <WebField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" testID="register-confirm-input" />
            {error && <Text style={styles.webErr}>{error}</Text>}
            <WebPrimaryBtn label="Create account" onPress={onSubmit} loading={loading} testID="register-submit-btn" />
          </View>

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            testID="register-go-login-btn"
            style={({ hovered }: any) => [styles.webSwitch, hovered && { opacity: 0.85 }]}
          >
            <Text style={styles.webSwitchText}>
              Already have an account? <Text style={styles.webSwitchLink}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </AuthWebShell>
    );
  }

  // ─── NATIVE ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={nativeStyles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={nativeStyles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="register-back-btn" style={nativeStyles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>

          <Text style={nativeStyles.h1}>Create your account</Text>
          <Text style={nativeStyles.subtitle}>Tell us who you are — we'll personalize the rest.</Text>

          <Text style={nativeStyles.sectionLabel}>I am a</Text>
          <View style={nativeStyles.roleGrid}>
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setRole(r.id)}
                  activeOpacity={0.85}
                  testID={`register-role-${r.id}`}
                  style={nativeStyles.roleItem}
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

          <View style={nativeStyles.form}>
            <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Aarav Kumar" testID="register-name-input" />
            <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" testID="register-email-input" />
            <Input label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" testID="register-phone-input" />
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" testID="register-password-input" />
            <Input label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" testID="register-confirm-input" />

            {error && <Text style={nativeStyles.error}>{error}</Text>}

            <Button title="Create account" onPress={onSubmit} loading={loading} testID="register-submit-btn" style={{ marginTop: Spacing.md }} />

            <TouchableOpacity onPress={() => router.push('/(auth)/login')} testID="register-go-login-btn" style={nativeStyles.switch}>
              <Text style={nativeStyles.switchText}>
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

// ─── Web styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  webBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 18,
    opacity: 0.75,
    alignSelf: 'flex-start',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  webBackText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  webH1: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  webSub: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 14, marginBottom: 26 },
  webSection: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  roleTile: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    gap: 6,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  roleTileActive: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124,58,237,0.16)',
  },
  roleLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  roleDesc: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 11 },
  webErr: {
    color: '#FCA5A5',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderColor: 'rgba(252,165,165,0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    marginBottom: 10,
  },
  webSwitch: { alignItems: 'center', marginTop: 18, ...({ cursor: 'pointer' } as any) },
  webSwitchText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 14 },
  webSwitchLink: { color: '#D4AAFF', fontFamily: 'DMSans_700Bold' },
});

// ─── Native styles ───────────────────────────────────────────────────────────
const nativeStyles = StyleSheet.create({
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
