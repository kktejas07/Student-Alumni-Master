/**
 * frontend/src/analytics/web/globalClickListener.ts
 *
 * Web-only fallback global click listener for raw un-wrapped DOM elements.
 * Captures clicks on elements with data-analytics-id or data-attr attributes.
 */

import { Platform } from 'react-native';
import { dispatcher } from '../core/dispatcher';

let listening = false;

export function initGlobalClickListener(): void {
  if (listening || Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  document.addEventListener(
    'click',
    (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const trackable = target.closest('[data-analytics-id], [data-attr]') as HTMLElement | null;
        if (!trackable) return;

        const analyticsId =
          trackable.getAttribute('data-analytics-id') || trackable.getAttribute('data-attr');

        if (analyticsId) {
          const label = trackable.innerText || trackable.getAttribute('aria-label') || '';
          dispatcher.track('element_click', {
            element_id: analyticsId,
            element_label: label.trim().slice(0, 100),
            capture_source: 'global_dom_fallback',
          });
        }
      } catch {
        /* swallow */
      }
    },
    { capture: true }
  );

  listening = true;
}
