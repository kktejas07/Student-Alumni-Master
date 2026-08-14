/**
 * frontend/src/analytics/core/storage.web.ts
 *
 * Web platform implementation of offline analytics queue storage using localStorage.
 */

const STORAGE_KEY = 'sa_analytics_offline_queue_v1';

export async function saveOfflineQueue(queue: any[]): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  } catch {
    /* swallow storage errors */
  }
}

export async function loadOfflineQueue(): Promise<any[]> {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        localStorage.removeItem(STORAGE_KEY);
        return JSON.parse(data);
      }
    }
  } catch {
    /* swallow storage errors */
  }
  return [];
}
