/**
 * frontend/src/analytics/providers/console.ts
 *
 * Dev-only console logger for local debugging of analytics events.
 */

import { CONFIG } from '../config';
import { UserTraits } from '../types';
import { AnalyticsProvider } from './types';

export const ConsoleProvider: AnalyticsProvider = {
  name: 'console-dev',

  async init(): Promise<void> {
    if (CONFIG.isDev) {
      // eslint-disable-next-line no-console
      console.info('%c Analytics Core Initialized', 'background:#0d9488;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold');
    }
  },

  async logEvent(event: string, params: Record<string, any>): Promise<void> {
    if (!CONFIG.isDev) return;

    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `%canalytics %c${event}`,
      'background:#14b8a6;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
      'color:#888;margin-left:6px'
    );
    // eslint-disable-next-line no-console
    console.log(params);
    // eslint-disable-next-line no-console
    console.groupEnd();
  },

  async setUserId(userId: string): Promise<void> {
    if (!CONFIG.isDev) return;
    // eslint-disable-next-line no-console
    console.log(
      `%canalytics identify %c${userId}`,
      'background:#22c55e;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
      'color:#888;margin-left:6px'
    );
  },

  async setUserProperties(props: UserTraits): Promise<void> {
    if (!CONFIG.isDev) return;
    // eslint-disable-next-line no-console
    console.log(
      '%canalytics user_properties',
      'background:#3b82f6;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold',
      props
    );
  },

  async reset(): Promise<void> {
    if (!CONFIG.isDev) return;
    // eslint-disable-next-line no-console
    console.log(
      '%canalytics reset',
      'background:#ef4444;color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold'
    );
  },
};
