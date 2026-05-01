import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, IndianRupee } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Badge } from '../atoms';

const EVENTS = [
  { id:1, title:'HackIndia 2026',                  date:'May 10–12', mode:'Hybrid', city:'Bengaluru',  cat:'Hackathon',  attending:1240, capacity:2000, status:'live'    as const, kind:'free' as const, accent:'#A78BFA' },
  { id:2, title:'DSA Championship S4',             date:'May 15',    mode:'Online', city:'Online',     cat:'Competition',attending:720,  capacity:1500, status:'live'    as const, kind:'free' as const, accent:'#22C55E' },
  { id:3, title:'System Design Masterclass',       date:'May 18',    mode:'Online', city:'Online',     cat:'Workshop',   attending:180,  capacity:300,  status:'live'    as const, kind:'paid' as const, price:499, accent:'#FCD34D' },
  { id:4, title:'Google AMA: Intern Pathways',     date:'May 22',    mode:'Online', city:'Online',     cat:'AMA',        attending:2840, capacity:5000, status:'live'    as const, kind:'free' as const, accent:'#3B82F6' },
  { id:5, title:'Ahmedabad Tech Fest 2026',         date:'Jun 1–3',   mode:'Onsite', city:'Ahmedabad',  cat:'Fest',       attending:0,    capacity:1500, status:'pending' as const, kind:'free' as const, accent:'#22D3EE' },
  { id:6, title:'Resume Review by Top Recruiters', date:'May 25',    mode:'Online', city:'Online',     cat:'Career',     attending:88,   capacity:200,  status:'live'    as const, kind:'paid' as const, price:299, accent:'#EC4899' },
];

const FILTERS = ['All', 'Live', 'Pending', 'Free', 'Paid'];

export function EventsView() {
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
