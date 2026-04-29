/**
 * VIEW LAYER - Student Alumni Design System Components
 * Glass + Gradient + Purple style. Pure presentational components.
 */
// Re-export PhonePe-style animated primitives so screens can keep importing
// from a single design-system entry point.
export { AnimatedCard, AnimatedTile, StaggerView, CountdownBadge } from './AnimatedCard';
export { ToastProvider, useToast } from './Toast';

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextInputProps,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors as C, Gradients, Radius, Shadows, Spacing, Typography } from '@/src/theme';

/** SA Shield Logo — proper SVG shield matching brand sheet.
 * Uses react-native-svg (cross-platform, scales perfectly).
 * Variants: gradient (default, on light bg), white (on purple), pale, ink, glass (on dark bg). */
export function SALogo({
  size = 64,
  variant = 'gradient',
  testID,
}: {
  size?: number;
  variant?: 'gradient' | 'white' | 'pale' | 'ink' | 'glass';
  testID?: string;
}) {
  // Lazy-import keeps web bundle smaller when not used
  const Svg = require('react-native-svg').Svg;
  const Path = require('react-native-svg').Path;
  const SvgText = require('react-native-svg').Text;
  const Defs = require('react-native-svg').Defs;
  const RadialGradient = require('react-native-svg').RadialGradient;
  const Stop = require('react-native-svg').Stop;
  const LinearGrad = require('react-native-svg').LinearGradient;

  const aspect = 1.18;
  const w = size;
  const h = size * aspect;

  // Variant -> shield fill color mapping
  const variantConfig: Record<
    string,
    { useGradient: boolean; bg?: string; gradFrom?: string; gradTo?: string; fg: string; stroke?: string }
  > = {
    gradient: { useGradient: true, gradFrom: C.midPurple, gradTo: C.brandPurple, fg: C.white },
    white: { useGradient: false, bg: C.white, fg: C.brandPurple, stroke: 'rgba(95,37,159,0.2)' },
    pale: { useGradient: false, bg: C.palePurple, fg: C.deepPurple },
    ink: { useGradient: false, bg: C.ink, fg: C.white },
    glass: { useGradient: false, bg: 'rgba(255,255,255,0.18)', fg: C.white, stroke: 'rgba(255,255,255,0.45)' },
  };
  const cfg = variantConfig[variant];

  // Shield path: viewBox 0 0 200 240
  // Top: rounded corners; sides: straight; bottom: pointed via Q curve
  const shieldPath = 'M100 6 L188 36 Q196 38 196 50 L196 124 Q196 192 100 234 Q4 192 4 124 L4 50 Q4 38 12 36 Z';

  return (
    <View testID={testID || 'sa-logo'} style={{ width: w, height: h }}>
      <Svg viewBox="0 0 200 240" width={w} height={h}>
        <Defs>
          {cfg.useGradient && (
            <LinearGrad id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={cfg.gradFrom} />
              <Stop offset="100%" stopColor={cfg.gradTo} />
            </LinearGrad>
          )}
        </Defs>
        <Path
          d={shieldPath}
          fill={cfg.useGradient ? 'url(#shieldGrad)' : cfg.bg}
          stroke={cfg.stroke}
          strokeWidth={cfg.stroke ? 2 : 0}
        />
        {/* "SA" text — centered in shield */}
        <SvgText
          x="100"
          y="155"
          textAnchor="middle"
          fontFamily="DMSans_700Bold"
          fontSize="100"
          fontWeight="700"
          fill={cfg.fg}
          letterSpacing="-4"
        >
          SA
        </SvgText>
      </Svg>
    </View>
  );
}

/** Glass card — frosted look on dark/gradient backgrounds. */
export function GlassCard({
  children,
  style,
  intensity = 'medium',
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: 'low' | 'medium' | 'high';
  testID?: string;
}) {
  const fills = {
    low: 'rgba(255,255,255,0.06)',
    medium: 'rgba(255,255,255,0.12)',
    high: 'rgba(255,255,255,0.20)',
  };
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: fills[intensity],
          borderColor: 'rgba(255,255,255,0.25)',
          borderWidth: 1,
          borderRadius: Radius.lg,
          padding: Spacing.md,
          ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px)' as any } : {}),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Solid white card with soft purple shadow (use on light bg). */
