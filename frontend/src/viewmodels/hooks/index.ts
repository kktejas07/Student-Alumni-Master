/**
 * VIEWMODEL LAYER - Custom hooks bridging stores + services to Views.
 */
import { useEffect, useState } from 'react';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function useAuth() {
  return useAuthStore();
}

/** Hook to load dashboard data */
export function useDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const result = await api.dashboard();
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { data, loading, error, refetch };
}

/** Hook for AI career suggestions */
export function useCareerSuggestions() {
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (additional_context?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCareerSuggestions(additional_context);
      setSuggestion(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const loadCached = async () => {
    try {
      const cached = await api.getCachedSuggestions();
      if (cached && cached.summary) {
        setSuggestion(cached);
      }
    } catch {}
  };

  return { suggestion, loading, error, generate, loadCached };
}

/** Hook for catalog (courses, mentors, internships, deals, resources) */
export function useCatalog<T = any>(
  type: 'courses' | 'mentors' | 'internships' | 'deals' | 'resources' | 'events',
  filter?: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const fn = {
      courses: () => api.listCourses(filter),
      mentors: () => api.listMentors(filter),
      internships: () => api.listInternships(filter),
      deals: () => api.listDeals(filter),
      resources: () => api.listResources(filter),
      events: () => (api as any).listEvents ? (api as any).listEvents(filter) : Promise.resolve({ events: [] }),
    }[type];

    if (typeof fn !== 'function') {
      setItems([]);
      setLoading(false);
      return;
    }

    fn()
      .then((res: any) => {
        if (cancel) return;
        const key = type === 'resources' ? 'resources' : type;
        setItems(res[key] || []);
      })
      .catch(() => {})
      .finally(() => !cancel && setLoading(false));

    return () => {
      cancel = true;
    };
  }, [type, filter]);

  return { items, loading };
}
