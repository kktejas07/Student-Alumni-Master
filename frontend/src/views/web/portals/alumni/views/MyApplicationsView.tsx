/**
 * Student → My Applications — lists internship applications.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Briefcase, CheckCircle, Clock } from '../iconShims';
import { SC, FONTS } from '../tokens';
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
    <View className="gap-3.5">
      <View>
        <Text className="text-white font-display-bold text-2xl tracking-tight">My Applications</Text>
        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 }}>{items.length} applications · auto-refreshes every 30s</Text>
      </View>
      <View className="gap-2">
        {items.map((a) => (
          <View key={a.id} className="flex-row items-center gap-3 bg-glass border border-glass-border rounded-xl p-3.5">
            <View className="w-[38px] h-[38px] rounded-[10px] bg-glass-soft border border-glass-border items-center justify-center">
              <Briefcase size={18} color={SC.accentBright} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-white font-body-bold text-[13.5px]">{a.internship_title}</Text>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 }}>{a.company} · applied {a.applied_at ? String(a.applied_at).slice(0, 10) : '—'}</Text>
            </View>
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 }, a.status === 'submitted' ? { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.30)' } : { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)' }]}>
              {a.status === 'submitted' ? <Clock size={11} color="#FBBF24" /> : <CheckCircle size={11} color="#22C55E" />}
              <Text style={{ fontFamily: FONTS.bold, fontSize: 10.5, textTransform: 'capitalize', color: a.status === 'submitted' ? '#FBBF24' : '#22C55E' }}>{a.status}</Text>
            </View>
          </View>
        ))}
        {items.length === 0 && <Text style={{ color: SC.muted, padding: 20, textAlign: 'center', fontFamily: FONTS.med }}>No applications yet. Apply from the Internships view.</Text>}
      </View>
    </View>
  );
}
