/**
 * AiCareerCopilotView.tsx — Student AI Career Co-Pilot
 * Includes:
 *   1. AI Resume ATS Scorer & Keyword Gap Matcher
 *   2. Real-Time Technical Mock Interviewer
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Sparkles, Bot, Send, CheckCircle2, AlertTriangle, Briefcase, FileText, ArrowRight, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { request } from '@/src/models/services/api';
import { SAC, FONTS } from '../../superadmin/tokens';
import { WebAudioVoicePlayer } from '@/src/views/web/components/WebAudioVoicePlayer';

export function AiCareerCopilotView() {
  const [activeTab, setActiveTab] = useState<'ats' | 'mock'>('ats');

  // ── ATS Scorer State ──
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('Senior Full-Stack Engineer');
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<any>(null);

  // ── Mock Interviewer State ──
  const [mockRole, setMockRole] = useState('Full Stack Software Engineer');
  const [difficulty, setDifficulty] = useState<'Junior' | 'Mid' | 'Senior'>('Mid');
  const [turnIndex, setTurnIndex] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState('Welcome! Walk me through the architecture of your most technically complex software project.');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);

  const handleRunAts = async () => {
    if (!resumeText.trim()) return;
    setAtsLoading(true);
    try {
      const res: any = await request('/api/ai/career/ats-analyze', {
        method: 'POST',
        body: {
          resume_text: resumeText.trim(),
          target_role: targetRole.trim(),
        }
      });
      setAtsResult(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAtsLoading(false);
    }
  };

  const handleSendInterviewAnswer = async () => {
    if (!studentAnswer.trim()) return;
    setInterviewLoading(true);
    const currAns = studentAnswer.trim();
    setStudentAnswer('');

    try {
      const res: any = await request('/api/ai/career/mock-interview-turn', {
        method: 'POST',
        body: {
          role: mockRole,
          difficulty: difficulty,
          turn_index: turnIndex + 1,
          student_response: currAns,
        }
      });

      setInterviewHistory((h) => [
        ...h,
        { question: currentQuestion, answer: currAns, feedback: res.interviewer_feedback, score: res.score_for_turn }
      ]);

      if (res.is_final_turn && res.final_summary_report) {
        setFinalReport(res.final_summary_report);
      } else {
        setCurrentQuestion(res.next_question);
        setTurnIndex((t) => t + 1);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setInterviewLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      {/* Banner */}
      <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.sparkleBox}>
            <Bot size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>AI Career Co-Pilot & Technical Interview Hub</Text>
            <Text style={s.heroSub}>ATS Resume Optimization & Interactive Mock Technical Interviews</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabRow}>
        <Pressable onPress={() => setActiveTab('ats')} style={[s.tab, activeTab === 'ats' && s.tabActive]}>
          <FileText size={14} color={activeTab === 'ats' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'ats' && s.tabTextActive]}>AI ATS Resume Scorer</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('mock')} style={[s.tab, activeTab === 'mock' && s.tabActive]}>
          <Briefcase size={14} color={activeTab === 'mock' ? '#fff' : SAC.muted} />
          <Text style={[s.tabText, activeTab === 'mock' && s.tabTextActive]}>AI Mock Technical Interviewer</Text>
        </Pressable>
      </View>

      {/* ATS View */}
      {activeTab === 'ats' && (
        <View style={s.card}>
          <Text style={s.cardHead}>ATS Resume Keyword Optimizer</Text>
          <Text style={s.cardSub}>Paste your resume and target role to compute your match score and receive tailored bullet recommendations.</Text>

          <View style={{ gap: 10, marginTop: 12 }}>
            <Text style={s.label}>Target Job Role / Title</Text>
            <TextInput value={targetRole} onChangeText={setTargetRole} style={s.input} />

            <Text style={s.label}>Resume Text</Text>
            <TextInput
              value={resumeText}
              onChangeText={setResumeText}
              multiline
              placeholder="Paste your resume experience bullets here..."
              placeholderTextColor={SAC.muted}
              style={[s.input, { minHeight: 120, textAlignVertical: 'top' as any }]}
            />

            <Pressable onPress={handleRunAts} disabled={atsLoading} style={s.primaryBtn}>
              {atsLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="#fff" />
                  <Text style={s.primaryBtnText}>Analyze ATS Score</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ATS Results */}
          {atsResult && (
            <View style={{ marginTop: 16, gap: 12 }}>
              <View style={s.scoreBox}>
                <View>
                  <Text style={s.scoreVal}>{atsResult.overall_match_score}%</Text>
                  <Text style={s.scoreSub}>ATS Benchmark Match</Text>
                </View>
                <View style={s.gradeBadge}>
                  <Text style={s.gradeText}>Grade: {atsResult.ats_grade}</Text>
                </View>
              </View>

              <Text style={s.label}>Matched Competencies:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {atsResult.matched_skills?.map((sk: string, i: number) => (
                  <View key={i} style={s.skillChipGreen}><Text style={s.skillTextGreen}>✓ {sk}</Text></View>
                ))}
              </View>

              <Text style={s.label}>Recommended Tailored Resume Bullets:</Text>
              <View style={{ gap: 6 }}>
                {atsResult.suggested_bullet_points?.map((b: string, i: number) => (
                  <View key={i} style={s.bulletCard}><Text style={s.bulletText}>{b}</Text></View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Mock Interviewer View */}
      {activeTab === 'mock' && (
        <View style={s.card}>
          <Text style={s.cardHead}>Interactive Technical Mock Interviewer</Text>
          <Text style={s.cardSub}>Simulate multi-turn role-specific technical rounds with immediate scoring and feedback.</Text>

          {/* History */}
          <View style={{ gap: 10, marginVertical: 14 }}>
            {interviewHistory.map((h, i) => (
              <View key={i} style={s.historyCard}>
                <Text style={s.historyQ}>Q{i+1}: {h.question}</Text>
                <Text style={s.historyA}>Your Answer: {h.answer}</Text>
                {h.feedback && <Text style={s.historyF}> Feedback ({h.score}/100): {h.feedback}</Text>}
              </View>
            ))}

            {!finalReport && (
              <View style={s.currentQCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={s.currentQHead}>Current Question (Turn {turnIndex}/5):</Text>
                  <WebAudioVoicePlayer textToSpeak={currentQuestion} label="Listen to AI" />
                </View>
                <Text style={s.currentQText}>{currentQuestion}</Text>

                <TextInput
                  value={studentAnswer}
                  onChangeText={setStudentAnswer}
                  multiline
                  placeholder="Type your structured answer explaining architecture and trade-offs..."
                  placeholderTextColor={SAC.muted}
                  style={[s.input, { minHeight: 90, marginTop: 8, textAlignVertical: 'top' as any }]}
                />

                <Pressable onPress={handleSendInterviewAnswer} disabled={interviewLoading} style={[s.primaryBtn, { alignSelf: 'flex-end', marginTop: 8 }]}>
                  {interviewLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Send size={13} color="#fff" />
                      <Text style={s.primaryBtnText}>Submit Answer</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}

            {/* Final Summary Report */}
            {finalReport && (
              <View style={s.finalCard}>
                <Award size={24} color="#F59E0B" />
                <Text style={s.finalTitle}>Interview Assessment Complete: {finalReport.overall_performance}</Text>
                <Text style={s.finalSub}>{finalReport.recommendation}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0A10' },
  heroBanner: { padding: 18, borderRadius: 14 },
  sparkleBox: { width: 42, height: 42, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16 },
  heroSub: { color: '#DDD6FE', fontFamily: FONTS.med, fontSize: 12.5, marginTop: 2 },

  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  tabActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  tabText: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  tabTextActive: { color: '#fff' },

  card: { padding: 18, borderRadius: 14, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1 },
  cardHead: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  cardSub: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 3 },
  label: { color: '#CBD5E1', fontFamily: FONTS.bold, fontSize: 11.5, marginTop: 6 },
  input: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: SAC.border, borderWidth: 1, borderRadius: 8, padding: 10, color: '#fff', fontSize: 12.5 },

  primaryBtn: { backgroundColor: '#7C3AED', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },

  scoreBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.12)', borderColor: '#7C3AED', borderWidth: 1 },
  scoreVal: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 24 },
  scoreSub: { color: '#DDD6FE', fontFamily: FONTS.med, fontSize: 11 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#10B981' },
  gradeText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  skillChipGreen: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(16,185,129,0.18)' },
  skillTextGreen: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 11 },

  bulletCard: { padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SAC.border, borderWidth: 1 },
  bulletText: { color: '#CBD5E1', fontFamily: FONTS.med, fontSize: 12, lineHeight: 17 },

  historyCard: { padding: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderColor: SAC.border, borderWidth: 1, gap: 4 },
  historyQ: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 12 },
  historyA: { color: '#fff', fontFamily: FONTS.med, fontSize: 12 },
  historyF: { color: '#34D399', fontFamily: FONTS.bold, fontSize: 11.5, marginTop: 2 },

  currentQCard: { padding: 14, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.3)', borderWidth: 1, gap: 4 },
  currentQHead: { color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 11 },
  currentQText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },

  finalCard: { padding: 16, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#F59E0B', borderWidth: 1, alignItems: 'center', gap: 6 },
  finalTitle: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 14 },
  finalSub: { color: '#FEF3C7', fontFamily: FONTS.med, fontSize: 12, textAlign: 'center' }
});
