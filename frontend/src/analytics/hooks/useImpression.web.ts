/**
 * frontend/src/analytics/hooks/useImpression.web.ts
 *
 * Web platform implementation of impression tracking using IntersectionObserver.
 * Triggers element_impression when an element is >=50% visible for >=1000ms.
 */

import { useCallback, useEffect, useRef } from 'react';
import { getSessionId } from '../core/context';
import { dispatcher } from '../core/dispatcher';

const firedImpressions = new Set<string>();

export interface ImpressionOptions {
  threshold?: number;
  dwellMs?: number;
  once?: boolean;
  props?: Record<string, any>;
}

export function useImpression(
  id: string,
  options: ImpressionOptions = {}
): (node: HTMLElement | null) => void {
  const { threshold = 0.5, dwellMs = 1000, once = true, props = {} } = options;
  const dwellTimerRef = useRef<any>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const clearTimer = () => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  };

  const refCallback = useCallback(
    (node: HTMLElement | null) => {
      elementRef.current = node;

      if (!node || typeof IntersectionObserver === 'undefined') return;

      const dedupeKey = `${getSessionId()}:${id}`;
      if (once && firedImpressions.has(dedupeKey)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
              if (!dwellTimerRef.current) {
                dwellTimerRef.current = setTimeout(() => {
                  if (once && firedImpressions.has(dedupeKey)) return;

                  firedImpressions.add(dedupeKey);
                  dispatcher.track('element_impression', {
                    element_id: id,
                    dwell_ms: dwellMs,
                    ...props,
                  });
                }, dwellMs);
              }
            } else {
              clearTimer();
            }
          }
        },
        { threshold: [threshold] }
      );

      observer.observe(node);

      return () => {
        observer.disconnect();
        clearTimer();
      };
    },
    [id, threshold, dwellMs, once, JSON.stringify(props)]
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return refCallback;
}
