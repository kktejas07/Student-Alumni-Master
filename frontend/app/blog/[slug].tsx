import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { ArrowLeft, Share2, Bookmark } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';
const LOCAL_STORAGE_SAVED_KEY = 'sa_blog_saved_posts';

interface Section {
  id: string;
  label: string;
  content: string[];
}

interface PostDetail {
  title: string;
  category: string;
  subcategory?: string;
  description: string;
  date: string;
  readTime: string;
  author: string;
  authorInitials: string;
  authorTitle: string;
  chartTitle?: string;
  sections: Section[];
}

const DEFAULT_SECTIONS: Section[] = [
  {
    id: 'po-0',
    label: 'The pattern we did not expect',
    content: [
      'Every placement cell we work with sequences the same way. Resume workshop in week one, aptitude drills in week two, then applications open and students start firing. Mentorship, if it appears at all, arrives late — a panel in the final month, or a WhatsApp group nobody uses.',
      'We had 12,400 verified student profiles across 42 institutions and two full placement cycles. We wanted to know whether that order was right. It is not.',
    ],
  },
  {
    id: 'po-1',
    label: 'What the data actually shows',
    content: [
      'We split students by their first substantive action on the platform — booking a mentor session, or submitting a job application — and tracked readiness for 24 weeks after.',
      'Students whose first action was a mentor session reached 74% average readiness by week 24. Students who applied first reached 43%. The gap opens in weeks 4 to 8 and never closes.',
      'It is not selection bias in the obvious direction. The application-first group started with marginally higher average CGPA and marginally more prior internships. They were, on paper, the stronger cohort.',
    ],
  },
  {
    id: 'po-2',
    label: 'Why sequence matters',
    content: [
      'Three mechanisms show up clearly in the session notes and the application logs.',
      'Rejection without feedback teaches nothing. A student who sends 40 applications and hears back from none has 40 data points and zero information. The same student after one mentor call knows their resume buries the only project a recruiter cares about.',
      'Mentors correct the target, not just the artefact. A third of first sessions end with the student changing the role they are aiming for. Applying first locks in a target chosen with no market information.',
      'Referrals compound and cold applications do not. A mentor who has met you once forwards your profile without being asked. Across the dataset, 61% of interviews traced back to a referral from someone the student had spoken to.',
    ],
  },
  {
    id: 'po-3',
    label: 'What we changed in the product',
    content: [
      'We stopped showing the job board as the first thing on a new dashboard. Onboarding now ends on a suggested-mentors screen, and the roadmap\'s first milestone is a session rather than an application.',
      'Agent K also holds back batch applications until a student has completed one session or explicitly overrides it. That override exists — we are not going to block someone who knows what they are doing — but it is a deliberate choice now, not the default path.',
      'For placement cells we published a revised eight-week sequence: mentor matching in week one, target-setting in week two, resume work in week three against a target that now exists, and applications from week four.',
    ],
  },
  {
    id: 'po-4',
    label: 'Method and limits',
    content: [
      'Observational data, not a randomised trial — students chose their own first action, and we cannot fully rule out that the kind of student who books a mentor call differs in ways we did not measure. Readiness is our own composite score, so it is not independent of the product.',
      'Two cycles is also not many. We will publish again after the 2027 cycle, and we will say so plainly if the effect shrinks. The anonymised, aggregated dataset is available to placement officers at partner institutions on request.',
    ],
  },
];

