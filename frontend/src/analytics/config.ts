/**
 * frontend/src/analytics/config.ts
 *
 * Configuration and env bindings for the analytics layer.
 */

export const CONFIG = {
  enabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== '0',
  isDev: process.env.NODE_ENV !== 'production',
  appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-GTPG1F884T',
  },
  posthog: {
    apiKey: process.env.EXPO_PUBLIC_POSTHOG_KEY || 'phc_ubQxwhfxGuzrEu5trKWiMgtADhR2RYKgZxT3SceDdWJG',
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  },
  sampling: {
    api_call: 0.1,
    list_interaction: 0.1,
    session_replay: 0.2,
  },
  queue: {
    maxBatchSize: 10,
    flushIntervalMs: 5000,
  },
};

/**
 * Priority 20-key envelope list for Firebase's 25-parameter restriction per event.
 */
export const FIREBASE_PRIORITY_KEYS = [
  'element_id',
  'element_type',
  'element_label',
  'screen',
  'screen_path',
  'surface',
  'area',
  'session_id',
  'platform',
  'app_version',
  'viewport_w',
  'viewport_h',
  'breakpoint',
  'user_role',
  'is_authenticated',
  'org_id',
  'flow_id',
  'flow_step_index',
  'latency_ms',
  'result',
] as const;
