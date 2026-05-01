/**
 * Mentor Portal — data (1:1 from the spec, slimmed where helpful).
 */
import { MC } from './tokens';

export const MENTOR = {
  name: 'Dr. Suresh Rao',
  role: 'CTO',
  company: 'Zepto',
  college: 'IIT Bombay',
  batch: 2008,
  avatar: 'SR',
  color: MC.teal,
  sessions: 142,
  rating: 4.9,
  price: 999,
  expertise: ['System Design', 'Career Guidance', 'Startup Advice'],
};

export const STUDENTS = [
  { id:1, name:'Arjun Sharma',   avatar:'AS', color:'#5EEAD4', college:'IIT Bombay',  branch:'B.Tech CSE', year:2026, saId:'SA-26-834291', status:'active',
    interests:['Software Engineering','Data Science'], skills:['Python','React','SQL','ML'],
    goals:['Crack FAANG SDE role','Improve system design'], sessionsTotal:4, sessionsCompleted:3,
    nextSession:{date:'May 7, 2026',time:'10:00',topic:'System Design Mock Interview',daysAway:7},
    lastSession:{date:'Apr 22, 2026',notes:'Covered LLD patterns. Good progress on OOP. Needs more concurrency practice.'},
    progress:72, cgpa:8.9, linkedin:'linkedin.com/in/arjunsharma', github:'github.com/arjuns',
    joinedOn:'Mar 10, 2026', tags:['FAANG Prep','System Design'], messages:3 },
  { id:2, name:'Priya Nair',     avatar:'PN', color:'#EC4899', college:'IIT Bombay',  branch:'B.Tech EE',  year:2026, saId:'SA-26-772014', status:'active',
    interests:['Data Science','Research'], skills:['Python','TensorFlow','SQL','Statistics'],
    goals:['PhD in ML / Research role','Paper publication'], sessionsTotal:3, sessionsCompleted:2,
    nextSession:{date:'May 9, 2026',time:'14:00',topic:'Research Career Paths Discussion',daysAway:9},
    lastSession:{date:'Apr 28, 2026',notes:'Discussed research statement. Very well-articulated motivation. Target top ML conferences.'},
    progress:58, cgpa:9.4, linkedin:'linkedin.com/in/priyanair', github:'github.com/priyanair',
    joinedOn:'Mar 20, 2026', tags:['Research','ML'], messages:0 },
  { id:3, name:'Kabir Das',      avatar:'KD', color:'#F97316', college:'BITS Pilani', branch:'B.E. CS',     year:2025, saId:'SA-25-660812', status:'active',
    interests:['Entrepreneurship','Software Engineering'], skills:['Go','Kubernetes','AWS','React'],
    goals:['Build & launch a startup','Get product-market fit'], sessionsTotal:6, sessionsCompleted:6,
    nextSession:{date:'May 5, 2026',time:'16:00',topic:'Investor Pitch Feedback',daysAway:5},
    lastSession:{date:'Apr 29, 2026',notes:'Reviewed investor deck v3. Strong traction slide. Needs sharper problem framing on slide 2.'},
    progress:90, cgpa:8.2, linkedin:'linkedin.com/in/kabirdas', github:'github.com/kabirdas',
    joinedOn:'Feb 1, 2026', tags:['Startup','Pitch Prep'], messages:1 },
  { id:4, name:'Sneha Kulkarni', avatar:'SK', color:'#3B82F6', college:'NIT Trichy',  branch:'B.Tech IT',  year:2026, saId:'SA-26-901553', status:'pending',
    interests:['Software Engineering','UI/UX Design'], skills:['TypeScript','React','Figma'],
    goals:['Frontend Engineer at product co','Improve DSA'], sessionsTotal:2, sessionsCompleted:0,
    nextSession:null, lastSession:null, progress:10, cgpa:8.6,
    linkedin:'linkedin.com/in/snehakulkarni', github:'github.com/snehak',
    joinedOn:'Apr 30, 2026', tags:['Frontend','DSA'], messages:2 },
  { id:5, name:'Rohan Bhat',     avatar:'RB', color:'#14B8A6', college:'IIT Bombay',  branch:'Dual CSE',   year:2027, saId:'SA-27-123489', status:'completed',
    interests:['Software Engineering','Data Science'], skills:['C++','Python','System Design'],
    goals:['FAANG internship 2025'], sessionsTotal:5, sessionsCompleted:5, nextSession:null,
    lastSession:{date:'Apr 1, 2026',notes:'Final session. Placed at Google SWE Internship! Outstanding improvement.'},
    progress:100, cgpa:9.1, linkedin:'linkedin.com/in/rohanbhat', github:'github.com/rohanbhat',
    joinedOn:'Jan 15, 2026', tags:['Placed 🎉','Google Intern'], messages:0 },
  { id:6, name:'Meera Pillai',   avatar:'MP', color:'#F59E0B', college:'IIT Madras',  branch:'B.Tech CS',  year:2026, saId:'SA-26-558820', status:'active',
    interests:['Product Management','Entrepreneurship'], skills:['SQL','Product Thinking','Analytics'],
    goals:['APM role at a top startup','Build product intuition'], sessionsTotal:4, sessionsCompleted:2,
    nextSession:{date:'May 6, 2026',time:'11:00',topic:'APM Interview Prep: Case Studies',daysAway:6},
    lastSession:{date:'Apr 24, 2026',notes:'Solved 2 PM case studies. Good structure. Metrics definition needs work.'},
    progress:45, cgpa:8.7, linkedin:'linkedin.com/in/meerapillai', github:null,
    joinedOn:'Mar 5, 2026', tags:['APM Prep','Product'], messages:0 },
];

