/**
 * AI Chat — purple/Material rebrand
 * Conversational AI career coach (Claude Sonnet 4.5).
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Sparkles, Plus, Clock, MessageSquarePlus, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { api } from '@/src/models/services/api';
import type { ChatMsg } from '@/src/models/entities';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

const SUGGESTIONS = [
  'What courses should I take next?',
  'Suggest 3 career opportunities for me',
  'How do I prepare for top US universities?',
  'Help me plan my next 6 months',
];

export default function ChatScreen() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'User';
  
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const initialPromptSent = useRef(false);

  // Restore conversation history on mount
  useEffect(() => {
    let isMounted = true;
    api.chatHistory().then((res) => {
      if (!isMounted) return;
      if (res.messages?.length) {
        setMessages(res.messages.map((m: any) => ({ role: m.role, content: m.content })));
      }
      if (prompt && !initialPromptSent.current) {
        initialPromptSent.current = true;
        setTimeout(() => {
          if (isMounted) send(prompt);
        }, 100);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [prompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setInput('');
    setSelectedFiles([]);
  };

  const showHistory = () => {
    setLoading(true);
    api.chatSessions().then((res) => {
      if (res.sessions?.length) {
        setSessions(res.sessions);
        setShowSessions(true);
      } else {
        alert("No history found.");
      }
    }).catch(() => alert("Failed to load sessions.")).finally(() => setLoading(false));
  };

  const loadSession = (sid: string) => {
    setShowSessions(false);
    setLoading(true);
    api.chatHistory(sid).then((res) => {
      if (res.messages?.length) {
        setMessages(res.messages.map((m: any) => ({ role: m.role, content: m.content })));
        setSessionId(sid);
      } else {
        alert("No messages found.");
      }
    }).catch(() => alert("Failed to load history.")).finally(() => setLoading(false));
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', '*/*'],
        multiple: true,
      });
      if (result.canceled === false) {
        setSelectedFiles(prev => [...prev, ...result.assets]);
      }
    } catch (err) {
      console.log('Error picking document', err);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const send = async (text?: string) => {
    let msg = (text ?? input).trim();
    if (!msg && selectedFiles.length === 0) return;
    if (loading) return;
    
    // For now, if files are attached, we just append their names to the message
    // (Full backend processing would send the actual file data)
    if (selectedFiles.length > 0) {
      const fileNames = selectedFiles.map(f => f.name).join(', ');
      msg = `[Attached files: ${fileNames}]\n\n${msg}`;
    }
    
    setInput('');
    setSelectedFiles([]);
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
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>Agent K</Text>
            </View>
            <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>
              POWERED BY AI
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={showHistory} style={styles.actionBtn}>
              <Clock size={20} color={C.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={startNewChat} style={styles.actionBtn}>
              <MessageSquarePlus size={20} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.messages}>
          {messages.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Sparkles size={40} color={C.white} />
              </View>
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <Text style={[Typography.h2, { color: C.textPrimary, textAlign: 'center' }]}>
                  Meet Agent K
                </Text>
                <View style={{ backgroundColor: C.brandPurple + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8, marginBottom: 16 }}>
                  <Text style={[Typography.label, { color: C.brandPurple }]}>YOUR AI CAREER COACH</Text>
                </View>
                <Text style={[Typography.h3, { color: C.textPrimary, textAlign: 'center' }]}>
                  Hi {firstName}, how can I help?
                </Text>
                <Text style={[Typography.body, { color: C.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }]}>
                  I'm here to help you navigate courses, find career opportunities, connect with mentors, and plan your career roadmap.
                </Text>
              </View>
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
                {m.content.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
                  if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                    return (
                      <Text key={idx} style={Typography.bodyBold}>
                        {part.slice(2, -2)}
                      </Text>
                    );
                  }
                  return <Text key={idx}>{part}</Text>;
                })}
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

        <View style={styles.inputArea}>
          {selectedFiles.length > 0 && (
            <ScrollView horizontal style={styles.fileList} showsHorizontalScrollIndicator={false}>
              {selectedFiles.map((f, i) => (
                <View key={i} style={styles.fileChip}>
                  <Text style={styles.fileChipText} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => removeFile(i)} style={styles.fileChipRemove}>
                    <X size={14} color={C.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7} onPress={pickDocument}>
              <Plus size={20} color={C.textSecondary} />
            </TouchableOpacity>
            <TextInput value={input} onChangeText={setInput}
              placeholder="Ask anything..." placeholderTextColor={C.textMuted}
              style={styles.input} onSubmitEditing={() => send()}
              testID="chat-input" multiline maxLength={1000} />
            <TouchableOpacity onPress={() => send()}
              disabled={(!input.trim() && selectedFiles.length === 0) || loading} testID="chat-send-btn"
              style={[styles.sendBtn, ((!input.trim() && selectedFiles.length === 0) || loading) && { opacity: 0.5 }]}>
              <Send size={18} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showSessions} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={Typography.h3}>Past Chats</Text>
              <TouchableOpacity onPress={() => setShowSessions(false)}>
                <X size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {sessions.map((s, i) => (
                <TouchableOpacity key={i} style={styles.sessionItem} onPress={() => loadSession(s.session_id)}>
                  <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={1}>{s.preview}</Text>
                  <Text style={[Typography.label, { color: C.textSecondary }]}>{new Date(s.timestamp).toLocaleDateString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: C.background },
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
  inputArea: {
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.palePurple,
    paddingTop: 8,
  },
  fileList: {
    paddingHorizontal: Spacing.md,
    marginBottom: 8,
    maxHeight: 40,
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.brandPurple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    maxWidth: 200,
  },
  fileChipText: {
    color: C.white,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    marginRight: 6,
    flexShrink: 1,
  },
  fileChipRemove: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 2,
  },
  inputBar: {
    flexDirection: 'row', gap: 8,
    padding: Spacing.md, paddingTop: 0,
    alignItems: 'flex-end',
  },
  attachBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.background, borderRadius: 12, borderWidth: 1, borderColor: C.palePurple,
    marginBottom: 2
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
    marginBottom: 2
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sessionItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.palePurple },
});
