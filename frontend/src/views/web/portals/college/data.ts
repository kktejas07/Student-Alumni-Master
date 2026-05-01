/**
 * College Admin Portal — mock data.
 */
export const COLLEGE = {
  name: "St. Xavier's College",
  shortName: "St. Xavier's",
  initials: 'SX',
  rank: 'NAAC A++',
  emoji: '🌅',
  placementRate: 94,
  upcomingHighlight: 'Google drive confirmed for May 10',
};

export const KPIS = [
  { id: 'students',  label: 'Total Students',     value: '3,240', delta: '↑ 180 enrolled this sem',   color: 'blue'   as const },
  { id: 'alumni',    label: 'Alumni Network',     value: '8,400', delta: '↑ 320 this year',           color: 'purple' as const },
  { id: 'placement', label: 'Placement Rate',     value: '94%',   delta: '↑ 4% vs last year',         color: 'green'  as const },
  { id: 'events',    label: 'Events This Month',  value: '12',    delta: '3 upcoming this week',     color: 'amber'  as const },
];

export const DEPT_PLACEMENT = [
  { dept: 'Computer Science', pct: 98, placed: 235, color: '#22D3EE' },
  { dept: 'Design',           pct: 96, placed: 43,  color: '#A78BFA' },
  { dept: 'Electronics',      pct: 92, placed: 90,  color: '#34D399' },
  { dept: 'Management',       pct: 91, placed: 77,  color: '#FBBF24' },
  { dept: 'Mechanical',       pct: 88, placed: 63,  color: '#F472B6' },
];

export const RECENT_ACTIVITY = [
  { id: 1, kind: 'enrollment'  as const, text: '180 students enrolled for Semester 5',                  time: 'Today, 9:00 AM',  icon: 'GraduationCap', tint: '#22D3EE' },
  { id: 2, kind: 'alumni'      as const, text: 'Priya Singh (Batch 2022) joined the alumni network',     time: 'Today, 11:30 AM', icon: 'UserPlus',      tint: '#A78BFA' },
  { id: 3, kind: 'event'       as const, text: 'Tech Fest 2026 — RSVP count reached 240',                 time: 'Today, 2:15 PM',  icon: 'Calendar',      tint: '#FBBF24' },
  { id: 4, kind: 'placement'   as const, text: 'Google campus drive confirmed for May 10',               time: 'Yesterday',       icon: 'Briefcase',     tint: '#34D399' },
  { id: 5, kind: 'announcement' as const, text: 'Exam schedule sent to 1,200 students',                  time: '1 day ago',       icon: 'Bell',          tint: '#F472B6' },
  { id: 6, kind: 'placement'   as const, text: 'Siddharth Pai (Batch 2023) placed at OpenAI — $180K',     time: '2 days ago',      icon: 'TrendingUp',    tint: '#FCD34D' },
];

export const UPCOMING_EVENTS = [
  { id: 1, title: 'Tech Fest 2026',       date: 'May 5–7, 2026',  attending: 240, color: '#22D3EE' },
  { id: 2, title: 'Google Campus Drive',  date: 'May 10, 2026',   attending: 85,  color: '#34D399' },
  { id: 3, title: 'Convocation 2026',     date: 'May 18, 2026',   attending: 620, color: '#A78BFA' },
  { id: 4, title: 'Alumni Meet 2026',     date: 'May 25, 2026',   attending: 380, color: '#FBBF24' },
];

export const TOP_RECRUITERS = [
  { id: 1, name: 'Google',    offers: 24, ctc: '38 LPA', color: '#4285F4' },
  { id: 2, name: 'Microsoft', offers: 18, ctc: '32 LPA', color: '#00A4EF' },
  { id: 3, name: 'Amazon',    offers: 22, ctc: '28 LPA', color: '#FF9900' },
  { id: 4, name: 'Razorpay',  offers: 15, ctc: '22 LPA', color: '#02C0F1' },
  { id: 5, name: 'Infosys',   offers: 42, ctc: '6 LPA',  color: '#007CC3' },
];
