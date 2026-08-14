// @ts-nocheck
/**
 * Super Admin Portal — left sidebar with 12 nav items.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard, Building2, GraduationCap, UserCheck, Users, Calendar, CreditCard,
  BarChart3, CheckCircle, Sparkles, Settings, Workflow, ExternalLink, LogOut,
  Upload, Handshake, Megaphone, UserPlus, Mail, Award, ShieldOff,
} from 'lucide-react-native';
import { SAC, FONTS } from './tokens';
import { ADMIN } from './data';
import { Av, Badge } from './atoms';
import { GRAD } from './applekit';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

/* Display info for the sidebar profile blocks — uses the real logged-in
 * user if available, falls back to ADMIN mock so legacy/storybook flows
 * still render. */
function useAdminProfile() {
  const user = useAuthStore((s) => s.user);
  if (!user) return ADMIN;
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const name = full || user.name || user.email || ADMIN.name;
  const parts = name.split(' ').filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name[0] + (name[1] || '')).toUpperCase();
  const role = String(user.role || '').toLowerCase();
  return {
    name,
    email: user.email || ADMIN.email,
    role: role === 'admin' ? 'Super Admin' : ADMIN.role,
    initials,
  };
}

export type SuperAdminNavId =
  | 'overview' | 'colleges' | 'students' | 'mentors' | 'alumni' | 'events'
  | 'payments' | 'analytics' | 'approvals' | 'ai-insights' | 'settings'
  | 'workflows' | 'imports' | 'partners' | 'promotions' | 'talent-pool' | 'echo-showcase'
  | 'newsletter' | 'certificates' | 'email-health';
import { SALogo } from '@/src/views/components';

export const NAV: Array<{ id: SuperAdminNavId; label: string; Icon: any; count?: number; tag?: 'NEW' }> = [
  { id: 'overview',    label: 'Overview',    Icon: LayoutDashboard },
  { id: 'colleges',    label: 'Colleges',    Icon: Building2 },
  { id: 'students',    label: 'Students',    Icon: GraduationCap },
  { id: 'mentors',     label: 'Mentors',     Icon: UserCheck },
  { id: 'alumni',      label: 'Alumni',      Icon: Users },
  { id: 'talent-pool', label: 'Talent Pool', Icon: UserPlus,    tag: 'NEW' },
  { id: 'imports',     label: 'Imports',     Icon: Upload,      tag: 'NEW' },
  { id: 'events',          label: 'Events',          Icon: Calendar },
  { id: 'echo-showcase',   label: 'Echo Showcase',   Icon: Sparkles,    tag: 'NEW' },
  { id: 'partners',    label: 'Partners',    Icon: Handshake,   tag: 'NEW' },
  { id: 'promotions',  label: 'Promotions',  Icon: Megaphone,   tag: 'NEW' },
  { id: 'newsletter',   label: 'Newsletter',   Icon: Mail,        tag: 'NEW' },
  { id: 'email-health', label: 'Email health', Icon: ShieldOff,   tag: 'NEW' },
  { id: 'certificates', label: 'Certificates', Icon: Award,       tag: 'NEW' },
  { id: 'payments',    label: 'Payments',    Icon: CreditCard },
  { id: 'analytics',   label: 'Analytics',   Icon: BarChart3 },
  { id: 'approvals',   label: 'Approvals',   Icon: CheckCircle, count: 12 },
  { id: 'ai-insights', label: 'AI Insights', Icon: Sparkles,    count: 6 },
  { id: 'workflows',   label: 'Workflows',   Icon: Workflow,    tag: 'NEW' },
  { id: 'settings',    label: 'Settings',    Icon: Settings },
];

export function Sidebar({
  active, onNav, onLogout,
}: { active: SuperAdminNavId; onNav: (id: SuperAdminNavId) => void; onLogout: () => void }) {
  const profile = useAdminProfile();

  return (
    <View style={s.aside}>
      {/* Brand */}
      <View style={s.brand} nativeID="superadmin-brand">
        <SALogo size={32} variant="glass" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.brandTitle}>Super Admin</Text>
          <Text style={s.brandSub}>STUDENT ALUMNI</Text>
        </View>
      </View>

      {/* Profile card — opens settings/profile in same tab */}
      <View style={[s.profileCard, { alignItems: 'center' }]}>
        <Text numberOfLines={1} style={[s.profileName, { textAlign: 'center' }]}>{profile.name}</Text>
        <Text numberOfLines={1} style={[s.profileRole, { textAlign: 'center', marginTop: 2 }]}>{profile.role}</Text>
      </View>

      {/* Agent K launcher */}
      <AgentKLauncher />

      {/* Nav */}
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
                  style={s.navItem}
                >
                  <Icon size={16} color="#fff" />
                  <Text style={[s.navLabel, s.navLabelActive]} numberOfLines={1}>{label}</Text>
                  {count != null && (
                    <View style={s.countPillActive}>
                      <Text style={s.countTextActive}>{count}</Text>
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
              style={({ hovered }: any) => [s.navItem, hovered && s.navItemHover]}
            >
              <Icon size={16} color={SAC.muted} />
              <Text style={s.navLabel} numberOfLines={1}>{label}</Text>
              {count != null && (
                <View style={s.countPill}>
                  <Text style={s.countText}>{count}</Text>
                </View>
              )}
              {tag && <Badge label={tag} color="orange" />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Footer profile */}
      <Pressable
        onPress={onLogout}
        style={({ hovered }: any) => [s.footer, hovered && { backgroundColor: 'rgba(239,68,68,0.10)' }]}
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

const s = StyleSheet.create({
  aside: {
    width: 232, height: '100%' as any, backgroundColor: SAC.bg2,
    borderRightWidth: 1, borderRightColor: SAC.border,
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingHorizontal: 4 },
  brandLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: SAC.primary, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 0.5 },
  brandTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, letterSpacing: -0.2 },
  brandSub: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 1 },

  profileCard: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  profileRole: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  navItemHover: { backgroundColor: 'rgba(245,158,11,0.10)' },
  navLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  navLabelActive: { color: '#fff' },
  countPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.18)', minWidth: 20, alignItems: 'center' },
  countText: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 10 },
  countPillActive: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.22)', minWidth: 20, alignItems: 'center' },
  countTextActive: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 10 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1,
    marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
});
