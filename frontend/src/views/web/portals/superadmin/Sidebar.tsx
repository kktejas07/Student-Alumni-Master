/**
 * Super Admin Portal — left sidebar with 12 nav items.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import {
  LayoutDashboard, Building2, GraduationCap, UserCheck, Users, Calendar, CreditCard,
  BarChart3, CheckCircle, Sparkles, Settings, Workflow, ExternalLink, LogOut,
} from 'lucide-react-native';
import { SAC, FONTS } from './tokens';
import { ADMIN } from './data';
import { Av, Badge } from './atoms';

export type SuperAdminNavId =
  | 'overview' | 'colleges' | 'students' | 'mentors' | 'alumni' | 'events'
  | 'payments' | 'analytics' | 'approvals' | 'ai-insights' | 'settings' | 'workflows';

export const NAV: Array<{ id: SuperAdminNavId; label: string; Icon: any; count?: number; tag?: 'NEW' }> = [
  { id: 'overview',    label: 'Overview',    Icon: LayoutDashboard },
  { id: 'colleges',    label: 'Colleges',    Icon: Building2 },
  { id: 'students',    label: 'Students',    Icon: GraduationCap },
  { id: 'mentors',     label: 'Mentors',     Icon: UserCheck },
  { id: 'alumni',      label: 'Alumni',      Icon: Users },
  { id: 'events',      label: 'Events',      Icon: Calendar },
  { id: 'payments',    label: 'Payments',    Icon: CreditCard },
  { id: 'analytics',   label: 'Analytics',   Icon: BarChart3 },
  { id: 'approvals',   label: 'Approvals',   Icon: CheckCircle, count: 12 },
  { id: 'ai-insights', label: 'AI Insights', Icon: Sparkles,    count: 6 },
  { id: 'settings',    label: 'Settings',    Icon: Settings },
  { id: 'workflows',   label: 'Workflows',   Icon: Workflow,    tag: 'NEW' },
];

export function Sidebar({
  active, onNav, onLogout,
}: { active: SuperAdminNavId; onNav: (id: SuperAdminNavId) => void; onLogout: () => void }) {
  return (
    <View style={s.aside}>
      {/* Brand */}
      <View style={s.brand}>
        <View style={s.brandLogo}><Text style={s.brandLogoText}>SA</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.brandTitle}>Super Admin</Text>
          <Text style={s.brandSub}>STUDENT ALUMNI</Text>
        </View>
      </View>

      {/* Profile card */}
      <View style={s.profileCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Av initials={ADMIN.initials} size={38} color={SAC.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={s.profileName}>{ADMIN.name}</Text>
            <Text numberOfLines={1} style={s.profileRole}>{ADMIN.role}</Text>
          </View>
          <ExternalLink size={13} color={SAC.muted} />
        </View>
      </View>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {NAV.map(({ id, label, Icon, count, tag }) => {
          const isActive = id === active;
          return (
            <Pressable
              key={id}
              onPress={() => onNav(id)}
              style={({ hovered }: any) => [
                s.navItem,
                isActive && s.navItemActive,
                !isActive && hovered && s.navItemHover,
              ]}
            >
              <Icon size={16} color={isActive ? '#fff' : SAC.muted} />
              <Text style={[s.navLabel, isActive && s.navLabelActive]} numberOfLines={1}>{label}</Text>
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
      >
        <Av initials={ADMIN.initials} size={32} color={SAC.primaryD} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{ADMIN.name}</Text>
          <Text numberOfLines={1} style={{ color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5 }}>{ADMIN.email}</Text>
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

  profileCard: { backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1, borderRadius: 12, padding: 11, marginBottom: 12 },
  profileName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  profileRole: { color: SAC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 2 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  navItemActive: { backgroundColor: SAC.primary },
  navItemHover: { backgroundColor: 'rgba(249,115,22,0.10)' },
  navLabel: { color: SAC.muted, fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  navLabelActive: { color: '#fff' },
  countPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(251,191,36,0.18)', minWidth: 20, alignItems: 'center' },
  countText: { color: SAC.accentBright, fontFamily: FONTS.xbold, fontSize: 10 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10,
    backgroundColor: SAC.card, borderColor: SAC.border, borderWidth: 1,
    marginTop: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
});
