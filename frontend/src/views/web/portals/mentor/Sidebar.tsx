/**
 * Mentor Portal Sidebar — RN port of the spec sidebar.
 * Hamburger collapse, mentor mini-profile, nav with counts, sign-out.
 */
import React from 'react';
import { View, Text, Pressable, Platform, ScrollView } from 'react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import {
  Menu, LayoutDashboard, Users, Calendar, UserPlus, Network, Coins,
  Star as StarIcon, Plus, User as UserIcon, QrCode, ExternalLink, LogOut,
  Sparkles,
} from 'lucide-react-native';
import { MC, FONTS } from './tokens';
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
  const fullName = displayName(user);
  const initials = displayInitials(user);
  const role = user?.mentor_info?.current_role || user?.mentor_info?.job_title || user?.current_role || user?.headline || 'Mentor';
  const jobTitle = role;
  const company = user?.mentor_info?.current_company || user?.mentor_info?.organization || user?.current_company || '';

  const items = NAV_MAIN(counts);
  const w = collapsed ? 56 : 220;

  return (
    <View className="bg-bg2 border-r border-glass-border flex-shrink h-full overflow-hidden" style={[{ width: w }, Platform.OS === 'web' ? { transitionDuration: '220ms', transitionProperty: 'width' } as any : undefined]}>
      {/* Hamburger + brand */}
      <View className="h-14 flex-row items-center gap-2.5 px-3 border-b border-glass-border" nativeID="mentor-brand">
        <Pressable onPress={onToggle} className="w-8 h-8 rounded-lg items-center justify-center" style={({ hovered }: any) => hovered ? { backgroundColor: 'rgba(20,184,166,0.10)' } : undefined}>
          <Menu size={18} color={MC.muted} />
        </Pressable>
        {!collapsed && (
          <View className="flex-row items-center gap-2 flex-1 min-w-0">
            <SALogo size={32} variant="glass" />
            <View className="min-w-0 flex-1">
              <Text className="text-white font-display-bold text-xs" numberOfLines={1}>Mentor Portal</Text>
              <Text className="text-muted font-body-bold text-[9px] tracking-[0.5px]" numberOfLines={1}>Student Alumni</Text>
            </View>
          </View>
        )}
      </View>

      {/* Mentor mini-profile + Mentor Card widget */}
      <View className="p-2.5 border-b border-glass-border">
        {collapsed ? (
          <Pressable
            onPress={() => onNav('profile')}
            className="items-center py-1"
            style={({ pressed }: any) => pressed ? { opacity: 0.8 } : undefined}
          >
            <Text className="text-white font-display-bold text-xs">{initials}</Text>
          </Pressable>
        ) : (
          <View className="bg-card border border-glass-border rounded-xl p-2.5" style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}>
            <View className="items-center mb-2">
              <Text numberOfLines={1} className="text-white font-display-bold text-[11px] text-center">{fullName}</Text>
              <Text numberOfLines={1} className="text-muted font-body-semibold text-[9px] text-center mt-0.5">{jobTitle} · {company}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/id-card')}
              className="flex-row items-center gap-1.5 bg-teal/[0.08] border border-glass-border rounded-lg p-2"
              style={({ hovered }: any) => hovered ? { backgroundColor: 'rgba(20,184,166,0.15)' } : undefined}
            >
              <QrCode size={13} color={MC.tealP} />
              <View className="flex-1 min-w-0">
                <Text className="text-tealP font-body-bold text-[11px]">My Mentor Card</Text>
                <Text className="text-dim font-body-semibold text-[9px]">Share your profile</Text>
              </View>
              <ExternalLink size={11} color={MC.dim} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Agent K launcher (Chunk 2 — mentor portal) */}
      <AgentKLauncher collapsed={collapsed} />

      {/* Main nav */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: collapsed ? 4 : 6, paddingVertical: 4 }} showsVerticalScrollIndicator={false}>
        {!collapsed && <Text className="text-dim font-display-bold text-[9px] tracking-[1.2px] p-2">MAIN MENU</Text>}
        {items.map((n) => {
          const isActive = active === n.id;
          const tint = isActive ? MC.tealP : MC.muted;
          return (
            <Pressable
              key={n.id}
              onPress={() => onNav(n.id)}
              nativeID={`mentor-nav-${n.id}`}
              className="flex-row items-center rounded-lg my-0.5"
              style={({ hovered }: any) => ({
                padding: collapsed ? 9 : 11,
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 11,
                ...(isActive ? { backgroundColor: 'rgba(20,184,166,0.12)' } : {}),
                ...(!isActive && hovered ? { backgroundColor: 'rgba(255,255,255,0.04)' } : {}),
              })}
            >
              <n.Icon size={16} color={tint} />
              {!collapsed && (
                <Text className="flex-1 text-[13px]" style={{ color: isActive ? '#fff' : MC.muted, fontFamily: isActive ? FONTS.bold : FONTS.med }}>
                  {n.label}
                </Text>
              )}
              {!collapsed && !!n.count && (
                <View className={`px-[7px] py-0.5 rounded-lg ${n.alert ? 'bg-amber/[0.24]' : 'bg-teal/[0.14]'}`}>
                  <Text className="text-[10px] font-display-bold" style={{ color: n.alert ? '#FCD34D' : MC.tealP }}>{n.count}</Text>
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
        className="flex-row items-center border-t border-glass-border"
        style={({ hovered }: any) => ({
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: collapsed ? 0 : 11,
          padding: collapsed ? 11 : 12,
          ...(hovered ? { backgroundColor: 'rgba(239,68,68,0.10)' } : {}),
        })}
      >
        <LogOut size={15} color={'#FCA5A5'} />
        {!collapsed && (
          <Text className="text-rose font-body-bold text-xs">Sign out</Text>
        )}
      </Pressable>
    </View>
  );
}
