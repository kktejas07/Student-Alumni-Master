/**
 * AI Chat - Career guidance chatbot (Claude)
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { api } from '@/src/models/services/api';
import type { ChatMsg } from '@/src/models/entities';

const C = Colors.light;

const SUGGESTIONS = [
  'What courses should I take next?',
  'Suggest 3 internships for me',
  'How do I prepare for top US universities?',
  'Help me plan my next 6 months',
];

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api
      .chatHistory()
      .then((res) => {
        if (res.messages?.length) {
          setMessages(res.messages.map((m: any) => ({ role: m.role, content: m.content })));
          setSessionId(res.messages[0]?.session_id);
        }
      })
      .catch(() => {});
  }, []);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await api.chatSend(msg, sessionId);
      setSessionId(res.session_id);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I hit an issue: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} testID="chat-back-btn" style={styles.backBtn}>
            <ArrowLeft size={22} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color={C.accentPink} />
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>Career AI</Text>
            </View>
            <Text style={[Typography.caption, { color: C.textSecondary }]}>Powered by Claude</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Sparkles size={32} color={C.textPrimary} />
              </View>
              <Text style={[Typography.h3, { color: C.textPrimary, textAlign: 'center', marginTop: 16 }]}>
                Hi, I'm your{' '}
                <Text style={{ color: C.accentPink }}>Career AI</Text>
              </Text>
              <Text
                style={[Typography.body, { color: C.textSecondary, textAlign: 'center', marginTop: 8 }]}
              >
                Ask me anything about courses, internships, mentors, your roadmap, or any career topic.
              </Text>

              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => send(s)}
                    activeOpacity={0.85}
                    testID={`chat-suggestion-${s.slice(0, 10)}`}
                  >
                    <View style={styles.suggestionChip}>
                      <Text style={[Typography.bodySm, { color: C.textPrimary }]}>{s}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
              testID={`chat-message-${i}`}
            >
              <Text
                style={[
                  Typography.body,
                  { color: m.role === 'user' ? C.primaryText : C.textPrimary },
                ]}
              >
                {m.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator color={C.textPrimary} size="small" />
              <Text style={[Typography.bodySm, { color: C.textSecondary }]}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything..."
            placeholderTextColor={C.textMuted}
            style={styles.input}
            onSubmitEditing={() => send()}
            testID="chat-input"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={() => send()}
            disabled={!input.trim() || loading}
            testID="chat-send-btn"
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]}
          >
            <Send size={18} color={C.primaryText} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  messages: { padding: Spacing.md, paddingBottom: 24 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: { marginTop: 28, gap: 10, width: '100%' },
  suggestionChip: {
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.surface,
    padding: 14,
  },
  bubble: {
    maxWidth: '85%',
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: C.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: C.surface,
    borderBottomLeftRadius: 4,
  },
  inputBar: {
    flexDirection: 'row',
    gap: 8,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 2,
    borderTopColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: C.background,
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    color: C.textPrimary,
    maxHeight: 120,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.accentPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
