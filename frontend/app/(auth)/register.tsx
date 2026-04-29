/**
 * Register screen — merged with Role Setup.
 *
 * One unified screen that captures EVERYTHING needed to create an account:
 *   • OAuth shortcut (Google + LinkedIn)
 *   • OR  Name / Email / Phone / Password / Confirm
 *   • Role picker (Student / Alumni / Mentor with RECOMMENDED + segments)
 *
 * After submit → /email-verify → /two-fa-setup → Platform.
 *
 * Web (≥980px): split-screen via AuthWebShell with brand pane + scrollable form.
 * Web (<980px) and Native: single-column dark theme.
 */
import { useState } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, StyleSheet, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, Input, useToast, SALogo } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useOnboardingStore } from '@/src/viewmodels/stores/onboardingStore';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebField, WebPrimaryBtn } from '@/src/views/web/AuthWebControls';

const C = Colors.light;
const IS_WEB = Platform.OS === 'web';

// ─── Role definitions (matches Role-Setup prototype) ─────────────────────────
type Role = 'student' | 'alumni' | 'mentor';
type MentorSegment = 'it_software' | 'higher_education' | 'startup' | 'business';

const ROLES: {
  id: Role;
  emoji: string;
  title: string;
  desc: string;
  recommended?: boolean;
}[] = [
  { id: 'student', emoji: '🎓', title: 'Student',
    desc: 'Currently studying — connect with alumni for guidance & opportunities' },
  { id: 'alumni',  emoji: '💼', title: 'Alumni',
    desc: 'Graduated — grow your professional network and stay connected' },
  { id: 'mentor',  emoji: '🧑‍🏫', title: 'Mentor',
    desc: 'Register to guide students — share expertise, book sessions & build your brand',
    recommended: true },
];

const MENTOR_SEGMENTS: { id: MentorSegment; label: string }[] = [
  { id: 'it_software',      label: 'IT / Software' },
  { id: 'higher_education', label: 'Higher Ed' },
  { id: 'startup',          label: 'Startup' },
  { id: 'business',         label: 'Education' },
];

