/**
 * Mentor Portal — Feedback view: High-fidelity redesign with detailed statistics,
 * interactive rating metrics, collapsible AI advice panels, and stateful reply drafts.
 */
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  TextInput, 
  ActivityIndicator, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import { Sparkles, ChevronDown, ChevronUp, Check, X, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MC, FONTS } from '../tokens';
import { Av, StarRow, Badge } from '../atoms';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { useCurrentUser } from '@/src/lib/useCurrentUser';

type Review = {
  id: string | number;
  student: string;
  avatar: string;
  color: string;
  topic: string;
  date: string;
  rating: number;
  ratingText: string;
  text: string;
  read: boolean;
  reply: string | null;
  replyDate: string | null;
};

const INITIAL_REVIEWS: Review[] = [
  { id: 1, student: 'Arjun Sharma', avatar: 'AS', color: '#14B8A6', topic: 'LLD Patterns & OOP', date: 'Apr 22, 2026', rating: 5, ratingText: '5.0', text: 'Dr. Rao explained complex design patterns with real-world examples. The session was incredibly structured and I walked away with a clear action plan.', read: true, reply: 'Thank you Arjun! Your dedication really shows. Keep practicing those concurrency patterns before our next session.', replyDate: 'Apr 23, 2026' },
  { id: 2, student: 'Kabir Das', avatar: 'KD', color: '#F97316', topic: 'Investor Pitch Feedback', date: 'Apr 29, 2026', rating: 5, ratingText: '5.0', text: 'Suresh gave razor-sharp feedback on our deck. He spotted issues I had completely missed and gave very actionable advice.', read: false, reply: null, replyDate: null },
  { id: 3, student: 'Meera Pillai', avatar: 'MP', color: '#FCD34D', topic: 'APM Case Study Prep', date: 'Apr 24, 2026', rating: 4, ratingText: '4.0', text: 'Great session overall. Dr. Rao helped me structure PM case studies much better. Would have loved more time on metrics frameworks.', read: true, reply: 'Thanks Meera! We will dive deep into north star frameworks next session.', replyDate: 'Apr 25, 2026' },
  { id: 4, student: 'Priya Nair', avatar: 'PN', color: '#EC4899', topic: 'Research Career Paths', date: 'Apr 28, 2026', rating: 5, ratingText: '5.0', text: 'Dr. Rao has a rare ability to connect industry experience with academic research. This session changed my PhD application strategy completely.', read: false, reply: null, replyDate: null },
  { id: 5, student: 'Rohan Bhat', avatar: 'RB', color: '#14B8A6', topic: 'Final Session — Google Prep', date: 'Apr 1, 2026', rating: 5, ratingText: '5.0', text: '5 sessions with Dr. Rao and I cracked Google SWE Intern! He pushed me beyond my comfort zone every single time.', read: true, reply: 'Congratulations Rohan!! You earned this. All the best at Google!', replyDate: 'Apr 2, 2026' },
  { id: 6, student: 'Riya Shah', avatar: 'RS', color: '#EC4899', topic: 'Startup Pitch Deck', date: 'Apr 20, 2026', rating: 5, ratingText: '5.0', text: 'Suresh has a very structured approach. He helped us streamline our value proposition slide completely in just 30 minutes.', read: false, reply: null, replyDate: null },
  { id: 7, student: 'Tanvi Rao', avatar: 'TR', color: '#8B5CF6', topic: 'Career Transition Advice', date: 'Apr 18, 2026', rating: 4, ratingText: '4.0', text: 'Highly insightful session. Provided great clarity on engineering management roles compared to individual contributor paths.', read: true, reply: null, replyDate: null },
];

const MOCK_MONTHLY_TREND = [
  { month: 'Nov', score: 4.7, label: '4.7' },
  { month: 'Dec', score: 4.8, label: '4.8' },
  { month: 'Jan', score: 4.9, label: '4.9' },
  { month: 'Feb', score: 4.9, label: '4.9' },
  { month: 'Mar', score: 5.0, label: '5.0' },
  { month: 'Apr', score: 4.9, label: '4.9', isCurrent: true },
];

