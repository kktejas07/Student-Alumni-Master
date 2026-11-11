/**
 * Student → My Workshops — registered + completed workshops with real-time tracking.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Linking, ActivityIndicator } from 'react-native';
import { GraduationCap, CheckCircle, Award, ExternalLink, Play, FastForward, CheckCheck } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GlassCard } from '../glass';
import { EmptyState } from '../EmptyState';
import { usePortalData, postPortal } from '@/src/lib/portalApi';
import { useCurrentUser } from '@/src/lib/useCurrentUser';
import { useTheme } from '@/src/theme/ThemeContext';
import { useToast } from '@/src/views/components';

type WS = {
  id: string; title: string; fee_inr: number; weeks: number; status: string;
  current_week?: number; completed_at?: string; certificate_url?: string; registered_at: string;
};

type UpcomingWorkshop = {
  event_id: string; title: string; organizer_name?: string; location_city?: string; event_mode?: string;
  event_date_start?: string; price_type?: string; price_amount?: number; currency?: string; registration_url?: string;
};

export function MyWorkshopsView() {
  const { isDark } = useTheme();
  const toast = useToast();
  const { email } = useCurrentUser();
  const { data, refresh } = usePortalData<{ items: WS[]; count: number }>(
    `/student/my-workshops?email=${encodeURIComponent(email)}`,
    { items: [], count: 0 },
    30_000
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Real upcoming workshops from the events aggregator (replaces a hardcoded
  // list of four invented paid workshops with a "Quick Enroll" that took no payment).
  const { data: upcomingRes, loading: upcomingLoading } = usePortalData<{ results: UpcomingWorkshop[] }>(
    '/events/search?event_type=workshop&limit=6', { results: [] }, 0,
  );
  const upcomingWorkshops = upcomingRes?.results || [];

  const handleProgress = async (id: string, action: 'start' | 'advance' | 'complete') => {
    try {
      setUpdatingId(id);
      await postPortal('/student/workshops/progress', {
        body: { student_email: email, registration_id: id, action },
      });
      refresh();
      toast.success(
        action === 'complete' ? 'Workshop completed!' : action === 'start' ? 'Workshop started!' : 'Progress advanced by 1 week!',
      );
    } catch (e: any) {
      toast.error('Update failed', e?.message || 'Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const items = data?.items || [];
  const completed = items.filter((w) => w.status === 'completed');
  const ongoing = items.filter((w) => w.status !== 'completed');

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={[s.h1, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>My Workshops</Text>
        <Text style={[s.sub, { color: isDark ? SC.muted : '#64748B' }]}>
          {items.length} total · {completed.length} completed
        </Text>
      </View>

      <Section title={`Ongoing Programs (${ongoing.length})`} isDark={isDark}>
        {ongoing.map((w, idx) => {
          const currentWeek = w.current_week || 1;
          const pct = w.status === 'registered' ? 0 : Math.max(0, Math.min(100, Math.round((currentWeek / Math.max(1, w.weeks)) * 100)));

          return (
            <GlassCard key={w.id} delay={idx * 30} radius={12} padding={16} style={{ gap: 12 }}>
              {/* Top Meta info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[s.iconBox, { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.08)', borderColor: isDark ? 'rgba(124, 58, 237, 0.35)' : 'rgba(124, 58, 237, 0.25)' }]}>
                  <GraduationCap size={20} color={isDark ? SC.accentBright : '#7C3AED'} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{w.title}</Text>
                  <Text style={[s.meta, { color: isDark ? '#D1D5DB' : '#64748B' }]}>
                    {w.weeks}-week program · ₹{Number(w.fee_inr || 0).toLocaleString()} · enrolled {w.registered_at ? String(w.registered_at).slice(0, 10) : '—'}
                  </Text>
                </View>
                <View style={[s.statusPill, w.status === 'registered' ? (isDark ? s.statusRegisteredDark : s.statusRegisteredLight) : (isDark ? s.statusPendingDark : s.statusPendingLight)]}>
                  <Text style={[s.statusText, { color: w.status === 'registered' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#FBBF24' : '#D97706') }]}>
                    {w.status === 'registered' ? 'Enrolled' : `Week ${currentWeek} of ${w.weeks}`}
                  </Text>
                </View>
              </View>

              {/* Progress and Timeline Tracking */}
              <View style={[s.trackingContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[s.trackingLabel, { color: isDark ? '#E5E7EB' : '#334155' }]}>Progress Tracing</Text>
                  <Text style={[s.trackingPct, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>{pct}% complete</Text>
                </View>

                {/* Progress Bar */}
                <View style={[s.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]}>
                  <View style={[s.progressBarFill, { width: `${pct}%`, backgroundColor: isDark ? SC.accentBright : '#7C3AED' }]} />
                </View>

                {/* Dynamic Milestones Stepper */}
                <View style={s.timeline}>
                  <View style={s.timelineStep}>
                    <View style={[s.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1' }, w.status !== 'registered' && s.dotDone]} />
                    <Text style={[s.stepText, { color: isDark ? '#9CA3AF' : '#64748B' }, w.status !== 'registered' && [s.stepTextDone, { color: isDark ? '#FFFFFF' : '#0F172A' }]]}>Orientation</Text>
                  </View>
                  <View style={s.timelineStep}>
                    <View style={[s.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1' }, w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) && s.dotDone]} />
                    <Text style={[s.stepText, { color: isDark ? '#9CA3AF' : '#64748B' }, w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) && [s.stepTextDone, { color: isDark ? '#FFFFFF' : '#0F172A' }]]}>Mid-term</Text>
                  </View>
                  <View style={s.timelineStep}>
                    <View style={[s.dot, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1' }, w.status !== 'registered' && currentWeek >= w.weeks && s.dotDone]} />
                    <Text style={[s.stepText, { color: isDark ? '#9CA3AF' : '#64748B' }, w.status !== 'registered' && currentWeek >= w.weeks && [s.stepTextDone, { color: isDark ? '#FFFFFF' : '#0F172A' }]]}>Final Evaluation</Text>
                  </View>
                </View>
              </View>

              {/* Simulation Actions */}
              <View style={s.actionRow}>
                {updatingId === w.id ? (
                  <View style={s.loadingBox}>
                    <ActivityIndicator size="small" color={isDark ? SC.accentBright : '#7C3AED'} />
                    <Text style={[s.loadingText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>Updating progress...</Text>
                  </View>
                ) : w.status === 'registered' ? (
                  <Pressable
                    onPress={() => handleProgress(w.id, 'start')}
                    style={({ hovered }: any) => [s.actionBtn, s.startBtn, hovered && { opacity: 0.88, transform: [{ scale: 1.02 }] }]}
                  >
                    <Play size={13} color="#FFFFFF" />
                    <Text style={s.btnTextWhite}>Start Program</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'advance')}
                      style={({ hovered }: any) => [s.actionBtn, s.nextBtn, hovered && { opacity: 0.88, transform: [{ scale: 1.02 }] }]}
                    >
                      <FastForward size={13} color="#FFFFFF" />
                      <Text style={s.btnTextWhite}>Advance 1 Week</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'complete')}
                      style={({ hovered }: any) => [s.actionBtn, s.completeBtn, hovered && { opacity: 0.88, transform: [{ scale: 1.02 }] }]}
                    >
                      <CheckCheck size={14} color="#FFFFFF" />
                      <Text style={s.btnTextWhite}>Simulate Completion</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </GlassCard>
          );
        })}
        {ongoing.length === 0 && (
          <EmptyState
            variant="workshops"
            title="No ongoing workshops"
            body="Enroll in a multi-week program below to deepen a skill — your active workshops will land here."
            compact
          />
        )}
      </Section>

      <Section title={`Completed (${completed.length})`} isDark={isDark}>
        {completed.map((w, idx) => (
          <GlassCard key={w.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.iconBox, { backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.10)', borderColor: isDark ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.30)' }]}>
              <CheckCircle size={20} color="#22C55E" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.title, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{w.title}</Text>
              <Text style={[s.meta, { color: isDark ? '#D1D5DB' : '#64748B' }]}>Completed {w.completed_at ? String(w.completed_at).slice(0, 10) : '—'} · {w.weeks} weeks</Text>
            </View>
            {w.certificate_url && (
              <Pressable
                onPress={() => Linking.openURL(w.certificate_url!)}
                style={({ hovered }: any) => [
                  s.certBtn,
                  isDark ? s.certBtnDark : s.certBtnLight,
                  hovered && { opacity: 0.85, transform: [{ scale: 1.02 }] }
                ]}
              >
                <Award size={13} color={isDark ? '#FCD34D' : '#B45309'} />
                <Text style={[s.certText, { color: isDark ? '#FCD34D' : '#B45309' }]}>Certificate</Text>
                <ExternalLink size={12} color={isDark ? '#FCD34D' : '#B45309'} />
              </Pressable>
            )}
          </GlassCard>
        ))}
        {completed.length === 0 && <Text style={[s.empty, { color: isDark ? SC.muted : '#64748B' }]}>No workshops completed yet.</Text>}
      </Section>

      <Section title="Upcoming Workshops" isDark={isDark}>
        <View style={{ gap: 12 }}>
          {upcomingLoading && <ActivityIndicator size="small" color={isDark ? SC.accentBright : '#7C3AED'} />}
          {!upcomingLoading && upcomingWorkshops.length === 0 && (
            <Text style={[s.empty, { color: isDark ? SC.muted : '#64748B' }]}>No upcoming workshops listed right now. Check the Events tab for hackathons and tech talks.</Text>
          )}
          {upcomingWorkshops.map((ev) => {
            const when = ev.event_date_start ? new Date(ev.event_date_start) : null;
            const whenLabel = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD';
            const price = ev.price_type === 'free' || !ev.price_amount ? 'Free' : `${ev.currency === 'USD' ? '$' : '₹'}${Number(ev.price_amount).toLocaleString()}`;
            return (
              <GlassCard key={ev.event_id} radius={12} padding={16} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[s.exploreTitle, { color: isDark ? '#FFFFFF' : '#0F172A', flex: 1 }]} numberOfLines={1}>{ev.title}</Text>
                  <Text style={[s.exploreMeta, { color: isDark ? '#9CA3AF' : '#64748B' }]}>{whenLabel} · {price}</Text>
                </View>
                <Text style={[s.exploreDesc, { color: isDark ? 'rgba(255,255,255,0.75)' : '#475569' }]}>
                  {[ev.organizer_name, ev.location_city || (ev.event_mode === 'virtual' ? 'Online' : '')].filter(Boolean).join(' · ')}
                </Text>
                {!!ev.registration_url && (
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                    <Pressable
                      onPress={() => Linking.openURL(ev.registration_url!)}
                      style={({ hovered }: any) => [s.actionBtn, s.enrollBtn, hovered && { opacity: 0.88, transform: [{ scale: 1.02 }] }]}
                    >
                      <ExternalLink size={13} color="#FFFFFF" />
                      <Text style={s.btnTextWhite}>Register</Text>
                    </Pressable>
                  </View>
                )}
              </GlassCard>
            );
          })}
        </View>
      </Section>
    </View>
  );
}

