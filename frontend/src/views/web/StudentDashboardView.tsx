/**
 * StudentDashboardView — The new student dashboard, matching the SA Web Design spec.
 *
 * Single component used by both:
 *   • Web   → mounted inside StudentPlatform sidebar layout
 *   • Mobile (iOS/Android) → mounted inside (tabs)/index.tsx
 *
 * Layout adapts via useWindowDimensions:
 *   - >= 980px : split layout (left feed + right column)
 *   - <  980px : single column, stacked vertically
 *
 * Mocked data per user request — matches design copy exactly.
 */
import { ReactNode, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Image,
  useWindowDimensions, Platform, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, Search, Briefcase, BookOpen, Users, Trophy, Rocket,
  Sparkles, ArrowRight, MapPin, Coins, Calendar, FileText,
  GraduationCap, Award,
} from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

// ─── Mock data (matches design spec) ─────────────────────────────────────────
const HERO = {
  goal: 'Product Designer at a Top Tech Company',
  progress: 42,
  stats: [
    { label: 'Career Score', value: '74',  icon: Trophy },
    { label: 'Matches',      value: '48',  icon: Briefcase },
    { label: 'Mentors',      value: '5',   icon: Users },
  ],
};

const KPIS = [
  { label: 'Internship Matches',  value: '48', note: '↑ 12 new today',         color: '#86EFAC', tint: 'rgba(16,185,129,0.18)',  Icon: Briefcase },
  { label: 'Courses In Progress', value: '3',  note: '68% avg completion',     color: '#D4AAFF', tint: 'rgba(124,58,237,0.20)',  Icon: BookOpen },
  { label: 'Mentor Connections',  value: '5',  note: '2 sessions this week',   color: '#86EFAC', tint: 'rgba(6,95,70,0.25)',     Icon: Users },
  { label: 'Career Score',        value: '74', note: '↑ 8 pts this month',     color: '#FCD34D', tint: 'rgba(180,83,9,0.25)',    Icon: Trophy },
];

const TABS = [
  { id: 'all',    label: 'All Matches' },
  { id: 'design', label: 'Design' },
  { id: 'eng',    label: 'Engineering' },
  { id: 'pm',     label: 'Product' },
];

const INTERNSHIPS = [
  { role: 'Product Design Intern',         company: 'Swiggy',    location: 'Bangalore', stipend: '₹40K/mo', match: 96, emoji: '🍴', cat: 'design' },
  { role: 'UX Design Intern',              company: 'Razorpay',  location: 'Remote',    stipend: '₹35K/mo', match: 92, emoji: '💳', cat: 'design' },
  { role: 'Frontend Engineering Intern',   company: 'CRED',      location: 'Bangalore', stipend: '₹50K/mo', match: 89, emoji: '💎', cat: 'eng' },
  { role: 'Product Management Intern',     company: 'Zomato',    location: 'Gurugram',  stipend: '₹45K/mo', match: 87, emoji: '🍕', cat: 'pm' },
];

const COURSES = [
  { title: 'Python Bootcamp',           pct: 68, gradient: ['#7C3AED', '#B07FDF'] },
  { title: 'Design Systems Mastery',    pct: 84, gradient: ['#10B981', '#34D399'] },
  { title: 'System Design Fundamentals', pct: 32, gradient: ['#F59E0B', '#FCD34D'] },
];

const QUICK_ACTIONS = [
  { label: 'Update Resume',  Icon: FileText,    color: '#A78BFA' },
  { label: 'Find Mentor',    Icon: Users,       color: '#34D399' },
  { label: 'Browse Events',  Icon: Calendar,    color: '#FCD34D' },
  { label: 'My Skills',      Icon: Award,       color: '#F472B6' },
];

const MENTORS = [
  { name: 'Priya Mehta',    role: 'Sr. Designer · Google',     rating: 4.9, initials: 'PM', tint: ['#5F259F', '#B07FDF'] },
  { name: 'Arjun Kapoor',   role: 'Eng Manager · Stripe',      rating: 4.8, initials: 'AK', tint: ['#1D4ED8', '#60A5FA'] },
  { name: 'Sneha Iyer',     role: 'PM · Microsoft',            rating: 5.0, initials: 'SI', tint: ['#10B981', '#34D399'] },
];

