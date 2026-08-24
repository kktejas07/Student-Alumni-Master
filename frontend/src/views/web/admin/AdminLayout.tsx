/**
 * AdminLayout — shared sidebar + header shell for /admin/* pages.
 * Glass amber theme per Super Admin spec.
 */
import { ReactNode, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
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

  useEffect(() => {
    if (user.role !== 'admin') router.replace('/welcome' as any);
  }, [user]);

  const isActive = (route: string) =>
    route === '/admin' ? (pathname === '/admin' || pathname === '/admin/') : pathname.startsWith(route);

  return (
    <View className="flex-row flex-1" style={{ minHeight: '100%', backgroundColor: T.dark }}>
      <View className="absolute inset-0" style={{ backgroundColor: T.bg }} />

      <View style={{ width: 220, height: '100%', backgroundColor: 'rgba(13,8,0,0.85)', borderRightColor: T.border, borderRightWidth: 1, ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)' } as any) : {}) }}>
        <View className="flex-row items-center gap-3" style={{ padding: 18, borderBottomColor: T.border, borderBottomWidth: 1 }}>
          <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: T.accent, ...(Platform.OS === 'web' ? ({ backgroundImage: `linear-gradient(135deg,${T.accent},${T.mid})` } as any) : {}) }}>
            <Text style={{ color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13, letterSpacing: 0.5 }}>SA</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text font-body-bold text-sm" style={{ letterSpacing: -0.2 }}>Student Alumni</Text>
            <Text style={{ color: T.pale, fontFamily: 'DMSans_700Bold', fontSize: 9.5, letterSpacing: 1.4, marginTop: 2 }}>SUPERADMIN</Text>
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
                className="flex-row items-center gap-3 rounded-lg mb-0.5"
                style={{ paddingHorizontal: 12, paddingVertical: 9, ...(active ? { backgroundColor: T.glassMd, borderColor: T.borderMd, borderWidth: 1 } : {}), ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '120ms' } as any) : {}) }}
              >
                <Icon size={17} color={active ? T.light : 'rgba(255,255,255,0.55)'} />
                <Text style={{ flex: 1, color: active ? T.text : 'rgba(255,255,255,0.65)', fontFamily: active ? 'DMSans_700Bold' : 'DMSans_500Medium', fontSize: 13 }}>
                  {n.label}
                </Text>
                {!!badge && badge > 0 && (
                  <View className="items-center justify-center" style={{ minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: T.accent }}>
                    <Text style={{ color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 10 }}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ padding: 12 }}>
          <View className="flex-row items-center gap-3" style={{ padding: 10, borderRadius: 12, backgroundColor: T.glass, borderColor: T.border, borderWidth: 1 }}>
            <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: T.accent, ...(Platform.OS === 'web' ? ({ backgroundImage: `linear-gradient(135deg,${T.accent},${T.mid})` } as any) : {}) }}>
              <Text style={{ color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13, letterSpacing: 0.5 }}>{(user?.full_name || 'SA').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text font-body-bold text-xs" numberOfLines={1}>{user?.full_name || 'Super Admin'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', fontSize: 10, marginTop: 2 }} numberOfLines={1}>{user?.email}</Text>
            </View>
            <Pressable onPress={logout} testID="admin-signout" hitSlop={8}>
              <LogOut size={14} color="rgba(255,255,255,0.45)" />
            </Pressable>
          </View>
        </View>
      </View>

      <View className="flex-1" style={{ minWidth: 0, height: '100%' }}>
        <View className="flex-row items-center" style={{ height: 64, paddingHorizontal: 24, gap: 12, borderBottomColor: T.border, borderBottomWidth: 1, backgroundColor: 'rgba(13,8,0,0.45)', ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as any) : {}) }}>
          <View className="flex-1">
            <Text className="text-text font-body-bold" style={{ fontSize: 20, letterSpacing: -0.3 }} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>}
          </View>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-2" style={{ paddingHorizontal: 10, height: 38, borderRadius: 10, width: 220, backgroundColor: T.glass, borderColor: T.border, borderWidth: 1 }}>
              <Search size={14} color="rgba(255,255,255,0.45)" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'DMSans_400Regular', fontSize: 12 }}>Search…</Text>
            </View>
            <Pressable className="items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: T.glass, borderColor: T.border, borderWidth: 1, position: 'relative' }} hitSlop={6}>
              <Bell size={16} color="rgba(255,255,255,0.75)" />
              <View className="absolute" style={{ top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: T.bad }} />
            </Pressable>
            <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: T.accent, ...(Platform.OS === 'web' ? ({ backgroundImage: `linear-gradient(135deg,${T.accent},${T.mid})` } as any) : {}) }}>
              <Text style={{ color: T.text, fontFamily: 'DMSans_700Bold', fontSize: 13, letterSpacing: 0.5 }}>{(user?.full_name || 'SA').slice(0, 2).toUpperCase()}</Text>
            </View>
            {rightAction}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 64 }}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