export const TODAY_SESSIONS = [
  { student:'Arjun Sharma', avatar:'AS', color:'#5EEAD4', topic:'System Design Mock Interview', time:'10:00 AM', duration:30 },
  { student:'Meera Pillai', avatar:'MP', color:'#F59E0B', topic:'APM Case Study Prep',          time:'2:00 PM',  duration:30 },
  { student:'Kabir Das',    avatar:'KD', color:'#F97316', topic:'Investor Pitch Feedback',      time:'4:30 PM',  duration:45 },
];

export const SESSION_REQUESTS = [
  { id:101, studentName:'Tanvi Rao', avatar:'TR', color:'#6366F1', college:'IIM Bangalore', branch:'MBA',         year:2026, topic:'Career switch from Consulting to Product', time:'May 10, 2026 · 09:00', daysAway:10, type:'paid', amount:999 },
  { id:102, studentName:'Dev Anand', avatar:'DA', color:'#EC4899', college:'IIT Delhi',     branch:'B.Tech CS',   year:2027, topic:'System Design Interview Prep',           time:'May 11, 2026 · 15:30', daysAway:11, type:'free' },
  { id:103, studentName:'Riya Shah', avatar:'RS', color:'#22C55E', college:'BITS Goa',      branch:'B.E. CS',     year:2026, topic:'Startup idea validation & roadmap',     time:'May 12, 2026 · 10:00', daysAway:12, type:'paid', amount:999 },
];

export const MONTHLY = [
  { month:'Nov', amount:18400, sessions:19 }, { month:'Dec', amount:21800, sessions:22 },
  { month:'Jan', amount:24600, sessions:25 }, { month:'Feb', amount:26200, sessions:27 },
  { month:'Mar', amount:31000, sessions:31 }, { month:'Apr', amount:28500, sessions:18 },
];

export const RATING_DIST = [
  { stars:5, count:5, pct:63 }, { stars:4, count:2, pct:25 },
  { stars:3, count:1, pct:12 }, { stars:2, count:0, pct:0 }, { stars:1, count:0, pct:0 },
];

export const REVIEWS = [
  { id:1, student:'Arjun Sharma', avatar:'AS', color:'#5EEAD4', rating:5, date:'Apr 22, 2026', topic:'LLD Patterns & OOP',           text:'Dr. Rao explained complex design patterns with real-world examples. The session was incredibly structured and I walked away with a clear action plan.', reply:'Thank you Arjun! Your dedication really shows. Keep practicing those concurrency patterns before our next session.', replyDate:'Apr 23, 2026', read:true },
  { id:2, student:'Kabir Das',    avatar:'KD', color:'#F97316', rating:5, date:'Apr 29, 2026', topic:'Investor Pitch Feedback',     text:'Suresh gave razor-sharp feedback on our deck. He spotted issues I had completely missed and gave very actionable advice.', reply:null, read:false },
  { id:3, student:'Meera Pillai', avatar:'MP', color:'#F59E0B', rating:4, date:'Apr 24, 2026', topic:'APM Case Study Prep',         text:'Great session overall. Dr. Rao helped me structure PM case studies much better. Would have loved more time on metrics frameworks.', reply:'Thanks Meera! We will dive deep into north star frameworks next session.', replyDate:'Apr 25, 2026', read:true },
  { id:4, student:'Priya Nair',   avatar:'PN', color:'#EC4899', rating:5, date:'Apr 28, 2026', topic:'Research Career Paths',       text:'Dr. Rao has a rare ability to connect industry experience with academic research. This session changed my PhD application strategy completely.', reply:null, read:false },
  { id:5, student:'Rohan Bhat',   avatar:'RB', color:'#14B8A6', rating:5, date:'Apr 1, 2026',  topic:'Final Session — Google Prep', text:'5 sessions with Dr. Rao and I cracked Google SWE Intern! He pushed me beyond my comfort zone every single time.', reply:'Congratulations Rohan!! You earned this. All the best at Google!', replyDate:'Apr 2, 2026', read:true },
];

