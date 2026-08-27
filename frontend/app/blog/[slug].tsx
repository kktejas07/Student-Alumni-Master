import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { ArrowLeft, Share2, Bookmark } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

// Mock Blog Posts Database
const POSTS_MAP: Record<string, any> = {
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
  },
  'the-three-questions-that-make-a-mentor-call-useful': {
    title: 'The three questions that make a mentor call useful',
    category: 'MENTORSHIP',
    description: 'Students who arrive with a specific artefact — a resume, a repo, a rejection — get twice the follow-up.',
    date: 'Aug 12, 2026',
    readTime: '6 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    authorTitle: 'Head of Data at StudentAlumni.',
  },
  'agent-k-now-runs-multi-step-tasks-end-to-end': {
    title: 'Agent K now runs multi-step tasks end to end',
    category: 'PRODUCT',
    description: 'Referral requests, resume passes and batch applications now complete without a hand-off back to you.',
    date: 'Aug 06, 2026',
    readTime: '5 min read',
    author: 'SA Product Team',
    authorInitials: 'PT',
    authorTitle: 'Core Platform Developers.',
  },
  'how-snist-ran-hackwave-with-985 registrations': {
    title: 'How SNIST ran HackWave with 985 registrations',
    category: 'CAMPUS',
    description: "The CDC team's playbook for an overnight build sprint, from recruiter outreach to team formation on the floor.",
    date: 'Jul 29, 2026',
    readTime: '8 min read',
    author: 'Sreenidhi CDC',
    authorInitials: 'SN',
    authorTitle: 'Career Development Center.',
  },
  'matching-students-to-roles-without-leaking-their-data': {
    title: 'Matching students to roles without leaking their data',
    category: 'ENGINEERING',
    description: 'How the match score is computed on hashed skill vectors, so a recruiter never sees a profile you haven\'t shared.',
    date: 'Jul 21, 2026',
    readTime: '11 min read',
    author: 'SA Security',
    authorInitials: 'SE',
    authorTitle: 'Security Engineering Team.',
  },
  'tier-2-colleges-are-closing-the-referral-gap': {
    title: 'Tier-2 colleges are closing the referral gap',
    category: 'PLACEMENTS',
    description: 'Alumni networks, not campus rank, now predict who gets a first-round interview. The numbers from 42 institutions.',
    date: 'Jul 14, 2026',
    readTime: '7 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    authorTitle: 'Head of Data at StudentAlumni.',
  },
  'your-sa-id-card-and-why-verification-matters': {
    title: 'Your SA ID card, and why verification matters',
    category: 'PRODUCT',
    description: 'One verified identity across events, referrals, rentals and student pricing — without re-proving who you are.',
    date: 'Jul 08, 2026',
    readTime: '4 min read',
    author: 'SA Product Team',
    authorInitials: 'PT',
    authorTitle: 'Core Platform Developers.',
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

const SECTIONS = [
  { id: 'po-0', label: 'The pattern we did not expect' },
  { id: 'po-1', label: 'What the data actually shows' },
  { id: 'po-2', label: 'Why sequence matters' },
  { id: 'po-3', label: 'What we changed in the product' },
  { id: 'po-4', label: 'Method and limits' },
];

export default function BlogDetailPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const [activeSection, setActiveSection] = useState('po-0');
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);

  const isMobile = width < 860;

  // Resolve current post details
  const postKey = slug || 'what-12400-student-profiles-tell-us-about-the-first-job';
  const post = POSTS_MAP[postKey] || POSTS_MAP['what-12400-student-profiles-tell-us-about-the-first-job'];

  // Scroll spy to highlight active section on Web
  useEffect(() => {
    if (!IS_WEB) return;
    const handleScroll = () => {
      let currentSection = 'po-0';
      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140) {
            currentSection = section.id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSectionJump = (id: string) => {
    if (IS_WEB) {
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
    setSaved(!saved);
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
        `
      }} />

      {/* Cosmic background glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="post-glow-left" />
        <View className="post-glow-right" />
      </View>

      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <div className="pt-32 pb-16 px-6 max-w-[1400px] mx-auto w-full relative z-10">
          
          {/* Back button */}
          <button 
            onClick={() => router.push('/blog')}
            className="inline-flex items-center gap-2 text-sm font-semibold border border-[#292940] hover:border-[#7C5CFC] rounded-full px-5 py-2.5 bg-[#11111C] text-white cursor-pointer transition-all duration-200 mb-8"
          >
            <ArrowLeft size={15} color="#FFFFFF" />
            All posts
          </button>

          {/* Article Header info */}
          <div className="max-w-[780px] mb-8">
            <div className="flex gap-2.5 mb-5">
              <span className="text-[10.5px] font-bold tracking-wider text-[#A78BFA] bg-[#7C5CFC]/18 border border-[#2C2A52] rounded-lg px-2.5 py-1 uppercase">
                {post.category}
              </span>
              {post.subcategory && (
                <span className="text-[10.5px] font-bold tracking-wider text-[#8A8A9E] border border-[#1f1f30] rounded-lg px-2.5 py-1 uppercase">
                  {post.subcategory}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.12] mb-6">
              {post.title}
            </h1>
            <p className="text-lg sm:text-xl text-[#8A8A9E] leading-relaxed">
              {post.description}
            </p>

            {/* Author and meta info */}
            <div className="flex items-center gap-3.5 mt-8 pt-6 border-t border-[#1F1F30] flex-wrap">
              <span className="w-11 h-11 rounded-full bg-[#7C5CFC] text-white flex items-center justify-center text-base font-bold flex-shrink-0">
                {post.authorInitials}
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-semibold text-white">{post.author}</div>
                <div className="text-xs text-[#8A8A9E] mt-0.5">{post.authorTitle} · {post.date} · {post.readTime}</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-xs font-semibold border border-[#292940] hover:border-[#7C5CFC] rounded-lg px-4 py-2.5 bg-transparent text-[#8A8A9E] hover:text-white cursor-pointer transition-all duration-200"
                >
                  <Share2 size={14} color={shared ? '#10B981' : 'currentColor'} />
                  {shared ? 'Copied Link ✓' : 'Share'}
                </button>
                <button 
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 text-xs font-semibold border border-[#292940] hover:border-[#7C5CFC] rounded-lg px-4 py-2.5 bg-transparent text-[#8A8A9E] hover:text-white cursor-pointer transition-all duration-200"
                >
                  <Bookmark size={14} color={saved ? '#A78BFA' : 'currentColor'} />
                  {saved ? 'Saved ✓' : 'Save'}
                </button>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="relative overflow-hidden border border-[#2C2A52] rounded-2xl bg-gradient-to-br from-[#7C5CFC]/18 to-[#11111C]/30 p-8 mt-8 mb-10 max-w-[780px]">
            <div className="text-xs font-bold tracking-wider text-[#A78BFA] mb-5">
              READINESS OVER 24 WEEKS · BY FIRST ACTION TAKEN
            </div>
            <Svg viewBox="0 0 900 260" style={{ width: '100%', height: 'auto' }}>
              <g style={{ stroke: 'rgba(255,255,255,.07)', strokeWidth: 1 }}>
                <path d="M40 220H880M40 165H880M40 110H880M40 55H880" />
              </g>
              {/* Application line (grey) */}
              <Path d="M40 214 L208 200 L376 186 L544 176 L712 168 L880 160" fill="none" stroke="#6A6A8E" strokeWidth="2.4" />
              {/* Mentor line (purple) */}
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

          {/* Main Content & Sidebar Layout */}
          <div className={`grid gap-10 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`} style={{ alignItems: 'start' }}>
            
            {/* Sidebar Sticky Navigation (Web only) */}
            <div className={`md:col-span-4 ${isMobile ? 'hidden' : 'block'}`} style={{ position: 'sticky', top: 92 }}>
              <div className="text-xs font-bold tracking-wider text-[#6A6A7E] mb-3.5">IN THIS ARTICLE</div>
              {SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleSectionJump(sec.id)}
                  data-on={activeSection === sec.id ? 'true' : 'false'}
                  className="jump-link block text-left text-[13.5px] leading-snug text-[#8A8A9E] hover:text-white border-l-2 border-[#292940] pl-3.5 py-2 cursor-pointer transition-all w-full"
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* Post Content */}
            <div className={`md:col-span-8 space-y-10 text-[16.5px] leading-relaxed text-[#8A8A9E]`}>
              
              <div id="po-0" className="space-y-4">
                <p>
                  Every placement cell we work with sequences the same way. Resume workshop in week one, aptitude drills in week two, then applications open and students start firing. Mentorship, if it appears at all, arrives late — a panel in the final month, or a WhatsApp group nobody uses.
                </p>
                <p>
                  We had 12,400 verified student profiles across 42 institutions and two full placement cycles. We wanted to know whether that order was right. It is not.
                </p>
              </div>

              <div id="po-1" className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-6 mb-2">
                  What the data actually shows
                </h3>
                <p>
                  We split students by their first substantive action on the platform — booking a mentor session, or submitting a job application — and tracked readiness for 24 weeks after.
                </p>
                <p>
                  Students whose first action was a <strong className="text-white font-semibold">mentor session</strong> reached 74% average readiness by week 24. Students who applied first reached 43%. The gap opens in weeks 4 to 8 and never closes.
                </p>
                <p>
                  It is not selection bias in the obvious direction. The application-first group started with <strong className="text-white font-semibold">marginally higher</strong> average CGPA and marginally more prior internships. They were, on paper, the stronger cohort.
                </p>
              </div>

              <div id="po-2" className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-6 mb-2">
                  Why sequence matters
                </h3>
                <p>
                  Three mechanisms show up clearly in the session notes and the application logs.
                </p>
                <p>
                  <strong className="text-white font-semibold">Rejection without feedback teaches nothing.</strong> A student who sends 40 applications and hears back from none has 40 data points and zero information. The same student after one mentor call knows their resume buries the only project a recruiter cares about.
                </p>
                <p>
                  <strong className="text-white font-semibold">Mentors correct the target, not just the artefact.</strong> A third of first sessions end with the student changing the role they are aiming for. Applying first locks in a target chosen with no market information.
                </p>
                <p>
                  <strong className="text-white font-semibold">Referrals compound and cold applications do not.</strong> A mentor who has met you once forwards your profile without being asked. Across the dataset, 61% of interviews traced back to a referral from someone the student had spoken to.
                </p>
              </div>

              <div id="po-3" className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-6 mb-2">
                  What we changed in the product
                </h3>
                <p>
                  We stopped showing the job board as the first thing on a new dashboard. Onboarding now ends on a suggested-mentors screen, and the roadmap's first milestone is a session rather than an application.
                </p>
                <p>
                  Agent K also holds back batch applications until a student has completed one session or explicitly overrides it. That override exists — we are not going to block someone who knows what they are doing — but it is a deliberate choice now, not the default path.
                </p>
                <p>
                  For placement cells we published a revised eight-week sequence: mentor matching in week one, target-setting in week two, resume work in week three against a target that now exists, and applications from week four.
                </p>
              </div>

              <div id="po-4" className="space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-6 mb-2">
                  Method and limits
                </h3>
                <p>
                  Observational data, not a randomised trial — students chose their own first action, and we cannot fully rule out that the kind of student who books a mentor call differs in ways we did not measure. Readiness is our own composite score, so it is not independent of the product.
                </p>
                <p>
                  Two cycles is also not many. We will publish again after the 2027 cycle, and we will say so plainly if the effect shrinks. The anonymised, aggregated dataset is available to placement officers at partner institutions on request.
                </p>
              </div>

              {/* Author Info footer */}
              <div className="flex items-center gap-4 border border-[#1F1F30] rounded-2xl bg-[#11111C] p-6 mt-10 flex-wrap">
                <span className="w-13 h-13 rounded-full bg-[#7C5CFC] text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {post.authorInitials}
                </span>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-[15.5px] font-semibold text-white">{post.author}</div>
                  <div className="text-[13.5px] text-[#8A8A9E] mt-1 leading-normal">{post.authorTitle}</div>
                </div>
              </div>

            </div>
          </div>

          {/* Keep Reading Section */}
          <div className="mt-16 pt-10 border-t border-[#1F1F30]">
            <h3 className="text-xl font-bold text-white tracking-tight mb-6">Keep reading</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {RELATED_POSTS.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => router.push(`/blog/${rel.id}`)}
                  className="group border border-[#1F1F30] hover:border-[#2C2A52] rounded-2xl bg-[#11111C] p-6 flex flex-col justify-between cursor-pointer transition-all duration-300"
                >
                  <div>
                    <span 
                      className="inline-block text-[10px] font-bold tracking-wider rounded-lg px-2.5 py-1 uppercase"
                      style={{ color: rel.tagColor, backgroundColor: rel.tagBg, border: `1px solid ${rel.tagLine}` }}
                    >
                      {rel.category}
                    </span>
                    <h4 className="text-base font-bold text-white tracking-tight leading-snug mt-4 mb-2 group-hover:text-[#A78BFA] transition-colors">
                      {rel.title}
                    </h4>
                  </div>
                  <div className="text-xs text-[#6A6A7E] font-medium mt-4">
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
