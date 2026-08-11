// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Search, 
  UserPlus, 
  Check, 
  MessageSquare, 
  Star, 
  Clock, 
  Calendar, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Linkedin, 
  Github, 
  Eye, 
  Plus, 
  X 
} from '../../student/iconShims';
import { ChevronUp, ChevronDown, Activity, Heart, Settings, Sparkles, User, Link2, Code } from 'lucide-react-native';
import { SC, FONTS } from '../tokens';
import { GRAD } from '../../student/portalkit';
import { GlassCard } from '../../student/glass';
import { Av, Badge } from '../atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { request, api } from '@/src/models/services/api';

import { AlumniPortalNavContext as StudentPortalNavContext } from '../AlumniPortalRN';

type CategoryTab = 'discover' | 'connections' | 'book' | 'requests';
type FilterType = 'everyone' | 'students' | 'alumnis' | 'mentors' | 'industry';
type DiscoverSubTab = 'interest' | 'path' | 'college' | 'recommended' | 'expand';

function LinkedinGlyph({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Text style={{
      color, fontSize: Math.round(size * 0.8),
      fontFamily: FONTS.xbold,
      fontWeight: '800' as any, letterSpacing: -0.5,
    }}>in</Text>
  );
}



export function NetworkView() {
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
      toast.success('Session Booked! 🎉', `Your session with ${bookingMentor.name} is confirmed.`);
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
      toast.success('Connection Accepted! 🎉', `${name} is now connected with you.`);
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
      const color = p.color || '#8B5CF6';
      
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
        github: p.github_url || p.github || '',
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
  const portalNav = React.useContext(StudentPortalNavContext);
  React.useEffect(() => {
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
      toast.success('Connection Sent! ✉️', `Your connection invite to ${name} has been sent.`);
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

  if (loading) {
    return (
      <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={SC.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      
      {/* Tab Selector row */}
      <View style={s.tabRow}>
        <Pressable 
          onPress={() => setActiveTab('discover')} 
          style={[s.tabBtn, activeTab === 'discover' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, activeTab === 'discover' && s.tabBtnTextActive]}>Discover</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('connections')} 
          style={[s.tabBtn, activeTab === 'connections' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, activeTab === 'connections' && s.tabBtnTextActive]}>My Connections</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('book')} 
          style={[s.tabBtn, activeTab === 'book' && s.tabBtnActive]}
        >
          <Text style={[s.tabBtnText, activeTab === 'book' && s.tabBtnTextActive]}>Book a Mentor</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('requests')} 
          style={[s.tabBtn, activeTab === 'requests' && s.tabBtnActive, { flexDirection: 'row', alignItems: 'center' }]}
        >
          <Text style={[s.tabBtnText, activeTab === 'requests' && s.tabBtnTextActive]}>Requests</Text>
          <View style={[s.reqBadge, activeTab === 'requests' && s.reqBadgeOn, { marginLeft: 6 }]}>
            <Text style={[s.countBadgeText, activeTab === 'requests' && s.countBadgeTextOn]}>{incomingRequests.length + sentRequests.length}</Text>
          </View>
        </Pressable>
      </View>

      {/* Global Search bar with DB Search Button & Status Feedback */}
      <View style={{ gap: 8, marginBottom: 16 }}>
        <View style={s.searchRowContainer}>
          <View style={s.searchContainerFlex}>
            <Search size={16} color={SC.dim} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={(val) => {
                setSearchQuery(val);
                setQ(val);
                if (!val.trim() && dbSearchStatus !== 'idle') {
                  setDbSearchStatus('idle');
                  setDbStatusMsg('');
                }
              }}
              onSubmitEditing={() => handleDatabaseSearch()}
              placeholder="Filter displayed accounts or search DB..."
              placeholderTextColor={SC.dim}
              style={s.searchInput}
            />
            {searchQuery ? (
              <Pressable onPress={() => { setSearchQuery(''); setQ(''); setDbSearchStatus('idle'); setDbStatusMsg(''); }} style={{ padding: 4 }}>
                <X size={14} color={SC.dim} />
              </Pressable>
            ) : null}
          </View>

          <Pressable 
            onPress={() => handleDatabaseSearch()}
            disabled={dbSearchStatus === 'searching'}
            style={[
              s.dbSearchBtn,
              dbSearchStatus === 'searching' && { opacity: 0.7 }
            ]}
          >
            {dbSearchStatus === 'searching' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Search size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={s.dbSearchBtnText}>Search DB</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Status Feedback Banner */}
        {dbSearchStatus !== 'idle' && (
          <View style={[
            s.statusBanner,
            dbSearchStatus === 'searching' && s.statusBannerSearching,
            dbSearchStatus === 'success' && s.statusBannerSuccess,
            dbSearchStatus === 'error' && s.statusBannerError,
          ]}>
            {dbSearchStatus === 'searching' && <ActivityIndicator size="small" color="#60A5FA" style={{ marginRight: 8 }} />}
            {dbSearchStatus === 'success' && <Check size={14} color="#34D399" style={{ marginRight: 8 }} />}
            {dbSearchStatus === 'error' && <X size={14} color="#F87171" style={{ marginRight: 8 }} />}
            <Text style={[
              s.statusText,
              dbSearchStatus === 'searching' && { color: '#60A5FA' },
              dbSearchStatus === 'success' && { color: '#34D399' },
              dbSearchStatus === 'error' && { color: '#F87171' },
            ]}>
              {dbStatusMsg}
            </Text>
          </View>
        )}
      </View>

      {/* 3. Discover Tab Redesign (Screenshot 1) */}
      {activeTab === 'discover' && (
        <View style={{ gap: 16 }}>
          
          {/* Secondary Sub-filters Row */}
          <View style={s.subFiltersRow}>
            {['everyone', 'students', 'alumnis', 'mentors', 'industry'].map((f) => {
              const filterLabels: Record<string, string> = {
                everyone: 'Everyone',
                students: 'Students',
                alumnis: 'Alumni',
                mentors: 'Mentors',
                industry: 'Industry'
              };
              return (
              <Pressable 
                key={f}
                onPress={() => setFilter(f as FilterType)} 
                style={[s.subFilterChip, filter === f && s.subFilterChipOn]}
              >
                <Text style={[s.subFilterText, filter === f && s.subFilterTextOn]}>
                  {filterLabels[f] || f}
                </Text>
              </Pressable>
              );
            })}
          </View>

          {/* Discover Sub-category Pill Filters Row */}
          <View style={s.discoverRow}>
            <Pressable 
              onPress={() => setDiscoverSubTab('interest')}
              style={[s.tabBtn, discoverSubTab === 'interest' && s.tabBtnActive]}
            >
              <Heart size={12} color={discoverSubTab === 'interest' ? '#5EEAD4' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={[s.tabBtnText, discoverSubTab === 'interest' && s.tabBtnTextActive]}>Matched by Interest</Text>
              <View style={[s.discBadge, discoverSubTab === 'interest' && s.discBadgeOn]}><Text style={s.discBadgeText}>{discoverCounts.interest}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('path')}
              style={[s.tabBtn, discoverSubTab === 'path' && s.tabBtnActive]}
            >
              <Settings size={12} color={discoverSubTab === 'path' ? '#F97316' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.tabBtnText}>Matched by Career Path</Text>
              <View style={[s.discBadge, { backgroundColor: 'rgba(249,115,22,0.1)' }]}><Text style={[s.discBadgeText, { color: '#F97316' }]}>{discoverCounts.path}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('college')}
              style={[s.tabBtn, discoverSubTab === 'college' && s.tabBtnActive]}
            >
              <GraduationCap size={12} color={discoverSubTab === 'college' ? '#3B82F6' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.tabBtnText}>From Your College</Text>
              <View style={[s.discBadge, { backgroundColor: 'rgba(59,130,246,0.1)' }]}><Text style={[s.discBadgeText, { color: '#3B82F6' }]}>{discoverCounts.college}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('recommended')}
              style={[s.tabBtn, discoverSubTab === 'recommended' && s.tabBtnActive]}
            >
              <Users size={12} color={discoverSubTab === 'recommended' ? '#F59E0B' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.tabBtnText}>Recommended Mentors</Text>
              <View style={[s.discBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}><Text style={[s.discBadgeText, { color: '#F59E0B' }]}>{discoverCounts.recommended}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('expand')}
              style={[s.tabBtn, discoverSubTab === 'expand' && s.tabBtnActive]}
            >
              <Activity size={12} color={discoverSubTab === 'expand' ? '#EC4899' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.tabBtnText}>Expand Your Horizons</Text>
              <View style={[s.discBadge, { backgroundColor: 'rgba(236,72,153,0.1)' }]}><Text style={[s.discBadgeText, { color: '#EC4899' }]}>{discoverCounts.expand}</Text></View>
            </Pressable>
          </View>

          {/* Matched list view */}
          {filteredMatchedDiscover.length > 0 && (
            <View style={s.sectionFrame}>
              <Pressable 
                onPress={() => setShowMatchedInterest(!showMatchedInterest)} 
                style={s.sectionHeaderRow}
              >
                {discoverSubTab === 'interest' ? <Heart size={18} color="#5EEAD4" style={{ marginRight: 8 }} /> : discoverSubTab === 'path' ? <Briefcase size={18} color="#F97316" style={{ marginRight: 8 }} /> : discoverSubTab === 'college' ? <GraduationCap size={18} color="#3B82F6" style={{ marginRight: 8 }} /> : discoverSubTab === 'recommended' ? <Users size={18} color="#F59E0B" style={{ marginRight: 8 }} /> : <Activity size={18} color="#EC4899" style={{ marginRight: 8 }} />}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>
                      {discoverSubTab === 'interest' ? 'Matched by Interest' : discoverSubTab === 'path' ? 'Matched by Career Path' : discoverSubTab === 'college' ? 'From Your College' : discoverSubTab === 'recommended' ? 'Recommended Mentors' : 'Expand Your Horizons'}
                    </Text>
                    <View style={s.secBadge}>
                      <Text style={s.secBadgeText}>{filteredMatchedDiscover.length}</Text>
                    </View>
                  </View>
                  <Text style={s.secSub}>{activeSection?.subtitle || 'Based on your profile matching criteria.'}</Text>
                </View>
                <Pressable onPress={() => setShowMatchedInterest(!showMatchedInterest)} style={s.toggleBtn}>
                  <Text style={s.toggleBtnText}>{showMatchedInterest ? 'Show less' : 'Show more'}</Text>
                  {showMatchedInterest ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showMatchedInterest && (
                <View style={s.cardsGrid}>
                  {filteredMatchedDiscover.map((person) => (
                    <View key={person.id} style={s.profileCard}>
                      <View>
                        {/* Card Profile Info */}
                        <View style={s.cardProfileRow}>
                          <Av initials={person.avatar} size={42} color={person.color} />
                          <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text numberOfLines={1} style={s.nameBold}>{person.name}</Text>
                              <View style={[
                                s.rolePillBase, 
                                person.tag === 'Student' ? s.rolePillStudent : person.tag === 'Mentor' ? s.rolePillMentor : s.rolePillAlumni
                              ]}>
                                <Text style={[
                                  s.rolePillBaseText, 
                                  person.tag === 'Student' ? s.rolePillStudentText : person.tag === 'Mentor' ? s.rolePillMentorText : s.rolePillAlumniText
                                ]}>{person.tag}</Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} style={s.subtitleLine}>{person.role}</Text>
                            <Text numberOfLines={1} style={s.subtitleSubLine}>
                              {person.company ? `${person.company} • ` : ''}{person.college}{person.year ? ` • ${person.year}` : ''}
                            </Text>
                          </View>
                        </View>

                        {/* Skill Pills */}
                        <View style={s.skillsRow}>
                          {person.tags.map((skill: string, sIdx: number) => (
                            <View key={sIdx} style={s.skillChip}><Text style={s.skillChipText}>{skill}</Text></View>
                          ))}
                        </View>

                        {/* Mutual Connection Counter */}
                        <View style={s.mutualRow}>
                          <Users size={12} color={SC.dim} style={{ marginRight: 6 }} />
                          <Text style={s.mutualText}>{person.mutual} mutual connections</Text>
                        </View>
                      </View>

                      {/* Card Action Row */}
                      <View style={[s.cardActions, { marginTop: 14, flexDirection: 'column', gap: 8, alignItems: 'stretch' }]}>
                        
                        {/* Action Button depending on Connection State */}
                        {person.connectionState === 'connected' ? (
                          <View style={[s.draftMsgBtn, { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.06)' }]}>
                            <Check size={12} color="#86EFAC" style={{ marginRight: 6 }} />
                            <Text style={[s.draftMsgBtnText, { color: '#86EFAC' }]}>Connected</Text>
                          </View>
                        ) : person.connectionState === 'pending' || localSent.includes(person.id) ? (
                          <View style={[s.draftMsgBtn, { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.06)' }]}>
                            <Clock size={12} color="#FDE047" style={{ marginRight: 6 }} />
                            <Text style={[s.draftMsgBtnText, { color: '#FDE047' }]}>Pending Invite</Text>
                          </View>
                        ) : person.connectionState === 'incoming' ? (
                          <Pressable 
                            onPress={() => handleAcceptRequest(person.id, person.name)}
                            style={({ hovered }: any) => [s.draftMsgBtn, { borderColor: '#5EEAD4', backgroundColor: '#14B8A6' }, hovered && { opacity: 0.9 }]}
                          >
                            <Check size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text style={[s.draftMsgBtnText, { color: '#090D16' }]}>Accept Connection</Text>
                          </Pressable>
                        ) : (
                          <Pressable 
                            onPress={() => handleConnect(person.id, person.name)}
                            disabled={pending.includes(person.id)}
                            style={({ hovered }: any) => [s.draftMsgBtn, hovered && !pending.includes(person.id) && { borderColor: '#5EEAD4', backgroundColor: 'rgba(94, 234, 212, 0.1)' }]}
                          >
                            {pending.includes(person.id) ? (
                              <ActivityIndicator size="small" color="#5EEAD4" />
                            ) : (
                              <>
                                <UserPlus size={12} color="#5EEAD4" style={{ marginRight: 6 }} />
                                <Text style={s.draftMsgBtnText}>Connect</Text>
                              </>
                            )}
                          </Pressable>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 6 }}>
                          <Pressable 
                            onPress={() => setPickedPerson(person)}
                            style={({ hovered }: any) => [s.viewProfileBtn, { flex: 1, height: 32 }, hovered && { backgroundColor: '#5EEAD4' }]}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text style={s.viewProfileBtnText}>View Profile</Text>
                          </Pressable>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable onPress={() => alert(`Starting message chat with ${person.name}`)} style={[s.iconSquareBtn, { height: 32, width: 32, borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : alert('No link provided')} style={[s.iconSquareBtn, { height: 32, width: 32, backgroundColor: '#0A66C2' }]}>
                              <LinkedinGlyph size={13} color="#fff" />
                            </Pressable>
                            {person.github && (
                              <Pressable onPress={() => person.github ? Linking.openURL(person.github.startsWith('http') ? person.github : `https://${person.github}`) : alert('No link provided')} style={[s.iconSquareBtn, { height: 32, width: 32, backgroundColor: '#24292e' }]}>
                                <Code size={13} color="#fff" />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {filteredMatchedDiscover.length === 0 && (
            <View style={s.stubCard}>
              <Sparkles size={22} color={SC.tealP} style={{ marginBottom: 8 }} />
              <Text style={s.stubTitle}>No Matches Found</Text>
              <Text style={s.stubSub}>
                There are no matching network accounts in the database for this category right now.
              </Text>
            </View>
          )}
        </View>
      )}

      

      {/* 4. Requests Tab Redesign (Screenshot 2) */}
      {activeTab === 'requests' && (
        <View style={{ gap: 16 }}>
          
          {/* Incoming Requests (2) */}
          <View style={s.requestListFrame}>
            <View style={s.requestListHeaderRow}>
              <Clock size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={[s.requestListTitle, { color: '#F59E0B' }]}>INCOMING REQUESTS ({incomingRequests.length})</Text>
            </View>

            <View style={{ gap: 8, marginTop: 10 }}>
              {incomingRequests.map((req) => {
                const tagStyle = req.role === 'Student' ? s.rolePillStudent : req.role === 'Mentor' ? s.rolePillMentor : req.role === 'Industry' ? s.rolePillIndustry : s.rolePillAlumni;
                const tagTextStyle = req.role === 'Student' ? s.rolePillStudentText : req.role === 'Mentor' ? s.rolePillMentorText : req.role === 'Industry' ? s.rolePillIndustryText : s.rolePillAlumniText;

                return (
                  <View key={req.id} style={s.requestRow}>
                    <Av initials={req.avatar} size={42} color={req.color} />
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={s.requestName}>{req.name}</Text>
                        <View style={[s.rolePillBase, tagStyle]}>
                          <Text style={[s.rolePillBaseText, tagTextStyle]}>{req.role}</Text>
                        </View>
                        <Text style={s.requestTimeText}>{req.time}</Text>
                      </View>
                      <Text style={s.requestSublineText} numberOfLines={1}>{req.subtitle}</Text>
                      {req.message ? (
                        <Text style={{ color: '#5EEAD4', fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4, fontStyle: 'italic' }}>
                          Note: "{req.message}"
                        </Text>
                      ) : null}
                    </View>

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable 
                        onPress={() => handleAcceptRequest(req.id, req.name)}
                        style={({ hovered }: any) => [s.acceptBtn, hovered && { backgroundColor: '#5EEAD4' }]}
                      >
                        <Text style={s.acceptBtnText}>Accept</Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => handleIgnoreRequest(req.id, req.name)}
                        style={({ hovered }: any) => [s.ignoreBtn, hovered && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                      >
                        <Text style={s.ignoreBtnText}>Ignore</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {incomingRequests.length === 0 && (
                <Text style={s.noRequestText}>No pending incoming requests.</Text>
              )}
            </View>
          </View>

          {/* Sent Requests (1) */}
          <View style={s.requestListFrame}>
            <View style={s.requestListHeaderRow}>
              <Users size={16} color="#14B8A6" style={{ marginRight: 8 }} />
              <Text style={[s.requestListTitle, { color: '#14B8A6' }]}>SENT REQUESTS ({sentRequests.length})</Text>
            </View>

            <View style={{ gap: 8, marginTop: 10 }}>
              {sentRequests.map((req) => {
                const tagStyle = req.role === 'Student' ? s.rolePillStudent : req.role === 'Mentor' ? s.rolePillMentor : req.role === 'Industry' ? s.rolePillIndustry : s.rolePillAlumni;
                const tagTextStyle = req.role === 'Student' ? s.rolePillStudentText : req.role === 'Mentor' ? s.rolePillMentorText : req.role === 'Industry' ? s.rolePillIndustryText : s.rolePillAlumniText;

                return (
                <View key={req.id} style={s.requestRow}>
                  <Av initials={req.avatar} size={42} color={req.color} />
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={s.requestName}>{req.name}</Text>
                      <View style={[s.rolePillBase, tagStyle]}>
                        <Text style={[s.rolePillBaseText, tagTextStyle]}>{req.role}</Text>
                      </View>
                      <Text style={s.requestTimeText}>{req.time}</Text>
                    </View>
                    <Text style={s.requestSublineText} numberOfLines={1}>{req.subtitle}</Text>
                  </View>

                  {/* Pending label */}
                  <View style={s.pendingStatusContainer}>
                    <Clock size={11} color="#FCD34D" style={{ marginRight: 4 }} />
                    <Text style={s.pendingStatusText}>Pending</Text>
                  </View>
                </View>
                );
              })}

              {sentRequests.length === 0 && (
                <Text style={s.noRequestText}>No pending sent requests.</Text>
              )}
            </View>
          </View>
        </View>
      )}

      

      {/* Connections tab screen */}
      {activeTab === 'connections' && (
        <View style={{ gap: 16 }}>
          <View style={s.secHeaderRow}>
            <View style={[s.secIconBg, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Users size={14} color="#86EFAC" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.secTitle}>My Connections</Text>
                <View style={s.secBadge}><Text style={s.secBadgeText}>{connectionsList.length}</Text></View>
              </View>
              <Text style={s.secSub}>People you are actively connected with</Text>
            </View>
          </View>

          <View style={s.grid}>
            {connectionsList.map((person) => (
              <GlassCard key={person.id} radius={14} padding={16} style={s.card}>
                <View>
                  <View style={s.cardHead}>
                    <Av initials={person.initials} size={46} color={person.color} photo={person.photo} />
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text numberOfLines={1} style={s.cardName}>{person.name}</Text>
                        <View style={person.kind === 'mentor' ? s.badgeMentor : person.kind === 'alumni' ? s.badgeAlumni : s.badgeStudent}>
                          <Text style={person.kind === 'mentor' ? s.badgeMentorText : person.kind === 'alumni' ? s.badgeAlumniText : s.badgeStudentText}>{person.tag}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={s.cardRole}>{person.role}</Text>
                      <Text numberOfLines={1} style={s.cardCompany}>{person.company}</Text>
                    </View>
                  </View>

                  <View style={s.tagsRow}>
                    {person.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                    ))}
                  </View>

                  <View style={s.mutualRow}>
                    <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                    <Text style={s.mutualText}>{person.mutual} mutual connections</Text>
                  </View>
                </View>

                <View style={s.cardActions}>
                  {person.kind === 'mentor' ? (
                    <>
                      <Pressable onPress={() => setPickedPerson(person)} style={s.actionBtnOutline}>
                        <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnOutlineText}>View Profile</Text>
                      </Pressable>
                      <Pressable onPress={() => setBookingMentor(person)} style={s.actionBtnFill}>
                        <Calendar size={12} color="#fff" style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnFillText}>Book</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => setPickedPerson(person)} style={s.actionBtnOutline}>
                        <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                        <Text style={s.actionBtnOutlineText}>View Profile</Text>
                      </Pressable>
                      <View style={s.connectedBadge}>
                        <Check size={11} color={SC.green} style={{ marginRight: 4 }} />
                        <Text style={s.connectedText}>Connected</Text>
                      </View>
                    </>
                  )}

                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : alert('No link provided')} style={s.iconBtn}>
                      <Linkedin size={12} color={SC.muted} />
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            ))}

            {connectionsList.length === 0 && (
              <View style={s.emptyCard}>
                <Users size={24} color={SC.muted} style={{ marginBottom: 10 }} />
                <Text style={s.emptyText}>No connections fit the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Book a Mentor tab screen */}
      {activeTab === 'book' && (
        <View style={{ gap: 16 }}>
          <View style={s.secHeaderRow}>
            <View style={[s.secIconBg, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Briefcase size={14} color="#86EFAC" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.secTitle}>All Mentors</Text>
                <View style={s.secBadge}><Text style={s.secBadgeText}>{mentorsList.length}</Text></View>
              </View>
              <Text style={s.secSub}>Browse experts and schedule your 1:1 sessions</Text>
            </View>
          </View>

          <View style={s.grid}>
            {mentorsList.map((m) => (
              <GlassCard key={m.id} radius={14} padding={16} style={s.card}>
                <View>
                  <View style={s.cardHead}>
                    <Av initials={m.initials} size={46} color={m.color} photo={m.photo} />
                    <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text numberOfLines={1} style={s.cardName}>{m.name}</Text>
                        <View style={s.badgeMentor}><Text style={s.badgeMentorText}>MENTOR</Text></View>
                      </View>
                      <Text numberOfLines={1} style={s.cardRole}>{m.role}</Text>
                      <Text numberOfLines={1} style={s.cardCompany}>{m.company}</Text>
                    </View>
                    
                    {/* Top-Right Social Links. */}
                    <View style={{ flexDirection: 'row', gap: 4, alignSelf: 'flex-start' }}>
                      <Pressable onPress={() => m.linkedin ? Linking.openURL(m.linkedin.startsWith('http') ? m.linkedin : `https://${m.linkedin}`) : alert('No link provided')} style={s.iconBtn}>
                        <Linkedin size={12} color={SC.muted} />
                      </Pressable>
                      {m.github && (
                        <Pressable onPress={() => m.github ? Linking.openURL(m.github.startsWith('http') ? m.github : `https://${m.github}`) : alert('No link provided')} style={s.iconBtn}>
                          <Github size={12} color={SC.muted} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View style={s.tagsRow}>
                    {m.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                    ))}
                  </View>

                  <View style={s.statsRow}>
                    <View style={s.statItem}>
                      <Star size={11} color={SC.amber} fill={SC.amber} />
                      <Text style={s.statText}>{m.rating}</Text>
                    </View>
                    <View style={s.statItem}>
                      <Clock size={11} color={SC.muted} />
                      <Text style={s.statText}>{m.sessions} sessions</Text>
                    </View>
                    <Text style={s.priceText}>{m.price}/session</Text>
                  </View>

                  <View style={s.mutualRow}>
                    <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                    <Text style={s.mutualText}>{m.mutual} mutual connections</Text>
                  </View>
                </View>

                <View style={s.cardActions}>
                  <Pressable onPress={() => setPickedPerson(m)} style={[s.actionBtnOutline, { flex: 1, marginRight: 4 }]}>
                    <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                    <Text style={s.actionBtnOutlineText}>View Profile</Text>
                  </Pressable>

                  {conn.includes(m.id) || m.connectionState === 'connected' ? (
                    <View style={[s.connectedBadge, { flex: 1, marginRight: 4 }]}>
                      <Check size={11} color={SC.green} style={{ marginRight: 4 }} />
                      <Text style={s.connectedText}>Connected</Text>
                    </View>
                  ) : pending.includes(m.id) || m.connectionState === 'pending' ? (
                    <View style={[s.pendingBadge, { flex: 1, marginRight: 4 }]}>
                      <Clock size={11} color={SC.amber} style={{ marginRight: 4 }} />
                      <Text style={s.pendingText}>Pending</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleConnect(m.id, m.name)} style={[s.actionBtnOutline, { flex: 1, marginRight: 4 }]}>
                      <UserPlus size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                      <Text style={s.actionBtnOutlineText}>Connect</Text>
                    </Pressable>
                  )}

                  <Pressable onPress={() => setBookingMentor(m)} style={[s.actionBtnFill, { flex: 1.1 }]}>
                    <Calendar size={12} color="#fff" style={{ marginRight: 5 }} />
                    <Text style={s.actionBtnFillText}>Book</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}

            {mentorsList.length === 0 && (
              <View style={s.emptyCard}>
                <Users size={24} color={SC.muted} style={{ marginBottom: 10 }} />
                <Text style={s.emptyText}>No mentors match the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Profile detail Modal */}
      <Modal visible={!!pickedPerson} animationType="slide" transparent onRequestClose={() => setPickedPerson(null)}>
        <View style={s.backdrop}>
          <Pressable onPress={() => setPickedPerson(null)} style={{ flex: 1 }} />
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {pickedPerson?.kind === 'mentor' ? 'Mentor Profile' : pickedPerson?.kind === 'alumni' ? 'Alumni Profile' : 'Student Profile'}
              </Text>
              <Pressable onPress={() => setPickedPerson(null)} style={s.closeBtn}>
                <X size={16} color={SC.text} />
              </Pressable>
            </View>
            {pickedPerson && (() => {
              const isConnected = conn.includes(pickedPerson.id) || pickedPerson.connectionState === 'connected';
              const isPending = pending.includes(pickedPerson.id) || pickedPerson.connectionState === 'pending';
              const nameInitials = pickedPerson.initials;
              const titleLine = pickedPerson.role || pickedPerson.subline || 'Member';
              const collegeLine = pickedPerson.company || pickedPerson.college || '';
              const bioText = pickedPerson.bio || pickedPerson.looking || 'No bio provided.';
              
              return (
                <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 16 }}>
                  {/* Basic Info Card */}
                  <GlassCard radius={12} padding={16} style={s.profileHeaderCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Av initials={nameInitials} size={64} color={pickedPerson.color} photo={pickedPerson.photo} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{pickedPerson.name}</Text>
                        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 }}>
                          {titleLine}
                        </Text>
                        <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>
                          {collegeLine}
                        </Text>
                      </View>
                      
                      {/* Social Icons */}
                      <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'flex-start' }}>
                        {pickedPerson.linkedin && (
                          <Pressable 
                            onPress={() => pickedPerson.linkedin ? Linking.openURL(pickedPerson.linkedin.startsWith('http') ? pickedPerson.linkedin : `https://${pickedPerson.linkedin}`) : alert('No link provided')} 
                            style={s.socialIconBtn}
                          >
                            <Linkedin size={14} color="#fff" />
                          </Pressable>
                        )}
                        {pickedPerson.github && (
                          <Pressable 
                            onPress={() => pickedPerson.github ? Linking.openURL(pickedPerson.github.startsWith('http') ? pickedPerson.github : `https://${pickedPerson.github}`) : alert('No link provided')} 
                            style={s.socialIconBtn}
                          >
                            <Github size={14} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </GlassCard>

                  {/* Bio Card */}
                  <GlassCard radius={12} padding={16} style={s.profileBioCard}>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 13, lineHeight: 18 }}>
                      {bioText}
                    </Text>
                  </GlassCard>

                  {/* Mentor Stats Section */}
                  {pickedPerson.kind === 'mentor' && (
                    <View style={{ gap: 8 }}>
                      <Text style={{ color: '#F97316', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.6 }}>MENTOR STATS</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>{pickedPerson.rating}★</Text>
                          <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 4 }}>Rating</Text>
                        </GlassCard>
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>{pickedPerson.sessions}</Text>
                          <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 4 }}>Sessions</Text>
                        </GlassCard>
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 }} numberOfLines={1}>{pickedPerson.price}</Text>
                          <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 4 }}>Price</Text>
                        </GlassCard>
                      </View>
                    </View>
                  )}

                  {/* Skills Section */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.50)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.6 }}>SKILLS</Text>
                    <View style={s.tagsRow}>
                      {pickedPerson.tags && pickedPerson.tags.map((tag: string, idx: number) => (
                        <View key={idx} style={s.tagChip}><Text style={s.tagChipText}>{tag}</Text></View>
                      ))}
                      {(!pickedPerson.tags || pickedPerson.tags.length === 0) && (
                        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12 }}>No specified skills.</Text>
                      )}
                    </View>
                  </View>

                  {/* Connection / Booking Action Button. */}
                  <View style={{ marginTop: 8 }}>
                    {pickedPerson.kind === 'mentor' ? (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {isConnected ? (
                          <View style={[s.connectedPillLarge, { flex: 1 }]}>
                            <Check size={16} color={SC.green} style={{ marginRight: 6 }} />
                            <Text style={{ color: SC.green, fontFamily: FONTS.bold, fontSize: 14 }}>Connected</Text>
                          </View>
                        ) : isPending ? (
                          <View style={[s.pendingPillLarge, { flex: 1 }]}>
                            <Clock size={16} color={SC.amber} style={{ marginRight: 6 }} />
                            <Text style={{ color: SC.amber, fontFamily: FONTS.bold, fontSize: 14 }}>Pending</Text>
                          </View>
                        ) : (
                          <Pressable 
                            onPress={() => handleConnect(pickedPerson.id, pickedPerson.name)} 
                            style={[s.connectBtnLarge, { flex: 1, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)' }]}
                          >
                            <UserPlus size={16} color={SC.accentBright} style={{ marginRight: 6 }} />
                            <Text style={{ color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 14 }}>Connect</Text>
                          </Pressable>
                        )}
                        
                        <Pressable 
                          onPress={() => handleOpenBooking(pickedPerson)} 
                          style={[s.bookBtnLarge, { flex: 1.2 }]}
                        >
                          <Calendar size={16} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 }}>Book Session</Text>
                        </Pressable>
                      </View>
                    ) : isConnected ? (
                      <View style={s.connectedPillLarge}>
                        <Check size={16} color={SC.green} style={{ marginRight: 6 }} />
                        <Text style={{ color: SC.green, fontFamily: FONTS.bold, fontSize: 14 }}>Connected</Text>
                      </View>
                    ) : isPending ? (
                      <View style={s.pendingPillLarge}>
                        <Clock size={16} color={SC.amber} style={{ marginRight: 6 }} />
                        <Text style={{ color: SC.amber, fontFamily: FONTS.bold, fontSize: 14 }}>Request Pending</Text>
                      </View>
                    ) : (
                      <Pressable 
                        onPress={() => handleConnect(pickedPerson.id, pickedPerson.name)} 
                        style={s.connectBtnLarge}
                      >
                        <UserPlus size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 14 }}>+ Connect</Text>
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Booking Modal */}
      <Modal visible={!!bookingMentor} animationType="fade" transparent onRequestClose={() => setBookingMentor(null)}>
        <View style={s.bookingBackdrop}>
          <Pressable onPress={() => setBookingMentor(null)} style={StyleSheet.absoluteFill} />
          {bookingMentor && (
            <View style={s.bookingModal}>
              <View style={s.bookingModalHeader}>
                <Text style={s.bookingModalTitle}>Book Session</Text>
                <Pressable onPress={() => setBookingMentor(null)} style={s.bookingCloseBtn}>
                  <X size={16} color={SC.text} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 16 }}>
                {/* Mentor Header Section */}
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                  <Av initials={bookingMentor.initials} size={64} color={bookingMentor.color} photo={bookingMentor.photo} />
                  <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18, textAlign: 'center' }}>
                    {bookingMentor.name}
                  </Text>
                  <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center' }}>
                    {bookingMentor.role || 'Mentor'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Star size={14} color={SC.amber} fill={SC.amber} />
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 }}>
                      {bookingMentor.rating}
                    </Text>
                    <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12.5 }}>
                      · {bookingMentor.sessions} sessions
                    </Text>
                  </View>
                  
                  {/* Tags */}
                  {bookingMentor.tags && bookingMentor.tags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                      {bookingMentor.tags.map((t: string) => (
                        <View key={t} style={{ backgroundColor: 'rgba(139,92,246,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                          <Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 9.5, textTransform: 'uppercase' }}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* ABOUT */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.50)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.6 }}>ABOUT</Text>
                  <GlassCard radius={12} padding={14} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 12.5, lineHeight: 18 }}>
                      {bookingMentor.bio || 'Experienced professional ready to share industry insights, career strategies, and guidance.'}
                    </Text>
                  </GlassCard>
                </View>

                {/* Available Slots */}
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color={SC.accentBright} />
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 }}>Available Slots</Text>
                  </View>
                  <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5 }}>
                    30-minute 1:1 sessions. Pick a slot that works for you.
                  </Text>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {bookingSlots.map((slot, idx) => {
                      const isSelected = bookingSlot?.iso === slot.iso;
                      return (
                        <Pressable 
                          key={idx} 
                          onPress={() => setBookingSlot(slot)}
                          style={[s.slotChip, { flexDirection: 'row', alignItems: 'center' }, isSelected && s.slotChipActive]}
                        >
                          <Clock size={12} color={isSelected ? '#fff' : SC.accentBright} style={{ marginRight: 6 }} />
                          <Text style={[s.slotText, isSelected && s.slotTextActive]}>{slot.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Topic Input */}
                <View style={{ gap: 6 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.50)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.6 }}>WHAT WOULD YOU LIKE TO DISCUSS?</Text>
                  <TextInput
                    value={bookingTopic}
                    onChangeText={setBookingTopic}
                    placeholder="e.g., How do I prepare for FAANG interviews?"
                    placeholderTextColor={SC.dim}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      borderColor: SC.border,
                      borderWidth: 1,
                      borderRadius: 10,
                      padding: 12,
                      color: '#fff',
                      fontFamily: FONTS.med,
                      fontSize: 13,
                      height: 80,
                      textAlignVertical: 'top',
                      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
                    }}
                  />
                </View>

                {/* Submit button */}
                <Pressable 
                  disabled={!bookingSlot || !bookingTopic.trim() || bookingSubmitting}
                  onPress={handleConfirmBooking}
                  style={[
                    s.bookingSubmitBtn, 
                    (!bookingSlot || !bookingTopic.trim()) && s.bookingSubmitBtnDisabled
                  ]}
                >
                  {bookingSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MessageSquare size={16} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={[
                        s.bookingSubmitBtnText,
                        (!bookingSlot || !bookingTopic.trim()) && s.bookingSubmitBtnTextDisabled
                      ]}>
                        Confirm session
                      </Text>
                    </View>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 40
  },

  // Sub tab selector styles
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    marginBottom: 16
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  tabBtnActive: {
    backgroundColor: SC.primary
  },
  tabBtnText: {
    color: SC.muted,
    fontFamily: FONTS.semi,
    fontSize: 13
  },
  tabBtnTextActive: {
    color: '#fff',
    fontFamily: FONTS.bold
  },

  // Search input & DB button styles
  searchRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContainerFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  dbSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  dbSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.med,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBannerSearching: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  statusBannerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBannerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.med,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 20
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },

  // Collapsible section styles
  section: {
    marginBottom: 24,
    gap: 16
  },
  secHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: SC.border,
    borderBottomWidth: 1,
    paddingBottom: 12
  },
  secIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  secTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15,
    letterSpacing: -0.2
  },
  secBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  secBadgeText: {
    color: SC.accentBright,
    fontFamily: FONTS.xbold,
    fontSize: 10
  },
  secSub: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11,
    marginTop: 2
  },

  // Spacious Grid layouts
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  card: {
    flexGrow: 1,
    flexBasis: 340,
    maxWidth: 460,
    minHeight: 220,
    justifyContent: 'space-between',
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  cardName: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14.5
  },
  cardRole: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2
  },
  cardCompany: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5
  },

  // Badges styles
  badgeMentor: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeMentorText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },
  badgeAlumni: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeAlumniText: {
    color: SC.accentBright,
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },
  badgeStudent: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeStudentText: {
    color: '#93C5FD',
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },

  // Tags list
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8
  },
  tagChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6
  },
  tagChipText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 10
  },

  // Stats / ratings
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11
  },
  priceText: {
    color: SC.accentBright,
    fontFamily: FONTS.xbold,
    fontSize: 11.5,
    marginLeft: 'auto'
  },




  // Action buttons

  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  actionBtnOutlineText: {
    color: SC.accentBright,
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  actionBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: SC.primary,
    ...({ cursor: 'pointer' } as any)
  },
  actionBtnFillText: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 11.5
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SC.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },

  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.22)',
    borderWidth: 1
  },
  connectedText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.22)',
    borderWidth: 1
  },
  pendingText: {
    color: '#FDE047',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },

  // Empty state card
  emptyCard: {
    flex: 1,
    backgroundColor: SC.card,
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10
  },
  emptyText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    textAlign: 'center'
  },

  // Modal Backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.75)',
    justifyContent: 'flex-end',
    alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch',
  },
  modal: {
    backgroundColor: '#0C0818',
    borderColor: 'rgba(255,255,255,0.08)',
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderWidth: Platform.OS === 'web' ? 0 : 1,
    borderTopLeftRadius: Platform.OS === 'web' ? 0 : 20,
    borderTopRightRadius: Platform.OS === 'web' ? 0 : 20,
    width: Platform.OS === 'web' ? 440 : '100%',
    height: Platform.OS === 'web' ? '100%' : '85%',
    maxHeight: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: -10, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomColor: SC.border,
    borderBottomWidth: 1
  },
  modalTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15
  },
  closeBtn: {
    padding: 4,
    ...({ cursor: 'pointer' } as any)
  },

  profileHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
  },
  profileBioCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 12,
  },
  socialIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any)
  },
  connectBtnLarge: {
    height: 44,
    borderRadius: 10,
    backgroundColor: SC.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  connectedPillLarge: {
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingPillLarge: {
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16
  },
  viewMoreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  viewMoreBtnText: {
    color: SC.accentBright,
    fontFamily: FONTS.bold,
    fontSize: 12
  },

  bookBtnLarge: {
    height: 44,
    borderRadius: 10,
    backgroundColor: SC.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },

  // Centered booking modal styles
  bookingBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  bookingModal: {
    backgroundColor: '#0C0818',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 20,
    width: Platform.OS === 'web' ? 480 : '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20
  },
  bookingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomColor: SC.border,
    borderBottomWidth: 1
  },
  bookingModalTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 16
  },
  bookingCloseBtn: {
    padding: 4,
    ...({ cursor: 'pointer' } as any)
  },
  bookingLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 8
  },
  dayScroll: {
    marginVertical: 4
  },
  dayCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    width: 76,
    height: 58,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    ...({ cursor: 'pointer' } as any)
  },
  dayCardActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: SC.primary,
    borderWidth: 1.5
  },
  dayText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 12
  },
  dayTextActive: {
    color: '#fff',
  },
  dateText: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 10,
    marginTop: 2
  },
  dateTextActive: {
    color: SC.accentBright
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4
  },
  slotChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  slotChipActive: {
    backgroundColor: 'rgba(139,92,246,0.20)',
    borderColor: SC.primary,
    borderWidth: 1
  },
  slotText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 12
  },
  slotTextActive: {
    color: '#fff'
  },
  bookingSubmitBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: SC.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...({ cursor: 'pointer' } as any)
  },
  bookingSubmitBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1
  },
  bookingSubmitBtnText: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 14
  },
  bookingSubmitBtnTextDisabled: {
    color: SC.dim
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  countBadgeOn: {
    backgroundColor: 'rgba(9, 13, 22, 0.15)'
  },
  countBadgeText: {
    color: SC.muted,
    fontFamily: FONTS.xbold,
    fontSize: 10
  },
  countBadgeTextOn: {
    color: '#090D16'
  },
  reqBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(245,158,11,0.18)'
  },
  reqBadgeOn: {
    backgroundColor: 'rgba(9, 13, 22, 0.15)'
  },
  reqBadgeText: {
    color: '#F59E0B',
    fontFamily: FONTS.xbold,
    fontSize: 10
  },

  // Subfilters style
  subFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  subFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any)
  },
  subFilterChipOn: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.35)'
  },
  subFilterText: {
    color: SC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12
  },
  subFilterTextOn: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold
  },

  // Search input style


  // Discover sub tab style
  discoverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  discChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any)
  },
  discChipOn: {
    borderColor: 'rgba(20, 184, 166, 0.25)',
    backgroundColor: 'rgba(20, 184, 166, 0.08)'
  },
  discChipText: {
    color: '#E2E8F0',
    fontFamily: FONTS.semi,
    fontSize: 11.5
  },
  discChipTextOn: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold
  },
  discBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  discBadgeOn: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)'
  },
  discBadgeText: {
    color: '#5EEAD4',
    fontFamily: FONTS.xbold,
    fontSize: 9.5
  },

  // Subsections and Collapsibles
  sectionFrame: {
    gap: 14,
    marginBottom: 16
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: SC.border,
    borderBottomWidth: 1,
    paddingBottom: 10,
    ...({ cursor: 'pointer' } as any)
  },

  secBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(20,184,166,0.1)'
  },
  secBadgeText: {
    color: '#5EEAD4',
    fontFamily: FONTS.xbold,
    fontSize: 9.5
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(20,184,166,0.06)',
    ...({ cursor: 'pointer' } as any)
  },
  toggleBtnText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 11
  },

  // Cards grid layout


  
  // Requests tab layouts
  requestListFrame: {
    backgroundColor: SC.card,
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10
  },
  requestListHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: SC.border,
    borderBottomWidth: 1,
    paddingBottom: 10
  },
  requestListTitle: {
    fontFamily: FONTS.xbold,
    fontSize: 13,
    letterSpacing: 0.8
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 64
  },
  requestName: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14
  },
  requestTimeText: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5,
    marginLeft: 4
  },
  requestSublineText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2
  },
  acceptBtn: {
    height: 32,
    borderRadius: 6,
    backgroundColor: '#14B8A6',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  acceptBtnText: {
    color: '#090D16',
    fontFamily: FONTS.xbold,
    fontSize: 12
  },
  ignoreBtn: {
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  ignoreBtnText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 12
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.22)',
    borderWidth: 1
  },
  pendingStatusText: {
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 11
  },
  noRequestText: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    paddingVertical: 14,
    textAlign: 'center'
  },

  // Stub structures
  stubCard: {
    backgroundColor: SC.card,
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    textAlign: 'center'
  },
  stubTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 16
  },
  stubSub: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 420,
    marginBottom: 8
  },
  stubBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: SC.border2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  stubBtnText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 12
  },

  // Glassmorphic Drafting Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  draftModal: {
    backgroundColor: SC.cardSolid || '#131935',
    borderColor: SC.border2,
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 460,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: SC.border,
    paddingBottom: 10
  },
  draftModalTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 16
  },
  draftModalLabel: {
    color: SC.dim,
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    marginTop: 4
  },
  draftTextContainer: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 120
  },
  draftTextInput: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'top',
    height: '100%',
    width: '100%',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },
  draftActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 10
  },
  draftCancelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SC.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  draftCancelText: {
    color: SC.muted,
    fontFamily: FONTS.bold,
    fontSize: 13
  },
  draftSendBtn: {
    flex: 1.5,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#14B8A6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  draftSendText: {
    color: '#090D16',
    fontFamily: FONTS.xbold,
    fontSize: 13
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomColor: SC.border,
    borderBottomWidth: 1
  },
  modalTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15
  },
  closeBtn: {
    padding: 4,
    ...({ cursor: 'pointer' } as any)
  },
  profileHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
  },
  profileBioCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 12,
  },
  socialIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any)
  },

  successPopupContainer: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: '#090D16',
    borderColor: '#5EEAD4',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: 320,
    zIndex: 10000,
    shadowColor: '#5EEAD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  successPopupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  successPopupText: {
    color: '#E2E8F0',
    fontFamily: FONTS.med,
    fontSize: 14,
    flex: 1,
  },
  successPopupBtn: {
    backgroundColor: '#14B8A6',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successPopupBtnText: {
    color: '#090D16',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },

  // Cards grid layout
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },

  // Profile Grid Card layout
  profileCard: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 350,
    height: 280,
    justifyContent: 'space-between',
    backgroundColor: SC.card,
    borderColor: SC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  cardProfileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  nameBold: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14.5
  },
  subtitleLine: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2
  },
  subtitleSubLine: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5
  },

  // Mentees student tag
  rolePillStudent: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(34,197,94,0.12)'
  },
  rolePillStudentText: {
    color: '#86EFAC',
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },

  // Professional badges
  rolePillBase: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4
  },
  rolePillBaseText: {
    fontFamily: FONTS.bold,
    fontSize: 9.5
  },
  rolePillIndustry: {
    backgroundColor: 'rgba(245,158,11,0.12)'
  },
  rolePillIndustryText: {
    color: '#FCD34D'
  },
  rolePillMentor: {
    backgroundColor: 'rgba(20,184,1, 0.15)',
    borderColor: 'rgba(20,184,166,0.3)'
  },
  rolePillMentorText: {
    color: '#34D399'
  },
  rolePillAlumni: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.3)'
  },
  rolePillAlumniText: {
    color: '#93C5FD'
  },

  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2
  },
  skillChip: {
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1
  },
  skillChipText: {
    color: SC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10
  },

  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  mutualText: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 11
  },

  // Mentorship Progress Bar
  progressRow: {
    marginTop: 4,
    gap: 5
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3
  },
  progressText: {
    color: SC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopColor: SC.border,
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4
  },
  draftMsgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.25)',
    backgroundColor: 'rgba(94, 234, 212, 0.04)',
    width: '100%',
    ...({ cursor: 'pointer' } as any)
  },
  draftMsgBtnText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#14B8A6',
    ...({ cursor: 'pointer' } as any)
  },
  viewProfileBtnText: {
    color: '#090D16',
    fontFamily: FONTS.xbold,
    fontSize: 11
  },
  iconSquareBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },

  
});
