/**
 * frontend/src/utils/globalErrorLogger.ts
 *
 * Global Unhandled Exception & Promise Rejection Debug Logger for Web & Native.
 */

import { Platform } from 'react-native';
import { debugLog } from '@/src/utils/debugLog';

export function initGlobalErrorLogger(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      // eslint-disable-next-line no-console
      console.error(
        `[UNCAUGHT GLOBAL ERROR] ${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
        event.error
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      // eslint-disable-next-line no-console
      console.error('[UNHANDLED PROMISE REJECTION]', event.reason);
    });

    // eslint-disable-next-line no-console
    debugLog('[DEBUG] Global uncaught error & promise rejection listeners activated.');
  }
}
