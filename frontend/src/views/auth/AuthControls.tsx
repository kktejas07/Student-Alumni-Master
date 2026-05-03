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
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}) {
  const inactive = disabled || loading;
  // Pull colours from RoleThemeContext (provided by AuthShell). Falls back to
  // the default purple gradient when used outside of AuthShell.
  const { gradient } = useRoleTheme();
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
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
export function OutlineButton({ label, onPress, icon, disabled }: { label: string; onPress?: () => void; icon?: React.ReactNode; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[ob.wrap, disabled && { opacity: 0.5 }]}>
      {icon}
      <Text style={ob.text}>{label}</Text>
    </Pressable>
  );
}

const ob = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: AC.border, backgroundColor: AC.glass, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  text: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
});

// ─── Text Input ─────────────────────────────────────────────────
export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  hint,
  error,
  leftIcon,
  rightSlot,
  onSubmitEditing,
}: {
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
}) {
  const [focused, setFocused] = React.useState(false);
  const { primary } = useRoleTheme();
  const focusBg = primary ? `${primary}10` : 'rgba(124,58,237,0.06)';
  return (
    <View style={inp.wrap}>
      {label ? <Text style={inp.label}>{typeof label === 'string' ? label : String(label ?? '')}</Text> : null}
      <View style={[inp.row, focused && [inp.rowOn, { borderColor: primary, backgroundColor: focusBg }], error && inp.rowErr]}>
        {leftIcon ? <View style={{ marginRight: 10 }}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={AC.dim}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          style={inp.input}
        />
        {rightSlot}
      </View>
      {error ? <Text style={inp.err}>{typeof error === 'string' ? error : (error as any)?.msg || (error as any)?.message || JSON.stringify(error)}</Text> : hint ? <Text style={inp.hint}>{hint}</Text> : null}
    </View>
  );
}

const inp = StyleSheet.create({
  wrap: { width: '100%' },
  label: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: AC.card, borderColor: AC.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48 },
  rowOn: { borderColor: AC.primary, backgroundColor: 'rgba(124,58,237,0.06)' },
  rowErr: { borderColor: AC.red },
  input: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 14, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  hint: { color: AC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 6 },
  err: { color: AC.red, fontFamily: FONTS.bold, fontSize: 11.5, marginTop: 6 },
});

// ─── Password Strength meter ────────────────────────────────────
export function StrengthMeter({ score, label, tips }: { score: number; label: string; tips: string[] }) {
  const colors = ['#EF4444', '#F59E0B', '#FBBF24', '#22C55E', '#22C55E'];
  return (
    <View style={pm.wrap}>
      <View style={pm.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[pm.bar, { backgroundColor: i < score ? colors[score] : 'rgba(255,255,255,0.08)' }]} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={[pm.label, { color: colors[Math.min(score, 4)] }]}>{label}</Text>
        {tips.length > 0 && <Text numberOfLines={1} style={pm.tip}>{tips[0]}</Text>}
      </View>
    </View>
  );
}

const pm = StyleSheet.create({
  wrap: { marginTop: 10 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 3 },
  label: { fontFamily: FONTS.bold, fontSize: 11.5 },
  tip: { color: AC.dim, fontFamily: FONTS.med, fontSize: 11 },
});
