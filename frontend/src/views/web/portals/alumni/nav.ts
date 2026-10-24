/** Alumni portal — navigation + shell configuration for the shared <PortalShell>. */
import {
  LayoutDashboard, Sparkles, Briefcase, Users, Calendar, Wallet, Tag, CreditCard,
  GraduationCap, Home, User, CalendarCheck, FileText, BookOpen, Ticket,
} from 'lucide-react-native';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import type { NavItem, PortalConfig } from '@/src/ui/shell/types';

export type AlumniNavId =
  | 'dashboard' | 'career-ai' | 'internships' | 'network' | 'events'
  | 'financial' | 'deals' | 'wallet' | 'higher-ed' | 'rentals' | 'courses' | 'profile'
  | 'my-bookings' | 'my-applications' | 'my-workshops' | 'my-tickets';

export const NAV: (NavItem & { id: AlumniNavId })[] = [
  { id: 'dashboard',       label: 'Dashboard',          Icon: LayoutDashboard },
  { id: 'career-ai',       label: 'Career AI',          Icon: Sparkles, spark: true },
  { id: 'internships',     label: 'Internships & Jobs', Icon: Briefcase },
  { id: 'my-applications', label: 'My Applications',    Icon: FileText },
  { id: 'network',         label: 'Network',            Icon: Users },
  { id: 'my-bookings',     label: 'My Bookings',        Icon: CalendarCheck },
  { id: 'my-tickets',      label: 'My Tickets',         Icon: Ticket },
  { id: 'events',          label: 'Events',             Icon: Calendar },
  { id: 'my-workshops',    label: 'My Workshops',       Icon: BookOpen },
  { id: 'courses',         label: 'Courses',            Icon: BookOpen, hideOnMobile: true },
  { id: 'financial',       label: 'Financial',          Icon: Wallet, hideOnMobile: true },
  { id: 'deals',           label: 'Deals & Offers',     Icon: Tag, hideOnMobile: true },
  { id: 'wallet',          label: 'SA Wallet',          Icon: CreditCard },
  { id: 'higher-ed',       label: 'Higher Education',   Icon: GraduationCap, hideOnMobile: true },
  { id: 'rentals',         label: 'Rentals',            Icon: Home, hideOnMobile: true },
  { id: 'profile',         label: 'Profile',            Icon: User },
];

export const ALUMNI_PORTAL: PortalConfig = {
  portal: 'alumni',
  darkOnly: true, // views still hardcode dark colours; see src/ui/theme.ts
  base: 'alumni-portal',
  defaultTab: 'dashboard',
  brand: { title: 'Student Alumni', subtitle: 'Alumni Dashboard' },
  tour: 'alumni',
  idCard: { label: 'My Alumni Card', route: '/id-card' },
  agentK: true,
  profileTab: 'profile',
  mobileTabs: ['dashboard', 'internships', 'network', 'events', 'profile'],
  topbar: { greetingTab: 'dashboard', greetingSub: "Here's your personalised dashboard for today", search: {} },
  profile: (user) => {
    const ai: any = user?.alumni_info || {};
    const subtitle = [ai.current_role, ai.current_company].filter(Boolean).join(' @ ')
      || (ai.graduation_year ? `Class of ${ai.graduation_year}` : user?.graduation_year ? `Class of ${user.graduation_year}` : 'Verified Alumni');
    return { name: displayName(user), subtitle, initials: displayInitials(user), email: user?.email };
  },
  nav: NAV,
};
