import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock, Check, Eye, EyeOff } from 'lucide-react-native';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, PasswordRules } from '@/src/views/auth/AuthControls';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth, passwordStrength } from '@/src/lib/authAnalytics';

import { getBaseUrl } from '@/src/lib/env';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const submittingRef = useRef(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const maskEmail = (e: string) => {
    const parts = e.split('@');
    if (parts.length !== 2) return e;
    const [n, d] = parts;
    return n.length > 2 ? `${n.substring(0, 2)}${'*'.repeat(n.length - 2)}@${d}` : e;
  };

  const strength = passwordStrength(pwd);
  const BASE = getBaseUrl();

  const onSendOtp = async () => {
    setError('');
    if (!email || !email.includes('@')) { setError('Enter a valid email'); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    trackAuth({ event: 'forgot_password_request', email });
    
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Failed to send OTP');
      trackAuth({ event: 'otp_sent', email });
      setOtpError(false);
      setResendTimer(60);
      setStep(2);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    setError(''); setOtpError(false);
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter all 6 digits'); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    
    try {
      const res = await fetch(`${BASE}/api/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail: string = data.detail || 'Invalid OTP';
        if (detail.toLowerCase().includes('expired')) {
          setError('Verification code has expired. Please request a new code.');
        } else {
          setError('Incorrect code — please try again.');
        }
        setOtpError(true);
        return;
      }
      trackAuth({ event: 'otp_verified', email, success: true });
      setStep(3);
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
      setOtpError(true);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const onResetPwd = async () => {
    setError('');
    if (strength.score < 2) { setError('Pick a stronger password'); return; }
    if (pwd !== pwd2) { setError('Passwords don\u2019t match'); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    trackAuth({ event: 'password_strength_check', password_for_strength: pwd });
    
    try {
      const code = otp.join('');
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code, new_password: pwd })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to reset password');
      }
      trackAuth({ event: 'reset_password_complete', email });
      setStep(4);
    } catch (e: any) {
      setError(e.message || 'Failed to reset password');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Pressable onPress={() => (step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3))} className="flex-row items-center self-start" style={{ gap: 6, marginBottom: 14, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }} testID={step === 1 ? "forgot-back" : "otp-back"}>
        <ArrowLeft size={16} color={AC.muted} />
        <Text style={{ color: AC.muted, fontFamily: FONTS.med, fontSize: 13 }}>Back</Text>
      </Pressable>

      <View className="flex-row items-center" style={{ gap: 8, marginBottom: 22 }}>
        {[1, 2, 3].map((n) => (
          <View key={n} className="items-center justify-center rounded-full" style={[{ width: 26, height: 26, borderWidth: 1, borderColor: AC.border, backgroundColor: AC.card }, step >= (n as 1 | 2 | 3) && { borderColor: AC.primary, backgroundColor: AC.primary }]}>
            {step > (n as 1 | 2 | 3) ? <Check size={12} color="#fff" strokeWidth={3} /> : <Text className="font-body-bold" style={{ color: step >= (n as 1 | 2 | 3) ? '#fff' : AC.muted, fontSize: 12 }}>{n}</Text>}
          </View>
        ))}
      </View>

      {step === 1 && (
        <>
          <Text className="text-text font-display-bold" style={{ letterSpacing: -0.5, marginBottom: 8, fontSize: 28 }}>Forgot password?</Text>
          <Text className="text-muted" style={{ fontFamily: FONTS.med, fontSize: 14, lineHeight: 22 }}>Enter the email associated with your account and we'll send a verification code.</Text>
          <View style={{ marginTop: 22, gap: 14 }}>
            <AuthInput label="Email" value={email} onChangeText={(t) => { setEmail(t); setError(''); }} placeholder="you@university.edu" keyboardType="email-address" error={error} onSubmitEditing={onSendOtp} autoFocus={true} editable={!loading} testID="forgot-email" />
            <PrimaryButton label="Send verification code" onPress={onSendOtp} loading={loading} testID="forgot-send-code" />
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Text className="text-text font-display-bold" style={{ letterSpacing: -0.5, marginBottom: 8, fontSize: 28 }}>Check your email</Text>
          <Text className="text-muted" style={{ fontFamily: FONTS.med, fontSize: 14, lineHeight: 22 }}>We sent a 6-digit code to <Text className="text-text">{maskEmail(email)}</Text></Text>
          <View style={{ marginTop: 24 }}>
            <View className="flex-row" style={{ gap: 10, justifyContent: 'space-between' }}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { otpRefs.current[i] = r; }}
                  value={d}
                  autoFocus={i === 0}
                  onChangeText={(t) => {
                    if (t.length > 1) {
                      const digits = t.replace(/\D/g, '').slice(0, 6).split('');
                      const nx = [...otp];
                      for (let j = 0; j < digits.length; j++) {
                        if (i + j < 6) nx[i + j] = digits[j];
                      }
                      setOtp(nx);
                      if (otpError) setOtpError(false);
                      if (error) setError('');
                      const nextIdx = Math.min(i + digits.length, 5);
                      otpRefs.current[nextIdx]?.focus();
                      return;
                    }
                    const nx = [...otp];
                    nx[i] = t;
                    setOtp(nx);
                    if (otpError) setOtpError(false);
                    if (error) setError('');
                    if (t && i < 5) otpRefs.current[i + 1]?.focus();
                  }}
                  onKeyPress={(e: any) => {
                    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
                      otpRefs.current[i - 1]?.focus();
                      const nx = [...otp];
                      nx[i - 1] = '';
                      setOtp(nx);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  className="font-display-bold text-text items-center justify-center"
                  style={[
                    { width: 50, height: 56, borderRadius: 12, backgroundColor: AC.card, borderColor: AC.border, borderWidth: 1, fontSize: 22, textAlign: 'center', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
                    d && { borderColor: AC.primary, backgroundColor: 'rgba(124,58,237,0.10)' },
                    otpError && { borderColor: AC.red, backgroundColor: 'rgba(239,68,68,0.08)' },
                  ]}
                  editable={!loading}
                  testID={`otp-input-${i + 1}`}
                  accessible={true}
                  accessibilityLabel={`Digit ${i + 1} of OTP`}
                />
              ))}
            </View>
            {error ? <Text className="font-body-bold" style={{ color: AC.red, fontSize: 12, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}
            <View style={{ marginTop: 22, gap: 12 }}>
              <PrimaryButton label="Verify code" onPress={onVerifyOtp} loading={loading} testID="otp-verify" />
              <Pressable onPress={(loading || resendTimer > 0) ? undefined : onSendOtp} disabled={loading || resendTimer > 0} testID="otp-resend">
                <Text className="text-muted text-sm text-center" style={{ opacity: (loading || resendTimer > 0) ? 0.4 : 1 }}>
                  Didn't receive code? <Text className="font-body-bold" style={{ color: AC.primaryL }}>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {step === 3 && (
        <>
          <Text className="text-text font-display-bold" style={{ letterSpacing: -0.5, marginBottom: 8, fontSize: 28 }}>Set new password</Text>
          <Text className="text-muted" style={{ fontFamily: FONTS.med, fontSize: 14, lineHeight: 22 }}>Choose a strong password you don't use anywhere else.</Text>
          <View style={{ marginTop: 22, gap: 14 }}>
            <AuthInput 
              label="New password" 
              value={pwd} 
              onChangeText={(t) => { setPwd(t); setError(''); }} 
              placeholder="At least 8 characters" 
              secureTextEntry={!showPwd} 
              autoFocus={true} 
              editable={!loading}
              testID="reset-password" 
              rightSlot={
                <Pressable onPress={() => setShowPwd((v) => !v)} style={{ paddingHorizontal: 6 }} testID="reset-show-password" accessible={true} accessibilityRole="button" accessibilityLabel={showPwd ? "Hide password" : "Show password"}>
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
              secureTextEntry={!showPwd2} 
              error={error} 
              editable={!loading}
              testID="reset-confirm-password" 
              rightSlot={
                <Pressable onPress={() => setShowPwd2((v) => !v)} style={{ paddingHorizontal: 6 }} testID="reset-show-confirm-password" accessible={true} accessibilityRole="button" accessibilityLabel={showPwd2 ? "Hide password" : "Show password"}>
                  {showPwd2 ? <EyeOff size={16} color={AC.muted} /> : <Eye size={16} color={AC.muted} />}
                </Pressable>
              }
            />
            {pwd.length > 0 && pwd2.length > 0 && (
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Check size={14} color={pwd === pwd2 ? AC.green : AC.dim} />
                <Text style={{ color: pwd === pwd2 ? AC.green : AC.dim, fontFamily: FONTS.med, fontSize: 12 }}>
                  {pwd === pwd2 ? 'Passwords match' : 'Passwords do not match yet'}
                </Text>
              </View>
            )}
            <PrimaryButton label="Reset password" onPress={onResetPwd} loading={loading} testID="reset-submit" />
          </View>
        </>
      )}

      {step === 4 && (
        <>
          <View className="items-center justify-center rounded-full" style={{ alignSelf: 'center', width: 84, height: 84, backgroundColor: AC.green, marginBottom: 22 }}><Check size={36} color="#fff" strokeWidth={3} /></View>
          <Text className="text-text font-display-bold" style={{ letterSpacing: -0.5, marginBottom: 8, fontSize: 28, textAlign: 'center' }}>Password reset!</Text>
          <Text className="text-muted" style={{ fontFamily: FONTS.med, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>Your password has been updated. Sign in to continue.</Text>
          <View style={{ marginTop: 26 }}>
            <PrimaryButton label="Back to sign in" onPress={() => router.replace('/(auth)/login')} testID="reset-success-signin" />
          </View>
        </>
      )}
    </AuthShell>
  );
}
