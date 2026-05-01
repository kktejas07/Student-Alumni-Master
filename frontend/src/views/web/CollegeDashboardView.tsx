/**
 * CollegeDashboardView — responsive web + mobile dashboard for role=college.
 * Matches the "College Admin Portal — Standalone" prototype.
 *
 * Theme: dark navy/blue (#0F172A → #1E3A8A), accent #60A5FA.
 */
import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Animated, Easing,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, GraduationCap, Users, Calendar, TrendingUp, Megaphone,
  PlusSquare, BarChart3, ChevronRight, ArrowUpRight, Briefcase,
} from 'lucide-react-native';

const BLUE = '#60A5FA';
const BLUE_TINT = 'rgba(96,165,250,0.18)';
const BLUE_BORDER = 'rgba(96,165,250,0.32)';

const STATS = [
  { id: 'students',   Icon: GraduationCap, label: 'Total Students',     value: '3,240', delta: '↑180 enrolled', color: BLUE,      tint: BLUE_TINT,             border: BLUE_BORDER, deltaColor: '#34D399' },
  { id: 'alumni',     Icon: Users,         label: 'Alumni Network',     value: '8,400', delta: '↑320 this year', color: '#A78BFA', tint: 'rgba(124,58,237,0.18)', border: 'rgba(196,181,253,0.32)', deltaColor: '#34D399' },
  { id: 'events',     Icon: Calendar,      label: 'Events This Month',  value: '12',    delta: '3 upcoming',     color: '#FB923C', tint: 'rgba(180,83,9,0.20)',   border: 'rgba(251,146,60,0.32)', deltaColor: '#FB923C' },
  { id: 'placement',  Icon: TrendingUp,    label: 'Placement Rate',     value: '94%',   delta: '↑4% vs last yr', color: '#34D399', tint: 'rgba(6,95,70,0.20)',    border: 'rgba(52,211,153,0.32)', deltaColor: '#34D399' },
];

const ACTIVITY = [
  { id: '1', Icon: GraduationCap, text: '180 students enrolled for Semester 5',  when: 'Today',     tint: ['#60A5FA', '#1D4ED8'] },
  { id: '2', Icon: Users,         text: 'Priya Singh (2022) joined the alumni network', when: '2 hrs ago', tint: ['#A78BFA', '#7C3AED'] },
  { id: '3', Icon: Calendar,      text: 'Tech Fest 2026 — RSVP count reached 240', when: '4 hrs ago', tint: ['#F472B6', '#DB2777'] },
  { id: '4', Icon: Briefcase,     text: 'Google campus drive confirmed for May 10', when: 'Yesterday', tint: ['#FB923C', '#EA580C'] },
];

const QUICK_ACTIONS = [
  { id: 'announce',  Icon: Megaphone,   label: 'Announce',  gradient: ['#EF4444', '#B91C1C'], shadow: 'rgba(239,68,68,0.45)' },
  { id: 'new-event', Icon: PlusSquare,  label: 'New\nEvent', gradient: ['#FB923C', '#EA580C'], shadow: 'rgba(251,146,60,0.45)' },
  { id: 'analytics', Icon: BarChart3,   label: 'Analytics', gradient: ['#3B82F6', '#1D4ED8'], shadow: 'rgba(59,130,246,0.45)' },
  { id: 'students',  Icon: GraduationCap, label: 'Students', gradient: ['#A78BFA', '#7C3AED'], shadow: 'rgba(124,58,237,0.45)' },
];

interface Props {
  collegeName?: string;
  notifCount?: number;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onActionPress?: (id: string) => void;
}

export function CollegeDashboardView({
  collegeName = "St. Xavier's College Admin", notifCount = 4,
  onOpenNotifications, onOpenProfile, onActionPress,
}: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  const initials = collegeName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, isWide && { padding: 28, maxWidth: 1280, alignSelf: 'center', width: '100%' }]}
      showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY }], gap: isWide ? 22 : 18 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Good morning 🏫</Text>
            <Text style={[styles.name, isWide && { fontSize: 28 }]} numberOfLines={2}>{collegeName}</Text>
          </View>
          <Pressable onPress={onOpenNotifications} testID="college-notif-btn"
            style={({ pressed }: any) => [styles.iconBtn, pressed && { transform: [{ scale: 0.94 }] }]}>
            <Bell size={18} color="#FCD34D" />
            {notifCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>{notifCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={onOpenProfile} testID="college-profile-btn"
            style={({ pressed }: any) => [styles.avatar, pressed && { transform: [{ scale: 0.94 }] }]}>
            <LinearGradient colors={['#60A5FA', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        {/* Stats — 2x2 grid */}
        <View style={[styles.statGrid, isWide && styles.statGridWide]}>
          {STATS.map((s) => (
            <Pressable key={s.id} testID={`college-stat-${s.id}`}
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
              <Text style={styles.statValue}>{s.value}</Text>
              <View style={styles.statDeltaRow}>
                {s.delta.startsWith('↑') && <ArrowUpRight size={11} color={s.deltaColor} />}
                <Text style={[styles.statDelta, { color: s.deltaColor }]}>{s.delta.replace('↑', '').trim()}</Text>
              </View>
            </Pressable>
          ))}
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

        {/* Recent Activity */}
        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>RECENT ACTIVITY</Text>
            <Pressable testID="college-activity-all">
              <Text style={styles.linkText}>View all →</Text>
            </Pressable>
          </View>
          <View style={styles.activityList}>
            {ACTIVITY.map((a, i) => (
              <Pressable key={a.id} testID={`college-activity-${a.id}`}
                style={({ pressed, hovered }: any) => [
                  styles.activityRow,
                  i < ACTIVITY.length - 1 && styles.activityRowBorder,
                  hovered && { backgroundColor: 'rgba(96,165,250,0.06)' },
                  pressed && { backgroundColor: 'rgba(96,165,250,0.10)' },
                ]}>
                <LinearGradient colors={a.tint as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activityAvatar}>
                  <a.Icon size={16} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.activityText} numberOfLines={2}>{a.text}</Text>
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

function QuickActionTile({ action, onPress }: { action: typeof QUICK_ACTIONS[number]; onPress?: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable onPress={onPress} testID={`college-qa-${action.id}`}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 6, tension: 200 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start()}
      style={({ hovered }: any) => [styles.qaTile, hovered && { transform: [{ translateY: -2 }] }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={action.gradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.qaIconWrap, { boxShadow: `0px 6px 14px ${action.shadow}` } as any]}>
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
  name: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 20, letterSpacing: -0.4, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  notifDotText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 9 },
  avatar: {
    width: 40, height: 40, borderRadius: 12, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BLUE_BORDER,
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
  linkText: { color: BLUE, fontFamily: 'DMSans_700Bold', fontSize: 11.5, marginBottom: 12 },

  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  qaTile: { width: '22%', alignItems: 'center', gap: 8, paddingVertical: 4, flexGrow: 1, flexBasis: '22%' },
  qaIconWrap: {
    width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
  qaLabel: { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_500Medium', fontSize: 10.5, textAlign: 'center', lineHeight: 13 },

  activityList: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(96,165,250,0.18)',
    borderWidth: 1, borderRadius: 16, overflow: 'hidden',
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  activityAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityText: { color: '#FFFFFF', fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 18 },
  activityWhen: { color: 'rgba(255,255,255,0.40)', fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 2 },
});
