/**
 * Mentor Portal — Sessions view.
 * Today | Upcoming | Past tabs, with session rows + Join button + AI prep.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, ScrollView, TextInput } from 'react-native';
import { Calendar as CalIcon, Clock, Sparkles, Video, ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Av, Badge, Countdown } from '../atoms';
import { TODAY_SESSIONS, STUDENTS as INITIAL_STUDENTS } from '../data';

type TabId = 'today' | 'upcoming' | 'past';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function SessionsView() {
  const [tab, setTab] = useState<TabId>('today');
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  
  // Rescheduling states
  const [reschedulingSession, setReschedulingSession] = useState<any | null>(null);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4); // Default to May (index 4) for the demo context
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  const upcoming = students.filter((s) => s.nextSession).map((s) => ({ ...s.nextSession!, student: s }));
  const past = students.filter((s) => s.lastSession).map((s) => ({ ...s.lastSession!, student: s }));

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
    setPendingDate(formatted);
  };

  const confirmReschedule = () => {
    if (!reschedulingSession || !pendingDate) return;
    
    // Parse scheduled date and time dynamically relative to the current local date
    let daysAway = 7;
    try {
      const now = new Date();
      const sessionDate = new Date(`${pendingDate} ${selectedTime}`);
      const diffMs = sessionDate.getTime() - now.getTime();
      daysAway = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } catch (e) {
      console.error('Error calculating daysAway for rescheduled session:', e);
    }

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === reschedulingSession.student.id) {
          return {
            ...s,
            nextSession: {
              ...s.nextSession!,
              date: pendingDate,
              time: selectedTime,
              daysAway,
            },
          };
        }
        return s;
      })
    );

    setPendingDate(null);
    setReschedulingSession(null);
    setTab('upcoming');
  };

  // Generate calendar days
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Monday = 0
  const calendarCells = [];
  
  // Padding cells
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  // Month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Rescheduling Calendar View
  if (reschedulingSession) {
    return (
      <View style={s.calendarContainer}>
        {/* Header */}
        <View style={s.calHeader}>
          <Pressable onPress={() => setReschedulingSession(null)} style={s.backBtn}>
            <ArrowLeft size={16} color={MC.tealP} />
            <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 13 }}>Back to Sessions</Text>
          </Pressable>
          <Text style={s.calTitle}>Reschedule Session</Text>
          <Text style={s.calSub}>
            Rescheduling topic: <Text style={{ color: '#fff', fontFamily: FONTS.bold }}>"{reschedulingSession.topic}"</Text> with <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>{reschedulingSession.student.name}</Text>
          </Text>
        </View>

        {/* Calendar Card */}
        <View style={s.calCard}>
          {/* Month Selector */}
          <View style={s.monthRow}>
            <Pressable onPress={handlePrevMonth} style={s.navArrow}>
              <ChevronLeft size={18} color="#fff" />
            </Pressable>
            <Text style={s.monthLabel}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <Pressable onPress={handleNextMonth} style={s.navArrow}>
              <ChevronRight size={18} color="#fff" />
            </Pressable>
          </View>

          {/* Weekday Names */}
          <View style={s.weekDaysRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Text key={day} style={s.weekDayName}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={s.daysGrid}>
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={s.dayCellEmpty} />;
              }
              const isToday = day === 25 && calMonth === 4 && calYear === 2026; // Highlight mock system date
              return (
                <Pressable
                  key={`day-${day}`}
                  onPress={() => handleDaySelect(day)}
                  style={({ hovered }: any) => [
                    s.dayCell,
                    isToday && s.dayCellToday,
                    hovered && s.dayCellHovered
                  ]}
                >
                  <Text style={[s.dayText, isToday && { color: MC.bg, fontFamily: FONTS.xbold }]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Time Selector */}
          <View style={s.timeSection}>
            <Text style={s.timeSectionTitle}>Select Time Slot</Text>
            <View style={s.timePresetsRow}>
              {['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((tPreset) => (
                <Pressable
                  key={tPreset}
                  onPress={() => setSelectedTime(tPreset)}
                  style={[s.timePresetChip, selectedTime === tPreset && s.timePresetChipActive]}
                >
                  <Text style={[s.timePresetText, selectedTime === tPreset && { color: MC.bg, fontFamily: FONTS.bold }]}>
                    {tPreset}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 13 }}>Or enter custom time:</Text>
              <TextInput
                value={selectedTime}
                onChangeText={setSelectedTime}
                style={s.customTimeInput}
                placeholder="e.g. 10:00 AM"
                placeholderTextColor={MC.dim}
              />
            </View>
          </View>
        </View>

        {/* Custom Confirmation Dialog Overlay */}
        {pendingDate && (
          <View style={s.overlay}>
            <View style={s.confirmModal}>
              <View style={s.modalIcon}>
                <CalIcon size={24} color={MC.tealP} />
              </View>
              <Text style={s.modalTitle}>Confirm Reschedule</Text>
              <Text style={s.modalBody}>
                Are you sure you want to reschedule your session with{' '}
                <Text style={{ color: '#fff', fontFamily: FONTS.bold }}>{reschedulingSession.student.name}</Text>{' '}
                to <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>{pendingDate}</Text> at{' '}
                <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>{selectedTime}</Text>?
              </Text>
              
              <View style={s.modalActions}>
                <Pressable onPress={() => setPendingDate(null)} style={s.modalCancelBtn}>
                  <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 13 }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={confirmReschedule} style={s.modalConfirmBtn}>
                  <Check size={14} color={MC.bg} style={{ marginRight: 4 }} />
                  <Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 13 }}>Confirm & Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      {/* Tabs */}
      <View style={s.tabsRow}>
        {(['today','upcoming','past'] as TabId[]).map((t) => {
          const on = t === tab;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, on && s.tabOn]}>
              <Text style={{ color: on ? '#fff' : MC.muted, fontFamily: FONTS.bold, fontSize: 13, textTransform: 'capitalize' }}>{t}</Text>
              <View style={[s.tabCount, on && { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
                <Text style={{ color: on ? '#fff' : MC.muted, fontFamily: FONTS.xbold, fontSize: 10 }}>
                  {t === 'today' ? TODAY_SESSIONS.length : t === 'upcoming' ? upcoming.length : past.length}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <View style={{ gap: 10 }}>
        {tab === 'today' && TODAY_SESSIONS.map((sess, i) => (
          <View key={i} style={s.row}>
            <Av initials={sess.avatar} size={44} color={sess.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{sess.student}</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{sess.topic}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><Clock size={12} color={MC.tealP} /><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 11 }}>{sess.time} · {sess.duration} min</Text></View>
              </View>
            </View>
            <Pressable onPress={() => alert('AI prep notes will open here')} style={s.aiBtn}><Sparkles size={12} color="#FCD34D" /><Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 11 }}>AI Prep</Text></Pressable>
            <Pressable onPress={() => Linking.openURL('https://meet.google.com/new')} style={s.joinBtn}><Video size={13} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Join</Text></Pressable>
          </View>
        ))}

        {tab === 'upcoming' && upcoming.map((u, i) => (
          <View key={i} style={s.row}>
            <Av initials={u.student.avatar} size={44} color={u.student.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{u.student.name}</Text>
              <Text style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{u.topic}</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <CalIcon size={12} color={MC.dim} />
                <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{u.date} · {u.time}</Text>
              </View>
            </View>
            <Countdown days={u.daysAway} />
            <Pressable onPress={() => { setReschedulingSession(u); setSelectedTime(u.time); }} style={s.outlineBtn}>
              <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Reschedule</Text>
            </Pressable>
          </View>
        ))}

        {tab === 'past' && past.map((p, i) => (
          <View key={i} style={s.row}>
            <Av initials={p.student.avatar} size={44} color={p.student.color} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>{p.student.name}</Text>
              <Text numberOfLines={2} style={{ color: MC.muted, fontFamily: FONTS.med, fontSize: 12, marginTop: 2 }}>{p.notes}</Text>
              <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11, marginTop: 4 }}>{p.date}</Text>
            </View>
            <Badge label="Completed" color="blue" />
          </View>
        ))}

        {tab === 'past' && past.length === 0 && <Text style={{ color: MC.muted, fontFamily: FONTS.med, padding: 20, textAlign: 'center' }}>No past sessions yet.</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tabsRow: { flexDirection: 'row', gap: 6, borderBottomWidth: 1, borderBottomColor: MC.border, marginBottom: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', ...({ cursor: 'pointer' } as any) },
  tabOn: { borderBottomColor: MC.tealP },
  tabCount: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 32, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.30)' },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: MC.tealP },
  outlineBtn: { paddingHorizontal: 12, height: 32, borderRadius: 8, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  
  // Calendar-specific styles
  calendarContainer: { gap: 16, width: '100%' },
  calHeader: { gap: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', ...({ cursor: 'pointer' } as any) },
  calTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 20, letterSpacing: -0.4, marginTop: 4 },
  calSub: { color: MC.muted, fontFamily: FONTS.med, fontSize: 13 },
  calCard: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 16, padding: 18 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navArrow: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  monthLabel: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekDayName: { color: MC.dim, fontFamily: FONTS.bold, fontSize: 12, width: 40, textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1.1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginVertical: 2, ...({ cursor: 'pointer' } as any) },
  dayCellEmpty: { width: `${100 / 7}%`, aspectRatio: 1.1 },
  dayCellToday: { backgroundColor: MC.tealP },
  dayCellHovered: { backgroundColor: 'rgba(20,184,166,0.15)' },
  dayText: { color: '#fff', fontFamily: FONTS.med, fontSize: 13 },
  
  // Time selector styles
  timeSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: MC.border, paddingTop: 16 },
  timeSectionTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, marginBottom: 10 },
  timePresetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePresetChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: MC.border },
  timePresetChipActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  timePresetText: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12 },
  customTimeInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, borderRadius: 8, height: 36, color: '#fff', fontFamily: FONTS.med, fontSize: 13, borderWidth: 1, borderColor: MC.border },

  // Custom glassmorphic overlay popup styles
  overlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: MC.cardSolid || '#131935',
    borderColor: MC.border2,
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 17 },
  modalBody: { color: MC.muted, fontFamily: FONTS.med, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  modalActions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 6 },
  modalCancelBtn: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: MC.border, alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
  modalConfirmBtn: { flex: 1, height: 38, borderRadius: 10, backgroundColor: MC.tealP, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...({ cursor: 'pointer' } as any) },
});
