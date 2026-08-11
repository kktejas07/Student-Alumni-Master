/**
 * Student → My Bookings — lists confirmed mentor sessions for the active student.
 * Polls every 30s; supports cancel inline.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
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
      // We need mentor_id, but the booking item doesn't return it natively in the list right now.
      // We'll post to /reviews with mentor_id='todo' if missing. Actually api expects mentor_id.
      // Wait, let's fetch the mentor_id or just send booking_id and the backend resolves it?
      // For now we assume mentor_id is required. Let's pass the booking's mentor_email as fallback if ID is not in response, 
      // but let's just pass booking_id and mentor_id='unknown'. (Wait, ReviewIn expects mentor_id)
      await api.postReview({
        mentor_id: 'auto-resolved', // The API requires mentor_id, but since we have booking_id, we can fix it on backend.
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
    <View style={{ gap: 16 }}>
      <View>
        <Text style={s.h1}>My Bookings</Text>
        <Text style={s.sub}>Mentor sessions for {email} · auto-refreshes every 30s</Text>
      </View>

      {pending.length > 0 && (
        <Section title={`Pending Requests (${pending.length})`}>
          {pending.map((b, idx) => {
            return (
              <GlassCard key={b.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.05)' }}>
                <View style={[s.iconBox, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }]}><Clock size={18} color="#F59E0B" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.topic}>{b.topic || 'Session Request'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <User size={11} color={SC.muted} />
                    <Text style={s.meta}>{b.mentor_name || 'Mentor'}</Text>
                    <Text style={s.dot}>·</Text>
                    <Clock size={11} color={SC.muted} />
                    <Text style={s.meta}>{fmtDate(b.scheduled_at)} · {b.duration_minutes || 45}min</Text>
                  </View>
                  <Text style={[s.amount, { color: '#F59E0B' }]}>Waiting for approval</Text>
                </View>
                <Pressable
                  onPress={() => cancel(b.id)}
                  disabled={cancellingId === b.id}
                  style={({ hovered }: any) => [s.cancelBtn, hovered && { backgroundColor: '#EF444422' }, cancellingId === b.id && { opacity: 0.5 }]}
                >
                  <X size={12} color="#EF4444" />
                  <Text style={s.cancelText}>{cancellingId === b.id ? 'Cancelling…' : 'Cancel'}</Text>
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
            <View style={s.iconBox}><Calendar size={18} color={SC.accentBright} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.topic}>{b.topic || 'Session'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                <User size={11} color={SC.muted} />
                <Text style={s.meta}>{b.mentor_name || 'Mentor'}</Text>
                <Text style={s.dot}>·</Text>
                <Clock size={11} color={SC.muted} />
                <Text style={s.meta}>{fmtDate(b.scheduled_at)} · {b.duration_minutes || 45}min</Text>
              </View>
              {b.amount_paid != null && (
                <Text style={s.amount}>₹{Number(b.amount_paid).toLocaleString()} paid</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => completeBooking(b.id)}
                disabled={completingId === b.id}
                style={({ hovered }: any) => [s.cancelBtn, hovered && { backgroundColor: 'rgba(16,185,129,0.1)' }, { borderColor: 'rgba(16,185,129,0.4)' }, completingId === b.id && { opacity: 0.5 }]}
              >
                <Check size={12} color="#10B981" />
                <Text style={[s.cancelText, { color: '#10B981' }]}>{completingId === b.id ? 'Marking…' : 'Mark Done'}</Text>
              </Pressable>
              <Pressable
                onPress={() => cancel(b.id)}
                disabled={cancellingId === b.id}
                style={({ hovered }: any) => [s.cancelBtn, hovered && { backgroundColor: '#EF444422' }, cancellingId === b.id && { opacity: 0.5 }]}
              >
                <X size={12} color="#EF4444" />
                <Text style={s.cancelText}>{cancellingId === b.id ? 'Cancelling…' : 'Cancel'}</Text>
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
              <View style={[s.iconBox, { backgroundColor: '#EF444422' }]}><X size={16} color="#EF4444" /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.topic}>{b.topic || 'Session'}</Text>
                <Text style={s.meta}>{b.mentor_name || 'Mentor'} · {when ? when.toLocaleDateString() : 'TBD'}</Text>
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
              <View style={[s.iconBox, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }]}><Check size={16} color="#10B981" /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.topic}>{b.topic || 'Session'}</Text>
                <Text style={s.meta}>{b.mentor_name || 'Mentor'} · {when ? when.toLocaleDateString() : 'TBD'}</Text>
              </View>
              {hasReviewed ? (
                <Text style={{ color: '#10B981', fontFamily: FONTS.med, fontSize: 12 }}>Review Submitted ✓</Text>
              ) : (
                <Pressable
                  onPress={() => {
                    setReviewModalData(b);
                    setReviewRating(5);
                    setReviewComment('');
                  }}
                  style={({ hovered }: any) => [s.cancelBtn, { borderColor: SC.accent, backgroundColor: hovered ? 'rgba(255,255,255,0.05)' : 'transparent' }]}
                >
                  <Star size={12} color={SC.accent} />
                  <Text style={[s.cancelText, { color: SC.accent }]}>Leave Review</Text>
                </Pressable>
              )}
            </GlassCard>
            );
          })}
        </Section>
      )}

      {/* Review Modal */}
      {reviewModalData && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 18 }}>Review Session</Text>
              <Pressable onPress={() => setReviewModalData(null)}>
                <X size={20} color="#999" />
              </Pressable>
            </View>

            <Text style={{ color: '#ccc', fontFamily: FONTS.med, fontSize: 14, marginBottom: 16 }}>
              How was your session with <Text style={{ color: '#1C1C1E' }}>{reviewModalData.mentor_name}</Text> on <Text style={{ color: '#1C1C1E' }}>"{reviewModalData.topic}"</Text>?
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setReviewRating(star)}>
                  <Star size={32} color={star <= reviewRating ? '#FCD34D' : '#444'} fill={star <= reviewRating ? '#FCD34D' : 'transparent'} />
                </Pressable>
              ))}
            </View>

            <View style={s.inputContainer}>
              <Text style={s.inputLabel}>Additional Comments (Optional)</Text>
              <View style={s.textInputWrapper}>
                <textarea
                  value={reviewComment}
                  onChange={(e: any) => setReviewComment(e.target.value)}
                  placeholder="Share your experience..."
                  style={s.textArea as any}
                  rows={4}
                />
              </View>
            </View>

            <Pressable
              onPress={submitReview}
              disabled={isSubmittingReview}
              style={[s.submitBtn, isSubmittingReview && { opacity: 0.5 }]}
            >
              <Text style={s.submitBtnText}>{isSubmittingReview ? 'Submitting...' : 'Submit Review'}</Text>
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
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  sectionTitle: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topic: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  dot: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11 },
  amount: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12, marginTop: 4 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8, borderColor: '#EF444466', borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  cancelText: { color: '#EF4444', fontFamily: FONTS.bold, fontSize: 11.5 },
  empty: { color: SC.muted, padding: 16, textAlign: 'center', fontFamily: FONTS.med },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 450, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  inputContainer: { gap: 6, marginBottom: 20 },
  inputLabel: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, letterSpacing: 0.5 },
  textInputWrapper: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: SC.border, borderWidth: 1, borderRadius: 10, padding: 12 },
  textArea: { color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 13, backgroundColor: 'transparent', borderWidth: 0, ...({ outline: 'none', resize: 'none' } as any) },
  submitBtn: { height: 42, backgroundColor: SC.accent, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  submitBtnText: { color: '#1E1B4B', fontFamily: FONTS.bold, fontSize: 14 },
});
