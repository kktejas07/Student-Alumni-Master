/**
 * /two-fa-challenge  — Login-time 2FA challenge screen.
 *
 * Reached when user logs in with a 2FA-enabled account. Receives:
 *   • challenge_id — short-lived token from POST /auth/login
 *   • user_email   — account being authenticated (for display)
 *   • methods      — comma-separated list (e.g., "totp,backup")
 *
 * On success → calls authStore.verifyTwoFA → tokens issued → routes home.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput,
  Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react-native';
import { useToast, SALogo } from '@/src/views/components';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { WebPrimaryBtn } from '@/src/views/web/AuthWebControls';

const IS_WEB = Platform.OS === 'web';

export default function TwoFAChallenge() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ challenge_id: string; user_email: string; methods?: string }>();
  const verifyTwoFA = useAuthStore((s) => s.verifyTwoFA);

  const challengeId = String(params.challenge_id || '');
  const email = String(params.user_email || '');
  const allowBackup = String(params.methods || '').includes('backup');

  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [totp, setTotp] = useState(['', '', '', '', '', '']);
  const [backupCode, setBackupCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');
  const inputs = useRef<Array<TextInput | null>>([]);

  // If no challenge_id (deep link / refresh) → bounce back to login
  useEffect(() => {
    if (!challengeId) {
      toast.error('Session expired', 'Please log in again.');
      router.replace('/(auth)/login');
    }
  }, [challengeId]);

  // ─── TOTP digit handling ─────────────────────────────────────────────
  const onDigit = (i: number, v: string) => {
    const digit = v.replace(/[^0-9]/g, '').slice(-1);
    const next = [...totp];
    next[i] = digit;
    setTotp(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d) && next.join('').length === 6) {
      setTimeout(() => verify(next.join('')), 80);
    }
  };

  const onKey = (i: number, key: string) => {
    if (key === 'Backspace' && !totp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const home = (user: any) => {
    const dst = Platform.OS === 'web' ? '/platform' : '/(tabs)';
    router.replace(user.onboarding_completed ? dst : (
      user.role === 'student' ? '/(onboarding)/student-onboard' :
      user.role === 'mentor'  ? '/(onboarding)/mentor-onboard'  :
      user.role === 'alumni'  ? '/(onboarding)/alumni-onboard'  :
      user.role === 'college' ? '/(onboarding)/college-onboard' :
      '/(onboarding)/role-info'
    ));
  };

  // ─── Verify ──────────────────────────────────────────────────────────
  const verify = async (code: string) => {
    if (!code) return;
    setVerifying(true);
    setState('idle');
    try {
      const user = await verifyTwoFA(challengeId, code);
      setState('success');
      toast.success('Verified', `Signed in as ${user.email}`);
      setTimeout(() => home(user), 400);
    } catch (e: any) {
      setState('error');
      setVerifying(false);
      toast.error('Invalid code', e.message || 'Please try again.');
      setTotp(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 80);
      setTimeout(() => setState('idle'), 1500);
    }
  };

  const verifyBackup = () => {
    const code = backupCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
      toast.error('Invalid format', 'Backup codes look like XXXX-XXXX');
      return;
    }
    verify(code);
  };

  // ─── Body (shared web + native) ──────────────────────────────────────
  const Body = (
    <View style={{ width: '100%' }}>
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <SALogo size={56} variant="glass" />
      </View>

      <View style={s.iconCircle}>
        <ShieldCheck size={28} color="#A78BFA" />
      </View>

      <Text style={s.h1}>Two-Factor Authentication</Text>
      <Text style={s.sub}>
        Enter the 6-digit code from your authenticator app{email ? ` for ` : ''}
        {!!email && <Text style={{ color: '#D4AAFF' }}>{email}</Text>}
      </Text>

      {mode === 'totp' ? (
        <>
          <View style={s.otpRow}>
            {totp.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                value={d}
                onChangeText={(v) => onDigit(i, v)}
                onKeyPress={(e) => onKey(i, e.nativeEvent.key)}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={1}
                editable={!verifying}
                style={[
                  s.otpBox,
                  d && s.otpBoxFilled,
                  state === 'success' && s.otpBoxOk,
                  state === 'error' && s.otpBoxErr,
                ]}
                testID={`twofa-challenge-digit-${i}`}
              />
            ))}
          </View>

          {verifying && (
            <View style={s.statusRow}>
              <ActivityIndicator size="small" color="#A78BFA" />
              <Text style={s.statusText}>Verifying…</Text>
            </View>
          )}

          {allowBackup && (
            <Pressable
              onPress={() => setMode('backup')}
              testID="twofa-challenge-use-backup-btn"
              style={({ hovered }: any) => [s.linkBtn, hovered && { opacity: 1 }]}
            >
              <KeyRound size={14} color="#D4AAFF" />
              <Text style={s.linkText}>Use a backup code instead</Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <Text style={s.fieldLabel}>Backup code</Text>
          <TextInput
            value={backupCode}
            onChangeText={(v) => setBackupCode(v.toUpperCase())}
            placeholder="XXXX-XXXX"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="characters"
            maxLength={9}
            style={s.backupInput}
            testID="twofa-challenge-backup-input"
          />
          {IS_WEB ? (
            <WebPrimaryBtn label="Verify backup code" onPress={verifyBackup} loading={verifying} testID="twofa-challenge-backup-submit" />
          ) : (
            <Pressable
              onPress={verifyBackup}
              disabled={verifying}
              testID="twofa-challenge-backup-submit"
              style={({ pressed }: any) => [s.btnPrimary, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              {verifying
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={s.btnPrimaryText}>Verify backup code</Text>}
            </Pressable>
          )}
          <Pressable
            onPress={() => setMode('totp')}
            testID="twofa-challenge-back-totp-btn"
            style={({ hovered }: any) => [s.linkBtn, { marginTop: 8 }, hovered && { opacity: 1 }]}
          >
            <Text style={s.linkText}>Back to authenticator code</Text>
          </Pressable>
        </>
      )}

      <Pressable
        onPress={() => router.replace('/(auth)/login')}
        testID="twofa-challenge-cancel-btn"
        style={({ hovered }: any) => [s.cancel, hovered && { opacity: 1 }]}
      >
        <Text style={s.cancelText}>Cancel and sign in with a different account</Text>
      </Pressable>
    </View>
  );

  // ─── WEB ──────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <AuthShell>
        <View>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            testID="twofa-challenge-back-btn"
            style={({ hovered }: any) => [s.webBack, hovered && { opacity: 1 }]}
          >
            <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
            <Text style={s.webBackText}>Back to login</Text>
          </Pressable>
          {Body}
        </View>
      </AuthShell>
    );
  }

  // ─── NATIVE ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={native.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={native.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            testID="twofa-challenge-back-btn"
            style={native.back}
            hitSlop={12}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          {Body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  webBack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, marginBottom: 14, opacity: 0.75, alignSelf: 'flex-start',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  webBackText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 13 },

  iconCircle: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderWidth: 1, borderColor: 'rgba(196,181,253,0.45)',
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  h1: {
    color: '#FFFFFF', fontFamily: 'DMSans_700Bold',
    fontSize: 24, letterSpacing: -0.4, textAlign: 'center',
  },
  sub: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular',
    fontSize: 13.5, textAlign: 'center', marginTop: 6, marginBottom: 26,
  },

  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    gap: 6, marginBottom: 18, width: '100%',
  },
  otpBox: {
    flex: 1, height: 54, minWidth: 0, maxWidth: 48,
    borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 22,
    textAlign: 'center',
    ...({ outlineStyle: 'none' } as any),
  },
  otpBoxFilled: { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.14)' },
  otpBoxOk:     { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.14)' },
  otpBoxErr:    { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.14)' },

  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12,
  },
  statusText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_500Medium', fontSize: 13 },

  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 6, paddingVertical: 8,
    ...({ cursor: 'pointer' } as any),
  },
  linkText: { color: '#D4AAFF', fontFamily: 'DMSans_500Medium', fontSize: 13.5 },

  fieldLabel: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 1, marginBottom: 8,
  },
  backupInput: {
    height: 52, borderRadius: 12, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#FFFFFF', fontFamily: 'JetBrainsMono_700Bold, DMSans_700Bold', fontSize: 16,
    textAlign: 'center', letterSpacing: 2, paddingHorizontal: 14,
    marginBottom: 14, ...({ outlineStyle: 'none' } as any),
  },
  btnPrimary: {
    height: 52, borderRadius: 12, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 15 },

  cancel: { alignItems: 'center', marginTop: 22, ...({ cursor: 'pointer' } as any) },
  cancelText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'DMSans_400Regular', fontSize: 12.5,
  },
});

const native = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0820' },
  container: { padding: 22, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
