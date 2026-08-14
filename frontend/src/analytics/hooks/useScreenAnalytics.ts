/**
 * frontend/src/analytics/hooks/useScreenAnalytics.ts
 *
 * Screen Tracking Hook for Expo Router screens.
 * Emits screen_view on entry and screen_exit with active duration on exit.
 */

import { useEffect, useRef } from 'react';
import { updateScreenContext } from '../core/context';
import { dispatcher } from '../core/dispatcher';

export function useScreenAnalytics(screenName: string, props: Record<string, any> = {}) {
  const mountTimeRef = useRef<number>(Date.now());
  const activeTimeRef = useRef<number>(0);
  const lastActiveStartRef = useRef<number>(Date.now());
  const isFocusedRef = useRef<boolean>(true);

  useEffect(() => {
    mountTimeRef.current = Date.now();
    lastActiveStartRef.current = Date.now();
    activeTimeRef.current = 0;
    isFocusedRef.current = true;

    // Update screen stack in context
    updateScreenContext(screenName);

    // Emit screen_view
    dispatcher.track('screen_view', {
      screen_name: screenName,
      ...props,
    });

    // Handle visibility changes on Web
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        if (document.hidden) {
          if (isFocusedRef.current) {
            activeTimeRef.current += Date.now() - lastActiveStartRef.current;
            isFocusedRef.current = false;
          }
        } else {
          if (!isFocusedRef.current) {
            lastActiveStartRef.current = Date.now();
            isFocusedRef.current = true;
          }
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      const now = Date.now();
      const totalDuration = now - mountTimeRef.current;

      if (isFocusedRef.current) {
        activeTimeRef.current += now - lastActiveStartRef.current;
      }

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }

      // Emit screen_exit
      dispatcher.track('screen_exit', {
        screen_name: screenName,
        duration_ms: totalDuration,
        foreground_ms: activeTimeRef.current,
        ...props,
      });
    };
  }, [screenName, JSON.stringify(props)]);
}
