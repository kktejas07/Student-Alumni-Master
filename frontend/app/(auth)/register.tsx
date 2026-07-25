import { getBaseUrl } from '@/src/lib/env';
/**
 * Register — New design with role context, password strength, and analytics.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthShell } from '@/src/views/auth/AuthShell';
import { AuthInput, PrimaryButton, PasswordRules } from '@/src/views/auth/AuthControls';
import { ROLE_META, RoleCards, type Role } from '@/src/views/auth/RoleCards';
import { AC, FONTS } from '@/src/views/auth/tokens';
import { trackAuth, passwordStrength } from '@/src/lib/authAnalytics';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { PhoneInput } from '@/src/views/web/PhoneInput';
import { DateOfBirthPicker, isDobValid } from '@/src/views/web/DateOfBirthPicker';

const BASE = getBaseUrl();

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: Role; email?: string }>();
  const initialRole: Role = (params.role as Role) || 'student';
  const initialEmail: string = (params.email as string) || '';
  const [role, setRole] = useState<Role>(initialRole);
  const [showPicker, setShowPicker] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('IN');
  const [dob, setDob] = useState('');  // ISO 8601 YYYY-MM-DD
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  // Guard against double-submit within the same animation frame
  const submittingRef = useRef(false);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const pwdRef = useRef<TextInput>(null);

  // Min age varies by role: students 13+, others 18+
  const minAge = role === 'student' ? 13 : 18;

  const strength = passwordStrength(pwd);

  useEffect(() => {
    AsyncStorage.getItem('sa_chosen_role').then((r) => {
      if (r) setRole(r as Role);
    });
  }, []);

  const onPwdBlur = () => {
    if (pwd) trackAuth({ event: 'password_strength_check', password_for_strength: pwd });
  };

  const onSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'Enter your first name';
    if (!lastName.trim())  errs.lastName  = 'Enter your last name';
    if (!email || !email.includes('@')) errs.email = 'Enter a valid email';
    // Phone — required, basic length
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 6) errs.phone = 'Enter a valid phone number';
    // DOB — mandatory + role-aware min age
    const dobCheck = isDobValid(dob, minAge);
    if (!dobCheck.ok) errs.dob = dobCheck.message || 'Date of birth required';
    if (strength.checks.some(c => !c.met)) errs.pwd = 'Password does not meet all requirements';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Prevent double-submit within same animation frame
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    trackAuth({ event: 'register_attempt', email, role });
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: pwd,
          full_name: fullName,
          role,
          phone,
          dob,
          country_code: phoneCountry,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = err.detail;
        const reason = Array.isArray(raw)
          ? raw.map((e: any) => e?.msg || e?.message || '').filter(Boolean).join(', ') || 'Could not register'
          : typeof raw === 'string' ? raw
          : typeof raw === 'object' && raw !== null ? (raw.msg || raw.message || 'Could not register')
          : 'Could not register';
        trackAuth({ event: 'register_failure', email, reason });
        // Map server error to the right field
        const reasonLower = reason.toLowerCase();
        if (reasonLower.includes('password')) {
          setErrors({ pwd: reason });
        } else if (reasonLower.includes('email')) {
          setErrors({ email: reason });
        } else if (reasonLower.includes('phone')) {
          setErrors({ phone: reason });
        } else if (reasonLower.includes('name') || reasonLower.includes('full')) {
          setErrors({ firstName: reason });
        } else if (reasonLower.includes('dob') || reasonLower.includes('birth') || reasonLower.includes('age')) {
          setErrors({ dob: reason });
        } else {
          setErrors({ email: reason });
        }
        // Stop loading immediately — do not rely on finally to avoid batching delays
        setLoading(false);
        submittingRef.current = false;
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setTokens(data.access_token, data.refresh_token);
      trackAuth({ event: 'register_success', email, role });
      // Per spec — offer Referral Code step before Onboarding. User can skip.
      router.replace('/(auth)/referral-code');
    } catch (e: any) {
      trackAuth({ event: 'register_failure', email, reason: e?.message || 'Network error' });
      setErrors({ email: 'Network error — try again' });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthShell role={role}>
      <Pressable onPress={() => router.back()} style={s.back}>
        <ArrowLeft size={16} color="#6B7280" />
        <Text style={s.backText}>Back</Text>
      </Pressable>

      {showPicker ? (
        <>
          <Text style={s.title}>Choose your role</Text>
          <Text style={s.sub}>You can change this later in settings.</Text>
          <View style={{ height: 16 }} />
          <RoleCards value={role} onChange={(r) => { setRole(r); trackAuth({ event: 'role_selected', role: r }); setShowPicker(false); }} />
        </>
      ) : (
        <>
          <View style={s.head}>
            <Pressable onPress={() => setShowPicker(true)} style={s.roleStripe} testID="register-role-selector" accessible={true} accessibilityRole="button" accessibilityLabel="Change role">
              <Text style={s.roleEmoji}>{ROLE_META[role].emoji}</Text>
              <Text style={s.roleText}>Joining as {ROLE_META[role].label}</Text>
              <Text style={[s.roleText, { color: '#6B7280', fontSize: 11 }]}> · change</Text>
            </Pressable>
            <Text style={s.title}>Create your account</Text>
            <Text style={s.sub}>Set up your Student Alumni profile in 30 seconds</Text>
          </View>

          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AuthInput label="First name" value={firstName} onChangeText={(t) => { setFirstName(t); setErrors((p) => ({ ...p, firstName: '' })); }} placeholder="e.g. Aryan" autoCapitalize="words" error={errors.firstName} autoFocus={true} editable={!loading} onSubmitEditing={() => lastNameRef.current?.focus()} blurOnSubmit={false} testID="register-first-name" />
              </View>
              <View style={{ flex: 1 }}>
                <AuthInput ref={lastNameRef} label="Last name" value={lastName} onChangeText={(t) => { setLastName(t); setErrors((p) => ({ ...p, lastName: '' })); }} placeholder="e.g. Kapoor" autoCapitalize="words" error={errors.lastName} editable={!loading} onSubmitEditing={() => emailRef.current?.focus()} blurOnSubmit={false} testID="register-last-name" />
              </View>
            </View>
            <AuthInput ref={emailRef} label="Email" value={email} onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: '' })); }} placeholder="you@university.edu" keyboardType="email-address" error={errors.email} editable={!loading} onSubmitEditing={() => phoneRef.current?.focus()} blurOnSubmit={false} testID="register-email" />

            {/* Personal Information — phone (with country code) + DOB (mandatory) */}
            <View style={{ zIndex: 10, position: 'relative' }}>
              <Text style={s.fieldLabel}>Phone Number<Text style={{ color: '#EF4444' }}> *</Text></Text>
              <PhoneInput
                ref={phoneRef}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setErrors((p) => ({ ...p, phone: '' }));
                  // Capture country dial code for the registration payload.
                  const m = v.match(/^\+(\d+)/);
                  if (m) {
                    // Map dial code → ISO 2-letter for postal validation context.
                    const dial = '+' + m[1];
                    const dialMap: Record<string, string> = {
                      '+91': 'IN', '+1': 'US', '+44': 'GB', '+61': 'AU',
                      '+971': 'AE', '+65': 'SG', '+49': 'DE', '+33': 'FR',
                    };
                    if (dialMap[dial]) setPhoneCountry(dialMap[dial]);
                  }
                }}
                placeholder="98765 43210"
                onSubmitEditing={() => pwdRef.current?.focus()}
                blurOnSubmit={false}
                testID="register-phone"
              />
              {errors.phone ? <Text style={s.fieldErr}>{errors.phone}</Text> : null}
            </View>

            <DateOfBirthPicker
              value={dob}
              onChange={(iso) => { setDob(iso); setErrors((p) => ({ ...p, dob: '' })); }}
              minAge={minAge}
              required
              helper={`You must be at least ${minAge} years old to register as a ${ROLE_META[role].label.toLowerCase()}.`}
            />
            {errors.dob ? <Text style={s.fieldErr}>{errors.dob}</Text> : null}

            <AuthInput
              ref={pwdRef}
              label="Password"
              value={pwd}
              onChangeText={(t) => { setPwd(t); setErrors((p) => ({ ...p, pwd: '' })); }}
              placeholder="Min 8 characters"
              secureTextEntry={!showPwd}
              error={errors.pwd}
              editable={!loading}
              testID="register-password"
              rightSlot={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pressable onPress={() => setShowPwd((v) => !v)} style={{ paddingHorizontal: 6 }} testID="register-show-password" accessible={true} accessibilityRole="button" accessibilityLabel={showPwd ? "Hide password" : "Show password"}>
                    {showPwd ? <EyeOff size={16} color="#6B7280" /> : <Eye size={16} color="#6B7280" />}
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      // Generate a strong 14-char password with a mix of upper, lower, digits, symbols.
                      const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
                      const L = 'abcdefghjkmnpqrstuvwxyz';
                      const D = '23456789';
                      const S = '!@#$%^&*';
                      const all = U + L + D + S;
                      const r = (s: string) => s[Math.floor(Math.random() * s.length)];
                      let p = r(U) + r(L) + r(D) + r(S);
                      while (p.length < 14) p += r(all);
                      // shuffle
                      p = p.split('').sort(() => Math.random() - 0.5).join('');
                      setPwd(p); setShowPwd(true); setErrors((e) => ({ ...e, pwd: '' }));
                    }}
                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(124,58,237,0.28)' }}
                    testID="register-generate-password"
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Generate strong password"
                  >
                    <Text style={{ color: '#FFF', fontFamily: 'DMSans_700Bold', fontSize: 11 }}>Generate</Text>
                  </Pressable>
                </View>
              }
              onSubmitEditing={() => onSubmit()}
            />
            {pwd.length > 0 && <PasswordRules checks={strength.checks} />}
          </View>

          <View style={{ height: 18 }} />
          <PrimaryButton label="Create account" onPress={onSubmit} loading={loading} testID="register-submit" />

          <Text style={s.terms}>
            By creating an account you agree to our{' '}
            <Text style={s.link}>Terms</Text> & <Text style={s.link}>Privacy Policy</Text>
          </Text>

          <Text style={s.signin}>
            Have an account?{' '}
            <Text style={s.signinLink} onPress={() => router.replace('/(auth)/login')} testID="register-signin-link">Sign in</Text>
          </Text>
        </>
      )}
    </AuthShell>
  );
}

