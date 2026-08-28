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
import { api } from '@/src/models/services/api';
import { SAWatermark } from '@/src/views/web/components/SAWatermark';

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
      '/images/hackwave/hackwave_cybersecurity_conclave.jpg',
      '/images/hackwave/hackwave_speakers.jpg',
      '/images/hackwave/hackwave_techfest_verticals.jpg',
      '/images/hackwave/hackwave_perks_pool.jpg'
    ],
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
    ]
  },
  {
    id: 'vnr',
    slug: 'vnr',
    title: 'VNR ECHO 2026',
    college: 'VNR VJIET',
    college_name: 'VNR Vignana Jyothi Institute of Engineering and Technology',
    college_full: 'VNR Vignana Jyothi Institute of Engineering & Technology, Hyderabad',
    status: 'COMPLETED',
    organizer: 'VNR Student Council in collaboration with StudentAlumni.ai',
    description: "Empowering Tomorrow's Leaders — Innovation, Career Tracks and AI Engineering.",
    dates: 'July 31, 2026',
    date_short: 'July 31, 2026',
    date_pill: 'Jul 31, 2026',
    time: '09:30 AM — 04:30 PM',
    venue: 'Main Auditorium, VNR VJIET, Hyderabad',
    location_short: 'VNR VJIET Campus, Hyderabad',
    prize_pool: '₹35,000 prize pool',
    reg_closes: '2026-07-28',
    individual_fee: 499,
    team_fee: 1999,
    individual_seats: '320 attended',
    team_slots: '64 teams',
    partners: ['Deloitte', 'Featherless', 'Atlast', 'Microsoft', 'Google'],
    poster_banner: '/images/hackwave/hackwave_techfest_verticals.jpg',
    gallery_images: [
      '/images/hackwave/hackwave_techfest_verticals.jpg',
      '/images/hackwave/hackwave_speakers.jpg',
      '/images/hackwave/hackwave_main_poster.png',
      '/images/hackwave/hackwave_cybersecurity_conclave.jpg',
      '/images/hackwave/hackwave_perks_pool.jpg'
    ],
    speakers: [
      { name: 'Vijay Raghavan', position: 'Chief AI Architect', company: 'Google', category: 'Keynote Speaker', is_panel_member: true },
      { name: 'Sneha Reddy', position: 'VP Engineering', company: 'Microsoft', category: 'Panelist', is_panel_member: true },
      { name: 'Dr. Kavitha Nair', position: 'Professor & NLP Researcher', company: 'VNR VJIET', category: 'Academic Mentor', is_panel_member: true },
      { name: 'Arjun Mehta', position: 'Founder', company: 'BrightFuture Labs', category: 'Industry Speaker', is_panel_member: false }
    ],
    highlights: [
      { title: 'AI at Scale Keynote', desc: 'Vijay Raghavan on large-scale production ML architectures' },
      { title: 'Careers in AI Panel', desc: 'Industry veterans answer student questions on emerging roles' },
      { title: 'Hands-on Hackathon', desc: 'Sprint across MedTech, FinTech, and Smart Mobility' },
      { title: 'Networking Hub', desc: 'Connect directly with alumni from leading global tech companies' }
    ]
  },
];

