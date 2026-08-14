/**
 * frontend/src/analytics/providers/posthog.native.ts
 *
 * PostHog Analytics Native Provider Stub (posthog-react-native).
 * Phase 2 will fill native bodies.
 */

import { UserTraits } from '../types';
import { AnalyticsProvider } from './types';

export const PostHogNativeProvider: AnalyticsProvider = {
  name: 'posthog-native',

  async init(): Promise<void> {
    throw new Error('NotImplementedYet: posthog.native.init');
  },

  async logEvent(event: string, params: Record<string, any>): Promise<void> {
    throw new Error('NotImplementedYet: posthog.native.logEvent');
  },

  async setUserId(userId: string): Promise<void> {
    throw new Error('NotImplementedYet: posthog.native.setUserId');
  },

  async setUserProperties(props: UserTraits): Promise<void> {
    throw new Error('NotImplementedYet: posthog.native.setUserProperties');
  },

  async reset(): Promise<void> {
    throw new Error('NotImplementedYet: posthog.native.reset');
  },
};

export function setPostHogGroup(groupType: string, groupKey: string, groupProperties?: Record<string, any>) {
  throw new Error('NotImplementedYet: posthog.native.setPostHogGroup');
}

export function getPostHogFeatureFlag(flagKey: string): boolean | string | undefined {
  throw new Error('NotImplementedYet: posthog.native.getPostHogFeatureFlag');
}
