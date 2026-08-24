import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, TextInput,
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

  useEffect(() => {
    if (!challengeId) {
      toast.error('Session expired', 'Please log in again.');
      router.replace('/(auth)/login');
    }
  }, [challengeId]);

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

  const Body = (
    <View style={{ width: '100%' }}>
      <View className="items-center" style={{ marginBottom: 14 }}>
        <SALogo size={56} variant="glass" />
      </View>

      <View className="items-center justify-center self-center" style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(124,58,237,0.18)', borderWidth: 1, borderColor: 'rgba(196,181,253,0.45)', marginBottom: 16 }}>
        <ShieldCheck size={28} color="#A78BFA" />
      </View>

      <Text className="text-text font-body-bold text-center" style={{ fontSize: 24, letterSpacing: -0.4 }}>Two-Factor Authentication</Text>
      <Text className="text-muted text-center" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, marginTop: 6, marginBottom: 26 }}>
        Enter the 6-digit code from your authenticator app{email ? ` for ` : ''}
        {!!email && <Text style={{ color: '#D4AAFF' }}>{email}</Text>}
      </Text>

      {mode === 'totp' ? (
        <>
          <View className="flex-row justify-between" style={{ gap: 6, marginBottom: 18, width: '100%' }}>
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
                className="font-body-bold text-text text-center"
                style={[
                  { flex: 1, height: 54, minWidth: 0, maxWidth: 48, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.04)', fontSize: 22, borderColor: 'rgba(255,255,255,0.18)', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
                  d && { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.14)' },
                  state === 'success' && { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.14)' },
                  state === 'error' && { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.14)' },
                ]}
                testID={`twofa-challenge-digit-${i}`}
              />
            ))}
          </View>

          {verifying && (
            <View className="flex-row items-center justify-center" style={{ gap: 8, marginBottom: 12 }}>
              <ActivityIndicator size="small" color="#A78BFA" />
              <Text className="text-muted" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13 }}>Verifying…</Text>
            </View>
          )}

          {allowBackup && (
            <Pressable
              onPress={() => setMode('backup')}
              testID="twofa-challenge-use-backup-btn"
              className="flex-row items-center justify-center"
              style={({ hovered }: any) => [{ gap: 8, marginTop: 6, paddingVertical: 8, cursor: 'pointer' }, hovered && { opacity: 1 }]}
            >
              <KeyRound size={14} color="#D4AAFF" />
              <Text className="text-violet" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13.5 }}>Use a backup code instead</Text>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <Text className="text-muted font-body-bold" style={{ fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>Backup code</Text>
          <TextInput
            value={backupCode}
            onChangeText={(v) => setBackupCode(v.toUpperCase())}
            placeholder="XXXX-XXXX"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="characters"
            maxLength={9}
            className="text-text font-body-bold text-center"
            style={{ height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', fontSize: 16, letterSpacing: 2, paddingHorizontal: 14, marginBottom: 14, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }}
            testID="twofa-challenge-backup-input"
          />
          {IS_WEB ? (
            <WebPrimaryBtn label="Verify backup code" onPress={verifyBackup} loading={verifying} testID="twofa-challenge-backup-submit" />
          ) : (
            <Pressable
              onPress={verifyBackup}
              disabled={verifying}
              testID="twofa-challenge-backup-submit"
              className="items-center justify-center"
              style={({ pressed }: any) => [{ height: 52, borderRadius: 12, backgroundColor: '#7C3AED' }, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              {verifying
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text className="text-text font-body-bold" style={{ fontSize: 15 }}>Verify backup code</Text>}
            </Pressable>
          )}
          <Pressable
            onPress={() => setMode('totp')}
            testID="twofa-challenge-back-totp-btn"
            className="flex-row items-center justify-center"
            style={({ hovered }: any) => [{ gap: 8, marginTop: 8, paddingVertical: 8, cursor: 'pointer' }, hovered && { opacity: 1 }]}
          >
            <Text className="text-violet" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13.5 }}>Back to authenticator code</Text>
          </Pressable>
        </>
      )}

      <Pressable
        onPress={() => router.replace('/(auth)/login')}
        testID="twofa-challenge-cancel-btn"
        className="items-center"
        style={({ hovered }: any) => [{ marginTop: 22, cursor: 'pointer' }, hovered && { opacity: 1 }]}
      >
        <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 12.5 }}>Cancel and sign in with a different account</Text>
      </Pressable>
    </View>
  );

  if (IS_WEB) {
    return (
      <AuthShell>
        <View>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            testID="twofa-challenge-back-btn"
            className="flex-row items-center self-start"
            style={({ hovered }: any) => [{ gap: 6, paddingVertical: 6, marginBottom: 14, opacity: 0.75, cursor: 'pointer', transitionDuration: '160ms' }, hovered && { opacity: 1 }]}
          >
            <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
            <Text className="text-muted" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13 }}>Back to login</Text>
          </Pressable>
          {Body}
        </View>
      </AuthShell>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            testID="twofa-challenge-back-btn"
            className="items-center justify-center"
            style={{ width: 40, height: 40, marginBottom: 4 }}
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
