/**
 * CourseDetailDrawer.tsx
 * Right-side slide-in drawer with Overview / Syllabus / Reviews / Enroll tabs.
 * Theme-aware (light/dark) for crystal clear legibility.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal, Linking, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';
import { useTheme } from '@/src/context/ThemeContext';

type Course = any;
type Tab = 'overview' | 'syllabus' | 'reviews' | 'enroll';

export default function CourseDetailDrawer({
  course, onClose,
}: { course: Course | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const { isDark } = useTheme();

  const colors = {
    bg: isDark ? '#1A0F2E' : '#FFFFFF',
    surface: isDark ? 'rgba(67,41,109,0.40)' : '#F8FAFC',
    border: isDark ? '#3D2D5C' : '#E2E8F0',
    text: isDark ? '#FFFFFF' : '#0F172A',
    text2: isDark ? '#B7A8D4' : '#475569',
    text3: isDark ? '#8E7DAE' : '#64748B',
    card: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
    closeBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    closeIcon: isDark ? '#FFFFFF' : '#334155',
    tabActiveBorder: isDark ? '#60A5FA' : '#2563EB',
    tabActiveText: isDark ? '#FFFFFF' : '#2563EB',
    tagBg: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF',
    tagBorder: isDark ? 'rgba(37,99,235,0.30)' : '#BFDBFE',
    tagText: isDark ? '#93C5FD' : '#1D4ED8',
    pillBg: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    pricePaid: isDark ? '#FFFFFF' : '#0F172A',
    priceCardBg: isDark ? 'rgba(37,99,235,0.10)' : '#EFF6FF',
    priceCardBorder: isDark ? 'rgba(37,99,235,0.40)' : '#BFDBFE',
    certBg: isDark ? 'rgba(16,185,129,0.10)' : '#ECFDF5',
    certBorder: isDark ? 'rgba(16,185,129,0.30)' : '#A7F3D0',
    certText: isDark ? '#6EE7B7' : '#047857',
    reviewSummaryBg: isDark ? 'rgba(245,158,11,0.10)' : '#FFFBEB',
    reviewSummaryBorder: isDark ? 'rgba(245,158,11,0.30)' : '#FDE68A',
  };

  if (!course) return null;
  const isFree = ['free', 'free_audit', 'free_with_sa'].includes(course.pricing?.type);
  const cert = course.certification || {};

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await request<any>('/courses/enroll', {
        method: 'POST',
        body: { course_id: course.id },
      });
      setEnrolled(true);
      // open external URL
      if (course.enroll_url) {
        if (Platform.OS === 'web') window.open(course.enroll_url, '_blank');
        else Linking.openURL(course.enroll_url);
      }
    } catch (e: any) {
      console.warn('enroll err', e?.message);
    } finally { setEnrolling(false); }
  };

  return (
    <Modal visible={!!course} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={s.backdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[s.drawer, { backgroundColor: colors.bg, borderColor: colors.border }]}
        >
          {/* Header */}
          <View style={[s.header, { borderColor: colors.border }]}>
            <View style={s.headerLeft}>
              <Text style={{ fontSize: 28 }}>{course.thumbnail}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.providerLine, { color: colors.text3 }]} numberOfLines={1}>
                  {course.provider?.name}
                </Text>
                <Text style={[s.title, { color: colors.text }]} numberOfLines={2}>{course.title}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.closeBg }]}>
              <MaterialCommunityIcons name="close" size={18} color={colors.closeIcon} />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={[s.tabBar, { borderColor: colors.border }]}>
            {(['overview', 'syllabus', 'reviews', 'enroll'] as Tab[]).map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[s.tab, active && [s.tabActive, { borderColor: colors.tabActiveBorder }]]}
                >
                  <Text
                    style={[
                      s.tabText,
                      { color: active ? colors.tabActiveText : colors.text2 },
                    ]}
                  >
                    {t === 'overview' ? 'Overview'
                      : t === 'syllabus' ? 'Syllabus'
                      : t === 'reviews' ? 'Reviews' : 'Enroll'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 18 }}>
            {tab === 'overview' && (
              <>
                <Text style={[s.body, { color: colors.text2 }]}>{course.short_desc}</Text>
                <View style={s.statsRow}>
                  <Stat isDark={isDark} labelColor={colors.text3} icon="star" tint="#F59E0B" label="Rating" value={`${course.rating}`} />
                  <Stat isDark={isDark} labelColor={colors.text3} icon="account-group" tint="#06B6D4" label="Enrolled"
                    value={course.enrolled_count?.toLocaleString() || '—'} />
                  <Stat isDark={isDark} labelColor={colors.text3} icon="clock-outline" tint="#60A5FA" label="Duration"
                    value={course.duration_label} />
                </View>
                <Section label="LEVEL & LANGUAGE" labelColor={colors.text3}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pill label={course.level} colors={colors} />
                    <Pill label={course.language} colors={colors} />
                    {course.self_paced && <Pill label="Self-paced" colors={colors} />}
                  </View>
                </Section>
                {course.instructors?.length ? (
                  <Section label="INSTRUCTORS" labelColor={colors.text3}>
                    {course.instructors.map((i: string) => (
                      <Text key={i} style={[s.bodyMuted, { color: colors.text2 }]}>· {i}</Text>
                    ))}
                  </Section>
                ) : null}
                {course.prerequisites?.length ? (
                  <Section label="PREREQUISITES" labelColor={colors.text3}>
                    {course.prerequisites.map((p: string) => (
                      <Text key={p} style={[s.bodyMuted, { color: colors.text2 }]}>· {p}</Text>
                    ))}
                  </Section>
                ) : null}
                {(course.tags || []).length > 0 && (
                  <Section label="TAGS" labelColor={colors.text3}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {course.tags.map((t: string) => (
                        <View
                          key={t}
                          style={[
                            s.tagPill,
                            { backgroundColor: colors.tagBg, borderColor: colors.tagBorder },
                          ]}
                        >
                          <Text style={[s.tagText, { color: colors.tagText }]}>{t.replace(/_/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  </Section>
                )}
              </>
            )}

            {tab === 'syllabus' && (
              <View style={{ gap: 10 }}>
                <Text style={[s.kicker, { color: colors.text3 }]}>SYLLABUS</Text>
                {[
                  { week: '1–2', title: 'Foundations', body: 'Set up environment, learn core concepts' },
                  { week: '3–5', title: 'Hands-on', body: 'Apply concepts in mini-projects' },
                  { week: '6–8', title: 'Deep dive', body: 'Advanced patterns + real-world examples' },
                  { week: '9–12', title: 'Capstone', body: 'Build & ship a portfolio-ready project' },
                ].map((m, i) => (
                  <View
                    key={i}
                    style={[
                      s.syllabusRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={s.syllabusWeek}>
                      <Text style={s.syllabusWeekText}>W{m.week}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.syllabusTitle, { color: colors.text }]}>{m.title}</Text>
                      <Text style={[s.syllabusBody, { color: colors.text2 }]}>{m.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tab === 'reviews' && (
              <View style={{ gap: 12 }}>
                <View
                  style={[
                    s.reviewSummary,
                    { backgroundColor: colors.reviewSummaryBg, borderColor: colors.reviewSummaryBorder },
                  ]}
                >
                  <Text style={s.reviewBigRating}>{course.rating}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <MaterialCommunityIcons
                          key={i}
                          name={i <= Math.round(course.rating || 5) ? 'star' : 'star-outline'}
                          size={16}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                    <Text style={[s.reviewMeta, { color: colors.text3 }]}>
                      {course.review_count?.toLocaleString() || 0} reviews
                    </Text>
                  </View>
                </View>
                {[
                  { name: 'Arjun S.', role: 'CSE Student',
                    body: 'Loved the pacing — projects helped consolidate concepts.', stars: 5 },
                  { name: 'Riya K.', role: 'Data Analyst',
                    body: 'Instructors are super clear; built confidence quickly.', stars: 5 },
                  { name: 'Karan M.', role: 'Product Manager',
                    body: 'Great refresher; some sections felt long but worth it.', stars: 4 },
                ].map((r, i) => (
                  <View
                    key={i}
                    style={[
                      s.reviewCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={[s.reviewName, { color: colors.text }]}>{r.name}</Text>
                        <Text style={[s.reviewRole, { color: colors.text3 }]}>{r.role}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 1 }}>
                        {[...Array(r.stars)].map((_, j) => (
                          <MaterialCommunityIcons key={j} name="star" size={11} color="#F59E0B" />
                        ))}
                      </View>
                    </View>
                    <Text style={[s.reviewBody, { color: colors.text2 }]}>{r.body}</Text>
                  </View>
                ))}
              </View>
            )}

            {tab === 'enroll' && (
              <View style={{ gap: 14 }}>
                <View
                  style={[
                    s.priceCard,
                    { backgroundColor: colors.priceCardBg, borderColor: colors.priceCardBorder },
                  ]}
                >
                  {isFree ? (
                    <Text style={s.priceFree}>FREE</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      {course.pricing?.original_inr ? (
                        <Text style={[s.priceStrike, { color: colors.text3 }]}>
                          ₹{course.pricing.original_inr.toLocaleString()}
                        </Text>
                      ) : null}
                      <Text style={[s.pricePaid, { color: colors.pricePaid }]}>
                        ₹{(course.pricing?.sa_inr || course.pricing?.original_inr || 0).toLocaleString()}
                      </Text>
                      {course.pricing?.sa_discount_percent ? (
                        <View style={s.discountBadge}>
                          <Text style={s.discountText}>{course.pricing.sa_discount_percent}% SA</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                  {cert?.available && (
                    <View
                      style={[
                        s.certBadge,
                        { backgroundColor: colors.certBg, borderColor: colors.certBorder },
                      ]}
                    >
                      <MaterialCommunityIcons name="certificate" size={13} color={colors.certText} />
                      <Text style={[s.certText, { color: colors.certText }]}>
                        {cert.free
                          ? ' Free industry-recognised certificate'
                          : ` Certificate · ₹${cert.cost_inr?.toLocaleString() || '—'}`}
                      </Text>
                    </View>
                  )}
                </View>

                <Pressable
                  onPress={handleEnroll}
                  disabled={enrolling || enrolled}
                  style={[
                    s.enrollBtn,
                    enrolled && { backgroundColor: '#10B981' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={enrolled ? 'check' : 'rocket-launch'}
                    size={16}
                    color="#fff"
                  />
                  <Text style={s.enrollBtnText}>
                    {enrolling ? 'Enrolling…'
                      : enrolled ? 'Enrolled — opens in new tab'
                      : isFree ? 'Enroll for free' : 'Enroll now'}
                  </Text>
                </Pressable>
                <Text style={[s.disclaimer, { color: colors.text3 }]}>
                  By enrolling, you'll be redirected to {course.provider?.name} to start the course.
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({ label, labelColor, children }: { label: string; labelColor: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[s.kicker, { color: labelColor }]}>{label}</Text>
      {children}
    </View>
  );
}

function Stat({ isDark, labelColor, icon, tint, label, value }: any) {
  return (
    <View
      style={[
        s.stat,
        {
          borderColor: tint + (isDark ? '55' : '35'),
          backgroundColor: tint + (isDark ? '14' : '10'),
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={14} color={tint} />
      <Text style={[s.statValue, { color: tint }]}>{value}</Text>
      <Text style={[s.statLabel, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function Pill({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={[s.pill, { backgroundColor: colors.pillBg, borderColor: colors.border }]}>
      <Text style={[s.pillText, { color: colors.text2 }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,5,22,0.65)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  drawer: {
    width: 480,
    maxWidth: '100%',
    height: '100%',
    borderLeftWidth: 1,
    flexDirection: 'column',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.25)' as any,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerLine: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  title: { fontFamily: 'DMSans_900Black', fontSize: 17 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderBottomWidth: 1,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...({ cursor: 'pointer' } as any),
  },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },

  body: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, lineHeight: 20 },
  bodyMuted: { fontFamily: 'DMSans_600SemiBold', fontSize: 12.5 },
  kicker: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stat: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  statValue: { fontFamily: 'DMSans_900Black', fontSize: 15 },
  statLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
  },

  /* Syllabus */
  syllabusRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  syllabusWeek: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syllabusWeekText: { color: '#2563EB', fontFamily: 'DMSans_900Black', fontSize: 11 },
  syllabusTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  syllabusBody: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11.5,
    marginTop: 2,
  },

  /* Reviews */
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  reviewBigRating: { color: '#F59E0B', fontFamily: 'DMSans_900Black', fontSize: 32 },
  reviewMeta: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, marginTop: 2 },
  reviewCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  reviewName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  reviewRole: { fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  reviewBody: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, lineHeight: 18 },

  /* Enroll */
  priceCard: {
    padding: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
  },
  priceFree: { color: '#10B981', fontFamily: 'DMSans_900Black', fontSize: 28 },
  priceStrike: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  pricePaid: { fontFamily: 'DMSans_900Black', fontSize: 22 },
  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  discountText: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 10 },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  certText: { fontFamily: 'DMSans_700Bold', fontSize: 11 },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    ...({ cursor: 'pointer' } as any),
  },
  enrollBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  disclaimer: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
});
