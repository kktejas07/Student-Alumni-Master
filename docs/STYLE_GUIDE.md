# Student Alumni — Design System & Style Guide

> **Single source of truth** for theming, typography, components, and motion
> across all five portals. Engineers and designers should consult this doc
> before adding new screens or modifying existing ones.

**Version:** 0.19.0
**Last updated:** 2026-06-15
**Status:** Living document — update as the system evolves.

---

## 1. Theme Map by Portal

Each portal has its own **distinct color identity** so users immediately
know which experience they're in. **Themes are isolated.** Never bleed
primitives from one portal into another.

| Portal | Theme | Identity | Source folder |
|---|---|---|---|
| 🟣 **Student** | FinTax360 Glass-Dark | Deep navy + violet aurora + frosted glass | `frontend/src/views/web/portals/student/` |
| 🔵 **Alumni** | LinkedIn Blue | Professional, corporate | `frontend/src/views/web/portals/alumni/` |
| 🟢 **College** | Teal / Emerald | Institutional, calm | `frontend/src/views/web/portals/college/` |
| 🟡 **Mentor** | Amber / Gold | Wisdom, warmth | `frontend/src/views/web/portals/mentor/` |
| 🟠 **Super Admin** | NexusOS Amber + Apple HIG | Admin/control surface | `frontend/src/views/web/portals/superadmin/` |

---

## 2. Student Portal — FinTax360 Glass-Dark (flagship theme)

### 2.1 Color Palette

```ts
// frontend/src/views/web/portals/student/tokens.ts
export const PALETTE = {
  // Surfaces
  canvas:       '#050816',                          // deep navy black
  surface:      'rgba(15, 23, 42, 0.55)',           // glass card fill
  surfaceHover: 'rgba(30, 41, 59, 0.65)',
  glassBorder:  'rgba(139, 92, 246, 0.20)',         // violet hairline @ 20%

  // Accents (used in aurora + interactive)
  violet:       '#8B5CF6',
  violetD:      '#7C3AED',                          // pressed / deep
  cyan:         '#22D3EE',
  magenta:      '#EC4899',

  // Text
  textPrimary:  '#F8FAFC',
  textMuted:    '#94A3B8',
  textInverse:  '#0F172A',

  // Status
  success:      '#22C55E',
  warning:      '#FBBF24',
  danger:       '#EF4444',
  info:         '#3B82F6',
};
```

#### Visual swatches

| Token | Hex / RGBA | Use |
|---|---|---|
| `canvas` | `#050816` | Page background |
| `surface` | `rgba(15,23,42,0.55)` | `<GlassCard>` fill |
| `glassBorder` | `rgba(139,92,246,0.20)` | Card hairline |
| `violet` | `#8B5CF6` | Primary CTAs, FAB, focused state |
| `cyan` | `#22D3EE` | Secondary accent, info |
| `magenta` | `#EC4899` | Tertiary accent, highlights |
| `textPrimary` | `#F8FAFC` | Headings, body |
| `textMuted` | `#94A3B8` | Captions, meta |
| `success` | `#22C55E` | RSVPed, completed |
| `warning` | `#FBBF24` | Pending, in-progress |
| `danger` | `#EF4444` | Errors, cancel actions |

### 2.2 Typography

All three families load via `@expo-google-fonts/*` in `app/_layout.tsx`.

| Use | Family | Weights | Letter-spacing |
|---|---|---|---|
| **Display / Headings** | Outfit | 700, 800, 900 | `-0.5` to `-1.0` for hero |
| **Body** | Plus Jakarta Sans | 400, 500, 600, 700 | `0` (default) |
| **Numerics / Mono** | JetBrains Mono | 500, 600 | `0` |

```ts
// frontend/src/views/web/portals/student/tokens.ts
export const TYPO = {
  display900: 'Outfit_900Black',
  display800: 'Outfit_800ExtraBold',
  display700: 'Outfit_700Bold',

  body700:    'PlusJakartaSans_700Bold',
  body600:    'PlusJakartaSans_600SemiBold',
  body500:    'PlusJakartaSans_500Medium',
  body400:    'PlusJakartaSans_400Regular',

  mono600:    'JetBrainsMono_600SemiBold',
  mono500:    'JetBrainsMono_500Medium',
};
```

#### Type scale (px)

| Token | Size | Family | Use |
|---|---|---|---|
| `h0` | 56 | Outfit 800 | Hero stat |
| `h1` | 40 | Outfit 800 | Page title |
| `h2` | 28 | Outfit 700 | Section title |
| `h3` | 20 | Outfit 700 | Card title |
| `body-lg` | 16 | Plus Jakarta 500 | Default body |
| `body` | 14 | Plus Jakarta 500 | Card body |
| `caption` | 12 | Plus Jakarta 500 | Meta, labels |
| `kpi` | 32 | JetBrains Mono 600 | Numeric KPI |

