/**
 * Mentor Portal — Create Event view: event form + AI generator + my events list.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, useWindowDimensions, Platform, ScrollView } from 'react-native';
import { Sparkles, Plus, Calendar as CalIcon, Users as UsersIcon, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import { MC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { MY_EVENTS } from '../data';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CreateEventView() {
  const { width } = useWindowDimensions();
  const stack = width < 980;

  const [title, setTitle]   = useState('');
  const [date,  setDate]    = useState('');
  const [time,  setTime]    = useState('');
  const [seats, setSeats]   = useState('30');
  const [price, setPrice]   = useState('');
  const [desc,  setDesc]    = useState('');
  const [aiBusy, setAiBusy] = useState(false);

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

  const aiGenerate = () => {
    setAiBusy(true);
    setTimeout(() => {
      setTitle('System Design Live: Building Notifications at Scale');
      setDesc('A 90-minute live deep dive into the architectural patterns behind a fan-out notification system. Q&A + whiteboard + real outage stories.');
      setSeats('40');
      setAiBusy(false);
    }, 800);
  };

  const create = () => {
    if (!title) { alert('Add a title first'); return; }
    alert('Event created (mock). It would be saved to /api/catalog/events.');
    setTitle(''); setDate(''); setTime(''); setSeats('30'); setPrice(''); setDesc('');
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

  const years = Array.from({ length: 16 }, (_, i) => 2020 + i); // 2020 to 2035

  return (
    <View style={{ flexDirection: stack ? 'column' : 'row', gap: 16 }}>
      {/* Form */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.cardTitle}>New Event</Text>
            <Pressable onPress={aiGenerate} style={s.aiCta}>
              <Sparkles size={13} color="#FCD34D" />
              <Text style={{ color: '#FCD34D', fontFamily: FONTS.bold, fontSize: 12 }}>{aiBusy ? 'Generating…' : 'AI Suggest'}</Text>
            </Pressable>
          </View>

          <Field label="Event Title" value={title} onChangeText={setTitle} placeholder="e.g. AMA: Career in Big Tech" />
          
          <View style={{ flexDirection: 'row', gap: 10, zIndex: 10 }}>
            {/* Interactive Date Field with Calendar Picker */}
            <View style={{ flex: 1, position: 'relative' }}>
              <View style={{ marginTop: 12 }}>
                <Text style={s.label}>Date</Text>
                <View style={s.inputBoxWithIcon}>
                  <TextInput
                    placeholderTextColor={MC.dim}
                    value={date}
                    onChangeText={setDate}
                    placeholder="May 30, 2026"
                    style={[s.input, { flex: 1 }]}
                  />
                  <Pressable onPress={() => { setShowCalendar(!showCalendar); setShowTimePicker(false); }} style={s.calIconBtn}>
                    <CalIcon size={16} color={MC.tealP} />
                  </Pressable>
                </View>
              </View>

              {/* Calendar Popover */}
              {showCalendar && (
                <View style={s.calPopover}>
                  {/* Header */}
                  <View style={s.calPopHeader}>
                    <Pressable onPress={handlePrevMonth} style={s.calNavBtn}>
                      <ChevronLeft size={16} color="#fff" />
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative' }}>
                      <Text style={s.calMonthLabel}>{MONTH_NAMES[calMonth]}</Text>
                      
                      {/* Year Dropdown trigger */}
                      <Pressable
                        onPress={() => setShowYearDropdown(!showYearDropdown)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                      >
                        <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{calYear}</Text>
                        <ChevronDown size={12} color={MC.tealP} />
                      </Pressable>

                      {/* Year Dropdown Options */}
                      {showYearDropdown && (
                        <View style={s.yearDropdown}>
                          <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                            {years.map((y) => (
                              <Pressable
                                key={y}
                                onPress={() => {
                                  setCalYear(y);
                                  setShowYearDropdown(false);
                                }}
                                style={({ hovered }: any) => [
                                  s.yearDropdownItem,
                                  y === calYear && s.yearDropdownItemActive,
                                  hovered && { backgroundColor: 'rgba(20,184,166,0.15)' }
                                ]}
                              >
                                <Text style={[s.yearDropdownText, y === calYear && { color: MC.tealP, fontFamily: FONTS.bold }]}>{y}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    <Pressable onPress={handleNextMonth} style={s.calNavBtn}>
                      <ChevronRight size={16} color="#fff" />
                    </Pressable>
                  </View>

                  {/* Weekdays */}
                  <View style={s.calWeekdays}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, idx) => (
                      <Text key={idx} style={s.calWeekdayText}>{w}</Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={s.calDaysGrid}>
                    {calendarCells.map((day, idx) => {
                      if (day === null) {
                        return <View key={`empty-${idx}`} style={s.calDayEmpty} />;
                      }
                      const isToday = day === 26 && calMonth === 4 && calYear === 2026;
                      const formattedDate = `${MONTH_NAMES[calMonth]} ${day}, ${calYear}`;
                      const isSelected = date === formattedDate;

                      return (
                        <Pressable
                          key={`day-${day}`}
                          onPress={() => handleDaySelect(day)}
                          style={({ hovered }: any) => [
                            s.calDayCell,
                            isToday && s.calDayToday,
                            isSelected && s.calDaySelected,
                            hovered && { backgroundColor: 'rgba(20,184,166,0.15)' }
                          ]}
                        >
                          <Text style={[
                            s.calDayText,
                            isToday && { color: MC.bg, fontFamily: FONTS.bold },
                            isSelected && { color: MC.bg, fontFamily: FONTS.bold }
                          ]}>
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Interactive Time Field with Time Picker */}
            <View style={{ flex: 1, position: 'relative' }}>
              <View style={{ marginTop: 12 }}>
                <Text style={s.label}>Time</Text>
                <View style={s.inputBoxWithIcon}>
                  <TextInput
                    placeholderTextColor={MC.dim}
                    value={time}
                    onChangeText={setTime}
                    placeholder="19:00"
                    style={[s.input, { flex: 1 }]}
                  />
                  <Pressable onPress={() => { setShowTimePicker(!showTimePicker); setShowCalendar(false); }} style={s.calIconBtn}>
                    <Clock size={16} color={MC.tealP} />
                  </Pressable>
                </View>
              </View>

              {/* Time Picker Popover */}
              {showTimePicker && (
                <View style={[s.calPopover, { width: '100%', minWidth: 180, top: 76 }]}>
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginBottom: 8, textAlign: 'center' }}>Select Time Slot</Text>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                    {timePresets.map((t) => (
                      <Pressable
                        key={t}
                        onPress={() => {
                          setTime(t);
                          setShowTimePicker(false);
                        }}
                        style={({ hovered }: any) => [
                          s.yearDropdownItem,
                          time === t && s.yearDropdownItemActive,
                          hovered && { backgroundColor: 'rgba(20,184,166,0.15)' }
                        ]}
                      >
                        <Text style={[s.yearDropdownText, time === t && { color: MC.tealP, fontFamily: FONTS.bold }, { textAlign: 'center' }]}>{t}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label="Capacity" value={seats} onChangeText={setSeats} keyboardType="numeric" placeholder="30" /></View>
            <View style={{ flex: 1 }}><Field label="Price (₹) — leave blank for free" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" /></View>
          </View>
          <Field label="Description" value={desc} onChangeText={setDesc} multiline placeholder="Tell students what they will get out of it…" />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <Pressable onPress={create} style={s.primaryCta}><Plus size={14} color={MC.bg} /><Text style={{ color: MC.bg, fontFamily: FONTS.xbold, fontSize: 12 }}>Publish Event</Text></Pressable>
            <Pressable onPress={() => alert('Saved as draft')} style={s.outlineCta}><Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 12 }}>Save Draft</Text></Pressable>
          </View>
        </View>
      </View>

      {/* Right column: my events */}
      <View style={{ width: stack ? '100%' : 320, gap: 12 }}>
        <View style={s.card}>
          <Text style={s.cardTitle}>My Upcoming Events</Text>
          {MY_EVENTS.map((e) => {
            const pct = Math.round((e.registered / e.seats) * 100);
            return (
              <View key={e.id} style={s.evRow}>
                <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>{e.title}</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <CalIcon size={11} color={MC.dim} />
                  <Text style={{ color: MC.dim, fontFamily: FONTS.med, fontSize: 11 }}>{e.date} · {e.time}</Text>
                  <Badge label={e.type === 'paid' ? `₹${e.price}` : 'Free'} color={e.type === 'paid' ? 'green' : 'teal'} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <UsersIcon size={11} color={MC.muted} />
                  <Text style={{ color: MC.muted, fontFamily: FONTS.bold, fontSize: 11 }}>{e.registered} / {e.seats} registered</Text>
                </View>
                <View style={s.barTrack}><View style={[s.barFill, { width: `${pct}%` as any }]} /></View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function Field({ label, ...rest }: any) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputBox, rest.multiline && { minHeight: 80 }]}>
        <TextInput placeholderTextColor={MC.dim} {...rest} style={s.input} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: MC.card, borderColor: MC.border, borderWidth: 1, borderRadius: 14, padding: 18 },
  cardTitle: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 14, marginBottom: 4 },
  label: { color: MC.muted, fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.4, marginBottom: 5 },
  inputBox: { backgroundColor: MC.bg2, borderColor: MC.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  input: { color: '#fff', fontFamily: FONTS.med, fontSize: 13.5, paddingVertical: 8, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}) },
  primaryCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 38, borderRadius: 10, backgroundColor: MC.tealP, marginTop: 6 },
  outlineCta: { paddingHorizontal: 16, height: 38, borderRadius: 10, borderWidth: 1, borderColor: MC.border2, backgroundColor: 'rgba(20,184,166,0.07)', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  aiCta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 8, backgroundColor: 'rgba(252,211,77,0.10)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.30)' },
  evRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: MC.border },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', backgroundColor: MC.tealP, borderRadius: 2 },
  
  // Custom interactive date picker styles
  inputBoxWithIcon: {
    backgroundColor: MC.bg2,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  calIconBtn: {
    padding: 8,
    marginRight: -4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    ...({ cursor: 'pointer' } as any)
  },
  calPopover: {
    position: 'absolute',
    top: 76,
    left: 0,
    width: 280,
    backgroundColor: '#0F172A', // Opaque dark slate background for premium contrast and zero transparency
    borderColor: MC.border2 || 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  calPopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 10001,
  },
  calNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  calMonthLabel: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  yearDropdown: {
    position: 'absolute',
    top: 28,
    left: 45,
    width: 90,
    maxHeight: 150,
    backgroundColor: '#1E293B', // Opaque background
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 10002,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  yearDropdownItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    ...({ cursor: 'pointer' } as any)
  },
  yearDropdownItemActive: {
    backgroundColor: 'rgba(20,184,166,0.1)',
  },
  yearDropdownText: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 12,
  },
  calWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  calWeekdayText: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10,
    width: 32,
    textAlign: 'center',
  },
  calDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginVertical: 1,
    ...({ cursor: 'pointer' } as any)
  },
  calDayEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
  },
  calDayToday: {
    borderWidth: 1,
    borderColor: MC.tealP,
  },
  calDaySelected: {
    backgroundColor: MC.tealP,
  },
  calDayText: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 11,
  },
});

