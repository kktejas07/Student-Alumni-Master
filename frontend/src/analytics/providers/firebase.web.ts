/**
 * frontend/src/analytics/providers/firebase.web.ts
 *
 * Firebase Analytics Web Provider (Modular SDK v9/v10+).
 */

import { CONFIG, FIREBASE_PRIORITY_KEYS } from '../config';
import { UserTraits } from '../types';
import { AnalyticsProvider } from './types';

let firebaseAnalyticsInstance: any = null;

export const FirebaseWebProvider: AnalyticsProvider = {
  name: 'firebase-web',

  async init(): Promise<void> {
    if (!CONFIG.enabled || !CONFIG.firebase.apiKey || !CONFIG.firebase.measurementId) {
      return;
    }

    try {
      const { initializeApp } = await import('firebase/app');
      const { getAnalytics, isSupported, setAnalyticsCollectionEnabled } = await import(
        'firebase/analytics'
      );

      if (await isSupported()) {
        const app = initializeApp(CONFIG.firebase as any);
        firebaseAnalyticsInstance = getAnalytics(app);
        // Default collection disabled until consent granted
        setAnalyticsCollectionEnabled(firebaseAnalyticsInstance, true);

        // DebugView check via URL query param (?analytics_debug=1)
        if (typeof window !== 'undefined' && window.location.search.includes('analytics_debug=1')) {
          // eslint-disable-next-line no-console
          console.info('[Firebase] DebugView enabled via URL param ?analytics_debug=1');
        }
      }
    } catch (e: any) {
      if (CONFIG.isDev) {
        // eslint-disable-next-line no-console
        console.warn('[Firebase Provider] Web init failed:', e?.message || e);
      }
    }
  },

  async logEvent(event: string, params: Record<string, any>): Promise<void> {
    if (!firebaseAnalyticsInstance) return;

    try {
      // 1. Sanitize event name
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(event)) {
        if (CONFIG.isDev) {
          // eslint-disable-next-line no-console
          console.warn(`[Firebase Provider] Rejecting invalid event name: "${event}"`);
        }
        return;
      }

      if (event.startsWith('firebase_') || event.startsWith('google_') || event.startsWith('ga_')) {
        if (CONFIG.isDev) {
          // eslint-disable-next-line no-console
          console.warn(`[Firebase Provider] Rejecting reserved event prefix: "${event}"`);
        }
        return;
      }

      // 2. Filter & trim parameters to max 25 using Priority Keys list
      const trimmedParams: Record<string, any> = {};

      // First pick priority keys present in params
      for (const key of FIREBASE_PRIORITY_KEYS) {
        if (params[key] !== undefined && params[key] !== null) {
          trimmedParams[key] = params[key];
        }
      }

      // Fill remaining slots up to 25 from extra params
      for (const [key, value] of Object.entries(params)) {
        if (Object.keys(trimmedParams).length >= 25) break;
        if (trimmedParams[key] === undefined && value !== undefined && value !== null) {
          // Param name length cap (<= 40 chars)
          const paramKey = key.slice(0, 40);
          trimmedParams[paramKey] = value;
        }
      }

      // 3. Format value types (truncate strings to 100, booleans to 1/0)
      const formattedParams: Record<string, any> = {};
      for (const [key, val] of Object.entries(trimmedParams)) {
        if (typeof val === 'boolean') {
          formattedParams[key] = val ? 1 : 0;
        } else if (typeof val === 'string') {
          formattedParams[key] = val.slice(0, 100);
        } else if (typeof val === 'number') {
          formattedParams[key] = val;
        }
      }

      const { logEvent } = await import('firebase/analytics');
      logEvent(firebaseAnalyticsInstance, event, formattedParams);
    } catch (e: any) {
      if (CONFIG.isDev) {
        // eslint-disable-next-line no-console
        console.warn(`[Firebase Provider] logEvent failed for ${event}:`, e?.message || e);
      }
    }
  },

  async setUserId(userId: string): Promise<void> {
    if (!firebaseAnalyticsInstance) return;
    try {
      const { setUserId } = await import('firebase/analytics');
      setUserId(firebaseAnalyticsInstance, userId);
    } catch {
      /* swallow */
    }
  },

  async setUserProperties(props: UserTraits): Promise<void> {
    if (!firebaseAnalyticsInstance) return;
    try {
      const { setUserProperties } = await import('firebase/analytics');
      const formattedProps: Record<string, string | number> = {};

      let count = 0;
      for (const [k, v] of Object.entries(props)) {
        if (count >= 25) break;
        if (v === undefined || v === null) continue;
        const name = k.slice(0, 24);
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
        formattedProps[name] = valStr.slice(0, 36);
        count++;
      }

      setUserProperties(firebaseAnalyticsInstance, formattedProps as any);
    } catch {
      /* swallow */
    }
  },

  async reset(): Promise<void> {
    if (!firebaseAnalyticsInstance) return;
    try {
      const { setUserId } = await import('firebase/analytics');
      setUserId(firebaseAnalyticsInstance, null as any);
    } catch {
      /* swallow */
    }
  },
};
