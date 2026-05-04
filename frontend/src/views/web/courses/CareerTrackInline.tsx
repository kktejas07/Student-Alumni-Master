/**
 * CareerTrackInline.tsx
 * Renders a 12-week career track roadmap inline inside the courses page.
 * No navigation away — fully embedded.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { request } from '@/src/models/services/api';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  duration_label: string;
  pricing: { type: string };
  provider: { name: string };
}

interface Module {
  week_start: number;
  week_end: number;
  title: string;
  courses: { course_id: string; required: boolean; course?: Course }[];
  live_session?: { topic: string; mentor: string; scheduled_at_offset_days: number };
  project?: { title: string; due_by_week: number };
}

interface Track {
  slug: string;
  title: string;
  duration_weeks: number;
  total_hours: number;
  weekly_commitment: string;
  outcomes: string[];
  prerequisites: string[];
  certificates: string[];
  enrolled_count: number;
  color: string;
  modules: Module[];
  mentors: { name: string; role: string; avatar: string }[];
  capstone: { title: string; description: string; deliverables: string[] };
  current_week?: number;
}

const C = { bg: '#1A0F2E', surface: 'rgba(67,41,109,0.40)',
            border: '#3D2D5C', text: '#fff', text2: '#B7A8D4',
            text3: '#7B6B95' };

export default function CareerTrackInline({
  slug, onBack, onEnrollCourse,
}: {
  slug: string;
  onBack: () => void;
  onEnrollCourse: (c: Course) => void;
}) {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<any | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await request<{ track: Track }>(`/courses/tracks/${slug}`);
      setTrack(r.track);
      setExpandedWeek(r.track.current_week || 1);

      // Check existing enrollment
      try {
        const me = await request<{ enrollments: any[] }>('/courses/my-tracks');
        const my = me.enrollments.find((e) => e.slug === slug);
        if (my) setEnrollment(my);
      } catch {}
    } catch (e: any) {
      console.warn('track load err', e?.message);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const handleEnroll = async () => {
    if (!track) return;
    setEnrolling(true);
    try {
      const r = await request<{ enrollment: any }>(
        `/courses/tracks/${slug}/enroll`, { method: 'POST', body: JSON.stringify({}) });
      setEnrollment(r.enrollment);
    } catch (e: any) {
      console.warn('enroll err', e?.message);
    } finally { setEnrolling(false); }
  };

  const advanceWeek = async () => {
    if (!enrollment || !track) return;
    const next = Math.min((enrollment.current_week || 1) + 1, track.duration_weeks);
    try {
      const r = await request<{ current_week: number; progress_percent: number }>(
        `/courses/tracks/${slug}/progress`,
        { method: 'POST', body: JSON.stringify({ current_week: next }) });
      setEnrollment({ ...enrollment, current_week: r.current_week,
                       progress_percent: r.progress_percent });
      setExpandedWeek(r.current_week);
    } catch (e: any) {
      console.warn('progress err', e?.message);
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#A78BFA" />
        <Text style={s.loadingText}>Loading career track…</Text>
      </View>
    );
  }
  if (!track) {
    return (
      <View style={s.errorBox}>
        <Text style={s.errorText}>Track not found.</Text>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>Back to courses</Text>
        </Pressable>
      </View>
    );
  }

  const currentWeek = enrollment?.current_week || 1;
  const progressPct = enrollment?.progress_percent || 0;
  const accent = track.color || '#7C3AED';

  return (
    <View style={{ gap: 18 }}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={onBack} style={s.backChip}>
          <MaterialCommunityIcons name="arrow-left" size={14} color="#A78BFA" />
          <Text style={s.backChipText}>All courses</Text>
        </Pressable>
        <View style={s.crumb}>
          <Text style={s.crumbText}>Courses</Text>
          <MaterialCommunityIcons name="chevron-right" size={12} color={C.text3} />
          <Text style={s.crumbText}>Career Tracks</Text>
          <MaterialCommunityIcons name="chevron-right" size={12} color={C.text3} />
          <Text style={[s.crumbText, { color: '#fff' }]}>{track.title}</Text>
        </View>
      </View>

      {/* Hero gradient */}
      <View style={s.heroOuter}>
        <LinearGradient
          colors={[accent, '#A78BFA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.heroBlur} />
        <Text style={s.heroEmoji}>🎁</Text>
        <Text style={s.heroTitle}>{track.title}</Text>
        <Text style={s.heroSub}>
          {track.duration_weeks}-week roadmap · {track.weekly_commitment} weekly · {track.enrolled_count.toLocaleString()} learners
        </Text>

        {/* Stats row */}
        <View style={s.heroStats}>
          <HeroStat icon="trophy-outline" label="Outcomes" value={String(track.outcomes.length)} />
          <HeroStat icon="certificate-outline" label="Certificates" value={String(track.certificates.length)} />
          <HeroStat icon="account-group-outline" label="Mentors" value={String(track.mentors.length)} />
          <HeroStat icon="clock-outline" label="Total" value={`${track.total_hours} h`} />
        </View>

        {/* Enrolled progress bar */}
        {enrollment && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progressPct}%` }]} />
            <Text style={s.progressText}>
              Week {currentWeek}/{track.duration_weeks} · {progressPct}% complete
            </Text>
          </View>
        )}

        {/* Sticky enroll CTA */}
        {!enrollment ? (
          <Pressable onPress={handleEnroll} disabled={enrolling}
            style={s.enrollCta}>
            {enrolling
              ? <ActivityIndicator color="#7C3AED" />
              : (<>
                  <MaterialCommunityIcons name="rocket-launch" size={15} color="#7C3AED" />
                  <Text style={s.enrollCtaText}>Start track — Free</Text>
                </>)}
          </Pressable>
        ) : (
          <Pressable onPress={advanceWeek} style={s.enrollCta}>
            <MaterialCommunityIcons name="check-circle-outline" size={15} color="#7C3AED" />
            <Text style={s.enrollCtaText}>
              {currentWeek >= track.duration_weeks
                ? 'Track complete 🎉'
                : `Mark Week ${currentWeek} complete`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Outcomes */}
      <View style={s.card}>
        <Text style={s.kicker}>OUTCOMES</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {track.outcomes.map((o, i) => (
            <View key={i} style={s.outcomeChip}>
              <MaterialCommunityIcons name="check-decagram" size={14} color="#10B981" />
              <Text style={s.outcomeText}>{o}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Mentors strip */}
      <View style={s.card}>
        <Text style={s.kicker}>MENTORS</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {track.mentors.map((m, i) => (
            <View key={i} style={s.mentorChip}>
              <Text style={{ fontSize: 22 }}>{m.avatar}</Text>
              <View>
                <Text style={s.mentorName}>{m.name}</Text>
                <Text style={s.mentorRole}>{m.role}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 12-week roadmap timeline */}
      <View style={s.card}>
        <Text style={s.kicker}>{track.duration_weeks}-WEEK ROADMAP</Text>
        <View style={{ gap: 10 }}>
          {track.modules.map((m, idx) => {
            const completed = enrollment && currentWeek > m.week_end;
            const active = enrollment && currentWeek >= m.week_start && currentWeek <= m.week_end;
            const isExpanded = expandedWeek === m.week_start || active;
            return (
              <View key={idx} style={[s.weekCard,
                  completed && { borderColor: '#10B98155', backgroundColor: '#10B98114' },
                  active && { borderColor: accent + 'AA', backgroundColor: accent + '14',
                              boxShadow: `0 0 24px -6px ${accent}88` as any }]}>
                <Pressable
                  onPress={() => setExpandedWeek(isExpanded ? null : m.week_start)}
                  style={s.weekHeader}>
                  <View style={[s.weekBadge,
                    completed ? { backgroundColor: '#10B981' } :
                    active    ? { backgroundColor: accent }    :
                                 { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
                    {completed
                      ? <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      : <Text style={s.weekBadgeText}>{m.week_start}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.weekTitle}>
                      Week {m.week_start === m.week_end ? m.week_start : `${m.week_start}-${m.week_end}`} · {m.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      {m.courses?.length ? (
                        <Text style={s.weekMeta}>📚 {m.courses.length} course{m.courses.length === 1 ? '' : 's'}</Text>
                      ) : null}
                      {m.live_session ? (
                        <Text style={s.weekMeta}>🎙 Live · {m.live_session.mentor}</Text>
                      ) : null}
                      {m.project ? (
                        <Text style={s.weekMeta}>🚀 Project</Text>
                      ) : null}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16} color={C.text2} />
                </Pressable>

                {isExpanded && (
                  <View style={s.weekBody}>
                    {/* Courses */}
                    {m.courses?.length ? (
                      <View style={{ gap: 6 }}>
                        {m.courses.filter((cr) => cr.course).map((cr) => (
                          <Pressable key={cr.course_id}
                            onPress={() => cr.course && onEnrollCourse(cr.course)}
                            style={s.weekCourseRow}>
                            <Text style={{ fontSize: 22 }}>{cr.course!.thumbnail}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={s.weekCourseTitle} numberOfLines={1}>
                                {cr.course!.title}
                              </Text>
                              <Text style={s.weekCourseMeta}>
                                {cr.course!.provider.name} · {cr.course!.duration_label}
                                {cr.required ? '  ·  Required' : '  ·  Optional'}
                              </Text>
                            </View>
                            <MaterialCommunityIcons name="open-in-new" size={13} color={C.text3} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    {m.live_session && (
                      <View style={s.weekExtra}>
                        <MaterialCommunityIcons name="microphone-outline" size={14} color="#22D3EE" />
                        <Text style={s.weekExtraText}>
                          🎙 {m.live_session.topic} — with {m.live_session.mentor}
                        </Text>
                      </View>
                    )}
                    {m.project && (
                      <View style={s.weekExtra}>
                        <MaterialCommunityIcons name="rocket-launch" size={14} color="#F59E0B" />
                        <Text style={s.weekExtraText}>
                          🚀 Project: {m.project.title} · due Week {m.project.due_by_week}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Capstone */}
      <View style={[s.card, { borderColor: accent + '66', backgroundColor: accent + '0A' }]}>
        <View style={s.capHeader}>
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>CAPSTONE PROJECT</Text>
            <Text style={s.capTitle}>{track.capstone.title}</Text>
          </View>
        </View>
        <Text style={s.capDesc}>{track.capstone.description}</Text>
        <View style={{ gap: 6, marginTop: 8 }}>
          {track.capstone.deliverables.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="check" size={12} color="#10B981" />
              <Text style={s.capDeliverable}>{d}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function HeroStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={s.heroStat}>
      <MaterialCommunityIcons name={icon} size={14} color="#fff" />
      <Text style={s.heroStatValue}>{value}</Text>
      <Text style={s.heroStatLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { padding: 60, alignItems: 'center', gap: 12 },
  loadingText: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  errorBox: { padding: 60, alignItems: 'center', gap: 12 },
  errorText: { color: '#FCA5A5', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  backBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: '#7C3AED', ...({ cursor: 'pointer' } as any) },
  backBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backChip: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.30)',
    ...({ cursor: 'pointer' } as any) },
  backChipText: { color: '#A78BFA', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  crumbText: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  heroOuter: { borderRadius: 22, overflow: 'hidden',
    paddingHorizontal: 24, paddingVertical: 22, position: 'relative', gap: 14,
    minHeight: 200 },
  heroBlur: { position: 'absolute', top: -40, right: -40, width: 220, height: 220,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroEmoji: { fontSize: 28 },
  heroTitle: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 26 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontFamily: 'DMSans_600SemiBold',
    fontSize: 13 },
  heroStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)' },
  heroStatValue: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)',
    fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
  progressBar: { backgroundColor: 'rgba(0,0,0,0.30)', height: 28, borderRadius: 999,
    overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 12 },
  progressFill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,185,129,0.55)' },
  progressText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 11.5,
    zIndex: 1 },
  enrollCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999,
    backgroundColor: '#fff', ...({ cursor: 'pointer' } as any) },
  enrollCtaText: { color: '#7C3AED', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },

  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1,
    borderColor: C.border, padding: 18, gap: 12 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5,
    letterSpacing: 1.4, textTransform: 'uppercase' },

  outcomeChip: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.30)', borderWidth: 1 },
  outcomeText: { color: '#6EE7B7', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  mentorChip: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1 },
  mentorName: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },
  mentorRole: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },

  weekCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 14, gap: 10 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 12,
    ...({ cursor: 'pointer' } as any) },
  weekBadge: { width: 32, height: 32, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center' },
  weekBadgeText: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 12 },
  weekTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5 },
  weekMeta: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  weekBody: { gap: 10, paddingTop: 4 },
  weekCourseRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.20)', ...({ cursor: 'pointer' } as any) },
  weekCourseTitle: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  weekCourseMeta: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  weekExtra: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)' },
  weekExtraText: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  capHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  capTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 15 },
  capDesc: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 12.5,
    lineHeight: 19 },
  capDeliverable: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },
});
