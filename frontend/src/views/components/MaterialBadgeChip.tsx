/**
 * MaterialBadgeChip — Material Design 3 inspired tier badge.
 *
 * Renders a Material You-styled chip with:
 *   • LinearGradient pill background (tier-tinted)
 *   • Circular icon disc (MaterialCommunityIcons) with subtle inner highlight
 *   • Tier-ring border + soft elevation shadow
 *   • Tier rank pips (1/2/3 dots) for low/moderate/high
 *   • Sparkle accent for "special" tier (founder, top 1%, etc.)
 *
 * Usage:
 *   <MaterialBadgeChip badge={{ id, label, tier, icon }} size="sm" />
 *   <MaterialBadgeStack badges={user.badges} max={3} />
 */
import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type BadgeTier = 'low' | 'moderate' | 'high' | 'verified' | 'special';

export interface BadgeData {
  id?: string;
  label?: string;
  tier?: BadgeTier | string;
  icon?: string;
  category?: string;
  hint?: string;
  kind?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Material You tier theme (gradients + glow + ring color)
// ─────────────────────────────────────────────────────────────────────
const TIER: Record<BadgeTier, {
  gradient: [string, string];
  ring: string;
  glow: string;
  iconBg: string;
  iconFg: string;
  textColor: string;
  rank: number;
}> = {
  low: {
    gradient: ['rgba(180,83,9,0.20)', 'rgba(217,119,6,0.10)'],   // Bronze
    ring:    'rgba(217,119,6,0.55)',
    glow:    'rgba(217,119,6,0.30)',
    iconBg:  'rgba(217,119,6,0.22)',
    iconFg:  '#F59E0B',
    textColor: '#FBBF24',
    rank: 1,
  },
  moderate: {
    gradient: ['rgba(148,163,184,0.20)', 'rgba(203,213,225,0.08)'], // Silver
    ring:    'rgba(203,213,225,0.55)',
    glow:    'rgba(148,163,184,0.30)',
    iconBg:  'rgba(203,213,225,0.18)',
    iconFg:  '#E2E8F0',
    textColor: '#F1F5F9',
    rank: 2,
  },
  high: {
    gradient: ['rgba(245,158,11,0.32)', 'rgba(251,191,36,0.12)'],   // Gold
    ring:    'rgba(251,191,36,0.70)',
    glow:    'rgba(245,158,11,0.50)',
    iconBg:  'rgba(245,158,11,0.28)',
    iconFg:  '#FBBF24',
    textColor: '#FCD34D',
    rank: 3,
  },
  verified: {
    gradient: ['rgba(16,185,129,0.22)', 'rgba(52,211,153,0.10)'],   // Emerald
    ring:    'rgba(52,211,153,0.55)',
    glow:    'rgba(16,185,129,0.35)',
    iconBg:  'rgba(16,185,129,0.20)',
    iconFg:  '#34D399',
    textColor: '#34D399',
    rank: 4,
  },
  special: {
    gradient: ['rgba(167,139,250,0.32)', 'rgba(236,72,153,0.16)'],  // Iridescent
    ring:    'rgba(167,139,250,0.65)',
    glow:    'rgba(167,139,250,0.55)',
    iconBg:  'rgba(167,139,250,0.28)',
    iconFg:  '#C4B5FD',
    textColor: '#C4B5FD',
    rank: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────
// Lucide-name → MaterialCommunityIcons-name map
// (badges.py emits Lucide-style names for legacy reasons; we translate
//  them to the equivalent Material icon glyph here.)
// ─────────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
  // Roadmap progress
  Target: 'bullseye-arrow',
  Rocket: 'rocket-launch',
  Crown:  'crown',
  // Skill climber
  TrendingUp: 'trending-up',
  Zap:        'flash',
  Sparkles:   'star-four-points',
  // Activity
  Flame: 'fire',
  // Mentor sessions
  Users:      'account-group',
  UserCheck:  'account-check',
  Star:       'star-circle',
  // Skill builder
  BookOpen:      'book-open-page-variant',
  GraduationCap: 'school',
  Award:         'medal',
  // Networker
  UserPlus: 'account-plus',
  Network:  'web',
  Globe2:   'earth',
  // Event attendee
  Calendar: 'calendar-star',
  MicVocal: 'microphone-variant',
  Trophy:   'trophy-variant',
  // Mentor
  Briefcase:    'briefcase-variant',
  HelpingHand:  'hand-heart',
  ShieldCheck:  'shield-check',
  Gem:          'diamond-stone',
  Clock:        'clock-outline',
  Timer:        'timer',
  // College
  Building2:     'office-building',
  CalendarCheck: 'calendar-check',
  BadgeCheck:    'check-decagram',
  // Universal
  MailCheck:    'email-check',
  Phone:        'phone-check',
  Linkedin:     'linkedin',
  ScanFace:     'face-recognition',
  FlaskConical: 'flask-outline',
  // Defaults
  Code:    'code-tags',
  Code2:   'code-tags',
};

const FT = { med: 'DMSans_500Medium', bold: 'DMSans_700Bold', xbold: 'DMSans_800ExtraBold' };

interface ChipProps {
  badge: BadgeData;
  size?: 'xs' | 'sm' | 'md';
  onPress?: () => void;
  style?: any;
  testID?: string;
}

export function MaterialBadgeChip({ badge, size = 'sm', onPress, style, testID }: ChipProps) {
  const tier = (TIER[(badge.tier as BadgeTier) || 'low'] || TIER.low);
  const iconName = (ICON_MAP[badge.icon || ''] || 'medal-outline') as any;

  const dims = (() => {
    switch (size) {
      case 'xs': return { padX: 7, padY: 3, iconBox: 18, iconSize: 11, font: 10, gap: 5, dot: 3 };
      case 'md': return { padX: 12, padY: 6, iconBox: 28, iconSize: 16, font: 12.5, gap: 8, dot: 4 };
      default:   return { padX: 9, padY: 4, iconBox: 22, iconSize: 13, font: 11, gap: 6, dot: 3.5 };
    }
  })();

  const Wrapper: any = onPress ? Pressable : View;
  const wrapperProps: any = onPress ? { onPress } : {};

  const elevation = Platform.OS === 'web'
    ? ({ boxShadow: `0 2px 10px ${tier.glow}, 0 0 0 1px ${tier.ring}` } as any)
    : ({ shadowColor: tier.glow, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 });

  return (
    <Wrapper {...wrapperProps} testID={testID || `mat-badge-${badge.id || badge.label}`} style={style}>
      <LinearGradient
        colors={tier.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          s.chip,
          {
            paddingVertical: dims.padY,
            paddingHorizontal: dims.padX,
            gap: dims.gap,
            borderColor: tier.ring,
          },
          elevation,
          Platform.OS === 'web' ? ({ cursor: onPress ? 'pointer' : 'default' } as any) : null,
        ]}
      >
        {/* Icon disc */}
        <View
          style={[
            s.iconDisc,
            {
              width: dims.iconBox,
              height: dims.iconBox,
              borderRadius: dims.iconBox / 2,
              backgroundColor: tier.iconBg,
              borderColor: tier.ring,
            },
          ]}
        >
          <MaterialCommunityIcons name={iconName} size={dims.iconSize} color={tier.iconFg} />
        </View>

        {/* Label */}
        <Text style={[s.label, { color: tier.textColor, fontSize: dims.font }]} numberOfLines={1}>
          {badge.label || '—'}
        </Text>

        {/* Tier rank pips (only for engagement low/mod/high) */}
        {tier.rank <= 3 && (
          <View style={{ flexDirection: 'row', gap: 2, marginLeft: 2 }}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  width: dims.dot,
                  height: dims.dot,
                  borderRadius: dims.dot / 2,
                  backgroundColor: i <= tier.rank ? tier.iconFg : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </View>
        )}

        {/* Special-tier sparkle */}
        {tier.rank === 5 && (
          <MaterialCommunityIcons name="star-four-points" size={dims.iconSize - 2} color={tier.iconFg} style={{ marginLeft: 2 }} />
        )}
      </LinearGradient>
    </Wrapper>
  );
}

interface StackProps {
  badges: BadgeData[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  showOverflow?: boolean;
  emptyHint?: string;
  style?: any;
}

const TIER_SORT_ORDER: Record<string, number> = {
  special: 5, high: 4, verified: 3, moderate: 2, low: 1,
};

export function MaterialBadgeStack({ badges, max, size = 'sm', showOverflow = true, emptyHint, style }: StackProps) {
  const sorted = [...(badges || [])].sort(
    (a, b) => (TIER_SORT_ORDER[String(b.tier)] || 0) - (TIER_SORT_ORDER[String(a.tier)] || 0)
  );
  const display = max ? sorted.slice(0, max) : sorted;
  const overflow = max && sorted.length > max ? sorted.length - max : 0;

  if (!display.length) {
    return emptyHint ? (
      <Text style={s.emptyHint}>{emptyHint}</Text>
    ) : null;
  }

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }, style]}>
      {display.map((b, i) => (
        <MaterialBadgeChip key={`${b.id || b.label || i}-${i}`} badge={b} size={size} />
      ))}
      {showOverflow && overflow > 0 && (
        <View style={s.overflow}>
          <Text style={s.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  iconDisc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontFamily: FT.bold,
    letterSpacing: 0.2,
  },
  overflow: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
  },
  overflowText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FT.bold,
    fontSize: 10,
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: FT.med,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
