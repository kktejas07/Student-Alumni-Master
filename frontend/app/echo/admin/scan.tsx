// @ts-nocheck
/**
 * /echo/admin/scan — Admin coupon scanner page.
 * Scan QR codes or enter coupon codes manually.
 */
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ScanLine, Check, X, Ticket, Clock, Users } from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';

export default function EchoScanPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const inputRef = useRef<any>(null);

  const scan = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setLoading(true);
    setResult(null);
    try {
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL as string) || '';
      const { tokenStore } = await import('@/src/models/services/api');
      const token = await tokenStore.getAccess();
      const resp = await fetch(`${base}/api/echo/admin/scan-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code: c }),
      });
      const data = await resp.json();
      setResult(data);
      setRecent((prev) => [{ ...data, scannedCode: c, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
    } catch (err: any) {
      setResult({ ok: false, message: err?.message || 'Network error' });
    } finally {
      setLoading(false);
      setCode('');
      inputRef.current?.focus();
    }
  };

  return (
    <View style={s.root}>
      <EchoHeader current="echo" />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View style={s.content}>
          <Pressable onPress={() => router.push('/echo')} style={s.backBtn}>
            <ArrowLeft size={14} color="#fff" />
            <Text style={s.backText}>Back to ECHO</Text>
          </Pressable>

          <LinearGradient colors={['rgba(124,58,237,0.30)', 'rgba(30,10,80,0.5)']} style={s.header}>
            <View style={s.headerIcon}><ScanLine size={24} color="#C4B5FD" /></View>
            <Text style={s.headerTitle}>Coupon Scanner</Text>
            <Text style={s.headerSub}>Scan QR codes or enter coupon codes manually</Text>
          </LinearGradient>

          {/* Input */}
          <View style={s.inputCard}>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={setCode}
              placeholder="Enter coupon code (e.g. LUNCH-A7X9K2)"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              onSubmitEditing={scan}
              style={s.input}
            />
            <Pressable onPress={scan} disabled={loading || !code.trim()} style={[s.scanBtn, (!code.trim() || loading) && { opacity: 0.5 }]}>
              <ScanLine size={16} color="#fff" />
              <Text style={s.scanBtnText}>{loading ? 'Scanning…' : 'Scan'}</Text>
            </Pressable>
          </View>

          {/* Result */}
          {result && (
            <View style={[s.resultCard, { borderColor: result.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}>
              <View style={[s.resultIcon, { backgroundColor: result.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                {result.ok ? <Check size={28} color="#10B981" /> : <X size={28} color="#EF4444" />}
              </View>
              <Text style={[s.resultTitle, { color: result.ok ? '#34D399' : '#FCA5A5' }]}>
                {result.ok ? 'Valid Coupon' : result.status === 'already_used' ? 'Already Used' : 'Invalid'}
              </Text>
              <Text style={s.resultMsg}>{result.message}</Text>
              {result.coupon && (
                <View style={s.resultDetails}>
                  <Text style={s.resultDetail}>Session: {result.coupon.session_name}</Text>
                  <Text style={s.resultDetail}>Attendee: {result.coupon.attendee_name || '—'}</Text>
                  <Text style={s.resultDetail}>Code: {result.coupon.code}</Text>
                  {result.coupon.used_at && <Text style={s.resultDetail}>Scanned: {result.coupon.used_at}</Text>}
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
