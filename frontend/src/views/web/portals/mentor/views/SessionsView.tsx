/**
 * Mentor Portal — Sessions Redesign
 * Multi-tab system: Upcoming | Past Sessions | Availability
 * Full high-fidelity mock implementations matching the reference screens.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { api } from '@/src/models/services/api';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { 
  Calendar as CalIcon, 
  Clock, 
  Sparkles, 
  Video, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  History, 
  Settings, 
  Grid, 
  List, 
  CheckCircle2, 
  ExternalLink,
  Phone,
  Monitor,
  Code
} from 'lucide-react-native';

function LinkedinGlyph({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Text style={{
      color, fontSize: Math.round(size * 0.8),
      fontFamily: FONTS.xbold,
      fontWeight: '800' as any, letterSpacing: -0.5,
    }}>in</Text>
  );
}
import { MC, FONTS } from '../tokens';
import { Av, Badge, Countdown } from '../atoms';
import { STUDENTS as INITIAL_STUDENTS } from '../data';

type TabId = 'upcoming' | 'past' | 'availability';

type AvailabilitySlot = {
  day?: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
  dateStr?: string; // '2026-05-05'
  time: string; // '09:00', '09:30', '10:00', etc.
  status: 'available' | 'booked' | 'unavailable';
  bookedBy?: string;
};

const DEFAULT_AVAILABILITY: AvailabilitySlot[] = [
  // Monday
  { day: 'Mon', time: '09:00', status: 'unavailable' },
  { day: 'Mon', time: '09:30', status: 'unavailable' },
  { day: 'Mon', time: '10:00', status: 'booked', bookedBy: 'Arjun' },
  { day: 'Mon', time: '10:30', status: 'available' },
  { day: 'Mon', time: '11:00', status: 'unavailable' },
  { day: 'Mon', time: '11:30', status: 'unavailable' },
  { day: 'Mon', time: '12:00', status: 'unavailable' },
  { day: 'Mon', time: '12:30', status: 'unavailable' },
  { day: 'Mon', time: '13:00', status: 'unavailable' },
  { day: 'Mon', time: '13:30', status: 'unavailable' },
  { day: 'Mon', time: '14:00', status: 'booked', bookedBy: 'Meera' },
  { day: 'Mon', time: '14:30', status: 'unavailable' },
  
  // Tuesday
  { day: 'Tue', time: '09:00', status: 'unavailable' },
  { day: 'Tue', time: '09:30', status: 'unavailable' },
  { day: 'Tue', time: '10:00', status: 'unavailable' },
  { day: 'Tue', time: '10:30', status: 'unavailable' },
  { day: 'Tue', time: '11:00', status: 'available' },
  { day: 'Tue', time: '11:30', status: 'available' },
  { day: 'Tue', time: '12:00', status: 'unavailable' },
  { day: 'Tue', time: '12:30', status: 'unavailable' },
  { day: 'Tue', time: '13:00', status: 'unavailable' },
  { day: 'Tue', time: '13:30', status: 'unavailable' },
  
  // Wednesday
  { day: 'Wed', time: '09:00', status: 'unavailable' },
  { day: 'Wed', time: '09:30', status: 'unavailable' },
  { day: 'Wed', time: '10:00', status: 'unavailable' },
  { day: 'Wed', time: '10:30', status: 'unavailable' },
  { day: 'Wed', time: '11:00', status: 'unavailable' },
  { day: 'Wed', time: '11:30', status: 'unavailable' },
  { day: 'Wed', time: '12:00', status: 'unavailable' },
  { day: 'Wed', time: '12:30', status: 'available' },
  { day: 'Wed', time: '13:00', status: 'unavailable' },
  { day: 'Wed', time: '13:30', status: 'unavailable' },
  
  // Thursday
  { day: 'Thu', time: '09:00', status: 'unavailable' },
  { day: 'Thu', time: '09:30', status: 'unavailable' },
  { day: 'Thu', time: '10:00', status: 'available' },
  { day: 'Thu', time: '10:30', status: 'unavailable' },
  { day: 'Thu', time: '11:00', status: 'unavailable' },
  { day: 'Thu', time: '11:30', status: 'unavailable' },
  { day: 'Thu', time: '12:00', status: 'unavailable' },
  { day: 'Thu', time: '12:30', status: 'unavailable' },
  { day: 'Thu', time: '13:00', status: 'unavailable' },
  { day: 'Thu', time: '13:30', status: 'unavailable' },

  // Friday
  { day: 'Fri', time: '09:00', status: 'unavailable' },
  { day: 'Fri', time: '09:30', status: 'unavailable' },
  { day: 'Fri', time: '10:00', status: 'unavailable' },
  { day: 'Fri', time: '10:30', status: 'unavailable' },
  { day: 'Fri', time: '11:00', status: 'unavailable' },
  { day: 'Fri', time: '11:30', status: 'unavailable' },
  { day: 'Fri', time: '12:00', status: 'available' },
  { day: 'Fri', time: '12:30', status: 'available' },
  { day: 'Fri', time: '13:00', status: 'unavailable' },
  { day: 'Fri', time: '13:30', status: 'unavailable' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function SessionsView() {
  const [tab, setTab] = useState<TabId>('upcoming');
  const user = useAuthStore((s) => s.user);
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [connPage, setConnPage] = useState(1);
  const [connPages, setConnPages] = useState(1);

  const loadData = async (p: number = 1) => {
    try {
      setLoading(true);
      const email = user?.email;
      const connRes = await api.mentorConnections(email, p, 24);
      const conns = (connRes?.items || []).filter(
        (item: any) =>
          item.status !== 'none' &&
          item.status !== 'withdrawn' &&
          item.status !== 'declined' &&
          item.status !== 'rejected'
      );
      const sMap: Record<string, any> = {};
      conns.forEach((c: any) => {
        sMap[c.id] = c;
      });
      setStudentsMap(sMap);
      setStudents(conns.length > 0 ? conns : INITIAL_STUDENTS);
      setConnPage(p);
      setConnPages(connRes.pages || 1);

      const bookRes = await api.myBookings().catch(() => ({ bookings: [] }));
      setBookingsList(bookRes.bookings || []);
    } catch (e) {
      console.warn('Failed to load sessions data from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [user]);

  // Availability specific states
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(DEFAULT_AVAILABILITY);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'columns'>('columns');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => new Date(2026, 4, 5));

  // Set Availability Form States
  const [formCalYear, setFormCalYear] = useState(2026);
  const [formCalMonth, setFormCalMonth] = useState(4); // May
  const [formSelectedDate, setFormSelectedDate] = useState<Date | null>(new Date(2026, 4, 5));
  const [timeMode, setTimeMode] = useState<'single' | 'range'>('single');
  const [formSingleTime, setFormSingleTime] = useState('09:30');
  const [formRangeStart, setFormRangeStart] = useState('09:00');
  const [formRangeEnd, setFormRangeEnd] = useState('17:00');
  const [formStatus, setFormStatus] = useState<'available' | 'unavailable'>('available');
  const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);

  // Rescheduling states
  const [reschedulingSession, setReschedulingSession] = useState<any | null>(null);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4); // Default to May
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  // AI summary simulation states
  const [aiSummaryStates, setAiSummaryStates] = useState<Record<number, { text: string; loading: boolean }>>({});

  const handleFormPrevMonth = () => {
    if (formCalMonth === 0) {
      setFormCalMonth(11);
      setFormCalYear((y) => y - 1);
    } else {
      setFormCalMonth((m) => m - 1);
    }
  };

  const handleFormNextMonth = () => {
    if (formCalMonth === 11) {
      setFormCalMonth(0);
      setFormCalYear((y) => y + 1);
    } else {
      setFormCalMonth((m) => m + 1);
    }
  };

  const handleFormDaySelect = (day: number) => {
    const selected = new Date(formCalYear, formCalMonth, day);
    setFormSelectedDate(selected);
    const monday = getMonday(selected);
    setCurrentWeekStart(monday);
  };

  const handleApplyFormAvailability = () => {
    if (!formSelectedDate) return;
    
    const dateStr = formatLocalDate(formSelectedDate);
    const dayCode = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][formSelectedDate.getDay() === 0 ? 6 : formSelectedDate.getDay() - 1] || 'Mon';
    
    if (timeMode === 'single') {
      setAvailabilitySlots((prev) => {
        const filtered = prev.filter((s) => !(s.dateStr === dateStr && s.time === formSingleTime));
        return [
          ...filtered,
          {
            dateStr,
            day: dayCode,
            time: formSingleTime,
            status: formStatus,
          }
        ];
      });
      setFormSuccessMsg(`Set ${formSingleTime} as ${formStatus} on ${formSelectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}.`);
    } else {
      const startParts = formRangeStart.split(':').map(Number);
      const endParts = formRangeEnd.split(':').map(Number);
      
      if (isNaN(startParts[0]) || isNaN(endParts[0])) {
        alert("Please enter valid start and end times (format HH:MM).");
        return;
      }
      
      let currentMin = startParts[0] * 60 + (startParts[1] || 0);
      const endMin = endParts[0] * 60 + (endParts[1] || 0);
      
      const newSlots: AvailabilitySlot[] = [];
      while (currentMin < endMin) {
        const hh = Math.floor(currentMin / 60).toString().padStart(2, '0');
        const mm = (currentMin % 60).toString().padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        
        newSlots.push({
          dateStr,
          day: dayCode,
          time: timeStr,
          status: formStatus,
        });
        currentMin += 30;
      }
      
      if (newSlots.length === 0) {
        alert("End time must be after start time.");
        return;
      }
      
      setAvailabilitySlots((prev) => {
        const timesToAdd = newSlots.map((ns) => ns.time);
        const filtered = prev.filter((s) => !(s.dateStr === dateStr && timesToAdd.includes(s.time)));
        return [...filtered, ...newSlots];
      });
      
      setFormSuccessMsg(`Set slots from ${formRangeStart} to ${formRangeEnd} as ${formStatus} on ${formSelectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}.`);
    }
    
    setTimeout(() => {
      setFormSuccessMsg(null);
    }, 3000);
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const toggleSlotForDate = (dateStr: string, dayCode: string, time: string) => {
    setAvailabilitySlots((prev) => {
      const exists = prev.some((s) => s.dateStr === dateStr && s.time === time);
      if (exists) {
        return prev.map((s) => {
          if (s.dateStr === dateStr && s.time === time) {
            if (s.status === 'booked') return s;
            return {
              ...s,
              status: s.status === 'available' ? 'unavailable' : 'available',
            };
          }
          return s;
        });
      } else {
        const weeklySlot = prev.find((s) => s.day === dayCode && s.time === time && !s.dateStr);
        const currentStatus = weeklySlot ? weeklySlot.status : 'unavailable';
        const newStatus = currentStatus === 'available' ? 'unavailable' : 'available';
        return [
          ...prev,
          {
            dateStr,
            day: dayCode,
            time,
            status: newStatus,
          },
        ];
      }
    });
  };

  const currentWeekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(currentWeekStart.getDate() + 4);
    return end;
  }, [currentWeekStart]);

  const weekRangeTitle = useMemo(() => {
    const startMonth = currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
    const startDay = currentWeekStart.getDate();
    const endMonth = currentWeekEnd.toLocaleDateString('en-US', { month: 'short' });
    const endDay = currentWeekEnd.getDate();
    const year = currentWeekEnd.getFullYear();
    
    if (startMonth === endMonth) {
      return `Week of ${startMonth} ${startDay}–${endDay}, ${year}`;
    } else {
      return `Week of ${startMonth} ${startDay}–${endMonth} ${endDay}, ${year}`;
    }
  }, [currentWeekStart, currentWeekEnd]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentWeekStart]);

  const formCalendarCells = useMemo(() => {
    const daysInMonth = new Date(formCalYear, formCalMonth + 1, 0).getDate();
    const firstDayIndex = (new Date(formCalYear, formCalMonth, 1).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [formCalYear, formCalMonth]);

  const getDayHeaderStr = (d: Date) => {
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${weekday} ${month} ${day}`;
  };

  const TIME_PRESETS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const now = useMemo(() => new Date(), [tab, bookingsList]);

  const upcoming = useMemo(() => {
    // 1. Get upcoming bookings from the bookingsList
    const bookingsUpcoming = bookingsList
      .filter((b) => {
        const schedDate = new Date(b.scheduled_at || b.slot_start_iso);
        return schedDate > now && b.status !== 'cancelled' && b.status !== 'completed';
      })
      .map((b) => {
        const studentProfile = studentsMap[b.student_id] || {
          id: b.student_id,
          name: b.student_name || 'Student',
          avatar: (b.student_name || 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          color: '#14B8A6',
          branch: 'Student',
          college: 'University',
          tags: ['1:1 Session'],
        };
        const schedDate = new Date(b.scheduled_at || b.slot_start_iso);
        const startOfSchedDate = new Date(schedDate.getFullYear(), schedDate.getMonth(), schedDate.getDate());
        const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const diffDays = Math.round((startOfSchedDate.getTime() - startOfNow.getTime()) / (1000 * 60 * 60 * 24));
        const daysAway = Math.max(0, diffDays);
        
        const timeFormatted = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateFormatted = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        
        return {
          id: b.id,
          date: dateFormatted,
          time: timeFormatted,
          topic: b.topic || 'Mentorship Session',
          daysAway,
          student: studentProfile,
          _rawDate: schedDate,
        };
      });

    // 2. Identify students from connections who have a nextSession but no upcoming booking in bookingsUpcoming
    const bookedStudentIds = new Set(bookingsUpcoming.map((b) => String(b.student.id)));
    const fallbackUpcoming = students
      .filter((s) => s.nextSession && !bookedStudentIds.has(String(s.id)))
      .map((s) => {
        let parsedDate: Date;
        try {
          parsedDate = new Date(`${s.nextSession.date} ${s.nextSession.time}`);
        } catch {
          parsedDate = new Date();
        }
        return {
          id: `fallback-${s.id}`,
          date: s.nextSession.date,
          time: s.nextSession.time,
          topic: s.nextSession.topic || 'Mentorship Session',
          daysAway: s.nextSession.daysAway,
          student: s,
          _rawDate: parsedDate,
        };
      });

    // 3. Combine and sort
    const allUpcoming = [...bookingsUpcoming, ...fallbackUpcoming];
    allUpcoming.sort((a, b) => {
      const timeA = a._rawDate instanceof Date && !isNaN(a._rawDate.getTime()) ? a._rawDate.getTime() : 0;
      const timeB = b._rawDate instanceof Date && !isNaN(b._rawDate.getTime()) ? b._rawDate.getTime() : 0;
      return timeA - timeB;
    });

    return allUpcoming;
  }, [bookingsList, students, studentsMap, now]);

  const past = useMemo(() => {
    if (bookingsList.length === 0) {
      return [
        {
          student: students[2] || INITIAL_STUDENTS[2],
          date: 'Apr 29, 2026',
          notes: 'Reviewed investor deck v3. Strong traction slide. Needs sharper problem framing on slide 2.',
          sessionsCount: 6,
          score: '7/10',
          feedback: 'Good session. Consider adding specific next-step action items.'
        },
        {
          student: students[1] || INITIAL_STUDENTS[1],
          date: 'Apr 28, 2026',
          notes: 'Discussed research statement. Very well-articulated motivation. Target top ML conferences.',
          sessionsCount: 2,
          score: '6/10',
          feedback: 'Add more detail to session notes to track student progress better.'
        },
        {
          student: students[0] || INITIAL_STUDENTS[0],
          date: 'Apr 22, 2026',
          notes: 'Covered LLD patterns. Good progress on OOP. Needs more concurrency practice.',
          sessionsCount: 3,
          score: '8/10',
          feedback: 'Great progress. Encourage student to write multi-threaded code tests.'
        }
      ];
    }
    return bookingsList
      .filter((b) => {
        const schedDate = new Date(b.scheduled_at || b.slot_start_iso);
        return schedDate <= now || b.status === 'completed';
      })
      .map((b) => {
        const studentProfile = studentsMap[b.student_id] || {
          id: b.student_id,
          name: b.student_name || 'Student',
          avatar: (b.student_name || 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          color: '#14B8A6',
          branch: 'Student',
          college: 'University',
          tags: ['1:1 Session'],
        };
        const schedDate = new Date(b.scheduled_at || b.slot_start_iso);
        const dateFormatted = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        
        return {
          id: b.id,
          student: studentProfile,
          date: dateFormatted,
          notes: b.notes || b.topic || 'Mentorship session completed.',
          sessionsCount: studentProfile.sessionsCompleted || 1,
          score: b.evaluation_score || '8/10',
          feedback: b.evaluation_feedback || 'Great session. Keep up the good work.',
          _rawDate: schedDate,
        };
      })
      .sort((a, b) => (isNaN(b._rawDate.getTime()) ? 0 : b._rawDate.getTime()) - (isNaN(a._rawDate.getTime()) ? 0 : a._rawDate.getTime()));
  }, [bookingsList, students, studentsMap, now]);

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
    const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calMonth];
    const formatted = `${monthName} ${day}, ${calYear}`;
    setPendingDate(formatted);
  };

  const confirmReschedule = async () => {
    if (!reschedulingSession || !pendingDate) return;
    
    setLoading(true);
    try {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const parts = pendingDate.replace(',', '').split(' ');
      const monthName = parts[0];
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      const monthIdx = monthNames.indexOf(monthName);
      const month = monthIdx !== -1 ? monthIdx : 4;
      
      const timeParts = selectedTime.split(' ');
      const hm = timeParts[0].split(':');
      let hours = parseInt(hm[0], 10);
      const minutes = parseInt(hm[1], 10);
      const ampm = timeParts[1];
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const d = new Date(year, month, day, hours, minutes, 0);
      const slot_start_iso = d.toISOString();

      if (reschedulingSession.id.startsWith('fallback-')) {
        await api.createMentorBooking({
          student_id: reschedulingSession.student.id,
          slot_start_iso,
          topic: reschedulingSession.topic,
          notes: 'Rescheduled fallback session'
        });
      } else {
        await api.rescheduleBooking(reschedulingSession.id, slot_start_iso);
      }
      await loadData();
    } catch (e: any) {
      console.error(e);
      alert('Could not reschedule: ' + (e.message || 'Error occurred'));
    } finally {
      setLoading(false);
    }

    setPendingDate(null);
    setReschedulingSession(null);
    setTab('upcoming');
  };

  const triggerAISummary = (idx: number, notes: string) => {
    if (aiSummaryStates[idx]) return;
    setAiSummaryStates((prev) => ({ ...prev, [idx]: { text: '', loading: true } }));
    
    setTimeout(() => {
      setAiSummaryStates((prev) => ({
        ...prev,
        [idx]: {
          text: `✨ AI Notes Digest: The student demonstrates high structural logic. Focus area for next session is optimization of performance parameters. Key milestones: draft submission before June.`,
          loading: false
        }
      }));
    }, 1200);
  };

  // Toggle availability slot state (Legacy refactored to date-aware helper)
  const toggleSlot = (day: string, time: string) => {
    // Falls back to toggling recurring slots or active week
    const dateStr = weekDays.find((d) => DAYS_OF_WEEK[d.getDay()] === day)?.toISOString()?.split('T')?.[0] || '2026-05-05';
    toggleSlotForDate(dateStr, day, time);
  };

  const saveAvailabilitySlots = () => {
    setSavingAvailability(true);
    setTimeout(() => {
      setSavingAvailability(false);
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
  };

  const openRescheduleView = (u: any) => {
    setReschedulingSession(u);
    setSelectedTime(u.time);
  };

  // Generate calendar days for rescheduling
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Monday = 0
  const calendarCells = [];
  
  for (let i = 0; i < firstDayIndex; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const mergedAvailabilitySlots = useMemo(() => {
    let slots = [...availabilitySlots];
    upcoming.forEach((u) => {
      if (!u._rawDate || isNaN(u._rawDate.getTime())) return;
      const d = u._rawDate;
      const localYear = d.getFullYear();
      const localMonth = String(d.getMonth() + 1).padStart(2, '0');
      const localDay = String(d.getDate()).padStart(2, '0');
      const dateStr = `${localYear}-${localMonth}-${localDay}`;
      
      const localHours = String(d.getHours()).padStart(2, '0');
      const localMinutes = String(d.getMinutes()).padStart(2, '0');
      const timeStr = `${localHours}:${localMinutes}`;
      const dayCode = DAYS_OF_WEEK[d.getDay()];
      
      // Check if there is an existing slot on this exact date and time.
      const existingIndex = slots.findIndex(
        (s) => s.dateStr === dateStr && s.time === timeStr
      );
      
      if (existingIndex > -1) {
        slots[existingIndex] = {
          ...slots[existingIndex],
          status: 'booked',
          bookedBy: u.student.name,
        };
      } else {
        slots.push({
          dateStr,
          day: dayCode,
          time: timeStr,
          status: 'booked',
          bookedBy: u.student.name,
        });
      }
    });
    return slots;
  }, [availabilitySlots, upcoming]);

  // Availability counters
  const openSlotsCount = mergedAvailabilitySlots.filter((s) => s.status === 'available').length;
  const bookedSlotsCount = mergedAvailabilitySlots.filter((s) => s.status === 'booked').length;

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 60, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  // Custom rendering for rescheduling view
  if (reschedulingSession) {
    return (
      <View style={s.calendarContainer}>
        <View style={s.calHeader}>
          <Pressable onPress={() => setReschedulingSession(null)} style={s.backBtn}>
            <ArrowLeft size={16} color={MC.tealP} />
            <Text style={{ color: MC.tealP, fontFamily: FONTS.bold, fontSize: 13 }}>Back to Sessions</Text>
          </Pressable>
          <Text style={s.calTitle}>Reschedule Session</Text>
          <Text style={s.calSub}>
            Topic: <Text style={{ color: '#fff', fontFamily: FONTS.bold }}>"{reschedulingSession.topic}"</Text> with <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>{reschedulingSession.student.name}</Text>
          </Text>
        </View>

        <View style={s.calCard}>
          <View style={s.monthRow}>
            <Pressable onPress={handlePrevMonth} style={s.navArrow}>
              <ChevronLeft size={18} color="#fff" />
            </Pressable>
            <Text style={s.monthLabel}>{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calMonth]} {calYear}</Text>
            <Pressable onPress={handleNextMonth} style={s.navArrow}>
              <ChevronRight size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={s.weekDaysRow}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Text key={day} style={s.weekDayName}>{day}</Text>
            ))}
          </View>

          <View style={s.daysGrid}>
            {calendarCells.map((day, idx) => {
              if (day === null) return <View key={`empty-${idx}`} style={s.dayCellEmpty} />;
              const isToday = day === 25 && calMonth === 4 && calYear === 2026;
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
          </View>
        </View>

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
    <View style={s.container}>
      {/* Sessions View Header Summary */}
      <View style={s.headerBox}>
        <Text style={s.mainTitle}>Sessions</Text>
        <Text style={s.subTitle}>
          {upcoming.length} upcoming · {past.length} past
        </Text>
      </View>

      {/* Modern High Fidelity Tabs */}
      <View style={s.pillTabsRow}>
        <Pressable 
          onPress={() => setTab('upcoming')} 
          style={[s.pillTab, tab === 'upcoming' && s.pillTabOn]}
        >
          <CalIcon size={14} color={tab === 'upcoming' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.pillTabText, tab === 'upcoming' && s.pillTabTextOn]}>Upcoming</Text>
          {upcoming.length > 0 && (
            <View style={[s.pillCount, tab === 'upcoming' && s.pillCountOn]}>
              <Text style={[s.pillCountText, tab === 'upcoming' && s.pillCountTextOn]}>{upcoming.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable 
          onPress={() => setTab('past')} 
          style={[s.pillTab, tab === 'past' && s.pillTabOn]}
        >
          <History size={14} color={tab === 'past' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.pillTabText, tab === 'past' && s.pillTabTextOn]}>Past Sessions</Text>
          {past.length > 0 && (
            <View style={[s.pillCount, tab === 'past' && s.pillCountOn]}>
              <Text style={[s.pillCountText, tab === 'past' && s.pillCountTextOn]}>{past.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable 
          onPress={() => setTab('availability')} 
          style={[s.pillTab, tab === 'availability' && s.pillTabOn]}
        >
          <Settings size={14} color={tab === 'availability' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text style={[s.pillTabText, tab === 'availability' && s.pillTabTextOn]}>Availability</Text>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <View style={{ gap: 14 }}>
        
        {/* Tab 1: Upcoming Sessions Layout (Screenshot 1) */}
        {tab === 'upcoming' && upcoming.map((u, i) => {
          const mainTag = u.student.tags && u.student.tags[0] ? u.student.tags[0] : 'General';
          return (
            <View key={i} style={s.cardFrame}>
              {/* Profile Bar */}
              <View style={s.cardHeaderRow}>
                <Av initials={u.student.avatar} size={48} color={u.student.color} />
                <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.studentName}>{u.student.name}</Text>
                    <View style={s.remainingBadge}>
                      <Text style={s.remainingBadgeText}>
                        {u.daysAway === 0 ? 'Today' : `In ${u.daysAway}d`}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.studentSub}>{u.student.branch} - {u.student.college}</Text>
                </View>
                <View style={s.categoryTag}>
                  <Text style={s.categoryTagText}>{mainTag}</Text>
                </View>
              </View>

              {/* Date/Time Row */}
              <View style={s.dateTimeBox}>
                <CalIcon size={14} color={MC.tealP} style={{ marginRight: 6 }} />
                <Text style={s.dateTimeText}>{u.date}   •   {u.time}   •   30 min</Text>
              </View>

              {/* Topic Box */}
              <View style={s.topicWell}>
                <Text style={s.wellLabel}>SESSION TOPIC</Text>
                <Text style={s.wellTitle}>{u.topic}</Text>
              </View>

              {/* Action Bar */}
              <View style={s.actionBarRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={s.onlineDot} />
                  <Text style={s.actionLabel}>START SESSION VIA</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Pressable 
                    onPress={() => Linking.openURL('https://meet.google.com/new')} 
                    style={({ hovered }: any) => [s.actionBtn, hovered && s.actionBtnH]}
                  >
                    <Video size={13} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.actionBtnText}>Google Meet</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => Linking.openURL('https://zoom.us/start/webinar')} 
                    style={({ hovered }: any) => [s.actionBtn, hovered && s.actionBtnH]}
                  >
                    <Monitor size={13} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.actionBtnText}>Zoom</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => Linking.openURL('https://teams.microsoft.com')} 
                    style={({ hovered }: any) => [s.actionBtn, hovered && s.actionBtnH]}
                  >
                    <Phone size={13} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={s.actionBtnText}>Teams</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => openRescheduleView(u)} 
                    style={({ hovered }: any) => [s.reschedBtn, hovered && s.reschedBtnH]}
                  >
                    <Text style={s.reschedBtnText}>Reschedule</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        {/* Tab 2: Past Sessions Layout (Screenshot 2) */}
        {tab === 'past' && past.map((p, i) => {
          const aiDigest = aiSummaryStates[i];
          return (
            <View key={i} style={s.cardFrame}>
              {/* Profile Bar */}
              <View style={s.cardHeaderRow}>
                <Av initials={p.student.avatar} size={48} color={p.student.color} />
                <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.studentName}>{p.student.name}</Text>
                    <View style={s.countBadge}>
                      <Text style={s.countBadgeText}>{p.sessionsCount} sessions</Text>
                    </View>
                  </View>
                  <Text style={s.studentSub}>{p.student.branch} - {p.student.college}</Text>
                </View>
                
                {/* Socials / External links */}
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  {p.student.linkedin && (
                    <Pressable onPress={() => Linking.openURL(`https://${p.student.linkedin}`)} style={[s.socialIconCircle, { backgroundColor: '#0A66C2' }]}>
                      <LinkedinGlyph size={15} color="#fff" />
                    </Pressable>
                  )}
                  {p.student.github && (
                    <Pressable onPress={() => Linking.openURL(`https://${p.student.github}`)} style={[s.socialIconCircle, { backgroundColor: '#24292e' }]}>
                      <Code size={15} color="#fff" />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Date Row */}
              <View style={s.pastDateRow}>
                <Text style={s.pastDateText}>{p.date}</Text>
              </View>

              {/* Notes Box */}
              <View style={s.notesWell}>
                <Text style={s.wellLabel}>LAST SESSION NOTES</Text>
                <Text style={s.notesContent}>{p.notes}</Text>
              </View>

              {/* AI Summarize Button & Output */}
              <View style={{ marginTop: 10, gap: 8 }}>
                <Pressable 
                  onPress={() => triggerAISummary(i, p.notes)} 
                  disabled={aiDigest?.loading}
                  style={({ hovered }: any) => [s.aiPillBtn, hovered && { borderColor: '#5EEAD4' }]}
                >
                  <Sparkles size={12} color="#5EEAD4" style={{ marginRight: 6 }} />
                  <Text style={s.aiPillBtnText}>
                    {aiDigest?.loading ? 'Summarizing...' : 'AI Summarize Notes'}
                  </Text>
                </Pressable>

                {aiDigest && !aiDigest.loading && (
                  <View style={s.aiDigestBox}>
                    <Text style={s.aiDigestText}>{aiDigest.text}</Text>
                  </View>
                )}
              </View>

              {/* AI Session Evaluation & Score panel */}
              <View style={s.scoreWell}>
                <Text style={s.wellLabel}>AI SESSION SCORE</Text>
                <View style={s.scoreContainer}>
                  <View style={s.scoreBadge}>
                    <Text style={s.scoreBadgeText}>{p.score}</Text>
                  </View>
                  <Text style={s.scoreFeedbackText}>{p.feedback}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {(tab === 'upcoming' || tab === 'past') && connPages > 1 && (
          <View style={s.pagination}>
            <Pressable style={[s.pageBtn, connPage <= 1 && { opacity: 0.4 }]} onPress={() => connPage > 1 && loadData(connPage - 1)}>
              <Text style={s.pageBtnText}>Prev</Text>
            </Pressable>
            <Text style={s.pageInfo}>{connPage} / {connPages}</Text>
            <Pressable style={[s.pageBtn, connPage >= connPages && { opacity: 0.4 }]} onPress={() => connPage < connPages && loadData(connPage + 1)}>
              <Text style={s.pageBtnText}>Next</Text>
            </Pressable>
          </View>
        )}

        {/* Tab 3: Availability Calendar Layout (Screenshots 3 & 4) */}
        {tab === 'availability' && (
          <View style={s.availOuterContainer}>
            {/* Left Panel: Availability Calendar */}
            <View style={s.availLeftPanel}>
              <View style={s.availCard}>
                {/* Title / Info Header */}
                <View style={s.availHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.availTitle}>Availability Calendar</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <Pressable onPress={handlePrevWeek} style={s.navArrowSmall}>
                          <ChevronLeft size={14} color="#fff" />
                        </Pressable>
                        <Pressable onPress={handleNextWeek} style={s.navArrowSmall}>
                          <ChevronRight size={14} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={s.availSub}>
                      {weekRangeTitle}  •  <Text style={{ color: MC.tealP, fontFamily: FONTS.bold }}>{openSlotsCount} open slots</Text>  •  <Text style={{ color: MC.amber, fontFamily: FONTS.bold }}>{bookedSlotsCount} booked</Text>
                    </Text>
                  </View>

                  {/* Legend & Switcher */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <View style={s.legendRow}>
                      <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: '#14B8A6' }]} />
                        <Text style={s.legendText}>Available</Text>
                      </View>
                      <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={s.legendText}>Booked</Text>
                      </View>
                      <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: '#334155' }]} />
                        <Text style={s.legendText}>Unavailable</Text>
                      </View>
                    </View>

                    {/* View switcher toggle */}
                    <View style={s.switcherBox}>
                      <Pressable 
                        onPress={() => setLayoutMode('grid')}
                        style={[s.switchBtn, layoutMode === 'grid' && s.switchBtnOn]}
                      >
                        <Grid size={14} color={layoutMode === 'grid' ? '#090D16' : '#94A3B8'} />
                      </Pressable>
                      <Pressable 
                        onPress={() => setLayoutMode('columns')}
                        style={[s.switchBtn, layoutMode === 'columns' && s.switchBtnOn]}
                      >
                        <List size={14} color={layoutMode === 'columns' ? '#090D16' : '#94A3B8'} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Layout A: Calendar Grid View (Screenshot 3) */}
                {layoutMode === 'grid' && (
                  <View style={s.gridTableContainer}>
                    {/* Header row containing Days */}
                    <View style={s.gridHeaderRow}>
                      <View style={s.gridTimeColHeader} />
                      {weekDays.map((d, idx) => {
                        const dayHeader = getDayHeaderStr(d);
                        const dateStr = formatLocalDate(d);
                        const dayCode = DAYS_OF_WEEK[d.getDay()];
                        
                        const daySlots = TIME_PRESETS.map((time) => {
                          let slot = mergedAvailabilitySlots.find((s) => s.dateStr === dateStr && s.time === time);
                          if (!slot) {
                            slot = mergedAvailabilitySlots.find((s) => s.day === dayCode && s.time === time && !s.dateStr);
                          }
                          return slot;
                        });
                        const selectedInDay = daySlots.filter(s => s && s.status === 'available').length;
                        
                        return (
                          <View key={dayHeader} style={s.gridDayColHeader}>
                            <Text style={s.gridDayTitle}>{dayHeader.split(' ')[0]}</Text>
                            <Text style={s.gridDaySub}>{dayHeader.split(' ').slice(1).join(' ')}</Text>
                            <View style={s.gridDayPill}>
                              <Text style={s.gridDayPillText}>{selectedInDay} slots</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* Rows for each hour */}
                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((timeLabel) => (
                      <View key={timeLabel} style={s.gridHourRow}>
                        {/* Time Column */}
                        <View style={s.gridTimeColCell}>
                          <Text style={s.gridTimeText}>
                            {parseInt(timeLabel) === 12 ? '12:00 PM' : parseInt(timeLabel) > 12 ? `${parseInt(timeLabel) - 12}:00 PM` : `${timeLabel} AM`}
                          </Text>
                        </View>

                        {/* Day Columns */}
                        {weekDays.map((d, idx) => {
                          const dateStr = formatLocalDate(d);
                          const dayCode = DAYS_OF_WEEK[d.getDay()];
                          
                          let slot = mergedAvailabilitySlots.find((s) => s.dateStr === dateStr && s.time === timeLabel);
                          if (!slot) {
                            slot = mergedAvailabilitySlots.find((s) => s.day === dayCode && s.time === timeLabel && !s.dateStr);
                          }
                          
                          const isBooked = slot?.status === 'booked';
                          const isAvailable = slot?.status === 'available';
                          const name = slot?.bookedBy;

                          return (
                            <Pressable 
                              key={dayCode} 
                              onPress={() => toggleSlotForDate(dateStr, dayCode, slot?.time || `${timeLabel}`)}
                              disabled={isBooked}
                              style={({ hovered }: any) => [
                                s.gridDayColCell,
                                isBooked && s.gridCellBooked,
                                isAvailable && s.gridCellAvailable,
                                hovered && !isBooked && { backgroundColor: 'rgba(20, 184, 166, 0.15)' }
                              ]}
                            >
                              {isBooked ? (
                                <View style={s.bookedContainer}>
                                  <Text style={s.bookedName}>{name}</Text>
                                  <View style={s.bookedIndicatorDot} />
                                </View>
                              ) : isAvailable ? (
                                <View style={s.availableIndicatorDot} />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}

                {/* Layout B: Columns/List View (Screenshot 4) */}
                {layoutMode === 'columns' && (
                  <View style={s.columnsOuterRow}>
                    {weekDays.map((d, dIdx) => {
                      const dayHeader = getDayHeaderStr(d);
                      const dateStr = formatLocalDate(d);
                      const dayCode = DAYS_OF_WEEK[d.getDay()];
                      
                      const baseTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];
                      const customTimes = mergedAvailabilitySlots
                        .filter((s) => s.dateStr === dateStr || (s.day === dayCode && !s.dateStr))
                        .map((s) => s.time);
                      const allTimes = Array.from(new Set([...baseTimes, ...customTimes])).sort();
                      
                      const daySlots = allTimes.map((time) => {
                        let slot = mergedAvailabilitySlots.find((s) => s.dateStr === dateStr && s.time === time);
                        if (!slot) {
                          slot = mergedAvailabilitySlots.find((s) => s.day === dayCode && s.time === time && !s.dateStr);
                        }
                        return slot || { dateStr, day: dayCode, time, status: 'unavailable' as const };
                      });
                      
                      const activeSlotsCount = daySlots.filter((s) => s.status === 'available').length;
                      
                      return (
                        <View key={dayCode} style={s.columnContainer}>
                          <View style={s.columnDayHeader}>
                            <Text style={s.columnDayTitle}>{dayHeader.split(' ')[0]}</Text>
                            <Text style={s.columnDaySub}>{dayHeader.split(' ').slice(1).join(' ')}</Text>
                            <View style={[s.columnDayPill, activeSlotsCount > 0 && s.columnDayPillOn]}>
                              <Text style={[s.columnDayPillText, activeSlotsCount > 0 && { color: '#090D16' }]}>
                                {activeSlotsCount} slots
                              </Text>
                            </View>
                          </View>

                          {/* List of times */}
                          <View style={s.columnSlotsList}>
                            {daySlots.map((slot) => {
                              const isBooked = slot.status === 'booked';
                              const isAvailable = slot.status === 'available';
                              
                              return (
                                <Pressable
                                  key={slot.time}
                                  onPress={() => toggleSlotForDate(dateStr, dayCode, slot.time)}
                                  disabled={isBooked}
                                  style={({ hovered }: any) => [
                                    s.columnTimeCapsule,
                                    isBooked && s.columnCapsuleBooked,
                                    isAvailable && s.columnCapsuleAvailable,
                                    hovered && !isBooked && !isAvailable && { borderColor: 'rgba(255,255,255,0.2)' }
                                  ]}
                                >
                                  <Text style={[
                                    s.columnCapsuleText, 
                                    isBooked && { color: '#090D16', fontFamily: FONTS.bold },
                                    isAvailable && { color: '#fff', fontFamily: FONTS.bold }
                                  ]}>
                                    {slot.time}
                                  </Text>
                                  {isBooked ? (
                                    <Text style={s.columnCapsuleName} numberOfLines={1}>{slot.bookedBy}</Text>
                                  ) : isAvailable ? (
                                    <View style={s.columnAvailableDot} />
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Bottom Save Action Bar */}
                <View style={s.availSaveBar}>
                  <Text style={s.availSaveSummary}>
                    {openSlotsCount} open slots  •  {bookedSlotsCount} sessions booked
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {savedAt && (
                      <Text style={s.saveSuccessText}>✓ Saved at {savedAt}</Text>
                    )}
                    
                    <Pressable 
                      onPress={saveAvailabilitySlots} 
                      disabled={savingAvailability}
                      style={({ hovered }: any) => [
                        s.saveButton, 
                        hovered && { backgroundColor: '#5EEAD4' },
                        savingAvailability && { opacity: 0.7 }
                      ]}
                    >
                      <CheckCircle2 size={14} color="#090D16" style={{ marginRight: 6 }} />
                      <Text style={s.saveButtonText}>
                        {savingAvailability ? 'Saving...' : 'Save Availability'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            {/* Right Panel: Set Session Availability Form */}
            <View style={s.availRightPanel}>
              <View style={s.formCard}>
                <Text style={s.formCardTitle}>Set Session Availability</Text>
                <Text style={s.formCardSub}>Select a date, specify the time or range, and mark availability status.</Text>
                
                {/* Mini Month Calendar */}
                <View style={s.formCalContainer}>
                  <View style={s.monthRow}>
                    <Pressable onPress={handleFormPrevMonth} style={s.navArrow}>
                      <ChevronLeft size={16} color="#fff" />
                    </Pressable>
                    <Text style={s.formMonthLabel}>
                      {MONTHS[formCalMonth]} {formCalYear}
                    </Text>
                    <Pressable onPress={handleFormNextMonth} style={s.navArrow}>
                      <ChevronRight size={16} color="#fff" />
                    </Pressable>
                  </View>

                  <View style={s.formWeekDaysRow}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                      <Text key={idx} style={s.formWeekDayName}>{day}</Text>
                    ))}
                  </View>

                  <View style={s.formDaysGrid}>
                    {formCalendarCells.map((day, idx) => {
                      if (day === null) return <View key={`form-empty-${idx}`} style={s.formDayCellEmpty} />;
                      
                      const isSelected = formSelectedDate && 
                        formSelectedDate.getDate() === day && 
                        formSelectedDate.getMonth() === formCalMonth && 
                        formSelectedDate.getFullYear() === formCalYear;
                        
                      return (
                        <Pressable
                          key={`form-day-${day}`}
                          onPress={() => handleFormDaySelect(day)}
                          style={[
                            s.formDayCell,
                            isSelected && s.formDayCellSelected,
                          ]}
                        >
                          <Text style={[
                            s.formDayText,
                            isSelected && { color: '#090D16', fontFamily: FONTS.bold }
                          ]}>
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Selected Date Indicator */}
                <View style={s.selectedDateBadge}>
                  <Text style={s.selectedDateText}>
                    {formSelectedDate ? formSelectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : 'Select a date'}
                  </Text>
                </View>

                {/* Time Selection Mode */}
                <View style={s.formField}>
                  <Text style={s.formFieldLabel}>Time Selection Mode</Text>
                  <View style={s.modeToggleRow}>
                    <Pressable 
                      onPress={() => setTimeMode('single')} 
                      style={[s.modeToggleBtn, timeMode === 'single' && s.modeToggleBtnActive]}
                    >
                      <Text style={[s.modeToggleText, timeMode === 'single' && { color: '#090D16', fontFamily: FONTS.bold }]}>Single Slot</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setTimeMode('range')} 
                      style={[s.modeToggleBtn, timeMode === 'range' && s.modeToggleBtnActive]}
                    >
                      <Text style={[s.modeToggleText, timeMode === 'range' && { color: '#090D16', fontFamily: FONTS.bold }]}>Time Range</Text>
                    </Pressable>
                  </View>
                </View>

                {timeMode === 'single' ? (
                  <View style={s.formField}>
                    <Text style={s.formFieldLabel}>Select Time Slot</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {TIME_PRESETS.map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => setFormSingleTime(t)}
                          style={[s.timePresetChipSmall, formSingleTime === t && s.timePresetChipSmallActive]}
                        >
                          <Text style={[s.timePresetTextSmall, formSingleTime === t && { color: '#090D16', fontFamily: FONTS.bold }]}>
                            {t}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[s.formField, { flex: 1 }]}>
                      <Text style={s.formFieldLabel}>Start Time (HH:MM)</Text>
                      <TextInput 
                        value={formRangeStart} 
                        onChangeText={setFormRangeStart} 
                        style={s.formTextInput} 
                        placeholder="09:00" 
                        placeholderTextColor={MC.dim} 
                      />
                    </View>
                    <View style={[s.formField, { flex: 1 }]}>
                      <Text style={s.formFieldLabel}>End Time (HH:MM)</Text>
                      <TextInput 
                        value={formRangeEnd} 
                        onChangeText={setFormRangeEnd} 
                        style={s.formTextInput} 
                        placeholder="17:00" 
                        placeholderTextColor={MC.dim} 
                      />
                    </View>
                  </View>
                )}

                {/* Status Selector */}
                <View style={s.formField}>
                  <Text style={s.formFieldLabel}>Availability Status</Text>
                  <View style={s.statusToggleRow}>
                    <Pressable 
                      onPress={() => setFormStatus('available')} 
                      style={[
                        s.statusToggleBtn, 
                        formStatus === 'available' && { backgroundColor: '#14B8A6', borderColor: '#14B8A6' }
                      ]}
                    >
                      <View style={[s.legendDot, { backgroundColor: formStatus === 'available' ? '#090D16' : '#14B8A6', marginRight: 6 }]} />
                      <Text style={[s.statusToggleText, formStatus === 'available' && { color: '#090D16', fontFamily: FONTS.bold }]}>Available</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setFormStatus('unavailable')} 
                      style={[
                        s.statusToggleBtn, 
                        formStatus === 'unavailable' && { backgroundColor: '#475569', borderColor: '#475569' }
                      ]}
                    >
                      <View style={[s.legendDot, { backgroundColor: formStatus === 'unavailable' ? '#fff' : '#475569', marginRight: 6 }]} />
                      <Text style={[s.statusToggleText, formStatus === 'unavailable' && { color: '#fff', fontFamily: FONTS.bold }]}>Unavailable</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Submit Action */}
                <Pressable 
                  onPress={handleApplyFormAvailability} 
                  style={({ hovered }: any) => [
                    s.applyFormBtn, 
                    hovered && { backgroundColor: '#5EEAD4' }
                  ]}
                >
                  <Text style={s.applyFormBtnText}>Apply Availability</Text>
                </Pressable>
                
                {formSuccessMsg && (
                  <Text style={s.formSuccessText}>{formSuccessMsg}</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 2,
    width: '100%'
  },
  headerBox: {
    marginBottom: 16
  },
  mainTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 24,
    letterSpacing: -0.5
  },
  subTitle: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 13,
    marginTop: 2
  },
  
  // Pill tab row styles
  pillTabsRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    marginBottom: 20
  },
  pillTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  pillTabOn: {
    backgroundColor: '#14B8A6'
  },
  pillTabText: {
    color: MC.muted,
    fontFamily: FONTS.semi,
    fontSize: 13
  },
  pillTabTextOn: {
    color: '#090D16',
    fontFamily: FONTS.bold
  },
  pillCount: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  pillCountOn: {
    backgroundColor: 'rgba(9, 13, 22, 0.15)'
  },
  pillCountText: {
    color: MC.muted,
    fontFamily: FONTS.xbold,
    fontSize: 10
  },
  pillCountTextOn: {
    color: '#090D16'
  },

  // High fidelity card layouts
  cardFrame: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  studentName: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 15
  },
  studentSub: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 12,
    marginTop: 2
  },
  remainingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderWidth: 1
  },
  remainingBadgeText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 10.5
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1
  },
  categoryTagText: {
    color: '#94A3B8',
    fontFamily: FONTS.bold,
    fontSize: 11
  },
  
  dateTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.04)',
    borderColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  dateTimeText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 12.5
  },

  topicWell: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4
  },
  wellLabel: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 9.5,
    letterSpacing: 0.8
  },
  wellTitle: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14
  },

  actionBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopColor: MC.border,
    borderTopWidth: 1,
    paddingTop: 12,
    flexWrap: 'wrap',
    gap: 8
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6
  },
  actionLabel: {
    color: '#10B981',
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    letterSpacing: 0.5
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    ...({ cursor: 'pointer' } as any)
  },
  actionBtnH: {
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  actionBtnText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  reschedBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    borderWidth: 1,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    ...({ cursor: 'pointer' } as any)
  },
  reschedBtnH: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.4)'
  },
  reschedBtnText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },

  // Past Sessions styles
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderColor: 'rgba(20, 184, 166, 0.2)',
    borderWidth: 1
  },
  countBadgeText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 11
  },
  socialIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  pastDateRow: {
    marginTop: -4,
    marginBottom: 2
  },
  pastDateText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11.5
  },
  notesWell: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4
  },
  notesContent: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 13,
    lineHeight: 18
  },
  aiPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.3)',
    backgroundColor: 'rgba(94, 234, 212, 0.05)',
    alignSelf: 'flex-start',
    ...({ cursor: 'pointer' } as any)
  },
  aiPillBtnText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  aiDigestBox: {
    backgroundColor: 'rgba(20,184,166,0.04)',
    borderColor: 'rgba(20,184,166,0.15)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12
  },
  aiDigestText: {
    color: '#a5f3fc',
    fontFamily: FONTS.med,
    fontSize: 12,
    lineHeight: 16
  },
  scoreWell: {
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreBadgeText: {
    color: '#090D16',
    fontFamily: FONTS.xbold,
    fontSize: 12
  },
  scoreFeedbackText: {
    flex: 1,
    color: '#FCD34D',
    fontFamily: FONTS.bold,
    fontSize: 12
  },

  // Availability Styles
  availCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 16
  },
  availHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomColor: MC.border,
    borderBottomWidth: 1,
    paddingBottom: 16,
    flexWrap: 'wrap',
    gap: 14
  },
  availTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 18
  },
  availSub: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 12.5,
    marginTop: 3
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11
  },
  switcherBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 3
  },
  switchBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  switchBtnOn: {
    backgroundColor: '#14B8A6'
  },

  // Layout A: Grid Table
  gridTableContainer: {
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.1)'
  },
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomColor: MC.border,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  gridTimeColHeader: {
    width: '15%',
    borderRightColor: MC.border,
    borderRightWidth: 1
  },
  gridDayColHeader: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRightColor: MC.border,
    borderRightWidth: 1,
    gap: 2
  },
  gridDayTitle: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 12
  },
  gridDaySub: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10
  },
  gridDayPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  gridDayPillText: {
    color: MC.tealP,
    fontFamily: FONTS.bold,
    fontSize: 9
  },

  gridHourRow: {
    flexDirection: 'row',
    borderBottomColor: MC.border,
    borderBottomWidth: 1,
    minHeight: 52
  },
  gridTimeColCell: {
    width: '15%',
    borderRightColor: MC.border,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)'
  },
  gridTimeText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10,
    textAlign: 'center'
  },
  gridDayColCell: {
    flex: 1,
    borderRightColor: MC.border,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 52,
    ...({ cursor: 'pointer' } as any)
  },
  gridCellBooked: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)'
  },
  gridCellAvailable: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)'
  },
  bookedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    width: '100%'
  },
  bookedName: {
    color: '#F59E0B',
    fontFamily: FONTS.bold,
    fontSize: 10.5,
    flex: 1,
    marginRight: 4
  },
  bookedIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B'
  },
  availableIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#14B8A6',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4
  },

  // Layout B: Columns/List View
  columnsOuterRow: {
    flexDirection: 'row',
    gap: 8
  },
  columnContainer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden'
  },
  columnDayHeader: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomColor: MC.border,
    borderBottomWidth: 1,
    gap: 2
  },
  columnDayTitle: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 12
  },
  columnDaySub: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 10
  },
  columnDayPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  columnDayPillOn: {
    backgroundColor: '#14B8A6'
  },
  columnDayPillText: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 9
  },
  columnSlotsList: {
    padding: 8,
    gap: 6
  },
  columnTimeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.02)',
    ...({ cursor: 'pointer' } as any)
  },
  columnCapsuleBooked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B'
  },
  columnCapsuleAvailable: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  columnCapsuleText: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 11
  },
  columnCapsuleName: {
    color: '#090D16',
    fontFamily: FONTS.bold,
    fontSize: 10,
    flex: 1,
    textAlign: 'right',
    marginLeft: 4
  },
  columnAvailableDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff'
  },

  // Availability Save Bar
  availSaveBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 10
  },
  availSaveSummary: {
    color: MC.muted,
    fontFamily: FONTS.bold,
    fontSize: 12.5
  },
  saveSuccessText: {
    color: '#10B981',
    fontFamily: FONTS.bold,
    fontSize: 12
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#14B8A6',
    ...({ cursor: 'pointer' } as any)
  },
  saveButtonText: {
    color: '#090D16',
    fontFamily: FONTS.xbold,
    fontSize: 12
  },

  // Calendar specific rescheduling styles (preserved)
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
  timeSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: MC.border, paddingTop: 16 },
  timeSectionTitle: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, marginBottom: 10 },
  timePresetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timePresetChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: MC.border },
  timePresetChipActive: { backgroundColor: MC.tealP, borderColor: MC.tealP },
  timePresetText: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12 },
  
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
  
  // Custom availability layout & form styles
  availOuterContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 20,
    width: '100%',
    alignItems: 'flex-start'
  },
  availLeftPanel: {
    flex: Platform.OS === 'web' ? 2 : 1,
    width: '100%',
  },
  availRightPanel: {
    flex: Platform.OS === 'web' ? 1 : 1,
    width: '100%',
  },
  navArrowSmall: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    ...({ cursor: 'pointer' } as any)
  },
  formCard: {
    backgroundColor: MC.card,
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    width: '100%'
  },
  formCardTitle: {
    color: '#fff',
    fontFamily: FONTS.xbold,
    fontSize: 16
  },
  formCardSub: {
    color: MC.dim,
    fontFamily: FONTS.med,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4
  },
  formCalContainer: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 6
  },
  formMonthLabel: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13
  },
  formWeekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    marginTop: 4
  },
  formWeekDayName: {
    color: MC.dim,
    fontFamily: FONTS.bold,
    fontSize: 10,
    width: 24,
    textAlign: 'center'
  },
  formDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  formDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginVertical: 1,
    ...({ cursor: 'pointer' } as any)
  },
  formDayCellEmpty: {
    width: `${100 / 7}%`,
    aspectRatio: 1
  },
  formDayCellSelected: {
    backgroundColor: '#14B8A6'
  },
  formDayText: {
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 11
  },
  selectedDateBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderColor: 'rgba(20, 184, 166, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center'
  },
  selectedDateText: {
    color: '#5EEAD4',
    fontFamily: FONTS.bold,
    fontSize: 11.5
  },
  formField: {
    gap: 6
  },
  formFieldLabel: {
    color: MC.muted,
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.5
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: MC.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 3
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...({ cursor: 'pointer' } as any)
  },
  modeToggleBtnActive: {
    backgroundColor: '#14B8A6'
  },
  modeToggleText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11
  },
  timePresetChipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: MC.border
  },
  timePresetChipSmallActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6'
  },
  timePresetTextSmall: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11
  },
  formTextInput: {
    height: 34,
    borderRadius: 8,
    borderColor: MC.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    color: '#fff',
    fontFamily: FONTS.med,
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {})
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 8
  },
  statusToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MC.border,
    backgroundColor: 'rgba(255,255,255,0.02)',
    ...({ cursor: 'pointer' } as any)
  },
  statusToggleText: {
    color: MC.muted,
    fontFamily: FONTS.med,
    fontSize: 11
  },
  applyFormBtn: {
    backgroundColor: '#14B8A6',
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...({ cursor: 'pointer' } as any)
  },
  applyFormBtnText: {
    color: '#090D16',
    fontFamily: FONTS.xbold,
    fontSize: 13
  },
  formSuccessText: {
    color: '#10B981',
    fontFamily: FONTS.bold,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4
  },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: MC.card, borderRadius: 8, borderWidth: 1, borderColor: MC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: MC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
