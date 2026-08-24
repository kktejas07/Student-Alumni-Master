/**
 * /tracks/[slug] — Career Track 12-week timeline.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator, Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FeaturePageShell from '@/src/views/web/FeaturePageShell';
import AdvisorAIBlock from '@/src/views/web/AdvisorAIBlock';
import { request } from '@/src/models/services/api';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type CourseRef = { course_id: string; required: boolean; course?: any };
type Module = {
  week_start: number; week_end: number; title: string;
  courses: CourseRef[]; project?: any; live_session?: any;
};
type Track = {
  slug: string; title: string; duration_weeks: number; total_hours: number;
  weekly_commitment: string; outcomes: string[]; prerequisites: string[];
  certificates: string[]; enrolled_count: number; color: string;
  modules: Module[];
  mentors: { name: string; role: string; avatar: string }[];
  capstone: { title: string; description: string; deliverables: string[] };
  current_week?: number;
};

const C = {
  text: '#fff', text2: 'rgba(255,255,255,0.72)', text3: 'rgba(255,255,255,0.46)',
  border: 'rgba(255,255,255,0.10)',
};

export default function TrackDetail() {
  const params = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const slug = (params.slug as string) || 'ai-career-track';

  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<any>(`/courses/tracks/${slug}`);
      setTrack(r.track);
      const cw = r.track?.current_week || 1;
      setOpenWeeks({ [cw]: true });
    } catch (e: any) {
      console.warn('track load err', e?.message);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const handleEnroll = async () => {
    if (enrolling) return;
    setEnrolling(true);
    try {
      await request<any>(`/courses/tracks/${slug}/enroll`, { method: 'POST' });
      setEnrolled(true);
    } catch (e: any) {
      console.warn(e?.message);
    } finally { setEnrolling(false); }
  };

  const totalCourses = (track?.modules || []).reduce(
    (acc, m) => acc + (m.courses?.length || 0), 0);

  return (
    <FeaturePageShell
      title="Career Track"
      subtitle={track ? `${track.title} · ${track.duration_weeks}-week roadmap`
                       : 'Loading career track…'}
      heroEmoji="🚀"
      accent={track?.color || '#7C3AED'}
      rightSlot={
        <Pressable onPress={() => router.push('/courses' as any)}
          className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-glass-border">
          <MaterialCommunityIcons name="arrow-left" size={12} color="#fff" />
          <Text className="text-white text-xs font-body-bold">All Courses</Text>
        </Pressable>
      }
    >
      {loading ? (
        <View className="py-16 items-center gap-2.5">
          <ActivityIndicator color="#A78BFA" />
          <Text className="text-muted text-xs font-body-semibold">Loading roadmap…</Text>
        </View>
      ) : !track ? (
        <View className="py-16 items-center gap-2.5">
          <Text className="text-muted text-xs font-body-semibold">Track not found</Text>
        </View>
      ) : (
        <>
          {/* Hero */}
          <View className="p-6 rounded-[22px] overflow-hidden gap-2">
            <LinearGradient colors={[track.color, '#A78BFA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
            <View className="absolute -top-[50px] -right-[50px] w-[220px] h-[220px] rounded-full bg-white/18" />
            <Text className="text-4xl">🎁</Text>
            <Text className="text-white font-display-bold text-2xl mt-2">{track.title}</Text>
            <Text className="text-white/85 font-body-semibold text-sm" style={{ lineHeight: 18 }}>
              {track.duration_weeks} weeks · {track.weekly_commitment} · {totalCourses} curated courses · {track.enrolled_count.toLocaleString('en-IN')} enrolled
            </Text>
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              <HeroFact icon="clock-outline" v={`${track.total_hours}h total`} />
              <HeroFact icon="certificate" v={`${track.certificates.length} certificates`} />
              <HeroFact icon="account-group" v={`${track.mentors.length} mentors`} />
            </View>
            <Pressable onPress={handleEnroll} disabled={enrolling || enrolled}
              className="flex-row items-center self-start gap-1.5 px-4 h-11 rounded-xl bg-black/30 mt-3" style={enrolled ? { backgroundColor: '#10B981' } : {}}>
              {enrolling ? <ActivityIndicator color="#fff" size="small" /> :
               enrolled ? (
                 <>
                   <MaterialCommunityIcons name="check-decagram" size={14} color="#fff" />
                   <Text className="text-white font-display-bold text-sm">Enrolled · Track Active</Text>
                 </>
               ) : (
                 <>
                   <MaterialCommunityIcons name="rocket-launch" size={14} color="#fff" />
                   <Text className="text-white font-display-bold text-sm">Start Track Free</Text>
                 </>
               )}
            </Pressable>
          </View>

          {/* Outcomes */}
          <Section title="WHAT YOU'LL ACHIEVE">
            <View className="flex-row flex-wrap gap-2.5">
              {track.outcomes.map((o, i) => (
                <View key={i} className="flex-1 min-w-[48%] flex-row items-center gap-2 p-3 rounded-xl border bg-teal/5 border-teal/30">
                  <MaterialCommunityIcons name="check-circle"
                    size={16} color="#86EFAC" />
                  <Text className="text-white font-body-bold text-sm flex-1">{o}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* Prereq + Certs */}
          <Section title="PREREQUISITES & CERTIFICATES EARNED">
            <View className="flex-row flex-wrap gap-2.5">
              <View className="flex-1 min-w-[48%] p-3.5 rounded-xl border bg-white/3 gap-1" style={{ borderColor: 'rgba(245,158,11,0.40)' }}>
                <View className="flex-row items-center gap-1.5 mb-1">
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#FCD34D" />
                  <Text className="text-white font-display-bold text-xs" style={{ letterSpacing: 0.5 }}>Prerequisites</Text>
                </View>
                {track.prerequisites.map((p, i) => (
                  <Text key={i} className="text-muted font-body-semibold text-xs">• {p}</Text>
                ))}
              </View>
              <View className="flex-1 min-w-[48%] p-3.5 rounded-xl border bg-white/3 gap-1" style={{ borderColor: 'rgba(16,185,129,0.40)' }}>
                <View className="flex-row items-center gap-1.5 mb-1">
                  <MaterialCommunityIcons name="medal" size={14} color="#86EFAC" />
                  <Text className="text-white font-display-bold text-xs" style={{ letterSpacing: 0.5 }}>Certificates earned</Text>
                </View>
                {track.certificates.map((c, i) => (
                  <Text key={i} className="text-muted font-body-semibold text-xs">✨ {c}</Text>
                ))}
              </View>
            </View>
          </Section>

          {/* Timeline */}
          <Section title={`${track.duration_weeks}-WEEK ROADMAP`}>
            <View className="gap-2.5">
              {track.modules.map((m, idx) => {
                const isOpen = openWeeks[m.week_start];
                const isCurrent = m.week_start === (track.current_week || 1);
                return (
                  <Pressable key={idx}
                    onPress={() => setOpenWeeks((p) => ({
                      ...p, [m.week_start]: !p[m.week_start],
                    }))}
                    className="p-3.5 rounded-xl border bg-white/3"
                    style={isCurrent ? { borderColor: '#A78BFA', boxShadow: '0 0 24px -8px rgba(167,139,250,0.6)' as any } : { borderColor: C.border }}>
                    <View className="flex-row items-center gap-2.5">
                      <View className={`px-2 py-1 rounded-md ${isCurrent ? 'bg-violet' : ''}`} style={!isCurrent ? { backgroundColor: 'rgba(167,139,250,0.18)' } : {}}>
                        <Text className="text-violet font-display-bold text-xs" style={{ letterSpacing: 0.4 }}>
                          W{m.week_start}{m.week_end !== m.week_start ? `-${m.week_end}` : ''}
                        </Text>
                      </View>
                      <Text className="text-white font-display-bold text-sm">{m.title}</Text>
                      <View className="flex-1" />
                      {isCurrent && (
                        <View className="px-2 py-0.5 rounded-full bg-amber/15 border border-amber/50">
                          <Text className="text-amber font-display-bold text-xs" style={{ letterSpacing: 0.6 }}>CURRENT</Text>
                        </View>
                      )}
                      <MaterialCommunityIcons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18} color={C.text2} />
                    </View>
                    {isOpen && (
                      <View className="gap-3 mt-3">
                        {/* Courses */}
                        {m.courses.length > 0 && (
                          <View className="gap-1.5">
                            <Text className="text-dim font-body-bold text-xs" style={{ letterSpacing: 0.5 }}>📚 Courses</Text>
                            {m.courses.map((cref, i) => {
                              const c = cref.course;
                              if (!c) return null;
                              return (
                                <View key={i} className="flex-row items-center gap-2.5 p-2.5 rounded-lg bg-white/4 border border-glass-border">
                                  <Text className="text-xl">{c.thumbnail}</Text>
                                  <View className="flex-1">
                                    <Text className="text-white font-body-bold text-sm" numberOfLines={1}>
                                      {c.title}
                                    </Text>
                                    <Text className="text-dim font-body-semibold text-xs mt-0.5" numberOfLines={1}>
                                      {c.provider.name} · {c.duration_label}
                                    </Text>
                                  </View>
                                  <View className={`px-1.5 py-0.5 rounded-sm ${cref.required ? 'bg-violet/18 border-violet/40' : 'bg-white/4 border-glass-border'}`} style={{ borderWidth: 1 }}>
                                    <Text className={`text-xs font-display-bold ${cref.required ? 'text-violet' : 'text-dim'}`} style={{ letterSpacing: 0.6 }}>
                                      {cref.required ? 'REQUIRED' : 'OPTIONAL'}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                        {/* Live Session */}
                        {m.live_session && (
                          <View className="flex-row items-center gap-2.5 p-2.5 rounded-lg bg-teal/10 border border-teal/40">
                            <MaterialCommunityIcons name="video"
                              size={14} color="#22D3EE" />
                            <View className="flex-1">
                              <Text className="text-white font-body-bold text-sm">
                                {m.live_session.topic}
                              </Text>
                              <Text className="text-teal font-body-semibold text-xs mt-0.5">
                                Mentor: {m.live_session.mentor}
                              </Text>
                            </View>
                          </View>
                        )}
                        {/* Project */}
                        {m.project && (
                          <View className="flex-row items-center gap-2.5 p-2.5 rounded-lg bg-amber/10 border border-amber/40">
                            <MaterialCommunityIcons name="briefcase-check"
                              size={14} color="#FCD34D" />
                            <View className="flex-1">
                              <Text className="text-white font-body-bold text-sm">{m.project.title}</Text>
                              <Text className="text-amber font-body-bold text-xs mt-0.5">
                                Due by Week {m.project.due_by_week}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {/* Mentors */}
          <Section title="YOUR MENTORS">
            <View className="flex-row flex-wrap gap-2.5">
              {track.mentors.map((m, i) => (
                <View key={i} className="basis-[180px] flex-grow p-3.5 rounded-xl border border-glass-border items-center bg-white/3">
                  <Text className="text-3xl">{m.avatar}</Text>
                  <Text className="text-white font-display-bold text-sm mt-1.5">{m.name}</Text>
                  <Text className="text-dim font-body-semibold text-xs mt-0.5 text-center">{m.role}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* Capstone */}
          <Section title="CAPSTONE PROJECT">
            <View className="p-4 rounded-xl gap-1.5 bg-amber/5 border border-amber/30">
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="trophy"
                  size={20} color="#FCD34D" />
                <Text className="text-white font-display-bold text-base">{track.capstone.title}</Text>
              </View>
              <Text className="text-muted font-body-semibold text-sm mt-1" style={{ lineHeight: 18, marginVertical: 4 }}>{track.capstone.description}</Text>
              <Text className="text-dim font-body-bold text-xs" style={{ letterSpacing: 0.5 }}>Deliverables</Text>
              {track.capstone.deliverables.map((d, i) => (
                <Text key={i} className="text-muted font-body-semibold text-xs">✓ {d}</Text>
              ))}
            </View>
          </Section>

          {/* Advisor */}
          <View className="mt-3">
            <AdvisorAIBlock
              context={`career-track-${slug}`}
              advisorTitle="Talk to a Track Mentor"
              advisorDesc="Get a free 15-minute call with an SA mentor to plan your start."
              aiTitle="Ask the Track AI"
              aiDesc="Stuck on a course or quiz? Ask the AI for instant help."
              advisorAccent={track.color}
              aiAccent="#10B981"
              advisorIcon="account-tie-voice"
              aiIcon="brain"
            />
          </View>
        </>
      )}
    </FeaturePageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2.5">
      <Text className="text-dim font-display-bold text-xs" style={{ letterSpacing: 1.2 }}>{title}</Text>
      {children}
    </View>
  );
}

function HeroFact({ icon, v }: { icon: IconName; v: string }) {
  return (
    <View className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/18">
      <MaterialCommunityIcons name={icon} size={11} color="#fff" />
      <Text className="text-white font-body-bold text-xs">{v}</Text>
    </View>
  );
}
