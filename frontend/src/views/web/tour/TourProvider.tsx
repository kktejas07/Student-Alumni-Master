/**
 * Tour state — controls which tour (if any) is currently running, the
 * active step index, and persistence to backend + localStorage.
 *
 * Auto-launch logic: when a portal calls `useAutoTour('student')` for the
 * first time and the user has not yet completed the 'student' tour, the
 * tour is started automatically after a short delay (waits for the DOM
 * to settle).
 *
 * Manual replay: `useTour().replay('student')` is called from the Help menu.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { request } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { TOURS, TourKey } from './tours.config';

const LOCAL_KEY = 'sa.tour-status.v1';

type TourStatusMap = Partial<Record<TourKey, {
  completed_at?: string | null;
  skipped?: boolean;
  replays?: number;
  last_step?: number;
}>>;

type Ctx = {
  active: TourKey | null;
  stepIdx: number;
  status: TourStatusMap;
  start: (k: TourKey) => void;
  next: () => void;
  back: () => void;
  skip: () => void;
  complete: () => void;
  replay: (k: TourKey) => void;
  /** Quietly mark this tour seen so it doesn't auto-launch again. */
  markSeen: (k: TourKey) => void;
};

const TourCtx = createContext<Ctx | null>(null);

function loadLocal(): TourStatusMap {
  if (Platform.OS !== 'web') return {};
  try { return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || '{}') || {}; }
  catch { return {}; }
}
function saveLocal(s: TourStatusMap) {
  if (Platform.OS !== 'web') return;
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch {}
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthed = !!user;
  const [active, setActive] = useState<TourKey | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [status, setStatus] = useState<TourStatusMap>(loadLocal());

  /* Hydrate from backend once on login */
  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await request<{ tours: TourStatusMap }>('/me/tour-status');
        if (cancelled || !r?.tours) return;
        const merged = { ...loadLocal(), ...r.tours };
        setStatus(merged);
        saveLocal(merged);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isAuthed]);

  const persist = useCallback(
    (k: TourKey, st: 'completed' | 'skipped' | 'replayed' | 'started', step?: number) => {
      // Update local state immediately
      setStatus((cur) => {
        const prev = cur[k] || {};
        const next: TourStatusMap = {
          ...cur,
          [k]: {
            ...prev,
            completed_at: (st === 'completed' || st === 'skipped') ? new Date().toISOString() : prev.completed_at,
            skipped:  st === 'skipped' ? true : prev.skipped,
            replays:  st === 'replayed' ? (prev.replays || 0) + 1 : prev.replays,
            last_step: step ?? prev.last_step,
          },
        };
        saveLocal(next);
        return next;
      });
      // Best-effort backend sync
      if (isAuthed) {
        request('/me/tour-status', {
          method: 'PATCH',
          body: { tour: k, status: st, step },
        }).catch(() => {});
      }
    },
    [isAuthed],
  );

  const start = useCallback((k: TourKey) => {
    setActive(k);
    setStepIdx(0);
    persist(k, 'started', 0);
  }, [persist]);

  const next = useCallback(() => {
    if (!active) return;
    const steps = TOURS[active].steps;
    if (stepIdx >= steps.length - 1) {
      // last step → complete
      persist(active, 'completed', stepIdx);
      setActive(null);
      setStepIdx(0);
    } else {
      setStepIdx(stepIdx + 1);
      persist(active, 'started', stepIdx + 1);
    }
  }, [active, stepIdx, persist]);

  const back = useCallback(() => {
    if (!active) return;
    setStepIdx(Math.max(0, stepIdx - 1));
  }, [active, stepIdx]);

  const skip = useCallback(() => {
    if (!active) return;
    persist(active, 'skipped', stepIdx);
    setActive(null);
    setStepIdx(0);
  }, [active, stepIdx, persist]);

  const complete = useCallback(() => {
    if (!active) return;
    persist(active, 'completed', stepIdx);
    setActive(null);
    setStepIdx(0);
  }, [active, stepIdx, persist]);

  const replay = useCallback((k: TourKey) => {
    persist(k, 'replayed', 0);
    setActive(k);
    setStepIdx(0);
  }, [persist]);

  const markSeen = useCallback((k: TourKey) => {
    setStatus((cur) => {
      if (cur[k]?.completed_at) return cur;
      const next: TourStatusMap = {
        ...cur,
        [k]: { ...(cur[k] || {}), completed_at: new Date().toISOString(), skipped: true },
      };
      saveLocal(next);
      return next;
    });
  }, []);

  const value: Ctx = useMemo(() => ({
    active, stepIdx, status, start, next, back, skip, complete, replay, markSeen,
  }), [active, stepIdx, status, start, next, back, skip, complete, replay, markSeen]);

  return <TourCtx.Provider value={value}>{children}</TourCtx.Provider>;
}

export function useTour(): Ctx {
  const ctx = useContext(TourCtx);
  if (!ctx) {
    // Fallback no-op so consumers don't crash if Provider is missing
    return {
      active: null, stepIdx: 0, status: {},
      start: () => {}, next: () => {}, back: () => {}, skip: () => {},
      complete: () => {}, replay: () => {}, markSeen: () => {},
    };
  }
  return ctx;
}

/**
 * useAutoTour — auto-launches the given tour the first time the user
 * lands on this portal. Subsequent visits are silent.
 */
export function useAutoTour(key: TourKey, opts: { delayMs?: number } = {}) {
  const { active, status, start } = useTour();
  const started = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (started.current) return;
    if (active) return;
    const seen = !!status[key]?.completed_at;
    if (seen) return;
    started.current = true;
    const t = setTimeout(() => start(key), opts.delayMs ?? 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status, key]);
}
