/**
 * AIRentalAdvisor.tsx
 * Floating chat widget with slash commands for Rentals / Stays.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const SLASH_CHIPS = [
  { cmd: '/housing', label: 'Student housing', icon: 'home-search' as const },
  { cmd: '/vehicle', label: 'Rent a vehicle', icon: 'car' as const },
  { cmd: '/budget 10000', label: 'Under ₹10k/mo', icon: 'currency-inr' as const },
  { cmd: '/cowork', label: 'Coworking space', icon: 'laptop' as const },
  { cmd: '/hotel', label: 'Hotels & stays', icon: 'bed' as const },
  { cmd: '/wifi', label: 'With WiFi & AC', icon: 'wifi' as const },
];

const C = {
  bg: '#0F091D',
  surface: 'rgba(95,37,159,0.15)',
  border: '#3A1F5D',
  text: '#fff',
  text2: '#D6C8F0',
  text3: '#8E7CA6',
  accent: '#22D3EE',
};

export default function AIRentalAdvisor({
  open,
  setOpen,
}: { open: boolean; setOpen: (o: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your SA Stay AI Assistant. Ask me anything about student housing, vehicle rentals, co-working spaces, or bookings near your campus!",
      }]);
    }
  }, [open]);

  const send = async (msg?: string) => {
    const text = (msg ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setBusy(true);
    try {
      const r = await request<{ reply?: string; message?: string }>(
        '/ai/chat',
        {
          method: 'POST',
          body: {
            message: `[rentals] ${text}`,
            session_id: 'fab-stay-ai',
          },
        });
      setMessages((prev) => [...prev, {
        role: 'assistant', text: r.reply || r.message || 'No response from Stay AI.',
      }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: "Sorry, I'm having trouble connecting to the AI helper right now. Please try again in a moment.",
      }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <Pressable onPress={() => setOpen(false)} style={s.backdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={s.panel}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.brain}>
                <MaterialCommunityIcons name="brain" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>SA Stay AI Assistant</Text>
                <Text style={s.subtitle}>24/7 stays, vehicles & housing support</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={s.closeBtn}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView ref={scrollRef} style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, gap: 10 }}>
              {messages.map((m, i) => (
                <View key={i} style={[s.msgRow,
                  m.role === 'user' && { alignSelf: 'flex-end' }]}>
                  <View style={[s.msgBubble,
                    m.role === 'user'
                      ? { backgroundColor: '#5F259F' }
                      : { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Text style={[s.msgText,
                      m.role === 'user' && { color: '#fff' }]}>
                      {m.text}
                    </Text>
                  </View>
                </View>
              ))}
              {busy && (
                <View style={s.msgRow}>
                  <View style={[s.msgBubble, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <ActivityIndicator color={C.accent} size="small" />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Slash chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}>
              {SLASH_CHIPS.map((c) => (
                <Pressable key={c.cmd}
                  onPress={() => send(c.cmd + ' ')}
                  style={s.slashChip}>
                  <MaterialCommunityIcons name={c.icon} size={11} color={C.accent} />
                  <Text style={s.slashChipText}>{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Input */}
            <View style={s.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                placeholder="Ask Stay AI about housing, prices, rules..."
                placeholderTextColor={C.text3}
                style={s.input}
                returnKeyType="send"
                multiline={false}
              />
              <Pressable onPress={() => send()} disabled={busy}
                style={[s.sendBtn, { backgroundColor: C.accent }, busy && { opacity: 0.6 }]}>
                <MaterialCommunityIcons name="send" size={15} color="#072A30" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = {
  backdrop: { flex: 1, backgroundColor: 'rgba(7,3,15,0.60)',
    justifyContent: 'flex-end', alignItems: 'flex-end' },
  panel: { width: 420, maxWidth: '100%' as any, height: 600, maxHeight: '90%' as any,
    backgroundColor: C.bg, borderRadius: 18, marginRight: 20, marginBottom: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(0,0,0,0.65)' as any },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: C.border },
  brain: { width: 36, height: 36, borderRadius: 999,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 14.5 },
  subtitle: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  closeBtn: { width: 30, height: 30, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },

  msgRow: { maxWidth: '88%' as any },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    gap: 6 },
  msgText: { color: '#fff', fontFamily: 'DMSans_600SemiBold',
    fontSize: 13, lineHeight: 20 },

  slashChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderColor: 'rgba(34,211,238,0.25)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  slashChipText: { color: C.accent, fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderColor: C.border, alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border,
    color: '#fff', fontFamily: 'DMSans_600SemiBold', fontSize: 13,
    outlineWidth: 0 } as any,
  sendBtn: { width: 38, height: 38, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
};
