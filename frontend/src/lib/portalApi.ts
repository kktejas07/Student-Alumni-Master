/**
 * Portal Dashboard API client.
 * Single source of truth for fetching dashboard data for the 4 portals.
 *
 * If the API call fails (network issue, server down, etc.) the consumer
 * can opt to fall back to local mock — this is what the dashboard views do
 * so the UI never appears empty during development.
 */
import { useEffect, useState } from 'react';

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export async function fetchPortal<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Generic hook: fetch once on mount, fall back to provided `mock` if fetch fails.
 * Returns `{ data, loading, error }`. `data` is never null after first render
 * because we initialise with the mock so the UI renders immediately while
 * we attempt the network call in the background.
 */
export function usePortalData<T>(path: string, mock: T): FetchState<T> {
  const [data, setData]       = useState<T | null>(mock);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
    return () => { cancelled = true; };
  }, [path]);

  return { data, loading, error };
}
