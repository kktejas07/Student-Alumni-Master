/**
 * Email Verification screen — web (centered glass card) + native (full screen).
 *
 * States:
 *   0 = pending         — show "we sent a link to user@email" + status / timer
 *   1 = verifying       — spinner with "Verifying your email…"
 *   2 = verified        — success ✓ + CTA to set up 2FA / skip
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { useToast } from '@/src/views/components';
import { AuthWebShell } from '@/src/views/web/AuthWebShell';
import { WebPrimaryBtn, WebGhostBtn } from '@/src/views/web/AuthWebControls';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const IS_WEB = Platform.OS === 'web';

export default function EmailVerify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || 'rahul@alumni.edu';
  const toast = useToast();
  const role = useAuthStore((u) => u.user?.role) as any;

  const [step, setStep] = useState<0 | 1 | 2>(0);

  const verify = () => {
    setStep(1);
    setTimeout(() => {
      setStep(2);
      toast.success('Email verified', 'Your account is now fully active.');
    }, 1300);
  };

  const resend = () => {
    toast.info('Verification email resent', `New link sent to ${email}`);
  };

  const skipToDashboard = () => {
    // Per spec — go through Welcome Dashboard transition before landing on portal
    router.replace('/(onboarding)/welcome-dashboard' as any);
  };

  const goSetup2FA = () => {
    router.replace('/(auth)/two-fa-setup');
  };

  const Body = (
    <View>
      {step === 0 && <PendingView email={email} onVerify={verify} onResend={resend} onChangeEmail={() => router.back()} />}
      {step === 1 && <VerifyingView />}
      {step === 2 && <DoneView onSetup2FA={goSetup2FA} onSkip={skipToDashboard} />}
    </View>
  );

  // ─── Web ─────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <AuthWebShell variant="center" cardMaxWidth={460} role={role}>
        {step === 0 && (
          <Pressable
            onPress={() => router.back()}
            style={({ hovered }: any) => [styles.back, hovered && { opacity: 1 }]}
          >
            <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        {Body}
      </AuthWebShell>
    );
  }

  // ─── Native ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={nativeStyles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={nativeStyles.container}>
        {step === 0 && (
          <Pressable onPress={() => router.back()} style={nativeStyles.backNative}>
            <ArrowLeft size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
        )}
        {Body}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── State views ─────────────────────────────────────────────────────────────

function PendingView({
  email, onVerify, onResend, onChangeEmail,
}: {
  email: string; onVerify: () => void; onResend: () => void; onChangeEmail: () => void;
}) {
  // "Float" animation on email icon
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
          <Text style={{ fontSize: 44 }}>📧</Text>
        </Animated.View>
      </View>
      <Text style={styles.h1}>Verify your email address</Text>
      <Text style={styles.sub}>
        We sent a verification link to{' '}
        <Text style={styles.emailHi}>{email}</Text>
      </Text>

      {/* Status card */}
      <View style={styles.statusCard}>
        {[
          { emoji: '📤', label: 'Email sent',   value: '2 minutes ago',    color: 'rgba(255,255,255,0.6)' },
          { emoji: '⏳', label: 'Link expires', value: 'In 23 minutes',    color: '#FCD34D' },
          { emoji: '🔒', label: 'Secure',       value: 'One-time use link', color: '#86EFAC' },
        ].map((row, i, arr) => (
          <View key={row.label} style={[styles.statusRow, i < arr.length - 1 && styles.statusRowDivider]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 17 }}>{row.emoji}</Text>
              <Text style={styles.statusLabel}>{row.label}</Text>
            </View>
            <Text style={[styles.statusVal, { color: row.color }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Progress timer */}
      <View style={{ marginBottom: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.timerLabel}>Time remaining</Text>
          <Text style={styles.timerVal}>23 min</Text>
        </View>
        <View style={styles.timerTrack}>
          <View style={styles.timerFill} />
        </View>
      </View>

      <WebPrimaryBtn label="I've verified my email →" onPress={onVerify} testID="email-verify-confirm-btn" />
      <View style={{ height: 10 }} />
      <WebGhostBtn label="Resend verification email" onPress={onResend} testID="email-verify-resend-btn" />

      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <Pressable
          onPress={onChangeEmail}
          style={({ hovered }: any) => [{ opacity: hovered ? 1 : 0.85 }]}
        >
          <Text style={styles.changeEmailText}>
            Wrong email? <Text style={styles.changeEmailLink}>Change email</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function VerifyingView() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <ActivityIndicator size="large" color="#A78BFA" />
      <Text style={[styles.h1, { marginTop: 22, fontSize: 17 }]}>Verifying your email…</Text>
      <Text style={[styles.sub, { textAlign: 'center', marginTop: 4 }]}>This will only take a moment.</Text>
    </View>
  );
}

function DoneView({ onSetup2FA, onSkip }: { onSetup2FA: () => void; onSkip: () => void }) {
  // Pulse animation on success ring
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
        <Text style={{ fontSize: 38, color: '#34D399' }}>✓</Text>
      </Animated.View>
      <Text style={[styles.h1, { textAlign: 'center', marginTop: 6 }]}>Email verified! 🎉</Text>
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

// ─── styles ──────────────────────────────────────────────────────────────────
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

  timerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.42)', fontFamily: 'DMSans_600SemiBold' },
  timerVal: { fontSize: 11, color: '#FCD34D', fontFamily: 'DMSans_700Bold' },
  timerTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  timerFill: { width: '77%', height: '100%', borderRadius: 2, backgroundColor: '#FCD34D' },

  changeEmailText: { color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular', fontSize: 13 },
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
