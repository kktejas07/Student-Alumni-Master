/**
 * VIEWMODEL LAYER - Custom hooks bridging stores + services to Views.
 */
import { useEffect, useState } from 'react';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function useAuth() {
  return useAuthStore();
}

export { useCareerAI } from './useCareerAI';

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
