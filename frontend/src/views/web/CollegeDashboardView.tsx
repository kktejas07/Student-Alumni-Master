/**
 * CollegeDashboardView — responsive web + mobile dashboard for role=college.
 * Matches the "College Admin Portal — Standalone" prototype.
 *
 * Theme: dark navy/blue (#0F172A → #1E3A8A), accent #60A5FA.
 */
import { useEffect, useRef } from 'react';
import { Platform, View, Text, Pressable, ScrollView, Animated, Easing,
  useWindowDimensions,} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, GraduationCap, Users, Calendar, TrendingUp, Megaphone,
  PlusSquare, BarChart3, ChevronRight, ArrowUpRight, Briefcase,
} from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

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

  const user = useAuthStore((s) => s.user);
  const firstName = (user?.full_name || '').split(' ')[0] || 'Admin';

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start();
  }, []);
  const translateY = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  const initials = collegeName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView className="flex-1 bg-transparent"
      contentContainerStyle={[{ padding: 18, paddingBottom: 90 }, isWide && { padding: 28, maxWidth: 1280, alignSelf: 'center', width: '100%' }]}
      showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY }], gap: isWide ? 22 : 18 }}>
        {/* Top bar */}
        <View className="flex-row items-center gap-2.5">
          <View className="flex-1">
            <Text className="font-body-medium text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Good morning, {firstName} 👋</Text>
            <Text className="text-white font-body-bold tracking-tight" style={isWide ? { fontSize: 28, marginTop: 2, letterSpacing: -0.4 } : { fontSize: 20, marginTop: 2, letterSpacing: -0.4 }} numberOfLines={2}>{collegeName}</Text>
          </View>
          <Pressable onPress={onOpenNotifications} testID="college-notif-btn"
            className="items-center justify-center"
            style={({ pressed }: any) => ({ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)', borderWidth: 1, ...(pressed ? { transform: [{ scale: 0.94 }] } : {}) })}>
            <Bell size={18} color="#FCD34D" />
            {notifCount > 0 && (
              <View className="absolute -top-1 -right-1 rounded-full items-center justify-center" style={{ minWidth: 18, height: 18, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#0F172A', paddingHorizontal: 4 }}>
                <Text className="text-white font-body-bold text-xs">{notifCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={onOpenProfile} testID="college-profile-btn"
            className="rounded-2xl overflow-hidden items-center justify-center border"
            style={({ pressed }: any) => ({ width: 40, height: 40, borderColor: BLUE_BORDER, ...(pressed ? { transform: [{ scale: 0.94 }] } : {}) })}>
            <LinearGradient colors={['#60A5FA', '#1D4ED8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="absolute inset-0" />
            <Text className="text-white font-body-bold text-sm">{initials}</Text>
          </Pressable>
        </View>

        {/* Stats — 2x2 grid */}
        <View className="flex-row flex-wrap" style={{ gap: isWide ? 14 : 10 }}>
          {STATS.map((s) => (
            <Pressable key={s.id} testID={`college-stat-${s.id}`}
              className="flex-1 rounded-2xl border"
              style={({ pressed }: any) => ({ flexBasis: isWide ? undefined : 150, minWidth: isWide ? 220 : 150, padding: isWide ? 18 : 14, backgroundColor: s.tint, borderColor: s.border, ...(pressed ? { transform: [{ scale: 0.98 }] } : {}) })}>
              <View className="flex-row items-center gap-1.5">
                <s.Icon size={14} color={s.color} />
                <Text className="font-body-medium text-xs tracking-wide" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</Text>
              </View>
              <Text className="text-white font-body-bold text-2xl tracking-tight mt-1.5" style={{ letterSpacing: -0.5 }}>{s.value}</Text>
              <View className="flex-row items-center gap-0.5 mt-1">
                {s.delta.startsWith('↑') && <ArrowUpRight size={11} color={s.deltaColor} />}
                <Text className="font-body-medium text-xs" style={{ color: s.deltaColor }}>{s.delta.replace('↑', '').trim()}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Quick Actions */}
        <View>
          <Text className="font-body-bold text-xs tracking-widest mb-3 uppercase" style={{ color: 'rgba(255,255,255,0.50)' }}>QUICK ACTIONS</Text>
          <View className="flex-row flex-wrap gap-3">
            {QUICK_ACTIONS.map((q) => (
              <QuickActionTile key={q.id} action={q} onPress={() => onActionPress?.(q.id)} />
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View>
          <View className="flex-row justify-between items-center mb-1">
            <Text className="font-body-bold text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.50)' }}>RECENT ACTIVITY</Text>
            <Pressable testID="college-activity-all">
              <Text className="font-body-bold text-xs mb-3" style={{ color: BLUE }}>View all →</Text>
            </Pressable>
          </View>
          <View className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(96,165,250,0.18)' }}>
            {ACTIVITY.map((a, i) => (
              <Pressable key={a.id} testID={`college-activity-${a.id}`}
                className="flex-row items-center gap-3 p-3.5"
                style={({ pressed, hovered }: any) => ({
                  borderBottomWidth: i < ACTIVITY.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.06)',
                  backgroundColor: hovered ? 'rgba(96,165,250,0.06)' : pressed ? 'rgba(96,165,250,0.10)' : undefined,
                })}>
                <LinearGradient colors={a.tint as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-2xl items-center justify-center" style={{ width: 40, height: 40 }}>
                  <a.Icon size={16} color="#FFFFFF" />
                </LinearGradient>
                <View className="flex-1 min-w-0">
                  <Text className="font-body-medium text-sm text-white leading-5" numberOfLines={2}>{a.text}</Text>
                  <Text className="font-body-regular text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>{a.when}</Text>
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
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: Platform.OS !== 'web', friction: 6, tension: 200 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 6, tension: 200 }).start()}
      className="items-center gap-2 py-1"
      style={{ width: '22%', flexGrow: 1, flexBasis: '22%' }}
      style={({ hovered }: any) => [hovered && { transform: [{ translateY: -2 }] }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={action.gradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          className="rounded-2xl items-center justify-center"
          style={[{ width: 56, height: 56, elevation: 6 }, { boxShadow: `0px 6px 14px ${action.shadow}` } as any]}>
          <action.Icon size={22} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>
      <Text className="font-body-medium text-xs text-center leading-3" style={{ color: 'rgba(255,255,255,0.78)' }} numberOfLines={2}>{action.label}</Text>
    </Pressable>
  );
}
