/**
 * AuthWebControls — shared dark-theme input + button primitives used across
 * the web auth flow (register, email-verify, 2fa, onboarding).
 */
import { ReactNode, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput as RNTextInput, Platform,
} from 'react-native';
import { Colors as C } from '@/src/theme';
import { useRoleTheme } from '@/src/views/auth/RoleTheme';

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
    : 'rgba(255,255,255,0.14)';
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={controlStyles.label}>{label}</Text> : null}
      <View
        style={[
          controlStyles.wrap,
          { borderColor },
          focused && controlStyles.wrapFocus,
        ]}
      >
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.32)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
          style={controlStyles.input}
        />
        {rightSlot ? <View style={controlStyles.rightSlot}>{rightSlot}</View> : null}
      </View>
      {helper ? (
        <Text
          style={[
            controlStyles.helper,
            state === 'error' && { color: '#FCA5A5' },
            state === 'ok' && { color: '#86EFAC' },
          ]}
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
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      style={({ hovered, pressed }: any) => [
        controlStyles.primary,
        { backgroundColor: primary, boxShadow: `0px 8px 18px ${primary}66` },
        hovered && { backgroundColor: primaryL, transform: [{ translateY: -1 }], boxShadow: `0px 8px 22px ${primary}88` },
        pressed && { transform: [{ scale: 0.985 }] },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      <Text style={controlStyles.primaryText}>{loading ? 'Working…' : label}</Text>
    </Pressable>
  );
}

// ─── Ghost button (transparent w/ border) ────────────────────────────────────
export function WebGhostBtn({
  label, onPress, testID, style, leftIcon,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  style?: any;
  leftIcon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ hovered, pressed }: any) => [
        controlStyles.ghost,
        hovered && controlStyles.ghostHover,
        pressed && { transform: [{ scale: 0.985 }] },
        style,
      ]}
    >
      {leftIcon ? <View>{leftIcon}</View> : null}
      <Text style={controlStyles.ghostText}>{label}</Text>
    </Pressable>
  );
}

// ─── Step progress bar (used in onboarding + 2FA) ────────────────────────────
export function WebStepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={controlStyles.stepBar}>
      {steps.map((s, i) => (
        <View key={s} style={{ flex: 1, alignItems: 'center', position: 'relative' }}>
          <View
            style={[
              controlStyles.dot,
              i <= current && controlStyles.dotActive,
              i === current && controlStyles.dotCurrent,
            ]}
          />
          <Text
            style={[
              controlStyles.stepLabel,
              i === current && { color: '#C4B5FD', fontFamily: 'DMSans_700Bold' },
            ]}
            numberOfLines={1}
          >
            {s}
          </Text>
          {i < steps.length - 1 && (
            <View
              style={[
                controlStyles.connector,
                i < current && { backgroundColor: '#7C3AED' },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Section header (small caption) ──────────────────────────────────────────
export function WebSectionLabel({ children }: { children: ReactNode }) {
  return <Text style={controlStyles.section}>{children}</Text>;
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
      style={({ hovered, pressed }: any) => [
        controlStyles.optRow,
        hovered && { borderColor: 'rgba(196,181,253,0.35)', backgroundColor: 'rgba(124,58,237,0.10)' },
        selected && controlStyles.optRowSel,
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      <View
        style={[
          controlStyles.optIcon,
          selected && { backgroundColor: 'rgba(124,58,237,0.28)', borderColor: 'rgba(196,181,253,0.45)' },
        ]}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={controlStyles.optTitle}>{title}</Text>
          {recommended && (
            <View style={controlStyles.recBadge}>
              <Text style={controlStyles.recBadgeText}>Recommended</Text>
            </View>
          )}
        </View>
        {subtitle ? <Text style={controlStyles.optSub}>{subtitle}</Text> : null}
      </View>
      <View
        style={[
          controlStyles.radio,
          selected && { borderColor: '#7C3AED', backgroundColor: '#7C3AED' },
        ]}
      >
        {selected && <Text style={{ color: '#FFF', fontSize: 11 }}>✓</Text>}
      </View>
    </Pressable>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const controlStyles = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 12,
    ...({ transitionDuration: '160ms' } as any),
  },
  wrapFocus: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0px 0px 16px rgba(176,127,223,0.25)',
  },
  input: {
    flex: 1,
    color: C.white,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...({ outlineStyle: 'none' } as any),
  },
  rightSlot: { paddingRight: 12 },
  helper: {
    color: 'rgba(255,255,255,0.44)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginTop: 5,
  },

  primary: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    boxShadow: '0px 8px 18px rgba(124,58,237,0.4)',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  primaryHover: {
    backgroundColor: '#9059D9',
    transform: [{ translateY: -1 }],
    boxShadow: '0px 8px 22px rgba(124,58,237,0.55)',
  },
  primaryText: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 15 },

  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  ghostHover: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.22)',
    transform: [{ translateY: -1 }],
  },
  ghostText: { color: C.white, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },

  stepBar: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 12,
    marginBottom: 8,
  },
  dot: {
    width: 10, height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.16)',
    marginBottom: 6,
    zIndex: 2,
  },
  dotActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  dotCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#7C3AED',
    width: 12, height: 12, borderRadius: 6,
    boxShadow: '0px 0px 8px rgba(124,58,237,0.6)',
  },
  stepLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'DMSans_500Medium',
  },
  connector: {
    position: 'absolute',
    top: 5,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    zIndex: 1,
  },

  section: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 10,
  },

  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  optRowSel: {
    backgroundColor: 'rgba(124,58,237,0.16)',
    borderColor: '#7C3AED',
  },
  optIcon: {
    width: 38, height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optTitle: { color: C.white, fontFamily: 'DMSans_700Bold', fontSize: 14 },
  optSub: { color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  radio: {
    width: 22, height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBadge: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(110,231,183,0.35)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  recBadgeText: {
    color: '#86EFAC',
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 0.3,
  },
});
