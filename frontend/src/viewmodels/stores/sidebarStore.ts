// @ts-nocheck
/**
 * Sidebar collapse store.
 *
 * Persists the user's collapsed/expanded preference to AsyncStorage and
 * mirrors it to the backend via PATCH /api/user/preferences so the choice
 * follows them across devices. Also exposes a Cmd/Ctrl+B keyboard listener
 * for the desktop web build (no-op on native).
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { request } from '@/src/models/services/api';

type SidebarStore = {
  isCollapsed: boolean;
  isHovered: boolean;        // peek-on-hover when collapsed
  hydrated: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  setHovered: (v: boolean) => void;
  hydrate: () => Promise<void>;
};

const STORAGE_KEY = 'sa_sidebar_collapsed';

export const useSidebarStore = create<SidebarStore>((set, get) => ({
  isCollapsed: false,
  isHovered: false,
  hydrated: false,
  toggle: () => {
    const next = !get().isCollapsed;
    set({ isCollapsed: next });
    persist(next);
  },
  setCollapsed: (v: boolean) => {
    set({ isCollapsed: v });
    persist(v);
  },
  setHovered: (v: boolean) => set({ isHovered: v }),
  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(STORAGE_KEY);
      if (v !== null) set({ isCollapsed: v === 'true' });
    } catch {/* ignore */}
    set({ hydrated: true });
    // Also pull from server (best-effort) — overrides local if present
    try {
      const r = await request('/user/preferences');
      if (r && typeof r.sidebar_collapsed === 'boolean') {
        set({ isCollapsed: r.sidebar_collapsed });
      }
    } catch {/* unauth or offline — keep local value */}
  },
}));

async function persist(v: boolean) {
  try { await AsyncStorage.setItem(STORAGE_KEY, String(v)); } catch {}
  try { await request('/user/preferences', { method: 'PATCH', body: { sidebar_collapsed: v } }); } catch {}
}

// Wire Cmd/Ctrl+B globally on web — toggles sidebar like VS Code / Linear.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: any) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      useSidebarStore.getState().toggle();
    }
  });
}
