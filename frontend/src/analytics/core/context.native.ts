/**
 * frontend/src/analytics/core/context.native.ts
 *
 * Native platform stub implementation of session and device context.
 * Phase 2 will fill native bodies using Dimensions and Expo Device.
 */

import { PropertyEnvelope } from '../types';

export function getSessionId(): string {
  throw new Error('NotImplementedYet: context.native.getSessionId');
}

export function resetSessionId(): string {
  throw new Error('NotImplementedYet: context.native.resetSessionId');
}

export async function hashUserId(userId: string): Promise<string> {
  throw new Error('NotImplementedYet: context.native.hashUserId');
}

export function getBreakpoint(width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  throw new Error('NotImplementedYet: context.native.getBreakpoint');
}

export function updateScreenContext(screenName: string, path?: string) {
  // Phase 1 stub no-op in dev if called
}

export function updateUserContext(role: string, authState: boolean, organizationId?: string) {
  // Phase 1 stub no-op in dev if called
}

export function buildStandardEnvelope(): PropertyEnvelope {
  throw new Error('NotImplementedYet: context.native.buildStandardEnvelope');
}
