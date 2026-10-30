/**
 * TopBar — the one chrome bar for every portal.
 *
 * Greeting or page title · search · theme toggle · bell (live unread) ·
 * help · avatar. On phones it shows a hamburger that opens a nav sheet.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Bell, Menu, X, Sun, Moon, MonitorSmartphone } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { api } from '@/src/models/services/api';
import { HelpMenu } from '@/src/views/web/help/HelpMenu';
import { usePortalTheme, RADIUS, SPACE, web } from '../theme';
import { Avatar, IconButton, SearchField, Tooltip, Txt } from '../primitives';
import { FadeInView } from '../motion';
import { isGroup, type PortalConfig, type PortalProfile } from './types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Polls /notifications for the unread count; shared by every portal bar. */
export function useUnreadCount(enabled = true, intervalMs = 20000) {
  const [unread, setUnread] = useState(0);
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!enabled || !user) return;
    let on = true;
    const tick = () => api.notifications().then((r: any) => { if (on) setUnread(r?.unread || 0); }).catch(() => { });
    tick();
    const id = setInterval(tick, intervalMs);
    return () => { on = false; clearInterval(id); };
  }, [enabled, intervalMs, user]);
  return unread;
}

function ThemeIcon({ mode, color }: { mode: 'light' | 'dark' | 'system'; color: string }) {
  const target = mode === 'light' ? 0 : mode === 'dark' ? 1 : 0.5;
  const v = useSharedValue(target);
  useEffect(() => { v.value = withSpring(target, { damping: 16, stiffness: 220 }); }, [target, v]);
  const sun = useAnimatedStyle(() => ({ opacity: 1 - v.value, transform: [{ rotate: `${v.value * -90}deg` }] }));
  const moon = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ rotate: `${(1 - v.value) * 90}deg` }] }));
  if (mode === 'system') return <MonitorSmartphone size={16} color={color} />;
  return (
    <View style={{ width: 16, height: 16 }}>
      <Animated.View style={[{ position: 'absolute' }, sun]}><Sun size={16} color={color} /></Animated.View>
      <Animated.View style={[{ position: 'absolute' }, moon]}><Moon size={16} color={color} /></Animated.View>
    </View>
  );
}

