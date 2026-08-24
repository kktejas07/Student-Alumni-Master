import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
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

  // Map backend notifications to NotificationItem.
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

  // Mark a single notification read and dismiss locally.
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

  // Mark all notifications read.
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

  // Dismiss single notification, close panel, and navigate.
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
    <View style={s.drawer}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeText}>{unreadCount} new</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={handleMarkAllRead} style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}>
            <Text style={s.markReadText}>Mark all read</Text>
          </Pressable>
          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeBtnText}>&times;</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={s.tabsContainer}>
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
                style={[s.tab, active && s.tabActive]}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
        {filteredList.length === 0 ? (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="bell-off-outline" size={24} color={MC.dim} />
            <Text style={s.emptyStateText}>No notifications found</Text>
          </View>
        ) : (
          filteredList.map((item) => (
            <Pressable key={item.id} style={[s.card, item.unread && s.cardUnread]} onPress={() => handleAction(item)}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Icon Outline Box */}
                <View style={[s.iconBox, { borderColor: item.iconColor + '30', backgroundColor: item.iconColor + '10' }]}>
                  <MaterialCommunityIcons name={item.iconGlyph as any} size={18} color={item.iconColor} />
                </View>
                
                {/* Detail column */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={s.cardTitle}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.cardTime}>{item.time}</Text>
                      {item.unread && <View style={s.unreadDot} />}
                    </View>
                  </View>
                  <Text style={s.cardDesc}>{item.description}</Text>
                  
                  {/* Buttons */}
                  <View style={s.cardActions}>
                    <Pressable onPress={() => handleAction(item)} style={s.actionBtn}>
                      <Text style={s.actionBtnText}>{item.actionText}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDismiss(item.id)} style={s.dismissBtn}>
                      <Text style={s.dismissBtnText}>Dismiss</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Pressable onPress={onOpenSettings} style={s.settingsBtn}>
          <MaterialCommunityIcons name="cog-outline" size={14} color={MC.muted} />
          <Text style={s.settingsBtnText}>Notification Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  drawer: {
    width: 360,
    height: '100%',
    backgroundColor: MC.card,
    borderLeftWidth: 1,
    borderLeftColor: MC.border,
    padding: 16,
    gap: 16,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#ffffff',
    fontFamily: FONTS.xbold,
    fontSize: 16,
  },
  unreadBadge: {
    backgroundColor: MC.red + '22',
    borderColor: MC.red + '50',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: '#FC5C5C',
    fontFamily: FONTS.bold,
    fontSize: 10,
  },
  markReadText: {
    color: MC.tealP,
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    marginRight: 4,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  closeBtnText: {
    color: MC.muted,
    fontSize: 16,
    lineHeight: 16,
    textAlign: 'center',
  },
  tabsContainer: {
    height: 32,
  },
  tab: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: MC.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  tabActive: {
    backgroundColor: MC.tealP + '14',
    borderColor: MC.tealP,
  },
  tabText: {
    color: MC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  tabTextActive: {
    color: MC.tealP,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyStateText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  cardUnread: {
    backgroundColor: 'rgba(20, 184, 166, 0.03)',
    borderColor: 'rgba(20, 184, 166, 0.15)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontFamily: FONTS.bold,
    fontSize: 13,
    flex: 1,
  },
  cardTime: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: MC.tealP,
  },
  cardDesc: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    lineHeight: 15.5,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: MC.tealP + '40',
    backgroundColor: MC.tealP + '0a',
    ...({ cursor: 'pointer' } as any),
  },
  actionBtnText: {
    color: MC.tealP,
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: MC.border,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  dismissBtnText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: MC.border,
    paddingTop: 12,
    alignItems: 'center',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: MC.border,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  settingsBtnText: {
    color: MC.muted,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
});
