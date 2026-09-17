/**
 * AdvisorAIBlock — universal "Talk to Advisor" + "Ask the AI" CTA pair.
 * Drop into any page (Internships, Events, Network, Higher Ed, Financial, etc.).
 * Theme-aware (light/dark) for crystal-clear readability.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';
import { useTheme } from '@/src/context/ThemeContext';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function AdvisorAIBlock({
  context = 'general',
  advisorTitle = 'Talk to a Student Advisor',
  advisorDesc = 'Need personalised advice? Connect with our dedicated student advisors.',
  aiTitle = 'Ask the AI Assistant',
  aiDesc = 'Got a question? Chat with our AI assistant 24×7 — instant answers.',
  advisorAccent = '#2563EB',
  aiAccent = '#10B981',
  advisorIcon = 'account-tie',
  aiIcon = 'robot-excited',
  advisorTel = '+919876543210',
  advisorEmail = 'advisor@studentalumni.in',
  aiOpen: externalAiOpen,
  setAiOpen: externalSetAiOpen,
  aiInputRef,
}: {
  context?: string;
  advisorTitle?: string;
  advisorDesc?: string;
  aiTitle?: string;
  aiDesc?: string;
  advisorAccent?: string;
  aiAccent?: string;
  advisorIcon?: IconName;
  aiIcon?: IconName;
  advisorTel?: string;
  advisorEmail?: string;
  aiOpen?: boolean;
  setAiOpen?: (open: boolean) => void;
  aiInputRef?: React.RefObject<any>;
}) {
  const [internalAiOpen, setInternalAiOpen] = useState(false);
  const aiOpen = externalAiOpen !== undefined ? externalAiOpen : internalAiOpen;
  const setAiOpen = externalSetAiOpen !== undefined ? externalSetAiOpen : setInternalAiOpen;

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const { isDark } = useTheme();

  const colors = {
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    title: isDark ? '#FFFFFF' : '#0F172A',
    desc: isDark ? '#CBD5E1' : '#475569',
    note: isDark ? '#94A3B8' : '#64748B',
    divider: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    inputBg: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
    inputBorder: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
    inputText: isDark ? '#FFFFFF' : '#0F172A',
    inputPlaceholder: isDark ? '#94A3B8' : '#94A3B8',
    answerBg: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
    answerBorder: isDark ? 'rgba(16,185,129,0.30)' : '#A7F3D0',
    answerText: isDark ? '#E2E8F0' : '#065F46',
  };

  // Manage delayed focus on open and cleanup focus timeout on close/unmount
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (aiOpen) {
      timer = setTimeout(() => {
        aiInputRef?.current?.focus();
      }, 150);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [aiOpen, aiInputRef]);

  const onAskAI = async () => {
    if (!aiQuestion.trim() || aiBusy) return;
    setAiBusy(true);
    setAiAnswer(null);
    try {
      const r = await request<any>('/ai/chat', {
        method: 'POST',
        body: { message: `[${context}] ${aiQuestion}`, session_id: `advisor-block-${context}` },
      });
      setAiAnswer(r?.reply || r?.message || 'No response.');
    } catch (e: any) {
      setAiAnswer(`Sorry, I'm offline right now. ${e?.message || ''}`);
    } finally { setAiBusy(false); }
  };

  const onCallAdvisor = () => {
    Linking.openURL(`tel:${advisorTel}`).catch(() => {});
  };
  const onEmailAdvisor = () => {
    Linking.openURL(`mailto:${advisorEmail}?subject=Help with ${context}`).catch(() => {});
  };

  return (
    <View style={s.row}>
      {/* Advisor card */}
      <View
        style={[
          s.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: advisorOpen ? advisorAccent : colors.cardBorder,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: advisorAccent + '1A', borderColor: advisorAccent + '40' }]}>
          <MaterialCommunityIcons name={advisorIcon} size={20} color={advisorAccent} />
        </View>
        <Text style={[s.title, { color: colors.title }]}>{advisorTitle}</Text>
        <Text style={[s.desc, { color: colors.desc }]}>{advisorDesc}</Text>
        <Pressable
          style={[s.cta, { backgroundColor: advisorAccent }]}
          onPress={() => setAdvisorOpen(!advisorOpen)}
        >
          <MaterialCommunityIcons name="phone-in-talk" size={14} color="#fff" />
          <Text style={s.ctaText}>Connect with Advisor</Text>
        </Pressable>
        {advisorOpen && (
          <View style={[s.expanded, { borderTopColor: colors.divider }]}>
            <Pressable style={s.linkRow} onPress={onCallAdvisor}>
              <MaterialCommunityIcons name="phone" size={14} color={advisorAccent} />
              <Text style={[s.linkText, { color: advisorAccent }]}>{advisorTel}</Text>
            </Pressable>
            <Pressable style={s.linkRow} onPress={onEmailAdvisor}>
              <MaterialCommunityIcons name="email" size={14} color={advisorAccent} />
              <Text style={[s.linkText, { color: advisorAccent }]}>{advisorEmail}</Text>
            </Pressable>
            <Text style={[s.note, { color: colors.note }]}>Mon–Fri · 9am – 7pm IST · response within 4 hours</Text>
          </View>
        )}
      </View>

      {/* AI card */}
      <View
        style={[
          s.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: aiOpen ? aiAccent : colors.cardBorder,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: aiAccent + '1A', borderColor: aiAccent + '40' }]}>
          <MaterialCommunityIcons name={aiIcon} size={20} color={aiAccent} />
        </View>
        <Text style={[s.title, { color: colors.title }]}>{aiTitle}</Text>
        <Text style={[s.desc, { color: colors.desc }]}>{aiDesc}</Text>
        <Pressable
          style={[s.cta, { backgroundColor: aiAccent }]}
          onPress={() => setAiOpen(!aiOpen)}
        >
          <MaterialCommunityIcons name="message-text" size={14} color="#fff" />
          <Text style={[s.ctaText, { color: '#fff' }]}>Chat with AI</Text>
        </Pressable>
        {aiOpen && (
          <View style={[s.expanded, { borderTopColor: colors.divider }]}>
            <View style={s.inputRow}>
              <TextInput
                ref={aiInputRef}
                value={aiQuestion}
                onChangeText={setAiQuestion}
                placeholder={`Ask about ${context}…`}
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  s.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  },
                ]}
                onSubmitEditing={onAskAI}
              />
              <Pressable
                style={[s.sendBtn, { backgroundColor: aiAccent, opacity: aiBusy ? 0.55 : 1 }]}
                onPress={onAskAI}
                disabled={aiBusy}
              >
                {aiBusy ? <ActivityIndicator color="#fff" size="small" />
                        : <MaterialCommunityIcons name="send" size={14} color="#fff" />}
              </Pressable>
            </View>
            {aiAnswer && (
              <View
                style={[
                  s.answerBox,
                  { backgroundColor: colors.answerBg, borderColor: colors.answerBorder },
                ]}
              >
                <MaterialCommunityIcons name="auto-fix" size={14} color={aiAccent} />
                <Text style={[s.answerText, { color: colors.answerText }]}>{aiAnswer}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  card: {
    flex: 1,
    minWidth: 260,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)' as any,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  desc: { fontSize: 12.5, lineHeight: 18 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  ctaText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  expanded: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { fontSize: 12.5, fontWeight: '600' },
  note: { fontSize: 11, fontStyle: 'italic', marginTop: 4 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    ...Platform.select({ web: { outlineWidth: 0 as any } as any, default: {} }),
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerBox: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  answerText: { fontSize: 12.5, lineHeight: 18, flex: 1 },
});
