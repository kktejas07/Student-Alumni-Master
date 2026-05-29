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
import React, { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Bell, Search } from './iconShims';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STUDENT } from './data';
import { Av } from './atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP, RADII, FONT_FAMILY } from '@/src/theme/apple';
import { GlassTopbar } from '@/src/motion/apple/components';
import { FadeInView, PressScale, PulseDot } from './motion';
import { PALETTE, TYPO } from './tokens';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

import { Sidebar, StudentNavId } from './Sidebar';

export function TopBar({
  scrolled = false,
  onNav,
  onAvatarPress,
}: {
  scrolled?: boolean;
  onNav?: (id: StudentNavId) => void;
  onAvatarPress?: () => void;
} = {}) {
  const router = useRouter();
  const { theme, isDark, mode, setMode } = useTheme();
  const bp = useBreakpoint();
  const user = useAuthStore((u) => u.user) as any;
  const fullName: string = (user?.full_name
    || `${user?.first_name || ''} ${user?.last_name || ''}`).trim()
    || STUDENT.name;
  const firstName: string = fullName.split(' ')[0] || STUDENT.name.split(' ')[0];
  const initials: string = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || STUDENT.initials).toUpperCase();
  const photo: string | undefined = user?.photo_data || user?.face_image_base64;

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

  // Hide search box on tablets to save space; phones already hide sidebar
  const showSearch = bp.atLeast('lg');

  return (
    <GlassTopbar scrolled={scrolled} style={{
      height: bp.isPhone ? 56 : 64,
      paddingHorizontal: bp.isPhone ? SP.base : SP.lg,
      backgroundColor: 'rgba(10,15,30,0.80)',
      borderBottomColor: PALETTE.glassBorder,
      // @ts-expect-error web-only
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    } as any}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, flex: 1 }}>
        <FadeInView delay={20} style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: TYPO.display700, fontSize: bp.isPhone ? 16 : 18, color: PALETTE.text, letterSpacing: -0.5 }}>
            {greeting()}, {firstName} 👋
          </Text>
          {!bp.isPhone && (
            <Text style={{ fontFamily: TYPO.body500, fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>
              Here's your personalised dashboard for today
            </Text>
          )}
        </FadeInView>

        {showSearch && (
          <FadeInView delay={120}>
            <View style={[s.searchBox, { backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder }]}>
              <Search size={14} color={PALETTE.dim} />
              <TextInput
                placeholder="Search anything…"
                placeholderTextColor={PALETTE.dim}
                style={[s.searchInput, { color: PALETTE.text, fontFamily: TYPO.body500 }]}
                accessibilityLabel="Search the dashboard"
                accessibilityHint="Type to find courses, mentors, jobs, deals, and more"
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
            onPress={cycleTheme}
            accessibilityLabel={`Theme: ${mode}. Tap to cycle.`}
            accessibilityHint="Switches between light, dark, and automatic"
          >
            <ThemeMorphIcon mode={mode} color={PALETTE.text} />
          </PressScale>
        </FadeInView>

        <FadeInView delay={180}>
          <PressScale
            style={[s.iconBtn, { backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder }]}
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
            accessibilityHint="Opens the notifications panel"
          >
            <Bell size={16} color={PALETTE.violet} />
            <View style={[s.bellDotWrap, { backgroundColor: PALETTE.bg1 }]}>
              <PulseDot size={7} color={PALETTE.rose} />
            </View>
          </PressScale>
        </FadeInView>

        <FadeInView delay={200}>
          <PressScale
            onPress={onAvatarPressHandler}
            accessibilityLabel="View Profile Settings"
          >
            <Av initials={initials} size={36} color={theme.primary} photo={photo} />
          </PressScale>
        </FadeInView>

        <HelpMenu portal="student" />
      </View>
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
