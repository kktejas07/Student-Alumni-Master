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
} from '../iconShims';
import { ChevronUp, ChevronDown, Activity, Heart, Settings, Sparkles, User, Link2, Code } from 'lucide-react-native';
import { SC, FONTS } from '../tokens';
import { GRAD } from '../portalkit';
import { GlassCard } from '../glass';
import { Av, Badge } from '../atoms';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { useToast } from '@/src/views/components';
import { request, api } from '@/src/models/services/api';

import { StudentPortalNavContext } from '../StudentPortalNavContext';

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
      const color = p.color || '#6366F1';
      
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
        github: p.github || 'github.com',
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
      <View className="p-[60px] items-center justify-center">
        <ActivityIndicator color={SC.primary} size="large" />
      </View>
    );
  }

  return (
    <View className="w-full pb-10">
      
      <View className="flex-row gap-2 bg-white/[0.03] border border-glass-border rounded-xl p-1.5 mb-4">
        <Pressable 
          onPress={() => setActiveTab('discover')} 
          className={`flex-1 py-2.5 rounded-lg items-center justify-center bg-transparent ${activeTab === 'discover' ? 'bg-violet' : ''}`}
          style={{ cursor: 'pointer' } as any}
        >
          <Text className={`text-[13px] ${activeTab === 'discover' ? 'text-white font-bold' : 'text-muted font-semibold'}`}>Discover</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('connections')} 
          className={`flex-1 py-2.5 rounded-lg items-center justify-center bg-transparent ${activeTab === 'connections' ? 'bg-violet' : ''}`}
          style={{ cursor: 'pointer' } as any}
        >
          <Text className={`text-[13px] ${activeTab === 'connections' ? 'text-white font-bold' : 'text-muted font-semibold'}`}>My Connections</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('book')} 
          className={`flex-1 py-2.5 rounded-lg items-center justify-center bg-transparent ${activeTab === 'book' ? 'bg-violet' : ''}`}
          style={{ cursor: 'pointer' } as any}
        >
          <Text className={`text-[13px] ${activeTab === 'book' ? 'text-white font-bold' : 'text-muted font-semibold'}`}>Book a Mentor</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('requests')} 
          className={`flex-1 py-2.5 rounded-lg items-center justify-center bg-transparent flex-row items-center ${activeTab === 'requests' ? 'bg-violet' : ''}`}
          style={{ cursor: 'pointer' } as any}
        >
          <Text className={`text-[13px] ${activeTab === 'requests' ? 'text-white font-bold' : 'text-muted font-semibold'}`}>Requests</Text>
          <View className={`ml-1.5 px-1.5 py-[1px] rounded-md ${activeTab === 'requests' ? 'bg-black/[0.15]' : 'bg-amber-soft/18'}`}>
            <Text className={`text-[10px] ${activeTab === 'requests' ? 'text-black' : 'text-amber font-extrabold'}`}>{incomingRequests.length + sentRequests.length}</Text>
          </View>
        </Pressable>
      </View>

      <View className="gap-2 mb-4">
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-black/25 border border-glass-border rounded-[10px] px-3 h-[42px]">
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
              className="flex-1 text-white text-[13px]"
              style={{ fontFamily: FONTS.med, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) }}
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
            className={`flex-row items-center justify-center bg-blue rounded-[10px] px-3.5 h-[42px] ${dbSearchStatus === 'searching' ? 'opacity-70' : ''}`}
          >
            {dbSearchStatus === 'searching' ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Search size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text className="text-white text-[13px] font-semibold">Search DB</Text>
              </>
            )}
          </Pressable>
        </View>

        {dbSearchStatus !== 'idle' && (
          <View className={`flex-row items-center px-3 py-2 rounded-lg border ${
            dbSearchStatus === 'searching' ? 'bg-blue/10 border-blue/30' :
            dbSearchStatus === 'success' ? 'bg-green/10 border-green/30' :
            'bg-red/10 border-red/30'
          }`}>
            {dbSearchStatus === 'searching' && <ActivityIndicator size="small" color="#60A5FA" style={{ marginRight: 8 }} />}
            {dbSearchStatus === 'success' && <Check size={14} color="#34D399" style={{ marginRight: 8 }} />}
            {dbSearchStatus === 'error' && <X size={14} color="#F87171" style={{ marginRight: 8 }} />}
            <Text className="text-[12px]" style={{
              fontFamily: FONTS.med,
              color: dbSearchStatus === 'searching' ? '#60A5FA' :
                     dbSearchStatus === 'success' ? '#34D399' : '#F87171'
            }}>
              {dbStatusMsg}
            </Text>
          </View>
        )}
      </View>

      {activeTab === 'discover' && (
        <View className="gap-4">
          
          <View className="flex-row flex-wrap gap-2 mb-1">
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
                className={`px-3.5 py-2 rounded-[20px] bg-white/[0.03] border border-white/[0.06] ${filter === f ? 'bg-teal/[0.15] border-teal/[0.35]' : ''}`}
                style={{ cursor: 'pointer' } as any}
              >
                <Text className={`text-xs ${filter === f ? 'text-teal-light font-bold' : 'text-muted font-semibold'}`}>
                  {filterLabels[f] || f}
                </Text>
              </Pressable>
              );
            })}
          </View>

          <View className="flex-row flex-wrap gap-2 mb-3">
            <Pressable 
              onPress={() => setDiscoverSubTab('interest')}
              className={`flex-row items-center px-3 py-2 rounded-[20px] bg-white/[0.03] border border-white/[0.05] ${discoverSubTab === 'interest' ? 'bg-violet border-teal/[0.25] bg-teal/[0.08]' : ''}`}
              style={{ cursor: 'pointer' } as any}
            >
              <Heart size={12} color={discoverSubTab === 'interest' ? '#5EEAD4' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className={`text-[11.5px] ${discoverSubTab === 'interest' ? 'text-teal-light font-bold' : 'text-gray-200 font-semibold'}`}>Matched by Interest</Text>
              <View className={`ml-1.5 px-1.5 py-[1px] rounded-md ${discoverSubTab === 'interest' ? 'bg-teal/[0.15]' : 'bg-white/[0.06]'}`}><Text className="text-teal-light text-[9.5px] font-extrabold">{discoverCounts.interest}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('path')}
              className={`flex-row items-center px-3 py-2 rounded-[20px] bg-white/[0.03] border border-white/[0.05] ${discoverSubTab === 'path' ? 'bg-violet border-teal/[0.25] bg-teal/[0.08]' : ''}`}
              style={{ cursor: 'pointer' } as any}
            >
              <Settings size={12} color={discoverSubTab === 'path' ? '#F97316' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[11.5px] text-gray-200 font-semibold">Matched by Career Path</Text>
              <View className="ml-1.5 px-1.5 py-[1px] rounded-md" style={{ backgroundColor: 'rgba(249,115,22,0.1)' }}><Text className="text-[9.5px] font-extrabold" style={{ color: '#F97316' }}>{discoverCounts.path}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('college')}
              className={`flex-row items-center px-3 py-2 rounded-[20px] bg-white/[0.03] border border-white/[0.05] ${discoverSubTab === 'college' ? 'bg-violet border-teal/[0.25] bg-teal/[0.08]' : ''}`}
              style={{ cursor: 'pointer' } as any}
            >
              <GraduationCap size={12} color={discoverSubTab === 'college' ? '#3B82F6' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[11.5px] text-gray-200 font-semibold">From Your College</Text>
              <View className="ml-1.5 px-1.5 py-[1px] rounded-md" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}><Text className="text-[9.5px] font-extrabold" style={{ color: '#3B82F6' }}>{discoverCounts.college}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('recommended')}
              className={`flex-row items-center px-3 py-2 rounded-[20px] bg-white/[0.03] border border-white/[0.05] ${discoverSubTab === 'recommended' ? 'bg-violet border-teal/[0.25] bg-teal/[0.08]' : ''}`}
              style={{ cursor: 'pointer' } as any}
            >
              <Users size={12} color={discoverSubTab === 'recommended' ? '#F59E0B' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[11.5px] text-gray-200 font-semibold">Recommended Mentors</Text>
              <View className="ml-1.5 px-1.5 py-[1px] rounded-md" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}><Text className="text-[9.5px] font-extrabold" style={{ color: '#F59E0B' }}>{discoverCounts.recommended}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('expand')}
              className={`flex-row items-center px-3 py-2 rounded-[20px] bg-white/[0.03] border border-white/[0.05] ${discoverSubTab === 'expand' ? 'bg-violet border-teal/[0.25] bg-teal/[0.08]' : ''}`}
              style={{ cursor: 'pointer' } as any}
            >
              <Activity size={12} color={discoverSubTab === 'expand' ? '#EC4899' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[11.5px] text-gray-200 font-semibold">Expand Your Horizons</Text>
              <View className="ml-1.5 px-1.5 py-[1px] rounded-md" style={{ backgroundColor: 'rgba(236,72,153,0.1)' }}><Text className="text-[9.5px] font-extrabold" style={{ color: '#EC4899' }}>{discoverCounts.expand}</Text></View>
            </Pressable>
          </View>

          {filteredMatchedDiscover.length > 0 && (
            <View className="gap-3.5 mb-4">
              <Pressable 
                onPress={() => setShowMatchedInterest(!showMatchedInterest)} 
                className="flex-row items-center border-b border-glass-border pb-2.5"
                style={{ cursor: 'pointer' } as any}
              >
                {discoverSubTab === 'interest' ? <Heart size={18} color="#5EEAD4" style={{ marginRight: 8 }} /> : discoverSubTab === 'path' ? <Briefcase size={18} color="#F97316" style={{ marginRight: 8 }} /> : discoverSubTab === 'college' ? <GraduationCap size={18} color="#3B82F6" style={{ marginRight: 8 }} /> : discoverSubTab === 'recommended' ? <Users size={18} color="#F59E0B" style={{ marginRight: 8 }} /> : <Activity size={18} color="#EC4899" style={{ marginRight: 8 }} />}
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-white font-extrabold text-[15px] tracking-tight">
                      {discoverSubTab === 'interest' ? 'Matched by Interest' : discoverSubTab === 'path' ? 'Matched by Career Path' : discoverSubTab === 'college' ? 'From Your College' : discoverSubTab === 'recommended' ? 'Recommended Mentors' : 'Expand Your Horizons'}
                    </Text>
                    <View className="px-1.5 py-[1px] rounded" style={{ backgroundColor: 'rgba(20,184,166,0.1)' }}>
                      <Text className="text-teal-light text-[9.5px] font-extrabold">{filteredMatchedDiscover.length}</Text>
                    </View>
                  </View>
                  <Text className="text-muted text-[11px] mt-0.5">{activeSection?.subtitle || 'Based on your profile matching criteria.'}</Text>
                </View>
                <Pressable onPress={() => setShowMatchedInterest(!showMatchedInterest)} className="flex-row items-center px-2.5 h-7 rounded-md" style={{ backgroundColor: 'rgba(20,184,166,0.06)' }}>
                  <Text className="text-teal-light text-[11px] font-bold">{showMatchedInterest ? 'Show less' : 'Show more'}</Text>
                  {showMatchedInterest ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showMatchedInterest && (
                <View className="flex-row flex-wrap gap-3">
                  {filteredMatchedDiscover.map((person) => (
                    <View key={person.id} className="flex-1 basis-[280px] max-w-[350px] h-[280px] justify-between bg-glass-soft border border-glass-border rounded-card p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                      <View>
                        <View className="flex-row items-center">
                          <Av initials={person.avatar} size={42} color={person.color} />
                          <View className="flex-1 min-w-0 ml-2.5">
                            <View className="flex-row items-center gap-1.5 flex-wrap">
                              <Text numberOfLines={1} className="text-white font-bold text-[14.5px]">{person.name}</Text>
                              <View className={`px-[7px] py-0.5 rounded ${
                                person.tag === 'Student' ? 'bg-green/12' :
                                person.tag === 'Mentor' ? 'bg-teal/[0.15] border border-teal/30' :
                                'bg-blue/[0.15] border border-blue/30'
                              }`}>
                                <Text className={`font-bold text-[9.5px] ${
                                  person.tag === 'Student' ? 'text-green-light' :
                                  person.tag === 'Mentor' ? 'text-green-400' :
                                  'text-blue-light'
                                }`}>{person.tag}</Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} className="text-muted text-[11.5px] mt-0.5">{person.role}</Text>
                            <Text numberOfLines={1} className="text-dim text-[10.5px]">
                              {person.company ? `${person.company} • ` : ''}{person.college}{person.year ? ` • ${person.year}` : ''}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row flex-wrap gap-1.5 mt-0.5">
                          {person.tags.map((skill: string, sIdx: number) => (
                            <View key={sIdx} className="px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05]"><Text className="text-dim text-[10px] font-bold">{skill}</Text></View>
                          ))}
                        </View>

                        <View className="flex-row items-center mt-0.5">
                          <Users size={12} color={SC.dim} style={{ marginRight: 6 }} />
                          <Text className="text-dim text-[11px]">{person.mutual} mutual connections</Text>
                        </View>
                      </View>

                      <View className="mt-3.5 flex-col gap-2 items-stretch">
                        
                        {person.connectionState === 'connected' ? (
                          <View className="flex-row items-center justify-center h-[32px] rounded-md border" style={{ borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.06)' }}>
                            <Check size={12} color="#86EFAC" style={{ marginRight: 6 }} />
                            <Text className="font-bold text-[11.5px]" style={{ color: '#86EFAC' }}>Connected</Text>
                          </View>
                        ) : person.connectionState === 'pending' || localSent.includes(person.id) ? (
                          <View className="flex-row items-center justify-center h-[32px] rounded-md border" style={{ borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.06)' }}>
                            <Clock size={12} color="#FDE047" style={{ marginRight: 6 }} />
                            <Text className="font-bold text-[11.5px]" style={{ color: '#FDE047' }}>Pending Invite</Text>
                          </View>
                        ) : person.connectionState === 'incoming' ? (
                          <Pressable 
                            onPress={() => handleAcceptRequest(person.id, person.name)}
                            style={({ hovered }: any) => [hovered && { opacity: 0.9 }]}
                            className="flex-row items-center justify-center h-[32px] rounded-md border border-teal bg-teal"
                          >
                            <Check size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text className="text-[#090D16] font-bold text-[11.5px]">Accept Connection</Text>
                          </Pressable>
                        ) : (
                          <Pressable 
                            onPress={() => handleConnect(person.id, person.name)}
                            disabled={pending.includes(person.id)}
                            style={({ hovered }: any) => [hovered && !pending.includes(person.id) && { borderColor: '#5EEAD4', backgroundColor: 'rgba(94, 234, 212, 0.1)' }]}
                            className="flex-row items-center justify-center h-[32px] rounded-md border"
                            style={{ borderColor: 'rgba(94, 234, 212, 0.25)', backgroundColor: 'rgba(94, 234, 212, 0.04)', width: '100%' }}
                          >
                            {pending.includes(person.id) ? (
                              <ActivityIndicator size="small" color="#5EEAD4" />
                            ) : (
                              <>
                                <UserPlus size={12} color="#5EEAD4" style={{ marginRight: 6 }} />
                                <Text className="text-teal-light font-bold text-[11.5px]">Connect</Text>
                              </>
                            )}
                          </Pressable>
                        )}

                        <View className="flex-row justify-between items-center w-full gap-1.5">
                          <Pressable 
                            onPress={() => setPickedPerson(person)}
                            style={({ hovered }: any) => [hovered && { backgroundColor: '#5EEAD4' }]}
                            className="flex-row items-center justify-center px-3 h-8 rounded-md bg-teal flex-1"
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text className="text-[#090D16] font-extrabold text-[11px]">View Profile</Text>
                          </Pressable>

                          <View className="flex-row gap-1.5">
                            <Pressable onPress={() => toast.info('Starting chat', `Opening messages with ${person.name}`)} className="items-center justify-center w-8 h-8 rounded-md border" style={{ height: 32, width: 32, borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="items-center justify-center w-8 h-8 rounded-md" style={{ height: 32, width: 32, backgroundColor: '#0A66C2' }}>
                              <LinkedinGlyph size={13} color="#fff" />
                            </Pressable>
                            {person.github && (
                              <Pressable onPress={() => person.github ? Linking.openURL(person.github.startsWith('http') ? person.github : `https://${person.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="items-center justify-center w-8 h-8 rounded-md" style={{ height: 32, width: 32, backgroundColor: '#24292e' }}>
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
            <View className="bg-glass-soft border border-glass-border rounded-card p-6 items-center justify-center gap-1.5 mt-2.5 text-center">
              <Sparkles size={22} color={SC.tealP} style={{ marginBottom: 8 }} />
              <Text className="text-white font-extrabold text-lg">No Matches Found</Text>
              <Text className="text-muted text-[12.5px] leading-[18px] text-center max-w-[420px] mb-2">
                There are no matching network accounts in the database for this category right now.
              </Text>
            </View>
          )}
        </View>
      )}

      

      {activeTab === 'requests' && (
        <View className="gap-4">
          
          <View className="bg-glass-soft border border-glass-border rounded-card p-4 gap-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }}>
            <View className="flex-row items-center border-b border-glass-border pb-2.5">
              <Clock size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text className="font-extrabold text-[13px] tracking-widest" style={{ color: '#F59E0B' }}>INCOMING REQUESTS ({incomingRequests.length})</Text>
            </View>

            <View className="gap-2 mt-2.5">
              {incomingRequests.map((req) => {
                const tagStyle = req.role === 'Student' ? 'bg-green/12' : req.role === 'Mentor' ? 'bg-teal/[0.15] border border-teal/30' : req.role === 'Industry' ? 'bg-amber-soft/12' : 'bg-blue/[0.15] border border-blue/30';
                const tagTextStyle = req.role === 'Student' ? 'text-green-light' : req.role === 'Mentor' ? 'text-green-400' : req.role === 'Industry' ? 'text-amber-light' : 'text-blue-light';

                return (
                  <View key={req.id} className="flex-row items-center bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 min-h-[64px]">
                    <Av initials={req.avatar} size={42} color={req.color} />
                    <View className="flex-1 min-w-0 ml-3">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-white font-bold text-[14px]">{req.name}</Text>
                        <View className={`px-[7px] py-0.5 rounded ${tagStyle}`}>
                          <Text className={`font-bold text-[9.5px] ${tagTextStyle}`}>{req.role}</Text>
                        </View>
                        <Text className="text-dim text-[10.5px] ml-1">{req.time}</Text>
                      </View>
                      <Text className="text-muted text-[11.5px] mt-0.5" numberOfLines={1}>{req.subtitle}</Text>
                      {req.message ? (
                        <Text className="text-teal-light text-[11.5px] mt-1 italic">
                          Note: "{req.message}"
                        </Text>
                      ) : null}
                    </View>

                    <View className="flex-row gap-2">
                      <Pressable 
                        onPress={() => handleAcceptRequest(req.id, req.name)}
                        style={({ hovered }: any) => [hovered && { backgroundColor: '#5EEAD4' }]}
                        className="h-8 rounded-md bg-teal px-3 items-center justify-center"
                      >
                        <Text className="text-[#090D16] font-extrabold text-xs">Accept</Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => handleIgnoreRequest(req.id, req.name)}
                        style={({ hovered }: any) => [hovered && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                        className="h-8 rounded-md bg-white/[0.03] border border-white/[0.08] px-3 items-center justify-center"
                      >
                        <Text className="text-muted font-bold text-xs">Ignore</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {incomingRequests.length === 0 && (
                <Text className="text-dim text-[12.5px] py-3.5 text-center">No pending incoming requests.</Text>
              )}
            </View>
          </View>

          <View className="bg-glass-soft border border-glass-border rounded-card p-4 gap-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }}>
            <View className="flex-row items-center border-b border-glass-border pb-2.5">
              <Users size={16} color="#14B8A6" style={{ marginRight: 8 }} />
              <Text className="font-extrabold text-[13px] tracking-widest text-teal">SENT REQUESTS ({sentRequests.length})</Text>
            </View>

            <View className="gap-2 mt-2.5">
              {sentRequests.map((req) => {
                const tagStyle = req.role === 'Student' ? 'bg-green/12' : req.role === 'Mentor' ? 'bg-teal/[0.15] border border-teal/30' : req.role === 'Industry' ? 'bg-amber-soft/12' : 'bg-blue/[0.15] border border-blue/30';
                const tagTextStyle = req.role === 'Student' ? 'text-green-light' : req.role === 'Mentor' ? 'text-green-400' : req.role === 'Industry' ? 'text-amber-light' : 'text-blue-light';

                return (
                <View key={req.id} className="flex-row items-center bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 min-h-[64px]">
                  <Av initials={req.avatar} size={42} color={req.color} />
                  <View className="flex-1 min-w-0 ml-3">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-white font-bold text-[14px]">{req.name}</Text>
                      <View className={`px-[7px] py-0.5 rounded ${tagStyle}`}>
                        <Text className={`font-bold text-[9.5px] ${tagTextStyle}`}>{req.role}</Text>
                      </View>
                      <Text className="text-dim text-[10.5px] ml-1">{req.time}</Text>
                    </View>
                    <Text className="text-muted text-[11.5px] mt-0.5" numberOfLines={1}>{req.subtitle}</Text>
                  </View>

                  <View className="flex-row items-center px-2.5 h-7 rounded-[20px] bg-amber/[0.08] border border-amber/[0.22]">
                    <Clock size={11} color="#FCD34D" style={{ marginRight: 4 }} />
                    <Text className="text-amber-light text-[11px] font-bold">Pending</Text>
                  </View>
                </View>
                );
              })}

              {sentRequests.length === 0 && (
                <Text className="text-dim text-[12.5px] py-3.5 text-center">No pending sent requests.</Text>
              )}
            </View>
          </View>
        </View>
      )}

      

      {activeTab === 'connections' && (
        <View className="gap-4">
          <View className="flex-row items-center border-b border-glass-border pb-3">
            <View className="w-8 h-8 rounded-lg items-center justify-center mr-2.5" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <Users size={14} color="#86EFAC" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-white font-extrabold text-[15px] tracking-tight">My Connections</Text>
                <View className="px-1.5 py-[1.5px] rounded bg-white/[0.06]"><Text className="text-violet-300 text-[10px] font-extrabold">{connectionsList.length}</Text></View>
              </View>
              <Text className="text-muted text-[11px] mt-0.5">People you are actively connected with</Text>
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
                        <Text numberOfLines={1} className="text-white font-bold text-[14.5px]">{person.name}</Text>
                        <View className={person.kind === 'mentor' ? 'bg-green/[0.12] px-1.5 py-0.5 rounded' : person.kind === 'alumni' ? 'bg-purple-soft/12 px-1.5 py-0.5 rounded' : 'bg-blue-soft/12 px-1.5 py-0.5 rounded'}>
                          <Text className={person.kind === 'mentor' ? 'text-green-light text-[9.5px] font-bold' : person.kind === 'alumni' ? 'text-violet-300 text-[9.5px] font-bold' : 'text-blue-light text-[9.5px] font-bold'}>{person.tag}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} className="text-muted text-[11.5px] mt-0.5">{person.role}</Text>
                      <Text numberOfLines={1} className="text-dim text-[10.5px]">{person.company}</Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5 my-2">
                    {person.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} className="bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded-md"><Text className="text-muted text-[10px] font-bold">{tag}</Text></View>
                    ))}
                  </View>

                  <View className="flex-row items-center mt-0.5">
                    <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                    <Text className="text-dim text-[11px]">{person.mutual} mutual connections</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center border-t border-glass-border pt-3 mt-1">
                  {person.kind === 'mentor' ? (
                    <>
                      <Pressable onPress={() => setPickedPerson(person)} className="flex-row items-center justify-center px-3 h-8 rounded-lg border border-purple/[0.3] bg-transparent flex-1 mr-1" style={{ cursor: 'pointer' } as any}>
                        <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                        <Text className="text-violet-300 font-bold text-[11.5px]">View Profile</Text>
                      </Pressable>
                      <Pressable onPress={() => setBookingMentor(person)} className="flex-row items-center justify-center px-3 h-8 rounded-lg bg-violet flex-1 mr-1" style={{ cursor: 'pointer' } as any}>
                        <Calendar size={12} color="#fff" style={{ marginRight: 5 }} />
                        <Text className="text-white font-extrabold text-[11.5px]">Book</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable onPress={() => setPickedPerson(person)} className="flex-row items-center justify-center px-3 h-8 rounded-lg border border-purple/[0.3] bg-transparent flex-1 mr-1" style={{ cursor: 'pointer' } as any}>
                        <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                        <Text className="text-violet-300 font-bold text-[11.5px]">View Profile</Text>
                      </Pressable>
                      <View className="flex-row items-center justify-center px-3 h-8 rounded-lg bg-green/[0.08] border border-green/[0.22]">
                        <Check size={11} color={SC.green} style={{ marginRight: 4 }} />
                        <Text className="text-green-light font-bold text-[11.5px]">Connected</Text>
                      </View>
                    </>
                  )}

                  <View className="flex-row gap-1">
                    <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg border border-glass-border items-center justify-center" style={{ cursor: 'pointer' } as any}>
                      <Linkedin size={12} color={SC.muted} />
                    </Pressable>
                  </View>
                </View>
              </GlassCard>
            ))}

            {connectionsList.length === 0 && (
              <View className="flex-1 bg-glass-soft border border-glass-border rounded-card p-6 items-center justify-center mt-2.5">
                <Users size={24} color={SC.muted} style={{ marginBottom: 10 }} />
                <Text className="text-muted text-[12.5px] text-center">No connections fit the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {activeTab === 'book' && (
        <View className="gap-4">
          <View className="flex-row items-center border-b border-glass-border pb-3">
            <View className="w-8 h-8 rounded-lg items-center justify-center mr-2.5" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <Briefcase size={14} color="#86EFAC" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-white font-extrabold text-[15px] tracking-tight">All Mentors</Text>
                <View className="px-1.5 py-[1.5px] rounded bg-white/[0.06]"><Text className="text-violet-300 text-[10px] font-extrabold">{mentorsList.length}</Text></View>
              </View>
              <Text className="text-muted text-[11px] mt-0.5">Browse experts and schedule your 1:1 sessions</Text>
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
                        <Text numberOfLines={1} className="text-white font-bold text-[14.5px]">{m.name}</Text>
                        <View className="bg-green/[0.12] px-1.5 py-0.5 rounded"><Text className="text-green-light text-[9.5px] font-bold">MENTOR</Text></View>
                      </View>
                      <Text numberOfLines={1} className="text-muted text-[11.5px] mt-0.5">{m.role}</Text>
                      <Text numberOfLines={1} className="text-dim text-[10.5px]">{m.company}</Text>
                    </View>
                    
                    <View className="flex-row gap-1 self-start">
                      <Pressable onPress={() => m.linkedin ? Linking.openURL(m.linkedin.startsWith('http') ? m.linkedin : `https://${m.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg border border-glass-border items-center justify-center" style={{ cursor: 'pointer' } as any}>
                        <Linkedin size={12} color={SC.muted} />
                      </Pressable>
                      {m.github && (
                        <Pressable onPress={() => m.github ? Linking.openURL(m.github.startsWith('http') ? m.github : `https://${m.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-lg border border-glass-border items-center justify-center" style={{ cursor: 'pointer' } as any}>
                          <Github size={12} color={SC.muted} />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-1.5 my-2">
                    {m.tags.slice(0, 3).map((tag, idx) => (
                      <View key={idx} className="bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded-md"><Text className="text-muted text-[10px] font-bold">{tag}</Text></View>
                    ))}
                  </View>

                  <View className="flex-row items-center gap-3 my-1">
                    <View className="flex-row items-center gap-1">
                      <Star size={11} color={SC.amber} fill={SC.amber} />
                      <Text className="text-muted text-[11px] font-bold">{m.rating}</Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <Clock size={11} color={SC.muted} />
                      <Text className="text-muted text-[11px] font-bold">{m.sessions} sessions</Text>
                    </View>
                    <Text className="text-violet-300 font-extrabold text-[11.5px] ml-auto">{m.price}/session</Text>
                  </View>

                  <View className="flex-row items-center mt-0.5">
                    <Users size={11} color={SC.dim} style={{ marginRight: 6 }} />
                    <Text className="text-dim text-[11px]">{m.mutual} mutual connections</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center border-t border-glass-border pt-3 mt-1">
                  <Pressable onPress={() => setPickedPerson(m)} className="flex-row items-center justify-center px-3 h-8 rounded-lg border border-purple/[0.3] bg-transparent flex-1 mr-1" style={{ cursor: 'pointer' } as any}>
                    <Eye size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                    <Text className="text-violet-300 font-bold text-[11.5px]">View Profile</Text>
                  </Pressable>

                  {conn.includes(m.id) || m.connectionState === 'connected' ? (
                    <View className="flex-row items-center justify-center px-3 h-8 rounded-lg bg-green/[0.08] border border-green/[0.22] flex-1 mr-1">
                      <Check size={11} color={SC.green} style={{ marginRight: 4 }} />
                      <Text className="text-green-light font-bold text-[11.5px]">Connected</Text>
                    </View>
                  ) : pending.includes(m.id) || m.connectionState === 'pending' ? (
                    <View className="flex-row items-center justify-center px-3 h-8 rounded-lg bg-amber/[0.08] border border-amber/[0.22] flex-1 mr-1">
                      <Clock size={11} color={SC.amber} style={{ marginRight: 4 }} />
                      <Text className="text-amber-400 font-bold text-[11.5px]">Pending</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleConnect(m.id, m.name)} className="flex-row items-center justify-center px-3 h-8 rounded-lg border border-purple/[0.3] bg-transparent flex-1 mr-1" style={{ cursor: 'pointer' } as any}>
                      <UserPlus size={12} color={SC.accentBright} style={{ marginRight: 5 }} />
                      <Text className="text-violet-300 font-bold text-[11.5px]">Connect</Text>
                    </Pressable>
                  )}

                  <Pressable onPress={() => setBookingMentor(m)} className="flex-row items-center justify-center px-3 h-8 rounded-lg bg-violet flex-[1.1]" style={{ cursor: 'pointer' } as any}>
                    <Calendar size={12} color="#fff" style={{ marginRight: 5 }} />
                    <Text className="text-white font-extrabold text-[11.5px]">Book</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}

            {mentorsList.length === 0 && (
              <View className="flex-1 bg-glass-soft border border-glass-border rounded-card p-6 items-center justify-center mt-2.5">
                <Users size={24} color={SC.muted} style={{ marginBottom: 10 }} />
                <Text className="text-muted text-[12.5px] text-center">No mentors match the current search filters.</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <Modal visible={!!pickedPerson} animationType="slide" transparent onRequestClose={() => setPickedPerson(null)}>
        <View className="flex-1 bg-[rgba(5,8,16,0.75)] justify-end" style={{ alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch' }}>
          <Pressable onPress={() => setPickedPerson(null)} style={{ flex: 1 }} />
          <View style={{
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
          }}>
            <View className="flex-row items-center justify-between p-4 border-b border-glass-border">
              <Text className="text-white font-extrabold text-[15px]">
                {pickedPerson?.kind === 'mentor' ? 'Mentor Profile' : pickedPerson?.kind === 'alumni' ? 'Alumni Profile' : 'Student Profile'}
              </Text>
              <Pressable onPress={() => setPickedPerson(null)} className="p-1" style={{ cursor: 'pointer' } as any}>
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
                <ScrollView className="p-5" contentContainerStyle={{ gap: 16 }}>
                  <GlassCard radius={12} padding={16} style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderRadius: 12 }}>
                    <View className="flex-row items-center gap-3">
                      <Av initials={nameInitials} size={64} color={pickedPerson.color} photo={pickedPerson.photo} />
                      <View className="flex-1 min-w-0">
                        <Text className="text-white font-extrabold text-xl">{pickedPerson.name}</Text>
                        <Text className="text-muted text-[12.5px] mt-1">
                          {titleLine}
                        </Text>
                        <Text className="text-dim text-[11.5px] mt-0.5">
                          {collegeLine}
                        </Text>
                      </View>
                      
                      <View className="flex-row gap-1.5 self-start">
                        {pickedPerson.linkedin && (
                          <Pressable 
                            onPress={() => pickedPerson.linkedin ? Linking.openURL(pickedPerson.linkedin.startsWith('http') ? pickedPerson.linkedin : `https://${pickedPerson.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} 
                            className="w-8 h-8 rounded-lg items-center justify-center bg-white/[0.05] border border-white/[0.09]"
                            style={{ cursor: 'pointer' } as any}
                          >
                            <Linkedin size={14} color="#fff" />
                          </Pressable>
                        )}
                        {pickedPerson.github && (
                          <Pressable 
                            onPress={() => pickedPerson.github ? Linking.openURL(pickedPerson.github.startsWith('http') ? pickedPerson.github : `https://${pickedPerson.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} 
                            className="w-8 h-8 rounded-lg items-center justify-center bg-white/[0.05] border border-white/[0.09]"
                            style={{ cursor: 'pointer' } as any}
                          >
                            <Github size={14} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </GlassCard>

                  <GlassCard radius={12} padding={16} style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderRadius: 12 }}>
                    <Text className="text-white/75 text-[13px] leading-[18px]">
                      {bioText}
                    </Text>
                  </GlassCard>

                  {pickedPerson.kind === 'mentor' && (
                    <View className="gap-2">
                      <Text className="text-[#F97316] font-bold text-[11px] tracking-widest">MENTOR STATS</Text>
                      <View className="flex-row gap-2">
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text className="text-white font-extrabold text-[15px]">{pickedPerson.rating}★</Text>
                          <Text className="text-muted text-[10px] mt-1">Rating</Text>
                        </GlassCard>
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text className="text-white font-extrabold text-[15px]">{pickedPerson.sessions}</Text>
                          <Text className="text-muted text-[10px] mt-1">Sessions</Text>
                        </GlassCard>
                        <GlassCard radius={10} padding={12} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                          <Text className="text-white font-extrabold text-[13px]" numberOfLines={1}>{pickedPerson.price}</Text>
                          <Text className="text-muted text-[10px] mt-1">Price</Text>
                        </GlassCard>
                      </View>
                    </View>
                  )}

                  <View className="gap-2">
                    <Text className="text-white/50 font-bold text-[11px] tracking-widest">SKILLS</Text>
                    <View className="flex-row flex-wrap gap-1.5 my-2">
                      {pickedPerson.tags && pickedPerson.tags.map((tag: string, idx: number) => (
                        <View key={idx} className="bg-white/[0.03] border border-white/[0.05] px-2 py-1 rounded-md"><Text className="text-muted text-[10px] font-bold">{tag}</Text></View>
                      ))}
                      {(!pickedPerson.tags || pickedPerson.tags.length === 0) && (
                        <Text className="text-muted text-xs">No specified skills.</Text>
                      )}
                    </View>
                  </View>

                  <View className="mt-2">
                    {pickedPerson.kind === 'mentor' ? (
                      <View className="flex-row gap-2.5">
                        {isConnected ? (
                          <View className="flex-1 h-11 rounded-[10px] bg-green/[0.1] border border-green/[0.2] flex-row items-center justify-center">
                            <Check size={16} color={SC.green} style={{ marginRight: 6 }} />
                            <Text className="text-green font-bold text-base">Connected</Text>
                          </View>
                        ) : isPending ? (
                          <View className="flex-1 h-11 rounded-[10px] bg-amber/[0.1] border border-amber/[0.2] flex-row items-center justify-center">
                            <Clock size={16} color={SC.amber} style={{ marginRight: 6 }} />
                            <Text className="text-amber font-bold text-base">Pending</Text>
                          </View>
                        ) : (
                          <Pressable 
                            onPress={() => handleConnect(pickedPerson.id, pickedPerson.name)} 
                            className="flex-1 h-11 rounded-[10px] flex-row items-center justify-center bg-transparent border border-purple/[0.4]"
                          >
                            <UserPlus size={16} color={SC.accentBright} style={{ marginRight: 6 }} />
                            <Text className="text-violet-300 font-extrabold text-base">Connect</Text>
                          </Pressable>
                        )}
                        
                        <Pressable 
                          onPress={() => handleOpenBooking(pickedPerson)} 
                          className="flex-[1.2] h-11 rounded-[10px] bg-violet flex-row items-center justify-center"
                          style={{ cursor: 'pointer' } as any}
                        >
                          <Calendar size={16} color="#fff" style={{ marginRight: 8 }} />
                          <Text className="text-white font-extrabold text-base">Book Session</Text>
                        </Pressable>
                      </View>
                    ) : isConnected ? (
                      <View className="h-11 rounded-[10px] bg-green/[0.1] border border-green/[0.2] flex-row items-center justify-center">
                        <Check size={16} color={SC.green} style={{ marginRight: 6 }} />
                        <Text className="text-green font-bold text-base">Connected</Text>
                      </View>
                    ) : isPending ? (
                      <View className="h-11 rounded-[10px] bg-amber/[0.1] border border-amber/[0.2] flex-row items-center justify-center">
                        <Clock size={16} color={SC.amber} style={{ marginRight: 6 }} />
                        <Text className="text-amber font-bold text-base">Request Pending</Text>
                      </View>
                    ) : (
                      <Pressable 
                        onPress={() => handleConnect(pickedPerson.id, pickedPerson.name)} 
                        className="h-11 rounded-[10px] bg-violet flex-row items-center justify-center"
                        style={{ cursor: 'pointer' } as any}
                      >
                        <UserPlus size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text className="text-white font-extrabold text-base">+ Connect</Text>
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      <Modal visible={!!bookingMentor} animationType="fade" transparent onRequestClose={() => setBookingMentor(null)}>
        <View className="flex-1 bg-[rgba(5,8,16,0.82)] justify-center items-center p-5">
          <Pressable onPress={() => setBookingMentor(null)} className="absolute inset-0" />
          {bookingMentor && (
            <View style={{
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
            }}>
              <View className="flex-row items-center justify-between p-4 border-b border-glass-border">
                <Text className="text-white font-extrabold text-lg">Book Session</Text>
                <Pressable onPress={() => setBookingMentor(null)} className="p-1" style={{ cursor: 'pointer' } as any}>
                  <X size={16} color={SC.text} />
                </Pressable>
              </View>

              <ScrollView className="p-5" contentContainerStyle={{ gap: 16 }}>
                <View className="items-center gap-2 py-3">
                  <Av initials={bookingMentor.initials} size={64} color={bookingMentor.color} photo={bookingMentor.photo} />
                  <Text className="text-white font-extrabold text-xl text-center">
                    {bookingMentor.name}
                  </Text>
                  <Text className="text-muted text-[13px] text-center">
                    {bookingMentor.role || 'Mentor'}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <Star size={14} color={SC.amber} fill={SC.amber} />
                    <Text className="text-white font-bold text-[12.5px]">
                      {bookingMentor.rating}
                    </Text>
                    <Text className="text-muted text-[12.5px]">
                      · {bookingMentor.sessions} sessions
                    </Text>
                  </View>
                  
                  {bookingMentor.tags && bookingMentor.tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-1.5 justify-center mt-1">
                      {bookingMentor.tags.map((t: string) => (
                        <View key={t} className="bg-purple-soft/12 px-2.5 py-1 rounded-full">
                          <Text className="text-violet-300 font-bold text-[9.5px] uppercase">{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View className="gap-1.5">
                  <Text className="text-white/50 font-bold text-[11px] tracking-widest">ABOUT</Text>
                  <GlassCard radius={12} padding={14} style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                    <Text className="text-white/75 text-[12.5px] leading-[18px]">
                      {bookingMentor.bio || 'Experienced professional ready to share industry insights, career strategies, and guidance.'}
                    </Text>
                  </GlassCard>
                </View>

                <View className="gap-1.5">
                  <View className="flex-row items-center gap-1.5">
                    <Calendar size={14} color={SC.accentBright} />
                    <Text className="text-white font-bold text-[13.5px]">Available Slots</Text>
                  </View>
                  <Text className="text-muted text-[11.5px]">
                    30-minute 1:1 sessions. Pick a slot that works for you.
                  </Text>
                  
                  <View className="flex-row flex-wrap gap-2 mt-1">
                    {bookingSlots.map((slot, idx) => {
                      const isSelected = bookingSlot?.iso === slot.iso;
                      return (
                        <Pressable 
                          key={idx} 
                          onPress={() => setBookingSlot(slot)}
                          className={`bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 rounded-[10px] items-center justify-center flex-row items-center ${isSelected ? 'bg-purple/[0.20] border-violet' : ''}`}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <Clock size={12} color={isSelected ? '#fff' : SC.accentBright} style={{ marginRight: 6 }} />
                          <Text className={`text-[12px] font-bold ${isSelected ? 'text-white' : 'text-muted'}`}>{slot.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text className="text-white/50 font-bold text-[11px] tracking-widest">WHAT WOULD YOU LIKE TO DISCUSS?</Text>
                  <TextInput
                    value={bookingTopic}
                    onChangeText={setBookingTopic}
                    placeholder="e.g., How do I prepare for FAANG interviews?"
                    placeholderTextColor={SC.dim}
                    multiline
                    numberOfLines={3}
                    className="bg-black/25 border border-glass-border rounded-[10px] p-3 text-white h-20 text-[13px]"
                    style={{
                      fontFamily: FONTS.med,
                      textAlignVertical: 'top',
                      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
                    }}
                  />
                </View>

                <Pressable 
                  disabled={!bookingSlot || !bookingTopic.trim() || bookingSubmitting}
                  onPress={handleConfirmBooking}
                  className={`h-[46px] rounded-xl items-center justify-center mt-3 ${(!bookingSlot || !bookingTopic.trim()) ? 'bg-white/[0.05] border border-white/[0.08]' : 'bg-violet'}`}
                  style={{ cursor: 'pointer' } as any}
                >
                  {bookingSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View className="flex-row items-center gap-1.5">
                      <MessageSquare size={16} color="#fff" style={{ marginRight: 4 }} />
                      <Text className={`font-extrabold text-base ${(!bookingSlot || !bookingTopic.trim()) ? 'text-dim' : 'text-white'}`}>
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
