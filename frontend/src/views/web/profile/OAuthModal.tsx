/**
 * OAuth Connection Modal — provides a more realistic OAuth-handshake UX
 * for Tools & Integrations.
 *
 * Real OAuth typically opens the provider's authorization page in a popup,
 * the user authorizes, and the popup returns a code that the backend
 * exchanges for tokens. Until the user supplies real provider client_id /
 * client_secret pairs, we render a faithful OAuth popup that:
 *
 *   1. Shows the provider's branded "Sign in / Authorize" sheet.
 *   2. Asks for the requested scopes (read calendar, send mail, etc).
 *   3. On Approve, prompts for the email associated with the account
 *      (used as the persistent identifier in our DB).
 *   4. POSTs to /users/me/integrations with provider+email — same
 *      contract the backend already supports.
 *
 * When real client_ids are wired, replace `runMockOAuth` with a window.open
 * to the provider's authorize endpoint and listen for the code via the
 * window.opener postMessage protocol.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, X, ShieldCheck } from '../portals/student/iconShims';

type ProviderMeta = {
  id: string;
  label: string;
  iconColor: string;
  iconBg: string;
  Icon: any;
};

const SCOPES_BY_PROVIDER: Record<string, string[]> = {
  openai_chatgpt:    ['Generate AI completions', 'Run reasoning chains'],
  anthropic_claude:  ['Generate AI completions', 'Document analysis'],
  google_gemini:     ['Generate AI completions', 'Multimodal coaching'],
  gmail:             ['Send emails on your behalf', 'Read recent threads'],
  outlook:           ['Send emails on your behalf', 'Read calendar invites'],
  icloud:            ['Send emails on your behalf'],
  google_meet:       ['Create video meeting links', 'Manage Meet sessions'],
  zoom:              ['Create scheduled Zoom meetings', 'Manage hosts'],
  ms_teams:          ['Create Teams meeting links', 'Read calendar'],
  google_calendar:   ['View calendar events', 'Add booking events'],
  outlook_calendar:  ['View calendar events', 'Add booking events'],
  notion:            ['Read & write to a single page', 'Create session notes'],
  slack:             ['Post session reminders', 'Send DMs to you'],
};

export function OAuthModal({
  visible, provider, onClose, onAuthorize,
}: {
  visible: boolean;
  provider: ProviderMeta | null;
  onClose: () => void;
  onAuthorize: (email: string) => Promise<void>;
}) {
  const [step, setStep] = useState<'authorize' | 'email' | 'connecting'>('authorize');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep('authorize');
      setEmail('');
      setError(null);
      setBusy(false);
    }
  }, [visible]);

  if (!provider) return null;
  const Icon = provider.Icon;
  const scopes = SCOPES_BY_PROVIDER[provider.id] || ['Basic profile access'];

  const handleApprove = () => {
    setStep('email');
  };

  const handleConnect = async () => {
    const e = email.trim().toLowerCase();
    if (!e || e.indexOf('@') < 1 || e.indexOf('.') < 0) {
      setError('Please enter a valid email address.');
      return;
    }
    setError(null);
    setBusy(true);
    setStep('connecting');
    try {
      // Simulate the OAuth round-trip latency (real flow → backend exchange)
      await new Promise((r) => setTimeout(r, 900));
      await onAuthorize(e);
    } catch (err: any) {
      setError(err?.message || 'Authorization failed. Please try again.');
      setStep('email');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View
          style={s.popup}
          accessibilityViewIsModal
          accessibilityLabel={`Connect ${provider.label}`}
        >
          {/* Header bar — provider brand */}
          <View style={[s.header, { backgroundColor: provider.iconBg }]}>
            <View style={s.urlBar}>
              <ShieldCheck size={11} color="#22C55E" />
              <Text style={s.urlText} numberOfLines={1}>
                {`accounts.${provider.id.replace(/_/g, '-')}.com`}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={s.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close authorization"
              testID="oauth-close"
            >
              <X size={14} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>

          <View style={s.body}>
            <View style={[s.iconLarge, { backgroundColor: provider.iconBg }]}>
              <Icon size={28} color={provider.iconColor} />
            </View>

            {step === 'authorize' && (
              <>
                <Text style={s.title}>Authorize {provider.label}</Text>
                <Text style={s.sub}>
                  Student Alumni would like to connect to your {provider.label} account.
                </Text>

                <View style={s.scopeBox}>
                  <Text style={s.scopeHeader}>This will allow Student Alumni to:</Text>
                  {scopes.map((sc, i) => (
                    <View key={i} style={s.scopeRow}>
                      <CheckCircle2 size={12} color="#22C55E" />
                      <Text style={s.scopeText}>{sc}</Text>
                    </View>
                  ))}
                </View>

                <Text style={s.fineprint}>
                  You can revoke this permission anytime from Tools &amp; Integrations.
                </Text>

                <View style={s.btnRow}>
                  <Pressable
                    onPress={onClose}
                    style={s.btnSecondary}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel and close"
                    testID="oauth-cancel"
                  >
                    <Text style={s.btnSecondaryText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleApprove}
                    style={s.btnPrimaryWrap}
                    accessibilityRole="button"
                    accessibilityLabel={`Authorize ${provider.label}`}
                    accessibilityHint="Grants the listed permissions to Student Alumni"
                    testID="oauth-authorize"
                  >
                    <LinearGradient
                      colors={['#22C55E', '#15803D']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.btnPrimary}
                    >
                      <Text style={s.btnPrimaryText}>Authorize</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            )}

            {step === 'email' && (
              <>
                <Text style={s.title}>Confirm your account</Text>
                <Text style={s.sub}>
                  Enter the email tied to your {provider.label} account.
                </Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.40)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                  style={s.input}
                  accessibilityLabel="Account email"
                  accessibilityHint="Email associated with your account at this provider"
                  testID="oauth-email-input"
                />
                {!!error && <Text style={s.errorText}>{error}</Text>}

                <View style={s.btnRow}>
                  <Pressable
                    onPress={() => setStep('authorize')}
                    style={s.btnSecondary}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                  >
                    <Text style={s.btnSecondaryText}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConnect}
                    style={s.btnPrimaryWrap}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm and connect"
                    testID="oauth-confirm"
                  >
                    <LinearGradient
                      colors={['#22C55E', '#15803D']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.btnPrimary}
                    >
                      <Text style={s.btnPrimaryText}>{busy ? '…' : 'Connect'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            )}

            {step === 'connecting' && (
              <>
                <Text style={s.title}>Connecting…</Text>
                <Text style={s.sub}>Exchanging the authorization code with {provider.label}.</Text>
                <View style={{ marginTop: 18 }}>
                  <ActivityIndicator size="large" color="#22C55E" />
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(5,3,12,0.70)',
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(4px)' } as any) : {}),
  },
  popup: {
    width: 460, maxWidth: '92%' as any, borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#15101F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 64px rgba(0,0,0,0.55)' } as any) : {}),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  urlBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  urlText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_500Medium', fontSize: 11 },
  closeBtn: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },

  body: { padding: 24, alignItems: 'center', gap: 8 },
  iconLarge: {
    width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 17, textAlign: 'center', marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.66)', fontFamily: 'DMSans_500Medium', fontSize: 12.5, textAlign: 'center', marginTop: 4, lineHeight: 18, maxWidth: 360 },

  scopeBox: {
    width: '100%', marginTop: 16, padding: 14, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.06)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.30)',
    gap: 8,
  },
  scopeHeader: { color: '#86EFAC', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.4 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_500Medium', fontSize: 12 },

  fineprint: { color: 'rgba(255,255,255,0.46)', fontFamily: 'DMSans_500Medium', fontSize: 10.5, marginTop: 14, textAlign: 'center' },

  input: {
    width: '100%', height: 42, marginTop: 14, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.32)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  errorText: { color: '#FCA5A5', fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 6, textAlign: 'center' },

  btnRow: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 18 },
  btnSecondary: {
    flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnSecondaryText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  btnPrimaryWrap: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  btnPrimary: { height: 40, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },
});

export default OAuthModal;
