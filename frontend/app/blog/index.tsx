import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { Sparkles, Search, Bookmark, X } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';
const LOCAL_STORAGE_SAVED_KEY = 'sa_blog_saved_posts';

// Mock Blog Posts Database
const POSTS = [
  {
    id: 'what-12400-student-profiles-tell-us-about-the-first-job',
    title: 'What 12,400 student profiles tell us about the first job',
    category: 'PLACEMENTS',
    subcategory: 'DATA STUDY',
    description: "Readiness scores rise fastest in the eight weeks after a student's first mentor session — not after their first application. We looked at why, and what it means for how colleges sequence placement prep.",
    excerpt: 'Readiness scores rise fastest in the eight weeks after a student\'s first mentor session — not after their first application. We looked at why, and what it means for how colleges sequence placement prep.',
    date: 'Aug 18, 2026',
    readTime: '9 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    authorTitle: 'Head of Data',
    isFeatured: true,
    tagColor: '#A78BFA',
    tagBg: 'rgba(124, 92, 252, 0.18)',
    tagLine: '#2C2A52',
  },
  {
    id: 'the-three-questions-that-make-a-mentor-call-useful',
    title: 'The three questions that make a mentor call useful',
    category: 'MENTORSHIP',
    description: 'Students who arrive with a specific artefact — a resume, a repo, a rejection — get twice the follow-up.',
    date: 'Aug 12, 2026',
    readTime: '6 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    tagColor: '#6FD6FF',
    tagBg: 'rgba(47, 184, 198, 0.12)',
    tagLine: '#1F4E5C',
  },
  {
    id: 'agent-k-now-runs-multi-step-tasks-end-to-end',
    title: 'Agent K now runs multi-step tasks end to end',
    category: 'PRODUCT',
    description: 'Referral requests, resume passes and batch applications now complete without a hand-off back to you.',
    date: 'Aug 06, 2026',
    readTime: '5 min read',
    author: 'SA Product Team',
    authorInitials: 'PT',
    tagColor: '#A78BFA',
    tagBg: 'rgba(124, 92, 252, 0.18)',
    tagLine: '#2C2A52',
  },
  {
    id: 'how-snist-ran-hackwave-with-985-registrations',
    title: 'How SNIST ran HackWave with 985 registrations',
    category: 'CAMPUS',
    description: "The CDC team's playbook for an overnight build sprint, from recruiter outreach to team formation on the floor.",
    date: 'Jul 29, 2026',
    readTime: '8 min read',
    author: 'Sreenidhi CDC',
    authorInitials: 'SN',
    tagColor: '#34D399',
    tagBg: 'rgba(16, 185, 129, 0.13)',
    tagLine: '#17503E',
  },
  {
    id: 'matching-students-to-roles-without-leaking-their-data',
    title: 'Matching students to roles without leaking their data',
    category: 'ENGINEERING',
    description: 'How the match score is computed on hashed skill vectors, so a recruiter never sees a profile you haven\'t shared.',
    date: 'Jul 21, 2026',
    readTime: '11 min read',
    author: 'SA Security',
    authorInitials: 'SE',
    tagColor: '#F5B342',
    tagBg: 'rgba(245, 179, 66, 0.13)',
    tagLine: '#4A3410',
  },
  {
    id: 'tier-2-colleges-are-closing-the-referral-gap',
    title: 'Tier-2 colleges are closing the referral gap',
    category: 'PLACEMENTS',
    description: 'Alumni networks, not campus rank, now predict who gets a first-round interview. The numbers from 42 institutions.',
    date: 'Jul 14, 2026',
    readTime: '7 min read',
    author: 'Aisha Kapoor',
    authorInitials: 'AK',
    tagColor: '#6FD6FF',
    tagBg: 'rgba(47, 184, 198, 0.12)',
    tagLine: '#1F4E5C',
  },
  {
    id: 'your-sa-id-card-and-why-verification-matters',
    title: 'Your SA ID card, and why verification matters',
    category: 'PRODUCT',
    description: 'One verified identity across events, referrals, rentals and student pricing — without re-proving who you are.',
    date: 'Jul 08, 2026',
    readTime: '4 min read',
    author: 'SA Product Team',
    authorInitials: 'PT',
    tagColor: '#A78BFA',
    tagBg: 'rgba(124, 92, 252, 0.18)',
    tagLine: '#2C2A52',
  },
];