export function Card({
  children,
  style,
  testID,
  bg,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  bg?: string;
  padded?: boolean;
}) {
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: bg || C.surface,
          borderRadius: Radius.lg,
          padding: padded ? Spacing.md : 0,
          ...Shadows.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Gradient card (purple) for hero/feature sections. */
export function GradientCard({
  children,
  style,
  colors = Gradients.card,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: readonly [string, string, ...string[]];
  testID?: string;
}) {
  return (
    <View testID={testID} style={[{ borderRadius: Radius.lg, ...Shadows.md }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: Radius.lg, padding: Spacing.md }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

/** Primary / Secondary / Ghost button. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  size = 'md',
  style,
  testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: 'md' | 'lg' | 'sm';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const isDisabled = disabled || loading;
  const padV = size === 'lg' ? 16 : size === 'sm' ? 10 : 14;
  const padH = 22;

  const inner = (fg: string) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: padV,
        paddingHorizontal: padH,
        opacity: isDisabled ? 0.55 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[Typography.bodyBold, { color: fg, fontSize: size === 'lg' ? 16 : 15 }]}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} testID={testID} activeOpacity={0.85}>
        <View style={[{ borderRadius: Radius.pill, overflow: 'hidden', ...Shadows.md }, style]}>
          <LinearGradient
            colors={Gradients.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: Radius.pill }}
          >
            {inner(C.white)}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} testID={testID} activeOpacity={0.85}>
        <View
          style={[
            {
              borderRadius: Radius.pill,
              backgroundColor: C.surface,
              borderWidth: 1.5,
              borderColor: 'rgba(95,37,159,0.22)',
              ...Shadows.sm,
            },
            style,
          ]}
        >
          {inner(C.brandPurple)}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'glass') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} testID={testID} activeOpacity={0.85}>
        <View
          style={[
            {
              borderRadius: Radius.pill,
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.36)',
            },
            style,
          ]}
        >
          {inner(C.white)}
        </View>
      </TouchableOpacity>
    );
  }

  // ghost
  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} testID={testID} activeOpacity={0.85}>
      <View style={[{ borderRadius: Radius.pill }, style]}>{inner(C.brandPurple)}</View>
    </TouchableOpacity>
  );
}

/** Input field with floating label. */
export function Input({
  label,
  error,
  containerStyle,
  testID,
  onDark,
  ...rest
}: TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
  onDark?: boolean;
}) {
  const [focus, setFocus] = React.useState(false);
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && (
        <Text
          style={[
            Typography.label,
            { color: onDark ? C.textOnPurpleMuted : C.textSecondary },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        testID={testID}
        placeholderTextColor={onDark ? 'rgba(255,255,255,0.5)' : C.textMuted}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          borderWidth: 1.5,
          borderColor: focus
            ? C.brandPurple
            : onDark
              ? 'rgba(255,255,255,0.22)'
              : 'rgba(95,37,159,0.18)',
          borderRadius: Radius.md,
          paddingHorizontal: 14,
          paddingVertical: 14,
          backgroundColor: onDark ? 'rgba(255,255,255,0.08)' : C.surface,
          fontFamily: 'DMSans_400Regular',
          fontSize: 15,
          color: onDark ? C.white : C.textPrimary,
        }}
        {...rest}
      />
      {error && <Text style={[Typography.bodySm, { color: C.danger }]}>{error}</Text>}
    </View>
  );
}

/** Pill chip. */
export function Chip({
  label,
  active,
  onPress,
  onDark,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  onDark?: boolean;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      testID={testID}
      style={{
        borderRadius: Radius.pill,
        borderWidth: 1.5,
        borderColor: active
          ? C.brandPurple
          : onDark
            ? 'rgba(255,255,255,0.28)'
            : 'rgba(95,37,159,0.18)',
        backgroundColor: active
          ? C.brandPurple
          : onDark
            ? 'rgba(255,255,255,0.08)'
            : C.surface,
        paddingHorizontal: 14,
        paddingVertical: 8,
      }}
    >
      <Text
        style={[
          Typography.bodySm,
          { color: active ? C.white : onDark ? C.white : C.textPrimary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  onDark,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={[Typography.h2, { color: onDark ? C.white : C.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text
            style={[
              Typography.body,
              {
                color: onDark ? C.textOnPurpleMuted : C.textSecondary,
                marginTop: 4,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

/**
 * NeoCard — backward-compat wrapper. Older screens still import it.
 * Maps `bg` + `shadow` props onto the new `Card` component.
 */
export function NeoCard({
  children,
  style,
  bg,
  shadow = 'sm',
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bg?: string;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  testID?: string;
}) {
  const shadowStyle =
    shadow === 'none' ? {} : shadow === 'lg' ? Shadows.lg : shadow === 'md' ? Shadows.md : Shadows.sm;
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: bg || C.surface,
          borderRadius: Radius.lg,
          padding: Spacing.md,
          borderWidth: 1,
          borderColor: 'rgba(95,37,159,0.10)',
        },
        shadowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Background gradient wrapper for full-screen purple sections. */
export function GradientBackground({
  children,
  colors = Gradients.hero,
  style,
}: {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
