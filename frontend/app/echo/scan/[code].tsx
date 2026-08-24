/**
 * /echo/scan/{code} — Public coupon verification page.
 * Phones scan the QR on a coupon/ticket, which encodes the full URL
 * `/echo/scan/{code}`. This page looks up the coupon and shows its
 * live status (valid / locked / used / invalid) on mobile.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { XCircle, Ticket, ArrowLeft, CalendarDays, Clock } from 'lucide-react-native';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://studentalumni.ai';

export default function EchoScanPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'invalid' | 'error'>('loading');
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState('');

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
        setData(json);
        setStatus('ok');
      } catch {
        setStatus('error');
        setMessage('Could not connect to the server. Please try again.');
      }
    })();
  }, [code]);

  const used = data?.used;
  const locked = data?.session_locked;
  const isTicket = data?.type === 'ticket';
  const ticketValid = isTicket && data?.verified;
  const ticketCheckedIn = isTicket && data?.checked_in;
  const invalid = isTicket ? !data?.verified : undefined;

  const goToEvent = () => {
    if (data?.slug) {
      router.push(`/echo/${data.slug}`);
    } else {
      router.push('/echo');
    }
  };

  if (status === 'loading') {
    return (
      <View className="flex-1 bg-navy">
        <EchoHeader />
        <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
          <View className="px-5 py-4 max-w-[640px] w-full self-center gap-4 items-center py-20">
            <ActivityIndicator size="large" color="#A78BFA" />
            <Text className="text-sm text-muted font-body-semibold mt-2.5">Verifying coupon…</Text>
          </View>
          <EchoFooter />
        </ScrollView>
      </View>
    );
  }

  const isInvalid = status !== 'ok' || (isTicket && !ticketValid);

  const iconColor = isInvalid ? '#F87171' : (used || ticketCheckedIn) ? '#34D399' : '#34D399';
  const titleColor = isInvalid ? '#FCA5A5' : '#6EE7B7';
  const statusTitle = isInvalid
    ? (status !== 'ok' ? 'Invalid code' : 'Ticket not confirmed')
    : (isTicket ? (ticketCheckedIn ? 'Already checked in' : 'Valid ticket') : used ? 'Already used' : 'Valid coupon');
  const titleLabel = isTicket
    ? (data?.event_title || 'Event ticket')
    : (data?.session_name || '');
  const sessionDay = !isTicket && data?.session_day ? Number(data.session_day) : 0;

  return (
    <View className="flex-1 bg-navy">
      <EchoHeader />
      <ScrollView contentContainerStyle={{ paddingTop: ECHO_TOP_PADDING }}>
        <View className="px-5 py-4 max-w-[640px] w-full self-center gap-4">
          <Pressable onPress={goToEvent} className="flex-row items-center gap-1.5 self-start bg-white/5 rounded-full px-3 py-1.5 border border-white/10" hitSlop={8}>
            <ArrowLeft size={16} color="#fff" />
            <Text className="text-white text-sm font-body-semibold">Back to event</Text>
          </Pressable>

          <LinearGradient
            colors={isInvalid
              ? ['rgba(239,68,68,0.25)', 'rgba(30,10,80,0.4)', '#0a0f1e']
              : ['rgba(16,185,129,0.25)', 'rgba(30,10,80,0.4)', '#0a0f1e']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            className="rounded-2xl p-7 gap-3 items-center border border-white/5"
          >
            <View className="items-center justify-center" style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: isInvalid ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.18)' }}>
              {isInvalid ? (
                <XCircle size={44} color={iconColor} />
              ) : (
                <Ticket size={44} color={iconColor} />
              )}
            </View>

            <Text className="font-display-bold text-2xl text-center" style={{ color: titleColor }}>{statusTitle}</Text>

            {status === 'ok' && (
              <>
                <Text className="font-display-bold text-base text-white text-center">{titleLabel}</Text>
                {sessionDay > 0 && (
                  <Text className="font-display-bold text-xs text-white opacity-70 text-center mt-0.5">Day {sessionDay}</Text>
                )}
                {!isTicket ? (
                  <View className="bg-violet/14 rounded-xl px-4 py-2 border border-violet/30">
                    <Text className="font-body-bold text-base text-violet" style={{ letterSpacing: 2 }}>{data.coupon_code}</Text>
                  </View>
                ) : (                  <>
                    {data.full_name && (
                      <Text className="text-xs text-muted font-body-semibold text-center" numberOfLines={1} ellipsizeMode="tail">{data.full_name}</Text>
                    )}
                    {data.email && (
                      <Text className="text-xs text-muted font-body-semibold text-center" numberOfLines={1} ellipsizeMode="tail">{data.email}</Text>
                    )}
                  </>
                )}
                <View className="flex-row items-center gap-1.5">
                  <CalendarDays size={14} color="rgba(255,255,255,0.5)" />
                  <Text className="text-xs text-muted font-body-semibold text-center">{data.event_name || titleLabel || 'ECHO event'}</Text>
                </View>
                {!isTicket && used && data.used_at && (
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={14} color="rgba(255,255,255,0.5)" />
                    <Text className="text-xs text-muted font-body-semibold text-center">Scanned {new Date(data.used_at).toLocaleString()}</Text>
                  </View>
                )}
                {isTicket && ticketCheckedIn && data.checked_in_at && (
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={14} color="rgba(255,255,255,0.5)" />
                    <Text className="text-xs text-muted font-body-semibold text-center">Checked in {new Date(data.checked_in_at).toLocaleString()}</Text>
                  </View>
                )}
              </>
            )}

            {isInvalid && <Text className="text-xs text-muted font-body-semibold text-center" style={{ lineHeight: 18 }}>{message}</Text>}
            {status === 'ok' && !isInvalid && (
              <Text className="text-xs text-muted font-body-semibold text-center" style={{ lineHeight: 18 }}>
                {isTicket
                  ? (ticketCheckedIn ? 'This attendee has already checked in.' : 'This ticket is confirmed. Proceed to check-in.')
                  : (locked
                      ? 'This session is currently locked. It will be available when the session opens.'
                      : 'This coupon is ready. Proceed to the venue counter.')}
              </Text>
            )}
          </LinearGradient>

          <Pressable onPress={goToEvent} className="items-center py-3.5 rounded-xl bg-white/5 border border-violet/25">
            <Text className="font-body-bold text-base text-violet">View event details</Text>
          </Pressable>
        </View>
        <EchoFooter />
      </ScrollView>
    </View>
  );
}
