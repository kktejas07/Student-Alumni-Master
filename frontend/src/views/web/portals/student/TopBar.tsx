// @ts-nocheck
/**
 * Student Portal — top bar (Apple HIG migration, Slice 2A).
 *
 * Theme-aware via useTheme(). Now uses GlassTopbar primitive — gains a
 * blurred translucent overlay once the dashboard scrolls past 8px.
 *
 * New: theme toggle pill (sun/moon morph) on the right side. Single tap
 * cycles light → dark → system → light.
 *
 * Responsive heights handled by GlassTopbar (44 phone / 52 tablet+).
 *
 * Accepts optional `scrolled` prop from the portal shell so the glass
 * blur can react to scroll without re-rendering the whole tree.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Bell, Search, Menu, X } from './iconShims';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { Av } from './atoms';
import { api } from '@/src/models/services/api';
import { trackClick, logger as analyticsLogger } from '@/src/analytics';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP, RADII, FONT_FAMILY } from '@/src/theme/apple';
import { GlassTopbar } from '@/src/motion/apple/components';
import { FadeInView, PressScale, PulseDot } from './motion';
import { PALETTE, TYPO } from './tokens';
import { StudentPortalNavContext } from './StudentPortalNavContext';
import { StudentNavId, NAV } from './Sidebar';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TopBar({
  scrolled = false,
  activeView = 'dashboard',
  onAvatarPress,
  onBellPress,
}: {
  scrolled?: boolean;
  activeView?: string;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
} = {}) {
  const router = useRouter();
  const { theme, isDark, mode, setMode } = useTheme();
  const bp = useBreakpoint();
  const user = useAuthStore((u) => u.user) as any;
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const portalNav = React.useContext(StudentPortalNavContext);
  const [q, setQ] = React.useState(portalNav?.searchQuery || '');

  useEffect(() => {
    setQ(portalNav?.searchQuery || '');
  }, [portalNav?.searchQuery]);

  const handleSearch = () => {
    if (q.trim() && portalNav) {
      portalNav.setSearchQuery(q.trim());
      if (activeView !== 'network' && activeView !== 'internships') {
        portalNav.navigate('internships');
      }
    }
  };

  const fullName: string = displayName(user);
  const firstName: string = fullName.split(/[\s@]/)[0] || 'there';
  const initials: string = displayInitials(user);
  const photo: string | undefined = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;

  const onAvatarPressHandler = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else if (onNav) {
      onNav('profile');
    } else {
      router.push('/(tabs)/profile');
    }
  };

  const cycleTheme = () => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  };
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifs = () => {
      api.notifications()
        .then(res => setUnreadCount(res.unread || 0))
        .catch(console.error);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Hide search box on tablets to save space; phones already hide sidebar
  const showSearch = bp.atLeast('lg');

  return (
    <GlassTopbar scrolled={scrolled} style={{
      height: bp.isPhone ? 56 : 64,
      paddingHorizontal: bp.isPhone ? SP.base : SP.lg,
      backgroundColor: PALETTE.glassSoft,
      borderBottomColor: PALETTE.glassBorder,
      // @ts-expect-error web-only
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, flex: 1 }}>
        {/* Mobile hamburger menu */}
        {bp.isPhone && (
          <FadeInView delay={10}>
            <PressScale
              style={[s.iconBtn, { backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder }]}
              onPress={() => setShowMobileMenu(!showMobileMenu)}
              accessibilityLabel="Open menu"
              accessibilityHint="Opens navigation menu"
            >
              {showMobileMenu ? <X size={18} color={PALETTE.text} /> : <Menu size={18} color={PALETTE.text} />}
            </PressScale>
          </FadeInView>
        )}

        <FadeInView delay={20} style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: TYPO.display700, fontSize: bp.isPhone ? 16 : 18, color: PALETTE.text, letterSpacing: -0.5 }}>
            {activeView === 'dashboard'
              ? `${greeting()}, ${firstName} `
              : (NAV.find((n) => n.id === activeView)?.label || activeView)}
          </Text>
          {!bp.isPhone && activeView === 'dashboard' && (
            <Text style={{ fontFamily: TYPO.body500, fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>
              Here's your personalised dashboard for today
            </Text>
          )}
        </FadeInView>

        {showSearch && (
          <FadeInView delay={120}>
            <View style={[s.searchBox, { backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder }]}>
              <Pressable
                onPress={() => {
                  trackClick('topbar_search_submit_icon', { query: q });
                  analyticsLogger.debug('[TopBar DEBUG] Search icon clicked', { query: q });
                  handleSearch();
                }}
                style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}
                accessibilityLabel="Execute dashboard search"
                accessibilityHint="Executes global search query across platform"
                testID="topbar-search-submit-btn"
                accessibilityRole="button"
              >
                <Search size={14} color={q.trim() ? PALETTE.text : PALETTE.dim} />
              </Pressable>
              <TextInput
                value={q}
                onChangeText={(text) => {
                  setQ(text);
                  analyticsLogger.debug('[TopBar DEBUG] Global search query typing', { query: text });
                }}
                onSubmitEditing={() => {
                  trackClick('topbar_search_submit_enter', { query: q });
                  handleSearch();
                }}
                placeholder="Search anything…"
                placeholderTextColor={PALETTE.dim}
                style={[s.searchInput, { color: PALETTE.text, fontFamily: TYPO.body500 }]}
                accessibilityLabel="Search the dashboard"
                accessibilityHint="Type to find courses, mentors, jobs, deals, and more"
                nativeID="topbar-global-search-input"
                testID="topbar-global-search-input"
                // @ts-ignore — RN-Web accepts these
                aria-label="Search the dashboard"
              />
            </View>
          </FadeInView>
        )}

        {/* Theme toggle — sun ↔ moon morph (Apple-style rotation + scale) */}
        <FadeInView delay={160}>
          <PressScale
            style={[s.iconBtn, { backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder }]}
            onPress={() => {
              trackClick('topbar_theme_toggle', { mode });
              analyticsLogger.debug('[TopBar DEBUG] Theme toggle clicked', { currentMode: mode });
              cycleTheme();
            }}
            accessibilityLabel={`Theme: ${mode}. Tap to cycle.`}
            accessibilityHint="Switches between light, dark, and automatic"
            testID="topbar-theme-toggle-btn"
            accessibilityRole="button"
          >
            <ThemeMorphIcon mode={mode} color={PALETTE.text} />
          </PressScale>
        </FadeInView>

        <FadeInView delay={180}>
          <PressScale
            style={[s.iconBtn, { backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder }]}
            onPress={() => {
              trackClick('topbar_bell_notifications_click');
              analyticsLogger.debug('[TopBar DEBUG] Bell notifications clicked');
              if (onBellPress) onBellPress();
              else router.push('/notifications');
            }}
            accessibilityLabel="Notifications"
            accessibilityHint="Opens the notifications panel"
            testID="topbar-notifications-btn"
            accessibilityRole="button"
          >
            <Bell size={16} color={PALETTE.violet} />
            {unreadCount > 0 && (
              <View style={[s.bellDotWrap, { backgroundColor: PALETTE.bg1 }]}>
                <PulseDot size={7} color={PALETTE.rose} />
              </View>
            )}
          </PressScale>
        </FadeInView>

        <FadeInView delay={200}>
          <PressScale
            onPress={() => {
              trackClick('topbar_avatar_profile_click');
              analyticsLogger.debug('[TopBar DEBUG] Avatar profile clicked');
              onAvatarPressHandler();
            }}
            accessibilityLabel="View Profile Settings"
            accessibilityHint="Opens user profile and account settings"
            testID="topbar-user-avatar-btn"
            accessibilityRole="button"
          >
            <Av initials={initials} size={36} color={theme.primary} photo={photo} />
          </PressScale>
        </FadeInView>

        <HelpMenu portal="student" />
      </View>

      {/* Mobile menu overlay */}
      {showMobileMenu && bp.isPhone && (
        <View style={s.mobileMenuOverlay}>
          <View style={s.mobileMenuContent}>
            <View style={s.mobileMenuHeader}>
              <Text style={s.mobileMenuTitle}>Navigation</Text>
              <Pressable onPress={() => setShowMobileMenu(false)} style={s.mobileMenuClose}>
                <X size={20} color={PALETTE.text} />
              </Pressable>
            </View>
            <View style={s.mobileMenuItems}>
              {NAV.filter(n => !['financial', 'deals', 'higher-ed', 'rentals', 'courses'].includes(n.id)).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    router.push(item.id === 'dashboard' ? '/student-portal' : `/student-portal?tab=${item.id}`);
                    setShowMobileMenu(false);
                  }}
                  style={[s.mobileMenuItem, activeView === item.id && s.mobileMenuItemActive]}
                >
                  <item.Icon size={18} color={activeView === item.id ? '#A78BFA' : 'rgba(255,255,255,0.6)'} />
                  <Text style={[s.mobileMenuLabel, activeView === item.id && s.mobileMenuLabelActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}
    </GlassTopbar>
  );
}

const s = StyleSheet.create({
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: SP.sm,
    width: 240, height: 36, paddingHorizontal: SP.md,
    borderRadius: RADII.md, borderWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? ({ transitionDuration: '180ms' } as any) : {}),
  },
  searchInput: { flex: 1, fontFamily: FONT_FAMILY, fontWeight: '500', fontSize: 13, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  iconBtn: {
    width: 36, height: 36, borderRadius: RADII.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  bellDotWrap: {
    position: 'absolute', top: 7, right: 7,
    borderRadius: 6, padding: 1.5,
  },
  mobileMenuOverlay: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
  },
  mobileMenuContent: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mobileMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  mobileMenuTitle: {
    fontFamily: TYPO.bold,
    fontSize: 16,
    color: '#F4F5FB',
  },
  mobileMenuClose: {
    padding: 8,
  },
  mobileMenuItems: {
    gap: 4,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  mobileMenuItemActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  mobileMenuLabel: {
    fontFamily: TYPO.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  mobileMenuLabelActive: {
    color: '#A78BFA',
    fontFamily: TYPO.bold,
  },
});

/* ─── ThemeMorphIcon — animated sun ↔ moon morph ──────────────────── */
function ThemeMorphIcon({ mode, color }: { mode: 'light' | 'dark' | 'system'; color: string }) {
  const target = mode === 'light' ? 0 : mode === 'dark' ? 1 : 0.5;
  const v = useSharedValue(target);
  useEffect(() => {
    v.value = withSpring(target, { damping: 16, stiffness: 220 });
  }, [target, v]);

  // Sun visible when v ≈ 0 (light), moon when v ≈ 1 (dark), both half-fade for system
  const aSun = useAnimatedStyle(() => ({
    opacity: 1 - v.value,
    transform: [{ rotate: `${v.value * -90}deg` }, { scale: 1 - v.value * 0.2 }],
  }));
  const aMoon = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ rotate: `${(1 - v.value) * 90}deg` }, { scale: 0.8 + v.value * 0.2 }],
  }));

  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute' }, aSun]}>
        <MaterialCommunityIcons name="weather-sunny" size={16} color={color} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, aMoon]}>
        <MaterialCommunityIcons name="weather-night" size={16} color={color} />
      </Animated.View>
    </View>
  );
}
