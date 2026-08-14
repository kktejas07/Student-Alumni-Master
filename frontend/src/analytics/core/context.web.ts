/**
 * frontend/src/analytics/core/context.web.ts
 *
 * Web platform implementation of session, device, viewport, and user context.
 */

import { CONFIG } from '../config';
import { PropertyEnvelope } from '../types';

let currentSessionId: string | null = null;
let currentScreen = 'root';
let currentScreenPath = '/';
let previousScreen = '';
let userRole = 'guest';
let isAuthenticated = false;
let orgId = '';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = generateUUID();
  }
  return currentSessionId;
}

export function resetSessionId(): string {
  currentSessionId = generateUUID();
  return currentSessionId;
}

/** SHA-256 Hashing helper for user ID privacy. */
export async function hashUserId(userId: string): Promise<string> {
  if (!userId) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(userId);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      /* fallback */
    }
  }
  // Simple fallback hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(16);
}

export function getBreakpoint(width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  return 'xl';
}

export function updateScreenContext(screenName: string, path?: string) {
  previousScreen = currentScreen;
  currentScreen = screenName;
  if (path) currentScreenPath = path;
}

export function updateUserContext(role: string, authState: boolean, organizationId?: string) {
  userRole = role;
  isAuthenticated = authState;
  if (organizationId) orgId = organizationId;
}

export function buildStandardEnvelope(): PropertyEnvelope {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const height = typeof window !== 'undefined' ? window.innerHeight : 768;

  return {
    session_id: getSessionId(),
    platform: 'web',
    app_version: CONFIG.appVersion,
    screen: currentScreen,
    screen_path: currentScreenPath,
    previous_screen: previousScreen,
    viewport_w: width,
    viewport_h: height,
    breakpoint: getBreakpoint(width),
    orientation: width >= height ? 'landscape' : 'portrait',
    theme: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    locale: typeof navigator !== 'undefined' ? navigator.language : 'en-IN',
    user_role: userRole,
    is_authenticated: isAuthenticated,
    org_id: orgId || undefined,
    timestamp_ms: Date.now(),
  };
}