### 2.3 Spacing Scale (8-pt grid)

```
4    8    12    16    20    24    32    40    48    64
```

> **Rule:** all padding / margin / gap MUST be a multiple of 4 (preferably 8).
> Use the constants `SP.xs / sm / md / lg / xl / 2xl` from `tokens.ts`.

### 2.4 Radius

```
4    8    12    14    16    20    24    9999
```

- `8`  → small chips, pills
- `12` → buttons
- `14` → standard `<GlassCard>` (canonical)
- `20` → hero cards
- `9999` → fully round (FAB, avatars)

### 2.5 Shadows / Glow

Web only (use `boxShadow` long-form, never deprecated RN `shadow*`):

```css
/* Idle glass card */
boxShadow: 0 8px 24px rgba(2, 6, 23, 0.45),
           0 0 0 1px rgba(139, 92, 246, 0.16) inset;

/* Hovered glass card */
boxShadow: 0 16px 40px rgba(2, 6, 23, 0.55),
           0 0 0 1px rgba(139, 92, 246, 0.28) inset;

/* FAB at rest */
boxShadow: 0 12px 32px rgba(139, 92, 246, 0.40),
           0 0 0 1px rgba(139, 92, 246, 0.28);

/* FAB on hover */
boxShadow: 0 18px 44px rgba(139, 92, 246, 0.55),
           0 0 0 1px rgba(139, 92, 246, 0.42);
```

> On native, use a single `elevation: 8` and let RN handle it.

### 2.6 Motion

| Interaction | Duration | Easing | Property |
|---|---|---|---|
| Card mount-in | 350 ms | `Easing.out(cubic)` | opacity + translateY (6 → 0) |
| Card stagger | 30-40 ms × index | — | delay |
| Hover lift | 180 ms | `ease-out` | transform + shadow |
| Press scale | 120 ms | `ease-in` | scale 1 → 0.96 |
| FAB breathing glow | 3.2 s loop | `Easing.inOut(quad)` | opacity 0.35 ↔ 0.75 |
| Aurora rotate | 18 s loop | linear | rotate(0 → 360deg) |
| Route fade | 220 ms | `Easing.out(cubic)` | opacity + translateY (6 → 0) |

> Always use `useNativeDriver: true` for `opacity` and `transform` animations.

---

## 3. Component Primitives (`glass.tsx`)

All primitives are exported from
`frontend/src/views/web/portals/student/glass.tsx`.

### 3.1 `<AnimatedAurora />`

Full-screen background — slow-rotating violet/cyan/magenta blur orbs.
Mounted once at the shell root.

```tsx
<AnimatedAurora />
```

### 3.2 `<GridOverlay />`

Subtle dot-grid pattern at 8% opacity. Sits on top of the aurora.

```tsx
<GridOverlay />
```

### 3.3 `<GlassCard />`

Canonical container. Use this for **every** card-shaped surface.

```tsx
<GlassCard
  delay={idx * 40}    // optional stagger
  radius={14}          // default
  padding={14}         // default
  style={{ /* extra */ }}
>
  {children}
</GlassCard>
```

Props:
- `delay?: number` — mount-in delay (ms) for stagger
- `radius?: number` — border-radius (default 14)
- `padding?: number` — inner padding (default 14)
- `hoverable?: boolean` — disable lift if false (default true)
- `onPress?: () => void` — makes it interactive (Pressable)

### 3.4 `<GlassSoft />`

Lighter variant for secondary surfaces (sidebars, sub-panels).

### 3.5 `<KpiTile />`

Stat tile with big mono numeric + label + trend arrow.

```tsx
<KpiTile
  label="Connections"
  value={128}
  delta={+12}          // shows green ↑12
  icon={<Users size={18} />}
/>
```

### 3.6 `<PillChip />`

Translucent pill for tags / filters.

```tsx
<PillChip label="Remote" tone="violet" active={true} />
```

Tones: `violet | cyan | magenta | green | amber | red | neutral`

### 3.7 `<AiCopilotFab />` — Global FAB

Fixed bottom-right pill (✦ Agent K) with breathing violet glow.
**Mounted globally in `StudentPortalRN` and on `/agent-k`.**
Visible on every Student screen.

```tsx
<AiCopilotFab onPress={() => router.push('/agent-k')} />
```

### 3.8 `<RouteTransition />`

Wraps a route view with fade + 6px y-shift on mount.

```tsx
<RouteTransition>
  <DashboardView />
</RouteTransition>
```

---

## 4. Layout Rules

### 4.1 Hard rules

