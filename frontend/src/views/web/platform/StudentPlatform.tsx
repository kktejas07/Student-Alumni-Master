/**
 * Student Web Platform — dark sidebar dashboard for role=student/alumni.
 * Spec: /tmp/ui_specs/platform-student.jsx
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Home as HomeIcon, Sparkles, Briefcase, BookOpen, Users, Calendar,
  Wallet, Shield, Building2, Gift, User as UserIcon, GraduationCap,
} from 'lucide-react-native';
import {
  Sidebar, GlassCard, KpiTile, Avatar, Badge, SearchBar, ProgressStrip,
  StatusBanner, EmptyState, PageHeader, BellIcon, SectionLabel, NavItem,
} from './components';
import { SA, SAGradients } from './tokens';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { api } from '@/src/models/services/api';
import {
  StudentInternships, StudentCourses, StudentResources, StudentNetwork,
} from './screens/StudentScreens';
import { StudentDashboardView } from '@/src/views/web/StudentDashboardView';

const NAV: NavItem[] = [
  { id: 'home',              Icon: HomeIcon,       label: 'Dashboard',        color: '#A78BFA' },
  { id: 'career',            Icon: Sparkles,       label: 'Career AI',        color: '#A78BFA' },
  { id: 'internships',       Icon: Briefcase,      label: 'Internships',      color: '#34D399' },
  { id: 'courses',           Icon: BookOpen,       label: 'Courses',          color: '#22D3EE' },
  { id: 'higher-education',  Icon: GraduationCap,  label: 'Higher Education', color: '#FCD34D' },
  { id: 'network',           Icon: Users,          label: 'Network',          color: '#F472B6' },
  { id: 'events',            Icon: Calendar,       label: 'Events',           color: '#FB923C' },
  { id: 'financial',         Icon: Wallet,         label: 'Financial',        color: '#FCD34D' },
  { id: 'insurance',         Icon: Shield,         label: 'Insurance',        color: '#60A5FA' },
  { id: 'rentals',           Icon: Building2,      label: 'Rentals',          color: '#A78BFA' },
  { id: 'deals',             Icon: Gift,           label: 'Deals',            color: '#F472B6' },
  { id: 'profile',           Icon: UserIcon,       label: 'Profile',          color: '#A78BFA' },
];

export default function StudentPlatform() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [screen, setScreen] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const initials = (user?.full_name || 'SA').split(' ').slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
  const onLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  return (
    <LinearGradient
      colors={SA.pageBgStudent as any}
      locations={SA.pageBgGradientStops as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.shell}
    >
      {isWide && (
        <Sidebar
          navItems={NAV}
          activeId={screen}
          onNav={(id) => {
            // Route these to standalone pages
            const routeMap: Record<string, string> = {
              profile: '/me',
              events: '/events',
              network: '/network',
              internships: '/internships',
              deals: '/deals',
              'higher-education': '/higher-education',
              financial: '/financial',
              rentals: '/rentals',
              career: '/career-ai',
            };
            if (routeMap[id]) router.push(routeMap[id]);
            else setScreen(id);
          }}
          brandSubtitle="Web Dashboard"
          bgColor={SA.sideStudent}
          railColor={SA.railStudent}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          user={{
            initials,
            primary: user?.full_name || 'Student',
            secondary: `${user?.role === 'alumni' ? 'Alumni' : 'Batch 2022'} · ${user?.career_path || 'CS'}`,
          }}
          onLogout={onLogout}
        />
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.main, screen === 'home' && { padding: 0 }, !isWide && screen !== 'home' && { padding: 18 }]}>
        {screen === 'home' && (
          <StudentDashboardView
            userName={user?.full_name || 'there'}
            onOpenNotifications={() => router.push('/notifications')}
            onSeeAllInternships={() => setScreen('internships')}
          />
        )}
        {screen === 'career' && <Career />}
        {screen === 'internships' && <StudentInternships />}
        {screen === 'courses' && <StudentCourses />}
        {screen === 'resources' && <StudentResources />}
        {screen === 'network' && <StudentNetwork />}
      </ScrollView>
    </LinearGradient>
  );
}

function Home({ onNav }: { onNav: (id: string) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width >= 1100;

  const [dashboard, setDashboard] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [d, b, n] = await Promise.all([
          api.dashboard().catch(() => ({})),
          api.myBookings().catch(() => ({ bookings: [] })),
          api.notifications().catch(() => ({ unread: 0 })),
        ]);
        setDashboard(d);
        setBookings(b.bookings || []);
        setUnread(n.unread || 0);
      } catch {}
    })();
  }, []);

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const internships = dashboard?.recommendations?.internships || [];
  const mentors = dashboard?.suggested_mentors || [];
  const courses = dashboard?.recommendations?.courses || [];

  return (
    <>
      <PageHeader
        title={`Good morning, ${firstName} 👋`}
        subtitle={`Your AI career assistant has ${dashboard?.ai_suggestion_count || 3} new suggestions for you.`}
        rightSlot={
          <>
            <BellIcon count={unread} onPress={() => router.push('/notifications')} />
            <SearchBar placeholder="Search anything…" width={220} />
          </>
        }
      />

      {/* KPI strip */}
      <View style={[styles.kpiRow, !isWide && { flexDirection: 'column' }]}>
        <KpiTile emoji="💼" label="Internship Matches" value={String(internships.length || 48)} note={`↑ ${Math.min(12, internships.length)} new today`} />
        <KpiTile emoji="📚" label="Courses In Progress" value={String((courses.filter((c: any) => c.status === 'in_progress') || []).length || 3)} note="68% avg completion" noteColor={SA.purplePale} />
        <KpiTile emoji="👥" label="Mentor Connections" value={String(mentors.length || 5)} note={`${bookings.length} sessions logged`} />
        <KpiTile emoji="🏆" label="Career Score" value={`${dashboard?.career_score || 74}%`} note="↑ 8pts this month" noteColor={SA.warn} />
      </View>

      {/* 2-col layout */}
      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, gap: 18 }}>
          {/* AI Career Path card */}
          <GlassCard pad={24} style={{ backgroundColor: 'rgba(95,37,159,0.28)', borderColor: 'rgba(176,127,223,0.28)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <View>
                <Text style={{ color: SA.purplePale, fontFamily: SA.fontBold, fontSize: 11, letterSpacing: 1, marginBottom: 4 }}>
                  🤖 AI CAREER ASSISTANT
                </Text>
                <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 18 }}>Your personalised roadmap</Text>
              </View>
              <Pressable onPress={() => onNav('career')} style={styles.viewFullBtn}>
                <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 12 }}>View full path →</Text>
              </Pressable>
            </View>
            {[
              { label: 'Complete DSA fundamentals', done: true, score: '100%' },
              { label: 'Apply to 3 tech internships', done: true, score: '100%' },
              { label: 'Connect with a senior mentor', done: false, score: '0%' },
              { label: 'Build and deploy capstone project', done: false, score: '20%' },
            ].map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[
                  styles.stepDot,
                  s.done
                    ? { backgroundColor: 'rgba(22,163,74,0.25)', borderColor: 'rgba(134,239,172,0.4)' }
                    : { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.1)' },
                ]}>
                  <Text style={{ color: s.done ? SA.success : SA.purplePale, fontFamily: SA.fontBold, fontSize: 11 }}>
                    {s.done ? '✓' : i + 1}
                  </Text>
                </View>
                <Text style={[
                  { flex: 1, fontSize: 13, fontFamily: s.done ? SA.font : SA.fontMedium },
                  { color: s.done ? SA.textFaint : SA.white, textDecorationLine: s.done ? 'line-through' : 'none' },
                ]}>
                  {s.label}
                </Text>
                <Text style={{ fontSize: 11, color: s.done ? SA.success : 'rgba(255,255,255,0.3)', fontFamily: SA.fontSemi }}>
                  {s.score}
                </Text>
              </View>
            ))}
          </GlassCard>

          {/* Top internship matches */}
          <GlassCard pad={22}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <SectionLabel>🌍 TOP INTERNSHIP MATCHES</SectionLabel>
              <Pressable onPress={() => onNav('internships')}>
                <Text style={{ color: SA.purplePale, fontFamily: SA.fontSemi, fontSize: 12 }}>
                  See all {internships.length || 48} →
                </Text>
              </Pressable>
            </View>
            {(internships.length > 0 ? internships.slice(0, 3) : DEFAULT_INTERNSHIPS).map((j: any, i: number) => (
              <View key={i} style={styles.listRow}>
                <View style={styles.listRowIcon}>
                  <Text style={{ fontSize: 18 }}>🏢</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 14 }} numberOfLines={1}>
                    {j.title || j.role}
                  </Text>
                  <Text style={{ color: SA.textFaint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {j.company || j.co} · {j.location || j.loc} · {j.stipend || '₹35K/mo'}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: SA.success, fontFamily: SA.fontBold, fontSize: 13, textAlign: 'right' }}>
                    {j.match_score || j.match || '92%'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>match</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </View>

        {/* Right column */}
        <View style={{ width: isWide ? 320 : '100%', gap: 16 }}>
          {/* Course progress */}
          <GlassCard pad={20}>
            <SectionLabel>📚 COURSE PROGRESS</SectionLabel>
            {[
              { title: 'Python Bootcamp', platform: 'Udemy', pct: 68, gradient: SAGradients.purple },
              { title: 'Product Management', platform: 'Coursera', pct: 34, gradient: SAGradients.blue },
              { title: 'UI/UX Fundamentals', platform: 'edX', pct: 90, gradient: SAGradients.green },
            ].map((c) => (
              <View key={c.title} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <View>
                    <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 13 }}>{c.title}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>{c.platform}</Text>
                  </View>
                  <Text style={{ color: SA.purplePale, fontFamily: SA.fontBold, fontSize: 13 }}>{c.pct}%</Text>
                </View>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  <LinearGradient
                    colors={c.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: '100%', width: `${c.pct}%`, borderRadius: 2 }}
                  />
                </View>
              </View>
            ))}
            <Pressable onPress={() => onNav('courses')} style={styles.cardCTA}>
              <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 12 }}>Browse More Courses</Text>
            </Pressable>
          </GlassCard>

          {/* Suggested mentors */}
          <GlassCard pad={20}>
            <SectionLabel>🤝 SUGGESTED MENTORS</SectionLabel>
            {(mentors.length > 0 ? mentors.slice(0, 2) : DEFAULT_MENTORS).map((m: any, i: number) => {
              const name = m.full_name || m.name;
              const inits = (name || 'M').split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
              return (
                <View key={i} style={styles.mentorRow}>
                  <Avatar initials={inits} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 13 }}>{name}</Text>
                    <Text style={{ color: SA.textFaint, fontSize: 11, marginTop: 1 }}>
                      {m.title || m.role || 'Senior Mentor'} · ⭐ {m.rating || m.rate || '4.8'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/mentors' as any)}
                    style={({ hovered }: any) => [styles.connectBtn, hovered && { backgroundColor: 'rgba(176,127,223,0.28)' }]}
                  >
                    <Text style={{ color: SA.purplePale, fontFamily: SA.fontBold, fontSize: 11 }}>Connect</Text>
                  </Pressable>
                </View>
              );
            })}
          </GlassCard>

          {/* Quick resources */}
          <GlassCard pad={18}>
            <SectionLabel>🛡️ QUICK RESOURCES</SectionLabel>
            {[
              { emoji: '🛡️', label: 'Student Insurance', sub: '3 plans available', route: '/insurance' as const },
              { emoji: '🏠', label: 'Housing Near Campus', sub: '24 listings', route: '/housing' as const },
              { emoji: '💰', label: 'Loan Calculator', sub: 'Compare 20+ banks', route: '/financial' as const },
            ].map((r, i, arr) => (
              <Pressable
                key={i}
                onPress={() => router.push(r.route as any)}
                style={[styles.qrRow, i < arr.length - 1 && { borderBottomColor: 'rgba(255,255,255,0.06)', borderBottomWidth: 1 }]}
              >
                <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SA.white, fontFamily: SA.fontSemi, fontSize: 13 }}>{r.label}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 1 }}>{r.sub}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>›</Text>
              </Pressable>
            ))}
          </GlassCard>
        </View>
      </View>
    </>
  );
}

