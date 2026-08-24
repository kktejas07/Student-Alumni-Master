import React from 'react';
import { View, Text, Platform, Pressable } from 'react-native';
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
    gradient: ['rgba(180,83,9,0.20)', 'rgba(217,119,6,0.10)'],
    ring:    'rgba(217,119,6,0.55)',
    glow:    'rgba(217,119,6,0.30)',
    iconBg:  'rgba(217,119,6,0.22)',
    iconFg:  '#F59E0B',
    textColor: '#FBBF24',
    rank: 1,
  },
  moderate: {
    gradient: ['rgba(148,163,184,0.20)', 'rgba(203,213,225,0.08)'],
    ring:    'rgba(203,213,225,0.55)',
    glow:    'rgba(148,163,184,0.30)',
    iconBg:  'rgba(203,213,225,0.18)',
    iconFg:  '#E2E8F0',
    textColor: '#F1F5F9',
    rank: 2,
  },
  high: {
    gradient: ['rgba(245,158,11,0.32)', 'rgba(251,191,36,0.12)'],
    ring:    'rgba(251,191,36,0.70)',
    glow:    'rgba(245,158,11,0.50)',
    iconBg:  'rgba(245,158,11,0.28)',
    iconFg:  '#FBBF24',
    textColor: '#FCD34D',
    rank: 3,
  },
  verified: {
    gradient: ['rgba(16,185,129,0.22)', 'rgba(52,211,153,0.10)'],
    ring:    'rgba(52,211,153,0.55)',
    glow:    'rgba(16,185,129,0.35)',
    iconBg:  'rgba(16,185,129,0.20)',
    iconFg:  '#34D399',
    textColor: '#34D399',
    rank: 4,
  },
  special: {
    gradient: ['rgba(167,139,250,0.32)', 'rgba(236,72,153,0.16)'],
    ring:    'rgba(167,139,250,0.65)',
    glow:    'rgba(167,139,250,0.55)',
    iconBg:  'rgba(167,139,250,0.28)',
    iconFg:  '#C4B5FD',
    textColor: '#C4B5FD',
    rank: 5,
  },
};

const ICON_MAP: Record<string, string> = {
  Target: 'bullseye-arrow',
  Rocket: 'rocket-launch',
  Crown:  'crown',
  TrendingUp: 'trending-up',
  Zap:        'flash',
  Sparkles:   'star-four-points',
  Flame: 'fire',
  Users:      'account-group',
  UserCheck:  'account-check',
  Star:       'star-circle',
  BookOpen:      'book-open-page-variant',
  GraduationCap: 'school',
  Award:         'medal',
  UserPlus: 'account-plus',
  Network:  'web',
  Globe2:   'earth',
  Calendar: 'calendar-star',
  MicVocal: 'microphone-variant',
  Trophy:   'trophy-variant',
  Briefcase:    'briefcase-variant',
  HelpingHand:  'hand-heart',
  ShieldCheck:  'shield-check',
  Gem:          'diamond-stone',
  Clock:        'clock-outline',
  Timer:        'timer',
  Building2:     'office-building',
  CalendarCheck: 'calendar-check',
  BadgeCheck:    'check-decagram',
  MailCheck:    'email-check',
  Phone:        'phone-check',
  Linkedin:     'linkedin',
  ScanFace:     'face-recognition',
  FlaskConical: 'flask-outline',
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
        className="flex-row items-center rounded-full border bg-white/[0.02] overflow-hidden"
        style={{
          paddingVertical: dims.padY,
          paddingHorizontal: dims.padX,
          gap: dims.gap,
          borderColor: tier.ring,
          ...elevation,
          ...(Platform.OS === 'web' ? { cursor: onPress ? 'pointer' : 'default' } : null),
        }}
      >
        <View
          className="items-center justify-center border"
          style={{
            width: dims.iconBox,
            height: dims.iconBox,
            borderRadius: dims.iconBox / 2,
            backgroundColor: tier.iconBg,
            borderColor: tier.ring,
          }}
        >
          <MaterialCommunityIcons name={iconName} size={dims.iconSize} color={tier.iconFg} />
        </View>

        <Text className="font-body-bold tracking-wider" style={{ color: tier.textColor, fontSize: dims.font }} numberOfLines={1}>
          {badge.label || '—'}
        </Text>

        {tier.rank <= 3 && (
          <View className="flex-row gap-0.5 ml-0.5">
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
      <Text className="text-white/45 font-body-semibold text-[11px] italic">{emptyHint}</Text>
    ) : null;
  }

  return (
    <View className="flex-row flex-wrap gap-1.5 items-center" style={style}>
      {display.map((b, i) => (
        <MaterialBadgeChip key={`${b.id || b.label || i}-${i}`} badge={b} size={size} />
      ))}
      {showOverflow && overflow > 0 && (
        <View className="px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.12]">
          <Text className="text-white/75 font-body-bold text-[10px]">+{overflow}</Text>
        </View>
      )}
    </View>
  );
}
