/**
 * Shared web-only platform UI primitives — used by Student/Mentor/College dashboards.
 * NOT used on mobile.
 */
import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, Easing, Platform } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { SA, SAGradients } from './tokens';

// ─── Shield Logo ─────────────────────────────────────────────────────────────
export function ShieldLogo({ size = 26, bg = '#FFFFFF', fg = SA.purple }: { size?: number; bg?: string; fg?: string }) {
  return (
    <Svg viewBox="0 0 200 240" width={size} height={size * 1.2} fill="none">
      <Path d="M100 4 L196 36 L196 120 Q196 190 100 236 Q4 190 4 120 L4 36 Z" fill={bg} />
      <SvgText
        x={100} y={158} textAnchor="middle"
        fontFamily="DMSans_700Bold" fontWeight="700" fontSize={92}
        fill={fg} letterSpacing={-4}
      >
        SA
      </SvgText>
    </Svg>
  );
}

// ─── GlassCard ───────────────────────────────────────────────────────────────
export function GlassCard({
  children,
  style,
  pad = 18,
  onPress,
  hover = true,
  glowTint = '#A78BFA',
}: {
  children: React.ReactNode;
  style?: any;
  pad?: number;
  onPress?: () => void;
  hover?: boolean;
  glowTint?: string;
}) {
  // Common hover-glow style hook (web-only via boxShadow transition)
  const hoverWebStyle = hover ? ({
    transition: 'box-shadow 200ms ease, transform 180ms ease, border-color 180ms ease',
  } as any) : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ hovered }: any) => [
          styles.glass,
          { padding: pad },
          hoverWebStyle,
          hover && hovered && [
            styles.glassHover,
            ({ boxShadow: `0 12px 40px ${glowTint}33, 0 0 0 1px ${glowTint}70 inset` } as any),
          ],
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  // Even for non-clickable cards, apply a subtle hover glow on web.
  return (
    <View
      // @ts-ignore — onMouseEnter/Leave only on web
      onMouseEnter={Platform.OS === 'web' ? (e: any) => {
        if (!hover) return;
        e.currentTarget.style.boxShadow = `0 10px 30px ${glowTint}26, 0 0 0 1px ${glowTint}55 inset`;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = `${glowTint}55`;
      } : undefined}
      onMouseLeave={Platform.OS === 'web' ? (e: any) => {
        if (!hover) return;
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = '';
      } : undefined}
      style={[styles.glass, { padding: pad }, hoverWebStyle, style]}
    >
      {children}
    </View>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({
  initials,
  size = 36,
  gradient = SAGradients.purple,
}: {
  initials: string;
  size?: number;
  gradient?: readonly [string, string];
}) {
  return (
    <LinearGradient
      colors={gradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size, height: size, borderRadius: size / 2,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: size * 0.36 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ count }: { count: number }) {
  if (!count || count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

// ─── SearchBar ───────────────────────────────────────────────────────────────
export function SearchBar({
  placeholder = 'Search…',
  value,
  onChangeText,
  width = 220,
}: {
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  width?: number;
}) {
  return (
    <View style={[styles.searchWrap, { width }]}>
      <Text style={{ fontSize: 14, opacity: 0.55 }}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SA.textWhisper}
        style={styles.searchInput}
      />
    </View>
  );
}

// ─── ProgressStrip ───────────────────────────────────────────────────────────
export function ProgressStrip({
  label,
  pct,
  rightLabel,
  gradient = SAGradients.purple,
}: {
  label: string;
  pct: number;
  rightLabel?: string;
  gradient?: readonly [string, string];
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 12, color: SA.textMuted, fontFamily: SA.fontMedium }}>{label}</Text>
        <Text style={{ fontSize: 12, color: SA.purplePale, fontFamily: SA.fontBold }}>
          {rightLabel || `${pct}%`}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, pct))}%` }]}
        />
      </View>
    </View>
  );
}

// ─── StatusBanner ────────────────────────────────────────────────────────────
export function StatusBanner({
  type = 'info',
  msg,
}: {
  type?: 'success' | 'info' | 'warning' | 'error';
  msg: string;
}) {
  const map: Record<string, { bg: string; bd: string; c: string; i: string }> = {
    success: { bg: 'rgba(22,163,74,0.2)', bd: 'rgba(134,239,172,0.4)', c: SA.success, i: '✓' },
    error: { bg: 'rgba(220,38,38,0.2)', bd: 'rgba(252,165,165,0.4)', c: SA.danger, i: '✕' },
    info: { bg: 'rgba(95,37,159,0.25)', bd: 'rgba(176,127,223,0.35)', c: SA.purplePale, i: 'ℹ' },
    warning: { bg: 'rgba(217,119,6,0.2)', bd: 'rgba(252,211,77,0.4)', c: SA.warn, i: '⚠' },
  };
  const s = map[type] || map.info;
  return (
    <View style={{
      backgroundColor: s.bg, borderColor: s.bd, borderWidth: 1,
      borderRadius: 10, padding: 10,
      flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 8,
    }}>
      <Text style={{ fontSize: 13, color: s.c, fontFamily: SA.fontBold }}>{s.i}</Text>
      <Text style={{ fontSize: 13, color: s.c, fontFamily: SA.fontMedium, flex: 1 }}>{msg}</Text>
    </View>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <Text style={{ fontSize: 38 }}>{icon}</Text>
      <Text style={{ fontSize: 16, color: SA.white, fontFamily: SA.fontBold, marginTop: 12 }}>{title}</Text>
      {sub && (
        <Text style={{ fontSize: 13, color: SA.textFaint, fontFamily: SA.font, marginTop: 4, textAlign: 'center', maxWidth: 320 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export type NavItem = {
  id: string;
  Icon: LucideIcon;        // animated lucide icon (animate-ui style)
  label: string;
  color?: string;          // accent color used on hover/active states
};

// Per-item animated icon — scales up + tints on hover, "pulse" when active
function AnimatedNavIcon({
  Icon, color = '#A78BFA', size, active, hovered,
}: {
  Icon: LucideIcon; color?: string; size: number;
  active: boolean; hovered: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1.12 : (hovered ? 1.18 : 1),
        useNativeDriver: true, friction: 5, tension: 200,
      }),
      Animated.timing(rotate, {
        toValue: hovered ? 1 : 0,
        duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, [active, hovered]);

  const rotateInterp = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
  const tint = active ? color : (hovered ? color : 'rgba(255,255,255,0.65)');

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: rotateInterp }] }}>
      <Icon size={size} color={tint} strokeWidth={active ? 2.4 : 2} />
    </Animated.View>
  );
}

export function Sidebar({
  navItems,
  activeId,
  onNav,
  brandSubtitle,
  bgColor = SA.sideStudent,
  railColor = SA.railStudent,
  user,
  onLogout,
  collapsed = false,
  onToggleCollapsed,
}: {
  navItems: NavItem[];
  activeId: string;
  onNav: (id: string) => void;
  brandSubtitle: string;
  bgColor?: string;
  railColor?: string;
  user?: { initials: string; primary: string; secondary: string; gradient?: readonly [string, string] };
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const w = collapsed ? 72 : 220;
  return (
    <View style={[styles.sidebar, { backgroundColor: bgColor, width: w }]}>
      {/* Brand + Toggle */}
      <View style={[styles.sidebarBrand, collapsed && { paddingHorizontal: 12, alignItems: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <ShieldLogo size={26} />
          {!collapsed && (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 14 }}>Student Alumni</Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>{brandSubtitle}</Text>
            </View>
          )}
        </View>
        {/* Collapse toggle */}
        {onToggleCollapsed && (
          <Pressable
            onPress={onToggleCollapsed}
            testID="sidebar-toggle"
            style={({ hovered }: any) => [
              styles.sidebarToggle,
              collapsed && { position: 'relative', top: 0, right: 0, marginTop: 8, alignSelf: 'center' },
              hovered && { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <Text style={{ color: SA.white, fontSize: 14, fontFamily: SA.fontBold }}>
              {collapsed ? '›' : '‹'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Nav */}
      <View style={{ flex: 1, padding: collapsed ? 6 : 10, gap: 2 }}>
        {navItems.map((n) => {
          const active = n.id === activeId;
          return (
            <Pressable
              key={n.id}
              onPress={() => onNav(n.id)}
              testID={`nav-${n.id}`}
              style={({ hovered }: any) => [
                styles.navItem,
                collapsed && { justifyContent: 'center', paddingHorizontal: 8 },
                active && { backgroundColor: 'rgba(255,255,255,0.10)' },
                hovered && !active && { backgroundColor: 'rgba(255,255,255,0.05)' },
              ]}
            >
              {({ hovered }: any) => (
                <>
                  <AnimatedNavIcon
                    Icon={n.Icon}
                    color={n.color || '#A78BFA'}
                    size={collapsed ? 20 : 17}
                    active={active}
                    hovered={!!hovered}
                  />
                  {!collapsed && (
                    <Text
                      style={{
                        fontSize: 13,
                        color: active ? SA.white : SA.textFaint,
                        fontFamily: active ? SA.fontBold : SA.fontMedium,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {n.label}
                    </Text>
                  )}
                  {!collapsed && active && <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: railColor }} />}
                </>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* User */}
      {user && (
        <View style={{ paddingHorizontal: collapsed ? 6 : 10 }}>
          <View style={[styles.sidebarUser, collapsed && { padding: 6, justifyContent: 'center' }]}>
            <Avatar initials={user.initials} size={collapsed ? 28 : 32} gradient={user.gradient} />
            {!collapsed && (
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12, color: SA.white, fontFamily: SA.fontBold }} numberOfLines={1}>
                  {user.primary}
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }} numberOfLines={1}>
                  {user.secondary}
                </Text>
              </View>
            )}
          </View>
          {!collapsed && onLogout && (
            <Pressable onPress={onLogout} style={{ padding: 12, marginTop: 4 }} testID="nav-logout">
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: SA.fontMedium }}>
                ← Sign out
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.pageSub}>{subtitle}</Text>}
      </View>
      {rightSlot && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{rightSlot}</View>}
    </View>
  );
}

// ─── KPI tile ────────────────────────────────────────────────────────────────
export function KpiTile({
  emoji,
  label,
  value,
  note,
  noteColor = SA.success,
}: {
  emoji: string;
  label: string;
  value: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <GlassCard pad={18} style={{ flex: 1, minWidth: 180 }}>
      <Text style={{ fontSize: 22, marginBottom: 10 }}>{emoji}</Text>
      <Text style={{
        fontSize: 11, color: SA.textFaint, fontFamily: SA.fontSemi,
        letterSpacing: 0.4, marginBottom: 4,
      }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 26, color: SA.white, fontFamily: SA.fontBold, letterSpacing: -0.4 }}>
        {value}
      </Text>
      {note && (
        <Text style={{ fontSize: 11, color: noteColor, fontFamily: SA.fontSemi, marginTop: 5 }}>
          {note}
        </Text>
      )}
    </GlassCard>
  );
}

// ─── PrimaryButton (white pill on purple bg) ────────────────────────────────
export function PrimaryButton({ label, onPress, testID }: { label: string; onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ hovered }: any) => [
        styles.primaryBtn,
        hovered && { transform: [{ translateY: -1 }] },
      ]}
    >
      <Text style={{ color: SA.purple, fontFamily: SA.fontBold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// ─── SecondaryButton (glass pill) ───────────────────────────────────────────
export function SecondaryButton({ label, onPress, testID }: { label: string; onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ hovered }: any) => [
        styles.secondaryBtn,
        hovered && { backgroundColor: 'rgba(255,255,255,0.15)' },
      ]}
    >
      <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// ─── BellIcon (glass square + badge) ─────────────────────────────────────────
export function BellIcon({ count, onPress }: { count?: number; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.bellWrap,
        hovered && { backgroundColor: 'rgba(255,255,255,0.14)' },
      ]}
      testID="platform-bell"
    >
      <Text style={{ fontSize: 18 }}>🔔</Text>
      <Badge count={count || 0} />
    </Pressable>
  );
}

// ─── Section title ──────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{
      fontSize: 12,
      color: SA.textFaint,
      fontFamily: SA.fontBold,
      letterSpacing: 1,
      marginBottom: 14,
    }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: SA.glass,
    borderColor: SA.border,
    borderWidth: 1,
    borderRadius: 16,
    ...({ backdropFilter: 'blur(20px)', transitionDuration: '180ms', transitionProperty: 'transform, background-color, border-color, box-shadow' } as any),
  },
  glassHover: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(176,127,223,0.36)',
    transform: [{ translateY: -2 }],
    boxShadow: '0px 8px 24px rgba(176,127,223,0.18)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E05C5C',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: SA.white, fontFamily: SA.fontBold, fontSize: 10 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: SA.white,
    fontSize: 14,
    fontFamily: SA.font,
    ...({ outlineStyle: 'none' } as any),
  },

  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 },
  progressFill: { height: '100%', borderRadius: 3 },

  sidebar: {
    width: 220,
    flexShrink: 0,
    borderRightColor: SA.borderSoft,
    borderRightWidth: 1,
    flexDirection: 'column',
    paddingBottom: 24,
    height: '100%' as any,
    ...({ backdropFilter: 'blur(20px)' } as any),
  },
  sidebarBrand: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    position: 'relative',
  },
  sidebarToggle: {
    position: 'absolute',
    top: 18,
    right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  sidebarUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16,
  },
  pageTitle: {
    fontSize: 26,
    color: SA.white,
    fontFamily: SA.fontBold,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 14,
    color: SA.textFaint,
    fontFamily: SA.font,
    marginTop: 4,
  },

  primaryBtn: {
    backgroundColor: SA.white,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
});
