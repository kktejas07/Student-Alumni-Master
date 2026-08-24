// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Platform, Linking, ActivityIndicator, Modal } from 'react-native';
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

const pillBase = "flex-row items-center gap-1.5 px-[7px] py-0.5 rounded";
const pillBaseText = "font-body-bold text-[9.5px]";
const pillStudent = `${pillBase} bg-green-500/10`;
const pillStudentText = `${pillBaseText} text-green-300`;
const pillMentor = `${pillBase} bg-emerald-500/15 border border-emerald-500/30`;
const pillMentorText = `${pillBaseText} text-emerald-400`;
const pillAlumni = `${pillBase} bg-blue-500/15 border border-blue-500/30`;
const pillAlumniText = `${pillBaseText} text-blue-300`;
const pillIndustry = `${pillBase} bg-amber-500/12`;
const pillIndustryText = `${pillBaseText} text-amber-200`;

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
  
  const [conn, setConn] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [localSent, setLocalSent] = useState<string[]>([]);

  const [pickedPerson, setPickedPerson] = useState<any | null>(null);

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

  const [mentorLimit, setMentorLimit] = useState(3);
  const [alumniLimit, setAlumniLimit] = useState(3);
  const [studentLimit, setStudentLimit] = useState(3);

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

  const portalNav = React.useContext(StudentPortalNavContext);
  React.useEffect(() => {
    if (portalNav?.searchQuery) {
      setQ(portalNav.searchQuery);
      portalNav.setSearchQuery('');
    }
  }, [portalNav?.searchQuery]);

  const filteredList = useMemo(() => {
    const searchTerm = (searchQuery || q || '').trim().toLowerCase();
    
    const discoverItems = discoverSections.flatMap((s: any) => s.items || []).map(normalizeDiscoverUser);
    const combined = [...discoverItems, ...normalizedPeople];
    const uniquePeople = Array.from(new Map(combined.map((p: any) => [p.id, p])).values());

    return uniquePeople.filter((p) => {
      if (!searchTerm) return true;
      const matchText = `${p.name} ${p.role} ${p.company} ${p.college} ${(p.tags || []).join(' ')}`.toLowerCase();
      return matchText.includes(searchTerm);
    });
  }, [normalizedPeople, discoverSections, q, searchQuery]);

  const mentorsList = useMemo(() => filteredList.filter(p => p.kind === 'mentor'), [filteredList]);
  const alumniList = useMemo(() => filteredList.filter(p => p.kind === 'alumni'), [filteredList]);
  const studentsList = useMemo(() => filteredList.filter(p => p.kind === 'student'), [filteredList]);

  const visibleMentors = useMemo(() => mentorsList.slice(0, mentorLimit), [mentorsList, mentorLimit]);
  const visibleAlumni = useMemo(() => alumniList.slice(0, alumniLimit), [alumniList, alumniLimit]);
  const visibleStudents = useMemo(() => studentsList.slice(0, studentLimit), [studentsList, studentLimit]);

  const handleConnect = async (id: string, name: string) => {
    setPending((p) => [...p, id]);
    try {
      await api.sendConnectionRequest(id);
      toast.success('Connection Sent! ✉️', `Your connection invite to ${name} has been sent.`);
      setPending((p) => p.filter(x => x !== id));
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
      <View className="p-15 items-center justify-center">
        <ActivityIndicator color={SC.primary} size="large" />
      </View>
    );
  }

  const tabBtnBase = "flex-1 py-2.5 rounded-lg items-center justify-center";
  const tabBtnActiveCls = "bg-violet";

  return (
    <View className="w-full pb-10">
      {/* Tab Selector row */}
      <View className="flex-row gap-2 bg-white/3 border border-glass-border rounded-xl p-1.5 mb-4">
        {(['discover', 'connections', 'book', 'requests'] as CategoryTab[]).map((tabKey) => (
          <Pressable 
            key={tabKey}
            onPress={() => setActiveTab(tabKey)}
            className={`${tabBtnBase} ${activeTab === tabKey ? tabBtnActiveCls : ''}`}
            style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}
          >
            <Text className={`${activeTab === tabKey ? 'text-white font-body-bold' : 'font-body-semibold'}`} style={{ color: activeTab === tabKey ? '#fff' : SC.muted, fontSize: 13 }}>
              {tabKey === 'discover' ? 'Discover' : tabKey === 'connections' ? 'My Connections' : tabKey === 'book' ? 'Book a Mentor' : 'Requests'}
              {tabKey === 'requests' && (
                <Text className="ml-1.5 px-1.5 py-px rounded bg-amber-500/18 font-display-bold text-[10px]" style={{ color: '#F59E0B' }}>{incomingRequests.length + sentRequests.length}</Text>
              )}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Global Search bar */}
      <View className="gap-2 mb-4">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-black/25 border border-glass-border rounded-xl px-3 h-[42px]">
            <Search size={16} color={SC.dim} className="mr-2" />
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
              className="flex-1 text-white font-body-medium text-[13px]"
              style={Platform.OS === 'web' ? { outlineStyle: 'none' } : {}}
            />
            {searchQuery ? (
              <Pressable onPress={() => { setSearchQuery(''); setQ(''); setDbSearchStatus('idle'); setDbStatusMsg(''); }} className="p-1">
                <X size={14} color={SC.dim} />
              </Pressable>
            ) : null}
          </View>

          <Pressable 
            onPress={() => handleDatabaseSearch()}
            disabled={dbSearchStatus === 'searching'}
            className="flex-row items-center justify-center bg-blue-500 rounded-xl px-3.5 h-[42px]"
            style={dbSearchStatus === 'searching' ? { opacity: 0.7 } : {}}
          >
            {dbSearchStatus === 'searching' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Search size={13} color="#FFFFFF" className="mr-1" />
                <Text className="text-white font-body-medium text-[13px] font-semibold">Search DB</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Status Feedback Banner */}
        {dbSearchStatus !== 'idle' && (
          <View className="flex-row items-center px-3 py-2 rounded-lg border" style={{
            ...(dbSearchStatus === 'searching' ? { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' } : {}),
            ...(dbSearchStatus === 'success' ? { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' } : {}),
            ...(dbSearchStatus === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}),
          }}>
            {dbSearchStatus === 'searching' && <ActivityIndicator size="small" color="#60A5FA" className="mr-2" />}
            {dbSearchStatus === 'success' && <Check size={14} color="#34D399" className="mr-2" />}
            {dbSearchStatus === 'error' && <X size={14} color="#F87171" className="mr-2" />}
            <Text className="font-body-medium text-xs" style={{
              color: dbSearchStatus === 'searching' ? '#60A5FA' : dbSearchStatus === 'success' ? '#34D399' : '#F87171'
            }}>
              {dbStatusMsg}
            </Text>
          </View>
        )}
      </View>

      {/* Discover Tab */}
      {activeTab === 'discover' && (
        <View className="gap-4">
          {/* Secondary Sub-filters Row */}
          <View className="flex-row flex-wrap gap-2 mb-1">
            {['everyone', 'students', 'alumnis', 'mentors', 'industry'].map((f) => {
              const filterLabels: Record<string, string> = { everyone: 'Everyone', students: 'Students', alumnis: 'Alumni', mentors: 'Mentors', industry: 'Industry' };
              const isActive = filter === f;
              return (
                <Pressable 
                  key={f}
                  onPress={() => setFilter(f as FilterType)}
                  className="px-3.5 py-2 rounded-[20px] border"
                  style={{ backgroundColor: isActive ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255,255,255,0.03)', borderColor: isActive ? 'rgba(20, 184, 166, 0.35)' : 'rgba(255,255,255,0.06)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
                >
                  <Text className={isActive ? 'text-teal font-body-bold' : 'font-body-semibold'} style={{ color: isActive ? '#5EEAD4' : SC.muted, fontSize: 12 }}>
                    {filterLabels[f] || f}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Discover Sub-category Pill Filters Row */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {(['interest', 'path', 'college', 'recommended', 'expand'] as DiscoverSubTab[]).map((subTab) => {
              const labels: Record<string, string> = { interest: 'Matched by Interest', path: 'Matched by Career Path', college: 'From Your College', recommended: 'Recommended Mentors', expand: 'Expand Your Horizons' };
              const icons: Record<string, any> = { interest: Heart, path: Settings, college: GraduationCap, recommended: Users, expand: Activity };
              const colors: Record<string, string> = { interest: '#5EEAD4', path: '#F97316', college: '#3B82F6', recommended: '#F59E0B', expand: '#EC4899' };
              const counts: Record<string, number> = { interest: discoverCounts.interest, path: discoverCounts.path, college: discoverCounts.college, recommended: discoverCounts.recommended, expand: discoverCounts.expand };
              const isActive = discoverSubTab === subTab;
              const Icon = icons[subTab];
              const color = colors[subTab];

              return (
                <Pressable 
                  key={subTab}
                  onPress={() => setDiscoverSubTab(subTab)}
                  className={`${tabBtnBase} flex-row`}
                  style={{ ...(isActive ? { backgroundColor: SC.primary } : {}), ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
                >
                  <Icon size={12} color={isActive ? color : '#E2E8F0'} className="mr-1.5" />
                  <Text className={`${isActive ? 'text-white font-body-bold' : ''}`} style={{ color: isActive ? '#fff' : '#E2E8F0', fontSize: 13 }}>{labels[subTab]}</Text>
                  <View className="ml-1.5 px-1.5 py-px rounded" style={{ backgroundColor: isActive ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255,255,255,0.06)' }}>
                    <Text className="font-display-bold text-[9.5px]" style={{ color: color }}>{counts[subTab]}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Matched list view */}
          {filteredMatchedDiscover.length > 0 && (
            <View className="gap-3.5 mb-4">
              <Pressable 
                onPress={() => setShowMatchedInterest(!showMatchedInterest)} 
                className="flex-row items-center border-b pb-2.5"
                style={{ borderBottomColor: SC.border, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
              >
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-white font-display-bold text-[15px] tracking-tight">
                      {discoverSubTab === 'interest' ? 'Matched by Interest' : discoverSubTab === 'path' ? 'Matched by Career Path' : discoverSubTab === 'college' ? 'From Your College' : discoverSubTab === 'recommended' ? 'Recommended Mentors' : 'Expand Your Horizons'}
                    </Text>
                    <View className="px-1.5 py-px rounded bg-teal/10">
                      <Text className="font-display-bold text-[9.5px] text-teal">{filteredMatchedDiscover.length}</Text>
                    </View>
                  </View>
                  <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>{activeSection?.subtitle || 'Based on your profile matching criteria.'}</Text>
                </View>
                <Pressable onPress={() => setShowMatchedInterest(!showMatchedInterest)} className="flex-row items-center px-2.5 h-7 rounded bg-teal/5" style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}>
                  <Text className="text-teal font-body-bold text-[11px]">{showMatchedInterest ? 'Show less' : 'Show more'}</Text>
                  {showMatchedInterest ? <ChevronUp size={12} color="#5EEAD4" className="ml-1" /> : <ChevronDown size={12} color="#5EEAD4" className="ml-1" />}
                </Pressable>
              </Pressable>

              {showMatchedInterest && (
                <View className="flex-row flex-wrap gap-3">
                  {filteredMatchedDiscover.map((person) => (
                    <View key={person.id} className="flex-col flex-grow flex-basis-[280px] max-w-[350px] h-[280px] justify-between bg-glass border border-glass-border rounded-2xl p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                      <View>
                        <View className="flex-row items-center">
                          <Av initials={person.avatar} size={42} color={person.color} />
                          <View className="flex-1 min-w-0 ml-2.5">
                            <View className="flex-row items-center gap-1.5 flex-wrap">
                              <Text numberOfLines={1} className="text-white font-body-bold text-[14.5px]">{person.name}</Text>
                              <View className={
                                person.tag === 'Student' ? pillStudent : person.tag === 'Mentor' ? pillMentor : pillAlumni
                              }>
                                <Text className={
                                  person.tag === 'Student' ? pillStudentText : person.tag === 'Mentor' ? pillMentorText : pillAlumniText
                                }>{person.tag}</Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>{person.role}</Text>
                            <Text numberOfLines={1} style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 10.5 }}>
                              {person.company ? `${person.company} • ` : ''}{person.college}{person.year ? ` • ${person.year}` : ''}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                          {person.tags.map((skill: string, sIdx: number) => (
                            <View key={sIdx} className="px-2 py-1 rounded-md bg-white/3 border border-white/5">
                              <Text style={{ color: SC.dim, fontFamily: FONTS.bold, fontSize: 10 }}>{skill}</Text>
                            </View>
                          ))}
                        </View>

                        <View className="flex-row items-center mt-0.5">
                          <Users size={12} color={SC.dim} className="mr-1.5" />
                          <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{person.mutual} mutual connections</Text>
                        </View>
                      </View>

                      <View className="flex-col gap-2 mt-3.5" style={{ borderTopColor: SC.border, borderTopWidth: 1, paddingTop: 12 }}>
                        {person.connectionState === 'connected' ? (
                          <View className="flex-row items-center justify-center h-8 rounded-md border" style={{ borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.06)' }}>
                            <Check size={12} color="#86EFAC" className="mr-1.5" />
                            <Text className="text-green-300 font-body-bold text-[11.5px]">Connected</Text>
                          </View>
                        ) : person.connectionState === 'pending' || localSent.includes(person.id) ? (
                          <View className="flex-row items-center justify-center h-8 rounded-md border" style={{ borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.06)' }}>
                            <Clock size={12} color="#FDE047" className="mr-1.5" />
                            <Text className="text-yellow-200 font-body-bold text-[11.5px]">Pending Invite</Text>
                          </View>
                        ) : person.connectionState === 'incoming' ? (
                          <Pressable 
                            onPress={() => handleAcceptRequest(person.id, person.name)}
                            className="flex-row items-center justify-center h-8 rounded-md border border-teal bg-teal-500"
                            style={({ hovered }: any) => [hovered && { opacity: 0.9 }]}
                          >
                            <Check size={12} color="#090D16" className="mr-1.5" />
                            <Text className="text-[#090D16] font-body-bold text-[11.5px]">Accept Connection</Text>
                          </Pressable>
                        ) : (
                          <Pressable 
                            onPress={() => handleConnect(person.id, person.name)}
                            disabled={pending.includes(person.id)}
                            className="flex-row items-center justify-center h-8 rounded-md border border-white/8 bg-white/4"
                            style={({ hovered }: any) => [hovered && !pending.includes(person.id) && { borderColor: '#5EEAD4', backgroundColor: 'rgba(94, 234, 212, 0.1)' }]}
                          >
                            {pending.includes(person.id) ? (
                              <ActivityIndicator size="small" color="#5EEAD4" />
                            ) : (
                              <>
                                <UserPlus size={12} color="#5EEAD4" className="mr-1.5" />
                                <Text className="text-[#5EEAD4] font-body-bold text-[11.5px]">Connect</Text>
                              </>
                            )}
                          </Pressable>
                        )}

                        <View className="flex-row justify-between items-center w-full gap-1.5">
                          <Pressable 
                            onPress={() => setPickedPerson(person)}
                            className="flex-1 flex-row items-center justify-center h-8 rounded-md bg-teal-500"
                            style={({ hovered }: any) => [{ height: 32 }, hovered && { backgroundColor: '#5EEAD4' }]}
                          >
                            <Eye size={12} color="#090D16" className="mr-1.5" />
                            <Text className="text-[#090D16] font-body-bold text-[11px]">View Profile</Text>
                          </Pressable>

                          <View className="flex-row gap-1.5">
                            <Pressable onPress={() => toast.info('Starting chat', `Opening messages with ${person.name}`)} className="w-8 h-8 rounded-md items-center justify-center border" style={{ borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-md items-center justify-center" style={{ backgroundColor: '#0A66C2' }}>
                              <LinkedinGlyph size={13} color="#fff" />
                            </Pressable>
                            {person.github && (
                              <Pressable onPress={() => person.github ? Linking.openURL(person.github.startsWith('http') ? person.github : `https://${person.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-md items-center justify-center" style={{ backgroundColor: '#24292e' }}>
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
            <View className="bg-glass border border-glass-border rounded-2xl p-6 items-center justify-center gap-1.5 mt-2.5 text-center">
              <Sparkles size={22} color={SC.tealP} className="mb-2" />
              <Text className="text-white font-display-bold text-base">No Matches Found</Text>
              <Text className="text-muted font-body-medium text-[12.5px] leading-[18px] text-center max-w-[420px] mb-2">
                There are no matching network accounts in the database for this category right now.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <View className="gap-4">
          {/* Incoming Requests */}
          <View className="bg-glass border border-glass-border rounded-2xl p-4 gap-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }}>
            <View className="flex-row items-center border-b pb-2.5" style={{ borderBottomColor: SC.border }}>
              <Clock size={16} color="#F59E0B" className="mr-2" />
              <Text className="font-display-bold text-[13px] tracking-widest" style={{ color: '#F59E0B' }}>INCOMING REQUESTS ({incomingRequests.length})</Text>
            </View>

            <View className="gap-2 mt-2.5">
              {incomingRequests.map((req) => {
                const tagStyle = req.role === 'Student' ? pillStudent : req.role === 'Mentor' ? pillMentor : req.role === 'Industry' ? pillIndustry : pillAlumni;
                const tagTextStyle = req.role === 'Student' ? pillStudentText : req.role === 'Mentor' ? pillMentorText : req.role === 'Industry' ? pillIndustryText : pillAlumniText;

                return (
                  <View key={req.id} className="flex-row items-center bg-white/2 border border-white/4 rounded-xl p-3 min-h-[64px]">
                    <Av initials={req.avatar} size={42} color={req.color} />
                    <View className="flex-1 min-w-0 ml-3">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-white font-body-bold text-sm">{req.name}</Text>
                        <View className={tagStyle}>
                          <Text className={tagTextStyle}>{req.role}</Text>
                        </View>
                        <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginLeft: 4 }}>{req.time}</Text>
                      </View>
                      <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>{req.subtitle}</Text>
                      {req.message ? (
                        <Text className="text-teal font-body-medium text-[11.5px] mt-1 italic">
                          Note: "{req.message}"
                        </Text>
                      ) : null}
                    </View>

                    <View className="flex-row gap-2">
                      <Pressable 
                        onPress={() => handleAcceptRequest(req.id, req.name)}
                        className="h-8 rounded-md bg-teal-500 px-3 items-center justify-center"
                        style={({ hovered }: any) => [hovered && { backgroundColor: '#5EEAD4' }]}
                      >
                        <Text className="text-[#090D16] font-display-bold text-xs">Accept</Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => handleIgnoreRequest(req.id, req.name)}
                        className="h-8 rounded-md bg-white/3 border border-white/8 px-3 items-center justify-center"
                        style={({ hovered }: any) => [hovered && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                      >
                        <Text className="text-muted font-body-bold text-xs">Ignore</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {incomingRequests.length === 0 && (
                <Text className="text-dim font-body-medium text-[12.5px] py-3.5 text-center">No pending incoming requests.</Text>
              )}
            </View>
          </View>

          {/* Sent Requests */}
          <View className="bg-glass border border-glass-border rounded-2xl p-4 gap-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }}>
            <View className="flex-row items-center border-b pb-2.5" style={{ borderBottomColor: SC.border }}>
              <Users size={16} color="#14B8A6" className="mr-2" />
              <Text className="font-display-bold text-[13px] tracking-widest" style={{ color: '#14B8A6' }}>SENT REQUESTS ({sentRequests.length})</Text>
            </View>

            <View className="gap-2 mt-2.5">
              {sentRequests.map((req) => {
                const tagStyle = req.role === 'Student' ? pillStudent : req.role === 'Mentor' ? pillMentor : req.role === 'Industry' ? pillIndustry : pillAlumni;
                const tagTextStyle = req.role === 'Student' ? pillStudentText : req.role === 'Mentor' ? pillMentorText : req.role === 'Industry' ? pillIndustryText : pillAlumniText;

                return (
                <View key={req.id} className="flex-row items-center bg-white/2 border border-white/4 rounded-xl p-3 min-h-[64px]">
                  <Av initials={req.avatar} size={42} color={req.color} />
                  <View className="flex-1 min-w-0 ml-3">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-white font-body-bold text-sm">{req.name}</Text>
                      <View className={tagStyle}>
                        <Text className={tagTextStyle}>{req.role}</Text>
                      </View>
                      <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 10.5, marginLeft: 4 }}>{req.time}</Text>
                    </View>
                    <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>{req.subtitle}</Text>
                  </View>

                  <View className="flex-row items-center px-2.5 h-7 rounded-[20px] border" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.22)' }}>
                    <Clock size={11} color="#FCD34D" className="mr-1" />
                    <Text className="text-amber-200 font-body-bold text-[11px]">Pending</Text>
                  </View>
                </View>
                );
              })}

              {sentRequests.length === 0 && (
                <Text className="text-dim font-body-medium text-[12.5px] py-3.5 text-center">No pending sent requests.</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Connections tab */}
      {activeTab === 'connections' && (
        <View className="gap-4">
          <View className="flex-row items-center border-b pb-3" style={{ borderBottomColor: SC.border }}>
            <View className="w-8 h-8 rounded-lg items-center justify-center mr-2.5" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <Users size={14} color="#86EFAC" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-white font-display-bold text-[15px] tracking-tight">My Connections</Text>
                <View className="px-1.5 py-0.5 rounded bg-white/6">
                  <Text className="font-display-bold text-[10px]" style={{ color: SC.accentBright }}>{connectionsList.length}</Text>
                </View>
              </View>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>People you are actively connected with</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3.5">
            {connectionsList.map((person) => (
              <GlassCard key={person.id} radius={14} padding={16} style={{ flexGrow: 1, flexBasis: 340, maxWidth: 460, minHeight: 220, justifyContent: 'space-between', borderColor: SC.border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
                <View>
                  <View className="flex-row items-center mb-2.5">
                    <Av initials={person.initials} size={46} color={person.color} photo={person.photo} />
                    <View className="flex-1 min-w-0 ml-3">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text numberOfLines={1} className="text-white font-body-bold text-[14.5px]">{person.name}</Text>
                        <View className={person.kind === 'mentor' ? pillMentor : person.kind === 'alumni' ? pillAlumni : pillStudent}>
                          <Text className={person.kind === 'mentor' ? pillMentorText : person.kind === 'alumni' ? pillAlumniText : pillStudentText}>{person.tag}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>{person.role}</Text>
                      <Text numberOfLines={1} style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 10.5 }}>{person.company}</Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5 my-2">
                    {person.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} className="bg-white/3 border border-white/5 px-2 py-1 rounded-md">
                        <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 10 }}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row items-center mt-0.5">
                    <Users size={11} color={SC.dim} className="mr-1.5" />
                    <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{person.mutual} mutual connections</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center border-t pt-3 mt-1" style={{ borderTopColor: SC.border }}>
                  {person.kind === 'mentor' ? (
                    <>
                      <Pressable onPress={() => setPickedPerson(person)} className="flex-row items-center justify-center px-3 h-8 rounded-lg border" style={{ borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'transparent', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                        <Eye size={12} color={SC.accentBright} className="mr-1" />
                        <Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 }}>View Profile</Text>
                      </Pressable>
                      <Pressable onPress={() => setBookingMentor(person)} className="flex-row items-center justify-center px-3 h-8 rounded-lg" style={{ backgroundColor: SC.primary, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                        <Calendar size={12} color="#fff" className="mr-1" />
                        <Text className="text-white font-display-bold text-[11.5px]">Book</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => setPickedPerson(person)} className="flex-row items-center justify-center px-3 h-8 rounded-lg border" style={{ borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'transparent', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                        <Eye size={12} color={SC.accentBright} className="mr-1" />
                        <Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 }}>View Profile</Text>
                      </Pressable>
                      <View className="flex-row items-center justify-center px-3 h-8 rounded-lg border" style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.22)' }}>
                        <Check size={11} color={SC.green} className="mr-1" />
                        <Text className="text-green-300 font-body-bold text-[11.5px]">Connected</Text>
                      </View>
                    </>
                  )}

                  <View className="flex-row gap-1">
                    <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg items-center justify-center border" style={{ borderColor: SC.border, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                      <Linkedin size={12} color={SC.muted} />
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            ))}

            {connectionsList.length === 0 && (
              <View className="flex-1 bg-glass border border-glass-border rounded-2xl p-6 items-center justify-center mt-2.5">
                <Users size={24} color={SC.muted} className="mb-2.5" />
                <Text className="text-muted font-body-medium text-[12.5px] text-center">No connections fit the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Book a Mentor tab */}
      {activeTab === 'book' && (
        <View className="gap-4">
          <View className="flex-row items-center border-b pb-3" style={{ borderBottomColor: SC.border }}>
            <View className="w-8 h-8 rounded-lg items-center justify-center mr-2.5" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <Briefcase size={14} color="#86EFAC" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-white font-display-bold text-[15px] tracking-tight">All Mentors</Text>
                <View className="px-1.5 py-0.5 rounded bg-white/6">
                  <Text className="font-display-bold text-[10px]" style={{ color: SC.accentBright }}>{mentorsList.length}</Text>
                </View>
              </View>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>Browse experts and schedule your 1:1 sessions</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3.5">
            {mentorsList.map((m) => (
              <GlassCard key={m.id} radius={14} padding={16} style={{ flexGrow: 1, flexBasis: 340, maxWidth: 460, minHeight: 220, justifyContent: 'space-between', borderColor: SC.border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
                <View>
                  <View className="flex-row items-center mb-2.5">
                    <Av initials={m.initials} size={46} color={m.color} photo={m.photo} />
                    <View className="flex-1 min-w-0 ml-3">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text numberOfLines={1} className="text-white font-body-bold text-[14.5px]">{m.name}</Text>
                        <View className={pillMentor}><Text className={pillMentorText}>MENTOR</Text></View>
                      </View>
                      <Text numberOfLines={1} style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>{m.role}</Text>
                      <Text numberOfLines={1} style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 10.5 }}>{m.company}</Text>
                    </View>
                    
                    <View className="flex-row gap-1 self-start">
                      <Pressable onPress={() => m.linkedin ? Linking.openURL(m.linkedin.startsWith('http') ? m.linkedin : `https://${m.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg items-center justify-center border" style={{ borderColor: SC.border, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                        <Linkedin size={12} color={SC.muted} />
                      </Pressable>
                      {m.github && (
                        <Pressable onPress={() => m.github ? Linking.openURL(m.github.startsWith('http') ? m.github : `https://${m.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg items-center justify-center border" style={{ borderColor: SC.border, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                          <Github size={12} color={SC.muted} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5 my-2">
                    {m.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} className="bg-white/3 border border-white/5 px-2 py-1 rounded-md">
                        <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 10 }}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row items-center gap-3 my-1">
                    <View className="flex-row items-center gap-1">
                      <Star size={11} color={SC.amber} fill={SC.amber} />
                      <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{m.rating}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Clock size={11} color={SC.muted} />
                      <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{m.sessions} sessions</Text>
                    </View>
                    <Text className="ml-auto" style={{ color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 11.5 }}>{m.price}/session</Text>
                  </View>

                  <View className="flex-row items-center mt-0.5">
                    <Users size={11} color={SC.dim} className="mr-1.5" />
                    <Text style={{ color: SC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{m.mutual} mutual connections</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center border-t pt-3 mt-1" style={{ borderTopColor: SC.border }}>
                  <Pressable onPress={() => setPickedPerson(m)} className="flex-1 flex-row items-center justify-center px-3 h-8 rounded-lg border mr-1" style={{ borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'transparent', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                    <Eye size={12} color={SC.accentBright} className="mr-1" />
                    <Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 }}>View Profile</Text>
                  </Pressable>

                  {conn.includes(m.id) || m.connectionState === 'connected' ? (
                    <View className="flex-1 flex-row items-center justify-center px-3 h-8 rounded-lg mr-1" style={{ backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.22)', borderWidth: 1 }}>
                      <Check size={11} color={SC.green} className="mr-1" />
                      <Text className="text-green-300 font-body-bold text-[11.5px]">Connected</Text>
                    </View>
                  ) : pending.includes(m.id) || m.connectionState === 'pending' ? (
                    <View className="flex-1 flex-row items-center justify-center px-3 h-8 rounded-lg mr-1" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.22)', borderWidth: 1 }}>
                      <Clock size={11} color={SC.amber} className="mr-1" />
                      <Text className="text-amber-200 font-body-bold text-[11.5px]">Pending</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleConnect(m.id, m.name)} className="flex-1 flex-row items-center justify-center px-3 h-8 rounded-lg border mr-1" style={{ borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'transparent', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                      <UserPlus size={12} color={SC.accentBright} className="mr-1" />
                      <Text style={{ color: SC.accentBright, fontFamily: FONTS.bold, fontSize: 11.5 }}>Connect</Text>
                    </Pressable>
                  )}

                  <Pressable onPress={() => setBookingMentor(m)} className="flex-[1.1] flex-row items-center justify-center px-3 h-8 rounded-lg" style={{ backgroundColor: SC.primary, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                    <Calendar size={12} color="#fff" className="mr-1" />
                    <Text className="text-white font-display-bold text-[11.5px]">Book</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}

            {mentorsList.length === 0 && (
              <View className="flex-1 bg-glass border border-glass-border rounded-2xl p-6 items-center justify-center mt-2.5">
                <Users size={24} color={SC.muted} className="mb-2.5" />
                <Text className="text-muted font-body-medium text-[12.5px] text-center">No mentors match the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Profile detail Modal */}
      <Modal visible={!!pickedPerson} animationType="slide" transparent onRequestClose={() => setPickedPerson(null)}>
        <View className="flex-1 bg-black/75 justify-end" style={{ alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch' }}>
          <Pressable onPress={() => setPickedPerson(null)} className="flex-1" />
          <View style={{ backgroundColor: '#0C0818', borderColor: 'rgba(255,255,255,0.08)', borderLeftWidth: Platform.OS === 'web' ? 1 : 0, borderWidth: Platform.OS === 'web' ? 0 : 1, borderTopLeftRadius: Platform.OS === 'web' ? 0 : 20, borderTopRightRadius: Platform.OS === 'web' ? 0 : 20, width: Platform.OS === 'web' ? 440 : '100%', height: Platform.OS === 'web' ? '100%' : '85%', maxHeight: '100%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: -10, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
            <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: SC.border }}>
              <Text className="text-white font-display-bold text-[15px]">
                {pickedPerson?.kind === 'mentor' ? 'Mentor Profile' : pickedPerson?.kind === 'alumni' ? 'Alumni Profile' : 'Student Profile'}
              </Text>
              <Pressable onPress={() => setPickedPerson(null)} className="p-1" style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}>
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
                  <GlassCard radius={12} padding={16} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderRadius: 12 }}>
                    <View className="flex-row items-center gap-3">
                      <Av initials={nameInitials} size={64} color={pickedPerson.color} photo={pickedPerson.photo} />
                      <View className="flex-1 min-w-0">
                        <Text className="text-white font-display-bold text-lg">{pickedPerson.name}</Text>
                        <Text className="text-muted font-body-medium text-[12.5px] mt-1">{titleLine}</Text>
                        <Text className="text-dim font-body-medium text-[11.5px] mt-0.5">{collegeLine}</Text>
                      </View>
                      
                      <View className="flex-row gap-1.5 self-start">
                        {pickedPerson.linkedin && (
                          <Pressable onPress={() => pickedPerson.linkedin ? Linking.openURL(pickedPerson.linkedin.startsWith('http') ? pickedPerson.linkedin : `https://${pickedPerson.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.09)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                            <Linkedin size={14} color="#fff" />
                          </Pressable>
                        )}
                        {pickedPerson.github && (
                          <Pressable onPress={() => pickedPerson.github ? Linking.openURL(pickedPerson.github.startsWith('http') ? pickedPerson.github : `https://${pickedPerson.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.09)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}>
                            <Github size={14} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </GlassCard>

                  <GlassCard radius={12} padding={16} style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderRadius: 12 }}>
                    <Text className="text-white/75 font-body-medium text-[13px] leading-[18px]">{bioText}</Text>
                  </GlassCard>

                  {pickedPerson.kind === 'mentor' && (
                    <View className="gap-2">
                      <Text className="text-amber-500 font-body-bold text-[11px] tracking-widest">MENTOR STATS</Text>
                      <View className="flex-row gap-2">
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text className="text-white font-display-bold text-[15px]">{pickedPerson.rating}★</Text>
                          <Text className="text-muted font-body-medium text-[10px] mt-1">Rating</Text>
                        </GlassCard>
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text className="text-white font-display-bold text-[15px]">{pickedPerson.sessions}</Text>
                          <Text className="text-muted font-body-medium text-[10px] mt-1">Sessions</Text>
                        </GlassCard>
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text className="text-white font-display-bold text-[13px]" numberOfLines={1}>{pickedPerson.price}</Text>
                          <Text className="text-muted font-body-medium text-[10px] mt-1">Price</Text>
                        </GlassCard>
                      </View>
                    </View>
                  )}

                  <View className="gap-2">
                    <Text className="text-white/50 font-body-bold text-[11px] tracking-widest">SKILLS</Text>
                    <View className="flex-row flex-wrap gap-1.5 my-2">
                      {pickedPerson.tags && pickedPerson.tags.map((tag: string, idx: number) => (
                        <View key={idx} className="bg-white/3 border border-white/5 px-2 py-1 rounded-md">
                          <Text style={{ color: SC.muted, fontFamily: FONTS.bold, fontSize: 10 }}>{tag}</Text>
                        </View>
                      ))}
                      {(!pickedPerson.tags || pickedPerson.tags.length === 0) && (
                        <Text className="text-muted font-body-medium text-xs">No specified skills.</Text>
                      )}
                    </View>
                  </View>

                  <View className="mt-2">
                    {pickedPerson.kind === 'mentor' ? (
                      <View className="flex-row gap-2.5">
                        {isConnected ? (
                          <View className="flex-1 h-[44px] rounded-[10px] flex-row items-center justify-center border" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }}>
                            <Check size={16} color={SC.green} className="mr-1.5" />
                            <Text className="text-green-500 font-body-bold text-sm">Connected</Text>
                          </View>
                        ) : isPending ? (
                          <View className="flex-1 h-[44px] rounded-[10px] flex-row items-center justify-center border" style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }}>
                            <Clock size={16} color={SC.amber} className="mr-1.5" />
                            <Text className="text-amber-500 font-body-bold text-sm">Pending</Text>
                          </View>
                        ) : (
                          <Pressable 
                            onPress={() => handleConnect(pickedPerson.id, pickedPerson.name)}
                            className="flex-1 h-[44px] rounded-[10px] flex-row items-center justify-center border"
                            style={{ backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
                          >
                            <UserPlus size={16} color={SC.accentBright} className="mr-1.5" />
                            <Text style={{ color: SC.accentBright, fontFamily: FONTS.xbold, fontSize: 14 }}>Connect</Text>
                          </Pressable>
                        )}
                        
                        <Pressable 
                          onPress={() => handleOpenBooking(pickedPerson)} 
                          className="flex-[1.2] h-[44px] rounded-[10px] flex-row items-center justify-center"
                          style={{ backgroundColor: SC.primary, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
                        >
                          <Calendar size={16} color="#fff" className="mr-2" />
                          <Text className="text-white font-display-bold text-sm">Book Session</Text>
                        </Pressable>
                      </View>
                    ) : isConnected ? (
                      <View className="h-[44px] rounded-[10px] flex-row items-center justify-center border" style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }}>
                        <Check size={16} color={SC.green} className="mr-1.5" />
                        <Text className="text-green-500 font-body-bold text-sm">Connected</Text>
                      </View>
                    ) : isPending ? (
                      <View className="h-[44px] rounded-[10px] flex-row items-center justify-center border" style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }}>
                        <Clock size={16} color={SC.amber} className="mr-1.5" />
                        <Text className="text-amber-500 font-body-bold text-sm">Request Pending</Text>
                      </View>
                    ) : (
                      <Pressable 
                        onPress={() => handleConnect(pickedPerson.id, pickedPerson.name)}
                        className="h-[44px] rounded-[10px] flex-row items-center justify-center"
                        style={{ backgroundColor: SC.primary, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
                      >
                        <UserPlus size={16} color="#fff" className="mr-1.5" />
                        <Text className="text-white font-display-bold text-sm">+ Connect</Text>
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
        <View className="flex-1 bg-black/82 items-center justify-center p-5">
          <Pressable onPress={() => setBookingMentor(null)} className="absolute inset-0" />
          {bookingMentor && (
            <View style={{ backgroundColor: '#0C0818', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 20, width: Platform.OS === 'web' ? 480 : '100%', maxWidth: 480, maxHeight: '90%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
              <View className="flex-row items-center justify-between p-4 border-b" style={{ borderBottomColor: SC.border }}>
                <Text className="text-white font-display-bold text-base">Book Session</Text>
                <Pressable onPress={() => setBookingMentor(null)} className="p-1" style={Platform.OS === 'web' ? { cursor: 'pointer' } : {}}>
                  <X size={16} color={SC.text} />
                </Pressable>
              </View>

              <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 16 }}>
                <View className="items-center gap-2 py-3">
                  <Av initials={bookingMentor.initials} size={64} color={bookingMentor.color} photo={bookingMentor.photo} />
                  <Text className="text-white font-display-bold text-lg text-center">{bookingMentor.name}</Text>
                  <Text className="text-muted font-body-medium text-[13px] text-center">{bookingMentor.role || 'Mentor'}</Text>
                  <View className="flex-row items-center gap-1.5">
                    <Star size={14} color={SC.amber} fill={SC.amber} />
                    <Text className="text-white font-body-bold text-[12.5px]">{bookingMentor.rating}</Text>
                    <Text className="text-muted font-body-medium text-[12.5px]">· {bookingMentor.sessions} sessions</Text>
                  </View>
                  
                  {bookingMentor.tags && bookingMentor.tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-1.5 justify-center mt-1">
                      {bookingMentor.tags.map((t: string) => (
                        <View key={t} className="bg-purple-500/12 px-2.5 py-1 rounded-full">
                          <Text className="text-purple-300 font-body-bold text-[9.5px] uppercase">{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View className="gap-1.5">
                  <Text className="text-white/50 font-body-bold text-[11px] tracking-widest">ABOUT</Text>
                  <GlassCard radius={12} padding={14} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                    <Text className="text-white/75 font-body-medium text-[12.5px] leading-[18px]">
                      {bookingMentor.bio || 'Experienced professional ready to share industry insights, career strategies, and guidance.'}
                    </Text>
                  </GlassCard>
                </View>

                <View className="gap-1.5">
                  <View className="flex-row items-center gap-1.5">
                    <Calendar size={14} color={SC.accentBright} />
                    <Text className="text-white font-body-bold text-[13.5px]">Available Slots</Text>
                  </View>
                  <Text className="text-muted font-body-medium text-[11.5px]">
                    30-minute 1:1 sessions. Pick a slot that works for you.
                  </Text>
                  
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {bookingSlots.map((slot, idx) => {
                      const isSelected = bookingSlot?.iso === slot.iso;
                      return (
                        <Pressable 
                          key={idx} 
                          onPress={() => setBookingSlot(slot)}
                          className="flex-row items-center px-4 py-2.5 rounded-[10px] border"
                          style={{ backgroundColor: isSelected ? 'rgba(139,92,246,0.20)' : 'rgba(255,255,255,0.03)', borderColor: isSelected ? SC.primary : 'rgba(255,255,255,0.08)', borderWidth: 1, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
                        >
                          <Clock size={12} color={isSelected ? '#fff' : SC.accentBright} className="mr-1.5" />
                          <Text className={isSelected ? 'text-white font-body-bold text-xs' : 'text-muted font-body-bold text-xs'}>{slot.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="text-white/50 font-body-bold text-[11px] tracking-widest">WHAT WOULD YOU LIKE TO DISCUSS?</Text>
                  <TextInput
                    value={bookingTopic}
                    onChangeText={setBookingTopic}
                    placeholder="e.g., How do I prepare for FAANG interviews?"
                    placeholderTextColor={SC.dim}
                    multiline
                    numberOfLines={3}
                    className="bg-black/25 border border-glass-border rounded-[10px] p-3 text-white font-body-medium text-[13px]"
                    style={{ height: 80, textAlignVertical: 'top', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) }}
                  />
                </View>

                <Pressable 
                  disabled={!bookingSlot || !bookingTopic.trim() || bookingSubmitting}
                  onPress={handleConfirmBooking}
                  className="h-[46px] rounded-xl items-center justify-center mt-3"
                  style={{ backgroundColor: (!bookingSlot || !bookingTopic.trim()) ? 'rgba(255,255,255,0.05)' : SC.primary, borderWidth: (!bookingSlot || !bookingTopic.trim()) ? 1 : 0, borderColor: 'rgba(255,255,255,0.08)', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) }}
                >
                  {bookingSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View className="flex-row items-center gap-1.5">
                      <MessageSquare size={16} color="#fff" className="mr-1" />
                      <Text className="text-white font-display-bold text-sm">Confirm session</Text>
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
