# StudentAlumni — Developer Handoff

Buttons, colours, type, spacing and motion for every surface: **Landing**, **Onboarding**, **Dashboard**, **Events**, **Resources** (Blog / Help / Community / Privacy / Terms / Security / Cookies).

Nothing below is decorative — if a value isn't here, don't invent it.

**Theme status.** The token system below defines both themes in full, but they are not yet wired on every surface:

| Surface | Dark | Light |
|---|---|---|
| Dashboard | ✅ shipping | ✅ shipping |
| Resources (Blog / Help / Community / legal) | ✅ shipping | ✅ shipping |
| Landing | ✅ shipping | ⬜ tokens defined, not yet applied |
| Onboarding | ✅ shipping | ⬜ tokens defined, not yet applied |
| Events | ✅ shipping | ⬜ tokens defined, not yet applied |

Build new work against the tokens, not the literals — the remaining three surfaces then become a mechanical port.

---

## 1. Colour system

### 1.1 How to consume it

All colour is CSS custom properties set on the surface root. Never hardcode a hex in a component — read the token. The two theme objects below are the only place literals live.

```js
const dark = { bg: '#0A0A14', panel: '#11111C', /* … */ };
const light = { bg: '#F4F5FA', panel: '#FFFFFF', /* … */ };
Object.entries(theme).forEach(([k, v]) => root.style.setProperty(`--${kebab(k)}`, v));
```

### 1.2 Core tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0A0A14` | `#F4F5FA` | Page background |
| `--panel` | `#11111C` | `#FFFFFF` | Cards, primary surfaces |
| `--panel2` | `#161622` | `#F3F4FA` | Nested blocks, inputs |
| `--line` | `#1F1F30` | `#E4E6F0` | Card borders, dividers |
| `--line2` | `#292940` | `#D9DCEA` | Input borders, stronger rules |
| `--text` | `#F4F4FA` | `#141726` | Primary text |
| `--muted` | `#8A8A9E` | `#565B70` | Body copy, labels |
| `--dim` | `#6A6A7E` | `#6B7080` | Placeholders, meta |
| `--chrome` | `rgba(10,10,20,.86)` | `rgba(244,245,250,.86)` | Sticky bars (with `backdrop-filter: blur(16px)`) |

### 1.3 Brand and accent

| Token | Dark | Light | Use |
|---|---|---|---|
| `--violet` | `#7C5CFC` | `#6A4FE0` | Primary accent, filled buttons |
| `--violet-lt` | `#A78BFA` | `#5B4FE9` | Accent text, links, icons |
| `--accent-line` | `#2C2A52` | `#D6D2FA` | Accent-tinted borders |
| `--tint` | `rgba(124,92,252,.10)` | `rgba(106,79,224,.08)` | Subtle accent wash |
| `--tint-strong` | `rgba(124,92,252,.18)` | `rgba(106,79,224,.14)` | Selected states |
| `--on-tint` | `#F4F4FA` | `#3B2FA8` | Text **on** a tinted surface |
| `--on-accent` | `#0C0C14` | `#FFFFFF` | Text **on** a filled accent |

> **The two rules that break light mode most often**
> 1. Any element with a **literal** background (brand gradients, coloured monograms, filled buttons) must declare its own `color`. Inheriting `--text` gives you dark ink on a dark gradient in light mode.
> 2. Never put a light-to-dark gradient and a single text palette on the same element. Split it into a light block with dark ink and a dark block with light ink.

### 1.4 Semantic

| Token | Dark | Light | Meaning |
|---|---|---|---|
| `--ok` | `#34D399` | `#047857` | Verified, success, available |
| `--ok-tint` | `rgba(16,185,129,.13)` | `rgba(4,120,87,.10)` | |
| `--ok-line` | `#17503E` | `#A7E3C8` | |
| `--amber` | `#F5B342` | `#B45309` | Pending, upcoming, warning |
| `--warn-tint` | `rgba(245,179,66,.13)` | `rgba(180,83,9,.10)` | |
| `--warn-line` | `#4A3410` | `#F1D2A5` | |
| `--danger` | `#F0616B` | `#BE123C` | Destructive, error, log out |
| `--danger-tint` | `rgba(240,97,107,.13)` | `rgba(190,18,60,.09)` | |
| `--sky` | `#6FD6FF` | `#0E6E8C` | Informational |

