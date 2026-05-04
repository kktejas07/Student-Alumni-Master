/**
 * Student Portal — left sidebar.
 *
 * Polished pass:
 *   • Lucide icons → MaterialCommunityIcons (via ./iconShims)
 *   • Brand & profile card fade-in on mount
 *   • Nav items stagger-fade in (60ms cascade)
 *   • Active nav item: linear-gradient pill + spring "pop" scale
 *   • Pressable scale-down (0.97) for tactile feedback
 *   • Sparkle icon (Career AI) gently rotates as a hint affordance
 *   • External-link icon rotates 8° on hover for the Student-card pill
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import {
  LayoutDashboard, Sparkles, Briefcase, Users, Calendar, Wallet,
  Tag, CreditCard, GraduationCap, Home, User, ExternalLink, LogOut,
  CalendarCheck, FileText, BookOpen,
} from './iconShims';
import { SC, FONTS } from './tokens';
import { GRADS } from './gradients';
import { STUDENT } from './data';
import { Av } from './atoms';
import { FadeInView, PressScale, SparkIcon, PulseDot } from './motion';

export type StudentNavId =
  | 'dashboard' | 'career-ai' | 'internships' | 'network' | 'events'
  | 'financial' | 'deals' | 'wallet' | 'higher-ed' | 'rentals' | 'courses' | 'profile'
  | 'my-bookings' | 'my-applications' | 'my-workshops';

export const NAV: Array<{ id: StudentNavId; label: string; Icon: any; spark?: boolean }> = [
  { id: 'dashboard',       label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'career-ai',       label: 'Career AI',          Icon: Sparkles, spark: true },
  { id: 'internships',     label: 'Internships & Jobs', Icon: Briefcase },
  { id: 'my-applications', label: 'My Applications',    Icon: FileText },
  { id: 'network',         label: 'Network',            Icon: Users },
  { id: 'my-bookings',     label: 'My Bookings',        Icon: CalendarCheck },
  { id: 'events',          label: 'Events',             Icon: Calendar },
  { id: 'my-workshops',    label: 'My Workshops',       Icon: BookOpen },
  { id: 'courses',         label: 'Courses',            Icon: BookOpen },
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
  const user = useAuthStore((u) => u.user) as any;
  const fullName: string = (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`).trim() || STUDENT.name;
  const initials: string = (fullName.split(' ').slice(0, 2).map((p: string) => p[0] || '').join('') || STUDENT.initials).toUpperCase();
  const gy = user?.graduation_year || (user?.school_info || {}).graduation_year;
  const yearLabel: string = (gy && Number(gy) === new Date().getFullYear()) ? 'Final Year'
    : (gy && Number(gy) === new Date().getFullYear() + 1) ? 'Pre-Final Year'
    : (gy ? `Class of ${gy}` : STUDENT.year);
  const saId: string = user?.unique_id || STUDENT.saId;

  return (
    <View style={s.aside}>
      {/* Brand */}
      <FadeInView delay={20}>
        <View style={s.brand}>
          <LinearGradient colors={GRADS.brand as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.brandLogo}>
            <Text style={s.brandLogoText}>SA</Text>
          </LinearGradient>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.brandTitle}>Student Alumni</Text>
            <Text style={s.brandSub}>Web Dashboard</Text>
          </View>
        </View>
      </FadeInView>

      {/* Student profile card */}
      <FadeInView delay={70}>
        <View style={s.profileCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ position: 'relative' }}>
              <Av initials={initials} size={40} color={SC.primaryL} />
              <View style={s.statusDotWrap}>
                <PulseDot size={10} color="#22C55E" />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={s.profileName}>{fullName}</Text>
              <Text style={s.profileYear}>{yearLabel}</Text>
            </View>
          </View>
        </View>
      </FadeInView>

      {/* Student card pill */}
      <FadeInView delay={120}>
        <PressScale style={s.idCardPill} onPress={() => {}}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.idCardLabel}>My Student Card</Text>
            <Text style={s.idCardNumber}>{saId}</Text>
          </View>
          <ExternalLink size={13} color={SC.accent} />
        </PressScale>
      </FadeInView>

      {/* Nav */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        accessibilityRole={Platform.OS === 'web' ? ('navigation' as any) : undefined}
        accessibilityLabel="Primary navigation"
      >
        {NAV.map(({ id, label, Icon, spark }, i) => {
          const isActive = id === active;
          return (
            <FadeInView key={id} delay={150 + i * 35} distance={8}>
              <PressScale
                onPress={() => onNav(id)}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive }}
                accessibilityHint={`Opens the ${label} section of the dashboard`}
              >
                {isActive ? (
                  <LinearGradient
                    colors={GRADS.brand as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.navItem, s.navItemActive]}
                  >
                    {spark ? <SparkIcon Icon={Icon} size={16} color="#fff" /> : <Icon size={16} color="#fff" />}
                    <Text style={[s.navLabel, s.navLabelActive]} numberOfLines={1}>{label}</Text>
                    <View style={s.activeDot} />
                  </LinearGradient>
                ) : (
                  <View style={s.navItem}>
                    {spark ? <SparkIcon Icon={Icon} size={16} color={SC.muted} /> : <Icon size={16} color={SC.muted} />}
                    <Text style={s.navLabel} numberOfLines={1}>{label}</Text>
                  </View>
                )}
              </PressScale>
            </FadeInView>
          );
        })}
      </ScrollView>

      {/* Logout */}
      <PressScale
        onPress={onLogout}
        style={s.logoutRow}
        accessibilityLabel="Log out of your account"
        accessibilityHint="Signs you out and returns to the welcome screen"
      >
        <LogOut size={14} color="#FCA5A5" />
        <Text style={s.logoutText}>Log out</Text>
      </PressScale>
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
  brandLogo: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 0.5 },
  brandTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13, letterSpacing: -0.2 },
  brandSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 10.5 },

  profileCard: { paddingHorizontal: 4, paddingVertical: 8, marginBottom: 10 },
  statusDotWrap: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: SC.bg2, alignItems: 'center', justifyContent: 'center' },
  profileName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  profileYear: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11 },

  idCardPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  idCardLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.3 },
  idCardNumber: { color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 11.5, letterSpacing: 0.5, marginTop: 1 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  navItemActive: {
    ...(Platform.OS === 'web' ? ({
      boxShadow: '0 6px 18px rgba(95,37,159,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
    } as any) : { shadowColor: SC.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } as any }),
  },
  navLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
  navLabelActive: { color: '#fff' },
  activeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff', opacity: 0.9 },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 11, paddingVertical: 9, borderRadius: 8,
    marginTop: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  logoutText: { color: '#FCA5A5', fontFamily: FONTS.bold, fontSize: 12.5 },
});
