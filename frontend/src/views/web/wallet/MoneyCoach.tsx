/**
 * MoneyCoach.tsx — Floating Wallet AI Money Coach (deterministic — no LLM cost)
 * Slash commands: /spend /save /credit-plan /optimize /forecast /cashback /alert /split /dispute /tax
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';
import { Layout } from '../../../theme';
import { useTheme } from '@/src/theme/ThemeContext';

interface CoachMessage {
  role: 'user' | 'assistant';
  text: string;
  cmd?: string;
  cards?: any[];
  actions?: { label: string; action: string; url?: string }[];
}

const SLASH_CHIPS = [
  { cmd: '/credit-plan', label: 'Build a credit plan', icon: 'star-four-points' as const },
  { cmd: '/spend',       label: 'Where did money go?', icon: 'cached'            as const },
  { cmd: '/forecast',    label: 'Forecast end-of-month',icon: 'database'         as const },
  { cmd: '/cashback',    label: 'Find missed cashback', icon: 'sale'             as const },
  { cmd: '/save 5000',   label: 'Save ₹5,000',          icon: 'piggy-bank'       as const },
  { cmd: '/split 1000 4',label: 'Split ₹1,000 ÷ 4',     icon: 'account-multiple' as const },
  { cmd: '/tax',         label: 'Tax summary',          icon: 'file-document-outline' as const },
];

const ReactDOM = Platform.OS === 'web' ? require('react-dom') : null;

export default function MoneyCoach({ initialCmd, onAction }: {
  initialCmd?: string;
  onAction?: (action: string, url?: string) => void;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const colors = useMemo(() => ({
    bg: isDark ? '#09080F' : '#FFFFFF',
    surface: isDark ? '#14121C' : '#F8FAFC',
    border: isDark ? '#2A2636' : '#E2E8F0',
    border2: isDark ? '#3E3852' : '#CBD5E1',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? '#B7B3C6' : '#334155',
    text3: isDark ? '#7B7593' : '#64748B',
    assistantBubbleBg: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    assistantBubbleBorder: isDark ? '#2A2636' : '#E2E8F0',
    planCardBg: isDark ? 'rgba(245,158,11,0.06)' : '#FFFBEB',
    planCardBorder: isDark ? 'rgba(245,158,11,0.30)' : '#FDE68A',
    planEtaColor: isDark ? '#FCD34D' : '#B45309',
    planActionBg: isDark ? 'rgba(0,0,0,0.30)' : '#FFFFFF',
    planActionBorder: isDark ? 'transparent' : '#E2E8F0',
    donutCardBg: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    donutCardBorder: isDark ? '#2A2636' : '#E2E8F0',
    donutBarBg: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
    chipBg: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    chipBorder: isDark ? '#2A2636' : '#CBD5E1',
    chipText: isDark ? '#FFFFFF' : '#1E293B',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
    inputBorder: isDark ? '#2A2636' : '#CBD5E1',
    inputText: isDark ? '#FFFFFF' : '#0F172A',
    inputPlaceholder: isDark ? '#7B7593' : '#94A3B8',
    closeBg: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    closeIcon: isDark ? '#FFFFFF' : '#64748B',
  }), [isDark]);

  // Welcome
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi! I'm your Money Coach 👋 Try /credit-plan for the fastest path to next tier, /spend for a 30-day breakdown, or /save 5000 for a plan.",
      }]);
      // If launched with a pre-typed command, auto-send it
      if (initialCmd) t = setTimeout(() => send(initialCmd), 400);
    }
    return () => clearTimeout(t);
  }, [open]);

  // Auto-open when initialCmd set externally
  useEffect(() => {
    if (initialCmd && !open) setOpen(true);
  }, [initialCmd]);

  // Listen for global events (CTAs from elsewhere can ping-open the coach)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let pendingTimer: ReturnType<typeof setTimeout>;
    const handler = (e: any) => {
      const cmd = e?.detail?.cmd;
      setOpen(true);
      if (cmd) {
        setMessages([]);  // reset chat
        pendingTimer = setTimeout(() => send(cmd), 350);
      }
    };
    window.addEventListener('open-money-coach', handler);
    return () => {
      window.removeEventListener('open-money-coach', handler);
      clearTimeout(pendingTimer);
    };
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

  /* Buttons differ between the web portal (plain <div>) and native (Pressable);
   * everything else about the message list is identical, so render it once. */
  const PlanActionButton = ({ label, onPress }: { label: string; onPress: () => void }) =>
    Platform.OS === 'web' ? (
      <div
        onClick={onPress}
        style={{
          padding: '5px 8px',
          borderRadius: '999px',
          backgroundColor: '#2563EB',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={s.planActionBtnText}>{label}</Text>
      </div>
    ) : (
      <Pressable onPress={onPress} style={s.planActionBtn}>
        <Text style={s.planActionBtnText}>{label}</Text>
      </Pressable>
    );

  const MessageActionButton = ({ label, onPress }: { label: string; onPress: () => void }) =>
    Platform.OS === 'web' ? (
      <div
        onClick={onPress}
        style={{
          padding: '6px 10px',
          borderRadius: '999px',
          backgroundColor: isDark ? 'rgba(37,99,235,0.20)' : '#EFF6FF',
          border: isDark ? '1px solid rgba(37,99,235,0.40)' : '1px solid #BFDBFE',
          cursor: 'pointer',
        }}
      >
        <Text style={[s.actBtnText, { color: isDark ? '#93C5FD' : '#2563EB' }]}>{label}</Text>
      </div>
    ) : (
      <Pressable
        onPress={onPress}
        style={[s.actBtn, { backgroundColor: isDark ? 'rgba(37,99,235,0.20)' : '#EFF6FF', borderColor: isDark ? 'rgba(37,99,235,0.40)' : '#BFDBFE' }]}>
        <Text style={[s.actBtnText, { color: isDark ? '#93C5FD' : '#2563EB' }]}>{label}</Text>
      </Pressable>
    );

  const renderMessages = () => (
    <>
    {messages.map((m, i) => (
      <View key={i} style={[s.msgRow,
        m.role === 'user' && { alignSelf: 'flex-end' }]}>
        <View style={[s.msgBubble,
          m.role === 'user'
            ? { backgroundColor: '#2563EB' }
            : { backgroundColor: colors.assistantBubbleBg,
                borderColor: colors.assistantBubbleBorder, borderWidth: 1 }]}>
          {m.cmd && m.role === 'assistant' && m.cmd !== 'chat' && (
            <View style={s.cmdBadge}>
              <Text style={s.cmdBadgeText}>/{m.cmd}</Text>
            </View>
          )}
          <Text style={[s.msgText,
            { color: m.role === 'user' ? '#fff' : colors.text }]}>
            {m.text}
          </Text>

          {/* Render structured cards */}
          {m.cards?.map((card, ci) => {
            if (card.type === 'credit_plan') {
              return (
                <View key={ci} style={[s.planCard, { backgroundColor: colors.planCardBg, borderColor: colors.planCardBorder }]}>
                  <View style={s.planHeader}>
                    <MaterialCommunityIcons name="rocket-launch" size={14} color="#F59E0B" />
                    <Text style={[s.planEta, { color: colors.planEtaColor }]}>
                      Fastest: {card.fastest_path_days} days · {card.target_tier}
                    </Text>
                    <View style={s.planGapPill}>
                      <Text style={s.planGapText}>{card.credits_needed} cr</Text>
                    </View>
                  </View>
                  <View style={{ gap: 6, marginTop: 6 }}>
                    {(card.actions || []).map((a: any, ai: number) => (
                      <View key={ai} style={[s.planAction, { backgroundColor: colors.planActionBg, borderColor: colors.planActionBorder, borderWidth: isDark ? 0 : 1 }]}>
                        <View style={s.planCheck}>
                          <MaterialCommunityIcons name="checkbox-blank-circle-outline"
                            size={14} color="#2563EB" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.planActionTitle, { color: colors.text }]}>{a.title}</Text>
                          <Text style={[s.planActionMeta, { color: colors.text3 }]}>
                            +{a.gain} cr · {a.eta_days}d · {a.effort}
                          </Text>
                        </View>
                        {a.action && (
                          <PlanActionButton
                            label={a.action.label || 'Go'}
                            onPress={() => handleAction(a.action.type, a.action.url)}
                          />
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
                <View key={ci} style={[s.donutCard, { backgroundColor: colors.donutCardBg, borderColor: colors.donutCardBorder }]}>
                  {card.data.slice(0, 6).map((d: any, di: number) => {
                      const pct = Math.round((d.value / total) * 100);
                      const tints = ['#2563EB', '#06B6D4', '#F59E0B', '#10B981', '#EC4899', '#3B82F6'];
                      const tint = tints[di % tints.length];
                    return (
                      <View key={di} style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={[s.donutLabel, { color: colors.text }]}>{d.label}</Text>
                          <Text style={[s.donutValue, { color: tint }]}>
                            {d.value} cr · {pct}%
                          </Text>
                        </View>
                        <View style={[s.donutBarBg, { backgroundColor: colors.donutBarBg }]}>
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
                <MessageActionButton key={ai} label={a.label} onPress={() => handleAction(a.action, a.url)} />
              ))}
            </View>
          )}
        </View>
      </View>
    ))}
    {busy && (
      <View style={s.msgRow}>
        <View style={[s.msgBubble, { backgroundColor: colors.assistantBubbleBg, borderColor: colors.assistantBubbleBorder, borderWidth: 1 }]}>
          <ActivityIndicator color="#2563EB" size="small" />
        </View>
      </View>
    )}
    </>
  );

  if (Platform.OS === 'web' && ReactDOM) {
    return ReactDOM.createPortal(
      <>
        {/* Floating bubble fixed in viewport */}
        <div
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            bottom: `${Layout.floatingOffset}px`,
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '999px',
            backgroundColor: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(37,99,235,0.55)',
            zIndex: 99999,
            cursor: 'pointer',
          }}
        >
          <MaterialCommunityIcons name="message-text" size={22} color="#fff" />
        </div>

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
              backgroundColor: isDark ? 'rgba(10,5,22,0.65)' : 'rgba(15,23,42,0.45)',
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
                backgroundColor: colors.bg,
                borderRadius: '18px',
                marginRight: '20px',
                marginBottom: '20px',
                borderWidth: '1px',
                borderColor: colors.border,
                borderStyle: 'solid',
                overflow: 'hidden',
                boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.65)' : '0 20px 45px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <KeyboardAvoidingView
                style={{ flex: 1 }}>
                
                {/* Header */}
                <View style={[s.header, { borderColor: colors.border }]}>
                  <View style={s.brain}>
                    <MaterialCommunityIcons name="message-text" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.title, { color: colors.text }]}>Money Coach</Text>
                    <Text style={[s.subtitle, { color: colors.text3 }]}>Free · deterministic · no API cost</Text>
                  </View>
                  <div
                    onClick={() => setOpen(false)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '999px',
                      backgroundColor: colors.closeBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={colors.closeIcon} />
                  </div>
                </View>

                {/* Messages scroll area */}
                <ScrollView ref={scrollRef} style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 14, gap: 10 }}>
                  {renderMessages()}
                </ScrollView>

                {/* Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}>
                  {SLASH_CHIPS.map((c) => (
                    <div key={c.cmd}
                      onClick={() => send(c.cmd)}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        backgroundColor: colors.chipBg,
                        border: `1px solid ${colors.chipBorder}`,
                        cursor: 'pointer',
                      }}
                    >
                      <MaterialCommunityIcons name={c.icon} size={11} color="#2563EB" />
                      <Text style={[s.slashChipText, { color: colors.chipText }]}>{c.label}</Text>
                    </div>
                  ))}
                </ScrollView>

                {/* Input row */}
                <View style={[s.inputRow, { borderColor: colors.border }]}>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => send()}
                    placeholder="Ask about spend, credits, savings..."
                    placeholderTextColor={colors.inputPlaceholder}
                    style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
                    returnKeyType="send"
                  />
                  <div onClick={() => send()}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '999px',
                      backgroundColor: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: busy ? 'default' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <MaterialCommunityIcons name="send" size={15} color="#fff" />
                  </div>
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
    <>
      <Pressable onPress={() => setOpen(true)} style={s.bubble}>
        <MaterialCommunityIcons name="message-text" size={22} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide"
              onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={s.backdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={[s.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}>
              <View style={[s.header, { borderColor: colors.border }]}>
                <View style={s.brain}>
                  <MaterialCommunityIcons name="message-text" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, { color: colors.text }]}>Money Coach</Text>
                  <Text style={[s.subtitle, { color: colors.text3 }]}>Free · deterministic · no API cost</Text>
                </View>
                <Pressable onPress={() => setOpen(false)} style={[s.closeBtn, { backgroundColor: colors.closeBg }]}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.closeIcon} />
                </Pressable>
              </View>

              <ScrollView ref={scrollRef} style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, gap: 10 }}>
                {renderMessages()}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 6, alignItems: 'center' }}>
                {SLASH_CHIPS.map((c) => (
                  <Pressable key={c.cmd}
                    onPress={() => send(c.cmd)}
                    style={[s.slashChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
                    <MaterialCommunityIcons name={c.icon} size={11} color="#2563EB" />
                    <Text style={[s.slashChipText, { color: colors.chipText }]}>{c.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={[s.inputRow, { borderColor: colors.border }]}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={() => send()}
                  placeholder="Ask about spend, credits, savings..."
                  placeholderTextColor={colors.inputPlaceholder}
                  style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
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
  bubble: { position: 'absolute', bottom: Layout.floatingOffset, right: 20,
    width: 56, height: 56, borderRadius: 999,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 28px rgba(37,99,235,0.55)' as any,
    zIndex: 999, ...({ cursor: 'pointer' } as any) },

  backdrop: { flex: 1, backgroundColor: 'rgba(10,5,22,0.55)',
    justifyContent: 'flex-end', alignItems: 'flex-end' },
  panel: { width: 420, maxWidth: '100%', height: 600, maxHeight: '90%',
    borderRadius: 18, marginRight: 20, marginBottom: 20,
    borderWidth: 1, overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(0,0,0,0.65)' as any },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1 },
  brain: { width: 36, height: 36, borderRadius: 999,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'DMSans_900Black', fontSize: 14 },
  subtitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  closeBtn: { width: 30, height: 30, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },

  msgRow: { maxWidth: '88%' },
  msgBubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, gap: 6 },
  msgText: { fontFamily: 'DMSans_600SemiBold',
    fontSize: 12.5, lineHeight: 19 },
  cmdBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6, backgroundColor: 'rgba(37,99,235,0.20)' },
  cmdBadgeText: { color: '#2563EB', fontFamily: 'DMSans_900Black',
    fontSize: 9, letterSpacing: 0.6 },

  /* Plan card */
  planCard: { padding: 10, borderRadius: 12,
    borderWidth: 1, marginTop: 6 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planEta: { fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, flex: 1 },
  planGapPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.20)' },
  planGapText: { color: '#F59E0B', fontFamily: 'DMSans_900Black', fontSize: 10 },
  planAction: { flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 8, paddingVertical: 7, borderRadius: 8 },
  planCheck: { width: 18, height: 18, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center' },
  planActionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  planActionMeta: { fontFamily: 'DMSans_600SemiBold', fontSize: 10 },
  planActionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#2563EB', ...({ cursor: 'pointer' } as any) },
  planActionBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 10 },

  /* Donut bars */
  donutCard: { padding: 10, borderRadius: 12,
    borderWidth: 1, gap: 8, marginTop: 6 },
  donutLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  donutValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5 },
  donutBarBg: { height: 6, borderRadius: 999, overflow: 'hidden' },
  donutBarFill: { height: 6 },

  /* Generic action button */
  actBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  actBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Slash chip */
  slashChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any) },
  slashChipText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },

  /* Input */
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, fontFamily: 'DMSans_600SemiBold', fontSize: 12.5,
    outlineWidth: 0 } as any,
  sendBtn: { width: 38, height: 38, borderRadius: 999,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },
});