function Career() {
  return (
    <>
      <PageHeader title="AI Career Path 🤖" subtitle="Personalised roadmap based on your profile, skills, and goals." />
      <GlassCard pad={24} style={{ marginBottom: 18, backgroundColor: 'rgba(95,37,159,0.25)', borderColor: 'rgba(176,127,223,0.25)' }}>
        <Text style={{ color: SA.purplePale, fontFamily: SA.fontBold, fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>
          YOUR GOAL
        </Text>
        <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 20 }}>
          Product Designer at a Top Tech Company
        </Text>
        <Text style={{ color: SA.textFaint, fontSize: 13, marginTop: 6 }}>
          Estimated timeline: 12–18 months · Based on current pace
        </Text>
        <View style={{ marginTop: 16, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
          <LinearGradient
            colors={SAGradients.purpleSoft as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: '100%', width: '42%', borderRadius: 3 }}
          />
        </View>
        <Text style={{ color: SA.purplePale, fontFamily: SA.fontSemi, fontSize: 12, marginTop: 8 }}>
          42% of the way there
        </Text>
      </GlassCard>

      <GlassCard pad={24}>
        <SectionLabel>ROADMAP MILESTONES</SectionLabel>
        {[
          { phase: 'Foundation', tasks: ['Learn Python & DSA', 'Complete UI/UX course'], done: true, month: 'Aug–Sep 2024' },
          { phase: 'Application', tasks: ['Apply to 5 internships', 'Build portfolio project'], done: true, month: 'Oct–Nov 2024' },
          { phase: 'Experience', tasks: ['Complete internship', 'Get mentor sessions (x4)'], done: false, month: 'Dec–Feb 2025', active: true },
          { phase: 'Launch', tasks: ['Full-time job applications', 'Network with 20+ professionals'], done: false, month: 'Mar–May 2025' },
        ].map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 20, marginBottom: 24 }}>
            <View style={[
              styles.milestoneNode,
              p.done && { backgroundColor: 'rgba(22,163,74,0.3)', borderColor: 'rgba(134,239,172,0.6)' },
              p.active && { backgroundColor: SA.purple, borderColor: SA.purpleMid },
            ]}>
              <Text style={{ color: SA.white, fontFamily: SA.fontBold, fontSize: 13 }}>
                {p.done ? '✓' : i + 1}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: p.done ? SA.textFaint : SA.white, fontFamily: SA.fontBold, fontSize: 15 }}>
                  {p.phase}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{p.month}</Text>
              </View>
              {p.tasks.map((t, j) => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: p.done ? SA.success : p.active ? SA.purpleLight : 'rgba(255,255,255,0.2)',
                  }} />
                  <Text style={{
                    color: p.done ? 'rgba(255,255,255,0.4)' : SA.textMuted,
                    fontSize: 13,
                    textDecorationLine: p.done ? 'line-through' : 'none',
                  }}>
                    {t}
                  </Text>
                </View>
              ))}
              {p.active && <StatusBanner type="info" msg="You are here — 2 tasks in progress" />}
            </View>
          </View>
        ))}
      </GlassCard>
    </>
  );
}

