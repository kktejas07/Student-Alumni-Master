import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme, radius, space, type } from '../theme';

export function Card({ children, style, tinted }) {
  const { t } = useTheme();
  return (
    <View style={[{
      backgroundColor: tinted ? t.panel2 : t.panel,
      borderColor: tinted ? t.accentLine : t.line,
      borderWidth: 1, borderRadius: radius.card, padding: 20
    }, t.shadow, style]}>{children}</View>
  );
}

export function Label({ children, color }) {
  const { t } = useTheme();
  return <Text style={[type.label, { color: color || t.muted, marginBottom: 12 }]}>{children}</Text>;
}

export function Pill({ children, tone = 'ok' }) {
  const { t } = useTheme();
  const map = {
    ok: [t.ok, t.okTint, t.okLine],
    warn: [t.amber, t.amberTint, t.amberLine],
    muted: [t.muted, 'transparent', t.line2],
    accent: [t.accentLt, t.tintStrong, t.accentLine]
  };
  const [fg, bg, bd] = map[tone] || map.ok;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderColor: bd, borderWidth: 1, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 11 }}>
      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 11, color: fg }}>{children}</Text>
    </View>
  );
}

export function Btn({ children, onPress, variant = 'primary', color, style }) {
  const { t } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to) => Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const ghost = variant === 'ghost';
  const fill = color || t.accent;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        style={{
          backgroundColor: ghost ? 'transparent' : fill,
          borderColor: ghost ? t.line2 : 'transparent', borderWidth: 1,
          borderRadius: radius.ctl, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center'
        }}>
        <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: ghost ? t.muted : t.onAccent }}>{children}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function Field({ label, value, placeholder }) {
  const { t } = useTheme();
  return (
    <View style={{ marginBottom: space.md }}>
      {label ? <Label>{label}</Label> : null}
      <View style={{ backgroundColor: t.panel2, borderColor: t.line2, borderWidth: 1, borderRadius: radius.ctl, paddingVertical: 13, paddingHorizontal: 14 }}>
        <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 14, color: value ? t.text : t.dim }}>{value || placeholder}</Text>
      </View>
    </View>
  );
}

export function Chip({ children, on, onPress, tone }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      backgroundColor: on ? t.tintStrong : 'transparent',
      borderColor: on ? (tone || t.accent) : t.line2, borderWidth: 1,
      borderRadius: radius.pill, paddingVertical: 9, paddingHorizontal: 15, marginRight: 8, marginBottom: 8
    }}>
      <Text style={{ fontFamily: 'Outfit_500Medium', fontSize: 13, color: on ? t.onTint : t.muted }}>{children}</Text>
    </Pressable>
  );
}

/** Fills from 0 → pct on mount. Rests filled. */
export function ProgressBar({ pct = 0, height = 6, colors }) {
  const { t } = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 1100, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start();
  }, [pct]);
  const track = colors || [t.accent, t.ramp[2]];
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: t.line2, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: track[0], width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** Ring gauge — draws its stroke on mount, then rests filled. */
export function Ring({ pct = 0, size = 112, stroke = 9, label }) {
  const { t } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const anim = useRef(new Animated.Value(0)).current;
  const [off, setOff] = React.useState(c);
  useEffect(() => {
    const id = anim.addListener(({ value }) => setOff(c * (1 - value / 100)));
    Animated.timing(anim, { toValue: pct, duration: 1400, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [pct]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.accentLt} />
            <Stop offset="1" stopColor={t.ramp[2]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.line2} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#ring)" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: size / 4.6, color: t.text }}>{label || `${pct}%`}</Text>
    </View>
  );
}

/** Compact stat row — the dense alternative to a stat card. */
export function StatRow({ label, sub, value, color }) {
  const { t } = useTheme();
  const c = color || t.accent;
  return (
    <View style={[{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: t.panel, borderColor: t.line, borderWidth: 1,
      borderRadius: radius.nest, paddingVertical: 12, paddingHorizontal: 14
    }, t.shadow]}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: c + '22' }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[type.label, { color: t.muted, marginBottom: 2 }]}>{label}</Text>
        <Text numberOfLines={1} style={{ fontFamily: 'Outfit_400Regular', fontSize: 12, color: t.dim }}>{sub}</Text>
      </View>
      <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, letterSpacing: -0.6, color: c }}>{value}</Text>
    </View>
  );
}

/** Counts 0 → value with a cubic ease-out. Rests at value. */
export function Counter({ value = 0, suffix = '', style }) {
  const { t } = useTheme();
  const [n, setN] = React.useState(0);
  useEffect(() => {
    const a = new Animated.Value(0);
    const id = a.addListener(({ value: v }) => setN(Math.round(v)));
    Animated.timing(a, { toValue: value, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [value]);
  return <Text style={[type.num, { color: t.text }, style]}>{n.toLocaleString('en-IN')}{suffix}</Text>;
}

/** Continuous horizontal scroll of a duplicated set. */
export function Marquee({ children, duration = 26000, width = 900 }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(x, { toValue: -width, duration, easing: Easing.linear, useNativeDriver: true })).start();
  }, [width, duration]);
  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        {children}{children}
      </Animated.View>
    </View>
  );
}
