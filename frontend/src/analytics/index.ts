/**
 * frontend/src/analytics/index.ts
 *
 * Public API for StudentAlumni.ai Unified Analytics.
 * Single call-site for tracking events, user identification, components, and hooks.
 */

import { EVENTS } from './constants/events';
import { ANALYTICS_IDS } from './constants/ids';
import { dispatcher } from './core/dispatcher';
import { AnalyticsEvent, ElementId, Primitive, UserTraits } from './types';

// Export constants & registry
export { EVENTS, ANALYTICS_IDS };

// Export types
export * from './types';

// Export components
export { AnalyticsRoot } from './components/AnalyticsRoot';
export { Trackable } from './components/Trackable';
export { TrackedCard } from './components/TrackedCard';
export { TrackedPressable } from './components/TrackedPressable';
export { TrackedText } from './components/TrackedText';

// Export hooks
export { useFlow } from './hooks/useFlow';
export { useFormAnalytics } from './hooks/useFormAnalytics';
export { useImpression } from './hooks/useImpression';
export { useListAnalytics } from './hooks/useListAnalytics';
export { useScreenAnalytics } from './hooks/useScreenAnalytics';
export { useTrackedPress } from './hooks/useTrackedPress';

// Public API Functions

export function track(event: AnalyticsEvent | string, props?: Record<string, Primitive>): void {
  dispatcher.track(event, props || {}).catch(() => {});
}

export function trackClick(id: ElementId | string, props?: Record<string, Primitive>): void {
  dispatcher.track(EVENTS.ELEMENT_CLICK, { element_id: id, ...(props || {}) }).catch(() => {});
}

export function trackImpression(id: ElementId | string, props?: Record<string, Primitive>): void {
  dispatcher
    .track(EVENTS.ELEMENT_IMPRESSION, { element_id: id, ...(props || {}) })
    .catch(() => {});
}

export function trackScreen(name: string, props?: Record<string, Primitive>): void {
  dispatcher.track(EVENTS.SCREEN_VIEW, { screen_name: name, ...(props || {}) }).catch(() => {});
}

export function identify(userId: string, traits?: UserTraits): void {
  dispatcher.identify(userId, traits).catch(() => {});
}

export function setUserProperties(props: UserTraits): void {
  dispatcher.setUserProperties(props).catch(() => {});
}

export function reset(): void {
  dispatcher.reset().catch(() => {});
}

export async function flush(): Promise<void> {
  await dispatcher.flush();
}

export default {
  track,
  trackClick,
  trackImpression,
  trackScreen,
  identify,
  setUserProperties,
  reset,
  flush,
  EVENTS,
  ANALYTICS_IDS,
};
