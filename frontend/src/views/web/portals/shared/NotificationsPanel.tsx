/**
 * Shared notifications drawer used by the student, college and mentor portals.
 *
 * Two layers:
 *
 *  - `NotificationsPanelShell` — pure presentation (header, filter tabs,
 *    notification cards, footer). It takes already-mapped `items` plus a
 *    `tokens` object for the portal's colour/typography identity.
 *
 *  - `ApiNotificationsPanel` — self-loading panel built on the shell. It
 *    fetches from `api.notifications()`, handles dismiss / mark-all-read, and
 *    delegates per-type navigation to the `navigate` prop. Student and college
 *    portals wrap this with their own tokens and navigation.
 *
 * The mentor portal receives notifications from its parent and maps them
 * itself, so it uses `NotificationsPanelShell` directly.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';

/* ─────────────────────────────────────────────────────────────────
 * Tokens
 * ───────────────────────────────────────────────────────────────── */
export type NotificationsPanelTokens = {
  /** Drawer background. */
  bg: string;
  border: string;
  /** Portal accent used for active tab, action button, unread dot. */
  accent: string;
  /** Spinner colour while loading. */
  spinner: string;
  muted: string;
  dim: string;
  /** Unread badge tint (border/background derive from it). */
  badge: string;
  /** Unread badge text colour. */
  badgeText: string;
  /** Unread card background / border. */
  unreadCardBg: string;
  unreadCardBorder: string;
  fonts: {
    /** Drawer title. */
    title: string;
    bold: string;
    medium: string;
  };
};

export type NotificationsPanelItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  iconGlyph: string;
  iconColor: string;
  actionText: string;
};

export type NotificationsFilter<K extends string = string> = { key: K; label: string };

export interface NotificationsPanelShellProps<K extends string = string> {
  tokens: NotificationsPanelTokens;
  onClose: () => void;
  onOpenSettings: () => void;
  onMarkAllRead: () => void;
  filters: Array<NotificationsFilter<K>>;
  activeFilter: K;
  onFilterChange: (key: K) => void;
  unreadCount: number;
  items: NotificationsPanelItem[];
  loading?: boolean;
  onAction: (item: NotificationsPanelItem) => void;
  onDismiss: (id: string) => void;
}

/* ─────────────────────────────────────────────────────────────────
 * Shell — pure presentation
 * ───────────────────────────────────────────────────────────────── */
export function NotificationsPanelShell<K extends string = string>({
  tokens, onClose, onOpenSettings, onMarkAllRead,
  filters, activeFilter, onFilterChange,
  unreadCount, items, loading = false, onAction, onDismiss,
}: NotificationsPanelShellProps<K>) {
  const s = useMemo(() => makeStyles(tokens), [tokens]);

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
          <Pressable onPress={onMarkAllRead} style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}>
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
          {filters.map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onFilterChange(tab.key)}
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
          <ActivityIndicator color={tokens.spinner} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <View style={s.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={24} color={tokens.dim} />
              <Text style={s.emptyStateText}>No notifications found</Text>
            </View>
          ) : (
            items.map((item) => (
              <Pressable key={item.id} style={[s.card, item.unread && s.cardUnread]} onPress={() => onAction(item)}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Icon Outline Box */}
                  <View style={[s.iconBox, { borderColor: item.iconColor + '30', backgroundColor: item.iconColor + '10' }]}>
                    <MaterialCommunityIcons name={item.iconGlyph as any} size={18} color={item.iconColor} />
                  </View>

                  {/* Detail column */}
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.cardTime}>{item.time}</Text>
                        {item.unread && <View style={s.unreadDot} />}
                      </View>
                    </View>
                    <Text style={s.cardDesc}>{item.description}</Text>

                    {/* Buttons */}
                    <View style={s.cardActions}>
                      <Pressable onPress={() => onAction(item)} style={s.actionBtn}>
                        <Text style={s.actionBtnText}>{item.actionText}</Text>
                      </Pressable>
                      <Pressable onPress={() => onDismiss(item.id)} style={s.dismissBtn}>
                        <Text style={s.dismissBtnText}>Dismiss</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Footer */}
      <View style={s.footer}>
        <Pressable onPress={onOpenSettings} style={s.settingsBtn}>
          <MaterialCommunityIcons name="cog-outline" size={14} color={tokens.muted} />
          <Text style={s.settingsBtnText}>Notification Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * API-backed panel (student / college)
 * ───────────────────────────────────────────────────────────────── */
export interface ApiNotif {
  id: string;
  title: string;
  message: string;
  type?: string;        // booking_request | booking_confirmed | review | event | system
  read?: boolean;
  created_at?: string;
  booking_id?: string;
  data?: Record<string, any>;
}

export type ApiNotificationsFilterKey = 'all' | 'unread' | 'booking' | 'review' | 'event';

export interface ApiNotificationsPanelProps {
  tokens: NotificationsPanelTokens;
  onClose: () => void;
  onOpenSettings: () => void;
  /**
   * Portal-specific navigation after a notification is actioned.
   * `lowerType` is the lower-cased notification type.
   */
  navigate: (item: ApiNotif, lowerType: string) => void;
  /** Icon colour for `event` notifications (differs slightly per portal). */
  eventIconColor?: string;
}

