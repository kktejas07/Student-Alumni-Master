/**
 * Alumni Portal — left sidebar with alumni info card + 11 nav items.
 * Mirrors the student sidebar 1:1 — only the orange palette + a few
 * label tweaks ("My Alumni Card" instead of "My Student Card").
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import {
  LayoutDashboard, Sparkles, Briefcase, Users, Calendar, Wallet,
  Tag, CreditCard, GraduationCap, Home, User, ExternalLink, LogOut,
  CalendarCheck, FileText, BookOpen,
} from 'lucide-react-native';
import { SC, FONTS } from './tokens';
import { STUDENT } from './data';
import { Av } from './atoms';

export type StudentNavId =
  | 'dashboard' | 'career-ai' | 'internships' | 'network' | 'events'
  | 'financial' | 'deals' | 'wallet' | 'higher-ed' | 'rentals' | 'profile'
  | 'my-bookings' | 'my-applications' | 'my-workshops';

export const NAV: Array<{ id: StudentNavId; label: string; Icon: any }> = [
  { id: 'dashboard',       label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'career-ai',       label: 'Career AI',          Icon: Sparkles },
  { id: 'internships',     label: 'Internships & Jobs', Icon: Briefcase },
  { id: 'my-applications', label: 'My Applications',    Icon: FileText },
  { id: 'network',         label: 'Network',            Icon: Users },
  { id: 'my-bookings',     label: 'My Bookings',        Icon: CalendarCheck },
  { id: 'events',          label: 'Events',             Icon: Calendar },
  { id: 'my-workshops',    label: 'My Workshops',       Icon: BookOpen },
  { id: 'financial',       label: 'Financial',          Icon: Wallet },
  { id: 'deals',           label: 'Deals & Offers',     Icon: Tag },
  { id: 'wallet',          label: 'SA Wallet',          Icon: CreditCard },
  { id: 'higher-ed',       label: 'Higher Education',   Icon: GraduationCap },
  { id: 'rentals',         label: 'Rentals',            Icon: Home },
  { id: 'profile',         label: 'Profile',            Icon: User },
];

export function Sidebar({
  active, onNav, onLogout,
}: { active: StudentNavId; onNav: (id: StudentNavId) => void; onLogout: () => void }) {
  // Live alumni user → name, initials, sub-line, alumni id
  const user = useAuthStore((u) => u.user);
  const fullName = (user?.full_name || `${(user as any)?.first_name || ''} ${(user as any)?.last_name || ''}`).trim();
  const name = fullName || '';
  const initials = (name.split(' ').slice(0, 2).map((p) => p[0] || '').join('') || '').toUpperCase();
  const ai: any = (user as any)?.alumni_info || {};
  const subTitle =
    [ai.current_role, ai.current_company].filter(Boolean).join(' @ ') ||
    (ai.graduation_year ? `Class of ${ai.graduation_year}` :
     ((user as any)?.graduation_year ? `Class of ${(user as any).graduation_year}` : 'Verified Alumni'));
  const saId = (user as any)?.unique_id || '';
  return (
    <View style={s.aside}>
      {/* Brand */}
      <View style={s.brand}>
        <View style={s.brandLogo}><Text style={s.brandLogoText}>SA</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.brandTitle}>Student Alumni</Text>
          <Text style={s.brandSub}>Web Dashboard</Text>
        </View>
      </View>

      {/* Alumni profile card */}
      <View style={s.profileCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ position: 'relative' }}>
            <Av initials={initials || STUDENT.initials} size={40} color={SC.primaryL} />
            <View style={s.statusDot} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={s.profileName}>{name || STUDENT.name}</Text>
            <Text style={s.profileYear}>{subTitle}</Text>
          </View>
        </View>
      </View>

      {/* Alumni card pill */}
      <Pressable style={({ hovered }: any) => [s.idCardPill, hovered && { backgroundColor: SC.cardH }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.idCardLabel}>My Alumni Card</Text>
          <Text style={s.idCardNumber}>{saId || STUDENT.saId}</Text>
        </View>
        <ExternalLink size={13} color={SC.accent} />
      </Pressable>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {NAV.map(({ id, label, Icon }) => {
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
              <Icon size={16} color={isActive ? '#fff' : SC.muted} />
              <Text style={[s.navLabel, isActive && s.navLabelActive]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Logout */}
      <Pressable
        onPress={onLogout}
        style={({ hovered }: any) => [s.logoutRow, hovered && { backgroundColor: 'rgba(239,68,68,0.10)' }]}
      >
        <LogOut size={14} color="#FCA5A5" />
        <Text style={s.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  aside: {
    width: 240, height: '100%' as any, backgroundColor: SC.bg2,
    borderRightWidth: 1, borderRightColor: SC.border,
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, paddingHorizontal: 4 },
  brandLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 0.5 },
  brandTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13, letterSpacing: -0.2 },
  brandSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 10.5 },

  profileCard: { paddingHorizontal: 4, paddingVertical: 8, marginBottom: 10 },
  statusDot: {
    position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: SC.bg2,
  },
  profileName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  profileYear: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11 },

  idCardPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  idCardLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.3 },
  idCardNumber: { color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 11.5, letterSpacing: 0.5, marginTop: 1 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  navItemActive: { backgroundColor: SC.primary },
  navItemHover: { backgroundColor: 'rgba(176,127,223,0.08)' },
  navLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  navLabelActive: { color: '#fff' },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 11, paddingVertical: 9, borderRadius: 8,
    marginTop: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}),
  },
  logoutText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12.5 },
});
