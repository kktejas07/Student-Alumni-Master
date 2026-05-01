/**
 * AdminLayout — shared sidebar + header shell for /admin/* pages.
 * Glass amber theme per Super Admin spec.
 */
import { ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  LayoutGrid, Building2, GraduationCap, Users, Briefcase, CalendarDays,
  Wallet, BarChart3, ShieldCheck, Settings, Bell, Search, LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { ADMIN_THEME as T } from './theme';

type NavItem = {
  key: string; label: string; route: string; icon: any; badge?: number;
};

const NAV: NavItem[] = [
  { key: 'overview',  label: 'Overview',   route: '/admin',           icon: LayoutGrid },
  { key: 'colleges',  label: 'Colleges',   route: '/admin/colleges',  icon: Building2 },
  { key: 'students',  label: 'Students',   route: '/admin/students',  icon: GraduationCap },
  { key: 'mentors',   label: 'Mentors',    route: '/admin/mentors',   icon: Users },
  { key: 'alumni',    label: 'Alumni',     route: '/admin/alumni',    icon: Briefcase },
  { key: 'events',    label: 'Events',     route: '/admin/events',    icon: CalendarDays },
  { key: 'payments',  label: 'Payments',   route: '/admin/payments',  icon: Wallet },
  { key: 'analytics', label: 'Analytics',  route: '/admin/analytics', icon: BarChart3 },
  { key: 'approvals', label: 'Approvals',  route: '/admin/approvals', icon: ShieldCheck },
  { key: 'settings',  label: 'Settings',   route: '/admin/settings',  icon: Settings },
];

interface Props {
  title: string;
  subtitle?: string;
  pendingCount?: number;
  children: ReactNode;
  rightAction?: ReactNode;
}

export function AdminLayout({ title, subtitle, pendingCount = 0, children, rightAction }: Props) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { user, logout } = useAuthStore();

  // Gate — non-admins redirected to platform
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/');
  }, [user]);

  const isActive = (route: string) =>
    route === '/admin' ? (pathname === '/admin' || pathname === '/admin/') : pathname.startsWith(route);

  return (
    <View style={[styles.root, { backgroundColor: T.dark }]}>
      {/* gradient bg layer */}
      <View style={[StyleSheet.absoluteFill, Platform.OS === 'web' ? ({ backgroundColor: T.bg } as any) : { backgroundColor: T.dark }]} />

      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sideTop}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>SA</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.brand}>Student Alumni</Text>
            <Text style={styles.brandSub}>SUPERADMIN</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
          {NAV.map((n) => {
            const active = isActive(n.route);
            const Icon = n.icon;
            const badge = n.key === 'approvals' ? pendingCount : 0;
            return (
              <Pressable
                key={n.key}
                onPress={() => router.push(n.route as any)}
                testID={`admin-nav-${n.key}`}
                style={({ hovered }: any) => [
                  styles.navItem,
                  active && styles.navItemActive,
                  hovered && !active && { backgroundColor: 'rgba(245,158,11,0.08)' },
                ]}
              >
                <Icon size={17} color={active ? T.light : 'rgba(255,255,255,0.55)'} />
                <Text style={[styles.navLabel, active && { color: T.text, fontFamily: 'DMSans_700Bold' }]}>
                  {n.label}
                </Text>
                {!!badge && badge > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* User card at bottom */}
        <View style={{ padding: 12 }}>
          <View style={styles.userCard}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>{(user?.full_name || 'SA').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userName} numberOfLines={1}>{user?.full_name || 'Super Admin'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
            <Pressable onPress={logout} testID="admin-signout" hitSlop={8}>
              <LogOut size={14} color="rgba(255,255,255,0.45)" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Main */}
      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text>}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.searchBar}>
              <Search size={14} color="rgba(255,255,255,0.45)" />
              <Text style={styles.searchText}>Search…</Text>
            </View>
            <Pressable style={styles.bellBtn} hitSlop={6}>
              <Bell size={16} color="rgba(255,255,255,0.75)" />
              <View style={styles.bellDot} />
            </Pressable>
            <View style={[styles.logoBox, { width: 38, height: 38, borderRadius: 11 }]}>
              <Text style={styles.logoText}>{(user?.full_name || 'SA').slice(0, 2).toUpperCase()}</Text>
            </View>
            {rightAction}
          </View>
        </View>

        {/* Page content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 64 }}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', minHeight: '100%' as any },
  // ── Sidebar
  sidebar: {
    width: 220, height: '100%' as any,
    backgroundColor: 'rgba(13,8,0,0.85)',
    borderRightColor: T.border, borderRightWidth: 1,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)' } as any) : {}),
  },
  sideTop: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 18, borderBottomColor: T.border, borderBottomWidth: 1,
  },
  logoBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ backgroundImage: `linear-gradient(135deg,${T.accent},${T.mid})` } as any) : {}),
  },
  logoText: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13, letterSpacing: 0.5 },
  brand: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13, letterSpacing: -0.2 },
  brandSub: { color: T.pale, fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 1.4, marginTop: 2 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, marginBottom: 2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '120ms' } as any) : {}),
  },
  navItemActive: {
    backgroundColor: T.glassMd,
    borderColor: T.borderMd, borderWidth: 1,
  },
  navLabel: {
    flex: 1, color: 'rgba(255,255,255,0.65)',
    fontFamily: 'DMSans_500Medium', fontSize: 13,
  },
  navBadge: {
    minWidth: 18, height: 18, paddingHorizontal: 5,
    borderRadius: 9, backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  navBadgeText: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 10 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12,
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1,
  },
  userName: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 12 },
  userEmail: { color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 2 },

  // ── Main / Header
  main: { flex: 1, minWidth: 0, height: '100%' as any },
  header: {
    height: 64, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, gap: 12,
    borderBottomColor: T.border, borderBottomWidth: 1,
    backgroundColor: 'rgba(13,8,0,0.45)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}),
  },
  headerTitle: { color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 20, letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, height: 38, borderRadius: 10, width: 220,
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1,
  },
  searchText: { color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular', fontSize: 12 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.glass, borderColor: T.border, borderWidth: 1, position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9, width: 8, height: 8,
    borderRadius: 4, backgroundColor: T.bad,
  },
});