// ─────────────────────────────────────────────────────────────────────────────
export type StudentDashboardViewProps = {
  /** Show the top bar (greeting/search/notif). Web sidebar layout sets this true. */
  showTopBar?: boolean;
  /** User name shown in greeting. */
  userName?: string;
  /** Notification badge count. */
  notifCount?: number;
  /** Tap handlers. */
  onSeeAllInternships?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
};

export function StudentDashboardView({
  showTopBar = true,
  userName = 'Rahul',
  notifCount = 3,
  onSeeAllInternships,
  onOpenNotifications,
  onOpenProfile,
}: StudentDashboardViewProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const [tab, setTab] = useState<string>('all');

  const filteredInternships = useMemo(
    () => (tab === 'all' ? INTERNSHIPS : INTERNSHIPS.filter((i) => i.cat === tab)),
    [tab],
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, !isWide && styles.scrollContentMobile]}
      showsVerticalScrollIndicator={false}
    >
      {showTopBar && (
        <TopBar userName={userName} notifCount={notifCount} onOpenNotifications={onOpenNotifications} onOpenProfile={onOpenProfile} isWide={isWide} />
      )}

      {/* Hero */}
      <HeroCard isWide={isWide} />

      {/* KPI grid */}
      <View style={[styles.kpiGrid, !isWide && styles.kpiGridMobile]}>
        {KPIS.map((k) => <KPICard key={k.label} {...k} isWide={isWide} />)}
      </View>

      {/* Split: feed + right column */}
      <View style={[styles.split, !isWide && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, gap: 14, minWidth: 0 }}>
          {/* Tab strip */}
          <View style={styles.glass}>
            <View style={[styles.cardHeaderRow, { marginBottom: 12 }]}>
              <Text style={styles.cardTitle}>🎯 Top Internship Matches</Text>
              <Pressable onPress={onSeeAllInternships}>
                <Text style={styles.linkText}>See all →</Text>
              </Pressable>
            </View>
            <View style={styles.tabStrip}>
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTab(t.id)}
                    testID={`stud-tab-${t.id}`}
                    style={({ hovered }: any) => [
                      styles.tabItem,
                      active && styles.tabItemActive,
                      hovered && !active && { backgroundColor: 'rgba(255,255,255,0.06)' },
                    ]}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Internship cards */}
          <View style={{ gap: 10 }}>
            {filteredInternships.map((job, idx) => (
              <InternshipCard key={idx} {...job} />
            ))}
          </View>
        </View>

        {/* Right column */}
        <View style={[styles.rightCol, !isWide && { width: '100%' }]}>
          {/* Course Progress */}
          <View style={styles.glass}>
            <View style={styles.cardHeaderRow}>
              <SectionLabel icon={<BookOpen size={14} color="#D4AAFF" />} text="COURSE PROGRESS" />
            </View>
            {COURSES.map((c, idx) => (
              <View key={c.title} style={{ marginTop: idx === 0 ? 6 : 14 }}>
                <View style={styles.rowSplit}>
                  <Text style={styles.courseTitle}>{c.title}</Text>
                  <Text style={styles.coursePct}>{c.pct}%</Text>
                </View>
                <View style={styles.progTrack}>
                  <LinearGradient
                    colors={c.gradient as any}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.progFill, { width: `${c.pct}%` }]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.glass}>
            <View style={[styles.cardHeaderRow, { marginBottom: 12 }]}>
              <SectionLabel icon={<Rocket size={14} color="#D4AAFF" />} text="QUICK ACTIONS" />
            </View>
            <View style={styles.qaGrid}>
              {QUICK_ACTIONS.map((q) => (
                <Pressable
                  key={q.label}
                  style={({ hovered, pressed }: any) => [
                    styles.qaBtn,
                    hovered && { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.20)' },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={[styles.qaIconWrap, { backgroundColor: q.color + '22', borderColor: q.color + '55' }]}>
                    <q.Icon size={16} color={q.color} />
                  </View>
                  <Text style={styles.qaLabel} numberOfLines={1}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Suggested Mentors */}
          <View style={styles.glass}>
            <View style={[styles.cardHeaderRow, { marginBottom: 4 }]}>
              <SectionLabel icon={<Users size={14} color="#D4AAFF" />} text="SUGGESTED MENTORS" />
            </View>
            {MENTORS.map((m, idx) => (
              <View
                key={m.name}
                style={[
                  styles.mentorRow,
                  idx < MENTORS.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
                ]}
              >
                <LinearGradient
                  colors={m.tint as any}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.mentorAvatar}
                >
                  <Text style={styles.mentorInitials}>{m.initials}</Text>
                </LinearGradient>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.mentorName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.mentorRole} numberOfLines={1}>{m.role} · ⭐ {m.rating}</Text>
                </View>
                <Pressable
                  style={({ hovered }: any) => [
                    styles.connectBtn,
                    hovered && { backgroundColor: 'rgba(176,127,223,0.32)' },
                  ]}
                >
                  <Text style={styles.connectBtnText}>Connect</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function TopBar({
  userName, notifCount, onOpenNotifications, onOpenProfile, isWide,
}: {
  userName: string; notifCount: number; onOpenNotifications?: () => void;
  onOpenProfile?: () => void; isWide: boolean;
}) {
  return (
    <View style={[styles.topBar, !isWide && styles.topBarMobile]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting}>Hi {userName} 👋</Text>
        <Text style={styles.greetingSub}>
          You're trending up — let's land that internship.
        </Text>
      </View>
      {isWide && (
        <View style={styles.searchBox}>
          <Search size={14} color="rgba(255,255,255,0.4)" />
          <TextInput
            placeholder="Search anything…"
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.searchInput}
          />
        </View>
      )}
      <Pressable
        onPress={onOpenNotifications}
        testID="dash-notif-btn"
        style={({ hovered }: any) => [styles.iconBtn, hovered && { backgroundColor: 'rgba(255,255,255,0.10)' }]}
      >
        <Bell size={18} color="#D4AAFF" />
        {notifCount > 0 && (
          <View style={styles.notifDot}>
            <Text style={styles.notifDotText}>{notifCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function HeroCard({ isWide }: { isWide: boolean }) {
  return (
    <View style={[styles.heroShell, !isWide && { padding: 20 }]}>
      <LinearGradient
        colors={['#5F259F', '#7B3DBF', '#2D0760']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative orbs */}
      <View pointerEvents="none" style={[styles.heroOrb, { width: 300, height: 300, top: -80, right: -40, backgroundColor: 'rgba(176,127,223,0.18)' }]} />
      <View pointerEvents="none" style={[styles.heroOrb, { width: 180, height: 180, bottom: -40, left: 20, backgroundColor: 'rgba(95,37,159,0.22)' }]} />

      <View style={[styles.heroBody, !isWide && { flexDirection: 'column', gap: 24 }]}>
        {/* Left side */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.heroEyebrow}>🤖 AI CAREER ASSISTANT · PERSONALISED ROADMAP</Text>
          <Text style={[styles.heroTitle, !isWide && { fontSize: 22, lineHeight: 28 }]}>
            You're <Text style={{ color: '#D4AAFF' }}>{HERO.progress}%</Text> toward your goal:
            {'\n'}
            <Text style={{ color: '#D4AAFF' }}>{HERO.goal}</Text>
          </Text>
          <View style={{ marginTop: 8, marginBottom: isWide ? 18 : 8 }}>
            <View style={styles.rowSplit}>
              <Text style={styles.heroProgLabel}>Career Progress</Text>
              <Text style={styles.heroProgVal}>{HERO.progress}%</Text>
            </View>
            <View style={styles.heroProgTrack}>
              <LinearGradient
                colors={['rgba(255,255,255,0.5)', '#FFFFFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progFill, { width: `${HERO.progress}%` }]}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              style={({ hovered, pressed }: any) => [
                styles.heroPrimaryBtn,
                hovered && { transform: [{ translateY: -1 }] },
                pressed && { transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={styles.heroPrimaryText}>View Full Roadmap</Text>
              <ArrowRight size={14} color="#5F259F" />
            </Pressable>
            <Pressable
              style={({ hovered }: any) => [
                styles.heroGhostBtn,
                hovered && { backgroundColor: 'rgba(255,255,255,0.18)' },
              ]}
            >
              <Text style={styles.heroGhostText}>Browse Internships</Text>
            </Pressable>
          </View>
        </View>

        {/* Right side: stat tiles */}
        <View style={[styles.heroStatsRow, !isWide && { width: '100%', justifyContent: 'space-between' }]}>
          {HERO.stats.map((s) => (
            <View key={s.label} style={[styles.heroStatTile, !isWide && { flex: 1 }]}>
              <s.icon size={20} color="#FFFFFF" />
              <Text style={styles.heroStatVal}>{s.value}</Text>
              <Text style={styles.heroStatLabel} numberOfLines={1}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function KPICard({
  label, value, note, color, tint, Icon, isWide,
}: typeof KPIS[number] & { isWide: boolean }) {
  return (
    <Pressable
      style={({ hovered }: any) => [
        styles.kpiCard,
        !isWide && { flexBasis: '47%', flexGrow: 1 },
        hovered && { backgroundColor: 'rgba(255,255,255,0.10)', transform: [{ translateY: -2 }] },
      ]}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: tint }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiNote, { color }]}>{note}</Text>
    </Pressable>
  );
}

function InternshipCard({
  role, company, location, stipend, match, emoji,
}: typeof INTERNSHIPS[number]) {
  return (
    <Pressable
      style={({ hovered }: any) => [
        styles.internCard,
        hovered && { backgroundColor: 'rgba(255,255,255,0.10)' },
      ]}
    >
      <View style={styles.internEmoji}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.internRole} numberOfLines={1}>{role}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 3 }}>
          <Text style={styles.internMeta}>{company}</Text>
          <View style={styles.metaPill}><MapPin size={10} color="rgba(255,255,255,0.45)" /><Text style={styles.metaPillText}>{location}</Text></View>
          <View style={styles.metaPill}><Coins size={10} color="rgba(255,255,255,0.45)" /><Text style={styles.metaPillText}>{stipend}</Text></View>
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.internMatch}>{match}%</Text>
        <Text style={styles.internMatchLabel}>match</Text>
      </View>
      <Pressable
        style={({ hovered }: any) => [
          styles.applyBtn,
          hovered && { transform: [{ translateY: -1 }] },
        ]}
      >
        <Text style={styles.applyBtnText}>Apply</Text>
      </Pressable>
    </Pressable>
  );
}

function SectionLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      {icon}
      <Text style={styles.sectionLabel}>{text}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { padding: 22, gap: 18, paddingBottom: 60 },
  scrollContentMobile: { padding: 14, gap: 14, paddingBottom: 90 },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarMobile: { paddingTop: Platform.OS === 'ios' ? 6 : 4 },
  greeting: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 22, letterSpacing: -0.4 },
  greetingSub: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
    minWidth: 240,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontFamily: 'DMSans_400Regular', fontSize: 13, ...({ outlineStyle: 'none' } as any) },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2, borderColor: '#1A0438',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifDotText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 9 },

  // Hero
  heroShell: {
    borderRadius: 20, padding: 32, overflow: 'hidden',
    position: 'relative',
  },
  heroOrb: { position: 'absolute', borderRadius: 999, ...({ filter: 'blur(80px)' } as any) },
  heroBody: { flexDirection: 'row', gap: 32, alignItems: 'center' },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 10.5, letterSpacing: 1.4,
    marginBottom: 10, textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF', fontFamily: 'DMSans_700Bold',
    fontSize: 26, lineHeight: 32, letterSpacing: -0.6,
    marginBottom: 14,
  },
  heroProgLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_600SemiBold', fontSize: 11.5 },
  heroProgVal:   { color: '#D4AAFF',                fontFamily: 'DMSans_700Bold',     fontSize: 11.5 },
  heroProgTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  heroPrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22, paddingVertical: 11,
    borderRadius: 12,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  heroPrimaryText: { color: '#5F259F', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  heroGhostBtn: {
    paddingHorizontal: 20, paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  heroGhostText: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  heroStatsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  heroStatTile: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    alignItems: 'center',
    minWidth: 80,
    ...({ backdropFilter: 'blur(12px)' } as any),
  },
  heroStatVal:   { color: '#FFFFFF',                fontFamily: 'DMSans_700Bold', fontSize: 22, marginTop: 6 },
  heroStatLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_600SemiBold', fontSize: 9.5, letterSpacing: 0.4, marginTop: 2 },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiGridMobile: { gap: 10 },
  kpiCard: {
    flexBasis: '23%', flexGrow: 1, minWidth: 150,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 16,
    padding: 18,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  kpiIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiLabel: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 0.6, marginTop: 14, marginBottom: 4 },
  kpiValue: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 26, letterSpacing: -0.5 },
  kpiNote:  { fontFamily: 'DMSans_700Bold', fontSize: 11, marginTop: 5 },

  // Split
  split: { flexDirection: 'row', gap: 14 },
  rightCol: { width: 320, gap: 14 },

  // Cards
  glass: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 16,
    padding: 18,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 14 },
  linkText: { color: '#D4AAFF', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  sectionLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_700Bold', fontSize: 10.5, letterSpacing: 1 },

  // Tabs
  tabStrip: {
    flexDirection: 'row', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 9, alignItems: 'center',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  tabItemActive: {
    backgroundColor: '#5F259F',
    shadowColor: '#5F259F', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  tabText:  { color: 'rgba(255,255,255,0.42)', fontFamily: 'DMSans_700Bold', fontSize: 11.5 },
  tabTextActive: { color: '#FFFFFF' },

  // Internship card
  internCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    flexWrap: 'wrap',
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  internEmoji: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  internRole: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 14.5 },
  internMeta: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 11.5 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 999,
  },
  metaPillText: { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_500Medium', fontSize: 10.5 },
  internMatch: { color: '#86EFAC', fontFamily: 'DMSans_700Bold', fontSize: 18 },
  internMatchLabel: { color: 'rgba(255,255,255,0.42)', fontFamily: 'DMSans_500Medium', fontSize: 9.5, marginTop: -2 },
  applyBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  applyBtnText: { color: '#5F259F', fontFamily: 'DMSans_700Bold', fontSize: 12 },

  // Course progress
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseTitle: { color: '#FFFFFF', fontFamily: 'DMSans_500Medium', fontSize: 12.5, flex: 1, paddingRight: 8 },
  coursePct:   { color: '#D4AAFF', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  progTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  progFill: { height: '100%', borderRadius: 3 },

  // Quick Actions
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qaBtn: {
    flexBasis: '47%', flexGrow: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderRadius: 10,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  qaIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  qaLabel: { color: '#FFFFFF', fontFamily: 'DMSans_600SemiBold', fontSize: 12, flexShrink: 1 },

  // Mentors
  mentorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
  },
  mentorAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  mentorInitials: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 12.5 },
  mentorName: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 13 },
  mentorRole: { color: 'rgba(255,255,255,0.50)', fontFamily: 'DMSans_400Regular', fontSize: 11, marginTop: 1 },
  connectBtn: {
    backgroundColor: 'rgba(176,127,223,0.18)',
    borderColor: 'rgba(176,127,223,0.30)',
    borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
    ...({ cursor: 'pointer', transitionDuration: '160ms' } as any),
  },
  connectBtnText: { color: '#D4AAFF', fontFamily: 'DMSans_700Bold', fontSize: 11 },
});
