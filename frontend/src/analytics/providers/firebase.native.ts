/**
 * frontend/src/analytics/providers/firebase.native.ts
 *
 * Firebase Analytics Native Provider Stub (@react-native-firebase/analytics).
 * Phase 2 will fill native bodies.
 */

import { UserTraits } from '../types';
import { AnalyticsProvider } from './types';

export const FirebaseNativeProvider: AnalyticsProvider = {
  name: 'firebase-native',

  async init(): Promise<void> {
    throw new Error('NotImplementedYet: firebase.native.init');
  },

  async logEvent(event: string, params: Record<string, any>): Promise<void> {
    throw new Error('NotImplementedYet: firebase.native.logEvent');
  },

  async setUserId(userId: string): Promise<void> {
    throw new Error('NotImplementedYet: firebase.native.setUserId');
  },

  async setUserProperties(props: UserTraits): Promise<void> {
    throw new Error('NotImplementedYet: firebase.native.setUserProperties');
  },

  async reset(): Promise<void> {
    throw new Error('NotImplementedYet: firebase.native.reset');
  },
};
