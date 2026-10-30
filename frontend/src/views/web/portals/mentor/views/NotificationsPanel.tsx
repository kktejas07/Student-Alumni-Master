import React, { useState, useMemo } from 'react';
import { MC, FONTS } from '../tokens';
import { useToast } from '@/src/views/components';
import { request } from '@/src/models/services/api';
import { NavId } from '../nav';
import {
  NotificationsPanelShell,
  type NotificationsPanelItem,
  type NotificationsPanelTokens,
} from '../../shared/NotificationsPanel';

interface NotificationItem extends NotificationsPanelItem {
  category: 'booking' | 'review' | 'payment' | 'message' | 'connection' | 'report' | 'milestone';
}

type FilterKey = 'all' | 'unread' | 'booking' | 'review' | 'payment';

const TOKENS: NotificationsPanelTokens = {
  bg: MC.card,
  border: MC.border,
  accent: MC.tealP,
  spinner: MC.tealP,
  muted: MC.muted,
  dim: MC.dim,
  badge: MC.red,
  badgeText: '#FC5C5C',
  unreadCardBg: 'rgba(20, 184, 166, 0.03)',
  unreadCardBorder: 'rgba(20, 184, 166, 0.15)',
  fonts: { title: FONTS.xbold, bold: FONTS.bold, medium: FONTS.med },
};

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
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
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

  const filters = useMemo<Array<{ key: FilterKey; label: string }>>(() => [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { key: 'booking', label: 'Booking' },
    { key: 'review', label: 'Review' },
    { key: 'payment', label: 'Payment' },
  ], [unreadCount]);

  const byId = useMemo(() => new Map(list.map((n) => [n.id, n])), [list]);

  return (
    <NotificationsPanelShell<FilterKey>
      tokens={TOKENS}
      onClose={onClose}
      onOpenSettings={onOpenSettings}
      onMarkAllRead={handleMarkAllRead}
      filters={filters}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      unreadCount={unreadCount}
      items={filteredList}
      onAction={(it) => { const full = byId.get(it.id); if (full) handleAction(full); }}
      onDismiss={handleDismiss}
    />
  );
}
