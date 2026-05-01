/**
 * Mentor Portal — Feedback view: rating summary + reviews list with reply drafter.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, useWindowDimensions, Platform } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MC, FONTS } from '../tokens';
import { Av, StarRow } from '../atoms';
import { REVIEWS, RATING_DIST } from '../data';

export function FeedbackView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [drafting, setDrafting] = useState<number | null>(null);

  const filtered = REVIEWS.filter((r) => filter === 'all' || r.rating === filter);
  const total = REVIEWS.length;

  const draftAi = (id: number) => {
    // Mock AI draft
    const samples: Record<number, string> = {
      2: 'Thank you Kabir! Glad the deck feedback was actionable. Looking forward to v4 — fix that slide 2 narrative and we are golden.',
      4: 'Thanks Priya! Excited for your application cycle. Send me your SOP draft when ready and we will refine the research framing together.',
    };
    setDrafting(id);
    setTimeout(() => {
      setReplies((p) => ({ ...p, [id]: samples[id] || 'Thank you so much for the thoughtful review! Looking forward to our next session.' }));
      setDrafting(null);
    }, 700);
  };

  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      {/* Summary */}
      <View style={{ width: stack ? '100%' : 280, gap: 12 }}>
        <LinearGradient colors={[MC.bg2, MC.card] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 44, letterSpacing: -1 }}>4.9</Text>
          <StarRow rating={5} size={18} />
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 6 }}>{total} reviews · 96% positive</Text>
          <View style={{ marginTop: 16, gap: 7 }}>
            {RATING_DIST.map((d) => {
              const on = filter === d.stars;
              return (
                <Pressable key={d.stars} onPress={() => setFilter(on ? 'all' : d.stars)} style={[s.distRow, on && { backgroundColor: 'rgba(20,184,166,0.10)' }]}>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.bold, fontSize: 11, width: 24 }}>{d.stars}★</Text>
                  <View style={s.distTrack}><View style={[s.distFill, { width: `${d.pct}%` as any }]} /></View>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.bold, fontSize: 11, width: 18, textAlign: 'right' }}>{d.count}</Text>
                </Pressable>
              );
            })}
          </View>
          {filter !== 'all' && (
            <Pressable onPress={() => setFilter('all')} style={s.clearBtn}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>Clear filter</Text></Pressable>
          )}
        </LinearGradient>
      </View>

      {/* Reviews list */}
      <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
        {filtered.map((r) => (
          <View key={r.id} style={[s.review, !r.read && { borderColor: MC.border2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Av initials={r.avatar} size={42} color={r.color} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 }}>{r.student}</Text>
                  {!r.read && <View style={s.newDot}><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 9 }}>NEW</Text></View>}
                </View>
                <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{r.topic} · {r.date}</Text>
                <View style={{ marginTop: 6 }}><StarRow rating={r.rating} size={13} /></View>
              </View>
            </View>
            <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13, lineHeight: 20, marginTop: 10 }}>“{r.text}”</Text>

            {/* Reply */}
            {(r.reply || replies[r.id]) ? (
              <View style={s.replyBox}>
                <Text style={{ color: MC.tealP, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 0.6, marginBottom: 4 }}>YOUR REPLY · {r.replyDate || 'just now'}</Text>
                <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 }}>{r.reply || replies[r.id]}</Text>
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <View style={s.replyInputBox}>
                  <TextInput
                    value={replies[r.id] ?? ''}
                    onChangeText={(v) => setReplies((p) => ({ ...p, [r.id]: v }))}
                    placeholder="Write a reply..."
                    placeholderTextColor={MC.dim}
                    multiline
                    style={s.replyInput}
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Pressable disabled={drafting === r.id} onPress={() => draftAi(r.id)} style={s.aiCta}>
                    <Sparkles size={12} color="#FCD34D" />
                    <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11.5 }}>{drafting === r.id ? 'Drafting…' : 'AI Draft Reply'}</Text>
                  </Pressable>
                  <Pressable onPress={() => alert('Reply sent (mock)')} style={s.sendCta}>
                    <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 11.5 }}>Send Reply</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ))}
        {filtered.length === 0 && <Text style={{ color: MC.muted, fontFamily: FONTS.med, padding: 16 }}>No reviews match that filter.</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, ...({ cursor: 'pointer' } as any) },
  distTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  distFill: { height: '100%', backgroundColor: MC.tealP, borderRadius: 3 },
  clearBtn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: MC.border2 },
  review: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  newDot: { backgroundColor: MC.tealP, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  replyBox: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: 'rgba(20,184,166,0.07)', borderColor: MC.border, borderWidth: 1 },
  replyInputBox: { backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 10, minHeight: 60 },
  replyInput: { color: '#fff', fontFamily: FONTS.med, fontSize: 13, minHeight: 40, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  aiCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.30)' },
  sendCta: { paddingHorizontal: 16, height: 32, borderRadius: 8, backgroundColor: MC.tealP, alignItems: 'center', justifyContent: 'center' },
});
