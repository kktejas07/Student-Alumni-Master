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
  TouchableOpacity, StyleSheet, Alert, Modal, Pressable, useWindowDimensions,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors as C, Spacing, Typography, Radius, Shadows } from '@/src/theme';
import { Button, Input, AnimatedCard, SALogo } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import Svg, { Path, G } from 'react-native-svg';

const IS_WEB = Platform.OS === 'web';

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
      const home = Platform.OS === 'web' ? '/platform' : '/(tabs)';
      router.replace(user.onboarding_completed ? home : '/(onboarding)/role-info');
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
      const home = Platform.OS === 'web' ? '/platform' : '/(tabs)';
      router.replace(user.onboarding_completed ? home : '/(onboarding)/role-info');
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (IS_WEB) {
    return (
      <LinearGradient
        colors={['#1A0438', '#2D0760', '#5F259F']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.webShell}
      >
        <View pointerEvents="none" style={styles.webBlob} />

        <View style={styles.webBrandPane}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <SALogo size={32} variant="white" />
            <Text style={styles.webBrandWord}>Student Alumni</Text>
          </View>
          <Text style={styles.webBrandHero}>
            Your career,{'\n'}
            <Text style={{ color: '#D4AAFF' }}>reimagined.</Text>
          </Text>
          <Text style={styles.webBrandSub}>
            Discover events, mentors, and opportunities — all in one platform built for students and alumni.
          </Text>
          <View style={styles.webStatsRow}>
            <View style={styles.webStatCol}>
              <Text style={styles.webStatNum}>50K+</Text>
              <Text style={styles.webStatLbl}>Students</Text>
            </View>
            <View style={styles.webStatCol}>
              <Text style={styles.webStatNum}>500+</Text>
              <Text style={styles.webStatLbl}>Mentors</Text>
            </View>
            <View style={styles.webStatCol}>
              <Text style={styles.webStatNum}>200+</Text>
              <Text style={styles.webStatLbl}>Colleges</Text>
            </View>
          </View>
        </View>

        <View style={styles.webCardPane}>
          <ScrollView
            contentContainerStyle={styles.webCardScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.webCard}>
              <Pressable
                onPress={() => router.back()}
                testID="login-back-btn"
                style={({ hovered }: any) => [styles.webBack, hovered && { opacity: 1 }]}
              >
                <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
                <Text style={styles.webBackText}>Back</Text>
              </Pressable>
              <Text style={styles.webH1}>Welcome back 👋</Text>
              <Text style={styles.webSub}>Log in to continue your career journey.</Text>

              <View style={{ gap: 10, marginBottom: 18 }}>
                <Pressable
                  onPress={() => startOAuth('google')}
                  testID="oauth-google-btn"
                  style={({ hovered, pressed }: any) => [
                    styles.webOauthBtn,
                    hovered && styles.webOauthBtnHover,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <GoogleG size={18} />
                  <Text style={styles.webOauthLabel}>Continue with Google</Text>
                </Pressable>
                <Pressable
                  onPress={() => startOAuth('linkedin')}
                  testID="oauth-linkedin-btn"
                  style={({ hovered, pressed }: any) => [
                    styles.webOauthBtn,
                    hovered && styles.webOauthBtnHover,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <LinkedInIn size={18} />
                  <Text style={styles.webOauthLabel}>Continue with LinkedIn</Text>
                </Pressable>
              </View>

              <View style={styles.webDivider}>
                <View style={styles.webDividerLine} />
                <Text style={styles.webDividerText}>or with email</Text>
                <View style={styles.webDividerLine} />
              </View>

              <View style={{ gap: 14, marginTop: 18 }}>
                <WebInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" testID="login-email-input" />
                <WebInput label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" testID="login-password-input" />
                {error && <Text style={styles.webError}>{error}</Text>}
                <Pressable
                  onPress={onSubmit}
                  testID="login-submit-btn"
                  disabled={loading}
                  style={({ hovered, pressed }: any) => [
                    styles.webSubmit,
                    hovered && styles.webSubmitHover,
                    pressed && { transform: [{ scale: 0.99 }] },
                    loading && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.webSubmitText}>{loading ? 'Logging in…' : 'Log in'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(auth)/register')}
                  testID="login-go-register-btn"
                  style={({ hovered }: any) => [styles.webSwitch, hovered && { opacity: 0.85 }]}
                >
                  <Text style={styles.webSwitchText}>
                    Don't have an account?{' '}
                    <Text style={styles.webSwitchLink}>Sign up</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>

        <Modal visible={oauthOpen !== null} transparent animationType="fade" onRequestClose={() => setOauthOpen(null)}>
          <View style={styles.webModalBackdrop}>
            <View style={styles.webModalSheet}>
              <View style={[styles.modalHeader, { marginBottom: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webModalTitle}>
                    {oauthOpen === 'google' ? 'Choose a Google account' : 'Sign in with LinkedIn'}
                  </Text>
                  <Text style={styles.webModalSubtitle}>
                    Mock mode for development. Pick a preset or enter your own.
                  </Text>
                </View>
                <Pressable
                  onPress={() => setOauthOpen(null)}
                  testID="oauth-modal-close"
                  style={({ hovered }: any) => [styles.webModalClose, hovered && { backgroundColor: 'rgba(255,255,255,0.18)' }]}
                >
                  <X size={18} color="rgba(255,255,255,0.85)" />
                </Pressable>
              </View>
              {[
                { email: 'demo.student@example.com', name: 'Demo Student' },
                { email: 'priya.sharma@gmail.com', name: 'Priya Sharma' },
                { email: 'arjun.mehta@gmail.com', name: 'Arjun Mehta' },
              ].map((p, idx) => (
                <Pressable
                  key={p.email}
                  onPress={() => completeOAuth(p.email, p.name)}
                  testID={`oauth-preset-${idx}`}
                  style={({ hovered }: any) => [styles.webAcctRow, hovered && { backgroundColor: 'rgba(255,255,255,0.12)' }]}
                >
                  <View style={styles.webAcctAvatar}>
                    <Text style={{ color: C.white, fontFamily: 'DMSans_700Bold' }}>
                      {p.name.split(' ').map((s) => s[0]).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyBold, { color: C.white }]}>{p.name}</Text>
                    <Text style={[Typography.bodySm, { color: 'rgba(255,255,255,0.6)' }]}>{p.email}</Text>
                  </View>
                </Pressable>
              ))}
              <Text style={styles.webModalDivider}>Or enter custom</Text>
              <WebInput label="Email" value={oauthEmail} onChangeText={setOauthEmail} keyboardType="email-address" placeholder="newuser@gmail.com" testID="oauth-custom-email" />
              <WebInput label="Full Name" value={oauthName} onChangeText={setOauthName} placeholder="New User" testID="oauth-custom-name" />
              <Pressable
                onPress={() => completeOAuth(oauthEmail, oauthName)}
                testID="oauth-continue-btn"
                style={({ hovered }: any) => [styles.webSubmit, { marginTop: 12 }, hovered && styles.webSubmitHover]}
              >
                <Text style={styles.webSubmitText}>Continue as {oauthName || 'New User'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    );
  }

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

// ---------------------------------------------------------------------------
// Web-only Input — dark theme, hover/focus states
// ---------------------------------------------------------------------------
function WebInput({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, testID }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={styles.webInputLabel}>{label}</Text>
      <View style={[styles.webInputWrap, focused && styles.webInputWrapFocus]}>
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
          style={styles.webInputField}
        />
      </View>
    </View>
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

  // ─── Web-only styles ──────────────────────────────────────────────────────
  webShell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100%' as any,
    overflow: 'hidden',
  },
  webBlob: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(176,127,223,0.18)',
    ...({ filter: 'blur(120px)' } as any),
  },
  webBrandPane: {
    flex: 1,
    paddingHorizontal: 64,
    paddingVertical: 80,
    justifyContent: 'center',
    maxWidth: 640,
    minWidth: 0,
    ...Platform.select({ web: { display: 'flex' as any } }),
  },
  webBrandWord: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 18 },
  webBrandHero: {
    color: C.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -1.6,
    marginBottom: 22,
  },
  webBrandSub: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 460,
    marginBottom: 48,
  },
  webStatsRow: { flexDirection: 'row', gap: 40 },
  webStatCol: {},
  webStatNum: { color: '#D4AAFF', fontFamily: 'DMSans_700Bold', fontSize: 32, letterSpacing: -1 },
  webStatLbl: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 2 },

  webCardPane: {
    flex: 1,
    minWidth: 380,
    paddingHorizontal: 40,
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCardScroll: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  webCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 36,
    ...({ backdropFilter: 'blur(24px)' } as any),
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 24 },
  },
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
  webBackText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  webH1: {
    color: C.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 30,
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  webSub: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    marginBottom: 26,
  },

  webOauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 12,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  webOauthBtnHover: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.28)',
    transform: [{ translateY: -1 }],
  },
  webOauthLabel: { color: C.white, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },

  webDivider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  webDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  webDividerText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  webInputLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  webInputWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderRadius: 12,
    ...({ transitionDuration: '160ms' } as any),
  },
  webInputWrapFocus: {
    borderColor: '#B07FDF',
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#B07FDF',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  webInputField: {
    color: C.white,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...({ outlineStyle: 'none' } as any),
  },

  webSubmit: {
    backgroundColor: '#7B3DBF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#7B3DBF',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  webSubmitHover: {
    backgroundColor: '#9059D9',
    transform: [{ translateY: -1 }],
    shadowOpacity: 0.55,
  },
  webSubmitText: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 15 },

  webError: {
    color: '#FCA5A5',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderColor: 'rgba(252,165,165,0.3)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },

  webSwitch: { alignItems: 'center', marginTop: 8, ...({ cursor: 'pointer' } as any) },
  webSwitchText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 14 },
  webSwitchLink: { color: '#D4AAFF', fontFamily: 'DMSans_700Bold' },

  // Web modal
  webModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,4,32,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    ...({ backdropFilter: 'blur(8px)' } as any),
  },
  webModalSheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(36,18,80,0.95)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 28,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 20 },
  },
  webModalTitle: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 20 },
  webModalSubtitle: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 4 },
  webModalClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  webModalDivider: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  webAcctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  webAcctAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#7B3DBF',
    alignItems: 'center', justifyContent: 'center',
  },
});
