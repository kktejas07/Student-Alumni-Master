/**
 * College Admin Portal — left sidebar with college card + 11 nav items.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import {
  LayoutDashboard, GraduationCap, Users, UserCheck, Calendar, Megaphone,
  BarChart3, Sparkles, Briefcase, Trophy, User, ExternalLink, LogOut, Plus,
} from 'lucide-react-native';
import { CC, FONTS } from './tokens';
import { COLLEGE } from './data';
import { Av, Badge } from './atoms';

export type CollegeNavId =
  | 'dashboard' | 'students' | 'alumni' | 'mentors' | 'events' | 'create-event'
  | 'announcements' | 'analytics' | 'ai-insights' | 'career-intel'
  | 'placements' | 'profile';

export const NAV: Array<{ id: CollegeNavId; label: string; Icon: any; count?: number }> = [
  { id: 'dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
  { id: 'students',      label: 'Students',      Icon: GraduationCap },
  { id: 'alumni',        label: 'Alumni',        Icon: Users },
  { id: 'mentors',       label: 'Mentors',       Icon: UserCheck,  count: 3 },
  { id: 'events',        label: 'Events',        Icon: Calendar,   count: 3 },
  { id: 'create-event',  label: 'Create Event',  Icon: Plus },
  { id: 'announcements', label: 'Announcements', Icon: Megaphone,  count: 2 },
  { id: 'analytics',     label: 'Analytics',     Icon: BarChart3 },
  { id: 'ai-insights',   label: 'AI Insights',   Icon: Sparkles,   count: 4 },
  { id: 'career-intel',  label: 'Career Intel',  Icon: Briefcase },
  { id: 'placements',    label: 'Placements',    Icon: Trophy },
  { id: 'profile',       label: 'Profile',       Icon: User },
];

export function Sidebar({
  active, onNav, onLogout,
}: { active: CollegeNavId; onNav: (id: CollegeNavId) => void; onLogout: () => void }) {
  return (
    <View style={s.aside}>
      {/* Brand */}
      <View style={s.brand}>
        <View style={s.brandLogo}><Text style={s.brandLogoText}>SA</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.brandTitle}>Admin Portal</Text>
          <Text style={s.brandSub}>Student Alumni</Text>
        </View>
      </View>

      {/* College card */}
      <View style={s.collegeCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Av initials={COLLEGE.initials} size={40} color="#6366F1" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={s.collegeName}>{COLLEGE.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Text style={s.collegeRole}>Admin ·</Text>
              <Badge label={COLLEGE.rank} color="cyan" />
            </View>
          </View>
        </View>
      </View>

      {/* Admin card pill */}
      <Pressable style={({ hovered }: any) => [s.idCardPill, hovered && { backgroundColor: CC.cardH }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.idCardLabel}>My Admin Card</Text>
          <Text style={s.idCardSub}>Share your profile</Text>
        </View>
        <ExternalLink size={13} color={CC.accentBright} />
      </Pressable>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 6, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {NAV.map(({ id, label, Icon, count }) => {
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
              <Icon size={16} color={isActive ? '#fff' : CC.muted} />
              <Text style={[s.navLabel, isActive && s.navLabelActive]} numberOfLines={1}>{label}</Text>
              {count != null && (
                <View style={[s.countPill, isActive && { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
                  <Text style={[s.countText, isActive && { color: '#fff' }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={onLogout}
        style={({ hovered }: any) => [s.logoutRow, hovered && { backgroundColor: 'rgba(239,68,68,0.10)' }]}
      >
        <LogOut size={14} color="#FCA5A5" />
        <Text style={s.logoutText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  aside: {
    width: 240, height: '100%' as any, backgroundColor: CC.bg2,
    borderRightWidth: 1, borderRightColor: CC.border,
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingHorizontal: 4 },
  brandLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: CC.accent, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#000', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 0.5 },
  brandTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13.5, letterSpacing: -0.2 },
  brandSub: { color: CC.muted, fontFamily: FONTS.med, fontSize: 10.5 },

  collegeCard: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  collegeName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  collegeRole: { color: CC.muted, fontFamily: FONTS.med, fontSize: 10.5 },

  idCardPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  idCardLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },
  idCardSub:   { color: CC.muted, fontFamily: FONTS.med, fontSize: 10.5, marginTop: 1 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  navItemActive: { backgroundColor: CC.primary },
  navItemHover: { backgroundColor: 'rgba(99,102,241,0.10)' },
  navLabel: { color: CC.muted, fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  navLabelActive: { color: '#fff' },
  countPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(99,102,241,0.20)', minWidth: 20, alignItems: 'center' },
  countText: { color: CC.accentBright, fontFamily: FONTS.xbold, fontSize: 10 },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 11, paddingVertical: 9, borderRadius: 8, marginTop: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  logoutText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12.5 },
});
