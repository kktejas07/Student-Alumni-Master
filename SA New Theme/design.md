# StudentAlumni — Design Specification

Covers the three built surfaces: **Landing** (`Student Alumni Landing Motion v2`), **Onboarding** (`Student Alumni Onboarding`) and **App** (`Student Alumni Dashboard` — login, setup, dashboard, profile, rentals, bookings).

Every surface ships a Dark and a Light theme. Dark is the default.

---

## 1. Foundations

### 1.1 Typography

| Surface | Family | Weights |
|---|---|---|
| Landing, Onboarding | Manrope | 400, 500, 600, 700, 800 |
| App (dashboard) | Outfit | 400, 500, 600, 700 |

Scale as used, in px:

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display (landing hero) | 76–92 | 700 | −3px |
| Page title | 34–40 | 700 | −1.5px |
| Section title | 24–27 | 700 | −0.7px |
| Card title | 18–20 | 700 | −0.3px |
| Body large | 15–16.5 | 400 | 0 |
| Body | 13.5–14.5 | 400/500 | 0 |
| Meta / caption | 12–13 | 400 | 0 |
| Eyebrow / label | 10.5–12 | 700 | +1.2 to +1.8px, uppercase |
| Numeric display | 30–40 | 700 | −1.2px |

Line height: 1.5–1.65 for body copy, 1.05–1.15 for display.

### 1.2 Colour — App (Outfit surfaces)

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#08080F` | `#F4F5FA` |
| `--panel` | `#101019` | `#FFFFFF` |
| `--panel2` | `#14141F` | `#F3F4FA` |
| `--line` | `#1F1F30` | `#E4E6F0` |
| `--line2` | `#262638` | `#D9DCEA` |
| `--text` | `#F4F4FA` | `#141726` |
| `--muted` | `#8A8A9E` | `#565B70` |
| `--dim` | `#6A6A7E` | `#6B7080` |
| `--violet` (accent) | `#7C5CFC` | `#6A4FE0` |
| `--violet-lt` | `#A78BFA` | `#5B4FE9` |
| `--accent-line` | `#2C2A52` | `#D6D2FA` |
| `--tint-strong` | `rgba(124,92,252,.18)` | `rgba(106,79,224,.14)` |
| `--on-tint` | `#F4F4FA` | `#3B2FA8` |
| `--on-accent` | `#0C0C14` | `#FFFFFF` |
| `--ok` | `#34D399` | `#047857` |
| `--amber` | `#F59E0B` | `#B45309` |
| `--danger` | `#F0616B` | `#BE123C` |

Category accents (`--cat1…7`), used for rental categories and marquee dots:

| | Dark | Light |
|---|---|---|
| cat1 | `#7C5CFC` | `#4F46C7` |
| cat2 | `#2FB8C6` | `#0E6E8C` |
| cat3 | `#F59E0B` | `#B45309` |
| cat4 | `#DB2777` | `#A21C63` |
| cat5 | `#34D399` | `#047857` |
| cat6 | `#4C8DF6` | `#1E56C4` |
| cat7 | `#A78BFA` | `#5B4FE9` |

### 1.3 Colour — Landing & Onboarding (Manrope surfaces)

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#05060F` | `#FAFAFC` |
| `--bg2` | `#05060D` | `#F3F3F7` |
| `--card` | `#0C0E1B` | `#FFFFFF` |
| `--card2` | `#0E1020` | `#F7F7FB` |
| `--line` | `#1B1E33` | `#E4E5EC` |
| `--line2` | `#171A2C` | `#EDEEF3` |
| `--line-hi` | `#2A2A55` | `#C4BFF6` |
| `--dot` | `#2A2E45` | `#CFD2DD` |
| `--text` | `#F4F5FB` | `#14161D` |
| `--text2` | `#D5D8E4` | `#2B2E3A` |
| `--muted` | `#9AA0B4` | `#5C6273` |
| `--ind` (accent) | `#5B4FE9` | `#5B4FE9` |
| `--ind-lt` | `#8B84FF` | `#4B41C9` |

Onboarding gradient ramp (used for the progress bar and the SA card face): `#7C6BFF → #4C8DF6 → #2FB8C6 → #34D3A6`.

### 1.4 Contrast rule

Any element with a **literal** background (brand gradients, coloured monograms, filled buttons) must declare its own text colour. Inheriting a themed `--text` token is the single most common failure — it produces dark ink on dark gradients in Light mode. Use `--on-accent` for filled accent buttons and `--on-tint` for tinted selected states.

### 1.5 Spacing, radius, elevation

Spacing steps: 4, 6, 8, 10, 12, 14, 16, 18, 22, 26, 32, 40, 56, 64.

| Radius | Use |
|---|---|
| 6–9px | chips, small tags, code pills |
| 10–12px | buttons, inputs, icon chips |
| 14–16px | nested panels inside a card |
| 18–20px | cards, primary surfaces |
| 22–24px | modal sheets |
| 100px | pills, badges |

