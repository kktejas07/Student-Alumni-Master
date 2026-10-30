// @ts-nocheck
/**
 * useNetworkViewState — all non-visual state, data loading and handlers for
 * the portal Network tab. Shared by the student and alumni NetworkView
 * screens, which differ only in presentation.
 *
 * (The two source views are `// @ts-nocheck`; this hook keeps the same
 * relaxed typing so the extraction does not introduce new type errors.)
 */
import { useState, useEffect, useMemo, useContext } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { request, api } from '@/src/models/services/api';

export type CategoryTab = 'discover' | 'connections' | 'book' | 'requests';
export type FilterType = 'everyone' | 'students' | 'alumnis' | 'mentors' | 'industry';
export type DiscoverSubTab = 'interest' | 'path' | 'college' | 'recommended' | 'expand';

export type NetworkViewConfig = {
  /** Portal nav context providing `searchQuery` / `setSearchQuery`. */
  navContext: React.Context<any>;
  /** Fallback avatar accent when a person has no colour. */
  defaultAccent: string;
  /** How to derive the GitHub handle/url shown on a profile card. */
  githubOf: (p: any) => string;
};

export function useNetworkViewState({ navContext, defaultAccent, githubOf }: NetworkViewConfig) {
  const toast = useToast();
  const router = useRouter();
  const authUser = useAuthStore((sx) => sx.user);
  
  const [activeTab, setActiveTab] = useState<CategoryTab>('discover');
  const [q, setQ] = useState('');

  const [filter, setFilter] = useState<FilterType>('everyone');
  const [discoverSubTab, setDiscoverSubTab] = useState<DiscoverSubTab>('interest');
  const [discoverSections, setDiscoverSections] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [showMatchedInterest, setShowMatchedInterest] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbSearchStatus, setDbSearchStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');
  const [dbStatusMsg, setDbStatusMsg] = useState('');

  // Discover tab active matching section resolver
  const activeSection = useMemo(() => {
    if (searchQuery.trim()) {
      const searchSec = discoverSections.find((s: any) => s.key === 'search_results');
      if (searchSec) return searchSec;
    }
    let secKey = 'by_interest';
    if (discoverSubTab === 'path') secKey = 'by_career';
    if (discoverSubTab === 'college') secKey = 'by_college';
    if (discoverSubTab === 'recommended') secKey = 'mentors';
    if (discoverSubTab === 'expand') secKey = 'expand';

    return discoverSections.find((s: any) => s.key === secKey) || discoverSections.find((s: any) => s.key === 'search_results') || discoverSections[0];
  }, [discoverSections, discoverSubTab, searchQuery]);
  
  const normalizeDiscoverUser = (u: any) => {
    const role = u.role || 'student';
    const name = u.full_name || u.name || 'Anonymous';
    const avatar = u.avatar || (name.split(' ').slice(0, 2).map((p: any) => p[0] || '').join('').toUpperCase());
    const color = u.color || '#14B8A6';
    
    let tag: 'Student' | 'Alumni' | 'Mentor' | 'Industry' = 'Student';
    if (role === 'alumni') tag = 'Alumni';
    else if (role === 'mentor') tag = 'Mentor';
    
    const company = u.organization || u.company || '';
    const college = u.institution || u.college || '';
    const jobTitle = u.job_title || u.role_title || u.branch || '';

    return {
      id: u.id,
      name,
      avatar,
      photo: u.photo_data || u.face_image_base64 || u.photo || '',
      color,
      tag,
      role: jobTitle || role.charAt(0).toUpperCase() + role.slice(1),
      company: company || college,
      college,
      year: u.graduation_year || u.year || 2026,
      tags: u.skills || u.interests || [],
      mutual: u.mutual_connections ?? u.mutual ?? 5,
      linkedin: u.linkedin_url || u.linkedin || '',
      github: u.github_url || u.github || '',
      connectionState: u.connection_state || 'none',
      kind: role,
      email: u.email
    };
  };

  const normalizedDiscover = useMemo(() => {
    return (activeSection?.items || []).map(normalizeDiscoverUser);
  }, [activeSection]);

  const filteredMatchedDiscover = useMemo(() => {
    return normalizedDiscover.filter((person: any) => {
      if (filter === 'students') return person.tag === 'Student';
      if (filter === 'alumnis') return person.tag === 'Alumni';
      if (filter === 'mentors') return person.tag === 'Mentor';
      if (filter === 'industry') return person.tag === 'Mentor' || person.tag === 'Alumni';
      return true;
    });
  }, [normalizedDiscover, filter]);

  const discoverCounts = useMemo(() => {
    const getCount = (secKey: string) => {
      const sec = discoverSections.find((s: any) => s.key === secKey);
      if (!sec) return 0;
      return (sec.items || []).map(normalizeDiscoverUser).filter((person: any) => {
        if (filter === 'students') return person.tag === 'Student';
        if (filter === 'alumnis') return person.tag === 'Alumni';
        if (filter === 'mentors') return person.tag === 'Mentor';
        if (filter === 'industry') return person.tag === 'Mentor' || person.tag === 'Alumni';
        return true;
      }).length;
    };
    return {
      interest: getCount('by_interest'),
      path: getCount('by_career'),
      college: getCount('by_college'),
      recommended: getCount('mentors'),
      expand: getCount('expand')
    };
  }, [discoverSections, filter]);
  
  // Dynamic action collections
  const [conn, setConn] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [localSent, setLocalSent] = useState<string[]>([]);

  // Modal profile viewer state
  const [pickedPerson, setPickedPerson] = useState<any | null>(null);

  // Booking Modal State
  const [bookingMentor, setBookingMentor] = useState<any | null>(null);
  const [bookingSlot, setBookingSlot] = useState<any | null>(null);
  const [bookingTopic, setBookingTopic] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const handleOpenBooking = (m: any) => {
    setPickedPerson(null);
    setBookingMentor(m);
  };

  const bookingSlots = useMemo(() => {
    const slots = [];
    const today = new Date();
    const times = [
      { h: 10, label: '10:00 AM' },
      { h: 14, label: '2:00 PM' },
      { h: 18, label: '6:00 PM' },
    ];
    for (let d = 1; d <= 3; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() + d);
      times.forEach((t) => {
        const slot = new Date(day);
        slot.setHours(t.h, 0, 0, 0);
        slots.push({
          label: `${slot.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${t.label}`,
          iso: slot.toISOString(),
        });
      });
    }
    return slots;
  }, []);

  const handleConfirmBooking = async () => {
    if (!bookingMentor || !bookingSlot) return;
    if (!bookingTopic.trim()) {
      toast.error('Topic required', 'Please describe what you would like to discuss.');
      return;
    }
    setBookingSubmitting(true);
    try {
      await request('/student/bookings', {
        method: 'POST',
        body: {
          student_email: authUser?.email,
          mentor_email: bookingMentor.email || 'mentor@test.com',
          mentor_id: bookingMentor.id || bookingMentor._id,
          topic: bookingTopic.trim(),
          scheduled_at: bookingSlot.iso,
          duration_minutes: 45
        }
      });
      toast.success('Session Booked! ', `Your session with ${bookingMentor.name} is confirmed.`);
      setBookingMentor(null);
      setBookingSlot(null);
      setBookingTopic('');
      fetchNetworkData(true);
    } catch (err: any) {
      toast.error('Booking failed', err?.message || 'Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Limits for Discover tab lists
  const [mentorLimit, setMentorLimit] = useState(3);
  const [alumniLimit, setAlumniLimit] = useState(3);
  const [studentLimit, setStudentLimit] = useState(3);

  // Paginated fetch for network data
  const [networkData, setNetworkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [networkPage, setNetworkPage] = useState(1);
  const [networkPages, setNetworkPages] = useState(1);

  const path = authUser?.email
    ? `/student/network?student_email=${encodeURIComponent(authUser.email)}&page=${networkPage}&per_page=24`
    : `/student/network?page=${networkPage}&per_page=24`;

  const fetchNetworkData = async (isRefresh: boolean = false) => {
    try {
      const res = await request<any>(path);
      setNetworkData(res);
      setNetworkPages(res.pages || 1);
    } catch (e: any) {
      if (!isRefresh) {
        setNetworkData({ items: [] });
      } else {
        toast.error('Refresh Failed', e?.message || 'Could not sync latest network data.');
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNetworkData(false).finally(() => setLoading(false));
  }, [authUser?.email, networkPage]);


  
  const loadDiscover = async (overrideTerm?: string) => {
    try {
      const term = overrideTerm !== undefined ? overrideTerm : searchQuery;
      const res = await api.networkDiscover(term);
      setDiscoverSections(res?.sections || []);
      return res?.sections || [];
    } catch (e) {
      console.warn('Failed to load discover sections:', e);
      return [];
    }
  };

  const handleDatabaseSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchQuery).trim();
    if (!term) {
      setDbSearchStatus('idle');
      setDbStatusMsg('');
      loadDiscover('');
      return;
    }
    setDbSearchStatus('searching');
    setDbStatusMsg(`Searching database for "${term}"...`);
    try {
      const secs = await loadDiscover(term);
      const totalFound = secs.reduce((acc: number, s: any) => acc + (s.items?.length || 0), 0);
      setDbSearchStatus('success');
      if (totalFound > 0) {
        setDbStatusMsg(`Got results! Found ${totalFound} account(s) matching "${term}"`);
      } else {
        setDbStatusMsg(`No accounts found in database matching "${term}"`);
      }
    } catch (e: any) {
      setDbSearchStatus('error');
      setDbStatusMsg(e?.message || 'Search failed. Please try again.');
    }
  };

  const loadRequests = async () => {
    try {
      const res = await api.networkRequests();
      const normalizeReq = (req: any) => {
        const role = req.role || 'student';
        const name = req.full_name || req.name || 'Anonymous';
        const avatar = req.avatar || (name.split(' ').slice(0, 2).map((p: any) => p[0] || '').join('').toUpperCase());
        const color = req.color || '#14B8A6';
        const company = req.organization || req.company || '';
        const college = req.institution || req.college || '';
        const jobTitle = req.job_title || req.branch || '';

        let subtitle = `${college}`;
        if (jobTitle) {
          subtitle = `${jobTitle} • ${company || college}`;
        }

        return {
          id: req.id,
          name,
          avatar,
          photo: req.photo_data || req.face_image_base64 || req.photo || '',
          color,
          role: (role === 'student' ? 'Student' : role === 'alumni' ? 'Alumni' : role === 'mentor' ? 'Mentor' : 'Industry') as any,
          subtitle,
          time: req.requested_at ? 'Pending' : '2d ago',
          message: req.message || ''
        };
      };
      setIncomingRequests((res?.items || []).map(normalizeReq));
      setSentRequests((res?.sent || []).map(normalizeReq));
    } catch (e) {
      console.warn('Failed to load requests:', e);
    }
  };

  const loadConnections = async () => {
    try {
      const res = await api.networkConnections();
      const normalizeConn = (req: any) => {
        const role = req.role || 'student';
        const name = req.full_name || req.name || 'Anonymous';
        const avatar = req.avatar || (name.split(' ').slice(0, 2).map((p: any) => p[0] || '').join('').toUpperCase());
        const color = req.color || '#14B8A6';
        const company = req.organization || req.company || '';
        const college = req.institution || req.college || '';
        const jobTitle = req.job_title || req.branch || '';

        return {
          id: req.id || req._id,
          name,
          initials: avatar,
          photo: req.photo_data || req.face_image_base64 || req.photo || '',
          color,
          kind: role,
          role: jobTitle || role,
          company: company || college,
          mutual: req.mutual || 0,
          tags: req.skills || req.interests || [],
          linkedin: req.linkedin_url || req.linkedin || '',
          github: req.github_url || req.github || '',
          connectionState: 'connected'
        };
      };
      setConnectionsList((res?.items || []).map(normalizeConn));
    } catch (e) {
      console.warn('Failed to load connections:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadDiscover(), loadRequests(), loadConnections()]);
      setLoading(false);
    };
    init();
  }, [authUser?.email]);

  useEffect(() => {
    if (activeTab === 'discover' && !searchQuery.trim()) {
      loadDiscover('');
    }
  }, [activeTab]);

  const handleAcceptRequest = async (id: string, name: string) => {
    try {
      await api.acceptConnection(id);
      toast.success('Connection Accepted! ', `${name} is now connected with you.`);
      setDiscoverSections(prev => prev.map(section => ({
        ...section,
        items: (section.items || []).map((item: any) =>
          item.id === id
            ? { ...item, connection_state: 'connected', connectionState: 'connected' }
            : item
        )
      })));
      await loadRequests();
      await loadConnections();
      await loadDiscover();
      await fetchNetworkData(true);
    } catch (e: any) {
      toast.error('Failed to accept request', e.message || 'Please try again.');
    }
  };

  const handleIgnoreRequest = async (id: string, name: string) => {
    try {
      await api.rejectConnection(id);
      toast.success('Invite Ignored', `Connection request from ${name} has been archived.`);
      await loadRequests();
    } catch (e: any) {
      toast.error('Failed to ignore request', e.message || 'Please try again.');
    }
  };


  const rawPeople = networkData?.items || [];

  const sumChars = (str: string) => {
    return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  };

  // Normalize fetched profiles to standard frontend card representation
  const normalizedPeople = useMemo(() => {
    return rawPeople.map((p: any) => {
      const kind = p.kind || 'student';
      const name = p.name || 'Anonymous';
      const initials = p.initials || (name.split(' ').slice(0, 2).map((part: string) => part[0] || '').join('').toUpperCase());
      const color = p.color || defaultAccent;
      
      let tag = 'Student';
      if (kind === 'alumni') tag = 'Alumni';
      else if (kind === 'mentor') tag = 'Mentor';
      
      const company = p.company || p.college || '';
      const role = p.subline || p.role || '';
      
      const rating = p.rating || 5.0;
      const sessions = p.sessions || 0;
      // deterministic mock session pricing (free / paid)
      const price = (sumChars(p.id || '') % 3) === 0 ? 'Free' : `₹${500 + (sumChars(p.id || '') % 5) * 250}`;

      let photo = p.photo_data || p.face_image_base64 || p.photo || '';
      if (photo && !photo.startsWith('data:') && !photo.startsWith('http')) {
        photo = `data:image/jpeg;base64,${photo}`;
      }

      return {
        id: p.id,
        email: p.email || '',
        name,
        initials,
        color,
        tag,
        role: role,
        company: company,
        college: p.college || '',
        batch: p.batch || 2026,
        tags: p.tags ? p.tags.filter((t: string) => t !== 'Mentor' && t !== 'Alumni' && t !== 'Student') : [],
        mutual: p.mutual || ((sumChars(p.id || '') % 18) + 4),
        linkedin: p.linkedin_url || p.linkedin || '',
        github: githubOf(p),
        connectionState: p.connection_state || 'none',
        kind,
        rating,
        sessions,
        price,
        photo
      };
    });
  }, [rawPeople]);

  // Synchronise search queries from global portal context
  const portalNav = useContext(navContext);
  useEffect(() => {
    if (portalNav?.searchQuery) {
      setQ(portalNav.searchQuery);
      portalNav.setSearchQuery('');
    }
  }, [portalNav?.searchQuery]);

  // Filter list by search query
  const filteredList = useMemo(() => {
    const searchTerm = (searchQuery || q || '').trim().toLowerCase();
    
    // Combine normalizedPeople with discoverItems to ensure all backend search results appear
    const discoverItems = discoverSections.flatMap((s: any) => s.items || []).map(normalizeDiscoverUser);
    const combined = [...discoverItems, ...normalizedPeople];
    const uniquePeople = Array.from(new Map(combined.map((p: any) => [p.id, p])).values());

    return uniquePeople.filter((p) => {
      if (!searchTerm) return true;
      const matchText = `${p.name} ${p.role} ${p.company} ${p.college} ${(p.tags || []).join(' ')}`.toLowerCase();
      return matchText.includes(searchTerm);
    });
  }, [normalizedPeople, discoverSections, q, searchQuery]);

  // Partition data for the Discover Tab
  const mentorsList = useMemo(() => filteredList.filter(p => p.kind === 'mentor'), [filteredList]);
  const alumniList = useMemo(() => filteredList.filter(p => p.kind === 'alumni'), [filteredList]);
  const studentsList = useMemo(() => filteredList.filter(p => p.kind === 'student'), [filteredList]);

  const visibleMentors = useMemo(() => mentorsList.slice(0, mentorLimit), [mentorsList, mentorLimit]);
  const visibleAlumni = useMemo(() => alumniList.slice(0, alumniLimit), [alumniList, alumniLimit]);
  const visibleStudents = useMemo(() => studentsList.slice(0, studentLimit), [studentsList, studentLimit]);

  // Connections Tab: Accepted relationships

  // Connection invitations sender
  const handleConnect = async (id: string, name: string) => {
    setPending((p) => [...p, id]);
    try {
      await api.sendConnectionRequest(id);
      toast.success('Connection Sent! ', `Your connection invite to ${name} has been sent.`);
      setPending((p) => p.filter(x => x !== id));
      // update state locally
      setLocalSent((s) => [...s, id]);
    } catch (err: any) {
      setPending((p) => p.filter(x => x !== id));
      toast.error('Could not connect', err?.message || 'Please try again.');
    }
  };

  const viewMentor = (m: any) => {
    router.push({
      pathname: '/mentor/[id]',
      params: {
        id: m.id,
        name: m.name,
        title: m.role,
        bio: 'Experienced professional ready to share industry insights, career strategies, and guidance.',
        avatar: m.photo || `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200`,
        rating: String(m.rating),
        sessions: String(m.sessions),
        tags: m.tags?.join(','),
      }
    });
  };


  return {
    activeTab,
    setActiveTab,
    q,
    setQ,
    filter,
    setFilter,
    discoverSubTab,
    setDiscoverSubTab,
    discoverSections,
    setDiscoverSections,
    incomingRequests,
    setIncomingRequests,
    sentRequests,
    setSentRequests,
    connectionsList,
    setConnectionsList,
    showMatchedInterest,
    setShowMatchedInterest,
    searchQuery,
    setSearchQuery,
    dbSearchStatus,
    setDbSearchStatus,
    dbStatusMsg,
    setDbStatusMsg,
    conn,
    setConn,
    pending,
    setPending,
    localSent,
    setLocalSent,
    pickedPerson,
    setPickedPerson,
    bookingMentor,
    setBookingMentor,
    bookingSlot,
    setBookingSlot,
    bookingTopic,
    setBookingTopic,
    bookingSubmitting,
    setBookingSubmitting,
    mentorLimit,
    setMentorLimit,
    alumniLimit,
    setAlumniLimit,
    studentLimit,
    setStudentLimit,
    networkData,
    setNetworkData,
    loading,
    setLoading,
    networkPage,
    setNetworkPage,
    networkPages,
    setNetworkPages,
    toast,
    router,
    authUser,
    activeSection,
    normalizeDiscoverUser,
    normalizedDiscover,
    filteredMatchedDiscover,
    discoverCounts,
    handleOpenBooking,
    bookingSlots,
    handleConfirmBooking,
    fetchNetworkData,
    loadDiscover,
    handleDatabaseSearch,
    loadRequests,
    loadConnections,
    handleAcceptRequest,
    handleIgnoreRequest,
    rawPeople,
    sumChars,
    normalizedPeople,
    portalNav,
    filteredList,
    mentorsList,
    alumniList,
    studentsList,
    visibleMentors,
    visibleAlumni,
    visibleStudents,
    handleConnect,
    viewMentor,
  };
}
