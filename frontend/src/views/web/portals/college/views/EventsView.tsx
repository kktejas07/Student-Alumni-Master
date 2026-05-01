import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Calendar as CalIcon, Plus } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Ev = { id: string; title: string; date: string; mode: string; city: string; cat: string; attending: number; capacity: number; accent: string };
const FALLBACK = { items: [] as Ev[] };

export function EventsView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/events', FALLBACK);
  const events = data?.items || [];
  const { width } = useWindowDimensions();
  const cardW = width >= 1100 ? '32%' : width >= 720 ? '48%' : '100%';
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 }}>All Events ({events.length})</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={s.cta}><Plus size={14} color="#fff" /><Text style={s.ctaText}>Create Event</Text></Pressable>
      </View>
      <View style={s.grid}>
        {events.map((e) => (
          <View key={e.id} style={[s.card, { width: cardW as any }]}>
            <View style={[s.icon, { backgroundColor: e.accent + '20', borderColor: e.accent + '40' }]}><CalIcon size={20} color={e.accent} /></View>
            <Text numberOfLines={2} style={s.title}>{e.title}</Text>
            <Text style={s.date}>{e.date} · {e.mode}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}><Badge label={`${e.attending} attending`} color="cyan" /></View>
            <Pressable style={s.manage}><Text style={s.manageText}>Manage →</Text></Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  cta: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 34, borderRadius: 10, backgroundColor: CC.primary },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  icon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 },
  date: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },
  manage: { marginTop: 12, height: 32, borderRadius: 8, backgroundColor: CC.card, borderWidth: 1, borderColor: CC.border2, alignItems: 'center', justifyContent: 'center' },
  manageText: { color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 12 },
});
