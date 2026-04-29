/**
 * MentorDashboardView — responsive web + mobile dashboard for mentor role.
 * Matches the "Mentor Portal — Standalone" prototype.
 *
 * Theme: dark green (#022C22 → #064E3B), accent #2DD4BF (mint).
 * Width ≥ 768 → web layout (sidebar handled by parent)
 * Width < 768 → mobile single-column matching the phone mockup
 */
import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Calendar, Users, DollarSign, Trophy, Plus, Star,
  BarChart3, ChevronRight, ArrowUpRight, MessageCircle,
} from 'lucide-react-native';

const TEAL = '#2DD4BF';
const TEAL_DARK = '#0F766E';
const GREEN_TINT = 'rgba(45,212,191,0.18)';
const GREEN_BORDER = 'rgba(45,212,191,0.32)';

const STATS = [
  { id: 'sessions',  Icon: Calendar,    label: 'Sessions Today', value: '3',     delta: 'Next at 2:00 PM',  color: TEAL,      tint: GREEN_TINT,            border: GREEN_BORDER, deltaColor: TEAL },
  { id: 'students',  Icon: Users,       label: 'Total Students', value: '47',    delta: '↑4 this week',     color: '#34D399', tint: 'rgba(6,95,70,0.20)',  border: 'rgba(52,211,153,0.32)', deltaColor: '#34D399' },
  { id: 'earnings',  Icon: DollarSign,  label: 'This Month',     value: '₹28.5K', delta: '↑12% vs last',    color: '#FCD34D', tint: 'rgba(180,83,9,0.20)', border: 'rgba(252,211,77,0.32)', deltaColor: '#34D399' },
  { id: 'rating',    Icon: Trophy,      label: 'Rating',         value: '4.9',   delta: '42 reviews',       color: '#FCD34D', tint: 'rgba(180,83,9,0.20)', border: 'rgba(252,211,77,0.32)', deltaColor: 'rgba(255,255,255,0.55)', valueSuffix: '⭐' },
];

const SESSIONS = [
  { id: 'ak', initials: 'AK', name: 'Aryan Kapoor',  topic: 'Web Dev Roadmap',     time: '2:00 PM',  duration: '45 min', tint: ['#2DD4BF', '#0F766E'] },
  { id: 'sj', initials: 'SJ', name: 'Sneha Joshi',   topic: 'Career Counseling',    time: '4:30 PM',  duration: '30 min', tint: ['#34D399', '#059669'] },
  { id: 'rm', initials: 'RM', name: 'Rohit Mehta',   topic: 'DSA Interview Prep',   time: '6:00 PM',  duration: '60 min', tint: ['#A7F3D0', '#10B981'] },
];

