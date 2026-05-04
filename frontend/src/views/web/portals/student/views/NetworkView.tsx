import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Search, UserPlus, Check, MessageSquare } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Person = { id: string; name: string; initials: string; kind: 'alumni' | 'student'; role: string; subline: string; college: string; batch: number; tags: string[]; color: string };
const FALLBACK = { items: [] as Person[] };

const FILTERS = ['All', 'Alumni', 'Student'];

export function NetworkView() {
  const { data } = usePortalData<typeof FALLBACK>('/student/network', FALLBACK);
  const PEOPLE = data?.items || [];
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const [conn, setConn] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  const list = PEOPLE.filter((p) => {
    if (filter !== 'All' && p.kind !== filter.toLowerCase()) return false;
    if (q && !(p.name + p.subline + p.college).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const cardW = width >= 1100 ? '32%' : width >= 720 ? '48%' : '100%';
  const send = (id: string) => setPending((p) => new Set(p).add(id));

  return (
    <View>
      <View style={s.toolRow}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {FILTERS.map((f) => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipOn]}>
              <Text style={{ color: filter === f ? '#fff' : SC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.searchBox}><Search size={14} color={SC.dim} /><TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={SC.dim} style={s.searchInput} /></View>
      </View>

      <View style={s.grid}>
        {list.map((p) => {
          const c = conn.has(p.id), pn = pending.has(p.id);
          return (
            <View key={p.id} style={[s.card, { width: cardW as any }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Av initials={p.initials} size={42} color={p.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.name}>{p.name}</Text>
                  <Text numberOfLines={1} style={s.meta}>{p.subline}</Text>
                </View>
                <Badge label={p.kind === 'alumni' ? 'Alumni' : 'Student'} color={p.kind === 'alumni' ? 'green' : 'purple'} />
              </View>
              <Text style={s.collegeMeta}>{p.college} · Batch {p.batch}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                {(p.tags || []).slice(0, 3).map((t) => <View key={t} style={s.tag}><Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 10 }}>{t}</Text></View>)}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {c ? (
                  <Pressable style={s.msgBtn}><MessageSquare size={13} color={SC.accentBright} /><Text style={s.msgText}>Message</Text></Pressable>
                ) : pn ? (
                  <View style={s.pending}><Check size={13} color={SC.amber} /><Text style={{ color: SC.amber, fontFamily: FONTS.bold, fontSize: 11.5 }}>Pending</Text></View>
                ) : (
                  <Pressable onPress={() => send(p.id)} style={s.connect}><UserPlus size={13} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11.5 }}>Connect</Text></Pressable>
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
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: SC.primary, borderColor: SC.primary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 240, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, padding: 14 },
  name: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  collegeMeta: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 8 },
  tag: { backgroundColor: 'rgba(167,139,250,0.10)', borderColor: SC.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  connect: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 30, borderRadius: 8, backgroundColor: SC.primary },
  pending: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.40)', backgroundColor: 'rgba(245,158,11,0.10)' },
  msgBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 30, borderRadius: 8, borderWidth: 1, borderColor: SC.border2, backgroundColor: SC.card },
  msgText: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 },
});
