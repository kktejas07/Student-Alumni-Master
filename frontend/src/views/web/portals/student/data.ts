/**
 * Student Portal — mock data (replace with API calls when backend is wired).
 */
export const STUDENT = {
  name: 'Arjun Sharma',
  initials: 'AS',
  year: 'Final Year',
  saId: 'SA-26-834291',
  career: { goal: 'Product Designer at a Top Tech Company', progressPct: 42 },
  career_score: 74,
  score_delta: 8,
};

export const KPIS = [
  { id: 'matches',   label: 'Internship Matches', value: '48',  delta: '↑ 12 new today',     color: 'blue'  as const },
  { id: 'courses',   label: 'Courses In Progress',value: '3',   delta: '68% avg completion', color: 'purple' as const },
  { id: 'mentors',   label: 'Mentor Connections', value: '5',   delta: '2 sessions this week',color: 'green' as const },
  { id: 'score',     label: 'Career Score',       value: '74',  delta: '↑ 8pts this month',   color: 'amber' as const },
];

export const TOP_MATCHES = [
  { id: 1, role: 'Software Engineering Intern', company: 'Google',   location: 'Bengaluru', match: 87, type: 'Internship', logo: 'G', logoBg: '#4285F4' },
  { id: 2, role: 'Product Management Intern',   company: 'Flipkart', location: 'Bengaluru', match: 87, type: 'Internship', logo: 'F', logoBg: '#2874F0' },
  { id: 3, role: 'Data Science Intern',         company: 'Swiggy',   location: 'Remote',    match: 87, type: 'Internship', logo: 'S', logoBg: '#FC8019' },
  { id: 4, role: 'UX Design Intern',            company: 'Razorpay', location: 'Bengaluru', match: 84, type: 'Internship', logo: 'R', logoBg: '#02C0F1' },
  { id: 5, role: 'Marketing Intern',            company: 'Zomato',   location: 'Gurugram',  match: 79, type: 'Internship', logo: 'Z', logoBg: '#E23744' },
];

export const RECOMMENDED_MENTORS = [
  { id: 1, name: 'Dr. Suresh Rao', initials: 'SR', role: 'CTO',         company: 'Zepto', rating: 5.0, sessions: 142, price: 999, color: '#7B3DBF' },
  { id: 2, name: 'Nisha Kapoor',   initials: 'NK', role: 'VP Product',  company: 'CRED',  rating: 4.9, sessions: 89,  price: 799, color: '#EC4899' },
  { id: 3, name: 'Rohit Mehta',    initials: 'RM', role: 'Sr. Engineer',company: 'Stripe',rating: 4.8, sessions: 67,  price: 899, color: '#22C55E' },
];

export const UPCOMING_EVENTS = [
  { id: 1, title: 'HackIndia 2026',           date: 'May 10–12', mode: 'Hybrid', kind: 'free' as const, accent: '#A78BFA' },
  { id: 2, title: 'DSA Championship S4',      date: 'May 15',    mode: 'Online', kind: 'free' as const, accent: '#34D399' },
  { id: 3, title: 'System Design Masterclass',date: 'May 18',    mode: 'Online', kind: 'paid' as const, price: 499, accent: '#FCD34D' },
];

export const PROFILE_COMPLETION = { score: 68, missing: ['Skills', 'Projects', 'Resume'] };