const POSTS_MAP: Record<string, PostDetail> = {
  'what-12400-student-profiles-tell-us-about-the-first-job': {
    title: 'What 12,400 student profiles tell us about the first job',
    category: 'PLACEMENTS',
    subcategory: 'DATA STUDY',
    description: "Readiness scores rise fastest in the eight weeks after a student's first mentor session — not after their first application. We looked at why, and what it means for how colleges sequence placement prep.",
    date: 'Aug 18, 2026',
    readTime: '9 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    authorTitle: 'Head of Data at StudentAlumni. Previously placement analytics at a national education group.',
    chartTitle: 'READINESS OVER 24 WEEKS · BY FIRST ACTION TAKEN',
    sections: DEFAULT_SECTIONS,
  },
  'the-three-questions-that-make-a-mentor-call-useful': {
    title: 'The three questions that make a mentor call useful',
    category: 'MENTORSHIP',
    subcategory: 'GUIDE',
    description: 'Students who arrive with a specific artefact — a resume, a repo, a rejection — get twice the follow-up.',
    date: 'Aug 12, 2026',
    readTime: '6 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    authorTitle: 'Head of Data at StudentAlumni.',
    sections: [
      {
        id: 'po-0',
        label: 'The prep that changes everything',
        content: [
          'A 30-minute mentor call can easily devolve into generic career advice if you do not bring an artefact. When students bring concrete code or a tailored resume, conversations shift from abstract tips to tactical feedback.',
          'Over 4,200 logged mentor calls, students who uploaded a specific project repo or rejection letter before the call received 2.4x more referrals and follow-ups.',
        ],
      },
      {
        id: 'po-1',
        label: 'Question 1: What am I missing in this specific diff?',
        content: [
          'Instead of asking "How do I become a backend engineer?", ask "Why did this API implementation fail performant load tests under 100 req/sec?"',
          'Mentors love specific technical problems because it showcases your current execution depth.',
        ],
      },
      {
        id: 'po-2',
        label: 'Question 2: Where would you cut this resume?',
        content: [
          'Every senior engineer skims resumes in under 15 seconds. Ask your mentor to point out the single line that adds the least value.',
          'Pruning noise is usually more effective than adding buzzwords.',
        ],
      },
      {
        id: 'po-3',
        label: 'Question 3: Who should I talk to next?',
        content: [
          'Closing a mentor session with a request for a warm introduction opens doors that cold LinkedIn messages never will.',
        ],
      },
    ],
  },
  'agent-k-now-runs-multi-step-tasks-end-to-end': {
    title: 'Agent K now runs multi-step tasks end to end',
    category: 'PRODUCT',
    subcategory: 'RELEASE',
    description: 'Referral requests, resume passes and batch applications now complete without a hand-off back to you.',
    date: 'Aug 06, 2026',
    readTime: '5 min read',
    author: 'SA Product Team',
    authorInitials: 'PT',
    authorTitle: 'Core Platform Developers.',
    sections: [
      {
        id: 'po-0',
        label: 'Automating multi-step workflows',
        content: [
          'Agent K is moving from a single-response AI assistant to an autonomous task runner.',
          'When you ask Agent K to prepare a referral request, it cross-references open roles, finds matching alumni, crafts personalized context, and queues the message for approval in one workflow.',
        ],
      },
      {
        id: 'po-1',
        label: 'Zero-latency resume parsing',
        content: [
          'The updated ATS scoring engine now parses resumes in real-time, highlighting exact missing keywords for your target role.',
        ],
      },
    ],
  },
  'how-snist-ran-hackwave-with-985-registrations': {
    title: 'How SNIST ran HackWave with 985 registrations',
    category: 'CAMPUS',
    subcategory: 'CASE STUDY',
    description: "The CDC team's playbook for an overnight build sprint, from recruiter outreach to team formation on the floor.",
    date: 'Jul 29, 2026',
    readTime: '8 min read',
    author: 'Sreenidhi CDC',
    authorInitials: 'SN',
    authorTitle: 'Career Development Centre, SNIST.',
    sections: [
      {
        id: 'po-0',
        label: 'Building the event pipeline',
        content: [
          'Sreenidhi Institute of Science & Technology (SNIST) hosted HackWave with 985 student registrations across 42 partner colleges.',
          'Using the ECHO event management suite, team formation and badge issuance were automated at the entrance, reducing check-in time to 12 seconds per attendee.',
        ],
      },
      {
        id: 'po-1',
        label: 'On-the-floor team formation',
        content: [
          'Solo participants used the StudentAlumni QR match system to discover teammates with complementary skills (e.g. Frontend developer + ML specialist) within minutes of entering the hall.',
        ],
      },
    ],
  },
  'matching-students-to-roles-without-leaking-their-data': {
    title: 'Matching students to roles without leaking their data',
    category: 'ENGINEERING',
    subcategory: 'PRIVACY',
    description: 'How the match score is computed on hashed skill vectors, so a recruiter never sees a profile you haven\'t shared.',
    date: 'Jul 21, 2026',
    readTime: '11 min read',
    author: 'SA Security',
    authorInitials: 'SE',
    authorTitle: 'Security & Privacy Engineering.',
    sections: [
      {
        id: 'po-0',
        label: 'Privacy-first recruitment matching',
        content: [
          'Recruiters look for specific skill sets, but students should control when their personal identity and contact info are revealed.',
          'StudentAlumni computes candidate match scores using homomorphically encrypted skill vectors. Recruiters see compatibility percentages without access to student names until the student accepts an approach.',
        ],
      },
    ],
  },
  'tier-2-colleges-are-closing-the-referral-gap': {
    title: 'Tier-2 colleges are closing the referral gap',
    category: 'PLACEMENTS',
    subcategory: 'REPORT',
    description: 'Alumni networks, not campus rank, now predict who gets a first-round interview. The numbers from 42 institutions.',
    date: 'Jul 14, 2026',
    readTime: '7 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    authorTitle: 'Head of Data at StudentAlumni.',
    sections: [
      {
        id: 'po-0',
        label: 'The rise of network-driven hiring',
        content: [
          'Data from 42 partner institutions shows that warm alumni referrals account for 61% of all tech interview invites for tier-2 college students.',
        ],
      },
    ],
  },
  'your-sa-id-card-and-why-verification-matters': {
    title: 'Your SA ID card, and why verification matters',
    category: 'PRODUCT',
    subcategory: 'IDENTITY',
    description: 'One verified identity across events, referrals, rentals and student pricing — without re-proving who you are.',
    date: 'Jul 08, 2026',
    readTime: '4 min read',
    author: 'SA Product Team',
    authorInitials: 'PT',
    authorTitle: 'Core Identity Team.',
    sections: [
      {
        id: 'po-0',
        label: 'Unified student credential',
        content: [
          'The digital SA ID card combines DigiLocker degree verification with campus email credentials into a single tamper-proof QR pass.',
        ],
      },
    ],
  },
};

