// @ts-nocheck
/**
 * Student Portal — top bar. Migrated to NativeWind className.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Bell, Search } from './iconShims';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { Av } from './atoms';
import { api } from '@/src/models/services/api';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP, RADII } from '@/src/theme/apple';
import { GlassTopbar } from '@/src/motion/apple/components';
import { FadeInView, PressScale, PulseDot } from './motion';
import { PALETTE, TYPO } from './tokens';
import { StudentPortalNavContext } from './StudentPortalNavContext';
import { trackClick, logger as analyticsLogger } from '@/src/analytics';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

import { NAV } from './Sidebar';

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
  const portalNav = React.useContext(StudentPortalNavContext);
  const [q, setQ] = React.useState(portalNav?.searchQuery || '');

  useEffect(() => { setQ(portalNav?.searchQuery || ''); }, [portalNav?.searchQuery]);

  const handleSearch = () => {
    if (q.trim() && portalNav) {
      portalNav.setSearchQuery(q.trim());
      if (activeView !== 'network' && activeView !== 'internships') portalNav.navigate('internships');
    }
  };

  const fullName: string = displayName(user);
  const firstName: string = fullName.split(/[\s@]/)[0] || 'there';
  const initials: string = displayInitials(user);
  const photo: string | undefined = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;

  const onAvatarPressHandler = () => {
    if (onAvatarPress) onAvatarPress();
    else if (portalNav) portalNav.navigate('profile');
    else router.push('/(tabs)/profile');
  };

  const cycleTheme = () => { setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light'); };
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { api.notifications().then(res => setUnreadCount(res.unread || 0)).catch(console.error); }, []);

  const showSearch = bp.atLeast('lg');

  return (
    <GlassTopbar scrolled={scrolled} style={{
      height: bp.isPhone ? 56 : 64,
      paddingHorizontal: bp.isPhone ? SP.base : SP.lg,
      backgroundColor: 'rgba(10,15,30,0.80)',
      borderBottomColor: PALETTE.glassBorder,
    } as any}>
      <View className="flex-row items-center flex-1" style={{ gap: SP.md }}>
        <FadeInView delay={20} className="flex-1 min-w-0">
          <Text className="font-display tracking-tight" style={{ fontSize: bp.isPhone ? 16 : 18, color: PALETTE.text }}>
            {activeView === 'dashboard' ? `${greeting()}, ${firstName} 👋` : (NAV.find((n) => n.id === activeView)?.label || activeView)}
          </Text>
          {!bp.isPhone && activeView === 'dashboard' && (
            <Text className="font-body text-xs mt-0.5" style={{ color: PALETTE.muted }}>
              Here's your personalised dashboard for today
            </Text>
          )}
        </FadeInView>

        {showSearch && (
          <FadeInView delay={120}>
            <View className="flex-row items-center h-9 px-4 rounded-[10px] border" style={{ width: 240, backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder, gap: SP.sm }}>
              <Pressable
                onPress={() => { trackClick('topbar_search_submit_icon', { query: q }); handleSearch(); }}
                style={Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
                accessibilityLabel="Execute dashboard search"
                testID="topbar-search-submit-btn"
                accessibilityRole="button"
              >
                <Search size={14} color={q.trim() ? PALETTE.text : PALETTE.dim} />
              </Pressable>
              <TextInput
                value={q}
                onChangeText={(text) => { setQ(text); }}
                onSubmitEditing={() => { trackClick('topbar_search_submit_enter', { query: q }); handleSearch(); }}
                placeholder="Search anything…"
                placeholderTextColor={PALETTE.dim}
                className="flex-1 font-body text-[13px]"
                style={{ color: PALETTE.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) }}
                accessibilityLabel="Search the dashboard"
                nativeID="topbar-global-search-input"
                testID="topbar-global-search-input"
              />
            </View>
          </FadeInView>
        )}

        <FadeInView delay={160}>
          <PressScale
            className="w-9 h-9 rounded-[10px] items-center justify-center border"
            style={{ backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
            onPress={() => { trackClick('topbar_theme_toggle', { mode }); cycleTheme(); }}
            accessibilityLabel={`Theme: ${mode}. Tap to cycle.`}
            testID="topbar-theme-toggle-btn"
          >
            <ThemeMorphIcon mode={mode} color={PALETTE.text} />
          </PressScale>
        </FadeInView>

        <FadeInView delay={180}>
          <PressScale
            className="w-9 h-9 rounded-[10px] items-center justify-center border"
            style={{ backgroundColor: PALETTE.glassSoft, borderColor: PALETTE.glassBorder, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
            onPress={() => { trackClick('topbar_bell_notifications_click'); if (onBellPress) onBellPress(); else router.push('/notifications'); }}
            accessibilityLabel="Notifications"
            testID="topbar-notifications-btn"
          >
            <Bell size={16} color={PALETTE.violet} />
            {unreadCount > 0 && (
              <View className="absolute top-[7px] right-[7px] rounded-[6px] p-[1.5px]" style={{ backgroundColor: PALETTE.bg1 }}>
                <PulseDot size={7} color={PALETTE.rose} />
              </View>
            )}
          </PressScale>
        </FadeInView>

        <FadeInView delay={200}>
          <PressScale
            onPress={() => { trackClick('topbar_avatar_profile_click'); onAvatarPressHandler(); }}
            accessibilityLabel="View Profile Settings"
            testID="topbar-user-avatar-btn"
          >
            <Av initials={initials} size={36} color={theme.primary} photo={photo} />
          </PressScale>
        </FadeInView>

        <HelpMenu portal="student" />
      </View>
    </GlassTopbar>
  );
}

function ThemeMorphIcon({ mode, color }: { mode: 'light' | 'dark' | 'system'; color: string }) {
  const target = mode === 'light' ? 0 : mode === 'dark' ? 1 : 0.5;
  const v = useSharedValue(target);
  useEffect(() => { v.value = withSpring(target, { damping: 16, stiffness: 220 }); }, [target, v]);

  const aSun = useAnimatedStyle(() => ({
    opacity: 1 - v.value,
    transform: [{ rotate: `${v.value * -90}deg` }, { scale: 1 - v.value * 0.2 }],
  }));
  const aMoon = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ rotate: `${(1 - v.value) * 90}deg` }, { scale: 0.8 + v.value * 0.2 }],
  }));

  return (
    <View className="w-4 h-4 items-center justify-center">
      <Animated.View className="absolute" style={aSun}>
        <MaterialCommunityIcons name="weather-sunny" size={16} color={color} />
      </Animated.View>
      <Animated.View className="absolute" style={aMoon}>
        <MaterialCommunityIcons name="weather-night" size={16} color={color} />
      </Animated.View>
    </View>
  );
}
