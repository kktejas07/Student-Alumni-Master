/**
 * /tracks/[slug] — Career Track 12-week timeline.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
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
          style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={12} color="#fff" />
          <Text style={s.backBtnText}>All Courses</Text>
        </Pressable>
      }
    >
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#A78BFA" />
          <Text style={s.loadingText}>Loading roadmap…</Text>
        </View>
      ) : !track ? (
        <View style={s.loadingBox}>
          <Text style={s.loadingText}>Track not found</Text>
        </View>
      ) : (
        <>
          {/* Hero */}
          <View style={s.hero}>
            <LinearGradient colors={[track.color, '#A78BFA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill} />
            <View style={s.heroBlur} />
            <Text style={s.heroEmoji}>🎁</Text>
            <Text style={s.heroTitle}>{track.title}</Text>
            <Text style={s.heroSub}>
              {track.duration_weeks} weeks · {track.weekly_commitment} · {totalCourses} curated courses · {track.enrolled_count.toLocaleString('en-IN')} enrolled
            </Text>
            <View style={s.heroFacts}>
              <HeroFact icon="clock-outline" v={`${track.total_hours}h total`} />
              <HeroFact icon="certificate" v={`${track.certificates.length} certificates`} />
              <HeroFact icon="account-group" v={`${track.mentors.length} mentors`} />
            </View>
            <Pressable onPress={handleEnroll} disabled={enrolling || enrolled}
              style={[s.heroCTA, enrolled && { backgroundColor: '#10B981' }]}>
              {enrolling ? <ActivityIndicator color="#fff" size="small" /> :
               enrolled ? (
                 <>
                   <MaterialCommunityIcons name="check-decagram" size={14} color="#fff" />
                   <Text style={s.heroCTAText}>Enrolled · Track Active</Text>
                 </>
               ) : (
                 <>
                   <MaterialCommunityIcons name="rocket-launch" size={14} color="#fff" />
                   <Text style={s.heroCTAText}>Start Track Free</Text>
                 </>
               )}
            </Pressable>
          </View>

          {/* Outcomes */}
          <Section title="WHAT YOU'LL ACHIEVE">
            <View style={s.outcomeGrid}>
              {track.outcomes.map((o, i) => (
                <View key={i} style={s.outcomeCard}>
                  <MaterialCommunityIcons name="check-circle"
                    size={16} color="#86EFAC" />
                  <Text style={s.outcomeText}>{o}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* Prereq + Certs */}
          <Section title="PREREQUISITES & CERTIFICATES EARNED">
            <View style={s.dualGrid}>
              <View style={[s.dualCard, { borderColor: 'rgba(245,158,11,0.40)' }]}>
                <View style={s.dualCardHead}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#FCD34D" />
                  <Text style={s.dualCardLabel}>Prerequisites</Text>
                </View>
                {track.prerequisites.map((p, i) => (
                  <Text key={i} style={s.dualItem}>• {p}</Text>
                ))}
              </View>
              <View style={[s.dualCard, { borderColor: 'rgba(16,185,129,0.40)' }]}>
                <View style={s.dualCardHead}>
                  <MaterialCommunityIcons name="medal" size={14} color="#86EFAC" />
                  <Text style={s.dualCardLabel}>Certificates earned</Text>
                </View>
                {track.certificates.map((c, i) => (
                  <Text key={i} style={s.dualItem}>✨ {c}</Text>
                ))}
              </View>
            </View>
          </Section>

          {/* Timeline */}
          <Section title={`${track.duration_weeks}-WEEK ROADMAP`}>
            <View style={{ gap: 10 }}>
              {track.modules.map((m, idx) => {
                const isOpen = openWeeks[m.week_start];
                const isCurrent = m.week_start === (track.current_week || 1);
                return (
                  <Pressable key={idx}
                    onPress={() => setOpenWeeks((p) => ({
                      ...p, [m.week_start]: !p[m.week_start],
                    }))}
                    style={[s.weekCard,
                      isCurrent && { borderColor: '#A78BFA',
                                      boxShadow: '0 0 24px -8px rgba(167,139,250,0.6)' as any }]}>
                    <View style={s.weekHead}>
                      <View style={[s.weekBadge,
                        isCurrent && { backgroundColor: '#7C3AED' }]}>
                        <Text style={s.weekBadgeText}>
                          W{m.week_start}{m.week_end !== m.week_start ? `-${m.week_end}` : ''}
                        </Text>
                      </View>
                      <Text style={s.weekTitle}>{m.title}</Text>
                      <View style={{ flex: 1 }} />
                      {isCurrent && (
                        <View style={s.currentPill}>
                          <Text style={s.currentPillText}>CURRENT</Text>
                        </View>
                      )}
                      <MaterialCommunityIcons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18} color={C.text2} />
                    </View>
                    {isOpen && (
                      <View style={{ gap: 12, marginTop: 12 }}>
                        {/* Courses */}
                        {m.courses.length > 0 && (
                          <View style={{ gap: 6 }}>
                            <Text style={s.subLabel}>📚 Courses</Text>
                            {m.courses.map((cref, i) => {
                              const c = cref.course;
                              if (!c) return null;
                              return (
                                <View key={i} style={s.miniCourseCard}>
                                  <Text style={{ fontSize: 22 }}>{c.thumbnail}</Text>
                                  <View style={{ flex: 1 }}>
                                    <Text style={s.miniCourseTitle} numberOfLines={1}>
                                      {c.title}
                                    </Text>
                                    <Text style={s.miniCourseMeta} numberOfLines={1}>
                                      {c.provider.name} · {c.duration_label}
                                    </Text>
                                  </View>
                                  <View style={[s.requiredPill,
                                    cref.required && { backgroundColor: 'rgba(124,58,237,0.18)',
                                                        borderColor: 'rgba(167,139,250,0.40)' }]}>
                                    <Text style={[s.requiredPillText,
                                      cref.required && { color: '#C4B5FD' }]}>
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
                          <View style={s.liveCard}>
                            <MaterialCommunityIcons name="video"
                              size={14} color="#22D3EE" />
                            <View style={{ flex: 1 }}>
                              <Text style={s.liveTitle}>
                                {m.live_session.topic}
                              </Text>
                              <Text style={s.liveMeta}>
                                Mentor: {m.live_session.mentor}
                              </Text>
                            </View>
                          </View>
                        )}
                        {/* Project */}
                        {m.project && (
                          <View style={s.projectCard}>
                            <MaterialCommunityIcons name="briefcase-check"
                              size={14} color="#FCD34D" />
                            <View style={{ flex: 1 }}>
                              <Text style={s.projectTitle}>{m.project.title}</Text>
                              <Text style={s.projectMeta}>
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
            <View style={s.mentorRow}>
              {track.mentors.map((m, i) => (
                <View key={i} style={s.mentorCard}>
                  <Text style={s.mentorAvatar}>{m.avatar}</Text>
                  <Text style={s.mentorName}>{m.name}</Text>
                  <Text style={s.mentorRole}>{m.role}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* Capstone */}
          <Section title="CAPSTONE PROJECT">
            <View style={s.capstoneCard}>
              <View style={s.capstoneHead}>
                <MaterialCommunityIcons name="trophy"
                  size={20} color="#FCD34D" />
                <Text style={s.capstoneTitle}>{track.capstone.title}</Text>
              </View>
              <Text style={s.capstoneDesc}>{track.capstone.description}</Text>
              <Text style={s.subLabel}>Deliverables</Text>
              {track.capstone.deliverables.map((d, i) => (
                <Text key={i} style={s.dualItem}>✓ {d}</Text>
              ))}
            </View>
          </Section>

          {/* Advisor */}
          <View style={{ marginTop: 12 }}>
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
    <View style={{ gap: 10 }}>
      <Text style={s.kicker}>{title}</Text>
      {children}
    </View>
  );
}

function HeroFact({ icon, v }: { icon: IconName; v: string }) {
  return (
    <View style={s.heroFact}>
      <MaterialCommunityIcons name={icon} size={11} color="#fff" />
      <Text style={s.heroFactText}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1, ...({ cursor: 'pointer' } as any) },
  backBtnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11 },

  loadingBox: { paddingVertical: 60, alignItems: 'center', gap: 10 },
  loadingText: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  hero: { padding: 24, borderRadius: 22, overflow: 'hidden', gap: 8 },
  heroBlur: { position: 'absolute', top: -50, right: -50,
    width: 220, height: 220, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)' },
  heroEmoji: { fontSize: 36 },
  heroTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 26, marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_500Medium',
    fontSize: 13, lineHeight: 18 },
  heroFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  heroFact: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFactText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  heroCTA: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 7, paddingHorizontal: 18, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.30)', marginTop: 12,
    ...({ cursor: 'pointer' } as any) },
  heroCTAText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },

  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11, letterSpacing: 1.2 },

  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outcomeCard: { flexBasis: '48%', flexGrow: 1, flexDirection: 'row',
    alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderColor: 'rgba(16,185,129,0.30)' },
  outcomeText: { color: '#fff', fontFamily: 'DMSans_700Bold',
    fontSize: 12.5, flex: 1 },

  dualGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dualCard: { flexBasis: '48%', flexGrow: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', gap: 5 },
  dualCardHead: { flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 4 },
  dualCardLabel: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11.5, letterSpacing: 0.5 },
  dualItem: { color: C.text2, fontFamily: 'DMSans_500Medium', fontSize: 12 },

  weekCard: { padding: 14, borderRadius: 12, borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    ...({ cursor: 'pointer' } as any) },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(167,139,250,0.18)' },
  weekBadgeText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10.5, letterSpacing: 0.4 },
  weekTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5 },
  currentPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.16)',
    borderColor: 'rgba(252,211,77,0.50)', borderWidth: 1 },
  currentPillText: { color: '#FCD34D', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9, letterSpacing: 0.6 },

  subLabel: { color: C.text3, fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 0.5 },

  miniCourseCard: { flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1 },
  miniCourseTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  miniCourseMeta: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 10.5, marginTop: 2 },
  requiredPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: C.border,
    borderWidth: 1 },
  requiredPillText: { color: C.text3, fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9, letterSpacing: 0.6 },

  liveCard: { flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 9,
    backgroundColor: 'rgba(34,211,238,0.10)',
    borderColor: 'rgba(34,211,238,0.40)', borderWidth: 1 },
  liveTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  liveMeta: { color: '#A5F3FC', fontFamily: 'DMSans_500Medium',
    fontSize: 11, marginTop: 2 },

  projectCard: { flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 9,
    backgroundColor: 'rgba(252,211,77,0.10)',
    borderColor: 'rgba(252,211,77,0.40)', borderWidth: 1 },
  projectTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  projectMeta: { color: '#FCD34D', fontFamily: 'DMSans_700Bold',
    fontSize: 10.5, marginTop: 2 },

  mentorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mentorCard: { flexBasis: 180, flexGrow: 1, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)' },
  mentorAvatar: { fontSize: 36 },
  mentorName: { color: '#fff', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 13, marginTop: 6 },
  mentorRole: { color: C.text3, fontFamily: 'DMSans_500Medium',
    fontSize: 11, marginTop: 2, textAlign: 'center' },

  capstoneCard: { padding: 16, borderRadius: 14, gap: 6,
    backgroundColor: 'rgba(252,211,77,0.06)',
    borderColor: 'rgba(252,211,77,0.30)', borderWidth: 1 },
  capstoneHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capstoneTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 15 },
  capstoneDesc: { color: C.text2, fontFamily: 'DMSans_500Medium',
    fontSize: 12.5, lineHeight: 18, marginVertical: 4 },
});
