// TAB 6 — Security (2FA, password, active sessions, access log) — split verbatim from SettingsView.tsx (audit Step 6c).
// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Switch, Platform, TextInput, ActivityIndicator, Image } from 'react-native';
import { Lock, Check, Eye, EyeOff, Monitor, Smartphone, ShieldCheck, Clock, MapPin, Globe, Wifi, Activity } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SAC, FONTS } from '@/src/views/web/portals/superadmin/tokens';
import { request } from '@/src/models/services/api';
import { GRAD_TO } from './settingsTokens';
import { liveAgo } from './settingsNotifs';
import { s } from './settingsStyles';
import { GradientButton } from './settingsWidgets';


export function SecurityTab({ onSaved }: { onSaved: (s?: string) => void }) {
  const [twoFa, setTwoFa] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [qrData, setQrData] = useState<{ qr_base64: string; secret: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showDisablePwd, setShowDisablePwd] = useState(false);
  const [disablePwd, setDisablePwd] = useState('');
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [conf, setConf] = useState('');
  const [showCur, setShowCur] = useState(false); const [showNext, setShowNext] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveAt, setLiveAt] = useState<Date | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);

  const load = useCallback(async () => {
    setLiveBusy(true);
    try {
      const hints = await collectSessionHints();
      await request('/admin/security/sessions/record', { method: 'POST', body: hints }).catch(() => {});
      const [sessR, logR, analysisR, tdR] = await Promise.all([
        request<any>(`/admin/security/sessions${showAllSessions ? '?all=true' : ''}`),
        request<any>('/admin/security/access-log'),
        request<any>('/admin/security/sessions/analysis').catch(() => null),
        request<any>('/admin/security/trusted-devices').catch(() => null),
      ]);
      setSessions(sessR?.sessions || []);
      setSessionTotal(sessR?.total || 0);
      setLog(logR?.entries || []);
      setAnalysis(analysisR || null);
      setTrustedDevices(tdR?.trusted_devices || []);
      setLiveAt(new Date());
    } catch {}
    finally { setLiveBusy(false); }
  }, [showAllSessions]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      try {
        const r = await request<{ enabled: boolean }>('/admin/security/2fa/status');
        setTwoFa(r?.enabled ?? false);
      } catch {}
    })();
  }, []);
  useEffect(() => {
    const id = setInterval(() => { load(); }, 60000);
    const onFocus = () => { load(); };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      clearInterval(id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [load]);

  const onToggle2fa = async (value: boolean) => {
    if (value) {
      // Enabling — generate QR
      setTwoFaLoading(true);
      try {
        const r = await request<{ qr_base64: string; secret: string }>('/admin/security/2fa/generate', { method: 'POST' });
        setQrData(r);
        setOtp('');
        setOtpError(null);
      } catch { onSaved('Failed to generate 2FA secret'); setTwoFaLoading(false); return; }
      setTwoFaLoading(false);
    } else {
      // Disabling — show password prompt
      setShowDisablePwd(true);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { setOtpError('Enter a 6-digit code from your authenticator app'); return; }
    setTwoFaLoading(true);
    setOtpError(null);
    try {
      await request('/admin/security/2fa/enable', { method: 'POST', body: { token: otp } });
      setQrData(null);
      setTwoFa(true);
      setOtp('');
      onSaved('2FA enabled');
    } catch (e: any) {
      setOtpError(String(e?.message || e));
    } finally { setTwoFaLoading(false); }
  };

  const disable2fa = async () => {
    if (!disablePwd.trim()) return;
    setTwoFaLoading(true);
    try {
      await request('/admin/security/2fa/disable', { method: 'POST', body: { password: disablePwd } });
      setShowDisablePwd(false);
      setDisablePwd('');
      setTwoFa(false);
      onSaved('2FA disabled');
    } catch { onSaved('Failed to disable 2FA'); }
    finally { setTwoFaLoading(false); }
  };

  const cancel2fa = () => {
    setQrData(null);
    setOtp('');
    setOtpError(null);
    setShowDisablePwd(false);
    setDisablePwd('');
  };

  const updatePwd = async () => {
    setPwdErr(null);
    if (next.length < 12) { setPwdErr('Password must be at least 12 characters'); return; }
    if (next !== conf) { setPwdErr('Passwords do not match'); return; }
    setBusy(true);
    try {
      await request('/admin/security/password', { method: 'PUT', body: { current_password: cur, new_password: next } });
      setCur(''); setNext(''); setConf('');
      onSaved('Password updated');
    } catch (e: any) {
      setPwdErr(String(e?.message || e));
    } finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    setSessions(sessions.filter((sx) => sx.id !== id));
    try { await request(`/admin/security/sessions/${id}`, { method: 'DELETE' }); onSaved('Session revoked'); }
    catch (e: any) { onSaved(e?.message || 'Failed to revoke session'); }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={s.twoCol}>
      {/* AUTHENTICATION */}
      <View style={{ flex: 1, minWidth: 320, gap: 14 }}>
        <View style={s.card}>
          <Text style={s.sectionLabel}>AUTHENTICATION</Text>
          <View style={[s.toggleRow, { marginTop: 14, paddingBottom: 14 }]}>
            <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <Text style={s.toggleTitle}>Two-Factor Authentication</Text>
              <Text style={s.toggleDesc}>{twoFa ? 'Active · OTP from authenticator app required at login' : 'Not configured — add extra security to your account'}</Text>
            </View>
            <Switch
              value={twoFa || !!qrData}
              onValueChange={onToggle2fa}
              disabled={twoFaLoading}
              trackColor={{ false: 'rgba(255,255,255,0.10)', true: GRAD_TO }}
              thumbColor={(twoFa || !!qrData) ? '#fff' : '#ccc'}
              {...(Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as any) : {})}
            />
          </View>

          {/* 2FA Setup — QR + OTP */}
          {qrData && (
            <View style={{ marginTop: 8, gap: 14, padding: 16, borderRadius: 12, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: 'rgba(251,146,60,0.25)' }}>
              <Text style={{ color: GRAD_TO, fontFamily: FONTS.xbold, fontSize: 13 }}>Set up authenticator</Text>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16 }}>
                Scan this QR code with Google Authenticator, Authy, or any TOTP app. Then enter the 6-digit code below to verify.
              </Text>
              <View style={{ alignItems: 'center', padding: 10 }}>
                {Platform.OS === 'web' ? (
                  <img src={`data:image/png;base64,${qrData.qr_base64}`} alt="2FA QR Code" style={{ width: 160, height: 160, borderRadius: 8 }} />
                ) : (
                  <Image source={{ uri: `data:image/png;base64,${qrData.qr_base64}` }} style={{ width: 160, height: 160, borderRadius: 8 }} />
                )}
              </View>
              <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5, textAlign: 'center' }}>
                Key: {qrData.secret}
              </Text>
              <View style={{ gap: 8 }}>
                <Text style={s.modalLabel}>Verification code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={SAC.dim}
                  maxLength={6}
                  keyboardType="number-pad"
                  autoFocus
                  style={[s.input, { textAlign: 'center', fontSize: 22, fontFamily: FONTS.xbold, letterSpacing: 8 }]}
                />
                {otpError && <Text style={s.errorText}>{otpError}</Text>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <Pressable onPress={cancel2fa} style={s.secondaryBtn}><Text style={s.secondaryBtnText}>Cancel</Text></Pressable>
                <GradientButton onPress={verifyOtp} loading={twoFaLoading}>
                  <Check size={13} color="#fff" />
                  <Text style={s.primaryBtnText}>Verify & Enable</Text>
                </GradientButton>
              </View>
            </View>
          )}

          {/* 2FA Disable Password Prompt */}
          {showDisablePwd && (
            <View style={{ marginTop: 8, gap: 10, padding: 16, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)' }}>
              <Text style={{ color: SAC.red, fontFamily: FONTS.xbold, fontSize: 13 }}>Disable Two-Factor Authentication</Text>
              <Text style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>Enter your current password to confirm.</Text>
              <TextInput
                value={disablePwd}
                onChangeText={setDisablePwd}
                placeholder="Current password"
                placeholderTextColor={SAC.dim}
                secureTextEntry
                style={s.input}
              />
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <Pressable onPress={cancel2fa} style={s.secondaryBtn}><Text style={s.secondaryBtnText}>Cancel</Text></Pressable>
                <Pressable onPress={disable2fa} disabled={twoFaLoading || !disablePwd.trim()} style={[s.destructiveBtn, (twoFaLoading || !disablePwd.trim()) && { opacity: 0.5 }]}>
                  {twoFaLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Disable 2FA</Text>}
                </Pressable>
              </View>
            </View>
          )}

          <Text style={[s.sectionLabel, { marginTop: 18 }]}>CHANGE PASSWORD</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            <PasswordField icon={Lock} value={cur} onChange={setCur}
              placeholder="Current password" show={showCur} onToggle={() => setShowCur(!showCur)} />
            <PasswordField icon={Lock} value={next} onChange={setNext}
              placeholder="New password (min 12 chars)" show={showNext} onToggle={() => setShowNext(!showNext)} />
            <PasswordField icon={Lock} value={conf} onChange={setConf}
              placeholder="Confirm new password" show={showNext} onToggle={() => setShowNext(!showNext)} />
            {pwdErr && <Text style={s.errorText}>{pwdErr}</Text>}
            <GradientButton onPress={updatePwd} loading={busy}>
              <Check size={13} color="#fff" />
              <Text style={s.primaryBtnText}>Update Password</Text>
            </GradientButton>
          </View>
        </View>

        {/* ACCESS LOG */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={s.sectionLabel}>ACCESS LOG</Text>
            <Text style={[s.muted, { fontSize: 10.5 }]}>
              {liveBusy ? 'Refreshing…' : liveAt ? `Live · ${liveAt.toLocaleTimeString()}` : ''}
            </Text>
          </View>
          <View style={{ marginTop: 12, gap: 10 }}>
            {log.length === 0 && <Text style={s.muted}>No activity recorded yet. Open this page from a signed-in admin session to start the live log.</Text>}
            {log.map((it, i) => (
              <View key={`${it.at}-${i}`} style={s.logRow}>
                <View style={s.logDot} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.logAction}>{prettyAction(it.action)} {it.target && it.target !== 'self' && `: ${it.target}`}</Text>
                  <Text style={s.muted}>
                    {[it.ip, it.location, it.browser || it.device, it.at ? new Date(it.at).toLocaleString() : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ACTIVE SESSIONS + ANALYSIS */}
      <View style={{ flex: 1, minWidth: 320, gap: 14 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={s.sectionLabel}>ACTIVE SESSIONS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[s.dotGreen, liveBusy && { backgroundColor: '#FBBF24' }]} />
              <Text style={[s.muted, { fontSize: 10.5 }]}>{liveBusy ? 'Updating' : 'Live · 12s'}</Text>
            </View>
          </View>
          <View style={{ marginTop: 12, gap: 8 }}>
            {sessions.length === 0 && <Text style={s.muted}>No sessions recorded yet.</Text>}
            {sessions.map((sess) => {
              const isMobile = /iphone|ipad|android|phone/i.test(`${sess.device || ''} ${sess.os || ''}`);
              const Icon = isMobile ? Smartphone : Monitor;
              const coords = (sess.lat != null && sess.lon != null && sess.lat !== 0)
                ? `${Number(sess.lat).toFixed(3)}, ${Number(sess.lon).toFixed(3)}`
                : '';
              return (
                <View key={sess.id} style={s.sessRow}>
                  <View style={[s.sessIcon, sess.current && { borderColor: GRAD_TO, backgroundColor: 'rgba(251,146,60,0.12)' }]}>
                    <Icon size={16} color={sess.current ? GRAD_TO : SAC.muted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={s.toggleTitle}>{sess.browser} · {sess.device}</Text>
                      {sess.os ? <Text style={s.muted}>{sess.os}</Text> : null}
                    </View>
                    <View style={{ gap: 2, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                        <MapPin size={11} color={SAC.muted} style={{ marginTop: 2 }} />
                        <Text style={[s.muted, { flex: 1 }]}>{sess.location}</Text>
                      </View>
                      {sess.ip ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Wifi size={11} color={SAC.muted} />
                          <Text style={s.muted}>IP {sess.ip}{sess.isp ? ` · ${sess.isp}` : ''}{sess.asn ? ` · ${sess.asn}` : ''}</Text>
                        </View>
                      ) : null}
                      {(sess.timezone || sess.language || sess.screen) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Globe size={11} color={SAC.muted} />
                          <Text style={s.muted}>
                            {[sess.timezone, sess.language, sess.screen, coords].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      ) : coords ? (
                        <Text style={s.muted}>{coords}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Clock size={11} color={SAC.muted} />
                        <Text style={s.muted}>Last active {liveAgo(sess.last_active_raw) || sess.last_active}</Text>
                      </View>
                    </View>
                  </View>
                  {sess.current ? (
                    <View style={s.activeChip}>
                      <View style={s.dotGreen} />
                      <Text style={s.activeChipText}>This device</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => revoke(sess.id)} style={s.revokeBtn}>
                      <Text style={s.revokeBtnText}>Revoke</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          {sessionTotal > 5 && !showAllSessions && (
            <Pressable
              onPress={async () => {
                try {
                  const r = await request<any>('/admin/security/sessions?all=true');
                  if (r?.sessions) { setSessions(r.sessions); setShowAllSessions(true); }
                } catch (e: any) {
                  console.error('Failed to load all sessions', e);
                }
              }}
              style={[s.linkBtn, { alignSelf: 'center', marginTop: 8 }]}
            >
              <Text style={s.linkBtnText}>View all {sessionTotal} sessions →</Text>
            </Pressable>
          )}
          {showAllSessions && (
            <Pressable
              onPress={async () => {
                try {
                  const r = await request<any>('/admin/security/sessions');
                  if (r?.sessions) { setSessions(r.sessions); setShowAllSessions(false); }
                } catch (e: any) {
                  console.error('Failed to load sessions', e);
                }
              }}
              style={[s.linkBtn, { alignSelf: 'center', marginTop: 8 }]}
            >
              <Text style={s.linkBtnText}>Show last 5 only ↑</Text>
            </Pressable>
          )}
          <Pressable
            onPress={async () => {
              try {
                const hints = await collectSessionHints();
                const r = await request<any>('/admin/security/trusted-devices', { method: 'POST', body: hints });
                if (r?.trusted) {
                  const td = await request<any>('/admin/security/trusted-devices');
                  setTrustedDevices(td?.trusted_devices || []);
                }
              } catch {}
            }}
            style={[s.trustBtn, { marginTop: 10 }]}
          >
            <ShieldCheck size={12} color={GRAD_TO} />
            <Text style={s.trustBtnText}>Trust this device</Text>
          </Pressable>
        </View>

        {/* TRUSTED DEVICES */}
        {trustedDevices.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionLabel}>TRUSTED DEVICES</Text>
            <Text style={[s.muted, { marginTop: 4, marginBottom: 10, fontSize: 11 }]}>These devices are exempt from automatic session expiry.</Text>
            <View style={{ gap: 6 }}>
              {trustedDevices.map((d) => (
                <View key={d.id} style={s.trustedRow}>
                  <View style={s.trustedIcon}>
                    <ShieldCheck size={13} color={SAC.green} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.toggleTitle}>{d.browser} · {d.device}</Text>
                    <Text style={s.muted}>{[d.location, d.ip && `IP ${d.ip}`, d.isp].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Text style={s.muted}>{d.added_ago}</Text>
                  <Pressable
                    onPress={async () => {
                      try {
                        await request(`/admin/security/trusted-devices/${d.id}`, { method: 'DELETE' });
                        setTrustedDevices(trustedDevices.filter((td) => td.id !== d.id));
                      } catch {}
                    }}
                    style={s.revokeBtn}
                  >
                    <Text style={s.revokeBtnText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {analysis && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color={GRAD_TO} />
              <Text style={s.sectionLabel}>SESSION ANALYSIS</Text>
            </View>
            <View style={{ marginTop: 14, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <MiniStat icon={Monitor} label="Total sessions" value={String(analysis.total_sessions || 0)} />
                {Object.entries(analysis.device_breakdown || {}).map(([k, v]) => (
                  <MiniStat key={k} icon={Smartphone} label={k} value={String(v)} />
                ))}
              </View>
              {analysis.locations && analysis.locations.length > 0 && (
                <View>
                  <Text style={[s.sectionLabel, { marginBottom: 8 }]}>LOCATIONS</Text>
                  {analysis.locations.slice(0, 4).map((loc: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <Globe size={11} color={SAC.muted} />
                      <Text style={{ color: SAC.text, fontFamily: FONTS.med, fontSize: 12 }}>{[loc.city, loc.country].filter(Boolean).join(', ') || 'Unknown'}</Text>
                      <Text style={{ color: SAC.dim, fontFamily: FONTS.med, fontSize: 10.5 }}>{loc.count} session{loc.count === 1 ? '' : 's'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: SAC.cardSolid, borderWidth: 1, borderColor: SAC.border }}>
      <Icon size={12} color={GRAD_TO} />
      <View>
        <Text style={{ color: SAC.dim, fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>
        <Text style={{ color: SAC.text, fontFamily: FONTS.xbold, fontSize: 13 }}>{value}</Text>
      </View>
    </View>
  );
}

export function PasswordField({ icon: Icon, value, onChange, placeholder, show, onToggle }: {
  icon: any; value: string; onChange: (s: string) => void; placeholder: string;
  show: boolean; onToggle: () => void;
}) {
  return (
    <View style={[s.inputWrap, { paddingLeft: 10 }]}>
      <Icon size={13} color={SAC.muted} />
      <TextInput
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={SAC.dim}
        secureTextEntry={!show}
        autoCapitalize="none" autoCorrect={false}
        style={[s.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingLeft: 8 }]}
      />
      <Pressable onPress={onToggle} style={s.inputIconBtn}>
        {show ? <EyeOff size={14} color={SAC.muted} /> : <Eye size={14} color={SAC.muted} />}
      </Pressable>
    </View>
  );
}

export function prettyAction(a: string) {
  const map: Record<string, string> = {
    'session.login': 'Logged in',
    'session.seen': 'Session recorded',
    'session.revoked': 'Session revoked',
    'session.auto_revoked': 'Session auto-revoked',
    'trusted_device.added': 'Trusted this device',
    'trusted_device.removed': 'Removed trusted device',
    'security.password_changed': 'Changed password',
    'integration.connected': 'Connected integration',
    'integration.disconnected': 'Disconnected integration',
    'college.approved': 'Approved college',
    'payout.processed': 'Processed payout',
  };
  return map[a] || a.replace(/[._]/g, ' ');
}