- ✅ **Flexbox only** — no absolute positioning for main content
- ✅ **8-pt spacing grid** — never use random numbers
- ✅ **Minimum touch target** — 44 × 44 (iOS) / 48 × 48 (Android)
- ✅ Always wrap input screens with `<KeyboardAvoidingView>` + `useSafeAreaInsets()`
- ❌ Never use `transition: all` (web) — target specific properties
- ❌ Never use HTML elements (`div`, `span`, `p`) — always RN components
- ❌ Never use CSS class names — always `StyleSheet.create()`

### 4.2 Responsive breakpoints (web)

```
xs:  <  480 px   (phone)
sm:  >= 480 px   (large phone)
md:  >= 768 px   (tablet)
lg:  >= 1024 px  (laptop)
xl:  >= 1440 px  (desktop)
```

Use `useWindowDimensions()` and `useResponsiveValue()` helpers in `tokens.ts`.

---

## 5. Iconography

- Library: **`lucide-react-native`** via `iconShims.tsx` adapter
- Standard size: **18** for inline, **22** for nav, **28** for hero
- Stroke width: **1.5** (Apple HIG default)
- Color: inherit from text or pass explicit hex

```tsx
import { Calendar, Users, Sparkles } from '../iconShims';

<Calendar size={18} color={SC.muted} />
```

---

## 6. Accessibility Checklist

- [ ] All interactive elements have `accessibilityLabel`
- [ ] Touch targets ≥ 44 × 44 pt
- [ ] Color contrast ≥ 4.5:1 for body text, 3:1 for large text
- [ ] No information conveyed by color alone (use icon + text + color)
- [ ] `<Text>` wraps all strings; never raw `{text}` in JSX
- [ ] Focus visible on web (`outline: 2px solid violet` on focused state)
- [ ] Reduced-motion respected (`useReducedMotion()` hook)
- [ ] Screen reader order matches visual order (no abs-positioning hacks)

---

## 7. Anti-Patterns (Do NOT)

❌ Apply FinTax360 glass primitives to Alumni / College / Mentor / Admin portals.
❌ Hard-code colors — always use `tokens.ts` constants.
❌ Use raw `<View style={{ backgroundColor: '#fff', borderRadius: 12 }}>` for cards. Use `<GlassCard>`.
❌ Add the FAB conditionally on student screens — it's already mounted globally in `StudentPortalRN`. Don't double-mount.
❌ Mix font families within the same text block.
❌ Use `position: absolute` for layout of main content.
❌ Skip the staggered mount-in delay when rendering a list of GlassCards.

---

## 8. Quick Reference Card

```
Canvas       #050816                Spacing        4 / 8 / 12 / 16 / 24 / 32
Surface      rgba(15,23,42,.55)     Radius (card)  14
Border       rgba(139,92,246,.20)   Radius (pill)  9999
Violet       #8B5CF6                Touch target   ≥ 44
Cyan         #22D3EE                Hover lift     180 ms ease-out
Magenta      #EC4899                Press scale    0.96  120 ms
Text         #F8FAFC                FAB position   bottom: 22  right: 22

Display      Outfit 700-900         Numerics   JetBrains Mono 500-600
Body         Plus Jakarta 400-700
```

---

## 9. File Map (where to look / what to edit)

| Concern | File |
|---|---|
| All design tokens (colors, fonts, spacing) | `tokens.ts` |
| All UI primitives (GlassCard, FAB, Aurora) | `glass.tsx` |
| Student shell + global mounts | `StudentPortalRN.tsx` |
| Google font loading | `app/_layout.tsx` |
| Icon shim (lucide adapter) | `iconShims.tsx` |
| Portal-level constants (gradients, brand) | `portalkit.tsx` |
| Atoms (Badge, Av, Pill) | `atoms.tsx` |
| Empty / loading / error states | `EmptyState.tsx` |

---

## 10. Versioning & Changelog

This style guide tracks the implementation roadmap:

- `v0.18.0` — FinTax360 theme introduced (Dashboard + TopBar + Sidebar)
- `v0.18.2` — Git hygiene + Dokploy docs single-domain
- `v0.19.0` — Global AI Copilot FAB + theme sweep across remaining
  Student views (Events, Network, Internships, Applications,
  Bookings, Workshops)

Future:
- `v0.20.0` — Settings drill-in screens (signatures, role details)
- `v0.21.0` — Refactor `server.py` into modular routers

---

## 11. Contributing

1. New screen in Student portal? → use `<GlassCard>` + `<RouteTransition>`.
2. Adding a CTA? → primary uses violet gradient; secondary uses `<PillChip>`.
3. Need a new color? → add it to `tokens.ts` first, never inline.
4. Building an animation? → match the durations in §2.6. Test reduced-motion.
5. Touching another portal's files? → **stop**. Keep themes isolated.
6. Adding fonts? → load in `app/_layout.tsx`, add token to `TYPO`, document here.

---

> **When in doubt: open `glass.tsx` and copy the closest existing primitive.
> Then add your variant alongside it with a one-line doc comment.**
