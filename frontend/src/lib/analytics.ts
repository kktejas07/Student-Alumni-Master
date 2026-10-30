/**
 * frontend/src/lib/analytics.ts
 *
 * Backwards-compatibility wrapper deferring all analytics tracking
 * to the unified analytics package at @/src/analytics.
 */

import analytics, {
  identify as unifiedIdentify,
  reset as unifiedReset,
  setUserProperties as unifiedSetUserProperties,
  track as unifiedTrack,
} from '../analytics';

export type EventProps = Record<string, string | number | boolean | null | undefined>;

export interface UserTraits {
  email?: string;
  full_name?: string;
  role?: string;
  college?: string;
  batch?: number;
  onboarding_completed?: boolean;
  signup_date?: string;
  [key: string]: any;
}

export async function init() {
  // Handled automatically by AnalyticsRoot / dispatcher
}

export function identify(userId: string, traits?: UserTraits) {
  unifiedIdentify(userId, traits as any);
}

export function reset() {
  unifiedReset();
}

export function track(event: string, props?: EventProps) {
  unifiedTrack(event, props || {});
}

export function pageView(name: string, props?: EventProps) {
  unifiedTrack('screen_view', { page: name, ...(props || {}) });
}

export function setUserProperty(key: string, value: string | number | boolean) {
  unifiedSetUserProperties({ [key]: value });
}

export default {
  init,
  identify,
  reset,
  track,
  pageView,
  setUserProperty,
};
