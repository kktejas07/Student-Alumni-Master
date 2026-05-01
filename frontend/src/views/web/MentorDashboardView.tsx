/**
 * MentorDashboardView — exact implementation of the "Mentor Portal — Standalone"
 * HTML spec (dlnzowt9_Mentor Portal - Standalone (1).html).
 *
 * Theme per spec:
 *   • Page BG       : #071412 (near-black teal)
 *   • Sidebar       : #0A1A16 (darker teal)  — rendered by parent
 *   • Primary teal  : #14B8A6 / #5EEAD4
 *   • Amber accent  : #F59E0B / #FCD34D
 *   • Avatar dots   : teal, orange (#F97316), pink (#EC4899)
 *
 * Layout:
 *   ┌────────────────────────────────────────────────┐
 *   │ Top bar (greeting + avatar/bell)                │
 *   │ KPI row (4 cards: 3 teal + 1 amber)             │
 *   │ ┌─ Today's sessions ─┐   ┌─ Featured widget ─┐  │
 *   │ │ colored avatars     │   │ Rating / CTA       │  │
 *   │ └─────────────────────┘   └────────────────────┘ │
 *   │ Student Progress Tracker (full-width, bars)     │
 *   │ Quick Actions row                               │
 *   │ Footer "MENTOR PORTAL · STUDENT ALUMNI"         │
 *   └────────────────────────────────────────────────┘
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing,
  useWindowDimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Calendar, Users, DollarSign, Trophy, Plus, Star,
  BarChart3, ArrowUpRight, ArrowRight, Sparkles, ChevronRight,
} from 'lucide-react-native';

// ─── Tokens (per Mentor Portal spec) ─────────────────────────────────────────
const T = {
  bg: '#071412',
  panel: 'rgba(10,30,26,0.70)',
  glass: 'rgba(20,184,166,0.07)',
  glassBorder: 'rgba(20,184,166,0.18)',
  glassStrong: 'rgba(20,184,166,0.15)',
  glassStrongBorder: 'rgba(20,184,166,0.32)',

  teal: '#14B8A6',
  tealLight: '#5EEAD4',
  tealDeep: '#0F766E',

  amber: '#F59E0B',
  amberLight: '#FCD34D',
  amberGlass: 'rgba(180,83,9,0.22)',
  amberBorder: 'rgba(245,158,11,0.35)',

  orange: '#F97316',
  pink: '#EC4899',
  blue: '#3B82F6',

  white: '#fff',
  text: 'rgba(255,255,255,0.92)',
  text2: 'rgba(255,255,255,0.62)',
  text3: 'rgba(255,255,255,0.38)',
  text4: 'rgba(255,255,255,0.20)',
};

// ─── Data ────────────────────────────────────────────────────────────────────
const STATS = [
  { id: 'sessions', Icon: Calendar, label: 'Sessions Today', value: '3', sub: 'Next at 2:00 PM', glass: T.glassStrong, border: T.glassStrongBorder, color: T.tealLight },
  { id: 'students', Icon: Users, label: 'Total Students', value: '47', sub: '↑ 4 this week', glass: T.glass, border: T.glassBorder, color: T.tealLight, positive: true },
  { id: 'month', Icon: DollarSign, label: 'This Month', value: '₹28.5K', sub: '↑ 12% vs last', glass: T.glass, border: T.glassBorder, color: T.tealLight, positive: true },
  { id: 'rating', Icon: Trophy, label: 'Rating', value: '4.9', valueSuffix: '⭐', sub: '42 reviews', glass: T.amberGlass, border: T.amberBorder, color: T.amberLight },
];

const SESSIONS = [
  { id: 'ak', initials: 'AK', name: 'Aryan Kapoor', topic: 'Web Dev Roadmap', time: '2:00 PM', duration: '45 min', ring: T.teal, ringDeep: T.tealDeep },
  { id: 'sj', initials: 'SJ', name: 'Sneha Joshi', topic: 'Career Counseling', time: '4:30 PM', duration: '30 min', ring: T.orange, ringDeep: '#C2410C' },
  { id: 'rm', initials: 'RM', name: 'Rohit Mehta', topic: 'DSA Interview Prep', time: '6:00 PM', duration: '60 min', ring: T.pink, ringDeep: '#BE185D' },
];

const STUDENTS = [
  { id: 'ak', initials: 'AK', name: 'Aryan Kapoor', path: 'Web Development', next: 'JavaScript Advanced', progress: 65, ring: T.teal, ringDeep: T.tealDeep, sessions: 12 },
  { id: 'sj', initials: 'SJ', name: 'Sneha Joshi', path: 'Career Preparation', next: 'Mock Interview Round 2', progress: 42, ring: T.pink, ringDeep: '#BE185D', sessions: 8 },
  { id: 'rm', initials: 'RM', name: 'Rohit Mehta', path: 'Placements Coaching', next: 'Portfolio Review', progress: 78, ring: T.orange, ringDeep: '#C2410C', sessions: 15 },
];

const QUICK_ACTIONS = [
  { id: 'create-event', Icon: Plus, label: 'Create\nEvent', gradient: ['#14B8A6', '#0F766E'] as const, shadow: 'rgba(20,184,166,0.45)' },
  { id: 'earnings', Icon: DollarSign, label: 'Earnings', gradient: ['#FCD34D', '#D97706'] as const, shadow: 'rgba(252,211,77,0.45)' },
  { id: 'feedback', Icon: Star, label: 'Feedback', gradient: ['#FB923C', '#EA580C'] as const, shadow: 'rgba(251,146,60,0.45)' },
  { id: 'analytics', Icon: BarChart3, label: 'Analytics', gradient: ['#3B82F6', '#1D4ED8'] as const, shadow: 'rgba(59,130,246,0.45)' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  userName?: string;
  notifCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onActionPress?: (id: string) => void;
}

export function MentorDashboardView({
  userName = 'Mentor', notifCount = 2, onOpenNotifications, onOpenProfile, onActionPress,
}: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const isTablet = width >= 768;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  const displayName = userName.startsWith('Dr') ? userName : `Dr. ${userName}`;
  const initials = userName.replace('Dr.', '').trim().split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'M';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.bg }}
      contentContainerStyle={[styles.scrollContent, isTablet && { padding: 28, maxWidth: 1400, alignSelf: 'center', width: '100%' }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fade, transform: [{ translateY }], gap: isTablet ? 22 : 18 }}>

        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={[styles.name, isTablet && { fontSize: 28 }]} numberOfLines={1}>{displayName}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.approvedPill}>
                <Text style={styles.approvedDot}>●</Text>
                <Text style={styles.approvedText}>Approved Mentor</Text>
              </View>
              <Text style={styles.ratingText}>⭐ 4.9 · 42 reviews</Text>
            </View>
          </View>
          <Pressable onPress={onOpenNotifications} testID="mentor-notif-btn"
            style={({ pressed }: any) => [styles.iconBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Bell size={18} color={T.amberLight} />
            {notifCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{notifCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={onOpenProfile} testID="mentor-profile-btn"
            style={({ pressed }: any) => [styles.avatar, pressed && { transform: [{ scale: 0.94 }] }]}>
            <LinearGradient colors={[T.teal, T.tealDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        {/* ── KPI Row ─────────────────────────────────────────────── */}
        <View style={[styles.statGrid, isTablet && { gap: 14 }]}>
          {STATS.map((s) => (
            <Pressable key={s.id} testID={`mentor-stat-${s.id}`}
              style={({ pressed, hovered }: any) => [
                styles.statCard,
                { backgroundColor: s.glass, borderColor: s.border },
                isTablet && styles.statCardWide,
                hovered && { transform: [{ translateY: -2 }], borderColor: s.color },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIconBox, { backgroundColor: s.glass, borderColor: s.border }]}>
                  <s.Icon size={14} color={s.color} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>
                {s.value}{s.valueSuffix ? <Text style={{ fontSize: 18 }}> {s.valueSuffix}</Text> : null}
              </Text>
              <View style={styles.statDeltaRow}>
                {s.positive && <ArrowUpRight size={11} color={T.tealLight} />}
                <Text style={[styles.statDelta, { color: s.positive ? T.tealLight : T.text3 }]}>{s.sub.replace('↑', '').trim()}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── Split: Sessions (left) + Featured Widget (right) ───── */}
        <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
          {/* Today's sessions */}
          <View style={{ flex: 1, gap: 10 }}>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>TODAY'S SESSIONS</Text>
              <Pressable><Text style={styles.linkText}>View all →</Text></Pressable>
            </View>
            <View style={styles.sessionList}>
              {SESSIONS.map((s) => (
                <Pressable key={s.id} testID={`mentor-session-${s.id}`}
                  style={({ pressed, hovered }: any) => [
                    styles.sessionRow,
                    hovered && { backgroundColor: 'rgba(20,184,166,0.10)', borderColor: T.glassStrongBorder, transform: [{ translateY: -1 }] },
                    pressed && { transform: [{ scale: 0.99 }] },
                  ]}>
                  <LinearGradient colors={[s.ring, s.ringDeep] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sessionAvatar}>
                    <Text style={styles.sessionInitials}>{s.initials}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.sessionName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.sessionTopic} numberOfLines={1}>{s.topic}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.sessionTime}>{s.time}</Text>
                    <Text style={styles.sessionDuration}>{s.duration}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Featured widget — Rating card w/ CTA */}
          <View style={isWide ? { width: 320 } : { width: '100%' }}>
            <FeaturedRatingWidget onPress={() => onActionPress?.('feedback')} />
          </View>
        </View>

        {/* ── Student Progress Tracker ──────────────────────────── */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>STUDENT PROGRESS TRACKER</Text>
            <Pressable><Text style={styles.linkText}>View all students →</Text></Pressable>
          </View>
          <View style={styles.studentGrid}>
            {STUDENTS.map((st) => (
              <StudentCard key={st.id} s={st} isTablet={isTablet} />
            ))}
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <View>
          <Text style={styles.section}>QUICK ACTIONS</Text>
          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((q) => (
              <QuickActionTile key={q.id} action={q} onPress={() => onActionPress?.(q.id)} />
            ))}
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MENTOR PORTAL · STUDENT ALUMNI</Text>
        </View>

      </Animated.View>
    </ScrollView>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function FeaturedRatingWidget({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [
      styles.featuredWidget,
      hovered && { transform: [{ translateY: -2 }], borderColor: T.glassStrongBorder },
    ]}>
      <View style={styles.featuredDeco}>
        <Sparkles size={40} color={T.tealLight} style={{ opacity: 0.5 }} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.featuredKicker}>⭐ YOUR RATING</Text>
        <Text style={styles.featuredTitle}>Outstanding!</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <Text style={styles.featuredValue}>4.9</Text>
          <Text style={styles.featuredSub}>/ 5.0 · 42 reviews</Text>
        </View>
        <View style={styles.starsRow}>
          {[...Array(5)].map((_, i) => (
            <Text key={i} style={{ color: T.amberLight, fontSize: 14 }}>★</Text>
          ))}
        </View>
        <Text style={styles.featuredDesc}>Top 3% of all mentors this month. Keep up the great work!</Text>
      </View>
      <Pressable onPress={onPress} style={({ hovered }: any) => [styles.featuredCTA, hovered && { backgroundColor: T.teal }]}>
        <Text style={styles.featuredCTAText}>View Profile</Text>
        <ArrowRight size={12} color={T.white} />
      </Pressable>
    </Pressable>
  );
}

