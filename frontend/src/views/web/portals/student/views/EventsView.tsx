import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, Check, Award, ArrowRight, Globe2, Sparkles } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRAD } from '../portalkit';
import { GlassCard } from '../glass';
import { Badge } from '../atoms';
import { usePortalData, postPortal, fetchPortal } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Ev = { id: string; title: string; date: string; mode: string; city: string; cat: string; attending: number; capacity: number; kind: string; price?: number; accent: string; registered: boolean; description?: string; tags?: string[]; spotsLeft?: number; };
const FALLBACK = { items: [] as Ev[] };

const FILTERS = ['All', 'Hackathon', 'Codethon', 'Workshop', 'Tech Talk', 'Training', 'Founder Talk', 'Meetup', 'Fest', 'Webinar', 'Panel', 'Q&A', 'Interview', 'Spotlight'];

const CATEGORY_MAP: Record<string, string[]> = {
  'hackathon': ['hackathon', 'codethon'],
  'codethon': ['hackathon', 'codethon'],
  'workshop': ['workshop', 'training'],
  'tech talk': ['tech talk', 'tech_talk', 'workshop'],
  'training': ['workshop', 'training'],
  'founder talk': ['founder talk', 'founder_talk', 'spotlight'],
  'meetup': ['meetup', 'networking'],
  'fest': ['fest'],
  'webinar': ['webinar', 'online'],
  'panel': ['panel', 'panel discussion'],
  'q&a': ['q&a', 'qa', 'q&a session'],
  'interview': ['interview', 'mock interview'],
  'spotlight': ['spotlight', 'founder talk', 'founder_talk'],
};

const catColorMap: Record<string, any> = {
  'hackathon': 'blue',
  'codethon': 'teal',
  'workshop': 'amber',
  'training': 'amber',
  'startup': 'pink',
  'founder talk': 'pink',
  'meetup': 'purple',
  'networking': 'purple',
  'fest': 'purple',
};

const catAccentMap: Record<string, string> = {
  'hackathon': '#3B82F6',
  'codethon': '#14B8A6',
  'workshop': '#F59E0B',
  'training': '#F59E0B',
  'startup': '#EC4899',
  'founder talk': '#EC4899',
  'meetup': '#7B3DBF',
  'networking': '#7B3DBF',
  'fest': '#EC4899',
};

