/**
 * Mentor Portal — Session Requests view.
 * Each card has student info, topic, date, AI fit-score and Accept/Decline.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, Check, X } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge, Countdown } from '../atoms';
import { SESSION_REQUESTS } from '../data';

type Decision = 'pending' | 'accepted' | 'declined';

export function RequestsView() {
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});

  const set = (id: number, d: Decision) => setDecisions((p) => ({ ...p, [id]: d }));

  const aiScore = (topic: string) => {
    // mock — "score" some keywords
    const k = topic.toLowerCase();
    if (k.includes('system')) return { score: 96, label: 'Excellent fit' };
    if (k.includes('startup')) return { score: 89, label: 'Strong fit' };
    if (k.includes('career')) return { score: 84, label: 'Good fit' };
    return { score: 72, label: 'Fair fit' };
  };

  const stats = useMemo(() => {
    const accepted = Object.values(decisions).filter((d) => d === 'accepted').length;
    const declined = Object.values(decisions).filter((d) => d === 'declined').length;
    const pending  = SESSION_REQUESTS.length - accepted - declined;
    return { accepted, declined, pending };
  }, [decisions]);

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
        {SESSION_REQUESTS.map((req) => {
          const d = decisions[req.id] || 'pending';
          const ai = aiScore(req.topic);
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
              {d === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Pressable onPress={() => set(req.id, 'accepted')} style={s.acceptBtn}><Check size={14} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Accept</Text></Pressable>
                  <Pressable onPress={() => set(req.id, 'declined')} style={s.declineBtn}><X size={14} color={MC.red} /><Text style={{ color: MC.red, fontFamily: FONTS.bold, fontSize: 12 }}>Decline</Text></Pressable>
                </View>
              ) : (
                <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                  <Badge label={d === 'accepted' ? 'Accepted ✓' : 'Declined'} color={d === 'accepted' ? 'green' : 'red'} />
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
