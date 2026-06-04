/**
 * Mentor Portal — Feedback view: High-fidelity redesign with detailed statistics,
 * interactive rating metrics, collapsible AI advice panels, and stateful reply drafts.
 */
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
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

type Review = {
  id: number;
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
  {
    id: 1,
    student: 'Arjun Sharma',
    avatar: 'AS',
    color: '#14B8A6',
    topic: 'LLD Patterns & OOP',
    date: 'Apr 22, 2026',
    rating: 5,
    ratingText: '5.0',
    text: 'Dr. Rao explained complex design patterns with real-world examples. The session was incredibly structured and I walked away with a clear action plan.',
    read: true,
    reply: 'Thank you Arjun! Your dedication really shows. Keep practicing those concurrency patterns before our next session.',
    replyDate: 'Apr 23, 2026',
  },
  {
    id: 2,
    student: 'Kabir Das',
    avatar: 'KD',
    color: '#F97316',
    topic: 'Investor Pitch Feedback',
    date: 'Apr 29, 2026',
    rating: 5,
    ratingText: '5.0',
    text: 'Suresh gave razor-sharp feedback on our deck. He spotted issues I had completely missed and gave very actionable advice.',
    read: false,
    reply: null,
    replyDate: null,
  },
  {
    id: 3,
    student: 'Meera Pillai',
    avatar: 'MP',
    color: '#FCD34D',
    topic: 'APM Case Study Prep',
    date: 'Apr 24, 2026',
    rating: 4,
    ratingText: '4.0',
    text: 'Great session overall. Dr. Rao helped me structure PM case studies much better. Would have loved more time on metrics frameworks.',
    read: true,
    reply: 'Thanks Meera! We will dive deep into north star frameworks next session.',
    replyDate: 'Apr 25, 2026',
  },
  {
    id: 4,
    student: 'Priya Nair',
    avatar: 'PN',
    color: '#EC4899',
    topic: 'Research Career Paths',
    date: 'Apr 28, 2026',
    rating: 5,
    ratingText: '5.0',
    text: 'Dr. Rao has a rare ability to connect industry experience with academic research. This session changed my PhD application strategy completely.',
    read: false,
    reply: null,
    replyDate: null,
  },
  {
    id: 5,
    student: 'Rohan Bhat',
    avatar: 'RB',
    color: '#14B8A6',
    topic: 'Final Session — Google Prep',
    date: 'Apr 1, 2026',
    rating: 5,
    ratingText: '5.0',
    text: '5 sessions with Dr. Rao and I cracked Google SWE Intern! He pushed me beyond my comfort zone every single time.',
    read: true,
    reply: 'Congratulations Rohan!! You earned this. All the best at Google!',
    replyDate: 'Apr 2, 2026',
  },
  {
    id: 6,
    student: 'Riya Shah',
    avatar: 'RS',
    color: '#EC4899',
    topic: 'Startup Pitch Deck',
    date: 'Apr 20, 2026',
    rating: 5,
    ratingText: '5.0',
    text: 'Suresh has a very structured approach. He helped us streamline our value proposition slide completely in just 30 minutes.',
    read: false,
    reply: null,
    replyDate: null,
  },
  {
    id: 7,
    student: 'Tanvi Rao',
    avatar: 'TR',
    color: '#8B5CF6',
    topic: 'Career Transition Advice',
    date: 'Apr 18, 2026',
    rating: 4,
    ratingText: '4.0',
    text: 'Highly insightful session. Provided great clarity on engineering management roles compared to individual contributor paths.',
    read: true,
    reply: null,
    replyDate: null,
  }
];

const MOCK_MONTHLY_TREND = [
  { month: 'Nov', score: 4.7, label: '4.7' },
  { month: 'Dec', score: 4.8, label: '4.8' },
  { month: 'Jan', score: 4.9, label: '4.9' },
  { month: 'Feb', score: 4.9, label: '4.9' },
  { month: 'Mar', score: 5.0, label: '5.0' },
  { month: 'Apr', score: 4.9, label: '4.9', isCurrent: true },
];

