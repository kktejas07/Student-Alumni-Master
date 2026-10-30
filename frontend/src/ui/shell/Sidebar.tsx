/**
 * Sidebar — the one left rail for every portal.
 *
 * Replaces student/alumni/mentor/college/superadmin/vendor Sidebar.tsx.
 * Brand → profile → id-card → Agent K → nav (items, groups, counts, tags) →
 * logout. Collapses to a 76px icon rail on tablets or when the user toggles
 * (persisted through sidebarStore, Cmd/Ctrl+B).
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, ChevronDown, ExternalLink, LogOut } from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useSidebarStore } from '@/src/viewmodels/stores/sidebarStore';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { SALogo } from '@/src/views/components';
import { FadeInView, PressScale, SparkIcon } from '../motion';
import { usePortalTheme, RADIUS, SPACE, web } from '../theme';
import { Badge, Tooltip, Txt } from '../primitives';
import { isGroup, type NavGroup, type NavItem, type PortalConfig, type PortalProfile } from './types';

const COLLAPSED_W = 76;

export function useSidebarCollapsed(enabled: boolean) {
  const bp = useBreakpoint();
  const userCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const hydrate = useSidebarStore((s) => s.hydrate);
  const hydrated = useSidebarStore((s) => s.hydrated);
  React.useEffect(() => { if (enabled && !hydrated) hydrate(); }, [enabled, hydrate, hydrated]);
  const collapsed = enabled && (bp.bp === 'md' || userCollapsed);
  return { collapsed, userCollapsed, toggle, isPhone: bp.isPhone };
}

function CountPill({ n, onActive, alert }: { n: number; onActive: boolean; alert?: boolean }) {
  const t = usePortalTheme();
  if (!n) return null;
  return (
    <View style={{ minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, alignItems: 'center', backgroundColor: onActive ? t.onAccentSoft : alert ? t.warningBg : t.hover }}>
      <Text style={{ fontFamily: t.typo.body700, fontSize: 10, color: onActive ? t.onAccent : alert ? t.warning : t.textMuted }}>{n > 99 ? '99+' : n}</Text>
    </View>
  );
}

function NavRow({
  item, active, collapsed, onNav, count, index, portal,
}: { item: NavItem; active: boolean; collapsed: boolean; onNav: (id: string) => void; count?: number; index: number; portal: string }) {
  const t = usePortalTheme();
  const { Icon } = item;
  const icon = item.spark
    ? <SparkIcon Icon={Icon} size={16} color={active ? t.onAccent : t.textMuted} />
    : <Icon size={16} color={active ? t.onAccent : t.textMuted} />;
  const rowStyle = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 11, minHeight: 40,
    paddingHorizontal: collapsed ? 0 : 11, paddingVertical: 9, marginBottom: 2, borderRadius: RADIUS.sm,
    justifyContent: (collapsed ? 'center' : 'flex-start') as any,
  };
  return (
    <FadeInView delay={120 + index * 25} distance={8}>
      <PressScale
        onPress={() => onNav(item.id)}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        accessibilityHint={`Opens the ${item.label} section`}
        nativeID={`${portal}-nav-${item.id}`}
        testID={`${portal}-nav-${item.id}`}
      >
        {active ? (
          <LinearGradient colors={[t.accent, t.accentD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[rowStyle, web({ boxShadow: t.accentGlow })]}>
            {icon}
            {!collapsed && <Text style={{ fontFamily: t.typo.body600, fontSize: 13, flex: 1, color: t.onAccent }} numberOfLines={1}>{item.label}</Text>}
            {!collapsed && count != null && <CountPill n={count} onActive alert={item.alert} />}
            {!collapsed && item.tag && <Badge label={item.tag} tone="neutral" style={{ backgroundColor: t.onAccentSoft }} />}
            {!collapsed && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: t.onAccent, opacity: 0.9 }} />}
          </LinearGradient>
        ) : (
          <HoverRow style={rowStyle}>
            {icon}
            {!collapsed && <Text style={{ fontFamily: t.typo.body600, fontSize: 13, flex: 1, color: t.textMuted }} numberOfLines={1}>{item.label}</Text>}
            {!collapsed && count != null && <CountPill n={count} onActive={false} alert={item.alert} />}
            {!collapsed && item.tag && <Badge label={item.tag} tone="accent" />}
          </HoverRow>
        )}
      </PressScale>
    </FadeInView>
  );
}

function HoverRow({ children, style }: { children: React.ReactNode; style: any }) {
  const t = usePortalTheme();
  const [h, setH] = React.useState(false);
  return (
    <View
      // @ts-ignore web hover
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={[style, h && { backgroundColor: t.hover }, web({ transitionDuration: '140ms' })]}
    >
      {children}
    </View>
  );
}

function NavGroupRow({
  group, active, collapsed, onNav, portal,
}: { group: NavGroup; active: string; collapsed: boolean; onNav: (id: string) => void; portal: string }) {
  const t = usePortalTheme();
  const [children, setChildren] = React.useState(group.children || []);
  React.useEffect(() => {
    let on = true;
    group.loadChildren?.().then((c) => { if (on && c.length) setChildren(c); }).catch(() => { });
    return () => { on = false; };
  }, [group]);
  const childActive = group.isChildActive ? group.isChildActive(active) : children.some((c) => c.id === active);
  const [open, setOpen] = React.useState(childActive);
  React.useEffect(() => { if (childActive) setOpen(true); }, [childActive]);
  const first = children[0]?.id;
  const { Icon } = group;

  return (
    <View style={{ marginBottom: 2 }}>
      <Pressable
        onPress={() => { setOpen((o) => !o); if ((collapsed || !childActive) && first) onNav(first); }}
        accessibilityRole="button"
        accessibilityLabel={`${group.label} group`}
        accessibilityState={{ expanded: open }}
        nativeID={`${portal}-nav-${group.group}`}
        style={({ hovered }: any) => [
          {
            flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 40, paddingHorizontal: collapsed ? 0 : 11, paddingVertical: 9, borderRadius: RADIUS.sm,
            justifyContent: collapsed ? 'center' : 'flex-start', backgroundColor: childActive && !open ? t.accentSoft : hovered ? t.hover : 'transparent'
          },
          web({ cursor: 'pointer' }),
        ]}
      >
        <Icon size={16} color={childActive ? t.accent : t.textMuted} />
        {!collapsed && (
          <>
            <Text style={{ fontFamily: t.typo.body600, fontSize: 13, flex: 1, color: childActive ? t.text : t.textMuted }} numberOfLines={1}>{group.label}</Text>
            {group.tag && <Badge label={group.tag} tone="accent" />}
            {open ? <ChevronDown size={14} color={t.textDim} /> : <ChevronRight size={14} color={t.textDim} />}
          </>
        )}
      </Pressable>
      {open && !collapsed && (
        <View style={{ gap: 2, marginTop: 2, marginBottom: 4 }}>
          {children.map((c) => {
            const on = active === c.id;
            return (
              <Pressable key={c.id} onPress={() => onNav(c.id)} accessibilityRole="tab" accessibilityLabel={c.label} accessibilityState={{ selected: on }}
                nativeID={`${portal}-nav-${c.id}`}
                style={({ hovered }: any) => [{ marginLeft: 18, borderRadius: RADIUS.sm, backgroundColor: on ? t.accentSoft : hovered ? t.hover : 'transparent' }, web({ cursor: 'pointer' })]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: on ? t.accent : t.textDim }} />
                  <Text style={{ fontFamily: on ? t.typo.body600 : t.typo.body500, fontSize: 12, color: on ? t.text : t.textMuted, flex: 1 }} numberOfLines={1}>{c.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function Sidebar({
  config, active, onNav, onLogout, counts, profile: profileOverride,
}: { config: PortalConfig; active: string; onNav: (id: string) => void; onLogout: () => void; counts?: Record<string, number>; profile?: PortalProfile }) {
  const t = usePortalTheme();
  const router = useRouter();
  const user = useAuthStore((u) => u.user) as any;
  const { collapsed, userCollapsed, toggle, isPhone } = useSidebarCollapsed(config.collapsible !== false);
  if (isPhone) return null;

  const profile = profileOverride || config.profile(user);
  const width = collapsed ? COLLAPSED_W : (config.railWidth ?? 248);
  const portal = config.portal;

  return (
    <View
      accessibilityRole={Platform.OS === 'web' ? ('navigation' as any) : undefined}
      accessibilityLabel={`${config.brand.subtitle} navigation`}
      style={[
        { width, height: '100%' as any, backgroundColor: t.rail, borderRightWidth: 1, borderRightColor: t.border, paddingHorizontal: SPACE.md, paddingTop: SPACE.base, paddingBottom: SPACE.md, zIndex: 2 },
        web({ transition: 'width 180ms ease', boxShadow: t.isDark ? '4px 0 40px rgba(0,0,0,0.25)' : undefined }),
      ]}
    >
      {/* Brand */}
      <FadeInView delay={20}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: 18, paddingHorizontal: 4, justifyContent: collapsed ? 'center' : 'flex-start' }} nativeID={`${portal}-brand`}>
          <Tooltip content={collapsed ? 'Expand sidebar' : 'Student Alumni'} disabled={!collapsed}>
            <Pressable onPress={() => collapsed && toggle()} accessibilityLabel={collapsed ? 'Expand sidebar' : 'Student Alumni'} style={web({ cursor: collapsed ? 'pointer' : 'default' })}>
              <SALogo size={32} variant={t.isDark ? 'glass' : 'gradient'} />
            </Pressable>
          </Tooltip>
          {!collapsed && (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: t.typo.display700, fontSize: 14, letterSpacing: -0.3, color: t.text }} numberOfLines={1}>{config.brand.title}</Text>
              <Text style={{ fontFamily: t.typo.body500, fontSize: 10.5, color: t.textMuted }} numberOfLines={1}>{config.brand.subtitle}</Text>
            </View>
          )}
          {!collapsed && config.collapsible !== false && (
            <Tooltip content="Collapse sidebar">
              <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel="Collapse sidebar" aria-expanded={!userCollapsed}
                style={({ hovered }: any) => [{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', backgroundColor: hovered ? t.hover : 'transparent' }, web({ cursor: 'pointer' })]}>
                <ChevronLeft size={14} color={t.textMuted} />
              </Pressable>
            </Tooltip>
          )}
        </View>
      </FadeInView>

      {/* Profile */}
      {!collapsed && (
        <FadeInView delay={60}>
          <View style={{ alignItems: 'center', paddingVertical: SPACE.sm, marginBottom: SPACE.sm }}>
            <Text numberOfLines={1} style={{ fontFamily: t.typo.body700, fontSize: 13, color: t.text, textAlign: 'center' }}>{profile.name}</Text>
            <Text numberOfLines={1} style={{ fontFamily: t.typo.body500, fontSize: 11, color: t.textMuted, textAlign: 'center', marginTop: 2 }}>{profile.subtitle}</Text>
          </View>
        </FadeInView>
      )}

      {/* ID card pill */}
      {!collapsed && config.idCard && (
        <FadeInView delay={100}>
          <PressScale
            onPress={() => router.push(config.idCard!.route as any)}
            accessibilityLabel={config.idCard.label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, backgroundColor: t.accentSoft, borderColor: t.accent + '44', borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, marginBottom: SPACE.md }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: t.typo.body700, fontSize: 10, letterSpacing: 0.3, color: t.textMuted }}>{config.idCard.label}</Text>
              <Text style={{ fontFamily: t.typo.mono600, fontSize: 11.5, letterSpacing: 0.5, marginTop: 1, color: t.isDark ? t.accentL : t.accentD }}>{user?.unique_id || '—'}</Text>
            </View>
            <ExternalLink size={13} color={t.isDark ? t.accentL : t.accentD} />
          </PressScale>
        </FadeInView>
      )}

      {config.agentK !== false && (
        <FadeInView delay={130}>
          <AgentKLauncher collapsed={collapsed} />
        </FadeInView>
      )}

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: SPACE.sm }} showsVerticalScrollIndicator={false}>
        {config.nav.map((entry, i) => isGroup(entry) ? (
          <NavGroupRow key={entry.group} group={entry} active={active} collapsed={collapsed} onNav={onNav} portal={portal} />
        ) : (
          <NavRow key={entry.id} item={entry} index={i} active={entry.id === active} collapsed={collapsed} onNav={onNav} portal={portal}
            count={entry.countKey ? counts?.[entry.countKey] : undefined} />
        ))}
      </ScrollView>

      {/* Logout */}
      <PressScale
        onPress={onLogout}
        testID="logout-button"
        accessibilityLabel="Log out of your account"
        accessibilityHint="Signs you out and returns to the welcome screen"
        style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: collapsed ? 0 : 11, paddingVertical: 9, borderRadius: RADIUS.sm, marginTop: SPACE.xs, justifyContent: collapsed ? 'center' : 'flex-start' }}
      >
        <LogOut size={14} color={t.danger} />
        {!collapsed && (
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="bodyStrong" tone="danger" style={{ fontSize: 13 }}>Log out</Txt>
            {profile.email ? <Txt variant="caption" tone="dim" numberOfLines={1}>{profile.email}</Txt> : null}
          </View>
        )}
      </PressScale>
    </View>
  );
}

export { COLLAPSED_W };
