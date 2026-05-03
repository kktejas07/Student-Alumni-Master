/**
 * MemberIdCard — interactive flip card showing Member ID details.
 *
 * Front: Identity badge, role-aware title, QR code (Scan to Verify), verify link.
 * Back:  Member ID, barcode, validity, "Tap to flip" hint.
 *
 * Tap (or click on web) to trigger a 3D Y-axis flip (~700ms ease-in-out).
 *
 * Spec source: /app/customer-assets screenshots (May 2026 hand-off).
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform } from 'react-native';
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

/* ---------- Barcode (SVG, deterministic from id) ---------- */
function Barcode({ value, color = '#7C3AED', height = 64 }: { value: string; color?: string; height?: number }) {
  const bars = useMemo(() => {
    // Deterministic bar widths from the id chars
    const pattern: Array<{ w: number; gap: number }> = [];
    const chars = (value || 'SA').split('');
    let i = 0;
    while (pattern.length < 56) {
      const c = chars[i % chars.length].charCodeAt(0);
      // bar width 1..4, gap 1..3
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

/* ---------- Component ---------- */
export interface MemberIdCardProps {
  uniqueId: string;
  role: MemberRole;
  tier?: MemberTier;
  qrBase64?: string;            // "data:image/png;base64,..." or raw base64
  validFromYear?: number;       // default = current year
  verifyBaseUrl?: string;       // default "studentalumni.app/verify"
  onTapHint?: () => void;       // optional callback when flipped
  testID?: string;
}

export function MemberIdCard({
  uniqueId,
  role,
  tier = 'gold',
  qrBase64,
  validFromYear,
  verifyBaseUrl = 'studentalumni.app/verify',
  onTapHint,
  testID,
}: MemberIdCardProps) {
  const meta = ROLE_META[role] || ROLE_META.student;
  const tierMeta = TIER_META[tier] || TIER_META.gold;
  const year = validFromYear || new Date().getFullYear();

  // Last 6 chars of id for verify URL (eg. "612450")
  const verifySuffix = (uniqueId || '').split('-').pop() || (uniqueId || '').slice(-6);
  const verifyUrl = `${verifyBaseUrl}/${verifySuffix}`;

  const rotation = useSharedValue(0);
  const flipped = useSharedValue(0); // 0 = front, 1 = back

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
    backfaceVisibility: 'hidden' as any,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value + 180}deg` }],
    backfaceVisibility: 'hidden' as any,
  }));

  const RoleIcon = meta.Icon;

  const qrUri = qrBase64
    ? (qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`)
    : null;

  return (
    <Pressable
      onPress={flip}
      style={s.flipWrap}
      testID={testID || 'member-id-card'}
      accessibilityRole="button"
      accessibilityLabel="Member ID card. Tap to flip."
    >
      {/* Both faces stacked absolutely; container has fixed minHeight to reserve space */}
      <View style={s.flipInner}>
        {/* FRONT */}
        <Animated.View style={[s.face, { borderColor: meta.cardBorder }, frontStyle]}>
          <View style={s.headerRow}>
            <View style={[s.iconSquare, { backgroundColor: meta.iconBg, borderColor: meta.cardBorder }]}>
              <RoleIcon size={20} color={meta.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.headerTitle}>{meta.label}</Text>
              <Text style={s.headerSub}>{meta.sub}</Text>
            </View>
            <View style={[s.tierPill, { backgroundColor: tierMeta.bg, borderColor: tierMeta.border }]}>
              <Award size={11} color={tierMeta.text} />
              <Text style={[s.tierText, { color: tierMeta.text }]}>{tierMeta.label}</Text>
            </View>
          </View>

          <View style={s.frontBody}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.miniLabel}>SCAN TO VERIFY</Text>
              <Text style={s.idText}>{uniqueId}</Text>
              <Text style={s.helperText}>
                This QR code can be scanned by mentors, colleges and employers to verify your SA membership.
              </Text>
              <Text style={[s.verifyLink, { color: meta.iconColor }]}>{verifyUrl}</Text>
            </View>

            <View style={s.qrWrap}>
              {qrUri ? (
                <Image source={{ uri: qrUri }} style={s.qrImg} resizeMode="contain" />
              ) : (
                <View style={[s.qrImg, s.qrFallback]}>
                  <ShieldCheck size={28} color={meta.qrTint} />
                  <Text style={[s.qrFallbackText, { color: meta.iconColor }]}>QR</Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.flipHintRow}>
            <Text style={s.flipHint}>Tap to flip</Text>
          </View>
        </Animated.View>

        {/* BACK */}
        <Animated.View style={[s.face, s.faceBack, { borderColor: meta.cardBorder }, backStyle]}>
          <View style={s.headerRow}>
            <View style={[s.iconSquare, { backgroundColor: meta.iconBg, borderColor: meta.cardBorder }]}>
              <RoleIcon size={20} color={meta.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.headerTitle}>{meta.label}</Text>
              <Text style={s.headerSub}>{meta.sub}</Text>
            </View>
            <View style={[s.tierPill, { backgroundColor: tierMeta.bg, borderColor: tierMeta.border }]}>
              <Award size={11} color={tierMeta.text} />
              <Text style={[s.tierText, { color: tierMeta.text }]}>{tierMeta.label}</Text>
            </View>
          </View>

          <View style={s.backBody}>
            <Text style={s.miniLabel}>MEMBER ID</Text>
            <Text style={s.idTextLarge}>{uniqueId}</Text>

            <View style={[s.barcodeBox, { borderColor: 'rgba(255,255,255,0.10)' }]}>
              <Barcode value={uniqueId} color={meta.iconColor} height={68} />
            </View>

            <View style={s.backFootRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BadgeCheck size={12} color={meta.iconColor} />
                <Text style={s.validityText}>Valid from {year} · Lifetime membership</Text>
              </View>
              <Text style={s.flipHint}>Tap to flip</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const CARD_HEIGHT = 240;

const s = StyleSheet.create({
  flipWrap: {
    width: '100%',
    minHeight: CARD_HEIGHT,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  flipInner: {
    width: '100%',
    minHeight: CARD_HEIGHT,
    position: 'relative',
  },
  face: {
    width: '100%',
    minHeight: CARD_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    // subtle shadow
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  faceBack: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSquare: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 14 },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.8, marginTop: 2 },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  tierText: { fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.4 },

  /* Front body */
  frontBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 14,
    flex: 1,
  },
  miniLabel: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.8 },
  idText: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 16, letterSpacing: 0.6, marginTop: 4 },
  helperText: { color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 11, lineHeight: 16, marginTop: 8 },
  verifyLink: { fontFamily: FONTS.bold, fontSize: 11, marginTop: 8, letterSpacing: 0.3 },
  qrWrap: {
    width: 96, height: 96, padding: 6,
    backgroundColor: '#FFF', borderRadius: 10,
  },
  qrImg: { width: '100%', height: '100%' },
  qrFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8 },
  qrFallbackText: { fontFamily: FONTS.bold, fontSize: 11, marginTop: 4, letterSpacing: 1 },
  flipHintRow: { marginTop: 10, alignItems: 'flex-end' },
  flipHint: { color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.med, fontSize: 10.5 },

  /* Back body */
  backBody: { marginTop: 14 },
  idTextLarge: { color: '#FFF', fontFamily: FONTS.bold, fontSize: 22, letterSpacing: 1, marginTop: 4 },
  barcodeBox: {
    marginTop: 14, padding: 8,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backFootRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  validityText: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.med, fontSize: 11 },
});

export default MemberIdCard;
