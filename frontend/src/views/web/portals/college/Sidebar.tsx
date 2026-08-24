import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  LayoutDashboard, GraduationCap, Users, UserCheck, Calendar, Megaphone,
  BarChart3, Sparkles, Briefcase, Trophy, User, ExternalLink, LogOut, Plus,
} from 'lucide-react-native';
import { CC } from './tokens';
import { Av, Badge } from './atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName } from '@/src/lib/portalHome';
import { request, api } from '@/src/models/services/api';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { SALogo } from '@/src/views/components';

export type CollegeNavId =
  | 'dashboard' | 'students' | 'alumni' | 'mentors' | 'events' | 'create-event'
  | 'announcements' | 'analytics' | 'ai-insights' | 'career-intel'
  | 'placements' | 'profile';

export const NAV: Array<{ id: CollegeNavId; label: string; Icon: any; count?: number }> = [
  { id: 'dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
  { id: 'students',      label: 'Students',      Icon: GraduationCap },
  { id: 'alumni',        label: 'Alumni',        Icon: Users },
  { id: 'mentors',       label: 'Mentors',       Icon: UserCheck },
  { id: 'events',        label: 'Events',        Icon: Calendar },
  { id: 'create-event',  label: 'Create Event',  Icon: Plus },
  { id: 'announcements', label: 'Announcements', Icon: Megaphone },
  { id: 'analytics',     label: 'Analytics',     Icon: BarChart3 },
  { id: 'ai-insights',   label: 'AI Insights',   Icon: Sparkles },
  { id: 'career-intel',  label: 'Career Intel',  Icon: Briefcase },
  { id: 'placements',    label: 'Placements',    Icon: Trophy },
  { id: 'profile',       label: 'Profile',       Icon: User },
];

const getInitials = (name: string) => {
  if (!name) return 'CO';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function Sidebar({
  active, onNav, onLogout,
}: { active: CollegeNavId; onNav: (id: CollegeNavId) => void; onLogout: () => void }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const collegeName = user?.college_info?.institution_name || user?.school_info?.institution_name || displayName(user);
  const collegeInitials = getInitials(collegeName);
  const collegeRank = user?.college_info?.accreditation || user?.college_info?.accreditations?.[0] || '';

  const [counts, setCounts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    api.pendingMentors().then((r) => {
      const n = Array.isArray(r) ? r.length : (r?.items?.length || 0);
      setCounts((c) => ({ ...c, mentors: n }));
    }).catch(() => {});

    const eventsPath = collegeName ? `/college/events?college_name=${encodeURIComponent(collegeName)}` : '/college/events';
    request<any>(eventsPath).then((r) => {
      setCounts((c) => ({ ...c, events: r?.items?.length || 0 }));
    }).catch(() => {});

    request<any>('/college/announcements').then((r) => {
      setCounts((c) => ({ ...c, announcements: r?.items?.length || 0 }));
    }).catch(() => {});

    request<any>('/college/ai-insights').then((r) => {
      setCounts((c) => ({ ...c, 'ai-insights': r?.items?.length || 0 }));
    }).catch(() => {});
  }, [collegeName]);

  return (
    <View className="w-[240px] h-full bg-glass border-r border-glass-border px-3 pt-[14px] pb-3">
      <View className="flex-row items-center gap-[10px] mb-4 px-1" nativeID="college-brand">
        <SALogo size={32} variant="glass" />
        <View className="flex-1 min-w-0" style={{ flex: 1, minWidth: 0 }}>
          <Text className="text-text font-display-bold text-[13.5px] tracking-tight">Admin Portal</Text>
          <Text className="text-muted font-body text-[10.5px]">Student Alumni</Text>
        </View>
      </View>

      <View className="bg-glass-soft border border-glass-border rounded-xl p-3 mb-[10px] items-center" style={{ alignItems: 'center' }}>
        <Text className="text-text font-body-bold text-[12.5px] text-center" style={{ textAlign: 'center' }}>{collegeName}</Text>
        <View className="flex-row items-center justify-center gap-1 mt-[3px]" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 3 }}>
          <Text className="text-muted font-body text-[10.5px]">Admin ·</Text>
          <Badge label={collegeRank} color="cyan" />
        </View>
    </View>

      <Pressable
        onPress={() => router.push('/id-card')}
        className="flex-row items-center gap-[6px] bg-glass-soft border border-glass-border rounded-[10px] px-[10px] py-2 mb-3"
        style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}>
        <View className="flex-1 min-w-0" style={{ flex: 1, minWidth: 0 }}>
          <Text className="text-text font-body-bold text-[11px]">My Admin Card</Text>
          <Text className="text-muted font-body text-[10.5px] mt-[1px]">Share your profile</Text>
        </View>
        <ExternalLink size={13} color={CC.accentBright} />
      </Pressable>

      <AgentKLauncher />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 6, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {NAV.map(({ id, label, Icon }) => {
          const isActive = id === active;
          const count = counts[id];
          return (
            <Pressable
              key={id}
              onPress={() => onNav(id)}
              nativeID={`college-nav-${id}`}
              className={`flex-row items-center gap-[11px] px-[11px] py-[9px] mb-[2px] rounded-lg ${isActive ? 'bg-violet' : ''}`}
              style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}>
              <Icon size={16} color={isActive ? '#fff' : CC.muted} />
              <Text className={`font-body-bold text-[12.5px] flex-1 ${isActive ? 'text-text' : 'text-muted'}`} numberOfLines={1}>{label}</Text>
              {count != null && count > 0 && (
                <View className={`px-[6px] py-[1px] rounded-[6px] min-w-[20px] items-center ${isActive ? 'bg-[rgba(255,255,255,0.20)]' : 'bg-[rgba(99,102,241,0.20)]'}`}>
                  <Text className={`font-display-bold text-[10px] ${isActive ? 'text-text' : 'text-teal'}`}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={onLogout}
        className="flex-row items-center gap-2 px-[11px] py-[9px] rounded-lg mt-1"
        style={Platform.OS === 'web' ? { cursor: 'pointer', transitionDuration: '160ms' } as any : {}}
        testID="logout-button">
        <LogOut size={14} color="#FCA5A5" />
        <Text className="text-[#FCA5A5] font-body-bold text-[12.5px]">Log Out</Text>
      </Pressable>
    </View>
  );
}
