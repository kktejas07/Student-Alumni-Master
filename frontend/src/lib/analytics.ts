/**
 * src/lib/analytics.ts
 * 
 * Single, framework-agnostic analytics layer that fans out to:
 *   • PostHog          — product analytics + session recordings + funnels
 *   • Firebase Analytics — GA4 dashboards + cross-product reporting
 *
 * Design goals:
 *   • Works on React Native Web (Expo). Native (iOS/Android) is a no-op
 *     for the SDK calls themselves but the same `track`/`identify` API
 *     works — events queue and flush silently if SDKs aren't loaded.
 *   • Graceful no-op when env vars are missing so the app never crashes.
 *   • In `__DEV__`, every event is also `console.info`-logged in a
 *     pretty grouped format so you can SEE what's being collected.
 *   • Auto-redacts emails / sensitive PII before sending.
 *
 * Public API:
 *   init()                       — call once at boot (in _layout.tsx)
 *   identify(userId, traits?)    — set user identity after login
 *   reset()                      — clear identity after logout
 *   track(event, props?)         — named event
 *   pageView(name, props?)       — explicit page/screen view
 *   setUserProperty(key, value)  — attach a long-lived user prop
 *
 * Conventions:
 *   Event names: `<domain>_<action>` snake_case   e.g. login_succeeded
 *   Properties:  snake_case keys                  e.g. session_id
 */
import { Platform } from 'react-native';

// ── Types ───────────────────────────────────────────────────────────────────
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

// ── Env config ──────────────────────────────────────────────────────────────
// All EXPO_PUBLIC_* are inlined into the JS bundle by Metro at build time.
const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const POSTHOG_KEY  = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Master switch — turn off all analytics by setting EXPO_PUBLIC_ANALYTICS_ENABLED=0
const ANALYTICS_ENABLED = process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== '0';
const DEV = process.env.NODE_ENV !== 'production';

// ── Internal state ──────────────────────────────────────────────────────────
let firebaseAnalytics: any = null;
let posthog: any = null;
let ready = false;
const queue: Array<() => void> = [];

// ── Helpers ─────────────────────────────────────────────────────────────────
function prettyLog(label: string, payload: any, color = '#14B8A6') {
  if (!DEV || Platform.OS !== 'web') return;
  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `%c✨ analytics %c${label}`,
    `background:${color};color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold`,
    'color:#888;margin-left:6px',
  );
  // eslint-disable-next-line no-console
  console.log(payload);
  // eslint-disable-next-line no-console
  console.groupEnd();
}

/** Light PII redaction — never send full email or password fields by accident. */
function redact(props?: EventProps): EventProps | undefined {
  if (!props) return props;
  const out: EventProps = { ...props };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'string' && v.includes('@')) {
      // Hash email-ish strings: "foo@bar.com" → "f***@bar.com"
      const [u, d] = v.split('@');
      out[k] = (u?.[0] || '') + '***@' + (d || '');
    }
    if (k.toLowerCase().includes('password') || k.toLowerCase() === 'token') {
      out[k] = '[redacted]';
    }
  }
  return out;
}

