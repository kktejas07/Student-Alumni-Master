/**
 * frontend/src/analytics/providers/posthog.web.ts
 *
 * PostHog Analytics Web Provider (posthog-js).
 */

import { CONFIG } from '../config';
import { UserTraits } from '../types';
import { AnalyticsProvider } from './types';

let posthogInstance: any = null;

export const PostHogWebProvider: AnalyticsProvider = {
  name: 'posthog-web',

  async init(): Promise<void> {
    if (!CONFIG.enabled || !CONFIG.posthog.apiKey) {
      return;
    }

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        posthogInstance = (window as any).posthog;
        if (CONFIG.isDev) {
          // eslint-disable-next-line no-console
          console.info('[PostHog Provider] Connected to window.posthog script');
        }
        return;
      }

      const { default: PostHog } = await import('posthog-js');

      PostHog.init(CONFIG.posthog.apiKey, {
        api_host: CONFIG.posthog.host,
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
        autocapture: true,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-ph-mask]',
        },
        loaded: (ph: any) => {
          posthogInstance = ph;
          if (CONFIG.isDev) {
            // eslint-disable-next-line no-console
            console.info('[PostHog Provider] Web SDK loaded & ready');
          }
        },
      });

      posthogInstance = PostHog;
    } catch (e: any) {
      if (CONFIG.isDev) {
        // eslint-disable-next-line no-console
        console.warn('[PostHog Provider] Web init failed:', e?.message || e);
      }
    }
  },

  async logEvent(event: string, params: Record<string, any>): Promise<void> {
    if (!posthogInstance) return;

    try {
      // Ensure custom parameters do not start with reserved '$'
      const cleanParams: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        const safeKey = key.startsWith('$') ? key.slice(1) : key;
        cleanParams[safeKey] = value;
      }

      posthogInstance.capture(event, cleanParams);
    } catch (e: any) {
      if (CONFIG.isDev) {
        // eslint-disable-next-line no-console
        console.warn(`[PostHog Provider] logEvent failed for ${event}:`, e?.message || e);
      }
    }
  },

  async setUserId(userId: string): Promise<void> {
    if (!posthogInstance) return;
    try {
      posthogInstance.identify(userId);
    } catch {
      /* swallow */
    }
  },

  async setUserProperties(props: UserTraits): Promise<void> {
    if (!posthogInstance) return;
    try {
      const { signup_source, cohort_year, ...rest } = props;
      const setObj: Record<string, any> = { ...rest };
      const setOnceObj: Record<string, any> = {};

      if (signup_source !== undefined) setOnceObj.signup_source = signup_source;
      if (cohort_year !== undefined) setOnceObj.cohort_year = cohort_year;

      posthogInstance.people.set(setObj);
      if (Object.keys(setOnceObj).length > 0) {
        posthogInstance.people.set_once(setOnceObj);
      }
    } catch {
      /* swallow */
    }
  },

  async reset(): Promise<void> {
    if (!posthogInstance) return;
    try {
      posthogInstance.reset();
    } catch {
      /* swallow */
    }
  },
};

/** Helper to associate user with group (e.g. college org) */
export function setPostHogGroup(groupType: string, groupKey: string, groupProperties?: Record<string, any>) {
  if (posthogInstance && typeof posthogInstance.group === 'function') {
    try {
      posthogInstance.group(groupType, groupKey, groupProperties);
    } catch {
      /* swallow */
    }
  }
}

/** Helper for feature flags */
export function getPostHogFeatureFlag(flagKey: string): boolean | string | undefined {
  if (posthogInstance && typeof posthogInstance.getFeatureFlag === 'function') {
    try {
      return posthogInstance.getFeatureFlag(flagKey);
    } catch {
      /* swallow */
    }
  }
  return undefined;
}
