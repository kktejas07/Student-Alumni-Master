# StudentAlumni — React Native

Three screens ported from the HTML designs: **Landing**, **Onboarding**, **Dashboard**.
Token values and motion timings follow `design.md` at the project root.

## Install

```bash
npx create-expo-app studentalumni
cd studentalumni
npx expo install react-native-svg expo-linear-gradient @expo-google-fonts/manrope @expo-google-fonts/outfit expo-font
```

Copy this folder's contents into `src/`, then point `App.js` at `src/App`.

## Files

| File | What it is |
|---|---|
| `theme.js` | Dark + Light token sets, spacing, radius, type scale, `useTheme()` |
| `components/ui.js` | Card, Pill, Btn, Field, Label, Row, ProgressBar, Ring, StatRow, Chip |
| `screens/LandingScreen.js` | Hero, marquee, feature cards, footer |
| `screens/OnboardingScreen.js` | Multi-step flow with progress bar, chips, perks, SA card |
| `screens/DashboardScreen.js` | Bento grid, readiness ring, tasks, matches, events marquee |
| `App.js` | Font loading, theme provider, bottom tab switch |

## Notes

- No CSS: every value is a StyleSheet number or a token from `theme.js`.
- Gradients use `expo-linear-gradient`; rings and charts use `react-native-svg`.
- Ambient loops use `Animated.loop` with `useNativeDriver: true`. Respect `AccessibilityInfo.isReduceMotionEnabled()` — the screens read it once on mount and skip loops.
- Web shadows map to `shadowColor/Opacity/Radius/Offset` on iOS and `elevation` on Android; both are in `theme.shadow`.
