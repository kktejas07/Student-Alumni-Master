// @ts-nocheck
/**
 * Student Portal — left sidebar (Apple HIG migration, Slice 2A).
 * Migrated to NativeWind className.
 */
import React from 'react';
import { View, Text, ScrollView, Platform, Pressable } from 'react-native';
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
import { trackClick, logger as analyticsLogger } from '@/src/analytics';
import { api } from '@/src/models/services/api';

export type StudentNavId =
  | 'dashboard' | 'career-ai' | 'internships' | 'network' | 'myevents' | 'events'
  | 'financial' | 'deals' | 'wallet' | 'higher-ed' | 'rentals' | 'courses' | 'profile'
  | 'my-bookings' | 'my-workshops' | 'echo-showcase' | string;

export const NAV: Array<{ id: StudentNavId; label: string; Icon: any; spark?: boolean }> = [
  { id: 'dashboard',       label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'career-ai',       label: 'Career AI',          Icon: Sparkles, spark: true },
  { id: 'internships',     label: 'Internships & Jobs', Icon: Briefcase },
  { id: 'network',         label: 'Network',            Icon: Users },
  { id: 'my-bookings',     label: 'My Bookings',        Icon: CalendarCheck },
  { id: 'my-tickets',      label: 'My Tickets',         Icon: Ticket },
  { id: 'myevents',        label: 'My Events',          Icon: Calendar },
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
      .then((res) => { if (mounted && res?.items && res.items.length > 0) setShowcases(res.items); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const isChildActive = active === 'echo-showcase' || showcases.some((s) => s.slug === active || active === `echo-showcase:${s.slug}`);
  const firstSlug = showcases[0]?.slug || 'echo-showcase';

  return (
    <View className="mb-0.5">
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
            <Text className="font-body-semibold text-[13px] flex-1" style={{ color: isChildActive ? '#A5B4FC' : C.textSec }} numberOfLines={1}>
              ECHO Showcase
            </Text>
            <View className="flex-row items-center gap-1">
              <View className="rounded-[10px] px-[5px] py-0.5" style={{ backgroundColor: 'rgba(99,102,241,0.30)' }}>
                <Text className="font-body-bold text-[9px]" style={{ color: '#A5B4FC', letterSpacing: 0.5 }}>CMS</Text>
              </View>
              {isOpen ? <ChevronDown size={12} color={C.textSec} /> : <ChevronRight size={12} color={C.textSec} />}
            </View>
          </>
        )}
      </Pressable>
      {isOpen && !collapsed && (
        <View className="gap-0.5">
          {showcases.map((sc) => {
            const isSelected = active === sc.slug || active === `echo-showcase:${sc.slug}`;
            return (
              <Pressable
                key={sc.slug}
                onPress={() => onNav(sc.slug)}
                style={({ hovered }: any) => [
                  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 32, paddingRight: 11, paddingVertical: 8, borderRadius: 8, minHeight: 36 },
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
                    className="flex-row items-center gap-2 flex-1 px-2.5 py-[7px] rounded-lg"
                    style={Platform.OS === 'web' ? { boxShadow: PALETTE.violetGlow } as any : {}}
                  >
                    <View className="w-1 h-1 rounded-sm bg-white opacity-80" />
                    <Text className="font-body-semibold text-[12.5px] text-white flex-1" numberOfLines={1}>{sc.title}</Text>
                  </LinearGradient>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <View className="w-1 h-1 rounded-sm" style={{ backgroundColor: C.dim }} />
                    <Text className="font-body-medium text-[12.5px]" style={{ color: C.textSec }} numberOfLines={1}>{sc.title}</Text>
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

/* ── Main Sidebar ──────────────────────────────────────────────────────────── */
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

  const userCollapsed = useSidebarStore((s) => s.isCollapsed);
  const toggleCollapse = useSidebarStore((s) => s.toggle);
  const hydrate = useSidebarStore((s) => s.hydrate);
  const hydrated = useSidebarStore((s) => s.hydrated);
  React.useEffect(() => { if (!hydrated) hydrate(); }, [hydrate, hydrated]);
  const collapsed = bp.bp === 'md' || userCollapsed;
  const railWidth = collapsed ? 76 : 240;

  if (bp.isPhone) return null;

  const C = {
    bg: 'rgba(10,15,30,0.72)',
    border: PALETTE.glassBorder,
    text: PALETTE.text,
    textSec: PALETTE.muted,
    textTer: PALETTE.dim,
    cardBg: PALETTE.glassSoft,
    accent: PALETTE.violet,
    danger: PALETTE.rose,
  };

  const railGlass = Platform.OS === 'web' ? ({
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    boxShadow: '4px 0 40px rgba(2,6,23,0.40)',
  } as any) : {};

  return (
    <View
      className="h-full border-r"
      style={[{ width: railWidth, backgroundColor: C.bg, borderRightColor: C.border, borderRightWidth: StyleSheet.hairlineWidth }, railGlass]}
    >
      {/* Brand */}
      <FadeInView delay={20}>
        <View className="flex-row items-center gap-3 mb-[18px] px-1 relative" style={collapsed ? { justifyContent: 'center' } : {}}>
          <Pressable onPress={() => collapsed && toggleCollapse()} style={collapsed && Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}}>
            <SALogo size={32} variant="gradient" />
          </Pressable>
          {!collapsed && (
            <View className="flex-1 min-w-0">
              <Text className="font-display-bold text-sm tracking-tight" style={{ color: C.text }}>Student Alumni</Text>
              <Text className="font-body-medium text-[10.5px]" style={{ color: C.textSec }}>Web Dashboard</Text>
            </View>
          )}
          {!collapsed && (
            <Pressable
              onPress={toggleCollapse}
              accessibilityRole="button"
              accessibilityLabel={userCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!userCollapsed}
              style={({ hovered }: any) => ([
                'w-6 h-6 rounded-full border items-center justify-center',
                { borderColor: C.border, backgroundColor: hovered && Platform.OS === 'web' ? C.cardBg : 'transparent' },
                Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '150ms' } as any : {},
              ])}
            >
              <MaterialCommunityIcons name={userCollapsed ? 'chevron-right' : 'chevron-left'} size={14} color={C.textSec} />
            </Pressable>
          )}
        </View>
      </FadeInView>

      {/* Profile card */}
      {!collapsed && (
        <FadeInView delay={70}>
          <View className="px-1 py-2 mb-3 items-center" style={Platform.OS === 'web' ? { cursor: 'default' } : {}}>
            <Text numberOfLines={1} className="font-sf-semibold text-[13px] text-center" style={{ color: C.text }}>{fullName}</Text>
            <Text className="font-sf-medium text-[11px] text-center mt-0.5" style={{ color: C.textSec }}>{yearLabel}</Text>
          </View>
        </FadeInView>
      )}

      {/* Student card pill */}
      {!collapsed && (
        <FadeInView delay={120}>
          <PressScale
            className="flex-row items-center gap-2 border rounded-lg px-3 py-2 mb-3"
            style={{ backgroundColor: C.cardBg, borderColor: C.border, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
            onPress={() => router.push('/id-card')}
          >
            <View className="flex-1 min-w-0">
              <Text className="font-sf-bold text-[10px]" style={{ color: C.textSec, letterSpacing: 0.3 }}>My Student Card</Text>
              <Text className="font-sf-extrabold text-[11.5px] mt-px" style={{ color: C.accent, letterSpacing: 0.5 }}>{saId}</Text>
            </View>
            <ExternalLink size={13} color={C.accent} />
          </PressScale>
        </FadeInView>
      )}

      {/* Agent K launcher */}
      <FadeInView delay={150}>
        <AgentKLauncher collapsed={collapsed} />
      </FadeInView>

      {/* Nav */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: SP.sm, paddingBottom: SP.sm }}
        showsVerticalScrollIndicator={false}
        accessibilityRole={Platform.OS === 'web' ? ('navigation' as any) : undefined}
        accessibilityLabel="Primary navigation"
      >
        {NAV.map(({ id, label, Icon, spark }, i) => {
          const isActive = id === active;
          const echoGroup = id === 'network' ? (
            <EchoNavGroup key="echo-group" active={active} collapsed={collapsed} isOpen={echoOpen} onToggle={() => setEchoOpen((o) => !o)} onNav={onNav} C={C} />
          ) : null;
          return (
            <React.Fragment key={id}>
              {echoGroup}
              <FadeInView delay={150 + i * 35} distance={8}>
                <PressScale
                  onPress={() => {
                    trackClick('student_sidebar_nav_click', { nav_id: id, label });
                    analyticsLogger.debug('[Sidebar DEBUG] Nav item clicked', { id, label });
                    onNav(id);
                  }}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isActive }}
                  accessibilityHint={`Opens the ${label} section of the dashboard`}
                  nativeID={`student-nav-${id}`}
                  testID={`student-nav-${id}`}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[PALETTE.violet, PALETTE.violetD] as any}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      className="flex-row items-center gap-[11px] rounded-[9px] min-h-[40px] mb-0.5"
                      style={{
                        paddingHorizontal: collapsed ? 0 : 11,
                        paddingVertical: 9,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        ...(Platform.OS === 'web' ? { boxShadow: PALETTE.violetGlow } as any : {}),
                      }}
                    >
                      {spark ? <SparkIcon Icon={Icon} size={16} color="#fff" /> : <Icon size={16} color="#fff" />}
                      {!collapsed && <Text className="font-body-semibold text-[13px] flex-1 text-white" numberOfLines={1}>{label}</Text>}
                      {!collapsed && <View className="w-[5px] h-[5px] rounded-full bg-white opacity-90" />}
                    </LinearGradient>
                  ) : (
                    <View
                      className="flex-row items-center gap-[11px] rounded-[9px] min-h-[40px] mb-0.5"
                      style={{
                        paddingHorizontal: collapsed ? 0 : 11,
                        paddingVertical: 9,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
                      }}
                    >
                      {spark ? <SparkIcon Icon={Icon} size={16} color={C.textSec} /> : <Icon size={16} color={C.textSec} />}
                      {!collapsed && <Text className="font-body-semibold text-[13px] flex-1" style={{ color: C.textSec }} numberOfLines={1}>{label}</Text>}
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
        className="flex-row items-center gap-2 rounded-[9px] mt-1 px-[11px] py-[9px]"
        style={collapsed ? { justifyContent: 'center', paddingHorizontal: 0, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) } : Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}
        accessibilityLabel="Log out of your account"
        testID="logout-button"
        accessibilityHint="Signs you out and returns to the welcome screen"
      >
        <LogOut size={14} color={C.danger} />
        {!collapsed && <Text className="font-sf-semibold text-[13px]" style={{ color: C.danger }}>Log out</Text>}
      </PressScale>
    </View>
  );
}
