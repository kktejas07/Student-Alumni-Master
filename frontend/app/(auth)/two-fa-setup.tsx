import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Animated, ActivityIndicator,
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

      {step === 0 && (
        <View>
          <View className="items-center" style={{ marginBottom: 18 }}>
            <View className="items-center justify-center" style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.28)', borderWidth: 1, borderColor: 'rgba(196,181,253,0.28)' }}>
              <Text style={{ fontSize: 32 }}>🛡️</Text>
            </View>
          </View>
          <Text className="text-text font-body-bold text-center" style={{ fontSize: 22, letterSpacing: -0.4, marginBottom: 6 }}>Two-Factor Authentication</Text>
          <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 22, textAlign: 'left' }}>Add an extra layer of security to your account. Choose how you'd like to receive your verification codes.</Text>
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

      {step === 1 && method === 'authenticator' && (
        <View>
          <Text className="text-text font-body-bold" style={{ fontSize: 21, letterSpacing: -0.4, marginBottom: 6 }}>Scan QR Code 📱</Text>
          <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 22, textAlign: 'left' }}>Open your authenticator app and scan this code, or enter the key manually.</Text>
          <View className="items-center" style={{ marginBottom: 16 }}>
            <View className="items-center justify-center" style={{ width: 168, height: 168, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 12, overflow: 'hidden', position: 'relative' }}>
              <FakeQR />
              <View className="items-center justify-center" style={{ position: 'absolute', width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#7C3AED' }}>
                <Text style={{ color: '#7C3AED', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>SA</Text>
              </View>
            </View>
          </View>
          <View className="rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 }}>
            <Text className="text-dim font-body-bold" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>MANUAL KEY</Text>
            <Text className="text-violet" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, letterSpacing: 1.5 }}>JBSWY3DPEHPK3PXP{'\n'}QRST UVWX YZAB 2345</Text>
          </View>
          <WebPrimaryBtn label="I've scanned the code →" onPress={onContinue} testID="twofa-scanned-btn" />
        </View>
      )}

      {step === 1 && method === 'sms' && (
        <View>
          <Text className="text-text font-body-bold" style={{ fontSize: 21, letterSpacing: -0.4, marginBottom: 6 }}>Add your number 💬</Text>
          <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 22, textAlign: 'left' }}>We'll send you a verification code via SMS or WhatsApp.</Text>
          <WebField label="Country code" value="🇮🇳 +91" onChangeText={() => {}} />
          <WebField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98765 43210" />
          <WebPrimaryBtn label="Send code" onPress={onContinue} testID="twofa-sms-send-btn" />
        </View>
      )}

      {step === 1 && method === 'email' && (
        <View>
          <Text className="text-text font-body-bold" style={{ fontSize: 21, letterSpacing: -0.4, marginBottom: 6 }}>Email verification 📧</Text>
          <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 22, textAlign: 'left' }}>We'll send a 6-digit code to your verified email whenever you log in.</Text>
          <View className="rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 }}>
            <Text className="text-dim font-body-bold" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>VERIFIED EMAIL</Text>
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Text style={{ fontSize: 18 }}>✉️</Text>
              <Text className="text-text font-body-semibold" style={{ fontSize: 15 }}>rahul@alumni.edu</Text>
              <View className="flex-row items-center rounded-full" style={{ gap: 4, backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(110,231,183,0.35)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 'auto' }}>
                <Text className="font-body-bold" style={{ color: '#86EFAC', fontSize: 10.5 }}>✓ Verified</Text>
              </View>
            </View>
          </View>
          <WebPrimaryBtn label="Enable email 2FA" onPress={onContinue} testID="twofa-email-enable-btn" />
        </View>
      )}

      {step === 2 && (
        <View>
          <Text className="text-text font-body-bold" style={{ fontSize: 21, letterSpacing: -0.4, marginBottom: 6 }}>Enter verification code 🔢</Text>
          <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 22, textAlign: 'left' }}>
            {method === 'authenticator'
              ? 'Enter the 6-digit code from your authenticator app.'
              : method === 'sms'
              ? `Enter the code sent to +91 ${phone}.`
              : 'Enter the code sent to your email.'}
          </Text>
          <OTPInput value={otp} onChange={setOtp} state={otpState} />
          {otpState === 'success' && (
            <Text className="text-teal font-body-bold text-center" style={{ fontSize: 13, marginBottom: 12 }}>✓ Code verified!</Text>
          )}
          <WebPrimaryBtn label="Verify & enable" onPress={verifyOTP} testID="twofa-verify-btn" />
        </View>
      )}

      {step === 3 && (
        <View>
          <Text className="text-text font-body-bold" style={{ fontSize: 21, letterSpacing: -0.4, marginBottom: 6 }}>Save backup codes 📋</Text>
          <Text className="text-muted" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, marginBottom: 22, textAlign: 'left' }}>Keep these somewhere safe. Each code can only be used once if you lose access to your 2FA device.</Text>
          <View className="rounded-xl flex-row flex-wrap" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, padding: 14, marginBottom: 16, gap: 10 }}>
            {BACKUP_CODES.map((code, i) => (
              <View key={i} className="items-center" style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: 'rgba(196,181,253,0.10)', paddingVertical: 9, paddingHorizontal: 8, borderRadius: 8 }}>
                <Text className="text-violet font-body-bold" style={{ fontSize: 14, letterSpacing: 1.2 }}>{code}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row" style={{ gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={() => toast.success('Codes copied', 'Backup codes copied to clipboard.')}
              className="flex-row items-center justify-center flex-1"
              style={({ hovered }: any) => [{ gap: 8, paddingVertical: 11, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderRadius: 10, cursor: 'pointer', transitionDuration: '160ms' }, hovered && { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)' }]}
            >
              <Copy size={15} color="#FFFFFF" />
              <Text className="text-text font-body-semibold" style={{ fontSize: 13 }}>Copy codes</Text>
            </Pressable>
            <Pressable
              onPress={() => toast.success('Codes downloaded', 'A .txt file has been saved.')}
              className="flex-row items-center justify-center flex-1"
              style={({ hovered }: any) => [{ gap: 8, paddingVertical: 11, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderRadius: 10, cursor: 'pointer', transitionDuration: '160ms' }, hovered && { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)' }]}
            >
              <Download size={15} color="#FFFFFF" />
              <Text className="text-text font-body-semibold" style={{ fontSize: 13 }}>Download</Text>
            </Pressable>
          </View>
          <View className="flex-row items-start rounded-xl" style={{ gap: 10, backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18 }}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text className="text-amber" style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17, flex: 1 }}>Store these codes securely. They won't be shown again.</Text>
          </View>
          <WebPrimaryBtn label="I've saved my codes →" onPress={onContinue} testID="twofa-saved-btn" />
        </View>
      )}

      {step === 4 && (
        <View className="items-center">
          <View className="items-center justify-center rounded-full" style={{ width: 88, height: 88, backgroundColor: 'rgba(16,185,129,0.18)', borderWidth: 2, borderColor: 'rgba(52,211,153,0.5)', marginBottom: 14, marginTop: 4 }}>
            <ShieldCheck size={36} color="#34D399" />
          </View>
          <Text className="text-text font-body-bold text-center" style={{ fontSize: 21, letterSpacing: -0.4, marginTop: 4 }}>2FA Enabled! 🎉</Text>
          <Text className="text-muted text-center" style={{ fontFamily: 'DMSans_400Regular', fontSize: 13.5, lineHeight: 21, maxWidth: 320, marginBottom: 22 }}>
            Your account is now protected with two-factor authentication via{' '}
            <Text className="text-text font-body-bold">
              {METHODS.find((m) => m.id === method)?.title}
            </Text>.
          </Text>
          <View className="flex-row items-center rounded-full" style={{ gap: 4, backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(110,231,183,0.35)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginLeft: 'auto', marginTop: 4, marginBottom: 22 }}>
            <Text className="font-body-bold" style={{ color: '#86EFAC', fontSize: 10.5 }}>🛡️  Account Secured</Text>
          </View>

          <View className="rounded-xl" style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 22 }}>
            {[
              { l: 'Method',        v: METHODS.find((m) => m.id === method)?.title || '—' },
              { l: 'Status',        v: 'Active' },
              { l: 'Backup codes',  v: '6 saved' },
            ].map((r, i, arr) => (
              <View key={r.l} className="flex-row justify-between" style={[{ paddingVertical: 9 }, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
                <Text className="text-muted" style={{ fontFamily: 'DMSans_500Medium', fontSize: 12 }}>{r.l}</Text>
                <Text className="text-text font-body-bold" style={{ fontSize: 12 }}>{r.v}</Text>
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

  if (IS_WEB) {
    return (
      <AuthShell role={role}>
        <Pressable
          onPress={goBackInternal}
          className="flex-row items-center self-start"
          style={({ hovered }: any) => [{ gap: 6, paddingVertical: 6, marginBottom: 4, opacity: 0.75, cursor: 'pointer', transitionDuration: '160ms' }, hovered && { opacity: 1 }]}
        >
          <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
          <Text className="text-muted" style={{ fontFamily: 'DMSans_500Medium', fontSize: 13 }}>Back</Text>
        </Pressable>
        {Body}
      </AuthShell>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14, paddingBottom: 60 }}>
        <Pressable onPress={goBackInternal} className="items-center justify-center" style={{ width: 40, height: 40, marginBottom: 8 }}>
          <ArrowLeft size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>
        {Body}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    <View className="flex-row justify-center" style={{ gap: 8, marginBottom: 16 }}>
      {value.map((d, i) => (
        <RNTextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          value={d}
          onChangeText={(c) => setDigit(i, c)}
          onKeyPress={(e) => handleKey(i, (e.nativeEvent as any).key)}
          keyboardType="number-pad"
          maxLength={1}
          className="font-body-bold text-text text-center"
          style={[{ width: 46, height: 56, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.05)', fontSize: 22, borderColor, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }]}
          testID={`twofa-otp-${i}`}
        />
      ))}
    </View>
  );
}

function FakeQR() {
  const onCells = new Set([
    0,1,2,3,4,5,6,9,15,18,24,30,27,28,29,30,31,32,33,36,42,45,46,47,48,49,50,51,
    54,60,63,69,72,73,74,75,76,77,78,40,41,55,56,57,38,44,64,65,67,68,
  ]);
  return (
    <View className="flex-row flex-wrap" style={{ width: '100%', height: '100%' }}>
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
