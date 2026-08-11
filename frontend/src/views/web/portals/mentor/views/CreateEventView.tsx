/**
 * Mentor Portal — Create Event view: event form + AI generator + my events list.
 * Redesigned to match high-fidelity mockups with stats row, event list cards, and a split form-preview view.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform, ScrollView } from 'react-native';
import { Sparkles, Plus, Calendar, Users, ChevronDown, ChevronLeft, ChevronRight, Clock, Radio, Code, MessageSquare, Briefcase, Video, MapPin, Gift, CreditCard, Edit2, Trash2, TrendingUp, Lightbulb } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { MY_EVENTS as INITIAL_EVENTS, MentorEvent } from '../data';
import { request } from '@/src/models/services/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CreateEventView() {
  const { width } = useWindowDimensions();
  const stack = width < 1024;

  const [events, setEvents] = useState<MentorEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subView, setSubView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Form States
  const [eventType, setEventType] = useState<MentorEvent['type']>('webinar');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [platform, setPlatform] = useState<MentorEvent['platform']>('Google Meet');
  const [seats, setSeats] = useState('100');
  const [visibility, setVisibility] = useState('All Connections');
  const [pricing, setPricing] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState('');
  const [coverColor, setCoverColor] = useState('#6366F1');
  const [aiBusy, setAiBusy] = useState(false);

  // Dropdown UI state controls
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  // Calendar Picker States
  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4); // Default to May
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Time Picker States
  const [showTimePicker, setShowTimePicker] = useState(false);

  const timePresets = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'
  ];

  const durationOptions = [30, 45, 60, 90, 120];
  const platformOptions: MentorEvent['platform'][] = ['Google Meet', 'Zoom', 'In Person'];
  const visibilityOptions = ['All Connections', 'Public'];

  const eventTypes = [
    { id: 'webinar', label: 'Webinar', desc: 'Live presentation to a large audience', icon: Radio },
    { id: 'spotlight', label: 'Spotlight', desc: 'Feature a student or alumni journey', icon: Sparkles },
    { id: 'tech_talk', label: 'Tech Talk', desc: 'Deep-dive on a technical topic', icon: Code },
    { id: 'panel', label: 'Panel Discussion', desc: 'Multiple experts, moderated discussion', icon: Users },
    { id: 'qa', label: 'Q&A Session', desc: 'Open questions from students', icon: MessageSquare },
    { id: 'interview', label: 'Mock Interview', desc: 'Live practice interview with feedback', icon: Briefcase },
  ] as const;

  const colorsList = [
    { hex: '#14B8A6', name: 'teal' },
    { hex: '#3B82F6', name: 'blue' },
    { hex: '#8B5CF6', name: 'purple' },
    { hex: '#F97316', name: 'orange' },
    { hex: '#EC4899', name: 'pink' },
    { hex: '#10B981', name: 'green' },
    { hex: '#F59E0B', name: 'yellow' },
    { hex: '#6366F1', name: 'indigo' },
  ];

  // Auto set matching cover color when event type changes to give UI harmony
  useEffect(() => {
    if (subView === 'create') {
      if (eventType === 'webinar') setCoverColor('#6366F1');
      else if (eventType === 'interview') setCoverColor('#10B981');
      else if (eventType === 'tech_talk') setCoverColor('#3B82F6');
      else if (eventType === 'panel') setCoverColor('#8B5CF6');
      else if (eventType === 'qa') setCoverColor('#EC4899');
      else if (eventType === 'spotlight') setCoverColor('#F59E0B');
    }
  }, [eventType, subView]);

  // Statistics Calculation
  const totalEvents = events.length;
  const totalRegs = events.reduce((sum, e) => sum + e.registered, 0);
  const upcomingCount = events.filter((e) => e.status === 'upcoming').length;
  
  // Average fill rate calculation
  const totalSeats = events.reduce((sum, e) => sum + e.seats, 0);
  const avgFill = totalSeats > 0 ? Math.round((totalRegs / totalSeats) * 100) : 0;

  const stats = [
    { id: 'total', label: 'Total Events', value: totalEvents, icon: Calendar, color: MC.teal, bg: 'rgba(20,184,166,0.1)' },
    { id: 'regs', label: 'Registrations', value: totalRegs, icon: Users, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    { id: 'upcoming', label: 'Upcoming', value: upcomingCount, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { id: 'rate', label: 'Avg Fill Rate', value: `${avgFill}%`, icon: TrendingUp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' }
  ];

  // Trigger AI Auto-fill suggestions
  const aiGenerate = () => {
    setAiBusy(true);
    setTimeout(() => {
      if (eventType === 'webinar') {
        setTitle('System Design Bootcamp: Scaling Web Sockets to 1M Users');
        setDesc('A 90-minute live deep dive into horizontal scaling, message brokers, pub-sub architectures, and handling backpressure in production socket servers. Includes whiteboard architecture + interactive Q&A.');
      } else if (eventType === 'interview') {
        setTitle('FAANG Live Mock Interview: Senior SDE System Design');
        setDesc('Watch a live system design mock interview focusing on a distributed file storage platform. We will evaluate performance, cover core bottlenecks, and analyze high-level vs low-level design patterns.');
      } else if (eventType === 'tech_talk') {
        setTitle('Advanced Memory Management and Profiling in Go');
        setDesc('Learn how to track heap allocations, interpret CPU and memory profiles, and avoid common concurrency patterns that cause goroutine leaks in high-throughput microservices.');
      } else if (eventType === 'panel') {
        setTitle('From Code to Roadmap: Shifting from Engineer to PM');
        setDesc('A moderated panel with lead PMs from Google, Zepto, and Razorpay. Discover critical strategies for positioning technical background as a product advantage, PM resume formatting, and cracking product sense rounds.');
      } else if (eventType === 'qa') {
        setTitle('Ask Me Anything: Tech Careers, Startups, and Scaling');
        setDesc('Open session to ask about system design bottlenecks, early-stage technical choices in startups, architectural patterns for scaling fast, and transition strategies.');
      } else {
        setTitle('Alumni Spotlight: Scaling Zepto from Zero to Millions');
        setDesc('A conversational session highlighting Dr. Suresh Rao’s journey as Zepto’s CTO. Discover architectural evolutions, tech pivots, and the mindset shift from engineer to CTO.');
      }
      setSeats('100');
      setAiBusy(false);
    }, 600);
  };

  const handlePublish = async () => {
    if (!title.trim()) { alert('Please enter an event title'); return; }
    if (!date) { alert('Please select a date'); return; }
    if (!time) { alert('Please select a time'); return; }

    const numSeats = parseInt(seats) || 100;
    const ticketPrice = pricing === 'paid' ? (parseFloat(price) || 0) : undefined;

    // Handle "dd-mm-yyyy" logic vs standard formatted date
    let parsedDate = new Date(`${date} ${time}`);
    if (isNaN(parsedDate.getTime())) {
      parsedDate = new Date();
    }
    const isoString = parsedDate.toISOString();

    const payload = {
      title: title.trim(),
      description: desc.trim(),
      event_type: eventType,
      location_country: 'Online',
      location_city: platform,
      event_date_start: isoString,
      event_date_end: isoString,
      price_type: pricing,
      price_amount: ticketPrice || 0,
      currency: 'INR',
      capacity: numSeats,
      image_url: coverColor,
    };

    try {
      if (subView === 'edit' && editingEventId !== null) {
        // Edit mode
        await request(`/events/${editingEventId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        alert('Event updated successfully!');
      } else {
        // Create mode
        await request('/events', { method: 'POST', body: JSON.stringify(payload) });
        alert('Event published successfully!');
      }
      resetForm();
      setSubView('list');
      fetchEvents();
    } catch (e: any) {
      alert(e.message || 'Failed to save event');
    }
  };

  const handleDelete = async (id: number | string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await request(`/events/${id}`, { method: 'DELETE' });
        fetchEvents();
      } catch (e: any) {
        alert(e.message || 'Failed to delete event');
      }
    }
  };

  const handleEditClick = (event: MentorEvent) => {
    setEditingEventId(event.id);
    setEventType(event.type);
    setTitle(event.title);
    setDesc(event.desc || '');
    setDate(event.date);
    setTime(event.time);
    setDuration(event.duration);
    setPlatform(event.platform);
    setSeats(event.seats.toString());
    setVisibility(event.visibility || 'All Connections');
    setPricing(event.pricing);
    setPrice(event.price ? event.price.toString() : '');
    setCoverColor(event.coverColor);
    setSubView('edit');
  };

  const handleCreateClick = () => {
    resetForm();
    setSubView('create');
  };

  const resetForm = () => {
    setEditingEventId(null);
    setEventType('webinar');
    setTitle('');
    setDesc('');
    setDate('');
    setTime('');
    setDuration(60);
    setPlatform('Google Meet');
    setSeats('100');
    setVisibility('All Connections');
    setPricing('free');
    setPrice('');
    setCoverColor('#6366F1');
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const formatted = `${MONTH_NAMES[calMonth]} ${day}, ${calYear}`;
    setDate(formatted);
    setShowCalendar(false);
  };

  // Generate calendar days
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Monday = 0
  const calendarCells = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const years = Array.from({ length: 16 }, (_, i) => 2020 + i);

  // Render stats cards in list view
  const renderStats = () => (
    <View style={s.statsRow}>
      {stats.map((st) => {
        const Icon = st.icon;
        return (
          <View key={st.id} style={s.statCard}>
            <View style={[s.statIconBox, { backgroundColor: st.bg }]}>
              <Icon size={18} color={st.color} />
            </View>
            <View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  // Render list of event cards
  const renderEventList = () => {
    if (events.length === 0) {
      return (
        <View style={s.emptyState}>
          <Calendar size={48} color={MC.dim} />
          <Text style={s.emptyText}>No events created yet.</Text>
        </View>
      );
    }

    return (
      <View style={{ gap: 12 }}>
        {events.map((e) => {
          const pct = Math.round((e.registered / e.seats) * 100);
          const matchedType = eventTypes.find((t) => t.id === e.type);
          const TypeIcon = matchedType ? matchedType.icon : Radio;

          return (
            <View key={e.id} style={s.eventCard}>
              {/* Type Icon left */}
              <View style={[s.eventIconBox, { borderColor: e.coverColor + '40', backgroundColor: e.coverColor + '10' }]}>
                <TypeIcon size={20} color={e.coverColor} />
              </View>

              {/* Middle details */}
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.eventTitle}>{e.title}</Text>
                  <Badge 
                    label={e.status === 'upcoming' ? 'Upcoming' : 'Completed'} 
                    color={e.status === 'upcoming' ? 'teal' : 'gray'} 
                  />
                </View>
                
                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Calendar size={12} color={MC.dim} />
                    <Text style={s.metaText}>{e.date} · {e.time}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Clock size={12} color={MC.dim} />
                    <Text style={s.metaText}>{e.duration} min</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Video size={12} color={MC.dim} />
                    <Text style={s.metaText}>{e.platform}</Text>
                  </View>
                </View>
              </View>

              {/* Progress and Actions right */}
              <View style={s.rightActionsBox}>
                <View style={{ width: 140, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.registeredText}>{e.registered}/{e.seats} registered</Text>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { backgroundColor: e.coverColor, width: `${Math.min(100, pct)}%` as any }]} />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginLeft: 12 }}>
                  {e.status === 'upcoming' && (
                    <Pressable
                      onPress={() => handleEditClick(e)}
                      style={s.editActionBtn}
                      accessibilityLabel="Edit event"
                    >
                      <Edit2 size={13} color="#fff" />
                      <Text style={s.actionBtnText}>Edit</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleDelete(e.id)}
                    style={s.deleteActionBtn}
                    accessibilityLabel="Delete event"
                  >
                    <Trash2 size={13} color={MC.red} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {subView === 'list' ? (
        // LIST VIEW (Screen 1)
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={s.heading}>My Events</Text>
              <Text style={s.subheading}>{upcomingCount} upcoming · {totalEvents - upcomingCount} completed</Text>
            </View>
            <Pressable onPress={handleCreateClick} style={s.createBtn}>
              <Plus size={16} color={MC.bg} />
              <Text style={s.createBtnText}>Create Event</Text>
            </Pressable>
          </View>

          {renderStats()}
          {renderEventList()}
        </View>
      ) : (
        // FORM + PREVIEW VIEW (Screen 2 & 3)
        <View style={{ gap: 20 }}>
          {/* Back Action */}
          <Pressable onPress={() => setSubView('list')} style={s.backBtn}>
            <ChevronLeft size={16} color={MC.tealP} />
            <Text style={s.backBtnText}>Back</Text>
            <Text style={s.formHeaderTitle}>{subView === 'create' ? 'Create New Event' : 'Edit Event'}</Text>
          </Pressable>

          <View style={{ flexDirection: stack ? 'column' : 'row', gap: 24, alignItems: 'flex-start' }}>
            
            {/* Form Column left */}
            <View style={{ flex: 1, minWidth: 0, gap: 16 }}>
              
              {/* Event Type Grid */}
              <View style={s.formCard}>
                <Text style={s.sectionHeader}>Event Type</Text>
                <View style={s.typeGrid}>
                  {eventTypes.map((t) => {
                    const isSelected = eventType === t.id;
                    const TypeIcon = t.icon;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setEventType(t.id)}
                        style={[
                          s.typeCard,
                          isSelected && { borderColor: coverColor, backgroundColor: coverColor + '10' }
                        ]}
                      >
                        <View style={[s.typeIconBox, isSelected && { backgroundColor: coverColor + '18' }]}>
                          <TypeIcon size={16} color={isSelected ? coverColor : MC.dim} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.typeLabel, isSelected && { color: '#1C1C1E' }]}>{t.label}</Text>
                          <Text style={s.typeDesc}>{t.desc}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Event Details */}
              <View style={s.formCard}>
                <View style={s.detailsHeader}>
                  <Text style={s.sectionHeader}>Event Details</Text>
                  <Pressable onPress={aiGenerate} style={s.aiBtn}>
                    <Sparkles size={12} color="#FCD34D" />
                    <Text style={s.aiBtnText}>{aiBusy ? 'Suggesting…' : 'Generate with AI'}</Text>
                  </Pressable>
                </View>

                {/* Event Title */}
                <View style={{ marginTop: 12 }}>
                  <Text style={s.label}>Event Title *</Text>
                  <View style={s.inputBox}>
                    <TextInput
                      placeholderTextColor={MC.dim}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="e.g. Webinar on System Design"
                      style={s.input}
                    />
                  </View>
                </View>

                {/* Description */}
                <View style={{ marginTop: 14 }}>
                  <Text style={s.label}>Description</Text>
                  <View style={[s.inputBox, { minHeight: 90, alignItems: 'flex-start' }]}>
                    <TextInput
                      placeholderTextColor={MC.dim}
                      value={desc}
                      onChangeText={setDesc}
                      multiline
                      placeholder="What will students learn? Who is this for?"
                      style={[s.input, { flex: 1, height: '100%', textAlignVertical: 'top' }]}
                    />
                  </View>
                </View>

                {/* Date & Time Row */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, zIndex: 999 }}>
                  
                  {/* Date Input with popover */}
                  <View style={{ flex: 1, position: 'relative' }}>
                    <Text style={s.label}>Date *</Text>
                    <View style={s.inputBoxIcon}>
                      <TextInput
                        placeholderTextColor={MC.dim}
                        value={date}
                        onChangeText={setDate}
                        placeholder="dd-mm-yyyy"
                        style={[s.input, { flex: 1 }]}
                      />
                      <Pressable 
                        onPress={() => { setShowCalendar(!showCalendar); setShowTimePicker(false); }} 
                        style={s.calTriggerBtn}
                      >
                        <Calendar size={15} color={coverColor} />
                      </Pressable>
                    </View>

                    {showCalendar && (
                      <View style={s.calPopover}>
                        <View style={s.calPopHeader}>
                          <Pressable onPress={handlePrevMonth} style={s.calNavBtn}>
                            <ChevronLeft size={15} color="#fff" />
                          </Pressable>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={s.calMonthLabel}>{MONTH_NAMES[calMonth]}</Text>
                            
                            <Pressable
                              onPress={() => setShowYearDropdown(!showYearDropdown)}
                              style={s.yearTrigger}
                            >
                              <Text style={s.yearTriggerText}>{calYear}</Text>
                              <ChevronDown size={11} color={coverColor} />
                            </Pressable>

                            {showYearDropdown && (
                              <View style={s.yearDropdown}>
                                <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled={true}>
                                  {years.map((y) => (
                                    <Pressable
                                      key={y}
                                      onPress={() => {
                                        setCalYear(y);
                                        setShowYearDropdown(false);
                                      }}
                                      style={[s.dropdownItem, y === calYear && { backgroundColor: coverColor + '20' }]}
                                    >
                                      <Text style={[s.yearDropdownItemText, y === calYear && { color: coverColor, fontFamily: FONTS.bold }]}>{y}</Text>
                                    </Pressable>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>

                          <Pressable onPress={handleNextMonth} style={s.calNavBtn}>
                            <ChevronRight size={15} color="#fff" />
                          </Pressable>
                        </View>

                        <View style={s.calWeekdays}>
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, idx) => (
                            <Text key={idx} style={s.calWeekdayText}>{w}</Text>
                          ))}
                        </View>

                        <View style={s.calDaysGrid}>
                          {calendarCells.map((day, idx) => {
                            if (day === null) {
                              return <View key={`empty-${idx}`} style={s.calDayEmpty} />;
                            }
                            const formattedDate = `${MONTH_NAMES[calMonth]} ${day}, ${calYear}`;
                            const isSelected = date === formattedDate;

                            return (
                              <Pressable
                                key={`day-${day}`}
                                onPress={() => handleDaySelect(day)}
                                style={[
                                  s.calDayCell,
                                  isSelected && { backgroundColor: coverColor }
                                ]}
                              >
                                <Text style={[s.calDayText, isSelected && { color: MC.bg, fontFamily: FONTS.bold }]}>
                                  {day}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Time Input with popover */}
                  <View style={{ flex: 1, position: 'relative' }}>
                    <Text style={s.label}>Time *</Text>
                    <View style={s.inputBoxIcon}>
                      <TextInput
                        placeholderTextColor={MC.dim}
                        value={time}
                        onChangeText={setTime}
                        placeholder="--:--"
                        style={[s.input, { flex: 1 }]}
                      />
                      <Pressable 
                        onPress={() => { setShowTimePicker(!showTimePicker); setShowCalendar(false); }} 
                        style={s.calTriggerBtn}
                      >
                        <Clock size={15} color={coverColor} />
                      </Pressable>
                    </View>

                    {showTimePicker && (
                      <View style={[s.calPopover, { right: 0, left: undefined, width: 180 }]}>
                        <Text style={s.pickerTitle}>Select Time</Text>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                          {timePresets.map((t) => (
                            <Pressable
                              key={t}
                              onPress={() => {
                                setTime(t);
                                setShowTimePicker(false);
                              }}
                              style={[s.dropdownItem, time === t && { backgroundColor: coverColor + '20' }]}
                            >
                              <Text style={[s.dropdownItemText, time === t && { color: coverColor, fontFamily: FONTS.bold }]}>{t}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                </View>

              </View>

              {/* Settings Section */}
              <View style={s.formCard}>
                <Text style={s.sectionHeader}>Settings</Text>

                {/* Duration & Platform Row */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, zIndex: 888 }}>
                  <View style={{ flex: 1, position: 'relative' }}>
                    <Text style={s.label}>Duration</Text>
                    <Pressable 
                      onPress={() => {
                        setShowDurationDropdown(!showDurationDropdown);
                        setShowPlatformDropdown(false);
                        setShowVisibilityDropdown(false);
                      }} 
                      style={s.dropdownTrigger}
                    >
                      <Text style={s.dropdownValueText}>{duration} minutes</Text>
                      <ChevronDown size={14} color={coverColor} />
                    </Pressable>
                    {showDurationDropdown && (
                      <View style={s.selectDropdown}>
                        {durationOptions.map((opt) => (
                          <Pressable
                            key={opt}
                            onPress={() => {
                              setDuration(opt);
                              setShowDurationDropdown(false);
                            }}
                            style={s.dropdownItem}
                          >
                            <Text style={s.dropdownItemText}>{opt} minutes</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, position: 'relative' }}>
                    <Text style={s.label}>Platform</Text>
                    <Pressable 
                      onPress={() => {
                        setShowPlatformDropdown(!showPlatformDropdown);
                        setShowDurationDropdown(false);
                        setShowVisibilityDropdown(false);
                      }} 
                      style={s.dropdownTrigger}
                    >
                      <Text style={s.dropdownValueText}>{platform}</Text>
                      <ChevronDown size={14} color={coverColor} />
                    </Pressable>
                    {showPlatformDropdown && (
                      <View style={s.selectDropdown}>
                        {platformOptions.map((opt) => (
                          <Pressable
                            key={opt}
                            onPress={() => {
                              setPlatform(opt);
                              setShowPlatformDropdown(false);
                            }}
                            style={s.dropdownItem}
                          >
                            <Text style={s.dropdownItemText}>{opt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Capacity & Visibility Row */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, zIndex: 777 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Max Capacity</Text>
                    <View style={s.inputBoxIcon}>
                      <View style={{ marginRight: 6 }}><Users size={14} color={MC.dim} /></View>
                      <TextInput
                        placeholderTextColor={MC.dim}
                        value={seats}
                        onChangeText={setSeats}
                        keyboardType="numeric"
                        placeholder="100"
                        style={[s.input, { flex: 1 }]}
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1, position: 'relative' }}>
                    <Text style={s.label}>Visibility</Text>
                    <Pressable 
                      onPress={() => {
                        setShowVisibilityDropdown(!showVisibilityDropdown);
                        setShowDurationDropdown(false);
                        setShowPlatformDropdown(false);
                      }} 
                      style={s.dropdownTrigger}
                    >
                      <Text style={s.dropdownValueText}>{visibility}</Text>
                      <ChevronDown size={14} color={coverColor} />
                    </Pressable>
                    {showVisibilityDropdown && (
                      <View style={s.selectDropdown}>
                        {visibilityOptions.map((opt) => (
                          <Pressable
                            key={opt}
                            onPress={() => {
                              setVisibility(opt);
                              setShowVisibilityDropdown(false);
                            }}
                            style={s.dropdownItem}
                          >
                            <Text style={s.dropdownItemText}>{opt}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Pricing Toggles */}
                <View style={{ marginTop: 14 }}>
                  <Text style={s.label}>Pricing</Text>
                  <View style={s.pricingRow}>
                    <Pressable
                      onPress={() => { setPricing('free'); setPrice(''); }}
                      style={[s.pricingTab, pricing === 'free' && { backgroundColor: coverColor, borderColor: coverColor }]}
                    >
                      <Gift size={14} color={pricing === 'free' ? MC.bg : MC.dim} />
                      <Text style={[s.pricingTabText, pricing === 'free' && { color: MC.bg, fontFamily: FONTS.bold }]}>Free</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPricing('paid')}
                      style={[s.pricingTab, pricing === 'paid' && { backgroundColor: coverColor, borderColor: coverColor }]}
                    >
                      <CreditCard size={14} color={pricing === 'paid' ? MC.bg : MC.dim} />
                      <Text style={[s.pricingTabText, pricing === 'paid' && { color: MC.bg, fontFamily: FONTS.bold }]}>Paid</Text>
                    </Pressable>
                  </View>

                  {pricing === 'paid' && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={s.label}>Price (₹) *</Text>
                      <View style={s.inputBox}>
                        <TextInput
                          placeholderTextColor={MC.dim}
                          value={price}
                          onChangeText={setPrice}
                          keyboardType="numeric"
                          placeholder="999"
                          style={s.input}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Cover Color Selector */}
              <View style={s.formCard}>
                <Text style={s.sectionHeader}>Cover Colour</Text>
                <View style={s.colorsListRow}>
                  {colorsList.map((c) => {
                    const isSelected = coverColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <Pressable
                        key={c.hex}
                        onPress={() => setCoverColor(c.hex)}
                        style={[
                          s.colorCircle,
                          { backgroundColor: c.hex },
                          isSelected && s.colorCircleSelected
                        ]}
                      >
                        {isSelected && (
                          <View style={s.innerSelectedDot} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Publish & Cancel Actions */}
              <View style={s.bottomBtnRow}>
                <Pressable onPress={handlePublish} style={[s.publishBtn, { backgroundColor: coverColor }]}>
                  <Text style={s.publishBtnText}>
                    {subView === 'edit' ? 'Save Changes' : 'Publish Event'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => setSubView('list')} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>

            </View>

            {/* Preview Column right */}
            <View style={{ width: stack ? '100%' : 340, gap: 16, position: Platform.OS === 'web' ? 'sticky' : 'relative', top: 20 }}>
              
              {/* Dynamic Live Preview Card */}
              <View style={s.previewCard}>
                <View style={s.previewHeaderRow}>
                  <Text style={s.previewLabel}>LIVE PREVIEW</Text>
                </View>

                {/* Graphic Card Cover */}
                <View style={[s.previewCover, { backgroundColor: coverColor }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <View style={s.previewTypeBadge}>
                      {eventType === 'webinar' && <Radio size={12} color="#fff" />}
                      {eventType === 'interview' && <Briefcase size={12} color="#fff" />}
                      {eventType === 'tech_talk' && <Code size={12} color="#fff" />}
                      {eventType === 'panel' && <Users size={12} color="#fff" />}
                      {eventType === 'qa' && <MessageSquare size={12} color="#fff" />}
                      {eventType === 'spotlight' && <Sparkles size={12} color="#fff" />}
                      <Text style={s.previewTypeText}>{eventType.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={s.previewPriceBadge}>
                      <Text style={s.previewPriceBadgeText}>
                        {pricing === 'free' ? 'FREE' : `₹${price || '0'}`}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.previewTitleText} numberOfLines={2}>
                    {title.trim() || 'Event title will appear here'}
                  </Text>
                </View>

                {/* Details list */}
                <View style={s.previewContent}>
                  <View style={s.previewDetailItem}>
                    <Calendar size={13} color={MC.dim} />
                    <Text style={[s.previewDetailText, !date && { color: MC.dim }]}>{date || 'Date not set'}</Text>
                  </View>
                  <View style={s.previewDetailItem}>
                    <Clock size={13} color={MC.dim} />
                    <Text style={[s.previewDetailText, !time && { color: MC.dim }]}>{time || 'Time not set'}</Text>
                  </View>
                  <View style={s.previewDetailItem}>
                    <Video size={13} color={MC.dim} />
                    <Text style={s.previewDetailText}>{platform}</Text>
                  </View>
                  <View style={s.previewDetailItem}>
                    <Users size={13} color={MC.dim} />
                    <Text style={s.previewDetailText}>{seats || '100'} max registrations</Text>
                  </View>

                  {/* Presenter Pill */}
                  <View style={s.presenterPill}>
                    <View style={s.presenterAvatar}>
                      <Text style={s.presenterAvatarText}>SR</Text>
                    </View>
                    <View>
                      <Text style={s.presenterName}>Dr. Suresh Rao</Text>
                      <Text style={s.presenterRole}>CTO - Zepto</Text>
                    </View>
                  </View>

                  {/* Simulated CTA button */}
                  <Pressable style={[s.previewRegisterBtn, { backgroundColor: coverColor + '20', borderColor: coverColor }]} disabled>
                    <Text style={[s.previewRegisterBtnText, { color: coverColor }]}>Register Now</Text>
                  </Pressable>
                </View>
              </View>

              {/* Attendance Tips Card */}
              <View style={s.tipsCard}>
                <View style={s.tipsHeader}>
                  <Lightbulb size={14} color="#F59E0B" />
                  <Text style={s.tipsHeaderTitle}>TIPS FOR HIGHER ATTENDANCE</Text>
                </View>
                <View style={s.tipsList}>
                  <View style={s.tipsItem}>
                    <View style={s.tipsDot} />
                    <Text style={s.tipsText}>Post 5+ days before the event</Text>
                  </View>
                  <View style={s.tipsItem}>
                    <View style={s.tipsDot} />
                    <Text style={s.tipsText}>Keep duration under 60 mins</Text>
                  </View>
                  <View style={s.tipsItem}>
                    <View style={s.tipsDot} />
                    <Text style={s.tipsText}>Use a clear, benefit-driven title</Text>
                  </View>
                  <View style={s.tipsItem}>
                    <View style={s.tipsDot} />
                    <Text style={s.tipsText}>Share in your network after publishing</Text>
                  </View>
                </View>
              </View>

            </View>

          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  heading: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 20, letterSpacing: -0.5 },
  subheading: { color: MC.muted, fontFamily: FONTS.med, fontSize: 13, marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, height: 38, borderRadius: 10,
    backgroundColor: MC.tealP,
    ...({ cursor: 'pointer' } as any)
  },
  createBtnText: { color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12.5 },
  
  // Stats Section
  statsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 6 },
  statCard: {
    flex: 1, minWidth: 160,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16
  },
  statIconBox: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center'
  },
  statValue: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 17 },
  statLabel: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11, marginTop: 1 },

  // Empty state
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, borderStyle: 'dashed', borderWidth: 1.5,
    borderColor: MC.border, borderRadius: 14, gap: 12
  },
  emptyText: { color: MC.dim, fontFamily: FONTS.med, fontSize: 13 },

  // Event Card List
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1,
    borderRadius: 12, padding: 14, width: '100%', flexWrap: 'wrap'
  },
  eventIconBox: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center'
  },
  eventTitle: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 14.5, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: MC.dim, fontFamily: FONTS.med, fontSize: 11.5 },
  rightActionsBox: {
    flexDirection: 'row', alignItems: 'center',
    marginLeft: 'auto', flexWrap: 'wrap', gap: 10
  },
  registeredText: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11.5 },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 2 },
  editActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, height: 30, borderRadius: 8,
    borderWidth: 1, borderColor: MC.border2, backgroundColor: MC.bg2,
    ...({ cursor: 'pointer' } as any)
  },
  actionBtnText: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 11 },
  deleteActionBtn: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: 'rgba(239,68,68,0.05)',
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },

  // Back CTA in form
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  backBtnText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 13, ...({ cursor: 'pointer' } as any) },
  formHeaderTitle: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 14, marginLeft: 10, borderLeftWidth: 1, borderLeftColor: MC.border, paddingLeft: 12 },

  // Form styles
  formCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 16 },
  sectionHeader: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12.5, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12 },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.3, marginBottom: 5 },
  inputBox: { backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  inputBoxIcon: {
    backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  input: { color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 13, paddingVertical: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  calTriggerBtn: { padding: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.02)', ...({ cursor: 'pointer' } as any) },
  
  // AI button style
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, height: 26, borderRadius: 6,
    backgroundColor: 'rgba(252,211,77,0.1)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.25)'
  },
  aiBtnText: { color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 10.5 },

  // Event Type Select grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '48%', minWidth: 140,
    flexDirection: 'row', gap: 10, padding: 10,
    borderRadius: 10, borderWidth: 1, borderColor: MC.border,
    backgroundColor: MC.bg2,
    ...({ cursor: 'pointer' } as any)
  },
  typeIconBox: { width: 30, height: 30, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  typeLabel: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 12 },
  typeDesc: { color: MC.dim, fontFamily: FONTS.med, fontSize: 10, marginTop: 2 },

  // Settings dropdown triggers
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, height: 38, ...({ cursor: 'pointer' } as any)
  },
  dropdownValueText: { color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 13 },
  selectDropdown: {
    position: 'absolute', top: 56, left: 0, right: 0,
    backgroundColor: '#0F172A', borderColor: MC.border2, borderWidth: 1, borderRadius: 10,
    zIndex: 99999, overflow: 'hidden'
  },
  dropdownItem: { paddingVertical: 8, paddingHorizontal: 12, ...({ cursor: 'pointer' } as any) },
  dropdownItemText: { color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 12.5 },

  // Pricing tabs
  pricingRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pricingTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 36, borderRadius: 8, borderWidth: 1, borderColor: MC.border, backgroundColor: MC.bg2,
    ...({ cursor: 'pointer' } as any)
  },
  pricingTabText: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 12 },

  // Colors list selector
  colorsListRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  colorCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  colorCircleSelected: {
    borderWidth: 2, borderColor: '#fff'
  },
  innerSelectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  // Form bottom CTA
  bottomBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  publishBtn: { flex: 2, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  publishBtnText: { color: MC.bg, fontFamily: FONTS.xbold, fontSize: 13 },
  cancelBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  cancelBtnText: { color: MC.tealP, fontFamily: FONTS.bold, fontSize: 13 },

  // Custom Popover Calendar Picker
  calPopover: {
    position: 'absolute', top: 62, left: 0, width: 250,
    backgroundColor: '#0F172A', borderColor: MC.border2, borderWidth: 1, borderRadius: 12,
    padding: 10, zIndex: 99999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8
  },
  calPopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  calNavBtn: { width: 22, height: 22, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  calMonthLabel: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12 },
  yearTrigger: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  yearTriggerText: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 11 },
  yearDropdown: {
    position: 'absolute', top: 22, left: 20, width: 80, maxHeight: 120,
    backgroundColor: '#1E293B', borderColor: MC.border, borderWidth: 1, borderRadius: 6,
    zIndex: 100000, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4
  },
  yearDropdownItemText: { color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 11 },
  calWeekdays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  calWeekdayText: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 9, width: 28, textAlign: 'center' },
  calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calDayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4, marginVertical: 1, ...({ cursor: 'pointer' } as any) },
  calDayEmpty: { width: `${100 / 7}%`, aspectRatio: 1 },
  calDayText: { color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 10 },
  pickerTitle: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12, marginBottom: 6, textAlign: 'center' },

  // Live Preview layout
  previewCard: {
    backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12,
    overflow: 'hidden'
  },
  previewHeaderRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: MC.border, backgroundColor: MC.bg2 },
  previewLabel: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.5 },
  previewCover: { padding: 16, height: 110, justifyContent: 'space-between' },
  previewTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  previewTypeText: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 0.3 },
  previewPriceBadge: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  previewPriceBadgeText: { color: '#000', fontFamily: FONTS.xbold, fontSize: 9.5 },
  previewTitleText: { color: '#1C1C1E', fontFamily: FONTS.xbold, fontSize: 15.5, letterSpacing: -0.3, marginTop: 8 },
  previewContent: { padding: 14, gap: 8 },
  previewDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewDetailText: { color: '#1C1C1E', fontFamily: FONTS.med, fontSize: 12 },
  presenterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1,
    borderRadius: 8, padding: 8, marginTop: 4
  },
  presenterAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center'
  },
  presenterAvatarText: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 10 },
  presenterName: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 12 },
  presenterRole: { color: MC.dim, fontFamily: FONTS.med, fontSize: 10, marginTop: 1 },
  previewRegisterBtn: {
    height: 34, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 4
  },
  previewRegisterBtnText: { fontFamily: FONTS.bold, fontSize: 12 },

  // Attendance tips
  tipsCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tipsHeaderTitle: { color: '#1C1C1E', fontFamily: FONTS.bold, fontSize: 10.5, letterSpacing: 0.4 },
  tipsList: { gap: 8 },
  tipsItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipsDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F59E0B' },
  tipsText: { color: MC.muted, fontFamily: FONTS.med, fontSize: 11.5 }
});
