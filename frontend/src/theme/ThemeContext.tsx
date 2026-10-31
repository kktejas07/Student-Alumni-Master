// @ts-nocheck
/**
 * ThemeContext — light/dark theme provider with persisted preference.
 *
 * Honors:
 *   1. user-set override (AsyncStorage `apple-theme` = 'light' | 'dark' | 'system')
 *   2. system (Appearance.getColorScheme())
 *   3. defaults to 'system' on first run
 *
 * Usage:
 *   import { useTheme } from '@/src/theme/ThemeContext';
 *   const { theme, mode, setMode } = useTheme();
 *   <View style={{ backgroundColor: theme.bg }}>...</View>
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT, DARK, type Theme } from './apple';

type Mode = 'light' | 'dark' | 'system';
type Ctx = { theme: Theme; mode: Mode; setMode: (m: Mode) => void; isDark: boolean };

const ThemeContext = createContext<Ctx | null>(null);
/** Lets a subtree pin the *document* to dark (see ForceDarkTheme). */
const PinContext = createContext<() => () => void>(() => () => {});
/** Lets a subtree pin the *document* to light (see ForceLightTheme). */
const PinLightContext = createContext<() => () => void>(() => () => {});
const STORAGE_KEY = 'apple-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('dark');           // default dark theme
  const [systemDark, setSystemDark] = useState<boolean>(true);
  // Number of mounted ForceDarkTheme / ForceLightTheme subtrees; the document
  // follows whichever is active (a page-level pin beats the user's mode).
  const [darkPins, setDarkPins] = useState(0);
  const pinDark = React.useCallback(() => {
    setDarkPins((n) => n + 1);
    return () => setDarkPins((n) => Math.max(0, n - 1));
  }, []);
  const [lightPins, setLightPins] = useState(0);
  const pinLight = React.useCallback(() => {
    setLightPins((n) => n + 1);
    return () => setLightPins((n) => Math.max(0, n - 1));
  }, []);

  // Load persisted mode + listen to system changes
  useEffect(() => {
    let mounted = true;
    let local: string | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        local = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('theme');
      } catch {}
    }
    if (local === 'light' || local === 'dark' || local === 'system') {
      setModeState(local as Mode);
    } else {
      AsyncStorage.getItem(STORAGE_KEY).then((m) => {
        if (mounted && (m === 'light' || m === 'dark' || m === 'system')) {
          setModeState(m as Mode);
        } else if (mounted) {
          setModeState('dark');
        }
      }).catch(() => {});
    }

    setSystemDark(Appearance.getColorScheme() === 'dark');
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemDark(colorScheme === 'dark');
    });
    return () => { mounted = false; sub?.remove?.(); };
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {}
    }
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemDark) || (mode !== 'light' && mode !== 'system' ? true : false);
  const theme = isDark ? DARK : (LIGHT as unknown as Theme);

  // Sync with document element for CSS override method. A mounted page-level
  // pin (ForceDarkTheme / ForceLightTheme) overrides the user's mode for the
  // document, so the global CSS-vars / scrollbar / <html> never disagree with
  // the pinned subtree.
  // A mounted *dark* commit (ForceDarkTheme, e.g. a dark-only portal) wins
  // over any light pin: an embedded light page (e.g. /deals inside the
  // alumni portal) must not re-theme the document underneath a dark portal.
  const documentDark = darkPins > 0 || (lightPins === 0 && isDark);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      if (documentDark) {
        root.classList.remove('light-mode');
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.add('light-mode');
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
      } catch {}
    }
  }, [isDark, documentDark, lightPins, darkPins, mode]);

  const value = useMemo<Ctx>(() => ({ theme, mode, setMode, isDark }), [theme, mode, isDark]);
  return (
    <PinContext.Provider value={pinDark}>
      <PinLightContext.Provider value={pinLight}>
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
      </PinLightContext.Provider>
    </PinContext.Provider>
  );
}

/**
 * Pins a subtree to the dark theme regardless of the user's mode. Used by
 * `PortalShell` for portals whose views still hardcode dark colours, so the
 * shell and the content can never disagree. `setMode` still updates the
 * global preference so the choice carries over to theme-aware portals.
 */
export function ForceDarkTheme({ children }: { children: React.ReactNode }) {
  const parent = useTheme();
  const pinDark = useContext(PinContext);
  useEffect(() => pinDark(), [pinDark]);
  const value = useMemo<Ctx>(
    () => ({ theme: DARK, mode: 'dark', setMode: parent.setMode, isDark: true }),
    [parent.setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ForceLightTheme({ children }: { children: React.ReactNode }) {
  const parent = useTheme();
  const pinLight = useContext(PinLightContext);
  useEffect(() => pinLight(), [pinLight]);
  const value = useMemo<Ctx>(
    () => ({ theme: LIGHT as unknown as Theme, mode: 'light', setMode: parent.setMode, isDark: false }),
    [parent.setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback so primitives don't crash if used outside the provider.
    return { theme: DARK as unknown as Theme, mode: 'dark', setMode: () => {}, isDark: true };
  }
  return ctx;
}
