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
  StyleSheet,
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

type Notif = {
  id: string;
  title: string;
  message: string;
  type?: string;        // booking_request | booking_confirmed | review | event | system
  read?: boolean;
  created_at?: string;
  booking_id?: string;
  data?: Record<string, any>;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.notifications();
      const list: Notif[] = (r.notifications || r.items || []) as Notif[];
      // sort newest first
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setItems(list);
      // auto-mark all unread as read
      const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        api.markNotificationsRead(unreadIds).catch(() => {});
      }
    } catch (e) {
      // swallow — UI shows empty state
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="notif-back">
          <ArrowLeft size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Bookings, reviews, events & alerts</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.brandPurple} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brandPurple} />}
        >
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            items.map((n) => (
              <NotificationRow
                key={n.id}
                notif={n}
                onPress={() => {
                  // Route depending on type
                  if (n.booking_id) {
                    router.push('/(tabs)/profile');
                  } else if (n.type === 'event' && n.data?.event_id) {
                    router.push(`/event/${n.data.event_id}` as any);
                  } else if (n.type === 'review') {
                    router.push('/(tabs)/profile');
                  }
                }}
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Bell size={36} color={C.lightPurple} />
      </View>
      <Text style={[Typography.h3, { color: C.textPrimary, marginTop: 12 }]}>You're all caught up</Text>
      <Text style={[Typography.body, { color: C.textSecondary, marginTop: 6, textAlign: 'center' }]}>
        New booking requests, reviews and event reminders will appear here.
      </Text>
    </View>
  );
}

function NotificationRow({ notif, onPress }: { notif: Notif; onPress: () => void }) {
  const { Icon, tint } = iconForType(notif.type);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={[styles.rowCard, !notif.read && styles.rowCardUnread]}>
        <View style={[styles.rowIcon, { backgroundColor: tint.bg }]}>
          <Icon size={18} color={tint.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={[
                Typography.bodyBold,
                { color: C.textPrimary, flex: 1 },
              ]}
              numberOfLines={1}
            >
              {notif.title}
            </Text>
            {!notif.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]} numberOfLines={3}>
            {notif.message}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Clock size={11} color={C.textMuted} />
            <Text style={[Typography.bodySm, { color: C.textMuted, fontSize: 11 }]}>
              {formatRelative(notif.created_at)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ----- helpers -----------------------------------------------------------
function iconForType(type?: string) {
  switch ((type || '').toLowerCase()) {
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
      return { Icon: Trophy, tint: { bg: 'rgba(95,37,159,0.18)', fg: C.brandPurple } };
    default:
      return { Icon: Bell, tint: { bg: C.palePurple, fg: C.deepPurple } };
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

// ----- styles ------------------------------------------------------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: C.surface,
    borderBottomColor: C.border,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h3, color: C.textPrimary },
  subtitle: { ...Typography.bodySm, color: C.textSecondary, marginTop: 2 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.md, gap: 10 },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  rowCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: C.brandPurple,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.brandPurple,
  },
  empty: {
    paddingVertical: 80,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: C.palePurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
