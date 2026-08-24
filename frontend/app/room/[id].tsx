/**
 * Single Knowledge Room — chat interface
 * Topical discussion within a room. Messages persisted server-side.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-center" style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.palePurple }}>
          <TouchableOpacity onPress={() => router.back()} className="items-center justify-center" style={{ width: 40, height: 40 }}>
            <ArrowLeft size={22} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={[Typography.bodyBold, { flex: 1, textAlign: 'center', color: C.textPrimary }]}>
            {params.name || 'Room'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 24 }}>
          {messages.length === 0 && (
            <Text style={[Typography.body, { color: C.textMuted, textAlign: 'center', marginTop: 40 }]}>
              Be the first to start the conversation 👋
            </Text>
          )}
          {messages.map((m, i) => {
            const isMe = m.user_id === String(user?.id);
            return (
              <View key={i} className={isMe ? 'self-end' : 'self-start'} style={{ maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: isMe ? C.brandPurple : C.surface, borderBottomRightRadius: isMe ? 4 : 14, borderBottomLeftRadius: isMe ? 14 : 4, borderWidth: isMe ? 0 : 1, borderColor: isMe ? undefined : C.palePurple }}>
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

        <View className="flex-row items-end" style={{ gap: 8, padding: Spacing.md, borderTopWidth: 1, borderTopColor: C.palePurple, backgroundColor: C.surface }}>
          <TextInput value={input} onChangeText={setInput}
            placeholder="Type a message..." placeholderTextColor={C.textMuted}
            className="flex-1" style={{ padding: 12, borderRadius: 14, backgroundColor: C.background, borderWidth: 1, borderColor: C.palePurple, fontFamily: 'DMSans_400Regular', fontSize: 15, color: C.textPrimary, maxHeight: 120 }}
            testID="room-input"
            onSubmitEditing={send} multiline maxLength={500} />
          <TouchableOpacity onPress={send} disabled={!input.trim() || loading}
            testID="room-send-btn"
            className="items-center justify-center" style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: C.brandPurple, opacity: (!input.trim() || loading) ? 0.5 : 1 }}>
            <Send size={18} color={C.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