function StudentCard({ s, isTablet }: { s: typeof STUDENTS[number]; isTablet: boolean }) {
  return (
    <Pressable style={({ hovered }: any) => [
      styles.studentCard,
      hovered && { backgroundColor: 'rgba(20,184,166,0.08)', borderColor: T.glassStrongBorder, transform: [{ translateY: -2 }] },
    ]}>
      <View style={styles.studentHead}>
        <LinearGradient colors={[s.ring, s.ringDeep] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.studentAvatar}>
          <Text style={styles.sessionInitials}>{s.initials}</Text>
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
          <Text style={styles.studentPath} numberOfLines={1}>{s.path} · {s.sessions} sessions</Text>
        </View>
        <View style={[styles.progressPct, { backgroundColor: s.ring + '22', borderColor: s.ring + '55' }]}>
          <Text style={[styles.progressPctText, { color: s.ring }]}>{s.progress}%</Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[s.ring, s.ring + 'AA'] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${s.progress}%` }]}
        />
      </View>
      <View style={styles.nextRow}>
        <Text style={styles.nextLabel}>NEXT:</Text>
        <Text style={styles.nextValue} numberOfLines={1}>{s.next}</Text>
        <ChevronRight size={14} color={T.text3} />
      </View>
    </Pressable>
  );
}

function QuickActionTile({ action, onPress }: { action: typeof QUICK_ACTIONS[number]; onPress?: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable onPress={onPress} testID={`mentor-qa-${action.id}`}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 6, tension: 200 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start()}
      style={({ hovered }: any) => [styles.qaTile, hovered && { transform: [{ translateY: -2 }] }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={action.gradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.qaIconWrap,
            Platform.OS === 'web' ? ({ boxShadow: `0 8px 20px -4px ${action.shadow}` } as any) : { elevation: 6 }]}>
          <action.Icon size={22} color={T.white} />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.qaLabel} numberOfLines={2}>{action.label}</Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { padding: 18, paddingBottom: 50 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { color: T.text2, fontFamily: 'DMSans_500Medium', fontSize: 13 },
  name: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.4, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  approvedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: T.glassStrong, borderColor: T.glassStrongBorder, borderWidth: 1 },
  approvedDot: { color: T.tealLight, fontSize: 9 },
  approvedText: { color: T.tealLight, fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.3 },
  ratingText: { color: T.text2, fontFamily: 'DMSans_500Medium', fontSize: 11 },

  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', borderWidth: 2, borderColor: T.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  notifDotText: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 9 },
  avatar: { width: 40, height: 40, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.glassStrongBorder },
  avatarText: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 13.5 },

  // Stats
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: 160, padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  statCardWide: { padding: 18, minWidth: 220 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIconBox: { width: 26, height: 26, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: T.text2, fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.4, flex: 1 },
  statValue: { fontFamily: 'DMSans_700Bold', fontSize: 24, letterSpacing: -0.4 },
  statDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statDelta: { fontFamily: 'DMSans_500Medium', fontSize: 11 },

  // Sections
  section: { color: T.text2, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  linkText: { color: T.tealLight, fontFamily: 'DMSans_700Bold', fontSize: 11.5 },

  // Split
  split: { flexDirection: 'row', gap: 20 },

  // Session rows
  sessionList: { gap: 10 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    backgroundColor: T.glass, borderColor: T.glassBorder, borderWidth: 1, borderRadius: 12,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  sessionAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sessionInitials: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  sessionName: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  sessionTopic: { color: T.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },
  sessionTime: { color: T.tealLight, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  sessionDuration: { color: T.text3, fontFamily: 'DMSans_500Medium', fontSize: 10.5, marginTop: 2 },

  // Featured widget
  featuredWidget: {
    padding: 22, borderRadius: 16, borderWidth: 1,
    backgroundColor: T.glassStrong, borderColor: T.glassBorder,
    gap: 12, overflow: 'hidden', position: 'relative',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 20px 40px -12px rgba(20,184,166,0.25)' } as any) : {}),
  },
  featuredDeco: { position: 'absolute', top: -10, right: -10 },
  featuredKicker: { color: T.amberLight, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1 },
  featuredTitle: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 18, letterSpacing: -0.3 },
  featuredValue: { color: T.amberLight, fontFamily: 'DMSans_700Bold', fontSize: 36, letterSpacing: -0.8 },
  featuredSub: { color: T.text3, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  featuredDesc: { color: T.text2, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17, marginTop: 6 },
  featuredCTA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 10, backgroundColor: T.tealDeep,
    borderColor: T.glassStrongBorder, borderWidth: 1, marginTop: 6,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  featuredCTAText: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 12.5, letterSpacing: 0.3 },

  // Student cards
  studentGrid: { gap: 10 },
  studentCard: {
    padding: 16, borderRadius: 12,
    backgroundColor: T.panel, borderColor: T.glassBorder, borderWidth: 1,
    gap: 12,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  studentHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  studentName: { color: T.white, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  studentPath: { color: T.text2, fontFamily: 'DMSans_500Medium', fontSize: 11.5, marginTop: 2 },
  progressPct: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  progressPctText: { fontFamily: 'DMSans_700Bold', fontSize: 12 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextLabel: { color: T.text3, fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 0.8 },
  nextValue: { color: T.white, fontFamily: 'DMSans_500Medium', fontSize: 12, flex: 1 },

  // Quick actions
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  qaTile: { alignItems: 'center', gap: 8, paddingVertical: 4, flexGrow: 1, flexBasis: '22%', minWidth: 100 },
  qaIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { color: T.text, fontFamily: 'DMSans_500Medium', fontSize: 11, textAlign: 'center', lineHeight: 13 },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { color: 'rgba(20,184,166,0.50)', fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 2.5 },
});