const API_FILTERS: Array<NotificationsFilter<ApiNotificationsFilterKey>> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'booking', label: 'Booking' },
  { key: 'review', label: 'Review' },
  { key: 'event', label: 'Event' },
];

export function ApiNotificationsPanel({
  tokens, onClose, onOpenSettings, navigate, eventIconColor = '#6366F1',
}: ApiNotificationsPanelProps) {
  const toast = useToast();

  const [list, setList] = useState<ApiNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ApiNotificationsFilterKey>('all');

  const load = useCallback(async () => {
    try {
      const r = await api.notifications();
      const items: ApiNotif[] = (r.notifications || r.items || []) as ApiNotif[];
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

  const handleAction = async (item: ApiNotif) => {
    try {
      await api.dismissNotifications([item.id]);
    } catch (e) {}

    // Make notification disappear from the list
    setList((prev) => prev.filter((i) => i.id !== item.id));

    navigate(item, (item.type || '').toLowerCase());
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

  const filters = useMemo(() => API_FILTERS.map((f) => (
    f.key === 'unread'
      ? { ...f, label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` }
      : f
  )), [unreadCount]);

  const items = useMemo<NotificationsPanelItem[]>(() => filteredList.map((item) => {
    const { glyph, color } = iconForType(item.type, eventIconColor);
    return {
      id: item.id,
      title: item.title,
      description: item.message,
      time: formatRelative(item.created_at),
      unread: !item.read,
      iconGlyph: glyph,
      iconColor: color,
      actionText: getActionText(item.type),
    };
  }), [filteredList, eventIconColor]);

  const byId = useMemo(() => new Map(list.map((n) => [n.id, n])), [list]);

  return (
    <NotificationsPanelShell<ApiNotificationsFilterKey>
      tokens={tokens}
      onClose={onClose}
      onOpenSettings={onOpenSettings}
      onMarkAllRead={handleMarkAllRead}
      filters={filters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      unreadCount={unreadCount}
      items={items}
      loading={loading}
      onAction={(it) => { const raw = byId.get(it.id); if (raw) handleAction(raw); }}
      onDismiss={handleDismiss}
    />
  );
}

// ----- helpers -----------------------------------------------------------
export function iconForType(type?: string, eventColor = '#6366F1') {
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
    return { glyph: 'trophy-outline', color: eventColor };
  }
  if (t.startsWith('connection_request') || t.startsWith('connection_pending')) {
    return { glyph: 'account-plus-outline', color: '#EC4899' };
  }
  if (t.startsWith('connection_accepted') || t.startsWith('connection_active')) {
    return { glyph: 'account-check-outline', color: '#10B981' };
  }
  return { glyph: 'bell-outline', color: '#60A5FA' };
}

export function getActionText(type?: string): string {
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

export function formatRelative(iso?: string): string {
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

/* ─────────────────────────────────────────────────────────────────
 * Styles
 * ───────────────────────────────────────────────────────────────── */
function makeStyles(t: NotificationsPanelTokens) {
  return StyleSheet.create({
    drawer: {
      width: 360,
      height: '100%',
      backgroundColor: t.bg,
      borderLeftWidth: 1,
      borderLeftColor: t.border,
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
      fontFamily: t.fonts.title,
      fontSize: 16,
    },
    unreadBadge: {
      backgroundColor: t.badge + '22',
      borderColor: t.badge + '50',
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    unreadBadgeText: {
      color: t.badgeText,
      fontFamily: t.fonts.bold,
      fontSize: 10,
    },
    markReadText: {
      color: t.accent,
      fontFamily: t.fonts.bold,
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
      color: t.muted,
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
      borderColor: t.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      ...({ cursor: 'pointer' } as any),
    },
    tabActive: {
      backgroundColor: t.accent + '14',
      borderColor: t.accent,
    },
    tabText: {
      color: t.muted,
      fontFamily: t.fonts.bold,
      fontSize: 11,
    },
    tabTextActive: {
      color: t.accent,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 8,
    },
    emptyStateText: {
      color: t.dim,
      fontFamily: t.fonts.medium,
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
      backgroundColor: t.unreadCardBg,
      borderColor: t.unreadCardBorder,
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
      fontFamily: t.fonts.bold,
      fontSize: 13,
      flex: 1,
    },
    cardTime: {
      color: t.dim,
      fontFamily: t.fonts.medium,
      fontSize: 10.5,
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: t.accent,
    },
    cardDesc: {
      color: t.muted,
      fontFamily: t.fonts.medium,
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
      borderColor: t.accent + '40',
      backgroundColor: t.accent + '0a',
      ...({ cursor: 'pointer' } as any),
    },
    actionBtnText: {
      color: t.accent,
      fontFamily: t.fonts.bold,
      fontSize: 11,
    },
    dismissBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderColor: t.border,
      borderWidth: 1,
      ...({ cursor: 'pointer' } as any),
    },
    dismissBtnText: {
      color: t.muted,
      fontFamily: t.fonts.medium,
      fontSize: 11,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: t.border,
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
      borderColor: t.border,
      borderWidth: 1,
      ...({ cursor: 'pointer' } as any),
    },
    settingsBtnText: {
      color: t.muted,
      fontFamily: t.fonts.bold,
      fontSize: 12,
    },
  });
}
