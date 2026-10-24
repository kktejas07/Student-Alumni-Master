/**
 * src/ui/primitives.tsx — the shared component kit.
 *
 * Every component reads `usePortalTheme()` so the same <Button> is purple in
 * the student portal, orange for alumni and blue for colleges without any
 * per-portal file. Nothing in here hardcodes a colour.
 */
import React from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator, Image,
  Animated, Easing, type ViewStyle, type TextStyle, type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, X } from 'lucide-react-native';
import { usePortalTheme, SPACE, RADIUS, web, type UiTokens } from './theme';

type Style = StyleProp<ViewStyle>;

/* ───────────────────────── Text ───────────────────────── */
type TxtVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'caption' | 'kicker' | 'mono';
type TxtTone = 'default' | 'muted' | 'dim' | 'accent' | 'danger' | 'success' | 'warning' | 'onAccent';

const TXT: Record<TxtVariant, (t: UiTokens) => TextStyle> = {
  display:    (t) => ({ fontFamily: t.typo.display700, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 }),
  title:      (t) => ({ fontFamily: t.typo.display700, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 }),
  heading:    (t) => ({ fontFamily: t.typo.display600, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 }),
  subheading: (t) => ({ fontFamily: t.typo.body600, fontSize: 14, lineHeight: 20 }),
  body:       (t) => ({ fontFamily: t.typo.body500, fontSize: 13.5, lineHeight: 20 }),
  bodyStrong: (t) => ({ fontFamily: t.typo.body700, fontSize: 13.5, lineHeight: 20 }),
  caption:    (t) => ({ fontFamily: t.typo.body500, fontSize: 11.5, lineHeight: 16 }),
  kicker:     (t) => ({ fontFamily: t.typo.body700, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' }),
  mono:       (t) => ({ fontFamily: t.typo.mono500, fontSize: 12.5, lineHeight: 18 }),
};

export function Txt({
  variant = 'body', tone = 'default', style, children, ...rest
}: React.ComponentProps<typeof Text> & { variant?: TxtVariant; tone?: TxtTone }) {
  const t = usePortalTheme();
  const color = {
    default: t.text, muted: t.textMuted, dim: t.textDim, accent: t.accent,
    danger: t.danger, success: t.success, warning: t.warning, onAccent: t.onAccent,
  }[tone];
  return <Text {...rest} style={[TXT[variant](t), { color }, style]}>{children}</Text>;
}

/* ───────────────────────── Button ───────────────────────── */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
const BTN_H: Record<ButtonSize, number> = { sm: 32, md: 40, lg: 48 };
const BTN_PX: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };
const BTN_FS: Record<ButtonSize, number> = { sm: 12.5, md: 13.5, lg: 15 };

export function Button({
  title, children, onPress, variant = 'primary', size = 'md', Icon, iconRight, loading, disabled, style, testID, accessibilityLabel,
}: {
  title?: string; children?: React.ReactNode; onPress?: () => void; variant?: ButtonVariant; size?: ButtonSize;
  Icon?: any; iconRight?: boolean; loading?: boolean; disabled?: boolean; style?: Style; testID?: string; accessibilityLabel?: string;
}) {
  const t = usePortalTheme();
  const off = disabled || loading;
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : t.text;
  const iconEl = Icon ? <Icon size={BTN_FS[size] + 2} color={fg} /> : null;
  const inner = (
    <>
      {loading ? <ActivityIndicator size="small" color={fg} /> : !iconRight && iconEl}
      {(title || children) && (
        <Text style={{ fontFamily: t.typo.body700, fontSize: BTN_FS[size], color: fg }}>{title ?? children}</Text>
      )}
      {!loading && iconRight && iconEl}
    </>
  );
  const base: ViewStyle = {
    height: BTN_H[size], paddingHorizontal: BTN_PX[size], borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    opacity: off ? 0.55 : 1,
  };
  const frame: ViewStyle =
    variant === 'secondary' ? { backgroundColor: t.surface2, borderWidth: 1, borderColor: t.borderHi }
    : variant === 'ghost' ? { backgroundColor: 'transparent' }
    : variant === 'danger' ? { backgroundColor: t.dangerBg, borderWidth: 1, borderColor: t.danger + '55' }
    : {};
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ hovered, pressed }: any) => [
        variant !== 'primary' && base, variant !== 'primary' && frame,
        variant !== 'primary' && hovered && { backgroundColor: t.hover },
        pressed && { transform: [{ scale: 0.98 }] },
        web({ cursor: off ? 'default' : 'pointer', transitionDuration: '140ms' }),
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[t.accent, t.accentD]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[base, web({ boxShadow: t.accentGlow })]}
        >
          {inner}
        </LinearGradient>
      ) : inner}
    </Pressable>
  );
}

