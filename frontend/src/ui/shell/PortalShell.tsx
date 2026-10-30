/**
 * PortalShell — the single outer frame for every web portal.
 *
 *   <PortalShell config={STUDENT_PORTAL} active={tab} onNav={go} onLogout={…}>
 *     {active === 'dashboard' && <DashboardView />}
 *   </PortalShell>
 *
 * Owns: background, sidebar, top bar, scroll container, promo banner,
 * route transition, sponsor footer, phone bottom tabs, notifications slot
 * and the AI copilot FAB. Each portal supplies a PortalConfig (nav, brand,
 * profile mapping) and its view switch; nothing else.
 */
import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform, Pressable, Text, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { DashboardFooter } from '@/src/views/web/components/SponsorStrip';
import { PromoBanner } from '@/src/views/web/components/PromoBanner';
import { RouteTransition, AiCopilotFab } from '@/src/views/web/portals/student/glass';
import { EmbeddedShellContext } from '@/src/views/web/FeaturePageShell';
import { useAutoTour } from '@/src/views/web/tour/TourProvider';
import { PortalThemeProvider, usePortalTheme, SPACE, web } from '../theme';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { isGroup, type PortalShellProps } from './types';

export function PortalShell(props: PortalShellProps) {
  return (
    <PortalThemeProvider portal={props.config.portal} darkOnly={props.config.darkOnly}>
      <ShellInner {...props} />
    </PortalThemeProvider>
  );
}

function ShellInner({
  config, active, onNav, onLogout, title, counts, search, unread, notifications, onBellPress,
  children, contentPadding, scrollRef, hideSidebar, plain, profile,
}: PortalShellProps) {
  const t = usePortalTheme();
  const bp = useBreakpoint();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const innerRef = useRef<ScrollView>(null);
  const ref = scrollRef || innerRef;
  useAutoTour(config.tour);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setScrolled(e.nativeEvent.contentOffset.y > 8);
  const padH = contentPadding ?? (bp.isPhone ? SPACE.base : bp.atLeast('xl') ? SPACE.xxl : SPACE.lg);
  const resolvedTitle = title || config.nav.flatMap((e) => isGroup(e) ? (e.children || []) : [e]).find((n) => n.id === active)?.label || active;
  const showPromo = !!config.tour && !(config.promoHiddenOn || []).includes(active);
  const mobileTabs = (config.mobileTabs || []).map((id) => config.nav.flatMap((e) => isGroup(e) ? [] : [e]).find((n) => n.id === id)).filter(Boolean) as any[];

  const bell = () => {
    if (onBellPress) onBellPress();
    else if (notifications) setNotifOpen((o) => !o);
    else router.push('/notifications' as any);
  };

  const content = (
    <>
      {showPromo && <PromoBanner portal={config.tour!} />}
      {plain ? children : <RouteTransition deps={[active]}>{children}</RouteTransition>}
    </>
  );

  return (
    <View style={[s.shell, { backgroundColor: t.bg }]}>
      <LinearGradient pointerEvents="none" colors={t.bgGradient as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject as any} />
      <SAWatermark size={850} top={30} right={-30} opacity={t.isDark ? 0.16 : 0.06} />

      {!hideSidebar && <Sidebar config={config} active={active} onNav={onNav} onLogout={onLogout} counts={counts} profile={profile} />}

      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TopBar
            config={config} active={active} title={resolvedTitle} onNav={onNav} scrolled={scrolled}
            search={search} unread={unread} onBellPress={bell} bellActive={notifOpen} counts={counts} profile={profile}
          />
          <ScrollView
            ref={ref}
            style={[{ flex: 1 }, web({ scrollBehavior: 'smooth' })]}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: padH, paddingTop: SPACE.lg, paddingBottom: bp.isPhone && mobileTabs.length ? 84 : SPACE.lg }}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            <View style={{ flex: 1 }}>
              <EmbeddedShellContext.Provider value={true}>{content}</EmbeddedShellContext.Provider>
            </View>
            {config.tour && <DashboardFooter portal={config.tour} />}
          </ScrollView>
          {config.aiFab && <AiCopilotFab onPress={() => router.push('/agent-k' as any)} />}
        </View>

        {notifOpen && notifications?.(() => setNotifOpen(false))}
      </View>

      {bp.isPhone && mobileTabs.length > 0 && (
        <View style={[s.mobileNav, { borderTopColor: t.border, backgroundColor: t.chrome }]} accessibilityRole={Platform.OS === 'web' ? ('tablist' as any) : undefined}>
          {mobileTabs.map((n) => {
            const on = n.id === active;
            return (
              <Pressable key={n.id} onPress={() => onNav(n.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={n.label}
                style={[s.mobileItem, web({ cursor: 'pointer' })]}>
                <n.Icon size={20} color={on ? t.accent : t.textDim} />
                <Text style={{ fontFamily: on ? t.typo.body700 : t.typo.body500, fontSize: 10, color: on ? t.accent : t.textDim }} numberOfLines={1}>{n.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', height: '100%' as any },
  mobileNav: {
    flexDirection: 'row', borderTopWidth: 1, paddingBottom: 8, paddingTop: 6, paddingHorizontal: 2,
    ...(Platform.OS === 'web' ? ({ position: 'fixed' as any, bottom: 0, left: 0, right: 0, zIndex: 100, backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any)
      : { position: 'absolute', bottom: 0, left: 0, right: 0 }),
  },
  mobileItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 4, minWidth: 0 },
});
