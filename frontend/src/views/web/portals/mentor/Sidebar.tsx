/**
 * Mentor Portal Sidebar — RN port of the spec sidebar.
 * Hamburger collapse, mentor mini-profile, nav with counts, sign-out.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import {
  Menu, LayoutDashboard, Users, Calendar, UserPlus, Network, Coins,
  Star as StarIcon, Plus, User as UserIcon, QrCode, ExternalLink, LogOut,
  Clock, Sparkles,
} from 'lucide-react-native';
import { MC, FONTS } from './tokens';
import { MENTOR } from './data';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { router } from 'expo-router';
import { SALogo } from '@/src/views/components';

export type NavId = 'dashboard'|'students'|'sessions'|'requests'|'network'|'earnings'|'feedback'|'event'|'availability'|'profile'|'ai-studio';

export interface NavSpec { id: NavId; label: string; Icon: any; count?: number; alert?: boolean }

export const NAV_MAIN: (counts: { students: number; sessions: number; requests: number }) => NavSpec[] = ({ students, sessions, requests }) => [
  { id: 'dashboard',    label: 'Dashboard',        Icon: LayoutDashboard },
  { id: 'ai-studio',    label: 'AI Studio',        Icon: Sparkles },
  { id: 'students',     label: 'My Connections',   Icon: Users,    count: students },
  { id: 'sessions',     label: 'Sessions',         Icon: Calendar, count: sessions },
  { id: 'requests',     label: 'Session Requests', Icon: UserPlus, count: requests, alert: true },
  { id: 'network',      label: 'Network',          Icon: Network },
  { id: 'earnings',     label: 'Earnings',         Icon: Coins },
  { id: 'feedback',     label: 'Feedback',         Icon: StarIcon },
  { id: 'event',        label: 'Create Event',     Icon: Plus },
  { id: 'profile',      label: 'Profile',          Icon: UserIcon },
];

export function Sidebar({
  active, onNav, collapsed, onToggle, onLogout, counts,
}: {
  active: NavId;
  onNav: (id: NavId) => void;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  counts: { students: number; sessions: number; requests: number };
}) {
  const user = useAuthStore((u) => u.user) as any;
  const fullName = (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`).trim() || MENTOR.name;
  const initials = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || MENTOR.avatar).toUpperCase();
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;
  const role = user?.mentor_info?.current_role || user?.mentor_info?.job_title || user?.current_role || user?.headline || MENTOR.role;
  const jobTitle = role;
  const company = user?.mentor_info?.current_company || user?.mentor_info?.organization || user?.current_company || MENTOR.company;

  const items = NAV_MAIN(counts);
  const w = collapsed ? 56 : 220;

  return (
    <LinearGradient
      colors={['#4338ca', '#6d28d9'] as any}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[s.sidebar, { width: w }]}
    >
      {/* Hamburger + brand */}
      <View style={s.brandRow} nativeID="mentor-brand">
        <Pressable onPress={onToggle} style={({ hovered }: any) => [s.hamburger, hovered && { backgroundColor: 'rgba(20,184,166,0.10)' }]}>
          <Menu size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
        {!collapsed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <SALogo size={32} variant="glass" />
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={s.brandTitle} numberOfLines={1}>Mentor Portal</Text>
              <Text style={s.brandSub} numberOfLines={1}>Student Alumni</Text>
            </View>
          </View>
        )}
      </View>

      {/* Mentor mini-profile + Mentor Card widget */}
      <View style={s.profileRow}>
        {collapsed ? (
          <Pressable
            onPress={() => onNav('profile')}
            style={({ pressed }: any) => [
              { alignItems: 'center', paddingVertical: 4 },
              pressed && { opacity: 0.8 }
            ]}
          >
            <View style={[s.avatarMini, { overflow: 'hidden' }]}>
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>{initials}</Text>
              )}
              <View style={s.onlineDot} />
            </View>
          </Pressable>
        ) : (
          <View style={s.profileCard}>
            <Pressable
              onPress={() => onNav('profile')}
              style={({ pressed }: any) => [
                { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
                pressed && { opacity: 0.8 }
              ]}
            >
              <View style={[s.avatarLg, { overflow: 'hidden' }]}>
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>{initials}</Text>
                )}
                <View style={s.onlineDot} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11 }}>{fullName}</Text>
                <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 9 }}>{jobTitle} · {company}</Text>
              </View>
            </Pressable>
            <Pressable 
              onPress={() => router.push('/id-card')}
              style={({ hovered }: any) => [s.idCard, hovered && { backgroundColor: 'rgba(20,184,166,0.15)' }]}
            >
              <QrCode size={13} color={MC.tealP} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 11 }}>My Mentor Card</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.med, fontSize: 9 }}>Share your profile</Text>
              </View>
              <ExternalLink size={11} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Agent K launcher (Chunk 2 — mentor portal) */}
      <AgentKLauncher collapsed={collapsed} />

      {/* Main nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: collapsed ? 4 : 6, paddingVertical: 4 }} showsVerticalScrollIndicator={false}>
        {!collapsed && <Text style={s.kicker}>MAIN MENU</Text>}
        {items.map((n) => {
          const isActive = active === n.id;
          const tint = isActive ? MC.tealP : 'rgba(255,255,255,0.7)';
          return (
            <Pressable
              key={n.id}
              onPress={() => onNav(n.id)}
              nativeID={`mentor-nav-${n.id}`}
              style={({ hovered }: any) => [
                s.navRow,
                { padding: collapsed ? 9 : 11, justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 11 },
                isActive && s.navRowActive,
                hovered && !isActive && { backgroundColor: 'rgba(255,255,255,0.08)' },
              ]}
            >
              <n.Icon size={16} color={tint} />
              {!collapsed && (
                <Text style={{ flex: 1, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', fontFamily: isActive ? FONTS.bold : FONTS.med, fontSize: 13 }}>
                  {n.label}
                </Text>
              )}
              {!collapsed && !!n.count && (
                <View style={[s.countPill, n.alert ? s.countPillAlert : null]}>
                  <Text style={{ color: n.alert ? '#FCD34D' : MC.tealP, fontFamily: FONTS.xbold, fontSize: 10 }}>{n.count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Logout */}
      <Pressable
        onPress={onLogout}
        testID="logout-button"
        style={({ hovered }: any) => [s.logoutRow,
          { justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 11, padding: collapsed ? 11 : 12 },
          hovered && { backgroundColor: 'rgba(239,68,68,0.10)' },
        ]}
      >
        <LogOut size={15} color={'#FCA5A5'} />
        {!collapsed && (
          <Text style={{ color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12 }}>Sign out</Text>
        )}
      </Pressable>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ transitionDuration: '220ms', transitionProperty: 'width' } as any) : {}),
  },
  brandRow: {
    height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  hamburger: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  brandLogo: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13, transform: [{ translateY: -1 }] },
  brandTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  brandSub: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.5 },

  profileRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', backdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } as any) : {}),
  },
  avatarMini: {
    position: 'relative',
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(20,184,166,0.20)',
    borderColor: MC.teal, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  avatarLg: {
    position: 'relative',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(20,184,166,0.20)',
    borderColor: MC.teal, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: MC.green, borderColor: '#5D3FD3', borderWidth: 2,
  },
  idCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 10, padding: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', backdropFilter: 'blur(8px)' } as any) : {}),
  },
  kicker: { color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1.5, padding: 10, marginTop: 4 },
  navRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, marginVertical: 3, borderWidth: 1, borderColor: 'transparent' },
  navRowActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderTopColor: 'rgba(255,255,255,0.35)',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)' } as any) : {}),
  },
  countPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
  },
  countPillAlert: { backgroundColor: 'rgba(245,158,11,0.3)', borderColor: 'rgba(245,158,11,0.5)' },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
