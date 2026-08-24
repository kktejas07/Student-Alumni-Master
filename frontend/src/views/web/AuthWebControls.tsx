/**
 * AuthWebControls — shared dark-theme input + button primitives used across
 * the web auth flow (register, email-verify, 2fa, onboarding).
 */
import { ReactNode, useState } from 'react';
import {
  View, Text, Pressable, TextInput as RNTextInput, Platform,
} from 'react-native';
import { Colors as C } from '@/src/theme';
import { useRoleTheme } from '@/src/views/auth/RoleTheme';
import { Trackable, ANALYTICS_IDS } from '@/src/analytics';

// ─── Field ───────────────────────────────────────────────────────────────────
export function WebField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  testID,
  rightSlot,
  state,
  helper,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  testID?: string;
  rightSlot?: ReactNode;
  state?: 'ok' | 'error' | null;
  helper?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor =
    state === 'error' ? '#EF4444'
    : state === 'ok' ? '#10B981'
    : focused ? '#B07FDF'
    : '#E5E7EB';
  return (
    <View className="mb-3.5">
      {label ? <Text className="font-body-medium text-xs tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.72)', letterSpacing: 0.4 }}>{label}</Text> : null}
      <View
        className="flex-row items-center bg-white rounded-xl"
        style={{
          borderWidth: 1,
          borderColor,
          ...(Platform.OS === 'web' ? { transitionDuration: '160ms' } as any : {}),
          ...(focused ? { backgroundColor: '#E5E7EB', boxShadow: '0px 0px 16px rgba(176,127,223,0.25)' } : {}),
        }}
      >
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
          className="flex-1 text-white font-body-regular text-base"
          style={{ paddingHorizontal: 16, paddingVertical: 13, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
        />
        {rightSlot ? <View className="pr-3">{rightSlot}</View> : null}
      </View>
      {helper ? (
        <Text
          className="font-body-regular text-xs mt-1"
          style={{ color: state === 'error' ? '#FCA5A5' : state === 'ok' ? '#86EFAC' : '#9CA3AF' }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Primary button (purple) ─────────────────────────────────────────────────
export function WebPrimaryBtn({
  label, onPress, loading, disabled, testID, style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: any;
}) {
  // Pull role-specific gradient colors from RoleThemeContext when available.
  const { primary, primaryL } = useRoleTheme();
  return (
    <Trackable id={ANALYTICS_IDS.auth.login.btn.submit} label={label} disabled={disabled || loading} onPress={onPress}>
      <Pressable
        disabled={disabled || loading}
        testID={testID}
        className="items-center rounded-xl mt-1"
        style={({ hovered, pressed }: any) => ({
          backgroundColor: hovered ? primaryL : primary,
          paddingVertical: 14,
          boxShadow: hovered ? `0px 8px 22px ${primary}88` : `0px 8px 18px ${primary}66`,
          ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}),
          ...(hovered ? { transform: [{ translateY: -1 }] } : {}),
          ...(pressed ? { transform: [{ scale: 0.985 }] } : {}),
          ...((disabled || loading) ? { opacity: 0.55 } : {}),
          ...style,
        })}
      >
        <Text className="text-white font-body-bold text-base">{loading ? 'Working…' : label}</Text>
      </Pressable>
    </Trackable>
  );
}

// ─── Ghost button (transparent w/ border) ────────────────────────────────────
export function WebGhostBtn({
  label, onPress, testID, style, leftIcon, disabled, loading,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  style?: any;
  leftIcon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Trackable id={ANALYTICS_IDS.auth.login.btn.sso} label={label} disabled={disabled || loading} onPress={onPress}>
      <Pressable
        testID={testID}
        disabled={disabled || loading}
        className="flex-row items-center justify-center gap-2.5 rounded-xl"
        style={({ hovered, pressed }: any) => ({
          backgroundColor: hovered && !disabled && !loading ? '#E5E7EB' : '#F9FAFB',
          borderColor: hovered && !disabled && !loading ? '#D1D5DB' : '#E5E7EB',
          borderWidth: 1,
          paddingVertical: 12,
          paddingHorizontal: 16,
          ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}),
          ...(hovered && !disabled && !loading ? { transform: [{ translateY: -1 }] } : {}),
          ...(pressed && !disabled && !loading ? { transform: [{ scale: 0.985 }] } : {}),
          ...((disabled || loading) ? { opacity: 0.5 } : {}),
          ...style,
        })}
      >
      {leftIcon ? <View>{leftIcon}</View> : null}
      <Text className="font-body-semibold text-base text-gray-800">{loading ? 'Working...' : label}</Text>
    </Pressable>
    </Trackable>
  );
}

// ─── Step progress bar (used in onboarding + 2FA) ────────────────────────────
export function WebStepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View className="flex-row w-full py-3 mb-2">
      {steps.map((s, i) => (
        <View key={s} className="flex-1 items-center relative">
          <View
            className="rounded-full border-2 mb-1.5"
            style={{
              width: i === current ? 12 : 10,
              height: i === current ? 12 : 10,
              backgroundColor: i <= current ? '#7C3AED' : '#E5E7EB',
              borderColor: i === current ? '#7C3AED' : '#E5E7EB',
              zIndex: 2,
              ...(i === current ? { boxShadow: '0px 0px 8px rgba(124,58,237,0.6)' } as any : {}),
            }}
          />
          <Text
            className="font-body-medium text-xs"
            style={{
              color: i === current ? '#C4B5FD' : '#9CA3AF',
              ...(i === current ? { fontFamily: 'DMSans_700Bold' } : {}),
            }}
            numberOfLines={1}
          >
            {s}
          </Text>
          {i < steps.length - 1 && (
            <View
              className="absolute h-0.5"
              style={{
                top: 5,
                left: '50%',
                right: '-50%',
                backgroundColor: i < current ? '#7C3AED' : '#E5E7EB',
                zIndex: 1,
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Section header (small caption) ──────────────────────────────────────────
export function WebSectionLabel({ children }: { children: ReactNode }) {
  return <Text className="font-body-bold text-xs tracking-widest uppercase mt-1 mb-2.5" style={{ color: '#6B7280' }}>{children}</Text>;
}

// ─── Selectable option row (for role selection / 2fa method) ─────────────────
export function WebOptionRow({
  selected, onPress, emoji, title, subtitle, recommended, testID,
}: {
  selected: boolean;
  onPress: () => void;
  emoji: string;
  title: string;
  subtitle?: string;
  recommended?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      className="flex-row items-center gap-3 rounded-2xl mb-2.5"
      style={({ hovered, pressed }: any) => ({
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: selected ? 'rgba(124,58,237,0.16)' : '#F9FAFB',
        borderColor: selected ? '#7C3AED' : (hovered ? 'rgba(196,181,253,0.35)' : '#E5E7EB'),
        borderWidth: 1,
        ...(Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}),
        ...(hovered ? { backgroundColor: 'rgba(124,58,237,0.10)' } : {}),
        ...(pressed ? { transform: [{ scale: 0.99 }] } : {}),
      })}
    >
      <View
        className="rounded-xl items-center justify-center"
        style={{
          width: 38, height: 38,
          backgroundColor: selected ? 'rgba(124,58,237,0.28)' : '#E5E7EB',
          borderColor: selected ? 'rgba(196,181,253,0.45)' : '#E5E7EB',
          borderWidth: 1,
        }}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-body-bold text-base text-gray-800">{title}</Text>
          {recommended && (
            <View className="rounded-full border" style={{ backgroundColor: 'rgba(16,185,129,0.18)', borderColor: 'rgba(110,231,183,0.35)', paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text className="font-body-bold text-xs" style={{ color: '#86EFAC', letterSpacing: 0.3 }}>Recommended</Text>
            </View>
          )}
        </View>
        {subtitle ? <Text className="font-body-regular text-xs text-gray-500 mt-0.5">{subtitle}</Text> : null}
      </View>
      <View
        className="rounded-full items-center justify-center"
        style={{
          width: 22, height: 22,
          borderWidth: 2,
          borderColor: selected ? '#7C3AED' : '#D1D5DB',
          backgroundColor: selected ? '#7C3AED' : 'transparent',
        }}
      >
        {selected && <Text className="text-gray-800 text-xs">✓</Text>}
      </View>
    </Pressable>
  );
}
