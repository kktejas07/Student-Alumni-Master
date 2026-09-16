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
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT, DARK, type Theme } from './apple';

type Mode = 'light' | 'dark' | 'system';
type Ctx = { theme: Theme; mode: Mode; setMode: (m: Mode) => void; isDark: boolean };

const ThemeContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'apple-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('dark');           // default dark theme
  const [systemDark, setSystemDark] = useState<boolean>(true);

  // Load persisted mode + listen to system changes
  useEffect(() => {
    let mounted = true;
    const local = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || localStorage.getItem('theme') : null;
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
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {}
    }
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemDark) || (mode !== 'light' && mode !== 'system' ? true : false);
  const theme = isDark ? DARK : (LIGHT as unknown as Theme);

  // Sync with document element for CSS override method
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
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
  }, [isDark, mode]);

  const value = useMemo<Ctx>(() => ({ theme, mode, setMode, isDark }), [theme, mode, isDark]);
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
