/**
 * Forgot Password — 3-step flow inside one screen.
 *  Step 1: Enter email
 *  Step 2: Enter OTP (mocked / would come via email)
 *  Step 3: Set new password
 */
import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock, Check, Eye, EyeOff } from 'lucide-react-native';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, PasswordRules } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth, passwordStrength } from '@/src/lib/authAnalytics';
import { BASE } from '@/src/lib/env';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const strength = passwordStrength(pwd);
  const getErrorMsg = (data: any, fallback: string) => Array.isArray(data?.detail) ? data.detail[0]?.msg || fallback : data?.detail || fallback;

  const onSendOtp = async () => {
    setError('');
    if (!email || !email.includes('@')) { setError('Enter a valid email'); return; }
    setLoading(true);
    trackAuth({ event: 'forgot_password_request', email });
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(getErrorMsg(data, 'Failed to send reset email'));
      }
      trackAuth({ event: 'otp_sent', email });
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6 || !/^\d{6}$/.test(code)) { setError('Enter a valid 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(getErrorMsg(data, 'Invalid or expired code'));
      }
      trackAuth({ event: 'otp_verified', email, success: true });
      setStep(3);
    } catch (err: any) {
      setError(err.message);
      trackAuth({ event: 'otp_verified', email, success: false });
    } finally {
      setLoading(false);
    }
  };

  const onResetPwd = async () => {
    setError('');
    if (pwd.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(pwd)) { setError('Password must contain an uppercase letter'); return; }
    if (!/[a-z]/.test(pwd)) { setError('Password must contain a lowercase letter'); return; }
    if (!/\d/.test(pwd)) { setError('Password must contain a digit'); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) { setError('Password must contain a special character'); return; }
    if (pwd !== pwd2) { setError('Passwords don\u2019t match'); return; }
    setLoading(true);
    trackAuth({ event: 'password_strength_check', strength_score: strength.score });
    
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.join(''), new_password: pwd })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(getErrorMsg(data, 'Failed to reset password'));
      }
      trackAuth({ event: 'reset_password_complete', email });
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {step < 4 && (
        <>
          <Pressable onPress={() => { setError(''); step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3); }} style={s.back}>
            <ArrowLeft size={16} color={AC.muted} />
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <View style={s.steps}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={[s.step, step >= (n as 1 | 2 | 3) && s.stepOn]}>
                {step > (n as 1 | 2 | 3) ? <Check size={12} color="#fff" strokeWidth={3} /> : <Text style={[s.stepNum, step >= (n as 1 | 2 | 3) && s.stepNumOn]}>{n}</Text>}
              </View>
            ))}
          </View>
        </>
      )}

      {step === 1 && (
        <>
          <Text style={s.title}>Forgot password?</Text>
          <Text style={s.sub}>Enter the email associated with your account and we'll send a verification code.</Text>
          <View style={{ marginTop: 22, gap: 14 }}>
            <AuthInput label="Email" value={email} onChangeText={(t) => { setEmail(t); setError(''); }} placeholder="you@university.edu" keyboardType="email-address" error={error} onSubmitEditing={onSendOtp} />
            <PrimaryButton label="Send verification code" onPress={onSendOtp} loading={loading} />
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.sub}>We sent a 6-digit code to <Text style={{ color: '#fff' }}>{email}</Text></Text>
          <View style={{ marginTop: 24 }}>
            <View style={s.otpRow}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  value={d}
                  onChangeText={(t) => {
                    if (t.length > 1) {
                      const pasted = t.replace(/[^0-9]/g, '').slice(0, 6).split('');
                      const nx = [...otp];
                      pasted.forEach((char, idx) => {
                        if (i + idx < 6) nx[i + idx] = char;
                      });
                      setOtp(nx);
                      const nextIndex = Math.min(i + pasted.length, 5);
                      otpRefs.current[nextIndex]?.focus();
                      return;
                    }
                    const nx = [...otp];
                    const char = t.slice(-1);
                    if (char && !/^\d$/.test(char)) return;
                    nx[i] = char;
                    setOtp(nx);
                    if (char && i < 5) otpRefs.current[i + 1]?.focus();
                  }}
                  onKeyPress={(e: any) => {
                    if (e.nativeEvent.key === 'Backspace' && !d && i > 0) {
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  style={[s.otpBox, d ? s.otpBoxOn : null]}
                />
              ))}
            </View>
            {error ? <Text style={s.errText}>{error}</Text> : null}
            <View style={{ marginTop: 22, gap: 12 }}>
              <PrimaryButton label="Verify code" onPress={onVerifyOtp} loading={loading} />
              <Pressable onPress={onSendOtp}>
                <Text style={s.resend}>Didn’t receive code? <Text style={s.resendLink}>Resend</Text></Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Text style={s.title}>Set new password</Text>
          <Text style={s.sub}>Choose a strong password you don't use anywhere else.</Text>
          <View style={{ marginTop: 22, gap: 14 }}>
            <AuthInput 
              label="New password" 
              value={pwd} 
              onChangeText={(t) => { setPwd(t); setError(''); }} 
              placeholder="At least 8 characters" 
              secureTextEntry={!showPwd}
              rightSlot={
                <Pressable onPress={() => setShowPwd((v) => !v)} style={{ paddingHorizontal: 6 }}>
                  {showPwd ? <EyeOff size={16} color={AC.muted} /> : <Eye size={16} color={AC.muted} />}
                </Pressable>
              }
            />
            {pwd.length > 0 && <PasswordRules checks={strength.checks} />}
            <AuthInput 
              label="Confirm password" 
              value={pwd2} 
              onChangeText={(t) => { setPwd2(t); setError(''); }} 
              placeholder="Re-enter password" 
              secureTextEntry={!showPwd} 
              error={error}
              rightSlot={
                <Pressable onPress={() => setShowPwd((v) => !v)} style={{ paddingHorizontal: 6 }}>
                  {showPwd ? <EyeOff size={16} color={AC.muted} /> : <Eye size={16} color={AC.muted} />}
                </Pressable>
              }
            />
            <PrimaryButton label="Reset password" onPress={onResetPwd} loading={loading} />
          </View>
        </>
      )}

      {step === 4 && (
        <>
          <View style={s.successCircle}><Check size={36} color="#fff" strokeWidth={3} /></View>
          <Text style={[s.title, { textAlign: 'center' }]}>Password reset!</Text>
          <Text style={[s.sub, { textAlign: 'center' }]}>Your password has been updated. Sign in to continue.</Text>
          <View style={{ marginTop: 26 }}>
            <PrimaryButton label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </>
      )}
    </AuthShell>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 14, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  backText: { color: AC.muted, fontFamily: FONTS.med, fontSize: 13 },

  steps: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
  step: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: AC.border, backgroundColor: AC.card, alignItems: 'center', justifyContent: 'center' },
  stepOn: { borderColor: AC.primary, backgroundColor: AC.primary },
  stepNum: { color: AC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  stepNumOn: { color: '#fff' },

  title: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 28, letterSpacing: -0.5, marginBottom: 8 },
  sub: { color: AC.muted, fontFamily: FONTS.med, fontSize: 14, lineHeight: 22 },

  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  otpBox: { width: 50, height: 56, borderRadius: 12, backgroundColor: AC.card, borderColor: AC.border, borderWidth: 1, color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, textAlign: 'center', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  otpBoxOn: { borderColor: AC.primary, backgroundColor: 'rgba(124,58,237,0.10)' },
  errText: { color: AC.red, fontFamily: FONTS.bold, fontSize: 12, marginTop: 10, textAlign: 'center' },
  resend: { color: AC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center' },
  resendLink: { color: AC.primaryL, fontFamily: FONTS.bold, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },

  successCircle: { alignSelf: 'center', width: 84, height: 84, borderRadius: 42, backgroundColor: AC.green, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
});
