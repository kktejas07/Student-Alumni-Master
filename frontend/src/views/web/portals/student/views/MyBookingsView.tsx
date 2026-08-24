/**
 * Student → My Bookings — lists confirmed mentor sessions for the active student.
 * Polls every 30s; supports cancel inline.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Calendar, Clock, X, User, Check, Star } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GlassCard } from '../glass';
import { EmptyState } from '../EmptyState';
import { usePortalData } from '@/src/lib/portalApi';
import { useCurrentUser } from '@/src/lib/useCurrentUser';
import { request, api } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';

type Booking = {
  id: string; topic: string; mentor_name: string; mentor_email: string;
  scheduled_at: string; duration_minutes: number; amount_paid: number; status: string;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return 'TBD';
  try { return String(iso).slice(0, 16).replace('T', ' '); } catch { return 'TBD'; }
}

export function MyBookingsView() {
  const { email } = useCurrentUser('booked1@persona.demo');
  const toast = useToast();
  const { data, refresh } = usePortalData<{ items: Booking[]; count: number }>(
    `/student/my-bookings?email=${encodeURIComponent(email)}`,
    { items: [], count: 0 },
    30_000
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const [reviewModalData, setReviewModalData] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState<Set<string>>(new Set());

  const cancel = async (id: string) => {
    try {
      setCancellingId(id);
      await request(`/student/bookings/${id}`, { method: 'DELETE' });
      refresh();
      toast.success('Booking cancelled');
    } catch (e: any) {
      toast.error('Cancel failed', e?.message || 'Please try again.');
    } finally { setCancellingId(null); }
  };

  const completeBooking = async (id: string) => {
    try {
      setCompletingId(id);
      await api.markBookingCompleted(id);
      refresh();
      toast.success('Session Completed', 'The session was marked as completed.');
    } catch (e: any) {
      toast.error('Failed', e.message);
    } finally { setCompletingId(null); }
  };

  const submitReview = async () => {
    if (!reviewModalData) return;
    try {
      setIsSubmittingReview(true);
      await api.postReview({
        mentor_id: 'auto-resolved',
        rating: reviewRating,
        comment: reviewComment,
        booking_id: reviewModalData.id,
      });
      toast.success('Review Submitted', 'Thank you for your feedback!');
      setSubmittedReviews(new Set(submittedReviews).add(reviewModalData.id));
      setReviewModalData(null);
    } catch (e: any) {
      toast.error('Failed to submit review', e.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const items = data?.items || [];
  const parseDate = (d: any) => { if (!d) return 0; const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; };
  const upcoming = items.filter((b) => b.status === 'confirmed' || b.status === 'accepted').sort((a, b) => parseDate(a.scheduled_at) - parseDate(b.scheduled_at));
  const pending = items.filter((b) => b.status === 'pending').sort((a, b) => parseDate(a.scheduled_at) - parseDate(b.scheduled_at));
  const cancelled = items.filter((b) => b.status === 'cancelled' || b.status === 'declined' || b.status === 'expired').sort((a, b) => parseDate(b.scheduled_at) - parseDate(a.scheduled_at));
  const completed = items.filter((b) => b.status === 'completed' || b.status === 'attended').sort((a, b) => parseDate(b.scheduled_at) - parseDate(a.scheduled_at));

  return (
    <View className="gap-4">
      <View>
        <Text className="text-white text-[22px] font-extrabold tracking-tight">My Bookings</Text>
        <Text className="text-muted text-[12px] font-medium mt-1">Mentor sessions for {email} · auto-refreshes every 30s</Text>
      </View>

      {pending.length > 0 && (
        <Section title={`Pending Requests (${pending.length})`}>
          {pending.map((b, idx) => {
            return (
              <GlassCard key={b.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.05)' }}>
                <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)', borderWidth: 1 }}><Clock size={18} color="#F59E0B" /></View>
                <View className="flex-1 min-w-0">
                  <Text className="text-white text-[13px] font-bold">{b.topic || 'Session Request'}</Text>
                  <View className="flex-row items-center gap-[6px] mt-[3px] flex-wrap">
                    <User size={11} color={SC.muted} />
                    <Text className="text-muted text-[11px] font-medium">{b.mentor_name || 'Mentor'}</Text>
                    <Text className="text-dim text-[11px] font-medium">·</Text>
                    <Clock size={11} color={SC.muted} />
                    <Text className="text-muted text-[11px] font-medium">{fmtDate(b.scheduled_at)} · {b.duration_minutes || 45}min</Text>
                  </View>
                  <Text className="text-[12px] font-bold mt-1" style={{ color: '#F59E0B' }}>Waiting for approval</Text>
                </View>
                <Pressable
                  onPress={() => cancel(b.id)}
                  disabled={cancellingId === b.id}
                  className="flex-row items-center gap-[5px] px-3 h-[30px] rounded-lg border border-red-400/40"
                  style={({ hovered }: any) => [hovered && { backgroundColor: '#EF444422' }, cancellingId === b.id && { opacity: 0.5 }]}
                >
                  <X size={12} color="#EF4444" />
                  <Text className="text-red-500 text-[11px] font-bold">{cancellingId === b.id ? 'Cancelling…' : 'Cancel'}</Text>
                </Pressable>
              </GlassCard>
            );
          })}
        </Section>
      )}

      <Section title={`Upcoming (${upcoming.length})`}>
        {upcoming.map((b, idx) => {
          const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
          return (
          <GlassCard key={b.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View className="w-[38px] h-[38px] rounded-[10px] bg-violet/10 border border-violet/30 items-center justify-center"><Calendar size={18} color={SC.accentBright} /></View>
            <View className="flex-1 min-w-0">
              <Text className="text-white text-[13px] font-bold">{b.topic || 'Session'}</Text>
              <View className="flex-row items-center gap-[6px] mt-[3px] flex-wrap">
                <User size={11} color={SC.muted} />
                <Text className="text-muted text-[11px] font-medium">{b.mentor_name || 'Mentor'}</Text>
                <Text className="text-dim text-[11px] font-medium">·</Text>
                <Clock size={11} color={SC.muted} />
                <Text className="text-muted text-[11px] font-medium">{fmtDate(b.scheduled_at)} · {b.duration_minutes || 45}min</Text>
              </View>
              {b.amount_paid != null && (
                <Text className="text-violet text-[12px] font-bold mt-1">₹{Number(b.amount_paid).toLocaleString()} paid</Text>
              )}
            </View>
            <View className="flex-row items-center gap-[6px]">
              <Pressable
                onPress={() => completeBooking(b.id)}
                disabled={completingId === b.id}
                className="flex-row items-center gap-[5px] px-3 h-[30px] rounded-lg border border-emerald-400/40"
                style={({ hovered }: any) => [hovered && { backgroundColor: 'rgba(16,185,129,0.1)' }, completingId === b.id && { opacity: 0.5 }]}
              >
                <Check size={12} color="#10B981" />
                <Text className="text-emerald-500 text-[11px] font-bold">{completingId === b.id ? 'Marking…' : 'Mark Done'}</Text>
              </Pressable>
              <Pressable
                onPress={() => cancel(b.id)}
                disabled={cancellingId === b.id}
                className="flex-row items-center gap-[5px] px-3 h-[30px] rounded-lg border border-red-400/40"
                style={({ hovered }: any) => [hovered && { backgroundColor: '#EF444422' }, cancellingId === b.id && { opacity: 0.5 }]}
              >
                <X size={12} color="#EF4444" />
                <Text className="text-red-500 text-[11px] font-bold">{cancellingId === b.id ? 'Cancelling…' : 'Cancel'}</Text>
              </Pressable>
            </View>
          </GlassCard>
          );
        })}
        {upcoming.length === 0 && pending.length === 0 && (
          <EmptyState
            variant="bookings"
            title="No upcoming bookings"
            body="Book a 1:1 with a mentor from the Network tab to lock in personalised guidance."
          />
        )}
      </Section>

      {cancelled.length > 0 && (
        <Section title={`Cancelled (${cancelled.length})`}>
          {cancelled.map((b, idx) => {
            const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
            return (
            <GlassCard key={b.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.55 }}>
              <View className="w-[38px] h-[38px] rounded-[10px] bg-red-500/10 items-center justify-center" style={{ borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1 }}><X size={16} color="#EF4444" /></View>
              <View className="flex-1 min-w-0">
                <Text className="text-white text-[13px] font-bold">{b.topic || 'Session'}</Text>
                <Text className="text-muted text-[11px] font-medium">{b.mentor_name || 'Mentor'} · {when ? when.toLocaleDateString() : 'TBD'}</Text>
              </View>
            </GlassCard>
            );
          })}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title={`Completed (${completed.length})`}>
          {completed.map((b, idx) => {
            const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
            const hasReviewed = submittedReviews.has(b.id);
            return (
            <GlassCard key={b.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.85 }}>
              <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1 }}><Check size={16} color="#10B981" /></View>
              <View className="flex-1 min-w-0">
                <Text className="text-white text-[13px] font-bold">{b.topic || 'Session'}</Text>
                <Text className="text-muted text-[11px] font-medium">{b.mentor_name || 'Mentor'} · {when ? when.toLocaleDateString() : 'TBD'}</Text>
              </View>
              {hasReviewed ? (
                <Text className="text-emerald-500 text-xs font-medium">Review Submitted ✓</Text>
              ) : (
                <Pressable
                  onPress={() => {
                    setReviewModalData(b);
                    setReviewRating(5);
                    setReviewComment('');
                  }}
                  className="flex-row items-center gap-[5px] px-3 h-[30px] rounded-lg border border-violet"
                  style={({ hovered }: any) => [hovered && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                >
                  <Star size={12} color={SC.accent} />
                  <Text className="text-violet text-[11px] font-bold">Leave Review</Text>
                </Pressable>
              )}
            </GlassCard>
            );
          })}
        </Section>
      )}

      {/* Review Modal */}
      {reviewModalData && (
        <View className="absolute inset-0 bg-black/60 z-[100] items-center justify-center p-5" style={{ backdropFilter: 'blur(4px)' } as any}>
          <View className="w-full max-w-[450px] bg-bg2 border border-glass-border rounded-2xl p-6 shadow-xl" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white font-bold text-lg">Review Session</Text>
              <Pressable onPress={() => setReviewModalData(null)}>
                <X size={20} color="#999" />
              </Pressable>
            </View>

            <Text className="text-neutral-400 text-sm font-medium mb-4">
              How was your session with <Text className="text-white">{reviewModalData.mentor_name}</Text> on <Text className="text-white">"{reviewModalData.topic}"</Text>?
            </Text>

            <View className="flex-row justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)}>
                  <Star size={32} color={star <= reviewRating ? '#FCD34D' : '#444'} fill={star <= reviewRating ? '#FCD34D' : 'transparent'} />
                </Pressable>
              ))}
            </View>

            <View className="gap-1.5 mb-5">
              <Text className="text-muted text-[11px] font-medium tracking-wide">Additional Comments (Optional)</Text>
              <View className="bg-glass border border-glass-border rounded-[10px] p-3">
                <textarea
                  value={reviewComment}
                  onChange={(e: any) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="text-white text-[13px] font-medium bg-transparent"
                  style={{ borderWidth: 0, outline: 'none', resize: 'none', width: '100%' } as any}
                  rows={4}
                />
              </View>
            </View>

            <Pressable
              onPress={submitReview}
              disabled={isSubmittingReview}
              className="h-[42px] bg-violet rounded-[10px] items-center justify-center"
              style={isSubmittingReview ? { opacity: 0.5 } : undefined}
            >
              <Text className="text-[#1E1B4B] text-sm font-bold">{isSubmittingReview ? 'Submitting...' : 'Submit Review'}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-muted text-[11px] font-extrabold tracking-widest mb-2">{title}</Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}
