/**
 * Notifications Inbox
 *
 * Lists all in-app notifications for the current user.
 * Auto-marks all unread as read when this screen mounts.
 *
 * Wired to:
 *   - GET  /api/notifications
 *   - POST /api/notifications/mark-read
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Star,
  CircleAlert,
  Trophy,
  CircleCheck,
  Clock,
} from 'lucide-react-native';
import { Colors as C, Spacing, Typography, Radius } from '@/src/theme';
import { Card } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

type Notif = {
  id: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  created_at?: string;
  booking_id?: string;
  data?: Record<string, any>;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user) as any;
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.notifications();
      const list: Notif[] = (r.notifications || r.items || []) as Notif[];
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setItems(list);
      const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        api.markNotificationsRead(unreadIds).catch(() => {});
      }
    } catch (e) {
      // swallow
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <View className="flex-row items-center gap-1.5 px-3 pt-2 pb-3 bg-glass border-b border-glass-border">
        <TouchableOpacity onPress={() => router.back()} className="w-11 h-11 items-center justify-center" testID="notif-back">
          <ArrowLeft size={22} color="#F4F4F8" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-text font-display-bold text-lg">Notifications</Text>
          <Text className="text-muted text-xs mt-0.5">Bookings, reviews, events & alerts</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.md, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        >
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            items.map((n) => (
              <NotificationRow
                key={n.id}
                notif={n}
                onPress={() => {
                  const resolvedType = (n.type || n.data?.type || '').toLowerCase();
                  const isBooking = resolvedType.includes('booking') || 
                                    (n.title || '').toLowerCase().includes('booking') || 
                                    !!n.booking_id;
                  
                  if (resolvedType === 'connection_request' || resolvedType === 'connection_accepted') {
                    router.push('/network');
                  } else if (isBooking) {
                    if (user?.role === 'mentor') {
                      router.push('/mentor-portal?tab=requests');
                    } else {
                      router.push('/(tabs)/profile' as any);
                    }
                  } else if (resolvedType === 'event' && n.data?.event_id) {
                    router.push(`/event/${n.data.event_id}` as any);
                  } else if (resolvedType === 'review' || (n.title || '').toLowerCase().includes('review')) {
                    router.push('/(tabs)/profile' as any);
                  }
                }}
              />
            ))
          )}
          <View className="h-10" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View className="py-20 px-4 items-center justify-center">
      <View className="w-20 h-20 rounded-full items-center justify-center bg-glass">
        <Bell size={36} color="#A78BFA" />
      </View>
      <Text className="text-text font-display-bold text-lg mt-3">You're all caught up</Text>
      <Text className="text-muted text-sm mt-1.5 text-center">
        New booking requests, reviews and event reminders will appear here.
      </Text>
    </View>
  );
}

function NotificationRow({ notif, onPress }: { notif: Notif; onPress: () => void }) {
  const { Icon, tint } = iconForType(notif.type || notif.data?.type, notif.title);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View className="flex-row items-start gap-3 p-3.5 bg-glass border border-glass-border rounded-xl" style={!notif.read ? { backgroundColor: 'rgba(139, 92, 246, 0.03)', borderColor: 'rgba(139, 92, 246, 0.15)', borderLeftWidth: 3, borderLeftColor: '#8B5CF6' } : {}}>
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: tint.bg }}>
          <Icon size={18} color={tint.fg} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              className="text-text font-body-bold text-sm flex-1"
              numberOfLines={1}
            >
              {notif.title}
            </Text>
            {!notif.read && <View className="w-2 h-2 rounded-full bg-violet" />}
          </View>
          <Text className="text-muted text-xs mt-0.5" numberOfLines={3}>
            {notif.message}
          </Text>
          <View className="flex-row items-center gap-1 mt-1.5">
            <Clock size={11} color="#6E7388" />
            <Text className="text-dim text-xs" style={{ fontSize: 11 }}>
              {formatRelative(notif.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ----- helpers -----------------------------------------------------------
function iconForType(type?: string, title?: string) {
  let t = (type || '').toLowerCase();
  if (!t && title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('booking request') || lowerTitle.includes('booking pending')) {
      t = 'booking_request';
    } else if (lowerTitle.includes('confirmed')) {
      t = 'booking_confirmed';
    } else if (lowerTitle.includes('cancelled')) {
      t = 'booking_cancelled';
    } else if (lowerTitle.includes('review')) {
      t = 'review';
    } else if (lowerTitle.includes('event')) {
      t = 'event';
    }
  }

  switch (t) {
    case 'booking_request':
    case 'booking_pending':
      return { Icon: CalendarCheck, tint: { bg: 'rgba(232,163,23,0.18)', fg: '#E8A317' } };
    case 'booking_confirmed':
      return { Icon: CircleCheck, tint: { bg: 'rgba(15,157,88,0.18)', fg: '#0F9D58' } };
    case 'booking_cancelled':
      return { Icon: CircleAlert, tint: { bg: 'rgba(179,38,30,0.15)', fg: '#B3261E' } };
    case 'review':
      return { Icon: Star, tint: { bg: 'rgba(232,163,23,0.18)', fg: '#E8A317' } };
    case 'event':
      return { Icon: Trophy, tint: { bg: 'rgba(139, 92, 246, 0.18)', fg: '#8B5CF6' } };
    default:
      return { Icon: Bell, tint: { bg: 'rgba(139, 92, 246, 0.18)', fg: '#A78BFA' } };
  }
}

function formatRelative(iso?: string): string {
  if (!iso) return 'just now';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
