import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, Check } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData, postPortal } from '@/src/lib/portalApi';

type Ev = { id: string; title: string; date: string; mode: string; city: string; cat: string; attending: number; capacity: number; kind: string; price?: number; accent: string; registered: boolean };
const FALLBACK = { items: [] as Ev[] };

const FILTERS = ['All', 'Free', 'Paid', 'Online', 'Onsite'];

export function EventsView() {
  const { data } = usePortalData<typeof FALLBACK>('/student/events', FALLBACK);
  const EVENTS = data?.items || [];
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('All');
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set());

  const onRSVP = async (id: string) => {
    setRsvpd((p) => new Set(p).add(id));
    try { await postPortal(`/student/events/${id}/rsvp`); } catch {}
  };

  const list = EVENTS.filter((e) => {
    if (filter === 'Free') return e.kind === 'free';
    if (filter === 'Paid') return e.kind === 'paid';
    if (filter === 'Online') return e.mode === 'Online';
    if (filter === 'Onsite') return e.mode !== 'Online';
    return true;
  });

  const cardW = width >= 1100 ? '32%' : width >= 720 ? '48%' : '100%';

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
            <Text style={{ color: filter === f ? '#fff' : SC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.grid}>
        {list.map((e) => {
          const isReg = e.registered || rsvpd.has(e.id);
          return (
            <View key={e.id} style={[s.card, { width: cardW as any }]}>
              <View style={[s.cover, { backgroundColor: e.accent + '22', borderColor: e.accent + '40' }]}>
                <CalIcon size={28} color={e.accent} />
              </View>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Badge label={e.cat} color="purple" />
                  <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'amber'} />
                </View>
                <Text numberOfLines={2} style={s.title}>{e.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <CalIcon size={11} color={SC.muted} />
                  <Text style={s.meta}>{e.date}</Text>
                  <Text style={s.dot}>·</Text>
                  <MapPin size={11} color={SC.muted} />
                  <Text style={s.meta}>{e.city}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <UsersIcon size={11} color={SC.muted} />
                  <Text style={s.meta}>{e.attending} attending</Text>
                </View>
                {isReg ? (
                  <View style={[s.cta, { backgroundColor: SC.green, flexDirection: 'row', gap: 6 }]}>
                    <Check size={14} color="#fff" />
                    <Text style={s.ctaText}>Registered</Text>
                  </View>
                ) : (
                  <Pressable style={s.cta} onPress={() => onRSVP(e.id)}>
                    <Text style={s.ctaText}>{e.kind === 'free' ? 'RSVP' : 'Book seat'}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: SC.primary, borderColor: SC.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cover: { height: 90, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11 },
  dot: { color: SC.dim, fontSize: 11 },
  cta: { marginTop: 12, height: 34, borderRadius: 8, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
});
