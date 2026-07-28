/**
 * Mentor Portal — Network View Redesign
 * Complete implementation of Connections, Discover, and Requests tabs.
 * High-fidelity screens matching all reference mockups with interactive states.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator, Modal } from 'react-native';
import { 
  Users, 
  GraduationCap, 
  Briefcase, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  Search, 
  Video, 
  Activity, 
  ExternalLink,
  MessageSquare,
  Link2,
  Code,
  User,
  Heart,
  Settings,
  Clock,
  Check,
  X,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Calendar,
  UserPlus
} from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { STUDENTS as MOCK_STUDENTS } from '../data';
import { useToast } from '@/src/views/components';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

type CategoryTab = 'connections' | 'discover' | 'requests';
type FilterType = 'everyone' | 'students' | 'alumnis' | 'mentors' | 'industry';
type DiscoverSubTab = 'interest' | 'path' | 'college' | 'recommended' | 'expand';

type ProfessionalPerson = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  tag: 'Industry' | 'Mentor' | 'Alumni';
  role: string;
  company: string;
  tags: string[];
  mutual: number;
  linkedin: string;
  github?: string;
};

type MatchedAlumni = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: string;
  company: string;
  year: number;
  college: string;
  tags: string[];
  mutual: number;
  linkedin: string;
  github?: string;
};

type IncomingRequest = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'Student' | 'Alumni';
  subtitle: string;
  time: string;
};

const PROFESSIONAL_NETWORK: ProfessionalPerson[] = [
  {
    id: 'p1',
    name: 'Vikram Anand',
    avatar: 'VA',
    color: '#8B5CF6',
    tag: 'Industry',
    role: 'Engineering Manager',
    company: 'Microsoft',
    tags: ['System Design', 'Leadership'],
    mutual: 12,
    linkedin: 'linkedin.com/in/vikramanand'
  },
  {
    id: 'p2',
    name: 'Deepa Krishnan',
    avatar: 'DK',
    color: '#EC4899',
    tag: 'Industry',
    role: 'VP Product',
    company: 'Meesho',
    tags: ['Product', 'Growth'],
    mutual: 8,
    linkedin: 'linkedin.com/in/deepakrishnan'
  },
  {
    id: 'p3',
    name: 'Nikhil Sharma',
    avatar: 'NS',
    color: '#10B981',
    tag: 'Mentor',
    role: 'Co-founder & CTO',
    company: 'Servant AI',
    tags: ['AI/ML', 'Startups'],
    mutual: 6,
    linkedin: 'linkedin.com/in/nikhilsharma',
    github: 'github.com/nikhils'
  },
  {
    id: 'p4',
    name: 'Ravi Teja',
    avatar: 'RT',
    color: '#3B82F6',
    tag: 'Alumni',
    role: 'SDE-3',
    company: 'Stripe',
    tags: ['Fintech', 'Backend'],
    mutual: 3,
    linkedin: 'linkedin.com/in/raviteja',
    github: 'github.com/raviteja'
  },
  {
    id: 'p5',
    name: 'Sonal Kapoor',
    avatar: 'SK',
    color: '#F59E0B',
    tag: 'Industry',
    role: 'Product Designer',
    company: 'Figma',
    tags: ['Design', 'UX'],
    mutual: 5,
    linkedin: 'linkedin.com/in/sonalkapoor'
  },
  {
    id: 'p6',
    name: 'Arnav Mehta',
    avatar: 'AM',
    color: '#14B8A6',
    tag: 'Alumni',
    role: 'Research Scientist',
    company: 'DeepMind',
    tags: ['ML Research', 'PhD'],
    mutual: 9,
    linkedin: 'linkedin.com/in/arnavmehta',
    github: 'github.com/arnavm'
  }
];

const MATCHED_DISCOVER_NETWORK: MatchedAlumni[] = [
  {
    id: 'm1',
    name: 'Vikram Anand',
    avatar: 'VA',
    color: '#8B5CF6',
    role: 'Staff Engineer',
    company: 'Google',
    college: 'IIT Bombay',
    year: 2018,
    tags: ['Python', 'Go', 'Kubernetes'],
    mutual: 8,
    linkedin: 'linkedin.com/in/vikramanand',
    github: 'github.com/vikramanand'
  },
  {
    id: 'm2',
    name: 'Divya Krishnan',
    avatar: 'DK',
    color: '#EC4899',
    role: 'ML Engineer',
    company: 'Netflix',
    college: 'IIT Madras',
    year: 2020,
    tags: ['TensorFlow', 'PyTorch', 'Python'],
    mutual: 3,
    linkedin: 'linkedin.com/in/deepakrishnan'
  },
  {
    id: 'm3',
    name: 'Priya Menon',
    avatar: 'PM',
    color: '#10B981',
    role: 'Data Scientist',
    company: 'Neon',
    college: 'NIT Trichy',
    year: 2020,
    tags: ['Python', 'SQL', 'Spark'],
    mutual: 2,
    linkedin: 'linkedin.com/in/priyamenon'
  },
  {
    id: 'm4',
    name: 'Karan Mehta',
    avatar: 'KM',
    color: '#3B82F6',
    role: 'SDE-II',
    company: 'Amazon',
    college: 'IIT Delhi',
    year: 2021,
    tags: ['Java', 'System Design', 'AWS'],
    mutual: 9,
    linkedin: 'linkedin.com/in/karanmehta',
    github: 'github.com/karanm'
  },
  {
    id: 'm5',
    name: 'Sneha Joshi',
    avatar: 'SJ',
    color: '#F59E0B',
    role: 'Quant Researcher',
    company: 'DE Shaw',
    college: 'IIT Kharagpur',
    year: 2019,
    tags: ['Statistics', 'C++', 'Finance'],
    mutual: 4,
    linkedin: 'linkedin.com/in/snehajoshi'
  }
];

const INITIAL_INCOMING: IncomingRequest[] = [
  {
    id: 'inc1',
    name: 'Rohan Gupta',
    avatar: 'RG',
    color: '#6366F1',
    role: 'Student',
    subtitle: 'B.Tech CSE 2026 • IIT Delhi',
    time: '2d ago'
  },
  {
    id: 'inc2',
    name: 'Ananya Pillai',
    avatar: 'AP',
    color: '#F59E0B',
    role: 'Alumni',
    subtitle: 'SDE Intern • Uber',
    time: '3d ago'
  }
];

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
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<CategoryTab>('connections');
  const [filter, setFilter] = useState<FilterType>('everyone');
  const [discoverSubTab, setDiscoverSubTab] = useState<DiscoverSubTab>('interest');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapsible sections
  const [showStudents, setShowStudents] = useState(true);
  const [showProfessionals, setShowProfessionals] = useState(true);
  const [showMatchedInterest, setShowMatchedInterest] = useState(true);

  // Live stateful lists
  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [discoverSections, setDiscoverSections] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Profile detail view state
  const [pickedPerson, setPickedPerson] = useState<any | null>(null);

  // Connection Request Modal States
  const [connectPerson, setConnectPerson] = useState<any | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [connectNoteText, setConnectNoteText] = useState('');
  const [successPopup, setSuccessPopup] = useState<string | null>(null);

  const sumChars = (str: string) => {
    return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  };

  const loadConnections = async () => {
    try {
      const email = user?.email;
      const res = await api.mentorConnections(email);
      const items = res?.items || [];
      const connectedItems = items.filter(
        (item: any) =>
          item.status !== 'none' &&
          item.status !== 'withdrawn' &&
          item.status !== 'declined' &&
          item.status !== 'rejected'
      );
      setConnectionsList(connectedItems.map((c: any) => {
        const role = c.role || (c.tags && c.tags[0] ? c.tags[0].toLowerCase() : 'student');
        const tag = role === 'mentor' ? 'Mentor' : role === 'alumni' ? 'Alumni' : 'Student';
        return {
          ...c,
          role,
          tag,
          kind: role,
          company: c.college || '',
          mutual: c.mutual || ((sumChars(c.id || '') % 12) + 2)
        };
      }));
    } catch (e) {
      console.warn('Failed to load connections:', e);
    }
  };

  const loadDiscover = async () => {
    try {
      const res = await api.networkDiscover(searchQuery);
      setDiscoverSections(res?.sections || []);
    } catch (e) {
      console.warn('Failed to load discover sections:', e);
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
          role: (role === 'student' ? 'Student' : role === 'alumni' ? 'Alumni' : 'Industry') as any,
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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadConnections(), loadDiscover(), loadRequests()]);
      setLoading(false);
    };
    init();
  }, [user]);

  // Debounced search for Discover tab
  useEffect(() => {
    if (tab === 'discover') {
      const delayDebounceFn = setTimeout(() => {
        loadDiscover();
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, tab]);

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
      mutual: u.mutual_connections || u.mutual || ((sumChars(u.id || '') % 12) + 2),
      linkedin: u.linkedin_url || u.linkedin || '',
      github: u.github_url || u.github || '',
      connectionState: u.connection_state || 'none',
      kind: role
    };
  };

  // Filter students dynamically based on search & active chip
  const filteredStudents = useMemo(() => {
    return connectionsList.filter(s => {
      if (s.role !== 'student') return false;
      if (filter !== 'everyone' && filter !== 'students') return false;
      const matchText = `${s.name} ${s.branch} ${s.college} ${s.tags ? s.tags.join(' ') : ''}`.toLowerCase();
      return matchText.includes(searchQuery.toLowerCase());
    });
  }, [connectionsList, filter, searchQuery]);

  // Filter professionals dynamically based on search & active chip
  const filteredProfessionals = useMemo(() => {
    return connectionsList.filter(p => {
      if (p.role === 'student') return false;
      if (filter === 'students') return false;
      if (filter === 'alumnis' && p.role !== 'alumni') return false;
      if (filter === 'mentors' && p.role !== 'mentor') return false;
      if (filter === 'industry') {
        const companyName = p.college || '';
        const isAcademic = companyName.toLowerCase().includes('university') || 
                           companyName.toLowerCase().includes('college') || 
                           companyName.toLowerCase().includes('institute') || 
                           companyName.toLowerCase().includes('school');
        if (isAcademic && p.role !== 'mentor') return false;
      }

      const matchText = `${p.name} ${p.branch} ${p.college} ${p.tags ? p.tags.join(' ') : ''}`.toLowerCase();
      return matchText.includes(searchQuery.toLowerCase());
    });
  }, [connectionsList, filter, searchQuery]);

  // Discover tab active matching section resolver
  const activeSection = useMemo(() => {
    let secKey = 'by_interest';
    if (discoverSubTab === 'path') secKey = 'by_career';
    if (discoverSubTab === 'college') secKey = 'by_college';
    if (discoverSubTab === 'recommended') secKey = 'mentors';
    if (discoverSubTab === 'expand') secKey = 'expand';

    return discoverSections.find(s => s.key === secKey);
  }, [discoverSections, discoverSubTab]);

  const normalizedDiscover = useMemo(() => {
    return (activeSection?.items || []).map(normalizeDiscoverUser);
  }, [activeSection]);

  // Filter Matched Discover dynamically by active filter chip
  const filteredMatchedDiscover = useMemo(() => {
    return normalizedDiscover.filter(person => {
      if (filter === 'students') return person.tag === 'Student';
      if (filter === 'alumnis') return person.tag === 'Alumni';
      if (filter === 'mentors') return person.tag === 'Mentor';
      if (filter === 'industry') return person.tag === 'Mentor' || person.tag === 'Alumni';
      return true;
    });
  }, [normalizedDiscover, filter]);

  const discoverCounts = useMemo(() => {
    const getCount = (secKey: string) => {
      const sec = discoverSections.find(s => s.key === secKey);
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

  // Request actions
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

  // Open connection dialog
  const openConnectDialog = (person: any) => {
    setConnectPerson(person);
    setShowNoteInput(false);
    const template = `Hi ${person.name}, I saw your impressive background at ${person.company || 'Google'} matching my interests in ${person.tags ? person.tags.slice(0, 2).join(' and ') : 'collaboration'}! Would love to connect and share insights.`;
    setConnectNoteText(template);
  };

  const sendConnectionRequestFlow = async (sendWithNote: boolean) => {
    if (!connectPerson) return;
    try {
      const messageToSend = sendWithNote ? connectNoteText : undefined;
      await api.sendConnectionRequest(connectPerson.id, messageToSend);

      setSuccessPopup(`Connection request sent to ${connectPerson.name}!`);

      setDiscoverSections(prev => prev.map(section => ({
        ...section,
        items: section.items.map((item: any) =>
          item.id === connectPerson.id
            ? { ...item, connection_state: 'pending', connectionState: 'pending' }
            : item
        )
      })));

      setConnectionsList(prev => prev.map((item: any) => 
        item.id === connectPerson.id 
          ? { ...item, connection_state: 'pending', connectionState: 'pending' }
          : item
      ));

      if (pickedPerson?.id === connectPerson.id) {
        setPickedPerson(prev => prev ? { ...prev, connectionState: 'pending', connection_state: 'pending' } : null);
      }

      await loadRequests();
      await loadDiscover();
    } catch (e: any) {
      toast.error('Could not connect', e.message || 'Please try again.');
      setConnectPerson(null);
      setShowNoteInput(false);
      setConnectNoteText('');
    }
  };

  const handleCloseSuccessPopup = () => {
    setSuccessPopup(null);
    setConnectPerson(null);
    setShowNoteInput(false);
    setConnectNoteText('');
  };

  const totalConnectionsCount = useMemo(() => {
    return connectionsList.length;
  }, [connectionsList]);

  const totalSessionsDone = useMemo(() => {
    return connectionsList.reduce((acc, c) => acc + (c.sessionsCompleted || 0), 0);
  }, [connectionsList]);

  const activeStudentsCount = useMemo(() => {
    return connectionsList.filter(c => c.status === 'active' && c.role === 'student').length;
  }, [connectionsList]);

  if (loading) {
    return (
      <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      
      {/* 1. Header Metrics Grid */}
      <View style={s.metricsRow}>
        <View style={s.metricCard}>
          <View style={[s.metricIconBox, { backgroundColor: 'rgba(20,184,166,0.1)' }]}>
            <Users size={16} color="#5EEAD4" />
          </View>
          <View>
            <Text style={s.metricValue}>{totalConnectionsCount}</Text>
            <Text style={s.metricLabel}>Connections</Text>
          </View>
        </View>

        <View style={s.metricCard}>
          <View style={[s.metricIconBox, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
            <Video size={16} color="#93C5FD" />
          </View>
          <View>
            <Text style={s.metricValue}>{totalSessionsDone}</Text>
            <Text style={s.metricLabel}>Sessions done</Text>
          </View>
        </View>

        <View style={s.metricCard}>
          <View style={[s.metricIconBox, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
            <Activity size={16} color="#86EFAC" />
          </View>
          <View>
            <Text style={s.metricValue}>{activeStudentsCount}</Text>
            <Text style={s.metricLabel}>Active students</Text>
          </View>
        </View>
      </View>

      {/* 2. Category Tab Row */}
      <View style={s.tabsRow}>
        <Pressable 
          onPress={() => setTab('connections')} 
          style={[s.tabPill, tab === 'connections' && s.tabPillOn]}
        >
          <Users size={13} color={tab === 'connections' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.tabPillText, tab === 'connections' && s.tabPillTextOn]}>My Connections</Text>
          <View style={[s.countBadge, tab === 'connections' && s.countBadgeOn]}>
            <Text style={[s.countBadgeText, tab === 'connections' && s.countBadgeTextOn]}>{totalConnectionsCount}</Text>
          </View>
        </Pressable>

        <Pressable 
          onPress={() => setTab('discover')} 
          style={[s.tabPill, tab === 'discover' && s.tabPillOn]}
        >
          <Activity size={13} color={tab === 'discover' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.tabPillText, tab === 'discover' && s.tabPillTextOn]}>Discover</Text>
        </Pressable>

        <Pressable 
          onPress={() => setTab('requests')} 
          style={[s.tabPill, tab === 'requests' && s.tabPillOn]}
        >
          <User size={13} color={tab === 'requests' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.tabPillText, tab === 'requests' && s.tabPillTextOn]}>Requests</Text>
          <View style={[s.reqBadge, tab === 'requests' && s.reqBadgeOn]}>
            <Text style={s.reqBadgeText}>{incomingRequests.length + sentRequests.length}</Text>
          </View>
        </Pressable>
      </View>

      {/* Main Section for Connections Tab */}
      {tab === 'connections' && (
        <View style={{ gap: 16 }}>
          
          {/* Secondary Sub-filters Row */}
          <View style={s.subFiltersRow}>
            {['everyone', 'students', 'alumnis', 'mentors', 'industry'].map((f) => (
              <Pressable 
                key={f}
                onPress={() => setFilter(f as FilterType)} 
                style={[s.subFilterChip, filter === f && s.subFilterChipOn]}
              >
                <Text style={[s.subFilterText, filter === f && s.subFilterTextOn]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Search Input Box */}
          <View style={s.searchContainer}>
            <Search size={14} color={MC.dim} style={{ marginRight: 10 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your connections..."
              placeholderTextColor={MC.dim}
              style={s.searchInput}
            />
          </View>

          {/* Subsection A: My Students (Screenshot 1) */}
          {filteredStudents.length > 0 && (
            <View style={s.sectionFrame}>
              <Pressable 
                onPress={() => setShowStudents(!showStudents)} 
                style={s.sectionHeaderRow}
              >
                <GraduationCap size={18} color="#5EEAD4" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>My Students</Text>
                    <View style={s.secBadge}>
                      <Text style={s.secBadgeText}>{filteredStudents.length}</Text>
                    </View>
                  </View>
                  <Text style={s.secSub}>Students currently under your mentorship</Text>
                </View>
                <Pressable onPress={() => setShowStudents(!showStudents)} style={s.toggleBtn}>
                  <Text style={s.toggleBtnText}>{showStudents ? 'Show less' : 'Show more'}</Text>
                  {showStudents ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showStudents && (
                <View style={s.cardsGrid}>
                  {filteredStudents.map((student) => {
                    const primaryTag = student.tags && student.tags[0] ? student.tags[0] : 'General';
                    const secondTag = student.tags && student.tags[1] ? student.tags[1] : '';
                    
                    return (
                      <View key={student.id} style={s.profileCard}>
                        <View>
                          <View style={s.cardProfileRow}>
                            <Av initials={student.avatar} size={42} color={student.color} />
                            <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text numberOfLines={1} style={s.nameBold}>{student.name}</Text>
                                <View style={s.rolePillStudent}>
                                  <Text style={s.rolePillStudentText}>Student</Text>
                                </View>
                              </View>
                              <Text numberOfLines={1} style={s.subtitleLine}>{student.branch}</Text>
                              <Text numberOfLines={1} style={s.subtitleSubLine}>{student.college}</Text>
                            </View>
                          </View>

                          <View style={s.skillsRow}>
                            <View style={s.skillChip}><Text style={s.skillChipText}>{primaryTag}</Text></View>
                            {secondTag && (
                              <View style={s.skillChip}><Text style={s.skillChipText}>{secondTag}</Text></View>
                            )}
                          </View>

                          <View style={s.mutualRow}>
                            <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
                            <Text style={s.mutualText}>{student.messages || 1} mutual connection{student.messages === 1 ? '' : 's'}</Text>
                          </View>

                          <View style={s.progressRow}>
                            <View style={s.progressTrack}>
                              <View style={[s.progressFill, { width: `${student.progress}%` }]} />
                            </View>
                            <Text style={s.progressText}>{student.progress}% mentoring progress</Text>
                          </View>
                        </View>

                        <View style={s.cardActions}>
                          <Pressable 
                            onPress={() => setPickedPerson(student)}
                            style={({ hovered }: any) => [s.viewProfileBtn, hovered && { backgroundColor: '#5EEAD4' }]}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text style={s.viewProfileBtnText}>View Profile</Text>
                          </Pressable>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable onPress={() => alert(`Starting session schedule with ${student.name}`)} style={[s.iconSquareBtn, { borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            {student.linkedin && (
                              <Pressable onPress={() => student.linkedin ? Linking.openURL(student.linkedin.startsWith('http') ? student.linkedin : `https://${student.linkedin}`) : alert('No link provided')} style={[s.iconSquareBtn, { backgroundColor: '#0A66C2' }]}>
                                <LinkedinGlyph size={13} color="#fff" />
                              </Pressable>
                            )}
                            {student.github && (
                              <Pressable onPress={() => student.github ? Linking.openURL(student.github.startsWith('http') ? student.github : `https://${student.github}`) : alert('No link provided')} style={[s.iconSquareBtn, { backgroundColor: '#24292e' }]}>
                                <Code size={13} color="#fff" />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Subsection B: Industry, Alumni & Mentors (Screenshot 2) */}
          {filteredProfessionals.length > 0 && (
            <View style={s.sectionFrame}>
              <Pressable 
                onPress={() => setShowProfessionals(!showProfessionals)} 
                style={s.sectionHeaderRow}
              >
                <Briefcase size={18} color="#5EEAD4" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.secTitle}>Industry, Alumni & Mentors</Text>
                    <View style={s.secBadge}>
                      <Text style={s.secBadgeText}>{filteredProfessionals.length}</Text>
                    </View>
                  </View>
                  <Text style={s.secSub}>Your professional network on SA</Text>
                </View>
                <Pressable onPress={() => setShowProfessionals(!showProfessionals)} style={s.toggleBtn}>
                  <Text style={s.toggleBtnText}>{showProfessionals ? 'Show less' : 'Show more'}</Text>
                  {showProfessionals ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showProfessionals && (
                <View style={s.cardsGrid}>
                  {filteredProfessionals.map((person) => {
                    const badgeColor = person.tag === 'Industry' ? s.rolePillIndustry : person.tag === 'Mentor' ? s.rolePillMentor : s.rolePillAlumni;
                    const badgeText = person.tag === 'Industry' ? s.rolePillIndustryText : person.tag === 'Mentor' ? s.rolePillMentorText : s.rolePillAlumniText;

                    return (
                      <View key={person.id} style={s.profileCard}>
                        <View>
                          <View style={s.cardProfileRow}>
                            <Av initials={person.avatar} size={42} color={person.color} />
                            <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text numberOfLines={1} style={s.nameBold}>{person.name}</Text>
                                <View style={[s.rolePillBase, badgeColor]}>
                                  <Text style={[s.rolePillBaseText, badgeText]}>{person.tag}</Text>
                                </View>
                              </View>
                              <Text numberOfLines={1} style={s.subtitleLine}>{person.role}</Text>
                              <Text numberOfLines={1} style={s.subtitleSubLine}>{person.company}</Text>
                            </View>
                          </View>

                          <View style={s.skillsRow}>
                            {person.tags.map((skill, sIdx) => (
                              <View key={sIdx} style={s.skillChip}><Text style={s.skillChipText}>{skill}</Text></View>
                            ))}
                          </View>

                          <View style={s.mutualRow}>
                            <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
                            <Text style={s.mutualText}>{person.mutual} mutual connections</Text>
                          </View>
                        </View>

                        <View style={[s.cardActions, { marginTop: 14 }]}>
                          <Pressable 
                            onPress={() => setPickedPerson(person)}
                            style={({ hovered }: any) => [s.viewProfileBtn, hovered && { backgroundColor: '#5EEAD4' }]}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text style={s.viewProfileBtnText}>View Profile</Text>
                          </Pressable>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable onPress={() => alert(`Starting message chat with ${person.name}`)} style={[s.iconSquareBtn, { borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : alert('No link provided')} style={[s.iconSquareBtn, { backgroundColor: '#0A66C2' }]}>
                              <LinkedinGlyph size={13} color="#fff" />
                            </Pressable>
                            {person.github && (
                              <Pressable onPress={() => person.github ? Linking.openURL(person.github.startsWith('http') ? person.github : `https://${person.github}`) : alert('No link provided')} style={[s.iconSquareBtn, { backgroundColor: '#24292e' }]}>
                                <Code size={13} color="#fff" />
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* 3. Discover Tab Redesign (Screenshot 1) */}
      {tab === 'discover' && (
        <View style={{ gap: 16 }}>
          
          {/* Secondary Sub-filters Row */}
          <View style={s.subFiltersRow}>
            {['everyone', 'students', 'alumnis', 'mentors', 'industry'].map((f) => (
              <Pressable 
                key={f}
                onPress={() => setFilter(f as FilterType)} 
                style={[s.subFilterChip, filter === f && s.subFilterChipOn]}
              >
                <Text style={[s.subFilterText, filter === f && s.subFilterTextOn]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Search Input Box */}
          <View style={s.searchContainer}>
            <Search size={14} color={MC.dim} style={{ marginRight: 10 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search the SA network..."
              placeholderTextColor={MC.dim}
              style={s.searchInput}
            />
          </View>

          {/* Discover Sub-category Pill Filters Row */}
          <View style={s.discoverRow}>
            <Pressable 
              onPress={() => setDiscoverSubTab('interest')}
              style={[s.discChip, discoverSubTab === 'interest' && s.discChipOn]}
            >
              <Heart size={12} color={discoverSubTab === 'interest' ? '#5EEAD4' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={[s.discChipText, discoverSubTab === 'interest' && s.discChipTextOn]}>Matched by Interest</Text>
              <View style={[s.discBadge, discoverSubTab === 'interest' && s.discBadgeOn]}><Text style={s.discBadgeText}>{discoverCounts.interest}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('path')}
              style={[s.discChip, discoverSubTab === 'path' && s.discChipOn]}
            >
              <Settings size={12} color={discoverSubTab === 'path' ? '#F97316' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.discChipText}>Matched by Career Path</Text>
              <View style={[s.discBadge, { backgroundColor: 'rgba(249,115,22,0.1)' }]}><Text style={[s.discBadgeText, { color: '#F97316' }]}>{discoverCounts.path}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('college')}
              style={[s.discChip, discoverSubTab === 'college' && s.discChipOn]}
            >
              <GraduationCap size={12} color={discoverSubTab === 'college' ? '#3B82F6' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.discChipText}>From Your College</Text>
              <View style={[s.discBadge, { backgroundColor: 'rgba(59,130,246,0.1)' }]}><Text style={[s.discBadgeText, { color: '#3B82F6' }]}>{discoverCounts.college}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('recommended')}
              style={[s.discChip, discoverSubTab === 'recommended' && s.discChipOn]}
            >
              <Users size={12} color={discoverSubTab === 'recommended' ? '#F59E0B' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.discChipText}>Recommended Mentors</Text>
              <View style={[s.discBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}><Text style={[s.discBadgeText, { color: '#F59E0B' }]}>{discoverCounts.recommended}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('expand')}
              style={[s.discChip, discoverSubTab === 'expand' && s.discChipOn]}
            >
              <Activity size={12} color={discoverSubTab === 'expand' ? '#EC4899' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text style={s.discChipText}>Expand Your Horizons</Text>
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
                          <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
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
                        ) : person.connectionState === 'pending' ? (
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
                            onPress={() => openConnectDialog(person)}
                            style={({ hovered }: any) => [s.draftMsgBtn, hovered && { borderColor: '#5EEAD4', backgroundColor: 'rgba(94, 234, 212, 0.1)' }]}
                          >
                            <UserPlus size={12} color="#5EEAD4" style={{ marginRight: 6 }} />
                            <Text style={s.draftMsgBtnText}>Connect</Text>
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
              <Sparkles size={22} color={MC.tealP} style={{ marginBottom: 8 }} />
              <Text style={s.stubTitle}>No Matches Found</Text>
              <Text style={s.stubSub}>
                There are no matching network accounts in the database for this category right now.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 4. Requests Tab Redesign (Screenshot 2) */}
      {tab === 'requests' && (
        <View style={{ gap: 16 }}>
          
          {/* Incoming Requests (2) */}
          <View style={s.requestListFrame}>
            <View style={s.requestListHeaderRow}>
              <Clock size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={[s.requestListTitle, { color: '#F59E0B' }]}>INCOMING REQUESTS ({incomingRequests.length})</Text>
            </View>

            <View style={{ gap: 8, marginTop: 10 }}>
              {incomingRequests.map((req) => {
                const tagStyle = req.role === 'Student' ? s.rolePillStudent : s.rolePillAlumni;
                const tagTextStyle = req.role === 'Student' ? s.rolePillStudentText : s.rolePillAlumniText;

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
              {sentRequests.map((req) => (
                <View key={req.id} style={s.requestRow}>
                  <Av initials={req.avatar} size={42} color={req.color} />
                  <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={s.requestName}>{req.name}</Text>
                      <View style={[s.rolePillBase, s.rolePillIndustry]}>
                        <Text style={[s.rolePillBaseText, s.rolePillIndustryText]}>{req.role}</Text>
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
              ))}

              {sentRequests.length === 0 && (
                <Text style={s.noRequestText}>No pending sent requests.</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Connection Request Modal */}
      <Modal visible={!!connectPerson} transparent animationType="fade" onRequestClose={() => setConnectPerson(null)}>
        <View style={s.overlay}>
          {connectPerson && (
            <View style={s.draftModal}>
              <View style={s.modalHeaderBox}>
                <UserPlus size={20} color="#5EEAD4" />
                <Text style={s.draftModalTitle}>Connect with {connectPerson.name}</Text>
              </View>

              {!showNoteInput ? (
                <View style={{ gap: 12, marginTop: 16 }}>
                  <Pressable
                    onPress={() => setShowNoteInput(true)}
                    style={({ hovered }: any) => [
                      s.draftSendBtn,
                      { backgroundColor: 'transparent', borderColor: '#5EEAD4', borderWidth: 1, height: 42, justifyContent: 'center' },
                      hovered && { backgroundColor: 'rgba(94, 234, 212, 0.1)' }
                    ]}
                  >
                    <MessageSquare size={14} color="#5EEAD4" style={{ marginRight: 6 }} />
                    <Text style={[s.draftSendText, { color: '#5EEAD4' }]}>Send with a note</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => sendConnectionRequestFlow(false)}
                    style={({ hovered }: any) => [
                      s.draftSendBtn,
                      { height: 42, justifyContent: 'center' },
                      hovered && { opacity: 0.9 }
                    ]}
                  >
                    <UserPlus size={14} color="#090D16" style={{ marginRight: 6 }} />
                    <Text style={s.draftSendText}>Send without a note</Text>
                  </Pressable>

                  <Pressable onPress={() => setConnectPerson(null)} style={[s.draftCancelBtn, { marginTop: 6 }]}>
                    <Text style={s.draftCancelText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={s.draftModalLabel}>PERSONALIZE YOUR INVITATION NOTE</Text>
                  <View style={s.draftTextContainer}>
                    <TextInput
                      multiline
                      numberOfLines={4}
                      value={connectNoteText}
                      onChangeText={setConnectNoteText}
                      style={s.draftTextInput}
                      placeholder="Write a message..."
                      placeholderTextColor={MC.dim}
                    />
                  </View>

                  <View style={s.draftActions}>
                    <Pressable onPress={() => setShowNoteInput(false)} style={s.draftCancelBtn}>
                      <Text style={s.draftCancelText}>Back</Text>
                    </Pressable>

                    <Pressable onPress={() => sendConnectionRequestFlow(true)} style={s.draftSendBtn}>
                      <Check size={14} color="#090D16" style={{ marginRight: 6 }} />
                      <Text style={s.draftSendText}>Send Request</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* Profile Detail Modal */}
      <Modal visible={!!pickedPerson} animationType="slide" transparent onRequestClose={() => setPickedPerson(null)}>
        <View style={s.backdrop}>
          <Pressable onPress={() => setPickedPerson(null)} style={{ flex: 1 }} />
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {pickedPerson?.kind === 'mentor' ? 'Mentor Profile' : pickedPerson?.kind === 'alumni' ? 'Alumni Profile' : 'Student Profile'}
              </Text>
              <Pressable onPress={() => setPickedPerson(null)} style={s.closeBtn}>
                <X size={16} color="#fff" />
              </Pressable>
            </View>
            {pickedPerson && (() => {
              const isConnected = pickedPerson.status === 'active' || 
                                  pickedPerson.status === 'accepted' || 
                                  pickedPerson.status === 'completed' || 
                                  pickedPerson.connectionState === 'connected';
              const isPending = pickedPerson.status === 'pending' || 
                                pickedPerson.connectionState === 'pending';
              const nameInitials = pickedPerson.avatar || (pickedPerson.name.split(' ').slice(0, 2).map((p: any) => p[0] || '').join('').toUpperCase());
              const titleLine = pickedPerson.role || pickedPerson.subline || 'Member';
              const collegeLine = pickedPerson.company || pickedPerson.college || '';
              const bioText = pickedPerson.bio || pickedPerson.looking || (pickedPerson.goals && pickedPerson.goals[0]) || 'No bio provided.';
              const skillsList = pickedPerson.skills || pickedPerson.tags || pickedPerson.interests || [];

              return (
                <ScrollView style={{ padding: 20 }} contentContainerStyle={{ gap: 16 }}>
                  {/* Basic Info Card */}
                  <View style={s.profileHeaderCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                      <Av initials={nameInitials} size={64} color={pickedPerson.color} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{pickedPerson.name}</Text>
                        <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12.5, marginTop: 4 }}>
                          {titleLine}
                        </Text>
                        <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 2 }}>
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
                            <LinkedinGlyph size={14} color="#fff" />
                          </Pressable>
                        )}
                        {pickedPerson.github && (
                          <Pressable 
                            onPress={() => pickedPerson.github ? Linking.openURL(pickedPerson.github.startsWith('http') ? pickedPerson.github : `https://${pickedPerson.github}`) : alert('No link provided')} 
                            style={s.socialIconBtn}
                          >
                            <Code size={14} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Bio Card */}
                  <View style={s.profileBioCard}>
                    <View style={{ padding: 16 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: FONTS.med, fontSize: 13, lineHeight: 18 }}>
                        {bioText}
                      </Text>
                    </View>
                  </View>

                  {/* Mentor Stats Section */}
                  {pickedPerson.kind === 'mentor' && (
                    <View style={{ gap: 8 }}>
                      <Text style={{ color: '#F97316', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.6 }}>MENTOR STATS</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 10, padding: 12 }}>
                          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>{pickedPerson.rating || 5.0}★</Text>
                          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 4 }}>Rating</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 10, padding: 12 }}>
                          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 15 }}>{pickedPerson.sessions || 0}</Text>
                          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 4 }}>Sessions</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 10, padding: 12 }}>
                          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 13 }} numberOfLines={1}>{pickedPerson.price || 'Free'}</Text>
                          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 10, marginTop: 4 }}>Price</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Skills Section */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.50)', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.6 }}>SKILLS</Text>
                    <View style={s.skillsRow}>
                      {skillsList && skillsList.map((tag: string, idx: number) => (
                        <View key={idx} style={s.skillChip}><Text style={s.skillChipText}>{tag}</Text></View>
                      ))}
                      {(!skillsList || skillsList.length === 0) && (
                        <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12 }}>No specified skills.</Text>
                      )}
                    </View>
                  </View>

                  {/* Connection / Messaging Actions */}
                  <View style={{ marginTop: 8 }}>
                    {isConnected ? (
                      <View style={s.connectedPillLarge}>
                        <Check size={16} color={MC.tealP} style={{ marginRight: 6 }} />
                        <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 14 }}>Connected</Text>
                      </View>
                    ) : isPending ? (
                      <View style={s.pendingPillLarge}>
                        <Clock size={16} color={MC.amber} style={{ marginRight: 6 }} />
                        <Text style={{ color: MC.amber, fontFamily: FONTS.bold, fontSize: 14 }}>Request Pending</Text>
                      </View>
                    ) : pickedPerson.connectionState === 'incoming' ? (
                      <Pressable 
                        onPress={() => {
                          setPickedPerson(null);
                          handleAcceptRequest(pickedPerson.id, pickedPerson.name);
                        }}
                        style={s.connectBtnLarge}
                      >
                        <Check size={16} color="#090D16" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#090D16', fontFamily: FONTS.xbold, fontSize: 14 }}>Accept Connection</Text>
                      </Pressable>
                    ) : (
                      <Pressable 
                        onPress={() => {
                          setPickedPerson(null);
                          openConnectDialog(pickedPerson);
                        }}
                        style={s.connectBtnLarge}
                      >
                        <UserPlus size={16} color="#090D16" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#090D16', fontFamily: FONTS.xbold, fontSize: 14 }}>Connect</Text>
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
      {/* Custom Success Popup */}
      <Modal visible={!!successPopup} transparent animationType="fade" onRequestClose={handleCloseSuccessPopup}>
        {successPopup && (
          <View style={s.successPopupContainer}>
            <View style={s.successPopupContent}>
              <Check size={20} color="#5EEAD4" style={{ marginRight: 12 }} />
              <Text style={s.successPopupText}>{successPopup}</Text>
            </View>
            <Pressable onPress={handleCloseSuccessPopup} style={s.successPopupBtn}>
              <Text style={s.successPopupBtnText}>OK</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 2,
    width: '100%'
  },
  
  // 1. Metric Cards styles
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap'
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricValue: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 18,
    letterSpacing: -0.4
  },
  metricLabel: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10,
    marginTop: 2
  },

  // 2. Tab row styles
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    marginBottom: 16
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  tabPillOn: {
    backgroundColor: '#14B8A6'
  },
  tabPillText: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12.5
  },
  tabPillTextOn: {
    color: '#090D16',
    fontFamily: FONTS.bold
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
    color: MC.muted,
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
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 12
  },
  subFilterTextOn: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold
  },

  // Search input style
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },

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
    borderBottomColor: MC.border,
    borderBottomWidth: 1,
    paddingBottom: 10,
    ...({ cursor: 'pointer' } as any)
  },
  secTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 15,
    letterSpacing: -0.2
  },
  secSub: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11,
    marginTop: 2
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
    backgroundColor: MC.card,
    borderColor: MC.border,
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
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11.5,
    marginTop: 2
  },
  subtitleSubLine: {
    color: MC.dim,
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
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10
  },

  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  mutualText: {
    color: MC.dim,
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
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopColor: MC.border,
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

  // Requests tab layouts
  requestListFrame: {
    backgroundColor: MC.card,
    borderColor: MC.border,
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
    borderBottomColor: MC.border,
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
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10.5,
    marginLeft: 4
  },
  requestSublineText: {
    color: MC.muted,
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
    color: MC.muted,
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
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    paddingVertical: 14,
    textAlign: 'center'
  },

  // Stub structures
  stubCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
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
    color: MC.muted,
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
    borderColor: MC.border2,
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
    backgroundColor: MC.cardSolid || '#131935',
    borderColor: MC.border2,
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
    borderBottomColor: MC.border,
    paddingBottom: 10
  },
  draftModalTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 16
  },
  draftModalLabel: {
    color: MC.dim,
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
    borderColor: MC.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  draftCancelText: {
    color: MC.muted,
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
    alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch',
  },
  modal: {
    backgroundColor: MC.bg2 || '#090D16',
    borderColor: MC.border,
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
    borderBottomColor: MC.border,
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
    backgroundColor: '#14B8A6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  connectedPillLarge: {
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(20,184,166,0.1)',
    borderColor: 'rgba(20,184,166,0.2)',
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
  }
});
