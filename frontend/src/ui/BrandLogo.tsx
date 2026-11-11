/**
 * BrandLogo — real brand logos with a graceful, deterministic fallback.
 *
 * Resolution order:
 *   1. `logoUrl` prop (aggregator-provided) → <Image>
 *   2. `domain` prop → https://logo.clearbit.com/{domain} (free, no key)
 *   3. On ANY image load error → colored circle with brand initials
 *
 * Fallback circle: `accentColor` or a deterministic 12-color palette chosen
 * by hash of the brand name, with up to 2 initials ("JetBrains" → "JB").
 *
 * Uses: deal/coupon cards, course providers, internship employers, network
 * orgs — anywhere a brand/provider logo is shown.
 */
import React, { useState } from 'react';
import { Image, Text, View, type ImageErrorEvent, type ViewStyle } from 'react-native';

/** Deterministic 12-color palette for the fallback circle. */
export const BRAND_LOGO_PALETTE: readonly string[] = [
  '#24292F', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#059669',
  '#3B82F6', '#6366F1', '#7C3AED', '#EC4899', '#0EA5E9', '#14B8A6',
];

export interface BrandLogoProps {
  /** Brand/provider name, shown as initials in the fallback. */
  brand: string;
  /** Brand domain (e.g. "swiggy.com") → Clearbit logo when no logoUrl. */
  domain?: string;
  /** Direct logo URL; wins over domain when set. */
  logoUrl?: string;
  /** Square edge in px (default 36). */
  size?: number;
  /** Override fallback-circle color (default: deterministic from brand name). */
  accentColor?: string;
}

/**
 * "JetBrains" → "JB" (camelCase word: first letter + letter after the
 * lowercase→uppercase transition); "spotify" → "SP"; "HDFC Bank" → "HB".
 * Single words under 4 chars keep their first two letters.
 */
export function brandInitials(brand: string): string {
  const words = (brand || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) {
    const w = words[0];
    // "JetBrains": first letter + letter after the internal lowercase→uppercase
    // transition ("tB") → "JB"; no transition (e.g. "swiggy", "HDFC") → first two.
    const m = /[a-z][A-Z]/.exec(w);
    return (m ? w[0] + w[m.index + 1] : w.slice(0, 2)).toUpperCase();
  }
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/** Deterministic 32-bit hash (FNV-1a variant) — stable across platforms. */
function hashCode(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Fallback circle color: `accentColor` if provided, else palette pick from brand hash. */
export function brandColor(brand: string, accentColor?: string): string {
  if (accentColor) return accentColor;
  return BRAND_LOGO_PALETTE[hashCode(brand.toLowerCase()) % BRAND_LOGO_PALETTE.length] || '#7C5CFC';
}

/** Rounded metrics for a given logo size (corner radius + initials font size). */
export function brandLogoMetrics(size: number) {
  return { radius: Math.round(size * 0.28), fontSize: Math.round(size * 0.38) };
}

export function BrandLogo({ brand, domain, logoUrl, size = 36, accentColor }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const { radius, fontSize } = brandLogoMetrics(size);
  const imageUri = logoUrl || (domain ? `https://logo.clearbit.com/${domain}` : null);

  if (imageUri && !failed) {
    const onError = (e: ImageErrorEvent) => {
      e.preventDefault?.();
      setFailed(true);
    };
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: '#fff' }}
        resizeMode="contain"
        onError={onError}
        accessibilityLabel={brand}
      />
    );
  }

  const style: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor: brandColor(brand, accentColor),
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <View style={style} accessibilityLabel={`${brand} logo`}>
      <Text
        style={{
          color: '#fff',
          fontWeight: '700',
          fontSize,
          fontFamily: 'Outfit_700Bold',
        }}
      >
        {brandInitials(brand)}
      </Text>
    </View>
  );
}

export default BrandLogo;
