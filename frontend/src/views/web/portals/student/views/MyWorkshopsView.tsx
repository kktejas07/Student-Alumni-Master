/**
 * Student → My Workshops — registered + completed workshops.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Linking } from 'react-native';
import { GraduationCap, CheckCircle, Award, ExternalLink } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { usePortalData } from '@/src/lib/portalApi';
import { useCurrentUser } from '@/src/lib/useCurrentUser';

type WS = {
  id: string; title: string; fee_inr: number; weeks: number; status: string;
  completed_at?: string; certificate_url?: string; registered_at: string;
};

export function MyWorkshopsView() {
  const { email } = useCurrentUser('workshop1@persona.demo');
  const { data } = usePortalData<{ items: WS[]; count: number }>(
    `/student/my-workshops?email=${encodeURIComponent(email)}`,
    { items: [], count: 0 },
    30_000
  );
  const items = data?.items || [];
  const completed = items.filter((w) => w.status === 'completed');
  const ongoing = items.filter((w) => w.status !== 'completed');

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.h1}>My Workshops</Text>
        <Text style={s.sub}>{items.length} total · {completed.length} completed · auto-refreshes every 30s</Text>
      </View>

      <Section title={`Ongoing (${ongoing.length})`}>
        {ongoing.map((w) => (
          <View key={w.id} style={s.row}>
            <View style={s.iconBox}><GraduationCap size={18} color={SC.accentBright} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>{w.title}</Text>
              <Text style={s.meta}>{w.weeks}-week program · ₹{Number(w.fee_inr || 0).toLocaleString()} · enrolled {w.registered_at ? String(w.registered_at).slice(0, 10) : '—'}</Text>
            </View>
            <View style={[s.statusPill, s.statusPending]}>
              <Text style={[s.statusText, { color: '#FBBF24' }]}>In progress</Text>
            </View>
          </View>
        ))}
        {ongoing.length === 0 && <Text style={s.empty}>No ongoing workshops.</Text>}
      </Section>

      <Section title={`Completed (${completed.length})`}>
        {completed.map((w) => (
          <View key={w.id} style={s.row}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)' }]}>
              <CheckCircle size={18} color="#22C55E" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>{w.title}</Text>
              <Text style={s.meta}>Completed {w.completed_at ? String(w.completed_at).slice(0, 10) : '—'} · {w.weeks} weeks</Text>
            </View>
            {w.certificate_url && (
              <Pressable
                onPress={() => Linking.openURL(w.certificate_url!)}
                style={({ hovered }: any) => [s.certBtn, hovered && { backgroundColor: SC.cardH }]}
              >
                <Award size={12} color="#FCD34D" />
                <Text style={s.certText}>Certificate</Text>
                <ExternalLink size={11} color="#FCD34D" />
              </Pressable>
            )}
          </View>
        ))}
        {completed.length === 0 && <Text style={s.empty}>No workshops completed yet.</Text>}
      </Section>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.30)' },
  statusText: { fontFamily: FONTS.bold, fontSize: 10.5 },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  certText: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11.5 },
  empty: { color: SC.muted, padding: 16, textAlign: 'center', fontFamily: FONTS.med },
});