function SimpleStubScreen({ title, emoji, subtitle }: { title: string; emoji: string; subtitle: string }) {
  return (
    <>
      <PageHeader title={`${title} ${emoji}`} subtitle={subtitle} />
      <GlassCard pad={28}>
        <EmptyState
          icon={emoji}
          title={`${title} hub coming together`}
          sub="Detailed listings render in your mobile app — desktop-rich view ships next."
        />
      </GlassCard>
    </>
  );
}

const DEFAULT_INTERNSHIPS = [
  { role: 'Product Design Intern', co: 'Swiggy', loc: 'Bangalore', stipend: '₹40K/mo', match: '96%' },
  { role: 'SWE Intern', co: 'Razorpay', loc: 'Remote', stipend: '₹35K/mo', match: '91%' },
  { role: 'Data Analyst Intern', co: 'PhonePe', loc: 'Bangalore', stipend: '₹45K/mo', match: '88%' },
];

const DEFAULT_MENTORS = [
  { name: 'Priya Singh', role: 'PM @ Google', rate: '4.9' },
  { name: 'Vikram Gupta', role: 'Founder @ TechStart', rate: '4.8' },
];

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', height: '100%' as any },
  main: { padding: 36, paddingBottom: 80 },
  kpiRow: { flexDirection: 'row', gap: 14, marginBottom: 24, flexWrap: 'wrap' as const },
  split: { flexDirection: 'row', gap: 20 },
  viewFullBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    ...({ cursor: 'pointer' } as any),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
  },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  listRowIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cardCTA: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginTop: 4,
    ...({ cursor: 'pointer' } as any),
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  connectBtn: {
    backgroundColor: 'rgba(176,127,223,0.18)',
    borderColor: 'rgba(176,127,223,0.28)',
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 7,
    ...({ cursor: 'pointer' } as any),
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    ...({ cursor: 'pointer' } as any),
  },
  milestoneNode: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
});
