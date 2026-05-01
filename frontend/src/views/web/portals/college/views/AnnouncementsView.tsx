import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Platform } from 'react-native';
import { Megaphone, Pin, Send } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { usePortalData } from '@/src/lib/portalApi';

type Ann = { id: string; title: string; body: string; audience: string; tag: string; pinned: boolean; author: string; posted_at: string | null };
const FALLBACK = { items: [] as Ann[] };
const TAG_COLORS: Record<string, string> = { placement: '#22D3EE', event: '#34D399', career: '#FBBF24', general: '#A78BFA', hiring: '#EC4899' };

export function AnnouncementsView() {
  const { data } = usePortalData<typeof FALLBACK>('/college/announcements', FALLBACK);
  const ANN = data?.items || [];
  const [draft, setDraft] = useState('');
  return (
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ flex: 2, minWidth: 320, gap: 10 }}>
        {ANN.map((a) => {
          const color = TAG_COLORS[a.tag] || '#A78BFA';
          return (
            <View key={a.id} style={[s.card, a.pinned && { borderColor: CC.border2 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[s.icon, { backgroundColor: color + '20', borderColor: color + '40' }]}><Megaphone size={14} color={color} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text numberOfLines={1} style={s.title}>{a.title}</Text>
                    {a.pinned && <Pin size={11} color={CC.accentBright} />}
                  </View>
                  <Text style={s.meta}>{a.audience} · {a.author}{a.posted_at ? ' · ' + new Date(a.posted_at).toLocaleDateString() : ''}</Text>
                </View>
              </View>
              <Text style={s.body}>{a.body}</Text>
            </View>
          );
        })}
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
