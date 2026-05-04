/**
 * AICourseAdvisor.tsx
 * Floating chat widget with slash commands.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';

type Course = any;

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  cmd?: string;
  courses?: Course[];
}

const SLASH_CHIPS = [
  { cmd: '/path', label: 'Build a learning path', icon: 'rocket-launch' as const },
  { cmd: '/free', label: 'Free courses', icon: 'gift' as const },
  { cmd: '/cert', label: 'Cert routes', icon: 'certificate' as const },
  { cmd: '/recommend', label: 'Recommend', icon: 'star-four-points' as const },
  { cmd: '/compare', label: 'Compare 2', icon: 'compare-horizontal' as const },
  { cmd: '/schedule', label: 'Weekly plan', icon: 'calendar-clock' as const },
  { cmd: '/budget', label: 'Within budget', icon: 'currency-inr' as const },
];

const C = { bg: '#1A0F2E', surface: 'rgba(67,41,109,0.40)',
            border: '#3D2D5C', text: '#fff', text2: '#B7A8D4',
            text3: '#7B6B95' };

export default function AICourseAdvisor({
  onCourseClick,
}: { onCourseClick: (c: Course) => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your Course Advisor 👋 Ask me anything — try /path ML Engineer, /free Python, or /budget 5000.",
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
      const r = await request<{ reply: string; courses: Course[]; cmd: string }>(
        '/courses/ai/advisor',
        { method: 'POST', body: JSON.stringify({ message: text,
            profile: { weekly_hours: 10, interest: 'AI/ML' } }) });
      setMessages((prev) => [...prev, {
        role: 'assistant', text: r.reply, cmd: r.cmd, courses: r.courses,
      }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: "Hmm, the LLM is unreachable. Try again in a sec — meanwhile check Free / Free Cert filter for hand-picked options.",
      }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <Pressable onPress={() => setOpen(true)} style={s.bubble}>
        <MaterialCommunityIcons name="brain" size={22} color="#fff" />
      </Pressable>

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
                  <Text style={s.title}>SA Course Advisor</Text>
                  <Text style={s.subtitle}>Powered by Claude · free-first recommendations</Text>
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
                        ? { backgroundColor: '#7C3AED' }
                        : { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      {m.cmd && m.role === 'assistant' && (
                        <View style={s.cmdBadge}>
                          <Text style={s.cmdBadgeText}>/{m.cmd}</Text>
                        </View>
                      )}
                      <Text style={[s.msgText,
                        m.role === 'user' && { color: '#fff' }]}>
                        {m.text}
                      </Text>
                      {m.courses && m.courses.length > 0 && (
                        <View style={{ gap: 6, marginTop: 6 }}>
                          {m.courses.slice(0, 4).map((c) => (
                            <Pressable key={c.id} onPress={() => onCourseClick(c)}
                              style={s.miniCourse}>
                              <Text style={{ fontSize: 18 }}>{c.thumbnail}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={s.miniTitle} numberOfLines={1}>{c.title}</Text>
                                <Text style={s.miniMeta}>
                                  {c.provider.name} · {c.duration_label} ·{' '}
                                  {['free','free_audit','free_with_sa'].includes(c.pricing.type)
                                    ? 'FREE'
                                    : `₹${(c.pricing.sa_inr || c.pricing.original_inr || 0).toLocaleString()}`}
                                </Text>
                              </View>
                              <MaterialCommunityIcons name="arrow-top-right" size={13} color="#A78BFA" />
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                {busy && (
                  <View style={s.msgRow}>
                    <View style={[s.msgBubble, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      <ActivityIndicator color="#A78BFA" size="small" />
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Slash chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6 }}>
                {SLASH_CHIPS.map((c) => (
                  <Pressable key={c.cmd}
                    onPress={() => send(c.cmd + ' ')}
                    style={s.slashChip}>
                    <MaterialCommunityIcons name={c.icon} size={11} color="#A78BFA" />
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
                  placeholder="Ask about courses, certs, or career paths…"
                  placeholderTextColor={C.text3}
                  style={s.input}
                  returnKeyType="send"
                  multiline={false}
                />
                <Pressable onPress={() => send()} disabled={busy}
                  style={[s.sendBtn, busy && { opacity: 0.6 }]}>
                  <MaterialCommunityIcons name="send" size={15} color="#fff" />
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bubble: { position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 999,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 28px rgba(124,58,237,0.55)' as any,
    zIndex: 999, ...({ cursor: 'pointer' } as any) },

  backdrop: { flex: 1, backgroundColor: 'rgba(10,5,22,0.55)',
    justifyContent: 'flex-end', alignItems: 'flex-end' },
  panel: { width: 420, maxWidth: '100%', height: 600, maxHeight: '90%',
    backgroundColor: C.bg, borderRadius: 18, marginRight: 20, marginBottom: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(0,0,0,0.65)' as any },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: C.border },
  brain: { width: 36, height: 36, borderRadius: 999,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 14 },
  subtitle: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  closeBtn: { width: 30, height: 30, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },

  msgRow: { maxWidth: '88%' },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    gap: 6 },
  msgText: { color: '#fff', fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5, lineHeight: 19 },
  cmdBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.20)' },
  cmdBadgeText: { color: '#C4B5FD', fontFamily: 'DMSans_900Black',
    fontSize: 9, letterSpacing: 0.6 },

  miniCourse: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingVertical: 7, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.30)', ...({ cursor: 'pointer' } as any) },
  miniTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  miniMeta: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10 },

  slashChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  slashChipText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderColor: C.border, alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border,
    color: '#fff', fontFamily: 'DMSans_600SemiBold', fontSize: 12.5,
    outlineWidth: 0 } as any,
  sendBtn: { width: 38, height: 38, borderRadius: 999,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
});
