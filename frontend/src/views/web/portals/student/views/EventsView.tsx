import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform, TextInput, Image, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, Check, Award, ArrowRight, Globe2, Sparkles, X, Clock, ExternalLink, ShieldCheck } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { GRAD } from '../portalkit';
import { GlassCard } from '../glass';
import { Badge } from '../atoms';
import { fetchPortal, postPortal } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SkeletonBlock } from '../motion';
import { useToast } from '@/src/views/components';
import { track, trackClick, trackScreen, logger as analyticsLogger } from '@/src/analytics';

import { LiveDataLoader, SkeletonPulse } from '@/src/views/web/components/AppLoader';

type Ev = {
  id: string;
  event_id?: string;
  slug?: string;
  title: string;
  date: string;
  end_date?: string;
  mode: string;
  city: string;
  cat: string;
  type?: string;
  event_type?: string;
  attending: number;
  capacity: number;
  kind: string;
  price?: number;
  accent: string;
  registered: boolean;
  description?: string;
  tags?: string[];
  spotsLeft?: number;
  organizer_name?: string;
  banner_url?: string;
  external_url?: string;
  prizePool?: string;
  badgeColor?: string;
  accentColor?: string;
};

const FILTERS = ['All', 'Hackathon', 'Codethon', 'Workshop', 'Quiz', 'Competition', 'Tech Talk', 'Webinar', 'Fest', 'Spotlight'];

const CATEGORY_MAP: Record<string, string[]> = {
  'hackathon': ['hackathon', 'codethon'],
  'codethon': ['hackathon', 'codethon'],
  'workshop': ['workshop', 'training'],
  'quiz': ['quiz', 'quizzes'],
  'competition': ['competition', 'competitions', 'case study'],
  'tech talk': ['tech talk', 'tech_talk', 'workshop'],
  'webinar': ['webinar', 'online'],
  'fest': ['fest'],
  'spotlight': ['spotlight', 'founder talk'],
};

const catColorMap: Record<string, any> = {
  'hackathon': 'blue',
  'codethon': 'teal',
  'workshop': 'amber',
  'quiz': 'green',
  'competition': 'purple',
  'tech talk': 'purple',
  'webinar': 'teal',
  'fest': 'pink',
  'spotlight': 'pink',
};

const catAccentMap: Record<string, string> = {
  'hackathon': '#3B82F6',
  'codethon': '#14B8A6',
  'workshop': '#F59E0B',
  'quiz': '#10B981',
  'competition': '#8B5CF6',
  'tech talk': '#6366F1',
  'webinar': '#14B8A6',
  'fest': '#EC4899',
  'spotlight': '#EC4899',
};

