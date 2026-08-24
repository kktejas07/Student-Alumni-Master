/**
 * Mentor Portal — Network View Redesign
 * Complete implementation of Connections, Discover, and Requests tabs.
 * High-fidelity screens matching all reference mockups with interactive states.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Platform, Linking, ActivityIndicator, Modal } from 'react-native';
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
  
  const [showStudents, setShowStudents] = useState(true);
  const [showProfessionals, setShowProfessionals] = useState(true);
  const [showMatchedInterest, setShowMatchedInterest] = useState(true);

  const [connectionsList, setConnectionsList] = useState<any[]>([]);
  const [discoverSections, setDiscoverSections] = useState<any[]>([]);
  const [dbSearchStatus, setDbSearchStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');
  const [dbStatusMsg, setDbStatusMsg] = useState('');
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const [pickedPerson, setPickedPerson] = useState<any | null>(null);

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
          mutual: c.mutual || ((sumChars(c.id || '') % 12) + 2),
          linkedin: c.linkedin_url || c.linkedin || '',
          github: c.github_url || c.github || ''
        };
      }));
    } catch (e) {
      console.warn('Failed to load connections:', e);
    }
  };

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

  useEffect(() => {
    if (tab === 'discover' && !searchQuery.trim()) {
      loadDiscover('');
    }
  }, [tab]);

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

  const filteredStudents = useMemo(() => {
    return connectionsList.filter(s => {
      if (s.role !== 'student') return false;
      if (filter !== 'everyone' && filter !== 'students') return false;
      const matchText = `${s.name} ${s.branch} ${s.college} ${s.tags ? s.tags.join(' ') : ''}`.toLowerCase();
      return matchText.includes(searchQuery.toLowerCase());
    });
  }, [connectionsList, filter, searchQuery]);

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

  const activeSection = useMemo(() => {
    if (searchQuery.trim()) {
      const searchSec = discoverSections.find(s => s.key === 'search_results');
      if (searchSec) return searchSec;
    }
    let secKey = 'by_interest';
    if (discoverSubTab === 'path') secKey = 'by_career';
    if (discoverSubTab === 'college') secKey = 'by_college';
    if (discoverSubTab === 'recommended') secKey = 'mentors';
    if (discoverSubTab === 'expand') secKey = 'expand';

    return discoverSections.find(s => s.key === secKey) || discoverSections.find(s => s.key === 'search_results') || discoverSections[0];
  }, [discoverSections, discoverSubTab, searchQuery]);

  const normalizedDiscover = useMemo(() => {
    return (activeSection?.items || []).map(normalizeDiscoverUser);
  }, [activeSection]);

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
      toast.success('Connection request sent', `Invite sent to ${connectPerson.name}.`);
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
      <View className="p-[60px] items-center justify-center">
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  return (
    <View className="p-[2px] w-full">
      
      <View className="flex-row gap-3 mb-5 flex-wrap">
        <View className="flex-1 flex-row items-center gap-3 bg-card border border-glass-border rounded-[14px] p-3.5 min-w-[200px]" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
          <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(20,184,166,0.1)' }}>
            <Users size={16} color="#5EEAD4" />
          </View>
          <View>
            <Text className="text-white font-display-bold text-[18px] tracking-[-0.4px]">{totalConnectionsCount}</Text>
            <Text className="text-dim font-body-bold text-[10px] mt-[2px]">Connections</Text>
          </View>
        </View>

        <View className="flex-1 flex-row items-center gap-3 bg-card border border-glass-border rounded-[14px] p-3.5 min-w-[200px]" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
          <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
            <Video size={16} color="#93C5FD" />
          </View>
          <View>
            <Text className="text-white font-display-bold text-[18px] tracking-[-0.4px]">{totalSessionsDone}</Text>
            <Text className="text-dim font-body-bold text-[10px] mt-[2px]">Sessions done</Text>
          </View>
        </View>

        <View className="flex-1 flex-row items-center gap-3 bg-card border border-glass-border rounded-[14px] p-3.5 min-w-[200px]" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
          <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
            <Activity size={16} color="#86EFAC" />
          </View>
          <View>
            <Text className="text-white font-display-bold text-[18px] tracking-[-0.4px]">{activeStudentsCount}</Text>
            <Text className="text-dim font-body-bold text-[10px] mt-[2px]">Active students</Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-2 bg-white/[0.03] border border-glass-border rounded-xl p-1.5 mb-4">
        <Pressable 
          onPress={() => setTab('connections')} 
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-transparent cursor-pointer ${tab === 'connections' ? 'bg-[#14B8A6]' : ''}`}
        >
          <Users size={13} color={tab === 'connections' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text className={`text-muted font-body-semibold text-[12.5px] ${tab === 'connections' ? 'text-[#090D16] font-body-bold' : ''}`}>My Connections</Text>
          <View className={`ml-1.5 px-1.5 py-[2px] rounded-md bg-white/[0.08] ${tab === 'connections' ? 'bg-[#090D16]/[0.15]' : ''}`}>
            <Text className={`text-muted font-display-bold text-[10px] ${tab === 'connections' ? 'text-[#090D16]' : ''}`}>{totalConnectionsCount}</Text>
          </View>
        </Pressable>

        <Pressable 
          onPress={() => setTab('discover')} 
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-transparent cursor-pointer ${tab === 'discover' ? 'bg-[#14B8A6]' : ''}`}
        >
          <Activity size={13} color={tab === 'discover' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text className={`text-muted font-body-semibold text-[12.5px] ${tab === 'discover' ? 'text-[#090D16] font-body-bold' : ''}`}>Discover</Text>
        </Pressable>

        <Pressable 
          onPress={() => setTab('requests')} 
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-transparent cursor-pointer ${tab === 'requests' ? 'bg-[#14B8A6]' : ''}`}
        >
          <User size={13} color={tab === 'requests' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text className={`text-muted font-body-semibold text-[12.5px] ${tab === 'requests' ? 'text-[#090D16] font-body-bold' : ''}`}>Requests</Text>
          <View className={`ml-1.5 px-1.5 py-[2px] rounded-md bg-[#F59E0B]/[0.18] ${tab === 'requests' ? 'bg-[#090D16]/[0.15]' : ''}`}>
            <Text className="text-[#F59E0B] font-display-bold text-[10px]">{incomingRequests.length + sentRequests.length}</Text>
          </View>
        </Pressable>
      </View>

      {tab === 'connections' && (
        <View className="gap-4">
          
          <View className="flex-row flex-wrap gap-2 mb-1">
            {['everyone', 'students', 'alumnis', 'mentors', 'industry'].map((f) => (
              <Pressable 
                key={f}
                onPress={() => setFilter(f as FilterType)} 
                className={`px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] cursor-pointer ${filter === f ? 'bg-[#14B8A6]/[0.15] border-[#14B8A6]/[0.35]' : ''}`}
              >
                <Text className={`text-muted font-body-semibold text-[12px] ${filter === f ? 'text-[#5EEAD4] font-body-bold' : ''}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row items-center bg-black/20 border border-glass-border rounded-[10px] px-3 h-10 mb-2.5">
            <Search size={14} color={MC.dim} style={{ marginRight: 10 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your connections..."
              placeholderTextColor={MC.dim}
              className="flex-1 text-white font-body-semibold text-[13px]"
              style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
            />
          </View>

          {filteredStudents.length > 0 && (
            <View className="gap-3.5 mb-4">
              <Pressable 
                onPress={() => setShowStudents(!showStudents)} 
                className="flex-row items-center border-b border-glass-border pb-2.5 cursor-pointer"
              >
                <GraduationCap size={18} color="#5EEAD4" style={{ marginRight: 8 }} />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-white font-display-bold text-[15px] tracking-[-0.2px]">My Students</Text>
                    <View className="px-1.5 py-[2px] rounded bg-[#14B8A6]/[0.1]">
                      <Text className="text-[#5EEAD4] font-display-bold text-[9.5px]">{filteredStudents.length}</Text>
                    </View>
                  </View>
                  <Text className="text-dim font-body-semibold text-[11px] mt-[2px]">Students currently under your mentorship</Text>
                </View>
                <Pressable onPress={() => setShowStudents(!showStudents)} className="flex-row items-center px-2.5 h-7 rounded-md bg-[#14B8A6]/[0.06] cursor-pointer">
                  <Text className="text-[#5EEAD4] font-body-bold text-[11px]">{showStudents ? 'Show less' : 'Show more'}</Text>
                  {showStudents ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showStudents && (
                <View className="flex-row flex-wrap gap-3">
                  {filteredStudents.map((student) => {
                    const primaryTag = student.tags && student.tags[0] ? student.tags[0] : 'General';
                    const secondTag = student.tags && student.tags[1] ? student.tags[1] : '';
                    
                    return (
                      <View key={student.id} className="grow basis-[280px] max-w-[350px] h-[280px] justify-between bg-card border border-glass-border rounded-2xl p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                        <View>
                          <View className="flex-row items-center">
                            <Av initials={student.avatar} size={42} color={student.color} />
                            <View className="flex-1 min-w-0 ml-2.5">
                              <View className="flex-row items-center gap-1.5 flex-wrap">
                                <Text numberOfLines={1} className="text-white font-body-bold text-[14.5px]">{student.name}</Text>
                                <View className="px-[7px] py-[2px] rounded bg-[#34D399]/[0.12]">
                                  <Text className="text-[#86EFAC] font-body-bold text-[9.5px]">Student</Text>
                                </View>
                              </View>
                              <Text numberOfLines={1} className="text-muted font-body-semibold text-[11.5px] mt-[2px]">{student.branch}</Text>
                              <Text numberOfLines={1} className="text-dim font-body-semibold text-[10.5px]">{student.college}</Text>
                            </View>
                          </View>

                          <View className="flex-row flex-wrap gap-1.5 mt-[2px]">
                            <View className="px-2 py-[4.5px] rounded-md bg-white/[0.03] border border-white/[0.05]"><Text className="text-dim font-body-bold text-[10px]">{primaryTag}</Text></View>
                            {secondTag && (
                              <View className="px-2 py-[4.5px] rounded-md bg-white/[0.03] border border-white/[0.05]"><Text className="text-dim font-body-bold text-[10px]">{secondTag}</Text></View>
                            )}
                          </View>

                          <View className="flex-row items-center mt-[2px]">
                            <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
                            <Text className="text-dim font-body-semibold text-[11px]">{student.messages || 1} mutual connection{student.messages === 1 ? '' : 's'}</Text>
                          </View>

                          <View className="mt-1 gap-[5px]">
                            <View className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                              <View className="h-1 rounded-full bg-[#10B981]" style={{ width: `${student.progress}%`, shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 3 }} />
                            </View>
                            <Text className="text-dim font-body-semibold text-[10.5px]">{student.progress}% mentoring progress</Text>
                          </View>
                        </View>

                        <View className="flex-row justify-between items-center border-t border-glass-border pt-3 mt-1">
                          <Pressable 
                            onPress={() => setPickedPerson(student)}
                            style={({ hovered }: any) => ({
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              paddingHorizontal: 12, height: 30, borderRadius: 6,
                              backgroundColor: '#14B8A6', cursor: 'pointer',
                              ...(hovered ? { backgroundColor: '#5EEAD4' } : {}),
                            })}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text className="text-[#090D16] font-display-bold text-[11px]">View Profile</Text>
                          </Pressable>

                          <View className="flex-row gap-1.5">
                            <Pressable onPress={() => toast.info('Scheduling session', `Opening scheduler for ${student.name}`)} className="w-[30px] h-[30px] rounded-md border items-center justify-center cursor-pointer" style={{ borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            {student.linkedin && (
                              <Pressable onPress={() => student.linkedin ? Linking.openURL(student.linkedin.startsWith('http') ? student.linkedin : `https://${student.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-[30px] h-[30px] rounded-md border border-white/[0.08] items-center justify-center cursor-pointer" style={{ backgroundColor: '#0A66C2' }}>
                                <LinkedinGlyph size={13} color="#fff" />
                              </Pressable>
                            )}
                            {student.github && (
                              <Pressable onPress={() => student.github ? Linking.openURL(student.github.startsWith('http') ? student.github : `https://${student.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-[30px] h-[30px] rounded-md border border-white/[0.08] items-center justify-center cursor-pointer" style={{ backgroundColor: '#24292e' }}>
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

          {filteredProfessionals.length > 0 && (
            <View className="gap-3.5 mb-4">
              <Pressable 
                onPress={() => setShowProfessionals(!showProfessionals)} 
                className="flex-row items-center border-b border-glass-border pb-2.5 cursor-pointer"
              >
                <Briefcase size={18} color="#5EEAD4" style={{ marginRight: 8 }} />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-white font-display-bold text-[15px] tracking-[-0.2px]">Industry, Alumni & Mentors</Text>
                    <View className="px-1.5 py-[2px] rounded bg-[#14B8A6]/[0.1]">
                      <Text className="text-[#5EEAD4] font-display-bold text-[9.5px]">{filteredProfessionals.length}</Text>
                    </View>
                  </View>
                  <Text className="text-dim font-body-semibold text-[11px] mt-[2px]">Your professional network on SA</Text>
                </View>
                <Pressable onPress={() => setShowProfessionals(!showProfessionals)} className="flex-row items-center px-2.5 h-7 rounded-md bg-[#14B8A6]/[0.06] cursor-pointer">
                  <Text className="text-[#5EEAD4] font-body-bold text-[11px]">{showProfessionals ? 'Show less' : 'Show more'}</Text>
                  {showProfessionals ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showProfessionals && (
                <View className="flex-row flex-wrap gap-3">
                  {filteredProfessionals.map((person) => {
                    const badgeColorClass = person.tag === 'Industry' ? 'bg-[#F59E0B]/[0.12]' : person.tag === 'Mentor' ? 'bg-[#14B8A6]/[0.15] border border-[#14B8A6]/[0.3]' : 'bg-[#3B82F6]/[0.15] border border-[#3B82F6]/[0.3]';
                    const badgeTextClass = person.tag === 'Industry' ? 'text-[#FCD34D]' : person.tag === 'Mentor' ? 'text-[#34D399]' : 'text-[#93C5FD]';

                    return (
                      <View key={person.id} className="grow basis-[280px] max-w-[350px] h-[280px] justify-between bg-card border border-glass-border rounded-2xl p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                        <View>
                          <View className="flex-row items-center">
                            <Av initials={person.avatar} size={42} color={person.color} />
                            <View className="flex-1 min-w-0 ml-2.5">
                              <View className="flex-row items-center gap-1.5 flex-wrap">
                                <Text numberOfLines={1} className="text-white font-body-bold text-[14.5px]">{person.name}</Text>
                                <View className={`px-[7px] py-[2px] rounded ${badgeColorClass}`}>
                                  <Text className={`font-body-bold text-[9.5px] ${badgeTextClass}`}>{person.tag}</Text>
                                </View>
                              </View>
                              <Text numberOfLines={1} className="text-muted font-body-semibold text-[11.5px] mt-[2px]">{person.role}</Text>
                              <Text numberOfLines={1} className="text-dim font-body-semibold text-[10.5px]">{person.company}</Text>
                            </View>
                          </View>

                          <View className="flex-row flex-wrap gap-1.5 mt-[2px]">
                            {person.tags.map((skill, sIdx) => (
                              <View key={sIdx} className="px-2 py-[4.5px] rounded-md bg-white/[0.03] border border-white/[0.05]"><Text className="text-dim font-body-bold text-[10px]">{skill}</Text></View>
                            ))}
                          </View>

                          <View className="flex-row items-center mt-[2px]">
                            <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
                            <Text className="text-dim font-body-semibold text-[11px]">{person.mutual} mutual connections</Text>
                          </View>
                        </View>

                        <View className="flex-row justify-between items-center border-t border-glass-border pt-3 mt-3.5">
                          <Pressable 
                            onPress={() => setPickedPerson(person)}
                            style={({ hovered }: any) => ({
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              paddingHorizontal: 12, height: 30, borderRadius: 6,
                              backgroundColor: '#14B8A6', cursor: 'pointer',
                              ...(hovered ? { backgroundColor: '#5EEAD4' } : {}),
                            })}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text className="text-[#090D16] font-display-bold text-[11px]">View Profile</Text>
                          </Pressable>

                          <View className="flex-row gap-1.5">
                            <Pressable onPress={() => toast.info('Starting chat', `Opening messages with ${person.name}`)} className="w-[30px] h-[30px] rounded-md border items-center justify-center cursor-pointer" style={{ borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-[30px] h-[30px] rounded-md border border-white/[0.08] items-center justify-center cursor-pointer" style={{ backgroundColor: '#0A66C2' }}>
                              <LinkedinGlyph size={13} color="#fff" />
                            </Pressable>
                            {person.github && (
                              <Pressable onPress={() => person.github ? Linking.openURL(person.github.startsWith('http') ? person.github : `https://${person.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-[30px] h-[30px] rounded-md border border-white/[0.08] items-center justify-center cursor-pointer" style={{ backgroundColor: '#24292e' }}>
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

      {tab === 'discover' && (
        <View className="gap-4">
          
          <View className="flex-row flex-wrap gap-2 mb-1">
            {['everyone', 'students', 'alumnis', 'mentors', 'industry'].map((f) => (
              <Pressable 
                key={f}
                onPress={() => setFilter(f as FilterType)} 
                className={`px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] cursor-pointer ${filter === f ? 'bg-[#14B8A6]/[0.15] border-[#14B8A6]/[0.35]' : ''}`}
              >
                <Text className={`text-muted font-body-semibold text-[12px] ${filter === f ? 'text-[#5EEAD4] font-body-bold' : ''}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="gap-2 mb-4">
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center bg-black/20 border border-glass-border rounded-[10px] px-3 h-10 flex-1 mb-0">
                <Search size={14} color={MC.dim} style={{ marginRight: 10 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={(val) => {
                    setSearchQuery(val);
                    if (!val.trim() && dbSearchStatus !== 'idle') {
                      setDbSearchStatus('idle');
                      setDbStatusMsg('');
                    }
                  }}
                  onSubmitEditing={() => handleDatabaseSearch()}
                  placeholder="Filter displayed accounts or search DB..."
                  placeholderTextColor={MC.dim}
                  className="flex-1 text-white font-body-semibold text-[13px]"
                  style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                />
                {searchQuery ? (
                  <Pressable onPress={() => { setSearchQuery(''); setDbSearchStatus('idle'); setDbStatusMsg(''); }} className="p-1">
                    <X size={14} color={MC.dim} />
                  </Pressable>
                ) : null}
              </View>

              <Pressable 
                onPress={() => handleDatabaseSearch()}
                disabled={dbSearchStatus === 'searching'}
                className="flex-row items-center justify-center bg-[#3B82F6] rounded-[10px] px-3.5 h-[42px]"
                style={{ opacity: dbSearchStatus === 'searching' ? 0.7 : 1 }}
              >
                {dbSearchStatus === 'searching' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Search size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                    <Text className="text-white text-[13px] font-body-semibold font-semibold">Search DB</Text>
                  </>
                )}
              </Pressable>
            </View>

            {dbSearchStatus !== 'idle' && (
              <View className="flex-row items-center px-3 py-2 rounded-lg border" style={{
                backgroundColor: dbSearchStatus === 'searching' ? 'rgba(59, 130, 246, 0.1)' : dbSearchStatus === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderColor: dbSearchStatus === 'searching' ? 'rgba(59, 130, 246, 0.3)' : dbSearchStatus === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              }}>
                {dbSearchStatus === 'searching' && <ActivityIndicator size="small" color="#60A5FA" style={{ marginRight: 8 }} />}
                {dbSearchStatus === 'success' && <Check size={14} color="#34D399" style={{ marginRight: 8 }} />}
                {dbSearchStatus === 'error' && <X size={14} color="#F87171" style={{ marginRight: 8 }} />}
                <Text className="text-[12px] font-body-semibold" style={{
                  color: dbSearchStatus === 'searching' ? '#60A5FA' : dbSearchStatus === 'success' ? '#34D399' : '#F87171'
                }}>
                  {dbStatusMsg}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap gap-2 mb-3">
            <Pressable 
              onPress={() => setDiscoverSubTab('interest')}
              className={`flex-row items-center px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] cursor-pointer ${discoverSubTab === 'interest' ? 'border-[#14B8A6]/[0.25] bg-[#14B8A6]/[0.08]' : ''}`}
            >
              <Heart size={12} color={discoverSubTab === 'interest' ? '#5EEAD4' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className={`text-[#E2E8F0] font-body-semibold text-[11.5px] ${discoverSubTab === 'interest' ? 'text-[#5EEAD4] font-body-bold' : ''}`}>Matched by Interest</Text>
              <View className={`ml-1.5 px-1.5 py-[2px] rounded-md bg-white/[0.06] ${discoverSubTab === 'interest' ? 'bg-[#14B8A6]/[0.15]' : ''}`}><Text className="text-[#5EEAD4] font-display-bold text-[9.5px]">{discoverCounts.interest}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('path')}
              className={`flex-row items-center px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] cursor-pointer ${discoverSubTab === 'path' ? 'border-[#14B8A6]/[0.25] bg-[#14B8A6]/[0.08]' : ''}`}
            >
              <Settings size={12} color={discoverSubTab === 'path' ? '#F97316' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[#E2E8F0] font-body-semibold text-[11.5px]">Matched by Career Path</Text>
              <View className="ml-1.5 px-1.5 py-[2px] rounded-md" style={{ backgroundColor: 'rgba(249,115,22,0.1)' }}><Text className="text-[#F97316] font-display-bold text-[9.5px]">{discoverCounts.path}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('college')}
              className={`flex-row items-center px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] cursor-pointer ${discoverSubTab === 'college' ? 'border-[#14B8A6]/[0.25] bg-[#14B8A6]/[0.08]' : ''}`}
            >
              <GraduationCap size={12} color={discoverSubTab === 'college' ? '#3B82F6' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[#E2E8F0] font-body-semibold text-[11.5px]">From Your College</Text>
              <View className="ml-1.5 px-1.5 py-[2px] rounded-md" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}><Text className="text-[#3B82F6] font-display-bold text-[9.5px]">{discoverCounts.college}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('recommended')}
              className={`flex-row items-center px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] cursor-pointer ${discoverSubTab === 'recommended' ? 'border-[#14B8A6]/[0.25] bg-[#14B8A6]/[0.08]' : ''}`}
            >
              <Users size={12} color={discoverSubTab === 'recommended' ? '#F59E0B' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[#E2E8F0] font-body-semibold text-[11.5px]">Recommended Mentors</Text>
              <View className="ml-1.5 px-1.5 py-[2px] rounded-md" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}><Text className="text-[#F59E0B] font-display-bold text-[9.5px]">{discoverCounts.recommended}</Text></View>
            </Pressable>

            <Pressable 
              onPress={() => setDiscoverSubTab('expand')}
              className={`flex-row items-center px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] cursor-pointer ${discoverSubTab === 'expand' ? 'border-[#14B8A6]/[0.25] bg-[#14B8A6]/[0.08]' : ''}`}
            >
              <Activity size={12} color={discoverSubTab === 'expand' ? '#EC4899' : '#E2E8F0'} style={{ marginRight: 6 }} />
              <Text className="text-[#E2E8F0] font-body-semibold text-[11.5px]">Expand Your Horizons</Text>
              <View className="ml-1.5 px-1.5 py-[2px] rounded-md" style={{ backgroundColor: 'rgba(236,72,153,0.1)' }}><Text className="text-[#EC4899] font-display-bold text-[9.5px]">{discoverCounts.expand}</Text></View>
            </Pressable>
          </View>

          {filteredMatchedDiscover.length > 0 && (
            <View className="gap-3.5 mb-4">
              <Pressable 
                onPress={() => setShowMatchedInterest(!showMatchedInterest)} 
                className="flex-row items-center border-b border-glass-border pb-2.5 cursor-pointer"
              >
                {discoverSubTab === 'interest' ? <Heart size={18} color="#5EEAD4" style={{ marginRight: 8 }} /> : discoverSubTab === 'path' ? <Briefcase size={18} color="#F97316" style={{ marginRight: 8 }} /> : discoverSubTab === 'college' ? <GraduationCap size={18} color="#3B82F6" style={{ marginRight: 8 }} /> : discoverSubTab === 'recommended' ? <Users size={18} color="#F59E0B" style={{ marginRight: 8 }} /> : <Activity size={18} color="#EC4899" style={{ marginRight: 8 }} />}
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-white font-display-bold text-[15px] tracking-[-0.2px]">
                      {discoverSubTab === 'interest' ? 'Matched by Interest' : discoverSubTab === 'path' ? 'Matched by Career Path' : discoverSubTab === 'college' ? 'From Your College' : discoverSubTab === 'recommended' ? 'Recommended Mentors' : 'Expand Your Horizons'}
                    </Text>
                    <View className="px-1.5 py-[2px] rounded bg-[#14B8A6]/[0.1]">
                      <Text className="text-[#5EEAD4] font-display-bold text-[9.5px]">{filteredMatchedDiscover.length}</Text>
                    </View>
                  </View>
                  <Text className="text-dim font-body-semibold text-[11px] mt-[2px]">{activeSection?.subtitle || 'Based on your profile matching criteria.'}</Text>
                </View>
                <Pressable onPress={() => setShowMatchedInterest(!showMatchedInterest)} className="flex-row items-center px-2.5 h-7 rounded-md bg-[#14B8A6]/[0.06] cursor-pointer">
                  <Text className="text-[#5EEAD4] font-body-bold text-[11px]">{showMatchedInterest ? 'Show less' : 'Show more'}</Text>
                  {showMatchedInterest ? <ChevronUp size={12} color="#5EEAD4" style={{ marginLeft: 4 }} /> : <ChevronDown size={12} color="#5EEAD4" style={{ marginLeft: 4 }} />}
                </Pressable>
              </Pressable>

              {showMatchedInterest && (
                <View className="flex-row flex-wrap gap-3">
                  {filteredMatchedDiscover.map((person) => (
                    <View key={person.id} className="grow basis-[280px] max-w-[350px] h-[280px] justify-between bg-card border border-glass-border rounded-2xl p-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                      <View>
                        <View className="flex-row items-center">
                          <Av initials={person.avatar} size={42} color={person.color} />
                          <View className="flex-1 min-w-0 ml-2.5">
                            <View className="flex-row items-center gap-1.5 flex-wrap">
                              <Text numberOfLines={1} className="text-white font-body-bold text-[14.5px]">{person.name}</Text>
                              <View className={`px-[7px] py-[2px] rounded ${person.tag === 'Student' ? 'bg-[#34D399]/[0.12]' : person.tag === 'Mentor' ? 'bg-[#14B8A6]/[0.15] border border-[#14B8A6]/[0.3]' : 'bg-[#3B82F6]/[0.15] border border-[#3B82F6]/[0.3]'}`}>
                                <Text className={`font-body-bold text-[9.5px] ${person.tag === 'Student' ? 'text-[#86EFAC]' : person.tag === 'Mentor' ? 'text-[#34D399]' : 'text-[#93C5FD]'}`}>{person.tag}</Text>
                              </View>
                            </View>
                            <Text numberOfLines={1} className="text-muted font-body-semibold text-[11.5px] mt-[2px]">{person.role}</Text>
                            <Text numberOfLines={1} className="text-dim font-body-semibold text-[10.5px]">
                              {person.company ? `${person.company} • ` : ''}{person.college}{person.year ? ` • ${person.year}` : ''}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row flex-wrap gap-1.5 mt-[2px]">
                          {person.tags.map((skill: string, sIdx: number) => (
                            <View key={sIdx} className="px-2 py-[4.5px] rounded-md bg-white/[0.03] border border-white/[0.05]"><Text className="text-dim font-body-bold text-[10px]">{skill}</Text></View>
                          ))}
                        </View>

                        <View className="flex-row items-center mt-[2px]">
                          <Users size={12} color={MC.dim} style={{ marginRight: 6 }} />
                          <Text className="text-dim font-body-semibold text-[11px]">{person.mutual} mutual connections</Text>
                        </View>
                      </View>

                      <View className="flex-row justify-between items-center border-t border-glass-border pt-3 mt-3.5 flex-col gap-2 items-stretch">
                        
                        {person.connectionState === 'connected' ? (
                          <View className="flex-row items-center justify-center h-8 rounded-md border w-full" style={{ borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.06)' }}>
                            <Check size={12} color="#86EFAC" style={{ marginRight: 6 }} />
                            <Text className="text-[#86EFAC] font-body-bold text-[11.5px]">Connected</Text>
                          </View>
                        ) : person.connectionState === 'pending' ? (
                          <View className="flex-row items-center justify-center h-8 rounded-md border w-full" style={{ borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.06)' }}>
                            <Clock size={12} color="#FDE047" style={{ marginRight: 6 }} />
                            <Text className="text-[#FDE047] font-body-bold text-[11.5px]">Pending Invite</Text>
                          </View>
                        ) : person.connectionState === 'incoming' ? (
                          <Pressable 
                            onPress={() => handleAcceptRequest(person.id, person.name)}
                            style={({ hovered }: any) => ({
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              height: 32, borderRadius: 6, borderWidth: 1,
                              borderColor: '#5EEAD4', backgroundColor: '#14B8A6',
                              ...(hovered ? { opacity: 0.9 } : {}),
                            })}
                          >
                            <Check size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text className="text-[#090D16] font-body-bold text-[11.5px]">Accept Connection</Text>
                          </Pressable>
                        ) : (
                          <Pressable 
                            onPress={() => openConnectDialog(person)}
                            style={({ hovered }: any) => ({
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              height: 32, borderRadius: 6, borderWidth: 1,
                              borderColor: 'rgba(94, 234, 212, 0.25)', backgroundColor: 'rgba(94, 234, 212, 0.04)',
                              width: '100%', cursor: 'pointer',
                              ...(hovered ? { borderColor: '#5EEAD4', backgroundColor: 'rgba(94, 234, 212, 0.1)' } : {}),
                            })}
                          >
                            <UserPlus size={12} color="#5EEAD4" style={{ marginRight: 6 }} />
                            <Text className="text-[#5EEAD4] font-body-bold text-[11.5px]">Connect</Text>
                          </Pressable>
                        )}

                        <View className="flex-row justify-between items-center w-full gap-1.5">
                          <Pressable 
                            onPress={() => setPickedPerson(person)}
                            style={({ hovered }: any) => ({
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              paddingHorizontal: 12, height: 32, borderRadius: 6,
                              backgroundColor: '#14B8A6', flex: 1, cursor: 'pointer',
                              ...(hovered ? { backgroundColor: '#5EEAD4' } : {}),
                            })}
                          >
                            <Eye size={12} color="#090D16" style={{ marginRight: 6 }} />
                            <Text className="text-[#090D16] font-display-bold text-[11px]">View Profile</Text>
                          </Pressable>

                          <View className="flex-row gap-1.5">
                            <Pressable onPress={() => toast.info('Starting chat', `Opening messages with ${person.name}`)} className="w-8 h-8 rounded-md border items-center justify-center cursor-pointer" style={{ borderColor: '#EF444433', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                              <User size={13} color="#EF4444" />
                            </Pressable>
                            <Pressable onPress={() => person.linkedin ? Linking.openURL(person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-md border border-white/[0.08] items-center justify-center cursor-pointer" style={{ backgroundColor: '#0A66C2' }}>
                              <LinkedinGlyph size={13} color="#fff" />
                            </Pressable>
                            {person.github && (
                              <Pressable onPress={() => person.github ? Linking.openURL(person.github.startsWith('http') ? person.github : `https://${person.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-8 h-8 rounded-md border border-white/[0.08] items-center justify-center cursor-pointer" style={{ backgroundColor: '#24292e' }}>
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
            <View className="bg-card border border-glass-border rounded-2xl p-6 items-center justify-center gap-1.5 mt-2.5 text-center">
              <Sparkles size={22} color={MC.tealP} style={{ marginBottom: 8 }} />
              <Text className="text-white font-display-bold text-[16px]">No Matches Found</Text>
              <Text className="text-muted font-body-semibold text-[12.5px] leading-[18px] text-center max-w-[420px] mb-2">
                There are no matching network accounts in the database for this category right now.
              </Text>
            </View>
          )}
        </View>
      )}

      {tab === 'requests' && (
        <View className="gap-4">
          
          <View className="bg-card border border-glass-border rounded-2xl p-4 gap-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }}>
            <View className="flex-row items-center border-b border-glass-border pb-2.5">
              <Clock size={16} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text className="font-display-bold text-[13px] tracking-[0.8px]" style={{ color: '#F59E0B' }}>INCOMING REQUESTS ({incomingRequests.length})</Text>
            </View>

            <View className="gap-2 mt-2.5">
              {incomingRequests.map((req) => {
                const tagStyleClass = req.role === 'Student' ? 'bg-[#34D399]/[0.12]' : 'bg-[#3B82F6]/[0.15] border border-[#3B82F6]/[0.3]';
                const tagTextClass = req.role === 'Student' ? 'text-[#86EFAC]' : 'text-[#93C5FD]';

                return (
                  <View key={req.id} className="flex-row items-center bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 min-h-[64px]">
                    <Av initials={req.avatar} size={42} color={req.color} />
                    <View className="flex-1 min-w-0 ml-3">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-white font-body-bold text-[14px]">{req.name}</Text>
                        <View className={`px-[7px] py-[2px] rounded ${tagStyleClass}`}>
                          <Text className={`font-body-bold text-[9.5px] ${tagTextClass}`}>{req.role}</Text>
                        </View>
                        <Text className="text-dim font-body-semibold text-[10.5px] ml-1">{req.time}</Text>
                      </View>
                      <Text className="text-muted font-body-semibold text-[11.5px] mt-[2px]" numberOfLines={1}>{req.subtitle}</Text>
                      {req.message ? (
                        <Text className="text-[#5EEAD4] font-body-semibold text-[11.5px] mt-1 italic">
                          Note: "{req.message}"
                        </Text>
                      ) : null}
                    </View>

                    <View className="flex-row gap-2">
                      <Pressable 
                        onPress={() => handleAcceptRequest(req.id, req.name)}
                        style={({ hovered }: any) => ({
                          height: 32, borderRadius: 6, backgroundColor: '#14B8A6',
                          paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          ...(hovered ? { backgroundColor: '#5EEAD4' } : {}),
                        })}
                      >
                        <Text className="text-[#090D16] font-display-bold text-[12px]">Accept</Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => handleIgnoreRequest(req.id, req.name)}
                        style={({ hovered }: any) => ({
                          height: 32, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)',
                          borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
                          paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          ...(hovered ? { backgroundColor: 'rgba(255,255,255,0.08)' } : {}),
                        })}
                      >
                        <Text className="text-muted font-body-bold text-[12px]">Ignore</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {incomingRequests.length === 0 && (
                <Text className="text-dim font-body-semibold text-[12.5px] py-3.5 text-center">No pending incoming requests.</Text>
              )}
            </View>
          </View>

          <View className="bg-card border border-glass-border rounded-2xl p-4 gap-2.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }}>
            <View className="flex-row items-center border-b border-glass-border pb-2.5">
              <Users size={16} color="#14B8A6" style={{ marginRight: 8 }} />
              <Text className="font-display-bold text-[13px] tracking-[0.8px]" style={{ color: '#14B8A6' }}>SENT REQUESTS ({sentRequests.length})</Text>
            </View>

            <View className="gap-2 mt-2.5">
              {sentRequests.map((req) => (
                <View key={req.id} className="flex-row items-center bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 min-h-[64px]">
                  <Av initials={req.avatar} size={42} color={req.color} />
                  <View className="flex-1 min-w-0 ml-3">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-white font-body-bold text-[14px]">{req.name}</Text>
                      <View className="px-[7px] py-[2px] rounded bg-[#F59E0B]/[0.12]">
                        <Text className="font-body-bold text-[9.5px] text-[#FCD34D]">{req.role}</Text>
                      </View>
                      <Text className="text-dim font-body-semibold text-[10.5px] ml-1">{req.time}</Text>
                    </View>
                    <Text className="text-muted font-body-semibold text-[11.5px] mt-[2px]" numberOfLines={1}>{req.subtitle}</Text>
                  </View>

                  <View className="flex-row items-center px-2.5 h-7 rounded-2xl bg-[#F59E0B]/[0.08] border border-[#F59E0B]/[0.22]">
                    <Clock size={11} color="#FCD34D" style={{ marginRight: 4 }} />
                    <Text className="text-[#FCD34D] font-body-bold text-[11px]">Pending</Text>
                  </View>
                </View>
              ))}

              {sentRequests.length === 0 && (
                <Text className="text-dim font-body-semibold text-[12.5px] py-3.5 text-center">No pending sent requests.</Text>
              )}
            </View>
          </View>
        </View>
      )}

      <Modal visible={!!connectPerson} transparent animationType="fade" onRequestClose={() => setConnectPerson(null)}>
        <View className="flex-1 bg-black/[0.85] items-center justify-center p-5">
          {connectPerson && (
            <View className="bg-card border border-glass-border rounded-2xl p-[22px] w-full max-w-[460px] gap-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
              <View className="flex-row items-center gap-2 border-b border-glass-border pb-2.5">
                <UserPlus size={20} color="#5EEAD4" />
                <Text className="text-white font-display-bold text-[16px]">Connect with {connectPerson.name}</Text>
              </View>

              {!showNoteInput ? (
                <View className="gap-3 mt-4">
                  <Pressable
                    onPress={() => setShowNoteInput(true)}
                    style={({ hovered }: any) => ({
                      flex: 1.5, height: 42, borderRadius: 10,
                      backgroundColor: 'transparent', borderColor: '#5EEAD4', borderWidth: 1,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      ...(hovered ? { backgroundColor: 'rgba(94, 234, 212, 0.1)' } : {}),
                    })}
                  >
                    <MessageSquare size={14} color="#5EEAD4" style={{ marginRight: 6 }} />
                    <Text className="text-[#5EEAD4] font-display-bold text-[13px]">Send with a note</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => sendConnectionRequestFlow(false)}
                    style={({ hovered }: any) => ({
                      flex: 1.5, height: 42, borderRadius: 10,
                      backgroundColor: '#14B8A6', flexDirection: 'row',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      ...(hovered ? { opacity: 0.9 } : {}),
                    })}
                  >
                    <UserPlus size={14} color="#090D16" style={{ marginRight: 6 }} />
                    <Text className="text-[#090D16] font-display-bold text-[13px]">Send without a note</Text>
                  </Pressable>

                  <Pressable onPress={() => setConnectPerson(null)} className="flex-1 h-[38px] rounded-[10px] border border-glass-border items-center justify-center cursor-pointer mt-1.5">
                    <Text className="text-muted font-body-bold text-[13px]">Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="mt-3">
                  <Text className="text-dim font-body-bold text-[9.5px] tracking-[0.8px] mt-1">PERSONALIZE YOUR INVITATION NOTE</Text>
                  <View className="bg-black/[0.25] border border-white/[0.06] rounded-[10px] p-2.5 min-h-[120px]">
                    <TextInput
                      multiline
                      numberOfLines={4}
                      value={connectNoteText}
                      onChangeText={setConnectNoteText}
                      className="text-white font-body-semibold text-[13px] leading-[18px]"
                      style={{ textAlignVertical: 'top', height: '100%', width: '100%', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}) }}
                      placeholder="Write a message..."
                      placeholderTextColor={MC.dim}
                    />
                  </View>

                  <View className="flex-row w-full gap-2.5 mt-2.5">
                    <Pressable onPress={() => setShowNoteInput(false)} className="flex-1 h-[38px] rounded-[10px] border border-glass-border items-center justify-center cursor-pointer">
                      <Text className="text-muted font-body-bold text-[13px]">Back</Text>
                    </Pressable>

                    <Pressable onPress={() => sendConnectionRequestFlow(true)} className="flex-1.5 h-[38px] rounded-[10px] bg-[#14B8A6] flex-row items-center justify-center cursor-pointer">
                      <Check size={14} color="#090D16" style={{ marginRight: 6 }} />
                      <Text className="text-[#090D16] font-display-bold text-[13px]">Send Request</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={!!pickedPerson} animationType="slide" transparent onRequestClose={() => setPickedPerson(null)}>
        <View className="flex-1 bg-black/[0.85] justify-end" style={{ alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch' }}>
          <Pressable onPress={() => setPickedPerson(null)} className="flex-1" />
          <View style={{
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
            shadowRadius: 20,
          }}>
            <View className="flex-row items-center justify-between p-4 border-b border-glass-border">
              <Text className="text-white font-display-bold text-[15px]">
                {pickedPerson?.kind === 'mentor' ? 'Mentor Profile' : pickedPerson?.kind === 'alumni' ? 'Alumni Profile' : 'Student Profile'}
              </Text>
              <Pressable onPress={() => setPickedPerson(null)} className="p-1 cursor-pointer">
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
                  <View className="bg-white/[0.03] border border-white/[0.08] rounded-xl">
                    <View className="flex-row items-center gap-3 p-4">
                      <Av initials={nameInitials} size={64} color={pickedPerson.color} />
                      <View className="flex-1 min-w-0">
                        <Text className="text-white font-display-bold text-[18px]">{pickedPerson.name}</Text>
                        <Text className="text-muted font-body-semibold text-[12.5px] mt-1">
                          {titleLine}
                        </Text>
                        <Text className="text-dim font-body-semibold text-[11.5px] mt-[2px]">
                          {collegeLine}
                        </Text>
                      </View>
                      
                      <View className="flex-row gap-1.5 self-start">
                        {pickedPerson.linkedin && (
                          <Pressable 
                            onPress={() => pickedPerson.linkedin ? Linking.openURL(pickedPerson.linkedin.startsWith('http') ? pickedPerson.linkedin : `https://${pickedPerson.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} 
                            className="w-8 h-8 rounded-lg items-center justify-center bg-white/[0.05] border border-white/[0.09] cursor-pointer"
                          >
                            <LinkedinGlyph size={14} color="#fff" />
                          </Pressable>
                        )}
                        {pickedPerson.github && (
                          <Pressable 
                            onPress={() => pickedPerson.github ? Linking.openURL(pickedPerson.github.startsWith('http') ? pickedPerson.github : `https://${pickedPerson.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} 
                            className="w-8 h-8 rounded-lg items-center justify-center bg-white/[0.05] border border-white/[0.09] cursor-pointer"
                          >
                            <Code size={14} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>

                  <View className="bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <View className="p-4">
                      <Text className="text-white/75 font-body-semibold text-[13px] leading-[18px]">
                        {bioText}
                      </Text>
                    </View>
                  </View>

                  {pickedPerson.kind === 'mentor' && (
                    <View className="gap-2">
                      <Text className="text-[#F97316] font-body-bold text-[11px] tracking-[0.6px]">MENTOR STATS</Text>
                      <View className="flex-row gap-2">
                        <View className="flex-1 items-center justify-center bg-white/[0.02] border border-white/[0.05] rounded-[10px] p-3">
                          <Text className="text-white font-display-bold text-[15px]">{pickedPerson.rating || 5.0}★</Text>
                          <Text className="text-muted font-body-semibold text-[10px] mt-1">Rating</Text>
                        </View>
                        <View className="flex-1 items-center justify-center bg-white/[0.02] border border-white/[0.05] rounded-[10px] p-3">
                          <Text className="text-white font-display-bold text-[15px]">{pickedPerson.sessions || 0}</Text>
                          <Text className="text-muted font-body-semibold text-[10px] mt-1">Sessions</Text>
                        </View>
                        <View className="flex-1 items-center justify-center bg-white/[0.02] border border-white/[0.05] rounded-[10px] p-3">
                          <Text className="text-white font-display-bold text-[13px]" numberOfLines={1}>{pickedPerson.price || 'Free'}</Text>
                          <Text className="text-muted font-body-semibold text-[10px] mt-1">Price</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View className="gap-2">
                    <Text className="text-white/50 font-body-bold text-[11px] tracking-[0.6px]">SKILLS</Text>
                    <View className="flex-row flex-wrap gap-1.5 mt-[2px]">
                      {skillsList && skillsList.map((tag: string, idx: number) => (
                        <View key={idx} className="px-2 py-[4.5px] rounded-md bg-white/[0.03] border border-white/[0.05]"><Text className="text-dim font-body-bold text-[10px]">{tag}</Text></View>
                      ))}
                      {(!skillsList || skillsList.length === 0) && (
                        <Text className="text-muted font-body-semibold text-[12px]">No specified skills.</Text>
                      )}
                    </View>
                  </View>

                  <View className="mt-2">
                    {isConnected ? (
                      <View className="h-11 rounded-[10px] bg-[#14B8A6]/[0.1] border border-[#14B8A6]/[0.2] flex-row items-center justify-center">
                        <Check size={16} color={MC.tealP} style={{ marginRight: 6 }} />
                        <Text className="text-tealP font-body-bold text-[14px]">Connected</Text>
                      </View>
                    ) : isPending ? (
                      <View className="h-11 rounded-[10px] bg-[#F59E0B]/[0.1] border border-[#F59E0B]/[0.2] flex-row items-center justify-center">
                        <Clock size={16} color={MC.amber} style={{ marginRight: 6 }} />
                        <Text className="text-amber font-body-bold text-[14px]">Request Pending</Text>
                      </View>
                    ) : pickedPerson.connectionState === 'incoming' ? (
                      <Pressable 
                        onPress={() => {
                          setPickedPerson(null);
                          handleAcceptRequest(pickedPerson.id, pickedPerson.name);
                        }}
                        className="h-11 rounded-[10px] bg-[#14B8A6] flex-row items-center justify-center cursor-pointer"
                      >
                        <Check size={16} color="#090D16" style={{ marginRight: 6 }} />
                        <Text className="text-[#090D16] font-display-bold text-[14px]">Accept Connection</Text>
                      </Pressable>
                    ) : (
                      <Pressable 
                        onPress={() => {
                          setPickedPerson(null);
                          openConnectDialog(pickedPerson);
                        }}
                        className="h-11 rounded-[10px] bg-[#14B8A6] flex-row items-center justify-center cursor-pointer"
                      >
                        <UserPlus size={16} color="#090D16" style={{ marginRight: 6 }} />
                        <Text className="text-[#090D16] font-display-bold text-[14px]">Connect</Text>
                      </Pressable>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      <Modal visible={!!successPopup} transparent animationType="fade" onRequestClose={handleCloseSuccessPopup}>
        {successPopup && (
          <View className="absolute top-6 right-6 bg-[#090D16] border border-[#5EEAD4] rounded-xl p-4 w-[320px] z-[10000]" style={{ shadowColor: '#5EEAD4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10 }}>
            <View className="flex-row items-center mb-4">
              <Check size={20} color="#5EEAD4" style={{ marginRight: 12 }} />
              <Text className="text-[#E2E8F0] font-body-semibold text-[14px] flex-1">{successPopup}</Text>
            </View>
            <Pressable onPress={handleCloseSuccessPopup} className="bg-[#14B8A6] rounded-md py-2 items-center justify-center">
              <Text className="text-[#090D16] font-body-bold text-[13px]">OK</Text>
            </Pressable>
          </View>
        )}
      </Modal>
    </View>
  );
}
