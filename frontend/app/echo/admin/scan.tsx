// @ts-nocheck
/**
 * /echo/admin/scan — Admin coupon scanner page.
 * Scan QR codes via camera or enter coupon codes manually.
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ScanLine, Check, X, Camera, Keyboard, Ticket } from 'lucide-react-native';
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
        const { Html5Qrcode } = await import('html5-qrcode');
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
              scanner.stop().catch(() => {});
              onScan(decodedText);
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
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  return (
    <View className="flex-col bg-navy" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}>
      <View className="flex-row items-center justify-between p-4 bg-black/60" style={{ paddingTop: 50 }}>
        <Pressable onPress={onClose} className="w-9 h-9 rounded-full bg-white/15 items-center justify-center">
          <X size={20} color="#fff" />
        </Pressable>
        <Text className="font-body-bold text-base text-white">Scan Coupon QR</Text>
        <View style={{ width: 32 }} />
      </View>
      <View className="flex-1 justify-center items-center">
        <div ref={containerRef} id="qr-reader" style={{ width: '100%' }} />
      </View>
      <View className="flex-row items-center justify-center gap-2 p-4 pb-8 bg-black/60">
        <Camera size={18} color="#A78BFA" />
        <Text className="text-sm text-white/70 font-body-semibold">Point camera at the attendee's coupon QR code</Text>
      </View>
    </View>
  );
}

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

  const submitCode = async (c: string) => {
    const original = (c || '').trim();
    const isTicketPayload = original.startsWith('ECHO:') || original.includes('%3A');
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
      // Entry-pass / ticket payload (ECHO:... or URL-wrapped or bare reg id)
      const isTicketPayload2 = isTicketPayload || raw.startsWith('ECHO:') || /^[a-f0-9]{12}$/i.test(raw);
      if (isTicketPayload) {
        const resp = await fetch(`${base}/api/echo/admin/registrations/verify`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ticket: original }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          setResult({ ok: false, status: 'invalid', message: data?.detail || 'Invalid ticket' });
          setRecent((prev) => [{ ok: false, scannedCode: codeUpper, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
        } else {
          const reg = data.registration || {};
          const result = {
            ok: true,
            type: 'ticket',
            status: data.valid ? (data.checked_in ? 'checked_in' : 'valid') : 'unconfirmed',
            message: data.message || (data.valid ? 'Valid ticket' : 'Ticket not confirmed'),
            coupon: {
              session_name: reg.event_title || 'Event pass',
              attendee_name: reg.full_name || 'Unknown',
              attendee_email: reg.email || '',
              code: reg.id || codeUpper,
              used_at: data.checked_in_at || null,
              verified: data.valid,
              checked_in: data.checked_in,
            },
          };
          setResult(result);
          setRecent((prev) => [{ ...result, scannedCode: codeUpper, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
        }
        return;
      }

      // Coupon code → existing scan-coupon flow
      const resp = await fetch(`${base}/api/echo/admin/scan-coupon`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: codeUpper }),
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
      <View className="flex-1 bg-navy">
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View className="px-5 py-4 max-w-[600px] w-full self-center gap-4 items-center py-20">
            <Text className="text-sm text-white/50 font-body-semibold">Checking access…</Text>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  // Access denied
  if (accessCheck === 'denied') {
    return (
      <View className="flex-1 bg-navy">
        <EchoHeader current="echo" />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View className="px-5 py-4 max-w-[600px] w-full self-center gap-4 items-center py-20">
            <View className="items-center justify-center" style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239,68,68,0.15)' }}>
              <X size={28} color="#EF4444" />
            </View>
            <Text className="font-display-bold text-xl text-rose text-center">Access Denied</Text>
            <Text className="text-sm text-white/50 font-body-semibold text-center max-w-[300px]">
              You need super admin or volunteer access to use the coupon scanner. Contact the event organizer to be added as a volunteer.
            </Text>
            <Pressable onPress={() => router.push('/echo')} className="flex-row items-center gap-1.5 self-start bg-white/5 rounded-full px-3 py-1.5 border border-white/10 mb-1">
              <ArrowLeft size={14} color="#fff" />
              <Text className="text-white text-sm font-body-semibold">Back to ECHO</Text>
            </Pressable>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-navy">
      <EchoHeader current="echo" />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View className="px-5 py-4 max-w-[600px] w-full self-center gap-4">
          <Pressable onPress={() => router.push('/echo')} className="flex-row items-center gap-1.5 self-start bg-white/5 rounded-full px-3 py-1.5 border border-white/10 mb-1">
            <ArrowLeft size={14} color="#fff" />
            <Text className="text-white text-sm font-body-semibold">Back to ECHO</Text>
          </Pressable>

          <LinearGradient colors={['rgba(124,58,237,0.30)', 'rgba(30,10,80,0.5)']} className="rounded-2xl p-6 gap-2.5 items-center border border-violet">
            <View className="w-[52px] h-[52px] rounded-full bg-violet/20 items-center justify-center"><ScanLine size={24} color="#C4B5FD" /></View>
            <Text className="font-display-bold text-2xl text-white">Coupon Scanner</Text>
            <Text className="text-sm text-muted font-body-semibold text-center">Scan QR codes or enter coupon codes manually</Text>
          </LinearGradient>

          {/* Mode selector */}
          <View className="flex-row gap-2.5">
            <Pressable onPress={() => setCameraOpen(true)} className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-violet/15 border border-violet/25">
              <Camera size={18} color="#A78BFA" />
              <Text className="font-body-bold text-base text-violet">Scan with Camera</Text>
            </Pressable>
            <Pressable onPress={() => inputRef.current?.focus()} className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 border border-violet/25">
              <Keyboard size={18} color="#94a3b8" />
              <Text className="font-body-bold text-base text-slate-400">Type Code</Text>
            </Pressable>
          </View>

          {/* Manual input */}
          <View className="flex-row gap-2.5 bg-white/5 rounded-xl border border-violet/20 p-3">
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={setCode}
              placeholder="Enter coupon code (e.g. LUNCH-A7X9K2)"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              onSubmitEditing={handleManualSubmit}
              className="flex-1 bg-white/5 rounded-lg border border-white/5 p-3.5 text-white font-body-bold text-base"
              style={{ letterSpacing: 2, textTransform: 'uppercase' }}
            />
            <Pressable onPress={handleManualSubmit} disabled={loading || !code.trim()} className="flex-row items-center gap-1.5 bg-violet rounded-xl px-5 py-3.5" style={(!code.trim() || loading) ? { opacity: 0.5 } : {}}>
              <ScanLine size={16} color="#fff" />
              <Text className="text-white font-body-bold text-base">{loading ? 'Scanning…' : 'Scan'}</Text>
            </Pressable>
          </View>

          {/* Stats bar */}
          {recent.length > 0 && (
            <View className="flex-row items-center gap-2 py-2 px-3.5 bg-white/5 rounded-xl">
              <View className="flex-row items-center gap-1.5">
                <Ticket size={14} color="#A78BFA" />
                <Text className="text-xs text-white/50 font-body-semibold">{recent.length} scanned</Text>
              </View>
              <View className="w-1.5 h-1.5 rounded-full bg-teal" />
              <Text className="text-xs text-white/50 font-body-semibold">{usedCount} valid</Text>
              <View className="w-1.5 h-1.5 rounded-full bg-rose" />
              <Text className="text-xs text-white/50 font-body-semibold">{failedCount} failed</Text>
            </View>
          )}

          {/* Result */}
          {result && (
            <View className="bg-white/5 rounded-2xl border p-6 items-center gap-2.5" style={{ borderColor: result.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
              <View className="items-center justify-center" style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: result.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {result.ok ? <Check size={28} color="#10B981" /> : <X size={28} color="#EF4444" />}
              </View>
              <Text className="font-display-bold text-lg" style={{ color: result.ok ? '#34D399' : '#FCA5A5' }}>
                {result.ok
                  ? result.type === 'ticket'
                    ? result.status === 'checked_in' ? 'Already Checked In' : result.status === 'valid' ? 'Valid Ticket' : 'Valid Ticket'
                    : 'Valid Coupon'
                  : result.status === 'already_used' ? 'Already Used' : 'Invalid'}
              </Text>
              <Text className="text-sm text-muted font-body-semibold text-center">{result.message}</Text>
              {result.coupon && (
                <View className="mt-2 gap-1">
                  <Text className="text-xs text-white/50 font-body-semibold text-center">
                    {result.type === 'ticket' ? 'Event' : 'Session'}: {result.coupon.session_name}
                  </Text>
                  {result.coupon.session_day && <Text className="text-xs text-white/50 font-body-semibold text-center">Day: {result.coupon.session_day}</Text>}
                  <Text className="text-xs text-white/50 font-body-semibold text-center">Attendee: {result.coupon.attendee_name || '—'}</Text>
                  {result.coupon.attendee_email ? <Text className="text-xs text-white/50 font-body-semibold text-center">Email: {result.coupon.attendee_email}</Text> : null}
                  <Text className="text-xs text-white/50 font-body-semibold text-center">Code: {result.coupon.code}</Text>
                  {result.status === 'checked_in' && result.coupon.used_at && (
                    <Text className="text-xs text-white/50 font-body-semibold text-center">Checked in: {result.coupon.used_at}</Text>
                  )}
                  {result.type === 'ticket' && result.status === 'unconfirmed' && (
                    <Text className="text-xs text-white/50 font-body-semibold text-center">Payment pending — not eligible for check-in</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Recent scans */}
          {recent.length > 0 && (
            <View className="bg-white/5 rounded-xl border border-white/5 p-4 gap-2">
              <Text className="font-body-bold text-sm text-violet mb-1">Recent Scans ({recent.length})</Text>
              {recent.map((r, i) => (
                <View key={i} className="flex-row items-center gap-2.5 py-2 border-b border-white/5 border-l-[3px] pl-2.5" style={{ borderLeftColor: r.ok ? '#10B981' : '#EF4444' }}>
                  <View className="flex-1">
                    <Text className="font-body-bold text-xs text-white">{r.scannedCode} — {r.coupon?.session_name || '?'}</Text>
                    <Text className="text-xs text-white/40 font-body-semibold mt-0.5">{r.coupon?.attendee_name || '—'} • {r.time}</Text>
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