export function EchoEventsPage({ initialView = 'list', initialSlug = 'snist' }: EchoEventsPageProps) {
  const router = useRouter();
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
  const [heroConfig, setHeroConfig] = useState<any>(null);

  // Registration states
  const [isTeam, setIsTeam] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsErr, setShowTermsErr] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [dob, setDob] = useState('');
  const [track, setTrack] = useState('');
  const [college, setCollege] = useState('');
  const [collegeQuery, setCollegeQuery] = useState('');
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; phone: string }>>([
    { name: '', email: '', phone: '' },
  ]);

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
    if (targetSlug) setSelectedSlug(targetSlug);
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
        window.history.pushState(null, '', targetUrl);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      alert('Please enter your full name and email to proceed.');
      return;
    }
    if (isTeam && !teamName.trim()) {
      alert('Please enter a team name to proceed.');
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
            image: activeEvent.poster_banner || '/images/hackwave/hackwave_main_poster.png',
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
            alert(failResp?.error?.description || 'Payment was cancelled or failed. Please try again.');
          });
          rzp.open();
          return;
        }
      }

      // Step 3: Direct registration path (free event / demo / direct fallback)
      let regRes: any = null;
      try {
        regRes = await api.registerEchoShowcase(targetSlug, {
          ...payload,
          fee: calculatedTotalFee,
          payment: {
            status: 'paid',
            amount: calculatedTotalFee,
            payment_id: `PAY_RAZOR_${Math.floor(100000 + Math.random() * 900000)}`,
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
        amount: calculatedTotalFee,
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
    <div id="ev-root" style={{ '--bg': '#0A0A14', '--panel': '#11111C', '--panel2': '#161622', '--line': '#1F1F30', '--line2': '#292940', '--violet': '#7C5CFC', '--violet-lt': '#A78BFA', '--ok': '#34D399', '--amber': '#F5B342', '--text': '#F4F4FA', '--muted': '#8A8A9E', '--dim': '#6A6A7E', fontFamily: "'Outfit', -apple-system, sans-serif", color: 'var(--text)', background: 'var(--bg)', minHeight: '100vh', width: '100%', position: 'relative', overflowX: 'hidden' }}>
      
      {Platform.OS === 'web' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                background: #0A0A14 !important;
                color: #F4F4FA !important;
                font-family: 'Outfit', -apple-system, sans-serif !important;
                scroll-behavior: smooth;
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
              
              #ev-ticker:hover {
                animation-play-state: paused !important;
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
                  font-size: 24px !important;
                }
                .ev-hero-stats {
                  gap: 20px !important;
                }
                .ev-hero-mosaic {
                  grid-template-columns: 1fr 1fr !important;
                  grid-template-rows: 60px 60px !important;
                }
                .ev-hero-mosaic .ev-mosaic-keynote {
                  grid-column: span 2 !important;
                }
                .ev-hero-card {
                  padding: 24px 20px !important;
                  border-radius: 18px !important;
                }
                .ev-main-container {
                  padding: 20px 16px 60px !important;
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
              /* ── Footer Responsive ── */
              @media (max-width: 640px) {
                .ev-footer-inner {
                  padding: 32px 16px 24px !important;
                }
                .ev-footer-grid {
                  grid-template-columns: 1fr 1fr !important;
                  gap: 24px !important;
                }
                .ev-footer-brand {
                  grid-column: span 2 !important;
                }
                .ev-footer-bottom {
                  flex-direction: column !important;
                  align-items: flex-start !important;
                  gap: 14px !important;
                }
                .ev-footer-social {
                  gap: 16px !important;
                }
              }
              @media (max-width: 380px) {
                .ev-footer-grid {
                  grid-template-columns: 1fr !important;
                }
                .ev-footer-brand {
                  grid-column: span 1 !important;
                }
              }
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
            background: '#07070E',
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
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 600, color: 'rgba(244,245,251,.8)', marginTop: '14px', whiteSpace: 'nowrap' }}>
              Built with love for students
              <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: '#8B84FF', flex: 'none' }}>
                <path d="M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6 4.6 4.6 0 0 1 20 10.6C20 16.1 12 21 12 21Z" />
              </svg>
              across all campus's
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '30px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '3.4px', color: 'rgba(244,245,251,.62)' }}>LOADING</div>
            <div id="ev-curtain-num" style={{ fontSize: '76px', fontWeight: 700, letterSpacing: '-3.2px', lineHeight: 0.85, fontVariantNumeric: 'tabular-nums', color: '#F4F5FB' }}>
              {curtainNum}
            </div>
          </div>
          <div style={{ maxWidth: '1400px', width: '100%', margin: '16px auto 0', height: '2px', background: 'rgba(244,245,251,.14)' }}>
            <div id="ev-curtain-bar" style={{ height: '100%', width: curtainBarWidth, background: 'linear-gradient(90deg, #7C5CFC, #A78BFA)', transition: 'width 0.05s linear' }} />
          </div>
        </div>
      )}

      {/* Top Continuous Ticker Bar */}
      <div id="ev-tickwrap" style={{ position: 'sticky', top: 0, zIndex: 62, overflow: 'hidden', borderBottom: '1px solid var(--line)', background: 'linear-gradient(90deg, rgba(124,92,252,.12), rgba(240,166,232,.08) 52%, rgba(111,168,245,.10))' }}>
        <div id="ev-ticker" style={{ display: 'flex', width: 'max-content', padding: '9px 0', animation: 'ev-tick 46s linear infinite' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none' }}>
            {(activeEvent.ticker_messages?.length ? activeEvent.ticker_messages : [
              { text: 'The network is a feed until it meets in person.' },
              { text: '86 ECHO events across 31 campuses.' },
              { text: '267 roles matched, 41 with a warm referral path.' },
              { text: 'Verified by your college email — free forever for students.' },
              { text: `HackWave 3.0 · Sep 4–5 · Sreenidhi (SNIST) · ${(activeEvent.prize_pool || '₹2,00,000 Mega Grand Pool')}` },
              { text: 'Built with love for students across all campuses' },
            ]).map((msg: any, i: number) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{msg.text}</span>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
              </span>
            ))}
          </div>
          {/* Duplicate set for seamless infinite loop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none' }}>
            {(activeEvent.ticker_messages?.length ? activeEvent.ticker_messages : [
              { text: 'The network is a feed until it meets in person.' },
              { text: '86 ECHO events across 31 campuses.' },
              { text: '267 roles matched, 41 with a warm referral path.' },
              { text: 'Verified by your college email — free forever for students.' },
              { text: `HackWave 3.0 · Sep 4–5 · Sreenidhi (SNIST) · ${(activeEvent.prize_pool || '₹2,00,000 Mega Grand Pool')}` },
              { text: 'Built with love for students across all campuses' },
            ]).map((msg: any, i: number) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '26px', padding: '0 26px', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{msg.text}</span>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#A78BFA', flex: 'none' }} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Fixed Sticky Navigation Header ── */}
      <div style={{ position: 'sticky', top: '36px', zIndex: 40, background: 'rgba(10,10,20,.84)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)', width: '100%' }}>
        <div style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', rowGap: '14px' }}>
          
          {/* SA Brand Badge */}
          <div
            onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 'none', cursor: 'pointer' }}
          >
            <svg width="28" height="33" viewBox="0 0 300 350" style={{ display: 'block', flexShrink: 0 }}>
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
              <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="url(#ev-badge-grad2-in)" />
              <text x="150" y="214" textAnchor="middle" style={{ fontFamily: "'Manrope', -apple-system, sans-serif", fontSize: '118px', fontWeight: '800', letterSpacing: '-5px', fill: '#FFFFFF' }}>SA</text>
            </svg>
            <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.4px', color: '#FFFFFF', fontFamily: "'Manrope', sans-serif" }}>StudentAlumni</span>
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
        <div className="ev-anim-in ev-main-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '32px 28px 90px' }}>

          {/* ── ON THE GROUND Hero Card ── */}
          <div className="ev-hero-card" style={{ position: 'relative', overflow: 'hidden', borderRadius: '24px', background: 'linear-gradient(150deg, #FFFFFF 0%, #F4F2FF 42%, #EAF7FA 100%)', boxShadow: '0 1px 2px rgba(16,18,32,.06), 0 26px 64px rgba(16,18,32,.24)', padding: '34px 36px 36px', marginBottom: '20px', width: '100%' }}>
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
                <div className="ev-mosaic-keynote" style={{ gridColumn: 'span 2', gridRow: 'span 2', borderRadius: '14px', background: 'linear-gradient(135deg, #1B1838, #2E2091)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600 }}>
                  Keynote — Main Stage
                </div>
                <div style={{ borderRadius: '14px', background: '#241A52', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600 }}>
                  Crowd
                </div>
                <div style={{ borderRadius: '14px', background: '#1A244D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600 }}>
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
          <div id="ev-events-section" style={{ position: 'relative', overflow: 'hidden', border: '1px solid #3A2E72', borderRadius: '20px', background: 'linear-gradient(120deg, #241A52, #14122E 62%)', padding: '30px 32px 34px', marginBottom: '0' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--violet-lt)', background: 'rgba(124,92,252,.18)', borderRadius: '100px', padding: '7px 14px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9Z" /></svg>
              {heroConfig?.section_badge || 'ECHO EVENTS'}
            </span>
            <div className="ev-echo-header-title" style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1.2px', margin: '18px 0 10px', color: '#FFFFFF' }}>
              {heroConfig?.section_title || 'Explore ECHO Events by College'}
            </div>
            <div className="ev-echo-header-desc" style={{ fontSize: '15px', lineHeight: 1.6, color: '#BEB6E8', maxWidth: '620px' }}>
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
                <div style={{ position: 'relative', height: '188px', background: ev.poster_banner ? 'var(--panel2)' : 'linear-gradient(135deg, #2E2091, #14122E)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {ev.poster_banner ? (
                    <img src={ev.poster_banner} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', textAlign: 'center', padding: '20px' }}>
                      {ev.title}
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,17,28,0.85) 0%, transparent 60%)' }} />
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
        <div className="ev-anim-in ev-detail-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '26px 28px 90px' }}>
          
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
            <div className="ev-detail-poster" style={{ position: 'relative', minHeight: '360px', background: 'linear-gradient(135deg, #1C1236 0%, #2A1758 50%, #160D30 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}>
              {activeEvent.poster_banner && (
                <img src={activeEvent.poster_banner} alt={activeEvent.title} style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', margin: '0 auto' }} />
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

                <div className="ev-detail-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    onClick={() => go('reg', activeEvent.slug)}
                    className="ev-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 700, background: '#0E9F6E', color: '#FFFFFF', borderRadius: '10px', padding: '12px 22px', cursor: 'pointer', transition: 'all .2s ease', boxShadow: '0 4px 16px rgba(14, 159, 110, 0.35)' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.9 }}><path d="M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v.5a2 2 0 000 6v.5A2.5 2.5 0 0118.5 18h-13A2.5 2.5 0 013 15.5V15a2 2 0 000-6Z"></path></svg>
                    Register
                  </span>
                  <span
                    onClick={handleDownloadHandbook}
                    className="ev-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, background: 'var(--violet)', color: '#FFFFFF', borderRadius: '10px', padding: '12px 20px', cursor: 'pointer', transition: 'all .2s ease' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><path d="M6 3h8l4 4v14H6Z"></path><path d="M14 3v4h4"></path></svg>
                    Event Handbook (PDF)
                  </span>
                  <span
                    onClick={handleShare}
                    className="ev-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, border: '1px solid var(--line2)', borderRadius: '10px', padding: '12px 20px', color: 'var(--text)', cursor: 'pointer', transition: 'all .2s ease' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><circle cx="18" cy="5.5" r="2.6"></circle><circle cx="6" cy="12" r="2.6"></circle><circle cx="18" cy="18.5" r="2.6"></circle><path d="M8.4 10.7l7.2-3.9M8.4 13.3l7.2 3.9"></path></svg>
                    Share
                  </span>
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

          {/* Official Event Posters & Gallery */}
          <div style={{ marginBottom: '30px' }}>
            <div className="ev-detail-section-title" style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.4px', marginBottom: '16px', color: '#FFFFFF' }}>Official Event Posters & Gallery</div>
            {activeEvent.gallery_images && activeEvent.gallery_images.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                {activeEvent.gallery_images.map((img: string, gidx: number) => (
                  <div key={gidx} className="ev-mini" style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--line2)', background: '#0D0B18', padding: '12px', textAlign: 'center' }}>
                    <img src={img} alt={`Event Poster ${gidx + 1}`} style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '10px' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '60px 24px', textAlign: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--dim)', strokeWidth: 1.6, margin: '0 auto 12px' }}><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"></path></svg>
                <div style={{ fontSize: '14.5px', color: 'var(--muted)' }}>No photos yet. Upload gallery photos via Admin CMS.</div>
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* A NATIONAL-LEVEL TECH FEST — 7 VERTICALS (BANNER 4)       */}
          {/* ────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '32px', border: '1px solid #3A2E72', borderRadius: '22px', background: 'linear-gradient(135deg, #1B143A 0%, #110E24 100%)', padding: '32px 30px' }}>              <div style={{ textAlign: 'center', marginBottom: '26px' }}>
              <span className="ev-detail-section-subtitle" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: '#FFFFFF', background: '#EF4444', borderRadius: '100px', padding: '6px 14px', marginBottom: '12px' }}>
                THIS IS NOT JUST A HACKATHON
              </span>
              <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1.1px', color: '#FFFFFF' }}>
                A national-level <span style={{ color: '#60A5FA' }}>TECH FEST</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', color: '#A78BFA', marginTop: '6px' }}>
                SEVEN VERTICALS · ONE TICKET · ONE OVERNIGHT SPRINT
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              {(activeEvent.categories || activeEvent.verticals || [
                { name: 'Build by Sunset', description: 'Ship something real between morning and dusk. Teams of 2–5, 5 AI tracks, ₹50,000 prize pool.', icon: 'rocket' },
                { name: 'Codethon', description: 'Pre-event coding ladder: L1 to L2 to L3. Individual, scored, closes before Sep 4.', icon: 'code' },
                { name: 'Voices That Build', description: 'A panel of people who have actually shipped — not people talking about shipping.', icon: 'mic' },
                { name: 'Meet the People Who Hire', description: 'Recruiters in the room, not behind a portal. On-the-spot internship and placement offers.', icon: 'briefcase' },
                { name: 'Cyber Security Conclave', description: 'Virtual, featuring the ISC2 New Jersey Chapter — global insights on trends, certifications, career pathways.', icon: 'shield' },
                { name: 'International Panel', description: 'Speakers joining live on the big screen from outside India.', icon: 'globe' },
                { name: 'Between the Builds', description: 'Sleep, eat, work, find people. Open across both days.', icon: 'bed' },
                { name: 'Play After Dark', description: 'Live music when the laptops finally close.', icon: 'music' },
                { name: 'Build by Fireside', description: "Where the idea you haven't shipped yet finally gets heard.", icon: 'flame' }
              ]).map((vert: any, vidx: number) => (
                <div key={vidx} className="ev-mini ev-detail-vert-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(124,92,252,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: '2px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="2"><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9Z" /></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ev-detail-vert-title" style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{vert.name || vert.title}</div>
                    <div className="ev-detail-vert-desc" style={{ fontSize: '12.5px', color: '#9CA3AF', lineHeight: 1.5 }}>{vert.description || vert.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* CYBER SECURITY WITH AI CONCLAVE (BANNER 2) — from CMS      */}
          {/* ────────────────────────────────────────────────────────── */}
          {(() => {
            const conclave = activeEvent.cyber_conclave;
            if (!conclave || conclave.enabled === false) return null;
            const sessions = conclave.sessions?.length ? conclave.sessions : [
              { title: 'Global security trends', description: 'Where the threat landscape is moving.' },
              { title: 'AI on both sides', description: 'How AI is reshaping defence and attack.' },
              { title: 'Certifications that matter', description: 'CISSP, CC and the paths worth it.' },
              { title: 'Career pathways', description: 'How to enter the field from campus.' },
            ];
            return (
              <div style={{ marginBottom: '32px', border: '1px solid #4338CA', borderRadius: '22px', background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)', padding: '30px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: '#818CF8', background: 'rgba(99,102,241,0.18)', borderRadius: '100px', padding: '6px 14px', marginBottom: '10px' }}>
                      {conclave.badge || 'INTERNATIONAL VIRTUAL CONCLAVE'}
                    </span>
                    <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-1px', color: '#FFFFFF' }}>
                      {(conclave.title || 'Cyber Security with AI').split('AI').length > 1 ? (
                        <>{(conclave.title || 'Cyber Security with AI').split('AI')[0]}<span style={{ color: '#38BDF8' }}>AI</span>{(conclave.title || '').split('AI')[1] || ''}</>
                      ) : (conclave.title || 'Cyber Security with AI')}
                    </div>
                    {conclave.subtitle && (
                      <div style={{ fontSize: '13.5px', color: '#94A3B8', marginTop: '4px' }}>{conclave.subtitle}</div>
                    )}
                  </div>
                  {(conclave.date_label || conclave.time_label) && (
                    <div style={{ padding: '12px 18px', background: 'rgba(99,102,241,0.15)', border: '1px solid #4F46E5', borderRadius: '12px', textAlign: 'right' }}>
                      {conclave.date_label && <div style={{ fontSize: '12px', fontWeight: 700, color: '#C7D2FE' }}>{conclave.date_label}</div>}
                      {conclave.time_label && <div style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', marginTop: '2px' }}>{conclave.time_label}</div>}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginTop: '18px' }}>
                  {sessions.map((sess: any, sidx: number) => (
                    <div key={sidx} style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{sess.title}</div>
                      <div style={{ fontSize: '12.5px', color: '#94A3B8' }}>{sess.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ────────────────────────────────────────────────────────── */}
          {/* MEET THE SPEAKERS (BANNER 3) — from CMS speakers          */}
          {/* ────────────────────────────────────────────────────────── */}
          {(() => {
            const allSpeakers = activeEvent.speakers || [];
            if (allSpeakers.length === 0) return null;
            // Group speakers by category
            const catGroups: Record<string, any[]> = {};
            const ungrouped: any[] = [];
            allSpeakers.filter((s: any) => s.visible !== false).forEach((spk: any) => {
              const cat = spk.category || spk.session_title || '';
              if (cat) {
                if (!catGroups[cat]) catGroups[cat] = [];
                catGroups[cat].push(spk);
              } else {
                ungrouped.push(spk);
              }
            });
            const catColors: Record<string, string> = {};
            const palette = ['#C4B5FD', '#38BDF8', '#34D399', '#FBBF24', '#F87171'];
            let ci = 0;
            Object.keys(catGroups).forEach((k) => { catColors[k] = palette[ci % palette.length]; ci++; });

            return (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                  <div className="ev-detail-speakers-header" style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-1px', color: '#FFFFFF' }}>Meet the Speakers</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--violet-lt)', marginTop: '4px' }}>
                    {(activeEvent.title || '').toUpperCase()} · {(activeEvent.dates || '').toUpperCase()} · {(activeEvent.college || '').toUpperCase()} CAMPUS
                  </div>
                </div>

                {/* Render each category group */}
                {Object.entries(catGroups).map(([catName, speakers]) => (
                  <div key={catName} style={{ marginBottom: '22px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.3px', color: catColors[catName] || '#C4B5FD', background: `${catColors[catName] || '#C4B5FD'}22`, borderRadius: '100px', padding: '6px 14px', marginBottom: '14px' }}>
                      {catName.toUpperCase()}
                    </div>
                    <div className="ev-detail-speakers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      {speakers.map((spk: any, idx: number) => (
                        <div key={idx} className="ev-mini ev-detail-speaker-card" style={{ padding: '20px 18px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {spk.photo_url ? (
                            <img src={spk.photo_url} alt={spk.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
                          ) : (
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `linear-gradient(135deg, ${catColors[catName] || '#7C5CFC'}, #38BDF8)`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '20px' }}>
                              {spk.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          <div className="ev-detail-speaker-name" style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{spk.name}</div>
                          <div className="ev-detail-speaker-role" style={{ fontSize: '12.5px', color: catColors[catName] || 'var(--violet-lt)', fontWeight: 600, marginTop: '3px' }}>{[spk.position, spk.company].filter(Boolean).join(', ')}</div>
                          {spk.location && (
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                              {spk.location}
                            </div>
                          )}
                          {spk.linkedin_url && (
                            <a href={spk.linkedin_url.startsWith('http') ? spk.linkedin_url : `https://linkedin.com/${spk.linkedin_url}`} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600, marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                              LinkedIn
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Ungrouped speakers */}
                {ungrouped.length > 0 && (
                  <div style={{ marginBottom: '22px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.3px', color: '#C4B5FD', background: 'rgba(124,92,252,0.25)', borderRadius: '100px', padding: '6px 14px', marginBottom: '14px' }}>
                      SPEAKERS
                    </div>
                    <div className="ev-detail-speakers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      {ungrouped.map((spk: any, idx: number) => (
                        <div key={idx} className="ev-mini ev-detail-speaker-card" style={{ padding: '20px 18px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          {spk.photo_url ? (
                            <img src={spk.photo_url} alt={spk.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px' }} />
                          ) : (
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #38BDF8)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '20px' }}>
                              {spk.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          <div className="ev-detail-speaker-name" style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>{spk.name}</div>
                          <div className="ev-detail-speaker-role" style={{ fontSize: '12.5px', color: 'var(--violet-lt)', fontWeight: 600, marginTop: '3px' }}>{[spk.position, spk.company].filter(Boolean).join(', ')}</div>
                          {spk.location && (
                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                              {spk.location}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ────────────────────────────────────────────────────────── */}
          {/* ONE TICKET. ₹599. MEGA GRAND POOL & ALL PERKS (BANNER 5)   */}
          {/* ────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '32px', border: '1px solid #F59E0B', borderRadius: '22px', background: 'linear-gradient(135deg, #2D1A04 0%, #1A130B 100%)', padding: '32px 30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', color: '#FFFFFF' }}>One ticket. ₹599</div>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.4px', color: '#FBBF24', marginTop: '4px' }}>
                ALL 7 VERTICALS · FOOD · CODETHON · EVERYTHING BELOW
              </div>
            </div>

            {/* Prize Pools */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: '16px', padding: '20px 24px', background: 'rgba(245,158,11,0.12)', border: '1px solid #78350F', borderRadius: '16px', marginBottom: '22px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.3px', color: '#FCD34D' }}>MEGA GRAND POOL</div>
                <div style={{ fontSize: '34px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>₹2,00,000</div>
                <div style={{ fontSize: '12.5px', color: '#FDE68A', marginTop: '2px' }}>Open to every hackathon participant, not only winners</div>
              </div>
              <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(245,158,11,0.3)', paddingLeft: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.3px', color: '#FCD34D' }}>TRACK PRIZE POOL</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>₹50,000</div>
              </div>
            </div>

            {/* Perks Cards List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
              {(activeEvent.perks || [
                { name: 'Featherless AI', description: 'A full account, free', value: '$29 value' },
                { name: 'SetupMark AI', description: '50 credits, 2 months free', value: '$50 value' },
                { name: 'CodeSpectra AI', description: '3 months completely free', value: 'Assessments' },
                { name: 'Bandiwala', description: '15% off food', value: 'Coupon' },
                { name: 'WeHive Consulting', description: '15% off services', value: 'Coupon' },
                { name: 'Four meal coupons', description: 'Lunch, dinner, midnight, breakfast', value: 'Included' },
                { name: 'Certificates for all', description: 'Participation and winner certificates', value: 'Verifiable' },
                { name: 'On-the-spot offers', description: 'Internship and placement offers, in the room', value: 'Live' },
                { name: 'Surprise goodies', description: 'Extra prizes and drops announced on the day', value: 'Surprise' }
              ]).map((perk: any, pidx: number) => (
                <div key={pidx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{perk.name}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{perk.description || perk.desc}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', background: 'rgba(245,158,11,0.2)', color: '#FBBF24', borderRadius: '100px' }}>
                    {perk.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stay Tuned CTA Strip */}
          <div className="ev-detail-cta-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', border: '1px solid #4B3FA8', borderRadius: '18px', background: 'linear-gradient(100deg, #3B2A86, #2A1F63 70%)', padding: '26px 32px', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
              <span style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" style={{ fill: 'none', stroke: '#E7DEFF', strokeWidth: 1.8 }}><rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect><path d="M3.5 10h17M8 5V2.5M16 5V2.5"></path></svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="ev-detail-cta-title" style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.4px', color: '#FFFFFF' }}>Stay tuned for more events!</div>
                <div style={{ fontSize: '14.5px', color: '#C9BFF2', marginTop: '4px' }}>Join our community and never miss an opportunity to learn, connect, and grow.</div>
              </div>
            </div>
            <span
              onClick={() => go('list')}
              className="ev-btn"
              style={{ fontSize: '14.5px', fontWeight: 700, background: '#8B5CF6', color: '#FFFFFF', borderRadius: '10px', padding: '14px 24px', cursor: 'pointer', transition: 'all .2s ease', flex: 'none', boxShadow: '0 4px 18px rgba(139, 92, 246, 0.35)' }}
            >
              View Upcoming Events
            </span>
          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* VIEW 3: EVENT REGISTRATION FORM VIEW                      */}
      {/* ────────────────────────────────────────────────────────── */}
      {view === 'reg' && (
        <div className="ev-anim-in ev-reg-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '26px 28px 90px' }}>
          
          {/* Back to Event Button */}
          <span
            onClick={() => go('detail', activeEvent.slug)}
            className="ev-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, border: '1px solid var(--line2)', borderRadius: '100px', padding: '10px 18px', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', marginBottom: '20px' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M20 12H5M11 6l-6 6 6 6"></path></svg>
            Back to event
          </span>

          {/* Registration Header Banner */}
          <div className="ev-reg-header" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--line2)', borderRadius: '18px', background: 'linear-gradient(115deg, #1B1836, #12121F 68%)', padding: '24px 28px 26px', marginBottom: '22px', width: '100%' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--violet-lt)', background: 'rgba(124,92,252,.18)', borderRadius: '8px', padding: '6px 12px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v.5a2 2 0 000 6v.5A2.5 2.5 0 0118.5 18h-13A2.5 2.5 0 013 15.5V15a2 2 0 000-6Z"></path></svg>
              REGISTER
            </span>
            <div className="ev-reg-header-title" style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-.9px', margin: '14px 0 6px', color: '#FFFFFF' }}>{activeEvent.title}</div>
            <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '18px' }}>{activeEvent.organizer}</div>
            
            <div className="ev-reg-header-meta" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13.5px', color: 'var(--muted)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, flex: 'none' }}><rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect><path d="M3.5 10h17M8 5V2.5M16 5V2.5"></path></svg>
                {activeEvent.dates}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13.5px', color: 'var(--muted)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, flex: 'none' }}><circle cx="12" cy="12" r="8.5"></circle><path d="M12 8v4.5l3 1.8"></path></svg>
                {activeEvent.time}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13.5px', color: 'var(--muted)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, flex: 'none' }}><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.4"></circle></svg>
                {activeEvent.venue}
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Poster & Registration Form */}
          <div className="ev-rgrid ev-reg-grid" style={{ display: 'grid', gap: '24px', alignItems: 'start', width: '100%' }}>
            
            {/* Left Column: Event Poster */}
            <div className="ev-reg-poster" style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '16px', overflow: 'hidden' }}>
              <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: 'var(--panel2)', aspectRatio: '3/4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line2)' }}>
                {activeEvent.poster_banner ? (
                  <img src={activeEvent.poster_banner} alt={activeEvent.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: '28px' }}>
                    <div style={{ width: '84px', height: '84px', borderRadius: '22px', background: 'rgba(124,92,252,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--violet-lt)" strokeWidth="1.8"><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9Z" /><circle cx="12" cy="12" r="9" /></svg>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', textAlign: 'center', letterSpacing: '-0.8px', marginBottom: '8px' }}>{activeEvent.title}</div>
                    <div style={{ fontSize: '14px', color: 'var(--violet-lt)', textAlign: 'center', marginBottom: '14px' }}>{activeEvent.college_full}</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
                      Join top coders, innovators, and future founders in India's leading flagship event.
                    </div>
                    <div style={{ marginTop: '20px', display: 'inline-block', padding: '8px 16px', background: 'rgba(245,179,66,0.14)', border: '1px solid #4A3410', borderRadius: '100px', color: 'var(--amber)', fontSize: '12px', fontWeight: 700 }}>
                      {activeEvent.prize_pool || 'PRIZE POOL: ₹2,00,000'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Registration Form & Payment */}
            <div style={{ display: 'grid', gap: '18px' }}>
              
              {/* Individual vs Team Segmented Selector */}
              <div className="ev-reg-seg" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <span
                  onClick={() => setIsTeam(false)}
                  className="ev-seg"
                  data-on={!isTeam ? '1' : undefined}
                  style={{ height: '52px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${!isTeam ? '#4B3FA8' : 'var(--line2)'}`, borderRadius: '12px', background: !isTeam ? 'rgba(124,92,252,.20)' : 'var(--panel)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Individual
                </span>
                <span
                  onClick={() => setIsTeam(true)}
                  className="ev-seg"
                  data-on={isTeam ? '1' : undefined}
                  style={{ height: '52px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isTeam ? '#4B3FA8' : 'var(--line2)'}`, borderRadius: '12px', background: isTeam ? 'rgba(124,92,252,.20)' : 'var(--panel)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Team (up to 5)
                </span>
              </div>

              {/* Registration Fee Card */}
              <div className="ev-reg-fee-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--panel)', padding: '18px 22px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <span style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(124,92,252,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--violet-lt)', strokeWidth: 1.8 }}><rect x="3" y="5.5" width="18" height="13" rx="2.5"></rect><path d="M3 10h18"></path></svg>
                  </span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.3px', color: 'var(--muted)' }}>REGISTRATION FEE</div>
                    <div id="ev-fee" className="ev-reg-fee-amount" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-.6px', marginTop: '3px', color: '#FFFFFF' }}>
                      INR {calculatedTotalFee.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', color: 'var(--muted)', marginTop: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><circle cx="9" cy="9" r="3"></circle><path d="M3 19q6-6 12 0"></path></svg>
                      <span id="ev-seats">{isTeam ? `${currentTeamSize} Attendees (${currentTeamSize} × INR ${perPersonFee.toLocaleString()})` : activeEvent.individual_seats}</span>
                    </div>
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 600, color: 'var(--ok)', border: '1px solid #17503E', borderRadius: '100px', padding: '7px 14px', flex: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z"></path><path d="M9 12l2 2 4-4"></path></svg>
                  Secure Razorpay payment
                </span>
              </div>

              {/* Handbook and Share Actions */}
              <div className="ev-actions ev-reg-actions" style={{ display: 'grid', gap: '12px' }}>
                <span
                  onClick={handleDownloadHandbook}
                  className="ev-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, border: '1px solid #3A2E72', borderRadius: '12px', background: 'rgba(124,92,252,.14)', color: 'var(--text)', padding: '14px 18px', cursor: 'pointer' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--violet-lt)', strokeWidth: 1.8 }}><path d="M6 3h8l4 4v14H6Z"></path><path d="M14 3v4h4"></path></svg>
                  Download Event Handbook (PDF)
                </span>
                <span
                  onClick={handleShare}
                  className="ev-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '9px', fontSize: '14px', fontWeight: 600, border: '1px solid #17503E', borderRadius: '12px', background: 'rgba(16,185,129,.12)', color: 'var(--ok)', padding: '14px 20px', cursor: 'pointer' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><circle cx="18" cy="5.5" r="2.6"></circle><circle cx="6" cy="12" r="2.6"></circle><circle cx="18" cy="18.5" r="2.6"></circle><path d="M8.4 10.7l7.2-3.9M8.4 13.3l7.2 3.9"></path></svg>
                  Share Event
                </span>
              </div>

              {/* Registration Form Card */}
              <div className="ev-reg-form-card" style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--panel)', padding: '26px 28px 28px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.4px', marginBottom: '22px', color: '#FFFFFF' }}>Registration Details</div>
                
                <div style={{ display: 'grid', gap: '18px' }}>
                  
                  {/* Team Name if Team registration */}
                  {isTeam && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: '#A78BFA', marginBottom: '9px' }}>TEAM NAME *</div>
                      <div className="ev-field" style={{ border: '1px solid #7C5CFC', borderRadius: '11px', background: 'rgba(124,92,252,0.08)', padding: '14px 15px', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="e.g. Code Ninjas, Team Alpha"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '14.5px', fontFamily: 'inherit', fontWeight: 600 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Full Name / Captain Name */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>
                      {isTeam ? 'TEAM CAPTAIN FULL NAME (PERSON 1) *' : 'FULL NAME *'}
                    </div>
                    <div className="ev-field" style={{ border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '14px 15px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Captain / Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '14.5px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>
                      {isTeam ? 'TEAM CAPTAIN EMAIL (PERSON 1) *' : 'EMAIL *'}
                    </div>
                    <div className="ev-field" style={{ border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '14px 15px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="email"
                        placeholder="captain@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '14.5px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>
                      {isTeam ? 'TEAM CAPTAIN PHONE NUMBER *' : 'PHONE NUMBER *'}
                    </div>
                    <div className="ev-field" style={{ border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '14px 15px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="tel"
                        placeholder="+91 …"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '14.5px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>DATE OF BIRTH</div>
                    <div className="ev-field" style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '14px 15px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--muted)', strokeWidth: 1.8, flex: 'none' }}><rect x="3.5" y="5" width="17" height="15" rx="2.5"></rect><path d="M3.5 10h17M8 5V2.5M16 5V2.5"></path></svg>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '14.5px', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {/* Branch & Year */}
                  <div className="ev-fgrid ev-reg-select-grid" style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>BRANCH</div>
                      <div className="ev-field" style={{ border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '11px 14px' }}>
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: branch ? '#FFFFFF' : 'var(--muted)', fontSize: '14.5px', fontFamily: 'inherit', cursor: 'pointer' }}
                        >
                          <option value="" disabled style={{ background: '#161622', color: 'var(--muted)' }}>-- Select Branch --</option>
                          <option value="CSE" style={{ background: '#161622', color: '#FFF' }}>Computer Science & Eng (CSE)</option>
                          <option value="IT" style={{ background: '#161622', color: '#FFF' }}>Information Technology (IT)</option>
                          <option value="AI_DS" style={{ background: '#161622', color: '#FFF' }}>AI & Data Science (AI/DS)</option>
                          <option value="ECE" style={{ background: '#161622', color: '#FFF' }}>Electronics & Comm (ECE)</option>
                          <option value="EEE" style={{ background: '#161622', color: '#FFF' }}>Electrical & Electronics (EEE)</option>
                          <option value="MECH" style={{ background: '#161622', color: '#FFF' }}>Mechanical Eng (MECH)</option>
                          <option value="CIVIL" style={{ background: '#161622', color: '#FFF' }}>Civil Eng</option>
                          <option value="OTHER" style={{ background: '#161622', color: '#FFF' }}>Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>CURRENT B.TECH YEAR</div>
                      <div className="ev-field" style={{ border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '11px 14px' }}>
                        <select
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: year ? '#FFFFFF' : 'var(--muted)', fontSize: '14.5px', fontFamily: 'inherit', cursor: 'pointer' }}
                        >
                          <option value="" disabled style={{ background: '#161622', color: 'var(--muted)' }}>-- Select Year --</option>
                          <option value="1st Year" style={{ background: '#161622', color: '#FFF' }}>1st Year</option>
                          <option value="2nd Year" style={{ background: '#161622', color: '#FFF' }}>2nd Year</option>
                          <option value="3rd Year" style={{ background: '#161622', color: '#FFF' }}>3rd Year</option>
                          <option value="4th Year" style={{ background: '#161622', color: '#FFF' }}>4th Year</option>
                          <option value="Alumni" style={{ background: '#161622', color: '#FFF' }}>Alumni / Passed Out</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Track Theme */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>
                      {activeEvent.title ? `${activeEvent.title.toUpperCase()} TRACK / THEME (OPTIONAL)` : 'TRACK / THEME (OPTIONAL)'}
                    </div>
                    <div className="ev-field" style={{ border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '11px 14px' }}>
                      <select
                        value={track}
                        onChange={(e) => setTrack(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '14.5px', fontFamily: 'inherit', cursor: 'pointer' }}
                      >
                        {(activeEvent.categories && activeEvent.categories.length > 0 ? activeEvent.categories : [
                          { name: 'AI That Solves a Real Problem' },
                          { name: 'Beyond the Chatbot' },
                          { name: 'AI for Builders' },
                          { name: 'Autonomous AI Workflows' },
                          { name: 'Build the Unexpected' },
                        ]).map((cat: any, cidx: number) => (
                          <option key={cidx} value={cat.name || cat} style={{ background: '#161622', color: '#FFF' }}>
                            {cat.name || cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* College — searchable dropdown */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color: 'var(--muted)', marginBottom: '9px' }}>COLLEGE</div>
                    <div className="ev-field" style={{ display: 'flex', alignItems: 'center', gap: '11px', border: '1px solid var(--line2)', borderRadius: '11px', background: 'var(--panel2)', padding: '14px 15px' }}>
                      <svg width="15" height="15" viewBox="0 0 16 16" style={{ fill: 'none', stroke: 'var(--muted)', strokeWidth: 1.7, flex: 'none' }}><circle cx="7" cy="7" r="4.6"></circle><path d="M10.5 10.5L14 14"></path></svg>
                      <input
                        type="text"
                        value={collegeQuery || college}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCollegeQuery(val);
                          setCollege(val);
                          setShowCollegeDropdown(val.length > 0);
                        }}
                        onFocus={() => { if (collegeQuery.length > 0) setShowCollegeDropdown(true); }}
                        onBlur={() => setTimeout(() => setShowCollegeDropdown(false), 200)}
                        placeholder="Search or type your college name"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#FFFFFF', fontSize: '14.5px', fontFamily: 'inherit' }}
                      />
                    </div>
                    {showCollegeDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '4px', background: 'var(--panel)', border: '1px solid var(--line2)', borderRadius: '10px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        {(() => {
                          const KNOWN_COLLEGES = [
                            'Sreenidhi Institute of Science & Technology (SNIST)',
                            'VNR Vignana Jyothi Institute of Engineering & Technology (VNR VJIET)',
                            'Chaitanya Bharathi Institute of Technology (CBIT)',
                            'Malla Reddy Institute of Technology',
                            'JNTU Hyderabad',
                            'IIIT Hyderabad',
                            'Osmania University',
                            'JNTU Kakinada',
                            'KL University',
                            'VIT Vellore',
                            'SRM Chennai',
                            'Manipal Institute of Technology',
                            'BITS Pilabi',
                            'NIT Warangal',
                            'IIT Hyderabad',
                          ];
                          const filtered = KNOWN_COLLEGES.filter((c) =>
                            c.toLowerCase().includes(collectQuery.toLowerCase())
                          );
                          return (
                            <>
                              {filtered.map((c, i) => (
                                <div
                                  key={i}
                                  onMouseDown={() => {
                                    setCollege(c);
                                    setCollegeQuery(c);
                                    setShowCollegeDropdown(false);
                                  }}
                                  style={{ padding: '10px 14px', fontSize: '13.5px', color: '#FFF', cursor: 'pointer', borderBottom: '1px solid var(--line2)' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel2)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  {c}
                                </div>
                              ))}
                              {filtered.length === 0 && (
                                <div
                                  onMouseDown={() => {
                                    setCollege(collegeQuery);
                                    setShowCollegeDropdown(false);
                                  }}
                                  style={{ padding: '10px 14px', fontSize: '13.5px', color: 'var(--violet-lt)', cursor: 'pointer' }}
                                >
                                  Add "{collegeQuery}"
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                </div>

                {/* Team Members Section (Person 2 to 5) — after COLLEGE */}
                {isTeam && (
                  <div style={{ margin: '8px 0', padding: '18px', background: 'rgba(124, 92, 252, 0.06)', border: '1px solid rgba(124, 92, 252, 0.25)', borderRadius: '14px' }}>
                    <div className="ev-reg-team-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#A78BFA', letterSpacing: '.4px' }}>
                        TEAM MEMBERS ({currentTeamSize} Total Attendees)
                      </div>
                      <span style={{ fontSize: '11px', padding: '4px 9px', background: 'rgba(52, 211, 153, 0.15)', color: '#34D399', borderRadius: '6px', fontWeight: 600 }}>
                        INR {perPersonFee}/person × {currentTeamSize} = INR {calculatedTotalFee.toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.5 }}>
                      Add your teammates below. The registration amount updates dynamically based on the number of members added ({currentTeamSize} of 5 max).
                    </p>

                    <div style={{ display: 'grid', gap: '14px' }}>
                      {teamMembers.map((member, idx) => (
                        <div key={idx} style={{ padding: '14px', background: 'var(--panel2)', border: '1px solid var(--line2)', borderRadius: '11px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#DDD6FE', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>MEMBER {idx + 2} {idx === 0 ? '(REQUIRED)' : '(OPTIONAL)'}</span>
                            {teamMembers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setTeamMembers(teamMembers.filter((_, i) => i !== idx))}
                                style={{ background: 'transparent', border: 'none', color: '#F87171', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                ✕ Remove
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            <input
                              type="text"
                              placeholder={`Member ${idx + 2} Full Name`}
                              value={member.name}
                              onChange={(e) => {
                                const updated = [...teamMembers];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setTeamMembers(updated);
                              }}
                              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line)', borderRadius: '8px', color: '#FFF', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none' }}
                            />
                            <input
                              type="email"
                              placeholder={`Member ${idx + 2} Email (for login & ticket)`}
                              value={member.email}
                              onChange={(e) => {
                                const updated = [...teamMembers];
                                updated[idx] = { ...updated[idx], email: e.target.value };
                                setTeamMembers(updated);
                              }}
                              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line)', borderRadius: '8px', color: '#FFF', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none' }}
                            />
                            <input
                              type="tel"
                              placeholder={`Member ${idx + 2} Phone (optional)`}
                              value={member.phone}
                              onChange={(e) => {
                                const updated = [...teamMembers];
                                updated[idx] = { ...updated[idx], phone: e.target.value };
                                setTeamMembers(updated);
                              }}
                              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--line)', borderRadius: '8px', color: '#FFF', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {teamMembers.length < 4 && (
                      <button
                        type="button"
                        onClick={() => setTeamMembers([...teamMembers, { name: '', email: '', phone: '' }])}
                        style={{
                          marginTop: '14px',
                          width: '100%',
                          padding: '11px',
                          borderRadius: '10px',
                          background: 'rgba(124, 92, 252, 0.14)',
                          border: '1px dashed #7C5CFC',
                          color: '#DDD6FE',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        + Add Another Team Member ({teamMembers.length + 1}/5)
                      </button>
                    )}
                  </div>
                )}

                {/* Terms and WhatsApp Opt-in */}
                <div style={{ display: 'grid', gap: '10px', marginTop: '24px' }}>
                  
                  {/* Terms Checkbox */}
                  <div
                    id="ev-terms"
                    onClick={() => {
                      const next = !acceptedTerms;
                      setAcceptedTerms(next);
                      if (next) setShowTermsErr(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    <span id="ev-terms-box" style={{ width: '22px', height: '22px', borderRadius: '6px', border: `1.5px solid ${acceptedTerms ? 'var(--violet)' : 'var(--line2)'}`, background: acceptedTerms ? 'var(--violet)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', transition: 'all .25s ease' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" style={{ fill: 'none', stroke: '#FFFFFF', strokeWidth: 2.2, opacity: acceptedTerms ? 1 : 0, transition: 'opacity .2s ease' }}><path d="M2 6.4l2.6 2.6L10 3.4"></path></svg>
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                      I have read and agree to the <span style={{ color: 'var(--violet-lt)', textDecoration: 'underline' }}>Terms &amp; Conditions</span>
                    </span>
                  </div>
                  {showTermsErr && (
                    <div id="ev-terms-err" style={{ fontSize: '13.5px', color: '#F0616B', paddingLeft: '34px' }}>
                      Please accept the Terms &amp; Conditions to continue.
                    </div>
                  )}

                  {/* WhatsApp Checkbox */}
                  <div
                    id="ev-wa"
                    onClick={() => setWhatsappOptIn(!whatsappOptIn)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginTop: '6px' }}
                  >
                    <span id="ev-wa-box" style={{ width: '22px', height: '22px', borderRadius: '6px', border: `1.5px solid ${whatsappOptIn ? 'var(--violet)' : 'var(--line2)'}`, background: whatsappOptIn ? 'var(--violet)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', transition: 'all .25s ease' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" style={{ fill: 'none', stroke: '#FFFFFF', strokeWidth: 2.2, opacity: whatsappOptIn ? 1 : 0, transition: 'opacity .2s ease' }}><path d="M2 6.4l2.6 2.6L10 3.4"></path></svg>
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                      Send my entry passes, invoices &amp; coupons via WhatsApp
                    </span>
                  </div>

                </div>

                {/* Razorpay Pay Button */}
                <div
                  id="ev-pay"
                  className="ev-reg-pay-btn"
                  onClick={handlePay}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '11px',
                    borderRadius: '12px',
                    background: acceptedTerms ? 'linear-gradient(100deg, var(--violet), #6246E8)' : 'var(--line2)',
                    color: acceptedTerms ? '#FFFFFF' : 'var(--dim)',
                    fontSize: '15.5px',
                    fontWeight: 700,
                    padding: '17px',
                    marginTop: '22px',
                    cursor: acceptedTerms ? 'pointer' : 'not-allowed',
                    boxShadow: acceptedTerms ? '0 12px 30px rgba(124,92,252,.35)' : 'none',
                    transition: 'all .3s ease',
                  }}
                >
                  {isPaying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <svg width="17" height="17" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 }}><rect x="3" y="5.5" width="18" height="13" rx="2.5"></rect><path d="M3 10h18"></path></svg>
                      <span id="ev-pay-label">
                        {isTeam ? `Pay INR ${calculatedTotalFee.toLocaleString()} via Razorpay` : `Pay INR ${activeEvent.individual_fee.toLocaleString()} via Razorpay`}
                      </span>
                      {acceptedTerms && (
                        <span id="ev-pay-sheen" style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)', animation: 'ev-sheen 3.4s ease-in-out infinite' }} />
                      )}
                    </>
                  )}
                </div>

                <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--muted)', textAlign: 'center', marginTop: '14px' }}>
                  By registering you agree to receive event updates. Payment is processed securely via Razorpay.
                  </div>

              </div>

              {/* Important Information Box */}
              <div style={{ border: '1px solid #3A2E72', borderRadius: '18px', background: 'linear-gradient(155deg, #1B1838, var(--panel) 62%)', padding: '24px 26px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '20px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--violet-lt)', strokeWidth: 1.9 }}><circle cx="12" cy="12" r="9"></circle><path d="M12 8v.01M12 11v5"></path></svg>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--violet-lt)' }}>IMPORTANT INFORMATION</span>
                </div>

                <div style={{ display: 'grid', gap: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--muted)', strokeWidth: 1.8, marginTop: '2px' }}><circle cx="9" cy="9" r="3"></circle><path d="M3 19q6-6 12 0M16.5 7a3 3 0 010 6"></path></svg>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '5px', color: '#FFFFFF' }}>Team Formation</div>
                      <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)' }}>Teams can be formed at the venue with 2–5 members.</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--muted)', strokeWidth: 2, marginTop: '2px' }}><path d="M5 12.5l4 4 9-9.5"></path></svg>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '5px', color: '#FFFFFF' }}>Registration</div>
                      <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)' }}>Please ensure that the details provided during registration are correct.</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--muted)', strokeWidth: 1.8, marginTop: '2px' }}><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.5a2.5 2.5 0 113 2.4v1.3M12 16.5v.01"></path></svg>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: 600, marginBottom: '5px', color: '#FFFFFF' }}>Need Help?</div>
                      <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--muted)', marginBottom: '10px' }}>For any registration issues or queries, contact:</div>
                      <div style={{ display: 'flex', gap: '10px 18px', flexWrap: 'wrap', fontSize: '13.5px', fontWeight: 600, color: '#6BA8F5' }}>
                        <span>+91 91214 95077</span><span style={{ color: 'var(--dim)' }}>|</span><span>+91 84669 65800</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px 18px', flexWrap: 'wrap', fontSize: '13.5px', fontWeight: 600, color: '#6BA8F5', marginTop: '6px' }}>
                        <span>+91 6281 083 332</span><span style={{ color: 'var(--dim)' }}>|</span><span>+91 63001 97713</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Free Student Alumni Account Notice */}
              <div style={{ display: 'grid', gridTemplateColumns: '20px minmax(0, 1fr)', gap: '12px', border: '1px solid #3A2E72', borderRadius: '16px', background: 'rgba(124,92,252,.08)', padding: '18px 20px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ fill: 'none', stroke: 'var(--violet-lt)', strokeWidth: 1.8, marginTop: '2px' }}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z"></path></svg>
                <div style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted)' }}>
                  A <strong style={{ color: 'var(--text)', fontWeight: 600 }}>free Student Alumni account</strong> will be created with this email — your login credentials will be emailed to you so you can view your tickets anytime under <span style={{ color: 'var(--violet-lt)', fontWeight: 600 }}>My Tickets</span>.
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* SUCCESS CONFIRMATION MODAL */}
      {paymentSuccess && ticketData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,6,15,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--panel)', border: '1px solid #3A2E72', borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '32px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.18)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>Registration Confirmed!</h2>
            <p style={{ fontSize: '14.5px', color: '#9AA0B4', margin: '0 0 24px', lineHeight: 1.5 }}>
              Your pass for <strong style={{ color: '#FFF' }}>{ticketData.eventName}</strong> has been issued and sent to <strong style={{ color: 'var(--violet-lt)' }}>{ticketData.email}</strong>.
            </p>

            <div style={{ background: 'var(--panel2)', border: '1px solid var(--line2)', borderRadius: '16px', padding: '18px 20px', textAlign: 'left', marginBottom: '24px', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Ticket ID:</span>
                <span style={{ color: 'var(--violet-lt)', fontWeight: 700, fontFamily: 'monospace' }}>{ticketData.ticketId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Attendee:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{ticketData.attendeeName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Pass Type:</span>
                <span style={{ color: 'var(--ok)', fontWeight: 600 }}>{ticketData.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>Total Paid:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>INR {ticketData.amount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => router.push('/platform?role=student&tab=my-tickets')}
                className="ev-btn"
                style={{ flex: 1, padding: '14px', background: 'var(--violet)', color: '#FFF', border: 'none', borderRadius: '12px', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                View in My Tickets
              </button>
              <button
                onClick={() => {
                  setPaymentSuccess(false);
                  go('list');
                }}
                className="ev-btn"
                style={{ padding: '14px 20px', background: 'var(--line)', color: '#FFF', border: 'none', borderRadius: '12px', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#1A1A2E', border: '1px solid #4B3FA8', borderRadius: '12px', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'ev-in .3s ease' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap' }}>{toast}</span>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="ev-footer" style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--line)', background: 'linear-gradient(180deg, rgba(10,10,20,0) 0%, rgba(5,6,15,.95) 100%)', marginTop: '0' }}>
        <div className="ev-footer-inner" style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '48px 28px 32px' }}>
          <div className="ev-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '36px', marginBottom: '36px' }}>
            {/* Brand */}
            <div className="ev-footer-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <svg width="24" height="28" viewBox="0 0 300 350">
                  <path d="M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z" fill="#8B84FF" />
                  <path d="M150 30 L266 66 v112 c0 72 -58 110 -116 132 C92 288 34 250 34 178 V66 Z" fill="#5B4FE9" />
                  <text x="150" y="214" textAnchor="middle" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '118px', fontWeight: 800, fill: '#FFFFFF' }}>SA</text>
                </svg>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF' }}>StudentAlumni</span>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--muted)', maxWidth: '280px' }}>
                Verified student & alumni network across Indian campuses. Connecting students, alumni, and recruiters.
              </p>
            </div>

            {/* Product */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--muted)', marginBottom: '14px' }}>PRODUCT</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <a onClick={() => router.push('/')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Home</a>
                <a onClick={() => go('list')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>ECHO Events</a>
                <a onClick={() => router.push('/verify')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Verify Credentials</a>
                <a onClick={() => router.push('/contact')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Contact Us</a>
              </div>
            </div>

            {/* Resources */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--muted)', marginBottom: '14px' }}>RESOURCES</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <a onClick={() => router.push('/blog')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Blog</a>
                <a onClick={() => router.push('/help-center')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Help Center</a>
                <a onClick={() => router.push('/community')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Community</a>
                <a onClick={handleDownloadHandbook} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Event Handbook</a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--muted)', marginBottom: '14px' }}>LEGAL</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <a onClick={() => window.open('/policy/privacy', '_blank')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Privacy Policy</a>
                <a onClick={() => window.open('/policy/terms', '_blank')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>Terms of Service</a>
              </div>
            </div>

            {/* Our Entities */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', color: 'var(--muted)', marginBottom: '14px' }}>OUR ENTITIES</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                <a onClick={() => window.open('https://codespectra.ai', '_blank')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>CodeSpectra</a>
                <a onClick={() => window.open('https://visionaryx.ai', '_blank')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>VisionaryX</a>
                <a onClick={() => window.open('https://wehive.co.in', '_blank')} style={{ fontSize: '13.5px', color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}>WeHive</a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="ev-footer-bottom" style={{ borderTop: '1px solid var(--line)', paddingTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--dim)' }}>
              © {new Date().getFullYear()} StudentAlumni. All rights reserved.
            </div>
            <div className="ev-footer-social" style={{ display: 'flex', gap: '14px' }}>
              <a onClick={() => window.open('https://linkedin.com/company/studentalumni', '_blank')} style={{ cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" fill="#6A6A7E" /><rect x="2" y="9" width="4" height="12" fill="#6A6A7E" /><circle cx="4" cy="4" r="2" fill="#6A6A7E" /></svg>
              </a>
              <a onClick={() => window.open('https://x.com/studentalumni', '_blank')} style={{ cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#6A6A7E" /></svg>
              </a>
              <a onClick={() => window.open('https://instagram.com/studentalumni', '_blank')} style={{ cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#6A6A7E" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="#6A6A7E" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.5" fill="#6A6A7E" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default EchoEventsPage;