function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark?: boolean }) {
  return (
    <View>
      <Text style={[s.sectionTitle, { color: isDark ? SC.muted : '#64748B' }]}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  h1: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  sectionTitle: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 },
  meta: { color: '#D1D5DB', fontFamily: FONTS.med, fontSize: 12, marginTop: 3 },
  
  // Status Badges
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusPendingDark: { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.35)' },
  statusPendingLight: { backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(217,119,6,0.25)' },
  statusRegisteredDark: { backgroundColor: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.35)' },
  statusRegisteredLight: { backgroundColor: 'rgba(37,99,235,0.08)', borderColor: 'rgba(37,99,235,0.25)' },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },

  // Certificates
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.15s ease' } as any) : {}) },
  certBtnDark: { backgroundColor: 'rgba(252,211,77,0.12)', borderColor: 'rgba(252,211,77,0.40)' },
  certBtnLight: { backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(217,119,6,0.30)' },
  certText: { fontFamily: FONTS.bold, fontSize: 12 },
  empty: { color: SC.muted, padding: 16, textAlign: 'center', fontFamily: FONTS.med },

  // Tracking Progress Styles
  trackingContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  trackingLabel: { fontFamily: FONTS.bold, fontSize: 11.5 },
  trackingPct: { fontFamily: FONTS.bold, fontSize: 11.5 },
  progressBarBg: { height: 7, borderRadius: 4, overflow: 'hidden', marginVertical: 4 },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Milestones Timeline Styles
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDone: { backgroundColor: '#10B981', ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 6px #10B981' } as any) : {}) } as any,
  stepText: { fontFamily: FONTS.med, fontSize: 11 },
  stepTextDone: { fontFamily: FONTS.bold },

  // Simulator Buttons Row Styles
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: 6 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  loadingText: { fontFamily: FONTS.med, fontSize: 11.5 },
  actionBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14, 
    height: 32, 
    borderRadius: 7, 
    justifyContent: 'center', 
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.15s ease' } as any) : {}) 
  },
  btnText: { fontFamily: FONTS.bold, fontSize: 11.5 },
  btnTextWhite: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 11.5 },
  
  startBtn: { 
    backgroundColor: '#2563EB', 
    borderColor: '#3B82F6', 
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)' } as any) : {})
  },
  nextBtn: { 
    backgroundColor: '#D97706', 
    borderColor: '#F59E0B', 
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)' } as any) : {})
  },
  completeBtn: { 
    backgroundColor: '#059669', 
    borderColor: '#10B981', 
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)' } as any) : {})
  },
  enrollBtn: {
    backgroundColor: '#7C3AED',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)' } as any) : {})
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    pointerEvents: 'none' as any,
  },
  enrolledBadgeDark: {
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderColor: 'rgba(96,165,250,0.35)',
  },
  enrolledBadgeLight: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.25)',
  },

  // Explore Catalog Styles
  exploreTitle: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14.5 },
  exploreMeta: { fontFamily: FONTS.med, fontSize: 12 },
  exploreDesc: { fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
});


