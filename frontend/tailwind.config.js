/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──────────────────────────────────────
        bg: {
          DEFAULT: 'var(--sa-bg)',
          elevated: 'var(--sa-bg-elevated)',
          inset: 'var(--sa-bg-inset)',
          glass: 'var(--sa-bg-glass)',
        },
        // ── Text ─────────────────────────────────────────────
        primary: 'var(--sa-text-primary)',
        secondary: 'var(--sa-text-secondary)',
        muted: 'var(--sa-text-muted)',
        faint: 'var(--sa-text-faint)',
        // ── Borders ──────────────────────────────────────────
        border: {
          DEFAULT: 'var(--sa-border)',
          subtle: 'var(--sa-border-subtle)',
          strong: 'var(--sa-border-strong)',
        },
        // ── Role Accents ────────────────────────────────────
        accent: {
          student: 'var(--sa-student)',
          alumni: 'var(--sa-alumni)',
          mentor: 'var(--sa-mentor)',
          college: 'var(--sa-college)',
          admin: 'var(--sa-admin)',
        },
        // ── Brand ────────────────────────────────────────────
        brand: {
          purple: '#7C5CFC',
          'purple-light': '#A78BFA',
          'purple-dark': '#6246E8',
          blue: '#3B82F6',
          cyan: '#22D3EE',
          amber: '#F59E0B',
        },
        // ── Status ───────────────────────────────────────────
        success: { DEFAULT: '#34D399', bg: 'rgba(52,211,153,0.12)' },
        danger: { DEFAULT: '#F0616B', bg: 'rgba(240,97,107,0.13)' },
        warning: { DEFAULT: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
        info: { DEFAULT: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
        // ── Glass Surfaces ───────────────────────────────────
        glass: {
          subtle: 'rgba(255,255,255,0.04)',
          light: 'rgba(255,255,255,0.06)',
          medium: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.12)',
        },
        // ── Named Colors (direct hex for non-CSS-var usage) ──
        white: '#FFFFFF',
        black: '#000000',
        purple: { DEFAULT: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', soft: 'rgba(124,58,237,0.15)' },
        blue: { DEFAULT: '#3B82F6', light: '#60A5FA', dark: '#2563EB', soft: 'rgba(59,130,246,0.15)' },
        green: { DEFAULT: '#34D399', light: '#6EE7B7', dark: '#059669', soft: 'rgba(52,211,153,0.15)' },
        amber: { DEFAULT: '#F59E0B', light: '#FBBF24', dark: '#D97706', soft: 'rgba(245,158,11,0.15)' },
        red: { DEFAULT: '#F0616B', light: '#F87171', dark: '#DC2626', soft: 'rgba(240,97,107,0.15)' },
        cyan: { DEFAULT: '#22D3EE', light: '#67E8F9', dark: '#06B6D4', soft: 'rgba(34,211,238,0.15)' },
        teal: { DEFAULT: '#14B8A6', light: '#5EEAD4', dark: '#0D9488' },
        rose: { DEFAULT: '#F43F5E', light: '#FB7185', dark: '#E11D48' },
        orange: { DEFAULT: '#FB923C', light: '#FDBA74', dark: '#F97316' },
        indigo: { DEFAULT: '#6366F1', light: '#818CF8', dark: '#4F46E5' },
        gray: {
          50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1',
          400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155',
          800: '#1E293B', 900: '#0F172A', 950: '#020617',
        },
      },
      fontFamily: {
        display: ['Manrope_400Regular', 'Manrope_500Medium', 'Manrope_600SemiBold', 'Manrope_700Bold', 'Manrope_800ExtraBold'],
        body: ['Outfit_400Regular', 'Outfit_500Medium', 'Outfit_600SemiBold', 'Outfit_700Bold'],
        sans: ['Outfit_400Regular', 'Outfit_500Medium', 'Outfit_600SemiBold', 'Outfit_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs: ['11px', { lineHeight: '16px' }],
        sm: ['12px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        md: ['14px', { lineHeight: '22px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '32px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },
      spacing: {
        xxs: '4px',
        xs: '6px',
        s: '8px',
        sm: '10px',
        m: '12px',
        n: '14px',
        md: '16px',
        l: '18px',
        xl: '22px',
        '2xl': '26px',
        '3xl': '32px',
        '4xl': '40px',
        mega: '56px',
        giga: '64px',
      },
      borderRadius: {
        none: '0',
        xs: '6px',
        sm: '8px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
        card: '18px',
        modal: '22px',
        hero: '24px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 18px 40px rgba(0,0,0,0.35)',
        elevated: '0 1px 0 rgba(255,255,255,0.03) inset, 0 24px 48px rgba(0,0,0,0.45)',
        glow: (color) => `0 0 20px ${color}33, 0 0 60px ${color}15`,
      },
      transitionDuration: {
        fast: '160ms',
        base: '220ms',
        slow: '320ms',
        cinematic: '480ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
