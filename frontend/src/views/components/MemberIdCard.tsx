// @ts-nocheck
import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { Building2, GraduationCap, Award, Users, BadgeCheck, ShieldCheck } from 'lucide-react-native';
import { FONTS } from '@/src/views/auth/tokens';

export type MemberRole = 'student' | 'mentor' | 'alumni' | 'college';
export type MemberTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface RoleMeta {
  label: string;
  sub: string;
  Icon: any;
  iconBg: string;
  iconColor: string;
  cardBorder: string;
  qrTint: string;
}

const ROLE_META: Record<MemberRole, RoleMeta> = {
  student: {
    label: 'Student Alumni',
    sub: 'STUDENT MEMBER',
    Icon: GraduationCap,
    iconBg: 'rgba(124,58,237,0.22)',
    iconColor: '#B07FDF',
    cardBorder: 'rgba(124,58,237,0.45)',
    qrTint: '#7C3AED',
  },
  mentor: {
    label: 'Student Alumni',
    sub: 'VERIFIED MENTOR',
    Icon: Users,
    iconBg: 'rgba(20,184,166,0.20)',
    iconColor: '#5EEAD4',
    cardBorder: 'rgba(20,184,166,0.45)',
    qrTint: '#14B8A6',
  },
  alumni: {
    label: 'Student Alumni',
    sub: 'VERIFIED ALUMNI',
    Icon: Award,
    iconBg: 'rgba(249,115,22,0.22)',
    iconColor: '#FDBA74',
    cardBorder: 'rgba(249,115,22,0.45)',
    qrTint: '#F97316',
  },
  college: {
    label: 'Student Alumni',
    sub: 'INSTITUTION PARTNER',
    Icon: Building2,
    iconBg: 'rgba(59,130,246,0.22)',
    iconColor: '#93C5FD',
    cardBorder: 'rgba(59,130,246,0.45)',
    qrTint: '#3B82F6',
  },
};

const TIER_META: Record<MemberTier, { label: string; bg: string; border: string; text: string }> = {
  bronze:   { label: 'Bronze',   bg: 'rgba(205,127,50,0.18)',  border: 'rgba(205,127,50,0.55)',  text: '#E0B080' },
  silver:   { label: 'Silver',   bg: 'rgba(192,192,192,0.18)', border: 'rgba(192,192,192,0.55)', text: '#E5E5E5' },
  gold:     { label: 'Gold',     bg: 'rgba(252,211,77,0.18)',  border: 'rgba(252,211,77,0.55)',  text: '#FCD34D' },
  platinum: { label: 'Platinum', bg: 'rgba(229,228,226,0.20)', border: 'rgba(229,228,226,0.6)',  text: '#F1F1F0' },
};

