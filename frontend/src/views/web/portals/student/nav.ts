/**
 * Student portal — navigation + shell configuration.
 * The shell itself is the shared <PortalShell>; this file only says what the
 * student portal contains.
 */
import {
  LayoutDashboard, Sparkles, Briefcase, Users, Calendar, Wallet, Tag, CreditCard,
  GraduationCap, Home, User, CalendarCheck, BookOpen, Ticket, Award, Zap,
} from 'lucide-react-native';
import { api } from '@/src/models/services/api';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import type { NavItem, PortalConfig } from '@/src/ui/shell/types';

export type StudentNavId =
  | 'dashboard' | 'career-ai' | 'internships' | 'network' | 'myevents' | 'events'
  | 'financial' | 'deals' | 'wallet' | 'higher-ed' | 'rentals' | 'courses' | 'profile'
  | 'my-bookings' | 'my-workshops' | 'my-tickets' | 'my-certificates' | 'echo-showcase' | string;

export const NAV: (NavItem & { id: StudentNavId })[] = [
  { id: 'dashboard',       label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'career-ai',       label: 'Career AI',          Icon: Sparkles, spark: true },
  { id: 'internships',     label: 'Internships & Jobs', Icon: Briefcase },
  { id: 'network',         label: 'Network',            Icon: Users },
  { id: 'my-bookings',     label: 'My Bookings',        Icon: CalendarCheck },
  { id: 'my-tickets',      label: 'My Tickets',         Icon: Ticket },
  { id: 'my-certificates', label: 'My Certificates',    Icon: Award },
  { id: 'myevents',        label: 'My Events',          Icon: Calendar },
  { id: 'my-workshops',    label: 'My Workshops',       Icon: BookOpen },
  { id: 'courses',         label: 'Courses',            Icon: BookOpen, hideOnMobile: true },
  { id: 'financial',       label: 'Financial',          Icon: Wallet, hideOnMobile: true },
  { id: 'deals',           label: 'Deals & Offers',     Icon: Tag, hideOnMobile: true },
  { id: 'wallet',          label: 'SA Wallet',          Icon: CreditCard },
  { id: 'higher-ed',       label: 'Higher Education',   Icon: GraduationCap, hideOnMobile: true },
  { id: 'rentals',         label: 'Rentals',            Icon: Home, hideOnMobile: true },
  { id: 'profile',         label: 'Profile',            Icon: User },
];

/** Every id the shell knows; anything else in the URL is an ECHO showcase slug. */
export const KNOWN_IDS: string[] = [...NAV.map((n) => n.id), 'events', 'echo-showcase'];
export const isEchoSlug = (id: string) => !KNOWN_IDS.includes(id);

function yearLabel(user: any): string {
  const gy = user?.graduation_year || user?.school_info?.graduation_year;
  const now = new Date().getFullYear();
  if (gy && Number(gy) === now) return 'Final Year';
  if (gy && Number(gy) === now + 1) return 'Pre-Final Year';
  return gy ? `Class of ${gy}` : user?.school_info?.class_or_year || user?.year || 'Student';
}

export const STUDENT_PORTAL: PortalConfig = {
  portal: 'student',
  base: 'student-portal',
  defaultTab: 'dashboard',
  brand: { title: 'Student Alumni', subtitle: 'Student Dashboard' },
  tour: 'student',
  idCard: { label: 'My Student Card', route: '/id-card' },
  agentK: true,
  aiFab: true,
  profileTab: 'profile',
  mobileTabs: ['dashboard', 'career-ai', 'network', 'myevents', 'profile'],
  promoHiddenOn: ['internships'],
  topbar: { greetingTab: 'dashboard', greetingSub: "Here's your personalised dashboard for today", search: { placeholder: 'Search jobs, mentors, courses…' } },
  profile: (user) => ({ name: displayName(user), subtitle: yearLabel(user), initials: displayInitials(user), email: user?.email }),
  nav: [
    ...NAV.slice(0, 3),
    {
      group: 'echo-showcase',
      label: 'ECHO Showcase',
      Icon: Zap,
      tag: 'LIVE',
      children: [],
      loadChildren: () => api.listEchoShowcases().then((res: any) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        return items.map((s: any) => ({ id: s.slug, label: s.title }));
      }),
      isChildActive: (active) => active === 'echo-showcase' || isEchoSlug(active),
    },
    ...NAV.slice(3),
  ],
};