function flushQueue() {
  while (queue.length) {
    const fn = queue.shift();
    try { fn?.(); } catch (e) { /* swallow */ }
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Initialize SDKs once on app boot. Safe to call multiple times. */
export async function init() {
  if (ready) return;
  if (!ANALYTICS_ENABLED) {
    if (DEV) prettyLog('disabled', 'EXPO_PUBLIC_ANALYTICS_ENABLED=0', '#9CA3AF');
    ready = true; return;
  }
  if (Platform.OS !== 'web') {
    // Native: SDKs would require native modules / EAS dev build.
    // For Expo Go we no-op cleanly (and queue events for the WebView portal).
    ready = true; flushQueue(); return;
  }

  // Firebase Analytics (web SDK v9 modular)
  if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.measurementId) {
    try {
      const { initializeApp } = await import('firebase/app');
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      if (await isSupported()) {
        const fbApp = initializeApp(FIREBASE_CONFIG as any);
        firebaseAnalytics = getAnalytics(fbApp);
        if (DEV) prettyLog('firebase ready', { projectId: FIREBASE_CONFIG.projectId, measurementId: FIREBASE_CONFIG.measurementId }, '#F59E0B');
      }
    } catch (e: any) {
      if (DEV) prettyLog('firebase init failed', e?.message || e, '#EF4444');
    }
  } else if (DEV) {
    prettyLog('firebase skipped', 'Set EXPO_PUBLIC_FIREBASE_* env vars to enable', '#9CA3AF');
  }

  // PostHog
  if (POSTHOG_KEY) {
    try {
      const { default: PostHog } = await import('posthog-js');
      PostHog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,         // auto-track all clicks
        session_recording: { maskAllInputs: true },
        loaded: () => {
          posthog = PostHog;
          if (DEV) prettyLog('posthog ready', { host: POSTHOG_HOST }, '#7B3DBF');
          flushQueue();
        },
      });
      posthog = PostHog; // also set immediately so queued events go through
    } catch (e: any) {
      if (DEV) prettyLog('posthog init failed', e?.message || e, '#EF4444');
    }
  } else if (DEV) {
    prettyLog('posthog skipped', 'Set EXPO_PUBLIC_POSTHOG_KEY to enable session recordings + product analytics', '#9CA3AF');
  }

  ready = true;
  flushQueue();
}

/** Set who the current user is. Call after successful login. */
export function identify(userId: string, traits?: UserTraits) {
  const fn = () => {
    const safeTraits = redact(traits as EventProps);
    if (DEV) prettyLog('identify', { userId, traits: safeTraits }, '#22C55E');
    try { posthog?.identify(userId, safeTraits); } catch {}
    // Firebase: setUserId + setUserProperties
    try {
      if (firebaseAnalytics) {
        const { setUserId, setUserProperties } = require('firebase/analytics');
        setUserId(firebaseAnalytics, userId);
        if (safeTraits) {
          // FB user properties must be primitive strings/numbers, max 24 chars on key
          const flat: Record<string, string | number> = {};
          for (const [k, v] of Object.entries(safeTraits)) {
            if (v == null) continue;
            const key = k.slice(0, 24);
            flat[key] = typeof v === 'object' ? JSON.stringify(v).slice(0, 36) : (v as any);
          }
          setUserProperties(firebaseAnalytics, flat as any);
        }
      }
    } catch {}
  };
  ready ? fn() : queue.push(fn);
}

/** Clear identity — call on logout. */
export function reset() {
  const fn = () => {
    if (DEV) prettyLog('reset', 'identity cleared', '#EF4444');
    try { posthog?.reset(); } catch {}
  };
  ready ? fn() : queue.push(fn);
}

/** Track an arbitrary named event. */
export function track(event: string, props?: EventProps) {
  const fn = () => {
    const safe = redact(props);
    if (DEV) prettyLog(event, safe || {}, '#14B8A6');
    try { posthog?.capture(event, safe); } catch {}
    try {
      if (firebaseAnalytics) {
        const { logEvent } = require('firebase/analytics');
        logEvent(firebaseAnalytics, event, safe || {});
      }
    } catch {}
  };
  ready ? fn() : queue.push(fn);
}

/** Track an explicit page/screen view. PostHog does this automatically on web,
 *  but we still call it so Firebase + our debug log both see it. */
export function pageView(name: string, props?: EventProps) {
  track('page_view', { page: name, ...(props || {}) });
}

export function setUserProperty(key: string, value: string | number | boolean) {
  const fn = () => {
    if (DEV) prettyLog('user_property', { [key]: value }, '#3B82F6');
    try { posthog?.people?.set({ [key]: value }); } catch {}
    try {
      if (firebaseAnalytics) {
        const { setUserProperties } = require('firebase/analytics');
        setUserProperties(firebaseAnalytics, { [key]: value });
      }
    } catch {}
  };
  ready ? fn() : queue.push(fn);
}

/** Default export bundles the API for ergonomic imports:
 *    import analytics from '@/src/lib/analytics';
 *    analytics.track('login_succeeded', { role: 'mentor' });
 */
export default { init, identify, reset, track, pageView, setUserProperty };
