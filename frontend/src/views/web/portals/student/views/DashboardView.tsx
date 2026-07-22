// @ts-nocheck
/**
 * Student Portal — Dashboard view (true RN port of HTML spec).
 *
 * Layout (3-column responsive):
 *   • AI Daily Brief banner
 *   • AI Career Assistant Roadmap card
 *   • 4 KPI tiles
 *   • Top Matches list (left col) + Recommended Mentors (right col)
 *   • Upcoming Events row
 *   • Profile completion CTA
 */
import React, { useContext, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { StudentPortalNavContext } from '../StudentPortalNavContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles, Briefcase, BookOpen, Users, TrendingUp, Calendar, MapPin,
  Star, ArrowRight, Check, ExternalLink, Bookmark, BookmarkCheck, MessageSquare, GraduationCap, IndianRupee,
} from '../iconShims';
import { SC, FONTS, useColors, PALETTE, TYPO } from '../tokens';
import { GRADS } from '../gradients';
import { GRAD, IconBox, SectionLabel } from '../portalkit';
import { GlassCard, glassStyle } from '../glass';
import { FadeInView, Stagger, PressScale, SparkIcon, ShimmerGradient, AnimatedRingFill } from '../motion';
import { Av, Badge, KpiCard } from '../atoms';
import * as MOCK from '../data';
import {
  NX, KpiCard as NxKpiCard, AreaChartCard, ActivityCard, NxPageHeader,
} from './NexusComponents';
import type { KpiSpark, KpiRing, AreaPoint, ActivityItem } from './NexusComponents';
import { usePortalData } from '@/src/lib/portalApi';

import { TrendingCompaniesWidget } from './TrendingCompaniesWidget';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';
import { AdBanner } from '@/src/views/web/components/AdBanner';

const KPI_ICONS = { matches: Briefcase, applications: Briefcase, courses: BookOpen, mentors: Users, score: TrendingUp, events: Calendar } as const;

const STUDENT_MOCK = {
  student: MOCK.STUDENT,
  kpis: MOCK.KPIS,
  topMatches: MOCK.TOP_MATCHES,
  recommendedMentors: MOCK.RECOMMENDED_MENTORS,
  upcomingEvents: MOCK.UPCOMING_EVENTS,
  profileCompletion: MOCK.PROFILE_COMPLETION,
};