// ─── OAuth icons ─────────────────────────────────────────────────────────────
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
function LinkedInIn({ size = 20 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M0 0h24v24H0z" fill="transparent" />
      <Path d="M7.5 9.5H5V19H7.5V9.5ZM6.25 8.5C7.08 8.5 7.75 7.83 7.75 7C7.75 6.17 7.08 5.5 6.25 5.5C5.42 5.5 4.75 6.17 4.75 7C4.75 7.83 5.42 8.5 6.25 8.5ZM19 19H16.5V14.25C16.5 13.18 16.48 11.8 15.01 11.8C13.52 11.8 13.3 12.97 13.3 14.17V19H10.8V9.5H13.2V10.63H13.24C13.58 9.98 14.42 9.28 15.67 9.28C18.2 9.28 19 10.92 19 13.07V19Z" fill="white" />
    </Svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Register() {
  const router = useRouter();
  const toast = useToast();
  const onboarding = useOnboardingStore();

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [role, setRole]         = useState<Role>('student');
  const [segment, setSegment]   = useState<MentorSegment>('it_software');
  const [error, setError]       = useState<string | null>(null);

  const register    = useAuthStore((s) => s.register);
  const oauthLogin  = useAuthStore((s) => s.oauthLogin);
  const loading     = useAuthStore((s) => s.loading);

  // ── OAuth (mock-mode by default; real-mode swap-in needs client IDs) ──────
  const startOAuth = async (provider: 'google' | 'linkedin') => {
    setError(null);
    try {
      // For now use a mock identity; in production this is replaced by
      // expo-auth-session prompt and the resulting id_token is sent to BE.
      const mockEmail = email.trim().toLowerCase() ||
        `${provider}.${Date.now()}@studentalumni.app`;
      const mockName = fullName.trim() || `${provider} user`;
      const user = await oauthLogin(provider, {
        email: mockEmail,
        full_name: mockName,
        role,
      });
      // Persist mentor segment if applicable
      if (role === 'mentor') onboarding.setMentorInfo({ mentor_category: segment });
      toast.success('Account ready', `Signed in as ${user.email}`);
      router.replace('/(auth)/email-verify');
    } catch (e: any) {
      setError(e.message);
      toast.error('OAuth failed', e.message);
    }
  };

  // ── Email/password submit ────────────────────────────────────────────────
  const onSubmit = async () => {
    setError(null);
    if (!email || !password || !fullName) {
      const msg = 'Please fill name, email and password';
      setError(msg); toast.error('Missing details', msg); return;
    }
    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setError(msg); toast.error('Weak password', msg); return;
    }
    if (password !== confirm) {
      const msg = 'Passwords do not match';
      setError(msg); toast.error('Password mismatch', msg); return;
    }
    try {
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        phone: phone.trim() || undefined,
      });
      if (role === 'mentor') onboarding.setMentorInfo({ mentor_category: segment });
      toast.success('Account created!', 'Verify your email to continue.');
      router.replace('/(auth)/email-verify');
    } catch (e: any) {
      setError(e.message);
      toast.error('Registration failed', e.message);
    }
  };

  // ─── Shared Body (used by both web + mobile) ──────────────────────────────
  const Body = (
    <View style={{ width: '100%' }}>
      {/* Logo + heading (mobile + compact-web) */}
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <SALogo size={56} variant="glass" />
      </View>
      <Text style={s.h1}>Create your account</Text>
      <Text style={s.sub}>Sign up with one tap or with your email</Text>

      {/* OAuth buttons */}
      <Pressable
        onPress={() => startOAuth('linkedin')}
        testID="register-oauth-linkedin-btn"
        style={({ hovered, pressed }: any) => [
          s.btnLi,
          hovered && { backgroundColor: '#085096' },
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <LinkedInIn size={20} />
        <Text style={s.btnLiText}>Continue with LinkedIn</Text>
      </Pressable>

      <Pressable
        onPress={() => startOAuth('google')}
        testID="register-oauth-google-btn"
        style={({ hovered, pressed }: any) => [
          s.btnGg,
          hovered && { backgroundColor: '#F2F2F2' },
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <GoogleG size={20} />
        <Text style={s.btnGgText}>Continue with Google</Text>
      </Pressable>

      {/* Divider */}
      <View style={s.divider}>
        <View style={s.divLine} /><Text style={s.divText}>OR</Text><View style={s.divLine} />
      </View>

      {/* Form fields */}
      {IS_WEB ? (
        <>
          <WebField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Aarav Kumar" autoCapitalize="words" testID="register-name-input" />
          <WebField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" testID="register-email-input" />
          <WebField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" testID="register-phone-input" />
          <WebField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" testID="register-password-input" />
          <WebField label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" testID="register-confirm-input" />
        </>
      ) : (
        <View style={{ gap: Spacing.md }}>
          <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="Aarav Kumar" testID="register-name-input" />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" testID="register-email-input" />
          <Input label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" testID="register-phone-input" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" testID="register-password-input" />
          <Input label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" testID="register-confirm-input" />
        </View>
      )}

      {/* I am a — Role picker (Role-Setup design) */}
      <Text style={s.section}>I AM A</Text>
      <View style={{ width: '100%', gap: 10, marginBottom: 18 }}>
        {ROLES.map((r) => {
          const active = role === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setRole(r.id)}
              testID={`register-role-${r.id}`}
              style={({ hovered, pressed }: any) => [
                s.row,
                hovered && !active && { borderColor: 'rgba(196,181,253,0.30)', backgroundColor: 'rgba(124,58,237,0.10)' },
                active && s.rowActive,
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
            >
              {r.recommended && (
                <View style={s.recBadge}>
                  <Text style={s.recBadgeText}>RECOMMENDED</Text>
                </View>
              )}
              <View style={s.rowTop}>
                <View style={[s.rowIcon, active && s.rowIconActive]}>
                  <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                </View>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.rowTitle}>{r.title}</Text>
                  <Text style={s.rowDesc}>{r.desc}</Text>
                </View>
                <View style={[s.radio, active && s.radioActive]}>
                  {active && <View style={s.radioDot} />}
                </View>
              </View>

              {/* Mentor segments — always visible per prototype */}
              {r.id === 'mentor' && (
                <View style={s.segments}>
                  {MENTOR_SEGMENTS.map((seg) => (
                    <Pressable
                      key={seg.id}
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        setRole('mentor');
                        setSegment(seg.id);
                      }}
                      testID={`register-mentor-segment-${seg.id}`}
                      style={({ hovered }: any) => [
                        s.segChip,
                        active && segment === seg.id && s.segChipActive,
                        hovered && (!active || segment !== seg.id) && { backgroundColor: 'rgba(255,255,255,0.10)' },
                      ]}
                    >
                      <Text style={[s.segText, active && segment === seg.id && s.segTextActive]}>{seg.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {error && <Text style={s.err}>{error}</Text>}

      {IS_WEB ? (
        <WebPrimaryBtn label="Create account" onPress={onSubmit} loading={loading} testID="register-submit-btn" />
      ) : (
        <Button title="Create account" onPress={onSubmit} loading={loading} testID="register-submit-btn" style={{ marginTop: Spacing.md }} />
      )}

      <Pressable
        onPress={() => router.push('/(auth)/login')}
        testID="register-go-login-btn"
        style={({ hovered }: any) => [s.switch, hovered && { opacity: 0.85 }]}
      >
        <Text style={s.switchText}>
          Already have an account? <Text style={s.switchLink}>Log in</Text>
        </Text>
      </Pressable>
    </View>
  );

  // ─── WEB ──────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <AuthWebShell variant="split">
        <View>
          <Pressable
            onPress={() => router.back()}
            testID="register-back-btn"
            style={({ hovered }: any) => [s.webBack, hovered && { opacity: 1 }]}
          >
            <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
            <Text style={s.webBackText}>Back</Text>
          </Pressable>
          {Body}
        </View>
      </AuthWebShell>
    );
  }

  // ─── NATIVE ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={native.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={native.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} testID="register-back-btn" style={native.back}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {Body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  webBack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, marginBottom: 14, opacity: 0.75,
    alignSelf: 'flex-start',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  webBackText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 13 },

  h1: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 26, letterSpacing: -0.4, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 13.5, textAlign: 'center', marginTop: 6, marginBottom: 22 },

  // OAuth
  btnLi: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#0A66C2', paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 11,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  btnLiText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  btnGg: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FFFFFF', paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 11,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  btnGgText: { color: '#1F2937', fontFamily: 'DMSans_700Bold', fontSize: 15 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  divText: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 1 },

  section: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 1, marginTop: 10, marginBottom: 10,
  },

  // Role rows (Role-Setup design)
  row: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderRadius: 18, padding: 16,
    position: 'relative', overflow: 'hidden',
    ...({ cursor: 'pointer', transitionDuration: '200ms' } as any),
  },
  rowActive: {
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconActive: { backgroundColor: 'rgba(124,58,237,0.30)', borderColor: 'rgba(196,181,253,0.45)' },
  rowTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 16, letterSpacing: -0.2 },
  rowDesc: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, lineHeight: 17, marginTop: 4 },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.14)' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED' },

  recBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10, paddingVertical: 4,
    borderTopRightRadius: 18, borderBottomLeftRadius: 12, zIndex: 2,
  },
  recBadgeText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.8 },

  segments: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
  },
  segChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  segChipActive: { backgroundColor: 'rgba(176,127,223,0.30)', borderColor: 'rgba(196,181,253,0.55)' },
  segText: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 12 },
  segTextActive: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },

  err: {
    color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 13,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderColor: 'rgba(252,165,165,0.3)', borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, marginBottom: 10,
  },

  switch: { alignItems: 'center', marginTop: 18, ...({ cursor: 'pointer' } as any) },
  switchText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular', fontSize: 14 },
  switchLink: { color: '#D4AAFF', fontFamily: 'DMSans_700Bold' },
});

const native = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0820' },
  container: { padding: 22, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
