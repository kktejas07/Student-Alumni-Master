# Theme

One source of truth for colour, type, spacing and radius.

| What | Where | Import |
|---|---|---|
| Primitive palette (`COLORS`), brand (`BRAND`), per-portal accents (`PORTAL_ACCENTS`), `SPACING`, `RADIUS`, `GLASS`, motion | `src/theme/tokens.ts` | `@/src/theme/tokens` |
| Typography: registered font names (`FONT`, `FONTS`, `TYPO`), web stacks (`FONT_STACK`), scale | `src/theme/typography.ts` | `@/src/theme/typography` |
| Light/dark switch | `src/theme/ThemeContext.tsx` | `useTheme()` |

Portal token files (`portals/student/tokens.ts`, `portals/superadmin/tokens.ts`,
`views/web/theme/alumniTokens.ts`) only *derive* semantic names (`SC`, `SAC`,
`PALETTE`) from the files above. They must not introduce new hex values.

## Type system

- Body / UI: **DM Sans** (`DMSans_400Regular` … `DMSans_800ExtraBold`)
- Display: **Outfit**
- Mono: **SpaceMono** (one weight, bundled)

These are the only families loaded in `app/_layout.tsx`. `PlusJakartaSans_*`,
`JetBrainsMono_*`, `Manrope_*` and `Inter` no longer exist in this codebase.

## Rules

1. No new colour literals (`#hex`, `rgb()`, `rgba()`) outside `src/theme/`.
   ESLint warns on them; the warning count is the burn-down list (about 17,000
   literals at the time this file was written).
2. New components go in the shared kit and take a `tokens`/`accent` prop rather
   than importing a portal's token file directly.
3. Status colours (success / warning / danger / info) come from `COLORS.green`,
   `COLORS.amber`, `COLORS.red`, `COLORS.blue`; they are not an accent.
