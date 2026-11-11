// @ts-nocheck
/**
 * Student -> Messages — real-time direct messaging with network contacts.
 * Uses /api/messages endpoints (REST + WebSocket).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MessageSquare, Send, Search, User, Plus, Users, Wifi, WifiOff } from 'lucide-react-native';
import { request, tokenStore } from '@/src/models/services/api';
import { usePalette } from '../tokens';

/* -- types ---------------------------------------------------------------- */

type Participant = { id: string; name: string; avatar: string | null; role: string };
type ConvSummary = { id: string; participant: Participant; last_message: string; updated_at: string; unread: number };
type Message = { id: string; sender_id: string; text: string; created_at: string; read_at?: string | null };

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
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [networkUsers, setNetworkUsers] = useState<Participant[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const myIdRef = useRef<string>('');

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
    try {
      const res: any = await request('/messages/conversations');
      setConversations(res?.conversations || []);
    } catch { /* no conversations yet */ }
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

  /* -- new conversation: load network users -------------------------------- */
  const openNewChat = async () => {
    setShowNewChat(true);
    try {
      const res: any = await request('/network/discover?limit=50');
      const users = (res?.users || res?.results || []).map((u: any) => ({
        id: u._id || u.id,
        name: u.full_name || u.name || u.email || 'User',
        avatar: u.profile_picture || u.avatar || null,
        role: u.role || 'student',
      }));
      setNetworkUsers(users);
    } catch { setNetworkUsers([]); }
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

  /* -- typing indicator via WebSocket -------------------------------------- */
  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && activeId) {
      wsRef.current.send(JSON.stringify({ type: 'typing', conversation_id: activeId }));
    }
  }, [activeId]);

  const filtered = conversations.filter(c =>
    !searchQ || (c.participant?.name || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  const activeConv = conversations.find(c => c.id === activeId);

  return (
    <View style={[st.root, { backgroundColor: '#F8FAFC' }]}>
      {/* Sidebar */}
      <View style={[st.sidebar, { backgroundColor: P.bg1, borderRightColor: P.glassBorder }]}>
        <View style={st.sideHeader}>
          <MessageSquare size={20} color={P.violet} />
          <Text style={[st.sideTitle, { color: P.text }]}>Messages</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {wsConnected
              ? <Wifi size={14} color="#10B981" />
              : <WifiOff size={14} color="#94A3B8" />
            }
            <Pressable onPress={openNewChat} style={[st.newBtn, { backgroundColor: P.violet + '14' }]}>
              <Plus size={18} color={P.violet} />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={[st.searchBox, { backgroundColor: P.glassSoft, borderColor: P.glassBorder }]}>
          <Search size={16} color={P.dim} />
          <TextInput
            style={[st.searchInput, { color: P.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={P.dim}
            value={searchQ}
            onChangeText={setSearchQ}
          />
        </View>

        <ScrollView style={st.convList}>
          {loading && <ActivityIndicator size="small" color={P.violet} style={{ marginTop: 20 }} />}
          {!loading && filtered.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
              <Users size={32} color={P.dim} style={{ marginBottom: 8 }} />
              <Text style={[st.emptyText, { color: P.dim }]}>No conversations yet</Text>
              <Text style={{ color: P.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                Tap + to start chatting with someone from your network
              </Text>
            </View>
          )}
          {filtered.map(c => (
            <Pressable
              key={c.id}
              style={[st.convItem, activeId === c.id && { backgroundColor: P.violet + '10' }]}
              onPress={() => setActiveId(c.id)}
            >
              <View style={[st.avatar, { backgroundColor: P.violet + '1A' }]}>
                <User size={18} color={P.violet} />
              </View>
              <View style={st.convText}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[st.convTitle, { color: P.text }]} numberOfLines={1}>{c.participant?.name || 'User'}</Text>
                  <Text style={{ fontSize: 10, color: P.dim }}>{formatDate(c.updated_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[st.convPreview, { color: P.muted }]} numberOfLines={1}>{c.last_message || 'Start chatting...'}</Text>
                  {c.unread > 0 && (
                    <View style={{ backgroundColor: P.violet, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{c.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Chat panel */}
      <View style={st.chatPanel}>
        {showNewChat ? (
          /* New conversation picker */
          <View style={{ flex: 1, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Pressable onPress={() => setShowNewChat(false)} style={{ marginRight: 12 }}>
                <Text style={{ color: P.violet, fontWeight: '600' }}>Back</Text>
              </Pressable>
              <Text style={{ fontSize: 18, fontWeight: '700', color: P.text }}>New Conversation</Text>
            </View>
            <View style={[st.searchBox, { backgroundColor: P.glassSoft, borderColor: P.glassBorder, marginHorizontal: 0, marginBottom: 16 }]}>
              <Search size={16} color={P.dim} />
              <TextInput
                style={[st.searchInput, { color: P.text }]}
                placeholder="Search people..."
                placeholderTextColor={P.dim}
                value={userSearch}
                onChangeText={setUserSearch}
              />
            </View>
            <ScrollView>
              {networkUsers
                .filter(u => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()))
                .map(u => (
                  <Pressable
                    key={u.id}
                    style={[st.convItem, { paddingVertical: 10 }]}
                    onPress={() => startConversation(u.id)}
                  >
                    <View style={[st.avatar, { backgroundColor: P.violet + '1A' }]}>
                      <User size={18} color={P.violet} />
                    </View>
                    <View>
                      <Text style={[st.convTitle, { color: P.text }]}>{u.name}</Text>
                      <Text style={{ fontSize: 11, color: P.muted, textTransform: 'capitalize' }}>{u.role}</Text>
                    </View>
                  </Pressable>
                ))
              }
              {networkUsers.length === 0 && (
                <Text style={{ color: P.dim, textAlign: 'center', marginTop: 20 }}>Loading network...</Text>
              )}
            </ScrollView>
          </View>
        ) : !activeId ? (
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

        {/* Input bar (shown when in a conversation) */}
        {activeId && !showNewChat && (
          <View style={[st.inputBar, { borderTopColor: P.glassBorder }]}>
            <TextInput
              style={[st.input, { color: P.text, backgroundColor: P.bg1, borderColor: P.glassBorder }]}
              placeholder="Type a message..."
              placeholderTextColor={P.dim}
              value={input}
              onChangeText={(t) => { setInput(t); sendTyping(); }}
              onSubmitEditing={sendMessage}
              multiline
            />
            <Pressable
              onPress={sendMessage}
              style={[st.sendBtn, { backgroundColor: input.trim() ? P.violet : P.glassSoft }]}
              disabled={!input.trim() || sending}
            >
              <Send size={18} color={input.trim() ? '#FFFFFF' : P.dim} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

/* -- styles --------------------------------------------------------------- */

const st = StyleSheet.create({
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
  convPreview: { fontSize: 12, marginTop: 2, flex: 1 },
  emptyText: { fontSize: 13, textAlign: 'center' },

  /* chat */
  chatPanel: { flex: 1, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1 },
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

  /* input */
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
