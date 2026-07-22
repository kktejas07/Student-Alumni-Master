import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShieldCheck, Mail, Send, Clock, ExternalLink } from 'lucide-react-native';
import { useToast } from '@/src/views/components';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebPrimaryBtn, WebGhostBtn } from '@/src/views/web/AuthWebControls';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { getBaseUrl } from '@/src/lib/env';

const IS_WEB = Platform.OS === 'web';
const BASE = getBaseUrl();

export default function EmailVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || 'rahul@alumni.edu';
  const toast = useToast();
  const role = useAuthStore((u) => u.user?.role) as any;
  const user = useAuthStore((u) => u.user);

  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(user?.email_verified || false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  useEffect(() => {
    fetch(`${BASE}/api/auth/send-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {});
  }, []);

  // Poll /auth/me to check email_verified status
  useEffect(() => {
    if (verified) return;
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/me`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.email_verified || data?.email_verified) {
            setVerified(true);
            setPolling(false);
            clearInterval(interval);
            toast.success('Email verified', 'Your account is now fully active.');
          }
        }
      } catch {}
    }, 3000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [verified]);

  const resend = async () => {
    setResending(true);
    try {
      await fetch(`${BASE}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setResending(false);
    setResendTimer(60);
    toast.info('Verification email resent', `Check ${email} for the verification link.`);
  };

  const skipToDashboard = () => {
    router.replace('/(onboarding)/welcome-dashboard' as any);
  };

  const goSetup2FA = () => {
    router.replace('/(auth)/two-fa-setup');
  };

  const Body = (
    <View>
      {!verified && <PendingView email={email} onResend={resend} resending={resending} resendTimer={resendTimer} polling={polling} />}
      {verified && <DoneView onSetup2FA={goSetup2FA} onSkip={skipToDashboard} />}
    </View>
  );

  if (IS_WEB) {
    return (
      <AuthWebShell variant="center" cardMaxWidth={460} role={role}>
        {!verified && (
          <Pressable
            onPress={() => router.back()}
            style={({ hovered }: any) => [styles.back, hovered && { opacity: 1 }]}
            testID="verify-back"
          >
            <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        {Body}
      </AuthWebShell>
    );
  }

  return (
    <SafeAreaView style={nativeStyles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={nativeStyles.container}>
        {!verified && (
          <Pressable onPress={() => router.back()} style={nativeStyles.backNative} testID="verify-back">
            <ArrowLeft size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
        )}
        {Body}
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingView({
  email, onResend, resending, resendTimer, polling,
}: {
  email: string; onResend: () => void; resending: boolean; resendTimer: number; polling: boolean;
}) {
  const floatY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [floatY]);

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Animated.View style={[styles.iconHero, { transform: [{ translateY: floatY }] }]}>
          <Mail size={36} color="#C4B5FD" />
        </Animated.View>
      </View>
      <Text style={styles.h1}>Verify your email address</Text>
      <Text style={styles.sub}>
        We sent a verification link to{' '}
        <Text style={styles.emailHi}>{email}</Text>
      </Text>

      <View style={styles.statusCard}>
        {[
          { icon: Send,     label: 'Email sent',   value: 'Link sent',            color: 'rgba(255,255,255,0.6)' },
          { icon: ExternalLink, label: 'Click link', value: 'Verifies instantly', color: '#86EFAC' },
          { icon: Clock,    label: 'Link expires', value: 'In 30 minutes',        color: '#FCD34D' },
        ].map((row, i, arr) => (
          <View key={row.label} style={[styles.statusRow, i < arr.length - 1 && styles.statusRowDivider]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <row.icon size={15} color="rgba(255,255,255,0.4)" />
              <Text style={styles.statusLabel}>{row.label}</Text>
            </View>
            <Text style={[styles.statusVal, { color: row.color }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {polling && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
          <ActivityIndicator size="small" color="#A78BFA" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Waiting for verification...</Text>
        </View>
      )}

      <WebGhostBtn
        label={resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend verification link'}
        disabled={resendTimer > 0 || resending}
        loading={resending}
        onPress={onResend}
        testID="verify-resend"
      />

      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <Text style={styles.changeEmailText}>
          Didn't receive it? Check your spam folder or{' '}
          <Pressable onPress={onResend} style={({ hovered }: any) => [{ opacity: hovered ? 1 : 0.85 }]}>
            <Text style={styles.changeEmailLink}>resend</Text>
          </Pressable>
        </Text>
      </View>
    </View>
  );
}

function DoneView({ onSetup2FA, onSkip }: { onSetup2FA: () => void; onSkip: () => void }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={{ alignItems: 'center', paddingVertical: 6 }}>
      <Animated.View style={[styles.successRing, { transform: [{ scale }], opacity }]}>
        <ShieldCheck size={40} color="#34D399" />
      </Animated.View>
      <Text style={[styles.h1, { textAlign: 'center', marginTop: 6 }]}>Email verified!</Text>
      <Text style={[styles.sub, { textAlign: 'center', marginBottom: 18 }]}>
        Your email address has been confirmed. Your account is now fully active.
      </Text>
      <View style={styles.verifiedBadge}>
        <ShieldCheck size={14} color="#86EFAC" />
        <Text style={styles.verifiedBadgeText}>Account Verified</Text>
      </View>

      <View style={{ width: '100%', marginTop: 18 }}>
        <WebPrimaryBtn label="Set up 2FA (Recommended)" onPress={onSetup2FA} testID="email-verify-go-2fa" />
        <View style={{ height: 10 }} />
        <WebGhostBtn label="Skip for now" onPress={onSkip} testID="email-verify-skip-btn" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 6,
    opacity: 0.75,
    alignSelf: 'flex-start',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  backText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  iconHero: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: 'rgba(124,58,237,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(196,181,253,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  emailHi: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold' },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  statusLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  statusVal: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  changeEmailText: { color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular', fontSize: 13, textAlign: 'center' },
  changeEmailLink: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold' },
  successRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(52,211,153,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(110,231,183,0.35)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verifiedBadgeText: { color: '#86EFAC', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});

const nativeStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0820' },
  container: { padding: 24, gap: 16, paddingBottom: 60 },
  backNative: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
