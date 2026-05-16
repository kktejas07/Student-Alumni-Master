// @ts-nocheck
/**
 * Agent K — client-side store.
 *
 * Tracks:
 *   • activeRun         — id of a run currently executing (for sidebar progress hint)
 *   • quickLauncherOpen — whether the Cmd/Ctrl+K modal is visible
 *   • runs cache        — list of past runs (loaded on demand)
 *
 * Also wires the Cmd/Ctrl+K global shortcut on web to open the modal.
 */
import { create } from 'zustand';
import { Platform } from 'react-native';
import { request } from '@/src/models/services/api';

type RunListItem = {
  id: string;
  prompt: string;
  status: string;
  summary?: string | null;
  steps_n?: number;
  started_at: string;
  result_summary?: string | null;
};

type AgentKStore = {
  activeRun: string | null;
  quickLauncherOpen: boolean;
  runs: RunListItem[];
  setActiveRun: (id: string | null) => void;
  openQuickLauncher: () => void;
  closeQuickLauncher: () => void;
  fetchRuns: () => Promise<void>;
};

export const useAgentKStore = create<AgentKStore>((set, get) => ({
  activeRun: null,
  quickLauncherOpen: false,
  runs: [],
  setActiveRun: (id) => set({ activeRun: id }),
  openQuickLauncher: () => set({ quickLauncherOpen: true }),
  closeQuickLauncher: () => set({ quickLauncherOpen: false }),
  fetchRuns: async () => {
    try {
      const r = await request('/agent-k/runs?limit=20');
      if (r && Array.isArray(r.runs)) set({ runs: r.runs });
    } catch {/* ignore */}
  },
}));

// Cmd/Ctrl+K opens the quick launcher (intentionally shadows the
// default command palette — Agent K IS the command palette here).
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: any) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      useAgentKStore.getState().openQuickLauncher();
    }
    if (e.key === 'Escape') {
      useAgentKStore.getState().closeQuickLauncher();
    }
  });
}
