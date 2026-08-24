/**
 * FinancialCoach.tsx — Floating Financial AI Coach (works same as Money Coach bot)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
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
                <View className="flex-row items-center gap-2.5 px-4 py-3.5 border-b" style={{ borderColor: C.border }}>
                  <View className="rounded-full items-center justify-center" style={{ width: 36, height: 36, backgroundColor: '#7C3AED' }}>
                    <MaterialCommunityIcons name="brain" size={18} color="#fff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-body-bold text-sm">Financial AI</Text>
                    <Text className="font-body-semibold text-xs" style={{ color: C.text3 }}>Free · intelligent · 24x7 AI support</Text>
                  </View>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close chatbot"
                    className="rounded-full items-center justify-center"
                    style={{ width: 30, height: 30, backgroundColor: 'rgba(255,255,255,0.06)', cursor: 'pointer', border: 'none', outline: 'none', padding: 0 }}
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#fff" />
                  </button>
                </View>

                {/* Messages scroll area */}
                <ScrollView ref={scrollRef} className="flex-1"
                  contentContainerStyle={{ padding: 14, gap: 10 }}>
                  {messages.map((m, i) => (
                    <View key={i} className="max-w-[88%]" style={{ alignSelf: m.role === 'user' ? 'flex-end' : undefined }}>
                      <View className="px-3 py-2.5 rounded-2xl gap-1.5"
                        style={{
                          backgroundColor: m.role === 'user' ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                          borderColor: m.role !== 'user' ? C.border : undefined,
                          borderWidth: m.role !== 'user' ? 1 : undefined,
                        }}>
                        <Text className="font-body-semibold text-xs text-white" style={{ lineHeight: 19 }}>
                          {m.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {busy && (
                    <View className="max-w-[88%]">
                      <View className="px-3 py-2.5 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <ActivityIndicator color="#A78BFA" size="small" />
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  className="grow-0"
                  contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}>
                  {SLASH_CHIPS.map((c) => (
                    <button key={c.cmd}
                      onClick={() => send(c.cmd)}
                      className="flex-row items-center gap-1.5 rounded-full"
                      style={{
                        padding: '6px 14px',
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
                      <Text className="font-body-bold text-xs text-white">{c.label}</Text>
                    </button>
                  ))}
                </ScrollView>

                {/* Input row */}
                <View className="flex-row gap-2 px-3.5 py-3 border-t items-center" style={{ borderColor: C.border }}>
                  <TextInput
                    ref={inputRef as any}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => send()}
                    placeholder="Ask about scholarships, loans, funding..."
                    placeholderTextColor={C.text3}
                    className="flex-1 px-3.5 py-2.5 rounded-full font-body-semibold text-xs text-white"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border, outlineWidth: 0 }}
                    returnKeyType="send"
                  />
                  <button onClick={() => send()}
                    disabled={busy}
                    aria-label="Send message"
                    className="rounded-full items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      backgroundColor: '#7C3AED',
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
      <Pressable className="flex-1 justify-end items-end" style={{ backgroundColor: 'rgba(10,5,22,0.55)' }} onPress={() => setOpen(false)}>
        <Pressable className="rounded-2xl overflow-hidden" style={{ width: 420, maxWidth: '100%', height: 600, maxHeight: '90%', backgroundColor: C.bg, marginRight: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border, boxShadow: '0 24px 60px rgba(0,0,0,0.65)' } as any} onPress={(e) => e.stopPropagation()}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1">
            <View className="flex-row items-center gap-2.5 px-4 py-3.5 border-b" style={{ borderColor: C.border }}>
              <View className="rounded-full items-center justify-center" style={{ width: 36, height: 36, backgroundColor: '#7C3AED' }}>
                <MaterialCommunityIcons name="brain" size={18} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-body-bold text-sm">Financial AI</Text>
                <Text className="font-body-semibold text-xs" style={{ color: C.text3 }}>Free · intelligent · 24x7 AI support</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} className="rounded-full items-center justify-center" style={{ width: 30, height: 30, backgroundColor: 'rgba(255,255,255,0.06)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </Pressable>
            </View>

            <ScrollView ref={scrollRef} className="flex-1"
              contentContainerStyle={{ padding: 14, gap: 10 }}>
              {messages.map((m, i) => (
                <View key={i} className="max-w-[88%]" style={{ alignSelf: m.role === 'user' ? 'flex-end' : undefined }}>
                  <View className="px-3 py-2.5 rounded-2xl gap-1.5"
                    style={{
                      backgroundColor: m.role === 'user' ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                      borderColor: m.role !== 'user' ? C.border : undefined,
                      borderWidth: m.role !== 'user' ? 1 : undefined,
                    }}>
                    <Text className="font-body-semibold text-xs text-white" style={{ lineHeight: 19 }}>
                      {m.text}
                    </Text>
                  </View>
                </View>
              ))}
              {busy && (
                <View className="max-w-[88%]">
                  <View className="px-3 py-2.5 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <ActivityIndicator color="#A78BFA" size="small" />
                  </View>
                </View>
              )}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              className="grow-0"
              contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}>
              {SLASH_CHIPS.map((c) => (
                <Pressable key={c.cmd}
                  onPress={() => send(c.cmd)}
                  className="flex-row items-center gap-1.5 rounded-full"
                  style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border, borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }}>
                  <MaterialCommunityIcons name={c.icon} size={11} color="#A78BFA" />
                  <Text className="font-body-bold text-xs text-white">{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View className="flex-row gap-2 px-3.5 py-3 border-t items-center" style={{ borderColor: C.border }}>
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                placeholder="Ask about scholarships, loans, funding..."
                placeholderTextColor={C.text3}
                className="flex-1 px-3.5 py-2.5 rounded-full font-body-semibold text-xs text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.border, outlineWidth: 0 }}
                returnKeyType="send"
              />
              <Pressable onPress={() => send()} disabled={busy}
                className="rounded-full items-center justify-center"
                style={{ width: 38, height: 38, backgroundColor: '#7C3AED', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}), opacity: busy ? 0.6 : 1 }}>
                <MaterialCommunityIcons name="send" size={15} color="#fff" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
