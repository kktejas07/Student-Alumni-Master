/**
 * Alumni → My Workshops — registered + completed workshops with real-time tracking.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Linking, ActivityIndicator } from 'react-native';
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
    5_000
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
    <View className="gap-5">
      <View>
        <Text className="text-white font-display-bold text-[22px] tracking-tight">My Workshops</Text>
        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 }}>{items.length} total · {completed.length} completed · auto-refreshes every 5s</Text>
      </View>

      <Section title={`Ongoing (${ongoing.length})`}>
        {ongoing.map((w, idx) => {
          const currentWeek = w.current_week || 1;
          const pct = w.status === 'registered' ? 0 : Math.max(0, Math.min(100, Math.round((currentWeek / Math.max(1, w.weeks)) * 100)));

          return (
            <GlassCard key={w.id} delay={idx * 30} radius={12} padding={16} style={{ gap: 12 }}>
              <View className="flex-row items-center gap-3">
                <View className="w-[38px] h-[38px] rounded-[10px] bg-glass-soft border border-glass-border items-center justify-center">
                  <GraduationCap size={18} color={SC.accentBright} />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-white font-body-bold text-[13.5px]">{w.title}</Text>
                  <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 }}>{w.weeks}-week program · ₹{Number(w.fee_inr || 0).toLocaleString()} · enrolled {w.registered_at ? String(w.registered_at).slice(0, 10) : '—'}</Text>
                </View>
                <View style={[{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 }, w.status === 'registered' ? { backgroundColor: 'rgba(96,165,250,0.10)', borderColor: 'rgba(96,165,250,0.30)' } : { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.30)' }]}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 10.5, color: w.status === 'registered' ? '#60A5FA' : '#FBBF24' }}>
                    {w.status === 'registered' ? 'Enrolled' : `Week ${currentWeek} of ${w.weeks}`}
                  </Text>
                </View>
              </View>

              <View className="bg-glass-soft border border-glass-border rounded-lg p-2.5 mt-1">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>Progress Tracing</Text>
                  <Text className="text-white font-body-bold text-[11px]">{pct}% complete</Text>
                </View>
                <View className="h-1.5 bg-white/5 rounded-[3px] overflow-hidden">
                  <View className="h-full rounded-[3px]" style={{ width: `${pct}%`, backgroundColor: SC.accentBright }} />
                </View>
                <View className="flex-row justify-between mt-2.5">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: w.status !== 'registered' ? '#10B981' : 'rgba(255,255,255,0.2)', ...(w.status !== 'registered' && Platform.OS === 'web' ? { boxShadow: '0 0 6px #10B981' } : {}) }} />
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: w.status !== 'registered' ? '#fff' : SC.muted, ...(w.status !== 'registered' ? { fontFamily: FONTS.bold } : {}) }}>Orientation</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) ? '#10B981' : 'rgba(255,255,255,0.2)', ...(w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) && Platform.OS === 'web' ? { boxShadow: '0 0 6px #10B981' } : {}) }} />
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) ? '#fff' : SC.muted, ...(w.status !== 'registered' && currentWeek >= Math.ceil(w.weeks / 2) ? { fontFamily: FONTS.bold } : {}) }}>Mid-term</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: w.status !== 'registered' && currentWeek >= w.weeks ? '#10B981' : 'rgba(255,255,255,0.2)', ...(w.status !== 'registered' && currentWeek >= w.weeks && Platform.OS === 'web' ? { boxShadow: '0 0 6px #10B981' } : {}) }} />
                    <Text style={{ fontFamily: FONTS.med, fontSize: 10.5, color: w.status !== 'registered' && currentWeek >= w.weeks ? '#fff' : SC.muted, ...(w.status !== 'registered' && currentWeek >= w.weeks ? { fontFamily: FONTS.bold } : {}) }}>Final evaluation</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-2 justify-end mt-1">
                {updatingId === w.id ? (
                  <ActivityIndicator size="small" color={SC.accentBright} className="py-1" />
                ) : w.status === 'registered' ? (
                  <Pressable
                    onPress={() => handleProgress(w.id, 'start')}
                    style={({ hovered }: any) => [{ paddingHorizontal: 12, height: 28, borderRadius: 6, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(167,139,250,0.2)', borderColor: 'rgba(167,139,250,0.4)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }, hovered && { opacity: 0.85 }]}
                  >
                    <Text className="text-white font-body-bold text-[11.5px]">Start Program</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'advance')}
                      style={({ hovered }: any) => [{ paddingHorizontal: 12, height: 28, borderRadius: 6, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }, hovered && { opacity: 0.85 }]}
                    >
                      <Text className="text-white font-body-bold text-[11.5px]">Advance 1 Week</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleProgress(w.id, 'complete')}
                      style={({ hovered }: any) => [{ paddingHorizontal: 12, height: 28, borderRadius: 6, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }, hovered && { opacity: 0.85 }]}
                    >
                      <Text className="text-white font-body-bold text-[11.5px]">Simulate Completion</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </GlassCard>
          );
        })}
        {ongoing.length === 0 && <Text style={{ color: SC.muted, padding: 16, textAlign: 'center', fontFamily: FONTS.med }}>No ongoing workshops.</Text>}
      </Section>

      <Section title={`Completed (${completed.length})`}>
        {completed.map((w, idx) => (
          <GlassCard key={w.id} delay={idx * 30} radius={12} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View className="w-[38px] h-[38px] rounded-[10px] items-center justify-center border" style={{ backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.30)' }}>
              <CheckCircle size={18} color="#22C55E" />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-white font-body-bold text-[13.5px]">{w.title}</Text>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 3 }}>Completed {w.completed_at ? String(w.completed_at).slice(0, 10) : '—'} · {w.weeks} weeks</Text>
            </View>
            {w.certificate_url && (
              <Pressable
                onPress={() => Linking.openURL(w.certificate_url!)}
                style={({ hovered }: any) => [{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, paddingHorizontal: 11, height: 30, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }, hovered && { backgroundColor: SC.cardH }]}
              >
                <Award size={12} color="#FCD34D" />
                <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11.5 }}>Certificate</Text>
                <ExternalLink size={11} color="#FCD34D" />
              </Pressable>
            )}
          </GlassCard>
        ))}
        {completed.length === 0 && <Text style={{ color: SC.muted, padding: 16, textAlign: 'center', fontFamily: FONTS.med }}>No workshops completed yet.</Text>}
      </Section>

      <Section title="Explore Structured Workshops">
        <View className="gap-3">
          {POPULAR_WORKSHOPS.map((item) => {
            const isAlreadyEnrolled = items.some((w) => w.title === item.title);
            return (
              <GlassCard key={item.title} radius={12} padding={16} style={{ gap: 8 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-white font-body-bold text-sm">{item.title}</Text>
                  <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12 }}>{item.weeks} weeks · ₹{item.fee.toLocaleString()}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 12, lineHeight: 16, marginTop: 4 }}>{item.desc}</Text>
                <View className="flex-row justify-end mt-1">
                  {enrollingTitle === item.title ? (
                    <ActivityIndicator size="small" color={SC.accentBright} />
                  ) : isAlreadyEnrolled ? (
                    <View style={[{ paddingHorizontal: 12, height: 28, borderRadius: 6, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(96,165,250,0.10)', borderColor: 'rgba(96,165,250,0.30)', borderWidth: 1, pointerEvents: 'none' as const }]}>
                      <Text style={{ color: '#60A5FA', fontFamily: FONTS.bold, fontSize: 11.5 }}>✓ Enrolled</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleEnroll(item.title, item.fee, item.weeks)}
                      style={({ hovered }: any) => [{ paddingHorizontal: 12, height: 28, borderRadius: 6, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(167,139,250,0.2)', borderColor: 'rgba(167,139,250,0.4)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }, hovered && { opacity: 0.85 }]}
                    >
                      <Text className="text-white font-body-bold text-[11.5px]">Quick Enroll</Text>
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
      <Text style={{ color: SC.muted, fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>{title}</Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}
