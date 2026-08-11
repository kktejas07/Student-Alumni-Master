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
            <GlassCard key={w.id} delay={idx * 30} radius={12} padding={16} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={s.iconBox}><GraduationCap size={18} color={SC.accentBright} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.title}>{w.title}</Text>
                  <Text style={s.meta}>{w.weeks}-week program · ₹{Number(w.fee_inr || 0).toLocaleString()} · enrolled {w.registered_at ? String(w.registered_at).slice(0, 10) : '—'}</Text>
                </View>
                <View style={[s.statusPill, w.status === 'registered' ? s.statusRegistered : s.statusPending]}>
                  <Text style={[s.statusText, { color: w.status === 'registered' ? '#60A5FA' : '#FBBF24' }]}>
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
                  <ActivityIndicator size="small" color={SC.accentBright} style={{ paddingVertical: 4 }} />
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
            </GlassCard>
          );
        })}
        {ongoing.length === 0 && <Text style={s.empty}>No ongoing workshops.</Text>}
      </Section>

      <Section title={`Completed (${completed.length})`}>
        {completed.map((w, idx) => (
          <GlassCard key={w.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)' }]}>
              <CheckCircle size={18} color="#22C55E" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.title}>{w.title}</Text>
              <Text style={s.meta}>Completed {w.completed_at ? String(w.completed_at).slice(0, 10) : '—'} · {w.weeks} weeks</Text>
            </View>
            {w.certificate_url && (
              <Pressable
                onPress={() => Linking.openURL(w.certificate_url!)}
                style={({ hovered }: any) => [s.certBtn, hovered && { backgroundColor: SC.cardH }]}
              >
                <Award size={12} color="#FCD34D" />
                <Text style={s.certText}>Certificate</Text>
                <ExternalLink size={11} color="#FCD34D" />
              </Pressable>
            )}
          </GlassCard>
        ))}
        {completed.length === 0 && <Text style={s.empty}>No workshops completed yet.</Text>}
      </Section>

      <Section title="Explore Structured Workshops">
        <View style={{ gap: 12 }}>
          {POPULAR_WORKSHOPS.map((item) => {
            const isAlreadyEnrolled = items.some((w) => w.title === item.title);
            return (
              <GlassCard key={item.title} radius={12} padding={16} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={s.exploreTitle}>{item.title}</Text>
                  <Text style={s.exploreMeta}>{item.weeks} weeks · ₹{item.fee.toLocaleString()}</Text>
                </View>
                <Text style={s.exploreDesc}>{item.desc}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                  {enrollingTitle === item.title ? (
                    <ActivityIndicator size="small" color={SC.accentBright} />
                  ) : isAlreadyEnrolled ? (
                    <View style={[s.actionBtn, s.statusRegistered, { height: 28, pointerEvents: 'none' }]}>
                      <Text style={[s.btnText, { color: '#60A5FA' }]}>✓ Enrolled</Text>
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
              </GlassCard>
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
  h1: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4 },
  sub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 },
  sectionTitle: { color: SC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 13.5 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusPending: { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.30)' },
  statusRegistered: { backgroundColor: 'rgba(96,165,250,0.10)', borderColor: 'rgba(96,165,250,0.30)' },
  statusText: { fontFamily: FONTS.bold, fontSize: 10.5 },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  certText: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11.5 },
  empty: { color: SC.muted, padding: 16, textAlign: 'center', fontFamily: FONTS.med },

  trackingContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  trackingLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  trackingPct: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 11 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: SC.accentBright },

  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotDone: { backgroundColor: '#10B981', ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 6px #10B981' } as any) : {}) } as any,
  stepText: { color: SC.muted, fontFamily: FONTS.med, fontSize: 10.5 },
  stepTextDone: { color: '#1C1C1E', fontFamily: FONTS.bold },

  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  actionBtn: { paddingHorizontal: 12, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  btnText: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 11.5 },
  startBtn: { backgroundColor: 'rgba(167,139,250,0.2)', borderColor: 'rgba(167,139,250,0.4)', borderWidth: 1 },
  nextBtn: { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)', borderWidth: 1 },
  completeBtn: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1 },

  exploreTitle: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 14 },
  exploreMeta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
  exploreDesc: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 12, lineHeight: 16, marginTop: 4 },
});
