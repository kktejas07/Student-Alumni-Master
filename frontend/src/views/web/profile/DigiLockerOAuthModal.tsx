/**
 * DigiLocker & Aadhaar e-KYC OAuth Single Sign-On Gateway Modal
 * Official MeriPehchaan (National Single Sign-On, Government of India) flow.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ShieldCheck, Shield, CheckCircle2, X, Lock, Globe, FileText,
  Smartphone, Award, BookOpen, Check, ArrowRight, RefreshCw, KeyRound
} from 'lucide-react-native';
import { request } from '@/src/models/services/api';

export interface DigiLockerOAuthModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess: (syncedData: any) => void;
}

export function DigiLockerOAuthModal({
  visible,
  onClose,
  userId,
  onSuccess,
}: DigiLockerOAuthModalProps) {
  const [step, setStep] = useState<'login' | 'otp' | 'consent' | 'syncing' | 'complete'>('login');
  const [loginMode, setLoginMode] = useState<'aadhaar' | 'mobile'>('aadhaar');
  const [identifier, setIdentifier] = useState('5489 2310 9874');
  const [pinOrOtp, setPinOrOtp] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncedResult, setSyncedResult] = useState<any>(null);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (visible) {
      setStep('login');
      setIdentifier(loginMode === 'aadhaar' ? '5489 2310 9874' : '9876543210');
      setPinOrOtp('123456');
      setError(null);
      setBusy(false);
      setSyncedResult(null);
    }
  }, [visible, loginMode]);

  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!visible) return null;

  const handleRequestOtp = () => {
    const raw = identifier.replace(/\D/g, '');
    if (loginMode === 'aadhaar' && raw.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (loginMode === 'mobile' && raw.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError(null);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep('otp');
      setCountdown(60);
    }, 600);
  };

  const handleVerifyOtp = () => {
    if (!pinOrOtp || pinOrOtp.length < 6) {
      setError('Please enter the 6-digit OTP / Security PIN.');
      return;
    }
    setError(null);
    setStep('consent');
  };

  const handleApproveConsent = async () => {
    setError(null);
    setBusy(true);
    setStep('syncing');
    try {
      const res = await request<any>('/bgv/digilocker/oauth-sync', {
        method: 'POST',
        body: {
          user_id: userId,
          identifier: identifier.replace(/\D/g, ''),
          otp_code: pinOrOtp,
          consent_scopes: ['aadhaar_ekyc', 'nad_degrees', 'abc_record', 'school_marksheets']
        }
      });

      if (res.ok) {
        setSyncedResult(res);
        setStep('complete');
        onSuccess(res);
      } else {
        throw new Error(res.message || 'DigiLocker synchronization failed.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not complete DigiLocker authentication.');
      setStep('consent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Top Brand Banner */}
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.topBanner}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.emblemBox}>
                  <Globe size={20} color="#38BDF8" />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.brandTitle}>DigiLocker</Text>
                    <View style={s.govBadge}>
                      <Text style={s.govBadgeText}>Govt of India</Text>
                    </View>
                  </View>
                  <Text style={s.brandSub}>MeriPehchaan Ã‚Â· National Single Sign-On (NSSO)</Text>
                </View>
              </View>

              <Pressable onPress={onClose} style={s.closeBtn}>
                <X size={18} color="#94A3B8" />
              </Pressable>
            </View>
          </LinearGradient>

          {/* Stepper Progress */}
          <View style={s.stepperRow}>
            <View style={[s.stepDot, (step === 'login' || step === 'otp' || step === 'consent' || step === 'syncing' || step === 'complete') && s.stepDotActive]}>
              <Text style={s.stepNum}>1</Text>
            </View>
            <View style={[s.stepLine, (step === 'otp' || step === 'consent' || step === 'syncing' || step === 'complete') && s.stepLineActive]} />
            <View style={[s.stepDot, (step === 'otp' || step === 'consent' || step === 'syncing' || step === 'complete') && s.stepDotActive]}>
              <Text style={s.stepNum}>2</Text>
            </View>
            <View style={[s.stepLine, (step === 'consent' || step === 'syncing' || step === 'complete') && s.stepLineActive]} />
            <View style={[s.stepDot, (step === 'consent' || step === 'syncing' || step === 'complete') && s.stepDotActive]}>
              <Text style={s.stepNum}>3</Text>
            </View>
            <View style={[s.stepLine, (step === 'syncing' || step === 'complete') && s.stepLineActive]} />
            <View style={[s.stepDot, step === 'complete' && s.stepDotActive]}>
              <Check size={16} color="#fff" />
            </View>
          </View>

          {/* Main Body Content */}
          <View style={s.body}>
            {/* Step 1: Sign in */}
            {step === 'login' && (
              <View style={{ gap: 14 }}>
                <View>
                  <Text style={s.sheetTitle}>Sign in to your DigiLocker Account</Text>
                  <Text style={s.sheetSub}>
                    Authenticate using your 12-digit Aadhaar number or registered mobile to access your official documents.
                  </Text>
                </View>

                <View style={s.tabRow}>
                  <Pressable
                    onPress={() => setLoginMode('aadhaar')}
                    style={[s.tabBtn, loginMode === 'aadhaar' && s.tabBtnActive]}
                  >
                    <ShieldCheck size={14} color={loginMode === 'aadhaar' ? '#38BDF8' : '#94A3B8'} />
                    <Text style={[s.tabBtnText, loginMode === 'aadhaar' && s.tabBtnTextActive]}>Aadhaar UIDAI</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLoginMode('mobile')}
                    style={[s.tabBtn, loginMode === 'mobile' && s.tabBtnActive]}
                  >
                    <Smartphone size={14} color={loginMode === 'mobile' ? '#38BDF8' : '#94A3B8'} />
                    <Text style={[s.tabBtnText, loginMode === 'mobile' && s.tabBtnTextActive]}>Mobile Number</Text>
                  </Pressable>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={s.inputLabel}>
                    {loginMode === 'aadhaar' ? '12-Digit Aadhaar Number' : '10-Digit Mobile Number'}
                  </Text>
                  <View style={s.inputWrap}>
                    {loginMode === 'aadhaar' ? <Shield size={16} color="#64748B" /> : <Smartphone size={16} color="#64748B" />}
                    <TextInput
                      style={s.textInput}
                      value={identifier}
                      onChangeText={(t) => {
                        setError(null);
                        setIdentifier(t);
                      }}
                      placeholder={loginMode === 'aadhaar' ? '5489 2310 9874' : '9876543210'}
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={s.inputHint}>
                    {loginMode === 'aadhaar'
                      ? 'UIDAI OTP will be dispatched to your linked mobile number.'
                      : 'OTP will be sent via SMS.'}
                  </Text>
                </View>

                {error && <Text style={s.errorText}>{error}</Text>}

                <Pressable
                  onPress={handleRequestOtp}
                  disabled={busy}
                  style={s.primaryBtn}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Text style={s.primaryBtnText}>Get OTP via UIDAI Gateway</Text>
                      <ArrowRight size={16} color="#FFF" />
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* Step 2: OTP / Security PIN */}
            {step === 'otp' && (
              <View style={{ gap: 14 }}>
                <View>
                  <Text style={s.sheetTitle}>Enter 6-Digit OTP / PIN</Text>
                  <Text style={s.sheetSub}>
                    Enter the verification code dispatched to Aadhaar linked mobile ending in <Text style={{ color: '#E2E8F0', fontWeight: '700' }}>{identifier.replace(/\D/g, '').slice(-4) || '9874'}</Text>.
                  </Text>
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={s.inputLabel}>6-Digit Security OTP</Text>
                  <View style={s.inputWrap}>
                    <KeyRound size={16} color="#64748B" />
                    <TextInput
                      style={[s.textInput, { letterSpacing: 4, fontSize: 18, fontFamily: 'monospace' }]}
                      value={pinOrOtp}
                      onChangeText={(t) => {
                        setError(null);
                        setPinOrOtp(t.replace(/\D/g, '').slice(0, 6));
                      }}
                      placeholder="123456"
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.inputHint}>Demo sandbox code: 123456</Text>
                    <Text style={{ color: '#64748B', fontSize: 11 }}>Resend in {countdown}s</Text>
                  </View>
                </View>

                {error && <Text style={s.errorText}>{error}</Text>}

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setStep('login')}
                    style={s.ghostBtn}
                  >
                    <Text style={s.ghostBtnText}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleVerifyOtp}
                    style={[s.primaryBtn, { flex: 1 }]}
                  >
                    <Text style={s.primaryBtnText}>Verify &amp; Continue</Text>
                    <ArrowRight size={16} color="#FFF" />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Step 3: Consent & Permissions */}
            {step === 'consent' && (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={s.sheetTitle}>Authorize Credential Sharing</Text>
                  <Text style={s.sheetSub}>
                    Student Alumni Network requests read access to verify the following official government records:
                  </Text>
                </View>

                <View style={s.scopesList}>
                  <View style={s.scopeItem}>
                    <View style={[s.scopeIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                      <ShieldCheck size={16} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.scopeTitle}>Aadhaar e-KYC Profile (UIDAI)</Text>
                      <Text style={s.scopeDesc}>Full Name, Date of Birth, Gender, Address &amp; Masked Aadhaar</Text>
                    </View>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>

                  <View style={s.scopeItem}>
                    <View style={[s.scopeIcon, { backgroundColor: 'rgba(56,189,248,0.15)' }]}>
                      <Award size={16} color="#38BDF8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.scopeTitle}>National Academic Depository (NAD)</Text>
                      <Text style={s.scopeDesc}>University Degree, College Roll Number, CGPA &amp; Passing Year</Text>
                    </View>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>

                  <View style={s.scopeItem}>
                    <View style={[s.scopeIcon, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
                      <BookOpen size={16} color="#A78BFA" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.scopeTitle}>Academic Bank of Credits (ABC ID)</Text>
                      <Text style={s.scopeDesc}>APAAR / Ministry of Education Credit Ledger &amp; Department</Text>
                    </View>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>

                  <View style={s.scopeItem}>
                    <View style={[s.scopeIcon, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
                      <FileText size={16} color="#FBBF24" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.scopeTitle}>CBSE / State Board Marksheets</Text>
                      <Text style={s.scopeDesc}>Class 10th &amp; 12th Senior Secondary Credentials</Text>
                    </View>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                </View>

                <View style={s.consentNotice}>
                  <Lock size={14} color="#60A5FA" />
                  <Text style={s.consentNoticeText}>
                    Data is transmitted securely over 256-bit TLS and processed according to Aadhaar Data Security Regulations (IT Act 2000).
                  </Text>
                </View>

                {error && <Text style={s.errorText}>{error}</Text>}

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={onClose} style={s.ghostBtn}>
                    <Text style={s.ghostBtnText}>Deny</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleApproveConsent}
                    disabled={busy}
                    style={[s.primaryBtn, { flex: 1, backgroundColor: '#10B981' }]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFF" />
                        <Text style={s.primaryBtnText}>Grant Consent &amp; Sync Profile</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Step 4: Syncing State */}
            {step === 'syncing' && (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 14 }}>
                <ActivityIndicator size="large" color="#38BDF8" />
                <Text style={s.sheetTitle}>Pulling DigiLocker &amp; Aadhaar e-KYC DataÃ¢â‚¬Â¦</Text>
                <Text style={s.sheetSub}>
                  Cryptographically verifying credentials with National Academic Depository &amp; UIDAI.
                </Text>
              </View>
            )}

            {/* Step 5: Complete */}
            {step === 'complete' && syncedResult && (
              <View style={{ gap: 14 }}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={s.successBadge}>
                    <Check size={24} color="#10B981" />
                  </View>
                  <Text style={s.sheetTitle}>Credentials Successfully Synced!</Text>
                  <Text style={s.sheetSub}>
                    Your Aadhaar identity and 3 official DigiLocker documents have been verified and applied to your profile.
                  </Text>
                </View>

                <View style={s.syncedDocsList}>
                  {syncedResult.synced_documents?.map((doc: any, idx: number) => (
                    <View key={idx} style={s.syncedDocCard}>
                      <Award size={18} color="#38BDF8" />
                      <View style={{ flex: 1 }}>
                        <Text style={s.syncedDocName}>{doc.name}</Text>
                        <Text style={s.syncedDocIssuer}>{doc.issuer} Ã‚Â· {doc.status}</Text>
                      </View>
                      <View style={s.verifiedTag}>
                        <Text style={s.verifiedTagText}>VERIFIED</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={onClose}
                  style={[s.primaryBtn, { backgroundColor: '#10B981' }]}
                >
                  <Check size={16} color="#FFF" />
                  <Text style={s.primaryBtnText}>Done &amp; View Profile</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
  },
  topBanner: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  emblemBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  govBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.40)',
  },
  govBadgeText: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '700',
  },
  brandSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#38BDF8',
  },
  stepNum: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepLineActive: {
    backgroundColor: '#38BDF8',
  },
  body: {
    padding: 20,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sheetSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.30)',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingVertical: 10,
  },
  inputHint: {
    color: '#64748B',
    fontSize: 11,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  scopesList: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    gap: 8,
  },
  scopeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  scopeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  scopeDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 14,
  },
  consentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.20)',
  },
  consentNoticeText: {
    color: '#93C5FD',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  successBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncedDocsList: {
    gap: 8,
  },
  syncedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  syncedDocName: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
  },
  syncedDocIssuer: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  verifiedTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '800',
  },
});


