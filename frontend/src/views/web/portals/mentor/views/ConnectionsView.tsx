/**
 * Mentor Portal — My Connections (RN port).
 * Status filter chips + search + 6 student cards in a responsive grid.
 * Tapping a card opens a side drawer with the student's full profile.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Modal, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { Search, X, MessageSquare, Calendar as Cal, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge } from '../atoms';
import { STUDENTS, statusMeta } from '../data';

type Student = typeof STUDENTS[number];
const FILTERS: Array<{id: string; label: string}> = [
  { id: 'all',       label: 'All' },
  { id: 'active',    label: 'Active' },
  { id: 'pending',   label: 'Pending' },
  { id: 'completed', label: 'Completed' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ConnectionsView() {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('all');
  const [q, setQ]           = useState('');
  const [picked, setPicked] = useState<Student | null>(null);
  const [studentsList, setStudentsList] = useState(STUDENTS);

  const handleUpdateStudent = (updatedStudent: Student) => {
    // Update local state for immediate re-render
    setStudentsList(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    
    // Update the picked state so that the drawer immediately reflects the updated nextSession/messages
    if (picked && picked.id === updatedStudent.id) {
      setPicked(updatedStudent);
    }
    
    // Update global array so other tabs/views pick it up automatically
    const idx = STUDENTS.findIndex(s => s.id === updatedStudent.id);
    if (idx !== -1) {
      STUDENTS[idx] = updatedStudent as any;
    }
  };

  const list = useMemo(() => studentsList.filter((st) => {
    if (filter !== 'all' && st.status !== filter) return false;
    if (q && !(st.name + ' ' + st.college + ' ' + st.branch).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [studentsList, filter, q]);

  const cardW = width >= 1280 ? '32%' : width >= 760 ? '48%' : '100%';

  return (
    <View>
      {/* Filters + search */}
      <View style={s.toolRow}>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const on = f.id === filter;
            return (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[s.chip, on && s.chipOn]}>
                <Text style={{ color: on ? '#fff' : MC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.searchBox}>
          <Search size={14} color={MC.dim} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search by name, college" placeholderTextColor={MC.dim} style={s.searchInput} />
        </View>
      </View>

      {/* Grid */}
      <View style={s.grid}>
        {list.map((st) => {
          const meta = statusMeta(st.status);
          return (
            <Pressable key={st.id} onPress={() => setPicked(st)} style={({ hovered }: any) => [s.card, { width: cardW as any }, hovered && { borderColor: MC.border2 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Av initials={st.avatar} size={42} color={st.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13.5 }}>{st.name}</Text>
                  <Text numberOfLines={1} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{st.college} · {st.branch}</Text>
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10 }}>{st.saId}</Text>
                </View>
                <Badge label={meta.label} color={meta.color as any} />
              </View>

              {/* Progress */}
              <View style={s.bar}>
                <View style={{
                  height: '100%',
                  width: `${st.progress}%` as any,
                  borderRadius: 2,
                  backgroundColor: st.progress === 100 ? MC.green : st.progress > 60 ? MC.teal : MC.amber,
                }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 10 }}>
                  {st.sessionsCompleted}/{st.sessionsTotal} sessions · CGPA {st.cgpa}
                </Text>
                {!!st.messages && (
                  <View style={s.msgPill}>
                    <Text style={{ color: '#FCD34D', fontFamily: FONTS.xbold, fontSize: 9 }}>{st.messages} new</Text>
                  </View>
                )}
              </View>

              {/* Next session preview on card */}
              {st.nextSession && (
                <View style={{ marginTop: 8, padding: 6, borderRadius: 6, backgroundColor: 'rgba(20,184,166,0.05)', borderWidth: 1, borderColor: 'rgba(20,184,166,0.1)' }}>
                  <Text numberOfLines={1} style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 10 }}>
                    📅 Next: {st.nextSession.date} · {st.nextSession.time}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {st.tags.slice(0, 3).map((t) => (
                  <View key={t} style={s.tag}><Text style={{ color: MC.tealP, fontSize: 10, fontFamily: FONTS.bold }}>{t}</Text></View>
                ))}
              </View>
            </Pressable>
          );
        })}
        {list.length === 0 && (
          <View style={s.empty}><Text style={{ color: MC.muted, fontFamily: FONTS.med }}>No connections match those filters.</Text></View>
        )}
      </View>

      {/* Drawer (modal) */}
      <Modal visible={!!picked} animationType="fade" transparent onRequestClose={() => setPicked(null)}>
        <View style={s.backdrop}>
          <Pressable onPress={() => setPicked(null)} style={{ flex: 1 }} />
          <View style={s.drawer}>
            {picked && (
              <DrawerInner 
                st={picked} 
                onClose={() => setPicked(null)} 
                onUpdateStudent={handleUpdateStudent}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DrawerInner({ st, onClose, onUpdateStudent }: { st: Student; onClose: () => void; onUpdateStudent: (updated: Student) => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'message' | 'schedule'>('profile');
  const [msgText, setMsgText] = useState('');
  
  // Custom mock chat history for each student
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'mentor' | 'student'; text: string; time: string }>>([
    { sender: 'student', text: `Hi Dr. Rao, I had some questions about the topics for our next sessions.`, time: "10:30 AM" },
    { sender: 'mentor', text: `Hello ${st.name.split(' ')[0]}! Sure, feel free to ask. Have you reviewed the last topics?`, time: "11:00 AM" },
    { sender: 'student', text: `Yes, I worked on the assignments. Let's discuss it in our next scheduled slot!`, time: "11:15 AM" },
  ]);

  useEffect(() => {
    if (activeTab === 'message' && st.messages > 0) {
      onUpdateStudent({ ...st, messages: 0 });
    }
  }, [activeTab]);

  // Calendar states
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4); // Default to May (index 4)
  const [pendingDate, setPendingDate] = useState<string | null>(st.nextSession?.date || null);
  const [selectedTime, setSelectedTime] = useState(st.nextSession?.time || '10:00 AM');
  const [sessionTopic, setSessionTopic] = useState(st.nextSession?.topic || '1:1 Mentorship Session');

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
    const formatted = `${MONTH_NAMES[calMonth]} ${day}, 2026`;
    setPendingDate(formatted);
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

  const handleSendMessage = () => {
    if (!msgText.trim()) return;
    const newMsg = {
      sender: 'mentor' as const,
      text: msgText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatHistory((prev) => [...prev, newMsg]);
    setMsgText('');
  };

  const handleConfirmSchedule = () => {
    if (!pendingDate) return;
    
    let daysAway = 7;
    const dayMatch = pendingDate.match(/May (\d+)/i);
    if (dayMatch) {
      const dayNum = parseInt(dayMatch[1], 10);
      daysAway = Math.max(1, dayNum - 1);
    }

    const updated = {
      ...st,
      nextSession: {
        date: pendingDate,
        time: selectedTime,
        topic: sessionTopic,
        daysAway,
      }
    };
    onUpdateStudent(updated);
    setActiveTab('profile'); // Return to profile to see the new next session
  };

  return (
    <View style={{ flex: 1, backgroundColor: MC.bg2 }}>
      {/* Drawer Header */}
      <View style={{ padding: 22, borderBottomWidth: 1, borderBottomColor: MC.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Av initials={st.avatar} size={56} color={st.color} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 18 }}>{st.name}</Text>
          <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12 }}>{st.college} · {st.branch} · {st.year}</Text>
        </View>
        <Pressable onPress={onClose} style={s.iconBtn}><X size={16} color={MC.muted} /></Pressable>
      </View>

      {/* 3 Buttons styled as Tabs */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 22, marginTop: 14, marginBottom: 4 }}>
        <Pressable 
          onPress={() => setActiveTab('message')}
          style={[s.ctaBtn, activeTab === 'message' ? s.ctaActive : s.ctaInactive]}
        >
          <MessageSquare size={14} color={activeTab === 'message' ? MC.bg : MC.tealP} />
          <Text style={{ color: activeTab === 'message' ? MC.bg : MC.tealP, fontFamily: FONTS.xbold, fontSize: 12 }}>Message</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('schedule')}
          style={[s.ctaBtn, activeTab === 'schedule' ? s.ctaActive : s.ctaInactive]}
        >
          <Cal size={14} color={activeTab === 'schedule' ? MC.bg : MC.tealP} />
          <Text style={{ color: activeTab === 'schedule' ? MC.bg : MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Schedule</Text>
        </Pressable>

        <Pressable 
          onPress={() => setActiveTab('profile')}
          style={[s.ctaBtn, activeTab === 'profile' ? s.ctaActive : s.ctaInactive]}
        >
          <ExternalLink size={14} color={activeTab === 'profile' ? MC.bg : MC.tealP} />
          <Text style={{ color: activeTab === 'profile' ? MC.bg : MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Profile</Text>
        </Pressable>
      </View>

      {/* Tab Contents */}
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 10 }}>
        {activeTab === 'profile' && (
          <View>
            {/* Goals */}
            <Text style={s.kicker}>GOALS</Text>
            {st.goals.map((g) => <Text key={g} style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13, marginBottom: 4 }}>• {g}</Text>)}

            {/* Skills */}
            <Text style={s.kicker}>SKILLS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {st.skills.map((sk) => (
                <View key={sk} style={s.tag}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>{sk}</Text></View>
              ))}
            </View>

            {/* Last session */}
            {st.lastSession && (
              <>
                <Text style={s.kicker}>LAST SESSION ({st.lastSession.date})</Text>
                <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13, lineHeight: 19 }}>{st.lastSession.notes}</Text>
              </>
            )}

            {/* Next */}
            {st.nextSession && (
              <>
                <Text style={s.kicker}>NEXT SESSION</Text>
                <View style={s.nextBox}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{st.nextSession.topic}</Text>
                  <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12, marginTop: 3 }}>{st.nextSession.date} · {st.nextSession.time} · in {st.nextSession.daysAway}d</Text>
                </View>
              </>
            )}
          </View>
        )}

        {activeTab === 'message' && (
          <View style={{ gap: 14 }}>
            <Text style={s.kicker}>CONVERSATION WITH {st.name.toUpperCase()}</Text>
            
            {/* Chat Messages */}
            <View style={s.chatContainer}>
              <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                <View style={{ gap: 10 }}>
                  {chatHistory.map((msg, idx) => {
                    const isMentor = msg.sender === 'mentor';
                    return (
                      <View key={idx} style={[s.chatBubble, isMentor ? s.bubbleMentor : s.bubbleStudent]}>
                        <Text style={{ color: '#fff', fontFamily: FONTS.med, fontSize: 13 }}>{msg.text}</Text>
                        <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 9, alignSelf: 'flex-end', marginTop: 3 }}>{msg.time}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Text Input / Comment Box */}
            <View style={s.inputWrapper}>
              <TextInput
                value={msgText}
                onChangeText={setMsgText}
                placeholder="Type a message to send..."
                placeholderTextColor={MC.dim}
                multiline
                style={s.msgInput}
              />
              <Pressable onPress={handleSendMessage} style={s.sendBtn}>
                <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Send</Text>
              </Pressable>
            </View>
          </View>
        )}

        {activeTab === 'schedule' && (
          <View>
            <Text style={s.kicker}>SCHEDULE NEW SESSION</Text>
            
            <View style={{ gap: 12 }}>
              {/* Topic Input */}
              <View>
                <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11, marginBottom: 5 }}>SESSION TOPIC</Text>
                <TextInput
                  value={sessionTopic}
                  onChangeText={setSessionTopic}
                  placeholder="Enter session topic..."
                  placeholderTextColor={MC.dim}
                  style={s.topicInput}
                />
              </View>

              {/* Time Selector */}
              <View>
                <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11, marginBottom: 5 }}>SELECT TIME SLOT</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '04:00 PM', '06:00 PM'].map((t) => {
                    const active = selectedTime === t;
                    return (
                      <Pressable key={t} onPress={() => setSelectedTime(t)} style={[s.timeSlot, active && s.timeSlotActive]}>
                        <Text style={{ color: active ? '#fff' : MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>{t}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Calendar Grid */}
              <View style={s.calCard}>
                <View style={s.monthRow}>
                  <Pressable onPress={handlePrevMonth} style={s.navArrow}>
                    <ChevronLeft size={16} color="#fff" />
                  </Pressable>
                  <Text style={s.monthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
                  <Pressable onPress={handleNextMonth} style={s.navArrow}>
                    <ChevronRight size={16} color="#fff" />
                  </Pressable>
                </View>

                <View style={s.weekDaysRow}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <Text key={i} style={s.weekDayName}>{day}</Text>
                  ))}
                </View>

                <View style={s.daysGrid}>
                  {calendarCells.map((day, idx) => {
                    if (day === null) {
                      return <View key={`empty-${idx}`} style={s.dayCellEmpty} />;
                    }
                    const formatted = `${MONTH_NAMES[calMonth]} ${day}, 2026`;
                    const isSelected = pendingDate === formatted;
                    return (
                      <Pressable
                        key={`day-${day}`}
                        onPress={() => handleDaySelect(day)}
                        style={[s.dayCell, isSelected && s.dayCellSelected]}
                      >
                        <Text style={[s.dayText, isSelected && s.dayTextSelected]}>{day}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Confirm Button */}
              {pendingDate && (
                <Pressable onPress={handleConfirmSchedule} style={s.confirmBtn}>
                  <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>
                    Confirm Session for {pendingDate} at {selectedTime}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: MC.card, borderWidth: 1, borderColor: MC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: MC.teal, borderColor: MC.teal },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 260, height: 36, paddingHorizontal: 11, borderRadius: 10, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1 },
  searchInput: { flex: 1, color: '#fff', fontFamily: FONTS.med, fontSize: 12.5, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 14, ...({ cursor: 'pointer', transitionDuration: '160ms' } as any) },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  msgPill: { backgroundColor: 'rgba(252,211,77,0.20)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tag: { backgroundColor: 'rgba(20,184,166,0.10)', borderColor: MC.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  empty: { width: '100%', padding: 24, alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)', flexDirection: 'row' },
  drawer: { width: 460, maxWidth: '100%' as any, backgroundColor: MC.bg2, borderLeftWidth: 1, borderLeftColor: MC.border },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  kicker: { color: MC.muted, fontFamily: FONTS.xbold, fontSize: 10, letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  nextBox: { backgroundColor: 'rgba(20,184,166,0.08)', borderColor: MC.border2, borderWidth: 1, borderRadius: 10, padding: 12 },

  // Cta button styles
  ctaBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  ctaActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  ctaInactive: { borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.07)' },
  
  // Message tab styles
  chatContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, gap: 10, minHeight: 180, maxHeight: 300, borderWidth: 1, borderColor: MC.border },
  chatBubble: { padding: 10, borderRadius: 10, maxWidth: '85%' },
  bubbleMentor: { backgroundColor: 'rgba(20, 184, 166, 0.15)', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleStudent: { backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  inputWrapper: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 10 },
  msgInput: { flex: 1, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 10, color: '#fff', fontSize: 13, fontFamily: FONTS.med, minHeight: 40, maxHeight: 80, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  sendBtn: { height: 40, width: 60, backgroundColor: MC.tealP, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  
  // Schedule tab styles
  topicInput: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 10, padding: 10, color: '#fff', fontSize: 13, fontFamily: FONTS.med, height: 40, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  timeSlot: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20, 184, 166, 0.05)', ...({ cursor: 'pointer' } as any) },
  timeSlotActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  calCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 5 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  monthLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12.5 },
  navArrow: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', ...({ cursor: 'pointer' } as any) },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayName: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 10.5, width: '13%', textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '1.5%' as any },
  dayCell: { width: '13%', height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 4, ...({ cursor: 'pointer' } as any) },
  dayCellEmpty: { width: '13%', height: 30, marginBottom: 4 },
  dayCellSelected: { backgroundColor: MC.tealP },
  dayText: { color: '#fff', fontFamily: FONTS.med, fontSize: 11 },
  dayTextSelected: { color: MC.bg, fontFamily: FONTS.bold },
  confirmBtn: { backgroundColor: MC.tealP, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, ...({ cursor: 'pointer' } as any) },
});
