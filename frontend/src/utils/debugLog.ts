/**
 * frontend/src/utils/debugLog.ts
 *
 * Development-only console logging. No-ops in production builds so debug
 * chatter (API req/res, auth traces, listener setup) never reaches users.
 */

const IS_DEV = process.env.NODE_ENV !== 'production';

export function debugLog(...args: unknown[]): void {
  if (!IS_DEV) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

export function debugWarn(...args: unknown[]): void {
  if (!IS_DEV) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
}
