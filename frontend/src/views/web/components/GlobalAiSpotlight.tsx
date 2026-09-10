/**
 * GlobalAiSpotlight.tsx — Universal Floating AI Search & Action Copilot (Cmd + K)
 * Accessible across the whole application.
 * Powered by Universal Enterprise RAG.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, ScrollView, Modal } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Sparkles, Search, X, ArrowRight, ExternalLink, Bot, Briefcase, Users, Award, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { request } from '@/src/models/services/api';
import { SAC, FONTS } from '../portals/superadmin/tokens';

export function GlobalAiSpotlight({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<any[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<any[]>([]);

  // Keyboard shortcut listener (Cmd + K / Ctrl + K)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle handled by caller
      }
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const handleAsk = async (customQ?: string) => {
    const text = (customQ || query).trim();
    if (!text) return;
    setLoading(true);
    setAnswer(null);
    setCitations([]);
    try {
      const res: any = await request('/api/ai/spotlight/ask', {
        method: 'POST',
        body: { query: text, user_role: 'student' }
      });
      if (res?.answer) {
        setAnswer(res.answer);
        setCitations(res.citations || []);
        setSuggestedActions(res.suggested_actions || []);
      }
    } catch (e: any) {
      setAnswer("Sorry, I encountered an issue retrieving the answer from the platform knowledge base.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <Animated.View entering={FadeInDown.duration(200)} style={s.spotlightChassis}>
          {/* Header Search Input */}
          <View style={s.inputRow}>
            <View style={s.sparkleBox}>
              <Sparkles size={18} color="#A78BFA" />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleAsk()}
              placeholder="Ask anything across StudentAlumni (alumni, jobs, hackathons, policies)..."
              placeholderTextColor={SAC.muted}
              autoFocus
              style={s.textInput}
            />
            {loading ? (
              <ActivityIndicator size="small" color="#A78BFA" />
            ) : query ? (
              <Pressable onPress={() => { setQuery(''); setAnswer(null); }} style={s.clearBtn}>
                <X size={14} color={SAC.muted} />
              </Pressable>
            ) : (
              <View style={s.cmdBadge}>
                <Text style={s.cmdText}>ESC to close</Text>
              </View>
            )}
          </View>

          {/* Quick Prompts */}
          {!answer && !loading && (
            <View style={s.quickPromptsRow}>
              <Text style={s.quickLabel}>Popular questions:</Text>
              {[
                "Who are top alumni mentors in software engineering?",
                "What live jobs and internships are open this week?",
                "How do I register for ECHO 2026 hackathons?",
              ].map((p, idx) => (
                <Pressable key={idx} onPress={() => { setQuery(p); handleAsk(p); }} style={s.promptChip}>
                  <Text style={s.promptText}> {p}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* AI Response Box */}
          {answer && (
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
              <View style={s.answerCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Bot size={16} color="#A78BFA" />
                  <Text style={s.answerHead}>AI Knowledge Fabric Answer</Text>
                </View>
                <Text style={s.answerBody}>{answer}</Text>
              </View>

              {/* Citations */}
              {citations.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={s.sectionLabel}>VERIFIED KNOWLEDGE CITATIONS</Text>
                  {citations.map((c, idx) => (
                    <View key={idx} style={s.citationCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={s.citationTitle}>{c.title}</Text>
                        <Text style={s.citationDomain}>{c.domain.toUpperCase()}</Text>
                      </View>
                      <Text style={s.citationSnippet}>{c.snippet}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Suggested Actions */}
              {suggestedActions.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {suggestedActions.map((act, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        onClose();
                        (router as any).push(act.route);
                      }}
                      style={s.actionBtn}
                    >
                      <Text style={s.actionBtnText}>{act.label}</Text>
                      <ArrowRight size={12} color="#A78BFA" />
                    </Pressable>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'flex-start', paddingTop: 90,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(10px)' } as any) : {}),
  },
  spotlightChassis: {
    width: '100%', maxWidth: 640, backgroundColor: '#13111C',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 24px 60px rgba(0,0,0,0.8)' } as any) : {}),
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  sparkleBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.2)', alignItems: 'center', justifyContent: 'center' },
  textInput: {
    flex: 1, color: '#fff', fontSize: 14, fontFamily: FONTS.med,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },
  clearBtn: { padding: 4 },
  cmdBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cmdText: { color: SAC.muted, fontSize: 10, fontFamily: FONTS.bold },

  quickPromptsRow: { padding: 16, gap: 8 },
  quickLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  promptChip: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: SAC.border, borderWidth: 1 },
  promptText: { color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 12 },

  answerCard: { backgroundColor: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)', borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  answerHead: { color: '#DDD6FE', fontFamily: FONTS.bold, fontSize: 12.5 },
  answerBody: { color: '#F1F5F9', fontFamily: FONTS.med, fontSize: 13, lineHeight: 19 },

  sectionLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.8 },
  citationCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: SAC.border, gap: 3 },
  citationTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  citationDomain: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 9.5 },
  citationSnippet: { color: '#94A3B8', fontFamily: FONTS.med, fontSize: 11.5, lineHeight: 16 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.18)', borderColor: 'rgba(124,58,237,0.3)', borderWidth: 1 },
  actionBtnText: { color: '#DDD6FE', fontFamily: FONTS.bold, fontSize: 11 }
});
