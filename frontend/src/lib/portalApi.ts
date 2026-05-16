/**
 * Portal Dashboard API client.
 * Single source of truth for fetching dashboard data for the 4 portals.
 *
 * If the API call fails (network issue, server down, etc.) the consumer
 * can opt to fall back to local mock — this is what the dashboard views do
 * so the UI never appears empty during development.
 *
 * Auth: All requests automatically attach the JWT bearer token stored in
 * AsyncStorage / localStorage under `scd_access_token` (set during login).
 */
import { useEffect, useState } from 'react';
import { request } from '@/src/models/services/api';

export async function fetchPortal<T>(path: string): Promise<T> {
  return request<T>(path);
}

export async function postPortal<T = any>(path: string, opts?: { method?: string; body?: any }): Promise<T> {
  return request<T>(path, {
    method: opts?.method || 'POST',
    body: opts?.body,
  });
}

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Generic hook: fetch on mount + auto-refresh every `refreshMs` (default 30s).
 * Falls back to `mock` if fetch fails. Returns `{ data, loading, error, refresh }`.
 * Set `refreshMs={0}` to disable polling.
 */
export function usePortalData<T>(path: string, mock: T, refreshMs: number = 30_000): FetchState<T> & { refresh: () => void } {
  const [data, setData]       = useState<T | null>(mock);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tick,    setTick]    = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    let timer: any = null;

    const load = () => {
      fetchPortal<T>(path)
        .then((result) => {
          if (!cancelled) {
            setData(result);
            setError(null);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e?.message || 'Network error');
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    load();

    if (refreshMs > 0) {
      timer = setInterval(load, refreshMs);
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [path, refreshMs, tick]);

  return { data, loading, error, refresh };
}
