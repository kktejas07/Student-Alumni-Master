import React from 'react';
import { useRouter } from 'expo-router';
import { CC, FONTS } from '../tokens';
import {
  ApiNotificationsPanel,
  type ApiNotif,
  type NotificationsPanelTokens,
} from '../../shared/NotificationsPanel';

interface NotificationsPanelProps {
  onClose: () => void;
  onOpenSettings: () => void;
  onNavigate: (tab: any) => void;
}

const TOKENS: NotificationsPanelTokens = {
  bg: CC.bg,
  border: CC.border,
  accent: CC.primaryL,
  spinner: CC.primary,
  muted: CC.muted,
  dim: CC.dim,
  badge: CC.pink,
  badgeText: CC.pink,
  unreadCardBg: CC.primaryL + '0a',
  unreadCardBorder: CC.primaryL + '40',
  fonts: { title: FONTS.bold, bold: FONTS.bold, medium: FONTS.med },
};

export function CollegeNotificationsPanel({ onClose, onOpenSettings, onNavigate }: NotificationsPanelProps) {
  const router = useRouter();

  const navigate = (item: ApiNotif, lowerType: string) => {
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
  };

  return (
    <ApiNotificationsPanel
      tokens={TOKENS}
      onClose={onClose}
      onOpenSettings={onOpenSettings}
      navigate={navigate}
      eventIconColor="#8B5CF6"
    />
  );
}
