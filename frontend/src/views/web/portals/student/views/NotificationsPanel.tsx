import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
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
  type?: string;        // booking_request | booking_confirmed | review | event | system
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
      // sort newest first
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setList(items);
    } catch (e) {
      // swallow
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
    
    // Make notification disappear from the list
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
            { key: 'event', label: 'Event' },
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
      {loading ? (
        <View style={s.loadingState}>
          <ActivityIndicator color={PALETTE.violet} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {filteredList.length === 0 ? (
            <View style={s.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={24} color={PALETTE.dim} />
              <Text style={s.emptyStateText}>No notifications found</Text>
            </View>
          ) : (
            filteredList.map((item) => {
              const { glyph, color } = iconForType(item.type);
              const actionText = getActionText(item.type);
              return (
                <Pressable key={item.id} style={[s.card, !item.read && s.cardUnread]} onPress={() => handleAction(item)}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Icon Outline Box */}
                    <View style={[s.iconBox, { borderColor: color + '30', backgroundColor: color + '10' }]}>
                      <MaterialCommunityIcons name={glyph as any} size={18} color={color} />
                    </View>
                    
                    {/* Detail column */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={s.cardTime}>{formatRelative(item.created_at)}</Text>
                          {!item.read && <View style={s.unreadDot} />}
                        </View>
                      </View>
                      <Text style={s.cardDesc}>{item.message}</Text>
                      
                      {/* Buttons */}
                      <View style={s.cardActions}>
                        <Pressable onPress={() => handleAction(item)} style={s.actionBtn}>
                          <Text style={s.actionBtnText}>{actionText}</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDismiss(item.id)} style={s.dismissBtn}>
                          <Text style={s.dismissBtnText}>Dismiss</Text>
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

      {/* Footer */}
      <View style={s.footer}>
        <Pressable onPress={onOpenSettings} style={s.settingsBtn}>
          <MaterialCommunityIcons name="cog-outline" size={14} color={PALETTE.muted} />
          <Text style={s.settingsBtnText}>Notification Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ----- helpers -----------------------------------------------------------
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

const s = StyleSheet.create({
  drawer: {
    width: 360,
    height: '100%',
    backgroundColor: PALETTE.bg1,
    borderLeftWidth: 1,
    borderLeftColor: PALETTE.glassBorder,
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
    fontFamily: TYPO.display700,
    fontSize: 16,
  },
  unreadBadge: {
    backgroundColor: PALETTE.rose + '22',
    borderColor: PALETTE.rose + '50',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: '#FC5C5C',
    fontFamily: TYPO.body700,
    fontSize: 10,
  },
  markReadText: {
    color: PALETTE.violetL,
    fontFamily: TYPO.body700,
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
    color: PALETTE.muted,
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
    borderColor: PALETTE.glassBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  tabActive: {
    backgroundColor: PALETTE.violetL + '14',
    borderColor: PALETTE.violetL,
  },
  tabText: {
    color: PALETTE.muted,
    fontFamily: TYPO.body700,
    fontSize: 11,
  },
  tabTextActive: {
    color: PALETTE.violetL,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyStateText: {
    color: PALETTE.dim,
    fontFamily: TYPO.body500,
    fontSize: 12,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  cardUnread: {
    backgroundColor: 'rgba(139, 92, 246, 0.03)',
    borderColor: 'rgba(139, 92, 246, 0.15)',
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
    fontFamily: TYPO.body700,
    fontSize: 13,
    flex: 1,
  },
  cardTime: {
    color: PALETTE.dim,
    fontFamily: TYPO.body500,
    fontSize: 10.5,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: PALETTE.violetL,
  },
  cardDesc: {
    color: PALETTE.muted,
    fontFamily: TYPO.body500,
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
    borderColor: PALETTE.violetL + '40',
    backgroundColor: PALETTE.violetL + '0a',
    ...({ cursor: 'pointer' } as any),
  },
  actionBtnText: {
    color: PALETTE.violetL,
    fontFamily: TYPO.body700,
    fontSize: 11,
  },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: PALETTE.glassBorder,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  dismissBtnText: {
    color: PALETTE.muted,
    fontFamily: TYPO.body500,
    fontSize: 11,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: PALETTE.glassBorder,
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
    borderColor: PALETTE.glassBorder,
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any),
  },
  settingsBtnText: {
    color: PALETTE.muted,
    fontFamily: TYPO.body700,
    fontSize: 12,
  },
});
