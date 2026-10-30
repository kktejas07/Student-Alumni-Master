/**
 * UserBadgesInline — auto-fetches the current user's badges & renders BadgeStack.
 *
 * Usage: <UserBadgesInline max={3} compact />
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { request } from '@/src/models/services/api';
import { BadgeStack, type Badge } from '@/src/views/web/Badges';

interface Props {
  /** Max badges shown before "+N" overflow (default 3). */
  max?: number;
  /** Smaller chip size. */
  compact?: boolean;
  /** Force refresh on mount. */
  refresh?: boolean;
  /** Fetch badges for an arbitrary user instead of self. */
  userId?: string;
}

export function UserBadgesInline({ max = 3, compact = true, refresh = false, userId }: Props) {
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = userId
          ? `/users/${userId}/badges`
          : refresh ? '/users/me/badges/refresh' : '/users/me/badges';
        const opts: any = userId ? { auth: false } : { method: refresh ? 'POST' : 'GET' };
        const res = await request<{ badges: Badge[] }>(url, opts);
        if (!cancelled) setBadges(res.badges || []);
      } catch {
        if (!cancelled) setBadges([]);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, refresh]);

  if (!badges.length) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <BadgeStack badges={badges} max={max} compact={compact} />
    </View>
  );
}
