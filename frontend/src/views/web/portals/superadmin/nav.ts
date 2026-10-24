/** Super-admin portal — navigation + shell configuration for the shared <PortalShell>. */
import {
  LayoutDashboard, Building2, GraduationCap, UserCheck, Users, Calendar, CreditCard,
  BarChart3, CheckCircle, Sparkles, Settings, Workflow, Upload, Handshake, Megaphone,
  UserPlus, Mail, Award, ShieldOff, ShieldCheck, Bot, Radar, Video, Store, Tag, GitPullRequest, Briefcase,
} from 'lucide-react-native';
import { displayName, displayInitials } from '@/src/lib/portalHome';
import type { NavItem, PortalConfig } from '@/src/ui/shell/types';

export type SuperAdminNavId =
  | 'overview' | 'agents' | 'visitor-radar' | 'bgv' | 'colleges' | 'students' | 'mentors' | 'alumni' | 'events'
  | 'payments' | 'analytics' | 'approvals' | 'ai-insights' | 'settings'
  | 'workflows' | 'imports' | 'partners' | 'promotions' | 'talent-pool' | 'echo-showcase'
  | 'vendors' | 'coupons' | 'careers' | 'newsletter' | 'certificates' | 'email-health' | 'teams' | 'cicd-evaluator' | 'code-health';

export const NAV: (NavItem & { id: SuperAdminNavId })[] = [
  { id: 'overview',        label: 'Overview',            Icon: LayoutDashboard },
  { id: 'visitor-radar',   label: 'Live Visitor Radar',  Icon: Radar },
  { id: 'agents',          label: 'Autonomous Agents',   Icon: Bot },
  { id: 'code-health',     label: 'Code Health Agent',   Icon: ShieldCheck },
  { id: 'cicd-evaluator',  label: 'CI/CD PR Evaluator',  Icon: GitPullRequest },
  { id: 'bgv',             label: 'BGV & Accounts',      Icon: ShieldCheck },
  { id: 'colleges',        label: 'Colleges',            Icon: Building2 },
  { id: 'students',        label: 'Students',            Icon: GraduationCap },
  { id: 'mentors',         label: 'Mentors',             Icon: UserCheck },
  { id: 'alumni',          label: 'Alumni',              Icon: Users },
  { id: 'careers',         label: 'Careers',             Icon: Briefcase },
  { id: 'talent-pool',     label: 'Talent Pool',         Icon: UserPlus },
  { id: 'imports',         label: 'Import Contacts',     Icon: Upload },
  { id: 'events',          label: 'Events',              Icon: Calendar },
  { id: 'echo-showcase',   label: 'Echo Showcase',       Icon: Sparkles, tag: 'CMS' },
  { id: 'vendors',         label: 'Marketplace Vendors', Icon: Store },
  { id: 'coupons',         label: 'Coupons',             Icon: Tag },
  { id: 'partners',        label: 'Partners',            Icon: Handshake },
  { id: 'promotions',      label: 'Promotions',          Icon: Megaphone },
  { id: 'newsletter',      label: 'Newsletter',          Icon: Mail },
  { id: 'email-health',    label: 'Email health',        Icon: ShieldOff },
  { id: 'certificates',    label: 'Certificates',        Icon: Award },
  { id: 'payments',        label: 'Payments',            Icon: CreditCard },
  { id: 'analytics',       label: 'Analytics',           Icon: BarChart3 },
  { id: 'approvals',       label: 'Approvals',           Icon: CheckCircle, countKey: 'approvals', alert: true },
  { id: 'ai-insights',     label: 'AI Insights',         Icon: Sparkles, spark: true },
  { id: 'workflows',       label: 'Workflows',           Icon: Workflow },
  { id: 'teams',           label: 'Teams Meetings',      Icon: Video },
  { id: 'settings',        label: 'Settings',            Icon: Settings },
];

export const SUPERADMIN_PORTAL: PortalConfig = {
  portal: 'superadmin',
  base: 'super-admin',
  defaultTab: 'overview',
  brand: { title: 'Student Alumni', subtitle: 'Super Admin' },
  tour: 'super_admin',
  agentK: true,
  profileTab: 'settings',
  railWidth: 264,
  mobileTabs: ['overview', 'approvals', 'events', 'analytics', 'settings'],
  topbar: { greetingTab: 'overview', search: { placeholder: 'Search colleges, users, events…' } },
  profile: (user) => ({ name: displayName(user), subtitle: 'Super Admin', initials: displayInitials(user), email: user?.email }),
  nav: NAV,
};
