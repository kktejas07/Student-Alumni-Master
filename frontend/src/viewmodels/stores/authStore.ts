/**
 * VIEWMODEL LAYER - Auth Store (Zustand)
 * Owns authentication state and exposes actions consumed by Views via hooks.
 */
import { create } from 'zustand';
import { api, tokenStore } from '@/src/models/services/api';
import type { User } from '@/src/models/entities';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<
    { ok: true; user: User }
    | { ok: false; requires_2fa: true; challenge_id: string; user_email: string; methods: string[] }
  >;
  oauthLogin: (provider: 'google' | 'linkedin', payload: { email: string; full_name: string; picture?: string; role?: string }) => Promise<User>;
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
  setTokens: (access: string, refresh?: string) => Promise<void>;
  // 2FA
  verifyTwoFA: (challenge_id: string, code: string) => Promise<User>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  error: null,

  init: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      const token = await tokenStore.getAccess();
      if (token) {
        const user = await api.me();
        set({ user, initialized: true, loading: false });
      } else {
        set({ initialized: true, loading: false });
      }
    } catch {
      await tokenStore.clear();
      set({ user: null, initialized: true, loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login(email, password);
      // 2FA challenge — caller must navigate to /two-fa-challenge
      if (res?.requires_2fa) {
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
      set({ user: res.user, loading: false });
      return { ok: true, user: res.user };
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  verifyTwoFA: async (challenge_id, code) => {
    set({ loading: true, error: null });
    try {
      const res = await api.twoFAVerify(challenge_id, code);
      await tokenStore.setTokens(res.access_token, res.refresh_token);
      set({ user: res.user, loading: false });
      return res.user;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  oauthLogin: async (provider, payload) => {
    set({ loading: true, error: null });
    try {
      const res = provider === 'google'
        ? await api.oauthGoogle(payload)
        : await api.oauthLinkedIn(payload);
      await tokenStore.setTokens(res.access_token, res.refresh_token);
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
    await tokenStore.clear();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
  setTokens: async (access, refresh) => {
    await tokenStore.setTokens(access, refresh || '');
  },
}));
