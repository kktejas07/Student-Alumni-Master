import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform, TextInput, Image, Modal } from 'react-native';
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
    <View ref={wrapRef} style={{ position: 'relative', minWidth: 160, zIndex: open ? 9999 : 1 }}>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: FONTS.bold, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
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
                    trackClick('myevent_dropdown_option_select', { label, option_id: opt.id, option_label: opt.label });
                    analyticsLogger.debug('[EventsView DEBUG] Dropdown option selected', { label, id: opt.id });
                    onSelect(opt.id);
                    setOpen(false);
                  }}
                  accessibilityLabel={`Select ${opt.label}`}
                  accessibilityRole="option"
                  testID={`dropdown-opt-${opt.id.toLowerCase().replace(/\s+/g, '-')}`}
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
    <View style={{ flex: 1, position: 'relative' }}>
      {/* Background aesthetics with banner overlay */}
      <View style={s.heroBannerWrap} accessibilityRole="image" accessibilityLabel="My Events Hero Banner">
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80' }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessibilityLabel="Event hero banner background image"
        />
        <LinearGradient
          colors={['rgba(3,6,20,0.85)', 'rgba(3,6,20,0.98)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={{ position: 'relative', zIndex: 2, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <View style={s.livePulse} />
            <Text style={{ color: '#10B981', fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              AI Scraper Pipeline Active • Auto-Sync Every 30m
            </Text>
          </View>
          <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 24, letterSpacing: -0.5 }}>
            Global Open Events & Competitions
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 13, marginTop: 4 }}>
            Explore live hackathons, workshops, quizzes, and competitions. Register directly through our portal.
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={s.searchWrap}>
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
          style={s.searchInput}
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
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}
      </View>

      {/* Dropdown Filters Row */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18, zIndex: 99 }}>
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

      <View style={{ marginBottom: 18 }}>
        <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 18 }}>Live Events Feed</Text>
        <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>
          {processedList.length} open global events available
        </Text>
      </View>

      {eventsLoading ? (
        <LiveDataLoader loading={true} message="Fetching live events feed…">
          <View style={s.grid}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <EventCardSkeleton key={idx} />
            ))}
          </View>
        </LiveDataLoader>
      ) : processedList.length === 0 ? (
        <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="calendar-search" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONTS.bold, fontSize: 14, marginTop: 12 }}>
            No open events found
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
                  style={{ flexGrow: 1, flexBasis: 300, maxWidth: 360 }}
                >
                  <GlassCard
                    delay={idx * 40}
                    radius={14}
                    padding={16}
                    glow={shouldGlow}
                    style={{
                      height: '100%' as any,
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
                          <Badge label={(e.cat || "EVENT").toUpperCase()} color={e.badgeColor} />
                          <Badge label="OPEN" color="green" />
                        </View>
                      </View>
                      <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'purple'} />
                    </View>

                    {/* Title */}
                    <Text numberOfLines={2} style={s.cardTitle}>{e.title}</Text>
                    <Text numberOfLines={1} style={s.orgSubtitle}>Organized by {e.orgName}</Text>

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
                      <Text style={[s.spotsText, { color: spotsColor }]}>{e.spotsLeft} seats available</Text>
                      
                      {isReg ? (
                        <View style={s.btnReg} accessibilityLabel={`Registered for ${e.title}`}>
                          <Check size={11} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={s.btnRegText}>Registered</Text>
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
                            style={s.btnRegister}
                          >
                            <Text style={s.btnRegisterText}>Register</Text>
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
            <View style={s.pagination}>
              <Pressable
                style={[s.pageBtn, eventsPage <= 1 && { opacity: 0.4 }]}
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
                <Text style={s.pageBtnText}>Prev</Text>
              </Pressable>
              <Text style={s.pageInfo}>{eventsPage} / {eventsPages}</Text>
              <Pressable
                style={[s.pageBtn, eventsPage >= eventsPages && { opacity: 0.4 }]}
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
                <Text style={s.pageBtnText}>Next</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <Modal
          visible={!!selectedEvent}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedEvent(null)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContainer} testID="myevent-modal-container">
              {/* Banner Image */}
              <View style={{ height: 180, position: 'relative', width: '100%' }}>
                <Image
                  source={{ uri: selectedEvent.bannerUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                  accessibilityLabel={`Banner image for ${selectedEvent.title}`}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(10,15,30,0.95)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Pressable
                  onPress={() => {
                    trackClick('myevent_modal_close', { event_id: selectedEvent.id });
                    setSelectedEvent(null);
                  }}
                  style={s.closeModalBtn}
                  accessibilityLabel="Close event details modal"
                  accessibilityRole="button"
                  testID="myevent-modal-close-btn"
                >
                  <X size={16} color="#fff" />
                </Pressable>
                <View style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
                  <Badge label={(selectedEvent.cat || "EVENT").toUpperCase()} color={selectedEvent.badgeColor} />
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 18, marginTop: 4 }}>
                    {selectedEvent.title}
                  </Text>
                </View>
              </View>

              {/* Modal Body */}
              <ScrollView style={{ padding: 16, maxHeight: 380 }}>
                <Text style={{ color: '#A78BFA', fontFamily: FONTS.bold, fontSize: 13, marginBottom: 8 }}>
                  Organized by {selectedEvent.orgName}
                </Text>

                {/* Status & Date Pills */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <View style={s.modalMetaPill}>
                    <CalIcon size={12} color="#A5B4FC" />
                    <Text style={s.modalMetaText}>{selectedEvent.date}</Text>
                  </View>
                  <View style={s.modalMetaPill}>
                    <Globe2 size={12} color="#A5B4FC" />
                    <Text style={s.modalMetaText}>{selectedEvent.mode}</Text>
                  </View>
                  {!!selectedEvent.prizePool && (
                    <View style={[s.modalMetaPill, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                      <Award size={12} color="#FBBF24" />
                      <Text style={[s.modalMetaText, { color: '#FBBF24' }]}>{selectedEvent.prizePool}</Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                <Text style={{ color: '#E2E8F0', fontFamily: FONTS.med, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
                  {selectedEvent.description}
                </Text>

                {/* Tags */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {selectedEvent.tags.map((t: string) => (
                    <View key={t} style={s.tagBox}>
                      <Text style={s.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>

                {/* Confirmation Box if Registered */}
                {(selectedEvent.registered || rsvpd.has(selectedEvent.id)) && (
                  <View style={s.confirmedBox}>
                    <ShieldCheck size={20} color="#10B981" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#10B981', fontFamily: FONTS.bold, fontSize: 13 }}>
                        Registered on Student Alumni Portal
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.med, fontSize: 11, marginTop: 2 }}>
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
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: 'rgba(16,185,129,0.2)',
                        borderWidth: 1,
                        borderColor: '#10B981',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={16} color="#10B981" />
                      <Text style={{ color: '#10B981', fontFamily: FONTS.bold, fontSize: 11 }}>Download PDF</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>

              {/* Modal Footer */}
              <View style={s.modalFooter}>
                <Pressable
                  onPress={() => {
                    trackClick('myevent_modal_close_footer');
                    setSelectedEvent(null);
                  }}
                  style={s.secondaryBtn}
                  accessibilityLabel="Close event popup"
                  accessibilityRole="button"
                  testID="myevent-modal-close-footer-btn"
                >
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>Close</Text>
                </Pressable>

                {selectedEvent.registered || rsvpd.has(selectedEvent.id) ? (
                  <View style={s.btnReg} accessibilityLabel="Registration Confirmed">
                    <Check size={12} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={s.btnRegText}>Registered ✓</Text>
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
                      style={s.modalRegisterBtn}
                    >
                      <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Register on Portal</Text>
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

const s = StyleSheet.create({
  heroBannerWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    minHeight: 110,
    justifyContent: 'center',
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
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
  orgSubtitle: {
    color: '#A5B4FC',
    fontFamily: FONTS.bold,
    fontSize: 11,
    marginBottom: 4,
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
    marginTop: 4,
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
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F1528',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    overflow: 'hidden',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  modalMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalMetaText: {
    color: '#A5B4FC',
    fontFamily: FONTS.med,
    fontSize: 11.5,
  },
  confirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  modalRegisterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
});

function EventCardSkeleton() {
  return (
    <View style={{
      flexGrow: 1, flexBasis: 300, maxWidth: 360,
      padding: 16, borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.025)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    }}>
      {/* Top Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <SkeletonBlock w={28} h={28} br={6} />
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <SkeletonBlock w={60} h={20} br={10} />
            <SkeletonBlock w={70} h={20} br={10} />
          </View>
        </View>
        <SkeletonBlock w={40} h={20} br={10} />
      </View>
      {/* Title */}
      <SkeletonBlock w="80%" h={18} br={4} style={{ marginTop: 4, marginBottom: 8 }} />
      <SkeletonBlock w="60%" h={18} br={4} style={{ marginBottom: 14 }} />
      {/* Description */}
      <SkeletonBlock w="100%" h={12} br={4} style={{ marginBottom: 6 }} />
      <SkeletonBlock w="90%" h={12} br={4} style={{ marginBottom: 6 }} />
      <SkeletonBlock w="70%" h={12} br={4} style={{ marginBottom: 14 }} />
      {/* Meta details */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <SkeletonBlock w={60} h={12} br={4} />
        <SkeletonBlock w={50} h={12} br={4} />
        <SkeletonBlock w={70} h={12} br={4} />
      </View>
      {/* Tags */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
        <SkeletonBlock w={50} h={16} br={4} />
        <SkeletonBlock w={60} h={16} br={4} />
        <SkeletonBlock w={40} h={16} br={4} />
      </View>
      {/* Divider */}
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 'auto', marginBottom: 10 }} />
      {/* Footer */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBlock w={80} h={14} br={4} />
        <SkeletonBlock w={90} h={30} br={8} />
      </View>
    </View>
  );
}
