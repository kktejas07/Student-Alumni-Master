// theme tokens (DARK_T/LIGHT_T), the global motion-CSS injector, and the STYLES_KEY — split verbatim from LandingPage.tsx (audit Step 6b).
// @ts-nocheck
export const DARK_T = {
  bg: '#05060F',
  bg2: '#05060D',
  surface: '#0A0C18',
  card: '#0C0E1B',
  card2: '#0E1020',
  cardHi: '#12142B',
  well: '#090B16',
  line: '#1B1E33',
  line2: '#171A2C',
  lineHi: '#2A2A55',
  dot: '#2A2E45',
  text: '#F4F5FB',
  text2: '#D5D8E4',
  muted: '#9AA0B4',
  muted2: '#B6BACB',
  dim: '#5C6273',
  ind: '#5B4FE9',
  indLt: '#8B84FF',
  indGlow: '#C08BFF',
  cyan: '#6FA8F5',
  pink: '#F0A6E8',
  green: '#34D399',
  amber: '#F5B342',
  tint: 'rgba(91,79,233,0.16)',
  tint2: 'rgba(91,79,233,0.18)',
  shadow: 'rgba(0,0,0,0.5)',
};
export const LIGHT_T = {
  bg: '#FFFFFF',
  bg2: '#F5F5F7',
  surface: '#F0F0F5',
  card: '#FFFFFF',
  card2: '#FFFFFF',
  cardHi: '#F0F0F5',
  well: '#F5F5F7',
  line: '#E5E5EA',
  line2: '#E8E8ED',
  lineHi: '#D1D1D6',
  dot: '#C7C7CC',
  text: '#1D1D1F',
  text2: '#3A3A3C',
  muted: '#6E6E73',
  muted2: '#8E8E93',
  dim: '#AEAEB2',
  ind: '#5B4FE9',
  indLt: '#7C5CFC',
  indGlow: '#5B4FE9',
  cyan: '#3478F6',
  pink: '#D63384',
  green: '#30B650',
  amber: '#E8A000',
  tint: 'rgba(91,79,233,0.10)',
  tint2: 'rgba(91,79,233,0.12)',
  shadow: 'rgba(0,0,0,0.08)',
};
export const T = DARK_T;

/* ── Global Styles Injection for Web ── */
export const STYLES_KEY = 'sa-interactive-motion-css';
export function injectGlobalStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLES_KEY)) return;
  const s = document.createElement('style');
  s.id = STYLES_KEY;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; overflow-x: hidden; }
    
    @keyframes sa-twinkle {
      0%, 100% { opacity: 0.25; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes sa-pulse-glow {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50% { opacity: 0.75; transform: scale(1.08); }
    }
    @keyframes sa-radar-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes sa-float-slow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes sa-sway {
      0%, 100% { transform: perspective(1200px) rotateY(-14deg) translateY(0); }
      50% { transform: perspective(1200px) rotateY(14deg) translateY(-14px); }
    }
    @keyframes sa-ping {
      0% { r: 52px; opacity: 0.6; }
      100% { r: 140px; opacity: 0; }
    }
    @keyframes sa-tick {
      0%, 100% { box-shadow: 0 0 0 0 rgba(91,79,233,0); }
      50% { box-shadow: 0 0 0 6px rgba(91,79,233,0.22); }
    }
    @keyframes sa-shine-sweep {
      0% { transform: translateX(-180px) translateY(-180px) rotate(25deg); opacity: 0; }
      18% { opacity: 0.95; }
      46% { transform: translateX(420px) translateY(420px) rotate(25deg); opacity: 0; }
      100% { transform: translateX(420px) translateY(420px) rotate(25deg); opacity: 0; }
    }
    @keyframes sa-text-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes sa-badge-pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(139,132,255,0.45)); }
      50% { transform: scale(1.04); filter: drop-shadow(0 0 35px rgba(139,132,255,0.85)); }
    }
    @keyframes sa-marquee-l {
      0% { transform: translateX(0); }
      100% { transform: translateX(-25%); }
    }
    @keyframes sa-marquee-r {
      0% { transform: translateX(-25%); }
      100% { transform: translateX(0); }
    }
    .sa-mq-wrap-l {
      display: flex !important;
      flex-direction: row !important;
      width: max-content !important;
      animation: sa-marquee-l 36s linear infinite !important;
    }
    .sa-mq-wrap-r {
      display: flex !important;
      flex-direction: row !important;
      width: max-content !important;
      animation: sa-marquee-r 32s linear infinite !important;
    }
    .sa-mq-wrap-l:hover, .sa-mq-wrap-r:hover {
      animation-play-state: paused !important;
    }

    @keyframes sa-dash-flow {
      from { stroke-dashoffset: 34; }
      to { stroke-dashoffset: 0; }
    }
    .sa-dash-flowing {
      animation: sa-dash-flow 1.2s linear infinite !important;
    }
    .sa-dash-fast {
      animation: sa-dash-flow 0.8s linear infinite !important;
    }

    .sa-shield-glow { animation: sa-pulse-glow 6s ease-in-out infinite; }
    .sa-shield-sway { animation: sa-sway 8s ease-in-out infinite; transform-style: preserve-3d; }
    .sa-radar-spin { transform-origin: 310px 270px; animation: sa-radar-spin 7s linear infinite; }
    .sa-float-slow { animation: sa-float-slow 5s ease-in-out infinite; }
    .sa-shine-anim { animation: sa-shine-sweep 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    .sa-ping-ring { animation: sa-ping 3.6s ease-out infinite; transform-origin: 310px 270px; }
    .sa-ping-ring-delayed { animation: sa-ping 3.6s ease-out infinite 1.8s; transform-origin: 310px 270px; }
  `;
  document.head.appendChild(s);
}
if (typeof document !== 'undefined') injectGlobalStyles();
