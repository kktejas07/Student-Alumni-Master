import React from 'react';
import { useRouter } from 'expo-router';
import { PALETTE, TYPO } from '../tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import {
  ApiNotificationsPanel,
  type ApiNotif,
  type NotificationsPanelTokens,
} from '../../shared/NotificationsPanel';

interface NotificationsPanelProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

const TOKENS: NotificationsPanelTokens = {
  bg: PALETTE.bg1,
  border: PALETTE.glassBorder,
  accent: PALETTE.violetL,
  spinner: PALETTE.violet,
  muted: PALETTE.muted,
  dim: PALETTE.dim,
  badge: PALETTE.rose,
  badgeText: '#FC5C5C',
  unreadCardBg: 'rgba(139, 92, 246, 0.03)',
  unreadCardBorder: 'rgba(139, 92, 246, 0.15)',
  fonts: { title: TYPO.display700, bold: TYPO.body700, medium: TYPO.body500 },
};

export function StudentNotificationsPanel({ onClose, onOpenSettings }: NotificationsPanelProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const navigate = (item: ApiNotif, lowerType: string) => {
    const role = user?.role || 'student';

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
  };

  return (
    <ApiNotificationsPanel
      tokens={TOKENS}
      onClose={onClose}
      onOpenSettings={onOpenSettings}
      navigate={navigate}
      eventIconColor="#6366F1"
    />
  );
}