const QUICK_ACTIONS = [
  { id: 'create-event', Icon: Plus,        label: 'Create\nEvent', gradient: ['#2DD4BF', '#0F766E'], shadow: 'rgba(45,212,191,0.45)' },
  { id: 'earnings',     Icon: DollarSign,  label: 'Earnings',      gradient: ['#FCD34D', '#D97706'], shadow: 'rgba(252,211,77,0.45)' },
  { id: 'feedback',     Icon: Star,        label: 'Feedback',      gradient: ['#FB923C', '#EA580C'], shadow: 'rgba(251,146,60,0.45)' },
  { id: 'analytics',    Icon: BarChart3,   label: 'Analytics',     gradient: ['#3B82F6', '#1D4ED8'], shadow: 'rgba(59,130,246,0.45)' },
];

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
  const isWide = width >= 768;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, isWide && { padding: 28, maxWidth: 1280, alignSelf: 'center', width: '100%' }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fade, transform: [{ translateY }], gap: isWide ? 22 : 18 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={[styles.name, isWide && { fontSize: 28 }]}>{userName.startsWith('Dr') ? userName : `Dr. ${userName}`}</Text>
          </View>
          <Pressable onPress={onOpenNotifications} testID="mentor-notif-btn"
            style={({ pressed }: any) => [styles.iconBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Bell size={18} color="#FCD34D" />
            {notifCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{notifCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={onOpenProfile} testID="mentor-profile-btn"
            style={({ pressed }: any) => [styles.avatar, pressed && { transform: [{ scale: 0.94 }] }]}>
            <LinearGradient colors={['#2DD4BF', '#0F766E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.avatarText}>
              {userName.replace('Dr.', '').trim().split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'M'}
            </Text>
          </Pressable>
        </View>

        {/* Stats — 2x2 grid */}
        <View style={[styles.statGrid, isWide && styles.statGridWide]}>
          {STATS.map((s) => (
            <Pressable key={s.id} testID={`mentor-stat-${s.id}`}
              style={({ pressed }: any) => [
                styles.statCard,
                { backgroundColor: s.tint, borderColor: s.border },
                isWide && styles.statCardWide,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}>
              <View style={styles.statHeader}>
                <s.Icon size={14} color={s.color} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              <Text style={styles.statValue}>
                {s.value} {s.valueSuffix && <Text style={{ fontSize: 18 }}>{s.valueSuffix}</Text>}
              </Text>
              <View style={styles.statDeltaRow}>
                {s.delta.startsWith('↑') && <ArrowUpRight size={11} color={s.deltaColor} />}
                <Text style={[styles.statDelta, { color: s.deltaColor }]}>{s.delta.replace('↑', '').trim()}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Today's Sessions */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>TODAY'S SESSIONS</Text>
            <Pressable testID="mentor-sessions-all">
              <Text style={styles.linkText}>View all →</Text>
            </Pressable>
          </View>
          <View style={[styles.sessionList, isWide && styles.sessionListWide]}>
            {SESSIONS.map((s, i) => (
              <Pressable key={s.id} testID={`mentor-session-${s.id}`}
                style={({ pressed, hovered }: any) => [
                  styles.sessionRow,
                  isWide && styles.sessionRowWide,
                  hovered && { backgroundColor: 'rgba(45,212,191,0.10)', borderColor: GREEN_BORDER },
                  pressed && { transform: [{ scale: 0.99 }] },
                ]}>
                <LinearGradient colors={s.tint as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sessionAvatar}>
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

        {/* Quick Actions */}
        <View>
          <Text style={styles.section}>QUICK ACTIONS</Text>
          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((q) => (
              <QuickActionTile key={q.id} action={q} onPress={() => onActionPress?.(q.id)} />
            ))}
          </View>
        </View>
      </Animated.View>
    </ScrollView>
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
          style={[styles.qaIconWrap, { shadowColor: action.shadow }]}>
          <action.Icon size={22} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.qaLabel} numberOfLines={2}>{action.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 18, paddingBottom: 90 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  name: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.4, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#022C22',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  notifDotText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 9 },
  avatar: {
    width: 40, height: 40, borderRadius: 12, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(45,212,191,0.32)',
  },
  avatarText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13.5 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statGridWide: { gap: 14 },
  statCard: { flex: 1, minWidth: 150, padding: 14, borderRadius: 16, borderWidth: 1 },
  statCardWide: { padding: 18, minWidth: 220 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.3 },
  statValue: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 26, marginTop: 6, letterSpacing: -0.5 },
  statDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  statDelta: { fontFamily: 'DMSans_500Medium', fontSize: 11 },

  section: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.4, marginBottom: 12, textTransform: 'uppercase' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  linkText: { color: TEAL, fontFamily: 'DMSans_700Bold', fontSize: 11.5, marginBottom: 12 },

  sessionList: {
    gap: 8,
  },
  sessionListWide: { gap: 10 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: 'rgba(45,212,191,0.06)', borderColor: 'rgba(45,212,191,0.18)',
    borderWidth: 1, borderRadius: 14,
  },
  sessionRowWide: { padding: 16 },
  sessionAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sessionInitials: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  sessionName: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  sessionTopic: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  sessionTime: { color: TEAL, fontFamily: 'DMSans_700Bold', fontSize: 13.5 },
  sessionDuration: { color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },

  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  qaTile: { width: '22%', alignItems: 'center', gap: 8, paddingVertical: 4, flexGrow: 1, flexBasis: '22%' },
  qaIconWrap: {
    width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  qaLabel: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 10.5, textAlign: 'center', lineHeight: 13 },
});
