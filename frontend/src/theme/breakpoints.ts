/**
 * Breakpoints — Apple-style adaptive layouts for RN.
 *
 * Tokens mirror the requested Tailwind breakpoint system but are tuned
 * for RN's `Dimensions` API. Use `useBreakpoint()` to react to viewport
 * changes (web resize, native rotation, foldables).
 *
 * Tokens:
 *   xs  < 480       small phones (iPhone SE)
 *   sm  480–767     large phones
 *   md  768–1023    tablet portrait
 *   lg  1024–1279   tablet landscape / small laptop
 *   xl  1280–1535   standard desktop
 *   2xl 1536–1919   large desktop
 *   3xl ≥ 1920      ultrawide
 */
import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

export const BREAKPOINTS = {
  xs:  0,
  sm:  480,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
  '3xl': 1920,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
type DimsState = { width: number; height: number; bp: Breakpoint };

function bpFor(width: number): Breakpoint {
  if (width >= BREAKPOINTS['3xl']) return '3xl';
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

function read(): DimsState {
  const { width, height } = Dimensions.get('window');
  return { width, height, bp: bpFor(width) };
}

export function useBreakpoint(): DimsState & {
  isPhone: boolean;     // xs + sm
  isTablet: boolean;    // md
  isLaptop: boolean;    // lg
  isDesktop: boolean;   // xl + 2xl
  isUltrawide: boolean; // 3xl
  /** True for breakpoints ≥ the given token. */
  atLeast: (b: Breakpoint) => boolean;
  /** True for breakpoints ≤ the given token. */
  atMost: (b: Breakpoint) => boolean;
} {
  const [state, setState] = useState<DimsState>(read);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setState(read()));
    return () => sub?.remove?.();
  }, []);

  const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
  const idx = order.indexOf(state.bp);
  return {
    ...state,
    isPhone:     state.bp === 'xs' || state.bp === 'sm',
    isTablet:    state.bp === 'md',
    isLaptop:    state.bp === 'lg',
    isDesktop:   state.bp === 'xl' || state.bp === '2xl',
    isUltrawide: state.bp === '3xl',
    atLeast: (b) => idx >= order.indexOf(b),
    atMost:  (b) => idx <= order.indexOf(b),
  };
}

/** Pick the value for the current breakpoint, falling back to lower keys. */
export function useResponsiveValue<T>(map: Partial<Record<Breakpoint, T>>, fallback: T): T {
  const { bp } = useBreakpoint();
  const order: Breakpoint[] = ['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const startIdx = order.indexOf(bp);
  for (let i = startIdx; i < order.length; i++) {
    const key = order[i];
    if (map[key] !== undefined) return map[key] as T;
  }
  return fallback;
}

/** Apple "fluid" clamp implemented in RN — linearly interpolates between min & max. */
export function fluid(min: number, max: number, anchorMin = BREAKPOINTS.sm, anchorMax = BREAKPOINTS.xl): number {
  const w = Dimensions.get('window').width;
  if (w <= anchorMin) return min;
  if (w >= anchorMax) return max;
  const t = (w - anchorMin) / (anchorMax - anchorMin);
  return min + (max - min) * t;
}
