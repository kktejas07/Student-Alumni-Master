// @ts-nocheck
/**
 * EchoEventsPage — Enhanced ECHO Events Page with full-width responsive layout,
 * interactive scroll effects, parallax ambient glows, and sleek animations matching the exact spec.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api, resolveImageUrl } from '@/src/models/services/api';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';
import CommonFooter from '@/src/views/components/CommonFooter';
import { Navbar } from '@/src/views/web/nexus-glow-landing/Navbar';
import { useTheme } from '@/src/theme/ThemeContext';

interface EchoEventsPageProps {
  initialView?: 'list' | 'detail' | 'reg';
  initialSlug?: string;
}

const SAMPLE_EVENTS = [
  {
    id: 'snist',
    slug: 'snist',
    title: 'HackWave 3.0 (2026)',
    college: 'SNIST',
    college_name: 'Sreenidhi Institute of Science and Technology',
    college_full: 'Sreenidhi Institute of Science & Technology, Hyderabad',
    status: 'UPCOMING',
    organizer: 'Career Development Center · SNIST in collaboration with StudentAlumni.ai',
    description: "Build something real. In one overnight sprint. National-Level 24-Hour Tech Fest with 7 Verticals across AI, Security, Hiring and Firesides.",
    dates: 'September 04 – 05, 2026',
    date_short: 'September 04, 2026',
    date_pill: 'Sep 4 – 5, 2026',
    time: 'Sep 4th, 08:00 AM — Sep 5th, 01:00 PM',
    venue: 'Sreenidhi Institute of Science & Technology (SNIST), Hyderabad',
    location_short: 'SNIST Campus, Hyderabad',
    prize_pool: '₹2,00,000 Mega Grand Pool (₹50,000 Track Pool)',
    reg_closes: '2026-09-01',
    individual_fee: 599,
    team_fee: 2495,
    individual_seats: '985 seats available',
    team_slots: '197 team slots available',
    partners: ['CodeSpectra', 'Featherless', 'Stepupmark', 'Bandiwala', 'WeHive'],
    poster_banner: '/images/hackwave/hackwave_main_poster.png',
    gallery_images: [
      '/images/hackwave/hackwave_main_poster.png',
      '/images/hackwave/hackwave_speakers.jpg',
      '/images/hackwave/hackwave_cybersecurity_conclave.jpg',
      '/images/hackwave/hackwave_techfest_verticals.jpg',
      '/images/hackwave/hackwave_perks_pool.jpg',
      '/images/hackwave/stan_mierzwa_poster.png',
      '/images/hackwave/harish_kotra_poster.png',
      '/images/hackwave/ken_fishkin_poster.png',
      '/images/hackwave/sharon_kelley_poster.png',
      '/images/hackwave/jeremy_livingston_poster.png',
      '/images/hackwave/suman_kalia_poster.png',
      '/images/hackwave/m_avinash_rao_poster.png',
      '/images/hackwave/gopichand_anumolu_poster.png'
    ],
    gallery_layout: 'carousel',
    speakers: [
      { name: 'Stan Mierzwa, Ph.D.', position: 'Director, Center for Cybersecurity', company: 'Kean University', location: 'Union, New Jersey, USA', linkedin: 'in/stanmierzwa', category: 'International Panel', is_panel_member: true },
      { name: 'Ken Fishkin', position: 'President', company: 'ISC2 New Jersey Chapter', location: 'New Jersey, USA', linkedin: 'in/kfishkin', category: 'International Panel', is_panel_member: true },
      { name: 'Sharon Kelley', position: 'Board Member', company: 'ISC2 New Jersey Chapter (MS, MBA, CISSP, CCSP)', location: 'Hoboken, New Jersey, USA', linkedin: 'in/sharon-kelley-0292181', category: 'International Panel', is_panel_member: true },
      { name: 'Jeremy Livingston', position: 'CISO & Deputy CIO', company: 'Stevens Institute of Technology', location: 'Effort, Pennsylvania, USA', linkedin: 'in/jeremylivin', category: 'International Panel', is_panel_member: true },
      { name: 'Suman Kalia', position: 'Associate Professor & Chair, Computer Science', company: "Saint Peter's University", location: 'Jersey City, New Jersey, USA', linkedin: 'in/suman-kalia-300b521', category: 'International Panel', is_panel_member: true },
      { name: 'Jonna Dheeraj', position: 'Account Delivery & Program Management', company: 'Embedded SW · AI · VLSI · 5G · IoT', category: 'Voices That Build', is_panel_member: false },
      { name: 'Harish Kotra', position: 'DevX Lead', company: 'Quirq', category: 'Voices That Build', is_panel_member: false },
      { name: 'M Avinash Rao', position: 'Client Account Manager', company: 'Deloitte', category: 'Voices That Build', is_panel_member: false },
      { name: 'Gopichand Anumolu', position: 'Founder', company: 'ATLAST', category: 'Voices That Build', is_panel_member: false },
    ],
    verticals: [
      { title: 'Build by Sunset', desc: 'Ship something real between morning and dusk. Teams of 2–5, 5 AI tracks, ₹50,000 prize pool.', icon: 'rocket' },
      { title: 'Codethon', desc: 'Pre-event coding ladder: L1 to L2 to L3. Individual, scored, closes before Sep 4.', icon: 'code' },
      { title: 'Voices That Build', desc: 'A panel of people who have actually shipped — not people talking about shipping.', icon: 'mic' },
      { title: 'Meet the People Who Hire', desc: 'Recruiters in the room, not behind a portal. On-the-spot internship and placement offers.', icon: 'briefcase' },
      { title: 'Cyber Security Conclave', desc: 'Virtual, featuring the ISC2 New Jersey Chapter — global insights on trends, certifications, career pathways (Friday Sep 4, 6:00 PM IST).', icon: 'shield' },
      { title: 'International Panel', desc: 'Speakers joining live on the big screen from outside India.', icon: 'globe' },
      { title: 'Between the Builds', desc: 'Sleep, eat, work, find people. Open across both days.', icon: 'bed' },
      { title: 'Play After Dark', desc: 'Live music when the laptops finally close.', icon: 'music' },
      { title: 'Build by Fireside', desc: "Where the idea you haven't shipped yet finally gets heard.", icon: 'flame' }
    ],
    perks: [
      { name: 'Featherless AI', desc: 'A full account, free', value: '$29 value', icon: 'sparkles' },
      { name: 'SetupMark AI', desc: '50 credits, 2 months free', value: '$50 value', icon: 'infinity' },
      { name: 'CodeSpectra AI', desc: '3 months completely free', value: 'Assessments', icon: 'code' },
      { name: 'Bandiwala', desc: '15% off food', value: 'Coupon', icon: 'utensils' },
      { name: 'WeHive Consulting', desc: '15% off services', value: 'Coupon', icon: 'briefcase' },
      { name: 'Four meal coupons', desc: 'Lunch, dinner, midnight, breakfast', value: 'Included', icon: 'utensils' },
      { name: 'Certificates for all', desc: 'Participation and winner certificates', value: 'Verifiable', icon: 'award' },
      { name: 'On-the-spot offers', desc: 'Internship and placement offers, in the room', value: 'Live', icon: 'check' },
      { name: 'Surprise goodies', desc: 'Extra prizes and drops announced on the day', value: 'Surprise', icon: 'gift' }
    ],
    videos: [
      {
        title: 'HackWave 3.0 SNIST Official Teaser',
        video_url: 'https://www.youtube.com/watch?v=M576WGiDBdQ',
        thumbnail_url: '/images/hackwave/hackwave_main_poster.png',
        description: 'Watch the official teaser for HackWave 3.0 at SNIST — 7 Verticals, ₹2,00,000 Grand Pool.',
        platform: 'youtube'
      },
      {
        title: 'Cyber Security with AI Conclave Teaser',
        video_url: 'https://www.youtube.com/watch?v=aircAruvnKk',
        thumbnail_url: '/images/hackwave/hackwave_cybersecurity_conclave.jpg',
        description: 'Keynote highlights featuring ISC2 New Jersey Chapter and international cyber security experts.',
        platform: 'youtube'
      },
      {
        title: 'Build by Sunset — 24-Hour Hackathon Sprint Highlights',
        video_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        thumbnail_url: '/images/hackwave/hackwave_techfest_verticals.jpg',
        description: 'Overnight build sprint, tech mentorship, and product showcases live from SNIST campus.',
        platform: 'youtube'
      }
    ]
  }
];

export function EchoEventsPage({ initialView = 'list', initialSlug = 'snist' }: EchoEventsPageProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  // Update body background on theme change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.background = isDark ? '#0A0A14' : '#F5F5F7';
      document.body.style.color = isDark ? '#F4F4FA' : '#1D1D1F';
    }
  }, [isDark]);

  const searchParams = useLocalSearchParams();
  
  const [view, setView] = useState<'list' | 'detail' | 'reg'>(initialView);
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug || 'snist');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = new URLSearchParams(window.location.search);
      const eventParam = search.get('event') || search.get('slug');
      const viewParam = search.get('view');

      if (viewParam === 'register' || viewParam === 'reg' || path.includes('/register')) {
        const slugFromUrl = eventParam || (path.split('/').filter(Boolean)[1] !== 'register' ? path.split('/').filter(Boolean)[1] : null) || initialSlug || 'snist';
        setSelectedSlug(slugFromUrl);
        setView('reg');
      } else if (viewParam === 'catalog' || viewParam === 'list') {
        if (eventParam) setSelectedSlug(eventParam);
        setView('list');
      } else if (eventParam || (path.startsWith('/echo/') && path !== '/echo')) {
        const slugFromUrl = eventParam || path.split('/').filter(Boolean)[1] || initialSlug || 'snist';
        setSelectedSlug(slugFromUrl);
        setView('detail');
      } else if (path === '/echo') {
        setView(initialView || 'list');
      } else {
        setSelectedSlug(initialSlug || 'snist');
        setView(initialView || 'list');
      }
    } else if (searchParams?.view) {
      setView(searchParams.view as any);
      if (searchParams?.slug) setSelectedSlug(searchParams.slug as string);
    }
  }, []);
  
  const [events, setEvents] = useState<any[]>(SAMPLE_EVENTS);
  const [loading, setLoading] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [heroConfig, setHeroConfig] = useState<any>(null);

  // Registration states
  const [isTeam, setIsTeam] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsErr, setShowTermsErr] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  
  // Registration page poster carousel state
  const [regPosterIdx, setRegPosterIdx] = useState(0);
  const regPosters = [
    '/images/hackwave/hackwave_main_poster.png',
    '/images/hackwave/hackwave_speakers.jpg',
    '/images/hackwave/hackwave_cybersecurity_conclave.jpg',
    '/images/hackwave/hackwave_techfest_verticals.jpg',
    '/images/hackwave/hackwave_perks_pool.jpg',
    '/images/hackwave/stan_mierzwa_poster.png',
    '/images/hackwave/harish_kotra_poster.png',
    '/images/hackwave/m_avinash_rao_poster.png',
    '/images/hackwave/jeremy_livingston_poster.png',
    '/images/hackwave/gopichand_anumolu_poster.png'
  ];

  useEffect(() => {
    if (view !== 'reg') return;
    const timer = setInterval(() => {
      setRegPosterIdx((prev) => (prev + 1) % regPosters.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [view, regPosters.length]);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [track, setTrack] = useState('');
  const [college, setCollege] = useState('');
  const [collegeQuery, setCollegeQuery] = useState('');
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [collegeResults, setCollegeResults] = useState<any[]>([]);
  const [isSearchingColleges, setIsSearchingColleges] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; phone: string }>>([
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' },
  ]);

  useEffect(() => {
    if (!collegeQuery) {
      setCollegeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingColleges(true);
      try {
        const resp = await api.searchColleges(collegeQuery);
        if (resp && resp.results) {
          setCollegeResults(resp.results);
        } else {
          setCollegeResults([]);
        }
      } catch (err) {
        console.error('Failed to search colleges:', err);
      } finally {
        setIsSearchingColleges(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [collegeQuery]);

  // Active event resolution
  const activeEvent = events.find((e) => e.slug === selectedSlug) || events[0] || SAMPLE_EVENTS[0];

  // Derived dynamic team calculations
  const validMembers = isTeam
    ? teamMembers.filter((m) => (m.name || '').trim() || (m.email || '').trim())
    : [];
  const currentTeamSize = isTeam
    ? 1 + (validMembers.length > 0 ? validMembers.length : teamMembers.length)
    : 1;
  const perPersonFee = activeEvent?.individual_fee || 599;
  const calculatedTotalFee = isTeam ? (perPersonFee * currentTeamSize) : perPersonFee;

  // Checkout modal
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  // Scroll listener for top progress bar & parallax
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch and sync all showcase events from backend
  useEffect(() => {
    let mounted = true;
    api
      .listEchoShowcases()
      .then((res) => {
        if (mounted && res?.items && res.items.length > 0) {
          setEvents((prev) => {
            const map = new Map();
            // Seed defaults first
            SAMPLE_EVENTS.forEach((e) => map.set(e.slug, { ...e }));
            // Merge all items from backend
            res.items.forEach((item: any) => {
              const slugKey = item.slug || 'snist';
              const existing = map.get(slugKey) || {};
              map.set(slugKey, {
                ...existing,
                id: item.id || item.slug || existing.id || 'snist',
                slug: slugKey,
                title: item.title || existing.title || 'ECHO Event',
                college: item.college_name || item.college || existing.college || 'ECHO Campus',
                college_full: item.college_name || item.college || item.venue || existing.college_full || 'ECHO Campus',
                status: (item.event_status_badge || item.status || existing.status || 'UPCOMING').toUpperCase(),
                organizer: item.organizer_name || existing.organizer || 'CDC SNIST and in collaboration with StudentAlumni.ai',
                description: item.subtitle || item.description || existing.description || "Empowering Tomorrow's Leaders",
                dates: item.date || item.dates || existing.dates || 'September 04, 2026',
                date_short: item.date || item.dates || existing.date_short || 'September 04, 2026',
                date_pill: item.date || item.dates || existing.date_pill || 'Sep 4 – 5, 2026',
                time: item.time || existing.time || '09:00 AM',
                venue: item.venue || existing.venue || 'Sreenidhi Institute of Science & Technology',
                location_short: item.venue || existing.location_short || 'Hyderabad',
                prize_pool: item.prize_pool ? (String(item.prize_pool).includes('₹') ? item.prize_pool : `₹${item.prize_pool} prize pool`) : existing.prize_pool || '₹50,000 prize pool',
                reg_closes: item.reg_closes || existing.reg_closes || '2026-09-01',
                individual_fee: item.fee ?? item.individual_fee ?? existing.individual_fee ?? 599,
                team_fee: item.team_fee ?? existing.team_fee ?? 2495,
                individual_seats: item.available_seats ? `${item.available_seats} seats available` : existing.individual_seats || '985 seats available',
                team_slots: item.team_slots_available ? `${item.team_slots_available} team slots available` : existing.team_slots || '197 team slots available',
                partners: item.partners?.map((p: any) => (typeof p === 'string' ? p : p.name || p.title)) || existing.partners || ['CodeSpectra', 'Featherless', 'Stepupmark'],
                poster_banner: item.hero_image_url || item.banner_url || item.poster_url || existing.poster_banner || '',
                categories: item.categories || existing.categories || [],
                speakers: item.speakers || existing.speakers || [],
                gallery_images: item.gallery_images || item.gallery || existing.gallery_images || [],
                videos: (item.videos && item.videos.length > 0) ? item.videos : ((item.gallery_videos && item.gallery_videos.length > 0) ? item.gallery_videos : (existing.videos || [])),
                highlights: item.highlights || existing.highlights || [],
                handbook_url: item.handbook_url || existing.handbook_url || '/HackWave_3.0_Event_Handbook.pdf',
              });
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch detailed showcase document when selectedSlug changes
  useEffect(() => {
    let mounted = true;
    if (!selectedSlug) return;
    api
      .getEchoShowcase(selectedSlug)
      .then((item) => {
        if (mounted && item && item.slug) {
          setEvents((prev) =>
            prev.map((e) => {
              if (e.slug === item.slug) {
                return {
                  ...e,
                  title: item.title || e.title,
                  college: item.college_name || item.college || e.college,
                  college_full: item.college_name || item.college || item.venue || e.college_full,
                  status: (item.event_status_badge || item.status || e.status).toUpperCase(),
                  organizer: item.organizer_name || e.organizer,
                  description: item.subtitle || item.description || e.description,
                  dates: item.date || item.dates || e.dates,
                  time: item.time || e.time,
                  venue: item.venue || e.venue,
                  prize_pool: item.prize_pool ? (String(item.prize_pool).includes('₹') ? item.prize_pool : `₹${item.prize_pool} prize pool`) : e.prize_pool,
                  reg_closes: item.reg_closes || e.reg_closes,
                  individual_fee: item.fee ?? item.individual_fee ?? e.individual_fee,
                  team_fee: item.team_fee ?? e.team_fee,
                  individual_seats: item.available_seats ? `${item.available_seats} seats available` : e.individual_seats,
                  team_slots: item.team_slots_available ? `${item.team_slots_available} team slots available` : e.team_slots,
                  partners: item.partners?.map((p: any) => (typeof p === 'string' ? p : p.name || p.title)) || e.partners,
                  poster_banner: item.hero_image_url || item.banner_url || item.poster_url || e.poster_banner,
                  categories: item.categories || e.categories,
                  speakers: item.speakers || e.speakers,
                  gallery_images: item.gallery_images || item.gallery || e.gallery_images,
                  videos: (item.videos && item.videos.length > 0) ? item.videos : ((item.gallery_videos && item.gallery_videos.length > 0) ? item.gallery_videos : (e.videos || [])),
                  highlights: item.highlights || e.highlights,
                  handbook_url: item.handbook_url || e.handbook_url,
                };
              }
              return e;
            })
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [selectedSlug]);

  // Fetch hero config from ECHO settings
  useEffect(() => {
    let mounted = true;
    api.getEchoHeroConfig()
      .then((hc) => { if (mounted && hc) setHeroConfig(hc); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const go = (targetView: 'list' | 'detail' | 'reg', targetSlug?: string) => {
    const nextSlug = targetSlug || selectedSlug || 'snist';
    if (targetSlug && targetSlug !== selectedSlug) {
      setSelectedSlug(targetSlug);
    }
    setView(targetView);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      let targetUrl = '/echo';
      if (targetView === 'detail') {
        targetUrl = `/echo/${nextSlug}`;
      } else if (targetView === 'reg') {
        targetUrl = `/echo/${nextSlug}/register`;
      } else if (targetView === 'list') {
        targetUrl = '/echo';
      }
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ view: targetView, slug: nextSlug }, '', targetUrl);
      }
      window.scrollTo({ top: 0, behavior: 'instant' as any });
    }
  };

  // Synchronize view and selected event on browser back / forward buttons
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handlePopState = () => {
      const path = window.location.pathname;
      const search = new URLSearchParams(window.location.search);
      const eventParam = search.get('event') || search.get('slug');
      const viewParam = search.get('view');

      if (viewParam === 'register' || viewParam === 'reg' || path.includes('/register')) {
        const slugFromUrl = eventParam || (path.split('/').filter(Boolean)[1] !== 'register' ? path.split('/').filter(Boolean)[1] : null) || 'snist';
        setSelectedSlug(slugFromUrl);
        setView('reg');
      } else if (viewParam === 'catalog' || viewParam === 'list') {
        if (eventParam) setSelectedSlug(eventParam);
        setView('list');
      } else if (eventParam || (path.startsWith('/echo/') && path !== '/echo')) {
        const slugFromUrl = eventParam || path.split('/').filter(Boolean)[1] || 'snist';
        setSelectedSlug(slugFromUrl);
        setView('detail');
      } else {
        setSelectedSlug('snist');
        setView('detail');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleDownloadHandbook = () => {
    const handbookUrl = activeEvent.handbook_url || '/HackWave_3.0_Event_Handbook.pdf';
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = handbookUrl;
      link.download = handbookUrl.split('/').pop() || 'Event_Handbook.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Linking.openURL(handbookUrl).catch(() => {});
    }
  };

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleShare = () => {
    if (Platform.OS === 'web' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Event link copied to clipboard!');
    }
  };

  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        return resolve(false);
      }
      if ((window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    if (!acceptedTerms) {
      setShowTermsErr(true);
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      showToast('Please enter your full name and email to proceed.');
      return;
    }
    if (isTeam && !teamName.trim()) {
      showToast('Please enter a team name to proceed.');
      return;
    }
    setShowTermsErr(false);
    setIsPaying(true);

    const validMembers = isTeam
      ? teamMembers.filter((m) => m.name.trim() || m.email.trim())
      : [];
    
    const payload = {
      full_name: fullName || 'Student Attendee',
      email: email || 'student@example.com',
      phone: phone || '',
      date_of_birth: dob || '',
      branch: branch,
      year: year,
      hackwave_theme: track,
      college: college,
      terms_accepted: acceptedTerms,
      whatsapp_opt_in: whatsappOptIn,
      registration_type: isTeam ? 'team' : 'individual',
      team_name: isTeam ? teamName : '',
      team_size: currentTeamSize,
      team_members: validMembers,
      fee: calculatedTotalFee,
    };

    const targetSlug = activeEvent.slug || selectedSlug || 'snist';

    try {
      // Step 1: Attempt to create a real Razorpay payment order
      let orderRes: any = null;
      try {
        orderRes = await api.createEchoPaymentOrder(targetSlug, payload);
      } catch (err: any) {
        console.log('[EchoEventsPage] Payment order response notice:', err);
        // Fail-closed for paid events if order creation fails (e.g. 503 from backend)
        if (calculatedTotalFee > 0) {
          setIsPaying(false);
          showToast(err?.message || err?.detail || 'Online payments are temporarily unavailable — please try again later');
          return;
        }
      }

      // If user already paid or completed
      if (orderRes?.already && orderRes.registration) {
        const reg = orderRes.registration;
        setTicketData({
          ticketId: reg.id || `SA-HW3-${Math.floor(100000 + Math.random() * 900000)}`,
          eventName: activeEvent.title,
          attendeeName: fullName || 'Student Attendee',
          type: isTeam ? `Team Pass (${currentTeamSize} Members)` : 'Individual Pass',
          amount: calculatedTotalFee,
          date: activeEvent.dates,
          venue: activeEvent.venue,
          email: email || 'student@example.com',
          teamName: isTeam ? teamName : '',
          teamMembers: validMembers,
          qrCodeBase64: reg.qr_code_base64,
        });
        setIsPaying(false);
        setPaymentSuccess(true);
        return;
      }

      // Step 2: If Razorpay order created, launch the Razorpay Checkout Modal
      if (orderRes?.order_id && Platform.OS === 'web') {
        const isLoaded = await loadRazorpaySDK();
        if (isLoaded && (window as any).Razorpay) {
          const options = {
            key: orderRes.key_id,
            amount: (orderRes.amount || calculatedTotalFee) * 100,
            currency: orderRes.currency || 'INR',
            name: activeEvent.title || 'Student Alumni ECHO',
            description: isTeam ? `Team Registration: ${teamName} (${currentTeamSize} Members)` : `Individual Pass: ${activeEvent.title}`,
            image: resolveImageUrl(activeEvent.poster_banner) || '/images/hackwave/hackwave_main_poster.png',
            order_id: orderRes.order_id,
            prefill: {
              name: fullName,
              email: email,
              contact: phone,
            },
            notes: {
              slug: targetSlug,
              registration_type: isTeam ? 'team' : 'individual',
              team_name: isTeam ? teamName : '',
              team_size: String(currentTeamSize),
            },
            theme: {
              color: '#7C5CFC',
            },
            handler: async function (resp: any) {
              try {
                const verifyRes = await api.verifyEchoPayment(targetSlug, {
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                  email: email,
                  phone: phone,
                  full_name: fullName,
                  team_name: isTeam ? teamName : '',
                  team_size: currentTeamSize,
                  team_members: validMembers,
                });
                const reg = verifyRes?.registration || {};
                setTicketData({
                  ticketId: reg.id || resp.razorpay_payment_id || `SA-HW3-${Math.floor(100000 + Math.random() * 900000)}`,
                  eventName: activeEvent.title,
                  attendeeName: fullName || 'Student Attendee',
                  type: isTeam ? `Team Pass (${currentTeamSize} Members)` : 'Individual Pass',
                  amount: calculatedTotalFee,
                  date: activeEvent.dates,
                  venue: activeEvent.venue,
                  email: email || 'student@example.com',
                  teamName: isTeam ? teamName : '',
                  teamMembers: validMembers,
                  qrCodeBase64: reg.qr_code_base64,
                });
                setIsPaying(false);
                setPaymentSuccess(true);
              } catch (verifyErr: any) {
                console.error('[EchoEventsPage] Payment verification note:', verifyErr);
                setTicketData({
                  ticketId: resp.razorpay_payment_id || `SA-HW3-${Math.floor(100000 + Math.random() * 900000)}`,
                  eventName: activeEvent.title,
                  attendeeName: fullName || 'Student Attendee',
                  type: isTeam ? `Team Pass (${currentTeamSize} Members)` : 'Individual Pass',
                  amount: calculatedTotalFee,
                  date: activeEvent.dates,
                  venue: activeEvent.venue,
                  email: email || 'student@example.com',
                  teamName: isTeam ? teamName : '',
                  teamMembers: validMembers,
                });
                setIsPaying(false);
                setPaymentSuccess(true);
              }
            },
            modal: {
              ondismiss: function () {
                setIsPaying(false);
              },
            },
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (failResp: any) {
            setIsPaying(false);
            showToast(failResp?.error?.description || 'Payment was cancelled or failed. Please try again.');
          });
          rzp.open();
          return;
        } else {
          // If SDK fails to load, fail-closed for paid events
          setIsPaying(false);
          showToast('Could not load payment gateway. Please check your connection and try again.');
          return;
        }
      }

      // If it's a paid event and we reached here (no order_id or not web), fail closed
      if (calculatedTotalFee > 0) {
        setIsPaying(false);
        showToast('Payment cannot be processed at this time.');
        return;
      }

      // Step 3: Direct registration path (free event)
      let regRes: any = null;
      try {
        regRes = await api.registerEchoShowcase(targetSlug, {
          ...payload,
          fee: 0, // Enforce 0 fee for direct registration path
          payment: {
            status: 'free',
            amount: 0,
            payment_id: '',
          },
        });
      } catch (regErr) {
        console.log('[EchoEventsPage] Direct registration notice:', regErr);
      }

      const ticketId = regRes?.id || `SA-HW3-${Math.floor(100000 + Math.random() * 900000)}`;
      setTicketData({
        ticketId,
        eventName: activeEvent.title,
        attendeeName: fullName || 'Student Attendee',
        type: isTeam ? `Team Pass (${currentTeamSize} Members)` : 'Individual Pass',
        amount: 0,
        date: activeEvent.dates,
        venue: activeEvent.venue,
        email: email || 'student@example.com',
        teamName: isTeam ? teamName : '',
        teamMembers: validMembers,
        qrCodeBase64: regRes?.qr_code_base64,
      });

      setTimeout(() => {
        setIsPaying(false);
        setPaymentSuccess(true);
      }, 1000);
    } catch {
      setIsPaying(false);
    }
  };

  // Curtain loading state matching design specification
  const [curtainVisible, setCurtainVisible] = useState(true);
  const [curtainNum, setCurtainNum] = useState('00');
  const [curtainBarWidth, setCurtainBarWidth] = useState('0%');
  const [curtainOpacity, setCurtainOpacity] = useState(1);

  useEffect(() => {
    let t0 = performance.now();
    let animId: any;
    const step = (t: number) => {
      const pr = Math.min(1, (t - t0) / 1400);
      const e = 1 - Math.pow(1 - pr, 3);
      setCurtainNum(String(Math.round(e * 100)).padStart(2, '0'));
      setCurtainBarWidth((e * 100).toFixed(1) + '%');
      if (pr < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setCurtainNum('100');
        setCurtainBarWidth('100%');
        setCurtainOpacity(0);
        setTimeout(() => setCurtainVisible(false), 450);
      }
    };
    animId = requestAnimationFrame(step);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div id="ev-root" style={{ '--bg': isDark ? '#0A0A14' : '#F5F5F7', '--panel': isDark ? '#11111C' : '#FFFFFF', '--panel2': isDark ? '#161622' : '#F0F0F5', '--line': isDark ? '#1F1F30' : '#E5E5EA', '--line2': isDark ? '#292940' : '#D1D1D6', '--violet': '#7C5CFC', '--violet-lt': isDark ? '#A78BFA' : '#7C5CFC', '--ok': '#34D399', '--amber': '#F5B342', '--text': isDark ? '#F4F4FA' : '#1D1D1F', '--muted': isDark ? '#8A8A9E' : '#6E6E73', '--dim': isDark ? '#6A6A7E' : '#AEAEB2', fontFamily: "'Outfit', -apple-system, sans-serif", color: 'var(--text)', background: 'var(--bg)', minHeight: '100vh', width: '100%', position: 'relative', overflowX: 'hidden' }}>
      
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                font-family: 'Outfit', -apple-system, sans-serif !important;
                scroll-behavior: smooth;
                transition: background-color 0.3s ease, color 0.3s ease;
              }
              * { box-sizing: border-box; }
              a { color: #A78BFA; text-decoration: none; }
              a:hover { color: #C4B5FD; }
              ::-webkit-scrollbar { width: 8px; height: 8px; }
              ::-webkit-scrollbar-thumb { background: #23233A; border-radius: 4px; }
              
              @keyframes ev-tick {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
              }
              @keyframes ev-in {
                from { opacity: 0; transform: translateY(18px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes ev-dot {
                0%, 100% { opacity: .4; transform: scale(0.9); }
                50% { opacity: 1; transform: scale(1.2); }
              }
              @keyframes ev-drift {
                0%, 100% { transform: translate3d(0,0,0); }
                50% { transform: translate3d(-4%, 3%, 0); }
              }
              @keyframes ev-sheen {
                0% { transform: translateX(-130%) skewX(-16deg); }
                60%, 100% { transform: translateX(240%) skewX(-16deg); }
              }
              @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 20px rgba(124, 92, 252, 0.25); }
                50% { box-shadow: 0 0 35px rgba(124, 92, 252, 0.45); }
              }
              
              .ev-anim-in {
                animation: ev-in 0.6s cubic-bezier(.2, .8, .2, 1) both;
              }
              .ev-card {
                transition: transform .28s cubic-bezier(.2,.8,.2,1), border-color .28s ease, box-shadow .28s ease !important;
              }
              .ev-card:hover {
                transform: translateY(-6px) !important;
                border-color: #4B3FA8 !important;
                box-shadow: 0 20px 40px -10px rgba(124, 92, 252, 0.28) !important;
              }
              .ev-mini {
                transition: border-color .25s ease, transform .25s ease, background .25s ease !important;
              }
              .ev-mini:hover {
                transform: translateY(-4px) !important;
                border-color: #4B3FA8 !important;
                background: #1C1A32 !important;
              }
              .ev-hl {
                transition: background .25s ease, transform .25s ease, border-color .25s ease !important;
              }
              .ev-hl:hover {
                background: rgba(124,92,252,.22) !important;
                border-color: #7C5CFC !important;
                transform: scale(1.1) !important;
              }
              .ev-btn {
                transition: all .2s ease !important;
              }
              .ev-btn:hover {
                filter: brightness(1.14) !important;
                transform: translateY(-1.5px) !important;
              }
              .ev-nav {
                color: #8A8A9E;
                transition: background .2s ease, color .2s ease;
              }
              .ev-nav:hover, .ev-nav[data-on="1"] {
                background: rgba(124,92,252,.18) !important;
                color: #F4F4FA !important;
              }
              .ev-seg {
                color: #8A8A9E;
                transition: background .2s ease, border-color .2s ease, color .2s ease;
              }
              .ev-seg[data-on="1"] {
                background: rgba(124,92,252,.20) !important;
                border-color: #4B3FA8 !important;
                color: #F4F4FA !important;
              }
              .ev-field {
                transition: border-color .2s ease, background .2s ease, box-shadow .2s ease !important;
              }
              .ev-field:focus-within {
                border-color: #7C5CFC !important;
                background: #19182C !important;
                box-shadow: 0 0 0 3px rgba(124, 92, 252, 0.15) !important;
              }
              
              /* Responsive Grid Columns */
              @media (min-width: 960px) {
                .ev-grid2 {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                }
                .ev-grid3 {
                  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                }
                .ev-grid4 {
                  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                }
                .ev-dgrid {
                  grid-template-columns: minmax(0, 1fr) 440px !important;
                }
                .ev-rgrid {
                  grid-template-columns: minmax(0, 1fr) 560px !important;
                }
                .ev-fgrid {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                }
                .ev-actions {
                  grid-template-columns: minmax(0, 1fr) max-content !important;
                }
              }
              @media (max-width: 959px) {
                .ev-grid2, .ev-grid3, .ev-grid4, .ev-dgrid, .ev-rgrid, .ev-fgrid, .ev-actions {
                  grid-template-columns: minmax(0, 1fr) !important;
                }
                .ev-hlline {
                  display: none !important;
                }
              }
              /* ── Hero Card Responsive ── */
              @media (max-width: 820px) {
                .ev-hero-grid {
                  grid-template-columns: 1fr !important;
                  gap: 28px !important;
                }
                .ev-hero-title {
                  font-size: 28px !important;
                  letter-spacing: -1.2px !important;
                }
                .ev-hero-mosaic {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                  grid-template-rows: 80px 80px !important;
                }
                .ev-hero-mosaic .ev-mosaic-keynote {
                  grid-column: span 2 !important;
                  grid-row: span 1 !important;
                }
                .ev-hero-hosts {
                  flex-direction: column !important;
                  align-items: flex-start !important;
                  gap: 10px !important;
                }
                .ev-echo-header-title {
                  font-size: 24px !important;
                }
                .ev-echo-header-desc {
                  font-size: 14px !important;
                }
              }
              @media (max-width: 480px) {
                .ev-hero-grid {
                  gap: 20px !important;
                }
                .ev-hero-title {
                  font-size: 22px !important;
                  letter-spacing: -0.8px !important;
                }
                .ev-hero-stats {
                  gap: 16px !important;
                  grid-template-columns: repeat(3, 1fr) !important;
                }
                .ev-hero-stats > div {
                  min-width: 0 !important;
                }
                .ev-hero-mosaic {
                  grid-template-columns: 1fr 1fr !important;
                  grid-template-rows: 60px 60px !important;
                }
                .ev-hero-mosaic .ev-mosaic-keynote {
                  grid-column: span 2 !important;
                }
                .ev-hero-card {
                  padding: 20px 16px !important;
                  border-radius: 16px !important;
                }
                .ev-main-container {
                  padding: 80px 12px 60px !important;
                }
                .ev-hero-card > div:last-child {
                  flex-direction: column !important;
                }
                .ev-hero-card .ev-btn {
                  width: 100% !important;
                  justify-content: center !important;
                  text-align: center !important;
                }
                .ev-hero-description {
                  font-size: 14px !important;
                  line-height: 1.5 !important;
                }
                .ev-echo-header-title {
                  font-size: 20px !important;
                }
                .ev-echo-header-desc {
                  font-size: 13px !important;
                }
              }
              /* ── Registration Form Responsive ── */
              @media (max-width: 959px) {
                .ev-reg-grid {
                  grid-template-columns: 1fr !important;
                }
                .ev-reg-poster {
                  display: none !important;
                }
                .ev-reg-header-title {
                  font-size: 22px !important;
                }
                .ev-reg-header-meta {
                  flex-direction: column !important;
                  gap: 8px !important;
                }
                .ev-reg-fee-card {
                  flex-direction: column !important;
                  align-items: flex-start !important;
                  gap: 14px !important;
                }
                .ev-reg-form-card {
                  padding: 20px 18px !important;
                }
              }
              @media (max-width: 640px) {
                .ev-reg-container {
                  padding: 16px 14px 60px !important;
                }
                .ev-reg-header {
                  padding: 18px 18px 20px !important;
                  border-radius: 14px !important;
                }
                .ev-reg-header-title {
                  font-size: 19px !important;
                }
                .ev-reg-seg {
                  height: 44px !important;
                  font-size: 13px !important;
                }
                .ev-reg-fee-amount {
                  font-size: 20px !important;
                }
                .ev-reg-actions {
                  grid-template-columns: 1fr !important;
                }
                .ev-reg-pay-btn {
                  font-size: 13px !important;
                  padding: 14px 18px !important;
                }
                .ev-reg-form-card {
                  padding: 16px 14px !important;
                }
                .ev-reg-field {
                  padding: 12px 12px !important;
                }
                .ev-reg-select-grid {
                  grid-template-columns: 1fr !important;
                }
                .ev-reg-team-header {
                  flex-direction: column !important;
                  align-items: flex-start !important;
                  gap: 8px !important;
                }
              }
              /* ── Event Detail Responsive ── */
              @media (max-width: 959px) {
                .ev-detail-banner-info {
                  padding: 20px 22px 24px !important;
                }
                .ev-detail-title {
                  font-size: 26px !important;
                }
                .ev-detail-actions {
                  flex-direction: column !important;
                  align-items: stretch !important;
                }
                .ev-detail-actions .ev-btn {
                  justify-content: center !important;
                }
                .ev-detail-meta {
                  flex-direction: column !important;
                  gap: 10px !important;
                }
                .ev-detail-poster {
                  min-height: 240px !important;
                }
                .ev-detail-section-title {
                  font-size: 24px !important;
                }
                .ev-detail-speakers-grid {
                  grid-template-columns: 1fr !important;
                }
                .ev-detail-speaker-card {
                  padding: 16px 14px !important;
                }
                .ev-detail-speaker-name {
                  font-size: 15px !important;
                }
                .ev-detail-speaker-role {
                  font-size: 12px !important;
                }
              }
              @media (max-width: 640px) {
                .ev-detail-container {
                  padding: 16px 14px 60px !important;
                }
                .ev-detail-banner {
                  border-radius: 16px !important;
                }
                .ev-detail-poster {
                  min-height: 200px !important;
                }
                .ev-detail-banner-info {
                  padding: 16px 16px 18px !important;
                }
                .ev-detail-title {
                  font-size: 22px !important;
                  letter-spacing: -0.8px !important;
                }
                .ev-detail-desc {
                  font-size: 13.5px !important;
                }
                .ev-detail-pill {
                  font-size: 11px !important;
                  padding: 6px 10px !important;
                }
                .ev-detail-meta {
                  flex-direction: column !important;
                  gap: 8px !important;
                }
                .ev-detail-meta span {
                  font-size: 12.5px !important;
                }
                .ev-detail-actions .ev-btn {
                  width: 100% !important;
                  justify-content: center !important;
                  padding: 12px 16px !important;
                }
                .ev-detail-about {
                  padding: 18px 16px !important;
                }
                .ev-detail-section-title {
                  font-size: 20px !important;
                }
                .ev-detail-section-subtitle {
                  font-size: 12px !important;
                }
                .ev-detail-vert-card {
                  padding: 14px 14px !important;
                }
                .ev-detail-vert-title {
                  font-size: 13px !important;
                }
                .ev-detail-vert-desc {
                  font-size: 11.5px !important;
                }
                .ev-detail-speakers-header {
                  font-size: 18px !important;
                }
                .ev-detail-speaker-card {
                  padding: 14px 12px !important;
                }
                .ev-detail-speaker-name {
                  font-size: 14px !important;
                }
                .ev-detail-prize-amount {
                  font-size: 28px !important;
                }
                .ev-detail-prize-track {
                  font-size: 22px !important;
                }
                .ev-detail-cta-card {
                  padding: 20px 16px !important;
                }
                .ev-detail-cta-title {
                  font-size: 18px !important;
                }
              }
              /* Footer is handled by shared CommonFooter component */
            `,
          }}
        />
      )}

      {/* Top Scroll Glow Indicator */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '3px',
          width: `${scrollProgress}%`,
          background: 'linear-gradient(90deg, #7C5CFC, #C084FC, #38BDF8)',
          zIndex: 100,
          transition: 'width 0.1s linear',
          boxShadow: '0 0 10px #7C5CFC',
        }}
      />

      {/* Parallax Floating Ambient Background FX */}
      <div id="ev-bgfx" style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '-10%', top: '-18%', width: '850px', height: '680px', background: 'radial-gradient(circle, rgba(124,92,252,.22), transparent 68%)', filter: 'blur(80px)', animation: 'ev-drift 38s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', right: '-15%', top: '25%', width: '750px', height: '620px', background: 'radial-gradient(circle, rgba(91,79,233,.16), transparent 70%)', filter: 'blur(90px)', animation: 'ev-drift 52s ease-in-out infinite reverse' }} />
      </div>

      {/* Luxury SA Watermark on the Right */}
      <SAWatermark size={850} top={50} right={-30} opacity={0.14} fixed />

      {/* Intro Curtain Loader */}
      {curtainVisible && (
        <div
          id="ev-curtain"
          style={{
            fontFamily: "'Outfit', -apple-system, sans-serif",
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            background: isDark ? '#07070E' : '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '0 44px 40px',
            pointerEvents: 'none',
            opacity: curtainOpacity,
            transition: 'opacity .45s ease',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px' }}>
            <svg width="146" height="170" viewBox="0 0 300 350" style={{ display: 'block', maxWidth: '32vw', height: 'auto' }}>
              <defs>
                <linearGradient id="ev-badge-curt" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8B84FF" />
                  <stop offset="100%" stopColor="#5B4FE9" />
                </linearGradient>
              </defs>
              <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#ev-badge-curt)" />
              <text x="150" y="212" textAnchor="middle" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '122px', fontWeight: 800, letterSpacing: '-6px', fill: '#FFFFFF' }}>SA</text>
            </svg>
            <div style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-1.9px', lineHeight: 1.1, marginTop: '30px', whiteSpace: 'nowrap', color: '#C08BFF', background: 'linear-gradient(96deg, #F0A6E8 0%, #C08BFF 32%, #8B84FF 66%, #6FA8F5 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              #studentalumni
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 600, color: isDark ? 'rgba(244,245,251,.8)' : 'rgba(20,23,38,.8)', marginTop: '14px', whiteSpace: 'nowrap' }}>
              Built with love for students
              <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: '#8B84FF', flex: 'none' }}>
                <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6 4.6 4.6 0 0 1 20 10.6C20 16.1 12 21 12 21Z" />
              </svg>
              across all campus's
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '30px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '3.4px', color: isDark ? 'rgba(244,245,251,.62)' : 'rgba(20,23,38,.5)' }}>LOADING</div>
            <div id="ev-curtain-num" style={{ fontSize: '76px', fontWeight: 700, letterSpacing: '-3.2px', lineHeight: 0.85, fontVariantNumeric: 'tabular-nums', color: isDark ? '#F4F5FB' : '#141726' }}>
              {curtainNum}
            </div>
          </div>
          <div style={{ maxWidth: '1400px', width: '100%', margin: '16px auto 0', height: '2px', background: isDark ? 'rgba(244,245,251,.14)' : 'rgba(20,23,38,.1)' }}>
            <div id="ev-curtain-bar" style={{ height: '100%', width: curtainBarWidth, background: 'linear-gradient(90deg, #7C5CFC, #A78BFA)', transition: 'width 0.05s linear' }} />
          </div>
        </div>
      )}

      {/* Top Continuous Ticker Bar */}
      <div id="ev-tickwrap" style={{ position: 'sticky', top: 0, zIndex: 62, overflow: 'hidden', borderBottom: '1px solid var(--line)', background: '#090B18' }}>
        <div id="ev-ticker" style={{ display: 'flex', width: 'max-content', padding: '9px 0', animation: 'ev-tick 46s linear infinite' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>The network is a feed until it meets in person.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>86 ECHO events across 31 campuses.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>267 roles matched, 41 with a warm referral path.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Verified by your college email — free forever for students.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>HackWave 3.0 · Sep 4–5 · Sreenidhi (SNIST) · ₹2,00,000 Mega Grand Pool (₹50,000 Track Pool)</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Built with love for students across all campuses</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
          </div>
          {/* Duplicate set for seamless infinite loop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>The network is a feed until it meets in person.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>86 ECHO events across 31 campuses.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>267 roles matched, 41 with a warm referral path.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Verified by your college email — free forever for students.</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>HackWave 3.0 · Sep 4–5 · Sreenidhi (SNIST) · ₹2,00,000 Mega Grand Pool (₹50,000 Track Pool)</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Built with love for students across all campuses</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
            </span>
          </div>
        </div>
      </div>

      {/* ── Fixed Sticky Navigation Header ── */}
      <div style={{ position: 'sticky', top: '36px', zIndex: 60, background: '#0A0A14', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)', width: '100%' }}>
        <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', rowGap: '14px' }}>
          
          {/* SA Brand Badge */}
          <div
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 'none', cursor: 'pointer' }}
          >
            <svg width="32" height="38" viewBox="0 0 300 350" style={{ display: 'block', flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(139,92,246,0.35))' }}>
              <defs>
                <linearGradient id="ev-badge-grad2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#C9A7FF" />
                  <stop offset="48%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#5B2FD0" />
                </linearGradient>
                <linearGradient id="ev-badge-grad2-in" x1="0" y1="0" x2="0.4" y2="1">
                  <stop offset="0%" stopColor="#B683F5" />
                  <stop offset="100%" stopColor="#7331C9" />
                </linearGradient>
              </defs>
              <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#ev-badge-grad2)" />
              <path d="M150 28 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#ev-badge-grad2-in)" />
              <text x="150" y="218" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="128" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">SA</text>
            </svg>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', color: '#FFFFFF', fontFamily: "'Outfit', 'Manrope', -apple-system, sans-serif" }}>
              Student Alumni
            </span>
          </div>

          {/* Centered Navigation Tabs */}
          <div id="ev-tabs" style={{ display: 'flex', alignItems: 'center', gap: '30px', flex: '0 1 auto', flexShrink: 0, justifyContent: 'center', paddingTop: '2px' }}>
            <a
              className="ev-tab"
              onClick={() => router.push('/')}
              style={{ position: 'relative', fontSize: '15px', fontWeight: 500, color: 'var(--muted)', padding: '6px 2px 10px', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color .2s ease' }}
            >
              Home
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: '4px', height: '3px', borderRadius: '2px', background: 'var(--violet-lt)', opacity: 0 }} />
            </a>
            <a
              className="ev-tab"
              onClick={() => go('list')}
              style={{ position: 'relative', fontSize: '15px', fontWeight: 700, color: 'var(--text)', padding: '6px 2px 10px', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color .2s ease' }}
            >
              ECHO
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: '4px', height: '3px', borderRadius: '2px', background: 'var(--violet-lt)', opacity: 1 }} />
            </a>
            <a
              className="ev-tab"
              onClick={() => router.push('/verify')}
              style={{ position: 'relative', fontSize: '15px', fontWeight: 500, color: 'var(--muted)', padding: '6px 2px 10px', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color .2s ease' }}
            >
              Verify
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: '4px', height: '3px', borderRadius: '2px', background: 'var(--violet-lt)', opacity: 0 }} />
            </a>
            <a
              className="ev-tab"
              onClick={() => router.push('/contact')}
              style={{ position: 'relative', fontSize: '15px', fontWeight: 500, color: 'var(--muted)', padding: '6px 2px 10px', cursor: 'pointer', whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color .2s ease' }}
            >
              Contact Us
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: '4px', height: '3px', borderRadius: '2px', background: 'var(--violet-lt)', opacity: 0 }} />
            </a>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 'none' }}>
            <span
              onClick={() => router.push('/login')}
              className="ev-ghost"
              style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer', transition: 'color .2s ease' }}
            >
              Sign in
            </span>
            <span
              onClick={() => router.push('/register')}
              className="ev-btn"
              style={{ fontSize: '14px', fontWeight: 600, background: 'var(--violet)', color: '#FFFFFF', borderRadius: '100px', padding: '10px 20px', cursor: 'pointer', transition: 'all .2s ease' }}
            >
              Get Started
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* VIEW 1: EVENTS LIST VIEW                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="ev-anim-in ev-main-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '96px 28px 90px' }}>

          {/* ── ON THE GROUND Hero Card ── */}
          <div className="ev-hero-card" style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px', background: 'linear-gradient(150deg, #FFFFFF 0%, #F4F2FF 42%, #EAF7FA 100%)', boxShadow: isDark ? '0 1px 2px rgba(16,18,32,.06), 0 26px 64px rgba(16,18,32,.24)' : '0 1px 2px rgba(0,0,0,.04), 0 8px 32px rgba(0,0,0,.08)', padding: '34px 36px 36px', marginBottom: '20px', width: '100%' }}>
            {/* Decorative gradient orbs */}
            <div style={{ position: 'absolute', right: '-6%', top: '-48%', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,.20), transparent 66%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: '24%', bottom: '-62%', width: '440px', height: '440px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,184,198,.16), transparent 68%)', pointerEvents: 'none' }} />

            <div className="ev-hero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 420px)', gap: '40px', alignItems: 'center' }}>
              {/* Left column: text + stats + CTAs */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', color: '#2E2091', background: 'rgba(46,32,145,.10)', borderRadius: '100px', padding: '7px 14px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2E2091' }} />
                  {heroConfig?.badge || 'ON THE GROUND'}
                </div>
                <div className="ev-hero-title" style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-1.6px', lineHeight: 1.1, color: '#141726', margin: '18px 0 12px' }}>
                  {heroConfig?.title || 'The network is a feed until it meets in person.'}
                </div>
                <div style={{ fontSize: '16px', lineHeight: 1.65, color: '#4A4F63', maxWidth: '480px' }}>
                  {heroConfig?.description || 'Eighty-six ECHO events across thirty-one campuses. Alumni in the room, recruiters at the table, and a build sprint that runs overnight.'}
                </div>

                {/* Stats Row */}
                <div className="ev-hero-stats" style={{ display: 'grid', gridTemplateColumns: `repeat(${(heroConfig?.stats || [{value:'86',label:'events run',color:'#4B3FD6'},{value:'31',label:'cities',color:'#0E6E8C'},{value:'4.8',label:'average rating',color:'#A21C63'}]).length}, max-content)`, gap: '34px', margin: '26px 0 24px' }}>
                  {(heroConfig?.stats || [
                    { value: '86', label: 'events run', color: '#4B3FD6' },
                    { value: '31', label: 'cities', color: '#0E6E8C' },
                    { value: '4.8', label: 'average rating', color: '#A21C63' },
                  ]).map((stat: any, si: number) => (
                    <div key={si}>
                      <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1.1px', color: stat.color || '#4B3FD6' }}>{stat.value}</div>
                      <div style={{ fontSize: '12.5px', color: '#5F6474', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    onClick={() => {
                      const el = document.getElementById('ev-events-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="ev-btn"
                    style={{ fontSize: '14.5px', fontWeight: 700, background: '#4B3FD6', color: '#FFFFFF', borderRadius: '11px', padding: '14px 24px', cursor: 'pointer' }}
                  >
                    {heroConfig?.cta_primary || 'Browse all events'}
                  </span>
                  <span
                    onClick={() => router.push('/contact')}
                    className="ev-btn"
                    style={{ fontSize: '14.5px', fontWeight: 600, color: '#2E2A55', border: '1px solid #CFC9F3', borderRadius: '11px', padding: '14px 24px', cursor: 'pointer' }}
                  >
                    {heroConfig?.cta_secondary || 'Host on your campus'}
                  </span>
                </div>
              </div>

              {/* Right column: Mosaic grid */}
              <div className="ev-hero-mosaic" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gridTemplateRows: '96px 96px', gap: '10px' }}>
                <div className="ev-mosaic-keynote" style={{ gridColumn: 'span 2', gridRow: 'span 2', borderRadius: '14px', background: isDark ? 'linear-gradient(135deg, #1B1838, #2E2091)' : 'linear-gradient(135deg, #E8E4FF, #D5E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(30,27,75,0.8)', fontSize: '13px', fontWeight: 600 }}>
                  Keynote — Main Stage
                </div>
                <div style={{ borderRadius: '14px', background: isDark ? '#241A52' : '#E8E4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(30,27,75,0.7)', fontSize: '11px', fontWeight: 600 }}>
                  Crowd
                </div>
                <div style={{ borderRadius: '14px', background: isDark ? '#1A244D' : '#D5E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(30,27,75,0.7)', fontSize: '11px', fontWeight: 600 }}>
                  Workshop
                </div>
              </div>
            </div>

            {/* Recent Hosts Row */}
            <div className="ev-hero-hosts" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', borderTop: '1px solid rgba(20,23,38,.10)', marginTop: '30px', paddingTop: '22px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', color: '#5F6474' }}>RECENT HOSTS</span>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {(heroConfig?.recent_hosts || ['Sreenidhi Institute', 'VNR VJIET', 'Khammam Institute', 'CBIT Hyderabad']).map((h: string, idx: number) => (
                  <span key={idx} style={{ fontSize: '12.5px', fontWeight: 600, color: '#2E2A55', background: 'rgba(20,23,38,.05)', borderRadius: '100px', padding: '7px 14px' }}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── ECHO EVENTS Section Header ── */}
          <div id="ev-events-section" style={{ position: 'relative', overflow: 'hidden', border: `1px solid ${isDark ? '#3A2E72' : '#E5E5EA'}`, borderRadius: '20px', background: isDark ? 'linear-gradient(120deg, #241A52, #14122E 62%)' : 'linear-gradient(120deg, #F0EFFF, #E8F4F8 62%)', padding: '30px 32px 34px', marginBottom: '0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--violet-lt)', background: 'rgba(124,92,252,.18)', borderRadius: '100px', padding: '7px 14px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9Z" /></svg>
              {heroConfig?.section_badge || 'ECHO EVENTS'}
            </span>
            <div className="ev-echo-header-title" style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px', margin: '18px 0 10px', color: isDark ? '#FFFFFF' : '#1D1D1F' }}>
              {heroConfig?.section_title || 'Explore ECHO Events by College'}
            </div>
            <div className="ev-echo-header-desc" style={{ fontSize: '15px', lineHeight: 1.6, color: isDark ? '#BEB6E8' : '#565B70', maxWidth: '620px' }}>
              {heroConfig?.section_description || "Image galleries, partners, sponsors, speakers, testimonials and registration for every ECHO event we've conducted."}
            </div>
          </div>

          {/* ── 2-Column Events Grid ── */}
          <div className="ev-grid2" style={{ display: 'grid', gap: '20px', marginTop: '22px', width: '100%' }}>
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => go('detail', ev.slug)}
                className="ev-card"
                style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              >
                {/* Event Poster Card Banner */}
                <div style={{ position: 'relative', height: '188px', background: ev.poster_banner ? 'var(--panel2)' : (isDark ? 'linear-gradient(135deg, #2E2091, #14122E)' : 'linear-gradient(135deg, #E8E4FF, #D5E8F0)'), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {ev.poster_banner ? (
                    <img src={resolveImageUrl(ev.poster_banner)} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#070913' }} />
                  ) : (
                    <div style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', textAlign: 'center', padding: '20px' }}>
                      {ev.title}
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: isDark ? 'linear-gradient(to top, rgba(17,17,28,0.85) 0%, transparent 60%)' : 'linear-gradient(to top, rgba(17,17,28,0.6) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: '14px', left: '18px', right: '18px', zIndex: 3 }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.4px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{ev.title}</div>
                  </div>
                </div>

                {/* Event Content Details */}
                <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '13px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.8px', color: ev.status === 'COMPLETED' ? '#94A3B8' : 'var(--amber)', background: ev.status === 'COMPLETED' ? 'rgba(148,163,184,.13)' : 'rgba(245,179,66,.13)', border: `1px solid ${ev.status === 'COMPLETED' ? '#334155' : '#4A3410'}`, borderRadius: '7px', padding: '5px 10px' }}>
                        {ev.status}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '.8px', color: 'var(--violet-lt)', background: 'rgba(124,92,252,.14)', border: '1px solid #2E2A55', borderRadius: '7px', padding: '5px 10px' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5"></path></svg>
                        {ev.college}
                      </span>
                    </div>

                    <div style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-.4px', marginBottom: '7px', color: '#FFFFFF' }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)', marginBottom: '15px' }}>
                      {ev.description}
                    </div>

                    <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: 'var(--muted)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, flex: 'none' }}><rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect><path d="M3.5 10h17M8 5V2.5M16 5V2.5"></path></svg>
                        {ev.date_short}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: 'var(--muted)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, flex: 'none' }}><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>
                        {ev.venue}
                      </div>
                    </div>
                  </div>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600, color: 'var(--violet-lt)' }}>
                    View event
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M4 12h15M13 6l6 6-6 6"></path></svg>
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* VIEW 2: EVENT DETAIL VIEW                                 */}
      {/* ────────────────────────────────────────────────────────── */}
      {view === 'detail' && (
        <div className="ev-anim-in ev-detail-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '90px 28px 90px' }}>
          
          {/* Back to Events List Button */}
          <span
            onClick={() => go('list')}
            className="ev-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, border: '1px solid var(--line2)', borderRadius: '100px', padding: '10px 18px', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', marginBottom: '20px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M20 12H5M11 6l-6 6 6 6"></path></svg>
            Back
          </span>

          {/* Wide Event Hero Banner */}
          <div className="ev-detail-banner" style={{ border: '1px solid var(--line2)', borderRadius: '22px', overflow: 'hidden', background: 'var(--panel)', marginBottom: '22px', width: '100%' }}>
            
            {/* Banner Top Graphic */}
            <div className="ev-detail-poster" style={{ position: 'relative', minHeight: '360px', background: isDark ? 'linear-gradient(135deg, #1C1236 0%, #2A1758 50%, #160D30 100%)' : 'linear-gradient(135deg, #F0EFFF 0%, #E8F4F8 50%, #F0F5F8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}>
              {activeEvent.poster_banner && (
                <img src={resolveImageUrl(activeEvent.poster_banner)} alt={activeEvent.title} style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', margin: '0 auto' }} />
              )}
              <div style={{ position: 'absolute', width: '420px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(147, 51, 234, 0.35) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
            </div>

            {/* Banner Bottom Info */}
            <div className="ev-detail-banner-info" style={{ position: 'relative', background: 'var(--panel)', padding: '28px 34px 30px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 700, letterSpacing: '.9px', color: 'var(--amber)', background: 'rgba(245,179,66,.15)', border: '1px solid #4A3410', borderRadius: '100px', padding: '6px 13px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)', animation: 'ev-dot 2s ease-in-out infinite' }} />
                  {activeEvent.status}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)' }}>
                  {activeEvent.organizer.toUpperCase()}
                </span>
              </div>

              <div className="ev-detail-title" style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.1px', color: '#FFFFFF' }}>
                {activeEvent.title.split('–')[0]} – <span style={{ color: 'var(--violet-lt)' }}>{activeEvent.college}</span>
              </div>
              <div className="ev-detail-desc" style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--muted)', margin: '8px 0 18px', maxWidth: '680px' }}>
                {activeEvent.description}
              </div>

              {/* Pill Tags */}
              <div className="ev-detail-pills" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--amber)', background: 'rgba(245,179,66,.12)', border: '1px solid #4A3410', borderRadius: '100px', padding: '8px 14px' }}>
                  {activeEvent.date_pill}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#7FB2F7', background: 'rgba(76,141,246,.12)', border: '1px solid #23407A', borderRadius: '100px', padding: '8px 14px' }}>
                  {activeEvent.prize_pool}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#6FD6FF', background: 'rgba(47,184,198,.12)', border: '1px solid #1F4E5C', borderRadius: '100px', padding: '8px 14px' }}>
                  {activeEvent.location_short}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: 'var(--amber)', border: '1px solid #4A3410', borderRadius: '100px', padding: '8px 14px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><circle cx="12" cy="12" r="8.5"></circle><path d="M12 8v4.5l3 1.8"></path></svg>
                  Registration closes: {activeEvent.reg_closes}
                </span>
              </div>

              {/* Meta strip & Action Buttons */}
              <div className="ev-detail-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', borderTop: '1px solid var(--line)', paddingTop: '22px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect><path d="M3.5 10h17M8 5V2.5M16 5V2.5"></path></svg>
                    {activeEvent.dates}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><circle cx="12" cy="12" r="8.5"></circle><path d="M12 8v4.5l3 1.8"></path></svg>
                    {activeEvent.time}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'var(--muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>
                    {activeEvent.venue}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); go('reg', activeEvent.slug); }}
                    onTouchEnd={(e) => { e.preventDefault(); go('reg', activeEvent.slug); }}
                    className="ev-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 700, background: '#0E9F6E', color: '#FFFFFF', borderRadius: '10px', padding: '12px 22px', cursor: 'pointer', transition: 'all .2s ease', boxShadow: '0 4px 16px rgba(14, 159, 110, 0.35)', border: 'none', outline: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.9 }}><path d="M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v.5a2 2 0 000 6v.5A2.5 2.5 0 0118.5 18h-13A2.5 2.5 0 013 15.5V15a2 2 0 000-6Z"></path></svg>
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleDownloadHandbook(); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleDownloadHandbook(); }}
                    className="ev-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, background: 'var(--violet)', color: '#FFFFFF', borderRadius: '10px', padding: '12px 20px', cursor: 'pointer', transition: 'all .2s ease', border: 'none', outline: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><path d="M6 3h8l4 4v14H6Z"></path><path d="M14 3v4h4"></path></svg>
                    Event Handbook (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleShare(); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleShare(); }}
                    className="ev-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, border: '1px solid var(--line2)', borderRadius: '10px', padding: '12px 20px', color: 'var(--text)', cursor: 'pointer', transition: 'all .2s ease', background: 'transparent', outline: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><circle cx="18" cy="5.5" r="2.6"></circle><circle cx="6" cy="12" r="2.6"></circle><circle cx="18" cy="18.5" r="2.6"></circle><path d="M8.4 10.7l7.2-3.9M8.4 13.3l7.2 3.9"></path></svg>
                    Share
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* 2-Column: About Event & Organized By */}
          <div className="ev-dgrid" style={{ display: 'grid', gap: '22px', marginBottom: '28px', width: '100%' }}>
            
            {/* About Card */}
            <div className="ev-detail-about" style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '26px 28px 28px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.4px', color: '#FFFFFF' }}>About the Event</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', margin: '7px 0 22px' }}>A day of inspiration, learning, and networking</div>
              
              <div className="ev-grid3" style={{ display: 'grid', gap: '14px' }}>
                <div className="ev-mini" style={{ border: '1px solid var(--line2)', borderRadius: '14px', background: 'var(--panel2)', padding: '22px 18px', textAlign: 'center' }}>
                  <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(124,92,252,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--violet-lt)', strokeWidth: 1.8 }}><path d="M4 5.5l6-1.5 4 1.5 6-1.5v14l-6 1.5-4-1.5-6 1.5zM10 4v14"></path></svg>
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Learn</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>Industry insights</div>
                </div>
                
                <div className="ev-mini" style={{ border: '1px solid var(--line2)', borderRadius: '14px', background: 'var(--panel2)', padding: '22px 18px', textAlign: 'center' }}>
                  <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(124,92,252,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--violet-lt)', strokeWidth: 1.8 }}><rect x="9" y="3.5" width="6" height="5" rx="1.5"></rect><rect x="3" y="15.5" width="6" height="5" rx="1.5"></rect><rect x="15" y="15.5" width="6" height="5" rx="1.5"></rect><path d="M12 8.5v3.5M6 15.5V12h12v3.5"></path></svg>
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Connect</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>Build your network</div>
                </div>
                
                <div className="ev-mini" style={{ border: '1px solid var(--line2)', borderRadius: '14px', background: 'var(--panel2)', padding: '22px 18px', textAlign: 'center' }}>
                  <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(124,92,252,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--violet-lt)', strokeWidth: 1.8 }}><path d="M4 17l5-5 3 3 6-7M14 8h5v5"></path></svg>
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Grow</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>Shape your future</div>
                </div>
              </div>
            </div>

            {/* Organized By Card */}
            <div style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '26px 28px 28px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.4px', marginBottom: '20px', color: '#FFFFFF' }}>Event Organized By</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                <svg width="36" height="40" viewBox="0 0 300 350" style={{ flex: 'none' }}>
                  <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="url(#ev-badge-grad2)" />
                  <text x="150" y="212" textAnchor="middle" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '124px', fontWeight: 700, fill: '#FFFFFF' }}>SA</text>
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.4, color: '#FFFFFF' }}>{activeEvent.organizer}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px' }}>{activeEvent.college}</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', color: '#FFFFFF' }}>In Association With</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {activeEvent.partners.map((partner: any, idx: number) => (
                  <span key={idx} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', border: '1px solid var(--line2)', background: 'var(--panel2)', borderRadius: '100px', padding: '9px 16px' }}>
                    {typeof partner === 'string' ? partner : partner.name}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Official Event Videos & Teaser Clips */}
          {(() => {
            const MOCK_YOUTUBE_IDS = ["dQw4w9WgXcQ", "wjZofJX0v4M", "9bZkp7q19f0", "M576WGiDBdQ", "aircAruvnKk"];
            const validVideos = (activeEvent.videos || []).filter((vid: any) => {
              let url = typeof vid === "string" ? vid : (vid?.video_url || vid?.url || "");
              if (!url) return false;
              const isYt = url.includes("youtube.com") || url.includes("youtu.be");
              if (isYt) {
                const ytId = url.includes("v=") ? url.split("v=")[1]?.split("&")[0] : url.split("/").pop();
                if (MOCK_YOUTUBE_IDS.includes(ytId)) return false;
              }
              return true;
            });

            if (validVideos.length === 0) return null;

            return (
              <div style={{ marginBottom: "32px" }}>
                <div style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-.4px", marginBottom: "16px", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet-lt)" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  Official Event Teasers & Videos
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 360px))", gap: "16px", justifyContent: "flex-start" }}>
                  {validVideos.map((vid: any, vidx: number) => {
                  let url = typeof vid === "string" ? vid : (vid?.video_url || vid?.url || "");
                  const isYt = url.includes("youtube.com") || url.includes("youtu.be");
                  const ytId = isYt ? (url.includes("v=") ? url.split("v=")[1]?.split("&")[0] : url.split("/").pop()) : null;
                  let rawTitle = typeof vid === "object" ? (vid?.title || vid?.name) : "";

