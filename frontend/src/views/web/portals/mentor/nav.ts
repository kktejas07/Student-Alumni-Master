/** Mentor portal — navigation + shell configuration for the shared <PortalShell>. */
import {
  LayoutDashboard, Users, Calendar, UserPlus, Network, Coins, Star, Plus, User, Sparkles, Clock,
} from 'lucide-react-native';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import type { NavItem, PortalConfig } from '@/src/ui/shell/types';

export type NavId = 'dashboard' | 'students' | 'sessions' | 'requests' | 'network' | 'earnings' | 'feedback' | 'event' | 'availability' | 'profile' | 'ai-studio';

export const NAV: (NavItem & { id: NavId })[] = [
  { id: 'dashboard',    label: 'Dashboard',        Icon: LayoutDashboard },
  { id: 'ai-studio',    label: 'AI Studio',        Icon: Sparkles, spark: true },
  { id: 'students',     label: 'My Connections',   Icon: Users,    countKey: 'students' },
  { id: 'sessions',     label: 'Sessions',         Icon: Calendar, countKey: 'sessions' },
  { id: 'requests',     label: 'Session Requests', Icon: UserPlus, countKey: 'requests', alert: true },
  { id: 'availability', label: 'Availability',     Icon: Clock },
  { id: 'network',      label: 'Network',          Icon: Network },
  { id: 'earnings',     label: 'Earnings',         Icon: Coins },
  { id: 'feedback',     label: 'Feedback',         Icon: Star },
  { id: 'event',        label: 'Create Event',     Icon: Plus, hideOnMobile: true },
  { id: 'profile',      label: 'Profile',          Icon: User },
];

export const PAGE_TITLES: Record<NavId, string> = Object.fromEntries(NAV.map((n) => [n.id, n.label])) as Record<NavId, string>;

export const MENTOR_PORTAL: PortalConfig = {
  portal: 'mentor',
  darkOnly: true, // views still hardcode dark colours; see src/ui/theme.ts
  base: 'mentor-portal',
  defaultTab: 'dashboard',
  brand: { title: 'Mentor Portal', subtitle: 'Student Alumni' },
  tour: 'mentor',
  idCard: { label: 'My Mentor Card', route: '/id-card' },
  agentK: true,
  profileTab: 'profile',
  mobileTabs: ['dashboard', 'sessions', 'requests', 'earnings', 'profile'],
  topbar: { greetingTab: 'dashboard', search: { placeholder: 'Search mentees, sessions…' } },
  profile: (user) => {
    const role = user?.mentor_info?.current_role || user?.mentor_info?.job_title || user?.current_role || user?.headline || 'Mentor';
    const company = user?.mentor_info?.current_company || user?.mentor_info?.organization || user?.current_company || '';
    return { name: displayName(user), subtitle: company ? `${role} @ ${company}` : role, initials: displayInitials(user), email: user?.email };
  },
  nav: NAV,
};
