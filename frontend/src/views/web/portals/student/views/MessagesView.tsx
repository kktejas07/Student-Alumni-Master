/**
 * Student -> Messages — real-time direct messaging with network contacts.
 * Uses /api/messages endpoints (REST + WebSocket).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { MessageSquare, Send, Search, Bot, User, Plus, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react-native';
import { request, tokenStore } from '@/src/models/services/api';
import { usePalette } from '../tokens';

/* -- types ---------------------------------------------------------------- */

type Participant = { id: string; name: string; avatar: string | null; role: string };
type ConvSummary = { id: string; participant: Participant; last_message: string; updated_at: string; unread: number };
type Message = { id: string; sender_id: string; text: string; created_at: string; read_at?: string | null };
type Conversation = { id: string; title: string; lastMsg: string; updatedAt: string; messages: Message[]; participant?: Participant; unread?: number };

/* -- helpers -------------------------------------------------------------- */

const getBaseWsUrl = (): string => {
  if (Platform.OS !== 'web') return '';
  const loc = typeof window !== 'undefined' ? window.location : null;
  if (!loc) return '';
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${loc.host}`;
};

const formatTime = (ts: string) => {
  if (!ts) return '';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatDate = (ts: string) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* -- component ------------------------------------------------------------ */

export function MessagesView() {
  const P = usePalette();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [, setWsConnected] = useState(false);
  const [, setShowNewChat] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string>('');

  const filtered = conversations.filter(c =>
    !searchQ || c.title.toLowerCase().includes(searchQ.toLowerCase())
  );
  const activeConv = conversations.find(c => c.id === activeId);

  /* -- load current user ID ------------------------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const me: any = await request('/users/me');
        myIdRef.current = me?._id || me?.id || '';
      } catch { /* auth might not be ready */ }
    })();
  }, []);

  /* -- WebSocket connection ------------------------------------------------ */
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connect = async () => {
      const token = await tokenStore.getAccess();
      if (!token || Platform.OS !== 'web') return;

      const baseWs = getBaseWsUrl();
      if (!baseWs) return;

      ws = new WebSocket(`${baseWs}/api/messages/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'new_message') {
            // Update messages if we're in this conversation
            setActiveId(currentId => {
              if (currentId === data.conversation_id) {
                setMessages(prev => {
                  // Avoid duplicates (we already added our own sent message optimistically)
                  if (prev.some(m => m.id === data.message.id)) return prev;
                  return [...prev, data.message];
                });
              }
              return currentId;
            });

            // Update conversation list
            setConversations(prev =>
              prev.map(c =>
                c.id === data.conversation_id
                  ? { ...c, last_message: data.message.text, updated_at: data.message.created_at, unread: c.unread + 1 }
                  : c
              )
            );
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        // Reconnect after 5s
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = () => { ws?.close(); };
    };

    connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  /* -- load conversations -------------------------------------------------- */
  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(false);
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
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  /* -- load messages for active conversation ------------------------------- */
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      try {
        const res: any = await request(`/messages/conversations/${activeId}`);
        setMessages(res?.messages || []);
        // Mark as read
        await request(`/messages/conversations/${activeId}/read`, { method: 'PUT' }).catch(() => {});
        // Clear unread count locally
        setConversations(prev => prev.map(c => c.id === activeId ? { ...c, unread: 0 } : c));
      } catch { setMessages([]); }
    })();
  }, [activeId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
  }, [messages]);

  /* -- send message -------------------------------------------------------- */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = { id: tempId, sender_id: myIdRef.current, text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res: any = await request(`/messages/conversations/${activeId}/send`, {
        method: 'POST',
        body: { text },
      });
      // Replace temp message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.id, created_at: res.created_at } : m));
      // Update conversation list
      setConversations(prev =>
        prev.map(c => c.id === activeId ? { ...c, last_message: text, updated_at: res.created_at } : c)
      );
    } catch {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  /* new conversation */
  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setInput('');
    if (isMobile) setShowChat(true);
  };

  const selectConversation = (id: string) => {
    setActiveId(id);
    if (isMobile) setShowChat(true);
  };

  const goBackToList = () => {
    setShowChat(false);
  };

  const startConversation = async (participantId: string) => {
    try {
      const res: any = await request('/messages/conversations', {
        method: 'POST',
        body: { participant_id: participantId },
      });
      setShowNewChat(false);
      setActiveId(res.id);
      await loadConversations();
    } catch (err: any) {
      // Conversation might already exist
    }
  };

  const showSidebar = !isMobile || !showChat;
  const showChatPanel = !isMobile || showChat;

  return (
    <View style={[st.root, { backgroundColor: '#F8FAFC' }]}>
      {/* Sidebar */}
      {showSidebar && (
        <View style={[s.sidebar, { backgroundColor: P.bg1, borderRightColor: P.glassBorder }, isMobile && { width: '100%', borderRightWidth: 0 }]}>
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
            {/* Skeleton loader */}
            {loading && (
              <View style={{ padding: 12, gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' }} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ height: 14, backgroundColor: '#E5E7EB', borderRadius: 8, width: '70%' }} />
                      <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 8, width: '90%' }} />
                    </View>
                  </View>
                ))}
              </View>
            )}
            {/* Error state */}
            {!loading && error && (
              <Pressable onPress={loadConversations} style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
                <AlertCircle size={28} color="#EF4444" />
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Failed to load</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={12} color="#7C5CFC" />
                  <Text style={{ fontSize: 12, color: '#7C5CFC', fontWeight: '600' }}>Tap to retry</Text>
                </View>
              </Pressable>
            )}
            {/* Empty state */}
            {!loading && !error && filtered.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
                <MessageSquare size={36} color="#CBD5E1" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>No conversations yet</Text>
                <Text style={{ fontSize: 12, color: '#94A3B8' }}>Start chatting with your network</Text>
              </View>
            )}
            {!loading && !error && filtered.map(c => (
              <Pressable
                key={c.id}
                style={[s.convItem, activeId === c.id && { backgroundColor: P.violet + '10' }]}
                onPress={() => selectConversation(c.id)}
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
      )}

      {/* Chat panel */}
      {showChatPanel && <View style={s.chatPanel}>
        {/* Mobile back button */}
        {isMobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: P.glassBorder }}>
            <Pressable onPress={goBackToList} style={{ padding: 6, marginRight: 8 }}>
              <ArrowLeft size={20} color={P.text} />
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: '600', color: P.text }}>{activeId ? 'Chat' : 'New Chat'}</Text>
          </View>
        )}
        {!activeId && messages.length === 0 ? (
          <View style={st.emptyChat}>
            <View style={[st.emptyIcon, { backgroundColor: P.violet + '14' }]}>
              <MessageSquare size={40} color={P.violet} />
            </View>
            <Text style={[st.emptyChatTitle, { color: P.text }]}>Start a Conversation</Text>
            <Text style={[st.emptyChatSub, { color: P.muted }]}>
              Connect with alumni, mentors, and fellow students. Tap the + button to find someone from your network.
            </Text>
          </View>
        ) : (
          <>
            {/* Chat header */}
            <View style={[st.chatHeader, { borderBottomColor: P.glassBorder }]}>
              <View style={[st.avatar, { backgroundColor: P.violet + '1A', width: 36, height: 36, borderRadius: 18 }]}>
                <User size={16} color={P.violet} />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: P.text }}>{activeConv?.participant?.name || 'User'}</Text>
                <Text style={{ fontSize: 11, color: P.muted, textTransform: 'capitalize' }}>{activeConv?.participant?.role || 'student'}</Text>
              </View>
            </View>

            {/* Messages */}
            <ScrollView ref={scrollRef} style={st.msgList} contentContainerStyle={{ padding: 20, paddingBottom: 8 }}>
              {messages.map(m => {
                const isMe = m.sender_id === myIdRef.current;
                return (
                  <View key={m.id} style={[st.bubble, isMe ? st.bubbleUser : st.bubbleOther]}>
                    {!isMe && (
                      <View style={[st.bubbleAvatar, { backgroundColor: P.violet + '1A' }]}>
                        <User size={14} color={P.violet} />
                      </View>
                    )}
                    <View style={[st.bubbleContent, {
                      backgroundColor: isMe ? P.violet : '#FFFFFF',
                      borderColor: isMe ? 'transparent' : P.glassBorder,
                    }]}>
                      <Text style={[st.bubbleText, { color: isMe ? '#FFFFFF' : P.text }]}>{m.text}</Text>
                      {m.created_at && (
                        <Text style={[st.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.6)' : P.dim }]}>
                          {formatTime(m.created_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
              {sending && (
                <View style={[st.bubble, st.bubbleOther]}>
                  <View style={st.typingDots}>
                    <ActivityIndicator size="small" color={P.dim} />
                  </View>
                </View>
              )}
            </ScrollView>
          </>
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
      </View>}
    </View>
  );
}

/* -- styles --------------------------------------------------------------- */

const s = StyleSheet.create({
  sidebar: { width: 320, borderRightWidth: 1 },
  sideHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 12 },
  sideTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  newBtn: { padding: 8, borderRadius: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
  convList: { flex: 1 },
  convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  convText: { flex: 1 },
  convTitle: { fontSize: 14, fontWeight: '600' },
  convPreview: { fontSize: 12, marginTop: 2, flex: 1 },
  chatPanel: { flex: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});

const st = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  /* chat */
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyChatTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyChatSub: { fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: 22 },

  msgList: { flex: 1 },
  bubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  bubbleUser: { flexDirection: 'row-reverse' },
  bubbleOther: {},
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubbleContent: { maxWidth: '70%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  typingDots: { paddingHorizontal: 16, paddingVertical: 12 },
});
