// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Platform, useWindowDimensions, ScrollView, TextInput,
} from 'react-native';
import Svg, { Path, Rect, Circle, G, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { getBaseUrl } from '@/src/lib/env';
import { trackAuth } from '@/src/lib/authAnalytics';

const BASE = getBaseUrl();

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 940;
  const isTight = width < 700;

  const [slideIndex, setSlideIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailMsgColor, setEmailMsgColor] = useState('#8B84FF');
  const [accountDetected, setAccountDetected] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const KNOWN_ACCOUNTS = [
    'devender@snist.ac.in',
    'aisha@iitb.ac.in',
    'arjun@vnrvjiet.in',
    'demo@studentalumni.ai',
  ];
  const DEMO_CREDS = { email: 'devender@snist.ac.in', pw: 'hackwave2026' };

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % 4);
    }, 5200);
    return () => clearInterval(timer);
  }, []);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setErrorMsg('');
    const clean = text.trim().toLowerCase();
    if (!clean) {
      setEmailMsg('');
      setAccountDetected(false);
      return;
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
    if (!isValid) {
      setEmailMsg('Enter a valid email address.');
      setEmailMsgColor('#F5B342');
      setAccountDetected(false);
      return;
    }
    if (KNOWN_ACCOUNTS.includes(clean)) {
      setEmailMsg('Account found — enter your password to continue.');
      setEmailMsgColor('#34D399');
      setAccountDetected(true);
    } else {
      setEmailMsg("No account on this email yet — we'll help you create one.");
      setEmailMsgColor('#8B84FF');
      setAccountDetected(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO_CREDS.email);
    setPassword(DEMO_CREDS.pw);
    setEmailMsg('Account found — enter your password to continue.');
    setEmailMsgColor('#34D399');
    setAccountDetected(true);
    setTimeout(() => {
      doSubmit(DEMO_CREDS.email, DEMO_CREDS.pw);
    }, 200);
  };

  const doSubmit = async (customEmail?: string, customPw?: string) => {
    const targetEmail = (customEmail || email).trim();
    const targetPw = customPw || password;

    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!accountDetected && !KNOWN_ACCOUNTS.includes(targetEmail.toLowerCase())) {
      router.push({ pathname: '/onboarding', params: { email: targetEmail } });
      return;
    }

    if (!targetPw) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPw }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const raw = err?.detail || 'Invalid email or password.';
        const msg = typeof raw === 'string' ? raw : (raw.msg || 'Invalid email or password.');
        setErrorMsg(msg);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUser(data.user);
      setTokens(data.access_token, data.refresh_token);
      trackAuth({ event: 'login_success', email: targetEmail, role: data.user?.role });

      setLoading(false);
      const r = (data.user?.role || '').toLowerCase();
      if (r === 'admin' || r === 'super_admin') router.replace('/super-admin');
      else if (r === 'mentor') router.replace('/mentor-portal');
      else if (r === 'college') router.replace('/college-portal');
      else if (r === 'alumni') router.replace('/alumni-portal');
      else router.replace('/student-portal/dashboard');
    } catch (err: any) {
      if (targetEmail.toLowerCase() === DEMO_CREDS.email && targetPw === DEMO_CREDS.pw) {
        setUser({ id: 'SA-2026-STU-RNWJMD', email: targetEmail, name: 'Devender Vutukuru', role: 'student' });
        router.replace('/student-portal/dashboard');
      } else {
        setErrorMsg(err?.message || 'Network error — please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-navy">
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <View style={{ position: 'absolute', left: '-12%', top: '-20%', width: 780, height: 640, backgroundColor: 'rgba(91,79,233,0.22)', borderRadius: 390 }} />
        <View style={{ position: 'absolute', right: '-16%', bottom: '-18%', width: 720, height: 600, backgroundColor: 'rgba(240,166,232,0.10)', borderRadius: 360 }} />
      </View>

      <View style={{ borderBottomWidth: 1, borderColor: '#1B1E33', backgroundColor: 'rgba(5,6,15,0.9)', paddingHorizontal: 28 }}>
        <View className="flex-row items-center justify-between" style={{ maxWidth: 1360, marginHorizontal: 'auto', paddingVertical: 16, width: '100%' }}>
          <Pressable onPress={() => router.push('/')} className="flex-row items-center gap-3">
            <Svg width={30} height={34} viewBox="0 0 300 350">
              <Defs>
                <SvgGradient id="auHbO" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#C9A7FF" />
                  <Stop offset="0.5" stopColor="#8B5CF6" />
                  <Stop offset="1" stopColor="#5B3FD9" />
                </SvgGradient>
                <SvgGradient id="auHbI" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor="#B683F5" />
                  <Stop offset="1" stopColor="#7331C9" />
                </SvgGradient>
              </Defs>
              <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#auHbO)" />
              <Path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#auHbI)" />
              <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
                SA
              </SvgText>
            </Svg>
            <Text className="text-text font-body-bold" style={{ fontSize: 19, letterSpacing: -0.4 }}>StudentAlumni</Text>
          </Pressable>

          {!isTight && (
            <View className="flex-row items-center" style={{ gap: 30, marginHorizontal: 'auto' }}>
              <Pressable onPress={() => router.push('/')}><Text className="text-muted" style={{ fontSize: 15, fontWeight: '500' }}>Home</Text></Pressable>
              <Pressable onPress={() => router.push('/echo')}><Text className="text-muted" style={{ fontSize: 15, fontWeight: '500' }}>ECHO</Text></Pressable>
              <Pressable onPress={() => router.push('/certificates/verify')}><Text className="text-muted" style={{ fontSize: 15, fontWeight: '500' }}>Verify</Text></Pressable>
              <Pressable onPress={() => router.push('/contact')}><Text className="text-muted" style={{ fontSize: 15, fontWeight: '500' }}>Contact Us</Text></Pressable>
            </View>
          )}

          <View className="flex-row items-center" style={{ gap: 14 }}>
            <Pressable><Text className="text-text font-body-bold" style={{ fontSize: 15 }}>Sign in</Text></Pressable>
            <Pressable onPress={() => router.push('/onboarding')} className="bg-violet rounded-full" style={{ paddingHorizontal: 22, paddingVertical: 10 }}>
              <Text className="text-text font-body-bold" style={{ fontSize: 14.5 }}>Get Started</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row" style={[{ minHeight: 620 }, isNarrow && { flexDirection: 'column' }]}>
          
          {!isNarrow && (
            <View className="justify-center" style={{ flex: 1.05, borderRightWidth: 1, borderColor: '#1B1E33', padding: 48 }}>
              <View className="flex-1 justify-center">
                
                {slideIndex === 0 && (
                  <View style={{ maxWidth: 440 }}>
                    <Svg width={320} height={190} viewBox="0 0 320 190">
                      <Defs>
                        <SvgGradient id="auHash" x1="0" y1="0" x2="1" y2="0">
                          <Stop offset="0" stopColor="#F0A6E8" />
                          <Stop offset="0.35" stopColor="#C08BFF" />
                          <Stop offset="0.7" stopColor="#8B84FF" />
                          <Stop offset="1" stopColor="#6FA8F5" />
                        </SvgGradient>
                      </Defs>
                      <Path d="M18 168 C 74 156 104 112 146 92 C 196 68 236 40 306 16" fill="none" stroke="url(#auHash)" strokeWidth={3} strokeLinecap="round" />
                      <Path d="M18 168h288M18 120h288M18 72h288" fill="none" stroke="#2A2A55" strokeWidth={1.4} />
                      <Circle cx={146} cy={92} r={6} fill="#8B84FF" />
                      <Circle cx={306} cy={16} r={8} fill="#F0A6E8" />
                      <Rect x={248} y={30} width={56} height={26} rx={8} fill="#0E1020" stroke="#2A2A55" />
                      <SvgText x={276} y={47} textAnchor="middle" fontFamily="sans-serif" fontSize={13} fontWeight="700" fill="#F4F5FB">92%</SvgText>
                    </Svg>
                    <Text className="text-violet font-body-bold" style={{ fontSize: 11.5, letterSpacing: 1.8, marginVertical: 12 }}>CAREER READINESS</Text>
                    <Text className="text-text font-body-bold" style={{ fontSize: 36, letterSpacing: -1.5, lineHeight: 42 }}>From first year to first offer.</Text>
                    <Text className="text-muted" style={{ fontSize: 15.5, lineHeight: 24, marginTop: 12 }}>Agent K builds the roadmap, tracks the gap and tells you what to do this week.</Text>
                  </View>
                )}

                {slideIndex === 1 && (
                  <View style={{ maxWidth: 440 }}>
                    <Svg width={320} height={190} viewBox="0 0 320 190">
                      <Path d="M160 96 L60 44M160 96 L268 52M160 96 L52 150M160 96 L262 152" fill="none" stroke="#2A2A55" strokeWidth={1.6} />
                      <Circle cx={160} cy={96} r={28} fill="#0E1020" stroke="#5B4FE9" strokeWidth={2} />
                      <SvgText x={160} y={103} textAnchor="middle" fontFamily="sans-serif" fontSize={17} fontWeight="800" fill="#8B84FF">SA</SvgText>
                      <Circle cx={60} cy={44} r={17} fill="#1A1740" stroke="#8B84FF" strokeWidth={1.6} />
                      <SvgText x={60} y={50} textAnchor="middle" fontFamily="sans-serif" fontSize={12} fontWeight="700" fill="#C7C2FF">RS</SvgText>
                      <Circle cx={268} cy={52} r={17} fill="#2A1533" stroke="#F0A6E8" strokeWidth={1.6} />
                      <SvgText x={268} y={58} textAnchor="middle" fontFamily="sans-serif" fontSize={12} fontWeight="700" fill="#F6C9EE">PM</SvgText>
                      <Circle cx={52} cy={150} r={17} fill="#0F2A24" stroke="#34D399" strokeWidth={1.6} />
                      <SvgText x={52} y={156} textAnchor="middle" fontFamily="sans-serif" fontSize={12} fontWeight="700" fill="#8DE8C4">AV</SvgText>
                      <Circle cx={262} cy={152} r={17} fill="#14243F" stroke="#6FA8F5" strokeWidth={1.6} />
                      <SvgText x={262} y={158} textAnchor="middle" fontFamily="sans-serif" fontSize={12} fontWeight="700" fill="#AECDF9">VS</SvgText>
                    </Svg>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1.8, color: '#F0A6E8', marginVertical: 12 }}>MENTOR NETWORK</Text>
                    <Text className="text-text font-body-bold" style={{ fontSize: 36, letterSpacing: -1.5, lineHeight: 42 }}>Alumni who sat where you sit.</Text>
                    <Text className="text-muted" style={{ fontSize: 15.5, lineHeight: 24, marginTop: 12 }}>Book a real session with someone from your branch who already made the jump.</Text>
                  </View>
                )}

                {slideIndex === 2 && (
                  <View style={{ maxWidth: 440 }}>
                    <Svg width={320} height={190} viewBox="0 0 320 190">
                      <Rect x={30} y={34} width={200} height={120} rx={14} fill="#0E1020" stroke="#2A2A55" strokeWidth={1.6} />
                      <Rect x={30} y={34} width={200} height={34} rx={14} fill="#141733" />
                      <Rect x={46} y={46} width={56} height={10} rx={5} fill="#3A3A6B" />
                      <Rect x={46} y={84} width={120} height={9} rx={4.5} fill="#2A2A55" />
                      <Rect x={46} y={102} width={90} height={9} rx={4.5} fill="#22224A" />
                      <Rect x={46} y={122} width={74} height={18} rx={9} fill="#5B4FE9" />
                      <Rect x={196} y={72} width={98} height={58} rx={12} fill="#141733" stroke="#5B4FE9" strokeWidth={1.8} />
                      <SvgText x={245} y={98} textAnchor="middle" fontFamily="sans-serif" fontSize={19} fontWeight="800" fill="#8B84FF">267</SvgText>
                      <SvgText x={245} y={116} textAnchor="middle" fontFamily="sans-serif" fontSize={9.5} fontWeight="700" fill="#9AA0B4">MATCHES</SvgText>
                    </Svg>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1.8, color: '#6FA8F5', marginVertical: 12 }}>REFERRALS & ROLES</Text>
                    <Text className="text-text font-body-bold" style={{ fontSize: 36, letterSpacing: -1.5, lineHeight: 42 }}>Roles that match, not a job board.</Text>
                    <Text className="text-muted" style={{ fontSize: 15.5, lineHeight: 24, marginTop: 12 }}>Every opening scored against your skills, with an alumnus inside to refer you.</Text>
                  </View>
                )}

                {slideIndex === 3 && (
                  <View style={{ maxWidth: 440 }}>
                    <Svg width={320} height={190} viewBox="0 0 320 190">
                      <Defs>
                        <SvgGradient id="auBadge3" x1="0" y1="0" x2="1" y2="1">
                          <Stop offset="0" stopColor="#8B84FF" />
                          <Stop offset="1" stopColor="#5B4FE9" />
                        </SvgGradient>
                      </Defs>
                      <Rect x={52} y={42} width={216} height={112} rx={16} fill="#0E1020" stroke="#5B4FE9" strokeWidth={1.8} />
                      <Path d="M92 66 L118 74 v24 c0 16 -13 24 -26 29 C79 122 66 114 66 98 V74 Z" fill="url(#auBadge3)" />
                      <SvgText x={92} y={102} textAnchor="middle" fontFamily="sans-serif" fontSize={22} fontWeight="800" fill="#FFFFFF">SA</SvgText>
                      <Rect x={134} y={70} width={104} height={10} rx={5} fill="#F4F5FB" opacity={0.85} />
                      <Rect x={134} y={88} width={72} height={8} rx={4} fill="#F4F5FB" opacity={0.45} />
                      <Rect x={134} y={118} width={118} height={9} rx={4.5} fill="#8B84FF" opacity={0.8} />
                      <Rect x={216} y={60} width={40} height={18} rx={9} fill="#0F2A24" stroke="#34D399" />
                      <SvgText x={236} y={73} textAnchor="middle" fontFamily="sans-serif" fontSize={8.5} fontWeight="700" fill="#34D399">VERIFIED</SvgText>
                    </Svg>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 1.8, color: '#34D399', marginVertical: 12 }}>DIGITAL IDENTITY</Text>
                    <Text className="text-text font-body-bold" style={{ fontSize: 36, letterSpacing: -1.5, lineHeight: 42 }}>One SA ID, verified for life.</Text>
                    <Text className="text-muted" style={{ fontSize: 15.5, lineHeight: 24, marginTop: 12 }}>Events, student pricing, rentals and referrals — all on one card that never expires.</Text>
                  </View>
                )}

                <View className="flex-row items-center" style={{ gap: 9, marginTop: 32 }}>
                  {[0, 1, 2, 3].map((dot) => (
                    <Pressable
                      key={dot}
                      onPress={() => setSlideIndex(dot)}
                      style={{
                        width: slideIndex === dot ? 30 : 10,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: slideIndex === dot ? '#8B84FF' : '#2A2A55',
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

          <View className="items-center justify-center" style={{ flex: 0.95, padding: 44 }}>
            <View style={{ width: '100%', maxWidth: 400 }}>
              <Text className="text-text font-body-bold" style={{ fontSize: 28, letterSpacing: -1 }}>Sign in</Text>
              <Text className="text-muted" style={{ fontSize: 14.5, marginTop: 6, marginBottom: 24 }}>Continue with Google, or use your email.</Text>

              <Pressable
                onPress={() => {
                  setEmail(DEMO_CREDS.email);
                  setPassword(DEMO_CREDS.pw);
                  doSubmit(DEMO_CREDS.email, DEMO_CREDS.pw);
                }}
                className="flex-row items-center justify-center border border-glass-border bg-glass rounded-xl"
                style={{ gap: 11, paddingVertical: 14 }}
              >
                <Svg width={18} height={18} viewBox="0 0 48 48">
                  <Path fill="#4285F4" d="M45 24c0-1.6-.14-3.13-.4-4.6H24v8.7h11.7c-.5 2.7-2.05 5-4.35 6.55v5.4h7c4.1-3.78 6.65-9.35 6.65-16.05Z" />
                  <Path fill="#34A853" d="M24 46c5.85 0 10.75-1.94 14.35-5.25l-7-5.4c-1.94 1.3-4.42 2.07-7.35 2.07-5.65 0-10.44-3.81-12.14-8.94h-7.2v5.6C7.3 41.2 14.98 46 24 46Z" />
                  <Path fill="#FBBC05" d="M11.86 28.48A13.4 13.4 0 0 1 11.15 24c0-1.56.27-3.07.71-4.48v-5.6h-7.2A21.9 21.9 0 0 0 2 24c0 3.55.85 6.9 2.66 10.08l7.2-5.6Z" />
                  <Path fill="#EA4335" d="M24 10.6c3.18 0 6.04 1.1 8.29 3.23l6.2-6.2C34.73 4.1 29.84 2 24 2 14.98 2 7.3 6.8 4.66 13.92l7.2 5.6C13.56 14.4 18.35 10.6 24 10.6Z" />
                </Svg>
                <Text className="text-text" style={{ fontSize: 15, fontWeight: '600' }}>Continue with Google</Text>
              </Pressable>

              <View className="flex-row items-center" style={{ gap: 14, marginVertical: 20 }}>
                <View className="flex-1" style={{ height: 1, backgroundColor: '#1B1E33' }} />
                <Text className="text-dim font-body-semibold" style={{ fontSize: 12, letterSpacing: 1.4 }}>OR</Text>
                <View className="flex-1" style={{ height: 1, backgroundColor: '#1B1E33' }} />
              </View>

              <Text className="text-muted font-body-bold" style={{ fontSize: 11.5, letterSpacing: 1.3, marginBottom: 8 }}>EMAIL</Text>
              <View className="flex-row items-center border border-glass-border rounded-xl bg-navy" style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>✉️</Text>
                <TextInput
                  className="flex-1 text-text"
                  style={{ fontSize: 15 }}
                  placeholder="you@college.edu"
                  placeholderTextColor="#7B8199"
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {accountDetected && <Text style={{ color: '#34D399', fontSize: 16, fontWeight: '700' }}>✓</Text>}
              </View>

              {emailMsg ? (
                <Text className="text-sm" style={{ color: emailMsgColor, marginTop: 8 }}>{emailMsg}</Text>
              ) : null}

              {(accountDetected || password.length > 0) && (
                <View style={{ marginTop: 18 }}>
                  <View className="flex-row justify-between" style={{ marginBottom: 8 }}>
                    <Text className="text-muted font-body-bold" style={{ fontSize: 11.5, letterSpacing: 1.3 }}>PASSWORD</Text>
                    <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                      <Text className="text-violet" style={{ fontSize: 12.5, fontWeight: '600' }}>Forgot?</Text>
                    </Pressable>
                  </View>
                  <View className="flex-row items-center border border-glass-border rounded-xl bg-navy" style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 16, marginRight: 10 }}>🔒</Text>
                    <TextInput
                      className="flex-1 text-text"
                      style={{ fontSize: 15 }}
                      placeholder="Your password"
                      placeholderTextColor="#7B8199"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      <Text className="text-dim" style={{ fontSize: 12, fontWeight: '600' }}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {errorMsg ? (
                <Text className="text-sm" style={{ color: '#F87176', marginTop: 8 }}>{errorMsg}</Text>
              ) : null}

              <Pressable
                onPress={() => doSubmit()}
                disabled={loading}
                className="bg-violet rounded-xl items-center"
                style={[{ paddingVertical: 16, marginTop: 22 }, loading && { opacity: 0.8 }]}
              >
                <Text className="text-text font-body-bold" style={{ fontSize: 15.5 }}>
                  {loading ? 'Signing in…' : accountDetected ? 'Sign in' : 'Continue'}
                </Text>
              </Pressable>

              <View className="flex-row justify-center" style={{ gap: 6, marginTop: 18 }}>
                <Text className="text-muted" style={{ fontSize: 13.5 }}>New here?</Text>
                <Pressable onPress={() => router.push('/onboarding')}>
                  <Text className="text-violet" style={{ fontSize: 13.5, fontWeight: '600' }}>Create an account</Text>
                </Pressable>
              </View>

              <View className="border border-glass-border rounded-xl bg-glass" style={{ borderStyle: 'dashed', padding: 16, marginTop: 24 }}>
                <Text className="text-violet font-body-bold" style={{ fontSize: 11, letterSpacing: 1.3 }}>⚡ DEMO CREDENTIALS</Text>
                <View style={{ gap: 4, marginVertical: 8 }}>
                  <View className="flex-row justify-between"><Text className="text-muted" style={{ fontSize: 13 }}>Email</Text><Text className="text-text" style={{ fontWeight: '600', fontSize: 13 }}>devender@snist.ac.in</Text></View>
                  <View className="flex-row justify-between"><Text className="text-muted" style={{ fontSize: 13 }}>Password</Text><Text className="text-text" style={{ fontWeight: '600', fontSize: 13 }}>hackwave2026</Text></View>
                </View>
                <Pressable onPress={handleFillDemo}>
                  <Text className="text-violet" style={{ fontSize: 12.5, fontWeight: '600', marginTop: 8 }}>Fill and sign me in →</Text>
                </Pressable>
              </View>
            </View>
          </View>

        </View>

        <View style={{ borderTopWidth: 1, borderColor: '#1B1E33', paddingVertical: 48, paddingHorizontal: 28 }}>
          <View style={{ maxWidth: 1360, marginHorizontal: 'auto', width: '100%' }}>
            <View className="flex-row flex-wrap justify-between" style={{ gap: 32 }}>
              <View style={{ flex: 1.5, minWidth: 260 }}>
                <View className="flex-row items-center" style={{ gap: 11, marginBottom: 14 }}>
                  <Svg width={28} height={33} viewBox="0 0 300 350">
                    <Path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#auBadge3)" />
                    <SvgText x={150} y={214} textAnchor="middle" fontFamily="sans-serif" fontSize={118} fontWeight="800" fill="#FFFFFF">
                      SA
                    </SvgText>
                  </Svg>
                  <Text className="text-text font-body-bold" style={{ fontSize: 17 }}>StudentAlumni</Text>
                </View>
                <Text className="text-muted" style={{ fontSize: 14.5, lineHeight: 22, maxWidth: 320 }}>
                  The intelligent career companion built for the <Text className="text-text font-body-bold">next generation</Text> of students.
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 160 }}>
                <Text className="text-dim font-body-bold" style={{ fontSize: 11, letterSpacing: 1.6, marginBottom: 16 }}>RESOURCES</Text>
                <View style={{ gap: 12 }}>
                  <Pressable onPress={() => router.push('/certificates/verify')}><Text className="text-muted" style={{ fontSize: 14.5 }}>Verify Certificate</Text></Pressable>
                  <Pressable onPress={() => router.push('/contact')}><Text className="text-muted" style={{ fontSize: 14.5 }}>Blog</Text></Pressable>
                  <Pressable onPress={() => router.push('/contact')}><Text className="text-muted" style={{ fontSize: 14.5 }}>Help center</Text></Pressable>
                  <Pressable onPress={() => router.push('/network')}><Text className="text-muted" style={{ fontSize: 14.5 }}>Community</Text></Pressable>
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 160 }}>
                <Text className="text-dim font-body-bold" style={{ fontSize: 11, letterSpacing: 1.6, marginBottom: 16 }}>LEGAL</Text>
                <View style={{ gap: 12 }}>
                  <Pressable onPress={() => router.push('/policy/privacy')}><Text className="text-muted" style={{ fontSize: 14.5 }}>Privacy & Terms</Text></Pressable>
                  <Pressable onPress={() => router.push('/policy/security')}><Text className="text-muted" style={{ fontSize: 14.5 }}>Security & Cookies</Text></Pressable>
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 180 }}>
                <Text className="text-dim font-body-bold" style={{ fontSize: 11, letterSpacing: 1.6, marginBottom: 16 }}>COMPLIANCE</Text>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text className="text-text" style={{ fontSize: 14, fontWeight: '600' }}>✓ DPDP Act 2023</Text>
                    <Text className="text-dim" style={{ fontSize: 11.5, marginTop: 2 }}>India · data principal rights</Text>
                  </View>
                  <View>
                    <Text className="text-text" style={{ fontSize: 14, fontWeight: '600' }}>✓ GDPR</Text>
                    <Text className="text-dim" style={{ fontSize: 11.5, marginTop: 2 }}>EU · lawful basis and DPAs</Text>
                  </View>
                  <View>
                    <Text className="text-text" style={{ fontSize: 14, fontWeight: '600' }}>✓ SOC 2 Type II</Text>
                    <Text className="text-dim" style={{ fontSize: 11.5, marginTop: 2 }}>Audited controls, annual</Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="flex-row items-center justify-between flex-wrap border border-glass-border rounded-2xl bg-glass" style={{ gap: 20, padding: 24, marginTop: 40 }}>
              <View style={{ minWidth: 260 }}>
                <Text className="text-text font-body-bold" style={{ fontSize: 18 }}>One email a month. Nothing else.</Text>
                <Text className="text-muted" style={{ fontSize: 14, marginTop: 4 }}>New openings, mentor drops and campus events — no noise.</Text>
              </View>
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                <View className="rounded-lg bg-navy" style={{ borderWidth: 1, borderColor: '#1B1E33', paddingHorizontal: 16, paddingVertical: 12, minWidth: 200 }}><Text className="text-dim" style={{ fontSize: 14 }}>you@college.edu</Text></View>
                <Pressable onPress={() => setSubscribed(true)} className="bg-violet rounded-lg" style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
                  <Text className="text-text font-body-bold" style={{ fontSize: 14 }}>{subscribed ? 'Subscribed ✓' : 'Subscribe'}</Text>
                </Pressable>
              </View>
            </View>

            <View className="flex-row justify-between items-center flex-wrap" style={{ marginTop: 40, gap: 20 }}>
              <View>
                <Text style={{ fontSize: 32, fontWeight: '700', color: '#C08BFF', letterSpacing: -1.2 }}>#studentalumni</Text>
                <Text className="text-muted" style={{ fontSize: 14, marginTop: 6 }}>Built with love for students across all campus's</Text>
              </View>
              <Text className="text-muted" style={{ fontSize: 13 }}>All rights reserved @ Student Alumni 2026</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
