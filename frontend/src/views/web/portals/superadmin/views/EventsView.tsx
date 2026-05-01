import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, IndianRupee } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Ev = { id: string; title: string; date: string; mode: string; city: string; cat: string; attending: number; capacity: number; status: string; kind: string; price?: number; accent: string };
const FALLBACK = { items: [] as Ev[] };

const FILTERS = ['All', 'Live', 'Pending', 'Free', 'Paid'];

export function EventsView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/events', FALLBACK);
  const EVENTS = data?.items || [];
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('All');
  const list = EVENTS.filter((e) => {
    if (filter === 'Live') return e.status === 'live';
    if (filter === 'Pending') return e.status === 'pending';
    if (filter === 'Free') return e.kind === 'free';
    if (filter === 'Paid') return e.kind === 'paid';
    return true;
  });
  const cardW = width >= 1280 ? '32%' : width >= 760 ? '48%' : '100%';

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
            <Text style={{ color: filter === f ? '#fff' : SAC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.grid}>
        {list.map((e) => {
          const pct = Math.min(100, Math.round((e.attending / e.capacity) * 100));
          return (
            <View key={e.id} style={[s.card, { width: cardW as any }]}>
              <View style={[s.cover, { backgroundColor: e.accent + '22', borderColor: e.accent + '40' }]}>
                <CalIcon size={28} color={e.accent} />
              </View>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Badge label={e.cat} color="purple" />
                  {e.status === 'pending'
                    ? <Badge label="PENDING APPROVAL" color="amber" />
                    : <Badge label={e.kind === 'free' ? 'FREE' : '₹' + e.price} color={e.kind === 'free' ? 'green' : 'orange'} />
                  }
                </View>
                <Text numberOfLines={2} style={s.title}>{e.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <CalIcon size={11} color={SAC.muted} />
                  <Text style={s.meta}>{e.date}</Text>
                  <Text style={s.dot}>·</Text>
                  <MapPin size={11} color={SAC.muted} />
                  <Text style={s.meta}>{e.city}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <UsersIcon size={11} color={SAC.muted} />
                  <Text style={s.meta}>{e.attending}/{e.capacity} attending</Text>
                </View>
                <View style={s.barTrack}><View style={[s.barFill, { width: `${pct}%` as any }]} /></View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
                  {e.status === 'pending'
                    ? <Pressable style={s.cta}><Text style={s.ctaText}>Review & approve</Text></Pressable>
                    : <Pressable style={s.cta}><Text style={s.ctaText}>Manage event</Text></Pressable>
                  }
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SAC.card, borderWidth: 1, borderColor: SAC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: SAC.primary, borderColor: SAC.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cover: { height: 90, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 },
  meta: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 11 },
  dot: { color: SAC.dim, fontSize: 11 },
  barTrack: { marginTop: 10, height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: SAC.primary, borderRadius: 3 },
  cta: { flex: 1, height: 34, borderRadius: 8, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
});
