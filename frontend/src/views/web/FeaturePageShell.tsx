// @ts-nocheck
/**
 * FeaturePageShell — shared layout for /deals, /rentals, /financial,
 * /career-ai, /higher-education, etc.
 *
 * Uses the SAME purple gradient background + glass theme + left
 * sidebar as the main /platform Student Dashboard, so navigation
 * feels like a single SPA instead of separate pages.
 *
 *   • Sidebar persists on every feature page
 *   • Clicking a nav item navigates with router.replace() — the URL
 *     changes but no history stack grows; the user stays "in place"
 *     and just the right pane swaps.
 *   • Active item is auto-detected from the current route.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import {
  ArrowLeft, Bell, Home as HomeIcon, Sparkles, Briefcase, BookOpen, Users,
  Calendar, Wallet, Shield, Building2, Gift, User as UserIcon, GraduationCap,
} from 'lucide-react-native';
import { Sidebar, NavItem } from '@/src/views/web/platform/components';
import { Sidebar as StudentSidebar } from '@/src/views/web/portals/student/Sidebar';
import { Sidebar as AlumniSidebar } from '@/src/views/web/portals/alumni/Sidebar';
import { SA } from '@/src/views/web/platform/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';

/**
 * EmbeddedShellContext — set to true when this Shell is rendered INSIDE a
 * portal that already provides its own sidebar/gradient (e.g. StudentPortalRN).
 * In that case we skip the outer chrome and render only the hero + children.
 */
export const EmbeddedShellContext = React.createContext<boolean>(false);

// Single source of truth for sidebar navigation
const NAV: NavItem[] = [
  { id: 'home',              Icon: HomeIcon,       label: 'Dashboard',        color: '#818CF8' },
  { id: 'career',            Icon: Sparkles,       label: 'Career AI',        color: '#818CF8' },
  { id: 'internships',       Icon: Briefcase,      label: 'Opportunities',   color: '#34D399' },
  { id: 'courses',           Icon: BookOpen,       label: 'Courses',          color: '#22D3EE' },
  { id: 'higher-education',  Icon: GraduationCap,  label: 'Higher Education', color: '#FCD34D' },
  { id: 'network',           Icon: Users,          label: 'Network',          color: '#F472B6' },
  { id: 'events',            Icon: Calendar,       label: 'Events',           color: '#FB923C' },
  { id: 'financial',         Icon: Wallet,         label: 'Funding',         color: '#FCD34D' },
  { id: 'wallet',            Icon: Wallet,         label: 'Rewards',          color: '#86EFAC' },
  { id: 'insurance',         Icon: Shield,         label: 'Insurance',        color: '#60A5FA' },
  { id: 'rentals',           Icon: Building2,      label: 'Rentals',          color: '#818CF8' },
  { id: 'deals',             Icon: Gift,           label: 'Deals',            color: '#F472B6' },
  { id: 'profile',           Icon: UserIcon,       label: 'Profile',          color: '#818CF8' },
];

// Map NAV id ↔ Expo-router route
const ROUTE_MAP: Record<string, string> = {
  home: '/platform',
  career: '/career-ai',
  internships: '/internships',
  courses: '/explore-courses',
  'higher-education': '/higher-education',
  network: '/network',
  events: '/events',
  financial: '/financial',
  wallet: '/wallet',
  insurance: '/financial', // Insurance products live inside /financial
  rentals: '/rentals',
  deals: '/deals',
  profile: '/student-portal?tab=profile',
};

// Reverse map: which NAV id is "active" for a given pathname
function activeIdForPath(path: string): string {
  if (path.startsWith('/platform')) return 'home';
  if (path.startsWith('/career-ai')) return 'career';
  if (path.startsWith('/internships')) return 'internships';
  if (path.startsWith('/explore-courses') || path.startsWith('/courses')) return 'courses';
  if (path.startsWith('/higher-education') || path.startsWith('/applications')) return 'higher-education';
  if (path.startsWith('/network')) return 'network';
  if (path.startsWith('/events')) return 'events';
  if (path.startsWith('/financial')) return 'financial';
  if (path.startsWith('/wallet')) return 'wallet';
  if (path.startsWith('/rentals')) return 'rentals';
  if (path.startsWith('/deals')) return 'deals';
  if (path.startsWith('/me') || path.includes('tab=profile')) return 'profile';
  return '';
}

