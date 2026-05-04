/**
 * Student → My Bookings — lists confirmed mentor sessions for the active student.
 * Polls every 30s; supports cancel inline.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Calendar, Clock, X, User } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { usePortalData } from '@/src/lib/portalApi';
import { useCurrentUser } from '@/src/lib/useCurrentUser';

type Booking = {
  id: string; topic: string; mentor_name: string; mentor_email: string;
  scheduled_at: string; duration_minutes: number; amount_paid: number; status: string;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return 'TBD';
  try { return String(iso).slice(0, 16).replace('T', ' '); } catch { return 'TBD'; }
}

export function MyBookingsView() {
  const { email } = useCurrentUser('booked1@persona.demo');
  const { data, refresh } = usePortalData<{ items: Booking[]; count: number }>(
    `/student/my-bookings?email=${encodeURIComponent(email)}`,
    { items: [], count: 0 },
    30_000
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cancel = async (id: string) => {
    try {
      setCancellingId(id);
      const base = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
      await fetch(`${base}/api/student/bookings/${id}`, { method: 'DELETE' });
      refresh();
    } finally { setCancellingId(null); }
  };

  const items = data?.items || [];
  const upcoming = items.filter((b) => b.status === 'confirmed');
  const cancelled = items.filter((b) => b.status === 'cancelled');

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.h1}>My Bookings</Text>
        <Text style={s.sub}>Mentor sessions for {email} · auto-refreshes every 30s</Text>
      </View>

      <Section title={`Upcoming (${upcoming.length})`}>
        {upcoming.map((b) => {
          const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
          return (
          <View key={b.id} style={s.card}>
            <View style={s.iconBox}><Calendar size={18} color={SC.accentBright} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.topic}>{b.topic || 'Session'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                <User size={11} color={SC.muted} />
                <Text style={s.meta}>{b.mentor_name || 'Mentor'}</Text>
                <Text style={s.dot}>·</Text>
                <Clock size={11} color={SC.muted} />
                <Text style={s.meta}>{fmtDate(b.scheduled_at)} · {b.duration_minutes || 45}min</Text>
              </View>
              {b.amount_paid != null && (
                <Text style={s.amount}>₹{Number(b.amount_paid).toLocaleString()} paid</Text>
              )}
            </View>
            <Pressable
              onPress={() => cancel(b.id)}
              disabled={cancellingId === b.id}
              style={({ hovered }: any) => [s.cancelBtn, hovered && { backgroundColor: '#EF444422' }, cancellingId === b.id && { opacity: 0.5 }]}
            >
              <X size={12} color="#EF4444" />
              <Text style={s.cancelText}>{cancellingId === b.id ? 'Cancelling…' : 'Cancel'}</Text>
            </Pressable>
          </View>
          );
        })}
        {upcoming.length === 0 && <Text style={s.empty}>No upcoming bookings.</Text>}
      </Section>

      {cancelled.length > 0 && (
        <Section title={`Cancelled (${cancelled.length})`}>
          {cancelled.map((b) => {
            const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
            return (
            <View key={b.id} style={[s.card, { opacity: 0.55 }]}>
              <View style={[s.iconBox, { backgroundColor: '#EF444422' }]}><X size={16} color="#EF4444" /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.topic}>{b.topic || 'Session'}</Text>
                <Text style={s.meta}>{b.mentor_name || 'Mentor'} · {when ? when.toLocaleDateString() : 'TBD'}</Text>
              </View>
            </View>
            );
          })}
        </Section>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  sectionTitle: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topic: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  dot: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11 },
  amount: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12, marginTop: 4 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8, borderColor: '#EF444466', borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  cancelText: { color: '#EF4444', fontFamily: FONTS.bold, fontSize: 11.5 },
  empty: { color: SC.muted, padding: 16, textAlign: 'center', fontFamily: FONTS.med },
});
