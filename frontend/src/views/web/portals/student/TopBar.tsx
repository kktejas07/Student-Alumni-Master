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
import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform, Image } from 'react-native';
import { Bell, Search } from './iconShims';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STUDENT } from './data';
import { Av } from './atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP, RADII, FONT_FAMILY } from '@/src/theme/apple';
import { GlassTopbar } from '@/src/motion/apple/components';
import { FadeInView, PressScale, PulseDot } from './motion';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TopBar({ scrolled = false }: { scrolled?: boolean } = {}) {
  const { theme, isDark, mode, setMode } = useTheme();
  const bp = useBreakpoint();
  const user = useAuthStore((u) => u.user) as any;
  const fullName: string = (user?.full_name
    || `${user?.first_name || ''} ${user?.last_name || ''}`).trim()
    || STUDENT.name;
  const firstName: string = fullName.split(' ')[0] || STUDENT.name.split(' ')[0];
  const initials: string = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || STUDENT.initials).toUpperCase();
  const photo: string | undefined = user?.photo_data || user?.face_image_base64;

  const cycleTheme = () => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  };

  // Hide search box on tablets to save space; phones already hide sidebar
  const showSearch = bp.atLeast('lg');

  return (
    <GlassTopbar scrolled={scrolled} style={{ height: bp.isPhone ? 56 : 64, paddingHorizontal: bp.isPhone ? SP.base : SP.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md, flex: 1 }}>
        <FadeInView delay={20} style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: bp.isPhone ? 15 : 17, fontWeight: '700', color: theme.text, letterSpacing: -0.4 }}>
            {greeting()}, {firstName} 👋
          </Text>
          {!bp.isPhone && (
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '500', color: theme.textSec, marginTop: 2 }}>
              Here's your personalised dashboard for today
            </Text>
          )}
        </FadeInView>

        {showSearch && (
          <FadeInView delay={120}>
            <View style={[s.searchBox, { backgroundColor: theme.bgInset, borderColor: theme.hairline }]}>
              <Search size={14} color={theme.textTer} />
              <TextInput
                placeholder="Search anything…"
                placeholderTextColor={theme.textTer}
                style={[s.searchInput, { color: theme.text }]}
                accessibilityLabel="Search the dashboard"
                accessibilityHint="Type to find courses, mentors, jobs, deals, and more"
                // @ts-ignore — RN-Web accepts these
                aria-label="Search the dashboard"
              />
            </View>
          </FadeInView>
        )}

        {/* Theme toggle — sun / moon / auto */}
        <FadeInView delay={160}>
          <PressScale
            style={[s.iconBtn, { backgroundColor: theme.bgInset, borderColor: theme.hairline }]}
            onPress={cycleTheme}
            accessibilityLabel={`Theme: ${mode}. Tap to cycle.`}
            accessibilityHint="Switches between light, dark, and automatic"
          >
            <MaterialCommunityIcons
              name={mode === 'light' ? 'weather-sunny' : mode === 'dark' ? 'weather-night' : 'theme-light-dark'}
              size={16}
              color={theme.text}
            />
          </PressScale>
        </FadeInView>

        <FadeInView delay={180}>
          <PressScale
            style={[s.iconBtn, { backgroundColor: theme.bgInset, borderColor: theme.hairline }]}
            onPress={() => {}}
            accessibilityLabel="Notifications"
            accessibilityHint="Opens the notifications panel"
          >
            <Bell size={16} color={theme.primary} />
            <View style={[s.bellDotWrap, { backgroundColor: theme.bgElevated }]}>
              <PulseDot size={7} color={theme.red} />
            </View>
          </PressScale>
        </FadeInView>

        <FadeInView delay={220}>
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          ) : (
            <Av initials={initials} size={36} color={theme.primary} />
          )}
        </FadeInView>
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
