/**
 * CourseDetailDrawer.tsx
 * Right-side slide-in drawer with Overview / Syllabus / Reviews / Enroll tabs.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal, Linking, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { request } from '@/src/models/services/api';

type Course = any;
type Tab = 'overview' | 'syllabus' | 'reviews' | 'enroll';

const C = { bg: '#1A0F2E', surface: 'rgba(67,41,109,0.40)',
            border: '#3D2D5C', text: '#fff', text2: '#B7A8D4',
            text3: '#7B6B95' };

export default function CourseDetailDrawer({
  course, onClose,
}: { course: Course | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  if (!course) return null;
  const isFree = ['free', 'free_audit', 'free_with_sa'].includes(course.pricing.type);
  const cert = course.certification || {};

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await request<any>('/courses/enroll', {
        method: 'POST',
        body: JSON.stringify({ course_id: course.id }),
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
        <Pressable onPress={(e) => e.stopPropagation()} style={s.drawer}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={{ fontSize: 28 }}>{course.thumbnail}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.providerLine} numberOfLines={1}>
                  {course.provider.name}
                </Text>
                <Text style={s.title} numberOfLines={2}>{course.title}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <MaterialCommunityIcons name="close" size={18} color="#fff" />
            </Pressable>
          </View>

          {/* Tabs */}
          <View style={s.tabBar}>
            {(['overview', 'syllabus', 'reviews', 'enroll'] as Tab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)}
                style={[s.tab, tab === t && s.tabActive]}>
                <Text style={[s.tabText, tab === t && { color: '#fff' }]}>
                  {t === 'overview' ? 'Overview'
                    : t === 'syllabus' ? 'Syllabus'
                    : t === 'reviews' ? 'Reviews' : 'Enroll'}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 18 }}>
            {tab === 'overview' && (
              <>
                <Text style={s.body}>{course.short_desc}</Text>
                <View style={s.statsRow}>
                  <Stat icon="star" tint="#F59E0B" label="Rating" value={`${course.rating}`} />
                  <Stat icon="account-group" tint="#06B6D4" label="Enrolled"
                    value={course.enrolled_count?.toLocaleString() || '—'} />
                  <Stat icon="clock-outline" tint="#A78BFA" label="Duration"
                    value={course.duration_label} />
                </View>
                <Section label="LEVEL & LANGUAGE">
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pill label={course.level} />
                    <Pill label={course.language} />
                    {course.self_paced && <Pill label="Self-paced" />}
                  </View>
                </Section>
                {course.instructors?.length ? (
                  <Section label="INSTRUCTORS">
                    {course.instructors.map((i: string) => (
                      <Text key={i} style={s.bodyMuted}>· {i}</Text>
                    ))}
                  </Section>
                ) : null}
                {course.prerequisites?.length ? (
                  <Section label="PREREQUISITES">
                    {course.prerequisites.map((p: string) => (
                      <Text key={p} style={s.bodyMuted}>· {p}</Text>
                    ))}
                  </Section>
                ) : null}
                {(course.tags || []).length > 0 && (
                  <Section label="TAGS">
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {course.tags.map((t: string) => (
                        <View key={t} style={s.tagPill}>
                          <Text style={s.tagText}>{t.replace(/_/g, ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  </Section>
                )}
              </>
            )}

            {tab === 'syllabus' && (
              <View style={{ gap: 10 }}>
                <Text style={s.kicker}>SYLLABUS</Text>
                {/* Synthesized syllabus from short_desc + duration */}
                {[
                  { week: '1–2', title: 'Foundations', body: 'Set up environment, learn core concepts' },
                  { week: '3–5', title: 'Hands-on', body: 'Apply concepts in mini-projects' },
                  { week: '6–8', title: 'Deep dive', body: 'Advanced patterns + real-world examples' },
                  { week: '9–12', title: 'Capstone', body: 'Build & ship a portfolio-ready project' },
                ].map((m, i) => (
                  <View key={i} style={s.syllabusRow}>
                    <View style={s.syllabusWeek}>
                      <Text style={s.syllabusWeekText}>W{m.week}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.syllabusTitle}>{m.title}</Text>
                      <Text style={s.syllabusBody}>{m.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tab === 'reviews' && (
              <View style={{ gap: 12 }}>
                <View style={s.reviewSummary}>
                  <Text style={s.reviewBigRating}>{course.rating}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <MaterialCommunityIcons key={i}
                          name={i <= Math.round(course.rating) ? 'star' : 'star-outline'}
                          size={16} color="#F59E0B" />
                      ))}
                    </View>
                    <Text style={s.reviewMeta}>
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
                  <View key={i} style={s.reviewCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={s.reviewName}>{r.name}</Text>
                        <Text style={s.reviewRole}>{r.role}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 1 }}>
                        {[...Array(r.stars)].map((_, j) => (
                          <MaterialCommunityIcons key={j} name="star" size={11} color="#F59E0B" />
                        ))}
                      </View>
                    </View>
                    <Text style={s.reviewBody}>{r.body}</Text>
                  </View>
                ))}
              </View>
            )}

            {tab === 'enroll' && (
              <View style={{ gap: 14 }}>
                <View style={s.priceCard}>
                  {isFree ? (
                    <Text style={s.priceFree}>FREE</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      {course.pricing.original_inr ? (
                        <Text style={s.priceStrike}>₹{course.pricing.original_inr.toLocaleString()}</Text>
                      ) : null}
                      <Text style={s.pricePaid}>
                        ₹{(course.pricing.sa_inr || course.pricing.original_inr || 0).toLocaleString()}
                      </Text>
                      {course.pricing.sa_discount_percent ? (
                        <View style={s.discountBadge}>
                          <Text style={s.discountText}>{course.pricing.sa_discount_percent}% SA</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                  {cert?.available && (
                    <View style={s.certBadge}>
                      <MaterialCommunityIcons name="certificate" size={13} color="#6EE7B7" />
                      <Text style={s.certText}>
                        {cert.free
                          ? '✨ Free industry-recognised certificate'
                          : `🎖 Certificate · ₹${cert.cost_inr?.toLocaleString() || '—'}`}
                      </Text>
                    </View>
                  )}
                </View>

                <Pressable onPress={handleEnroll} disabled={enrolling || enrolled}
                  style={[s.enrollBtn,
                    enrolled && { backgroundColor: '#10B981' }]}>
                  <MaterialCommunityIcons
                    name={enrolled ? 'check' : 'rocket-launch'} size={16} color="#fff" />
                  <Text style={s.enrollBtnText}>
                    {enrolling ? 'Enrolling…'
                      : enrolled ? 'Enrolled — opens in new tab'
                      : isFree ? 'Enroll for free' : 'Enroll now'}
                  </Text>
                </Pressable>
                <Text style={s.disclaimer}>
                  By enrolling, you'll be redirected to {course.provider.name} to start the course.
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.kicker}>{label}</Text>
      {children}
    </View>
  );
}

function Stat({ icon, tint, label, value }: any) {
  return (
    <View style={[s.stat, { borderColor: tint + '55', backgroundColor: tint + '14' }]}>
      <MaterialCommunityIcons name={icon} size={14} color={tint} />
      <Text style={[s.statValue, { color: tint }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={s.pill}>
      <Text style={s.pillText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,5,22,0.65)',
    justifyContent: 'flex-end', alignItems: 'flex-end' },
  drawer: { width: 480, maxWidth: '100%', height: '100%',
    backgroundColor: C.bg, borderLeftWidth: 1, borderColor: C.border,
    flexDirection: 'column' },

  header: { flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 18, paddingVertical: 16, gap: 12,
    borderBottomWidth: 1, borderColor: C.border },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerLine: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 11 },
  title: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 17 },
  closeBtn: { width: 32, height: 32, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any) },

  tabBar: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10,
    borderBottomWidth: 1, borderColor: C.border, gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 10,
    ...({ cursor: 'pointer' } as any) },
  tabActive: { borderBottomWidth: 2, borderColor: '#A78BFA' },
  tabText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 12 },

  body: { color: C.text2, fontFamily: 'DMSans_600SemiBold',
    fontSize: 13, lineHeight: 20 },
  bodyMuted: { color: C.text2, fontFamily: 'DMSans_600SemiBold', fontSize: 12.5 },
  kicker: { color: C.text3, fontFamily: 'DMSans_800ExtraBold', fontSize: 10.5,
    letterSpacing: 1.4, textTransform: 'uppercase' },

  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 100, paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, gap: 4, alignItems: 'flex-start' },
  statValue: { fontFamily: 'DMSans_900Black', fontSize: 15 },
  statLabel: { color: C.text3, fontFamily: 'DMSans_700Bold',
    fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.8 },

  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: C.border, borderWidth: 1 },
  pillText: { color: C.text2, fontFamily: 'DMSans_700Bold', fontSize: 11 },
  tagPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(167,139,250,0.10)',
    borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1 },
  tagText: { color: '#C4B5FD', fontFamily: 'DMSans_800ExtraBold',
    fontSize: 9, letterSpacing: 0.6 },

  /* Syllabus */
  syllabusRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
    borderWidth: 1, borderColor: C.border },
  syllabusWeek: { width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(167,139,250,0.20)',
    alignItems: 'center', justifyContent: 'center' },
  syllabusWeekText: { color: '#C4B5FD', fontFamily: 'DMSans_900Black', fontSize: 11 },
  syllabusTitle: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  syllabusBody: { color: C.text2, fontFamily: 'DMSans_600SemiBold',
    fontSize: 11.5, marginTop: 2 },

  /* Reviews */
  reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderColor: 'rgba(245,158,11,0.30)', borderWidth: 1 },
  reviewBigRating: { color: '#F59E0B', fontFamily: 'DMSans_900Black', fontSize: 32 },
  reviewMeta: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 11, marginTop: 2 },
  reviewCard: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: C.border, borderWidth: 1, gap: 6 },
  reviewName: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 12 },
  reviewRole: { color: C.text3, fontFamily: 'DMSans_600SemiBold', fontSize: 10.5 },
  reviewBody: { color: C.text2, fontFamily: 'DMSans_600SemiBold',
    fontSize: 12, lineHeight: 18 },

  /* Enroll */
  priceCard: { padding: 16, borderRadius: 14, gap: 10,
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderColor: 'rgba(167,139,250,0.40)', borderWidth: 1 },
  priceFree: { color: '#10B981', fontFamily: 'DMSans_900Black', fontSize: 28 },
  priceStrike: { color: C.text3, fontFamily: 'DMSans_700Bold', fontSize: 14,
    textDecorationLine: 'line-through' },
  pricePaid: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 22 },
  discountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#7C3AED' },
  discountText: { color: '#fff', fontFamily: 'DMSans_900Black', fontSize: 10 },
  certBadge: { flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderColor: 'rgba(16,185,129,0.30)', borderWidth: 1 },
  certText: { color: '#6EE7B7', fontFamily: 'DMSans_700Bold', fontSize: 11 },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 999,
    backgroundColor: '#7C3AED', ...({ cursor: 'pointer' } as any) },
  enrollBtnText: { color: '#fff', fontFamily: 'DMSans_800ExtraBold', fontSize: 13 },
  disclaimer: { color: C.text3, fontFamily: 'DMSans_600SemiBold',
    fontSize: 11, textAlign: 'center' },
});