const s = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 14, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  backText: { color: '#374151', fontFamily: FONTS.med, fontSize: 13 },

  head: { marginBottom: 22 },
  roleStripe: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.10)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)', marginBottom: 18, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  roleEmoji: { fontSize: 14 },
  roleText: { color: '#7C3AED', fontFamily: FONTS.bold, fontSize: 12 },

  title: { color: '#111827', fontFamily: FONTS.xbold, fontSize: 30, letterSpacing: -0.6, marginBottom: 6 },
  sub: { color: '#6B7280', fontFamily: FONTS.med, fontSize: 15 },

  terms: { textAlign: 'center', color: '#9CA3AF', fontFamily: FONTS.med, fontSize: 12, marginTop: 14, lineHeight: 18 },
  link: { color: '#6B7280', ...(Platform.OS === 'web' ? ({ textDecorationLine: 'underline', cursor: 'pointer' } as any) : {}) },

  signin: { textAlign: 'center', color: '#6B7280', fontFamily: FONTS.med, fontSize: 13, marginTop: 18 },
  signinLink: { color: '#7C3AED', fontFamily: FONTS.bold, ...(Platform.OS === 'web' ? ({ textDecorationLine: 'underline', cursor: 'pointer' } as any) : {}) },

  fieldLabel: { color: '#374151', fontFamily: FONTS.bold, fontSize: 13, marginBottom: 8 },
  fieldErr: { color: '#EF4444', fontFamily: FONTS.med, fontSize: 12, marginTop: -8, marginBottom: 6 },
});
