/**
 * Mentor Portal — Network view: My network (connected mentors) + Discovery feed.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { UserPlus, Check, MessageSquare, X, Briefcase, GraduationCap, Star, BookOpen, Layers } from 'lucide-react-native';
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
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

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
        <Text style={s.sub}>Mentors and alumni you collaborate with. Click on a card to view their complete profile.</Text>
        <View style={s.grid}>
          {myNetwork.map((m) => {
            const isConnected = conn.has(m.id) || m.connection_state === 'connected';
            const isPending   = pending.has(m.id) || m.connection_state === 'pending';
            return (
              <Pressable
                key={m.id}
                onPress={() => setSelectedPerson(m)}
                style={({ hovered }: any) => [
                  s.card,
                  { flexGrow: 1, flexBasis: 300, maxWidth: 360, cursor: 'pointer' },
                  hovered && s.cardHovered
                ]}
              >
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
                    <Pressable onPress={(e) => { e.stopPropagation(); alert('Messaging coming soon!'); }} style={s.msgBtn}><MessageSquare size={13} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Message</Text></Pressable>
                  ) : isPending ? (
                    <View style={s.pendingBtn}><Check size={13} color={MC.amber} /><Text style={{ color: MC.amber, fontFamily: FONTS.bold, fontSize: 12 }}>Pending</Text></View>
                  ) : (
                    <Pressable onPress={(e) => { e.stopPropagation(); send(m.id); }} style={s.connectBtn}><UserPlus size={13} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Connect</Text></Pressable>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Discovery */}
      <View>
        <Text style={s.sectionTitle}>Discovery</Text>
        <Text style={s.sub}>Students looking for mentors in your area of expertise. Click on a card to view their complete profile.</Text>
        <View style={s.grid}>
          {discoveryStudents.map((d) => {
            const isConnected = conn.has(d.id) || d.connection_state === 'connected';
            const isPending   = pending.has(d.id) || d.connection_state === 'pending';
            return (
              <Pressable
                key={d.id}
                onPress={() => setSelectedPerson(d)}
                style={({ hovered }: any) => [
                  s.card,
                  { flexGrow: 1, flexBasis: 300, maxWidth: 360, cursor: 'pointer' },
                  hovered && s.cardHovered
                ]}
              >
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
                    <Pressable onPress={(e) => { e.stopPropagation(); alert('Messaging coming soon!'); }} style={[s.msgBtn, { marginLeft: 'auto', height: 32 }]}><MessageSquare size={13} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Message</Text></Pressable>
                  ) : isPending ? (
                    <View style={[s.pendingBtn, { marginLeft: 'auto', height: 32 }]}><Check size={13} color={MC.amber} /><Text style={{ color: MC.amber, fontFamily: FONTS.bold, fontSize: 12 }}>Pending</Text></View>
                  ) : (
                    <Pressable onPress={(e) => { e.stopPropagation(); send(d.id); }} style={[s.connectBtn, { marginLeft: 'auto', height: 32 }]}><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11.5 }}>Connect</Text></Pressable>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Complete Profile Modal Overlay */}
      {selectedPerson && (
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedPerson(null)} />
          
          <View style={s.modal}>
            <Pressable onPress={() => setSelectedPerson(null)} style={s.closeBtn}>
              <X size={16} color="#fff" />
            </Pressable>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={s.modalHeader}>
                <Av initials={selectedPerson.initials} size={64} color={selectedPerson.color} />
                <View style={{ flex: 1 }}>
                  <Text style={s.modalName}>{selectedPerson.name}</Text>
                  <Badge
                    label={selectedPerson.kind === 'mentor' ? 'Verified Mentor' : selectedPerson.kind === 'alumni' ? 'Alumni Partner' : 'Student Scholar'}
                    color={selectedPerson.kind === 'mentor' ? 'teal' : selectedPerson.kind === 'alumni' ? 'blue' : 'purple'}
                  />
                </View>
              </View>

              <View style={s.modalBody}>
                {selectedPerson.kind === 'student' ? (
                  <>
                    <View style={s.infoRow}>
                      <GraduationCap size={16} color={MC.tealP} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.infoLabel}>Education</Text>
                        <Text style={s.infoValue}>{selectedPerson.college}</Text>
                        <Text style={s.infoSub}>{selectedPerson.branch} · Class of {selectedPerson.year}</Text>
                      </View>
                    </View>

                    <View style={s.infoRow}>
                      <BookOpen size={16} color={MC.tealP} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.infoLabel}>Mentorship Goal</Text>
                        <Text style={[s.infoValue, { fontStyle: 'italic' }]}>“{selectedPerson.looking}”</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={s.infoRow}>
                      <Briefcase size={16} color={MC.tealP} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.infoLabel}>Current Position</Text>
                        <Text style={s.infoValue}>{selectedPerson.job_title || selectedPerson.role}</Text>
                        <Text style={s.infoSub}>{selectedPerson.company || 'Tech Partner'}</Text>
                      </View>
                    </View>

                    <View style={s.infoRow}>
                      <GraduationCap size={16} color={MC.tealP} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.infoLabel}>Education & Background</Text>
                        <Text style={s.infoValue}>{selectedPerson.college || 'IIT Bombay'}</Text>
                        <Text style={s.infoSub}>Batch of {selectedPerson.batch || '2008'}</Text>
                      </View>
                    </View>

                    <View style={s.infoRow}>
                      <Star size={16} color={MC.tealP} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.infoLabel}>Platform Stats</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <StarRow rating={Math.round(selectedPerson.rating || 5.0)} size={11} />
                          <Text style={s.infoValue}>
                            {selectedPerson.rating || 5.0} · {selectedPerson.sessions || 0} sessions completed
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {selectedPerson.tags && selectedPerson.tags.length > 0 && (
                  <View style={s.infoRow}>
                    <Layers size={16} color={MC.tealP} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.infoLabel}>Areas of Collaboration</Text>
                      <View style={s.modalTags}>
                        {selectedPerson.tags.map((tag) => (
                          <View key={tag} style={s.modalTag}>
                            <Text style={s.modalTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View style={s.modalFooter}>
                {conn.has(selectedPerson.id) || selectedPerson.connection_state === 'connected' ? (
                  <Pressable onPress={() => { setSelectedPerson(null); alert('Messaging coming soon!'); }} style={[s.actionBtn, s.msgActionBtn]}>
                    <MessageSquare size={14} color={MC.tealP} />
                    <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 13 }}>Message Partner</Text>
                  </Pressable>
                ) : pending.has(selectedPerson.id) || selectedPerson.connection_state === 'pending' ? (
                  <View style={[s.actionBtn, s.pendingActionBtn]}>
                    <Check size={14} color={MC.amber} />
                    <Text style={{ color: MC.amber, fontFamily: FONTS.bold, fontSize: 13 }}>Request Pending</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => { send(selectedPerson.id); setSelectedPerson(null); }} style={[s.actionBtn, s.connectActionBtn]}>
                    <UserPlus size={14} color={MC.bg} />
                    <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 13 }}>Send Connection Invite</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
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

  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5, 8, 16, 0.65)',
    zIndex: 9999,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0c0f1e',
    borderColor: MC.border2,
    borderLeftWidth: 1,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    width: '100%',
    maxWidth: 440,
    height: '100%',
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    marginTop: 20,
  },
  modalName: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 20,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  modalBody: {
    gap: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoLabel: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  infoSub: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
    marginTop: 1,
  },
  modalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  modalTag: {
    backgroundColor: 'rgba(20,184,166,0.10)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalTagText: {
    color: MC.tealP,
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  modalFooter: {
    marginTop: 6,
  },
  actionBtn: {
    width: '100%',
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  connectActionBtn: {
    backgroundColor: MC.tealP,
  },
  pendingActionBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.40)',
    backgroundColor: 'rgba(245,158,11,0.10)',
  },
  msgActionBtn: {
    borderWidth: 1,
    borderColor: MC.border2,
    backgroundColor: 'rgba(20,184,166,0.07)',
  },
  cardHovered: {
    borderColor: MC.tealP,
    backgroundColor: 'rgba(20,184,166,0.02)',
  },
});
