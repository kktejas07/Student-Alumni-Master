/**
 * VIEWMODEL LAYER - Auth Store (Zustand)
 * Owns authentication state and exposes actions consumed by Views via hooks.
 */
import { Platform } from 'react-native';
import { create } from 'zustand';
import { api, tokenStore } from '@/src/models/services/api';
import type { User } from '@/src/models/entities';
import { debugLog } from '@/src/utils/debugLog';

function clearBrowserAuthCredentials() {
  const failures: unknown[] = [];
  const authKeys = [
    'token',
    'session',
    'access_token',
    'refresh_token',
    'auth_tokens',
    'scd_access_token',
    'scd_refresh_token',
    'sa_user',
    'sa_user_email',
    'user_email',
  ];

  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[storageName];
      for (const key of authKeys) storage.removeItem(key);
    } catch (error) {
      failures.push(error);
    }
  }

  if (typeof document !== 'undefined') {
    for (const name of authKeys) {
      for (const path of ['/', '/api/auth']) {
        try {
          document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
        } catch (error) {
          failures.push(error);
        }
      }
    }
  }

  if (failures.length) {
    console.error('[AUTH ERROR] Failed to clear some browser auth credentials:', failures);
  }
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<
    { ok: true; user: User }
    | { ok: false; requires_2fa: true; challenge_id: string; user_email: string; methods: string[] }
  >;
  oauthLogin: (provider: 'google' | 'linkedin', payload: { email: string; full_name: string; picture?: string; role?: string }, rememberMe?: boolean) => Promise<User>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    phone?: string;
  }) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh?: string, rememberMe?: boolean) => Promise<void>;
  photoOverride: string | null;
  setPhotoOverride: (photo: string | null) => void;
  // 2FA
  verifyTwoFA: (challenge_id: string, code: string, rememberMe?: boolean) => Promise<User>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,
  photoOverride: null,
  setPhotoOverride: (photoOverride) => set({ photoOverride }),

  init: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      const token = await tokenStore.getAccess();
      if (token) {
        debugLog('[AUTH DEBUG] Access token restored from storage. Fetching profile...');
        const user = await api.me();
        debugLog(`[AUTH DEBUG] Auth initialized. User: ${user?.full_name} (${user?.role})`);
        set({ user, initialized: true, loading: false });
      } else {
        debugLog('[AUTH DEBUG] No stored access token found. Guest mode.');
        set({ initialized: true, loading: false });
      }
    } catch {
      console.warn('[AUTH WARN] Token validation failed on init. Clearing tokens.');
      await tokenStore.clear();
      set({ user: null, initialized: true, loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    debugLog(`[AUTH DEBUG] Attempting login for ${email}...`);
    try {
      const res = await api.login(email, password);
      // 2FA challenge — caller must navigate to /two-fa-challenge
      if (res?.requires_2fa) {
        debugLog(`[AUTH DEBUG] 2FA required for ${email}. Challenge ID: ${res.challenge_id}`);
        set({ loading: false });
        return {
          ok: false,
          requires_2fa: true,
          challenge_id: res.challenge_id,
          user_email: res.user_email,
          methods: res.methods || ['totp'],
        };
      }
      await tokenStore.setTokens(res.access_token, res.refresh_token);
      debugLog(`[AUTH DEBUG] Login successful. Welcome ${res.user?.full_name}!`);
      set({ user: res.user, loading: false });
      return { ok: true, user: res.user };
    } catch (e: any) {
      console.error(`[AUTH ERROR] Login failed for ${email}: ${e.message}`);
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  verifyTwoFA: async (challenge_id, code, rememberMe) => {
    set({ loading: true, error: null });
    try {
      const res = await api.twoFAVerify(challenge_id, code);
      await tokenStore.setTokens(res.access_token, res.refresh_token, rememberMe);
      set({ user: res.user, loading: false });
      return res.user;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  oauthLogin: async (provider, payload, rememberMe) => {
    set({ loading: true, error: null });
    try {
      const res = provider === 'google'
        ? await api.oauthGoogle(payload)
        : await api.oauthLinkedIn(payload);
      await tokenStore.setTokens(res.access_token, res.refresh_token, rememberMe);
      set({ user: res.user, loading: false });
      return res.user;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await api.register(payload);
      await tokenStore.setTokens(res.access_token, res.refresh_token);
      set({ user: res.user, loading: false });
      return res.user;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  refreshUser: async () => {
    try {
      const user = await api.me();
      set({ user });
      return user;
    } catch {
      return null;
    }
  },

  logout: async () => {
    // Snapshot user before clearing so we can fire analytics with role/email_domain
    const u = get().user;
    set({ user: null, loading: false, initialized: true, error: null, photoOverride: null });
    try {
      const analytics = (await import('@/src/lib/analytics')).default;
      analytics.track?.('auth_logout', {
        role: u?.role || null,
        email_domain: u?.email ? u.email.split('@')[1] : null,
      });
      analytics.reset?.();
    } catch {}
    try {
      // Best-effort backend log so logout shows up in auth_events too
      const { trackAuth } = await import('@/src/lib/authAnalytics');
      await trackAuth({
        event: 'session_revoked',
        email: u?.email,
        extra: { reason: 'user_logout' },
      });
    } catch {}
    try {
      await api.logout();
    } catch (error) {
      console.warn('[AUTH WARN] Backend logout request failed; clearing local credentials.', error);
    }
    await tokenStore.clear();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      clearBrowserAuthCredentials();
      window.location.replace('/');
      return;
    }
  },

  setUser: (user) => set({ user }),
  setTokens: async (access, refresh, rememberMe) => {
    await tokenStore.setTokens(access, refresh || '', rememberMe);
  },
}));