const CATEGORIES = ['All', 'Placements', 'Mentorship', 'Product', 'Campus', 'Engineering', 'Saved'];

export default function BlogListingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isTablet = width < 1150;
  const isMobile = width < 860;

  // Load saved posts from localStorage on Web
  useEffect(() => {
    if (IS_WEB && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSavedPostIds(parsed);
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
  }, []);

  const toggleSavePost = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let nextSaved: string[];
    if (savedPostIds.includes(id)) {
      nextSaved = savedPostIds.filter((item) => item !== id);
    } else {
      nextSaved = [...savedPostIds, id];
    }
    setSavedPostIds(nextSaved);
    if (IS_WEB && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_SAVED_KEY, JSON.stringify(nextSaved));
      } catch (err) {
        // ignore
      }
    }
  };

  // Filter posts based on active category & search query
  const filteredPosts = POSTS.filter((post) => {
    // Category match
    let matchesCategory = true;
    if (activeCategory === 'Saved') {
      matchesCategory = savedPostIds.includes(post.id);
    } else if (activeCategory !== 'All') {
      matchesCategory = post.category.toLowerCase() === activeCategory.toLowerCase();
    }

    if (!matchesCategory) return false;

    // Search query match
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      post.title.toLowerCase().includes(q) ||
      post.description.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      (post.author && post.author.toLowerCase().includes(q))
    );
  });

  const handleSubscribe = () => {
    setEmailError('');
    const trimmed = emailInput.trim();
    if (!trimmed || !/\S+@\S+\.\S+/.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setEmailInput('');
    }, 2800);
  };

  return (
    <View style={styles.outerWrap}>
      <style dangerouslySetInnerHTML={{
        __html: `
          html, body, #root { background: #0A0A14 !important; font-family: 'Outfit', sans-serif !important; }
          .blog-glow-left {
            position: absolute; left: -14%; top: -22%; width: 780px; height: 620px;
            background: radial-gradient(circle, rgba(124,92,252,.18), transparent 68%);
            filter: blur(70px);
          }
          .blog-glow-right {
            position: absolute; right: -18%; top: 34%; width: 680px; height: 560px;
            background: radial-gradient(circle, rgba(91,79,233,.13), transparent 70%);
            filter: blur(80px);
          }
        `
      }} />

      {/* Cosmic background glows */}
      <View style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <View className="blog-glow-left" />
        <View className="blog-glow-right" />
      </View>

      <SAWatermark fixed={true} right={-60} top={80} opacity={0.12} size={780} glow={true} />
      <Navbar />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <section className="pt-32 pb-16 px-6 max-w-[1400px] mx-auto w-full relative z-10">
          
          {/* Header & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-[720px]">
              <span className="inline-flex items-center gap-2 font-semibold text-xs tracking-widest text-[#A78BFA] bg-[#7C5CFC]/10 border border-[#2C2A52] rounded-full px-4 py-1.5 uppercase">
                <Sparkles size={13} color="#A78BFA" />
                BLOG & RESEARCH
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1] mt-5 mb-4">
                What we're learning about early careers
              </h1>
              <p className="text-base sm:text-lg text-[#8A8A9E] leading-relaxed">
                Placement data, mentor practice and product notes from the campuses we work with.
              </p>
            </div>

            {/* Interactive Search Bar */}
            <div className="relative w-full md:w-[320px]">
              <div className="relative flex items-center">
                <Search size={16} color="#8A8A9E" className="absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search articles or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#11111C] border border-[#1F1F30] focus:border-[#7C5CFC] rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-[#6A6A7E] outline-none transition-all"
                />
                {searchQuery !== '' && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-[#8A8A9E] hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* THIS MONTH Light Hero Banner (Shown when no search query and 'All' category) */}
          {activeCategory === 'All' && !searchQuery.trim() && (
            <div className="relative rounded-3xl overflow-hidden bg-[#F6F7FB] mb-12 border border-[#E7E9F2] shadow-2xl">
              <div style={{ position: 'absolute', left: '-8%', top: '-30%', width: '44%', paddingBottom: '44%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,.16), transparent 68%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: '-6%', bottom: '-34%', width: '40%', paddingBottom: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,166,232,.14), transparent 70%)', pointerEvents: 'none' }} />
              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 sm:p-12">
                <div className="lg:col-span-7">
                  <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-[#2E2091] bg-[#7C5CFC]/12 border border-[#7C5CFC]/24 rounded-full px-3.5 py-1.5 uppercase">
                    THIS MONTH
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[#14161D] tracking-tight leading-tight mt-5 mb-4">
                    Readiness rises after<br className="hidden sm:inline"/> a conversation.
                  </h2>
                  <p className="text-[#4A5163] text-base leading-relaxed mb-8 max-w-lg">
                    Two placement cycles of data from 42 institutions, and the one sequencing change that moved the numbers most.
                  </p>
                  <div className="grid grid-cols-3 gap-6 mb-8 max-w-md">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#4B3FA8]">74%</div>
                      <div className="text-xs text-[#5B6273] mt-1">mentor-first readiness</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0E6E8C]">43%</div>
                      <div className="text-xs text-[#5B6273] mt-1">application-first</div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#047857]">61%</div>
                      <div className="text-xs text-[#5B6273] mt-1">interviews via referral</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => router.push('/blog/what-12400-student-profiles-tell-us-about-the-first-job')}
                      className="bg-[#5B4FE9] hover:bg-[#4F43D6] text-white text-sm font-bold px-6 py-3 rounded-xl transition-all cursor-pointer"
                    >
                      Read the study
                    </button>
                    <button 
                      onClick={() => setActiveCategory('Placements')}
                      className="border border-[#D3D7E4] hover:border-[#5B4FE9] text-[#14161D] text-sm font-bold px-6 py-3 rounded-xl transition-all cursor-pointer"
                    >
                      Browse all posts
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 grid grid-cols-2 grid-rows-2 gap-3 h-[280px]">
                  <div className="row-span-2 rounded-2xl overflow-hidden bg-[#E7E9F2] border border-[#D3D7E4] p-5 flex flex-col justify-end bg-gradient-to-br from-[#7C5CFC]/20 to-[#E7E9F2]">
                    <div className="text-xs font-bold text-[#2E2091]">STUDY INSIGHTS</div>
                    <div className="text-base font-bold text-[#14161D] mt-1">42 Campuses Analyzed</div>
                  </div>
                  <div className="rounded-2xl overflow-hidden bg-[#E7E9F2] border border-[#D3D7E4] p-4 flex flex-col justify-end bg-gradient-to-br from-[#6FD6FF]/20 to-[#E7E9F2]">
                    <div className="text-xs font-bold text-[#0E6E8C]">MENTOR IMPACT</div>
                    <div className="text-sm font-bold text-[#14161D] mt-1">12,400 Students</div>
                  </div>
                  <div className="rounded-2xl overflow-hidden bg-[#E7E9F2] border border-[#D3D7E4] p-4 flex flex-col justify-end bg-gradient-to-br from-[#34D399]/20 to-[#E7E9F2]">
                    <div className="text-xs font-bold text-[#047857]">REFERRALS</div>
                    <div className="text-sm font-bold text-[#14161D] mt-1">61% Placement Rate</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E2E5EF] bg-white/70 px-8 py-4 flex items-center gap-6 flex-wrap">
                <span className="text-xs font-bold tracking-widest text-[#6B7280]">TOPICS</span>
                <div className="flex gap-6 flex-wrap">
                  <span onClick={() => setActiveCategory('Placements')} className="text-xs font-bold tracking-wider text-[#3F4658] hover:text-[#5B4FE9] cursor-pointer">PLACEMENTS</span>
                  <span onClick={() => setActiveCategory('Mentorship')} className="text-xs font-bold tracking-wider text-[#3F4658] hover:text-[#5B4FE9] cursor-pointer">MENTORSHIP</span>
                  <span onClick={() => setActiveCategory('Product')} className="text-xs font-bold tracking-wider text-[#3F4658] hover:text-[#5B4FE9] cursor-pointer">PRODUCT</span>
                  <span onClick={() => setActiveCategory('Campus')} className="text-xs font-bold tracking-wider text-[#3F4658] hover:text-[#5B4FE9] cursor-pointer">CAMPUS</span>
                  <span onClick={() => setActiveCategory('Engineering')} className="text-xs font-bold tracking-wider text-[#3F4658] hover:text-[#5B4FE9] cursor-pointer">ENGINEERING</span>
                </div>
              </div>
            </div>
          )}

          {/* Featured Hero Article (Dark Card) */}
          {activeCategory === 'All' && !searchQuery.trim() && (
            <div 
              onClick={() => router.push('/blog/what-12400-student-profiles-tell-us-about-the-first-job')}
              className="bg-[#11111C] border border-[#1F1F30] hover:border-[#2C2A52] rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center cursor-pointer transition-all duration-300 shadow-xl mb-12"
            >
              <div className="lg:col-span-7 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-2.5 mb-5">
                    <div className="flex gap-2.5">
                      <span className="text-[10px] font-bold tracking-wider text-[#F5B342] bg-[#F5B342]/10 border border-[#4A3410] rounded-lg px-2.5 py-1 uppercase">
                        FEATURED
                      </span>
                      <span className="text-[10px] font-bold tracking-wider text-[#A78BFA] bg-[#7C5CFC]/18 border border-[#2C2A52] rounded-lg px-2.5 py-1 uppercase">
                        PLACEMENTS
                      </span>
                    </div>

                    <button
                      onClick={(e) => toggleSavePost('what-12400-student-profiles-tell-us-about-the-first-job', e)}
                      className="p-2 rounded-lg border border-[#1F1F30] hover:border-[#7C5CFC] text-[#8A8A9E] hover:text-white transition-all cursor-pointer"
                      title={savedPostIds.includes('what-12400-student-profiles-tell-us-about-the-first-job') ? 'Unsave Post' : 'Save Post'}
                    >
                      <Bookmark size={15} color={savedPostIds.includes('what-12400-student-profiles-tell-us-about-the-first-job') ? '#A78BFA' : 'currentColor'} fill={savedPostIds.includes('what-12400-student-profiles-tell-us-about-the-first-job') ? '#A78BFA' : 'none'} />
                    </button>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight mb-4">
                    What 12,400 student profiles tell us about the first job
                  </h2>
                  <p className="text-[#8A8A9E] text-sm sm:text-base leading-relaxed mb-6">
                    Readiness scores rise fastest in the eight weeks after a student's first mentor session — not after their first application. We looked at why, and what it means for how colleges sequence placement prep.
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#7C5CFC] text-white flex items-center justify-center text-sm font-bold">
                    AK
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Aisha Kapoor</div>
                    <div className="text-xs text-[#8A8A9E] mt-0.5">Aug 18, 2026 · 9 min read</div>
                  </div>
                </div>
              </div>

              {/* Featured Visual */}
              <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-[#292940] bg-gradient-to-br from-[#7C5CFC]/18 to-[#11111C] aspect-[4/3] flex items-end p-6">
                <svg viewBox="0 0 300 180" className="absolute inset-0 w-full h-full opacity-50">
                  <path d="M10 160 C 70 150 100 108 150 92 C 200 76 240 40 292 16" style={{ fill: 'none', stroke: '#8B84FF', strokeWidth: 2.4 }} />
                  <circle cx="150" cy="92" r="4" fill="#C4B5FD" />
                  <circle cx="292" cy="16" r="5" fill="#FFFFFF" />
                </svg>
                <div className="relative">
                  <div className="text-3xl font-bold text-white tracking-tight">+31%</div>
                  <div className="text-xs text-[#8A8A9E] mt-1">readiness lift after first session</div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Filter Pills & Count */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const count = cat === 'Saved' 
                  ? savedPostIds.length 
                  : cat === 'All' 
                  ? POSTS.length 
                  : POSTS.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-sm font-medium border rounded-full px-4 py-2 transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                      activeCategory === cat
                        ? 'bg-[#7C5CFC]/18 border-[#7C5CFC] text-white'
                        : 'border-[#292940] text-[#8A8A9E] hover:border-[#7C5CFC]'
                    }`}
                  >
                    {cat === 'Saved' && <Bookmark size={13} color={activeCategory === 'Saved' ? '#A78BFA' : '#8A8A9E'} />}
                    {cat}
                    <span className="text-[11px] opacity-75 font-semibold">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-semibold text-[#8A8A9E]">
              Showing <span className="text-white font-bold">{filteredPosts.filter((p) => activeCategory !== 'All' || searchQuery.trim() !== '' || !p.isFeatured).length}</span> article{filteredPosts.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Grid Layout of Articles */}
          {filteredPosts.length > 0 ? (
            <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {filteredPosts
                .filter((p) => activeCategory !== 'All' || searchQuery.trim() !== '' || !p.isFeatured)
                .map((post) => {
                  const isSaved = savedPostIds.includes(post.id);
                  return (
                    <div
                      key={post.id}
                      onClick={() => router.push(`/blog/${post.id}`)}
                      className="group border border-[#1F1F30] hover:border-[#2C2A52] rounded-2xl bg-[#11111C] shadow-lg p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span 
                            className="inline-block text-[10px] font-bold tracking-wider rounded-lg px-2.5 py-1 uppercase"
                            style={{ color: post.tagColor, backgroundColor: post.tagBg, border: `1px solid ${post.tagLine}` }}
                          >
                            {post.category}
                          </span>

                          <button
                            onClick={(e) => toggleSavePost(post.id, e)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-[#1F1F30] text-[#6A6A7E] hover:text-white transition-all cursor-pointer"
                            title={isSaved ? 'Unsave Post' : 'Save Post'}
                          >
                            <Bookmark size={14} color={isSaved ? '#A78BFA' : 'currentColor'} fill={isSaved ? '#A78BFA' : 'none'} />
                          </button>
                        </div>

                        <h3 className="text-lg font-bold text-white tracking-tight leading-snug mb-2.5 group-hover:text-[#A78BFA] transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#8A8A9E] mb-5">
                          {post.description}
                        </p>
                      </div>
                      <div className="text-xs text-[#6A6A7E] font-medium flex items-center justify-between">
                        <span>{post.date} · {post.readTime}</span>
                        {post.author && <span className="text-[#8A8A9E]">{post.author}</span>}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="border border-[#1F1F30] rounded-2xl bg-[#11111C] p-12 text-center max-w-xl mx-auto my-8">
              <div className="w-12 h-12 rounded-full bg-[#7C5CFC]/12 text-[#A78BFA] flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                ?
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No articles found</h3>
              <p className="text-sm text-[#8A8A9E] mb-6">
                {activeCategory === 'Saved'
                  ? 'You have not saved any articles yet. Click the bookmark icon on any post to save it for later.'
                  : `We couldn't find any articles matching "${searchQuery || activeCategory}". Try clearing your filters.`}
              </p>
              <button
                onClick={() => {
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
                className="bg-[#7C5CFC]/18 border border-[#7C5CFC] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#7C5CFC]/30 transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Newsletter Section */}
          <div className="border border-[#292940] rounded-2xl bg-gradient-to-br from-[#7C5CFC]/10 to-[#11111C]/30 p-8 flex flex-col md:flex-row justify-between items-center gap-6 mt-16">
            <div className="flex-1 min-w-[260px]">
              <h3 className="text-lg font-bold text-white tracking-tight">One email a month. Nothing else.</h3>
              <p className="text-sm text-[#8A8A9E] mt-1">New openings, mentor drops and campus events — no noise.</p>
              {emailError !== '' && (
                <p className="text-xs text-[#F0616B] mt-1.5 font-medium">{emailError}</p>
              )}
            </div>
            <div className="flex flex-row flex-wrap gap-2 w-full md:w-auto md:flex-nowrap">
              <TextInput
                placeholder="you@college.edu"
                placeholderTextColor="#6A6A7E"
                value={emailInput}
                onChangeText={(text) => {
                  setEmailInput(text);
                  if (emailError) setEmailError('');
                }}
                className="flex-1 md:w-[240px] border border-[#1F1F30] rounded-xl bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#7C5CFC]"
              />
              <button
                onClick={handleSubscribe}
                className="bg-[#5B4FE9] hover:bg-[#4F43D6] text-white text-sm font-bold px-6 py-3 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                {subscribed ? 'Subscribed ✓' : 'Subscribe'}
              </button>
            </div>
          </div>

        </section>

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

