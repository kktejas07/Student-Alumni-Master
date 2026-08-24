import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CC } from '../tokens';
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
  onNavigate: (tab: any) => void;
}

export function CollegeNotificationsPanel({ onClose, onOpenSettings, onNavigate }: NotificationsPanelProps) {
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
      onNavigate('placements');
    } else if (lowerType === 'connection_request' || lowerType === 'connection_accepted') {
      onNavigate('students');
    } else if (item.booking_id) {
      onNavigate('placements');
    } else if (lowerType === 'event' && item.data?.event_id) {
      router.push(`/event/${item.data.event_id}` as any);
    } else if (lowerType === 'review') {
      onNavigate('mentors');
    } else {
      onNavigate('dashboard');
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
    <View className="w-[360px] h-full bg-bg border-l border-glass-border p-4 gap-4 z-[9999]">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-[#ffffff] font-body-bold text-[16px]">Notifications</Text>
          {unreadCount > 0 && (
            <View className="bg-[rgba(236,72,153,0.22)] border border-[rgba(236,72,153,0.50)] px-2 py-[2px] rounded-xl">
              <Text className="text-[#EC4899] font-body-bold text-[10px]">{unreadCount} new</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-[10px]">
          <Pressable onPress={handleMarkAllRead} style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
            <Text className="text-violet font-body-bold text-[12.5px] mr-1">Mark all read</Text>
          </Pressable>
          <Pressable onPress={onClose} className="w-[26px] h-[26px] rounded-[13px] bg-[rgba(255,255,255,0.04)] items-center justify-center" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
            <Text className="text-muted text-[16px] leading-[16px] text-center">&times;</Text>
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
                className={`px-3 h-7 rounded-[14px] items-center justify-center border ${active ? 'bg-[rgba(167,139,250,0.14)] border-violet' : 'bg-[rgba(255,255,255,0.03)] border-glass-border'}`}
                style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
                <Text className={`font-body-bold text-[11px] ${active ? 'text-violet' : 'text-muted'}`}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={CC.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {filteredList.length === 0 ? (
            <View className="items-center justify-center py-[60px] gap-2">
              <MaterialCommunityIcons name="bell-off-outline" size={24} color={CC.dim} />
              <Text className="text-dim font-body text-xs">No notifications found</Text>
            </View>
          ) : (
            filteredList.map((item) => {
              const { glyph, color } = iconForType(item.type);
              const actionText = getActionText(item.type);
              return (
                <Pressable key={item.id} className={`bg-[rgba(255,255,255,0.01)] border rounded-xl p-3 ${!item.read ? 'bg-[rgba(167,139,250,0.0a)] border-violet' : 'border-[rgba(255,255,255,0.04)]'}`} onPress={() => handleAction(item)}>
                  <View className="flex-row gap-3">
                    <View className="w-9 h-9 rounded-lg border items-center justify-center" style={{ borderColor: color + '30', backgroundColor: color + '10' }}>
                      <MaterialCommunityIcons name={glyph as any} size={18} color={color} />
                    </View>
                    
                    <View className="flex-1 gap-1">
                      <View className="flex-row justify-between items-start gap-2">
                        <Text className="text-[#ffffff] font-body-bold text-[13px] flex-1" numberOfLines={1}>{item.title}</Text>
                        <View className="flex-row items-center gap-[6px]">
                          <Text className="text-dim font-body text-[10.5px]">{formatRelative(item.created_at)}</Text>
                          {!item.read && <View className="w-[7px] h-[7px] rounded-full bg-violet" />}
                        </View>
                      </View>
                      <Text className="text-muted font-body text-[11.5px] leading-[15.5px] mt-[2px]">{item.message}</Text>
                      
                      <View className="flex-row items-center gap-2 mt-2">
                        <Pressable onPress={() => handleAction(item)} className="px-[10px] py-[5px] rounded-[6px] border border-violet bg-[rgba(167,139,250,0.0a)]" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
                          <Text className="text-violet font-body-bold text-[11px]">{actionText}</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDismiss(item.id)} className="px-[10px] py-[5px] rounded-[6px] bg-[rgba(255,255,255,0.03)] border border-glass-border" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
                          <Text className="text-muted font-body text-[11px]">Dismiss</Text>
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
        <Pressable onPress={onOpenSettings} className="flex-row items-center gap-[6px] py-2 px-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-glass-border" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}>
          <MaterialCommunityIcons name="cog-outline" size={14} color={CC.muted} />
          <Text className="text-muted font-body-bold text-xs">Notification Settings</Text>
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
    return { glyph: 'trophy-outline', color: '#8B5CF6' };
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
