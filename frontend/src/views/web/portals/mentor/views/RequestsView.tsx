/**
 * Mentor Portal — Session Requests view.
 * Each card has student info, topic, date, AI fit-score and Accept/Decline.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Sparkles, Check, X } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge, Countdown } from '../atoms';
import { SESSION_REQUESTS } from '../data';
import { api } from '@/src/models/services/api';

export type Decision = 'pending' | 'accepted' | 'declined';

export interface RequestsViewProps {
  decisions: Record<number, Decision>;
  onSetDecision: (id: number, d: Decision) => void;
}

export function RequestsView({ decisions, onSetDecision }: RequestsViewProps) {
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadLiveRequests = async () => {
    try {
      const res = await api.myBookings();
      const pendingBookings = (res?.bookings || []).filter((b: any) => b.status === 'pending');
      setLiveRequests(pendingBookings);
    } catch (e) {
      console.warn('Failed to load live requests', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveRequests();
  }, []);

  const aiScore = (topic: string) => {
    const k = topic.toLowerCase();
    if (k.includes('system')) return { score: 96, label: 'Excellent fit' };
    if (k.includes('startup')) return { score: 89, label: 'Strong fit' };
    if (k.includes('career')) return { score: 84, label: 'Good fit' };
    return { score: 72, label: 'Fair fit' };
  };

  const handleLiveDecision = async (bookingId: string, type: 'accept' | 'decline') => {
    setActioningId(bookingId);
    try {
      if (type === 'accept') {
        await api.confirmBooking(bookingId);
      } else {
        await api.declineBooking(bookingId);
      }
      await loadLiveRequests();
    } catch (e) {
      console.error('Failed to update booking status', e);
    } finally {
      setActioningId(null);
    }
  };

  // Combine static and live requests
  const allRequests = useMemo(() => {
    const mappedLive = liveRequests.map((b) => {
      const dateObj = new Date(b.slot_start_iso);
      const daysAway = Math.max(0, Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return {
        id: b.id,
        isLive: true,
        studentName: b.student_name || 'Student',
        avatar: (b.student_name || 'ST').split(' ').slice(0, 2).map((p: string) => p[0] || '').join('').toUpperCase(),
        color: MC.teal,
        college: 'Student-Alumni Platform',
        branch: 'Mentee',
        year: dateObj.getFullYear(),
        topic: b.topic || 'Mentorship Session',
        time: dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
        daysAway,
        type: 'free',
        status: b.status,
      };
    });

    const mappedStatic = SESSION_REQUESTS.map((r) => {
      const d = decisions[r.id] || 'pending';
      return {
        ...r,
        isLive: false,
        status: d === 'accepted' ? 'confirmed' : d === 'declined' ? 'cancelled' : 'pending',
      };
    });

    return [...mappedLive, ...mappedStatic];
  }, [liveRequests, decisions]);

  const stats = useMemo(() => {
    const pending = allRequests.filter((r) => r.status === 'pending').length;
    const accepted = allRequests.filter((r) => r.status === 'confirmed' || r.status === 'accepted').length;
    const declined = allRequests.filter((r) => r.status === 'cancelled' || r.status === 'declined').length;
    return { accepted, declined, pending };
  }, [allRequests]);

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  return (
    <View>
      {/* Stats strip */}
      <View style={s.stats}>
        {[{ k: 'Pending', v: stats.pending, c: MC.amber },
          { k: 'Accepted', v: stats.accepted, c: MC.green },
          { k: 'Declined', v: stats.declined, c: MC.red }].map((st) => (
          <View key={st.k} style={s.statCard}>
            <Text style={{ color: st.c, fontFamily: FONTS.xbold, fontSize: 22 }}>{st.v}</Text>
            <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{st.k}</Text>
          </View>
        ))}
      </View>

      {/* Cards */}
      <View style={{ gap: 12 }}>
        {allRequests.map((req) => {
          const ai = aiScore(req.topic);
          const isPending = req.status === 'pending';

          return (
            <View key={req.id} style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Av initials={req.avatar} size={48} color={req.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{req.studentName}</Text>
                    <Badge label={req.type === 'paid' ? `Paid ₹${req.amount}` : 'Free'} color={req.type === 'paid' ? 'green' : 'teal'} />
                  </View>
                  <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{req.college} · {req.branch} · {req.year}</Text>
                  <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, marginTop: 6 }}>“{req.topic}”</Text>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 }}>{req.time}</Text>
                </View>
                <Countdown days={req.daysAway} />
              </View>

              {/* AI Fit score */}
              <View style={s.aiBox}>
                <View style={s.aiIcon}><Sparkles size={13} color="#FCD34D" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 0.6 }}>AI FIT SCORE · {ai.score}/100 · {ai.label}</Text>
                  <View style={s.aiTrack}>
                    <View style={[s.aiFill, { width: `${ai.score}%` as any }]} />
                  </View>
                </View>
              </View>

              {/* Actions */}
              {isPending ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Pressable
                    disabled={actioningId === String(req.id)}
                    onPress={() => {
                      if (req.isLive) {
                        handleLiveDecision(String(req.id), 'accept');
                      } else {
                        onSetDecision(Number(req.id), 'accepted');
                      }
                    }}
                    style={[s.acceptBtn, actioningId === String(req.id) && { opacity: 0.6 }]}
                  >
                    <Check size={14} color={MC.bg} />
                    <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>
                      {actioningId === String(req.id) ? 'Processing...' : 'Accept'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={actioningId === String(req.id)}
                    onPress={() => {
                      if (req.isLive) {
                        handleLiveDecision(String(req.id), 'decline');
                      } else {
                        onSetDecision(Number(req.id), 'declined');
                      }
                    }}
                    style={[s.declineBtn, actioningId === String(req.id) && { opacity: 0.6 }]}
                  >
                    <X size={14} color={MC.red} />
                    <Text style={{ color: MC.red, fontFamily: FONTS.bold, fontSize: 12 }}>Decline</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                  <Badge
                    label={req.status === 'confirmed' || req.status === 'accepted' ? 'Accepted ✓' : 'Declined'}
                    color={req.status === 'confirmed' || req.status === 'accepted' ? 'green' : 'red'}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  aiBox: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: 'rgba(252,211,77,0.06)', borderColor: 'rgba(252,211,77,0.20)', borderWidth: 1 },
  aiIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.15)', alignItems: 'center', justifyContent: 'center' },
  aiTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 6 },
  aiFill: { height: '100%', backgroundColor: '#FCD34D', borderRadius: 2 },
  acceptBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: MC.tealP },
  declineBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 16, height: 36, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.10)' },
});
