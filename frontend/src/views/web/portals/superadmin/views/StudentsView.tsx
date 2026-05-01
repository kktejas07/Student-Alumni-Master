import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { Search, MoreHorizontal, GraduationCap } from 'lucide-react-native';
import { SAC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';

const STUDENTS = [
  { id:1, name:'Aryan Kapoor',  initials:'AK', college:'IIT Kanpur',          dept:'CSE',    year:'Y4', cgpa:8.7, status:'active'   as const, color:'#3B82F6' },
  { id:2, name:'Priya Nair',    initials:'PN', college:'BITS Pilani',         dept:'EEE',    year:'Y3', cgpa:9.1, status:'top'      as const, color:'#22C55E' },
  { id:3, name:'Kabir Das',     initials:'KD', college:"St. Xavier's, Mumbai", dept:'BMS',    year:'Y2', cgpa:8.5, status:'active'   as const, color:'#A78BFA' },
  { id:4, name:'Meera Pillai',  initials:'MP', college:'Anna University',     dept:'CSE',    year:'Y4', cgpa:8.9, status:'placed'   as const, color:'#FB923C' },
  { id:5, name:'Rohan Mehta',   initials:'RM', college:'Christ University',   dept:'MBA',    year:'Y1', cgpa:7.8, status:'active'   as const, color:'#F59E0B' },
  { id:6, name:'Sneha Iyer',    initials:'SI', college:'Manipal Inst Tech',   dept:'Design', year:'Y3', cgpa:8.6, status:'active'   as const, color:'#EC4899' },
  { id:7, name:'Vikram Singh',  initials:'VS', college:'NIT Trichy',          dept:'Mech',   year:'Y4', cgpa:7.4, status:'at_risk'  as const, color:'#EF4444' },
  { id:8, name:'Tara Joshi',    initials:'TJ', college:'JNU New Delhi',       dept:'PolSci', year:'Y2', cgpa:8.8, status:'top'      as const, color:'#22D3EE' },
];

const statusBadge = (st: string) =>
  st === 'top'     ? { label: 'Top 5%',  color: 'green'  as const }
: st === 'placed'  ? { label: 'Placed',  color: 'orange' as const }
: st === 'at_risk' ? { label: 'At-risk', color: 'red'    as const }
                   : { label: 'Active',  color: 'blue'   as const };

export function StudentsView() {
  const [q, setQ] = useState('');
  const list = STUDENTS.filter((st) => !q || (st.name + st.college + st.dept).toLowerCase().includes(q.toLowerCase()));

  return (
    <View>
      <View style={s.statBar}>
        <View style={s.statBox}>
          <View style={s.statIcon}><GraduationCap size={14} color={SAC.accent} /></View>
          <View>
            <Text style={s.statLabel}>TOTAL STUDENTS</Text>
            <Text style={s.statVal}>1,24,820</Text>
          </View>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>ACTIVE THIS WEEK</Text>
          <Text style={s.statVal}>89,420</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>PLACEMENT-READY</Text>
          <Text style={s.statVal}>14,260</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>AT-RISK FLAG</Text>
          <Text style={[s.statVal, { color: SAC.red }]}>312</Text>
        </View>
      </View>

      <View style={s.toolRow}>
        <View style={s.searchBox}><Search size={14} color={SAC.dim} /><TextInput value={q} onChangeText={setQ} placeholder="Search across all colleges" placeholderTextColor={SAC.dim} style={s.searchInput} /></View>
      </View>
      <View style={s.tableHead}>
        <Text style={[s.th, { flex: 2 }]}>Name</Text>
        <Text style={[s.th, { flex: 2 }]}>College</Text>
        <Text style={[s.th, { flex: 1 }]}>Dept</Text>
        <Text style={[s.th, { flex: 0.7 }]}>Year</Text>
        <Text style={[s.th, { flex: 0.7 }]}>CGPA</Text>
        <Text style={[s.th, { flex: 1 }]}>Status</Text>
        <Text style={[s.th, { width: 32 }]}> </Text>
      </View>
      {list.map((st) => {
        const b = statusBadge(st.status);
        return (
          <View key={st.id} style={s.row}>
            <View style={[{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}><Av initials={st.initials} size={32} color={st.color} /><Text style={s.cellName}>{st.name}</Text></View>
            <Text numberOfLines={1} style={[s.cell, { flex: 2 }]}>{st.college}</Text>
            <Text style={[s.cell, { flex: 1 }]}>{st.dept}</Text>
            <Text style={[s.cell, { flex: 0.7 }]}>{st.year}</Text>
            <Text style={[s.cell, { flex: 0.7, color: '#fff', fontFamily: FONTS.bold }]}>{st.cgpa}</Text>
            <View style={{ flex: 1 }}><Badge label={b.label} color={b.color} /></View>
            <Pressable style={{ width: 32, alignItems: 'center' }}><MoreHorizontal size={16} color={SAC.muted} /></Pressable>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  statBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  statBox: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12 },
  statIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.20)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.6 },
  statVal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, marginTop: 3 },

  toolRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 280, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: SAC.border, backgroundColor: SAC.card, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  th: { color: SAC.muted, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: SAC.border, backgroundColor: SAC.card },
  cellName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  cell: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