### 1.5 Category accents

Seven-slot ramp, used for rental categories, event marquee dots, blog tags and avatar monograms. Index by content id so a given category is always the same colour.

| | Dark | Light |
|---|---|---|
| `--cat1` | `#7C5CFC` | `#4F46C7` |
| `--cat2` | `#2FB8C6` | `#0E6E8C` |
| `--cat3` | `#F59E0B` | `#B45309` |
| `--cat4` | `#DB2777` | `#A21C63` |
| `--cat5` | `#34D399` | `#047857` |
| `--cat6` | `#4C8DF6` | `#1E56C4` |
| `--cat7` | `#A78BFA` | `#5B4FE9` |

### 1.6 Gradients

| Name | Value | Use |
|---|---|---|
| Brand ramp | `#7C6BFF → #4C8DF6 → #2FB8C6 → #34D3A6` | Progress bars, SA card face |
| Shield outer | `#D8B6FF → #9A5CE8 45% → #5B1FB0` | SA logo outer plate |
| Shield inner | `#B683F5 → #7331C9` | SA logo bevel |
| Hashtag | `#F0A6E8 → #C08BFF 32% → #8B84FF 66% → #6FA8F5` | `#studentalumni` lockup |
| Button fill | `linear-gradient(100deg, var(--violet), #6246E8)` | Primary CTA, enabled state |
| Aurora A | `rgba(124,92,252,.20) → transparent 68%`, `blur(70px)` | Ambient background |
| Aurora B | `rgba(91,79,233,.14) → transparent 70%`, `blur(80px)` | Ambient background |

Light mode multiplies ambient gradient alpha by **0.55**.

---

## 2. Typography

| Surface | Family |
|---|---|
| Landing, Onboarding | **Manrope** 400 / 500 / 600 / 700 / 800 |
| Dashboard, Events, Resources | **Outfit** 400 / 500 / 600 / 700 |

| Role | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Display | 76–92 | 700 | −3px | 1.05 |
| Page title | 40 | 700 | −1.6px | 1.12 |
| Section title | 24–32 | 700 | −0.7 to −1.1px | 1.2 |
| Card title | 17–21 | 700 | −0.4px | 1.3 |
| Body large | 16–16.5 | 400 | 0 | 1.7 |
| Body | 13.5–15 | 400/500 | 0 | 1.6 |
| Meta | 12–13 | 400 | 0 | 1.5 |
| Eyebrow | 10.5–12 | 700 | +1.2 to +1.8px | 1.4 · uppercase |
| Numeric | 26–40 | 700 | −1.1px | 1 · `tabular-nums` |

Minimums: 12px UI, 13.5px body copy, 44px touch targets.

---

## 3. Buttons

Every button is one of six variants. Height comes from padding, not a fixed height.

| Variant | Fill | Border | Text | Radius | Padding |
|---|---|---|---|---|---|
| **Primary** | `var(--violet)` | none | `var(--on-accent)` | 10–12px | `13px 22px` |
| **Primary gradient** | `linear-gradient(100deg, var(--violet), #6246E8)` | none | `#FFFFFF` | 12px | `14px 24px` |
| **Semantic filled** | `var(--ok)` / `var(--amber)` / category | none | `var(--on-accent)` | 10px | `12px 20px` |
| **Ghost** | transparent | `1px var(--line2)` | `var(--muted)` | 10–12px | `13px 22px` |
| **Tinted** | `var(--tint-strong)` | `1px var(--accent-line)` | `var(--on-tint)` | 12px | `14px 18px` |
| **Text link** | none | none | `var(--violet-lt)` | — | 0 |

Sizes: **sm** `9px 15px` / 13px · **md** `13px 22px` / 14px · **lg** `15px 26px` / 15.5px.

