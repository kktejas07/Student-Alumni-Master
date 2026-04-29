/**
 * VIEW LAYER - Reusable Components
 * Pure UI. No business logic.
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/src/theme';

const C = Colors.light;

// ----- NeoCard with hard shadow -----
export function NeoCard({
  children,
  style,
  shadow = 'md',
  bg,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  bg?: string;
  testID?: string;
}) {
  const offsets = { sm: 2, md: 4, lg: 6, none: 0 }[shadow];
  return (
    <View testID={testID} style={[{ position: 'relative' }, style]}>
      {shadow !== 'none' && (
        <View
          style={{
            position: 'absolute',
            top: offsets,
            left: offsets,
            right: -offsets,
            bottom: -offsets,
            backgroundColor: C.shadow,
            borderRadius: Radius.lg,
          }}
        />
      )}
      <View
        style={{
          borderWidth: 2,
          borderColor: C.border,
          borderRadius: Radius.lg,
          backgroundColor: bg || C.surface,
          padding: Spacing.md,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ----- Button -----
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const isDisabled = disabled || loading;
  const colors = {
    primary: { bg: C.primary, fg: C.primaryText, shadow: C.shadow },
    secondary: { bg: C.surface, fg: C.primary, shadow: C.shadow },
    accent: { bg: C.accentYellow, fg: C.primary, shadow: C.shadow },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      testID={testID}
      style={[{ position: 'relative' }, style]}
    >
      <View
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          right: -4,
          bottom: -4,
          backgroundColor: colors.shadow,
          borderRadius: Radius.pill,
        }}
      />
      <View
        style={{
          borderWidth: 2,
          borderColor: C.border,
          borderRadius: Radius.pill,
          backgroundColor: colors.bg,
          paddingVertical: 14,
          paddingHorizontal: 24,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.6 : 1,
          gap: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <>
            {icon}
            <Text style={[Typography.bodyBold, { color: colors.fg }]}>{title}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ----- Input -----
export function Input({
  label,
  error,
  containerStyle,
  testID,
  ...rest
}: TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const [focus, setFocus] = React.useState(false);
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && <Text style={[Typography.caption, { color: C.textSecondary }]}>{label}</Text>}
      <TextInput
        testID={testID}
        placeholderTextColor={C.textMuted}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          borderWidth: 2,
          borderColor: focus ? C.accentBlue : C.border,
          borderRadius: Radius.md,
          padding: 14,
          backgroundColor: C.surface,
          fontFamily: 'Manrope_400Regular',
          fontSize: 16,
          color: C.textPrimary,
        }}
        {...rest}
      />
      {error && (
        <Text style={[Typography.bodySm, { color: C.danger }]}>{error}</Text>
      )}
    </View>
  );
}

// ----- ChipBadge -----
export function Chip({
  label,
  active,
  onPress,
  color,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      activeOpacity={0.85}
      style={{
        borderWidth: 2,
        borderColor: C.border,
        borderRadius: Radius.pill,
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: active ? color || C.accentYellow : C.surface,
      }}
    >
      <Text style={[Typography.bodySm, { color: C.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ----- ScreenHeader -----
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
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
        <Text style={[Typography.h2, { color: C.textPrimary }]}>{title}</Text>
        {subtitle && (
          <Text style={[Typography.body, { color: C.textSecondary, marginTop: 4 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}