function Barcode({ value, color = '#7C3AED', height = 64 }: { value: string; color?: string; height?: number }) {
  const bars = useMemo(() => {
    const pattern: Array<{ w: number; gap: number }> = [];
    const chars = (value || 'SA').split('');
    let i = 0;
    while (pattern.length < 56) {
      const c = chars[i % chars.length].charCodeAt(0);
      pattern.push({ w: (c % 4) + 1, gap: ((c >> 2) % 3) + 1 });
      i += 1;
    }
    return pattern;
  }, [value]);

  const totalUnits = bars.reduce((acc, b) => acc + b.w + b.gap, 0);
  const viewW = totalUnits;

  let x = 0;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${viewW} ${height}`} preserveAspectRatio="none">
      {bars.map((b, idx) => {
        const rect = <Rect key={idx} x={x} y={0} width={b.w} height={height} fill={color} />;
        x += b.w + b.gap;
        return rect;
      })}
    </Svg>
  );
}

const CARD_HEIGHT = 270;

export interface MemberIdCardProps {
  uniqueId: string;
  role: MemberRole;
  tier?: MemberTier;
  qrBase64?: string;
  validFromYear?: number;
  verifyBaseUrl?: string;
  onTapHint?: () => void;
  testID?: string;
}

export function MemberIdCard({
  uniqueId,
  role,
  tier = 'gold',
  qrBase64,
  validFromYear,
  verifyBaseUrl = 'studentalumni.ai/verify',
  onTapHint,
  testID,
}: MemberIdCardProps) {
  const meta = ROLE_META[role] || ROLE_META.student;
  const tierMeta = TIER_META[tier] || TIER_META.gold;
  const year = validFromYear || new Date().getFullYear();

  const verifySuffix = (uniqueId || '').split('-').pop() || (uniqueId || '').slice(-6);
  const verifyUrl = `${verifyBaseUrl}/${verifySuffix}`;

  const rotation = useSharedValue(0);
  const flipped = useSharedValue(0);

  const flip = () => {
    const next = flipped.value === 0 ? 180 : 0;
    flipped.value = flipped.value === 0 ? 1 : 0;
    rotation.value = withTiming(next, {
      duration: 700,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
    });
    if (onTapHint) onTapHint();
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value + 180}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const RoleIcon = meta.Icon;

  const qrUri = qrBase64
    ? (qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`)
    : null;

  return (
    <Pressable
      onPress={flip}
      className="w-full"
      style={{ minHeight: CARD_HEIGHT, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
      testID={testID || 'member-id-card'}
      accessibilityRole="button"
      accessibilityLabel="Member ID card. Tap to flip."
    >
      <View className="w-full relative" style={{ minHeight: CARD_HEIGHT }}>
        <Animated.View
          className="w-full absolute top-0 left-0 rounded-2xl border-[1.5px] bg-white p-4"
          style={[{ minHeight: CARD_HEIGHT, borderColor: meta.cardBorder, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }, frontStyle]}
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-[10px] items-center justify-center border" style={{ backgroundColor: meta.iconBg, borderColor: meta.cardBorder }}>
              <RoleIcon size={20} color={meta.iconColor} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-gray-900 font-body-bold text-sm">{meta.label}</Text>
              <Text className="text-gray-500 font-body-bold text-[9.5px] tracking-wider mt-0.5">{meta.sub}</Text>
            </View>
            <View className="flex-row items-center gap-1 px-[9px] py-1 rounded-full border" style={{ backgroundColor: tierMeta.bg, borderColor: tierMeta.border }}>
              <Award size={11} color={tierMeta.text} />
              <Text className="font-body-bold text-[10.5px] tracking-wider" style={{ color: tierMeta.text }}>{tierMeta.label}</Text>
            </View>
          </View>

          <View className="flex-row items-start mt-3.5 flex-1">
            <View className="flex-1 pr-3">
              <Text className="text-gray-500 font-body-bold text-[9.5px] tracking-wider">SCAN TO VERIFY</Text>
              <Text className="text-gray-900 font-body-bold text-base tracking-wider mt-1">{uniqueId}</Text>
              <Text className="text-gray-500 font-body-semibold text-[11px] leading-4 mt-2">
                This QR code can be scanned by mentors, colleges and employers to verify your SA membership.
              </Text>
              <Text className="font-body-bold text-[11px] mt-2 tracking-wider" style={{ color: meta.iconColor }}>{verifyUrl}</Text>
            </View>

            <View className="w-24 h-24 p-1.5 bg-white rounded-[10px]">
              {qrUri ? (
                <Image source={{ uri: qrUri }} className="w-full h-full" resizeMode="contain" />
              ) : (
                <View className="w-full h-full items-center justify-center bg-white/[0.06] rounded-lg">
                  <ShieldCheck size={28} color={meta.qrTint} />
                  <Text className="font-body-bold text-[11px] mt-1 tracking-wider" style={{ color: meta.iconColor }}>QR</Text>
                </View>
              )}
            </View>
          </View>

          <View className="mt-2.5 items-end">
            <Text className="text-gray-400 font-body-semibold text-[10.5px]">Tap to flip</Text>
          </View>
        </Animated.View>

        <Animated.View
          className="w-full absolute top-0 left-0 rounded-2xl border-[1.5px] bg-white p-4"
          style={[{ minHeight: CARD_HEIGHT, borderColor: meta.cardBorder, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }, backStyle]}
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-[10px] items-center justify-center border" style={{ backgroundColor: meta.iconBg, borderColor: meta.cardBorder }}>
              <RoleIcon size={20} color={meta.iconColor} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-gray-900 font-body-bold text-sm">{meta.label}</Text>
              <Text className="text-gray-500 font-body-bold text-[9.5px] tracking-wider mt-0.5">{meta.sub}</Text>
            </View>
            <View className="flex-row items-center gap-1 px-[9px] py-1 rounded-full border" style={{ backgroundColor: tierMeta.bg, borderColor: tierMeta.border }}>
              <Award size={11} color={tierMeta.text} />
              <Text className="font-body-bold text-[10.5px] tracking-wider" style={{ color: tierMeta.text }}>{tierMeta.label}</Text>
            </View>
          </View>

          <View className="mt-3.5">
            <Text className="text-gray-500 font-body-bold text-[9.5px] tracking-wider">MEMBER ID</Text>
            <Text className="text-gray-900 font-body-bold text-[22px] tracking-wider mt-1">{uniqueId}</Text>

            <View className="mt-3.5 p-2 rounded-[10px] border bg-gray-100" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <Barcode value={uniqueId} color={meta.iconColor} height={68} />
            </View>

            <View className="flex-row justify-between items-center mt-3">
              <View className="flex-row items-center gap-1.5">
                <BadgeCheck size={12} color={meta.iconColor} />
                <Text className="text-gray-500 font-body-semibold text-[11px]">Valid from {year} · Lifetime membership</Text>
              </View>
              <Text className="text-gray-400 font-body-semibold text-[10.5px]">Tap to flip</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default MemberIdCard;
