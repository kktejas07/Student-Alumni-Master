/**
 * StudentDashboardMobileView — native-feel mobile dashboard.
 *
 * Matches the "Student Alumni — Mobile Standalone" prototype:
 *   • Top bar: greeting + name + notif bell + avatar
 *   • 2 stat cards row (Career Score / Matches, or chosen pair)
 *   • Quick Actions: 2x4 grid (8 tiles) with colored gradient icons
 *   • Member Spotlight: horizontal scroll of mentor/alumni cards
 *   • Recent Activity: feed list
 *
 * Press animations on every interactive tile + Animated entry stagger.
 * Designed to render at any width but specifically optimized for ≤500px.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Users, Briefcase, Calendar, GraduationCap, Megaphone, Trophy,
  BookOpen, Settings, ArrowUpRight, Globe, ChevronRight,
} from 'lucide-react-native';

// ─── Mock data (will be replaced by API later) ────────────────────────
const STATS = [
  { id: 'alumni',    label: 'Total Alumni',  value: '12,400', delta: '↑240 this month', icon: Users, color: '#A78BFA', tint: 'rgba(124,58,237,0.18)', border: 'rgba(196,181,253,0.32)' },
  { id: 'countries', label: 'Countries',     value: '48',     delta: 'Worldwide reach',  icon: Globe, color: '#34D399', tint: 'rgba(6,95,70,0.20)',    border: 'rgba(52,211,153,0.32)' },
];

const QUICK_ACTIONS = [
  { id: 'alumni',     label: 'Find\nAlumni',  Icon: Users,        gradient: ['#3B82F6', '#1D4ED8'],   shadow: 'rgba(59,130,246,0.45)' },
  { id: 'jobs',       label: 'Jobs Board',    Icon: Briefcase,    gradient: ['#A78BFA', '#7C3AED'],   shadow: 'rgba(124,58,237,0.45)' },
  { id: 'events',     label: 'Events',        Icon: Calendar,     gradient: ['#F472B6', '#DB2777'],   shadow: 'rgba(236,72,153,0.45)' },
  { id: 'mentorship', label: 'Mentorship',    Icon: GraduationCap, gradient: ['#FB923C', '#EA580C'],  shadow: 'rgba(251,146,60,0.45)' },
  { id: 'announce',   label: 'Announce',      Icon: Megaphone,    gradient: ['#EF4444', '#B91C1C'],   shadow: 'rgba(239,68,68,0.45)' },
  { id: 'leaderboard', label: 'Leaderboard',  Icon: Trophy,       gradient: ['#FCD34D', '#D97706'],   shadow: 'rgba(252,211,77,0.45)' },
  { id: 'resources',  label: 'Resources',     Icon: BookOpen,     gradient: ['#34D399', '#059669'],   shadow: 'rgba(52,211,153,0.45)' },
  { id: 'settings',   label: 'Settings',      Icon: Settings,     gradient: ['#9CA3AF', '#4B5563'],   shadow: 'rgba(156,163,175,0.45)' },
];

const SPOTLIGHT = [
  { id: 'ps', initials: 'PS', name: 'Priya S.',  role: 'PM @ Google',     year: '2022',
    tint: ['#A78BFA', '#7C3AED'] },
  { id: 'ak', initials: 'AK', name: 'Arun K.',   role: 'SWE @ Microsoft', year: '2021',
    tint: ['#F472B6', '#DB2777'] },
  { id: 'mr', initials: 'MR', name: 'Meera R.',  role: 'Design @ Swiggy', year: '2022',
    tint: ['#34D399', '#059669'] },
  { id: 'rs', initials: 'RS', name: 'Rohan S.',  role: 'Founder · YC W23', year: '2018',
    tint: ['#FB923C', '#EA580C'] },
];

const ACTIVITY = [
  { id: '1', initials: 'PS', text: 'joined the network',         who: 'Priya Singh',   when: '2 min ago',  tint: ['#A78BFA', '#7C3AED'] },
  { id: '2', initials: 'AK', text: 'posted a new job opening',   who: 'Arun K.',       when: '12 min ago', tint: ['#F472B6', '#DB2777'] },
  { id: '3', initials: 'MR', text: 'replied in #design-systems', who: 'Meera R.',      when: '34 min ago', tint: ['#34D399', '#059669'] },
];

interface Props {
  userName?: string;
  notifCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onActionPress?: (id: string) => void;
}

export function StudentDashboardMobileView({
  userName = 'there', notifCount = 3, onOpenNotifications, onOpenProfile, onActionPress,
}: Props) {
  // ─── Stagger entry animation ───────────────────────────────────────────
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  }, []);
  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fade, transform: [{ translateY }], gap: 18 }}>
        {/* ─── Top bar ─────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good morning 👋</Text>
            <Text style={styles.name}>{userName}</Text>
          </View>
          <Pressable
            onPress={onOpenNotifications}
            testID="dash-mob-notif-btn"
            style={({ pressed }: any) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={6}
          >
            <Bell size={18} color="#FCD34D" />
            {notifCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{notifCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={onOpenProfile}
            testID="dash-mob-profile-btn"
            style={({ pressed }: any) => [styles.avatar, pressed && styles.pressed]}
            hitSlop={6}
          >
            <LinearGradient
              colors={['#A78BFA', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.avatarText}>
              {userName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'SA'}
            </Text>
          </Pressable>
        </View>

        {/* ─── Stat cards row ──────────────────────────────────────────── */}
        <View style={styles.statRow}>
          {STATS.map((s) => (
            <Pressable
              key={s.id}
              testID={`dash-mob-stat-${s.id}`}
              style={({ pressed }: any) => [
                styles.statCard,
                { backgroundColor: s.tint, borderColor: s.border },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={styles.statHeader}>
                <s.icon size={14} color={s.color} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <View style={styles.statDeltaRow}>
                {s.delta.startsWith('↑') && <ArrowUpRight size={11} color="#34D399" />}
                <Text style={[styles.statDelta, s.delta.startsWith('↑') && { color: '#34D399' }]}>
                  {s.delta.replace('↑', '').trim()}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ─── Quick Actions grid (4×2) ────────────────────────────────── */}
        <View>
          <Text style={styles.section}>QUICK ACTIONS</Text>
          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((q) => (
              <QuickActionTile key={q.id} action={q} onPress={() => onActionPress?.(q.id)} />
            ))}
          </View>
        </View>

        {/* ─── Member Spotlight ────────────────────────────────────────── */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>MEMBER SPOTLIGHT</Text>
            <Pressable testID="dash-mob-spotlight-all">
              <Text style={styles.linkText}>See all →</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 14, gap: 10 }}
          >
            {SPOTLIGHT.map((m) => (
              <Pressable
                key={m.id}
                testID={`dash-mob-spotlight-${m.id}`}
                style={({ pressed }: any) => [styles.spotlightCard, pressed && { transform: [{ scale: 0.97 }] }]}
              >
                <LinearGradient
                  colors={m.tint as any}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.spotlightAvatar}
                >
                  <Text style={styles.spotlightInitials}>{m.initials}</Text>
                </LinearGradient>
                <Text style={styles.spotlightName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.spotlightRole} numberOfLines={2}>{m.role}</Text>
                <View style={styles.spotlightYearChip}>
                  <Text style={styles.spotlightYearText}>{m.year}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ─── Recent Activity ─────────────────────────────────────────── */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>RECENT ACTIVITY</Text>
            <Pressable testID="dash-mob-activity-all">
              <Text style={styles.linkText}>View all →</Text>
            </Pressable>
          </View>
          <View style={styles.activityList}>
            {ACTIVITY.map((a, i) => (
              <Pressable
                key={a.id}
                testID={`dash-mob-activity-${a.id}`}
                style={({ pressed }: any) => [
                  styles.activityRow,
                  i < ACTIVITY.length - 1 && styles.activityRowBorder,
                  pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
                ]}
              >
                <LinearGradient
                  colors={a.tint as any}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.activityAvatar}
                >
                  <Text style={styles.activityInitials}>{a.initials}</Text>
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.activityText} numberOfLines={1}>
                    <Text style={styles.activityWho}>{a.who} </Text>
                    {a.text}
                  </Text>
                  <Text style={styles.activityWhen}>{a.when}</Text>
                </View>
                <ChevronRight size={16} color="rgba(255,255,255,0.30)" />
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Quick Action Tile (animated icon press scale) ─────────────────────
function QuickActionTile({
  action, onPress,
}: { action: typeof QUICK_ACTIONS[number]; onPress?: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      testID={`dash-mob-qa-${action.id}`}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 6, tension: 200 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start()}
      style={({ hovered }: any) => [
        styles.qaTile,
        hovered && { transform: [{ translateY: -2 }] },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={action.gradient as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.qaIconWrap, { boxShadow: `0px 6px 14px ${action.shadow}` } as any]}
        >
          <action.Icon size={22} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.qaLabel} numberOfLines={2}>{action.label}</Text>
    </Pressable>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 18, paddingBottom: 90 },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 13 },
  name:     { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.4, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  pressed: { transform: [{ scale: 0.94 }] },
  notifDot: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2, borderColor: '#1A0438',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  notifDotText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 9 },
  avatar: {
    width: 40, height: 40, borderRadius: 12, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13.5 },

  // Stat row
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, padding: 14, borderRadius: 16, borderWidth: 1,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: {
    color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium',
    fontSize: 11, letterSpacing: 0.3,
  },
  statValue: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 26, marginTop: 6, letterSpacing: -0.5 },
  statDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  statDelta: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11 },

  // Sections
  section: {
    color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 1.4, marginBottom: 12, textTransform: 'uppercase',
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  linkText: {
    color: '#D4AAFF', fontFamily: 'DMSans_700Bold', fontSize: 11.5,
    letterSpacing: 0.2, marginBottom: 12,
  },

  // Quick Actions
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  qaTile: {
    width: '22%', alignItems: 'center', gap: 8,
    paddingVertical: 4,
    flexGrow: 1, flexBasis: '22%',
  },
  qaIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  qaLabel: {
    color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium',
    fontSize: 10.5, textAlign: 'center', lineHeight: 13,
  },

  // Spotlight
  spotlightCard: {
    width: 130, padding: 14, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, alignItems: 'center', gap: 6,
  },
  spotlightAvatar: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  spotlightInitials: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 16 },
  spotlightName: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  spotlightRole: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 10.5, textAlign: 'center', lineHeight: 14 },
  spotlightYearChip: {
    paddingHorizontal: 8, paddingVertical: 2.5,
    borderRadius: 999, backgroundColor: 'rgba(124,58,237,0.20)',
    borderColor: 'rgba(196,181,253,0.32)', borderWidth: 1, marginTop: 4,
  },
  spotlightYearText: { color: '#D4AAFF', fontFamily: 'DMSans_700Bold', fontSize: 10 },

  // Activity
  activityList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderRadius: 16, overflow: 'hidden',
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  activityAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activityInitials: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  activityText: { color: 'rgba(255,255,255,0.75)', fontFamily: 'DMSans_400Regular', fontSize: 13 },
  activityWho: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold' },
  activityWhen: { color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
});
