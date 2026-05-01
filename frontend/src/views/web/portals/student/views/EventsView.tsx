import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon } from 'lucide-react-native';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const EVENTS = [
  { id: 1, title: 'HackIndia 2026',                date: 'May 10–12', mode: 'Hybrid', city: 'Bengaluru', kind: 'free' as const, attending: 1240, accent: '#A78BFA', cat: 'Hackathon' },
  { id: 2, title: 'DSA Championship S4',           date: 'May 15',    mode: 'Online', city: 'Online',    kind: 'free' as const, attending: 720,  accent: '#34D399', cat: 'Competition' },
  { id: 3, title: 'System Design Masterclass',     date: 'May 18',    mode: 'Online', city: 'Online',    kind: 'paid' as const, price: 499, attending: 180,  accent: '#FCD34D', cat: 'Workshop' },
  { id: 4, title: 'Google AMA: Intern Pathways',   date: 'May 22',    mode: 'Online', city: 'Online',    kind: 'free' as const, attending: 2840, accent: '#4285F4', cat: 'AMA' },
  { id: 5, title: 'Tech Fest 2026',                 date: 'May 5–7',   mode: 'Onsite', city: "St. Xavier's", kind: 'free' as const, attending: 240,  accent: '#22D3EE', cat: 'Fest' },
  { id: 6, title: 'Resume Review by Top Recruiters',date: 'May 25',    mode: 'Online', city: 'Online',    kind: 'paid' as const, price: 299, attending: 88,   accent: '#EC4899', cat: 'Career' },
];

const FILTERS = ['All', 'Free', 'Paid', 'Online', 'Onsite'];

export function EventsView() {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('All');

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
        {list.map((e) => (
          <Pressable key={e.id} style={[s.card, { width: cardW as any }]}>
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
              <Pressable style={s.cta}><Text style={s.ctaText}>{e.kind === 'free' ? 'RSVP' : 'Book seat'}</Text></Pressable>
            </View>
          </Pressable>
        ))}
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
