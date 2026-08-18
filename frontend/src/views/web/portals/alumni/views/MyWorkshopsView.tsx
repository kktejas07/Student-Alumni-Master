/**
 * Alumni → My Workshops — registered + completed workshops with real-time tracking.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Linking, ActivityIndicator } from 'react-native';
import { GraduationCap, CheckCircle, Award, ExternalLink } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GlassCard } from '../../student/glass';
import { usePortalData, postPortal } from '@/src/lib/portalApi';
import { useCurrentUser } from '@/src/lib/useCurrentUser';
import { useToast } from '@/src/views/components';

type WS = {
  id: string; title: string; fee_inr: number; weeks: number; status: string;
  current_week?: number; completed_at?: string; certificate_url?: string; registered_at: string;
};

const POPULAR_WORKSHOPS = [
  { title: "System Design Bootcamp", fee: 2999, weeks: 6, desc: "Master high-scale distributed systems, caching, partitioning, and system design interviews." },
  { title: "Data Structures Crash Course", fee: 1499, weeks: 4, desc: "Deep dive into arrays, linked lists, trees, graphs, and dynamic programming." },
  { title: "Frontend Mastery: React + Next.js", fee: 3499, weeks: 8, desc: "Build highly responsive web applications using modern React, Tailwind, and Next.js." },
  { title: "MLOps Fundamentals", fee: 2499, weeks: 5, desc: "Deploy, monitor, and scale machine learning models in production environments." }
];

export function MyWorkshopsView() {
  const toast = useToast();
  const { email } = useCurrentUser('workshop1@persona.demo');
  const { data, refresh } = usePortalData<{ items: WS[]; count: number }>(
    `/student/my-workshops?email=${encodeURIComponent(email)}`,
    { items: [], count: 0 },
    5_000 // Fast polling (5s) for real-time tracking
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [enrollingTitle, setEnrollingTitle] = useState<string | null>(null);

  const handleProgress = async (id: string, action: 'start' | 'advance' | 'complete') => {
    try {
      setUpdatingId(id);
      await postPortal('/student/workshops/progress', {
        body: { student_email: email, registration_id: id, action },
      });
      refresh();
      toast.success(
        action === 'complete' ? 'Workshop completed' : action === 'start' ? 'Workshop started' : 'Progress updated',
      );
    } catch (e: any) {
      toast.error('Update failed', e?.message || 'Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEnroll = async (title: string, fee: number, weeks: number) => {
    try {
      setEnrollingTitle(title);
      await postPortal('/student/workshops/enroll', {
        body: { student_email: email, workshop_title: title, fee_inr: fee, weeks: weeks },
      });
      refresh();
      toast.success('Enrolled', `You’re now enrolled in ${title}.`);
    } catch (e: any) {
      toast.error('Enrollment failed', e?.message || 'Please try again.');
    } finally {
      setEnrollingTitle(null);
    }
  };

  const items = data?.items || [];
  const completed = items.filter((w) => w.status === 'completed');
  const ongoing = items.filter((w) => w.status !== 'completed');

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Text style={s.h1}>My Workshops</Text>
        <Text style={s.sub}>{items.length} total · {completed.length} completed · auto-refreshes every 5s</Text>
      </View>

      <Section title={`Ongoing (${ongoing.length})`}>
        {ongoing.map((w, idx) => {
          const currentWeek = w.current_week || 1;
          const pct = w.status === 'registered' ? 0 : Math.max(0, Math.min(100, Math.round((currentWeek / Math.max(1, w.weeks)) * 100)));

          return (
            <View key={w.id} style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.iconBox}><GraduationCap size={22} color="#2563EB" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.title}>{w.title}</Text>
                  <Text style={s.meta}>{w.weeks}-week program · ₹{Number(w.fee_inr || 0).toLocaleString()} · enrolled {w.registered_at ? String(w.registered_at).slice(0, 10) : '—'}</Text>
                </View>
                <View style={[s.statusPill, w.status === 'registered' ? s.statusRegistered : s.statusPending]}>
                  <Text style={[s.statusText, { color: w.status === 'registered' ? '#2563EB' : '#D97706' }]}>
                    {w.status === 'registered' ? 'Enrolled' : `Week ${currentWeek} of ${w.weeks}`}
                  </Text>
                </View>
              </View>

              <View style={s.trackingContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={s.trackingLabel}>Progress Tracing</Text>
                  <Text style={s.trackingPct}>{pct}% complete</Text>
                </View>
                <View style={s.progressBarBg}>
                  <View style={[s.progressBarFill, { width: `${pct}%` }]} />
                </View>
                <View style={s.timeline}>
                  <View style={s.timelineStep}>
                    <View style={[s.dot, w.status !== 'registered' && s.dotDone]} />
                    <Text style={[s.stepText, w.status !== 'registered' && s.stepTextDone]}>Orientation</Text>
                  </View>
                  <View style={s.timelineStep}>
                    <View style={[s.dot, w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) && s.dotDone]} />
                    <Text style={[s.stepText, w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) && s.stepTextDone]}>Mid-term</Text>
                  </View>
                  <View style={s.timelineStep}>
                    <View style={[s.dot, w.status !== 'registered' && currentWeek >= w.weeks && s.dotDone]} />
                    <Text style={[s.stepText, w.status !== 'registered' && currentWeek >= w.weeks && s.stepTextDone]}>Final evaluation</Text>
                  </View>
                </View>
              </View>

              <View style={s.actionRow}>
                {updatingId === w.id ? (
                  <ActivityIndicator size="small" color="#2563EB" style={{ paddingVertical: 4 }} />
                ) : w.status === 'registered' ? (
                  <Pressable
                    onPress={() => handleProgress(w.id, 'start')}
                    style={({ hovered }: any) => [s.actionBtn, s.startBtn, hovered && { opacity: 0.85 }]}
                  >
                    <Text style={s.btnText}>Start Program</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'advance')}
                      style={({ hovered }: any) => [s.actionBtn, s.nextBtn, hovered && { opacity: 0.85 }]}
                    >
                      <Text style={s.btnText}>Advance 1 Week</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'complete')}
                      style={({ hovered }: any) => [s.actionBtn, s.completeBtn, hovered && { opacity: 0.85 }]}
                    >
                      <Text style={s.btnText}>Simulate Completion</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        })}
        {ongoing.length === 0 && <Text style={s.empty}>No ongoing workshops.</Text>}
      </Section>

      <Section title={`Completed (${completed.length})`}>
        {completed.map((w, idx) => (
          <View key={w.id} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.30)', borderWidth: 1 }]}>
              <CheckCircle size={22} color="#16A34A" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>{w.title}</Text>
              <Text style={s.meta}>Completed {w.completed_at ? String(w.completed_at).slice(0, 10) : '—'} · {w.weeks} weeks</Text>
            </View>
            {w.certificate_url && (
              <Pressable
                onPress={() => Linking.openURL(w.certificate_url!)}
                style={({ hovered }: any) => [s.certBtn, hovered && { backgroundColor: 'rgba(0,0,0,0.04)' }]}
              >
                <Award size={12} color="#2563EB" />
                <Text style={s.certText}>Certificate</Text>
                <ExternalLink size={11} color="#2563EB" />
              </Pressable>
            )}
          </View>
        ))}
        {completed.length === 0 && <Text style={s.empty}>No workshops completed yet.</Text>}
      </Section>

      <Section title="Explore Structured Workshops">
        <View style={{ gap: 12 }}>
          {POPULAR_WORKSHOPS.map((item) => {
            const isAlreadyEnrolled = items.some((w) => w.title === item.title);
            return (
              <View key={item.title} style={s.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.exploreTitle}>{item.title}</Text>
                  <Text style={s.exploreMeta}>{item.weeks} weeks · ₹{item.fee.toLocaleString()}</Text>
                </View>
                <Text style={s.exploreDesc}>{item.desc}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                  {enrollingTitle === item.title ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : isAlreadyEnrolled ? (
                    <View style={[s.actionBtn, s.statusRegistered, { height: 28, pointerEvents: 'none' }]}>
                      <Text style={[s.btnText, { color: '#2563EB' }]}>✓ Enrolled</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleEnroll(item.title, item.fee, item.weeks)}
                      style={({ hovered }: any) => [s.actionBtn, s.startBtn, hovered && { opacity: 0.85 }]}
                    >
                      <Text style={s.btnText}>Quick Enroll</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Section>
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
  // ── Page header ──────────────────────────────────────────────────────────
  h1: {
    color: '#000',
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  sub: {
    color: 'rgba(0,0,0,0.65)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12.5,
    marginTop: 4,
  },

  // ── Section title ─────────────────────────────────────────────────────────
  sectionTitle: {
    color: 'rgba(0,0,0,0.85)',
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase' as any,
  },

  // ── Card base ─────────────────────────────────────────────────────────────
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderColor: 'rgba(0,0,0,0.12)',
    gap: 12,
  },

  // ── Icon box ──────────────────────────────────────────────────────────────
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.30)',
  },

  // ── Card text ─────────────────────────────────────────────────────────────
  title: {
    color: '#000',
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 14.5,
  },
  meta: {
    color: 'rgba(0,0,0,0.65)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11.5,
    marginTop: 3,
  },

  // ── Status pill ───────────────────────────────────────────────────────────
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.30)',
  },
  statusRegistered: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.30)',
  },
  statusText: { fontFamily: 'DMSans_700Bold', fontSize: 10.5 },

  // ── Certificate button ────────────────────────────────────────────────────
  certBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderColor: 'rgba(37,99,235,0.20)',
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  certText: { color: '#2563EB', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    color: 'rgba(0,0,0,0.55)',
    padding: 18,
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },

  // ── Progress tracking container ───────────────────────────────────────────
  trackingContainer: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderColor: 'rgba(37,99,235,0.30)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  trackingLabel: {
    color: 'rgba(0,0,0,0.85)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11.5,
  },
  trackingPct: {
    color: '#2563EB',
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11.5,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
  },

  // ── Timeline ──────────────────────────────────────────────────────────────
  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.20)',
  },
  dotDone: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  } as any,
  stepText: {
    color: 'rgba(0,0,0,0.55)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
  stepTextDone: {
    color: '#000',
    fontFamily: 'DMSans_700Bold',
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  actionBtn: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  btnText: { color: '#FFFFFF', fontFamily: 'DMSans_800ExtraBold', fontSize: 11.5 },
  startBtn: {
    backgroundColor: '#2563EB',
  },
  nextBtn: {
    backgroundColor: '#D97706',
  },
  completeBtn: {
    backgroundColor: '#059669',
  },

  // ── Explore section ───────────────────────────────────────────────────────
  exploreTitle: {
    color: '#000',
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  exploreMeta: {
    color: 'rgba(0,0,0,0.65)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  exploreDesc: {
    color: 'rgba(0,0,0,0.85)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
});
