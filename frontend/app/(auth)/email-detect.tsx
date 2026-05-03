/**
 * Smart Email Detect — per HTML spec (Welcome / Option B flow).
 *
 * Flow:
 *   1. User enters email + clicks Continue
 *   2. Frontend calls POST /api/auth/check-email
 *      - exists=true  → navigate to /(auth)/login  with ?email=... (password step)
 *      - exists=false → navigate to /get-started with ?email=... (role picker → register)
 *   3. Social shortcuts: LinkedIn / Google / "Sign in with Email OTP"
 *   4. Footer: "← Change role" returns to /get-started
 *
 * Reuses AuthShell + AuthControls + ROLE_META tokens for consistency with the
 * rest of the auth flow. No backend schema changes other than /auth/check-email.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, G } from 'react-native-svg';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, OutlineButton } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth } from '@/src/lib/authAnalytics';
import { ROLE_META, type Role } from '@/src/views/auth/RoleCards';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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
      <G><Path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 11-.01-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0z" /></G>
    </Svg>
  );
}

export default function EmailDetect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: Role; email?: string }>();
  const role: Role | undefined = params.role as Role;

  const [email, setEmail] = useState(params.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onContinue = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    trackAuth({ event: 'email_check', email: trimmed });
    try {
      const res = await fetch(`${BASE}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Pydantic 422 returns `detail` as an array of error objects
        // [{type, loc, msg, input, ctx}, ...]. Convert to a readable string.
        const raw = data?.detail;
        const msg = Array.isArray(raw)
          ? raw.map((e: any) => e?.msg || e?.message || JSON.stringify(e)).filter(Boolean).join(', ')
          : typeof raw === 'string'
            ? raw
            : typeof raw === 'object' && raw !== null
              ? (raw.msg || raw.message || JSON.stringify(raw))
              : 'Could not check email. Please try again.';
        setError(msg);
        setLoading(false);
        return;
      }
      if (data.exists) {
        // Existing account — go to Login with email prefilled + role branding
        router.replace({
          pathname: '/(auth)/login',
          params: { email: trimmed, role: data.role || role },
        });
      } else {
        // New account — route through Get Started (pick role if not chosen) → Register
        if (role) {
          router.replace({
            pathname: '/(auth)/register',
            params: { email: trimmed, role },
          });
        } else {
          router.replace({ pathname: '/get-started', params: { email: trimmed } });
        }
      }
    } catch (e: any) {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onOtpSignin = () => {
    // Dedicated Email OTP screen per spec
    router.push({ pathname: '/(auth)/email-otp', params: { email } });
  };

  const onOAuth = (provider: 'google' | 'linkedin') => {
    trackAuth({ event: 'oauth_attempt', role, extra: { provider } });
    // NOTE: OAuth client IDs must be configured before production. For now this
    // is a placeholder; provider selection is captured in analytics.
    setError(`${provider === 'google' ? 'Google' : 'LinkedIn'} sign-in is coming soon.`);
  };

  return (
    <AuthShell role={role}>
      <Pressable onPress={() => router.back()} style={s.back}>
        <ArrowLeft size={16} color={AC.muted} />
        <Text style={s.backText}>Back</Text>
      </Pressable>

      <View style={s.head}>
        {role && (
          <View style={s.roleStripe}>
            <Text style={s.roleEmoji}>{ROLE_META[role].emoji}</Text>
            <Text style={s.roleText}>Continuing as {ROLE_META[role].label}</Text>
          </View>
        )}
        <Text style={s.title}>Welcome</Text>
        <Text style={s.sub}>Enter your email — we'll detect if you have an account.</Text>
      </View>

      <View style={{ gap: 14 }}>
        <AuthInput
          label="Email address"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          placeholder="you@college.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          error={error}
          onSubmitEditing={onContinue}
        />
        <PrimaryButton label="Continue" onPress={onContinue} loading={loading} />
      </View>

      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.dividerText}>or sign in with</Text>
        <View style={s.line} />
      </View>

      <View style={s.oauthRow}>
        <View style={{ flex: 1 }}>
          <OutlineButton label="LinkedIn" icon={<LinkedInIn size={16} />} onPress={() => onOAuth('linkedin')} />
        </View>
        <View style={{ flex: 1 }}>
          <OutlineButton label="Google" icon={<GoogleG size={16} />} onPress={() => onOAuth('google')} />
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <OutlineButton label="Sign in with Email OTP" icon={<Mail size={16} color={AC.muted} />} onPress={onOtpSignin} />
      </View>

      <View style={s.footerRow}>
        <Pressable onPress={() => router.replace('/get-started')}>
          <Text style={s.changeRole}>← Change role</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { color: AC.muted, fontFamily: FONTS.med, fontSize: 13 },
  head: { marginBottom: 16 },
  roleStripe: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.14)',
    borderColor: 'rgba(124,58,237,0.38)', borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    marginBottom: 12,
  },
  roleEmoji: { fontSize: 14 },
  roleText: { color: '#E9D5FF', fontFamily: FONTS.med, fontSize: 12 },
  title: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 28, marginBottom: 6 },
  sub: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  dividerText: { color: AC.muted, fontFamily: FONTS.med, fontSize: 11.5, letterSpacing: 0.4 },
  oauthRow: { flexDirection: 'row', gap: 10 },
  footerRow: { marginTop: 24, alignItems: 'center' },
  changeRole: { color: '#B07FDF', fontFamily: FONTS.med, fontSize: 13 },
});
