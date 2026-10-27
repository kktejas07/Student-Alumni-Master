/** College admin portal — navigation + shell configuration for the shared <PortalShell>. */
import {
  LayoutDashboard, GraduationCap, Users, UserCheck, Calendar, Megaphone,
  BarChart3, Sparkles, Briefcase, Trophy, User, Plus,
} from 'lucide-react-native';
import { displayName } from '@/src/lib/portalHome';
import type { NavItem, PortalConfig } from '@/src/ui/shell/types';

export type CollegeNavId =
  | 'dashboard' | 'students' | 'alumni' | 'mentors' | 'events' | 'create-event'
  | 'announcements' | 'analytics' | 'ai-insights' | 'career-intel'
  | 'placements' | 'profile';

export const NAV: (NavItem & { id: CollegeNavId })[] = [
  { id: 'dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
  { id: 'students',      label: 'Students',      Icon: GraduationCap },
  { id: 'alumni',        label: 'Alumni',        Icon: Users },
  { id: 'mentors',       label: 'Mentors',       Icon: UserCheck, countKey: 'mentors', alert: true },
  { id: 'events',        label: 'Events',        Icon: Calendar, countKey: 'events' },
  { id: 'create-event',  label: 'Create Event',  Icon: Plus, hideOnMobile: true },
  { id: 'announcements', label: 'Announcements', Icon: Megaphone, countKey: 'announcements' },
  { id: 'analytics',     label: 'Analytics',     Icon: BarChart3 },
  { id: 'ai-insights',   label: 'AI Insights',   Icon: Sparkles, spark: true, countKey: 'ai-insights' },
  { id: 'career-intel',  label: 'Career Intel',  Icon: Briefcase },
  { id: 'placements',    label: 'Placements',    Icon: Trophy },
  { id: 'profile',       label: 'Profile',       Icon: User },
];

const initials = (name: string) => {
  const parts = (name || '').split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const collegeNameOf = (user: any) =>
  user?.college_info?.institution_name || user?.school_info?.institution_name || displayName(user);

export const COLLEGE_PORTAL: PortalConfig = {
  portal: 'college',
  darkOnly: true, // views still hardcode dark colours; see src/ui/theme.ts
  base: 'college-portal',
  defaultTab: 'dashboard',
  brand: { title: 'Student Alumni', subtitle: 'College Admin' },
  tour: 'college',
  agentK: true,
  profileTab: 'profile',
  mobileTabs: ['dashboard', 'students', 'events', 'placements', 'profile'],
  topbar: { greetingTab: 'dashboard', search: { placeholder: 'Search students, alumni, events…' } },
  profile: (user) => {
    const name = collegeNameOf(user);
    const accreditation = user?.college_info?.accreditation || user?.college_info?.accreditations?.[0] || '';
    return { name, subtitle: accreditation || 'College Administrator', initials: initials(name), email: user?.email };
  },
  nav: NAV,
};
