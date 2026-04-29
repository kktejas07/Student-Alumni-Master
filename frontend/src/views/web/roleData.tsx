/**
 * Mock dashboard datasets for Mentor + College roles.
 * Used by MentorDashboardView and CollegeDashboardView.
 */
import {
  Briefcase, BookOpen, Users, Trophy, FileText, Calendar, Award,
  Building2, GraduationCap, MessageSquare, Star, TrendingUp, DollarSign,
} from 'lucide-react-native';

const ICON = (Comp: any, color = '#FFFFFF') => <Comp size={24} color={color} strokeWidth={1.6} />;

// ─── MENTOR ──────────────────────────────────────────────────────────────────
export const MENTOR_DATA = {
  hero: {
    eyebrow: '🌟 MENTOR HUB · YOUR IMPACT THIS MONTH',
    titlePrefix: "You've helped",
    titleHighlight: '84 students',
    titleSuffix: 'level up their careers this month.',
    cta1: 'Open Calendar',
    cta2: 'Post a Session',
    progress: 92,
    progressLabel: 'Profile completion',
    stats: [
      { label: 'Rating',    value: '4.9', icon: Star },
      { label: 'Sessions',  value: '38',  icon: Calendar },
      { label: 'Students',  value: '84',  icon: Users },
    ],
  },
  kpis: [
    { label: 'Sessions This Month', value: '38',     note: '↑ 12 vs last month',     color: '#86EFAC', tint: 'rgba(16,185,129,0.18)', Icon: Calendar },
    { label: 'Earnings',            value: '₹68K',   note: '6 pending payouts',      color: '#D4AAFF', tint: 'rgba(124,58,237,0.20)', Icon: DollarSign },
    { label: 'Avg Rating',          value: '4.9',    note: '32 verified reviews',    color: '#FCD34D', tint: 'rgba(180,83,9,0.25)',   Icon: Star },
    { label: 'Active Students',     value: '84',     note: '12 new this week',       color: '#FCA5A5', tint: 'rgba(220,38,38,0.18)',  Icon: Users },
  ],
  feedTitle: '📅 Upcoming Sessions',
  feedTabs: [
    { id: 'all',   label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week',  label: 'This Week' },
    { id: 'month', label: 'This Month' },
  ],
  feed: [
    { role: 'System Design Mock Interview', sub: 'with Aarav Kumar',    location: '60 min', stipend: 'Tomorrow 4 PM', match: 100, emoji: '🎯', cat: 'today',   ctaLabel: 'Join' },
    { role: 'Career Roadmap Review',        sub: 'with Sneha Iyer',     location: '45 min', stipend: 'Today 7 PM',    match: 100, emoji: '🗺️', cat: 'today',   ctaLabel: 'Join' },
    { role: 'Portfolio Critique',           sub: 'with Karan Verma',    location: '30 min', stipend: 'Wed 11 AM',     match: 95,  emoji: '🎨', cat: 'week',    ctaLabel: 'View' },
    { role: 'AI Career Q&A',                sub: '12 students booked',  location: '60 min', stipend: 'Fri 6 PM',      match: 90,  emoji: '🤖', cat: 'week',    ctaLabel: 'View' },
  ],
  // Right column: Course Progress → Recent Reviews; Quick Actions; Suggested Mentors → Top Students
  rightColTitle1: 'RECENT REVIEWS',
  rightColIcon1: BookOpen,
  reviews: [
    { who: 'Priya Mehta',  text: 'Crystal clear roadmap. Got 3 callbacks!',          stars: 5 },
    { who: 'Arjun Kapoor', text: 'Best system design coaching I’ve had.',            stars: 5 },
    { who: 'Anjali Nair',  text: 'Incredibly thoughtful feedback on my portfolio.',  stars: 5 },
  ],
  quickActions: [
    { label: 'Post a Slot',     Icon: Calendar,    color: '#A78BFA' },
    { label: 'View Calendar',   Icon: Calendar,    color: '#34D399' },
    { label: 'Earnings',        Icon: DollarSign,  color: '#FCD34D' },
    { label: 'Edit Profile',    Icon: Award,       color: '#F472B6' },
  ],
  rightColTitle3: 'TOP STUDENTS',
  rightColIcon3: Users,
  people: [
    { name: 'Aarav Kumar',     role: 'CS · IIT Bombay · Yr 3',     rating: 4.9, initials: 'AK', tint: ['#5F259F', '#B07FDF'] },
    { name: 'Sneha Iyer',      role: 'Design · NID · Yr 2',         rating: 4.8, initials: 'SI', tint: ['#1D4ED8', '#60A5FA'] },
    { name: 'Karan Verma',     role: 'PM · IIM-A',                  rating: 5.0, initials: 'KV', tint: ['#10B981', '#34D399'] },
  ],
  peopleCta: 'Message',
};

// ─── COLLEGE ─────────────────────────────────────────────────────────────────
export const COLLEGE_DATA = {
  hero: {
    eyebrow: '🏛️ INSTITUTION DASHBOARD · CAMPUS OVERVIEW',
    titlePrefix: 'Your campus pulse:',
    titleHighlight: '1,240 active students',
    titleSuffix: 'building careers right now.',
    cta1: 'Run Campus Event',
    cta2: 'Add Students',
    progress: 78,
    progressLabel: 'Placement readiness',
    stats: [
      { label: 'Engaged',     value: '76%', icon: TrendingUp },
      { label: 'Placements',  value: '312', icon: Trophy },
      { label: 'Recruiters',  value: '48',  icon: Briefcase },
    ],
  },
  kpis: [
    { label: 'Active Students',  value: '1,240', note: '↑ 12% MoM',           color: '#86EFAC', tint: 'rgba(16,185,129,0.18)', Icon: GraduationCap },
    { label: 'Events This Month',value: '14',    note: '6 with QR check-in',  color: '#D4AAFF', tint: 'rgba(124,58,237,0.20)', Icon: Calendar },
    { label: 'Placement Rate',   value: '78%',   note: '+9 pp YoY',           color: '#FCD34D', tint: 'rgba(180,83,9,0.25)',   Icon: Trophy },
    { label: 'Engagement Score', value: '92',    note: 'Top 5% nationally',   color: '#FCA5A5', tint: 'rgba(220,38,38,0.18)',  Icon: Star },
  ],
  feedTitle: '📅 Upcoming Campus Events',
  feedTabs: [
    { id: 'all',     label: 'All' },
    { id: 'career',  label: 'Career' },
    { id: 'tech',    label: 'Tech' },
    { id: 'social',  label: 'Social' },
  ],
  feed: [
    { role: 'Campus Placement Drive',  sub: 'Microsoft, Google, Stripe',     location: 'Auditorium', stipend: 'Tue 9 AM',  match: 100, emoji: '🏢', cat: 'career', ctaLabel: 'Manage' },
    { role: 'Hack the North',          sub: '24h hackathon · 480 reg',       location: 'Lab Block',  stipend: 'Sat 10 AM', match: 95,  emoji: '💻', cat: 'tech',   ctaLabel: 'View' },
    { role: 'Alumni Homecoming',       sub: '300+ alumni RSVPed',            location: 'Main Lawn',  stipend: 'Fri 6 PM',  match: 92,  emoji: '🎓', cat: 'social', ctaLabel: 'View' },
    { role: 'AI Career Bootcamp',      sub: 'Free for B.Tech 3rd year',      location: 'Online',     stipend: 'Next Mon',  match: 90,  emoji: '🤖', cat: 'career', ctaLabel: 'Manage' },
  ],
  rightColTitle1: 'TOP DEPARTMENTS',
  rightColIcon1: Building2,
  // overload courses → departments
  reviews: [
    { who: 'CSE Department',    text: '94% placement · ₹18.4L avg', stars: 5 },
    { who: 'Mech Engineering',  text: '76% placement · ₹9.2L avg',  stars: 4 },
    { who: 'Design (B.Des)',    text: '88% placement · ₹14.8L avg', stars: 5 },
  ],
  quickActions: [
    { label: 'Add Students',    Icon: Users,       color: '#A78BFA' },
    { label: 'Post Event',      Icon: Calendar,    color: '#34D399' },
    { label: 'View Reports',    Icon: FileText,    color: '#FCD34D' },
    { label: 'Manage Alumni',   Icon: GraduationCap, color: '#F472B6' },
  ],
  rightColTitle3: 'TOP RECRUITERS',
  rightColIcon3: Briefcase,
  people: [
    { name: 'Microsoft India',   role: '12 hires · CSE focus',  rating: 4.9, initials: 'MS', tint: ['#10B981', '#34D399'] },
    { name: 'Google',            role: '8 hires · multi-disc',  rating: 5.0, initials: 'GG', tint: ['#1D4ED8', '#60A5FA'] },
    { name: 'Razorpay',          role: '6 hires · FinTech',     rating: 4.8, initials: 'RZ', tint: ['#5F259F', '#B07FDF'] },
  ],
  peopleCta: 'Open',
};
