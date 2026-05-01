import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Platform } from 'react-native';
import { Megaphone, Pin, Send } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';

const ANN = [
  { id:1, title:'Mid-sem exam schedule released',      audience:'All students', pinned:true,  date:'Today, 9:00 AM', body:'Mid-semester exams begin May 12. Hall tickets available on portal from May 5.', color:'#22D3EE' },
  { id:2, title:'Google campus drive — register now',  audience:'Final year',   pinned:true,  date:'Today, 11:30 AM', body:'85 spots left. Eligibility: CGPA ≥ 7.0. Last date to register: May 8.', color:'#34D399' },
  { id:3, title:'Library timings extended this week',   audience:'All',           pinned:false, date:'Yesterday',      body:'Library now open till 2 AM through May 11 to support exam prep.',            color:'#FBBF24' },
  { id:4, title:'Convocation rehearsal slots',          audience:'Batch 2026',    pinned:false, date:'2 days ago',     body:'Rehearsals scheduled May 15-17. Pick your slot via the convocation portal.',  color:'#A78BFA' },
];

export function AnnouncementsView() {
  const [draft, setDraft] = useState('');
  return (
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ flex: 2, minWidth: 320, gap: 10 }}>
        {ANN.map((a) => (
          <View key={a.id} style={[s.card, a.pinned && { borderColor: CC.border2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.icon, { backgroundColor: a.color + '20', borderColor: a.color + '40' }]}><Megaphone size={14} color={a.color} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={s.title}>{a.title}</Text>
                  {a.pinned && <Pin size={11} color={CC.accentBright} />}
                </View>
                <Text style={s.meta}>{a.audience} · {a.date}</Text>
              </View>
            </View>
            <Text style={s.body}>{a.body}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, minWidth: 280 }}>
        <View style={s.card}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, marginBottom: 12 }}>New announcement</Text>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Title…" placeholderTextColor={CC.dim} style={s.input} />
          <TextInput placeholder="Body…" placeholderTextColor={CC.dim} multiline style={[s.input, { height: 90, marginTop: 10 }]} />
          <Pressable style={s.send}><Send size={13} color="#fff" /><Text style={s.sendText}>Send to all</Text></Pressable>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 14 },
  icon: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  meta: { color: CC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  body: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 10, lineHeight: 18 },
  input: { backgroundColor: CC.bg2, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, borderColor: CC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  send: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 12, height: 36, borderRadius: 10, backgroundColor: CC.primary },
  sendText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
});
