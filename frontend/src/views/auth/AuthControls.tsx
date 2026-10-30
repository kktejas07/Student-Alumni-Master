/**
 * Reusable auth UI primitives matching HTML spec.
 */
import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AC, FONTS } from './tokens';
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
  // Pull colours from RoleThemeContext (provided by AuthShell). Falls back to
  // the default purple gradient when used outside of AuthShell.
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
      style={[btn.wrap, fullWidth ? { width: '100%' } : null, inactive && btn.disabled]}
    >
      <LinearGradient
        colors={gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={btn.grad}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {icon}
            <Text style={btn.text}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const btn = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  disabled: { opacity: 0.5 },
  grad: { paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  text: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 15, letterSpacing: 0.2 },
});

// ─── Outline button ─────────────────────────────────────────────
export function OutlineButton({ label, onPress, icon, disabled, testID, accessibilityLabel, accessibilityHint }: { label: string; onPress?: () => void; icon?: React.ReactNode; disabled?: boolean; testID?: string; accessibilityLabel?: string; accessibilityHint?: string }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[ob.wrap, disabled && { opacity: 0.5 }]} testID={testID} accessible={true} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityHint={accessibilityHint} accessibilityState={{ disabled }}>
      {icon && <View style={ob.iconWrap}>{icon}</View>}
      <Text style={ob.text}>{label}</Text>
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
          style={[inp.input, !editable && { opacity: 0.6 }]}
        />
        {rightSlot}
      </View>
      {error ? <Text style={inp.err} accessibilityLiveRegion="polite">{typeof error === 'string' ? error : (error as any)?.msg || (error as any)?.message || JSON.stringify(error)}</Text> : hint ? <Text style={inp.hint}>{hint}</Text> : null}
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
    <View style={pr.secureContainer}>
      <Text style={pr.secureText}>Secure Password</Text>
    </View>
  );

  return (
    <View style={pr.wrap}>
      <Text style={pr.title}>Password must contain : </Text>
      {checks.map((c) => (
        <View key={c.key} style={pr.row}>
          <View style={[pr.dot, c.met ? pr.dotOk : pr.dotMiss]} />
          <Text style={[pr.text, c.met ? pr.textOk : pr.textMiss]}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

const pr = StyleSheet.create({
  wrap: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 7,
    marginTop: 10,
  },
  secureContainer: {
    marginTop: 2,
  },
  title: {
    color: '#374151',
    fontFamily: FONTS.bold,
    fontSize: 13,
    marginBottom: 4,
  },
  secureText: {
    color: '#16A34A',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOk: { backgroundColor: '#16A34A' },
  dotMiss: { backgroundColor: '#E5E7EB' },
  text: { fontFamily: FONTS.med, fontSize: 12 },
  textOk: { color: '#16A34A' },
  textMiss: { color: '#9CA3AF' },
});
