/**
 * frontend/src/analytics/hooks/useImpression.native.ts
 *
 * Native platform stub implementation of impression tracking.
 * Phase 2 will fill native bodies.
 */

export interface ImpressionOptions {
  threshold?: number;
  dwellMs?: number;
  once?: boolean;
  props?: Record<string, any>;
}

export function useImpression(
  id: string,
  options: ImpressionOptions = {}
): (node: any) => void {
  throw new Error('NotImplementedYet: useImpression.native');
}