export default function FeaturePageShell({
  title, subtitle, accent = SA.purpleLight,
  heroEmoji = '✨',
  children,
  rightSlot,
  hideHero = false,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  heroEmoji?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  hideHero?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const isEmbedded = React.useContext(EmbeddedShellContext);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const role = user?.role || 'student';

  let pageBgColors = ['#0a0f1e', '#131938'] as any;
  let sidebarBg = 'rgba(10, 15, 30, 0.92)';
  let railColor = '#6366F1';
  let brandSubtitle = 'Web Dashboard';
  let orbColor1 = 'rgba(99,102,241,0.18)';
  let orbColor2 = 'rgba(59,130,246,0.18)';
  let heroBorder = 'rgba(99,102,241,0.20)';
  let heroBg = 'rgba(79, 70, 229, 0.18)';
  let heroBoxShadow = '0 20px 60px -12px rgba(99,102,241,0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset';
  let heroOrbColor1 = 'rgba(99,102,241,0.22)';
  let heroOrbColor2 = 'rgba(191,219,254,0.18)';
  let avatarGradient: readonly [string, string] | undefined = undefined;

  if (role === 'alumni') {
    pageBgColors = ['#0a0f1e', '#131938'] as any;
    sidebarBg = 'rgba(10, 15, 30, 0.92)';
    railColor = '#3B82F6';
    brandSubtitle = 'Alumni Dashboard';
    orbColor1 = 'rgba(249,115,22,0.18)'; // orange
    orbColor2 = 'rgba(59,130,246,0.18)'; // blue
    heroBorder = 'rgba(96,165,250,0.30)'; // blue
    heroBg = 'rgba(29,78,216,0.28)';
    heroBoxShadow = '0 20px 60px -12px rgba(29,78,216,0.40), 0 0 0 1px rgba(96,165,250,0.15) inset';
    heroOrbColor1 = 'rgba(96,165,250,0.22)';
    heroOrbColor2 = 'rgba(191,219,254,0.18)';
    avatarGradient = ['#C2410C', '#7C2D12'] as const;
  } else if (role === 'mentor') {
    pageBgColors = SA.pageBgMentor;
    sidebarBg = SA.sideMentor;
    railColor = SA.railMentor;
    brandSubtitle = 'Mentor Dashboard';
    orbColor1 = 'rgba(94,234,212,0.18)'; // teal
    orbColor2 = 'rgba(20,74,54,0.28)';   // green
    heroBorder = 'rgba(94,234,212,0.30)';
    heroBg = 'rgba(15,118,110,0.28)';
    heroBoxShadow = '0 20px 60px -12px rgba(15,118,110,0.40), 0 0 0 1px rgba(94,234,212,0.15) inset';
    heroOrbColor1 = 'rgba(94,234,212,0.22)';
    heroOrbColor2 = 'rgba(204,251,241,0.18)';
  } else if (role === 'college' || role === 'admin') {
    pageBgColors = SA.pageBgCollege;
    sidebarBg = SA.sideCollege;
    railColor = SA.railCollege;
    brandSubtitle = 'College Dashboard';
    orbColor1 = 'rgba(129,140,248,0.18)'; // indigo
    orbColor2 = 'rgba(30,41,80,0.28)';   // blue
    heroBorder = 'rgba(129,140,248,0.30)';
    heroBg = 'rgba(67,56,202,0.28)';
    heroBoxShadow = '0 20px 60px -12px rgba(67,56,202,0.40), 0 0 0 1px rgba(129,140,248,0.15) inset';
    heroOrbColor1 = 'rgba(129,140,248,0.22)';
    heroOrbColor2 = 'rgba(224,231,255,0.18)';
  }

  const initials = (user?.full_name || 'SA').split(' ').slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
  const activeId = activeIdForPath(pathname || '');

  const portalActiveId = (() => {
    const tabMap: Record<string, string> = {
      home: 'dashboard',
      career: 'career-ai',
      internships: 'internships',
      courses: 'courses',
      'higher-education': 'higher-ed',
      network: 'network',
      events: 'events',
      financial: 'financial',
      wallet: 'wallet',
      insurance: 'financial',
      rentals: 'rentals',
      deals: 'deals',
      profile: 'profile',
    };
    return tabMap[activeId] || activeId;
  })();

  const onNav = (id: string) => {
    if (role === 'student' || role === 'alumni') {
      const portalPath = role === 'alumni' ? '/alumni-portal' : '/student-portal';
      const tabMap: Record<string, string> = {
        home: 'dashboard',
        career: 'career-ai',
        internships: 'internships',
        courses: 'courses',
        'higher-education': 'higher-ed',
        network: 'network',
        events: 'events',
        financial: 'financial',
        wallet: 'wallet',
        insurance: 'financial',
        rentals: 'rentals',
        deals: 'deals',
        profile: 'profile',
      };
      const tab = tabMap[id] || id;
      router.replace(`${portalPath}?tab=${tab}` as any);
      return;
    }

    const target = ROUTE_MAP[id];
    if (!target) return;
    if (pathname === target) return;
    router.replace(target as any);
  };

  const onLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  // EMBEDDED MODE: skip outer chrome (sidebar/gradient/orbs/topbar/scroll)
  // because the parent portal already provides them. Render only hero + body.
  if (isEmbedded) {
    return (
      <View className="gap-5">
        {!hideHero && (
          <View
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: heroBorder, backgroundColor: heroBg, ...(Platform.OS === 'web' ? { boxShadow: heroBoxShadow } as any : {}) }}
          >
            <View className="flex-row items-center gap-4 p-7 min-h-[150px] relative z-10" style={!isWide ? { flexDirection: 'column', alignItems: 'flex-start', gap: 16 } : {}}>
              <View className="flex-1 min-w-0 gap-1.5">
                <View className="self-start bg-white/8 border border-white/15 rounded-xl px-2.5 py-1 mb-1" style={{ ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } as any : {}) }}>
                  <Text className="text-2xl">{heroEmoji}</Text>
                </View>
                <Text className="text-white font-body-bold text-2xl tracking-tight leading-8">{title}</Text>
                {!!subtitle && <Text className="font-body-medium text-sm mt-1" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 720 }}>{subtitle}</Text>}
              </View>
              {!!rightSlot && <View>{rightSlot}</View>}
            </View>
          </View>
        )}
        {children}
      </View>
    );
  }

  return (
    <View className="flex-row flex-1 overflow-hidden">
      <LinearGradient
        colors={pageBgColors as any}
        locations={SA.pageBgGradientStops as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      <SAWatermark size={850} top={30} right={-30} opacity={0.16} />

      <View pointerEvents="none" className="absolute rounded-full" style={{ top: -160, right: -140, width: 520, height: 520, backgroundColor: orbColor1, filter: 'blur(80px)' } as any} />
      <View pointerEvents="none" className="absolute rounded-full" style={{ top: 280, left: -180, width: 440, height: 440, backgroundColor: orbColor2, filter: 'blur(80px)' } as any} />

      {isWide && (
        role === 'student' ? (
          <StudentSidebar active={portalActiveId as any} onNav={onNav} onLogout={onLogout} />
        ) : role === 'alumni' ? (
          <AlumniSidebar active={portalActiveId as any} onNav={onNav} onLogout={onLogout} />
        ) : (
          <Sidebar
            navItems={NAV}
            activeId={activeId}
            onNav={onNav}
            brandSubtitle={brandSubtitle}
            bgColor={sidebarBg}
            railColor={railColor}
            user={user ? {
              initials,
              primary: user.full_name || 'Student',
              secondary: user.role === 'alumni' ? 'Alumni' : `${user.role === 'mentor' ? 'Mentor' : 'Batch 2022'} · ${user.career_path || 'job'}`,
              gradient: avatarGradient,
            } : undefined}
            onLogout={onLogout}
          />
        )
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: isWide ? 28 : 16, gap: 22 }}
      >
        <View className="flex-row items-center gap-2.5 pb-1">
          <View className="flex-1" />
          <Pressable
            className="rounded-full items-center justify-center"
            style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)', cursor: 'pointer' } as any : {}), ...(pressed ? { opacity: 0.7 } : {}) })}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={16} color="#fff" />
          </Pressable>
        </View>

        {!hideHero && (
          <View
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: heroBorder, backgroundColor: heroBg, ...(Platform.OS === 'web' ? { boxShadow: heroBoxShadow } as any : {}) }}
          >
            <View className="flex-row items-center gap-4 p-7 min-h-[150px] relative z-10" style={!isWide ? { flexDirection: 'column', alignItems: 'flex-start', gap: 16 } : {}}>
              <View className="flex-1 min-w-0 gap-1.5">
                <Text style={{ fontSize: 30 }}>{heroEmoji}</Text>
                <Text className="text-white font-body-bold tracking-tight leading-8" style={!isWide ? { fontSize: 22, lineHeight: 28 } : { fontSize: 28 }}>{title}</Text>
                {subtitle ? <Text className="font-body-medium text-sm mt-1" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 720 }}>{subtitle}</Text> : null}
              </View>
              {rightSlot}
            </View>
          </View>
        )}

        <View className="gap-4">{children}</View>
      </ScrollView>
    </View>
  );
}
