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
  const [emailMode, setEmailMode] = useState(false);

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
      <View style={styles.webShell}>
        {/* LEFT brand pane — solid purple */}
        <View style={styles.webBrandPane}>
          <View pointerEvents="none" style={[styles.webOrb, { width: 280, height: 280, top: '-10%', right: '-15%', backgroundColor: 'rgba(139,92,246,0.18)' }]} />
          <View pointerEvents="none" style={[styles.webOrb, { width: 200, height: 200, bottom: '10%', left: '-10%', backgroundColor: 'rgba(109,40,217,0.16)' }]} />

          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <SALogo size={76} variant="white" />
          </View>
          <Text style={styles.webBrandWord2}>Student Alumni</Text>
          <Text style={styles.webBrandSubtitle}>
            AI career guidance, internships, mentorship, and alumni networking.
          </Text>
          {[
            { emoji: '🤖', t: 'AI Career Guidance', s: 'Personalised roadmap based on your goals' },
            { emoji: '🌍', t: '10,000+ Internships', s: 'Global opportunities matched to you' },
            { emoji: '🤝', t: '500+ Mentors', s: 'Alumni who want to help you grow' },
          ].map((f) => (
            <View key={f.t} style={styles.featRow}>
              <View style={styles.featIcon}>
                <Text style={{ fontSize: 17 }}>{f.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featTitle}>{f.t}</Text>
                <Text style={styles.featSub}>{f.s}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* RIGHT auth pane — solid near-black */}
        <View style={styles.webCardPane}>
          <ScrollView
            contentContainerStyle={styles.webCardScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%', maxWidth: 400 }}>
              {!emailMode ? (
                <>
                  {/* Header */}
                  <View style={{ marginBottom: 28 }}>
                    <Text style={styles.webH2}>Get started</Text>
                    <Text style={styles.webH2Sub}>Choose how you'd like to sign in</Text>
                  </View>

                  {/* LinkedIn */}
                  <Pressable
                    onPress={() => startOAuth('linkedin')}
                    testID="oauth-linkedin-btn"
                    style={({ hovered, pressed }: any) => [
                      styles.btnLi,
                      hovered && { backgroundColor: '#085096', transform: [{ translateY: -1 }] },
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Svg viewBox="0 0 24 24" width={20} height={20}>
                      <Path d="M0 0h24v24H0z" fill="transparent" />
                      <Path d="M7.5 9.5H5V19H7.5V9.5ZM6.25 8.5C7.08 8.5 7.75 7.83 7.75 7C7.75 6.17 7.08 5.5 6.25 5.5C5.42 5.5 4.75 6.17 4.75 7C4.75 7.83 5.42 8.5 6.25 8.5ZM19 19H16.5V14.25C16.5 13.18 16.48 11.8 15.01 11.8C13.52 11.8 13.3 12.97 13.3 14.17V19H10.8V9.5H13.2V10.63H13.24C13.58 9.98 14.42 9.28 15.67 9.28C18.2 9.28 19 10.92 19 13.07V19Z" fill="white" />
                    </Svg>
                    <Text style={styles.btnLiText}>Continue with LinkedIn</Text>
                  </Pressable>

                  {/* Google */}
                  <Pressable
                    onPress={() => startOAuth('google')}
                    testID="oauth-google-btn"
                    style={({ hovered, pressed }: any) => [
                      styles.btnGg,
                      hovered && { backgroundColor: '#F2F2F2', transform: [{ translateY: -1 }] },
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <GoogleG size={20} />
                    <Text style={styles.btnGgText}>Continue with Google</Text>
                  </Pressable>

                  {/* Divider */}
                  <View style={[styles.webDivider, { marginVertical: 18 }]}>
                    <View style={styles.webDividerLine} />
                    <Text style={styles.webDividerText}>or</Text>
                    <View style={styles.webDividerLine} />
                  </View>

                  {/* Email */}
                  <Pressable
                    onPress={() => setEmailMode(true)}
                    testID="continue-email-btn"
                    style={({ hovered, pressed }: any) => [
                      styles.btnGhost,
                      hovered && styles.btnGhostHover,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>✉️</Text>
                    <Text style={styles.btnGhostText}>Continue with Email</Text>
                  </Pressable>

                  {/* OTP — placeholder, falls back to email mode for now */}
                  <Pressable
                    onPress={() => setEmailMode(true)}
                    testID="continue-otp-btn"
                    style={({ hovered, pressed }: any) => [
                      styles.btnGhost,
                      { marginTop: 10 },
                      hovered && styles.btnGhostHover,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>📱</Text>
                    <Text style={styles.btnGhostText}>Continue with OTP</Text>
                  </Pressable>

                  {/* Legal */}
                  <Text style={styles.webLegal}>
                    By continuing you agree to our{' '}
                    <Text style={styles.webLegalLink}>Terms</Text> &{' '}
                    <Text style={styles.webLegalLink}>Privacy Policy</Text>
                  </Text>

                  {/* Trusted by */}
                  <View style={styles.trustBox}>
                    <Text style={styles.trustLabel}>TRUSTED BY</Text>
                    <View style={styles.trustRow}>
                      {[
                        { v: '12,400+', l: 'Alumni' },
                        { v: '500+', l: 'Mentors' },
                        { v: '200+', l: 'Colleges' },
                      ].map((t) => (
                        <View key={t.l} style={{ alignItems: 'center' }}>
                          <Text style={styles.trustNum}>{t.v}</Text>
                          <Text style={styles.trustSub}>{t.l}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Email/password mode */}
                  <Pressable
                    onPress={() => setEmailMode(false)}
                    testID="login-back-from-email"
                    style={({ hovered }: any) => [styles.webBack, hovered && { opacity: 1 }]}
                  >
                    <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.webBackText}>Back</Text>
                  </Pressable>
                  <Text style={styles.webH2}>Welcome back 👋</Text>
                  <Text style={styles.webH2Sub}>Log in to continue your career journey.</Text>
                  <View style={{ gap: 14, marginTop: 22 }}>
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
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {/* OAuth modal — unchanged from before */}
        <Modal visible={oauthOpen !== null} transparent animationType="fade" onRequestClose={() => setOauthOpen(null)}>
          <View style={styles.webModalBackdrop}>
            <View style={styles.webModalSheet}>
              <View style={[styles.modalHeader, { marginBottom: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.webModalTitle}>
                    {oauthOpen === 'google' ? 'Choose a Google account' : 'Sign in with LinkedIn'}
                  </Text>
                  <Text style={styles.webModalSubtitle}>Mock mode for development. Pick a preset or enter your own.</Text>
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
                    <Text style={{ color: C.white, fontFamily: 'DMSans_700Bold' }}>{p.name.split(' ').map((s) => s[0]).join('')}</Text>
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
    backgroundColor: '#08051A',
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
  webOrb: {
    position: 'absolute',
    borderRadius: 999,
    ...({ filter: 'blur(80px)' } as any),
  },
  webBrandPane: {
    flex: 1,
    paddingHorizontal: 64,
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 640,
    minWidth: 0,
    backgroundColor: '#3D1468',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({ web: { display: 'flex' as any } }),
  },
  webBrandWord: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 18 },
  webBrandWord2: {
    color: C.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    letterSpacing: -1,
    marginBottom: 12,
    textAlign: 'center',
  },
  webBrandSubtitle: {
    color: 'rgba(255,255,255,0.46)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 32,
  },
  featRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
    width: '100%',
    maxWidth: 300,
  },
  featIcon: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTitle: {
    color: C.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
  },
  featSub: {
    color: 'rgba(255,255,255,0.44)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    marginTop: 1,
  },

  webH2: {
    color: C.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 5,
  },
  webH2Sub: {
    color: 'rgba(255,255,255,0.44)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },

  // LinkedIn primary button
  btnLi: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0A66C2',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 11,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  btnLiText: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 15 },

  // Google white button
  btnGg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 11,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  btnGgText: { color: '#1A1A2E', fontFamily: 'DMSans_700Bold', fontSize: 15 },

  // Ghost (email/OTP) buttons
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  btnGhostHover: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.26)',
    transform: [{ translateY: -1 }],
  },
  btnGhostText: { color: C.white, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },

  // Legal text
  webLegal: {
    color: 'rgba(255,255,255,0.26)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  webLegalLink: { color: '#C4B5FD', fontFamily: 'DMSans_500Medium' },

  // Trusted-by box
  trustBox: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderRadius: 12,
  },
  trustLabel: {
    color: 'rgba(255,255,255,0.28)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around' },
  trustNum: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 17 },
  trustSub: { color: 'rgba(255,255,255,0.38)', fontFamily: 'DMSans_400Regular', fontSize: 9, marginTop: 2 },

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
