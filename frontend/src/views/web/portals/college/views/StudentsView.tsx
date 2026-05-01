import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, MoreHorizontal } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';

type Student = { id: string; name: string; initials: string; dept: string; year: string; cgpa: number; attendance: number; status: string; color: string };
const FALLBACK = { items: [] as Student[] };

const statusBadge = (st: string) => st === 'at_risk' ? { label: 'At-risk', color: 'red' as const } : st === 'top' ? { label: 'Top 5%', color: 'green' as const } : { label: 'Good', color: 'blue' as const };

export function StudentsView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/students', FALLBACK);
  const STUDENTS = data?.items || [];
  const [q, setQ] = useState('');
  const list = STUDENTS.filter((st) => !q || (st.name + st.dept).toLowerCase().includes(q.toLowerCase()));
  return (
    <View>
      <View style={s.toolRow}>
        <View style={s.searchBox}><Search size={14} color={CC.dim} /><TextInput value={q} onChangeText={setQ} placeholder="Search students" placeholderTextColor={CC.dim} style={s.searchInput} /></View>
        <View style={{ flex:1 }} />
        <Pressable style={s.cta}><Text style={s.ctaText}>+ Add Student</Text></Pressable>
      </View>
      <View style={s.tableHead}>
        <Text style={[s.th, { flex: 2 }]}>Name</Text>
        <Text style={[s.th, { flex: 1 }]}>Dept</Text>
        <Text style={[s.th, { flex: 1 }]}>Year</Text>
        <Text style={[s.th, { flex: 1 }]}>CGPA</Text>
        <Text style={[s.th, { flex: 1 }]}>Attendance</Text>
        <Text style={[s.th, { flex: 1 }]}>Status</Text>
        <Text style={[s.th, { width: 32 }]}> </Text>
      </View>
      {list.map((st) => {
        const b = statusBadge(st.status);
        return (
          <View key={st.id} style={s.row}>
            <View style={[{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}><Av initials={st.initials} size={32} color={st.color} /><Text style={s.cellName}>{st.name}</Text></View>
            <Text style={[s.cell, { flex: 1 }]}>{st.dept}</Text>
            <Text style={[s.cell, { flex: 1 }]}>{st.year}</Text>
            <Text style={[s.cell, { flex: 1, color: '#fff', fontFamily: FONTS.bold }]}>{st.cgpa}</Text>
            <Text style={[s.cell, { flex: 1, color: st.attendance < 70 ? CC.red : '#fff' }]}>{st.attendance}%</Text>
            <View style={{ flex: 1 }}><Badge label={b.label} color={b.color} /></View>
            <Pressable style={[{ width: 32, alignItems: 'center' }]}><MoreHorizontal size={16} color={CC.muted} /></Pressable>
          </View>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  toolRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 240, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  cta: { paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: CC.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: CC.border, backgroundColor: CC.card, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  th: { color: CC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: CC.border, backgroundColor: CC.card },
  cellName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  cell: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
