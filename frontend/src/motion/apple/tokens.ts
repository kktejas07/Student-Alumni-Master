/**
 * Apple Motion — easing/duration/spring tokens for the new design system.
 *
 * Mirrors the user's spec exactly. Used by all primitives in
 * src/motion/apple/components.tsx. Reanimated-compatible.
 */
import { Easing } from 'react-native-reanimated';

// ── Bezier curves (Apple HIG) ──────────────────────────────────────────
export const EASE = {
  standard: Easing.bezier(0.4, 0,    0.2, 1),         // default UI
  out:      Easing.bezier(0,   0,    0.2, 1),         // entrances
  in:       Easing.bezier(0.4, 0,    1,   1),         // exits
  spring:   Easing.bezier(0.32, 0.72, 0,   1),        // Apple signature
  bounce:   Easing.bezier(0.175, 0.885, 0.32, 1.275), // playful pop
  anticipate: Easing.bezier(0.68, -0.55, 0.27, 1.55),
};

// ── Durations (ms) ─────────────────────────────────────────────────────
export const DUR = {
  micro: 100,    // tooltip, focus ring
  fast: 150,     // hover, button press
  base: 200,     // card lift, color shift
  medium: 300,   // modal, drawer, page fade
  slow: 500,     // hero reveal, full-page transition
};

// ── Spring presets (Reanimated `withSpring` config) ────────────────────
export const SPRING = {
  soft:    { damping: 26, stiffness: 170, mass: 1 },
  snappy:  { damping: 30, stiffness: 400, mass: 1 },
  bouncy:  { damping: 18, stiffness: 300, mass: 1 },
  gentle:  { damping: 20, stiffness: 120, mass: 1 },
};
