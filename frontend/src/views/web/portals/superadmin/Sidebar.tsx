// @ts-nocheck
import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard, Building2, GraduationCap, UserCheck, Users, Calendar, CreditCard,
  BarChart3, CheckCircle, Sparkles, Settings, Workflow, ExternalLink, LogOut,
  Upload, Handshake, Megaphone, UserPlus, Mail, Award, ShieldOff, ShieldCheck, Bot, Radar,
} from 'lucide-react-native';
import { SAC, FONTS } from './tokens';
import { Badge } from './atoms';
import { GRAD } from './applekit';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';

function useAdminProfile() {
  const user = useAuthStore((s) => s.user);
  const name = displayName(user);
  return {
    name,
    email: user?.email || '',
    role: 'Super Admin',
    initials: displayInitials(user),
  };
}

export type SuperAdminNavId =
  | 'overview' | 'agents' | 'visitor-radar' | 'bgv' | 'colleges' | 'students' | 'mentors' | 'alumni' | 'events'
  | 'payments' | 'analytics' | 'approvals' | 'ai-insights' | 'settings'
  | 'workflows' | 'imports' | 'partners' | 'promotions' | 'talent-pool' | 'echo-showcase'
  | 'newsletter' | 'certificates' | 'email-health';
import { SALogo } from '@/src/views/components';

export const NAV: Array<{ id: SuperAdminNavId; label: string; Icon: any; count?: number; tag?: 'NEW' }> = [
  { id: 'overview',        label: 'Overview',            Icon: LayoutDashboard },
  { id: 'visitor-radar',   label: 'Live Visitor Radar',  Icon: Radar,       tag: 'NEW' },
  { id: 'agents',          label: 'Autonomous Agents',   Icon: Bot,         tag: 'NEW' },
  { id: 'bgv',             label: 'BGV & Accounts',      Icon: ShieldCheck, tag: 'NEW' },
  { id: 'colleges',        label: 'Colleges',            Icon: Building2 },
  { id: 'students',        label: 'Students',            Icon: GraduationCap },
  { id: 'mentors',         label: 'Mentors',             Icon: UserCheck },
  { id: 'alumni',          label: 'Alumni',              Icon: Users },
  { id: 'talent-pool',     label: 'Talent Pool',         Icon: UserPlus,    tag: 'NEW' },
  { id: 'imports',         label: 'Import Contacts',     Icon: Upload,      tag: 'NEW' },
  { id: 'events',          label: 'Events',              Icon: Calendar },
  { id: 'echo-showcase',   label: 'Echo Showcase',       Icon: Sparkles,    tag: 'NEW' },
  { id: 'partners',        label: 'Partners',            Icon: Handshake,   tag: 'NEW' },
  { id: 'promotions',      label: 'Promotions',          Icon: Megaphone,   tag: 'NEW' },
  { id: 'newsletter',      label: 'Newsletter',          Icon: Mail,        tag: 'NEW' },
  { id: 'email-health',    label: 'Email health',        Icon: ShieldOff,   tag: 'NEW' },
  { id: 'certificates',    label: 'Certificates',        Icon: Award,       tag: 'NEW' },
  { id: 'payments',        label: 'Payments',            Icon: CreditCard },
  { id: 'analytics',       label: 'Analytics',           Icon: BarChart3 },
  { id: 'approvals',       label: 'Approvals',           Icon: CheckCircle, count: 12 },
  { id: 'ai-insights',     label: 'AI Insights',         Icon: Sparkles,    count: 6 },
  { id: 'workflows',       label: 'Workflows',           Icon: Workflow,    tag: 'NEW' },
  { id: 'settings',        label: 'Settings',            Icon: Settings },
];

export function Sidebar({
  active, onNav, onLogout,
}: { active: SuperAdminNavId; onNav: (id: SuperAdminNavId) => void; onLogout: () => void }) {
  const profile = useAdminProfile();

  return (
    <View style={{ width: 232, height: '100%' as any, backgroundColor: SAC.bg2, borderRightWidth: 1, borderRightColor: SAC.border, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingHorizontal: 4 }} nativeID="superadmin-brand">
        <SALogo size={32} variant="glass" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, letterSpacing: -0.2 }}>Super Admin</Text>
          <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 1 }}>STUDENT ALUMNI</Text>
        </View>
      </View>

      <View style={{ backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10, alignItems: 'center' }}>
        <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, textAlign: 'center' }}>{profile.name}</Text>
        <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2, textAlign: 'center' }}>{profile.role}</Text>
      </View>

      <AgentKLauncher />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {NAV.map(({ id, label, Icon, count, tag }) => {
          const isActive = id === active;
          const tourId = `superadmin-nav-${id === 'ai-insights' ? 'ai-insights' : id}`;
          if (isActive) {
            return (
              <Pressable key={id} onPress={() => onNav(id)} nativeID={tourId}>
                <LinearGradient
                  colors={[GRAD.from, GRAD.to]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2, borderRadius: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) }}
                >
                  <Icon size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 }} numberOfLines={1}>{label}</Text>
                  {count != null && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.22)', minWidth: 20, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 10 }}>{count}</Text>
                    </View>
                  )}
                  {tag && <Badge label={tag} color="amber" />}
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={id}
              onPress={() => onNav(id)}
              nativeID={tourId}
              style={({ hovered }: any) => [
                { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2, borderRadius: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
                hovered && { backgroundColor: 'rgba(245,158,11,0.10)' },
              ]}
            >
              <Icon size={16} color={SAC.muted} />
              <Text style={{ color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 }} numberOfLines={1}>{label}</Text>
              {count != null && (
                <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.18)', minWidth: 20, alignItems: 'center' }}>
                  <Text style={{ color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 10 }}>{count}</Text>
                </View>
              )}
              {tag && <Badge label={tag} color="orange" />}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={onLogout}
        style={({ hovered }: any) => [
          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, marginTop: 6, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
          hovered && { backgroundColor: 'rgba(239,68,68,0.10)' },
        ]}
        testID="logout-button"
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{profile.name}</Text>
          <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 }}>{profile.email}</Text>
        </View>
        <LogOut size={14} color="#FCA5A5" />
      </Pressable>
    </View>
  );
}
