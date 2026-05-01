/**
 * Auth Analytics Module
 * =====================
 * Unified tracker that fires events to:
 *   1. Backend `/api/auth/track` (persisted in `auth_events` Mongo collection)
 *   2. PostHog (frontend analytics)
 *   3. Firebase Analytics (frontend)
 *
 * Events tracked:
 *   - role_selected             { role }
 *   - email_entered             { email_domain }
 *   - email_check               { email, exists }
 *   - login_attempt             { email }
 *   - login_success             { email, role }
 *   - login_failure             { email, reason }
 *   - password_strength_check   { password_for_strength } -> server returns score
 *   - register_attempt          { email, role }
 *   - register_success          { email, role }
 *   - register_failure          { email, reason }
 *   - otp_sent                  { email }
 *   - otp_verified              { email, success }
 *   - oauth_attempt             { provider }
 *   - oauth_success             { provider, email }
 *   - 2fa_setup_started
 *   - 2fa_setup_complete
 *   - 2fa_challenge_attempt
 *   - 2fa_challenge_success
 *   - session_revoked           { device_id }
 *   - forgot_password_request   { email }
 *   - reset_password_complete   { email }
 */
import analytics from './analytics';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export type AuthEvent =
  | 'role_selected'
  | 'email_entered'
  | 'email_check'
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'password_strength_check'
  | 'register_attempt'
  | 'register_success'
  | 'register_failure'
  | 'otp_sent'
  | 'otp_verified'
  | 'oauth_attempt'
  | 'oauth_success'
  | '2fa_setup_started'
  | '2fa_setup_complete'
  | '2fa_challenge_attempt'
  | '2fa_challenge_success'
  | 'session_revoked'
  | 'forgot_password_request'
  | 'reset_password_complete';

type TrackPayload = {
  event: AuthEvent;
  role?: string;
  email?: string;
  success?: boolean;
  reason?: string;
  extra?: Record<string, any>;
  password_for_strength?: string;
};

export type DeviceInfo = {
  device_id: string;
  os: string;
  browser: string;
  kind: 'mobile' | 'desktop' | 'unknown';
};

let cachedDevice: DeviceInfo | null = null;

/** Track an auth event (fires to backend + analytics). */
export async function trackAuth(payload: TrackPayload): Promise<DeviceInfo | null> {
  // Best-effort PostHog/Firebase event
  try {
    analytics.track?.(`auth_${payload.event}`, {
      role: payload.role,
      success: payload.success,
      reason: payload.reason,
      email_domain: payload.email ? payload.email.split('@')[1] : undefined,
      ...(payload.extra || {}),
    });
  } catch {}

  // Send to backend
  try {
    const res = await fetch(`${BASE}/api/auth/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.device_id && data?.device) {
        cachedDevice = {
          device_id: data.device_id,
          os: data.device?.os || 'Unknown',
          browser: data.device?.browser || 'Unknown',
          kind: data.device?.kind || 'unknown',
        };
        return cachedDevice;
      }
    }
  } catch {}
  return cachedDevice;
}

export async function getDeviceInfo(): Promise<DeviceInfo | null> {
  if (cachedDevice) return cachedDevice;
  return await trackAuth({ event: 'role_selected', extra: { _silent: true } });
}

/** Compute basic password strength client-side (mirrors backend). */
export function passwordStrength(pwd: string): { score: number; label: string; tips: string[] } {
  if (!pwd) return { score: 0, label: 'empty', tips: ['Enter a password'] };
  let score = 0;
  const tips: string[] = [];
  if (pwd.length >= 8) score++; else tips.push('Use at least 8 characters');
  if (pwd.length >= 12) score++; else if (pwd.length >= 8) tips.push('12+ chars is stronger');
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++; else tips.push('Mix upper & lower case');
  if (/\d/.test(pwd) && /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?\/]/.test(pwd)) score++;
  else tips.push('Include a number & symbol');
  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][Math.min(score, 4)];
  return { score, label, tips: tips.slice(0, 2) };
}

export async function fetchSessions(email: string) {
  try {
    const res = await fetch(`${BASE}/api/auth/sessions?email=${encodeURIComponent(email)}`);
    if (res.ok) return res.json();
  } catch {}
  return { items: [] };
}

export async function revokeSession(device_id: string, email: string) {
  try {
    const res = await fetch(`${BASE}/api/auth/sessions/${device_id}/revoke?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    });
    return res.ok;
  } catch {
    return false;
  }
}
