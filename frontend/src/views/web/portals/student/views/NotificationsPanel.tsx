import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PALETTE, TYPO } from '../tokens';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

interface Notif {
  id: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  created_at?: string;
  booking_id?: string;
  data?: Record<string, any>;
}

interface NotificationsPanelProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

export function StudentNotificationsPanel({ onClose, onOpenSettings }: NotificationsPanelProps) {
  const toast = useToast();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'booking' | 'review' | 'event'>('all');

  const load = useCallback(async () => {
    try {
      const r = await api.notifications();
      const items: Notif[] = (r.notifications || r.items || []) as Notif[];
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setList(items);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(() => list.filter((n) => !n.read).length, [list]);

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissNotifications([id]);
      setList((prev) => prev.filter((item) => item.id !== id));
      toast.info('Notification dismissed', 'Item removed from notifications.');
    } catch (e) {
      toast.error('Error', 'Failed to dismiss notification.');
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = list.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await api.markNotificationsRead(unreadIds);
      setList((prev) => prev.map((item) => ({ ...item, unread: false, read: true })));
      toast.success('Success', 'All notifications marked as read.');
    } catch (e) {
      toast.error('Error', 'Failed to mark all as read.');
    }
  };

  const handleAction = async (item: Notif) => {
    try {
      await api.dismissNotifications([item.id]);
    } catch (e) {}

    setList((prev) => prev.filter((i) => i.id !== item.id));

    const role = user?.role || 'student';
    const lowerType = (item.type || '').toLowerCase();

    if (lowerType === 'booking_request' || lowerType === 'booking_pending') {
      if (role === 'mentor') {
        router.push('/mentor-portal?tab=requests');
      } else {
        router.push('/student-portal?tab=my-bookings');
      }
    } else if (lowerType === 'connection_request' || lowerType === 'connection_accepted') {
      if (role === 'mentor') {
        router.push('/mentor-portal?tab=students');
      } else {
        router.push('/student-portal?tab=network');
      }
    } else if (item.booking_id) {
      if (role === 'mentor') {
        router.push('/mentor-portal?tab=sessions');
      } else {
        router.push('/student-portal?tab=my-bookings');
      }
    } else if (lowerType === 'event' && item.data?.event_id) {
      router.push(`/event/${item.data.event_id}` as any);
    } else if (lowerType === 'review') {
      if (role === 'mentor') {
        router.push('/mentor-portal?tab=feedback');
      } else {
        router.push('/student-portal?tab=profile');
      }
    } else {
      if (role === 'mentor') {
        router.push('/mentor-portal');
      } else {
        router.push('/student-portal');
      }
    }
    onClose();
  };

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const type = (item.type || '').toLowerCase();
      if (activeFilter === 'unread') return !item.read;
      if (activeFilter === 'booking') return type.startsWith('booking');
      if (activeFilter === 'review') return type.startsWith('review');
      if (activeFilter === 'event') return type.startsWith('event');
      return true;
    });
  }, [list, activeFilter]);

  return (
    <View
      className="bg-navy border-l border-glass-border p-4 gap-4"
      style={{ width: 360, height: '100%', zIndex: 9999 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-white" style={{ fontFamily: TYPO.display700, fontSize: 16 }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              className="border rounded-full px-2 py-0.5"
              style={{
                backgroundColor: PALETTE.rose + '22',
                borderColor: PALETTE.rose + '50',
              }}
            >
              <Text className="text-rose-400" style={{ fontFamily: TYPO.body700, fontSize: 10 }}>
                {unreadCount} new
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2.5">
          <Pressable onPress={handleMarkAllRead} className={Platform.OS === 'web' ? 'cursor-pointer' : ''}>
            <Text className="text-violet" style={{ fontFamily: TYPO.body700, fontSize: 12.5, marginRight: 4 }}>
              Mark all read
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            className="w-[26px] h-[26px] rounded-full bg-white/4 items-center justify-center"
          >
            <Text className="text-muted" style={{ fontSize: 16, lineHeight: 16, textAlign: 'center' }}>
              &times;
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="h-8">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            { key: 'booking', label: 'Booking' },
            { key: 'review', label: 'Review' },
            { key: 'event', label: 'Event' },
          ].map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key as any)}
                className={`px-3 h-7 rounded-full border items-center justify-center ${
                  active ? 'bg-violet/14 border-violet' : 'bg-white/3 border-glass-border'
                } ${Platform.OS === 'web' ? 'cursor-pointer' : ''}`}
              >
                <Text
                  className={active ? 'text-violet' : 'text-muted'}
                  style={{ fontFamily: TYPO.body700, fontSize: 11 }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={PALETTE.violet} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {filteredList.length === 0 ? (
            <View className="items-center justify-center py-16 gap-2">
              <MaterialCommunityIcons name="bell-off-outline" size={24} color={PALETTE.dim} />
              <Text className="text-dim" style={{ fontFamily: TYPO.body500, fontSize: 12 }}>
                No notifications found
              </Text>
            </View>
          ) : (
            filteredList.map((item) => {
              const { glyph, color } = iconForType(item.type);
              const actionText = getActionText(item.type);
              return (
                <Pressable
                  key={item.id}
                  className={`border rounded-xl p-3 ${
                    !item.read
                      ? 'bg-violet/3 border-violet/15'
                      : 'bg-white/1 border-white/4'
                  }`}
                  onPress={() => handleAction(item)}
                >
                  <View className="flex-row gap-3">
                    <View
                      className="w-9 h-9 rounded-lg border items-center justify-center"
                      style={{ borderColor: color + '30', backgroundColor: color + '10' }}
                    >
                      <MaterialCommunityIcons name={glyph as any} size={18} color={color} />
                    </View>

                    <View className="flex-1 gap-1">
                      <View className="flex-row justify-between items-start gap-2">
                        <Text className="text-white flex-1" style={{ fontFamily: TYPO.body700, fontSize: 13 }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-dim" style={{ fontFamily: TYPO.body500, fontSize: 10.5 }}>
                            {formatRelative(item.created_at)}
                          </Text>
                          {!item.read && (
                            <View className="w-[7px] h-[7px] rounded-full bg-violet" />
                          )}
                        </View>
                      </View>
                      <Text
                        className="text-muted mt-0.5"
                        style={{ fontFamily: TYPO.body500, fontSize: 11.5, lineHeight: 15.5 }}
                      >
                        {item.message}
                      </Text>

                      <View className="flex-row items-center gap-2 mt-2">
                        <Pressable
                          onPress={() => handleAction(item)}
                          className="px-2.5 py-1 rounded-md border border-violet/40 bg-violet/10"
                        >
                          <Text className="text-violet" style={{ fontFamily: TYPO.body700, fontSize: 11 }}>
                            {actionText}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDismiss(item.id)}
                          className="px-2.5 py-1 rounded-md bg-white/3 border border-glass-border"
                        >
                          <Text className="text-muted" style={{ fontFamily: TYPO.body500, fontSize: 11 }}>
                            Dismiss
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <View className="border-t border-glass-border pt-3 items-center">
        <Pressable
          onPress={onOpenSettings}
          className="flex-row items-center gap-1.5 py-2 px-4 rounded-lg bg-white/2 border border-glass-border"
        >
          <MaterialCommunityIcons name="cog-outline" size={14} color={PALETTE.muted} />
          <Text className="text-muted" style={{ fontFamily: TYPO.body700, fontSize: 12 }}>
            Notification Settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function iconForType(type?: string) {
  const t = (type || '').toLowerCase();
  if (t.startsWith('booking_request') || t.startsWith('booking_pending')) {
    return { glyph: 'calendar-clock', color: '#F59E0B' };
  }
  if (t.startsWith('booking_confirmed')) {
    return { glyph: 'calendar-check-outline', color: '#10B981' };
  }
  if (t.startsWith('booking_cancelled')) {
    return { glyph: 'calendar-remove-outline', color: '#EF4444' };
  }
  if (t.startsWith('review')) {
    return { glyph: 'star-outline', color: '#F59E0B' };
  }
  if (t.startsWith('event')) {
    return { glyph: 'trophy-outline', color: '#6366F1' };
  }
  if (t.startsWith('connection_request') || t.startsWith('connection_pending')) {
    return { glyph: 'account-plus-outline', color: '#EC4899' };
  }
  if (t.startsWith('connection_accepted') || t.startsWith('connection_active')) {
    return { glyph: 'account-check-outline', color: '#10B981' };
  }
  return { glyph: 'bell-outline', color: '#A78BFA' };
}

function getActionText(type?: string): string {
  const t = (type || '').toLowerCase();
  if (t.startsWith('booking_request') || t.startsWith('booking_pending')) {
    return 'View Request →';
  }
  if (t.startsWith('connection_request')) {
    return 'View Connections →';
  }
  if (t.startsWith('event')) {
    return 'View Event →';
  }
  return 'View Details →';
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
