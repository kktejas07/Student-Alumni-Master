/**
 * Alumni Portal — left sidebar (polished pass).
 * Mirrors student/Sidebar.tsx — orange gradient theme, MCI icons,
 * stagger-fade entry, gradient active pill, PressScale, SparkIcon for
 * Career AI, accessibility roles/labels, breathing pulse on status dot.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import { useRouter } from 'expo-router';
import {
  LayoutDashboard, Sparkles, Briefcase, Users, Calendar, Wallet,
  Tag, CreditCard, GraduationCap, Home, User, ExternalLink, LogOut,
  CalendarCheck, FileText, BookOpen, Ticket,
} from './iconShims';
import { SC, FONTS } from './tokens';
import { GRADS } from './gradients';
import { Av } from './atoms';
import { FadeInView, PressScale, SparkIcon, PulseDot } from './motion';
import { AgentKLauncher } from '@/src/views/web/agent-k/AgentKLauncher';
import { router } from 'expo-router';
import { SALogo } from '@/src/views/components';

export type StudentNavId =
  | 'dashboard' | 'career-ai' | 'internships' | 'network' | 'events'
  | 'financial' | 'deals' | 'wallet' | 'higher-ed' | 'rentals' | 'courses' | 'profile'
  | 'my-bookings' | 'my-applications' | 'my-workshops' | 'my-tickets';

export const NAV: Array<{ id: StudentNavId; label: string; Icon: any; spark?: boolean }> = [
  { id: 'dashboard',       label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'career-ai',       label: 'Career AI',          Icon: Sparkles, spark: true },
  { id: 'internships',     label: 'Internships & Jobs', Icon: Briefcase },
  { id: 'my-applications', label: 'My Applications',    Icon: FileText },
  { id: 'network',         label: 'Network',            Icon: Users },
  { id: 'my-bookings',     label: 'My Bookings',        Icon: CalendarCheck },
  { id: 'my-tickets',      label: 'My Tickets',         Icon: Ticket },
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
  const router = useRouter();
  const user = useAuthStore((u) => u.user) as any;
  const name = displayName(user);
  const initials = displayInitials(user);
  const photo = useAuthStore((s) => s.photoOverride) || user?.photo_data || user?.face_image_base64;
  const ai: any = user?.alumni_info || {};
  const subTitle =
    [ai.current_role, ai.current_company].filter(Boolean).join(' @ ') ||
    (ai.graduation_year ? `Class of ${ai.graduation_year}` :
     (user?.graduation_year ? `Class of ${user.graduation_year}` : 'Verified Alumni'));
  const saId = user?.unique_id || '—';

  return (
    <View style={s.aside}>
      {/* Brand */}
      <FadeInView delay={20}>
        <View style={s.brand} nativeID="alumni-brand">
          <SALogo size={32} variant="glass" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.brandTitle}>Student Alumni</Text>
            <Text style={s.brandSub}>Alumni Dashboard</Text>
          </View>
        </View>
      </FadeInView>

      {/* Alumni profile card */}
      <FadeInView delay={70}>
        <View style={[s.profileCard, { alignItems: 'center', ...(Platform.OS === 'web' ? { cursor: 'default' } : {}) }]}>
          <Text numberOfLines={1} style={[s.profileName, { textAlign: 'center' }]}>{name}</Text>
          <Text numberOfLines={1} style={[s.profileYear, { textAlign: 'center', marginTop: 2 }]}>{subTitle}</Text>
        </View>
      </FadeInView>

      {/* Alumni card pill */}
      <FadeInView delay={95}>
        <PressScale style={s.idCardPill} onPress={() => router.push('/id-card')}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.idCardLabel}>My Alumni Card</Text>
            <Text style={s.idCardNumber}>{saId}</Text>
          </View>
          <ExternalLink size={13} color={SC.accent} />
        </PressScale>
      </FadeInView>

      {/* Agent K launcher — sits above the main nav (Chunk 2) */}
      <FadeInView delay={140}>
        <AgentKLauncher />
      </FadeInView>

      {/* Nav */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        accessibilityRole={Platform.OS === 'web' ? ('navigation' as any) : undefined}
        accessibilityLabel="Primary alumni navigation"
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
                nativeID={`alumni-nav-${id}`}
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
                    {spark ? <SparkIcon Icon={Icon} size={16} color="rgba(255,255,255,0.7)" /> : <Icon size={16} color="rgba(255,255,255,0.7)" />}
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
        accessibilityLabel="Log out of your alumni account"
        testID="logout-button"
      >
        <LogOut size={14} color="#FCA5A5" />
        <Text style={s.logoutText}>Log out</Text>
      </PressScale>
    </View>
  );
}

const s = StyleSheet.create({
  aside: {
    width: 240, height: '100%' as any, backgroundColor: '#0F172A',
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18, paddingHorizontal: 4 },
  brandLogo: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  brandLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12, letterSpacing: 0.5 },
  brandTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 13, letterSpacing: -0.2 },
  brandSub: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 10.5 },

  profileCard: {
    paddingHorizontal: 4, paddingVertical: 8, marginBottom: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  statusDotWrap: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  profileName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  profileYear: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 11 },

  idCardPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  idCardLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.3 },
  idCardNumber: { color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 11.5, letterSpacing: 0.5, marginTop: 1 },

  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 2,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  navItemActive: {
    ...(Platform.OS === 'web' ? ({
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
    } as any) : {}),
  },
  navLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.bold, fontSize: 12.5, flex: 1 },
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