export function IconButton({
  Icon, onPress, size = 36, color, badge, accessibilityLabel, style, testID, active,
}: { Icon: any; onPress?: () => void; size?: number; color?: string; badge?: boolean | number; accessibilityLabel: string; style?: Style; testID?: string; active?: boolean }) {
  const t = usePortalTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ hovered }: any) => [
        {
          width: size, height: size, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
          backgroundColor: active ? t.accentSoft : hovered ? t.hover : t.surface2,
          borderWidth: 1, borderColor: active ? t.accent + '66' : t.border,
        },
        web({ cursor: 'pointer', transitionDuration: '140ms' }),
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.45)} color={color || (active ? t.accent : t.textMuted)} />
      {!!badge && (
        <View style={{
          position: 'absolute', top: 6, right: 6, minWidth: 8, height: 8, borderRadius: 4,
          backgroundColor: t.danger, borderWidth: 1.5, borderColor: t.surface,
          paddingHorizontal: typeof badge === 'number' && badge > 0 ? 3 : 0,
        }}>
          {typeof badge === 'number' && badge > 0 && badge < 100 && (
            <Text style={{ color: '#fff', fontSize: 7, fontFamily: t.typo.body700, lineHeight: 8, textAlign: 'center' }}>{badge}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

/* ───────────────────────── Card ───────────────────────── */
export function Card({
  children, style, padded = true, glass, onPress, accent, testID,
}: { children?: React.ReactNode; style?: Style; padded?: boolean; glass?: boolean; onPress?: () => void; accent?: boolean; testID?: string }) {
  const t = usePortalTheme();
  const body = [
    {
      backgroundColor: glass ? t.surfaceGlass : t.surface,
      borderRadius: RADIUS.card, borderWidth: 1, borderColor: accent ? t.accent + '55' : t.border,
      padding: padded ? SPACE.base : 0, overflow: 'hidden' as const,
    },
    web({ boxShadow: t.shadow, ...(glass ? { backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' } : {}) }),
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} testID={testID} accessibilityRole="button"
        style={({ hovered }: any) => [...body, hovered && { borderColor: t.borderHi }, web({ cursor: 'pointer', transitionDuration: '160ms' })]}>
        {children}
      </Pressable>
    );
  }
  return <View style={body} testID={testID}>{children}</View>;
}

export function SectionHeader({ title, subtitle, kicker, right, style }: { title: string; subtitle?: string; kicker?: string; right?: React.ReactNode; style?: Style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.md, marginBottom: SPACE.md }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {kicker && <Txt variant="kicker" tone="accent" style={{ marginBottom: 4 }}>{kicker}</Txt>}
        <Txt variant="heading">{title}</Txt>
        {subtitle && <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Txt>}
      </View>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: Style }) {
  const t = usePortalTheme();
  return <View style={[{ height: 1, backgroundColor: t.border, alignSelf: 'stretch' }, style]} />;
}

/* ───────────────────────── Badge ───────────────────────── */
export type BadgeTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export function Badge({ label, tone = 'neutral', style, dot }: { label: string | number; tone?: BadgeTone; style?: Style; dot?: boolean }) {
  const t = usePortalTheme();
  const map = {
    accent:  { bg: t.accentSoft, fg: t.isDark ? t.accentL : t.accentD },
    neutral: { bg: t.hover, fg: t.textMuted },
    success: { bg: t.successBg, fg: t.success },
    warning: { bg: t.warningBg, fg: t.warning },
    danger:  { bg: t.dangerBg, fg: t.danger },
    info:    { bg: t.infoBg, fg: t.info },
  }[tone];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: map.bg, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }, style]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: map.fg }} />}
      <Text style={{ color: map.fg, fontFamily: t.typo.body700, fontSize: 10.5, letterSpacing: 0.3 }}>{String(label)}</Text>
    </View>
  );
}

