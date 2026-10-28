/**
 * /echo/scan/{code} — Public coupon verification page.
 * Phones scan the QR on a coupon/ticket, which encodes the full URL
 * `/echo/scan/{code}`. This page looks up the coupon and shows its
 * live status (valid / locked / used / invalid) on mobile.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Platform, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { XCircle, Ticket, ArrowLeft, CalendarDays, Clock } from '@/src/views/web/portals/student/iconShims';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { getBaseUrl } from '@/src/lib/env';

const API_BASE = getBaseUrl();

export default function EchoScanPage() {
  const { code: rawCode } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading');
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');

  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      setMessage('Missing coupon code');
      return;
    }
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/echo/scan/${encodeURIComponent(code.toUpperCase())}`);
        if (resp.status === 404) {
          setStatus('invalid');
          setMessage('This coupon code was not found.');
          return;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (json && typeof json === 'object') {
          setData(json);
          setStatus('ok');
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Could not connect to the server. Please try again.');
      }
    })();
  }, [code]);

  // Defensive: ensure data is safe to access
  const safeData = status === 'ok' && data ? data : null;
  const used = safeData?.used;
  const locked = safeData?.session_locked;
  const isTicket = safeData?.type === 'ticket';
  const ticketValid = isTicket && safeData?.verified;
  const ticketCheckedIn = isTicket && safeData?.checked_in;

  const isInvalid = status !== 'ok' || !safeData || (isTicket && !ticketValid);

  const iconColor = isInvalid ? '#F87171' : (used || ticketCheckedIn) ? '#34D399' : '#34D399';
  const titleColor = isInvalid ? '#FCA5A5' : '#6EE7B7';
  const statusTitle = isInvalid
    ? (status !== 'ok' ? 'Invalid code' : 'Ticket not confirmed')
    : (isTicket ? (ticketCheckedIn ? 'Already checked in' : 'Valid ticket') : used ? 'Already used' : 'Valid coupon');
  const titleLabel = isTicket
    ? (safeData?.event_title || 'Event ticket')
    : (safeData?.session_name || '');
  const sessionDay = !isTicket && safeData?.session_day ? Number(safeData.session_day) : 0;

  const goToEvent = () => {
    const slug = safeData?.slug;
    if (slug) {
      router.push(`/echo/${slug}`);
    } else {
      router.push('/echo');
    }
  };



  if (status === 'loading') {
    return (
      <SafeAreaView style={s.root}>
        {Platform.OS === 'web' && <EchoHeader />}
        <ScrollView contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? ECHO_TOP_PADDING : 20 }}>
          <View style={[s.content, { alignItems: 'center', paddingVertical: 80 }]}>
            <ActivityIndicator size="large" color="#A78BFA" />
            <Text style={s.centerText}>Verifying coupon…</Text>
          </View>
          {Platform.OS === 'web' && <EchoFooter />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      {Platform.OS === 'web' && <EchoHeader />}
      <ScrollView contentContainerStyle={{ paddingTop: Platform.OS === 'web' ? ECHO_TOP_PADDING : 20 }}>
        <View style={s.content}>
          <Pressable onPress={goToEvent} style={s.backBtn} hitSlop={8}>
            <ArrowLeft size={16} color="#fff" />
            <Text style={s.backText}>Back to event</Text>
          </Pressable>

          <LinearGradient
            colors={isInvalid
              ? ['rgba(239,68,68,0.25)', 'rgba(30,10,80,0.4)', '#0a0f1e']
              : ['rgba(16,185,129,0.25)', 'rgba(30,10,80,0.4)', '#0a0f1e']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.card}
          >
            <View style={[s.statusIcon, { backgroundColor: isInvalid ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.18)' }]}>
              {isInvalid ? (
                <XCircle size={44} color={iconColor} />
              ) : (
                <Ticket size={44} color={iconColor} />
              )}
            </View>

            <Text style={[s.title, { color: titleColor }]}>{statusTitle}</Text>

            {status === 'ok' && safeData && (
              <>
                <Text style={s.sessionName}>{titleLabel}</Text>
                {sessionDay > 0 && (
                  <Text style={[s.sessionName, { fontSize: 12, opacity: 0.7, marginTop: 2 }]}>Day {sessionDay}</Text>
                )}
                {!isTicket ? (
                  <View style={s.codePill}>
                    <Text style={s.codeText}>{safeData.coupon_code || 'N/A'}</Text>
                  </View>
                ) : (
                  <>
                    {safeData.full_name && (
                      <Text style={s.metaText} numberOfLines={1} ellipsizeMode="tail">{safeData.full_name}</Text>
                    )}
                    {safeData.email && (
                      <Text style={s.metaText} numberOfLines={1} ellipsizeMode="tail">{safeData.email}</Text>
                    )}
                  </>
                )}
                <View style={s.metaRow}>
                  <CalendarDays size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={s.metaText}>{safeData.event_name || titleLabel || 'ECHO event'}</Text>
                </View>
                {!isTicket && used && safeData.used_at && (
                  <View style={s.metaRow}>
                    <Clock size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={s.metaText}>Scanned {new Date(safeData.used_at).toLocaleString()}</Text>
                  </View>
                )}
                {isTicket && ticketCheckedIn && safeData.checked_in_at && (
                  <View style={s.metaRow}>
                    <Clock size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={s.metaText}>Checked in {new Date(safeData.checked_in_at).toLocaleString()}</Text>
                  </View>
                )}
              </>
            )}

            {isInvalid && <Text style={s.detailText}>{message || 'This code could not be verified.'}</Text>}
            {status === 'ok' && !isInvalid && (
              <Text style={s.detailText}>
                {isTicket
                  ? (ticketCheckedIn ? 'This attendee has already checked in.' : 'This ticket is confirmed. Proceed to check-in.')
                  : (locked
                      ? 'This session is currently locked. It will be available when the session opens.'
                      : 'This coupon is ready. Proceed to the venue counter.')}
              </Text>
            )}
          </LinearGradient>

          <Pressable onPress={goToEvent} style={s.secondaryBtn}>
            <Text style={s.secondaryBtnText}>View event details</Text>
          </Pressable>
        </View>
        {Platform.OS === 'web' && <EchoFooter />}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f1e' },
  content: { padding: 20, maxWidth: 640, width: '100%', alignSelf: 'center', gap: 16 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  backText: { color: '#fff', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  card: { borderRadius: 18, padding: 28, gap: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statusIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, textAlign: 'center' },
  sessionName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: '#fff', textAlign: 'center' },
  codePill: {
    backgroundColor: 'rgba(124,58,237,0.14)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  codeText: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: '#C4B5FD', letterSpacing: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  detailText: { fontFamily: 'DMSans_500Medium', fontSize: 12.5, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 18 },
  centerText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 10 },
  secondaryBtn: {
    alignItems: 'center', paddingVertical: 13, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)',
  },
  secondaryBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#C4B5FD' },
});
