/**
 * BadgeChip + BadgeStack — render a user's earned badges with tiered glow.
 *
 * Tier visual:
 *   low      → slate (#64748B)
 *   moderate → teal  (#2DD4BF) glow
 *   high     → gold  (#F59E0B) glow
 *   verified → emerald (#10B981)
 *   special  → purple (#A78BFA) glow
 *
 * Usage:
 *   <BadgeStack badges={badges} max={3} compact />
 *   <BadgeChip badge={b} />
 */
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import {
  // role-tier icons
  Sparkles, Zap, Flame, Users, UserCheck, Star,
  BookOpen, GraduationCap, Award, UserPlus, Network, Globe2,
  Calendar, MicVocal, Trophy, Briefcase, Crown,
  HelpingHand, Gem, Clock, Timer, Building2, ShieldCheck,
  TrendingUp, CalendarCheck, BadgeCheck, Rocket,
  // universal icons
  MailCheck, Phone, Link2 as Linkedin, ScanFace, FlaskConical,
} from 'lucide-react-native';

const ICONS: Record<string, any> = {
  Sparkles, Zap, Flame, Users, UserCheck, Star,
  BookOpen, GraduationCap, Award, UserPlus, Network, Globe2,
  Calendar, MicVocal, Trophy, Briefcase, Crown,
  HelpingHand, Gem, Clock, Timer, Building2, ShieldCheck,
  TrendingUp, CalendarCheck, BadgeCheck, Rocket,
  MailCheck, Phone, Linkedin, ScanFace, FlaskConical,
};

const TIER_COLOR: Record<string, string> = {
  low:      '#64748B',
  moderate: '#2DD4BF',
  high:     '#F59E0B',
  verified: '#10B981',
  special:  '#A78BFA',
};
const TIER_GLOW: Record<string, string> = {
  low:      'rgba(100,116,139,0.30)',
  moderate: 'rgba(45,212,191,0.45)',
  high:     'rgba(245,158,11,0.55)',
  verified: 'rgba(16,185,129,0.45)',
  special:  'rgba(167,139,250,0.55)',
};
// Tier display priority — higher = show first
const TIER_RANK: Record<string, number> = {
  high: 5, special: 4, verified: 3, moderate: 2, low: 1,
};

export interface Badge {
  id: string;
  category: string;
  tier: 'low' | 'moderate' | 'high' | 'verified' | 'special';
  label: string;
  icon: string;
  hint?: string;
  role?: string;
}

interface ChipProps {
  badge: Badge;
  size?: 'xs' | 'sm' | 'md';
  onPress?: () => void;
}

export function BadgeChip({ badge, size = 'sm', onPress }: ChipProps) {
  const Icon = ICONS[badge.icon] || Star;
  const color = TIER_COLOR[badge.tier] || TIER_COLOR.moderate;
  const glow  = TIER_GLOW[badge.tier]  || TIER_GLOW.moderate;
  const sz =
    size === 'xs' ? { iconSize: 10, padX: 6,  padY: 3, gap: 4, fontSize: 10,   lineH: 12 }
  : size === 'md' ? { iconSize: 14, padX: 10, padY: 6, gap: 6, fontSize: 12.5, lineH: 16 }
                  : { iconSize: 12, padX: 8,  padY: 4, gap: 5, fontSize: 11,   lineH: 14 };

  const inner = (
    <View
      style={[
        styles.chip,
        {
          paddingHorizontal: sz.padX,
          paddingVertical: sz.padY,
          gap: sz.gap,
          borderColor: color + '70',
          backgroundColor: color + '18',
        },
        Platform.OS === 'web' && ({ boxShadow: `0 0 12px ${glow}` } as any),
        Platform.OS !== 'web' && ({ boxShadow: `0px 2px 10px ${color}80` } as any),
      ]}
    >
      <Icon size={sz.iconSize} color={color} />
      <Text style={[styles.chipLabel, { color, fontSize: sz.fontSize, lineHeight: sz.lineH }]} numberOfLines={1}>
        {badge.label}
      </Text>
    </View>
  );

  if (!onPress && !badge.hint) return inner;
  // Use Pressable for tooltip (web only — uses title attribute fallback)
  return (
    <Pressable
      onPress={onPress}
      // @ts-ignore — web-only DOM attribute
      title={badge.hint || badge.label}
      style={({ hovered }: any) => [hovered && { opacity: 0.85 }]}
    >
      {inner}
    </Pressable>
  );
}

interface StackProps {
  badges: Badge[];
  max?: number;             // show top N + "+rest"
  compact?: boolean;        // smaller chips
  size?: 'xs' | 'sm' | 'md';
  onPressMore?: () => void;
}

export function BadgeStack({
  badges, max = 3, compact = false, size, onPressMore,
}: StackProps) {
  if (!badges || badges.length === 0) return null;
  // Sort: highest-rank tiers first, then alphabetically by label
  const sorted = [...badges].sort((a, b) => {
    const r = (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0);
    return r !== 0 ? r : a.label.localeCompare(b.label);
  });
  const visible = sorted.slice(0, max);
  const rest = sorted.length - visible.length;
  const chipSize = size || (compact ? 'xs' : 'sm');

  return (
    <View style={styles.stack}>
      {visible.map((b) => (
        <BadgeChip key={b.id} badge={b} size={chipSize} />
      ))}
      {rest > 0 && (
        <Pressable
          onPress={onPressMore}
          style={({ hovered }: any) => [styles.moreChip, hovered && { opacity: 0.8 }]}
        >
          <Text style={styles.moreLabel}>+{rest}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 999,
  },
  chipLabel: {
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.3,
  },
  moreChip: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
    borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  moreLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontFamily: 'DMSans_700Bold', fontSize: 11,
  },
});