/* ───────────────────────── Avatar ───────────────────────── */
export function Avatar({ name, initials, photo, size = 36, style }: { name?: string; initials?: string; photo?: string | null; size?: number; style?: Style }) {
  const t = usePortalTheme();
  const txt = initials || (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.border }, style]}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} accessibilityLabel={name} />
      ) : (
        <LinearGradient colors={[t.accent, t.accentD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.onAccent, fontFamily: t.typo.body700, fontSize: size * 0.36 }}>{txt}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

/* ───────────────────────── Inputs ───────────────────────── */
export function Input({
  label, hint, error, style, inputStyle, Icon, ...rest
}: React.ComponentProps<typeof TextInput> & { label?: string; hint?: string; error?: string; style?: Style; inputStyle?: StyleProp<TextStyle>; Icon?: any }) {
  const t = usePortalTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={style}>
      {label && <Txt variant="caption" tone="muted" style={{ marginBottom: 6, fontFamily: t.typo.body600 }}>{label}</Txt>}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: RADIUS.md,
        backgroundColor: t.surface2, borderWidth: 1, borderColor: error ? t.danger : focused ? t.accent : t.border,
      }}>
        {Icon && <Icon size={15} color={t.textDim} />}
        <TextInput
          placeholderTextColor={t.textDim}
          {...rest}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          style={[{ flex: 1, color: t.text, fontFamily: t.typo.body500, fontSize: 13.5, paddingVertical: 8 }, web({ outlineStyle: 'none' }), inputStyle]}
        />
      </View>
      {(error || hint) && <Txt variant="caption" tone={error ? 'danger' : 'dim'} style={{ marginTop: 4 }}>{error || hint}</Txt>}
    </View>
  );
}

