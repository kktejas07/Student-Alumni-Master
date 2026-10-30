/**
 * frontend/src/analytics/core/validate.ts
 *
 * Dev-time validator for canonical events, element ID registration, and parameter caps.
 */

import { CONFIG } from '../config';
import { EVENTS } from '../constants/events';
import { ANALYTICS_IDS } from '../constants/ids';

// Flatten registered IDs set for O(1) dev lookup
const REGISTERED_IDS = new Set<string>();

function extractIds(obj: Record<string, any>) {
  for (const value of Object.values(obj)) {
    if (typeof value === 'string') {
      REGISTERED_IDS.add(value);
    } else if (typeof value === 'object' && value !== null) {
      extractIds(value);
    }
  }
}

extractIds(ANALYTICS_IDS);

export function isRegisteredId(id: string): boolean {
  return REGISTERED_IDS.has(id);
}

export function validateEvent(event: string, props: Record<string, any>, elementId?: string) {
  if (!CONFIG.isDev) return;

  // 1. Check event name
  const validEventNames = Object.values(EVENTS) as string[];
  if (!validEventNames.includes(event)) {
    // eslint-disable-next-line no-console
    console.error(`[Analytics Validator] Unknown event name: "${event}". Must be one of EVENTS.`);
  }

  // 2. Check event name format for Firebase (max 40 chars, /^[a-z][a-z0-9_]{0,39}$/)
  const nameRegex = /^[a-z][a-z0-9_]{0,39}$/;
  if (!nameRegex.test(event)) {
    // eslint-disable-next-line no-console
    console.error(
      `[Analytics Validator] Event name "${event}" violates Firebase naming constraints.`
    );
  }

  // 3. Check element_id registration
  if (elementId && !isRegisteredId(elementId)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Analytics Validator] Unregistered element_id: "${elementId}". Add to ANALYTICS_IDS.`
    );
  }

  // 4. Check total parameter count for Firebase limit (max 25)
  const propKeys = Object.keys(props);
  if (propKeys.length > 25) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Analytics Validator] Event "${event}" has ${propKeys.length} parameters. Firebase max cap is 25.`
    );
  }
}