Elevation is one token, `--shadow`:
- Dark: `0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px rgba(0,0,0,.35)`
- Light: `0 1px 2px rgba(20,23,38,.04), 0 12px 30px rgba(20,23,38,.06)`

Modal sheets use `0 40px 90px rgba(0,0,0,.5)`.

---

## 2. Motion

Durations: micro 0.2s, standard 0.25–0.45s, entrance 0.55–0.7s, data reveal 1.1–1.6s, ambient 14–48s.

Easings:
- `cubic-bezier(.2,.8,.2,1)` — entrances, growth, bars and rings
- `cubic-bezier(.4,0,.2,1)` — position changes, card flips, path draws
- `cubic-bezier(.2,.9,.3,1)` — modal sheets
- `ease-in-out` — ambient loops

Rules:
1. **Staggered entrances.** Sibling cards animate in at 60–70ms intervals, capped around 10 items.
2. **Data draws itself.** Rings draw their stroke, bars fill from zero, counters count up, chart lines draw then fade in their area, then points pop in sequence.
3. **Resting state is the finished state.** Every rAF-driven reveal is paired with a ~260ms timeout that writes the final value, so hidden-tab loads, print and screenshots never show zero.
4. **Ambient motion is slow and singular.** One drifting light field per surface, 14–48s periods. Never two competing loops.
5. **Reduced motion** removes loops and jumps to final values; it never removes information.

### Signature interactions

| Interaction | Behaviour |
|---|---|
| Sidebar active pill | Violet gradient pill on the selected row; nav auto-scrolls a selection into view |
| Bento tile spotlight | A radial highlight tracks the cursor inside each tile's border; tile lifts 4px |
| Carousel | 6s cross-fade, pauses on hover, dot rail with a widened active dot |
| Marquee | Continuous horizontal scroll of duplicated sets, pauses on hover |
| SA card flip | 3D `rotateY` over 0.85s, faces swapped mid-rotation so no mirrored text appears |
| Modal | Backdrop fade + sheet rise 16px with scale 0.985 → 1; closes on ✕, backdrop, Escape |

---

## 3. Components

**Card** — `--panel` fill, 1px `--line` border, 18–20px radius, `--shadow`, 20–26px padding.

**Compact stat row** — icon chip 30px, label + sub-line left, value right. ~56px tall; the dense alternative to a stat card.

**Pill / badge** — 100px radius, 11–12.5px 700 text, tinted background with a matching border. Status colours: `--ok` verified, `--amber` pending, `--muted` not connected.

**Button**
- Primary: `--violet` fill, `--on-accent` text, 9–12px radius, 11–14px vertical padding
- Ghost: transparent, 1px `--line2`, `--muted` text
- Filled semantic: `--amber` or category colour with `--on-accent` text

**Field** — `--panel2` fill, 1px `--line2`, 10–11px radius, 12–14px padding, 14px text. Placeholder uses `--dim`. Label above: 11px 700 uppercase `--muted`, +1.2px tracking.

**Ring gauge** — 46 / 76 / 112 / 150px diameters, stroke 4 / 7 / 9 / 10px, round cap, rotated −90°, gradient stroke `--violet-lt → #2FB8C6`, percentage centred.

**Selectable chip** — 100px radius, 9×15px padding; selected state carries `--tint-strong` fill, accent border and `--on-tint` text. Driven by a `data-on` attribute, never by an inline style write.

**Listing card** (rentals) — 104px tinted header with a category glyph, Verified and discount badges, then title, location, amenity tags, rating, units left, perk strip and struck-through pricing.

**Modal** — centred sheet, max-width 460 / 620 / 720 / 980px, `max-height: 90vh`, internal scroll, sticky header where the body is long.

---

## 4. Screen inventory

**Landing** — nav, hero with counter and curtain, marquees, dashboard mock, sticky card stack, roadmap, photo deck, match graph, testimonials, footer (`Build with love for student` / `#studentaumni` / rights line).

**Onboarding** — 15 steps (student), 10 (alumnus), 9 (college): who-you-are, account, verify, course, goal, skills, resume, interests, mentor prefs, notifications, roadmap reveal, suggested mentors, perks & coupons, digital SA card, done. Sticky header with a gradient progress bar, step counter and breadcrumb; sticky footer with back / continue.

**App** — login, six-step setup, bento dashboard (readiness, today's focus, streak, next session, applications, top matches, mentors, network, events marquee), profile (7 tabs, completion ring, identity, DigiLocker, academics, interests, projects, skills), rentals marketplace and the three-step booking flow, digital ID card modal, bookings.

---

## 5. Content rules

Sentence case for headings, no terminal periods on labels. Numbers use Indian grouping and ₹ for currency. Empty states state what's missing and the one action that fixes it. Perk and discount copy names the concrete benefit, never "save more". No emoji outside the greeting line.
