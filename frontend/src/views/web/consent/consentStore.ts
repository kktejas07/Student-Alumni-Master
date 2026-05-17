/**
 * Consent state manager — single source of truth for the privacy/cookie
 * banner across landing + all 5 portals.
 *
 * Persistence model:
 *   • Anonymous users → localStorage key `sa.consent.v1`
 *   • Authenticated users → backend (/api/me/consent) AND localStorage mirror
 *
 * The banner is shown when:
 *   • No record exists, OR
 *   • Record version mismatches CURRENT_VERSION (legal text changed), OR
 *   • Record is older than 13 months (typical GDPR re-prompt cadence).
 */
import { Platform } from 'react-native';
import { request } from '@/src/models/services/api';

export const CONSENT_VERSION = '2026-05-1';
const STORAGE_KEY = 'sa.consent.v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30 * 13; // ≈ 13 months

export type ConsentPrefs = {
  essential: true;            // always true
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
  accepted_all: boolean;
  version: string;
  updated_at: string;         // ISO
};

function nowIso() { return new Date().toISOString(); }

function safeGet(): ConsentPrefs | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ConsentPrefs;
    if (!p || !p.version || !p.updated_at) return null;
    return p;
  } catch { return null; }
}

function safeSet(p: ConsentPrefs) {
  if (Platform.OS !== 'web') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

function safeClear() {
  if (Platform.OS !== 'web') return;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function shouldShowBanner(authToken: string | null): boolean {
  if (Platform.OS !== 'web') return false;
  const p = safeGet();
  if (!p) return true;
  if (p.version !== CONSENT_VERSION) return true;
  const age = Date.now() - new Date(p.updated_at).getTime();
  if (!isFinite(age) || age > MAX_AGE_MS) return true;
  return false;
}

export function readLocal(): ConsentPrefs | null { return safeGet(); }

/** Persist locally + (if authenticated) sync to backend. Fire-and-forget. */
export async function saveConsent(
  partial: Partial<Pick<ConsentPrefs, 'analytics' | 'functional' | 'marketing' | 'accepted_all'>>,
  isAuthenticated: boolean,
): Promise<ConsentPrefs> {
  const accepted_all = partial.accepted_all === true
    || (!!partial.analytics && !!partial.functional && !!partial.marketing);
  const prefs: ConsentPrefs = {
    essential: true,
    analytics:  !!partial.analytics  || accepted_all,
    functional: !!partial.functional || accepted_all,
    marketing:  !!partial.marketing  || accepted_all,
    accepted_all,
    version: CONSENT_VERSION,
    updated_at: nowIso(),
  };
  safeSet(prefs);

  if (isAuthenticated) {
    // Best-effort backend sync; UI is local-first so we don't block on it
    request('/me/consent', { method: 'PUT', body: prefs }).catch(() => {});
  } else {
    // Anonymous log — needs a stable anon_id
    try {
      let anonId = window.localStorage.getItem('sa.anon_id');
      if (!anonId) {
        anonId = `anon_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
        window.localStorage.setItem('sa.anon_id', anonId);
      }
      request('/anon/consent', { method: 'POST', body: { ...prefs, anon_id: anonId }, auth: false }).catch(() => {});
    } catch {}
  }
  return prefs;
}

export function resetConsentForReplay() { safeClear(); }
