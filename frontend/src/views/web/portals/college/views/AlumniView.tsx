import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Search } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Alumnus = { id: string; name: string; initials: string; batch: number; role: string; company: string; city: string; color: string };
const FALLBACK = { items: [] as Alumnus[] };
const BATCHES = ['All','2008-2014','2015-2019','2020-2024','2025+'];

export function AlumniView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/alumni', FALLBACK);
  const ALUMNI = data?.items || [];
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const list = ALUMNI.filter((a) => !q || (a.name + a.role + a.company).toLowerCase().includes(q.toLowerCase()));
  const cardW = width >= 1100 ? '32%' : width >= 720 ? '48%' : '100%';
  return (
    <View>
      <View style={s.toolRow}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{BATCHES.map((b) => <Pressable key={b} onPress={() => setFilter(b)} style={[s.chip, filter === b && s.chipOn]}><Text style={{ color: filter === b ? '#fff' : CC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{b}</Text></Pressable>)}</View>
        <View style={{ flex:1 }} />
        <View style={s.searchBox}><Search size={14} color={CC.dim} /><TextInput value={q} onChangeText={setQ} placeholder="Search alumni" placeholderTextColor={CC.dim} style={s.searchInput} /></View>
      </View>
      <View style={s.grid}>
        {list.map((a) => (
          <View key={a.id} style={[s.card, { width: cardW as any }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Av initials={a.initials} size={42} color={a.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={s.name}>{a.name}</Text>
                <Text numberOfLines={1} style={s.meta}>{a.role} · {a.company}</Text>
              </View>
              <Badge label={`Batch ${a.batch}`} color="purple" />
            </View>
            <Text style={s.loc}>· {a.city}</Text>
            <Pressable style={s.cta}><Text style={s.ctaText}>View profile</Text></Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 },
  chip: { paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: CC.card, borderWidth: 1, borderColor: CC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: CC.primary, borderColor: CC.primary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 220, height: 34, paddingHorizontal: 11, borderRadius: 10, backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 14 },
  name: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  meta: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  loc:  { color: CC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 8 },
  cta:  { marginTop: 12, height: 32, borderRadius: 8, backgroundColor: CC.card, borderWidth: 1, borderColor: CC.border2, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 },
});