export function DashboardView() {
  // Theme-reactive colors (Apple HIG light + dark)
  const C = useColors();
  const router = useRouter();
  const toast = useToast();
  const portalNav = useContext(StudentPortalNavContext);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'intelligence'>('opportunities');
  // Authenticated user — drives per-user dashboard data.
  const authUser = useAuthStore((u) => u.user);
  const dashPath = authUser?.email
    ? `/student/dashboard?student_email=${encodeURIComponent(authUser.email)}`
    : '/student/dashboard';
  const { data } = usePortalData<typeof STUDENT_MOCK>(dashPath, STUDENT_MOCK);
  // NexusOS Intelligence Center — live sparklines/area-chart/activity feed
  const intelPath = authUser?.email
    ? `/student/intelligence?student_email=${encodeURIComponent(authUser.email)}`
    : '/student/intelligence';
  const { data: intel } = usePortalData<any>(intelPath, null as any, 60_000);
  // Live counters polled every 15s so users can SEE auto-refresh working
  const { data: live } = usePortalData<any>('/live/counters', null as any, 15_000);
  // Fetch actual live jobs from /api/jobs/feed (limit 5)
  const { data: jobsFeed, loading: jobsLoading } = usePortalData<any>('/jobs/feed?page=1&per_page=5', null as any);
  const STUDENT = data!.student;
  const KPIS = data!.kpis;
  const TOP_MATCHES = data!.topMatches;
  const RECOMMENDED_MENTORS = data!.recommendedMentors;
  const UPCOMING_EVENTS = data!.upcomingEvents;
  const PROFILE_COMPLETION = data!.profileCompletion;
  const stats = (data as any)?.stats || {
    profile_strength: (data as any)?.profileCompletion?.score ?? 92,
    profile_subtext: ((data as any)?.profileCompletion?.score ?? 92) >= 100 ? "All set!" : "Keep going!",
    applications: 16,
    applications_subtext: "2 new updates",
    network: 128,
    network_subtext: "Connections",
    events: 7,
    events_subtext: "Upcoming",
  };
  const displayJobs = jobsFeed?.items || [];
  const [appliedJobIds, setAppliedJobIds] = useState<Record<string, boolean>>({});
  const [savedJobIds, setSavedJobIds] = useState<Record<string, boolean>>({});

  const handleApplyJob = async (item: any) => {
    const jobId = item.job_id || String(item.id);
    const company = item.company || '—';
    const title = item.role || item.title || 'Role';
    const isApplied = item.applied || appliedJobIds[jobId];

    if (isApplied) {
      toast.info('Already Applied', `You have already applied for ${title} at ${company}.`);
      return;
    }

    const applyUrl = item.source_urls?.[0] || item.url || item.apply_url || '';

    setAppliedJobIds((prev) => ({ ...prev, [jobId]: true }));

    try {
      await request('/jobs/track-apply', {
        method: 'POST',
        body: { job_id: jobId, source_url: applyUrl },
      });
    } catch (err) {
      try {
        await request(`/student/internships/${jobId}/apply`, {
          method: 'POST',
          body: { cover_note: 'Applied from dashboard.' },
        });
      } catch (e) {
        // ignore
      }
    }

    if (applyUrl) {
      if (Platform.OS === 'web') {
        try {
          window.open(applyUrl, '_blank');
        } catch (e) {
          // ignore
        }
      } else {
        Linking.openURL(applyUrl).catch(() => {});
      }
    }

    toast.success('Application Tracked! 🎉', `Applied to ${title} at ${company}.`);
  };

  const handleSaveJob = async (item: any) => {
    const jobId = item.job_id || String(item.id);
    const isSaved = item.saved || savedJobIds[jobId];
    const endpoint = isSaved ? '/jobs/unsave' : '/jobs/save';

    setSavedJobIds((prev) => ({ ...prev, [jobId]: !isSaved }));

    try {
      await request(endpoint, {
        method: 'POST',
        body: { job_id: jobId },
      });
      toast.success(isSaved ? 'Removed' : 'Saved! 🔖', isSaved ? 'Removed from saved jobs.' : 'Saved to your bookmarks.');
    } catch (e: any) {
      toast.error('Error', e?.message || 'Failed to update saved status');
    }
  };

  const COURSES_DATA = [
    { id: 1, title: 'React - The Complete Guide', provider: 'Udemy', hours: '38 hours', level: 'Advanced', rating: '4.7', learners: '12.4k learners', logo: 'React', logoColor: '#61DAFB', bg: 'rgba(97, 218, 251, 0.1)' },
    { id: 2, title: 'Python for Data Science', provider: 'Coursera', hours: '24 hours', level: 'Intermediate', rating: '4.6', learners: '8.7k learners', logo: 'Python', logoColor: '#3776AB', bg: 'rgba(55, 118, 171, 0.1)' },
    { id: 3, title: 'AWS Certified Solutions Architect', provider: 'AWS Training', hours: '40 hours', level: 'Advanced', rating: '4.8', learners: '6.2k learners', logo: 'AWS', logoColor: '#FF9900', bg: 'rgba(255, 153, 0, 0.1)' },
    { id: 4, title: 'SQL - Interview Preparation', provider: 'Great Learning', hours: '18 hours', level: 'Beginner', rating: '4.5', learners: '5.1k learners', logo: 'SQL', logoColor: '#00758F', bg: 'rgba(0, 117, 143, 0.1)' },
    { id: 5, title: 'Playwright Automation Testing', provider: 'Udemy', hours: '20 hours', level: 'Intermediate', rating: '4.6', learners: '4.3k learners', logo: 'Play', logoColor: '#2EAD33', bg: 'rgba(46, 173, 51, 0.1)' },
  ];

  const MENTORS_DATA = [
    { id: 1, name: 'Rahul Sharma', role: 'Senior SDE @ Google', rating: '4.9 (128)', sessions: '24 sessions', initials: 'RS', color: '#7B3DBF' },
    { id: 2, name: 'Priya Mehta', role: 'Product Manager @ Microsoft', rating: '4.8 (96)', sessions: '18 sessions', initials: 'PM', color: '#EC4899' },
    { id: 3, name: 'Arjun Verma', role: 'Data Scientist @ Amazon', rating: '4.7 (87)', sessions: '16 sessions', initials: 'AV', color: '#22C55E' },
    { id: 4, name: 'Sneha Iyer', role: 'UX Designer @ Adobe', rating: '4.8 (74)', sessions: '14 sessions', initials: 'SI', color: '#F59E0B' },
    { id: 5, name: 'Vikram Singh', role: 'Cloud Architect @ AWS', rating: '4.9 (105)', sessions: '20 sessions', initials: 'VS', color: '#3B82F6' },
  ];

  const { width } = useWindowDimensions();
  const stack = width < 1100;
  const matchW = stack ? '100%' : '64%';
  const mentorW = stack ? '100%' : '34%';
  const isPhone = width < 768;
  const isDesktop = width >= 1280;

  // ── NexusOS Intelligence Center — wired to /api/student/intelligence ──
  // (See backend portals.py @router.get("/student/intelligence"))
  // Falls back to deterministic mock arrays during initial load.
  const FALLBACK_SPARK_APPS    = [3, 5, 4, 7, 6, 9, 11, 10, 13, 15, 14, 18];
  const FALLBACK_SPARK_VIEWS   = [120, 132, 128, 145, 158, 170, 165, 182, 190, 205, 218, 234];
  const FALLBACK_SPARK_MATCH   = [62, 64, 63, 66, 68, 70, 72, 71, 74, 76, 78, 81];
  const FALLBACK_AUDIENCE: AreaPoint[] = [
    { m: 'Jan', v: 32 }, { m: 'Feb', v: 41 }, { m: 'Mar', v: 38 },
    { m: 'Apr', v: 56 }, { m: 'May', v: 62 }, { m: 'Jun', v: 78 },
    { m: 'Jul', v: 95 }, { m: 'Aug', v: 112 }, { m: 'Sep', v: 134 },
  ];
  const FALLBACK_ACTIVITY: ActivityItem[] = [
    {
      title: 'Application Submitted', sub: 'Stripe • Software Engineer Intern',
      amount: '+1', amountTone: 'positive', time: '12m ago',
      icon: 'briefcase-check-outline', tint: '#7B3DBF', bgTint: 'rgba(123,61,191,0.16)',
    },
    {
      title: 'Mentor Session Booked', sub: 'Aarav Sharma • Wed 4:00 PM',
      amount: null, amountTone: null, time: '1h ago',
      icon: 'account-tie-voice-outline', tint: '#A78BFA', bgTint: 'rgba(167,139,250,0.18)',
    },
  ];

  const k = intel?.kpis;
  const NX_AUDIENCE: AreaPoint[] = (intel?.momentum?.data as AreaPoint[]) || FALLBACK_AUDIENCE;
  const NX_ACTIVITY: ActivityItem[] = (intel?.activityFeed as ActivityItem[]) || FALLBACK_ACTIVITY;
  const momentumTitle: string = intel?.momentum?.title || 'Career Momentum';
  const momentumSubtitle: string = intel?.momentum?.subtitle || 'Profile views per month — last 9 months';

  const NX_KPIS: (KpiSpark | KpiRing)[] = [
    {
      kind: 'spark',
      label: k?.applications?.label || 'Applications Sent',
      value: String(k?.applications?.value ?? 18),
      numeric: Number(k?.applications?.value ?? 18),
      icon: 'briefcase-outline', accent: '#7B3DBF',
      trend: k?.applications?.trend || { value: '12.5%', positive: true },
      spark: (k?.applications?.spark as number[]) || FALLBACK_SPARK_APPS,
    },
    {
      kind: 'spark',
      label: k?.views?.label || 'Mentor Interactions',
      value: String(k?.views?.value ?? 234),
      numeric: Number(k?.views?.value ?? 234),
      icon: 'eye-outline', accent: '#A78BFA',
      trend: k?.views?.trend || { value: '8.2%', positive: true },
      spark: (k?.views?.spark as number[]) || FALLBACK_SPARK_VIEWS,
    },
    {
      kind: 'spark',
      label: k?.match?.label || 'Avg Match Score',
      value: `${k?.match?.value ?? 81}%`,
      numeric: Number(k?.match?.value ?? 81),
      suffix: k?.match?.suffix || '%',
      icon: 'lightning-bolt', accent: '#C4B5FD',
      trend: k?.match?.trend || { value: '4.1%', positive: true },
      spark: (k?.match?.spark as number[]) || FALLBACK_SPARK_MATCH,
    },
    {
      kind: 'ring',
      label: k?.completion?.label || 'Profile Completion',
      value: 'On Track',
      icon: 'account-check-outline', accent: '#7B3DBF',
      ringPct: Number(
        k?.completion?.ringPct ??
        (typeof PROFILE_COMPLETION?.score === 'number' ? PROFILE_COMPLETION.score : 78),
      ),
      metaLine: k?.completion?.metaLine || 'Last updated: just now',
    },
  ];

  return (
    <View
      style={[
        { gap: 16, position: 'relative' },
        Platform.OS === 'web' ? ({
          backgroundImage:
            'radial-gradient(900px 720px at 12% 6%,  rgba(167,139,250,0.55) 0%, rgba(167,139,250,0) 60%),' +
            'radial-gradient(900px 720px at 95% 10%, rgba(236, 72,153,0.40) 0%, rgba(236, 72,153,0) 65%),' +
            'radial-gradient(1100px 900px at 60% 110%, rgba(123, 61,191,0.58) 0%, rgba(123, 61,191,0) 70%)',
          marginHorizontal: -24,
          marginTop: -16,
          marginBottom: -16,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 16,
          borderRadius: 24,
        } as any) : null,
      ]}
    >
      {Platform.OS !== 'web' && <Aurora intensity="strong" />}

      {/* ── KPI Metrics Cards at the top ── */}
      <View style={s.kpiRow}>
        {/* Profile Strength Card */}
        <View style={[glassStyle(), s.kpiCardMockup]}>
          <View style={s.kpiCardLeft}>
            <Text style={[s.kpiTitleText, { color: '#C084FC' }]}>Profile Strength</Text>
            <Text style={s.kpiValText}>{stats.profile_strength}%</Text>
            <Text style={s.kpiSubText}>{stats.profile_subtext}</Text>
          </View>
          <View style={s.kpiCardRight}>
            <View style={s.progressRingOuter}>
              <View style={s.progressRingFill} />
              <View style={s.progressRingInner} />
            </View>
          </View>
        </View>

        {/* Applications Card */}
        <View style={[glassStyle(), s.kpiCardMockup]}>
          <View style={s.kpiCardLeft}>
            <Text style={[s.kpiTitleText, { color: '#818CF8' }]}>Applications</Text>
            <Text style={s.kpiValText}>{stats.applications}</Text>
            <Text style={s.kpiSubText}>{stats.applications_subtext}</Text>
          </View>
          <View style={s.kpiCardRight}>
            <View style={[s.kpiIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
              <Briefcase size={15} color="#818CF8" />
            </View>
          </View>
        </View>

        {/* Network Card */}
        <View style={[glassStyle(), s.kpiCardMockup]}>
          <View style={s.kpiCardLeft}>
            <Text style={[s.kpiTitleText, { color: '#C084FC' }]}>Network</Text>
            <Text style={s.kpiValText}>{stats.network}</Text>
            <Text style={s.kpiSubText}>{stats.network_subtext}</Text>
          </View>
          <View style={s.kpiCardRight}>
            <View style={[s.kpiIconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)', borderColor: 'rgba(192, 132, 252, 0.3)' }]}>
              <Users size={15} color="#C084FC" />
            </View>
          </View>
        </View>

        {/* Events Card */}
        <View style={[glassStyle(), s.kpiCardMockup]}>
          <View style={s.kpiCardLeft}>
            <Text style={[s.kpiTitleText, { color: '#F87171' }]}>Events</Text>
            <Text style={s.kpiValText}>{stats.events}</Text>
            <Text style={s.kpiSubText}>{stats.events_subtext}</Text>
          </View>
          <View style={s.kpiCardRight}>
            <View style={[s.kpiIconBox, { backgroundColor: 'rgba(248, 113, 113, 0.15)', borderColor: 'rgba(248, 113, 113, 0.3)' }]}>
              <Calendar size={15} color="#F87171" />
            </View>
          </View>
        </View>
      </View>

      {/* ── Tab Switcher (Opportunities vs Intelligence Center) ── */}
      <View style={s.tabContainer}>
        <Pressable
          style={[s.tabButton, activeTab === 'opportunities' && s.tabButtonActive]}
          onPress={() => setActiveTab('opportunities')}
        >
          <Briefcase size={14} color={activeTab === 'opportunities' ? '#fff' : SC.muted} />
          <Text style={[s.tabText, activeTab === 'opportunities' && s.tabTextActive]}>Opportunities</Text>
        </Pressable>
        <Pressable
          style={[s.tabButton, activeTab === 'intelligence' && s.tabButtonActive]}
          onPress={() => setActiveTab('intelligence')}
        >
          <TrendingUp size={14} color={activeTab === 'intelligence' ? '#fff' : SC.muted} />
          <Text style={[s.tabText, activeTab === 'intelligence' && s.tabTextActive]}>Intelligence Center</Text>
        </Pressable>
      </View>

      {activeTab === 'opportunities' && (
        <View style={{ flexDirection: 'column', gap: 20 }}>
        {/* Jobs Section */}
        <View style={[glassStyle(), s.mockupSection, { borderColor: 'rgba(139, 92, 246, 0.25)' }]}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderTitle}>
              <View style={[s.sectionIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                <Briefcase size={16} color="#A78BFA" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sectionTitleText}>Jobs</Text>
                <Text style={s.sectionDescText}>Find the right job opportunities and kickstart your career.</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => portalNav?.navigate('internships')}
              style={s.seeAllBtnPurple}
            >
              <Text style={s.seeAllBtnText}>View all Jobs</Text>
              <ArrowRight size={12} color="#fff" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
          
          <View style={s.sectionList}>
            {jobsLoading && !displayJobs.length ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#A78BFA" />
              </View>
            ) : (
              displayJobs.map((item: any, idx: number) => {
                const jobId = item.job_id || String(item.id);
                const role = item.role || item.title || 'Intern';
                const company = item.company || '—';
                const jobType = item.type || item.job_type || 'Internship';
                const location = item.location || 'Remote';
                const matchPct = item.match_score !== undefined ? item.match_score : (item.match || getStableMockData(jobId, company, jobType).matchPct);
                const salary = formatSalary(item) || getStableMockData(jobId, company, jobType).fallbackSalary;
                const initials = (company || '?')[0].toUpperCase();
                const logoColor = item.logoColor || '#fff';
                const logoBg = item.bg || pickColor(company);
                const isApplied = item.applied || appliedJobIds[jobId];
                const isSaved = item.saved || savedJobIds[jobId];
                return (
                  <React.Fragment key={jobId}>
                    {idx > 0 && <View style={s.divider} />}
                    <View style={s.sectionItem}>
                      <View style={[s.companyLogoShim, { backgroundColor: logoBg }]}>
                        <Text style={[s.companyLogoShimText, { color: logoColor }]}>{initials}</Text>
                      </View>
                      <View style={{ flex: 2, minWidth: 0 }}>
                        <Text numberOfLines={1} style={s.itemMainText}>{role}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          <Text style={s.itemSubText}>{company} · {jobType}</Text>
                          {item.is_recommended && (
                            <View style={[s.matchPill, { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}><Text style={[s.matchPillText, { fontSize: 9.5, color: '#FCA5A5' }]}>🔥 Recommended</Text></View>
                          )}
                          <View style={[s.matchPill, { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }]}><Text style={[s.matchPillText, { fontSize: 9.5 }]}>✦ {matchPct}% match</Text></View>
                        </View>
                      </View>
                      <View style={{ flex: 1.5, minWidth: 0 }}>
                        <View style={s.metaTextRow}>
                          <MapPin size={10} color={SC.muted} />
                          <Text numberOfLines={1} style={s.metaText}>{location}</Text>
                        </View>
                        <View style={[s.metaTextRow, { marginTop: 2 }]}>
                          <IndianRupee size={10} color={SC.muted} />
                          <Text style={s.metaText}>{salary}</Text>
                        </View>
                      </View>
                      <View style={s.itemActionCol}>
                        <Pressable onPress={() => handleSaveJob(item)} style={s.bookmarkBtn}>
                          {isSaved ? (
                            <BookmarkCheck size={14} color="#A78BFA" />
                          ) : (
                            <Bookmark size={14} color="#A78BFA" />
                          )}
                        </Pressable>
                        <Pressable 
                          onPress={() => handleApplyJob(item)}
                          style={[s.applyBtn, isApplied && { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.4)' }]}
                        >
                          <Text style={[s.applyBtnText, isApplied && { color: '#34D399' }]}>
                            {isApplied ? 'Applied' : 'Apply'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })
            )}
          </View>
        </View>

        {/* Courses Section */}
        <View style={[glassStyle(), s.mockupSection, { borderColor: 'rgba(59, 130, 246, 0.25)' }]}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderTitle}>
              <View style={[s.sectionIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <BookOpen size={16} color="#60A5FA" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sectionTitleText}>Courses</Text>
                <Text style={s.sectionDescText}>Discover expert-led courses to enhance your skills and grow.</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => portalNav?.navigate('courses')}
              style={s.seeAllBtnBlue}
            >
              <Text style={s.seeAllBtnText}>View all Courses</Text>
              <ArrowRight size={12} color="#fff" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
          
          <View style={s.sectionList}>
            {COURSES_DATA.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && <View style={s.divider} />}
                <View style={s.sectionItem}>
                  <View style={[s.companyLogoShim, { backgroundColor: item.bg }]}>
                    <Text style={[s.companyLogoShimText, { color: item.logoColor, fontSize: 11 }]}>{item.logo}</Text>
                  </View>
                  <View style={{ flex: 2, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.itemMainText}>{item.title}</Text>
                    <Text numberOfLines={1} style={s.itemSubText}>{item.provider} · {item.hours} · {item.level}</Text>
                  </View>
                  <View style={{ flex: 1.5, minWidth: 0 }}>
                    <View style={s.metaTextRow}>
                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                      <Text style={[s.metaText, { color: '#F59E0B', fontFamily: FONTS.bold }]}>{item.rating}</Text>
                    </View>
                    <Text style={[s.metaText, { marginTop: 2 }]}>{item.learners}</Text>
                  </View>
                  <View style={s.itemActionCol}>
                    <Pressable 
                      onPress={() => portalNav?.navigate('courses')}
                      style={s.continueBtn}
                    >
                      <Text style={s.continueBtnText}>Continue</Text>
                    </Pressable>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Mentors Section */}
        <View style={[glassStyle(), s.mockupSection, { borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderTitle}>
              <View style={[s.sectionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Users size={16} color="#34D399" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sectionTitleText}>Mentors</Text>
                <Text style={s.sectionDescText}>Connect with experienced mentors and get guidance.</Text>
              </View>
            </View>
            <Pressable 
              onPress={() => portalNav?.navigate('network')}
              style={s.seeAllBtnGreen}
            >
              <Text style={s.seeAllBtnText}>View all Mentors</Text>
              <ArrowRight size={12} color="#fff" style={{ marginLeft: 6 }} />
            </Pressable>
          </View>
          
          <View style={s.sectionList}>
            {MENTORS_DATA.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && <View style={s.divider} />}
                <View style={s.sectionItem}>
                  <Av initials={item.initials} size={36} color={item.color} />
                  <View style={{ flex: 2, minWidth: 0, marginLeft: 12 }}>
                    <Text numberOfLines={1} style={s.itemMainText}>{item.name}</Text>
                    <Text numberOfLines={1} style={s.itemSubText}>{item.role}</Text>
                  </View>
                  <View style={{ flex: 1.5, minWidth: 0 }}>
                    <View style={s.metaTextRow}>
                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                      <Text style={[s.metaText, { color: '#F59E0B', fontFamily: FONTS.bold }]}>{item.rating}</Text>
                    </View>
                    <Text style={[s.metaText, { marginTop: 2 }]}>{item.sessions}</Text>
                  </View>
                  <View style={s.itemActionCol}>
                    <Pressable 
                      onPress={() => portalNav?.navigate('network')}
                      style={s.bookSessionBtn}
                    >
                      <Text style={s.bookSessionBtnText}>Book Session</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => portalNav?.navigate('network')}
                      style={s.chatBtn}
                    >
                      <MessageSquare size={13} color={SC.muted} />
                    </Pressable>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
      )}

      {/* ── NexusOS Intelligence Center ─────────────────────────
          Sparkline KPI tiles + Audience growth area chart + Activity stream.
          Mock arrays for now; backend wiring is the next pass. */}
      {activeTab === 'intelligence' && (
        <View style={s.nxFrame}>
          <NxPageHeader
          title="Intelligence Center"
          subtitle="Real-time signals across applications, profile views and momentum."
          statusLabel="Live"
          ctaLabel="Generate Report"
          onCta={() => {
            toast.success("Intelligence Report Request", "Your profile intelligence report has been requested from Agent K. It will be generated and sent to your registered email address shortly!");
          }}
        />

        {/* KPI cards row */}
        <View style={{
          flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18, marginBottom: 16,
        }}>
          {NX_KPIS.map((k, i) => {
            const w = isPhone ? '100%' : (!isDesktop ? ('48%' as any) : undefined);
            return (
              <View key={k.label} style={{ flex: isDesktop ? 1 : undefined, minWidth: isPhone ? 0 : 220, width: w }}>
                <NxKpiCard data={k} delay={50 + i * 80} sparkWidth={260} />
              </View>
            );
          })}
        </View>

        {/* Main row: chart (2fr) + activity (1fr) */}
        <View style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap: 16, alignItems: 'stretch',
        }}>
          <AreaChartCard
            delay={400}
            title={momentumTitle}
            subtitle={momentumSubtitle}
            data={intel?.momentum || FALLBACK_AUDIENCE}
            color="#7B3DBF"
          />
          <ActivityCard
            delay={480}
            title="Recent Activity"
            items={NX_ACTIVITY}
            ctaLabel="View All Activity"
            onCta={() => toast.success("Activity Stream", "Opening full activity history...")}
          />
        </View>
      </View>
      )}

      {activeTab === 'opportunities' && (
        <>
          {/* Legacy 4 KPI tiles — staggered fade-in for visual rhythm */}
          <Stagger gap={70} baseDelay={120}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {KPIS.map((k) => {
            const Icon = KPI_ICONS[k.id as keyof typeof KPI_ICONS] || Briefcase;
            return <KpiCard key={k.id} Icon={Icon} label={k.label} value={k.value} delta={k.delta} color={k.color} />;
          })}
        </View>
      </Stagger>

      {/* Trending Companies — live from /api/jobs/trending-companies */}
      <TrendingCompaniesWidget />

      {/* Top Matches + Recommended Mentors */}
      <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
        {/* Top Matches */}
        <View style={[s.col, { width: matchW as any, flex: stack ? undefined : 1.9 }]}>
          <View style={s.colHead}>
            <Text style={s.colTitle}>Top Matches for You</Text>
            <Pressable onPress={() => portalNav?.navigate('internships')}><Text style={s.seeAll}>See all →</Text></Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {TOP_MATCHES.slice(0, 3).map((m) => (
              <Pressable
                key={m.id}
                onPress={() => portalNav?.navigate('internships', { q: m.company })}
                style={({ hovered }: any) => [s.matchRow, hovered && { backgroundColor: SC.cardH }]}
              >
                <View style={[s.companyLogo, { backgroundColor: m.logoBg }]}><Text style={s.companyLogoText}>{m.logo}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={s.matchRole}>{m.role}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={s.matchCompany}>{m.company}</Text>
                    <Text style={s.matchDot}>·</Text>
                    <MapPin size={10} color={SC.muted} />
                    <Text style={s.matchCompany}>{m.location}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={s.matchPill}><Text style={s.matchPillText}>✦ {m.match}% match</Text></View>
                  <Badge label={m.type} color="purple" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recommended Mentors */}
        <View style={[s.col, { width: mentorW as any, flex: stack ? undefined : 1 }]}>
          <View style={s.colHead}>
            <Text style={s.colTitle}>Recommended Mentors</Text>
            <Pressable onPress={() => portalNav?.navigate('network')}><Text style={s.seeAll}>See all →</Text></Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {RECOMMENDED_MENTORS.slice(0, 2).map((m) => (
              <View key={m.id} style={s.mentorCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Av initials={m.initials} size={42} color={m.color} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={s.mentorName}>{m.name}</Text>
                    <Text style={s.mentorRole}>{m.role} · {m.company}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Star size={11} color={SC.amber} fill={SC.amber} />
                    <Text style={s.mentorMeta}>{m.rating}</Text>
                    <Calendar size={11} color={SC.muted} style={{ marginLeft: 6 }} />
                    <Text style={s.mentorMeta}>{m.sessions} sessions</Text>
                  </View>
                  <Text style={s.mentorPrice}>₹{m.price}/session</Text>
                </View>
                <Pressable
                  onPress={() => router.push({
                    pathname: '/mentor/[id]',
                    params: {
                      id: m.id,
                      name: m.name,
                      title: m.role,
                      bio: (m.bio || 'Experienced professional ready to share industry insights, career strategies, and guidance.').slice(0, 200) + ((m.bio || '').length > 200 ? '...' : ''),
                      avatar: m.avatar || `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200`,
                      rating: String(m.rating),
                      sessions: String(m.sessions),
                      tags: m.skills?.join(',') || 'System Design,Career Strategy',
                    }
                  })}
                >
                  <LinearGradient
                    colors={[GRAD.from, GRAD.to]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.bookCta}
                  >
                    <Calendar size={12} color="#fff" />
                    <Text style={s.bookCtaText}>Book Session</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Upcoming Events */}
      <View>
        <View style={s.colHead}>
          <Text style={s.colTitle}>Upcoming Events</Text>
          <Pressable onPress={() => portalNav?.navigate('events')}><Text style={s.seeAll}>See all →</Text></Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {UPCOMING_EVENTS.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push({
                pathname: '/event/' + e.id,
                params: {
                  id: e.id,
                  title: e.title,
                  start_date: e.start_date || e.date,
                  venue: e.venue || 'Online',
                  registration_deadline: e.registration_deadline || e.date,
                  category: e.category || 'Workshop',
                  organizer: e.organizer || 'Student Alumni Association',
                  image: e.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400',
                  url: e.url || '',
                  tags: e.tags?.join(',') || 'Networking,Career',
                  price: e.price || '',
                }
              })}
              style={({ hovered }: any) => [s.eventCard, hovered && { backgroundColor: SC.cardH }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={[s.eventIcon, { backgroundColor: e.accent + '22', borderColor: e.accent + '40' }]}>
                  <Calendar size={14} color={e.accent} />
                </View>
                <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'amber'} />
              </View>
              <Text numberOfLines={2} style={s.eventTitle}>{e.title}</Text>
              <Text style={s.eventDate}>{e.date} · {e.mode}</Text>
            </Pressable>
          ))}
        </View>
      </View>


      {/* Profile completion CTA */}
      <LinearGradient
        colors={[SC.primary, SC.primaryD] as any}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.completionCard}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={s.completionLabel}>Profile Score</Text>
            <View style={s.completionScorePill}><Text style={s.completionScoreText}>{PROFILE_COMPLETION.score}%</Text></View>
          </View>
          <Text style={s.completionTitle}>Complete your profile to unlock more opportunities</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {PROFILE_COMPLETION.missing.map((m) => (
              <View key={m} style={s.missingChip}><Text style={s.missingText}>{m}</Text></View>
            ))}
          </View>
        </View>
        <Pressable onPress={() => portalNav?.navigate('profile')} style={({ hovered }: any) => [s.completeCta, hovered && { backgroundColor: '#fff' }]}>
          <Text style={s.completeCtaText}>Complete Profile →</Text>
        </Pressable>
      </LinearGradient>
      </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  nxFrame: {
    backgroundColor: NX.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NX.border,
    padding: 22,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? ({
      // Subtle radial accent to match standalone NexusOS spec
      backgroundImage: 'radial-gradient(circle at 90% 0%, rgba(6,182,212,0.06) 0%, rgba(7,7,10,0) 50%), radial-gradient(circle at 10% 100%, rgba(168,85,247,0.05) 0%, rgba(7,7,10,0) 60%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    } as any) : {}),
  },
  briefRowPad: { padding: 14, paddingHorizontal: 18 },
  briefRowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  briefRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 18,
  },
  briefIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(123,61,191,0.18)', alignItems: 'center', justifyContent: 'center' },
  briefTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  briefSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 1 },
  briefCta: { borderRadius: 10, overflow: 'hidden', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  gradCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 10 },
  briefCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },

  liveStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderColor: 'rgba(34,197,94,0.25)', borderWidth: 1,
  },
  livePulse: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 8px #22C55E, 0 0 14px #22C55E' } as any) : {}),
  },
  liveLabel: { color: '#22C55E', fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 },
  liveTxt: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
  liveAsOf: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11, fontStyle: 'italic' },

  tierCard: {
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14,
    padding: 18,
  },
  tierKicker: { color: SC.accent, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1 },
  tierTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginTop: 2 },
  tierScore: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 14 },
  tierSub: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 },
  tierChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', borderWidth: 1,
  },
  tierChipText: { fontFamily: FONTS.bold, fontSize: 11 },

  roadmapCard: {
    backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 16,
    padding: 22,
  },
  kicker: { color: SC.accent, fontFamily: FONTS.xbold, fontSize: 10.5, letterSpacing: 1 },
  roadmapTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 26, letterSpacing: -0.6 },
  roadmapGoal: { color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 22, letterSpacing: -0.4, marginTop: 4 },
  progLabel: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11.5, letterSpacing: 0.2 },
  progPct:   { color: SC.accent, fontFamily: FONTS.xbold, fontSize: 12 },
  progTrack: { height: 6, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progFill:  { height: '100%', borderRadius: 4 },

  primaryCta: { paddingHorizontal: 16, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  primaryCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12.5 },
  secCta: { paddingHorizontal: 16, height: 36, borderRadius: 10, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  secCtaText: { color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 12.5 },

  col: {},
  colHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  colTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 16, letterSpacing: -0.3 },
  seeAll: { color: SC.accent, fontFamily: FONTS.bold, fontSize: 11.5 },

  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SC.glassBg, borderColor: SC.glassBorder, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer', transitionDuration: '160ms',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      boxShadow: SC.glassShadow,
    } as any) : {}),
  },
  companyLogo: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  companyLogoText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 },
  matchRole: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  matchCompany: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 },
  matchDot: { color: SC.dim, fontFamily: FONTS.med, fontSize: 11 },
  matchPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.30)', borderWidth: 1 },
  matchPillText: { color: '#86EFAC', fontFamily: FONTS.bold, fontSize: 11 },

  mentorCard: {
    backgroundColor: SC.glassBg, borderColor: SC.glassBorder, borderWidth: 1, borderRadius: 12,
    padding: 14,
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      boxShadow: SC.glassShadow,
    } as any) : {}),
  },
  mentorName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 },
  mentorRole: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 },
  mentorMeta: { color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 },
  mentorPrice: { color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 12 },
  bookCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, height: 34, borderRadius: 8, ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  bookCtaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },

  eventCard: {
    flex: 1, minWidth: 220,
    backgroundColor: SC.glassBg, borderColor: SC.glassBorder, borderWidth: 1, borderRadius: 12,
    padding: 14,
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer', transitionDuration: '160ms',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      boxShadow: SC.glassShadow,
    } as any) : {}),
  },
  eventIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5, lineHeight: 18 },
  eventDate: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },

  completionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 16, padding: 18,
  },
  completionLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.xbold, fontSize: 11.5, letterSpacing: 0.5 },
  completionScorePill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  completionScoreText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 11 },
  completionTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, marginTop: 4 },
  missingChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  missingText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 10.5 },
  completeCta: { paddingHorizontal: 18, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...(Platform.OS === 'web' ? ({ cursor: 'pointer', transitionDuration: '160ms' } as any) : {}) },
  completeCtaText: { color: SC.primaryD, fontFamily: FONTS.xbold, fontSize: 12.5 },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  kpiCardMockup: {
    flex: 1,
    minWidth: 200,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SC.glassBg,
    borderColor: SC.glassBorder,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      boxShadow: SC.glassShadow,
    } as any) : {}),
  },
  kpiCardLeft: {
    flex: 1,
  },
  kpiCardRight: {
    marginLeft: 8,
  },
  kpiTitleText: {
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  kpiValText: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 22,
    marginTop: 4,
    letterSpacing: -0.4,
  },
  kpiSubText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11,
    marginTop: 2,
  },
  kpiIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressRingOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'rgba(192, 132, 252, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingFill: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#C084FC',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  progressRingInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'transparent',
  },
  mockupSection: {
    backgroundColor: 'rgba(10, 8, 22, 0.65)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    ...(Platform.OS === 'web' ? ({
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      boxShadow: SC.glassShadow,
    } as any) : {}),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 16,
  },
  sectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleText: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionDescText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2,
  },
  seeAllBtnPurple: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  seeAllBtnBlue: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  seeAllBtnGreen: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  seeAllBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  sectionList: {
    gap: 0,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  companyLogoShim: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  companyLogoShimText: {
    fontFamily: FONTS.xbold,
    fontSize: 16,
  },
  itemMainText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13.5,
  },
  itemSubText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2,
  },
  metaTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
  },
  itemActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookmarkBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  applyBtn: {
    backgroundColor: '#6D28D9',
    width: 76,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  applyBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  continueBtn: {
    backgroundColor: '#2563EB',
    width: 76,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  continueBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  bookSessionBtn: {
    borderColor: '#10B981',
    borderWidth: 1,
    width: 105,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  bookSessionBtnText: {
    color: '#34D399',
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  chatBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
    gap: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    ...(Platform.OS === 'web' ? ({
      cursor: 'pointer',
      transitionDuration: '180ms',
    } as any) : {}),
  },
  tabButtonActive: {
    backgroundColor: 'rgba(123, 61, 191, 0.25)',
    borderColor: 'rgba(123, 61, 191, 0.4)',
  },
  tabText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  tabTextActive: {
    color: '#fff',
  },
});

/* ── Helpers ── */
function formatSalary(j: any): string {
  if (j.salary) return j.salary;
  if (j.salary_min || j.salary_max) {
    const cur = j.currency || 'USD';
    const sym = cur === 'INR' ? '₹' : cur === 'EUR' ? '€' : '$';
    const shortMoney = (n: number) => {
      if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${(n/1_000).toFixed(0)}K`;
      return String(n);
    };
    if (j.salary_min && j.salary_max) return `${sym}${shortMoney(j.salary_min)}–${sym}${shortMoney(j.salary_max)}/yr`;
    if (j.salary_min) return `${sym}${shortMoney(j.salary_min)}+/yr`;
  }
  return '';
}

function pickColor(seed: string): string {
  const COLOR_PALETTE = ['#F59E0B', '#3B82F6', '#10B981', '#A78BFA', '#EC4899', '#F97316', '#06B6D4', '#84CC16'];
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

function getStableMockData(jobId: string, company: string, jobType: string) {
  let hash = 0;
  const str = jobId || company || 'default';
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const matchPct = 82 + (hash % 16);
  let fallbackSalary = '';
  if (jobType === 'Internship') {
    const salaries = ['₹35,000/mo', '₹60,000/mo', '₹85,000/mo', '₹1,20,000/mo'];
    fallbackSalary = salaries[hash % salaries.length];
  } else {
    const salaries = ['₹8-12 LPA', '₹14-18 LPA', '₹22-28 LPA', '₹32-38 LPA'];
    fallbackSalary = salaries[hash % salaries.length];
  }
  return { matchPct, fallbackSalary };
}