const RELATED_POSTS = [
  {
    id: 'the-three-questions-that-make-a-mentor-call-useful',
    title: 'The three questions that make a mentor call useful',
    category: 'MENTORSHIP',
    date: 'Aug 12, 2026',
    readTime: '6 min read',
    tagColor: '#6FD6FF',
    tagBg: 'rgba(47, 184, 198, 0.12)',
    tagLine: '#1F4E5C',
  },
  {
    id: 'tier-2-colleges-are-closing-the-referral-gap',
    title: 'Tier-2 colleges are closing the referral gap',
    category: 'PLACEMENTS',
    date: 'Jul 14, 2026',
    readTime: '7 min read',
    tagColor: '#6FD6FF',
    tagBg: 'rgba(47, 184, 198, 0.12)',
    tagLine: '#1F4E5C',
  },
  {
    id: 'agent-k-now-runs-multi-step-tasks-end-to-end',
    title: 'Agent K now runs multi-step tasks end to end',
    category: 'PRODUCT',
    date: 'Aug 06, 2026',
    readTime: '5 min read',
    tagColor: '#A78BFA',
    tagBg: 'rgba(124, 92, 252, 0.18)',
    tagLine: '#2C2A52',
  },
];

export default function BlogPostDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const { width } = useWindowDimensions();

  const isTablet = width < 1150;
  const isMobile = width < 860;

  // Resolve slug ID
  const postKey = (params.slug || 'what-12400-student-profiles-tell-us-about-the-first-job').toLowerCase();
  const post = POSTS_MAP[postKey] || POSTS_MAP['what-12400-student-profiles-tell-us-about-the-first-job'];

  const sections = post.sections || DEFAULT_SECTIONS;
  const [activeSection, setActiveSection] = useState(sections[0]?.id || 'po-0');
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  // Check saved state from localStorage
  useEffect(() => {
    if (IS_WEB && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.includes(postKey)) {
            setSaved(true);
          }
        }
      } catch (err) {
        // Fallback
      }
    }
  }, [postKey]);

  // Handle section jump
  const handleSectionJump = (id: string) => {
    setActiveSection(id);
    if (IS_WEB && typeof document !== 'undefined') {
      const el = document.getElementById(id);
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 108,
          behavior: 'smooth',
        });
      }
    }
  };

  const handleShare = () => {
    if (IS_WEB && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleSave = () => {
    const nextSaved = !saved;
    setSaved(nextSaved);

    if (IS_WEB && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_KEY);
        let list: string[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];

        if (nextSaved && !list.includes(postKey)) {
          list.push(postKey);
        } else if (!nextSaved) {
          list = list.filter((id) => id !== postKey);
        }
        localStorage.setItem(LOCAL_STORAGE_SAVED_KEY, JSON.stringify(list));
      } catch (err) {
        // ignore
      }
    }
  };

  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root { background: #0A0A14 !important; font-family: 'Outfit', sans-serif !important; }
          .post-glow-left {
            position: absolute; left: -14%; top: -22%; width: 780px; height: 620px;
            background: radial-gradient(circle, rgba(124,92,252,.18), transparent 68%);
            filter: blur(70px);
          }
          .post-glow-right {
            position: absolute; right: -18%; top: 34%; width: 680px; height: 560px;
            background: radial-gradient(circle, rgba(91,79,233,.13), transparent 70%);
            filter: blur(80px);
          }
          .jump-link[data-on="true"] {
            color: #F4F4FA !important;
            border-left-color: #7C5CFC !important;
          }
          .rs-card-hover:hover {
            transform: translateY(-3px);
            border-color: #3A3468 !important;
          }
        `
      }} />

      {/* Cosmic background glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="post-glow-left" />
        <View className="post-glow-right" />
      </View>

      <SAWatermark fixed={true} right={-60} top={80} opacity={0.12} size={780} glow={true} />
      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '26px 28px 90px', width: '100%' }}>
          
          {/* Back button */}
          <button 
            onClick={() => router.push('/blog')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 14, fontWeight: '600', border: '1px solid #292940', borderRadius: 100, padding: '10px 18px', background: '#11111C', color: '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: 26 }}
          >
            <ArrowLeft size={15} color="#FFFFFF" />
            All posts
          </button>

          {/* Article Header info */}
          <div style={{ maxWidth: 780, marginBottom: 30 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#A78BFA', background: 'rgba(124,92,252,.18)', border: '1px solid #2C2A52', borderRadius: 7, padding: '5px 10px' }}>
                {post.category}
              </span>
              {post.subcategory && (
                <span style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#8A8A9E', border: '1px solid #1F1F30', borderRadius: 7, padding: '5px 10px' }}>
                  {post.subcategory}
                </span>
              )}
            </div>
            <div style={{ fontSize: 42, fontWeight: '700', letterSpacing: '-1.8px', lineHeight: 1.12, color: '#FFFFFF', marginBottom: 18 }}>
              {post.title}
            </div>
            <div style={{ fontSize: 18, lineHeight: 1.65, color: '#8A8A9E' }}>
              {post.description}
            </div>

            {/* Author and meta info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, paddingTop: 24, borderTop: '1px solid #1F1F30', flexWrap: 'wrap' }}>
              <span style={{ width: 44, height: 44, borderRadius: '50%', background: '#7C5CFC', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: '700', flex: 'none' }}>
                {post.authorInitials}
              </span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14.5, fontWeight: '600', color: '#FFFFFF' }}>{post.author}</div>
                <div style={{ fontSize: 13, color: '#8A8A9E', marginTop: 2 }}>{post.authorTitle} · {post.date} · {post.readTime}</div>
              </div>
              <div style={{ display: 'flex', gap: 9, flex: 'none' }}>
                <button 
                  onClick={handleShare}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: '600', border: '1px solid #292940', borderRadius: 10, padding: '10px 15px', background: 'transparent', color: shared ? '#10B981' : '#8A8A9E', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <Share2 size={14} color={shared ? '#10B981' : 'currentColor'} />
                  {shared ? 'Copied Link ✓' : 'Share'}
                </button>
                <button 
                  onClick={handleSave}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: '600', border: '1px solid #292940', borderRadius: 10, padding: '10px 15px', background: 'transparent', color: saved ? '#A78BFA' : '#8A8A9E', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <Bookmark size={14} color={saved ? '#A78BFA' : 'currentColor'} fill={saved ? '#A78BFA' : 'none'} />
                  {saved ? 'Saved ✓' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Optional Chart Section */}
          {post.chartTitle && (
            <div style={{ position: 'relative', overflow: 'hidden', border: '1px solid #2C2A52', borderRadius: 20, background: 'linear-gradient(140deg, rgba(124,92,252,.18), #11111C 68%)', padding: '30px 32px', marginTop: 30, marginBottom: 34, maxWidth: 780 }}>
              <div style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.5px', color: '#A78BFA', marginBottom: 22 }}>
                {post.chartTitle}
              </div>
              <Svg viewBox="0 0 900 260" style={{ width: '100%', height: 'auto' }}>
                <g style={{ stroke: 'rgba(255,255,255,.07)', strokeWidth: 1 }}>
                  <Path d="M40 220H880M40 165H880M40 110H880M40 55H880" />
                </g>
                <Path d="M40 214 L208 200 L376 186 L544 176 L712 168 L880 160" fill="none" stroke="#6A6A8E" strokeWidth="2.4" />
                <Path d="M40 214 L208 158 L376 108 L544 82 L712 66 L880 48" fill="none" stroke="#A78BFA" strokeWidth="3" />
                <Circle cx="880" cy="48" r="6" fill="#FFFFFF" />
                <g style={{ fontSize: 13, fill: '#8A8A9E' }}>
                  <SvgText x="40" y="248">Week 0</SvgText>
                  <SvgText x="376" y="248" textAnchor="middle">Week 8</SvgText>
                  <SvgText x="712" y="248" textAnchor="middle">Week 16</SvgText>
                  <SvgText x="880" y="248" textAnchor="end">Week 24</SvgText>
                </g>
                <g style={{ fontSize: 14, fontWeight: '600' }}>
                  <SvgText x="866" y="36" textAnchor="end" fill="#C4B5FD">Mentor session first · 74%</SvgText>
                  <SvgText x="866" y="152" textAnchor="end" fill="#9A9AB4">Application first · 43%</SvgText>
                </g>
              </Svg>
            </div>
          )}

          {/* 2-Column Main Content & Sidebar Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '250px minmax(0, 1fr)', gap: 40, marginTop: 34, alignItems: 'start' }}>
            
            {/* Sidebar Sticky Navigation (Web only) */}
            {!isMobile && (
              <div style={{ position: 'sticky', top: 92 }}>
                <div style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.3px', color: '#6A6A7E', marginBottom: 14 }}>IN THIS ARTICLE</div>
                {sections.map((sec) => (
                  <span
                    key={sec.id}
                    onClick={() => handleSectionJump(sec.id)}
                    data-on={activeSection === sec.id ? 'true' : 'false'}
                    className="jump-link"
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      lineHeight: 1.45,
                      color: activeSection === sec.id ? '#F4F4FA' : '#8A8A9E',
                      borderLeft: '2px solid',
                      borderLeftColor: activeSection === sec.id ? '#7C5CFC' : '#292940',
                      padding: '9px 0 9px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {sec.label}
                  </span>
                ))}
              </div>
            )}

            {/* Post Content Body */}
            <div style={{ minWidth: 0, maxWidth: 760 }}>
              {sections.map((sec) => (
                <div key={sec.id} id={sec.id} style={{ borderTop: '1px solid #1F1F30', paddingTop: 30, paddingBottom: 4 }}>
                  <div style={{ fontSize: 24, fontWeight: '700', letterSpacing: '-.7px', color: '#FFFFFF', margin: '16px 0 16px' }}>
                    {sec.label}
                  </div>
                  {sec.content.map((paragraph, idx) => (
                    <div key={idx} style={{ fontSize: 16.5, lineHeight: 1.8, color: '#8A8A9E', marginBottom: 22 }}>
                      {paragraph}
                    </div>
                  ))}
                </div>
              ))}

              {/* Author Info footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', padding: '22px 24px', marginTop: 40, flexWrap: 'wrap' }}>
                <span style={{ width: 52, height: 52, borderRadius: '50%', background: '#7C5CFC', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: '700', flex: 'none' }}>
                  {post.authorInitials}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: '600', color: '#FFFFFF' }}>{post.author}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E', marginTop: 4 }}>{post.authorTitle}</div>
                </div>
              </div>

            </div>
          </div>

          {/* Keep Reading Section */}
          <div style={{ marginTop: 46, paddingTop: 40, borderTop: '1px solid #1F1F30' }}>
            <div style={{ fontSize: 21, fontWeight: '700', letterSpacing: '-.5px', color: '#FFFFFF', marginBottom: 18 }}>Keep reading</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
              {RELATED_POSTS.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => router.push(`/blog/${rel.id}`)}
                  className="rs-card-hover"
                  style={{ border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', boxShadow: '0 18px 40px rgba(0,0,0,.35)', padding: '22px 24px 24px', cursor: 'pointer', transition: 'all 0.25s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                >
                  <div>
                    <span 
                      style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: rel.tagColor, backgroundColor: rel.tagBg, border: `1px solid ${rel.tagLine}`, borderRadius: 7, padding: '5px 10px', textTransform: 'uppercase' }}
                    >
                      {rel.category}
                    </span>
                    <div style={{ fontSize: 17, fontWeight: '700', letterSpacing: '-.3px', lineHeight: 1.3, margin: '16px 0 9px', color: '#FFFFFF' }}>
                      {rel.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6A6A7E', marginTop: 16 }}>
                    {rel.date} · {rel.readTime}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: '#0A0A14',
    minHeight: '100vh' as any,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});
