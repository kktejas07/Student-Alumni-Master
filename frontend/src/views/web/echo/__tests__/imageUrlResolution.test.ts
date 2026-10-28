/**
 * resolveImageUrl contract tests — image URL normalization for the ECHO
 * public surfaces (landing cards, detail hero, portal views).
 *
 * Regression context: the local ECHO landing page produced
 *   GET http://localhost:8000/images/hackwave/hackwave_main_poster.png → 404
 *   GET http://localhost:8000/images/hackwave/hackwave_techfest_verticals.jpg → 404
 * because every root-relative path was prefixed with the API BASE_URL, while
 * those assets are frontend-bundled public files (frontend/public/images/...)
 * served by the web host (Expo dev server locally, nginx in production).
 * The backend's only static mount is /uploads (backend/server.py).
 *
 * Contract pinned here:
 * - /uploads/...  → absolute API origin (backend-served; native needs absolute)
 * - any other root-relative path → stays relative to the web origin
 * - absolute http(s)/data/blob URLs pass through untouched
 * - degenerate inputs normalize to ''
 */
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-constants', () => ({
  default: { expoConfig: null, manifest2: null, manifest: null },
}));

describe('resolveImageUrl — ECHO image URL normalization', () => {
  let resolveImageUrl: (url?: any) => string;
  let BASE_URL: string;

  beforeAll(async () => {
    // api.ts computes BASE_URL at module load — set the env first.
    process.env.EXPO_PUBLIC_BACKEND_URL = 'http://localhost:8000';
    const mod = await import('../../../../models/services/api');
    resolveImageUrl = mod.resolveImageUrl;
    BASE_URL = mod.BASE_URL;
  });

  it('resolves BASE_URL from the backend env in this environment', () => {
    expect(BASE_URL).toBe('http://localhost:8000');
  });

  it('sends /uploads/ paths to the API origin (backend static mount)', () => {
    expect(resolveImageUrl('/uploads/echo/1786398252_echo-vnr-202-pt.jpg.jpeg')).toBe(
      'http://localhost:8000/uploads/echo/1786398252_echo-vnr-202-pt.jpg.jpeg'
    );
    expect(resolveImageUrl('uploads/echo/poster.png')).toBe(
      'http://localhost:8000/uploads/echo/poster.png'
    );
  });

  it('keeps frontend-bundled /images/ paths on the web origin (404 regression lock)', () => {
    // These two exact paths were the reported local 404s. They must NOT be
    // prefixed with the API origin anymore.
    expect(resolveImageUrl('/images/hackwave/hackwave_main_poster.png')).toBe(
      '/images/hackwave/hackwave_main_poster.png'
    );
    expect(resolveImageUrl('/images/hackwave/hackwave_techfest_verticals.jpg')).toBe(
      '/images/hackwave/hackwave_techfest_verticals.jpg'
    );
    expect(resolveImageUrl('images/hackwave/hackwave_main_poster.png')).toBe(
      '/images/hackwave/hackwave_main_poster.png'
    );
  });

  it('keeps other frontend-bundled public assets on the web origin', () => {
    expect(resolveImageUrl('/HackWave_3.0_Event_Handbook.pdf')).toBe(
      '/HackWave_3.0_Event_Handbook.pdf'
    );
    expect(resolveImageUrl('/logos/sa_logo.svg')).toBe('/logos/sa_logo.svg');
  });

  it('passes absolute and inline URLs through untouched', () => {
    expect(resolveImageUrl('https://picsum.photos/seed/echo2026-hero/1200/700')).toBe(
      'https://picsum.photos/seed/echo2026-hero/1200/700'
    );
    expect(resolveImageUrl('http://example.com/a.png')).toBe('http://example.com/a.png');
    expect(resolveImageUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(resolveImageUrl('blob:https://example.com/uuid')).toBe('blob:https://example.com/uuid');
  });

  it('normalizes degenerate inputs to an empty string (missing-image fallback input)', () => {
    expect(resolveImageUrl('')).toBe('');
    expect(resolveImageUrl(null)).toBe('');
    expect(resolveImageUrl(undefined)).toBe('');
    expect(resolveImageUrl(123)).toBe('');
    expect(resolveImageUrl({})).toBe('');
  });
});
