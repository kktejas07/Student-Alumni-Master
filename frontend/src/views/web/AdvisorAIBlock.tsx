/**
 * AdvisorAIBlock — universal "Talk to Advisor" + "Ask the AI" CTA pair.
 * Drop into any page (Internships, Events, Network, Higher Ed, Financial, etc.).
 * Uses MaterialCommunityIcons + RN primitives — no web-only deps.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function AdvisorAIBlock({
  context = 'general',
  advisorTitle = 'Talk to a Student Advisor',
  advisorDesc = 'Need personalised advice? Connect with our dedicated student advisors.',
  aiTitle = 'Ask the AI Assistant',
  aiDesc = 'Got a question? Chat with our AI assistant 24×7 — instant answers.',
  advisorAccent = '#A78BFA',
  aiAccent = '#10B981',
  advisorIcon = 'account-tie',
  aiIcon = 'robot-excited',
  advisorTel = '+919876543210',
  advisorEmail = 'advisor@studentalumni.in',
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
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

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
      <View style={[s.card, { borderColor: advisorAccent + '55' }]}>
        <View style={[s.iconBox, { backgroundColor: advisorAccent + '22', borderColor: advisorAccent + '66' }]}>
          <MaterialCommunityIcons name={advisorIcon} size={20} color={advisorAccent} />
        </View>
        <Text style={s.title}>{advisorTitle}</Text>
        <Text style={s.desc}>{advisorDesc}</Text>
        <Pressable
          style={[s.cta, { backgroundColor: advisorAccent }]}
          onPress={() => setAdvisorOpen(!advisorOpen)}
        >
          <MaterialCommunityIcons name="phone-in-talk" size={14} color="#fff" />
          <Text style={s.ctaText}>Connect with Advisor</Text>
        </Pressable>
        {advisorOpen && (
          <View style={s.expanded}>
            <Pressable style={s.linkRow} onPress={onCallAdvisor}>
              <MaterialCommunityIcons name="phone" size={14} color={advisorAccent} />
              <Text style={[s.linkText, { color: advisorAccent }]}>{advisorTel}</Text>
            </Pressable>
            <Pressable style={s.linkRow} onPress={onEmailAdvisor}>
              <MaterialCommunityIcons name="email" size={14} color={advisorAccent} />
              <Text style={[s.linkText, { color: advisorAccent }]}>{advisorEmail}</Text>
            </Pressable>
            <Text style={s.note}>Mon–Fri · 9am – 7pm IST · response within 4 hours</Text>
          </View>
        )}
      </View>

      {/* AI card */}
      <View style={[s.card, { borderColor: aiAccent + '55' }]}>
        <View style={[s.iconBox, { backgroundColor: aiAccent + '22', borderColor: aiAccent + '66' }]}>
          <MaterialCommunityIcons name={aiIcon} size={20} color={aiAccent} />
        </View>
        <Text style={s.title}>{aiTitle}</Text>
        <Text style={s.desc}>{aiDesc}</Text>
        <Pressable style={[s.cta, { backgroundColor: aiAccent }]} onPress={() => setAiOpen(!aiOpen)}>
          <MaterialCommunityIcons name="message-text" size={14} color="#0A2E1A" />
          <Text style={[s.ctaText, { color: '#0A2E1A' }]}>Chat with AI</Text>
        </Pressable>
        {aiOpen && (
          <View style={s.expanded}>
            <View style={s.inputRow}>
              <TextInput
                value={aiQuestion}
                onChangeText={setAiQuestion}
                placeholder={`Ask about ${context}…`}
                placeholderTextColor="rgba(255,255,255,0.40)"
                style={s.input}
                onSubmitEditing={onAskAI}
              />
              <Pressable
                style={[s.sendBtn, { backgroundColor: aiAccent, opacity: aiBusy ? 0.55 : 1 }]}
                onPress={onAskAI}
                disabled={aiBusy}
              >
                {aiBusy ? <ActivityIndicator color="#0A2E1A" size="small" />
                        : <MaterialCommunityIcons name="send" size={14} color="#0A2E1A" />}
              </Pressable>
            </View>
            {aiAnswer && (
              <View style={s.answerBox}>
                <MaterialCommunityIcons name="auto-fix" size={14} color={aiAccent} />
                <Text style={s.answerText}>{aiAnswer}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flex: 1, minWidth: 260,
    padding: 18, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, gap: 10,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 4 },
  desc: { color: 'rgba(255,255,255,0.70)', fontSize: 12.5, lineHeight: 18 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 999, marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  ctaText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

  expanded: {
    marginTop: 6, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { fontSize: 12.5, fontWeight: '600' },
  note: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontStyle: 'italic', marginTop: 4 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, color: '#fff', fontSize: 13,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.30)',
    ...Platform.select({ web: { outlineWidth: 0 as any } as any, default: {} }),
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  answerBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.30)', borderWidth: 1,
    borderRadius: 10, padding: 10,
  },
  answerText: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, lineHeight: 18, flex: 1 },
});