### States

| State | Treatment |
|---|---|
| Hover | `filter: brightness(1.12)` + `translateY(-1px)`, 0.2s |
| Active | `scale(0.97)`, spring |
| Focus | `2px solid var(--violet-lt)`, 2px offset — never remove the ring |
| Disabled | fill `var(--line2)`, text `var(--dim)`, `cursor: not-allowed`, no hover |
| Loading | label swaps to a spinner, width held, pointer events off |

Ghost hover moves `border-color` to `var(--violet)`, not the fill.

### Pills and chips

| Element | Radius | Padding | Notes |
|---|---|---|---|
| Status pill | 100px | `6px 13px` | 11px/700, `--*-tint` fill + `--*-line` border |
| Filter chip | 100px | `9px 16px` | Selected: `--tint-strong` + accent border + `--on-tint` |
| Nav pill | 100px | `0 13px`, h34 | Active: violet gradient fill, white label |
| Tag | 7px | `5px 10px` | 10.5px/700, +1px tracking |

**Selected state must be driven by a `data-on` attribute and a CSS attribute selector** (`.chip[data-on] { … }`), never by a JS inline-style write — the runtime re-applies template inline styles and reverts them. For the same reason do not put `transition: color` on a re-rendering element; it pins the computed colour at its start value.

---

## 4. Surfaces

| Element | Radius | Padding | Border | Shadow |
|---|---|---|---|---|
| Card | 18–20px | 22–26px | `1px var(--line)` | `--shadow` |
| Nested panel | 14–16px | 16–20px | `1px var(--line2)` | none |
| Modal sheet | 22–24px | 26px | `1px var(--line)` | `0 40px 90px rgba(0,0,0,.5)` |
| Input | 10–11px | `13px 15px` | `1px var(--line2)` | none |
| Pill / badge | 100px | `6px 13px` | tinted | none |

`--shadow`
- Dark: `0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px rgba(0,0,0,.35)`
- Light: `0 1px 2px rgba(20,23,38,.04), 0 12px 30px rgba(20,23,38,.06)`

Spacing scale: `4 6 8 10 12 14 16 18 22 26 32 40 56 64`. Grid gaps 14–20px; section rhythm 22–34px.

---

## 5. Layout

| Breakpoint | Behaviour |
|---|---|
| ≥ 1150px | Full — 12-col bento, 4-col grids, 250px legal rail, sidebar 264px |
| 860–1150px | `narrow` — 6-col bento, 2-col grids, rail unpins, sidebar collapsible |
| < 860px | `tight` — 1 col, rows drop secondary columns, search hides |

Content max-width 1400px; long-form reading column max-width 760–780px.

Reflow is driven in JS off the **root's measured width**, not media queries, because the design renders inside a resizable frame. Row-level decisions (dropping a table column) must be keyed to **that row's own measured width** — a 386px card inside a 1200px page still needs its narrow layout.

---

## 6. Motion

| Class | Duration | Easing |
|---|---|---|
| Micro (hover, toggle) | 0.2s | `ease` |
| Standard (position, panel) | 0.25–0.45s | `cubic-bezier(.4,0,.2,1)` |
| Entrance | 0.55–0.7s | `cubic-bezier(.2,.8,.2,1)` |
| Modal sheet | 0.42s | `cubic-bezier(.2,.9,.3,1)` |
| Data reveal | 1.1–1.6s | `cubic-bezier(.2,.8,.2,1)` |
| Route curtain | 1.66s total | `cubic-bezier(.76,0,.24,1)` |
| Ambient loop | 14–52s | `ease-in-out` |

### Rules

1. **Stagger siblings** at 60–70ms, capped around 0.5s total.
2. **Data draws itself** — rings draw stroke, bars fill from 0, counters count up, chart lines draw then fade in their area.
3. **The resting state is the finished state.** Pair every `requestAnimationFrame` reveal with a ~260ms `setTimeout` that writes the final value, so hidden tabs, print and screenshots never capture zero.
4. **One ambient loop per surface.** Never two competing.
5. **Reduced motion** removes loops and jumps to final values. It never removes information.

