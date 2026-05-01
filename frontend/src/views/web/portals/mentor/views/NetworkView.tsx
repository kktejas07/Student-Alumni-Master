/**
 * Mentor Portal — Network view: My network (connected mentors) + Discovery feed.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { UserPlus, Check, MessageSquare } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge, StarRow } from '../atoms';
import { NETWORK_MENTORS, DISCOVERY_STUDENTS } from '../data';

export function NetworkView() {
  const { width } = useWindowDimensions();
  const cardW = width >= 1100 ? '32%' : width >= 720 ? '48%' : '100%';

  const [pending, setPending] = useState<Set<number>>(new Set([2]));
  const [connected, setConnected] = useState<Set<number>>(new Set([1]));

  const send = (id: number) => setPending((p) => new Set(p).add(id));

  return (
    <View style={{ gap: 24 }}>
      {/* My Network */}
      <View>
        <Text style={s.sectionTitle}>My Network</Text>
        <Text style={s.sub}>Mentors and alumni you collaborate with.</Text>
        <View style={s.grid}>
          {NETWORK_MENTORS.map((m) => {
            const isConnected = connected.has(m.id);
            const isPending   = pending.has(m.id);
            return (
              <View key={m.id} style={[s.card, { width: cardW as any }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Av initials={m.avatar} size={44} color={m.color} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 }}>{m.name}</Text>
                    <Text numberOfLines={1} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>{m.role} · {m.company}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StarRow rating={Math.round(m.rating)} size={11} />
                  <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{m.rating} · {m.sessions} sessions</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                  {m.expertise.slice(0, 3).map((e) => (
                    <View key={e} style={s.tag}><Text style={{ color: MC.tealP, fontSize: 10, fontFamily: FONTS.bold }}>{e}</Text></View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {isConnected ? (
                    <Pressable style={s.msgBtn}><MessageSquare size={13} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Message</Text></Pressable>
                  ) : isPending ? (
                    <View style={s.pendingBtn}><Check size={13} color={MC.amber} /><Text style={{ color: MC.amber, fontFamily: FONTS.bold, fontSize: 12 }}>Pending</Text></View>
                  ) : (
                    <Pressable onPress={() => send(m.id)} style={s.connectBtn}><UserPlus size={13} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Connect</Text></Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Discovery */}
      <View>
        <Text style={s.sectionTitle}>Discovery</Text>
        <Text style={s.sub}>Students looking for mentors in your area of expertise.</Text>
        <View style={s.grid}>
          {DISCOVERY_STUDENTS.map((d) => (
            <View key={d.id} style={[s.card, { width: cardW as any }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Av initials={d.avatar} size={42} color={d.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{d.name}</Text>
                  <Text numberOfLines={1} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{d.college} · {d.branch} · {d.year}</Text>
                </View>
              </View>
              <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5 }}>“{d.looking}”</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <Badge label="Open to mentor" color="teal" />
                <Pressable style={[s.connectBtn, { marginLeft: 'auto' }]}><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11.5 }}>Reach Out</Text></Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sectionTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, letterSpacing: -0.4, marginBottom: 4 },
  sub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 14 },
  tag: { backgroundColor: 'rgba(20,184,166,0.10)', borderColor: MC.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  connectBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: MC.tealP },
  pendingBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.40)', backgroundColor: 'rgba(245,158,11,0.10)' },
  msgBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 32, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)' },
});
