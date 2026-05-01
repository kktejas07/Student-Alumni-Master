import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, MoreHorizontal, ShieldCheck, Plus } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type CollegeRow = {
  id: number; name: string; code: string; city: string; students: number;
  naac: string; mou: string; rev: string; status: 'active' | 'pending' | 'paused';
  color: string;
};

const FALLBACK = { items: [] as CollegeRow[], total: 0 };

const statusBadge = (s: 'active' | 'pending' | 'paused') =>
  s === 'active' ? { label: 'Active', color: 'green' as const }
  : s === 'pending' ? { label: 'Pending', color: 'amber' as const }
  : { label: 'Paused', color: 'gray' as const };

export function CollegesView() {
  const { data } = usePortalData<typeof FALLBACK>('/admin/super/colleges', FALLBACK);
  const [q, setQ] = useState('');
  const items = data?.items || [];
  const list = items.filter((c) => !q || (c.name + c.city + c.code).toLowerCase().includes(q.toLowerCase()));

  return (
    <View>
      <View style={s.toolRow}>
        <View style={s.searchBox}><Search size={14} color={SAC.dim} /><TextInput value={q} onChangeText={setQ} placeholder="Search colleges, cities" placeholderTextColor={SAC.dim} style={s.searchInput} /></View>
        <View style={{ flex: 1 }} />
        <Pressable style={s.cta}><Plus size={13} color="#fff" /><Text style={s.ctaText}>Onboard College</Text></Pressable>
      </View>

      <View style={s.tableHead}>
        <Text style={[s.th, { flex: 2.4 }]}>College</Text>
        <Text style={[s.th, { flex: 1 }]}>City</Text>
        <Text style={[s.th, { flex: 1 }]}>Students</Text>
        <Text style={[s.th, { flex: 0.7 }]}>NAAC</Text>
        <Text style={[s.th, { flex: 1 }]}>MoU</Text>
        <Text style={[s.th, { flex: 1 }]}>Revenue</Text>
        <Text style={[s.th, { flex: 1 }]}>Status</Text>
        <Text style={[s.th, { width: 32 }]}> </Text>
      </View>
      {list.map((c) => {
        const b = statusBadge(c.status);
        return (
          <View key={c.id} style={s.row}>
            <View style={[{ flex: 2.4, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <Av initials={c.code.slice(0, 3)} size={32} color={c.color} />
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text numberOfLines={1} style={s.cellName}>{c.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <ShieldCheck size={10} color={SAC.muted} />
                  <Text style={s.codeText}>{c.code}</Text>
                </View>
              </View>
            </View>
            <Text style={[s.cell, { flex: 1 }]}>{c.city}</Text>
            <Text style={[s.cell, { flex: 1, color: '#fff', fontFamily: FONTS.bold }]}>{c.students.toLocaleString('en-IN')}</Text>
            <View style={{ flex: 0.7 }}><Badge label={c.naac} color="orange" /></View>
            <Text style={[s.cell, { flex: 1 }]}>{c.mou}</Text>
            <Text style={[s.cell, { flex: 1, color: SAC.accentBright, fontFamily: FONTS.xbold }]}>{c.rev}</Text>
            <View style={{ flex: 1 }}><Badge label={b.label} color={b.color as any} /></View>
            <Pressable style={{ width: 32, alignItems: 'center' }}><MoreHorizontal size={16} color={SAC.muted} /></Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  toolRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 260, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: SAC.primary },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: SAC.border, backgroundColor: SAC.card, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  th: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: SAC.border, backgroundColor: SAC.card },
  cellName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  codeText: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, letterSpacing: 0.4 },
  cell: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
