/**
 * Mentor Portal — Network view: My network (connected mentors) + Discovery feed.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { UserPlus, Check, MessageSquare } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge, StarRow } from '../atoms';
import { usePortalData } from '@/src/lib/portalApi';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { request } from '@/src/models/services/api';

type Person = {
  id: string;
  name: string;
  initials: string;
  kind: 'alumni' | 'student' | 'mentor';
  role: string;
  subline: string;
  college: string;
  batch: number;
  tags: string[];
  color: string;
  connection_state?: 'connected' | 'pending' | 'none';
  company?: string;
  job_title?: string;
  rating?: number;
  sessions?: number;
  branch?: string;
  year?: string;
  looking?: string;
};
const FALLBACK = { items: [] as Person[] };

export function NetworkView() {
  const toast = useToast();
  const authUser = useAuthStore((sx) => sx.user);
  const path = authUser?.email
    ? `/student/network?student_email=${encodeURIComponent(authUser.email)}`
    : '/student/network';
  const { data } = usePortalData<typeof FALLBACK>(path, FALLBACK);
  const PEOPLE = data?.items || [];

  const [conn, setConn] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  // My Network is other mentors and alumni
  const myNetwork = PEOPLE.filter((p) => p.kind === 'mentor' || p.kind === 'alumni');
  // Discovery is students
  const discoveryStudents = PEOPLE.filter((p) => p.kind === 'student');

  const send = async (id: string) => {
    setPending((p) => new Set(p).add(id));
    try {
      await request(`/network/connect/${id}`, { method: 'POST' });
      toast.success('Connection Sent! ✉️', 'Your connection invite is permanently registered.');
    } catch (err: any) {
      setPending((p) => {
        const next = new Set(p);
        next.delete(id);
        return next;
      });
      toast.error('Could not connect', err?.message || 'Please try again.');
    }
  };

  return (
    <View style={{ gap: 24 }}>
      {/* My Network */}
      <View>
        <Text style={s.sectionTitle}>My Network</Text>
        <Text style={s.sub}>Mentors and alumni you collaborate with.</Text>
        <View style={s.grid}>
          {myNetwork.map((m) => {
            const isConnected = conn.has(m.id) || m.connection_state === 'connected';
            const isPending   = pending.has(m.id) || m.connection_state === 'pending';
            return (
              <View key={m.id} style={[s.card, { flexGrow: 1, flexBasis: 300, maxWidth: 360 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Av initials={m.initials} size={44} color={m.color} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 }}>{m.name}</Text>
                    <Text numberOfLines={1} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>
                      {m.job_title || m.role} · {m.company || m.college || 'Platform Member'}
                    </Text>
                  </View>
                  <Badge label={m.kind === 'alumni' ? 'Alumni' : 'Mentor'} color={m.kind === 'alumni' ? 'blue' : 'teal'} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StarRow rating={Math.round(m.rating || 5.0)} size={11} />
                  <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>
                    {m.rating || 5.0} · {m.sessions || 0} sessions
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                  {(m.tags || []).slice(0, 3).map((e) => (
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
          {discoveryStudents.map((d) => {
            const isConnected = conn.has(d.id) || d.connection_state === 'connected';
            const isPending   = pending.has(d.id) || d.connection_state === 'pending';
            return (
              <View key={d.id} style={[s.card, { flexGrow: 1, flexBasis: 300, maxWidth: 360 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Av initials={d.initials} size={42} color={d.color} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{d.name}</Text>
                    <Text numberOfLines={1} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>
                      {d.college} · {d.branch} · {d.year}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5 }}>“{d.looking}”</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' }}>
                  <Badge label="Student Profile" color="purple" />
                  {isConnected ? (
                    <Pressable style={[s.msgBtn, { marginLeft: 'auto', height: 32 }]}><MessageSquare size={13} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Message</Text></Pressable>
                  ) : isPending ? (
                    <View style={[s.pendingBtn, { marginLeft: 'auto', height: 32 }]}><Check size={13} color={MC.amber} /><Text style={{ color: MC.amber, fontFamily: FONTS.bold, fontSize: 12 }}>Pending</Text></View>
                  ) : (
                    <Pressable onPress={() => send(d.id)} style={[s.connectBtn, { marginLeft: 'auto', height: 32 }]}><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11.5 }}>Connect</Text></Pressable>
                  )}
                </View>
              </View>
            );
          })}
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