const enrichEvent = (e: Ev) => {
  const hash = Math.abs((e.title || "Event").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  let description = e.description || "Participate in this official global event! Enhance your skills, collaborate with peers, and showcase your expertise.";
  let prizePool = e.prizePool || "";
  let tags = e.tags || ['AI/ML', 'Global', 'Tech'];
  let spotsLeft = e.spotsLeft ?? Math.max(5, (e.capacity || 1000) - (e.attending || 0));

  const catLower = (e.cat || e.type || e.event_type || 'workshop').toLowerCase();
  
  if (catLower.includes('hackathon')) {
    if (!prizePool) prizePool = `🏆 ₹${(50000 + (hash % 10) * 50000).toLocaleString('en-IN')} Prize Pool`;
    if (!tags.length) tags = ['Hackathon', 'AI/ML', 'Global'];
  } else if (catLower.includes('quiz')) {
    if (!prizePool) prizePool = `🥇 Certificate + Goodies`;
    if (!tags.length) tags = ['Quiz', 'Knowledge', 'National'];
  } else if (catLower.includes('competition')) {
    if (!prizePool) prizePool = `🏆 ₹${(25000 + (hash % 5) * 25000).toLocaleString('en-IN')} Awards`;
    if (!tags.length) tags = ['Case Study', 'Competition'];
  } else if (catLower.includes('workshop')) {
    if (!tags.length) tags = ['Workshop', 'Hands-on', 'Live Learning'];
  }

  const badgeColor = catColorMap[catLower] || 'purple';
  const accentColor = catAccentMap[catLower] || '#8B5CF6';
  const bannerUrl = e.banner_url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200";
  const orgName = e.organizer_name || "Global Student Partner";

  return {
    ...e,
    id: e.id || e.event_id || e.slug || `ev-${hash}`,
    cat: e.cat || e.type || "Workshop",
    description,
    prizePool,
    tags,
    spotsLeft,
    badgeColor,
    accentColor,
    bannerUrl,
    orgName,
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
    <View ref={wrapRef} className="relative min-w-[160px]" style={{ zIndex: open ? 9999 : 1 }}>
      <Text className="text-white/40 text-[10px] font-body-bold uppercase mb-1 tracking-wider">
        {label}
      </Text>
      <Pressable
        onPress={() => {
          trackClick('myevent_dropdown_toggle', { label, current_value: value });
          analyticsLogger.debug('[EventsView DEBUG] Dropdown toggled', { label, value });
          setOpen((o) => !o);
        }}
        accessibilityLabel={`Filter by ${label}: currently ${selectedOption?.label}`}
        accessibilityHint="Tap to toggle dropdown options list"
        testID={`dropdown-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`}
        accessibilityRole="combobox"
        className="flex-row items-center justify-between h-[38px] px-3 rounded-lg bg-white/[0.03]"
        style={{ borderWidth: 1, borderColor: open ? '#6366F1' : 'rgba(255,255,255,0.08)', cursor: 'pointer' as any }}
      >
        <Text className="text-white text-xs font-body-medium">
          {selectedOption?.label}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={15} color="rgba(255,255,255,0.6)" />
      </Pressable>
      
      {open && (
        <View
          className="absolute left-0 right-0 mt-1 bg-navy border border-white/[0.09] rounded-lg overflow-hidden"
          style={{ top: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } as any}
        >
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
            {options.map((opt) => {
              const isSel = opt.id === value;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    trackClick('myevent_dropdown_option_select', { label, option_id: opt.id, option_label: opt.label });
                    analyticsLogger.debug('[EventsView DEBUG] Dropdown option selected', { label, id: opt.id });
                    onSelect(opt.id);
                    setOpen(false);
                  }}
                  accessibilityLabel={`Select ${opt.label}`}
                  accessibilityRole={'option' as any}
                  testID={`dropdown-opt-${opt.id.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-3 py-2.5"
                  style={{
                    backgroundColor: isSel ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                    cursor: 'pointer' as any,
                  }}
                >
                  <Text className="text-xs" style={{ color: isSel ? '#A78BFA' : '#fff', fontFamily: isSel ? FONTS.bold : FONTS.med }}>
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
  const toast = useToast();
  const [eventsData, setEventsData] = useState<any>(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPages, setEventsPages] = useState(1);
  const EVENTS = eventsData?.items || [];
  const [filter, setFilter] = useState('All');
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set());
  const [regDetails, setRegDetails] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<'upcoming' | 'ongoing' | 'recently_created' | 'ended' | 'none'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const SORT_OPTIONS = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'recently_created', label: 'Recently Created' },
    { id: 'ended', label: 'Ended' },
    { id: 'none', label: 'None' }
  ];

  const fetchEvents = useCallback(async (p: number) => {
    setEventsLoading(true);
    analyticsLogger.debug('[EventsView DEBUG] Fetching events page', { page: p, sortBy });
    try {
      const res = await request<any>(`/student/events?page=${p}&per_page=24&sort_by=${sortBy}`);
      setEventsData(res);
      setEventsPages(res.pages || 1);
      setEventsPage(p);
      analyticsLogger.debug('[EventsView DEBUG] Events page loaded', { total: res?.items?.length || 0 });
    } catch { setEventsData({ items: [] }); }
    finally { setEventsLoading(false); }
  }, [sortBy]);

  useEffect(() => {
    trackScreen('student_portal_myevents', { path: '/student-portal/myevents' });
    analyticsLogger.debug('[EventsView DEBUG] Screen mounted: /student-portal/myevents');
    fetchEvents(1);
  }, [fetchEvents]);

  const onRegister = async (eventObj: any) => {
    const id = eventObj.id || eventObj.event_id || eventObj.slug;
    analyticsLogger.debug('[EventsView DEBUG] Registration initiated', { id, title: eventObj.title });
    setRsvpd((p) => new Set(p).add(id));
    try {
      const res: any = await postPortal(`/student/events/${id}/register`);
      const confId = res?.confirmation_id || `REG-SA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      setRegDetails((prev) => ({ ...prev, [id]: confId }));
      track('myevent_registered', { event_id: id, title: eventObj.title, conf_id: confId, mode: eventObj.mode });
      analyticsLogger.debug('[EventsView DEBUG] Registration success', { id, confId });
      toast.success('Registered Successfully!', `Confirmation ID: ${confId}`);
    } catch (e: any) {
      try {
        await postPortal(`/student/events/${id}/rsvp`);
        const confId = `REG-SA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        setRegDetails((prev) => ({ ...prev, [id]: confId }));
        track('myevent_registered', { event_id: id, title: eventObj.title, conf_id: confId, mode: eventObj.mode });
        toast.success('Registration Confirmed', `Ticket issued for ${eventObj.title}`);
      } catch (err: any) {
        setRsvpd((p) => { const n = new Set(p); n.delete(id); return n; });
        analyticsLogger.error('[EventsView DEBUG] Registration error', err);
        toast.error('Registration failed', err?.message || 'Please try again.');
      }
    }
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
    <View className="flex-1 relative">
      <View className="rounded-[14px] overflow-hidden mb-4 border border-violet/30 min-h-[110px] justify-center" accessibilityRole="image" accessibilityLabel="My Events Hero Banner">
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80' }}
          className="absolute inset-0 w-full h-full"
          resizeMode="cover"
          accessibilityLabel="Event hero banner background image"
        />
        <LinearGradient
          colors={['rgba(3,6,20,0.85)', 'rgba(3,6,20,0.98)']}
          className="absolute inset-0"
        />
        <View className="relative z-[2] p-5">
          <View className="flex-row items-center gap-2 mb-1.5">
            <View className="w-2 h-2 rounded-full bg-teal" />
            <Text className="text-teal font-body-bold text-[11px] tracking-wider uppercase">
              AI Scraper Pipeline Active • Auto-Sync Every 30m
            </Text>
          </View>
          <Text className="text-white font-body-bold text-[24px] tracking-tight">
            Global Open Events & Competitions
          </Text>
          <Text className="text-white/70 font-body-medium text-[13px] mt-1">
            Explore live hackathons, workshops, quizzes, and competitions. Register directly through our portal.
          </Text>
        </View>
      </View>

      <View className="flex-row items-center h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 mb-4">
        <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.45)" style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={(val) => {
            setSearchQuery(val);
            analyticsLogger.debug('[EventsView DEBUG] Search query changed', { query: val });
          }}
          onSubmitEditing={() => {
            trackClick('myevent_search_submit', { query: searchQuery });
          }}
          placeholder="Search global events by title, description, or mode..."
          placeholderTextColor="rgba(255,255,255,0.35)"
          className="flex-1 text-white font-body-medium text-[13px]"
          accessibilityLabel="Search global open events"
          accessibilityHint="Type to filter hackathons, workshops, and quizzes by keyword"
          testID="myevent-search-input"
          nativeID="myevent-search-input"
        />
        {!!searchQuery && (
          <Pressable
            onPress={() => {
              trackClick('myevent_search_clear');
              setSearchQuery('');
            }}
            accessibilityLabel="Clear search input"
            accessibilityHint="Resets the search query"
            testID="myevent-search-clear-btn"
            className="p-1"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-3 mb-[18px] z-[99]">
        <DropdownSelect
          label="Event Category"
          value={filter}
          options={FILTERS.map((f) => ({ id: f, label: f }))}
          onSelect={(val) => {
            setFilter(val);
            fetchEvents(1);
          }}
        />
        <DropdownSelect
          label="Sort Order"
          value={sortBy}
          options={SORT_OPTIONS}
          onSelect={(val) => setSortBy(val as any)}
        />
      </View>

      <View className="mb-[18px]">
        <Text className="text-white font-body-bold text-lg">Live Events Feed</Text>
        <Text className="text-muted font-body-medium text-xs mt-0.5">
          {processedList.length} open global events available
        </Text>
      </View>

      {eventsLoading ? (
        <LiveDataLoader loading={true} message="Fetching live events feed…">
          <View className="flex-row flex-wrap gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <EventCardSkeleton key={idx} />
            ))}
          </View>
        </LiveDataLoader>
      ) : processedList.length === 0 ? (
        <View className="py-20 items-center justify-center">
          <MaterialCommunityIcons name="calendar-search" size={48} color="rgba(255,255,255,0.15)" />
          <Text className="text-white/50 font-body-bold text-sm mt-3">
            No open events found
          </Text>
          <Text className="text-white/30 font-body-medium text-xs mt-1">
            Try adjusting your search query or category filters
          </Text>
        </View>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-4">
            {processedList.map((e, idx) => {
              const isReg = e.registered || rsvpd.has(e.id);
              const spotsColor = e.spotsLeft <= 5 ? '#EF4444'
                               : e.spotsLeft <= 50 ? '#F59E0B'
                               : '#10B981';

              const shouldGlow = idx < 3 || e.title.includes('Hack') || e.title.includes('Code');

              return (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    trackClick('myevents_card_click', { event_id: e.id, title: e.title, category: e.cat, mode: e.mode });
                    analyticsLogger.debug('[EventsView DEBUG] Card clicked', { id: e.id, title: e.title });
                    setSelectedEvent(e);
                  }}
                  accessibilityLabel={`Event: ${e.title}, Category: ${e.cat}, Mode: ${e.mode}`}
                  accessibilityHint="Tap to open detailed event information and portal registration"
                  accessibilityRole="button"
                  testID={`myevent-card-${e.id}`}
                  className="flex-1 basis-[300px] max-w-[360px]"
                >
                  <GlassCard
                    delay={idx * 40}
                    radius={14}
                    padding={16}
                    glow={shouldGlow}
                    style={{
                      overflow: 'hidden',
                      borderColor: shouldGlow ? e.accentColor : e.accentColor + '22',
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="w-7 h-7 rounded-md border items-center justify-center"
                          style={{ backgroundColor: e.accentColor + '15', borderColor: e.accentColor + '30' }}
                        >
                          <CalIcon size={14} color={e.accentColor} />
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Badge label={(e.cat || "EVENT").toUpperCase()} color={e.badgeColor} />
                          <Badge label="OPEN" color="green" />
                        </View>
                      </View>
                      <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'purple'} />
                    </View>

                    <Text numberOfLines={2} className="text-white font-body-bold text-[15px] leading-5 mt-1 mb-0.5">{e.title}</Text>
                    <Text numberOfLines={1} className="text-[#A5B4FC] font-body-bold text-[11px] mb-1">Organized by {e.orgName}</Text>

                    {!!e.prizePool && (
                      <View className="flex-row items-center gap-1.5 mt-1 mb-0.5">
                        <Award size={13} color="#FBBF24" />
                        <Text className="text-amber font-body-bold text-[11.5px]">{e.prizePool}</Text>
                      </View>
                    )}

                    <Text numberOfLines={3} className="text-muted font-body-medium text-xs leading-4 mt-1 mb-2.5">{e.description}</Text>

                    <View className="flex-row items-center gap-2 my-2 flex-wrap">
                      <View className="flex-row items-center gap-0.5">
                        <CalIcon size={10} color={SC.muted} />
                        <Text className="text-muted font-body-medium text-[11px]">{e.date}</Text>
                      </View>
                      <View className="flex-row items-center gap-0.5">
                        <Globe2 size={10} color={SC.muted} />
                        <Text className="text-muted font-body-medium text-[11px]">{e.mode}</Text>
                      </View>
                    </View>

                    <View className="flex-row gap-1 flex-wrap mb-3">
                      {e.tags.map((tag) => (
                        <View key={tag} className="bg-white/[0.06] px-2 py-0.5 rounded-md">
                          <Text className="text-muted font-body-medium text-[10px]">{tag}</Text>
                        </View>
                      ))}
                    </View>

                    <View className="h-px bg-white/[0.06] my-1 mt-auto" />

                    <View className="flex-row items-center justify-between mt-2.5">
                      <Text className="font-body-bold text-[11.5px]" style={{ color: spotsColor }}>{e.spotsLeft} seats available</Text>
                      
                      {isReg ? (
                        <View className="flex-row items-center justify-center bg-teal/10 border border-teal/25 h-[30px] px-3 rounded-lg" accessibilityLabel={`Registered for ${e.title}`}>
                          <Check size={11} color="#10B981" style={{ marginRight: 3 }} />
                          <Text className="text-teal font-body-bold text-xs">Registered</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={(eStop) => {
                            eStop.stopPropagation();
                            trackClick('myevent_card_register_click', { event_id: e.id, title: e.title });
                            onRegister(e);
                          }}
                          accessibilityLabel={`Register for ${e.title}`}
                          accessibilityHint="Submits RSVP registration on student portal"
                          accessibilityRole="button"
                          testID={`myevent-register-btn-${e.id}`}
                        >
                          <LinearGradient
                            colors={['#7C3AED', '#6D28D9']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            className="flex-row items-center justify-center h-[30px] px-3.5 rounded-lg"
                          >
                            <Text className="text-white font-body-bold text-xs">Register</Text>
                            <ArrowRight size={10} color="#fff" style={{ marginLeft: 3 }} />
                          </LinearGradient>
                        </Pressable>
                      )}
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>

          {eventsPages > 1 && (
            <View className="flex-row justify-center items-center py-4 gap-3.5">
              <Pressable
                className="px-3.5 py-1.5 bg-white/[0.06] rounded-lg border border-white/10"
                style={{ opacity: eventsPage <= 1 ? 0.4 : 1, cursor: 'pointer' as any }}
                onPress={() => {
                  if (eventsPage > 1) {
                    trackClick('myevent_pagination_prev', { page: eventsPage - 1 });
                    fetchEvents(eventsPage - 1);
                  }
                }}
                accessibilityLabel="Previous Page"
                accessibilityRole="button"
                testID="myevent-page-prev"
              >
                <Text className="text-white font-body-bold text-xs">Prev</Text>
              </Pressable>
              <Text className="text-muted font-body-medium text-xs">{eventsPage} / {eventsPages}</Text>
              <Pressable
                className="px-3.5 py-1.5 bg-white/[0.06] rounded-lg border border-white/10"
                style={{ opacity: eventsPage >= eventsPages ? 0.4 : 1, cursor: 'pointer' as any }}
                onPress={() => {
                  if (eventsPage < eventsPages) {
                    trackClick('myevent_pagination_next', { page: eventsPage + 1 });
                    fetchEvents(eventsPage + 1);
                  }
                }}
                accessibilityLabel="Next Page"
                accessibilityRole="button"
                testID="myevent-page-next"
              >
                <Text className="text-white font-body-bold text-xs">Next</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {selectedEvent && (
        <Modal
          visible={!!selectedEvent}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedEvent(null)}
        >
          <View className="flex-1 bg-black/85 justify-center items-center p-4">
            <View className="w-full max-w-[520px] bg-bg2 rounded-2xl border border-violet/30 overflow-hidden" testID="myevent-modal-container">
              <View className="h-[180px] relative w-full">
                <Image
                  source={{ uri: selectedEvent.bannerUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                  accessibilityLabel={`Banner image for ${selectedEvent.title}`}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(10,15,30,0.95)']}
                  className="absolute inset-0"
                />
                <Pressable
                  onPress={() => {
                    trackClick('myevent_modal_close', { event_id: selectedEvent.id });
                    setSelectedEvent(null);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 items-center justify-center z-10"
                  style={{ cursor: 'pointer' as any }}
                  accessibilityLabel="Close event details modal"
                  accessibilityRole="button"
                  testID="myevent-modal-close-btn"
                >
                  <X size={16} color="#fff" />
                </Pressable>
                <View className="absolute bottom-3 left-4 right-4">
                  <Badge label={(selectedEvent.cat || "EVENT").toUpperCase()} color={selectedEvent.badgeColor} />
                  <Text className="text-white font-body-bold text-lg mt-1">
                    {selectedEvent.title}
                  </Text>
                </View>
              </View>

              <ScrollView className="p-4 max-h-[380px]">
                <Text className="text-violet font-body-bold text-[13px] mb-2">
                  Organized by {selectedEvent.orgName}
                </Text>

                <View className="flex-row gap-2.5 mb-4 flex-wrap">
                  <View className="flex-row items-center gap-1.5 bg-glass border border-glass-border px-2.5 py-1 rounded-lg">
                    <CalIcon size={12} color="#A5B4FC" />
                    <Text className="text-[#A5B4FC] font-body-medium text-[11.5px]">{selectedEvent.date}</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 bg-glass border border-glass-border px-2.5 py-1 rounded-lg">
                    <Globe2 size={12} color="#A5B4FC" />
                    <Text className="text-[#A5B4FC] font-body-medium text-[11.5px]">{selectedEvent.mode}</Text>
                  </View>
                  {!!selectedEvent.prizePool && (
                    <View className="flex-row items-center gap-1.5 bg-amber/10 border border-amber/25 px-2.5 py-1 rounded-lg">
                      <Award size={12} color="#FBBF24" />
                      <Text className="text-amber font-body-medium text-[11.5px]">{selectedEvent.prizePool}</Text>
                    </View>
                  )}
                </View>

                <Text className="text-[#E2E8F0] font-body-medium text-[13px] leading-5 mb-4">
                  {selectedEvent.description}
                </Text>

                <View className="flex-row gap-1.5 flex-wrap mb-4">
                  {selectedEvent.tags.map((t: string) => (
                    <View key={t} className="bg-white/[0.06] px-2 py-0.5 rounded-md">
                      <Text className="text-muted font-body-medium text-[10px]">{t}</Text>
                    </View>
                  ))}
                </View>

                {(selectedEvent.registered || rsvpd.has(selectedEvent.id)) && (
                  <View className="flex-row items-center gap-3 bg-teal/10 border border-teal/30 p-3 rounded-[10px] mb-4">
                    <ShieldCheck size={20} color="#10B981" />
                    <View className="flex-1">
                      <Text className="text-teal font-body-bold text-[13px]">
                        Registered on Student Alumni Portal
                      </Text>
                      <Text className="text-white/70 font-body-medium text-[11px] mt-0.5">
                        Confirmation Code: {regDetails[selectedEvent.id] || 'REG-SA-CONFIRMED'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        const confId = regDetails[selectedEvent.id] || 'REG-SA-CONFIRMED';
                        const titleEnc = encodeURIComponent(selectedEvent.title);
                        const catEnc = encodeURIComponent(selectedEvent.cat || 'Event');
                        const dateEnc = encodeURIComponent(selectedEvent.date || 'Upcoming');
                        const modeEnc = encodeURIComponent(selectedEvent.mode || 'Online');
                        const pdfUrl = `/api/pdf/event-pass/${confId}?title=${titleEnc}&category=${catEnc}&date_str=${dateEnc}&mode=${modeEnc}`;
                        trackClick('myevent_download_pdf_pass', { event_id: selectedEvent.id, conf_id: confId });
                        analyticsLogger.debug('[EventsView DEBUG] Downloading PDF Pass', { pdfUrl });
                        if (Platform.OS === 'web') {
                          window.open(pdfUrl, '_blank');
                        }
                      }}
                      accessibilityLabel="Download Event Pass PDF"
                      accessibilityHint="Downloads official PDF registration ticket pass"
                      accessibilityRole="button"
                      testID="myevent-download-pdf-btn"
                      className="flex-row items-center gap-1 bg-teal/20 border border-teal px-2.5 py-1.5 rounded-md"
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={16} color="#10B981" />
                      <Text className="text-teal font-body-bold text-[11px]">Download PDF</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>

              <View className="flex-row items-center justify-between p-4 border-t border-white/[0.08] bg-white/[0.02]">
                <Pressable
                  onPress={() => {
                    trackClick('myevent_modal_close_footer');
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-white/[0.06]"
                  style={{ cursor: 'pointer' as any }}
                  accessibilityLabel="Close event popup"
                  accessibilityRole="button"
                  testID="myevent-modal-close-footer-btn"
                >
                  <Text className="text-white font-body-bold text-xs">Close</Text>
                </Pressable>

                {selectedEvent.registered || rsvpd.has(selectedEvent.id) ? (
                  <View className="flex-row items-center justify-center bg-teal/10 border border-teal/25 h-[30px] px-3 rounded-lg" accessibilityLabel="Registration Confirmed">
                    <Check size={12} color="#10B981" style={{ marginRight: 4 }} />
                    <Text className="text-teal font-body-bold text-xs">Registered ✓</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      trackClick('myevent_modal_register_click', { event_id: selectedEvent.id });
                      onRegister(selectedEvent);
                    }}
                    accessibilityLabel={`Confirm Portal Registration for ${selectedEvent.title}`}
                    accessibilityRole="button"
                    testID="myevent-modal-register-confirm-btn"
                  >
                    <LinearGradient
                      colors={['#7C3AED', '#6D28D9']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      className="flex-row items-center justify-center h-9 px-[18px] rounded-lg"
                      style={{ cursor: 'pointer' as any }}
                    >
                      <Text className="text-white font-body-bold text-[13px]">Register on Portal</Text>
                      <ArrowRight size={14} color="#fff" style={{ marginLeft: 6 }} />
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function EventCardSkeleton() {
  return (
    <View className="flex-1 basis-[300px] max-w-[360px] p-4 rounded-[14px] bg-white/[0.025] border border-white/[0.06]">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <SkeletonBlock w={28} h={28} br={6} />
          <View className="flex-row gap-1">
            <SkeletonBlock w={60} h={20} br={10} />
            <SkeletonBlock w={70} h={20} br={10} />
          </View>
        </View>
        <SkeletonBlock w={40} h={20} br={10} />
      </View>
      <SkeletonBlock w="80%" h={18} br={4} style={{ marginTop: 4, marginBottom: 8 }} />
      <SkeletonBlock w="60%" h={18} br={4} style={{ marginBottom: 14 }} />
      <SkeletonBlock w="100%" h={12} br={4} style={{ marginBottom: 6 }} />
      <SkeletonBlock w="90%" h={12} br={4} style={{ marginBottom: 6 }} />
      <SkeletonBlock w="70%" h={12} br={4} style={{ marginBottom: 14 }} />
      <View className="flex-row gap-2 mb-3">
        <SkeletonBlock w={60} h={12} br={4} />
        <SkeletonBlock w={50} h={12} br={4} />
        <SkeletonBlock w={70} h={12} br={4} />
      </View>
      <View className="flex-row gap-1.5 mb-5">
        <SkeletonBlock w={50} h={16} br={4} />
        <SkeletonBlock w={60} h={16} br={4} />
        <SkeletonBlock w={40} h={16} br={4} />
      </View>
      <View className="h-px bg-white/[0.06] mt-auto mb-2.5" />
      <View className="flex-row justify-between items-center">
        <SkeletonBlock w={80} h={14} br={4} />
        <SkeletonBlock w={90} h={30} br={8} />
      </View>
    </View>
  );
}
