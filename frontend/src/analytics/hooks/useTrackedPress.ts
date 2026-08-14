/**
 * frontend/src/analytics/hooks/useTrackedPress.ts
 *
 * Hook for wrapping onPress handlers with element_click events.
 */

import { useCallback } from 'react';
import { dispatcher } from '../core/dispatcher';

export function useTrackedPress<T extends (...args: any[]) => any>(
  id: string,
  onPress?: T,
  options: { label?: string; props?: Record<string, any>; disabled?: boolean } = {}
): (...args: Parameters<T>) => void {
  const { label, props = {}, disabled = false } = options;

  return useCallback(
    (...args: Parameters<T>) => {
      dispatcher.track('element_click', {
        element_id: id,
        element_label: label,
        interaction_blocked: disabled,
        ...props,
      });

      if (!disabled && onPress) {
        onPress(...args);
      }
    },
    [id, label, disabled, onPress, JSON.stringify(props)]
  );
}
