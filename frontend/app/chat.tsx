/**
 * AI Chat — purple/Material rebrand
 * Conversational AI career coach (Claude Sonnet 4.5).
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, Sparkles } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { api } from '@/src/models/services/api';
import type { ChatMsg } from '@/src/models/entities';

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
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<ScrollView>(null);

  // Restore conversation history on mount
  useEffect(() => {
    api.chatHistory().then((res) => {
      if (res.messages?.length) {
        setMessages(res.messages.map((m: any) => ({ role: m.role, content: m.content })));
      }
    }).catch(() => {});
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
      setMessages((prev) => [...prev,
        { role: 'assistant', content: `Sorry, I hit an issue: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} testID="chat-back-btn" style={styles.backBtn}>
            <ArrowLeft size={22} color={C.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color={C.brandPurple} />
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>Career AI</Text>
            </View>
            <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>
              POWERED BY CLAUDE
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
          {messages.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Sparkles size={32} color={C.white} />
              </View>
              <Text style={[Typography.h3, { color: C.textPrimary, textAlign: 'center', marginTop: 16 }]}>
                Hi, I'm your{' '}
                <Text style={{ color: C.brandPurple }}>Career AI</Text>
              </Text>
              <Text style={[Typography.body, { color: C.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                Ask anything about courses, internships, mentors, or your roadmap.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <TouchableOpacity key={s} onPress={() => send(s)} activeOpacity={0.7}
                    style={styles.suggestionChip}
                    testID={`chat-suggestion-${s.slice(0, 10)}`}>
                    <Text style={[Typography.bodySm, { color: C.textPrimary }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}
              testID={`chat-message-${i}`}>
              <Text style={[Typography.body, { color: m.role === 'user' ? C.white : C.textPrimary }]}>
                {m.content}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
              <ActivityIndicator color={C.brandPurple} size="small" />
              <Text style={[Typography.bodySm, { color: C.textSecondary }]}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput value={input} onChangeText={setInput}
            placeholder="Ask anything..." placeholderTextColor={C.textMuted}
            style={styles.input} onSubmitEditing={() => send()}
            testID="chat-input" multiline maxLength={1000} />
          <TouchableOpacity onPress={() => send()}
            disabled={!input.trim() || loading} testID="chat-send-btn"
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  messages: { padding: Spacing.md, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: C.brandPurple,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestions: { marginTop: 28, gap: 10, width: '100%' },
  suggestionChip: {
    backgroundColor: C.surface, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: C.palePurple,
  },
  bubble: {
    maxWidth: '85%', padding: 12, borderRadius: 14, marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: C.brandPurple,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.palePurple,
    borderBottomLeftRadius: 4,
  },
  inputBar: {
    flexDirection: 'row', gap: 8,
    padding: Spacing.md, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: C.palePurple,
    backgroundColor: C.surface, alignItems: 'flex-end',
  },
  input: {
    flex: 1, padding: 12, borderRadius: 14,
    backgroundColor: C.background,
    borderWidth: 1, borderColor: C.palePurple,
    fontFamily: 'DMSans_400Regular', fontSize: 15,
    color: C.textPrimary, maxHeight: 120,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: C.brandPurple,
    alignItems: 'center', justifyContent: 'center',
  },
});
