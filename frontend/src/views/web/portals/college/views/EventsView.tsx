import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Calendar as CalIcon, Plus } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

type Ev = {
  id: string;
  title: string;
  date: string;
  mode: string;
  city: string;
  cat: string;
  attending: number;
  capacity: number;
  accent: string;
  price?: number | null;
};
const FALLBACK = { items: [] as Ev[] };

export function EventsView({ onNavigate }: { onNavigate?: (id: any) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const collegeName = user?.college_info?.institution_name || user?.school_info?.institution_name || '';
  const path = collegeName ? `/college/events?college_name=${encodeURIComponent(collegeName)}` : '/college/events';
  const { data } = usePortalData<typeof FALLBACK>(path, FALLBACK);
  const events = data?.items || [];
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 16 }}>All Events ({events.length})</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={s.cta} onPress={() => onNavigate?.('create-event')}>
          <Plus size={14} color="#fff" />
          <Text style={s.ctaText}>Create Event</Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {events.map((e) => (
          <View key={e.id} style={[s.card, { flexGrow: 1, flexBasis: 300, maxWidth: 360 }]}>
            <View style={[s.icon, { backgroundColor: e.accent + '20', borderColor: e.accent + '40' }]}><CalIcon size={20} color={e.accent} /></View>
            <Text numberOfLines={2} style={s.title}>{e.title}</Text>
            <Text style={s.date}>{e.date} · {e.mode}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}><Badge label={`${e.attending} attending`} color="cyan" /></View>
            <Pressable
              style={s.manage}
              onPress={() => router.push({
                pathname: `/manage-event/${e.id}` as any,
                params: {
                  id: e.id,
                  title: e.title,
                  start_date: e.date,
                  venue: e.city || 'Online',
                  registration_deadline: e.date,
                  category: e.cat || 'Workshop',
                  organizer: 'Institution Partner',
                  image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400',
                  url: '',
                  tags: 'Networking,Career,Academic',
                  price: e.price !== undefined && e.price !== null ? String(e.price) : '',
                }
              })}
            >
              <Text style={s.manageText}>Manage →</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  cta: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 34, borderRadius: 10, backgroundColor: CC.primary },
  ctaText: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  icon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 },
  date: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },
  manage: { marginTop: 12, height: 32, borderRadius: 8, backgroundColor: CC.card, borderWidth: 1, borderColor: CC.border2, alignItems: 'center', justifyContent: 'center' },
  manageText: { color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 12 },
});