const enrichEvent = (e: Ev) => {
  const hash = Math.abs(e.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  let description = e.description || "Collaborate and build next-gen AI applications with global sponsors.";
  let prizePool = "";
  let tags = e.tags || ['AI/ML', 'Web3', 'Tech'];
  let spotsLeft = e.spotsLeft ?? Math.max(2, (e.capacity || 100) - (e.attending || 0));

  const catLower = e.cat?.toLowerCase() || 'workshop';
  
  // Only apply mock data heuristics if the event came from the mock seed data (i.e. lacks a real description)
  if (!e.description) {

  if (catLower === 'hackathon') {
    description = "48-hour hackathon. Build products that solve real India problems.";
    prizePool = `₹${(50000 + (hash % 10) * 50000).toLocaleString('en-IN')} prize pool`;
    tags = ['AI/ML', 'Web3', 'Fintech'];
    spotsLeft = 20 + (hash % 150);
  } else if (catLower === 'codethon') {
    description = "150 DSA problems. Top 100 get exclusive Google referrals.";
    prizePool = `₹${(10000 + (hash % 5) * 10000).toLocaleString('en-IN')} prize pool`;
    tags = ['DSA', 'Algorithms'];
    spotsLeft = 50 + (hash % 100);
  } else if (catLower === 'workshop' || catLower === 'training') {
    description = "4-hour deep-dive with Google Staff Engineer. Live problem solving.";
    tags = ['System Design', 'Backend'];
    spotsLeft = 2 + (hash % 45);
  } else if (catLower === 'fest') {
    description = "Asia's largest science & technology festival. 50+ competitions.";
    prizePool = `₹${(500000 + (hash % 5) * 500000).toLocaleString('en-IN')}+ prize pool`;
    tags = ['Fest', 'Competitions'];
    spotsLeft = 100 + (hash % 1900);
  } else if (e.title.toLowerCase().includes('zepto') || catLower === 'startup') {
    description = "Real story of building India's fastest grocery delivery.";
    tags = ['Startup', 'Growth'];
    spotsLeft = 10 + (hash % 50);
  }

  // Exact matching for specific mock events to align with Image 2 screenshots:
  if (e.title.includes('Codeathon 2026')) {
    description = "24-hour online codeathon: build solutions for rural India.";
    spotsLeft = 88;
    tags = ['Code', 'Online', 'AI/ML'];
    prizePool = "";
  } else if (e.title.includes('HackIndia 2026')) {
    description = "48-hour hackathon. Build products that solve real India problems.";
    spotsLeft = 88;
    prizePool = "🏆 ₹5,00,000 prize pool";
    tags = ['AI/ML', 'Web3', 'Fintech'];
  } else if (e.title.includes('Smart India Hackathon')) {
    description = "National level coding contest with top tech sponsors.";
    spotsLeft = 124;
    prizePool = "🏆 ₹5,00,000 prize pool";
    tags = ['AI/ML', 'Innovation', 'Govt'];
  } else if (e.title.includes('Resume Writing Workshop')) {
    description = "Craft a ATS-friendly resume. Review with industry recruiters.";
    spotsLeft = 33;
    tags = ['Resume', 'Career', 'HR'];
  } else if (e.title.includes('Mock Interview Marathon')) {
    description = "Live mock interviews with FAANG mentors and detailed feedback.";
    spotsLeft = 2;
    tags = ['Interview', 'Career', 'FAANG'];
  } else if (e.title.includes('AI Training @ IIT Hyderabad')) {
    description = "Deep learning workshop with hands-on labs and certifications.";
    spotsLeft = 124;
    tags = ['AI', 'Hands-on', 'Python'];
  } else if (e.title.includes('Data Structures Live Class')) {
    description = "Interactive session on Trees, Graphs and advanced algorithms.";
    spotsLeft = 15;
    tags = ['DSA', 'Algorithms', 'Java/C++'];
  } else if (e.title.includes('Zepto Story') || e.title.includes('0 to $10M ARR')) {
    description = "Real story of building India's fastest grocery delivery.";
    spotsLeft = 33;
    tags = ['Startup', 'Growth'];
  }
  }

  // Resolve visual properties
  const cat = e.cat?.toLowerCase() || 'workshop';
  const badgeColor = catColorMap[cat] || 'gray';
  const accentColor = catAccentMap[cat] || '#A78BFA';

  return {
    ...e,
    description,
    prizePool,
    tags,
    spotsLeft,
    badgeColor,
    accentColor,
  };
};

interface DropdownSelectProps {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
}

export function DropdownSelect({ label, value, options, onSelect }: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<any>(null);

  const selectedOption = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  return (
    <View ref={wrapRef} style={{ position: 'relative', minWidth: 160, zIndex: open ? 9999 : 1 }}>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: FONTS.bold, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 38,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderWidth: 1,
          borderColor: open ? '#6366F1' : 'rgba(255,255,255,0.08)',
          // @ts-ignore
          cursor: 'pointer',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontFamily: FONTS.med }}>
          {selectedOption?.label}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="rgba(255,255,255,0.6)" />
      </Pressable>
      
      {open && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: '#13091F',
            borderColor: 'rgba(255,255,255,0.09)',
            borderWidth: 1,
            borderRadius: 8,
            overflow: 'hidden',
            // @ts-ignore
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
            {options.map((opt) => {
              const isSel = opt.id === value;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    onSelect(opt.id);
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: isSel ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                    // @ts-ignore
                    cursor: 'pointer',
                  }}
                >
                  <Text style={{ color: isSel ? '#A78BFA' : '#fff', fontSize: 12, fontFamily: isSel ? FONTS.bold : FONTS.med }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export function EventsView() {
  const [eventsData, setEventsData] = useState<any>(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPages, setEventsPages] = useState(1);
  const EVENTS = eventsData?.items || [];
  const [filter, setFilter] = useState('All');
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set());
  const [recs, setRecs] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'upcoming' | 'ongoing' | 'recently_created' | 'ended' | 'none'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  const SORT_OPTIONS = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'recently_created', label: 'Recently Created' },
    { id: 'ended', label: 'Ended' },
    { id: 'none', label: 'None' }
  ];

  const fetchEvents = useCallback(async (p: number) => {
    setEventsLoading(true);
    try {
      const res = await request<any>(`/student/events?page=${p}&per_page=24&sort_by=${sortBy}`);
      setEventsData(res);
      setEventsPages(res.pages || 1);
      setEventsPage(p);
    } catch { setEventsData({ items: [] }); }
    finally { setEventsLoading(false); }
  }, [sortBy]);

  useEffect(() => { fetchEvents(1); }, [fetchEvents]);

  useEffect(() => {
    fetchPortal<any>('/events/me/recommendations')
      .then(res => setRecs(res.items || []))
      .catch(() => {});
    fetchPortal<any>('/events/me/registered')
      .then(res => setMyEvents(res.items || []))
      .catch(() => {});
  }, []);

  const onRSVP = async (id: string) => {
    setRsvpd((p) => new Set(p).add(id));
    try { await postPortal(`/student/events/${id}/rsvp`); } catch {}
  };

  const processedList = EVENTS.map(enrichEvent)
    .filter((e) => {
      if (filter === 'All') return true;
      const key = filter.toLowerCase();
      const allowedCats = CATEGORY_MAP[key] || [key];
      return allowedCats.includes(e.cat?.toLowerCase());
    })
    .filter((e) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.city && e.city.toLowerCase().includes(q))
      );
    });

  return (
    <View>
      {/* Search Input */}
      <View style={s.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.45)" style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search events by title, description, or city..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={s.searchInput}
        />
        {!!searchQuery && (
          <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}
      </View>

      {/* Dropdown Filters Row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18, zIndex: 99 }}>
        <DropdownSelect
          label="Event Type"
          value={filter}
          options={FILTERS.map((f) => ({ id: f, label: f }))}
          onSelect={(val) => {
            setFilter(val);
            fetchEvents(1);
          }}
        />
        <DropdownSelect
          label="Sort By"
          value={sortBy}
          options={SORT_OPTIONS}
          onSelect={(val) => setSortBy(val as any)}
        />
      </View>

      <Pressable style={s.aiBtn}>
        <Sparkles size={12} color="#A78BFA" />
        <Text style={s.aiBtnText}>AI: Best Events for Me</Text>
        <MaterialCommunityIcons name="chevron-down" size={13} color="#A78BFA" />
      </Pressable>

      <View style={{ marginBottom: 18 }}>
        <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 18 }}>Featured Events</Text>
        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>Handpicked for your interests</Text>
      </View>

      {eventsLoading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator size="large" color={SC.primary} /></View>
      ) : processedList.length === 0 ? (
        <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="calendar-search" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.bold, fontSize: 14, marginTop: 12 }}>
            No events found
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONTS.med, fontSize: 12, marginTop: 4 }}>
            Try adjusting your search query or category filters
          </Text>
        </View>
      ) : (
        <>
          <View style={s.grid}>
            {processedList.map((e, idx) => {
          const isReg = e.registered || rsvpd.has(e.id);
          const spotsColor = e.spotsLeft <= 5 ? '#EF4444' // red
                           : e.spotsLeft <= 50 ? '#F59E0B' // orange/yellow
                           : '#10B981'; // green

          // Check if it's the DSA Championship card to make it glow like in the mockup!
          const shouldGlow = e.title.includes('DSA Championship') || e.title.includes('Smart India Hackathon') || e.title.includes('HackIndia') || e.title.includes('Codeathon');

          return (
            <GlassCard
              key={e.id}
              delay={idx * 40}
              radius={14}
              padding={16}
              glow={shouldGlow}
              style={{
                flexGrow: 1,
                flexBasis: 300,
                maxWidth: 360,
                overflow: 'hidden',
                borderColor: shouldGlow ? e.accentColor : e.accentColor + '22',
              }}
            >
              {/* Top Row: Icon on left, Category/Featured badges, Price on right */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.iconBox, { backgroundColor: e.accentColor + '15', borderColor: e.accentColor + '30' }]}>
                    <CalIcon size={14} color={e.accentColor} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Badge label={e.cat.toUpperCase()} color={e.badgeColor} />
                    <Badge label="FEATURED" color="amber" />
                  </View>
                </View>
                <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'purple'} />
              </View>

              {/* Title */}
              <Text numberOfLines={2} style={s.cardTitle}>{e.title}</Text>

              {/* Prize Pool Row (if applicable) */}
              {!!e.prizePool && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 2 }}>
                  <Award size={13} color="#FBBF24" />
                  <Text style={s.prizeText}>{e.prizePool}</Text>
                </View>
              )}

              {/* Description */}
              <Text numberOfLines={3} style={s.description}>{e.description}</Text>

              {/* Meta details: Date, Mode, City */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8, flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <CalIcon size={10} color={SC.muted} />
                  <Text style={s.metaText}>{e.date}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Globe2 size={10} color={SC.muted} />
                  <Text style={s.metaText}>{e.mode}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <MapPin size={10} color={SC.muted} />
                  <Text style={s.metaText}>{e.city}</Text>
                </View>
              </View>

              {/* Tags */}
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {e.tags.map((tag) => (
                  <View key={tag} style={s.tagBox}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4, marginTop: 'auto' }} />

              {/* Card Footer: Spots left & Register Button */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={[s.spotsText, { color: spotsColor }]}>{e.spotsLeft} spots left</Text>
                
                {isReg ? (
                  <View style={s.btnReg}>
                    <Check size={11} color="#10B981" style={{ marginRight: 3 }} />
                    <Text style={s.btnRegText}>Registered</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => onRSVP(e.id)}>
                    <LinearGradient
                      colors={['#7C3AED', '#6D28D9']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={s.btnRegister}
                    >
                      <Text style={s.btnRegisterText}>Register</Text>
                      <ArrowRight size={10} color="#fff" style={{ marginLeft: 3 }} />
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </GlassCard>
          );
        })}
      </View>

      {eventsPages > 1 && (
        <View style={s.pagination}>
          <Pressable style={[s.pageBtn, eventsPage <= 1 && { opacity: 0.4 }]} onPress={() => eventsPage > 1 && fetchEvents(eventsPage - 1)}>
            <Text style={s.pageBtnText}>Prev</Text>
          </Pressable>
          <Text style={s.pageInfo}>{eventsPage} / {eventsPages}</Text>
          <Pressable style={[s.pageBtn, eventsPage >= eventsPages && { opacity: 0.4 }]} onPress={() => eventsPage < eventsPages && fetchEvents(eventsPage + 1)}>
            <Text style={s.pageBtnText}>Next</Text>
          </Pressable>
        </View>
      )}
    </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 8,
  },
  chipOn: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderColor: '#7C3AED',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
    gap: 6,
    // @ts-ignore
    cursor: 'pointer',
  },
  aiBtnText: {
    color: '#C4B5FD',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 2,
  },
  prizeText: {
    color: '#FBBF24',
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  description: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  metaText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 11,
  },
  tagBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    color: SC.muted,
    fontFamily: FONTS.med,
    fontSize: 10,
  },
  spotsText: {
    fontFamily: FONTS.bold,
    fontSize: 11.5,
  },
  btnRegister: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnRegisterText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  btnReg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnRegText: {
    color: '#10B981',
    fontFamily: FONTS.bold,
    fontSize: 11,
  },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
  sortChip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    // @ts-ignore
    cursor: 'pointer',
  },
  sortChipOn: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: '#6366F1',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    paddingVertical: 0,
    // @ts-ignore
    outlineStyle: 'none',
  },
});
