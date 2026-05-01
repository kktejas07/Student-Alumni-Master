/**
 * Mentor Portal — Sessions view.
 * Today | Upcoming | Past tabs, with session rows + Join button + AI prep.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { Calendar as CalIcon, Clock, Sparkles, Video } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge, Countdown } from '../atoms';
import { TODAY_SESSIONS, STUDENTS } from '../data';

type TabId = 'today' | 'upcoming' | 'past';

export function SessionsView() {
  const [tab, setTab] = useState<TabId>('today');

  const upcoming = STUDENTS.filter((s) => s.nextSession).map((s) => ({ ...s.nextSession!, student: s }));
  const past = STUDENTS.filter((s) => s.lastSession).map((s) => ({ ...s.lastSession!, student: s }));

  return (
    <View>
      {/* Tabs */}
      <View style={s.tabsRow}>
        {(['today','upcoming','past'] as TabId[]).map((t) => {
          const on = t === tab;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, on && s.tabOn]}>
              <Text style={{ color: on ? '#fff' : MC.muted, fontFamily: FONTS.bold, fontSize: 13, textTransform: 'capitalize' }}>{t}</Text>
              <View style={[s.tabCount, on && { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
                <Text style={{ color: on ? '#fff' : MC.muted, fontFamily: FONTS.xbold, fontSize: 10 }}>
                  {t === 'today' ? TODAY_SESSIONS.length : t === 'upcoming' ? upcoming.length : past.length}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <View style={{ gap: 10 }}>
        {tab === 'today' && TODAY_SESSIONS.map((sess, i) => (
          <View key={i} style={s.row}>
            <Av initials={sess.avatar} size={44} color={sess.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{sess.student}</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{sess.topic}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><Clock size={12} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>{sess.time} · {sess.duration} min</Text></View>
              </View>
            </View>
            <Pressable onPress={() => alert('AI prep notes will open here')} style={s.aiBtn}><Sparkles size={12} color="#FCD34D" /><Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11 }}>AI Prep</Text></Pressable>
            <Pressable onPress={() => Linking.openURL('https://meet.google.com/new')} style={s.joinBtn}><Video size={13} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Join</Text></Pressable>
          </View>
        ))}

        {tab === 'upcoming' && upcoming.map((u, i) => (
          <View key={i} style={s.row}>
            <Av initials={u.student.avatar} size={44} color={u.student.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{u.student.name}</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{u.topic}</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <CalIcon size={12} color={MC.dim} />
                <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{u.date} · {u.time}</Text>
              </View>
            </View>
            <Countdown days={u.daysAway} />
            <Pressable style={s.outlineBtn}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Reschedule</Text></Pressable>
          </View>
        ))}

        {tab === 'past' && past.map((p, i) => (
          <View key={i} style={s.row}>
            <Av initials={p.student.avatar} size={44} color={p.student.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{p.student.name}</Text>
              <Text numberOfLines={2} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{p.notes}</Text>
              <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 }}>{p.date}</Text>
            </View>
            <Badge label="Completed" color="blue" />
          </View>
        ))}

        {tab === 'past' && past.length === 0 && <Text style={{ color: MC.muted, fontFamily: FONTS.med, padding: 20, textAlign: 'center' }}>No past sessions yet.</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tabsRow: { flexDirection: 'row', gap: 6, borderBottomWidth: 1, borderBottomColor: MC.border, marginBottom: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', ...({ cursor: 'pointer' } as any) },
  tabOn: { borderBottomColor: MC.tealP },
  tabCount: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 32, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.30)' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: MC.tealP },
  outlineBtn: { paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)', alignItems: 'center', justifyContent: 'center' },
});
