// @ts-nocheck
/**
 * /echo/admin/scan — Admin coupon scanner page.
 * Scan QR codes via camera or enter coupon codes manually.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ScanLine, Check, X, Camera, Keyboard, Ticket } from '@/src/views/web/portals/student/iconShims';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';

// ── QR Camera Scanner (html5-qrcode) ────────────────────────────────────────
function QRScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    let scanner: any = null;

    const start = async () => {
      if (!containerRef.current || !mounted) return;
      try {
        if (typeof window === 'undefined') return;
        
        const loadScript = () => {
          return new Promise<void>((resolve, reject) => {
            if ((window as any).Html5Qrcode) {
              resolve();
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load html5-qrcode"));
            document.body.appendChild(script);
          });
        };
        
        await loadScript();
        const Html5Qrcode = (window as any).Html5Qrcode;
        scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (mounted) {
              mounted = false; // Prevent multiple triggers
              setTimeout(() => {
                onScan(decodedText);
              }, 10);
            }
          },
          () => {} // ignore scan failures (no QR in frame)
        );
      } catch (err: any) {
        console.error('QR scanner error:', err);
        if (mounted) onClose();
      }
    };

    start();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current.clear().catch(() => {});
        }).catch(() => {});
      }
    };
  }, []);

  return (
    <View style={qrStyles.overlay}>
      <View style={qrStyles.topBar}>
        <Pressable onPress={onClose} style={qrStyles.closeBtn}>
          <X size={20} color="#fff" />
        </Pressable>
        <Text style={qrStyles.topTitle}>Scan Coupon QR</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={qrStyles.readerWrap}>
        <div ref={containerRef} id="qr-reader" style={{ width: '100%' }} />
      </View>
      <View style={qrStyles.bottomHint}>
        <Camera size={18} color="#A78BFA" />
        <Text style={qrStyles.bottomText}>Point camera at the attendee's coupon QR code</Text>
      </View>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0a0f1e', zIndex: 999, flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingTop: 50, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  readerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottomHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, paddingBottom: 32, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bottomText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EchoScanPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [accessCheck, setAccessCheck] = useState<'loading' | 'ok' | 'denied'>('loading');
  const inputRef = useRef<any>(null);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Access guard — check if user is super_admin or volunteer
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
        const { tokenStore } = await import('@/src/models/services/api');
        const token = await tokenStore.getAccess();
        if (!token) { if (mounted) setAccessCheck('denied'); return; }
        const resp = await fetch(`${base}/api/echo/volunteer/scan-access`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        if (resp.ok) {
          const data = await resp.json();
          setAccessCheck(data.access ? 'ok' : 'denied');
        } else {
          setAccessCheck('denied');
        }
      } catch {
        if (mounted) setAccessCheck('denied');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Request geolocation on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        },
        (err) => console.warn('Geolocation error:', err)
      );
    }
  }, []);

  const submitCode = async (c: string) => {
    const original = (c || '').trim();
    let raw = original;
    const urlMatch = raw.match(/\/echo\/scan\/([A-Za-z0-9-]+)/);
    if (urlMatch) raw = urlMatch[1];
    const codeUpper = raw.toUpperCase();
    if (!codeUpper) return;
    setLoading(true);
    setResult(null);
    const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
    const { tokenStore } = await import('@/src/models/services/api');
    const token = await tokenStore.getAccess();
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    try {
      // Determine if this is a ticket (ECHO: prefix, URL-encoded colon, or bare 12-char hex reg_id)
      const isTicket = original.startsWith('ECHO:') || original.includes('%3A') || /^[a-f0-9]{12}$/i.test(codeUpper);
      const loc = locationRef.current;

      if (isTicket) {
        // Entry-pass / ticket check-in
        const resp = await fetch(`${base}/api/echo/admin/registrations/check-in`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ticket: codeUpper, ...(loc ? { lat: loc.lat, lng: loc.lng } : {}) }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          setResult({ ok: false, status: 'invalid', message: data?.detail || 'Invalid ticket' });
          setRecent((prev) => [{ ok: false, scannedCode: codeUpper, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
        } else {
          const attendee = data.attendee || {};
          const result = {
            ok: true,
            type: 'ticket',
            status: data.first_checkin ? 'valid' : 'checked_in',
            message: data.first_checkin ? 'First check-in successful' : 'Already checked in',
            coupon: {
              session_name: attendee.event_title || 'Event pass',
              attendee_name: attendee.full_name || attendee.name || 'Attendee',
              attendee_email: attendee.email || '',
              code: attendee.id || codeUpper,
              used_at: data.checked_in_at || null,
              verified: true,
              checked_in: true,
            },
          };
          setResult(result);
          setRecent((prev) => [{ ...result, scannedCode: codeUpper, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
        }
        return;
      }

      // Coupon code → scan-coupon flow
      const resp = await fetch(`${base}/api/echo/admin/scan-coupon`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: codeUpper, ...(loc ? { lat: loc.lat, lng: loc.lng } : {}) }),
      });
      const data = await resp.json();
      setResult(data);
      setRecent((prev) => [{ ...data, scannedCode: codeUpper, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    } catch (err: any) {
      setResult({ ok: false, message: err?.message || 'Network error' });
    } finally {
      setLoading(false);
      setCode('');
    }
  };

  const handleManualSubmit = () => {
    submitCode(code);
    inputRef.current?.focus();
  };

  const handleCameraScan = (decoded: string) => {
    setCameraOpen(false);
    submitCode(decoded);
  };

  const usedCount = recent.filter((r) => r.ok).length;
  const failedCount = recent.filter((r) => !r.ok).length;

  // Access guard loading
  if (accessCheck === 'loading') {
    return (
      <View style={s.root}>
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View style={[s.content, { alignItems: 'center', paddingVertical: 80 }]}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Checking access…</Text>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  // Access denied
  if (accessCheck === 'denied') {
    return (
      <View style={s.root}>
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View style={[s.content, { alignItems: 'center', paddingVertical: 80, gap: 16 }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={28} color="#EF4444" />
            </View>
            <Text style={{ fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: '#FCA5A5', textAlign: 'center' }}>Access Denied</Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 300 }}>
              You need super admin or volunteer access to use the coupon scanner. Contact the event organizer to be added as a volunteer.
            </Text>
            <Pressable onPress={() => router.push('/echo')} style={s.backBtn}>
              <ArrowLeft size={14} color="#fff" />
              <Text style={s.backText}>Back to ECHO</Text>
            </Pressable>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <EchoHeader current="echo" />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View style={s.content}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
            <Pressable onPress={() => router.push('/echo')} style={[s.backBtn, { marginBottom: 0 }]}>
              <ArrowLeft size={14} color="#fff" />
              <Text style={s.backText}>Back to ECHO</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/admin/echo')} style={[s.backBtn, { marginBottom: 0 }]}>
              <Text style={s.backText}>Superadmin Dashboard</Text>
            </Pressable>
          </View>
          <LinearGradient colors={['rgba(124,58,237,0.30)', 'rgba(30,10,80,0.5)']} style={s.header}>
            <View style={s.headerIcon}><ScanLine size={24} color="#C4B5FD" /></View>
            <Text style={s.headerTitle}>Coupon Scanner</Text>
            <Text style={s.headerSub}>Scan QR codes or enter coupon codes manually</Text>
          </LinearGradient>

          {/* Mode selector */}
          <View style={s.modeRow}>
            <Pressable onPress={() => setCameraOpen(true)} style={s.modeBtn}>
              <Camera size={18} color="#A78BFA" />
              <Text style={s.modeBtnText}>Scan with Camera</Text>
            </Pressable>
            <Pressable onPress={() => inputRef.current?.focus()} style={[s.modeBtn, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
              <Keyboard size={18} color="#94a3b8" />
              <Text style={[s.modeBtnText, { color: '#94a3b8' }]}>Type Code</Text>
            </Pressable>
          </View>

          {/* Manual input */}
          <View style={s.inputCard}>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={setCode}
              placeholder="Enter coupon code (e.g. LUNCH-A7X9K2)"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              onSubmitEditing={handleManualSubmit}
              style={s.input}
            />
            <Pressable onPress={handleManualSubmit} disabled={loading || !code.trim()} style={[s.scanBtn, (!code.trim() || loading) && { opacity: 0.5 }]}>
              <ScanLine size={16} color="#fff" />
              <Text style={s.scanBtnText}>{loading ? 'Scanning…' : 'Scan'}</Text>
            </Pressable>
          </View>

          {/* Stats bar */}
          {recent.length > 0 && (
            <View style={s.statsBar}>
              <View style={s.statItem}>
                <Ticket size={14} color="#A78BFA" />
                <Text style={s.statText}>{recent.length} scanned</Text>
              </View>
              <View style={[s.statDot, { backgroundColor: '#10B981' }]} />
              <Text style={s.statText}>{usedCount} valid</Text>
              <View style={[s.statDot, { backgroundColor: '#EF4444' }]} />
              <Text style={s.statText}>{failedCount} failed</Text>
            </View>
          )}

          {/* Result */}
          {result && (
            <View style={[s.resultCard, { borderColor: (result.ok !== false) ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}>
              <View style={[s.resultIcon, { backgroundColor: (result.ok !== false) ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                {(result.ok !== false) ? <Check size={28} color="#10B981" /> : <X size={28} color="#EF4444" />}
              </View>
              <Text style={[s.resultTitle, { color: (result.ok !== false) ? '#34D399' : '#FCA5A5' }]}>
                {(result.ok !== false)
                  ? result.type === 'ticket'
                    ? result.status === 'checked_in' ? 'Already Checked In' : 'Valid Ticket'
                    : 'Valid Coupon'
                  : result.status === 'already_used' ? 'Already Used' : result.status === 'locked' ? 'Session Locked' : 'Invalid'}
              </Text>
              <Text style={s.resultMsg}>{result.message || 'No details available'}</Text>
              {result.coupon && (
                <View style={s.resultDetails}>
                  <Text style={s.resultDetail}>
                    {result.type === 'ticket' ? 'Event' : 'Session'}: {result.coupon.session_name}
                  </Text>
                  {result.coupon.session_day && <Text style={s.resultDetail}>Day: {result.coupon.session_day}</Text>}
                  <Text style={s.resultDetail}>Attendee: {result.coupon.attendee_name || '—'}</Text>
                  {result.coupon.attendee_email ? <Text style={s.resultDetail}>Email: {result.coupon.attendee_email}</Text> : null}
                  <Text style={s.resultDetail}>Code: {result.coupon.code}</Text>
                  {result.status === 'checked_in' && result.coupon.used_at && (
                    <Text style={s.resultDetail}>Checked in: {result.coupon.used_at}</Text>
                  )}
                  {result.type === 'ticket' && result.status === 'unconfirmed' && (
                    <Text style={s.resultDetail}>Payment pending — not eligible for check-in</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Recent scans */}
          {recent.length > 0 && (
            <View style={s.recentCard}>
              <Text style={s.recentTitle}>Recent Scans ({recent.length})</Text>
              {recent.map((r, i) => (
                <View key={i} style={[s.recentRow, { borderLeftColor: r.ok ? '#10B981' : '#EF4444' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recentCode}>{r.scannedCode} — {r.coupon?.session_name || '?'}</Text>
                    <Text style={s.recentInfo}>{r.coupon?.attendee_name || '—'} • {r.time}</Text>
                  </View>
                  {r.ok ? <Check size={14} color="#10B981" /> : <X size={14} color="#EF4444" />}
                </View>
              ))}
            </View>
          )}
        </View>
        <EchoFooter />
      </ScrollView>

      {/* Camera QR scanner overlay */}
      {cameraOpen && (
        <QRScanner onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f1e' },
  content: { padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center', gap: 16 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 4,
  },
  backText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  header: { borderRadius: 18, padding: 24, gap: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  headerIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: '#fff' },
  headerSub: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
  },
  modeBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#C4B5FD' },
  inputCard: {
    flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', padding: 12,
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14,
    color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 16, letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED',
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14,
  },
  scanBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  statsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
    paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1,
    padding: 24, alignItems: 'center', gap: 10,
  },
  resultIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  resultMsg: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  resultDetails: { marginTop: 8, gap: 4 },
  resultDetail: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  recentCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, gap: 8 },
  recentTitle: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: '#A78BFA', marginBottom: 4 },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 3, paddingLeft: 10,
  },
  recentCode: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#fff' },
  recentInfo: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
});