export const statusMeta = (s: string) => ({
  active:    { label:'Active',    color:'green' as const, },
  pending:   { label:'Pending',   color:'amber' as const, },
  completed: { label:'Completed', color:'blue'  as const, },
}[s] || { label: s, color: 'gray' as const });

// ── Network — other mentors to connect with + discovery
export const NETWORK_MENTORS = [
  { id:1, name:'Anita Desai',    avatar:'AD', color:'#8B5CF6', role:'VP Engineering', company:'Razorpay',     expertise:['Engineering Leadership','Hiring'], rating:4.8, sessions:212, status:'connected'    as const },
  { id:2, name:'Rajiv Khanna',   avatar:'RK', color:'#F59E0B', role:'Founder',         company:'Plivo',        expertise:['Startups','Product'],            rating:4.9, sessions:88,  status:'pending'      as const },
  { id:3, name:'Latha Subramani',avatar:'LS', color:'#22C55E', role:'Director PM',    company:'Microsoft',    expertise:['Product Strategy','Design'],     rating:4.7, sessions:154, status:'connect'      as const },
  { id:4, name:'Vikram Iyer',    avatar:'VI', color:'#3B82F6', role:'Principal SDE',  company:'Amazon',       expertise:['System Design','DSA'],           rating:4.9, sessions:301, status:'connect'      as const },
];

export const DISCOVERY_STUDENTS = [
  { id:11, name:'Tanvi Rao',  avatar:'TR', color:'#6366F1', college:'IIM Bangalore', branch:'MBA',       year:2026, looking:'Career switch to Product' },
  { id:12, name:'Dev Anand',  avatar:'DA', color:'#EC4899', college:'IIT Delhi',     branch:'B.Tech CS', year:2027, looking:'System design mentor' },
  { id:13, name:'Riya Shah',  avatar:'RS', color:'#22C55E', college:'BITS Goa',      branch:'B.E. CS',   year:2026, looking:'Startup validation help' },
];

// ── Earnings — recent transactions
export const TRANSACTIONS = [
  { id:'TX-9842', date:'May 1, 2026',  desc:'1:1 Session — Arjun Sharma',   amount:899,  status:'paid'    as const, kind:'session' as const },
  { id:'TX-9803', date:'Apr 29, 2026', desc:'1:1 Session — Kabir Das',      amount:1199, status:'paid'    as const, kind:'session' as const },
  { id:'TX-9712', date:'Apr 25, 2026', desc:'Withdrawal to ICICI ****4421', amount:-12000,status:'paid'   as const, kind:'withdraw' as const },
  { id:'TX-9688', date:'Apr 23, 2026', desc:'1:1 Session — Meera Pillai',   amount:899,  status:'paid'    as const, kind:'session' as const },
  { id:'TX-9612', date:'Apr 18, 2026', desc:'Cohort Workshop · 12 seats',    amount:5400, status:'paid'    as const, kind:'event' as const },
  { id:'TX-9588', date:'Apr 14, 2026', desc:'1:1 Session — Priya Nair',     amount:899,  status:'pending' as const, kind:'session' as const },
];

// ── Events created by this mentor
export const MY_EVENTS = [
  { id:1, title:'System Design Bootcamp',         date:'May 18, 2026', time:'18:00', seats:24, registered:18, type:'paid' as const, price:499 },
  { id:2, title:'AMA: Career in Big Tech',         date:'May 24, 2026', time:'19:30', seats:100,registered:71, type:'free' as const },
];
