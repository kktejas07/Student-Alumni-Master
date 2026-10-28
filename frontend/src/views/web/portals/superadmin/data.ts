/**
 * Super Admin Portal — mock data.
 */
export const ADMIN = {
  name: 'Super Admin',
  email: 'admin@studentalumni.in',
  initials: 'SA',
  role: 'Platform Admin · Full Access',
};

export const KPIS = [
  { id: 'colleges',    icon: 'Building2',     label: 'Total Colleges',         value: '48',        delta: '↑ 6 this month',   color: 'amber'  as const },
  { id: 'students',    icon: 'GraduationCap', label: 'Total Students',         value: '1,24,800',  delta: '↑ 2.4% growth',    color: 'amber'  as const },
  { id: 'mentors',     icon: 'UserCheck',     label: 'Active Mentors',         value: '3,240',     delta: '↑ 180 new',         color: 'amber'  as const },
  { id: 'alumni',      icon: 'Users',         label: 'Alumni Network',         value: '84,000',    delta: '↑ 3,200 joined',    color: 'amber'  as const },
  { id: 'revenue',     icon: 'CreditCard',    label: 'Revenue This Month',     value: '₹28.4L',    delta: '↑ 12% vs last',     color: 'amber'  as const },
  { id: 'events',      icon: 'Calendar',      label: 'Active Events',          value: '156',       delta: '↑ 24 this week',    color: 'amber'  as const },
  { id: 'approvals',   icon: 'CheckCircle',   label: 'Pending Approvals',      value: '12',        delta: '↓ 4 urgent',         color: 'amber'  as const },
  { id: 'engagement',  icon: 'BarChart3',     label: 'Platform Engagement',    value: '78%',       delta: '↑ 3 pts',           color: 'amber'  as const },
];

export const RECENT_ACTIVITY = [
  { id: 1, icon: 'Building2',     text: 'IIT Delhi joined the platform',                 sub: 'College onboarded',     time: '5 min ago' },
  { id: 2, icon: 'Sparkles',      text: 'Dr. Priya Mehta completed 100 sessions',         sub: 'Mentor milestone',      time: '22 min ago' },
  { id: 3, icon: 'Users',         text: "180 new students enrolled at St. Xavier's",      sub: 'Bulk enrollment',       time: '1 hr ago' },
  { id: 4, icon: 'CreditCard',    text: '₹4.2L payout processed to 38 mentors',           sub: 'Monthly payout',        time: '3 hrs ago' },
  { id: 5, icon: 'AlertTriangle', text: 'BITS Pilani — College approval pending',          sub: 'Awaiting verification', time: '5 hrs ago' },
];

export const PLATFORM_USERS = [
  { label: 'Students',  pct: 72, count: '1,24,800', color: '#FBBF24' },
  { label: 'Alumni',    pct: 18, count: '84,000',   color: '#F97316' },
  { label: 'Mentors',   pct: 7,  count: '3,240',    color: '#A78BFA' },
  { label: 'Colleges',  pct: 3,  count: '48',       color: '#22C55E' },
];

export const MONTHLY_ENROLLMENTS = [
  { month: 'Dec', value: 1200 },
  { month: 'Jan', value: 1800 },
  { month: 'Feb', value: 2100 },
  { month: 'Mar', value: 1700 },
  { month: 'Apr', value: 2400 },
  { month: 'May', value: 3100 },
];

export const REVENUE_BREAKDOWN = [
  { source: 'Mentor sessions',     amount: '₹12.4L',  pct: 44, color: '#FBBF24' },
  { source: 'Premium subscriptions', amount: '₹8.6L',   pct: 30, color: '#F97316' },
  { source: 'Event tickets',       amount: '₹4.8L',   pct: 17, color: '#A78BFA' },
  { source: 'College SaaS plans',  amount: '₹2.6L',   pct: 9,  color: '#22C55E' },
];
