import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Platform, Animated } from 'react-native';
import { Megaphone, Pin, Send, CheckCircle } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { usePortalData } from '@/src/lib/portalApi';
import { useToast } from '@/src/views/components';

type Ann = { id: string; title: string; body: string; audience: string; tag: string; pinned: boolean; author: string; posted_at: string | null };
const FALLBACK = { items: [] as Ann[] };
const TAG_COLORS: Record<string, string> = { placement: '#22D3EE', event: '#34D399', career: '#FBBF24', general: '#60A5FA', hiring: '#EC4899' };

export function AnnouncementsView() {
  const toast = useToast();
  const { data, refresh } = usePortalData<typeof FALLBACK>('/college/announcements', FALLBACK);
  const ANN = data?.items || [];
  const [draft, setDraft] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showConfirmation = () => {
    setSent(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(2500),
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => setSent(false));
  };

  const handlePublish = async () => {
    if (!draft.trim() || !bodyText.trim()) {
      toast.error('Missing fields', 'Add both a title and message body.');
      return;
    }
    setSending(true);
    try {
      const { postPortal } = await import('@/src/lib/portalApi');
      await postPortal('/college/announcements', {
        body: { title: draft.trim(), body: bodyText.trim() },
      });
      setDraft('');
      setBodyText('');
      refresh();
      showConfirmation();
      toast.success('Announcement published', 'Sent to your college audience.');
    } catch (e: any) {
      toast.error('Publish failed', e?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ flex: 2, minWidth: 320, gap: 10 }}>
        {ANN.map((a) => {
          const color = TAG_COLORS[a.tag] || '#60A5FA';
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
          <Text style={{ color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 14, marginBottom: 12 }}>New announcement</Text>

          {/* ── Success confirmation banner ── */}
          {sent && (
            <Animated.View style={[s.successBanner, { opacity: fadeAnim }]}>
              <CheckCircle size={15} color="#34D399" />
              <Text style={s.successText}>Announcement sent to all!</Text>
            </Animated.View>
          )}

          <TextInput value={draft} onChangeText={setDraft} placeholder="Title…" placeholderTextColor={CC.dim} style={s.input} />
          <TextInput
            value={bodyText}
            onChangeText={setBodyText}
            placeholder="Body…"
            placeholderTextColor={CC.dim}
            multiline
            style={[s.input, { height: 90, marginTop: 10 }]}
          />
          <Pressable
            style={[s.send, (sending || sent) && { opacity: 0.7 }]}
            onPress={handlePublish}
            disabled={sending || sent}
          >
            {sent
              ? <><CheckCircle size={13} color="#34D399" /><Text style={[s.sendText, { color: '#34D399' }]}>Sent!</Text></>
              : <><Send size={13} color="#fff" /><Text style={s.sendText}>{sending ? 'Sending…' : 'Send to all'}</Text></>
            }
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 14 },
  icon: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 13 },
  meta: { color: CC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 },
  body: { color: CC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 10, lineHeight: 18 },
  input: { backgroundColor: CC.bg2, color: '#FFFFFF', fontFamily: FONTS.med, fontSize: 12.5, borderColor: CC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  send: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 12, height: 36, borderRadius: 10, backgroundColor: CC.primary },
  sendText: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 12 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.35)',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 12,
  },
  successText: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 12.5 },
});
