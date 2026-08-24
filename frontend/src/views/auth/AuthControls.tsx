/**
 * Reusable auth UI primitives matching HTML spec.
 * Migrated to NativeWind className.
 */
import React from 'react';
import {View, Text, Pressable, TextInput, Platform, ActivityIndicator, StyleSheet} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRoleTheme } from './RoleTheme';

// ─── Primary CTA button ─────────────────────────────────────────
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  fullWidth = true,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const inactive = disabled || loading;
  const { gradient } = useRoleTheme();
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      className={`rounded-[14px] overflow-hidden ${fullWidth ? 'w-full' : ''} ${inactive ? 'opacity-50' : ''}`}
      style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
    >
      <LinearGradient
        colors={gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="py-3.5 px-5 items-center justify-center flex-row gap-2"
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {icon}
            <Text className="text-white font-display text-[15px] tracking-wide">{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ─── Outline button ─────────────────────────────────────────────
export function OutlineButton({ label, onPress, icon, disabled, testID, accessibilityLabel, accessibilityHint }: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={`flex-row items-center py-3 px-[18px] rounded-xl border border-gray-200 bg-white relative ${disabled ? 'opacity-50' : ''}`}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
    >
      {icon && <View className="absolute left-4">{icon}</View>}
      <Text className="flex-1 text-center text-gray-900 font-bold text-[14px]">{label}</Text>
    </Pressable>
  );
}

const ob = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139, 132, 255, 0.25)', backgroundColor: 'rgba(18, 20, 43, 0.75)', position: 'relative', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transition: 'all 0.2s ease' } as any) : {}) },
  iconWrap: { position: 'absolute', left: 16 },
  text: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14 },
});

// ─── Text Input ─────────────────────────────────────────────────
export const AuthInput = React.forwardRef<TextInput, {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}>(function AuthInput(props, ref) {
  const {
    label, value, onChangeText, placeholder, secureTextEntry,
    keyboardType, autoCapitalize, hint, error, leftIcon, rightSlot,
    onSubmitEditing, blurOnSubmit, editable = true, autoFocus,
    testID, accessibilityLabel, accessibilityHint
  } = props;
  
  const [focused, setFocused] = React.useState(false);
  const { primary } = useRoleTheme();
  const focusBg = primary ? `${primary}18` : 'rgba(91, 79, 233, 0.15)';
  return (
    <View style={inp.wrap}>
      {label ? <Text style={inp.label}>{typeof label === 'string' ? label : String(label ?? '')}</Text> : null}
      <View style={[inp.row, focused && [inp.rowOn, { borderColor: primary || '#8B84FF', backgroundColor: focusBg }], error && inp.rowErr]}>
        {leftIcon ? <View style={{ marginRight: 10 }}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          editable={editable}
          autoFocus={autoFocus}
          testID={testID}
          accessible={true}
          accessibilityLabel={accessibilityLabel || (typeof label === 'string' ? label : placeholder)}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !editable }}
          className="flex-1 text-gray-900 font-body text-[14px]"
          style={!editable ? { opacity: 0.6 } : Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined}
        />
        {rightSlot}
      </View>
      {error ? (
        <Text className="text-red-500 font-bold text-[11.5px] mt-1.5" accessibilityLiveRegion="polite">
          {typeof error === 'string' ? error : (error as any)?.msg || (error as any)?.message || JSON.stringify(error)}
        </Text>
      ) : hint ? (
        <Text className="text-gray-500 font-body text-[11.5px] mt-1.5">{hint}</Text>
      ) : null}
    </View>
  );
});

const inp = StyleSheet.create({
  wrap: { width: '100%' },
  label: { color: '#D5D8E4', fontFamily: FONTS.bold, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18, 20, 43, 0.75)', borderColor: 'rgba(139, 132, 255, 0.22)', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 50 },
  rowOn: { borderColor: '#8B84FF', backgroundColor: 'rgba(91, 79, 233, 0.15)' },
  rowErr: { borderColor: AC.red },
  input: { flex: 1, color: '#F4F5FB', fontFamily: FONTS.med, fontSize: 14.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  hint: { color: '#9AA0B4', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 6 },
  err: { color: '#F87171', fontFamily: FONTS.bold, fontSize: 11.5, marginTop: 6 },
});

// ─── Password Rules — real-time checklist ────────────────────────
export function PasswordRules({ checks }: { checks: { met: boolean; label: string; key: string }[] }) {
  const allMet = checks.length > 0 && checks.every(c => c.met);
  if (allMet) return (
    <View className="mt-0.5">
      <Text className="text-green-600 font-bold text-[13px]">Secure Password</Text>
    </View>
  );

  return (
    <View className="bg-gray-50 rounded-[10px] border border-gray-200 p-3 gap-[7px] mt-2.5">
      <Text className="text-gray-700 font-bold text-[13px] mb-1">Password must contain : </Text>
      {checks.map((c) => (
        <View key={c.key} className="flex-row items-center gap-2">
          <View className={`w-2 h-2 rounded-full ${c.met ? 'bg-green-600' : 'bg-gray-200'}`} />
          <Text className={`font-body text-sm ${c.met ? 'text-green-600' : 'text-gray-400'}`}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}
