import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Animated, Easing,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShieldCheck, Mail, Send, Clock, Lock } from 'lucide-react-native';
import { useToast } from '@/src/views/components';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebPrimaryBtn, WebGhostBtn } from '@/src/views/web/AuthWebControls';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { getBaseUrl } from '@/src/lib/env';

const IS_WEB = Platform.OS === 'web';
const BASE = getBaseUrl();

export default function EmailVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const email = params.email || 'rahul@alumni.edu';
  const urlToken = params.token || '';
  const toast = useToast();
  const role = useAuthStore((u) => u.user?.role) as any;

  const [step, setStep] = useState<0 | 1 | 2>(urlToken ? 1 : 0);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const verify = async () => {
    setStep(1);
    try {
      if (urlToken) {
        const res = await fetch(`${BASE}/api/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, token: urlToken }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error('Verification failed', err?.detail || 'Invalid or expired token');
          setStep(0);
          return;
        }
      }
      setStep(2);
      toast.success('Email verified', 'Your account is now fully active.');
    } catch {
      toast.error('Network error', 'Could not verify email. Check your connection.');
      setStep(0);
    }
  };

  useEffect(() => {
    if (urlToken) verify();
  }, [urlToken]);

  const resend = async () => {
    setResending(true);
    try {
      const res = await fetch(`${BASE}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendTimer(60);
        toast.info('Verification email sent', `New link sent to ${email}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error('Failed to send', err?.detail || 'Could not send verification email');
      }
    } catch {
      toast.error('Network error', 'Could not send verification email');
    } finally {
      setResending(false);
    }
  };

  const skipToDashboard = () => {
    router.replace('/(onboarding)/welcome-dashboard' as any);
  };

  const goSetup2FA = () => {
    router.replace('/(auth)/two-fa-setup');
  };

  const Body = (
    <View>
      {step === 0 && <PendingView email={email} onVerify={verify} onResend={resend} onChangeEmail={() => router.back()} resending={resending} resendTimer={resendTimer} />}
      {step === 1 && <VerifyingView />}
      {step === 2 && <DoneView onSetup2FA={goSetup2FA} onSkip={skipToDashboard} />}
    </View>
  );

  if (IS_WEB) {
    return (
      <AuthWebShell variant="center" cardMaxWidth={460} role={role}>
        {step === 0 && (
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center self-start"
            style={({ hovered }: any) => [{ gap: 6, paddingVertical: 6, marginBottom: 6, opacity: 0.75, cursor: 'pointer', transitionDuration: '160ms' }, hovered && { opacity: 1 }]}
            testID="verify-back"
          >
            <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
            <Text className="text-muted" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13 }}>Back</Text>
          </Pressable>
        )}
        {Body}
      </AuthWebShell>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 60 }}>
        {step === 0 && (
          <Pressable onPress={() => router.back()} className="items-center justify-center" style={{ width: 40, height: 40, marginBottom: 8 }} testID="verify-back">
            <ArrowLeft size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
        )}
        {Body}
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingView({
  email, onVerify, onResend, onChangeEmail, resending, resendTimer,
}: {
  email: string; onVerify: () => void; onResend: () => void; onChangeEmail: () => void; resending: boolean; resendTimer: number;
}) {
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(floatY, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ).start();
  }, [floatY]);

  return (
    <View>
      <View className="items-center" style={{ marginBottom: 24 }}>
        <Animated.View className="items-center justify-center" style={[{ width: 100, height: 100, borderRadius: 28, backgroundColor: 'rgba(124,58,237,0.22)', borderWidth: 1.5, borderColor: 'rgba(196,181,253,0.28)' }, { transform: [{ translateY: floatY }] }]}>
          <Mail size={36} color="#C4B5FD" />
        </Animated.View>
      </View>
      <Text className="text-text font-body-bold text-center" style={{ fontSize: 22, letterSpacing: -0.4, marginBottom: 8 }}>Verify your email address</Text>
      <Text className="text-muted text-center" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 24 }}>
        We sent a verification link to{' '}
        <Text className="text-violet font-body-bold">{email}</Text>
      </Text>

      <View className="rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 18 }}>
        {[
          { icon: Send, label: 'Email sent',   value: '2 minutes ago',    color: 'rgba(255,255,255,0.6)' },
          { icon: Clock, label: 'Link expires', value: 'In 23 minutes',    color: '#FCD34D' },
          { icon: Lock, label: 'Secure',       value: 'One-time use link', color: '#86EFAC' },
        ].map((row, i, arr) => {
          const Icon = row.icon;
          return (
            <View key={row.label} className="flex-row justify-between items-center" style={[{ paddingVertical: 10 }, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <Icon size={16} color={row.color} />
                <Text className="text-muted" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13 }}>{row.label}</Text>
              </View>
              <Text className="font-body-bold" style={{ color: row.color, fontSize: 12 }}>{row.value}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ marginBottom: 22 }}>
        <View className="flex-row justify-between" style={{ marginBottom: 6 }}>
          <Text className="text-dim font-body-semibold" style={{ fontSize: 11 }}>Time remaining</Text>
          <Text className="font-body-bold" style={{ fontSize: 11, color: '#FCD34D' }}>23 min</Text>
        </View>
        <View className="rounded-full" style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <View className="rounded-full" style={{ width: '77%', height: '100%', backgroundColor: '#FCD34D' }} />
        </View>
      </View>

      <WebPrimaryBtn label="I've verified my email →" onPress={onVerify} testID="verify-email" />
      <View style={{ height: 10 }} />
      <WebGhostBtn label={resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend verification email"} disabled={resendTimer > 0 || resending} loading={resending} onPress={onResend} testID="verify-resend" />

      <View className="items-center" style={{ marginTop: 16 }}>
        <Pressable
          onPress={onChangeEmail}
          style={({ hovered }: any) => [{ opacity: hovered ? 1 : 0.85 }]}
        >
          <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13 }}>
            Wrong email? <Text className="text-violet font-body-bold">Change email</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function VerifyingView() {
  return (
    <View className="items-center" style={{ paddingVertical: 60 }}>
      <ActivityIndicator size="large" color="#A78BFA" />
      <Text className="text-text font-body-bold text-center" style={{ marginTop: 22, fontSize: 17 }}>Verifying your email…</Text>
      <Text className="text-muted text-center" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginTop: 4 }}>This will only take a moment.</Text>
    </View>
  );
}

function DoneView({ onSetup2FA, onSkip }: { onSetup2FA: () => void; onSkip: () => void }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View className="items-center" style={{ paddingVertical: 6 }}>
      <Animated.View className="items-center justify-center" style={[{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(16,185,129,0.18)', borderWidth: 2, borderColor: 'rgba(52,211,153,0.5)', marginBottom: 14 }, { transform: [{ scale }], opacity }]}>
        <Text style={{ fontSize: 38, color: '#34D399' }}>✓</Text>
      </Animated.View>
      <Text className="text-text font-body-bold text-center" style={{ fontSize: 22, letterSpacing: -0.4, marginTop: 6 }}>Email verified!</Text>
      <Text className="text-muted text-center" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 18 }}>
        Your email address has been confirmed. Your account is now fully active.
      </Text>
      <View className="flex-row items-center rounded-full" style={{ gap: 6, backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(110,231,183,0.35)', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 }}>
        <ShieldCheck size={14} color="#86EFAC" />
        <Text className="font-body-bold" style={{ color: '#86EFAC', fontSize: 12 }}>Account Verified</Text>
      </View>

      <View style={{ width: '100%', marginTop: 18 }}>
        <WebPrimaryBtn label="Set up 2FA (Recommended)" onPress={onSetup2FA} testID="email-verify-go-2fa" />
        <View style={{ height: 10 }} />
        <WebGhostBtn label="Skip for now" onPress={onSkip} testID="email-verify-skip-btn" />
      </View>
    </View>
  );
}
