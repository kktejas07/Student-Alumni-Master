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
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import {
  ArrowLeft, Bell, Home as HomeIcon, Sparkles, Briefcase, BookOpen, Users,
  Calendar, Wallet, Shield, Building2, Gift, User as UserIcon, GraduationCap,
} from 'lucide-react-native';
import { Sidebar, NavItem } from '@/src/views/web/platform/components';
import { SA } from '@/src/views/web/platform/tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

/**
 * EmbeddedShellContext — set to true when this Shell is rendered INSIDE a
 * portal that already provides its own sidebar/gradient (e.g. StudentPortalRN).
 * In that case we skip the outer chrome and render only the hero + children.
 */
export const EmbeddedShellContext = React.createContext<boolean>(false);

// Single source of truth for sidebar navigation
const NAV: NavItem[] = [
  { id: 'home',              Icon: HomeIcon,       label: 'Dashboard',        color: '#A78BFA' },
  { id: 'career',            Icon: Sparkles,       label: 'Career AI',        color: '#A78BFA' },
  { id: 'internships',       Icon: Briefcase,      label: 'Internships',      color: '#34D399' },
  { id: 'courses',           Icon: BookOpen,       label: 'Courses',          color: '#22D3EE' },
  { id: 'higher-education',  Icon: GraduationCap,  label: 'Higher Education', color: '#FCD34D' },
  { id: 'network',           Icon: Users,          label: 'Network',          color: '#F472B6' },
  { id: 'events',            Icon: Calendar,       label: 'Events',           color: '#FB923C' },
  { id: 'financial',         Icon: Wallet,         label: 'Financial',        color: '#FCD34D' },
  { id: 'wallet',            Icon: Wallet,         label: 'Wallet',           color: '#86EFAC' },
  { id: 'insurance',         Icon: Shield,         label: 'Insurance',        color: '#60A5FA' },
  { id: 'rentals',           Icon: Building2,      label: 'Rentals',          color: '#A78BFA' },
  { id: 'deals',             Icon: Gift,           label: 'Deals',            color: '#F472B6' },
  { id: 'profile',           Icon: UserIcon,       label: 'Profile',          color: '#A78BFA' },
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
  profile: '/me',
};

// Reverse map: which NAV id is "active" for a given pathname
function activeIdForPath(path: string): string {
  if (path.startsWith('/platform')) return 'home';
  if (path.startsWith('/career-ai')) return 'career';
  if (path.startsWith('/internships')) return 'internships';
  if (path.startsWith('/explore-courses') || path.startsWith('/courses')) return 'courses';
  if (path.startsWith('/higher-education')) return 'higher-education';
  if (path.startsWith('/network')) return 'network';
  if (path.startsWith('/events')) return 'events';
  if (path.startsWith('/financial')) return 'financial';
  if (path.startsWith('/wallet')) return 'wallet';
  if (path.startsWith('/rentals')) return 'rentals';
  if (path.startsWith('/deals')) return 'deals';
  if (path.startsWith('/me')) return 'profile';
  return '';
}

export default function FeaturePageShell({
  title, subtitle, accent = SA.purpleLight,
  heroEmoji = '✨',
  children,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  heroEmoji?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;
  const isEmbedded = React.useContext(EmbeddedShellContext);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initials = (user?.full_name || 'SA').split(' ').slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
  const activeId = activeIdForPath(pathname || '');

  const onNav = (id: string) => {
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
      <View style={{ gap: 22 }}>
        <View style={styles.heroShell}>
          <View pointerEvents="none" style={[styles.heroOrb, { width: 280, height: 280, top: -80, right: -40, backgroundColor: 'rgba(176,127,223,0.22)' }]} />
          <View pointerEvents="none" style={[styles.heroOrb, { width: 180, height: 180, bottom: -50, left: 20, backgroundColor: 'rgba(212,170,255,0.18)' }]} />
          <View style={[styles.heroBody, !isWide && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{heroEmoji}</Text></View>
              <Text style={styles.heroTitle}>{title}</Text>
              {!!subtitle && <Text style={styles.heroSub}>{subtitle}</Text>}
            </View>
            {!!rightSlot && <View>{rightSlot}</View>}
          </View>
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* Full-page purple gradient — identical to /platform dashboard */}
      <LinearGradient
        colors={SA.pageBgStudent as any}
        locations={SA.pageBgGradientStops as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient floating purple orbs for depth */}
      <View pointerEvents="none" style={[styles.ambientOrb, { top: -160, right: -140, width: 520, height: 520, backgroundColor: 'rgba(176,127,223,0.22)' }]} />
      <View pointerEvents="none" style={[styles.ambientOrb, { top: 280, left: -180, width: 440, height: 440, backgroundColor: 'rgba(95,37,159,0.28)' }]} />

      {/* Persistent sidebar — same as Student Dashboard */}
      {isWide && (
        <Sidebar
          navItems={NAV}
          activeId={activeId}
          onNav={onNav}
          brandSubtitle="Web Dashboard"
          bgColor={SA.sideStudent}
          railColor={SA.railStudent}
          user={user ? {
            initials,
            primary: user.full_name || 'Student',
            secondary: `${user.role === 'alumni' ? 'Alumni' : 'Batch 2022'} · ${user.career_path || 'job'}`,
          } : undefined}
          onLogout={onLogout}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isWide ? 28 : 16, gap: 22 }}
      >
        {/* Top bar — bell only (back button removed; sidebar is the nav) */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <View style={styles.bellBtn}><Bell size={16} color="#fff" /></View>
        </View>

        {/* Hero — glass card */}
        <View style={styles.heroShell}>
          <View pointerEvents="none" style={[styles.heroOrb, { width: 280, height: 280, top: -80, right: -40, backgroundColor: 'rgba(176,127,223,0.22)' }]} />
          <View pointerEvents="none" style={[styles.heroOrb, { width: 180, height: 180, bottom: -50, left: 20, backgroundColor: 'rgba(212,170,255,0.18)' }]} />

          <View style={[styles.heroBody, !isWide && { flexDirection: 'column', alignItems: 'flex-start', gap: 16 }]}>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text style={styles.heroEmoji}>{heroEmoji}</Text>
              <Text style={[styles.heroTitle, !isWide && { fontSize: 22, lineHeight: 28 }]}>{title}</Text>
              {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
            </View>
            {rightSlot}
          </View>
        </View>

        {/* Page body */}
        <View style={{ gap: 18 }}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ambientOrb: {
    position: 'absolute',
    borderRadius: 9999,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as any) : {}),
  },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, height: 32, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1,
    ...({ backdropFilter: 'blur(12px)', cursor: 'pointer' } as any),
  },
  backText: { color: '#fff', fontFamily: SA.fontBold, fontSize: 11.5 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ backdropFilter: 'blur(12px)' } as any),
  },

  heroShell: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(176,127,223,0.30)',
    backgroundColor: 'rgba(95,37,159,0.28)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px -12px rgba(95,37,159,0.40), 0 0 0 1px rgba(176,127,223,0.15) inset',
        } as any)
      : {}),
  },
  heroBody: {
    padding: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    minHeight: 150,
    zIndex: 2,
  },
  heroOrb: { position: 'absolute', borderRadius: 9999 },
  heroEmoji: { fontSize: 30 },
  heroTitle: {
    color: '#fff',
    fontFamily: SA.fontBold,
    fontSize: 28,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: SA.fontMedium,
    fontSize: 14,
    marginTop: 4,
    maxWidth: 720,
  },
});
