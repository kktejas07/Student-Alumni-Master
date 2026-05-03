/**
 * Two-Factor Authentication setup — web (centered glass card) + native (full screen).
 *
 * Steps:
 *   0 = Choose method  (Authenticator / SMS / Email)
 *   1 = Setup          (QR code | phone number | confirm email)
 *   2 = Verify         (6-digit OTP entry)
 *   3 = Backup codes   (6 codes to save)
 *   4 = Done           (success summary + go to dashboard)
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, ActivityIndicator,
  TextInput as RNTextInput, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, Download, ShieldCheck } from 'lucide-react-native';
import { useToast } from '@/src/views/components';
import { AuthShell } from '@/src/views/auth/AuthShell';
import {
  WebPrimaryBtn, WebGhostBtn, WebStepBar, WebOptionRow, WebField,
} from '@/src/views/web/AuthWebControls';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const IS_WEB = Platform.OS === 'web';

type Method = 'authenticator' | 'sms' | 'email';
type Step = 0 | 1 | 2 | 3 | 4;

const METHODS: { id: Method; emoji: string; title: string; sub: string; rec?: boolean }[] = [
  { id: 'authenticator', emoji: '📱', title: 'Authenticator App', sub: 'Google Authenticator, Authy, etc.', rec: true },
  { id: 'sms',           emoji: '💬', title: 'SMS / WhatsApp',    sub: 'Send code to your mobile number' },
  { id: 'email',         emoji: '📧', title: 'Email OTP',         sub: 'Send code to your verified email' },
];

const BACKUP_CODES = ['8F2K-4X9P', '3J7N-2M1Q', '6R4H-8T5W', '1Y3C-9L6E', '5B8D-7A2V', '4G6F-1N3K'];

export default function TwoFASetup() {
  const router = useRouter();
  const toast = useToast();
  const role = useAuthStore((u) => u.user?.role) as any;
  const [step, setStep] = useState<Step>(0);
  const [method, setMethod] = useState<Method | null>(null);
  const [phone, setPhone] = useState('98765 43210');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpState, setOtpState] = useState<'idle' | 'success' | 'error'>('idle');

  const onContinue = () => {
    if (step === 0 && !method) {
      toast.error('Pick a method', 'Choose one of the available options to continue.');
      return;
    }
    setStep((s) => Math.min(4, (s + 1) as Step) as Step);
  };

  const verifyOTP = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Incomplete code', 'Please enter all 6 digits.');
      setOtpState('error');
      setTimeout(() => setOtpState('idle'), 1500);
      return;
    }
    setOtpState('success');
    toast.success('Code verified', 'Two-factor authentication enabled.');
    setTimeout(() => setStep(3), 700);
  };

  const goBackInternal = () => {
    if (step > 0) {
      setStep((s) => Math.max(0, (s - 1) as Step) as Step);
      setOtpState('idle');
    } else {
      router.back();
    }
  };

  const finish = () => {
    toast.success('Welcome aboard!', 'Your dashboard is ready.');
    router.replace('/(onboarding)/welcome-dashboard' as any);
  };

  const Body = (
    <View>
      {step <= 3 && (
        <WebStepBar steps={['Method', 'Setup', 'Verify', 'Backup']} current={step as 0 | 1 | 2 | 3} />
      )}

      {/* STEP 0 — Choose method */}
      {step === 0 && (
        <View>
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <View style={styles.heroIcon}>
              <Text style={{ fontSize: 32 }}>🛡️</Text>
            </View>
          </View>
          <Text style={styles.h1}>Two-Factor Authentication</Text>
          <Text style={styles.sub}>Add an extra layer of security to your account. Choose how you'd like to receive your verification codes.</Text>
          <View style={{ marginBottom: 8 }}>
            {METHODS.map((m) => (
              <WebOptionRow
                key={m.id}
                emoji={m.emoji}
                title={m.title}
                subtitle={m.sub}
                recommended={m.rec}
                selected={method === m.id}
                onPress={() => setMethod(m.id)}
                testID={`twofa-method-${m.id}`}
              />
            ))}
          </View>
          <WebPrimaryBtn label="Continue →" onPress={onContinue} testID="twofa-continue-btn" />
          <View style={{ height: 10 }} />
          <WebGhostBtn label="Skip for now" onPress={finish} testID="twofa-skip-btn" />
        </View>
      )}

      {/* STEP 1 — Setup */}
      {step === 1 && method === 'authenticator' && (
        <View>
          <Text style={styles.h2}>Scan QR Code 📱</Text>
          <Text style={styles.sub}>Open your authenticator app and scan this code, or enter the key manually.</Text>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={styles.qrFrame}>
              <FakeQR />
              <View style={styles.qrLogo}>
                <Text style={{ color: '#7C3AED', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>SA</Text>
              </View>
            </View>
          </View>
          <View style={styles.manualKeyBox}>
            <Text style={styles.manualKeyLabel}>MANUAL KEY</Text>
            <Text style={styles.manualKeyVal}>JBSWY3DPEHPK3PXP{'\n'}QRST UVWX YZAB 2345</Text>
          </View>
          <WebPrimaryBtn label="I've scanned the code →" onPress={onContinue} testID="twofa-scanned-btn" />
        </View>
      )}

      {step === 1 && method === 'sms' && (
        <View>
          <Text style={styles.h2}>Add your number 💬</Text>
          <Text style={styles.sub}>We'll send you a verification code via SMS or WhatsApp.</Text>
          <WebField label="Country code" value="🇮🇳 +91" onChangeText={() => {}} />
          <WebField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98765 43210" />
          <WebPrimaryBtn label="Send code" onPress={onContinue} testID="twofa-sms-send-btn" />
        </View>
      )}

      {step === 1 && method === 'email' && (
        <View>
          <Text style={styles.h2}>Email verification 📧</Text>
          <Text style={styles.sub}>We'll send a 6-digit code to your verified email whenever you log in.</Text>
          <View style={styles.verifiedEmailCard}>
            <Text style={styles.verifiedEmailLabel}>VERIFIED EMAIL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>✉️</Text>
              <Text style={styles.verifiedEmailVal}>rahul@alumni.edu</Text>
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>✓ Verified</Text>
              </View>
            </View>
          </View>
          <WebPrimaryBtn label="Enable email 2FA" onPress={onContinue} testID="twofa-email-enable-btn" />
        </View>
      )}

      {/* STEP 2 — Verify */}
      {step === 2 && (
        <View>
          <Text style={styles.h2}>Enter verification code 🔢</Text>
          <Text style={styles.sub}>
            {method === 'authenticator'
              ? 'Enter the 6-digit code from your authenticator app.'
              : method === 'sms'
              ? `Enter the code sent to +91 ${phone}.`
              : 'Enter the code sent to your email.'}
          </Text>
          <OTPInput value={otp} onChange={setOtp} state={otpState} />
          {otpState === 'success' && (
            <Text style={styles.otpSuccess}>✓ Code verified!</Text>
          )}
          <WebPrimaryBtn label="Verify & enable" onPress={verifyOTP} testID="twofa-verify-btn" />
        </View>
      )}

      {/* STEP 3 — Backup codes */}
      {step === 3 && (
        <View>
          <Text style={styles.h2}>Save backup codes 📋</Text>
          <Text style={styles.sub}>Keep these somewhere safe. Each code can only be used once if you lose access to your 2FA device.</Text>
          <View style={styles.codesGrid}>
            {BACKUP_CODES.map((code, i) => (
              <View key={i} style={styles.codeBox}>
                <Text style={styles.codeText}>{code}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={() => toast.success('Codes copied', 'Backup codes copied to clipboard.')}
              style={({ hovered }: any) => [styles.actionBtn, { flex: 1 }, hovered && styles.actionBtnHover]}
            >
              <Copy size={15} color="#FFFFFF" />
              <Text style={styles.actionText}>Copy codes</Text>
            </Pressable>
            <Pressable
              onPress={() => toast.success('Codes downloaded', 'A .txt file has been saved.')}
              style={({ hovered }: any) => [styles.actionBtn, { flex: 1 }, hovered && styles.actionBtnHover]}
            >
              <Download size={15} color="#FFFFFF" />
              <Text style={styles.actionText}>Download</Text>
            </Pressable>
          </View>
          <View style={styles.warnBox}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={styles.warnText}>Store these codes securely. They won't be shown again.</Text>
          </View>
          <WebPrimaryBtn label="I've saved my codes →" onPress={onContinue} testID="twofa-saved-btn" />
        </View>
      )}

      {/* STEP 4 — Done */}
      {step === 4 && (
        <View style={{ alignItems: 'center' }}>
          <View style={styles.successRing}>
            <ShieldCheck size={36} color="#34D399" />
          </View>
          <Text style={[styles.h2, { textAlign: 'center', marginTop: 4 }]}>2FA Enabled! 🎉</Text>
          <Text style={[styles.sub, { textAlign: 'center', maxWidth: 320 }]}>
            Your account is now protected with two-factor authentication via{' '}
            <Text style={{ color: '#FFFFFF', fontFamily: 'DMSans_700Bold' }}>
              {METHODS.find((m) => m.id === method)?.title}
            </Text>.
          </Text>
          <View style={[styles.smallBadge, { marginTop: 4, marginBottom: 22 }]}>
            <Text style={styles.smallBadgeText}>🛡️  Account Secured</Text>
          </View>

          <View style={styles.summaryCard}>
            {[
              { l: 'Method',        v: METHODS.find((m) => m.id === method)?.title || '—' },
              { l: 'Status',        v: 'Active' },
              { l: 'Backup codes',  v: '6 saved' },
            ].map((r, i, arr) => (
              <View key={r.l} style={[styles.summaryRow, i < arr.length - 1 && styles.summaryRowDiv]}>
                <Text style={styles.summaryLabel}>{r.l}</Text>
                <Text style={styles.summaryVal}>{r.v}</Text>
              </View>
            ))}
          </View>

          <View style={{ width: '100%' }}>
            <WebPrimaryBtn label="Go to Dashboard →" onPress={finish} testID="twofa-finish-btn" />
          </View>
        </View>
      )}
    </View>
  );

  // ─── Web ─────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <AuthShell role={role}>
        <Pressable
          onPress={goBackInternal}
          style={({ hovered }: any) => [styles.back, hovered && { opacity: 1 }]}
        >
          <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {Body}
      </AuthShell>
    );
  }

  // ─── Native ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={nativeStyles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={nativeStyles.container}>
        <Pressable onPress={goBackInternal} style={nativeStyles.backNative}>
          <ArrowLeft size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>
        {Body}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── OTP input ───────────────────────────────────────────────────────────────
function OTPInput({
  value, onChange, state,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  state: 'idle' | 'success' | 'error';
}) {
  const refs = useRef<(RNTextInput | null)[]>([]);

  const setDigit = (i: number, c: string) => {
    const digit = c.replace(/[^0-9]/g, '').slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, key: string) => {
    if (key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const borderColor =
    state === 'success' ? '#10B981'
    : state === 'error' ? '#EF4444'
    : 'rgba(255,255,255,0.16)';

  return (
    <View style={otpStyles.row}>
      {value.map((d, i) => (
        <RNTextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          value={d}
          onChangeText={(c) => setDigit(i, c)}
          onKeyPress={(e) => handleKey(i, (e.nativeEvent as any).key)}
          keyboardType="number-pad"
          maxLength={1}
          style={[otpStyles.cell, { borderColor }]}
          testID={`twofa-otp-${i}`}
        />
      ))}
    </View>
  );
}

// ─── Fake QR (decorative) ────────────────────────────────────────────────────
function FakeQR() {
  const onCells = new Set([
    0,1,2,3,4,5,6,9,15,18,24,30,27,28,29,30,31,32,33,36,42,45,46,47,48,49,50,51,
    54,60,63,69,72,73,74,75,76,77,78,40,41,55,56,57,38,44,64,65,67,68,
  ]);
  return (
    <View style={{ width: '100%', height: '100%', flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from({ length: 81 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: '11.11%',
            height: '11.11%',
            backgroundColor: onCells.has(i) ? '#0F0820' : 'transparent',
          }}
        />
      ))}
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
    marginBottom: 4,
    opacity: 0.75,
    alignSelf: 'flex-start',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  backText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_500Medium', fontSize: 13 },

  heroIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.28)',
    borderWidth: 1, borderColor: 'rgba(196,181,253,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  h1: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  h2: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 21,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 22,
    textAlign: 'left',
  },

  qrFrame: {
    width: 168, height: 168, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  qrLogo: {
    position: 'absolute',
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
  },

  manualKeyBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  manualKeyLabel: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  manualKeyVal: {
    color: '#C4B5FD',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 1.5,
  },

  verifiedEmailCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  verifiedEmailLabel: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  verifiedEmailVal: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 15 },

  smallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(110,231,183,0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 'auto',
  },
  smallBadgeText: { color: '#86EFAC', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  otpSuccess: {
    color: '#34D399',
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },

  codesGrid: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  codeBox: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: 'rgba(196,181,253,0.10)',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 14, letterSpacing: 1.2 },

  actionBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  actionBtnHover: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.20)',
  },
  actionText: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 13 },

  warnBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(252,211,77,0.30)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  warnText: { color: '#FCD34D', fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17, flex: 1 },

  successRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderWidth: 2, borderColor: 'rgba(52,211,153,0.5)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    marginTop: 4,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  summaryRowDiv: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  summaryLabel: { color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_500Medium', fontSize: 12 },
  summaryVal: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  cell: {
    width: 46, height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    textAlign: 'center',
    ...({ outlineStyle: 'none' } as any),
  },
});

const nativeStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0820' },
  container: { padding: 24, gap: 14, paddingBottom: 60 },
  backNative: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
