/**
 * frontend/src/analytics/hooks/useListAnalytics.ts
 *
 * List & Scroll Depth Analytics Hook.
 */

import { useRef } from 'react';
import { dispatcher } from '../core/dispatcher';

export function useListAnalytics(listId: string) {
  const firedDepthsRef = useRef(new Set<number>());

  const trackScrollDepth = (scrollPct: number) => {
    const checkpoints = [25, 50, 75, 100];
    for (const checkpoint of checkpoints) {
      if (scrollPct >= checkpoint && !firedDepthsRef.current.has(checkpoint)) {
        firedDepthsRef.current.add(checkpoint);
        dispatcher.track('list_interaction', {
          list_id: listId,
          scroll_depth_pct: checkpoint,
        });
      }
    }
  };

  const trackLoadMore = (page: number, loadedCount: number) => {
    dispatcher.track('list_interaction', {
      list_id: listId,
      action: 'load_more',
      page,
      loaded_count: loadedCount,
    });
  };

  const trackFilterSort = (filterKeys: string[], sortOption?: string) => {
    dispatcher.track('list_interaction', {
      list_id: listId,
      action: 'filter_sort',
      filter_keys: filterKeys.join(','),
      sort_option: sortOption,
    });
  };

  return {
    trackScrollDepth,
    trackLoadMore,
    trackFilterSort,
  };
}
