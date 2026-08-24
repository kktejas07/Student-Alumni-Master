import React, { createContext, useContext, useMemo, useState } from 'react';

export const dark = {
  name: 'dark',
  bg: '#08080F', bg2: '#05060D', panel: '#101019', panel2: '#14141F',
  line: '#1F1F30', line2: '#262638',
  text: '#F4F4FA', text2: '#D5D8E4', muted: '#8A8A9E', dim: '#6A6A7E',
  accent: '#7C5CFC', accentLt: '#A78BFA', accentLine: '#2C2A52',
  tint: 'rgba(124,92,252,0.10)', tintStrong: 'rgba(124,92,252,0.18)',
  onTint: '#F4F4FA', onAccent: '#0C0C14',
  ok: '#34D399', okTint: 'rgba(16,185,129,0.13)', okLine: '#17503E',
  amber: '#F59E0B', amberTint: 'rgba(245,158,11,0.10)', amberLine: '#4A3410',
  danger: '#F0616B', dangerTint: 'rgba(240,97,107,0.13)',
  cats: ['#7C5CFC', '#2FB8C6', '#F59E0B', '#DB2777', '#34D399', '#4C8DF6', '#A78BFA'],
  ramp: ['#7C6BFF', '#4C8DF6', '#2FB8C6', '#34D3A6'],
  glow: ['rgba(124,107,255,0.22)', 'rgba(47,184,198,0.15)'],
  shadow: {
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 }, elevation: 8
  }
};

export const light = {
  name: 'light',
  bg: '#F4F5FA', bg2: '#F3F3F7', panel: '#FFFFFF', panel2: '#F3F4FA',
  line: '#E4E6F0', line2: '#D9DCEA',
  text: '#141726', text2: '#2B2E3A', muted: '#565B70', dim: '#6B7080',
  accent: '#6A4FE0', accentLt: '#5B4FE9', accentLine: '#D6D2FA',
  tint: 'rgba(106,79,224,0.08)', tintStrong: 'rgba(106,79,224,0.14)',
  onTint: '#3B2FA8', onAccent: '#FFFFFF',
  ok: '#047857', okTint: 'rgba(4,120,87,0.10)', okLine: '#A7E3C8',
  amber: '#B45309', amberTint: 'rgba(180,83,9,0.10)', amberLine: '#F1D2A5',
  danger: '#BE123C', dangerTint: 'rgba(190,18,60,0.09)',
  cats: ['#4F46C7', '#0E6E8C', '#B45309', '#A21C63', '#047857', '#1E56C4', '#5B4FE9'],
  ramp: ['#5B4FE9', '#3F7FE8', '#2FB8C6', '#2FAF7E'],
  glow: ['rgba(91,79,233,0.12)', 'rgba(47,184,198,0.10)'],
  shadow: {
    shadowColor: '#141726', shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 4
  }
};

export const space = { xs: 6, sm: 10, md: 14, lg: 18, xl: 26, xxl: 40 };
export const radius = { chip: 8, ctl: 11, nest: 16, card: 20, sheet: 24, pill: 100 };

export const type = {
  display: { fontFamily: 'Manrope_700Bold', fontSize: 40, letterSpacing: -1.6, lineHeight: 45 },
  h1: { fontFamily: 'Outfit_700Bold', fontSize: 27, letterSpacing: -0.8 },
  h2: { fontFamily: 'Outfit_700Bold', fontSize: 20, letterSpacing: -0.4 },
  h3: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  body: { fontFamily: 'Outfit_400Regular', fontSize: 14.5, lineHeight: 22 },
  meta: { fontFamily: 'Outfit_400Regular', fontSize: 12.5 },
  label: { fontFamily: 'Outfit_700Bold', fontSize: 11, letterSpacing: 1.3 },
  num: { fontFamily: 'Outfit_700Bold', fontSize: 30, letterSpacing: -1.1 }
};

const Ctx = createContext({ t: dark, toggle: () => {} });

export function ThemeProvider({ children, initial = 'dark' }) {
  const [name, setName] = useState(initial);
  const value = useMemo(() => ({
    t: name === 'dark' ? dark : light,
    toggle: () => setName((n) => (n === 'dark' ? 'light' : 'dark'))
  }), [name]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
