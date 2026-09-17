/**
 * CareerTrackInline.tsx
 * Renders a 12-week career track roadmap inline inside the courses page.
 * Theme-aware (light/dark) for crystal clear legibility.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { request } from '@/src/models/services/api';
import { useTheme } from '@/src/context/ThemeContext';

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

  const { isDark } = useTheme();

  const colors = {
    bg: isDark ? '#110C24' : '#F8FAFC',
    card: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? '#B7A8D4' : '#334155',
    text3: isDark ? '#8E7DAE' : '#64748B',
    crumbCurrent: isDark ? '#FFFFFF' : '#0F172A',
    courseRowBg: isDark ? 'rgba(0,0,0,0.25)' : '#F1F5F9',
    weekExtraBg: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
    weekExtraText: isDark ? '#CBD5E1' : '#334155',
    mentorChipBg: isDark ? 'rgba(99, 102, 241, 0.15)' : '#F8FAFC',
    mentorChipBorder: isDark ? 'rgba(99, 102, 241, 0.30)' : '#E2E8F0',
    mentorName: isDark ? '#FFFFFF' : '#0F172A',
    mentorRole: isDark ? '#CBD5E1' : '#64748B',
    outcomeBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
    outcomeBorder: isDark ? 'rgba(16, 185, 129, 0.40)' : '#A7F3D0',
    outcomeText: isDark ? '#34D399' : '#065F46',
    weekCardBg: isDark ? '#1E293B' : '#FFFFFF',
    weekCardBorder: isDark ? '#334155' : '#E2E8F0',
  };

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
        `/courses/tracks/${slug}/enroll`, { method: 'POST', body: {} });
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
        { method: 'POST', body: { current_week: next } });
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
        <ActivityIndicator color="#60A5FA" />
        <Text style={[s.loadingText, { color: colors.text2 }]}>Loading career track…</Text>
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
  const accent = track.color || '#2563EB';

  return (
    <View style={{ gap: 18 }}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={onBack} style={s.backChip}>
          <MaterialCommunityIcons name="arrow-left" size={14} color="#2563EB" />
          <Text style={s.backChipText}>All courses</Text>
        </Pressable>
        <View style={s.crumb}>
          <Text style={[s.crumbText, { color: colors.text3 }]}>Courses</Text>
          <MaterialCommunityIcons name="chevron-right" size={12} color={colors.text3} />
          <Text style={[s.crumbText, { color: colors.text3 }]}>Career Tracks</Text>
          <MaterialCommunityIcons name="chevron-right" size={12} color={colors.text3} />
          <Text style={[s.crumbText, { color: colors.crumbCurrent }]}>{track.title}</Text>
        </View>
      </View>

      {/* Hero gradient */}
      <View style={s.heroOuter}>
        <LinearGradient
          colors={[accent, '#1E40AF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.heroBlur} />
        <Text style={s.heroTitle}>{track.title}</Text>
        <Text style={s.heroSub}>
          {track.duration_weeks}-week roadmap · {track.weekly_commitment} weekly · {track.enrolled_count.toLocaleString()} learners
        </Text>

        {/* Stats row */}
        <View style={s.heroStats}>
          <HeroStat icon="trophy-outline" label="Outcomes" value={String(track.outcomes?.length || 0)} />
          <HeroStat icon="certificate-outline" label="Certificates" value={String(track.certificates?.length || 0)} />
          <HeroStat icon="account-group-outline" label="Mentors" value={String(track.mentors?.length || 0)} />
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
              ? <ActivityIndicator color="#2563EB" />
              : (<>
                  <MaterialCommunityIcons name="rocket-launch" size={15} color="#2563EB" />
                  <Text style={s.enrollCtaText}>Start track — Free</Text>
                </>)}
          </Pressable>
        ) : (
          <Pressable onPress={advanceWeek} style={s.enrollCta}>
            <MaterialCommunityIcons name="check-circle-outline" size={15} color="#2563EB" />
            <Text style={s.enrollCtaText}>
              {currentWeek >= track.duration_weeks
                ? 'Track complete 🎉'
                : `Mark Week ${currentWeek} complete`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Outcomes */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.kicker, { color: colors.text3 }]}>OUTCOMES</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(track.outcomes || []).map((o, i) => (
            <View
              key={i}
              style={[
                s.outcomeChip,
                { backgroundColor: colors.outcomeBg, borderColor: colors.outcomeBorder },
              ]}
            >
              <MaterialCommunityIcons name="check-decagram" size={14} color={colors.outcomeText} />
              <Text style={[s.outcomeText, { color: colors.outcomeText }]}>{o}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Mentors strip */}
      {(track.mentors || []).length > 0 && (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.kicker, { color: colors.text3 }]}>MENTORS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {track.mentors.map((m, i) => (
              <View
                key={i}
                style={[
                  s.mentorChip,
                  { backgroundColor: colors.mentorChipBg, borderColor: colors.mentorChipBorder },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{m.avatar}</Text>
                <View>
                  <Text style={[s.mentorName, { color: colors.mentorName }]}>{m.name}</Text>
                  <Text style={[s.mentorRole, { color: colors.mentorRole }]}>{m.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 12-week roadmap timeline */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.kicker, { color: colors.text3 }]}>{track.duration_weeks}-WEEK ROADMAP</Text>
        <View style={{ gap: 10 }}>
          {(track.modules || []).map((m, idx) => {
            const completed = enrollment && currentWeek > m.week_end;
            const active = enrollment && currentWeek >= m.week_start && currentWeek <= m.week_end;
            const isExpanded = expandedWeek === m.week_start || active;
            return (
              <View
                key={idx}
                style={[
                  s.weekCard,
                  { backgroundColor: colors.weekCardBg, borderColor: colors.weekCardBorder },
                  completed && {
                    borderColor: isDark ? 'rgba(16,185,129,0.40)' : '#A7F3D0',
                    backgroundColor: isDark ? 'rgba(16,185,129,0.10)' : '#ECFDF5',
                  },
                  active && {
                    borderColor: accent,
                    backgroundColor: accent + (isDark ? '18' : '0C'),
                  },
                ]}
              >
                <Pressable
                  onPress={() => setExpandedWeek(isExpanded ? null : m.week_start)}
                  style={s.weekHeader}
                >
                  <View
                    style={[
                      s.weekBadge,
                      completed ? { backgroundColor: '#10B981' } :
                      active    ? { backgroundColor: accent }    :
                                   { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
                    ]}
                  >
                    {completed
                      ? <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      : <Text style={[s.weekBadgeText, { color: active ? '#fff' : (isDark ? '#fff' : '#0F172A') }]}>{m.week_start}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.weekTitle, { color: colors.text }]}>
                      Week {m.week_start === m.week_end ? m.week_start : `${m.week_start}-${m.week_end}`} · {m.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                      {m.courses?.length ? (
                        <Text style={[s.weekMeta, { color: colors.text3 }]}> {m.courses.length} course{m.courses.length === 1 ? '' : 's'}</Text>
                      ) : null}
                      {m.live_session ? (
                        <Text style={[s.weekMeta, { color: colors.text3 }]}> Live · {m.live_session.mentor}</Text>
                      ) : null}
                      {m.project ? (
                        <Text style={[s.weekMeta, { color: colors.text3 }]}> Project</Text>
                      ) : null}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.text2}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={s.weekBody}>
                    {/* Courses */}
                    {m.courses?.length ? (
                      <View style={{ gap: 6 }}>
                        {m.courses.filter((cr) => cr.course).map((cr) => (
                          <Pressable
                            key={cr.course_id}
                            onPress={() => cr.course && onEnrollCourse(cr.course)}
                            style={[s.weekCourseRow, { backgroundColor: colors.courseRowBg }]}
                          >
                            <Text style={{ fontSize: 22 }}>{cr.course!.thumbnail}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.weekCourseTitle, { color: colors.text }]} numberOfLines={1}>
                                {cr.course!.title}
                              </Text>
                              <Text style={[s.weekCourseMeta, { color: colors.text3 }]}>
                                {cr.course!.provider?.name} · {cr.course!.duration_label}
                                {cr.required ? '  ·  Required' : '  ·  Optional'}
                              </Text>
                            </View>
                            <MaterialCommunityIcons name="open-in-new" size={13} color={colors.text3} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    {m.live_session && (
                      <View style={[s.weekExtra, { backgroundColor: colors.weekExtraBg }]}>
                        <MaterialCommunityIcons name="microphone-outline" size={14} color="#22D3EE" />
                        <Text style={[s.weekExtraText, { color: colors.weekExtraText }]}>
                          {m.live_session.topic} — with {m.live_session.mentor}
                        </Text>
                      </View>
                    )}
                    {m.project && (
                      <View style={[s.weekExtra, { backgroundColor: colors.weekExtraBg }]}>
                        <MaterialCommunityIcons name="rocket-launch" size={14} color="#F59E0B" />
                        <Text style={[s.weekExtraText, { color: colors.weekExtraText }]}>
                          Project: {m.project.title} · due Week {m.project.due_by_week}
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
      {track.capstone && (
        <View style={[s.card, { borderColor: accent + '66', backgroundColor: accent + (isDark ? '14' : '0A') }]}>
          <View style={s.capHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.kicker, { color: accent }]}>CAPSTONE PROJECT</Text>
              <Text style={[s.capTitle, { color: colors.text }]}>{track.capstone.title}</Text>
            </View>
          </View>
          <Text style={[s.capDesc, { color: colors.text2 }]}>{track.capstone.description}</Text>
          <View style={{ gap: 6, marginTop: 8 }}>
            {(track.capstone.deliverables || []).map((d, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="check" size={12} color="#10B981" />
                <Text style={[s.capDeliverable, { color: colors.text2 }]}>{d}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function HeroStat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={s.heroStat}>
      <MaterialCommunityIcons name={icon} size={14} color="#FFFFFF" />
      <Text style={s.heroStatValue}>{value}</Text>
      <Text style={s.heroStatLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { padding: 60, alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  errorBox: { padding: 60, alignItems: 'center', gap: 12 },
  errorText: { color: '#EF4444', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    ...({ cursor: 'pointer' } as any),
  },
  backBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    ...({ cursor: 'pointer' } as any),
  },
  backChipText: { color: '#2563EB', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  crumbText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  heroOuter: {
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 22,
    position: 'relative',
    gap: 14,
    minHeight: 200,
    boxShadow: '0 8px 24px rgba(37,99,235,0.25)' as any,
  },
  heroBlur: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroTitle: { color: '#FFFFFF', fontFamily: 'DMSans_900Black', fontSize: 26 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  heroStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroStatValue: { color: '#FFFFFF', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
  },
  progressBar: {
    backgroundColor: 'rgba(0,0,0,0.30)',
    height: 28,
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  progressFill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,185,129,0.75)' },
  progressText: {
    color: '#fff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11.5,
    zIndex: 1,
  },
  enrollCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#fff',
    ...({ cursor: 'pointer' } as any),
  },
  enrollCtaText: { color: '#2563EB', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  kicker: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  outcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  outcomeText: { fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  mentorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  mentorName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12.5 },
  mentorRole: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },

  weekCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...({ cursor: 'pointer' } as any),
  },
  weekBadge: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBadgeText: { fontFamily: 'DMSans_900Black', fontSize: 12 },
  weekTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 13.5 },
  weekMeta: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  weekBody: { gap: 10, paddingTop: 4 },
  weekCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    ...({ cursor: 'pointer' } as any),
  },
  weekCourseTitle: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  weekCourseMeta: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  weekExtra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weekExtraText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },

  capHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  capTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15 },
  capDesc: { fontFamily: 'DMSans_600SemiBold', fontSize: 12.5, lineHeight: 19 },
  capDeliverable: { fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },
});
