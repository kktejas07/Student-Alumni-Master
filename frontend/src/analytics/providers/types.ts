/**
 * frontend/src/analytics/providers/types.ts
 *
 * Provider interface contract for vendor implementations (Firebase, PostHog, Console).
 */

import { UserTraits } from '../types';

export interface AnalyticsProvider {
  name: string;
  init(): Promise<void>;
  logEvent(event: string, params: Record<string, any>): Promise<void>;
  setUserId(userId: string): Promise<void>;
  setUserProperties(props: UserTraits): Promise<void>;
  reset(): Promise<void>;
}