export function TopBar({
  config, active, title, onNav, scrolled, search, unread, onBellPress, bellActive, counts, profile: profileOverride,
}: {
  config: PortalConfig; active: string; title?: string; onNav: (id: string) => void; scrolled?: boolean; profile?: PortalProfile;
  search?: { value: string; onChange: (v: string) => void; onSubmit: () => void };
  unread?: number; onBellPress?: () => void; bellActive?: boolean; counts?: Record<string, number>;
}) {
  const t = usePortalTheme();
  const bp = useBreakpoint();
  const { mode, setMode, isDark } = useTheme();
  const user = useAuthStore((u) => u.user) as any;
  const photoOverride = useAuthStore((s) => s.photoOverride);
  const polled = useUnreadCount(unread == null);
  const badge = unread ?? polled;
  const [menu, setMenu] = useState(false);
  const [localQ, setLocalQ] = useState('');
  const q = search ?? { value: localQ, onChange: setLocalQ, onSubmit: () => { } };

  const profile = profileOverride || config.profile(user);
  const photo = photoOverride || profile.photo || user?.photo_data || user?.face_image_base64;
  const firstName = (profile.name || '').split(/[\s@]/)[0] || 'there';
  const onGreeting = config.topbar?.greetingTab ? active === config.topbar.greetingTab : false;
  const tb = config.topbar || {};
  const showSearch = tb.search !== false && bp.atLeast('lg');
  const h = bp.isPhone ? 56 : 64;

  const flatNav = config.nav.flatMap((e) => isGroup(e) ? [] : [e]).filter((n) => !n.hideOnMobile);

  return (
    <View
      style={[
        {
          height: h, paddingHorizontal: bp.isPhone ? SPACE.base : SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
          borderBottomWidth: 1, borderBottomColor: scrolled ? t.border : 'transparent', backgroundColor: scrolled ? t.chrome : 'transparent', zIndex: 20
        },
        web({ position: 'sticky', top: 0, backdropFilter: scrolled ? 'blur(18px) saturate(160%)' : undefined, WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(160%)' : undefined, transition: 'background-color 180ms ease' }),
      ]}
    >
      {bp.isPhone && (
        <IconButton Icon={menu ? X : Menu} onPress={() => setMenu((m) => !m)} accessibilityLabel={menu ? 'Close menu' : 'Open menu'} testID="topbar-menu-btn" />
      )}

      <FadeInView delay={20} style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: t.typo.display700, fontSize: bp.isPhone ? 16 : 18, color: t.text, letterSpacing: -0.4 }}>
          {onGreeting ? `${greeting()}, ${firstName}` : (title || active)}
        </Text>
        {!bp.isPhone && onGreeting && (
          <Text numberOfLines={1} style={{ fontFamily: t.typo.body500, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
            {tb.greetingSub || new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        )}
      </FadeInView>

      {showSearch && (
        <FadeInView delay={100}>
          <SearchField
            value={q.value} onChangeText={q.onChange} onSubmit={q.onSubmit}
            placeholder={(tb.search && tb.search.placeholder) || 'Search anything…'}
            width={bp.atLeast('xl') ? 280 : 220}
            nativeID="topbar-global-search-input" testID="topbar-global-search-input"
          />
        </FadeInView>
      )}

      {tb.extra}

      {tb.themeToggle !== false && !config.darkOnly && (
        <FadeInView delay={140}>
          <Tooltip content={(t.isDark ?? isDark) ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <IconButton
              Icon={() => <ThemeIcon mode={mode} color={t.textMuted} />}
              onPress={() => setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')}
              accessibilityLabel={`Theme: ${mode}. Tap to cycle.`} testID="topbar-theme-toggle-btn"
            />
          </Tooltip>
        </FadeInView>
      )}

      {tb.bell !== false && (
        <FadeInView delay={160}>
          <Tooltip content="Notifications">
            <IconButton Icon={Bell} badge={badge} active={bellActive} onPress={onBellPress} accessibilityLabel="Notifications" testID="topbar-notifications-btn" color={t.accent} />
          </Tooltip>
        </FadeInView>
      )}

      {config.tour && <HelpMenu portal={config.tour} />}

      <FadeInView delay={200}>
        <Tooltip content="Profile" align="right">
          <Pressable onPress={() => onNav(config.profileTab)} accessibilityRole="button" accessibilityLabel="View profile settings" testID="topbar-user-avatar-btn" style={web({ cursor: 'pointer' })}>
            <Avatar name={profile.name} initials={profile.initials} photo={photo} size={36} />
          </Pressable>
        </Tooltip>
      </FadeInView>

      {/* Phone nav sheet */}
      {menu && bp.isPhone && (
        <View style={[{ position: 'absolute', top: h, left: 0, right: 0, zIndex: 1000, backgroundColor: t.scrim }, web({ position: 'fixed', bottom: 0 })]}>
          <Pressable onPress={() => setMenu(false)} style={{ position: 'absolute', inset: 0 } as any} accessibilityLabel="Close menu" />
          <ScrollView style={{ maxHeight: '80%', backgroundColor: t.surface, borderBottomLeftRadius: RADIUS.modal, borderBottomRightRadius: RADIUS.modal, borderBottomWidth: 1, borderColor: t.border }} contentContainerStyle={{ padding: SPACE.md, gap: 2 }}>
            <Txt variant="kicker" tone="muted" style={{ paddingHorizontal: 12, paddingVertical: 8 }}>Navigate</Txt>
            {flatNav.map((n) => {
              const on = n.id === active;
              const c = n.countKey ? counts?.[n.countKey] : undefined;
              return (
                <Pressable key={n.id} onPress={() => { onNav(n.id); setMenu(false); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: RADIUS.md, backgroundColor: on ? t.accentSoft : 'transparent' }}>
                  <n.Icon size={18} color={on ? t.accent : t.textMuted} />
                  <Text style={{ flex: 1, fontFamily: on ? t.typo.body700 : t.typo.body500, fontSize: 15, color: on ? t.text : t.textMuted }}>{n.label}</Text>
                  {!!c && <Text style={{ fontFamily: t.typo.body700, fontSize: 11, color: t.textMuted }}>{c}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