### Route transition (the curtain)

Full-screen `#07070E` panel, `clip-path` wipe up from the bottom. Sequence:

| t | Event |
|---|---|
| 0ms | `clip-path: inset(100% 0 0 0)` → `inset(0)`, 0.5s |
| 100ms | Shield mark fades + scales `0.88 → 1`, 0.75s |
| 120ms | Progress rule `0 → 100%`, 0.82s |
| 300ms | Tagline rises out of a clipping mask |
| 420ms | `#studentalumni` rises out of a clipping mask |
| 560ms | **Page swap happens behind the curtain** |
| 1040ms | Counter hits `100`; `clip-path` → `inset(0 0 100% 0)`, 0.6s |
| 1660ms | Curtain hidden, routing unlocked |

Guard with a `routing` flag so a double click cannot re-enter mid-transition.

---

## 7. Brand lockups

**SA shield** — `viewBox="0 0 300 350"`, three layers: outer plate (shield-outer gradient), inner bevel inset 20 units (shield-inner gradient), and `SA` at `font-size: 128, weight: 700, letter-spacing: -4px`. Files: `SA Logo.svg` (gradient), `SA Logo Solid.svg` (flat `#7331C9`), `SA Logo.png` (1200×1400, transparent).

**Footer lockup** — mandatory on every surface:

```
Built with love for students  ♥(#F0508F)  across all campus's
#studentalumni        ← 62px/700, −2.6px tracking, hashtag gradient, clipped to text
```

Left-aligned, tagline 17px/700 above the hashtag, `All right are recived @ Studt Alumni 2026` on the right of the same row. No divider rule above it.

---

## 8. Accessibility

- Text contrast ≥ **4.5:1** body, ≥ **3:1** for 18px+/bold. Both themes are audited; light mode uses the darker semantic values for exactly this reason.
- Focus visible on every interactive element — the accent ring, never `outline: none`.
- Icon-only controls carry `aria-label` **and** `title`.
- Colour is never the only signal: pair it with an icon, a label or a shape.
- Honour `prefers-reduced-motion`, and Global Privacy Control for cookie consent.

---

## 9. Component inventory

Ordered by how often you'll build it.

| Component | Key props / notes |
|---|---|
| Card | `tinted`, `interactive` |
| Button | `variant`, `size`, `color`, `loading`, `disabled` |
| Pill | `tone: ok / warn / danger / muted / accent` |
| Chip | `on`, `onToggle` — `data-on` driven |
| Field | `label`, `value`, `placeholder`, `error`, `suffixIcon` |
| Select | Chevron right, same box as Field |
| Toggle | 46×26 track, 20px knob, `left: 3 → 23px` |
| Checkbox | 22×22, 6px radius, tick fades in |
| Ring gauge | 46 / 76 / 112 / 150px; stroke 4 / 7 / 9 / 10; gradient stroke; `rotate(-90deg)` |
| Progress bar | 5–6px, gradient fill, animates from 0 |
| Counter | Cubic ease-out over 1s, `toLocaleString('en-IN')` |
| Stat row | Compact: icon chip 30px, label + sub left, value right, ~56px tall |
| Stat card | Label, value, delta — use the row when vertical space is tight |
| Bento tile | Grid span, cursor spotlight, 4px hover lift |
| Table | Header `--panel2`, rows split by `1px var(--line)`, 14px cells |
| Accordion | Chevron rotates 180°, body reveals |
| Jump rail | Sticky, 2px left border, active follows scroll |
| Marquee | Duplicated set, CSS translate loop, pauses on hover |
| Modal | Backdrop fade + sheet rise; closes on ✕, backdrop, Escape |
| Curtain | Route transition, see §6 |
| Image slot | `<image-slot id shape placeholder>` — never hand-draw photography |

---

## 10. Content rules

Sentence case headings, no terminal periods on labels. Indian number grouping and `₹`. Empty states name what's missing and the one action that fixes it. Numbers earn their place — no decorative stats. No emoji outside the greeting line.