export function FeedbackView({ demoMode = false, setDemoMode }: { demoMode?: boolean; setDemoMode?: (val: boolean) => void }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const stack = width < 980;
  
  const { id: mentorId } = useCurrentUser('mentor1@persona.demo');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!mentorId) return;
    api.mentorReviews(mentorId).then((res) => {
      const mapped = (res.items || []).map((it: any) => ({
        id: it.id,
        student: it.student_name || 'Student',
        avatar: it.student_name ? it.student_name.slice(0, 2).toUpperCase() : 'ST',
        color: '#14B8A6',
        topic: 'Session',
        date: new Date(it.created_at).toLocaleDateString(),
        rating: it.rating,
        ratingText: it.rating.toFixed(1),
        text: it.comment || '',
        read: it.mentor_reply !== null,
        reply: it.mentor_reply,
        replyDate: it.mentor_reply_at ? new Date(it.mentor_reply_at).toLocaleDateString() : null,
      }));
      setReviews(mapped);
      setStats(res.stats);
    }).catch(e => console.error(e));
  }, [mentorId]);

  const [showImprovementPlan, setShowImprovementPlan] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | '5' | '4' | '3_below' | 'unread' | 'unanswered'>('all');
  const [replyingId, setReplyingId] = useState<string | number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const displayReviews = demoMode ? reviews : [];
  const displayStats = demoMode ? stats : { average: 0, total: 0, distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } };

  const unreadCount = displayReviews.filter((r) => !r.read).length;
  const unansweredCount = displayReviews.filter((r) => r.reply === null).length;

  const filteredReviews = displayReviews.filter((r) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === '5') return r.rating === 5;
    if (activeFilter === '4') return r.rating === 4;
    if (activeFilter === '3_below') return r.rating <= 3;
    if (activeFilter === 'unread') return !r.read;
    if (activeFilter === 'unanswered') return r.reply === null;
    return true;
  });

  const handleAnalyzeReviews = () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      toast.success('Reviews Analyzed', 'Overall sentiment is 96% positive! Focus keywords: structured guidance, system design depth, actionable pitch deck audits.');
    }, 1200);
  };

  const handleAiDraftReply = (reviewId: number | string) => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      setIsGeneratingAi(false);
      const selected = reviews.find((r) => r.id === reviewId);
      if (!selected) return;
      let draft = '';
      if (selected.student === 'Kabir Das') {
        draft = 'Thank you Kabir! Glad the deck feedback was actionable. Looking forward to refining Slide 2 narrative together before your pitch mock next week.';
      } else if (selected.student === 'Priya Nair') {
        draft = 'Thanks Priya! Your Ph.D. application strategy is in great shape. Excited to review your SOP drafts next week and refine the research framing.';
      } else if (selected.student === 'Riya Shah') {
        draft = 'Thanks Riya! Streamlining value proposition decks is always a fun exercise. Keep iterating on those user personas and let me know if you need another sync.';
      } else if (selected.student === 'Tanvi Rao') {
        draft = 'Thanks Tanvi! Deciding between EM and IC tracks is a major milestone. Happy to chat about concrete career roadmap benchmarks in our next sync.';
      } else {
        draft = `Thank you so much for the thoughtful review, ${selected.student.split(' ')[0]}! I'm glad our session was highly structured and helpful. See you soon!`;
      }
      setReplyText(draft);
    }, 800);
  };

  const handleSendReply = async (reviewId: string | number) => {
    if (!replyText.trim()) return;
    try {
      await api.replyToReview(String(reviewId), replyText);
      setReviews(reviews.map((r) => r.id === reviewId ? { ...r, reply: replyText, replyDate: new Date().toLocaleDateString(), read: true } : r));
      setReplyingId(null);
      setReplyText('');
      toast.success('Reply Sent', 'Your response has been published to the student portal.');
    } catch (e: any) {
      toast.error('Failed to reply', e.message);
    }
  };

  const handleEditReply = (reviewId: string | number, currentReply: string) => {
    setReplyingId(reviewId);
    setReplyText(currentReply);
  };

  const handleMarkAsRead = (reviewId: string | number) => {
    setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, read: true } : r)));
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
      {demoMode && (
        <View className="bg-amber/[0.08] border border-amber/30 rounded-xl py-2.5 px-4 items-center mb-4">
          <Text className="text-amber font-body-bold text-xs text-center">
            Demo Mode · Sample data is displayed for demonstration purposes.{' '}
            <Text onPress={() => setDemoMode?.(false)} className="underline text-white font-body-bold">Switch to Live Mode</Text>
          </Text>
        </View>
      )}

      <View className="flex-row items-center justify-between mb-1">
        <View>
          <Text className="text-white font-display-bold text-[22px] tracking-[-0.5px]">Feedback</Text>
          <Text className="text-dim font-body-semibold text-xs mt-0.5">{unreadCount} unread · {unansweredCount} awaiting reply</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        <Pressable 
          onPress={handleAnalyzeReviews}
          disabled={!demoMode}
          className="flex-row items-center gap-1.5 rounded-xl px-[14px] py-2"
          style={{ borderColor: 'rgba(252,211,77,0.35)', borderWidth: 1, backgroundColor: 'rgba(252,211,77,0.06)', cursor: 'pointer', ...(!demoMode ? { opacity: 0.5 } : {}) } as any}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#FCD34D" />
          ) : (
            <>
              <Sparkles size={13} color="#FCD34D" />
              <Text className="text-amber font-body-bold text-xs">{demoMode ? 'Analyze All Reviews' : 'AI Analysis (Requires 3+ reviews)'}</Text>
            </>
          )}
        </Pressable>

        <Pressable 
          onPress={() => demoMode && setShowImprovementPlan(!showImprovementPlan)}
          disabled={!demoMode}
          className="flex-row items-center gap-1.5 rounded-xl px-[14px] py-2 border"
          style={{
            borderColor: showImprovementPlan ? '#D97706' : 'rgba(245,158,11,0.30)',
            backgroundColor: showImprovementPlan ? '#F59E0B' : 'rgba(245,158,11,0.04)',
            cursor: 'pointer',
            ...(!demoMode ? { opacity: 0.5 } : {}),
          }}
        >
          <Sparkles size={13} color={showImprovementPlan ? '#fff' : '#F59E0B'} />
          <Text className="font-body-bold text-xs" style={{ color: showImprovementPlan ? '#fff' : '#FCD34D' }}>
            {demoMode ? 'AI: How do I reach 5.0?' : 'AI Guidance (Requires 3+ reviews)'}
          </Text>
        </Pressable>
      </View>

      {showImprovementPlan && demoMode && (
        <View className="bg-amber/[0.02] border border-amber/25 rounded-[16px] p-4 gap-2">
          <Text className="text-amber font-body-semibold text-[12.5px] leading-[18px]">1. Reserve last 10 minutes for student questions — 2 reviews mention sessions feeling rushed.</Text>
          <Text className="text-amber font-body-semibold text-[12.5px] leading-[18px]">2. Send a 1-line follow-up after each session to reinforce key learnings.</Text>
          <Text className="text-amber font-body-semibold text-[12.5px] leading-[18px]">3. Start with a 2-min recap of previous action items to show continuity.</Text>
        </View>
      )}

      <View className="gap-3.5" style={{ flexDirection: stack ? 'column' : 'row' }}>
        <View className="bg-card border border-glass-border rounded-[16px] p-[18px] flex-1 min-w-[180px]">
          <Text className="text-dim font-display-bold text-[10px] tracking-[1px] mb-1">OVERALL RATING</Text>
          <Text className="text-white font-display-bold text-[38px] tracking-[-1px]">{demoMode && displayStats?.average ? displayStats.average.toFixed(1) : '—'}</Text>
          <View className="my-1">
            <StarRow rating={demoMode && displayStats?.average ? Math.round(displayStats.average) : 0} size={15} />
          </View>
          <Text className="text-muted font-body-semibold text-xs mt-1">{demoMode && displayStats?.total ? displayStats.total : 0} reviews</Text>
        </View>

        <View className="bg-card border border-glass-border rounded-[16px] p-[18px] flex-[1.5] min-w-[260px]">
          <Text className="text-dim font-display-bold text-[10px] tracking-[1px] mb-1">RATING BREAKDOWN</Text>
          <View className="mt-2 gap-[5px]">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = demoMode ? (displayStats?.distribution?.[String(star)] || 0) : 0;
              const total = demoMode ? (displayStats?.total || 1) : 1;
              const pct = demoMode ? Math.round((count / total) * 100) : 0;
              return (
                <View key={star} className="flex-row items-center gap-2">
                  <Text className="text-dim font-body-bold text-[11px] w-6">{star} ★</Text>
                  <View className="flex-1 h-1.5 rounded-[3px] bg-white/[0.05] overflow-hidden">
                    <View className="h-full rounded-[3px]" style={{ width: `${pct}%` as any, backgroundColor: '#0D9488' }} />
                  </View>
                  <Text className="text-dim font-body-bold text-[11px] w-[14px] text-right">{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="bg-card border border-glass-border rounded-[16px] p-[18px] flex-[2] min-w-[320px]">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-dim font-display-bold text-[10px] tracking-[1px] mb-1">RATING TREND</Text>
            <Text className="font-body-bold text-[10.5px]" style={{ color: '#86EFAC' }}>{demoMode ? 'Trending up · Best: Mar 2026' : 'No trend data'}</Text>
          </View>
          {demoMode ? (
            <View className="flex-row items-end justify-between h-[75px] px-1 mt-2.5">
              {MOCK_MONTHLY_TREND.map((c) => {
                const isApr = c.month === 'Apr';
                const barHeight = Math.round((c.score / 5.0) * 55);
                return (
                  <View key={c.month} className="flex-1 items-center gap-1">
                    <Text className="font-body-bold text-[9.5px]" style={{ color: isApr ? '#F97316' : MC.dim }}>{c.label}</Text>
                    <View 
                      className="w-[60%] rounded-t"
                      style={{ 
                        height: barHeight,
                        backgroundColor: isApr ? '#F97316' : MC.teal,
                        opacity: isApr ? 1 : 0.45,
                      }} 
                    />
                    <Text className="text-[9.5px] font-body-semibold" style={{ color: isApr ? '#fff' : MC.dim, ...(isApr ? { fontFamily: FONTS.bold } : {}) }}>{c.month}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="flex-row items-center justify-center h-[70px] mt-2.5 border border-dashed rounded-[10px]" style={{ borderColor: MC.border }}>
              <Text className="text-dim font-body-semibold text-xs text-center px-5">No trend data yet. Complete sessions to generate feedback history.</Text>
            </View>
          )}
        </View>
      </View>

      <View className="gap-2.5 mt-1">
        <View className="flex-row flex-wrap gap-2">
          {unreadCount > 0 && (
            <View className="rounded-[20px] px-2.5 py-[3px] border" style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.30)' }}>
              <Text className="text-rose font-body-bold text-[11px]">{unreadCount} unread</Text>
            </View>
          )}
          {unansweredCount > 0 && (
            <View className="rounded-[20px] px-2.5 py-[3px] border" style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.30)' }}>
              <Text className="text-amber font-body-bold text-[11px]">{unansweredCount} awaiting reply</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 2 }}>
          {[
            { id: 'all', label: `All (${displayReviews.length})` },
            { id: '5', label: '5 ★' },
            { id: '4', label: '4 ★' },
            { id: '3_below', label: '3 ★ & below' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'unanswered', label: `Unanswered (${unansweredCount})` },
          ].map((item) => {
            const active = activeFilter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => demoMode && setActiveFilter(item.id as any)}
                disabled={!demoMode}
                className="px-[14px] py-2 rounded-[20px] border"
                style={active
                  ? { backgroundColor: '#0D9488', borderColor: '#0F766E' }
                  : { backgroundColor: MC.card, borderColor: MC.border, cursor: 'pointer', ...(!demoMode ? { opacity: 0.5 } : {}) }
                }
              >
                <Text className="text-[12.5px]" style={{ color: active ? '#fff' : MC.muted, fontFamily: active ? FONTS.bold : FONTS.semi }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View className="gap-3">
        {demoMode ? (
          filteredReviews.map((r) => {
            const isDrafting = replyingId === r.id;
            return (
              <View 
                key={r.id} 
                className="bg-card border border-glass-border rounded-[16px] p-4"
                style={!r.read ? { borderColor: 'rgba(20,184,166,0.35)', backgroundColor: 'rgba(20,184,166,0.02)' } : undefined}
                onStartShouldSetResponder={() => { if (!r.read) handleMarkAsRead(r.id); return false; }}
              >
                <View className="flex-row items-start justify-between gap-2.5">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Av initials={r.avatar} size={42} color={r.color} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white font-body-bold text-[13.5px]">{r.student}</Text>
                        {!r.read && (
                          <View className="px-1.5 py-0.5 rounded-[5px] border" style={{ backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }}>
                            <Text className="text-rose font-display-bold text-[9.5px]">New</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-dim font-body-semibold text-[11.5px] mt-0.5">{r.topic} · {r.date}</Text>
                    </View>
                  </View>
                  <View className="items-end gap-0.5">
                    <StarRow rating={r.rating} size={14} />
                    <Text className="font-body-bold text-xs" style={{ color: MC.amber }}>{r.ratingText}</Text>
                  </View>
                </View>

                <Text className="text-muted font-body-semibold text-[13px] leading-5 mt-3">"{r.text}"</Text>

                {r.reply && !isDrafting ? (
                  <View className="mt-3 p-3 rounded-xl gap-1.5" style={{ backgroundColor: 'rgba(20,184,166,0.06)', borderColor: 'rgba(20,184,166,0.15)', borderWidth: 1 }}>
                    <Text className="text-tealP font-display-bold text-[10px] tracking-[0.6px]">YOUR REPLY · {r.replyDate}</Text>
                    <Text className="text-white font-body-semibold text-[12.5px] leading-[18px]">{r.reply}</Text>
                    <Pressable onPress={() => handleEditReply(r.id, r.reply || '')} className="self-start mt-1 px-2.5 py-[5px] rounded-md bg-white/[0.05] border border-glass-border" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}>
                      <Text className="text-muted font-body-bold text-[11px]">Edit Reply</Text>
                    </Pressable>
                  </View>
                ) : isDrafting ? (
                  <View className="mt-3 gap-2.5">
                    <View className="bg-[rgba(20,12,40,0.6)] border border-glass-border rounded-xl p-2.5 min-h-[60px]">
                      <TextInput
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Write a reply..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                        className="text-white font-body-semibold text-[13px] min-h-[40px]"
                        style={{ textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
                      />
                    </View>
                    <View className="flex-row items-center justify-between flex-wrap gap-2">
                      <View className="flex-row gap-2 flex-1">
                        <Pressable onPress={() => handleAiDraftReply(r.id)} disabled={isGeneratingAi} className="flex-row items-center gap-1.5 px-3 py-[7px] rounded-lg border" style={{ backgroundColor: 'rgba(252,211,77,0.10)', borderColor: 'rgba(252,211,77,0.30)', cursor: 'pointer' }}>
                          {isGeneratingAi ? <ActivityIndicator size="small" color="#FCD34D" /> : <><Sparkles size={11} color="#FCD34D" /><Text className="text-amber font-body-bold text-[11.5px]">AI Draft Reply</Text></>}
                        </Pressable>
                        <Pressable onPress={() => handleSendReply(r.id)} className="px-[14px] py-[7px] rounded-lg bg-tealP items-center justify-center" style={{ cursor: 'pointer' }}>
                          <Text className="text-bg font-display-bold text-[11.5px]">Send Reply</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => { setReplyingId(null); setReplyText(''); }} className="px-2.5 py-[7px]" style={{ cursor: 'pointer' }}>
                        <Text className="text-muted font-body-bold text-[11.5px]">Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="mt-3">
                    <Pressable onPress={() => { setReplyingId(r.id); setReplyText(''); }} className="self-start px-3 py-[7px] rounded-lg bg-white/[0.05] border border-glass-border" style={{ cursor: 'pointer' }}>
                      <Text className="text-muted font-body-bold text-[11.5px]">Reply to Review</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View className="bg-card border border-glass-border rounded-[16px] p-[18px] items-center py-10">
            <Star size={48} color={MC.dim} style={{ marginBottom: 12 }} />
            <Text className="text-white font-body-bold text-[13px] mb-1">No student reviews yet</Text>
            <Text className="text-muted font-body-semibold text-[13px] text-center px-5">Reviews and student feedback will appear here after you conduct mentoring sessions.</Text>
          </View>
        )}

        {demoMode && filteredReviews.length === 0 && (
          <View className="py-6 items-center justify-center">
            <Text className="text-muted font-body-semibold text-[13.5px]">No reviews match the selected filter.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
