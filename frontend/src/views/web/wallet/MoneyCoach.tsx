/**
 * MoneyCoach.tsx — Floating Wallet AI Money Coach (deterministic — no LLM cost)
 * Slash commands: /spend /save /credit-plan /optimize /forecast /cashback /alert /split /dispute /tax
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
  cmd?: string;
  cards?: any[];
  actions?: { label: string; action: string; url?: string }[];
}

const SLASH_CHIPS = [
  { cmd: '/credit-plan', label: 'Build a credit plan', icon: 'star-four-points' as const },
  { cmd: '/spend',       label: 'Where did money go?', icon: 'chart-donut'       as const },
  { cmd: '/forecast',    label: 'Forecast end-of-month',icon: 'crystal-ball'     as const },
  { cmd: '/cashback',    label: 'Find missed cashback', icon: 'sale'             as const },
  { cmd: '/save 5000',   label: 'Save ₹5,000',          icon: 'piggy-bank'       as const },
  { cmd: '/split 1000 4',label: 'Split ₹1,000 ÷ 4',     icon: 'account-multiple' as const },
  { cmd: '/tax',         label: 'Tax summary',          icon: 'file-document-outline' as const },
];

const C = { bg: '#09080F', surface: '#14121C', border: '#2A2636',
            text: '#fff', text2: '#B7B3C6', text3: '#7B7593' };

export default function MoneyCoach({ initialCmd, onAction }: {
  initialCmd?: string;
  onAction?: (action: string, url?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Welcome
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your Money Coach 🪙 Try /credit-plan for the fastest path to next tier, /spend for a 30-day breakdown, or /save 5000 for a plan.",
      }]);
      // If launched with a pre-typed command, auto-send it
      if (initialCmd) setTimeout(() => send(initialCmd), 400);
    }
  }, [open]);

  // Auto-open when initialCmd set externally
  useEffect(() => {
    if (initialCmd && !open) setOpen(true);
  }, [initialCmd]);

  // Listen for global events (CTAs from elsewhere can ping-open the coach)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: any) => {
      const cmd = e?.detail?.cmd;
      setOpen(true);
      if (cmd) {
        setMessages([]);  // reset chat
        setTimeout(() => send(cmd), 350);
      }
    };
    window.addEventListener('open-money-coach', handler);
    return () => window.removeEventListener('open-money-coach', handler);
  }, []);

  const send = async (msg?: string) => {
    const text = (msg ?? input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages((p) => [...p, { role: 'user', text }]);
    setBusy(true);
    try {
      const r = await request<any>('/wallet/coach/chat',
        { method: 'POST', body: { message: text } });
      setMessages((p) => [...p, {
        role: 'assistant', text: r.reply, cmd: r.cmd,
        cards: r.cards, actions: r.actions,
      }]);
    } catch (e: any) {
      setMessages((p) => [...p, {
        role: 'assistant',
        text: 'Network glitch — try again in a sec.',
      }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    }
  };

  const handleAction = (action: string, url?: string) => {
    onAction?.(action, url);
    if (action === 'navigate' && url) {
      if (Platform.OS === 'web') window.location.href = url;
    }
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={s.bubble}>
        <MaterialCommunityIcons name="message-text" size={22} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide"
              onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={s.backdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={s.panel}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}>
              <View style={s.header}>
                <View style={s.brain}>
                  <MaterialCommunityIcons name="message-text" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>Money Coach</Text>
                  <Text style={s.subtitle}>Free · deterministic · no API cost</Text>
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
                      {m.cmd && m.role === 'assistant' && m.cmd !== 'chat' && (
                        <View style={s.cmdBadge}>
                          <Text style={s.cmdBadgeText}>/{m.cmd}</Text>
                        </View>
                      )}
                      <Text style={[s.msgText,
                        m.role === 'user' && { color: '#fff' }]}>
                        {m.text}
                      </Text>

                      {/* Render structured cards */}
                      {m.cards?.map((card, ci) => {
                        if (card.type === 'credit_plan') {
                          return (
                            <View key={ci} style={s.planCard}>
                              <View style={s.planHeader}>
                                <MaterialCommunityIcons name="rocket-launch" size={14} color="#F59E0B" />
                                <Text style={s.planEta}>
                                  Fastest: {card.fastest_path_days} days · {card.target_tier}
                                </Text>
                                <View style={s.planGapPill}>
                                  <Text style={s.planGapText}>{card.credits_needed} cr</Text>
                                </View>
                              </View>
                              <View style={{ gap: 6, marginTop: 6 }}>
                                {(card.actions || []).map((a: any, ai: number) => (
                                  <View key={ai} style={s.planAction}>
                                    <View style={s.planCheck}>
                                      <MaterialCommunityIcons name="checkbox-blank-circle-outline"
                                        size={14} color="#A78BFA" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={s.planActionTitle}>{a.title}</Text>
                                      <Text style={s.planActionMeta}>
                                        +{a.gain} cr · {a.eta_days}d · {a.effort}
                                      </Text>
                                    </View>
                                    {a.action && (
                                      <Pressable
                                        onPress={() => handleAction(a.action.type, a.action.url)}
                                        style={s.planActionBtn}>
                                        <Text style={s.planActionBtnText}>
                                          {a.action.label || 'Go'}
                                        </Text>
                                      </Pressable>
                                    )}
                                  </View>
                                ))}
                              </View>
                            </View>
                          );
                        }
                        if (card.type === 'donut') {
                          const total = card.data.reduce((s: number, d: any) => s + d.value, 0) || 1;
                          return (
                            <View key={ci} style={s.donutCard}>
                              {card.data.slice(0, 6).map((d: any, di: number) => {
                                const pct = Math.round((d.value / total) * 100);
                                const tints = ['#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#EC4899', '#A78BFA'];
                                const tint = tints[di % tints.length];
                                return (
                                  <View key={di} style={{ gap: 4 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                      <Text style={s.donutLabel}>{d.label}</Text>
                                      <Text style={[s.donutValue, { color: tint }]}>
                                        {d.value} cr · {pct}%
                                      </Text>
                                    </View>
                                    <View style={s.donutBarBg}>
                                      <View style={[s.donutBarFill,
                                        { width: `${pct}%`, backgroundColor: tint }]} />
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        }
                        return null;
                      })}

                      {/* Action buttons */}
                      {m.actions && m.actions.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          {m.actions.map((a, ai) => (
                            <Pressable key={ai}
                              onPress={() => handleAction(a.action, a.url)}
                              style={s.actBtn}>
                              <Text style={s.actBtnText}>{a.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
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
                contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6 }}>
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
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => send()}
                  placeholder="Ask about spend, credits, savings…"
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
  msgBubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, gap: 6 },
  msgText: { color: '#fff', fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5, lineHeight: 19 },
  cmdBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, backgroundColor: 'rgba(167,139,250,0.20)' },
  cmdBadgeText: { color: '#C4B5FD', fontFamily: 'DMSans_900Black',
    fontSize: 9, letterSpacing: 0.6 },

  /* Plan card */
  planCard: { padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1, marginTop: 6 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planEta: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, flex: 1 },
  planGapPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.20)' },
  planGapText: { color: '#FCD34D', fontFamily: 'DMSans_900Black', fontSize: 10 },
  planAction: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.30)' },
  planCheck: { width: 18, height: 18, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center' },
  planActionTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  planActionMeta: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10 },
  planActionBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#7C3AED', ...({ cursor: 'pointer' } as any) },
  planActionBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  /* Donut bars */
  donutCard: { padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1, gap: 8, marginTop: 6 },
  donutLabel: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  donutValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  donutBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999, overflow: 'hidden' },
  donutBarFill: { height: 6 },

  /* Generic action button */
  actBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.20)',
    borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  actBtnText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Slash chip */
  slashChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  slashChipText: { color: '#C4B5FD', fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

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
