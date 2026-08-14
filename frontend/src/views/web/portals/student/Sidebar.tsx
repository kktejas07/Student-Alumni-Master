// @ts-nocheck
/**
 * Student Portal — left sidebar (Apple HIG migration, Slice 2A).
 *
 * Theme-aware via useTheme() — reads from the new ThemeProvider mounted in
 * StudentPortalRN.tsx. Falls back gracefully to dark theme outside the
 * provider. Brand purple is preserved as the active-pill gradient. All
 * existing animations (FadeIn cascade, PressScale, SparkIcon) retained.
 *
 * Responsive:
 *   • Tablet (md): collapses to 80px icon-only rail (no labels, tooltip
 *     on hover)
 *   • Desktop (lg+): full 240px expanded rail
 *   • Phone (< md): hidden — bottom-tab pattern would replace this on
 *     phone-class viewports (handled by FeaturePageShell embed mode +
 *     dashboards we ship later)
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { useSidebarStore } from '@/src/viewmodels/stores/sidebarStore';
import {
  LayoutDashboard, Sparkles, Briefcase, Users, Calendar, Wallet,
  Tag, CreditCard, GraduationCap, Home, User, ExternalLink, LogOut,
  CalendarCheck, FileText, BookOpen, ChevronDown, ChevronRight, Zap, Ticket,
} from './iconShims';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme/ThemeContext';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { SP, RADII, FONT_FAMILY } from '@/src/theme/apple';
import { GRADS } from './gradients';
import { SC, PALETTE, TYPO } from './tokens';
import { Av } from './atoms';
import { FadeInView, PressScale, SparkIcon, PulseDot } from './motion';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { SALogo } from '@/src/views/components';

import { api } from '@/src/models/services/api';

export type StudentNavId =
  | 'dashboard' | 'career-ai' | 'internships' | 'network' | 'events'
  | 'financial' | 'deals' | 'wallet' | 'higher-ed' | 'rentals' | 'courses' | 'profile'
  | 'my-bookings' | 'my-workshops' | 'echo-showcase' | string;

export const NAV: Array<{ id: StudentNavId; label: string; Icon: any; spark?: boolean }> = [
  { id: 'dashboard',       label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'career-ai',       label: 'Career AI',          Icon: Sparkles, spark: true },
  { id: 'internships',     label: 'Internships & Jobs', Icon: Briefcase },
  { id: 'network',         label: 'Network',            Icon: Users },
  { id: 'my-bookings',     label: 'My Bookings',        Icon: CalendarCheck },
  { id: 'my-tickets',      label: 'My Tickets',         Icon: Ticket },
  { id: 'events',          label: 'Events',             Icon: Calendar },
  { id: 'my-workshops',    label: 'My Workshops',       Icon: BookOpen },
  { id: 'courses',         label: 'Courses',            Icon: BookOpen },
  { id: 'financial',       label: 'Financial',          Icon: Wallet },
  { id: 'deals',           label: 'Deals & Offers',     Icon: Tag },
  { id: 'wallet',          label: 'SA Wallet',          Icon: CreditCard },
  { id: 'higher-ed',       label: 'Higher Education',   Icon: GraduationCap },
  { id: 'rentals',         label: 'Rentals',            Icon: Home },
  { id: 'profile',         label: 'Profile',            Icon: User },
];

/* ── ECHO Showcase collapsible nav group ──────────────────────────────────── */
function EchoNavGroup({
  active, collapsed, isOpen, onToggle, onNav, C,
}: {
  active: StudentNavId;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onNav: (id: StudentNavId) => void;
  C: any;
}) {
  const [showcases, setShowcases] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    api.listEchoShowcases()
      .then((res) => {
        if (mounted && res?.items && res.items.length > 0) {
          setShowcases(res.items);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const isChildActive = active === 'echo-showcase' || showcases.some((s) => s.slug === active || active === `echo-showcase:${s.slug}`);
  const firstSlug = showcases[0]?.slug || 'echo-showcase';

  return (
    <View style={{ marginBottom: 2 }}>
      {/* Group header row */}
      <Pressable
        onPress={collapsed ? () => onNav(firstSlug) : onToggle}
        style={({ hovered }: any) => [
          {
            flexDirection: 'row', alignItems: 'center', gap: 11,
            paddingHorizontal: collapsed ? 0 : 11, paddingVertical: 9,
            borderRadius: 8, minHeight: 40,
            justifyContent: collapsed ? 'center' : 'flex-start',
            backgroundColor: isChildActive && !isOpen
              ? 'rgba(99,102,241,0.12)'
              : hovered && Platform.OS === 'web'
              ? 'rgba(99,102,241,0.06)'
              : 'transparent',
          },
          Platform.OS === 'web' ? { cursor: 'pointer' } as any : {},
        ]}
        nativeID="student-nav-echo-showcase"
        accessibilityRole="button"
        accessibilityLabel="ECHO Showcase group"
      >
        <Zap size={16} color={isChildActive ? '#A5B4FC' : C.textSec} />
        {!collapsed && (
          <>
            <Text style={{ fontFamily: TYPO.body600, fontSize: 13, flex: 1, color: isChildActive ? '#A5B4FC' : C.textSec }} numberOfLines={1}>
              ECHO Showcase
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ backgroundColor: 'rgba(99,102,241,0.30)', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 }}>
                <Text style={{ fontFamily: TYPO.body700, fontSize: 9, color: '#A5B4FC', letterSpacing: 0.5 }}>CMS</Text>
              </View>
              {isOpen
                ? <ChevronDown size={12} color={C.textSec} />
                : <ChevronRight size={12} color={C.textSec} />
              }
            </View>
          </>
        )}
      </Pressable>
      {/* Child items */}
      {isOpen && !collapsed && (
        <View style={{ gap: 2 }}>
          {showcases.map((sc) => {
            const isSelected = active === sc.slug || active === `echo-showcase:${sc.slug}`;
            return (
              <Pressable
                key={sc.slug}
                onPress={() => onNav(sc.slug)}
                style={({ hovered }: any) => [
                  {
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    paddingLeft: 32, paddingRight: 11, paddingVertical: 8,
                    borderRadius: 8, minHeight: 36,
                  },
                  Platform.OS === 'web' ? { cursor: 'pointer' } as any : {},
                ]}
                nativeID={`student-nav-${sc.slug}`}
                accessibilityRole="tab"
                accessibilityLabel={sc.title}
                accessibilityState={{ selected: isSelected }}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={[PALETTE.violet, PALETTE.violetD] as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      flex: 1, paddingHorizontal: 10, paddingVertical: 7,
                      borderRadius: 8,
                      ...(Platform.OS === 'web' ? { boxShadow: PALETTE.violetGlow } as any : {}),
                    }}
                  >
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', opacity: 0.8 }} />
                    <Text style={{ fontFamily: TYPO.body600, fontSize: 12.5, color: '#fff', flex: 1 }} numberOfLines={1}>
                      {sc.title}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.dim }} />
                    <Text style={{ fontFamily: TYPO.body500, fontSize: 12.5, color: C.textSec }} numberOfLines={1}>
                      {sc.title}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function Sidebar({
  active, onNav, onLogout,
}: { active: StudentNavId; onNav: (id: StudentNavId) => void; onLogout: () => void }) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const bp = useBreakpoint();
  const user = useAuthStore((u) => u.user) as any;
  const [echoOpen, setEchoOpen] = React.useState<boolean>(
    active === 'echo-showcase' || active?.startsWith('echo-showcase:')
  );
  React.useEffect(() => {
    if (active === 'echo-showcase' || active?.startsWith('echo-showcase:')) setEchoOpen(true);
  }, [active]);

  const fullName: string = displayName(user);
  const initials: string = displayInitials(user);
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;
  const gy = user?.graduation_year || (user?.school_info || {}).graduation_year;
  const yearLabel: string = (gy && Number(gy) === new Date().getFullYear()) ? 'Final Year'
    : (gy && Number(gy) === new Date().getFullYear() + 1) ? 'Pre-Final Year'
    : (gy ? `Class of ${gy}` : user?.school_info?.class_or_year || user?.year || 'Student');
  const saId: string = user?.unique_id || '—';

  // Adaptive width: collapsed icon-rail on md, OR forced-collapsed via store toggle.
  const userCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapse = useSidebarStore((s) => s.toggle);
  const hydrate = useSidebarStore((s) => s.hydrate);
  const hydrated = useSidebarStore((s) => s.hydrated);
  React.useEffect(() => { if (!hydrated) hydrate(); }, [hydrate, hydrated]);
  const collapsed = bp.bp === 'md' || userCollapsed;
  const railWidth = collapsed ? 76 : 240;

  // Hide the sidebar entirely on phone — content fills the viewport.
  // (Phase 3 will replace this with a bottom-tab bar.)
  if (bp.isPhone) return null;

  // Token resolution — FinTax360 glass-dark theme overrides.
  // The sidebar is a translucent navy rail with a violet accent.
  const C = {
    bg:      'rgba(10,15,30,0.72)',       // translucent navy (spec value)
    border:  PALETTE.glassBorder,
    text:    PALETTE.text,
    textSec: PALETTE.muted,
    textTer: PALETTE.dim,
    cardBg:  PALETTE.glassSoft,
    accent:  PALETTE.violet,
    danger:  PALETTE.rose,
  };

  // Web-only frosted-glass effect for the rail.
  const railGlass = Platform.OS === 'web' ? ({
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    boxShadow: '4px 0 40px rgba(2,6,23,0.40)',
  } as any) : {};

  return (
    <View style={[s.aside, { width: railWidth, backgroundColor: C.bg, borderRightColor: C.border }, railGlass]}>
      {/* Brand */}
      <FadeInView delay={20}>
        <View style={[s.brand, collapsed && { justifyContent: 'center' }]} nativeID="student-brand">
          <Pressable onPress={() => collapsed && toggleCollapse()} style={collapsed && Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}>
            <SALogo size={32} variant="gradient" />
          </Pressable>
          {!collapsed && (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.brandTitle, { color: C.text }]}>Student Alumni</Text>
              <Text style={[s.brandSub, { color: C.textSec }]}>Web Dashboard</Text>
            </View>
          )}
          {!collapsed && (
            <Pressable
              onPress={toggleCollapse}
              accessibilityRole="button"
              accessibilityLabel={userCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!userCollapsed}
              style={({ hovered }: any) => ([
                s.collapseBtn,
                {
                  borderColor: C.border,
                  backgroundColor: hovered && Platform.OS === 'web' ? C.cardBg : 'transparent',
                }
              ])}
            >
              <MaterialCommunityIcons
                name={userCollapsed ? 'chevron-right' : 'chevron-left'}
                size={14}
                color={C.textSec}
              />
            </Pressable>
          )}
        </View>
      </FadeInView>

      {/* Profile card */}
      {!collapsed && (
        <FadeInView delay={70}>
          <View style={[s.profileCard, { alignItems: 'center', ...(Platform.OS === 'web' ? { cursor: 'default' } : {}) }]}>
            <Text numberOfLines={1} style={[s.profileName, { color: C.text, textAlign: 'center' }]}>{fullName}</Text>
            <Text style={[s.profileYear, { color: C.textSec, textAlign: 'center', marginTop: 2 }]}>{yearLabel}</Text>
          </View>
        </FadeInView>
      )}

      {/* Student card pill */}
      {!collapsed && (
        <FadeInView delay={120}>
          <PressScale style={[s.idCardPill, { backgroundColor: C.cardBg, borderColor: C.border }]} onPress={() => router.push('/id-card')}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[s.idCardLabel, { color: C.textSec }]}>My Student Card</Text>
              <Text style={[s.idCardNumber, { color: C.accent }]}>{saId}</Text>
            </View>
            <ExternalLink size={13} color={C.accent} />
          </PressScale>
        </FadeInView>
      )}

      {/* Agent K launcher — sits ABOVE the main nav */}
      <FadeInView delay={150}>
        <AgentKLauncher collapsed={collapsed} />
      </FadeInView>

      {/* Nav */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: SP.sm, paddingBottom: SP.sm }}
        showsVerticalScrollIndicator={false}
        accessibilityRole={Platform.OS === 'web' ? ('navigation' as any) : undefined}
        accessibilityLabel="Primary navigation"
      >
        {NAV.map(({ id, label, Icon, spark }, i) => {
          const isActive = id === active;
          // Insert ECHO Showcase group after 'internships'
          const echoGroup = id === 'network' ? (
            <EchoNavGroup
              key="echo-group"
              active={active}
              collapsed={collapsed}
              isOpen={echoOpen}
              onToggle={() => setEchoOpen((o) => !o)}
              onNav={onNav}
              C={C}
            />
          ) : null;
          return (
            <React.Fragment key={id}>
              {echoGroup}
              <FadeInView delay={150 + i * 35} distance={8}>
                <PressScale
                  onPress={() => onNav(id)}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isActive }}
                  accessibilityHint={`Opens the ${label} section of the dashboard`}
                  nativeID={`student-nav-${id}`}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[PALETTE.violet, PALETTE.violetD] as any}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[s.navItem, s.navItemActive, collapsed && { justifyContent: 'center', paddingHorizontal: 0 },
                              Platform.OS === 'web' ? ({ boxShadow: PALETTE.violetGlow } as any) : {}]}
                    >
                      {spark ? <SparkIcon Icon={Icon} size={16} color="#fff" /> : <Icon size={16} color="#fff" />}
                      {!collapsed && <Text style={[s.navLabel, s.navLabelActive]} numberOfLines={1}>{label}</Text>}
                      {!collapsed && <View style={s.activeDot} />}
                    </LinearGradient>
                  ) : (
                    <View style={[s.navItem, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
                      {spark ? <SparkIcon Icon={Icon} size={16} color={C.textSec} /> : <Icon size={16} color={C.textSec} />}
                      {!collapsed && <Text style={[s.navLabel, { color: C.textSec }]} numberOfLines={1}>{label}</Text>}
                    </View>
                  )}
                </PressScale>
              </FadeInView>
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* Logout */}
      <PressScale
        onPress={onLogout}
        style={[s.logoutRow, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}
        accessibilityLabel="Log out of your account"
        testID="logout-button"
        accessibilityHint="Signs you out and returns to the welcome screen"
      >
        <LogOut size={14} color={C.danger} />
        {!collapsed && <Text style={[s.logoutText, { color: C.danger }]}>Log out</Text>}
      </PressScale>
    </View>
  );
}

const s = StyleSheet.create({
  aside: {
    height: '100%' as any, borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SP.md, paddingTop: SP.base, paddingBottom: SP.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SP.md, marginBottom: 18, paddingHorizontal: SP.xs, position: 'relative' },
  collapseBtn: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '150ms' } as any) : {}),
  },
  brandLogo: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontFamily: TYPO.display800, fontSize: 12, letterSpacing: 0.5 },
  brandTitle: { fontFamily: TYPO.display700, fontSize: 14, letterSpacing: -0.3 },
  brandSub: { fontFamily: TYPO.body500, fontSize: 10.5 },

  profileCard: {
    paddingHorizontal: SP.xs, paddingVertical: SP.sm, marginBottom: SP.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  statusDotWrap: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontFamily: FONT_FAMILY, fontWeight: '600', fontSize: 13 },
  profileYear: { fontFamily: FONT_FAMILY, fontWeight: '500', fontSize: 11 },

  idCardPill: {
    flexDirection: 'row', alignItems: 'center', gap: SP.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADII.md, paddingHorizontal: SP.md, paddingVertical: SP.sm, marginBottom: SP.md,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  idCardLabel: { fontFamily: FONT_FAMILY, fontWeight: '700', fontSize: 10, letterSpacing: 0.3 },
  idCardNumber: { fontFamily: FONT_FAMILY, fontWeight: '800', fontSize: 11.5, letterSpacing: 0.5, marginTop: 1 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2,
    borderRadius: RADII.sm, minHeight: 40,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  navItemActive: {
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 6px 18px rgba(95,37,159,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
    } as any) : { shadowColor: '#5F259F', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } as any }),
  },
  navLabel: { fontFamily: TYPO.body600, fontSize: 13, flex: 1 },
  navLabelActive: { color: '#fff' },
  activeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff', opacity: 0.9 },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: SP.sm,
    paddingHorizontal: 11, paddingVertical: 9, borderRadius: RADII.sm,
    marginTop: SP.xs,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  logoutText: { fontFamily: FONT_FAMILY, fontWeight: '600', fontSize: 13 },
});
