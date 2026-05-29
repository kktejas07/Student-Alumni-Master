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

export type NavId = 'dashboard'|'students'|'sessions'|'requests'|'network'|'earnings'|'feedback'|'event'|'availability'|'profile'|'ai-studio';

export interface NavSpec { id: NavId; label: string; Icon: any; count?: number; alert?: boolean }

export const NAV_MAIN: (counts: { students: number; sessions: number; requests: number }) => NavSpec[] = ({ students, sessions, requests }) => [
  { id: 'dashboard',    label: 'Dashboard',        Icon: LayoutDashboard },
  { id: 'ai-studio',    label: 'AI Studio',        Icon: Sparkles },
  { id: 'students',     label: 'My Connections',   Icon: Users,    count: students },
  { id: 'sessions',     label: 'Sessions',         Icon: Calendar, count: sessions },
  { id: 'availability', label: 'Set Availability', Icon: Clock },
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
  const items = NAV_MAIN(counts);
  const w = collapsed ? 56 : 220;

  const user = useAuthStore((u) => u.user) as any;
  const fullName = (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`).trim() || MENTOR.name;
  const initials = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || MENTOR.avatar).toUpperCase();
  const photo = user?.photo_data || user?.face_image_base64;
  const role = user?.mentor_info?.current_role || user?.current_role || MENTOR.role;
  const company = user?.mentor_info?.current_company || user?.current_company || MENTOR.company;

  return (
    <View style={[s.sidebar, { width: w }]}>
      {/* Hamburger + brand */}
      <View style={s.brandRow} nativeID="mentor-brand">
        <Pressable onPress={onToggle} style={({ hovered }: any) => [s.hamburger, hovered && { backgroundColor: 'rgba(20,184,166,0.10)' }]}>
          <Menu size={18} color={MC.muted} />
        </Pressable>
        {!collapsed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <LinearGradient colors={[MC.teal, MC.tealD] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.brandLogo}>
              <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 11, letterSpacing: -0.5 }}>SA</Text>
            </LinearGradient>
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
                <Text numberOfLines={1} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 9 }}>{role} · {company}</Text>
              </View>
            </Pressable>
            <Pressable style={({ hovered }: any) => [s.idCard, hovered && { backgroundColor: 'rgba(20,184,166,0.15)' }]}>
              <QrCode size={13} color={MC.tealP} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>My Mentor Card</Text>
                <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 9 }}>Share your profile</Text>
              </View>
              <ExternalLink size={11} color={MC.dim} />
            </Pressable>
          </Pressable>
        )}
      </View>

      {/* Agent K launcher (Chunk 2 — mentor portal) */}
      <AgentKLauncher collapsed={collapsed} />

      {/* Main nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: collapsed ? 4 : 6, paddingVertical: 4 }}>
        {!collapsed && <Text style={s.kicker}>MAIN MENU</Text>}
        {items.map((n) => {
          const isActive = n.id === active;
          const tint = isActive ? MC.tealP : MC.muted;
          return (
            <Pressable
              key={n.id}
              onPress={() => onNav(n.id)}
              nativeID={`mentor-nav-${n.id}`}
              style={({ hovered }: any) => [
                s.navRow,
                { padding: collapsed ? 9 : 11, justifyContent: collapsed ? 'center' : 'flex-start', gap: collapsed ? 0 : 11 },
                isActive && { backgroundColor: 'rgba(20,184,166,0.12)' },
                hovered && !isActive && { backgroundColor: 'rgba(255,255,255,0.04)' },
              ]}
            >
              <n.Icon size={16} color={tint} />
              {!collapsed && (
                <Text style={{ flex: 1, color: isActive ? '#fff' : MC.muted, fontFamily: isActive ? FONTS.bold : FONTS.med, fontSize: 13 }}>
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
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    backgroundColor: MC.bg2,
    borderRightWidth: 1,
    borderRightColor: MC.border,
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({ transitionDuration: '220ms', transitionProperty: 'width' } as any) : {}),
  },
  brandRow: {
    height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: MC.border,
  },
  hamburger: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any),
  },
  brandLogo: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  brandSub: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.5 },

  profileRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: MC.border },
  profileCard: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
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
    backgroundColor: MC.green, borderColor: MC.bg2, borderWidth: 2,
  },
  idCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(20,184,166,0.08)',
    borderColor: MC.border, borderWidth: 1,
    borderRadius: 8, padding: 9,
    ...({ cursor: 'pointer' } as any),
  },
  kicker: { color: MC.dim, fontFamily: FONTS.xbold, fontSize: 9, letterSpacing: 1.2, padding: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, marginVertical: 2 },
  countPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(20,184,166,0.14)',
  },
  countPillAlert: { backgroundColor: 'rgba(245,158,11,0.24)' },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: MC.border,
  },
});
