/**
 * Student → My Applications — lists internship applications.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Briefcase, CheckCircle, Clock } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { EmptyState } from '../EmptyState';
import { usePortalData } from '@/src/lib/portalApi';
import { useCurrentUser } from '@/src/lib/useCurrentUser';

type App = { id: string; internship_title: string; company: string; status: string; applied_at: string };

export function MyApplicationsView() {
  const { email } = useCurrentUser('booked1@persona.demo');
  const { data } = usePortalData<{ items: App[]; count: number }>(
    `/student/my-applications?email=${encodeURIComponent(email)}`,
    { items: [], count: 0 },
    30_000
  );
  const items = data?.items || [];

  return (
    <View style={{ gap: 14 }}>
      <View>
        <Text style={s.h1}>My Applications</Text>
        <Text style={s.sub}>{items.length} applications · auto-refreshes every 30s</Text>
      </View>
      <View style={{ gap: 8 }}>
        {items.map((a) => (
          <View key={a.id} style={s.row}>
            <View style={s.iconBox}><Briefcase size={18} color={SC.accentBright} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>{a.internship_title}</Text>
              <Text style={s.meta}>{a.company} · applied {a.applied_at ? String(a.applied_at).slice(0, 10) : '—'}</Text>
            </View>
            <View style={[s.statusPill, a.status === 'submitted' ? s.statusPending : s.statusOk]}>
              {a.status === 'submitted' ? <Clock size={11} color="#FBBF24" /> : <CheckCircle size={11} color="#22C55E" />}
              <Text style={[s.statusText, { color: a.status === 'submitted' ? '#FBBF24' : '#22C55E' }]}>{a.status}</Text>
            </View>
          </View>
        ))}
        {items.length === 0 && (
          <EmptyState
            variant="applications"
            title="No applications yet"
            body="Once you hit Apply on an internship, you'll see its progress, status, and recruiter feedback right here."
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.30)' },
  statusOk: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)' },
  statusText: { fontFamily: FONTS.bold, fontSize: 10.5, textTransform: 'capitalize' },
  empty: { color: SC.muted, padding: 20, textAlign: 'center', fontFamily: FONTS.med },
});
