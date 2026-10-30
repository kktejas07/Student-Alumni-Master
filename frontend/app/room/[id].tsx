/**
 * Single Knowledge Room — chat interface
 * Topical discussion within a room. Messages persisted server-side.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { api } from '@/src/models/services/api';
import { useAuth } from '@/src/viewmodels/hooks';

export default function RoomDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load messages on mount + poll every 5s for live-ish chat
  useEffect(() => {
    if (!params.id) return;
    const load = () => api.roomMessages(String(params.id))
      .then((r) => setMessages(r.messages || []))
      .catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setLoading(true);
    setInput('');
    try {
      const newMsg = await api.postRoomMessage(String(params.id), msg);
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      console.warn(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={22} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.bodyBold, { flex: 1, textAlign: 'center', color: C.textPrimary }]}>
            {params.name || 'Room'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
          {messages.length === 0 && (
            <Text style={[Typography.body, { color: C.textMuted, textAlign: 'center', marginTop: 40 }]}>
              Be the first to start the conversation 👋
            </Text>
          )}
          {messages.map((m, i) => {
            const isMe = m.user_id === String(user?.id);
            return (
              <View key={i} style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                {!isMe && (
                  <Text style={[Typography.label, { color: C.brandPurple, fontSize: 10, marginBottom: 2 }]}>
                    {m.user_name} · {m.user_role?.toUpperCase()}
                  </Text>
                )}
                <Text style={[Typography.body, { color: isMe ? C.white : C.textPrimary }]}>
                  {m.message}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput value={input} onChangeText={setInput}
            placeholder="Type a message..." placeholderTextColor={C.textMuted}
            style={styles.input} testID="room-input"
            onSubmitEditing={send} multiline maxLength={500} />
          <TouchableOpacity onPress={send} disabled={!input.trim() || loading}
            testID="room-send-btn"
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}>
            <Send size={18} color={C.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.palePurple,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: Spacing.md, paddingBottom: 24 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: C.brandPurple, borderBottomRightRadius: 4 },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: C.surface, borderWidth: 1, borderColor: C.palePurple, borderBottomLeftRadius: 4 },
  inputBar: {
    flexDirection: 'row', gap: 8, padding: Spacing.md,
    borderTopWidth: 1, borderTopColor: C.palePurple,
    backgroundColor: C.surface, alignItems: 'flex-end',
  },
  input: {
    flex: 1, padding: 12, borderRadius: 14,
    backgroundColor: C.background, borderWidth: 1, borderColor: C.palePurple,
    fontFamily: 'DMSans_400Regular', fontSize: 15, color: C.textPrimary, maxHeight: 120,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: C.brandPurple,
    alignItems: 'center', justifyContent: 'center',
  },
});
