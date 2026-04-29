/**
 * College / Institution Web Platform — blue-tinted sidebar.
 * Spec: /tmp/ui_specs/platform-college.jsx
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  GraduationCap, Users, Calendar, Megaphone, BarChart3,
  Building2, BookOpen, Settings as SettingsIcon,
} from 'lucide-react-native';
import {
  Sidebar, GlassCard, KpiTile, BellIcon, PageHeader, PrimaryButton, SecondaryButton,
  SectionLabel, EmptyState, NavItem, ProgressStrip,
} from './components';
import { SA, SAGradients } from './tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';
import {
  CollegeStudents, CollegeAlumni, CollegePrograms,
  CollegeAnalyticsScreen, CollegeSettings,
} from './screens/CollegeScreens';
import { CollegeDashboardView } from '@/src/views/web/CollegeDashboardView';

const NAV: NavItem[] = [
  { id: 'overview',     Icon: BarChart3,    label: 'Overview',       color: '#60A5FA' },
  { id: 'students',     Icon: GraduationCap, label: 'Students',      color: '#A78BFA' },
  { id: 'alumni',       Icon: Users,        label: 'Alumni',         color: '#34D399' },
  { id: 'events',       Icon: Calendar,     label: 'Events',         color: '#FB923C' },
  { id: 'announcements',Icon: Megaphone,    label: 'Announcements',  color: '#EF4444' },
  { id: 'analytics',    Icon: BarChart3,    label: 'Analytics',      color: '#FCD34D' },
  { id: 'profile',      Icon: Building2,    label: 'College Profile',color: '#22D3EE' },
];

export default function CollegePlatform() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [screen, setScreen] = useState<string>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const onLogout = async () => { await logout(); router.replace('/welcome'); };

  return (
    <LinearGradient
      colors={SA.pageBgCollege as any}
      locations={SA.pageBgGradientStops as any}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      {isWide && (
        <Sidebar
          navItems={NAV}
          activeId={screen}
          onNav={setScreen}
          brandSubtitle="College Admin Portal"
          bgColor={SA.sideCollege}
          railColor={SA.railCollege}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          user={{
            initials: 'IIT',
            primary: user?.full_name || 'IIT Bombay',
            secondary: 'Admin · Verified',
            gradient: SAGradients.blue,
          }}
          onLogout={onLogout}
        />
      )}
      <View style={{ flex: 1 }}>
        {screen === 'overview' && (
          <CollegeDashboardView
            collegeName={user?.full_name ? `${user.full_name} Admin` : "St. Xavier's College Admin"}
            notifCount={4}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => setScreen('profile')}
            onActionPress={(id) => {
              if (id === 'announce')   setScreen('announcements');
              else if (id === 'new-event') setScreen('events');
              else if (id === 'analytics') setScreen('analytics');
              else if (id === 'students')  setScreen('students');
            }}
          />
        )}
        {screen !== 'overview' && (
          <ScrollView contentContainerStyle={styles.main}>
            {screen === 'students' && <CollegeStudents />}
            {screen === 'alumni' && <CollegeAlumni />}
            {screen === 'events' && <CollegePrograms />}
            {screen === 'announcements' && <EmptyState title="Announcements" description="Send broadcast announcements to students and alumni." />}
            {screen === 'analytics' && <CollegeAnalyticsScreen />}
            {screen === 'profile' && <CollegeSettings />}
          </ScrollView>
        )}
      </View>
    </LinearGradient>
  );
}

function Overview({ onNav }: { onNav: (id: string) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    api.analytics().then(setAnalytics).catch(() => {});
  }, []);

  const tenantName = user?.full_name || 'Institution';
  const totalStudents = analytics?.total_students || 4820;
  const totalAlumni = analytics?.total_alumni || 12400;
  const placementRate = analytics?.placement_rate_pct || 94;
  const avgPackage = analytics?.avg_package_lakhs || 18.2;

  return (
    <>
      <PageHeader
        title={`${tenantName} — Dashboard 🏛️`}
        subtitle="Academic Year 2024–25 · Batch data updated in real-time."
        rightSlot={
          <>
            <BellIcon onPress={() => router.push('/notifications')} />
            <SecondaryButton label="Export Report" />
            <PrimaryButton label="+ Add Students" onPress={() => onNav('students')} />
          </>
        }
      />

      <View style={[styles.kpiRow, !isWide && { flexDirection: 'column' }]}>
        <KpiTile emoji="🎓" label="Total Students" value={totalStudents.toLocaleString('en-IN')} note="↑ 180 this year" />
        <KpiTile emoji="🤝" label="Active Alumni" value={totalAlumni.toLocaleString('en-IN')} note="Across 48 countries" noteColor={SA.purplePale} />
        <KpiTile emoji="💼" label="Placement Rate" value={`${placementRate}%`} note="↑ 3% vs last year" />
        <KpiTile emoji="💰" label="Avg Package" value={`₹${avgPackage}L`} note="↑ ₹2.1L vs last year" noteColor={SA.warn} />
      </View>

      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, gap: 18 }}>
          {/* Department placement */}
          <GlassCard pad={24}>
            <SectionLabel>PLACEMENT BY DEPARTMENT</SectionLabel>
            {[
              { dept: 'Computer Science', pct: 98, placed: 480, total: 490 },
              { dept: 'Electronics & ECE', pct: 95, placed: 266, total: 280 },
              { dept: 'Mechanical Eng', pct: 88, placed: 220, total: 250 },
              { dept: 'Civil Eng', pct: 82, placed: 164, total: 200 },
              { dept: 'Chemical Eng', pct: 90, placed: 135, total: 150 },
            ].map((d) => (
              <ProgressStrip
                key={d.dept}
                label={d.dept}
                pct={d.pct}
                rightLabel={`${d.placed}/${d.total} (${d.pct}%)`}
                gradient={d.pct >= 95 ? SAGradients.green : SAGradients.purple}
              />
            ))}
          </GlassCard>

          {/* Top recruiters */}
          <GlassCard pad={22}>
            <SectionLabel>🏆 TOP RECRUITERS THIS YEAR</SectionLabel>
            {[
              { co: 'Google', hires: 64, package: '₹42L' },
              { co: 'Microsoft', hires: 52, package: '₹38L' },
              { co: 'Amazon', hires: 48, package: '₹32L' },
              { co: 'Goldman Sachs', hires: 30, package: '₹45L' },
              { co: 'Flipkart', hires: 26, package: '₹28L' },
            ].map((r, i) => (
              <View key={i} style={styles.recruiterRow}>
                <View style={styles.recruiterIcon}>
                  <Text style={{ fontSize: 18 }}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 14 }}>{r.co}</Text>
                  <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }}>{r.hires} hires this year</Text>
                </View>
                <Text style={{ color: SA.warn, fontFamily: SA.fontBold, fontSize: 13 }}>{r.package}</Text>
              </View>
            ))}
          </GlassCard>
        </View>

        <View style={{ width: isWide ? 320 : '100%', gap: 16 }}>
          {/* Upcoming events */}
          <GlassCard pad={20}>
            <SectionLabel>📅 UPCOMING EVENTS</SectionLabel>
            {[
              { title: 'Mood Indigo 2025', sub: 'Cultural fest · Feb 14–16', count: '12,000 RSVPs' },
              { title: 'Tech Fest 2025', sub: 'Tech showcase · Mar 8–10', count: '8,500 RSVPs' },
              { title: 'Alumni Connect', sub: 'Networking · Apr 5', count: '450 RSVPs' },
            ].map((e, i) => (
              <View key={i} style={styles.eventRow}>
                <View style={styles.eventDot} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 13 }}>{e.title}</Text>
                  <Text style={{ color: SA.textFaint, fontSize: 11, marginTop: 1 }}>{e.sub}</Text>
                  <Text style={{ color: SA.purplePale, fontSize: 11, marginTop: 4, fontFamily: SA.fontSemi }}>{e.count}</Text>
                </View>
              </View>
            ))}
          </GlassCard>

          {/* Quick stats */}
          <GlassCard pad={20}>
            <SectionLabel>📊 QUICK STATS</SectionLabel>
            <ProgressStrip label="Industry diversity" pct={78} gradient={SAGradients.purple} />
            <ProgressStrip label="Geographic spread" pct={64} gradient={SAGradients.blue} />
            <ProgressStrip label="Higher education" pct={42} gradient={SAGradients.green} />
            <ProgressStrip label="Entrepreneurship" pct={18} gradient={SAGradients.copper} />
          </GlassCard>
        </View>
      </View>
    </>
  );
}

function Stub({ title, emoji, sub }: { title: string; emoji: string; sub: string }) {
  return (
    <>
      <PageHeader title={`${title} ${emoji}`} subtitle={sub} />
      <GlassCard pad={28}>
        <EmptyState icon={emoji} title={`${title} module coming soon`} sub="Detailed view ships in the next iteration." />
      </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', height: '100%' as any },
  main: { padding: 36, paddingBottom: 80 },
  kpiRow: { flexDirection: 'row', gap: 14, marginBottom: 24, flexWrap: 'wrap' as const },
  split: { flexDirection: 'row', gap: 20 },
  recruiterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
    borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1,
  },
  recruiterIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  eventRow: {
    flexDirection: 'row', gap: 12,
    paddingVertical: 10,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  eventDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: SA.purpleLight,
    marginTop: 6,
  },
});
