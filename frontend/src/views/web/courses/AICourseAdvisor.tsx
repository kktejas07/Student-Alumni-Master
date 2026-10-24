/**
 * AICourseAdvisor.tsx
 * Floating chat widget with slash commands.
 * Theme-aware (light/dark) for clear contrast and legibility.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';
import { useTheme } from '@/src/theme/ThemeContext';

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

export default function AICourseAdvisor({
  open,
  setOpen,
  onCourseClick,
}: { open: boolean; setOpen: (o: boolean) => void; onCourseClick: (c: Course) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const { isDark } = useTheme();

  const colors = {
    bg: isDark ? '#1A0F2E' : '#FFFFFF',
    border: isDark ? '#3D2D5C' : '#E2E8F0',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? '#B7A8D4' : '#334155',
    text3: isDark ? '#8E7DAE' : '#64748B',
    assistantBubble: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    assistantText: isDark ? '#F8FAFC' : '#0F172A',
    closeBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    closeIcon: isDark ? '#FFFFFF' : '#334155',
    chipBg: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF',
    chipBorder: isDark ? 'rgba(37,99,235,0.30)' : '#BFDBFE',
    chipText: isDark ? '#93C5FD' : '#1D4ED8',
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
    inputBorder: isDark ? '#3D2D5C' : '#CBD5E1',
    inputText: isDark ? '#FFFFFF' : '#0F172A',
    inputPlaceholder: isDark ? '#8E7DAE' : '#94A3B8',
    miniCourseBg: isDark ? 'rgba(0,0,0,0.30)' : '#FFFFFF',
    miniCourseBorder: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
  };

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your Course Advisor ✨ Ask me anything — try /path ML Engineer, /free Python, or /budget 5000.",
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
        {
          method: 'POST',
          body: {
            message: text,
            profile: { weekly_hours: 10, interest: 'AI/ML' },
          },
        });
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
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <Pressable onPress={() => setOpen(false)} style={s.backdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[s.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Header */}
            <View style={[s.header, { borderColor: colors.border }]}>
              <View style={s.brain}>
                <MaterialCommunityIcons name="brain" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, { color: colors.text }]}>SA Course Advisor</Text>
                <Text style={[s.subtitle, { color: colors.text3 }]}>Powered by Claude · free-first recommendations</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={[s.closeBtn, { backgroundColor: colors.closeBg }]}>
                <MaterialCommunityIcons name="close" size={18} color={colors.closeIcon} />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, gap: 10 }}
            >
              {messages.map((m, i) => (
                <View
                  key={i}
                  style={[s.msgRow, m.role === 'user' && { alignSelf: 'flex-end' }]}
                >
                  <View
                    style={[
                      s.msgBubble,
                      m.role === 'user'
                        ? { backgroundColor: '#2563EB' }
                        : { backgroundColor: colors.assistantBubble },
                    ]}
                  >
                    {m.cmd && m.role === 'assistant' && (
                      <View style={[s.cmdBadge, { backgroundColor: colors.chipBg }]}>
                        <Text style={[s.cmdBadgeText, { color: colors.chipText }]}>/{m.cmd}</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        s.msgText,
                        { color: m.role === 'user' ? '#FFFFFF' : colors.assistantText },
                      ]}
                    >
                      {m.text}
                    </Text>
                    {m.courses && m.courses.length > 0 && (
                      <View style={{ gap: 6, marginTop: 6 }}>
                        {m.courses.slice(0, 4).map((c) => (
                          <Pressable
                            key={c.id}
                            onPress={() => onCourseClick(c)}
                            style={[
                              s.miniCourse,
                              { backgroundColor: colors.miniCourseBg, borderColor: colors.miniCourseBorder },
                            ]}
                          >
                            <Text style={{ fontSize: 18 }}>{c.thumbnail}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.miniTitle, { color: colors.text }]} numberOfLines={1}>
                                {c.title}
                              </Text>
                              <Text style={[s.miniMeta, { color: colors.text3 }]}>
                                {c.provider?.name} · {c.duration_label} ·{' '}
                                {['free','free_audit','free_with_sa'].includes(c.pricing?.type)
                                  ? 'FREE'
                                  : `₹${(c.pricing?.sa_inr || c.pricing?.original_inr || 0).toLocaleString()}`}
                              </Text>
                            </View>
                            <MaterialCommunityIcons name="arrow-top-right" size={13} color="#2563EB" />
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {busy && (
                <View style={s.msgRow}>
                  <View style={[s.msgBubble, { backgroundColor: colors.assistantBubble }]}>
                    <ActivityIndicator color="#2563EB" size="small" />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Slash chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}
            >
              {SLASH_CHIPS.map((c) => (
                <Pressable
                  key={c.cmd}
                  onPress={() => send(c.cmd + ' ')}
                  style={[
                    s.slashChip,
                    { backgroundColor: colors.chipBg, borderColor: colors.chipBorder },
                  ]}
                >
                  <MaterialCommunityIcons name={c.icon} size={11} color="#2563EB" />
                  <Text style={[s.slashChipText, { color: colors.chipText }]}>{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Input */}
            <View style={[s.inputRow, { borderColor: colors.border }]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                placeholder="Ask about courses, certs, or career paths…"
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  s.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  },
                ]}
                returnKeyType="send"
                multiline={false}
              />
              <Pressable
                onPress={() => send()}
                disabled={busy}
                style={[s.sendBtn, busy && { opacity: 0.6 }]}
              >
                <MaterialCommunityIcons name="send" size={15} color="#fff" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,5,22,0.55)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  panel: {
    width: 420,
    maxWidth: '100%',
    height: 600,
    maxHeight: '90%',
    borderRadius: 18,
    marginRight: 20,
    marginBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(0,0,0,0.35)' as any,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  brain: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14 },
  subtitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },

  msgRow: { maxWidth: '88%' },
  msgBubble: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  msgText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5,
    lineHeight: 19,
  },
  cmdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cmdBadgeText: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
  },

  miniCourse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  miniTitle: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  miniMeta: { fontFamily: 'DMSans_600SemiBold', fontSize: 10 },

  slashChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  slashChipText: { fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5,
    outlineWidth: 0,
  } as any,
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
});
