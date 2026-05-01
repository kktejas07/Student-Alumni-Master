/**
 * Mentor Portal — My Connections (RN port).
 * Status filter chips + search + 6 student cards in a responsive grid.
 * Tapping a card opens a side drawer with the student's full profile.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Modal, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Search, X, MessageSquare, Calendar as Cal, ExternalLink } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { STUDENTS, statusMeta } from '../data';

type Student = typeof STUDENTS[number];
const FILTERS: Array<{id: string; label: string}> = [
  { id: 'all',       label: 'All' },
  { id: 'active',    label: 'Active' },
  { id: 'pending',   label: 'Pending' },
  { id: 'completed', label: 'Completed' },
];

export function ConnectionsView() {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('all');
  const [q, setQ]           = useState('');
  const [picked, setPicked] = useState<Student | null>(null);

  const list = useMemo(() => STUDENTS.filter((st) => {
    if (filter !== 'all' && st.status !== filter) return false;
    if (q && !(st.name + ' ' + st.college + ' ' + st.branch).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [filter, q]);

  const cardW = width >= 1280 ? '32%' : width >= 760 ? '48%' : '100%';

  return (
    <View>
      {/* Filters + search */}
      <View style={s.toolRow}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const on = f.id === filter;
            return (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[s.chip, on && s.chipOn]}>
                <Text style={{ color: on ? '#fff' : MC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.searchBox}>
          <Search size={14} color={MC.dim} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search by name, college" placeholderTextColor={MC.dim} style={s.searchInput} />
        </View>
      </View>

      {/* Grid */}
      <View style={s.grid}>
        {list.map((st) => {
          const meta = statusMeta(st.status);
          return (
            <Pressable key={st.id} onPress={() => setPicked(st)} style={({ hovered }: any) => [s.card, { width: cardW as any }, hovered && { borderColor: MC.border2 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Av initials={st.avatar} size={42} color={st.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 }}>{st.name}</Text>
                  <Text numberOfLines={1} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{st.college} · {st.branch}</Text>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10 }}>{st.saId}</Text>
                </View>
                <Badge label={meta.label} color={meta.color as any} />
              </View>

              {/* Progress */}
              <View style={s.bar}>
                <View style={{
                  height: '100%',
                  width: `${st.progress}%` as any,
                  borderRadius: 2,
                  backgroundColor: st.progress === 100 ? MC.green : st.progress > 60 ? MC.teal : MC.amber,
                }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10 }}>
                  {st.sessionsCompleted}/{st.sessionsTotal} sessions · CGPA {st.cgpa}
                </Text>
                {!!st.messages && (
                  <View style={s.msgPill}>
                    <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 9 }}>{st.messages} new</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {st.tags.slice(0, 3).map((t) => (
                  <View key={t} style={s.tag}><Text style={{ color: MC.tealP, fontSize: 10, fontFamily: FONTS.bold }}>{t}</Text></View>
                ))}
              </View>
            </Pressable>
          );
        })}
        {list.length === 0 && (
          <View style={s.empty}><Text style={{ color: MC.muted, fontFamily: FONTS.med }}>No connections match those filters.</Text></View>
        )}
      </View>

      {/* Drawer (modal) */}
      <Modal visible={!!picked} animationType="fade" transparent onRequestClose={() => setPicked(null)}>
        <View style={s.backdrop}>
          <Pressable onPress={() => setPicked(null)} style={{ flex: 1 }} />
          <View style={s.drawer}>
            {picked && <DrawerInner st={picked} onClose={() => setPicked(null)} />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DrawerInner({ st, onClose }: { st: Student; onClose: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Av initials={st.avatar} size={56} color={st.color} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{st.name}</Text>
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12 }}>{st.college} · {st.branch} · {st.year}</Text>
        </View>
        <Pressable onPress={onClose} style={s.iconBtn}><X size={16} color={MC.muted} /></Pressable>
      </View>

      {/* Goals */}
      <Text style={s.kicker}>GOALS</Text>
      {st.goals.map((g) => <Text key={g} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, marginBottom: 4 }}>• {g}</Text>)}

      {/* Skills */}
      <Text style={s.kicker}>SKILLS</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {st.skills.map((sk) => (
          <View key={sk} style={s.tag}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>{sk}</Text></View>
        ))}
      </View>

      {/* Last session */}
      {st.lastSession && (
        <>
          <Text style={s.kicker}>LAST SESSION ({st.lastSession.date})</Text>
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13, lineHeight: 19 }}>{st.lastSession.notes}</Text>
        </>
      )}

      {/* Next */}
      {st.nextSession && (
        <>
          <Text style={s.kicker}>NEXT SESSION</Text>
          <View style={s.nextBox}>
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{st.nextSession.topic}</Text>
            <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12, marginTop: 3 }}>{st.nextSession.date} · {st.nextSession.time} · in {st.nextSession.daysAway}d</Text>
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Pressable style={s.primaryCta}><MessageSquare size={14} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Message</Text></Pressable>
        <Pressable style={s.secCta}><Cal size={14} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Schedule</Text></Pressable>
        <Pressable style={s.secCta}><ExternalLink size={14} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Profile</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: MC.card, borderWidth: 1, borderColor: MC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: MC.teal, borderColor: MC.teal },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 260, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 14, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  msgPill: { backgroundColor: 'rgba(252,211,77,0.20)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tag: { backgroundColor: 'rgba(20,184,166,0.10)', borderColor: MC.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  empty: { width: '100%', padding: 24, alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)', flexDirection: 'row' },
  drawer: { width: 460, maxWidth: '100%' as any, backgroundColor: MC.bg2, borderLeftWidth: 1, borderLeftColor: MC.border },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  kicker: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  nextBox: { backgroundColor: 'rgba(20,184,166,0.08)', borderColor: MC.border2, borderWidth: 1, borderRadius: 10, padding: 12 },
  primaryCta: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: MC.tealP },
  secCta: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 10, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)' },
});
