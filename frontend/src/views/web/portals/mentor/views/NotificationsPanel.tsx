import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MC, FONTS } from '../tokens';
import { useToast } from '@/src/views/components';

interface NotificationItem {
  id: number;
  category: 'booking' | 'review' | 'payment' | 'message' | 'connection' | 'report' | 'milestone';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  iconGlyph: string;
  iconColor: string;
  actionText: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    category: 'booking',
    title: 'New Session Booked',
    description: 'Tanvi Rao booked a session for May 10, 2026 at 09:00 AM',
    time: '2 min ago',
    unread: true,
    iconGlyph: 'calendar-check-outline',
    iconColor: '#10B981',
    actionText: 'View Request \u2192',
  },
  {
    id: 2,
    category: 'review',
    title: 'New 5\u2605 Review',
    description: 'Kabir Das left a 5-star review for your session on Apr 29',
    time: '18 min ago',
    unread: true,
    iconGlyph: 'star-outline',
    iconColor: '#F59E0B',
    actionText: 'Read Review \u2192',
  },
  {
    id: 3,
    category: 'payment',
    title: 'Payment Received',
    description: '\u20b9999 credited for your session with Arjun Sharma',
    time: '1 hr ago',
    unread: true,
    iconGlyph: 'currency-inr',
    iconColor: '#0D9488',
    actionText: 'View Earnings \u2192',
  },
  {
    id: 4,
    category: 'message',
    title: 'New Message from Arjun',
    description: 'Hey Dr. Rao, quick question about system design resources...',
    time: '2 hr ago',
    unread: true,
    iconGlyph: 'message-outline',
    iconColor: '#8B5CF6',
    actionText: 'Reply \u2192',
  },
  {
    id: 5,
    category: 'booking',
    title: 'Session Reminder',
    description: 'You have a session with Meera Pillai tomorrow at 11:00 AM',
    time: '3 hr ago',
    unread: false,
    iconGlyph: 'calendar-clock',
    iconColor: '#3B82F6',
    actionText: 'Prepare \u2192',
  },
  {
    id: 6,
    category: 'connection',
    title: 'New Connection Request',
    description: 'Dev Anand from IIT Delhi wants to connect with you',
    time: '5 hr ago',
    unread: false,
    iconGlyph: 'account-plus-outline',
    iconColor: '#EC4899',
    actionText: 'Accept \u2192',
  },
  {
    id: 7,
    category: 'report',
    title: 'Weekly Performance Report',
    description: 'Sessions this week: 4 \u00b7 Avg rating: 4.9 \u00b7 Earned: \u20b93,996',
    time: '1 day ago',
    unread: false,
    iconGlyph: 'chart-bar',
    iconColor: '#06B6D4',
    actionText: 'View Report \u2192',
  },
  {
    id: 8,
    category: 'payment',
    title: 'Withdrawal Completed',
    description: '\u20b924,000 credited to your HDFC account ****4821',
    time: '1 day ago',
    unread: false,
    iconGlyph: 'credit-card-outline',
    iconColor: '#10B981',
    actionText: 'View \u2192',
  },
  {
    id: 9,
    category: 'review',
    title: 'Reply Reminder',
    description: "Kabir Das's review from Apr 29 is awaiting your reply",
    time: '2 days ago',
    unread: false,
    iconGlyph: 'message-text-outline',
    iconColor: '#D97706',
    actionText: 'Reply \u2192',
  },
  {
    id: 10,
    category: 'milestone',
    title: 'Milestone: 140 Sessions!',
    description: 'You completed 140 sessions. +100 credits awarded!',
    time: '3 days ago',
    unread: false,
    iconGlyph: 'trophy-outline',
    iconColor: '#EAB308',
    actionText: 'View Wallet \u2192',
  },
];

interface NotificationsPanelProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

export function NotificationsPanel({ onClose, onOpenSettings }: NotificationsPanelProps) {
  const toast = useToast();
  const [list, setList] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'booking' | 'review' | 'payment'>('all');

  const unreadCount = useMemo(() => list.filter((n) => n.unread).length, [list]);

  const handleDismiss = (id: number) => {
    setList((prev) => prev.filter((item) => item.id !== id));
    toast.info('Notification dismissed', 'Item removed from notifications.');
  };

  const handleMarkAllRead = () => {
    setList((prev) => prev.map((item) => ({ ...item, unread: false })));
    toast.success('Success', 'All notifications marked as read.');
  };

  const handleAction = (item: NotificationItem) => {
    if (item.category === 'connection') {
      toast.success('Connection Accepted', 'You are now connected with Dev Anand.');
      setList((prev) => prev.filter((i) => i.id !== item.id));
      return;
    }
    setList((prev) => prev.map((i) => (i.id === item.id ? { ...i, unread: false } : i)));
    toast.info('Action Triggered', `Opening details for: ${item.title}`);
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
            <View key={item.id} style={[s.card, item.unread && s.cardUnread]}>
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
            </View>
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
