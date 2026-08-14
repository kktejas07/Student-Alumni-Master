/**
 * frontend/src/analytics/core/logger.ts
 *
 * Rich structured debug logger for local development and runtime debugging.
 */

import { CONFIG } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

let currentLogLevel: LogLevel = CONFIG.isDev ? 'debug' : 'warn';

export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

const LEVEL_WEIGHTS: Record<LogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
};

function shouldLog(level: LogLevel): boolean {
  if (typeof window !== 'undefined' && (window as any).__ANALYTICS_DEBUG__) {
    return true;
  }
  return LEVEL_WEIGHTS[level] >= LEVEL_WEIGHTS[currentLogLevel];
}

export const logger = {
  debug(tag: string, message: string, payload?: any) {
    if (!shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `%c[Analytics:${tag}]%c ${message}`,
      'background:#0f766e;color:#5eead4;padding:2px 6px;border-radius:3px;font-weight:bold;',
      'color:#94a3b8;font-weight:bold;'
    );
    if (payload !== undefined) {
      // eslint-disable-next-line no-console
      console.log(payload);
    }
    // eslint-disable-next-line no-console
    console.groupEnd();
  },

  info(tag: string, message: string, payload?: any) {
    if (!shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.log(
      `%c[Analytics:${tag}]%c ${message}`,
      'background:#0284c7;color:#e0f2fe;padding:2px 6px;border-radius:3px;font-weight:bold;',
      'color:#cbd5e1;',
      payload || ''
    );
  },

  warn(tag: string, message: string, payload?: any) {
    if (!shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(
      `%c[Analytics:${tag}:WARN]%c ${message}`,
      'background:#d97706;color:#fef3c7;padding:2px 6px;border-radius:3px;font-weight:bold;',
      'color:#fde68a;',
      payload || ''
    );
  },

  error(tag: string, message: string, error?: any) {
    if (!shouldLog('error')) return;
    // eslint-disable-next-line no-console
    console.error(
      `%c[Analytics:${tag}:ERROR]%c ${message}`,
      'background:#dc2626;color:#fee2e2;padding:2px 6px;border-radius:3px;font-weight:bold;',
      'color:#fca5a5;',
      error || ''
    );
  },
};
