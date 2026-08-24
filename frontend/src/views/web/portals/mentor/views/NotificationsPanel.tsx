import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MC, FONTS } from '../tokens';
import { useToast } from '@/src/views/components';
import { request } from '@/src/models/services/api';
import { NavId } from '../Sidebar';

interface NotificationItem {
  id: string;
  category: 'booking' | 'review' | 'payment' | 'message' | 'connection' | 'report' | 'milestone';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  iconGlyph: string;
  iconColor: string;
  actionText: string;
}

interface NotificationsPanelProps {
  onClose: () => void;
  onOpenSettings: () => void;
  onNav: (tabId: NavId) => void;
  notifications: any[];
  onRefresh: () => void;
}

export function NotificationsPanel({
  onClose,
  onOpenSettings,
  onNav,
  notifications,
  onRefresh,
}: NotificationsPanelProps) {
  const toast = useToast();
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'booking' | 'review' | 'payment'>('all');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const list = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    return notifications
      .filter((n) => n && n.id && !dismissedIds.includes(String(n.id)))
      .map((item) => {
        const type = item.type || item.data?.type || '';
        let category: NotificationItem['category'] = 'booking';
        let iconGlyph = 'bell-outline';
        let iconColor = '#3B82F6';
        let actionText = 'View →';

        const typeLower = type.toLowerCase();
        if (typeLower.includes('booking') || typeLower.includes('session')) {
          category = 'booking';
          iconGlyph = 'calendar-check-outline';
          iconColor = '#10B981';
          actionText = item.title?.toLowerCase().includes('request') ? 'View Request →' : 'View Sessions →';
        } else if (typeLower.includes('review')) {
          category = 'review';
          iconGlyph = 'star-outline';
          iconColor = '#F59E0B';
          actionText = 'Read Review →';
        } else if (typeLower.includes('payment') || typeLower.includes('withdrawal') || typeLower.includes('earn')) {
          category = 'payment';
          iconGlyph = 'currency-inr';
          iconColor = '#0D9488';
          actionText = 'View Earnings →';
        } else if (typeLower.includes('message')) {
          category = 'message';
          iconGlyph = 'message-outline';
          iconColor = '#8B5CF6';
          actionText = 'Reply →';
        } else if (typeLower.includes('connection')) {
          category = 'connection';
          iconGlyph = 'account-plus-outline';
          iconColor = '#EC4899';
          actionText = 'Accept →';
        } else if (typeLower.includes('milestone') || typeLower.includes('approve') || typeLower.includes('register')) {
          category = 'milestone';
          iconGlyph = 'trophy-outline';
          iconColor = '#EAB308';
          actionText = 'View →';
        } else if (typeLower.includes('report')) {
          category = 'report';
          iconGlyph = 'chart-bar';
          iconColor = '#06B6D4';
          actionText = 'View Report →';
        }

        let relativeTime = 'Just now';
        if (item.created_at) {
          try {
            const date = new Date(item.created_at);
            const diffMs = Date.now() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) {
              relativeTime = 'Just now';
            } else if (diffMins < 60) {
              relativeTime = `${diffMins}m ago`;
            } else if (diffHours < 24) {
              relativeTime = `${diffHours}h ago`;
            } else {
              relativeTime = `${diffDays}d ago`;
            }
          } catch {
            relativeTime = item.created_at;
          }
        }

        return {
          id: String(item.id),
          category,
          title: item.title || 'Notification',
          description: item.body || item.message || '',
          time: relativeTime,
          unread: !item.read,
          iconGlyph,
          iconColor,
          actionText,
        };
      });
  }, [notifications, dismissedIds]);

  const unreadCount = useMemo(() => list.filter((n) => n.unread).length, [list]);

  const handleDismiss = async (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
    try {
      await request('/notifications/dismiss', {
        method: 'POST',
        body: { ids: [id] },
      });
      onRefresh();
      toast.info('Notification dismissed', 'Item removed from notifications.');
    } catch (e: any) {
      toast.error('Error', e.message || 'Failed to dismiss notification.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await request('/notifications/mark-read', {
        method: 'POST',
        body: {},
      });
      onRefresh();
      toast.success('Success', 'All notifications marked as read.');
    } catch (e: any) {
      toast.error('Error', e.message || 'Failed to mark notifications read.');
    }
  };

  const handleAction = async (item: NotificationItem) => {
    try {
      await request('/notifications/dismiss', {
        method: 'POST',
        body: { ids: [item.id] },
      });
      onRefresh();
      setDismissedIds((prev) => [...prev, item.id]);
      onClose();
      if (item.category === 'booking') {
        if (item.title.toLowerCase().includes('request')) {
          onNav('requests');
        } else {
          onNav('sessions');
        }
      } else if (item.category === 'review') {
        onNav('feedback');
      } else if (item.category === 'payment') {
        onNav('earnings');
      } else if (item.category === 'connection') {
        onNav('requests');
      } else if (item.category === 'milestone') {
        onNav('dashboard');
      } else {
        toast.info('Action Triggered', `Opening details for: ${item.title}`);
      }
    } catch (e: any) {
      toast.error('Error', e.message || 'Failed to perform action.');
    }
  };

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      if (activeFilter === 'unread') return item.unread;
      if (activeFilter === 'booking') return item.category === 'booking';
      if (activeFilter === 'review') return item.category === 'review';
      if (activeFilter === 'payment') return item.category === 'payment';
      return true;
    });
  }, [list, activeFilter]);

  return (
    <View className="w-[360px] h-full bg-card border-l border-glass-border p-4 gap-4" style={{ zIndex: 9999 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-display-bold text-[16px]">Notifications</Text>
          {unreadCount > 0 && (
            <View className="rounded-[12px] px-2 py-0.5 border" style={{ backgroundColor: MC.red + '22', borderColor: MC.red + '50' }}>
              <Text className="text-[#FC5C5C] font-body-bold text-[10px]">{unreadCount} new</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2.5">
          <Pressable onPress={handleMarkAllRead} style={Platform.OS === 'web' ? { cursor: 'pointer', marginRight: 4 } as any : undefined}>
            <Text className="text-tealP font-body-bold text-[12.5px]">Mark all read</Text>
          </Pressable>
          <Pressable onPress={onClose} className="w-[26px] h-[26px] rounded-[13px] items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }}>
            <Text className="text-muted text-base leading-4 text-center">&times;</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="h-8">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            { key: 'booking', label: 'Booking' },
            { key: 'review', label: 'Review' },
            { key: 'payment', label: 'Payment' },
          ].map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key as any)}
                className="px-3 h-7 rounded-[14px] items-center justify-center border"
                style={active
                  ? { backgroundColor: MC.tealP + '14', borderColor: MC.tealP }
                  : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: MC.border, ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }
                }
              >
                <Text className="font-body-bold text-[11px]" style={{ color: active ? MC.tealP : MC.muted }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
        {filteredList.length === 0 ? (
          <View className="items-center justify-center py-[60px] gap-2">
            <MaterialCommunityIcons name="bell-off-outline" size={24} color={MC.dim} />
            <Text className="text-dim font-body-semibold text-xs">No notifications found</Text>
          </View>
        ) : (
          filteredList.map((item) => (
            <Pressable key={item.id} onPress={() => handleAction(item)} className="rounded-xl p-3 border" style={item.unread
              ? { backgroundColor: 'rgba(20, 184, 166, 0.03)', borderColor: 'rgba(20, 184, 166, 0.15)' }
              : { backgroundColor: 'rgba(255, 255, 255, 0.01)', borderColor: 'rgba(255, 255, 255, 0.04)' }
            }>
              <View className="flex-row gap-3">
                <View className="w-9 h-9 rounded-lg border items-center justify-center" style={{ borderColor: item.iconColor + '30', backgroundColor: item.iconColor + '10' }}>
                  <MaterialCommunityIcons name={item.iconGlyph as any} size={18} color={item.iconColor} />
                </View>
                <View className="flex-1 gap-1">
                  <View className="flex-row justify-between items-start gap-2">
                    <Text className="text-white font-body-bold text-[13px] flex-1">{item.title}</Text>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-dim font-body-semibold text-[10.5px]">{item.time}</Text>
                      {item.unread && <View className="w-[7px] h-[7px] rounded-[3.5px] bg-tealP" />}
                    </View>
                  </View>
                  <Text className="text-muted font-body-semibold text-[11.5px] leading-[15.5px] mt-0.5">{item.description}</Text>
                  <View className="flex-row items-center gap-2 mt-2">
                    <Pressable onPress={() => handleAction(item)} className="px-2.5 py-[5px] rounded-md border" style={{ borderColor: MC.tealP + '40', backgroundColor: MC.tealP + '0a', ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}) }}>
                      <Text className="text-tealP font-body-bold text-[11px]">{item.actionText}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDismiss(item.id)} className="px-2.5 py-[5px] rounded-md bg-white/[0.03] border border-glass-border" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}>
                      <Text className="text-muted font-body-semibold text-[11px]">Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-glass-border pt-3 items-center">
        <Pressable onPress={onOpenSettings} className="flex-row items-center gap-1.5 py-2 px-4 rounded-lg bg-white/[0.02] border border-glass-border" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}>
          <MaterialCommunityIcons name="cog-outline" size={14} color={MC.muted} />
          <Text className="text-muted font-body-bold text-xs">Notification Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}
