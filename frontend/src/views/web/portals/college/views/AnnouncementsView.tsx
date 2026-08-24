import React, { useState, useRef } from 'react';
import { View, Text, Pressable, TextInput, Platform, Animated } from 'react-native';
import { Megaphone, Pin, Send, CheckCircle } from 'lucide-react-native';
import { CC } from '../tokens';
import { usePortalData } from '@/src/lib/portalApi';
import { useToast } from '@/src/views/components';

type Ann = { id: string; title: string; body: string; audience: string; tag: string; pinned: boolean; author: string; posted_at: string | null };
const FALLBACK = { items: [] as Ann[] };
const TAG_COLORS: Record<string, string> = { placement: '#22D3EE', event: '#34D399', career: '#FBBF24', general: '#A78BFA', hiring: '#EC4899' };

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
    <View className="flex-row gap-4 flex-wrap">
      <View className="flex-[2] min-w-[320px] gap-[10px]">
        {ANN.map((a) => {
          const color = TAG_COLORS[a.tag] || '#A78BFA';
          return (
            <View key={a.id} className={`bg-glass-soft border rounded-[14px] p-[14px] ${a.pinned ? 'border-glass-border' : 'border-glass-border'}`}>
              <View className="flex-row items-center gap-[10px]">
                <View className="w-8 h-8 rounded-[9px] border items-center justify-center" style={{ backgroundColor: color + '20', borderColor: color + '40' }}>
                  <Megaphone size={14} color={color} />
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-[6px]">
                    <Text numberOfLines={1} className="text-text font-body-bold text-[13px]">{a.title}</Text>
                    {a.pinned && <Pin size={11} color={CC.accentBright} />}
                  </View>
                  <Text className="text-dim font-body text-[11px] mt-[2px]">{a.audience} · {a.author}{a.posted_at ? ' · ' + new Date(a.posted_at).toLocaleDateString() : ''}</Text>
                </View>
              </View>
              <Text className="text-muted font-body text-[12.5px] mt-[10px] leading-[18px]">{a.body}</Text>
            </View>
          );
        })}
      </View>
      <View className="flex-1 min-w-[280px]">
        <View className="bg-glass-soft border border-glass-border rounded-[14px] p-[14px]">
          <Text className="text-text font-display-bold text-[14px] mb-3">New announcement</Text>

          {sent && (
            <Animated.View className="flex-row items-center gap-2 bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.35)] rounded-[10px] px-3 py-[9px] mb-3" style={{ opacity: fadeAnim }}>
              <CheckCircle size={15} color="#34D399" />
              <Text className="text-green-400 font-body-bold text-[12.5px]">Announcement sent to all!</Text>
            </Animated.View>
          )}

          <TextInput value={draft} onChangeText={setDraft} placeholder="Title…" placeholderTextColor={CC.dim}
            className="bg-bg2 text-text font-body text-[12.5px] border border-glass-border rounded-[10px] px-3 py-[10px]"
            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
          <TextInput
            value={bodyText}
            onChangeText={setBodyText}
            placeholder="Body…"
            placeholderTextColor={CC.dim}
            multiline
            className="bg-bg2 text-text font-body text-[12.5px] border border-glass-border rounded-[10px] px-3 py-[10px] h-[90px] mt-[10px]"
            style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}} />
          <Pressable
            className={`flex-row gap-[6px] items-center justify-center mt-3 h-9 rounded-[10px] bg-violet ${(sending || sent) ? 'opacity-70' : ''}`}
            onPress={handlePublish}
            disabled={sending || sent}
          >
            {sent
              ? <><CheckCircle size={13} color="#34D399" /><Text className="text-green-400 font-display-bold text-xs">Sent!</Text></>
              : <><Send size={13} color="#fff" /><Text className="text-text font-display-bold text-xs">{sending ? 'Sending…' : 'Send to all'}</Text></>
            }
          </Pressable>
        </View>
      </View>
    </View>
  );
}