export function SearchField({
  value, onChangeText, onSubmit, placeholder = 'Search…', width = 260, style, testID, nativeID,
}: { value: string; onChangeText: (v: string) => void; onSubmit?: () => void; placeholder?: string; width?: number | string; style?: Style; testID?: string; nativeID?: string }) {
  const t = usePortalTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, width: width as any, height: 36, paddingHorizontal: 11, borderRadius: RADIUS.md, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border }, style]}>
      <Pressable onPress={onSubmit} accessibilityLabel="Search" accessibilityRole="button" style={web({ cursor: 'pointer' })}>
        <Search size={14} color={value.trim() ? t.text : t.textDim} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={t.textDim}
        testID={testID}
        nativeID={nativeID}
        accessibilityLabel={placeholder}
        style={[{ flex: 1, color: t.text, fontFamily: t.typo.body500, fontSize: 13 }, web({ outlineStyle: 'none' })]}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={6} accessibilityLabel="Clear search" style={web({ cursor: 'pointer' })}>
          <X size={13} color={t.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

/* ───────────────────────── Tabs ───────────────────────── */
export function Tabs<T extends string>({
  items, value, onChange, style, size = 'md',
}: { items: { id: T; label: string; count?: number; Icon?: any }[]; value: T; onChange: (id: T) => void; style?: Style; size?: 'sm' | 'md' }) {
  const t = usePortalTheme();
  return (
    <View style={[{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: RADIUS.lg, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, alignSelf: 'flex-start', flexWrap: 'wrap' }, style]}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange(it.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ hovered }: any) => [
              { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: size === 'sm' ? 10 : 14, height: size === 'sm' ? 28 : 34, borderRadius: RADIUS.md,
                backgroundColor: on ? t.accent : hovered ? t.hover : 'transparent' },
              web({ cursor: 'pointer', transitionDuration: '140ms' }),
            ]}
          >
            {it.Icon && <it.Icon size={14} color={on ? t.onAccent : t.textMuted} />}
            <Text style={{ fontFamily: t.typo.body600, fontSize: size === 'sm' ? 12 : 13, color: on ? t.onAccent : t.textMuted }}>{it.label}</Text>
            {it.count != null && (
              <View style={{ backgroundColor: on ? t.onAccentSoft : t.hover, borderRadius: RADIUS.pill, paddingHorizontal: 6, minWidth: 18, alignItems: 'center' }}>
                <Text style={{ fontFamily: t.typo.body700, fontSize: 10, color: on ? t.onAccent : t.textMuted }}>{it.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Stat ───────────────────────── */
export function StatCard({
  label, value, delta, Icon, hint, style, onPress,
}: { label: string; value: string | number; delta?: string; Icon?: any; hint?: string; style?: Style; onPress?: () => void }) {
  const t = usePortalTheme();
  const up = delta ? !delta.trim().startsWith('-') : undefined;
  return (
    <Card style={[{ flex: 1, minWidth: 150, gap: 6 }, style]} onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="kicker" tone="muted">{label}</Txt>
        {Icon && (
          <View style={{ width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color={t.isDark ? t.accentL : t.accentD} />
          </View>
        )}
      </View>
      <Txt variant="title">{String(value)}</Txt>
      {(delta || hint) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {delta && <Badge label={delta} tone={up ? 'success' : 'danger'} />}
          {hint && <Txt variant="caption" tone="dim" numberOfLines={1}>{hint}</Txt>}
        </View>
      )}
    </Card>
  );
}

/* ───────────────────────── Empty / Skeleton ───────────────────────── */
export function EmptyState({
  title, body, Icon, action, style, compact,
}: { title: string; body?: string; Icon?: any; action?: React.ReactNode; style?: Style; compact?: boolean }) {
  const t = usePortalTheme();
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? SPACE.lg : SPACE.xxxl, paddingHorizontal: SPACE.lg, gap: 8, borderRadius: RADIUS.card, borderWidth: 1, borderStyle: 'dashed', borderColor: t.borderHi }, style]}>
      {Icon && (
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <Icon size={20} color={t.isDark ? t.accentL : t.accentD} />
        </View>
      )}
      <Txt variant="subheading" style={{ textAlign: 'center' }}>{title}</Txt>
      {body && <Txt variant="caption" tone="muted" style={{ textAlign: 'center', maxWidth: 360 }}>{body}</Txt>}
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}

export function Skeleton({ width = '100%', height = 14, radius = RADIUS.sm, style }: { width?: number | string; height?: number; radius?: number; style?: Style }) {
  const t = usePortalTheme();
  const v = React.useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(v, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ width: width as any, height, borderRadius: radius, backgroundColor: t.hover, opacity: v }, style]} />;
}

export function SkeletonRows({ rows = 4, height = 48, gap = 10 }: { rows?: number; height?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} height={height} radius={RADIUS.lg} />)}
    </View>
  );
}

/* ───────────────────────── Layout helpers ───────────────────────── */
export function Row({ children, gap = SPACE.md, style, wrap, align = 'center' }: { children?: React.ReactNode; gap?: number; style?: Style; wrap?: boolean; align?: ViewStyle['alignItems'] }) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Stack({ children, gap = SPACE.md, style }: { children?: React.ReactNode; gap?: number; style?: Style }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export const ui = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
});
