/**
 * FinancialCoach.tsx — Floating Financial AI Coach (works same as Money Coach bot)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';

interface CoachMessage {
  role: 'user' | 'assistant';
  text: string;
}

const SLASH_CHIPS = [
  { cmd: '/scholarships', label: 'Find Scholarships', icon: 'trophy-award' as const },
  { cmd: '/loans',        label: 'Compare Loans',      icon: 'bank-outline' as const },
  { cmd: '/startup',      label: 'Startup Funding',    icon: 'rocket-launch' as const },
  { cmd: '/investors',    label: 'Connect with VCs',   icon: 'trending-up' as const },
  { cmd: '/insurance',    label: 'Student Insurance',  icon: 'shield-outline' as const },
];

const C = { bg: '#09080F', surface: '#14121C', border: '#2A2636',
            text: '#fff', text2: '#B7B3C6', text3: '#7B7593' };

const ReactDOM = Platform.OS === 'web' ? require('react-dom') : null;

export default function FinancialCoach({ open, setOpen }: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  // Welcome
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your Financial AI Coach 🪙 Try /scholarships to find matches, /loans to compare rates, or ask me any question about financial services.",
      }]);
    }
  }, [open]);

  // Autofocus input when modal opens
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (open) {
      t = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
    return () => clearTimeout(t);
  }, [open]);

  const send = async (msg?: string) => {
    const text = (msg ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages((p) => [...p, { role: 'user', text }]);
    setBusy(true);
    try {
      const r = await request<any>('/ai/chat', {
        method: 'POST',
        body: { message: `[financial] ${text}`, session_id: 'financial-coach-chat' },
      });
      setMessages((p) => [...p, {
        role: 'assistant',
        text: r?.reply || r?.message || 'No response.',
      }]);
    } catch (e: any) {
      setMessages((p) => [...p, {
        role: 'assistant',
        text: 'Connection error — please try again.',
      }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  };

  if (Platform.OS === 'web' && ReactDOM) {
    return ReactDOM.createPortal(
      <>
        {/* Modal Panel */}
        {open && (
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(10,5,22,0.55)',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-end',
              zIndex: 100000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '420px',
                maxWidth: '100%',
                height: '600px',
                maxHeight: '90%',
                backgroundColor: C.bg,
                borderRadius: '18px',
                marginRight: '20px',
                marginBottom: '20px',
                borderWidth: '1px',
                borderColor: C.border,
                borderStyle: 'solid',
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <KeyboardAvoidingView style={{ flex: 1 }}>
                
                {/* Header */}
                <View style={s.header}>
                  <View style={s.brain}>
                    <MaterialCommunityIcons name="brain" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title}>Financial AI</Text>
                    <Text style={s.subtitle}>Free · intelligent · 24x7 AI support</Text>
                  </View>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close chatbot"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: 'none',
                      outline: 'none',
                      padding: 0,
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#fff" />
                  </button>
                </View>

                {/* Messages scroll area */}
                <ScrollView ref={scrollRef} style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 10 }}>
                  {messages.map((m, i) => (
                    <View key={i} style={[s.msgRow,
                      m.role === 'user' && { alignSelf: 'flex-end' }]}>
                      <View style={[s.msgBubble,
                        m.role === 'user'
                          ? { backgroundColor: '#7C3AED' }
                          : { backgroundColor: 'rgba(255,255,255,0.05)',
                              borderColor: C.border, borderWidth: 1 }]}>
                        <Text style={[s.msgText,
                          m.role === 'user' && { color: '#fff' }]}>
                          {m.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {busy && (
                    <View style={s.msgRow}>
                      <View style={[s.msgBubble, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <ActivityIndicator color="#A78BFA" size="small" />
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}>
                  {SLASH_CHIPS.map((c) => (
                    <button key={c.cmd}
                      onClick={() => send(c.cmd)}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${C.border}`,
                        cursor: 'pointer',
                        color: 'inherit',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        outline: 'none',
                      }}
                    >
                      <MaterialCommunityIcons name={c.icon} size={11} color="#A78BFA" />
                      <Text style={s.slashChipText}>{c.label}</Text>
                    </button>
                  ))}
                </ScrollView>

                {/* Input row */}
                <View style={s.inputRow}>
                  <TextInput
                    ref={inputRef as any}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => send()}
                    placeholder="Ask about scholarships, loans, funding..."
                    placeholderTextColor={C.text3}
                    style={s.input}
                    returnKeyType="send"
                  />
                  <button onClick={() => send()}
                    disabled={busy}
                    aria-label="Send message"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '999px',
                      backgroundColor: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: busy ? 'default' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                      border: 'none',
                      outline: 'none',
                      padding: 0,
                    }}
                  >
                    <MaterialCommunityIcons name="send" size={15} color="#fff" />
                  </button>
                </View>
              </KeyboardAvoidingView>
            </div>
          </div>
        )}
      </>,
      document.body
    );
  }

  return (
    <Modal visible={open} transparent animationType="slide"
            onRequestClose={() => setOpen(false)}>
      <Pressable onPress={() => setOpen(false)} style={s.backdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={s.panel}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}>
            <View style={s.header}>
              <View style={s.brain}>
                <MaterialCommunityIcons name="brain" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>Financial AI</Text>
                <Text style={s.subtitle}>Free · intelligent · 24x7 AI support</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={s.closeBtn}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            <ScrollView ref={scrollRef} style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, gap: 10 }}>
              {messages.map((m, i) => (
                <View key={i} style={[s.msgRow,
                  m.role === 'user' && { alignSelf: 'flex-end' }]}>
                  <View style={[s.msgBubble,
                    m.role === 'user'
                      ? { backgroundColor: '#7C3AED' }
                      : { backgroundColor: 'rgba(255,255,255,0.05)',
                          borderColor: C.border, borderWidth: 1 }]}>
                    <Text style={[s.msgText,
                      m.role === 'user' && { color: '#fff' }]}>
                      {m.text}
                    </Text>
                  </View>
                </View>
              ))}
              {busy && (
                <View style={s.msgRow}>
                  <View style={[s.msgBubble, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <ActivityIndicator color="#A78BFA" size="small" />
                  </View>
                </View>
              )}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}>
              {SLASH_CHIPS.map((c) => (
                <Pressable key={c.cmd}
                  onPress={() => send(c.cmd)}
                  style={s.slashChip}>
                  <MaterialCommunityIcons name={c.icon} size={11} color="#A78BFA" />
                  <Text style={s.slashChipText}>{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={s.inputRow}>
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                placeholder="Ask about scholarships, loans, funding..."
                placeholderTextColor={C.text3}
                style={s.input}
                returnKeyType="send"
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
  );
}

const s = StyleSheet.create({
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
  msgBubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, gap: 6 },
  msgText: { color: '#fff', fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5, lineHeight: 19 },

  /* Slash chip */
  slashChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: C.border, borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  slashChipText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Input */
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
