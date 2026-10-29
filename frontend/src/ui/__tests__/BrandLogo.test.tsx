/**
 * D13 — BrandLogo component tests.
 *
 * Unit-tests the exported pure helpers (initials, color, metrics) and uses
 * source-level guards for the render paths (image vs fallback, Clearbit URL
 * construction, error handling) — full component mounts of RN trees aren't
 * feasible under this repo's node-based jest env, matching the precedent in
 * src/views/web/echo/__tests__ (source-guard style).
 */
import fs from 'fs';
import path from 'path';
import {
  brandColor,
  brandInitials,
  brandLogoMetrics,
  BRAND_LOGO_PALETTE,
} from '../BrandLogo';

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '..', rel), 'utf8');

const BRAND_LOGO_SRC = read('frontend/src/ui/BrandLogo.tsx');

describe('brandInitials', () => {
  it('single word → first two letters, uppercased (JetBrains → JB)', () => {
    expect(brandInitials('JetBrains')).toBe('JB');
    expect(brandInitials('Spotify')).toBe('SP');
    expect(brandInitials('swiggy')).toBe('SW');
  });

  it('multi-word → first letter of each of the first two words', () => {
    expect(brandInitials('HDFC Bank')).toBe('HB');
  });

  it('single word under 4 chars keeps first two letters; camelCase splits at the transition', () => {
    expect(brandInitials('Domino’s')).toBe('DO');
    expect(brandInitials('GitHub')).toBe('GH'); // "iH" transition → first letter + H
    expect(brandInitials('swiggy')).toBe('SW');
  });

  it('blank input → safe placeholder', () => {
    expect(brandInitials('')).toBe('?');
    expect(brandInitials('   ')).toBe('?');
  });

  it('never exceeds 2 characters', () => {
    for (const name of ['GitHub', 'GitHub Pro (Free for Students)', 'Air India Express', 'Zomato']) {
      expect(brandInitials(name).length).toBeLessThanOrEqual(2);
    }
  });
});

describe('brandColor', () => {
  it('is deterministic — same brand always maps to the same color', () => {
    for (const name of ['Swiggy', 'GitHub', 'JetBrains', 'Spotify', 'HDFC Bank']) {
      expect(brandColor(name)).toBe(brandColor(name));
      expect(brandColor(name.toLowerCase())).toBe(brandColor(name));
    }
  });

  it('always returns a color from the 12-color palette', () => {
    for (const name of ['A', 'Swiggy', 'GitHub', 'JetBrains', 'Zomato', 'Airline', 'Binance']) {
      expect(BRAND_LOGO_PALETTE).toContain(brandColor(name));
    }
  });

  it('palette has exactly 12 colors', () => {
    expect(BRAND_LOGO_PALETTE).toHaveLength(12);
    expect(new Set(BRAND_LOGO_PALETTE).size).toBe(12);
  });

  it('accentColor wins over the hash pick', () => {
    expect(brandColor('Swiggy', '#FF00AA')).toBe('#FF00AA');
    expect(brandColor('Swiggy', '')).toBe(brandColor('Swiggy'));
  });
});

describe('brandLogoMetrics', () => {
  it('snapshots metrics at the two card sizes (36, 48)', () => {
    expect(brandLogoMetrics(36)).toMatchSnapshot();
    expect(brandLogoMetrics(48)).toMatchSnapshot();
  });

  it('radius = 0.28×size, fontSize = 0.38×size, rounded', () => {
    expect(brandLogoMetrics(36)).toEqual({ radius: 10, fontSize: 14 });
    expect(brandLogoMetrics(48)).toEqual({ radius: 13, fontSize: 18 });
  });
});

describe('BrandLogo render paths (source guards)', () => {
  it('logoUrl prop wins over domain when both are set', () => {
    expect(BRAND_LOGO_SRC).toContain(
      'const imageUri = logoUrl || (domain ? `https://logo.clearbit.com/${domain}` : null);'
    );
  });

  it('renders <Image> while a URI is available and no error has occurred', () => {
    expect(BRAND_LOGO_SRC).toContain('if (imageUri && !failed) {');
    expect(BRAND_LOGO_SRC).toContain('resizeMode="contain"');
    expect(BRAND_LOGO_SRC).toContain('accessibilityLabel={brand}');
  });

  it('falls back to initials circle on ANY image load error', () => {
    expect(BRAND_LOGO_SRC).toContain('onError');
    expect(BRAND_LOGO_SRC).toContain('setFailed(true)');
  });

  it('fallback circle uses brandColor + centered initials', () => {
    expect(BRAND_LOGO_SRC).toContain('backgroundColor: brandColor(brand, accentColor)');
    expect(BRAND_LOGO_SRC).toContain('{brandInitials(brand)}');
  });
});
