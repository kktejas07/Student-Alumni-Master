/**
 * TierBadge — glowing badge for Bronze / Silver / Gold / Platinum.
 *
 * Renders a circular gradient ring + lucide icon with a soft glow ring
 * (web-only boxShadow; falls back gracefully on native). Three sizes
 * (sm | md | lg). Optional label suffix (e.g. "Gold Mentor").
 *
 * Usage:
 *   <TierBadge tier={user.tier} size="md" showLabel />
 *
 * Props:
 *   - tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' (string allowed for safety)
 *   - visuals?: { primary, glow, ring, icon } from backend (optional override)
 *   - size?: 'sm' | 'md' | 'lg'
 *   - showLabel?: boolean — render text next to the badge
 *   - score?: number — append "/100" to label tooltip
 */
import React from 'react';
import { View, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Star, Award, Shield, Gem } from 'lucide-react-native';

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

const PALETTE: Record<TierName, { primary: string; glow: string; ring: string; gradient: [string, string] }> = {
  Bronze:   { primary: '#B08D57', glow: '#D7A878', ring: '#8B5E3C', gradient: ['#D7A878', '#8B5E3C'] },
  Silver:   { primary: '#D1D5DB', glow: '#F1F5F9', ring: '#94A3B8', gradient: ['#F1F5F9', '#94A3B8'] },
  Gold:     { primary: '#F5C842', glow: '#FCD34D', ring: '#B45309', gradient: ['#FCD34D', '#B45309'] },
  Platinum: { primary: '#A78BFA', glow: '#C4B5FD', ring: '#7C3AED', gradient: ['#C4B5FD', '#7C3AED'] },
};

const ICONS = {
  Bronze: Shield,
  Silver: Award,
  Gold: Star,
  Platinum: Crown,
} as const;

const SIZES = {
  sm: { ring: 28, icon: 14, font: 11, gap: 6, pad: 6 },
  md: { ring: 38, icon: 18, font: 12.5, gap: 8, pad: 8 },
  lg: { ring: 52, icon: 24, font: 14, gap: 10, pad: 10 },
};

export function TierBadge({
  tier,
  size = 'md',
  showLabel = false,
  score,
  compact = false,
}: {
  tier?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  score?: number;
  compact?: boolean;
}) {
  const t = (tier as TierName) in PALETTE ? (tier as TierName) : 'Bronze';
  const palette = PALETTE[t];
  const Icon = ICONS[t];
  const sz = SIZES[size];

  const ringStyle: any = {
    width: sz.ring,
    height: sz.ring,
    borderRadius: sz.ring / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.ring,
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 16px ${palette.glow}99, 0 0 4px ${palette.glow}` }
      : {}),
  };

  if (compact) {
    return (
      <LinearGradient colors={palette.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ringStyle}>
        <Icon size={sz.icon} color="#fff" strokeWidth={2.4} />
      </LinearGradient>
    );
  }

  return (
    <View className="flex-row items-center" style={{ gap: sz.gap }}>
      <LinearGradient
        colors={palette.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={ringStyle}
      >
        <Icon size={sz.icon} color="#fff" strokeWidth={2.4} />
      </LinearGradient>
      {showLabel && (
        <View>
          <Text className="font-body-bold tracking-wider" style={{ color: palette.glow, fontSize: sz.font }}>
            {t}
            {typeof score === 'number' ? <Text className="font-body-semibold opacity-75">  {score}/100</Text> : null}
          </Text>
          <Text className="text-[10px] font-body-semibold text-white/45 tracking-wider uppercase mt-px">Tier</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Pill version — inline compact badge with text label.
 */
export function TierPill({ tier, score }: { tier?: string; score?: number }) {
  const t = (tier as TierName) in PALETTE ? (tier as TierName) : 'Bronze';
  const palette = PALETTE[t];
  const Icon = ICONS[t];
  return (
    <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border self-start" style={{
      backgroundColor: palette.primary + '22',
      borderColor: palette.ring,
      ...(Platform.OS === 'web' ? ({ boxShadow: `0 0 8px ${palette.glow}66` } as any) : {}),
    }}>
      <Icon size={11} color={palette.glow} strokeWidth={2.6} />
      <Text className="text-[10.5px] font-body-bold tracking-wider" style={{ color: palette.glow }}>{t}</Text>
      {typeof score === 'number' && (
        <Text className="text-[10.5px] font-body-bold tracking-wider opacity-70" style={{ color: palette.glow }}>· {score}</Text>
      )}
    </View>
  );
}
