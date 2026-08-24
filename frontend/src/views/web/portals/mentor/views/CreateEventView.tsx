/**
 * Mentor Portal — Create Event view: event form + AI generator + my events list.
 * Redesigned to match high-fidelity mockups with stats row, event list cards, and a split form-preview view.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, useWindowDimensions, Platform, ScrollView } from 'react-native';
import { Sparkles, Plus, Calendar, Users, ChevronDown, ChevronLeft, ChevronRight, Clock, Radio, Code, MessageSquare, Briefcase, Video, MapPin, Gift, CreditCard, Edit2, Trash2, TrendingUp, Lightbulb } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { MY_EVENTS as INITIAL_EVENTS, MentorEvent } from '../data';
import { request } from '@/src/models/services/api';
import { useToast, useConfirm } from '@/src/views/components';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CreateEventView() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { width } = useWindowDimensions();
  const stack = width < 1024;

  const [events, setEvents] = useState<MentorEvent[]>(INITIAL_EVENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [subView, setSubView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingEventId, setEditingEventId] = useState<number | string | null>(null);

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

  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const [showTimePicker, setShowTimePicker] = useState(false);

  const timePresets = ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM','07:00 PM','08:00 PM'];
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

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data: any = await request('/events', { method: 'GET' });
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        setEvents(data.items.map((e: any) => ({ ...e, id: e.id || e._id })));
      }
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

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

  const totalEvents = events.length;
  const totalRegs = events.reduce((sum, e) => sum + e.registered, 0);
  const upcomingCount = events.filter((e) => e.status === 'upcoming').length;
  const totalSeats = events.reduce((sum, e) => sum + e.seats, 0);
  const avgFill = totalSeats > 0 ? Math.round((totalRegs / totalSeats) * 100) : 0;

  const stats = [
    { id: 'total', label: 'Total Events', value: totalEvents, icon: Calendar, color: MC.teal, bg: 'rgba(20,184,166,0.1)' },
    { id: 'regs', label: 'Registrations', value: totalRegs, icon: Users, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    { id: 'upcoming', label: 'Upcoming', value: upcomingCount, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { id: 'rate', label: 'Avg Fill Rate', value: `${avgFill}%`, icon: TrendingUp, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' }
  ];

  const aiGenerate = () => {
    setAiBusy(true);
    setTimeout(() => {
      if (eventType === 'webinar') { setTitle('System Design Bootcamp: Scaling Web Sockets to 1M Users'); setDesc('A 90-minute live deep dive into horizontal scaling, message brokers, pub-sub architectures, and handling backpressure in production socket servers. Includes whiteboard architecture + interactive Q&A.'); }
      else if (eventType === 'interview') { setTitle('FAANG Live Mock Interview: Senior SDE System Design'); setDesc('Watch a live system design mock interview focusing on a distributed file storage platform. We will evaluate performance, cover core bottlenecks, and analyze high-level vs low-level design patterns.'); }
      else if (eventType === 'tech_talk') { setTitle('Advanced Memory Management and Profiling in Go'); setDesc('Learn how to track heap allocations, interpret CPU and memory profiles, and avoid common concurrency patterns that cause goroutine leaks in high-throughput microservices.'); }
      else if (eventType === 'panel') { setTitle('From Code to Roadmap: Shifting from Engineer to PM'); setDesc('A moderated panel with lead PMs from Google, Zepto, and Razorpay. Discover critical strategies for positioning technical background as a product advantage, PM resume formatting, and cracking product sense rounds.'); }
      else if (eventType === 'qa') { setTitle('Ask Me Anything: Tech Careers, Startups, and Scaling'); setDesc('Open session to ask about system design bottlenecks, early-stage technical choices in startups, architectural patterns for scaling fast, and transition strategies.'); }
      else { setTitle('Alumni Spotlight: Scaling Zepto from Zero to Millions'); setDesc("A conversational session highlighting Dr. Suresh Rao's journey as Zepto's CTO. Discover architectural evolutions, tech pivots, and the mindset shift from engineer to CTO."); }
      setSeats('100'); setAiBusy(false);
    }, 600);
  };

  const handlePublish = async () => {
    if (!title.trim()) { toast.warning('Missing title', 'Please enter an event title'); return; }
    if (!date) { toast.warning('Missing date', 'Please select a date'); return; }
    if (!time) { toast.warning('Missing time', 'Please select a time'); return; }
    const numSeats = parseInt(seats) || 100;
    const ticketPrice = pricing === 'paid' ? (parseFloat(price) || 0) : undefined;
    let parsedDate = new Date(`${date} ${time}`);
    if (isNaN(parsedDate.getTime())) { parsedDate = new Date(); }
    const isoString = parsedDate.toISOString();
    const payload = { title: title.trim(), description: desc.trim(), event_type: eventType, location_country: 'Online', location_city: platform, event_date_start: isoString, event_date_end: isoString, price_type: pricing, price_amount: ticketPrice || 0, currency: 'INR', capacity: numSeats, image_url: coverColor };
    try {
      if (subView === 'edit' && editingEventId !== null) { await request(`/events/${editingEventId}`, { method: 'PATCH', body: JSON.stringify(payload) }); toast.success('Event updated', 'Changes have been saved.'); }
      else { await request('/events', { method: 'POST', body: JSON.stringify(payload) }); toast.success('Event published', `"${title.trim()}" is live.`); }
      resetForm(); setSubView('list'); fetchEvents();
    } catch (e: any) { toast.error('Save failed', e?.message || 'Failed to save event'); }
  };

  const handleDelete = async (id: number | string) => {
    const ok = await confirm({ title: 'Delete event', message: 'Are you sure you want to delete this event? This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try { await request(`/events/${id}`, { method: 'DELETE' }); toast.success('Event deleted'); fetchEvents(); }
    catch (e: any) { toast.error('Delete failed', e?.message || 'Failed to delete event'); }
  };

  const handleEditClick = (event: MentorEvent) => {
    setEditingEventId(event.id); setEventType(event.type); setTitle(event.title); setDesc(event.desc || ''); setDate(event.date); setTime(event.time); setDuration(event.duration); setPlatform(event.platform); setSeats(event.seats.toString()); setVisibility(event.visibility || 'All Connections'); setPricing(event.pricing); setPrice(event.price ? event.price.toString() : ''); setCoverColor(event.coverColor); setSubView('edit');
  };

  const handleCreateClick = () => { resetForm(); setSubView('create'); };

  const resetForm = () => {
    setEditingEventId(null); setEventType('webinar'); setTitle(''); setDesc(''); setDate(''); setTime(''); setDuration(60); setPlatform('Google Meet'); setSeats('100'); setVisibility('All Connections'); setPricing('free'); setPrice(''); setCoverColor('#6366F1');
  };

  const handlePrevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else { setCalMonth((m) => m - 1); } };
  const handleNextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else { setCalMonth((m) => m + 1); } };
  const handleDaySelect = (day: number) => { const formatted = `${MONTH_NAMES[calMonth]} ${day}, ${calYear}`; setDate(formatted); setShowCalendar(false); };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) { calendarCells.push(null); }
  for (let d = 1; d <= daysInMonth; d++) { calendarCells.push(d); }
  const years = Array.from({ length: 16 }, (_, i) => 2020 + i);

  const renderStats = () => (
    <View className="flex-row gap-3.5 flex-wrap mb-1.5">
      {stats.map((st) => {
        const Icon = st.icon;
        return (
          <View key={st.id} className="flex-1 min-w-[160px] flex-row items-center gap-3 bg-card border border-glass-border rounded-xl py-3.5 px-4">
            <View className="w-9 h-9 rounded-[18px] items-center justify-center" style={{ backgroundColor: st.bg }}>
              <Icon size={18} color={st.color} />
            </View>
            <View>
              <Text className="text-white font-display-bold text-[17px]">{st.value}</Text>
              <Text className="text-muted font-body-bold text-[11px] mt-[1px]">{st.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderEventList = () => {
    if (events.length === 0) {
      return (
        <View className="items-center justify-center py-[60px] border-[1.5px] border-dashed border-glass-border rounded-[14px] gap-3">
          <Calendar size={48} color={MC.dim} />
          <Text className="text-dim font-body-medium text-[13px]">No events created yet.</Text>
        </View>
      );
    }
    return (
      <View className="gap-3">
        {events.map((e) => {
          const pct = Math.round((e.registered / e.seats) * 100);
          const matchedType = eventTypes.find((t) => t.id === e.type);
          const TypeIcon = matchedType ? matchedType.icon : Radio;
          return (
            <View key={e.id} className="flex-row items-center gap-3.5 bg-card border border-glass-border rounded-xl p-3.5 w-full flex-wrap">
              <View className="w-[42px] h-[42px] rounded-[21px] border-[1.5px] items-center justify-center" style={{ borderColor: e.coverColor + '40', backgroundColor: e.coverColor + '10' }}>
                <TypeIcon size={20} color={e.coverColor} />
              </View>
              <View className="flex-1 min-w-0 gap-1">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="text-white font-body-bold text-[14.5px] flex-shrink">{e.title}</Text>
                  <Badge label={e.status === 'upcoming' ? 'Upcoming' : 'Completed'} color={e.status === 'upcoming' ? 'teal' : 'gray'} />
                </View>
                <View className="flex-row items-center gap-3 flex-wrap mt-1">
                  <View className="flex-row items-center gap-1"><Calendar size={12} color={MC.dim} /><Text className="text-dim font-body-medium text-[11.5px]">{e.date} · {e.time}</Text></View>
                  <View className="flex-row items-center gap-1"><Clock size={12} color={MC.dim} /><Text className="text-dim font-body-medium text-[11.5px]">{e.duration} min</Text></View>
                  <View className="flex-row items-center gap-1"><Video size={12} color={MC.dim} /><Text className="text-dim font-body-medium text-[11.5px]">{e.platform}</Text></View>
                </View>
              </View>
              <View className="flex-row items-center ml-auto flex-wrap gap-2.5">
                <View className="w-[140px] gap-1">
                  <Text className="text-muted font-body-bold text-[11.5px]">{e.registered}/{e.seats} registered</Text>
                  <View className="h-1 rounded bg-white/[0.06] mt-1 overflow-hidden">
                    <View className="h-full rounded" style={{ backgroundColor: e.coverColor, width: `${Math.min(100, pct)}%` as any }} />
                  </View>
                </View>
                <View className="flex-row gap-1.5 ml-3">
                  {e.status === 'upcoming' && (
                    <Pressable onPress={() => handleEditClick(e)} className="flex-row items-center gap-1 px-3 h-[30px] rounded-lg border border-glass-border bg-bg2 cursor-pointer" accessibilityLabel="Edit event">
                      <Edit2 size={13} color="#fff" />
                      <Text className="text-white font-body-bold text-[11px]">Edit</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => handleDelete(e.id)} className="w-[30px] h-[30px] rounded-lg border border-red-500/20 bg-red-500/[0.05] items-center justify-center cursor-pointer" accessibilityLabel="Delete event">
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

  const webOutlineStyle = Platform.OS === 'web' ? { outlineStyle: 'none' } as any : undefined;

  return (
    <View className="flex-1">
      {subView === 'list' ? (
        <View className="gap-5">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white font-display-bold text-[20px] tracking-tight">My Events</Text>
              <Text className="text-muted font-body-medium text-[13px] mt-0.5">{upcomingCount} upcoming · {totalEvents - upcomingCount} completed</Text>
            </View>
            <Pressable onPress={handleCreateClick} className="flex-row items-center gap-1.5 px-4 h-[38px] rounded-[10px] bg-tealP cursor-pointer">
              <Plus size={16} color={MC.bg} />
              <Text className="text-bg font-display-bold text-[12.5px]">Create Event</Text>
            </Pressable>
          </View>
          {renderStats()}
          {renderEventList()}
        </View>
      ) : (
        <View className="gap-5">
          <Pressable onPress={() => setSubView('list')} className="flex-row items-center gap-1.5 mb-1">
            <ChevronLeft size={16} color={MC.tealP} />
            <Text className="text-tealP font-body-bold text-[13px] cursor-pointer">Back</Text>
            <Text className="text-white font-body-bold text-[14px] ml-2.5 border-l border-glass-border pl-3">{subView === 'create' ? 'Create New Event' : 'Edit Event'}</Text>
          </Pressable>

          <View style={{ flexDirection: stack ? 'column' : 'row', gap: 24, alignItems: 'flex-start' }}>
            <View className="flex-1 min-w-0 gap-4">
              <View className="bg-card border border-glass-border rounded-xl p-4">
                <Text className="text-white font-body-bold text-[12.5px] tracking-wider uppercase mb-3">Event Type</Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {eventTypes.map((t) => {
                    const isSelected = eventType === t.id;
                    const TypeIcon = t.icon;
                    return (
                      <Pressable key={t.id} onPress={() => setEventType(t.id)} className="w-[48%] min-w-[140px] flex-row gap-2.5 p-2.5 rounded-[10px] border cursor-pointer" style={{ borderColor: isSelected ? coverColor : MC.border, backgroundColor: isSelected ? coverColor + '10' : MC.bg2 }}>
                        <View className="w-[30px] h-[30px] rounded-md items-center justify-center" style={{ backgroundColor: isSelected ? coverColor + '18' : 'rgba(255,255,255,0.03)' }}>
                          <TypeIcon size={16} color={isSelected ? coverColor : MC.dim} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-body-bold text-xs" style={{ color: isSelected ? '#fff' : MC.muted }}>{t.label}</Text>
                          <Text className="text-dim font-body-medium text-[10px] mt-0.5">{t.desc}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="bg-card border border-glass-border rounded-xl p-4">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-white font-body-bold text-[12.5px] tracking-wider uppercase mb-3">Event Details</Text>
                  <Pressable onPress={aiGenerate} className="flex-row items-center gap-[5px] px-2.5 h-[26px] rounded-md bg-amber-300/[0.1] border border-amber-300/25">
                    <Sparkles size={12} color="#FCD34D" />
                    <Text className="text-amber-300 font-body-bold text-[10.5px]">{aiBusy ? 'Suggesting…' : 'Generate with AI'}</Text>
                  </Pressable>
                </View>
                <View className="mt-3">
                  <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Event Title *</Text>
                  <View className="bg-bg2 border border-glass-border rounded-[10px] px-3 py-1">
                    <TextInput placeholderTextColor={MC.dim} value={title} onChangeText={setTitle} placeholder="e.g. Webinar on System Design" className="text-white font-body-medium text-[13px] py-2" style={webOutlineStyle} />
                  </View>
                </View>
                <View className="mt-3.5">
                  <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Description</Text>
                  <View className="bg-bg2 border border-glass-border rounded-[10px] px-3 py-1 min-h-[90px] items-start">
                    <TextInput placeholderTextColor={MC.dim} value={desc} onChangeText={setDesc} multiline placeholder="What will students learn? Who is this for?" className="text-white font-body-medium text-[13px] py-2 flex-1 h-full text-top" style={webOutlineStyle} />
                  </View>
                </View>
                <View className="flex-row gap-3 mt-3.5 z-[999]">
                  <View className="flex-1 relative">
                    <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Date *</Text>
                    <View className="bg-bg2 border border-glass-border rounded-[10px] px-3 flex-row items-center justify-between">
                      <TextInput placeholderTextColor={MC.dim} value={date} onChangeText={setDate} placeholder="dd-mm-yyyy" className="text-white font-body-medium text-[13px] py-2 flex-1" style={webOutlineStyle} />
                      <Pressable onPress={() => { setShowCalendar(!showCalendar); setShowTimePicker(false); }} className="p-1.5 rounded-md bg-white/[0.02] cursor-pointer">
                        <Calendar size={15} color={coverColor} />
                      </Pressable>
                    </View>
                    {showCalendar && (
                      <View className="absolute top-[62px] left-0 w-[250px] bg-[#0F172A] border border-glass-border rounded-xl p-2.5 z-[99999] shadow-lg">
                        <View className="flex-row justify-between items-center mb-2">
                          <Pressable onPress={handlePrevMonth} className="w-[22px] h-[22px] rounded bg-white/[0.05] items-center justify-center cursor-pointer"><ChevronLeft size={15} color="#fff" /></Pressable>
                          <View className="flex-row items-center gap-1">
                            <Text className="text-white font-body-bold text-xs">{MONTH_NAMES[calMonth]}</Text>
                            <Pressable onPress={() => setShowYearDropdown(!showYearDropdown)} className="flex-row items-center gap-0.5 bg-white/[0.04] px-1.5 py-0.5 rounded">
                              <Text className="text-white font-body-bold text-[11px]">{calYear}</Text>
                              <ChevronDown size={11} color={coverColor} />
                            </Pressable>
                            {showYearDropdown && (
                              <View className="absolute top-[22px] left-5 w-[80px] max-h-[120px] bg-[#1E293B] border border-glass-border rounded-md z-[100000] shadow-md">
                                <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled>
                                  {years.map((y) => (
                                    <Pressable key={y} onPress={() => { setCalYear(y); setShowYearDropdown(false); }} className="py-2 px-3 cursor-pointer" style={y === calYear ? { backgroundColor: coverColor + '20' } : undefined}>
                                      <Text className="font-body-medium text-[11px]" style={y === calYear ? { color: coverColor, fontFamily: FONTS.bold } : { color: '#fff' }}>{y}</Text>
                                    </Pressable>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                          <Pressable onPress={handleNextMonth} className="w-[22px] h-[22px] rounded bg-white/[0.05] items-center justify-center cursor-pointer"><ChevronRight size={15} color="#fff" /></Pressable>
                        </View>
                        <View className="flex-row justify-around mb-1">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, idx) => (<Text key={idx} className="text-dim font-body-bold text-[9px] w-7 text-center">{w}</Text>))}
                        </View>
                        <View className="flex-row flex-wrap justify-start">
                          {calendarCells.map((day, idx) => {
                            if (day === null) return <View key={`empty-${idx}`} className="w-[14.28%] aspect-square" />;
                            const formattedDate = `${MONTH_NAMES[calMonth]} ${day}, ${calYear}`;
                            const isSelected = date === formattedDate;
                            return (
                              <Pressable key={`day-${day}`} onPress={() => handleDaySelect(day)} className="w-[14.28%] aspect-square items-center justify-center rounded cursor-pointer" style={isSelected ? { backgroundColor: coverColor } : undefined}>
                                <Text className="font-body-medium text-[10px]" style={isSelected ? { color: MC.bg, fontFamily: FONTS.bold } : { color: '#fff' }}>{day}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                  <View className="flex-1 relative">
                    <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Time *</Text>
                    <View className="bg-bg2 border border-glass-border rounded-[10px] px-3 flex-row items-center justify-between">
                      <TextInput placeholderTextColor={MC.dim} value={time} onChangeText={setTime} placeholder="--:--" className="text-white font-body-medium text-[13px] py-2 flex-1" style={webOutlineStyle} />
                      <Pressable onPress={() => { setShowTimePicker(!showTimePicker); setShowCalendar(false); }} className="p-1.5 rounded-md bg-white/[0.02] cursor-pointer">
                        <Clock size={15} color={coverColor} />
                      </Pressable>
                    </View>
                    {showTimePicker && (
                      <View className="absolute top-[62px] right-0 left-auto w-[180px] bg-[#0F172A] border border-glass-border rounded-xl p-2.5 z-[99999] shadow-lg">
                        <Text className="text-white font-body-bold text-xs mb-1.5 text-center">Select Time</Text>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                          {timePresets.map((t) => (
                            <Pressable key={t} onPress={() => { setTime(t); setShowTimePicker(false); }} className="py-2 px-3 cursor-pointer" style={time === t ? { backgroundColor: coverColor + '20' } : undefined}>
                              <Text className="font-body-medium text-[12.5px]" style={time === t ? { color: coverColor, fontFamily: FONTS.bold } : { color: '#fff' }}>{t}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View className="bg-card border border-glass-border rounded-xl p-4">
                <Text className="text-white font-body-bold text-[12.5px] tracking-wider uppercase mb-3">Settings</Text>
                <View className="flex-row gap-3 mt-3 z-[888]">
                  <View className="flex-1 relative">
                    <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Duration</Text>
                    <Pressable onPress={() => { setShowDurationDropdown(!showDurationDropdown); setShowPlatformDropdown(false); setShowVisibilityDropdown(false); }} className="flex-row items-center justify-between bg-bg2 border border-glass-border rounded-[10px] px-3 h-[38px] cursor-pointer">
                      <Text className="text-white font-body-medium text-[13px]">{duration} minutes</Text>
                      <ChevronDown size={14} color={coverColor} />
                    </Pressable>
                    {showDurationDropdown && (
                      <View className="absolute top-14 left-0 right-0 bg-[#0F172A] border border-glass-border rounded-[10px] z-[99999] overflow-hidden">
                        {durationOptions.map((opt) => (<Pressable key={opt} onPress={() => { setDuration(opt); setShowDurationDropdown(false); }} className="py-2 px-3 cursor-pointer"><Text className="text-white font-body-medium text-[12.5px]">{opt} minutes</Text></Pressable>))}
                      </View>
                    )}
                  </View>
                  <View className="flex-1 relative">
                    <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Platform</Text>
                    <Pressable onPress={() => { setShowPlatformDropdown(!showPlatformDropdown); setShowDurationDropdown(false); setShowVisibilityDropdown(false); }} className="flex-row items-center justify-between bg-bg2 border border-glass-border rounded-[10px] px-3 h-[38px] cursor-pointer">
                      <Text className="text-white font-body-medium text-[13px]">{platform}</Text>
                      <ChevronDown size={14} color={coverColor} />
                    </Pressable>
                    {showPlatformDropdown && (
                      <View className="absolute top-14 left-0 right-0 bg-[#0F172A] border border-glass-border rounded-[10px] z-[99999] overflow-hidden">
                        {platformOptions.map((opt) => (<Pressable key={opt} onPress={() => { setPlatform(opt); setShowPlatformDropdown(false); }} className="py-2 px-3 cursor-pointer"><Text className="text-white font-body-medium text-[12.5px]">{opt}</Text></Pressable>))}
                      </View>
                    )}
                  </View>
                </View>
                <View className="flex-row gap-3 mt-3.5 z-[777]">
                  <View className="flex-1">
                    <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Max Capacity</Text>
                    <View className="bg-bg2 border border-glass-border rounded-[10px] px-3 flex-row items-center justify-between">
                      <View className="mr-1.5"><Users size={14} color={MC.dim} /></View>
                      <TextInput placeholderTextColor={MC.dim} value={seats} onChangeText={setSeats} keyboardType="numeric" placeholder="100" className="text-white font-body-medium text-[13px] py-2 flex-1" style={webOutlineStyle} />
                    </View>
                  </View>
                  <View className="flex-1 relative">
                    <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Visibility</Text>
                    <Pressable onPress={() => { setShowVisibilityDropdown(!showVisibilityDropdown); setShowDurationDropdown(false); setShowPlatformDropdown(false); }} className="flex-row items-center justify-between bg-bg2 border border-glass-border rounded-[10px] px-3 h-[38px] cursor-pointer">
                      <Text className="text-white font-body-medium text-[13px]">{visibility}</Text>
                      <ChevronDown size={14} color={coverColor} />
                    </Pressable>
                    {showVisibilityDropdown && (
                      <View className="absolute top-14 left-0 right-0 bg-[#0F172A] border border-glass-border rounded-[10px] z-[99999] overflow-hidden">
                        {visibilityOptions.map((opt) => (<Pressable key={opt} onPress={() => { setVisibility(opt); setShowVisibilityDropdown(false); }} className="py-2 px-3 cursor-pointer"><Text className="text-white font-body-medium text-[12.5px]">{opt}</Text></Pressable>))}
                      </View>
                    )}
                  </View>
                </View>
                <View className="mt-3.5">
                  <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Pricing</Text>
                  <View className="flex-row gap-2.5 mt-1">
                    <Pressable onPress={() => { setPricing('free'); setPrice(''); }} className="flex-1 flex-row items-center justify-center gap-1.5 h-[36px] rounded-lg border cursor-pointer" style={{ backgroundColor: pricing === 'free' ? coverColor : MC.bg2, borderColor: pricing === 'free' ? coverColor : MC.border }}>
                      <Gift size={14} color={pricing === 'free' ? MC.bg : MC.dim} />
                      <Text className="font-body-bold text-xs" style={{ color: pricing === 'free' ? MC.bg : MC.dim }}>Free</Text>
                    </Pressable>
                    <Pressable onPress={() => setPricing('paid')} className="flex-1 flex-row items-center justify-center gap-1.5 h-[36px] rounded-lg border cursor-pointer" style={{ backgroundColor: pricing === 'paid' ? coverColor : MC.bg2, borderColor: pricing === 'paid' ? coverColor : MC.border }}>
                      <CreditCard size={14} color={pricing === 'paid' ? MC.bg : MC.dim} />
                      <Text className="font-body-bold text-xs" style={{ color: pricing === 'paid' ? MC.bg : MC.dim }}>Paid</Text>
                    </Pressable>
                  </View>
                  {pricing === 'paid' && (
                    <View className="mt-2.5">
                      <Text className="text-muted font-body-bold text-[11px] tracking-wider mb-[5px]">Price (₹) *</Text>
                      <View className="bg-bg2 border border-glass-border rounded-[10px] px-3 py-1">
                        <TextInput placeholderTextColor={MC.dim} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="999" className="text-white font-body-medium text-[13px] py-2" style={webOutlineStyle} />
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View className="bg-card border border-glass-border rounded-xl p-4">
                <Text className="text-white font-body-bold text-[12.5px] tracking-wider uppercase mb-3">Cover Colour</Text>
                <View className="flex-row gap-2.5 flex-wrap mt-1">
                  {colorsList.map((c) => {
                    const isSelected = coverColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <Pressable key={c.hex} onPress={() => setCoverColor(c.hex)} className="w-7 h-7 rounded-[14px] items-center justify-center cursor-pointer" style={{ backgroundColor: c.hex, borderWidth: isSelected ? 2 : 0, borderColor: isSelected ? '#fff' : 'transparent' }}>
                        {isSelected && <View className="w-2 h-2 rounded bg-white" />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row gap-2.5 mt-1.5">
                <Pressable onPress={handlePublish} className="flex-[2] h-10 rounded-[10px] items-center justify-center cursor-pointer" style={{ backgroundColor: coverColor }}>
                  <Text className="text-bg font-display-bold text-[13px]">{subView === 'edit' ? 'Save Changes' : 'Publish Event'}</Text>
                </Pressable>
                <Pressable onPress={() => setSubView('list')} className="flex-1 h-10 rounded-[10px] border border-glass-border bg-white/[0.02] items-center justify-center cursor-pointer">
                  <Text className="text-tealP font-body-bold text-[13px]">Cancel</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ width: stack ? '100%' : 340, gap: 16, position: Platform.OS === 'web' ? 'sticky' : 'relative', top: 20 } as any}>
              <View className="bg-card border border-glass-border rounded-xl overflow-hidden">
                <View className="p-2.5 border-b border-glass-border bg-bg2">
                  <Text className="text-dim font-body-bold text-[10.5px] tracking-wider">LIVE PREVIEW</Text>
                </View>
                <View className="p-4 h-[110px] justify-between" style={{ backgroundColor: coverColor }}>
                  <View className="flex-row justify-between items-center w-full">
                    <View className="flex-row items-center gap-1 bg-black/25 px-2 py-1 rounded-[20px]">
                      {eventType === 'webinar' && <Radio size={12} color="#fff" />}
                      {eventType === 'interview' && <Briefcase size={12} color="#fff" />}
                      {eventType === 'tech_talk' && <Code size={12} color="#fff" />}
                      {eventType === 'panel' && <Users size={12} color="#fff" />}
                      {eventType === 'qa' && <MessageSquare size={12} color="#fff" />}
                      {eventType === 'spotlight' && <Sparkles size={12} color="#fff" />}
                      <Text className="text-white font-body-bold text-[9.5px] tracking-wider">{eventType.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View className="bg-white px-2 py-[3px] rounded-md">
                      <Text className="text-black font-display-bold text-[9.5px]">{pricing === 'free' ? 'FREE' : `₹${price || '0'}`}</Text>
                    </View>
                  </View>
                  <Text className="text-white font-display-bold text-[15.5px] tracking-tight mt-2" numberOfLines={2}>{title.trim() || 'Event title will appear here'}</Text>
                </View>
                <View className="p-3.5 gap-2">
                  <View className="flex-row items-center gap-2"><Calendar size={13} color={MC.dim} /><Text className="font-body-medium text-xs" style={{ color: date ? '#fff' : MC.dim }}>{date || 'Date not set'}</Text></View>
                  <View className="flex-row items-center gap-2"><Clock size={13} color={MC.dim} /><Text className="font-body-medium text-xs" style={{ color: time ? '#fff' : MC.dim }}>{time || 'Time not set'}</Text></View>
                  <View className="flex-row items-center gap-2"><Video size={13} color={MC.dim} /><Text className="text-white font-body-medium text-xs">{platform}</Text></View>
                  <View className="flex-row items-center gap-2"><Users size={13} color={MC.dim} /><Text className="text-white font-body-medium text-xs">{seats || '100'} max registrations</Text></View>
                  <View className="flex-row items-center gap-2 bg-bg2 border border-glass-border rounded-lg p-2 mt-1">
                    <View className="w-7 h-7 rounded-[14px] bg-white/[0.08] items-center justify-center"><Text className="text-white font-body-bold text-[10px]">SR</Text></View>
                    <View><Text className="text-white font-body-bold text-xs">Dr. Suresh Rao</Text><Text className="text-dim font-body-medium text-[10px] mt-[1px]">CTO - Zepto</Text></View>
                  </View>
                  <Pressable className="h-[34px] rounded-lg border items-center justify-center mt-1" style={{ backgroundColor: coverColor + '20', borderColor: coverColor }} disabled>
                    <Text className="font-body-bold text-xs" style={{ color: coverColor }}>Register Now</Text>
                  </Pressable>
                </View>
              </View>

              <View className="bg-card border border-glass-border rounded-xl p-3.5">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Lightbulb size={14} color="#F59E0B" />
                  <Text className="text-white font-body-bold text-[10.5px] tracking-wider">TIPS FOR HIGHER ATTENDANCE</Text>
                </View>
                <View className="gap-2">
                  {['Post 5+ days before the event', 'Keep duration under 60 mins', 'Use a clear, benefit-driven title', 'Share in your network after publishing'].map((tip, i) => (
                    <View key={i} className="flex-row items-center gap-2">
                      <View className="w-[5px] h-[5px] rounded-[2.5px] bg-amber-500" />
                      <Text className="text-muted font-body-medium text-[11.5px]">{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
