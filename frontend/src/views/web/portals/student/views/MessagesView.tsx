// @ts-nocheck
/**
 * Student -> Messages — direct messaging with AI assistant and network contacts.
 * Uses existing /api/ai/chat endpoints. User-to-user DM backend to be added later.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MessageSquare, Send, Search, Bot, User, Plus } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { usePalette } from '../tokens';

/* ── types ────────────────────────────────────────────────────────────── */

type Message = { id: string; role: 'user' | 'assistant'; text: string; ts: string };
type Conversation = { id: string; title: string; lastMsg: string; updatedAt: string; messages: Message[] };

/* ── component ───────────────────────────────────────────────────────── */

export function MessagesView() {
  const P = usePalette();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  /* load sessions */
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await request('/ai/chat/sessions');
      const sessions = Array.isArray(res) ? res : res?.sessions || [];
      const convs: Conversation[] = sessions.map((s: any) => ({
        id: s.session_id || s.id || `session-${Date.now().toString(36)}`,
        title: s.title || 'AI Assistant',
        lastMsg: s.last_message || s.preview || '',
        updatedAt: s.updated_at || s.created_at || new Date().toISOString(),
        messages: [],
      }));
      setConversations(convs);
      if (convs.length > 0 && !activeId) {
        setActiveId(convs[0].id);
      }
    } catch {
      // No sessions yet — that is fine
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  /* load history for active conversation */
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      try {
        const res: any = await request(`/ai/chat/history?session_id=${activeId}`);
        const hist = Array.isArray(res) ? res : res?.messages || [];
        setMessages(hist.map((m: any, i: number) => ({
          id: m.id || `msg-${i}`,
          role: m.role || (m.is_user ? 'user' : 'assistant'),
          text: m.text || m.content || m.message || '',
          ts: m.created_at || m.timestamp || '',
        })));
      } catch { setMessages([]); }
    })();
  }, [activeId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
  }, [messages]);

  /* send message */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const sessionId = activeId || `chat-${Date.now().toString(36)}`;
      const res: any = await request('/ai/chat', { method: 'POST', body: { message: text, prompt: text, session_id: sessionId } });
      const reply = res?.response || res?.text || res?.message || res?.reply || 'I received your message.';
      const aiMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', text: reply, ts: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);

      if (!activeId) {
        setActiveId(sessionId);
        setConversations(prev => [{ id: sessionId, title: text.slice(0, 40), lastMsg: reply.slice(0, 60), updatedAt: new Date().toISOString(), messages: [] }, ...prev]);
      }
    } catch (err) {
      const errMsg: Message = { id: `e-${Date.now()}`, role: 'assistant', text: 'Sorry, something went wrong. Please try again.', ts: new Date().toISOString() };
      setMessages(prev => [...prev, errMsg]);
    }
    setSending(false);
  };

  /* new conversation */
  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setInput('');
  };

  const filtered = conversations.filter(c => !searchQ || c.title.toLowerCase().includes(searchQ.toLowerCase()));

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={[s.root, { backgroundColor: '#F8FAFC' }]}>
      {/* Sidebar */}
      <View style={[s.sidebar, { backgroundColor: P.bg1, borderRightColor: P.glassBorder }]}>
        <View style={s.sideHeader}>
          <MessageSquare size={20} color={P.violet} />
          <Text style={[s.sideTitle, { color: P.text }]}>Messages</Text>
          <Pressable onPress={startNew} style={[s.newBtn, { backgroundColor: P.violet + '14' }]}>
            <Plus size={18} color={P.violet} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[s.searchBox, { backgroundColor: P.glassSoft, borderColor: P.glassBorder }]}>
          <Search size={16} color={P.dim} />
          <TextInput
            style={[s.searchInput, { color: P.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={P.dim}
            value={searchQ}
            onChangeText={setSearchQ}
          />
        </View>

        <ScrollView style={s.convList}>
          {loading && <ActivityIndicator size="small" color={P.violet} style={{ marginTop: 20 }} />}
          {!loading && filtered.length === 0 && (
            <Text style={[s.emptyText, { color: P.dim }]}>No conversations yet</Text>
          )}
          {filtered.map(c => (
            <Pressable
              key={c.id}
              style={[s.convItem, activeId === c.id && { backgroundColor: P.violet + '10' }]}
              onPress={() => setActiveId(c.id)}
            >
              <View style={[s.avatar, { backgroundColor: P.violet + '1A' }]}>
                <Bot size={18} color={P.violet} />
              </View>
              <View style={s.convText}>
                <Text style={[s.convTitle, { color: P.text }]} numberOfLines={1}>{c.title}</Text>
                <Text style={[s.convPreview, { color: P.muted }]} numberOfLines={1}>{c.lastMsg || 'Start chatting...'}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Chat panel */}
      <View style={s.chatPanel}>
        {!activeId && messages.length === 0 ? (
          <View style={s.emptyChat}>
            <View style={[s.emptyIcon, { backgroundColor: P.violet + '14' }]}>
              <MessageSquare size={40} color={P.violet} />
            </View>
            <Text style={[s.emptyChatTitle, { color: P.text }]}>Start a Conversation</Text>
            <Text style={[s.emptyChatSub, { color: P.muted }]}>Chat with the AI assistant or connect with your network. Type a message below to get started.</Text>
          </View>
        ) : (
          <ScrollView ref={scrollRef} style={s.msgList} contentContainerStyle={{ padding: 20, paddingBottom: 8 }}>
            {messages.map(m => (
              <View key={m.id} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                <View style={[s.bubbleAvatar, { backgroundColor: m.role === 'user' ? P.violet + '1A' : '#E0F2FE' }]}>
                  {m.role === 'user' ? <User size={14} color={P.violet} /> : <Bot size={14} color="#0284C7" />}
                </View>
                <View style={[s.bubbleContent, { backgroundColor: m.role === 'user' ? P.violet : '#FFFFFF', borderColor: m.role === 'user' ? 'transparent' : P.glassBorder }]}>
                  <Text style={[s.bubbleText, { color: m.role === 'user' ? '#FFFFFF' : P.text }]}>{m.text}</Text>
                  {m.ts && <Text style={[s.bubbleTime, { color: m.role === 'user' ? 'rgba(255,255,255,0.6)' : P.dim }]}>{formatTime(m.ts)}</Text>}
                </View>
              </View>
            ))}
            {sending && (
              <View style={[s.bubble, s.bubbleAI]}>
                <View style={[s.bubbleAvatar, { backgroundColor: '#E0F2FE' }]}>
                  <Bot size={14} color="#0284C7" />
                </View>
                <View style={[s.typingDots]}>
                  <ActivityIndicator size="small" color={P.dim} />
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input */}
        <View style={[s.inputBar, { borderTopColor: P.glassBorder }]}>
          <TextInput
            style={[s.input, { color: P.text, backgroundColor: P.bg1, borderColor: P.glassBorder }]}
            placeholder="Type a message..."
            placeholderTextColor={P.dim}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            multiline
          />
          <Pressable
            onPress={sendMessage}
            style={[s.sendBtn, { backgroundColor: input.trim() ? P.violet : P.glassSoft }]}
            disabled={!input.trim() || sending}
          >
            <Send size={18} color={input.trim() ? '#FFFFFF' : P.dim} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ── styles ──────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  /* sidebar */
  sidebar: { width: 320, borderRightWidth: 1, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
  sideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 12 },
  sideTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  newBtn: { padding: 8, borderRadius: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  convList: { flex: 1 },
  convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  convText: { flex: 1 },
  convTitle: { fontSize: 14, fontWeight: '600' },
  convPreview: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 40 },

  /* chat */
  chatPanel: { flex: 1, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyChatTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyChatSub: { fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: 22 },

  msgList: { flex: 1 },
  bubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  bubbleUser: { flexDirection: 'row-reverse' },
  bubbleAI: {},
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubbleContent: { maxWidth: '70%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  typingDots: { paddingHorizontal: 16, paddingVertical: 12 },

  /* input */
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
