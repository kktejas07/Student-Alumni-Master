import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { Footer } from '@/src/views/web/nexus-glow-landing/Footer';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import { Sparkles, Search, Bookmark, X } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';
const LOCAL_STORAGE_SAVED_KEY = 'sa_blog_saved_posts';

// Mock Blog Posts Database matching SA New Theme
const POSTS = [
  {
    id: 'what-12400-student-profiles-tell-us-about-the-first-job',
    title: 'What 12,400 student profiles tell us about the first job',
    category: 'PLACEMENTS',
    subcategory: 'DATA STUDY',
    description: "Readiness scores rise fastest in the eight weeks after a student's first mentor session — not after their first application. We looked at why, and what it means for how colleges sequence placement prep.",
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
        // Fallback
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

  const filteredPosts = POSTS.filter((post) => {
    let matchesCategory = true;
    if (activeCategory === 'Saved') {
      matchesCategory = savedPostIds.includes(post.id);
    } else if (activeCategory !== 'All') {
      matchesCategory = post.category.toLowerCase() === activeCategory.toLowerCase();
    }
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      post.title.toLowerCase().includes(q) ||
      post.description.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q) ||
      (post.author && post.author.toLowerCase().includes(q))
    );
  });

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
          .rs-card-hover:hover {
            transform: translateY(-3px);
            border-color: #3A3468 !important;
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
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '34px 28px 90px', width: '100%' }}>
          
          {/* Header & Search Bar */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 30 }}>
            <div style={{ maxWidth: 720 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontWeight: '700', letterSpacing: '1.4px', color: '#A78BFA', background: 'rgba(124,92,252,.18)', borderRadius: 100, padding: '7px 14px' }}>
                <Sparkles size={13} color="#A78BFA" />
                BLOG
              </span>
              <div style={{ fontSize: 40, fontWeight: '700', letterSpacing: '-1.6px', margin: '20px 0 12px', color: '#FFFFFF' }}>
                What we're learning about early careers
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.65, color: '#8A8A9E' }}>
                Placement data, mentor practice and product notes from the campuses we work with.
              </div>
            </div>

            {/* Interactive Search Bar */}
            <div style={{ width: isMobile ? '100%' : 320, position: 'relative' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} color="#8A8A9E" style={{ position: 'absolute', left: 14, pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search articles or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', background: '#11111C', border: '1px solid #1F1F30', borderRadius: 12, paddingLeft: 40, paddingRight: 36, paddingTop: 10, paddingBottom: 10, fontSize: 14, color: '#FFFFFF', outline: 'none' }}
                />
                {searchQuery !== '' && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 12, background: 'transparent', border: 'none', color: '#8A8A9E', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* THIS MONTH Light Hero Banner (Shown when no search query and 'All' category) */}
          {activeCategory === 'All' && !searchQuery.trim() && (
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', background: '#F6F7FB', marginTop: 26, marginBottom: 30, border: '1px solid #E7E9F2', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
              <div style={{ position: 'absolute', left: '-8%', top: '-30%', width: '44%', paddingBottom: '44%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,.16), transparent 68%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: '-6%', bottom: '-34%', width: '40%', paddingBottom: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,166,232,.14), transparent 70%)', pointerEvents: 'none' }} />
              
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1fr) minmax(0, 1.05fr)', gap: isTablet ? 32 : 44, alignItems: 'center', padding: isMobile ? '30px 24px' : '48px 46px' }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: '700', letterSpacing: '1.5px', color: '#2E2091', background: 'rgba(124,92,252,.12)', border: '1px solid rgba(124,92,252,.24)', borderRadius: 100, padding: '7px 14px' }}>
                    THIS MONTH
                  </span>
                  <div style={{ fontSize: 38, fontWeight: '700', letterSpacing: '-1.5px', lineHeight: 1.14, color: '#14161D', margin: '22px 0 16px' }}>
                    Readiness rises after<br />a conversation.
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.7, color: '#4A5163', marginBottom: 30, maxWidth: 460 }}>
                    Two placement cycles of data from 42 institutions, and the one sequencing change that moved the numbers most.
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 22, marginBottom: 32, maxWidth: 420 }}>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: '700', letterSpacing: '-.9px', color: '#4B3FA8' }}>74%</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#5B6273', marginTop: 5 }}>mentor-first readiness</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: '700', letterSpacing: '-.9px', color: '#0E6E8C' }}>43%</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#5B6273', marginTop: 5 }}>application-first</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: '700', letterSpacing: '-.9px', color: '#047857' }}>61%</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#5B6273', marginTop: 5 }}>interviews via referral</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => router.push('/blog/what-12400-student-profiles-tell-us-about-the-first-job')}
                      style={{ fontSize: 14, fontWeight: '600', background: '#5B4FE9', color: '#FFFFFF', borderRadius: 11, padding: '13px 22px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      Read the study
                    </button>
                    <button 
                      onClick={() => setActiveCategory('Placements')}
                      style={{ fontSize: 14, fontWeight: '600', color: '#14161D', border: '1px solid #D3D7E4', borderRadius: 11, padding: '13px 22px', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                      Browse all posts
                    </button>
                  </div>
                </div>

                {/* Right Photo Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, 128px)', gap: 12, minWidth: 0 }}>
                  <div style={{ position: 'relative', gridRow: 'span 2', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                    <div style={{ width: '100%', height: '100%', padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(124,92,252,.35), rgba(20,16,45,.88))' }}>
                      <div style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.2px', color: '#A78BFA' }}>STUDY INSIGHTS</div>
                      <div style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>42 Campuses Analyzed</div>
                    </div>
                  </div>

                  <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                    <div style={{ width: '100%', height: '100%', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(111,214,255,.35), rgba(15,30,60,.88))' }}>
                      <div style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#6FD6FF' }}>MENTOR IMPACT</div>
                      <div style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>12,400 Students</div>
                    </div>
                  </div>

                  <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#E7E9F2', border: '1px solid #D3D7E4' }}>
                    <div style={{ width: '100%', height: '100%', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(135deg, rgba(52,211,153,.35), rgba(10,40,30,.88))' }}>
                      <div style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#34D399' }}>REFERRALS</div>
                      <div style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>61% Placement Rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Topics Bar */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26, borderTop: '1px solid #E2E5EF', background: 'rgba(255,255,255,.7)', padding: '20px 46px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: '700', letterSpacing: '1.5px', color: '#6B7280', flex: 'none' }}>TOPICS</span>
                <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                  <span onClick={() => setActiveCategory('Placements')} style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658', cursor: 'pointer' }}>PLACEMENTS</span>
                  <span onClick={() => setActiveCategory('Mentorship')} style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658', cursor: 'pointer' }}>MENTORSHIP</span>
                  <span onClick={() => setActiveCategory('Product')} style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658', cursor: 'pointer' }}>PRODUCT</span>
                  <span onClick={() => setActiveCategory('Campus')} style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658', cursor: 'pointer' }}>CAMPUS</span>
                  <span onClick={() => setActiveCategory('Engineering')} style={{ fontSize: 13.5, fontWeight: '700', letterSpacing: '.6px', color: '#3F4658', cursor: 'pointer' }}>ENGINEERING</span>
                </div>
              </div>
            </div>
          )}

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 30, marginBottom: 22 }}>
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <span
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    border: '1px solid',
                    borderColor: isSelected ? '#7C5CFC' : '#292940',
                    borderRadius: 100,
                    padding: '9px 16px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(124,92,252,.18)' : 'transparent',
                    color: isSelected ? '#F4F4FA' : '#8A8A9E',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cat} {cat === 'Saved' && savedPostIds.length > 0 ? `(${savedPostIds.length})` : ''}
                </span>
              );
            })}
          </div>

          {/* Featured Hero Article (Dark Card) */}
          {activeCategory === 'All' && !searchQuery.trim() && (
            <div 
              onClick={() => router.push('/blog/what-12400-student-profiles-tell-us-about-the-first-job')}
              style={{
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr)',
                gap: 26,
                border: '1px solid #1F1F30',
                borderRadius: 20,
                background: '#11111C',
                padding: 26,
                marginTop: 22,
                marginBottom: 28,
                alignItems: 'center'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#F5B342', background: 'rgba(245,179,66,.13)', border: '1px solid #4A3410', borderRadius: 7, padding: '5px 10px' }}>
                      FEATURED
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: '#A78BFA', background: 'rgba(124,92,252,.18)', border: '1px solid #2C2A52', borderRadius: 7, padding: '5px 10px' }}>
                      PLACEMENTS
                    </span>
                  </div>

                  <button
                    onClick={(e) => toggleSavePost('what-12400-student-profiles-tell-us-about-the-first-job', e)}
                    style={{ padding: 6, borderRadius: 8, border: '1px solid #1F1F30', background: 'transparent', color: '#8A8A9E', cursor: 'pointer' }}
                    title={savedPostIds.includes('what-12400-student-profiles-tell-us-about-the-first-job') ? 'Unsave Post' : 'Save Post'}
                  >
                    <Bookmark size={15} color={savedPostIds.includes('what-12400-student-profiles-tell-us-about-the-first-job') ? '#A78BFA' : 'currentColor'} fill={savedPostIds.includes('what-12400-student-profiles-tell-us-about-the-first-job') ? '#A78BFA' : 'none'} />
                  </button>
                </div>

                <div style={{ fontSize: 27, fontWeight: '700', letterSpacing: '-.9px', lineHeight: 1.2, color: '#FFFFFF' }}>
                  What 12,400 student profiles tell us about the first job
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.65, color: '#8A8A9E', margin: '12px 0 20px' }}>
                  Readiness scores rise fastest in the eight weeks after a student's first mentor session — not after their first application. We looked at why, and what it means for how colleges sequence placement prep.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#7C5CFC', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '700' }}>
                    AK
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' }}>Aisha Kapoor</div>
                    <div style={{ fontSize: 12.5, color: '#8A8A9E' }}>Aug 18, 2026 · 9 min read</div>
                  </div>
                </div>
              </div>

              {/* Visual Graph Card */}
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #292940', background: 'linear-gradient(150deg, rgba(124,92,252,.18), #11111C 68%)', aspectRatio: '4 / 3', display: 'flex', alignItems: 'flex-end', padding: 22 }}>
                <svg viewBox="0 0 300 180" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}>
                  <path d="M10 160 C 70 150 100 108 150 92 C 200 76 240 40 292 16" style={{ fill: 'none', stroke: '#8B84FF', strokeWidth: 2.4 }} />
                  <circle cx="150" cy="92" r="4" fill="#C4B5FD" />
                  <circle cx="292" cy="16" r="5" fill="#FFFFFF" />
                </svg>
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 34, fontWeight: '700', letterSpacing: '-1.2px', color: '#FFFFFF' }}>+31%</div>
                  <div style={{ fontSize: 12.5, color: '#8A8A9E', marginTop: 4 }}>readiness lift after first session</div>
                </div>
              </div>
            </div>
          )}

          {/* 3-Column Articles Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: 18, marginTop: 20 }}>
            {filteredPosts.filter(p => !p.isFeatured || activeCategory !== 'All' || searchQuery.trim()).map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/blog/${post.id}`)}
                className="rs-card-hover"
                style={{ border: '1px solid #1F1F30', borderRadius: 18, background: '#11111C', boxShadow: '0 18px 40px rgba(0,0,0,.35)', padding: '22px 24px 24px', cursor: 'pointer', transition: 'all 0.25s ease', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: '1px', color: post.tagColor, background: post.tagBg, border: `1px solid ${post.tagLine}`, borderRadius: 7, padding: '5px 10px' }}>
                      {post.category}
                    </span>
                    <button
                      onClick={(e) => toggleSavePost(post.id, e)}
                      style={{ padding: 4, borderRadius: 6, border: 'none', background: 'transparent', color: '#8A8A9E', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      <Bookmark size={14} color={savedPostIds.includes(post.id) ? '#A78BFA' : 'currentColor'} fill={savedPostIds.includes(post.id) ? '#A78BFA' : 'none'} />
                    </button>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: '700', letterSpacing: '-.4px', lineHeight: 1.3, margin: '16px 0 9px', color: '#FFFFFF' }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8A8A9E', marginBottom: 18 }}>
                    {post.description}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: '#6A6A7E' }}>
                  {post.date} · {post.readTime}
                </div>
              </div>
            ))}
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
