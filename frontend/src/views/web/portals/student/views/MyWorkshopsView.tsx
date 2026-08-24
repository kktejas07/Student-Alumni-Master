/**
 * Student → My Workshops — registered + completed workshops with real-time tracking.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Linking, ActivityIndicator } from 'react-native';
import { GraduationCap, CheckCircle, Award, ExternalLink } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GlassCard } from '../glass';
import { EmptyState } from '../EmptyState';
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
      toast.success('Enrolled', `You're now enrolled in ${title}.`);
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
        <Text className="font-display-bold text-2xl tracking-tight text-primary">My Workshops</Text>
        <Text className="text-muted text-sm mt-1" style={{ fontFamily: FONTS.med }}>{items.length} total · {completed.length} completed · auto-refreshes every 5s</Text>
      </View>

      <Section title={`Ongoing (${ongoing.length})`}>
        {ongoing.map((w, idx) => {
          const currentWeek = w.current_week || 1;
          const pct = w.status === 'registered' ? 0 : Math.max(0, Math.min(100, Math.round((currentWeek / Math.max(1, w.weeks)) * 100)));

          return (
            <GlassCard key={w.id} delay={idx * 30} radius={12} padding={16} style={{ gap: 12 }}>
              <View className="flex-row items-center gap-3">
                <View className="w-[38px] h-[38px] rounded-md bg-purple-soft border border-purple/30 items-center justify-center"><GraduationCap size={18} color={SC.accentBright} /></View>
                <View className="flex-1 min-w-0">
                  <Text className="font-body-bold text-base text-primary" style={{ fontFamily: FONTS.bold }}>{w.title}</Text>
                  <Text className="text-muted text-xs mt-[3px]" style={{ fontFamily: FONTS.med }}>{w.weeks}-week program · ₹{Number(w.fee_inr || 0).toLocaleString()} · enrolled {w.registered_at ? String(w.registered_at).slice(0, 10) : '—'}</Text>
                </View>
                <View className={`px-[9px] py-1 rounded-md border ${w.status === 'registered' ? 'bg-blue-soft border-blue/30' : 'bg-amber-soft border-amber/30'}`}>
                  <Text className={`font-body-bold text-[10.5px] ${w.status === 'registered' ? 'text-blue-light' : 'text-amber-light'}`}>
                    {w.status === 'registered' ? 'Enrolled' : `Week ${currentWeek} of ${w.weeks}`}
                  </Text>
                </View>
              </View>

              <View className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-2.5 mt-1">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="font-body-bold text-xs text-muted">Progress Tracing</Text>
                  <Text className="font-body-bold text-xs text-primary">{pct}% complete</Text>
                </View>

                <View className="h-[6px] bg-white/[0.06] rounded-[3px] overflow-hidden">
                  <View className="h-full bg-indigo-light" style={{ width: `${pct}%` }} />
                </View>

                <View className="flex-row justify-between mt-2.5">
                  <View className="flex-row items-center gap-[5px]">
                    <View className={`w-2 h-2 rounded-full ${w.status !== 'registered' ? 'bg-success shadow-[0_0_6px_#10B981]' : 'bg-white/20'}`} />
                    <Text className={`text-[10.5px] ${w.status !== 'registered' ? 'text-primary font-body-bold' : 'text-muted'}`} style={{ fontFamily: FONTS.med }}>Orientation</Text>
                  </View>
                  <View className="flex-row items-center gap-[5px]">
                    <View className={`w-2 h-2 rounded-full ${w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) ? 'bg-success shadow-[0_0_6px_#10B981]' : 'bg-white/20'}`} />
                    <Text className={`text-[10.5px] ${w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) ? 'text-primary font-body-bold' : 'text-muted'}`} style={{ fontFamily: FONTS.med }}>Mid-term</Text>
                  </View>
                  <View className="flex-row items-center gap-[5px]">
                    <View className={`w-2 h-2 rounded-full ${w.status !== 'registered' && currentWeek >= w.weeks ? 'bg-success shadow-[0_0_6px_#10B981]' : 'bg-white/20'}`} />
                    <Text className={`text-[10.5px] ${w.status !== 'registered' && currentWeek >= w.weeks ? 'text-primary font-body-bold' : 'text-muted'}`} style={{ fontFamily: FONTS.med }}>Final evaluation</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-2 justify-end mt-1">
                {updatingId === w.id ? (
                  <ActivityIndicator size="small" color={SC.accentBright} style={{ paddingVertical: 4 }} />
                ) : w.status === 'registered' ? (
                  <Pressable
                    onPress={() => handleProgress(w.id, 'start')}
                    style={({ hovered }: any) => [{ opacity: hovered ? 0.85 : 1 }]}
                    className="px-3 h-7 rounded-sm bg-purple-soft border border-purple/40 items-center justify-center"
                  >
                    <Text className="font-body-bold text-xs text-primary" style={{ fontFamily: FONTS.bold }}>Start Program</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'advance')}
                      style={({ hovered }: any) => [{ opacity: hovered ? 0.85 : 1 }]}
                      className="px-3 h-7 rounded-sm bg-amber-soft border border-amber/30 items-center justify-center"
                    >
                      <Text className="font-body-bold text-xs text-primary" style={{ fontFamily: FONTS.bold }}>Advance 1 Week</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'complete')}
                      style={({ hovered }: any) => [{ opacity: hovered ? 0.85 : 1 }]}
                      className="px-3 h-7 rounded-sm bg-green-soft border border-success/30 items-center justify-center"
                    >
                      <Text className="font-body-bold text-xs text-primary" style={{ fontFamily: FONTS.bold }}>Simulate Completion</Text>
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

      <Section title={`Completed (${completed.length})`}>
        {completed.map((w, idx) => (
          <GlassCard key={w.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View className="w-[38px] h-[38px] rounded-md bg-green-soft border border-success/30 items-center justify-center">
              <CheckCircle size={18} color="#22C55E" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="font-body-bold text-base text-primary" style={{ fontFamily: FONTS.bold }}>{w.title}</Text>
              <Text className="text-muted text-xs mt-[3px]" style={{ fontFamily: FONTS.med }}>Completed {w.completed_at ? String(w.completed_at).slice(0, 10) : '—'} · {w.weeks} weeks</Text>
            </View>
            {w.certificate_url && (
              <Pressable
                onPress={() => Linking.openURL(w.certificate_url!)}
                style={({ hovered }: any) => [hovered && { backgroundColor: SC.cardH }]}
                className="flex-row items-center gap-[5px] px-[11px] h-[30px] rounded-lg bg-amber-light/10 border border-amber-light/40"
              >
                <Award size={12} color="#FCD34D" />
                <Text className="font-body-bold text-xs text-amber-light" style={{ fontFamily: FONTS.bold }}>Certificate</Text>
                <ExternalLink size={11} color="#FCD34D" />
              </Pressable>
            )}
          </GlassCard>
        ))}
        {completed.length === 0 && <Text className="text-muted p-4 text-center" style={{ fontFamily: FONTS.med }}>No workshops completed yet.</Text>}
      </Section>

      <Section title="Explore Structured Workshops">
        <View style={{ gap: 12 }}>
          {POPULAR_WORKSHOPS.map((item) => {
            const isAlreadyEnrolled = items.some((w) => w.title === item.title);
            return (
              <GlassCard key={item.title} radius={12} padding={16} style={{ gap: 8 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="font-body-bold text-md text-primary" style={{ fontFamily: FONTS.bold }}>{item.title}</Text>
                  <Text className="text-muted text-sm" style={{ fontFamily: FONTS.med }}>{item.weeks} weeks · ₹{item.fee.toLocaleString()}</Text>
                </View>
                <Text className="text-[rgba(255,255,255,0.6)] text-sm leading-[16px] mt-1" style={{ fontFamily: FONTS.med }}>{item.desc}</Text>
                <View className="flex-row justify-end mt-1">
                  {enrollingTitle === item.title ? (
                    <ActivityIndicator size="small" color={SC.accentBright} />
                  ) : isAlreadyEnrolled ? (
                    <View className="px-3 h-7 rounded-sm bg-blue-soft border border-blue/30 items-center justify-center pointer-events-none">
                      <Text className="font-body-bold text-sm text-blue-light" style={{ fontFamily: FONTS.bold }}>✓ Enrolled</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleEnroll(item.title, item.fee, item.weeks)}
                      style={({ hovered }: any) => [{ opacity: hovered ? 0.85 : 1 }]}
                      className="px-3 h-7 rounded-sm bg-purple-soft border border-purple/40 items-center justify-center"
                    >
                      <Text className="font-body-bold text-xs text-primary" style={{ fontFamily: FONTS.bold }}>Quick Enroll</Text>
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
      <Text className="font-body-bold text-xs text-muted uppercase tracking-widest mb-2">{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}