export function FeedbackView() {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const stack = width < 980;

  // Local stateful list of reviews
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);

  // Accordion flags
  const [showImprovementPlan, setShowImprovementPlan] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filter selection state
  const [activeFilter, setActiveFilter] = useState<'all' | '5' | '4' | '3_below' | 'unread' | 'unanswered'>('all');

  // Inline drafting/replying state
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Dynamic status counters
  const unreadCount = reviews.filter((r) => !r.read).length;
  const unansweredCount = reviews.filter((r) => r.reply === null).length;

  // Filter handlers
  const filteredReviews = reviews.filter((r) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === '5') return r.rating === 5;
    if (activeFilter === '4') return r.rating === 4;
    if (activeFilter === '3_below') return r.rating <= 3;
    if (activeFilter === 'unread') return !r.read;
    if (activeFilter === 'unanswered') return r.reply === null;
    return true;
  });

  // Action simulations
  const handleAnalyzeReviews = () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      toast.success(
        'Reviews Analyzed',
        'Overall sentiment is 96% positive! Focus keywords: structured guidance, system design depth, actionable pitch deck audits.'
      );
    }, 1200);
  };

  const handleAiDraftReply = (reviewId: number) => {
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

  const handleSendReply = (reviewId: number) => {
    if (!replyText.trim()) return;

    setReviews(
      reviews.map((r) => {
        if (r.id === reviewId) {
          return {
            ...r,
            reply: replyText,
            replyDate: 'Today',
            read: true, // Auto mark as read on reply
          };
        }
        return r;
      })
    );
    setReplyingId(null);
    setReplyText('');
    toast.success('Reply Sent', 'Your response has been published to the student portal.');
  };

  const handleEditReply = (reviewId: number, currentReply: string) => {
    setReplyingId(reviewId);
    setReplyText(currentReply);
  };

  const handleMarkAsRead = (reviewId: number) => {
    setReviews(
      reviews.map((r) => (r.id === reviewId ? { ...r, read: true } : r))
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
      {/* Header section */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.mainTitle}>Feedback</Text>
          <Text style={s.mainSubtitle}>{unreadCount} unread · {unansweredCount} awaiting reply</Text>
        </View>
      </View>

      {/* AI actions row */}
      <View style={s.aiActionsRow}>
        <Pressable 
          onPress={handleAnalyzeReviews}
          style={s.analyzeBtn}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color="#FCD34D" />
          ) : (
            <>
              <Sparkles size={13} color="#FCD34D" />
              <Text style={s.analyzeBtnText}>Analyze All Reviews</Text>
            </>
          )}
        </Pressable>

        <Pressable 
          onPress={() => setShowImprovementPlan(!showImprovementPlan)}
          style={[s.accordionTrigger, showImprovementPlan && s.accordionTriggerActive]}
        >
          <Sparkles size={13} color={showImprovementPlan ? '#fff' : '#F59E0B'} />
          <Text style={[s.accordionTriggerText, showImprovementPlan && s.accordionTriggerTextActive]}>
            AI: How do I reach 5.0?
          </Text>
        </Pressable>
      </View>

      {/* Collapsible improvement plan drawer */}
      {showImprovementPlan && (
        <View style={s.accordionBody}>
          <Text style={s.accordionBullet}>
            1. Reserve last 10 minutes for student questions — 2 reviews mention sessions feeling rushed.
          </Text>
          <Text style={s.accordionBullet}>
            2. Send a 1-line follow-up after each session to reinforce key learnings.
          </Text>
          <Text style={s.accordionBullet}>
            3. Start with a 2-min recap of previous action items to show continuity.
          </Text>
        </View>
      )}

      {/* Rating summaries horizontal row */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 14 }}>
        {/* OVERALL RATING Card */}
        <View style={[s.card, { flex: 1, minWidth: 180 }]}>
          <Text style={s.cardKicker}>OVERALL RATING</Text>
          <Text style={s.hugeValue}>4.4</Text>
          <View style={{ marginVertical: 4 }}>
            <StarRow rating={4} size={15} />
          </View>
          <Text style={s.reviewsCountLabel}>7 reviews</Text>
        </View>

        {/* RATING BREAKDOWN Card */}
        <View style={[s.card, { flex: 1.5, minWidth: 260 }]}>
          <Text style={s.cardKicker}>RATING BREAKDOWN</Text>
          <View style={{ marginTop: 8, gap: 5 }}>
            {[
              { star: 5, count: 5, pct: 71 },
              { star: 4, count: 2, pct: 29 },
              { star: 3, count: 0, pct: 0 },
              { star: 2, count: 0, pct: 0 },
              { star: 1, count: 0, pct: 0 },
            ].map((d) => (
              <View key={d.star} style={s.breakdownRow}>
                <Text style={s.starText}>{d.star} ★</Text>
                <View style={s.progressBarTrack}>
                  <View style={[s.progressBarFill, { width: `${d.pct}%` as any }]} />
                </View>
                <Text style={s.breakdownCountText}>{d.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* RATING TREND Card */}
        <View style={[s.card, { flex: 2, minWidth: 320 }]}>
          <View style={s.trendHeader}>
            <Text style={s.cardKicker}>RATING TREND</Text>
            <Text style={s.growthLabel}>Trending up · Best: Mar 2026</Text>
          </View>
          
          <View style={s.customChartContainer}>
            {MOCK_MONTHLY_TREND.map((c) => {
              const isApr = c.month === 'Apr';
              const maxVal = 5.0;
              const barHeight = Math.round((c.score / maxVal) * 55);
              
              return (
                <View key={c.month} style={s.chartBarColumn}>
                  <Text style={[s.chartBarLabel, isApr && s.chartBarLabelActive]}>
                    {c.label}
                  </Text>
                  <View 
                    style={[
                      s.chartBarTrack, 
                      { height: barHeight },
                      isApr ? s.chartBarActive : s.chartBarInactive
                    ]} 
                  />
                  <Text style={[s.chartBarMonth, isApr && s.chartBarMonthActive]}>
                    {c.month}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Filter pills container */}
      <View style={s.filterContainer}>
        {/* Left indicators */}
        <View style={s.badgePillsContainer}>
          {unreadCount > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeText}>{unreadCount} unread</Text>
            </View>
          )}
          {unansweredCount > 0 && (
            <View style={s.unansweredBadge}>
              <Text style={s.unansweredBadgeText}>{unansweredCount} awaiting reply</Text>
            </View>
          )}
        </View>

        {/* Filter Selection Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {[
            { id: 'all', label: `All (${reviews.length})` },
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
                onPress={() => setActiveFilter(item.id as any)}
                style={[s.filterPill, active && s.filterPillActive]}
              >
                <Text style={[s.filterPillText, active && s.filterPillTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Reviews list */}
      <View style={{ gap: 12 }}>
        {filteredReviews.map((r) => {
          const isDrafting = replyingId === r.id;
          return (
            <View 
              key={r.id} 
              style={[
                s.reviewCard, 
                !r.read && { borderColor: 'rgba(20,184,166,0.35)', backgroundColor: 'rgba(20,184,166,0.02)' }
              ]}
              onStartShouldSetResponder={() => {
                if (!r.read) handleMarkAsRead(r.id);
                return false;
              }}
            >
              {/* Header: Avatar, Info, Stars */}
              <View style={s.reviewCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Av initials={r.avatar} size={42} color={r.color} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.studentName}>{r.student}</Text>
                      {!r.read && (
                        <View style={s.newDotBadge}>
                          <Text style={s.newDotBadgeText}>New</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.sessionDetails}>{r.topic} · {r.date}</Text>
                  </View>
                </View>
                
                {/* Rating display */}
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <StarRow rating={r.rating} size={14} />
                  <Text style={s.starsTextDisplay}>{r.ratingText}</Text>
                </View>
              </View>

              {/* Review Text */}
              <Text style={s.reviewTextBody}>“{r.text}”</Text>

              {/* Reply Section */}
              {r.reply && !isDrafting ? (
                <View style={s.replyBoxContainer}>
                  <Text style={s.replyBoxHeader}>YOUR REPLY · {r.replyDate}</Text>
                  <Text style={s.replyBoxBody}>{r.reply}</Text>
                  <Pressable 
                    onPress={() => handleEditReply(r.id, r.reply || '')}
                    style={s.editReplyBtn}
                  >
                    <Text style={s.editReplyBtnText}>Edit Reply</Text>
                  </Pressable>
                </View>
              ) : isDrafting ? (
                /* Inline Editor Drawer */
                <View style={s.inlineEditor}>
                  <View style={s.inputContainer}>
                    <TextInput
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder="Write a reply..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline
                      style={s.replyTextInput}
                    />
                  </View>
                  <View style={s.editorActionsRow}>
                    <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                      <Pressable 
                        onPress={() => handleAiDraftReply(r.id)}
                        disabled={isGeneratingAi}
                        style={s.aiDraftBtn}
                      >
                        {isGeneratingAi ? (
                          <ActivityIndicator size="small" color="#FCD34D" />
                        ) : (
                          <>
                            <Sparkles size={11} color="#FCD34D" />
                            <Text style={s.aiDraftBtnText}>AI Draft Reply</Text>
                          </>
                        )}
                      </Pressable>
                      
                      <Pressable 
                        onPress={() => handleSendReply(r.id)}
                        style={s.sendReplyBtn}
                      >
                        <Text style={s.sendReplyBtnText}>Send Reply</Text>
                      </Pressable>
                    </View>

                    <Pressable 
                      onPress={() => {
                        setReplyingId(null);
                        setReplyText('');
                      }}
                      style={s.cancelReplyBtn}
                    >
                      <Text style={s.cancelReplyText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                /* Reply action button */
                <View style={{ marginTop: 12 }}>
                  <Pressable 
                    onPress={() => {
                      setReplyingId(r.id);
                      setReplyText('');
                    }}
                    style={s.replyTriggerBtn}
                  >
                    <Text style={s.replyTriggerText}>Reply to Review</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {filteredReviews.length === 0 && (
          <View style={s.emptyStateBox}>
            <Text style={s.emptyStateText}>No reviews match the selected filter.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mainTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 12,
    marginTop: 2,
  },
  aiActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: 'rgba(252,211,77,0.35)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(252,211,77,0.06)',
    cursor: 'pointer',
  } as any,
  analyzeBtnText: {
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  accordionTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: 'rgba(245,158,11,0.30)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(245,158,11,0.04)',
    cursor: 'pointer',
  } as any,
  accordionTriggerActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
  },
  accordionTriggerText: {
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  accordionTriggerTextActive: {
    color: '#fff',
  },
  accordionBody: {
    backgroundColor: 'rgba(245,158,11,0.02)',
    borderColor: 'rgba(245,158,11,0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  accordionBullet: {
    color: '#FCD34D',
    fontFamily: FONTS.med,
    fontSize: 12.5,
    lineHeight: 18,
  },
  card: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  cardKicker: {
    color: MC.dim,
    fontFamily: FONTS.xbold,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  hugeValue: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 38,
    letterSpacing: -1,
  },
  reviewsCountLabel: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12,
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starText: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 11,
    width: 24,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
  breakdownCountText: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 11,
    width: 14,
    textAlign: 'right',
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  growthLabel: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 10.5,
  },
  customChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 75,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  chartBarColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartBarLabel: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 9.5,
  },
  chartBarLabelActive: {
    color: '#F97316',
    fontFamily: FONTS.xbold,
  },
  chartBarTrack: {
    width: '60%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chartBarInactive: {
    backgroundColor: MC.teal,
    opacity: 0.45,
  },
  chartBarActive: {
    backgroundColor: '#F97316',
    opacity: 1,
  },
  chartBarMonth: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 9.5,
  },
  chartBarMonthActive: {
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  filterContainer: {
    gap: 10,
    marginTop: 4,
  },
  badgePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.30)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unreadBadgeText: {
    color: '#FCA5A5',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  unansweredBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.30)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unansweredBadgeText: {
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.border,
    cursor: 'pointer',
  } as any,
  filterPillActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0F766E',
  },
  filterPillText: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12.5,
  },
  filterPillTextActive: {
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  reviewCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  studentName: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  newDotBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: 'rgba(239,68,68,0.4)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  newDotBadgeText: {
    color: '#FCA5A5',
    fontFamily: FONTS.xbold,
    fontSize: 9.5,
  },
  sessionDetails: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 1,
  },
  starsTextDisplay: {
    color: MC.amber,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  reviewTextBody: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  replyBoxContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(20,184,166,0.06)',
    borderColor: 'rgba(20,184,166,0.15)',
    borderWidth: 1,
    gap: 6,
  },
  replyBoxHeader: {
    color: MC.tealP,
    fontFamily: FONTS.xbold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  replyBoxBody: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 12.5,
    lineHeight: 18,
  },
  editReplyBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: MC.border,
    cursor: 'pointer',
  } as any,
  editReplyBtnText: {
    color: MC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  inlineEditor: {
    marginTop: 12,
    gap: 10,
  },
  inputContainer: {
    backgroundColor: 'rgba(20,12,40,0.6)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 60,
  },
  replyTextInput: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    minHeight: 40,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  editorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.30)',
    cursor: 'pointer',
  } as any,
  aiDraftBtnText: {
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  sendReplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: MC.tealP,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  } as any,
  sendReplyBtnText: {
    color: MC.bg,
    fontFamily: FONTS.xbold,
    fontSize: 11.5,
  },
  cancelReplyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    cursor: 'pointer',
  } as any,
  cancelReplyText: {
    color: MC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  replyTriggerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: MC.border,
    cursor: 'pointer',
  } as any,
  replyTriggerText: {
    color: MC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  emptyStateBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 13.5,
  },
});
