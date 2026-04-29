/**
 * Login screen — with Google + LinkedIn OAuth (Option C, mock-mode in dev)
 * =========================================================================
 * Flow:
 *   1. User taps "Continue with Google" or "Continue with LinkedIn"
 *   2. (Real mode) opens expo-auth-session in browser → returns id_token
 *      (Mock mode) we prefill a mock email/full_name and call /auth/google
 *   3. Backend upserts user, returns JWT pair → routes onward (onboarding or dashboard)
 *
 * To switch from mock-mode to real OAuth, swap the `triggerOAuth` function
 * with the real expo-auth-session prompt + provide GOOGLE/LINKEDIN client IDs.
 */
import { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, StyleSheet, Alert, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors as C, Spacing, Typography, Radius, Shadows } from '@/src/theme';
import { Button, Input, AnimatedCard } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import Svg, { Path, G } from 'react-native-svg';

// ---------------------------------------------------------------------------
// Provider icons (Google G + LinkedIn 'in')
// ---------------------------------------------------------------------------
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.9 19.7-20 0-1.3-.1-2.4-.3-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.6 8.4 6.3 14.1z" />
      <Path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.4 39.5 16.1 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.8l6.3 5.3c-.4.4 6.7-4.9 6.7-15.1 0-1.3-.1-2.4-.3-3.5z" />
    </Svg>
  );
}

function LinkedInIn({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        <Path
          fill="#0A66C2"
          d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24zM5.34 7.43a2.07 2.07 0 11-.01-4.14 2.07 2.07 0 01.01 4.14zM7.12 20.45H3.56V9h3.56v11.45z"
        />
      </G>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const oauthLogin = useAuthStore((s) => s.oauthLogin);
  const loading = useAuthStore((s) => s.loading);

  // Mock OAuth picker — shows a list of "available accounts" so testers can
  // simulate selecting an account in the Google/LinkedIn account chooser.
  const [oauthOpen, setOauthOpen] = useState<null | 'google' | 'linkedin'>(null);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    try {
      const user = await login(email.trim(), password);
      router.replace(user.onboarding_completed ? '/(tabs)' : '/(onboarding)/role-info');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startOAuth = (provider: 'google' | 'linkedin') => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setOauthOpen(provider);
    setOauthEmail('');
    setOauthName('');
  };

  const completeOAuth = async (mockEmail: string, mockName: string) => {
    if (!oauthOpen) return;
    if (!mockEmail || !mockName) {
      setError('Mock OAuth: please enter both email and full name');
      return;
    }
    try {
      const user = await oauthLogin(oauthOpen, {
        email: mockEmail.trim().toLowerCase(),
        full_name: mockName.trim(),
        role: 'student',
      });
      setOauthOpen(null);
      router.replace(user.onboarding_completed ? '/(tabs)' : '/(onboarding)/role-info');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} testID="login-back-btn" style={styles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue your career journey.</Text>

          {/* ===== OAuth buttons ===== */}
          <View style={styles.oauthRow}>
            <Pressable
              onPress={() => startOAuth('google')}
              style={({ pressed }) => [styles.oauthBtn, pressed && styles.oauthBtnPressed]}
              testID="oauth-google-btn"
              android_ripple={{ color: 'rgba(95,37,159,0.10)', borderless: false }}
            >
              <GoogleG size={20} />
              <Text style={styles.oauthLabel}>Continue with Google</Text>
            </Pressable>

            <Pressable
              onPress={() => startOAuth('linkedin')}
              style={({ pressed }) => [styles.oauthBtn, pressed && styles.oauthBtnPressed]}
              testID="oauth-linkedin-btn"
              android_ripple={{ color: 'rgba(95,37,159,0.10)', borderless: false }}
            >
              <LinkedInIn size={20} />
              <Text style={styles.oauthLabel}>Continue with LinkedIn</Text>
            </Pressable>
          </View>

          {/* ===== Divider ===== */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ===== Email/password form ===== */}
          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              testID="login-email-input"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Your password"
              testID="login-password-input"
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              title="Log in"
              onPress={onSubmit}
              loading={loading}
              testID="login-submit-btn"
              style={{ marginTop: Spacing.md }}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              testID="login-go-register-btn"
              style={styles.switch}
            >
              <Text style={styles.switchText}>
                Don't have an account?{' '}
                <Text style={{ color: C.brandPurple, fontFamily: 'DMSans_600SemiBold' }}>
                  Sign up
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ===== Mock OAuth picker modal ===== */}
      <Modal
        visible={oauthOpen !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setOauthOpen(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {oauthOpen === 'google' ? 'Choose a Google account' : 'Sign in with LinkedIn'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Mock mode for development. Pick a preset or enter your own.
                </Text>
              </View>
              <Pressable onPress={() => setOauthOpen(null)} style={styles.modalClose} testID="oauth-modal-close">
                <X size={20} color={C.textSecondary} />
              </Pressable>
            </View>

            {/* Preset accounts to "select" */}
            {[
              { email: 'demo.student@example.com', name: 'Demo Student' },
              { email: 'priya.sharma@gmail.com', name: 'Priya Sharma' },
              { email: 'arjun.mehta@gmail.com', name: 'Arjun Mehta' },
            ].map((p, idx) => (
              <AnimatedCard
                key={p.email}
                onPress={() => completeOAuth(p.email, p.name)}
                style={styles.acctRow}
                index={idx}
                testID={`oauth-preset-${idx}`}
              >
                <View style={styles.acctAvatar}>
                  <Text style={{ color: C.white, fontFamily: 'DMSans_700Bold' }}>
                    {p.name.split(' ').map((s) => s[0]).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{p.name}</Text>
                  <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{p.email}</Text>
                </View>
              </AnimatedCard>
            ))}

            {/* Custom mock entry */}
            <Text style={[styles.modalDivider]}>Or enter custom</Text>
            <Input
              label="Email"
              value={oauthEmail}
              onChangeText={setOauthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="newuser@gmail.com"
              testID="oauth-custom-email"
            />
            <Input
              label="Full Name"
              value={oauthName}
              onChangeText={setOauthName}
              placeholder="New User"
              testID="oauth-custom-name"
            />
            <Button
              title={`Continue as ${oauthName || 'New User'}`}
              onPress={() => completeOAuth(oauthEmail, oauthName)}
              testID="oauth-continue-btn"
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, gap: Spacing.md },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  h1: { ...Typography.h2, color: C.textPrimary, marginTop: Spacing.md },
  subtitle: { ...Typography.body, color: C.textSecondary, marginBottom: Spacing.md },
  form: { gap: Spacing.md },
  error: { ...Typography.bodySm, color: C.danger },
  switch: { alignItems: 'center', marginTop: Spacing.lg },
  switchText: { ...Typography.body, color: C.textSecondary },

  // OAuth buttons
  oauthRow: { gap: 10, marginBottom: Spacing.md },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    ...Shadows.sm,
  },
  oauthBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  oauthLabel: {
    ...Typography.bodyBold,
    color: C.textPrimary,
    fontSize: 15,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: {
    ...Typography.label,
    color: C.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,8,30,0.58)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: 12,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  modalTitle: { ...Typography.h3, color: C.textPrimary, fontSize: 18 },
  modalSubtitle: { ...Typography.bodySm, color: C.textSecondary, marginTop: 2 },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: {
    ...Typography.label,
    color: C.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  acctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  acctAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.brandPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
