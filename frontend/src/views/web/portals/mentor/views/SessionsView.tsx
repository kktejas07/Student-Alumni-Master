/**
 * Mentor Portal — Sessions Redesign
 * Multi-tab system: Upcoming | Past Sessions | Availability
 * Full high-fidelity mock implementations matching the reference screens.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/src/views/components';
import { View, Text, Pressable, Linking, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
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
  day?: string;
  dateStr?: string;
  time: string;
  status: 'available' | 'booked' | 'unavailable';
  bookedBy?: string;
};

const DEFAULT_AVAILABILITY: AvailabilitySlot[] = [
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

export function SessionsView({ demoMode = false, setDemoMode }: { demoMode?: boolean; setDemoMode?: (val: boolean) => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('upcoming');
  const user = useAuthStore((s) => s.user);
  const [students, setStudents] = useState(demoMode ? INITIAL_STUDENTS : []);
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
      setStudents(conns.length > 0 ? conns : (demoMode ? INITIAL_STUDENTS : []));
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
  }, [user, demoMode]);

  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(DEFAULT_AVAILABILITY);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'columns'>('columns');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => new Date(2026, 4, 5));

  const [formCalYear, setFormCalYear] = useState(2026);
  const [formCalMonth, setFormCalMonth] = useState(4);
  const [formSelectedDate, setFormSelectedDate] = useState<Date | null>(new Date(2026, 4, 5));
  const [timeMode, setTimeMode] = useState<'single' | 'range'>('single');
  const [formSingleTime, setFormSingleTime] = useState('09:30');
  const [formRangeStart, setFormRangeStart] = useState('09:00');
  const [formRangeEnd, setFormRangeEnd] = useState('17:00');
  const [formStatus, setFormStatus] = useState<'available' | 'unavailable'>('available');
  const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);

  const [reschedulingSession, setReschedulingSession] = useState<any | null>(null);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(4);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

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
        toast.warning('Invalid times', 'Please enter valid start and end times (format HH:MM).');
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
        toast.warning('Invalid range', 'End time must be after start time.');
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

    const allUpcoming = [...bookingsUpcoming, ...fallbackUpcoming];
    allUpcoming.sort((a, b) => {
      const timeA = a._rawDate instanceof Date && !isNaN(a._rawDate.getTime()) ? a._rawDate.getTime() : 0;
      const timeB = b._rawDate instanceof Date && !isNaN(b._rawDate.getTime()) ? b._rawDate.getTime() : 0;
      return timeA - timeB;
    });

    return allUpcoming;
  }, [bookingsList, students, studentsMap, now]);

  const past = useMemo(() => {
    if (demoMode && bookingsList.length === 0) {
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
      toast.success('Session rescheduled');
    } catch (e: any) {
      toast.error('Reschedule failed', e?.message || 'Error occurred');
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

  const toggleSlot = (day: string, time: string) => {
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

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
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

  const openSlotsCount = mergedAvailabilitySlots.filter((s) => s.status === 'available').length;
  const bookedSlotsCount = mergedAvailabilitySlots.filter((s) => s.status === 'booked').length;

  if (loading) {
    return (
      <View className="flex-1 p-[60px] items-center justify-center">
        <ActivityIndicator color={MC.tealP} size="large" />
      </View>
    );
  }

  if (reschedulingSession) {
    return (
      <View className="gap-4 w-full">
        <View className="gap-1.5">
          <Pressable onPress={() => setReschedulingSession(null)} className="flex-row items-center gap-1.5 self-start cursor-pointer">
            <ArrowLeft size={16} color={MC.tealP} />
            <Text className="text-tealP font-body-bold text-[13px]">Back to Sessions</Text>
          </Pressable>
          <Text className="text-white font-display-bold text-[20px] tracking-[-0.4px] mt-1">Reschedule Session</Text>
          <Text className="text-muted font-body-semibold text-[13px]">
            Topic: <Text className="text-white font-body-bold">"{reschedulingSession.topic}"</Text> with <Text className="text-tealP font-body-bold">{reschedulingSession.student.name}</Text>
          </Text>
        </View>

        <View className="bg-card border border-glass-border rounded-2xl p-[18px]">
          <View className="flex-row justify-between items-center mb-4">
            <Pressable onPress={handlePrevMonth} className="w-8 h-8 rounded-lg bg-white/[0.05] items-center justify-center cursor-pointer">
              <ChevronLeft size={18} color="#fff" />
            </Pressable>
            <Text className="text-white font-body-bold text-[15px]">{['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][calMonth]} {calYear}</Text>
            <Pressable onPress={handleNextMonth} className="w-8 h-8 rounded-lg bg-white/[0.05] items-center justify-center cursor-pointer">
              <ChevronRight size={18} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-row justify-around mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Text key={day} className="text-dim font-body-bold text-[12px] w-10 text-center">{day}</Text>
            ))}
          </View>

          <View className="flex-row flex-wrap justify-start">
            {calendarCells.map((day, idx) => {
              if (day === null) return <View key={`empty-${idx}`} className="my-[2px]" style={{ width: `${100 / 7}%` }} />;
              const isToday = day === 25 && calMonth === 4 && calYear === 2026;
              return (
                <Pressable
                  key={`day-${day}`}
                  onPress={() => handleDaySelect(day)}
                  className={`items-center justify-center rounded-lg my-[2px] cursor-pointer ${isToday ? 'bg-tealP' : ''}`}
                  style={{ width: `${100 / 7}%` }}
                >
                  <Text className={`text-white font-body-semibold text-[13px] ${isToday ? 'text-bg font-display-bold' : ''}`}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-5 border-t border-glass-border pt-4">
            <Text className="text-white font-body-bold text-[14px] mb-2.5">Select Time Slot</Text>
            <View className="flex-row flex-wrap gap-2">
              {['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((tPreset) => (
                <Pressable
                  key={tPreset}
                  onPress={() => setSelectedTime(tPreset)}
                  className={`px-3 py-2 rounded-lg bg-white/[0.05] border border-glass-border ${selectedTime === tPreset ? 'bg-tealP border-tealP' : ''}`}
                >
                  <Text className={`text-muted font-body-semibold text-[12px] ${selectedTime === tPreset ? 'text-bg font-body-bold' : ''}`}>
                    {tPreset}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {pendingDate && (
          <View style={{
            position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(5, 8, 16, 0.85)',
            zIndex: 9999,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}>
            <View className="bg-card border border-glass-border rounded-2xl p-[22px] w-full max-w-[420px] items-center gap-3.5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
              <View className="w-[52px] h-[52px] rounded-[26px] bg-[#14B8A6]/[0.1] border border-[#14B8A6]/[0.3] items-center justify-center">
                <CalIcon size={24} color={MC.tealP} />
              </View>
              <Text className="text-white font-display-bold text-[17px]">Confirm Reschedule</Text>
              <Text className="text-muted font-body-semibold text-[13px] text-center leading-5">
                Are you sure you want to reschedule your session with{' '}
                <Text className="text-white font-body-bold">{reschedulingSession.student.name}</Text>{' '}
                to <Text className="text-tealP font-body-bold">{pendingDate}</Text> at{' '}
                <Text className="text-tealP font-body-bold">{selectedTime}</Text>?
              </Text>
              
              <View className="flex-row w-full gap-2.5 mt-1.5">
                <Pressable onPress={() => setPendingDate(null)} className="flex-1 h-[38px] rounded-[10px] border border-glass-border items-center justify-center cursor-pointer">
                  <Text className="text-muted font-body-bold text-[13px]">Cancel</Text>
                </Pressable>
                <Pressable onPress={confirmReschedule} className="flex-1 h-[38px] rounded-[10px] bg-tealP flex-row items-center justify-center cursor-pointer">
                  <Check size={14} color={MC.bg} style={{ marginRight: 4 }} />
                  <Text className="text-bg font-display-bold text-[13px]">Confirm & Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="p-[2px] w-full">
      <View className="mb-4">
        <Text className="text-white font-display-bold text-2xl tracking-[-0.5px]">Sessions</Text>
        <Text className="text-muted font-body-semibold text-[13px] mt-[2px]">
          {upcoming.length} upcoming · {past.length} past
        </Text>
      </View>

      <View className="flex-row gap-2 bg-white/[0.03] border border-glass-border rounded-xl p-1.5 mb-5">
        <Pressable 
          onPress={() => setTab('upcoming')} 
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-transparent cursor-pointer ${tab === 'upcoming' ? 'bg-[#14B8A6]' : ''}`}
        >
          <CalIcon size={14} color={tab === 'upcoming' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text className={`text-muted font-body-semibold text-[13px] ${tab === 'upcoming' ? 'text-[#090D16] font-body-bold' : ''}`}>Upcoming</Text>
          {upcoming.length > 0 && (
            <View className={`ml-1.5 px-1.5 py-[2px] rounded-md bg-white/[0.08] ${tab === 'upcoming' ? 'bg-[#090D16]/[0.15]' : ''}`}>
              <Text className={`text-muted font-display-bold text-[10px] ${tab === 'upcoming' ? 'text-[#090D16]' : ''}`}>{upcoming.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable 
          onPress={() => setTab('past')} 
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-transparent cursor-pointer ${tab === 'past' ? 'bg-[#14B8A6]' : ''}`}
        >
          <History size={14} color={tab === 'past' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text className={`text-muted font-body-semibold text-[13px] ${tab === 'past' ? 'text-[#090D16] font-body-bold' : ''}`}>Past Sessions</Text>
          {past.length > 0 && (
            <View className={`ml-1.5 px-1.5 py-[2px] rounded-md bg-white/[0.08] ${tab === 'past' ? 'bg-[#090D16]/[0.15]' : ''}`}>
              <Text className={`text-muted font-display-bold text-[10px] ${tab === 'past' ? 'text-[#090D16]' : ''}`}>{past.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable 
          onPress={() => setTab('availability')} 
          className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg bg-transparent cursor-pointer ${tab === 'availability' ? 'bg-[#14B8A6]' : ''}`}
        >
          <Settings size={14} color={tab === 'availability' ? '#090D16' : MC.muted} style={{ marginRight: 6 }} />
          <Text className={`text-muted font-body-semibold text-[13px] ${tab === 'availability' ? 'text-[#090D16] font-body-bold' : ''}`}>Availability</Text>
        </Pressable>
      </View>

      <View className="gap-3.5">
        
        {tab === 'upcoming' && upcoming.map((u, i) => {
          const mainTag = u.student.tags && u.student.tags[0] ? u.student.tags[0] : 'General';
          return (
            <View key={i} className="bg-card border border-glass-border rounded-2xl p-[18px] mb-3.5 gap-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}>
              <View className="flex-row items-center">
                <Av initials={u.student.avatar} size={48} color={u.student.color} />
                <View className="flex-1 min-w-0 ml-3">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-white font-body-bold text-[15px]">{u.student.name}</Text>
                    <View className="px-2 py-[2px] rounded-2xl bg-[#14B8A6]/[0.15] border border-[#14B8A6]/[0.3]">
                      <Text className="text-[#5EEAD4] font-body-bold text-[10.5px]">
                        {u.daysAway === 0 ? 'Today' : `In ${u.daysAway}d`}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-muted font-body-semibold text-[12px] mt-[2px]">{u.student.branch} - {u.student.college}</Text>
                </View>
                <View className="px-2.5 py-1 rounded-2xl bg-white/[0.03] border border-white/[0.1]">
                  <Text className="text-[#94A3B8] font-body-bold text-[11px]">{mainTag}</Text>
                </View>
              </View>

              <View className="flex-row items-center bg-[#14B8A6]/[0.04] border border-[#14B8A6]/[0.1] rounded-[10px] px-3 py-2">
                <CalIcon size={14} color={MC.tealP} style={{ marginRight: 6 }} />
                <Text className="text-[#5EEAD4] font-body-bold text-[12.5px]">{u.date}   •   {u.time}   •   30 min</Text>
              </View>

              <View className="bg-black/[0.15] border border-white/[0.03] rounded-xl p-3.5 gap-1">
                <Text className="text-dim font-body-bold text-[9.5px] tracking-[0.8px]">SESSION TOPIC</Text>
                <Text className="text-white font-body-bold text-[14px]">{u.topic}</Text>
              </View>

              <View className="flex-row justify-between items-center border-t border-glass-border pt-3 flex-wrap gap-2">
                <View className="flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#10B981] mr-1.5" />
                  <Text className="text-[#10B981] font-body-bold text-[10.5px] tracking-[0.5px]">START SESSION VIA</Text>
                </View>
                <View className="flex-row gap-2 flex-wrap">
                  <Pressable 
                    onPress={() => Linking.openURL('https://meet.google.com/new')} 
                    style={({ hovered }: any) => ({
                      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                      ...(hovered ? { backgroundColor: 'rgba(255,255,255,0.12)' } : {}),
                    })}
                  >
                    <Video size={13} color="#fff" style={{ marginRight: 6 }} />
                    <Text className="text-white font-body-bold text-[11.5px]">Google Meet</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => Linking.openURL('https://zoom.us/start/webinar')} 
                    style={({ hovered }: any) => ({
                      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                      ...(hovered ? { backgroundColor: 'rgba(255,255,255,0.12)' } : {}),
                    })}
                  >
                    <Monitor size={13} color="#fff" style={{ marginRight: 6 }} />
                    <Text className="text-white font-body-bold text-[11.5px]">Zoom</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => Linking.openURL('https://teams.microsoft.com')} 
                    style={({ hovered }: any) => ({
                      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                      ...(hovered ? { backgroundColor: 'rgba(255,255,255,0.12)' } : {}),
                    })}
                  >
                    <Phone size={13} color="#fff" style={{ marginRight: 6 }} />
                    <Text className="text-white font-body-bold text-[11.5px]">Teams</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => openRescheduleView(u)} 
                    style={({ hovered }: any) => ({
                      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8,
                      borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.2)', backgroundColor: 'rgba(20, 184, 166, 0.05)',
                      ...(hovered ? { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: 'rgba(20, 184, 166, 0.4)' } : {}),
                    })}
                  >
                    <Text className="text-[#5EEAD4] font-body-bold text-[11.5px]">Reschedule</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        {tab === 'past' && past.map((p, i) => {
          const aiDigest = aiSummaryStates[i];
          return (
            <View key={i} className="bg-card border border-glass-border rounded-2xl p-[18px] mb-3.5 gap-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}>
              <View className="flex-row items-center">
                <Av initials={p.student.avatar} size={48} color={p.student.color} />
                <View className="flex-1 min-w-0 ml-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-white font-body-bold text-[15px]">{p.student.name}</Text>
                    <View className="px-2 py-[2px] rounded-2xl bg-[#14B8A6]/[0.08] border border-[#14B8A6]/[0.2]">
                      <Text className="text-[#5EEAD4] font-body-bold text-[11px]">{p.sessionsCount} sessions</Text>
                    </View>
                  </View>
                  <Text className="text-muted font-body-semibold text-[12px] mt-[2px]">{p.student.branch} - {p.student.college}</Text>
                </View>
                
                <View className="flex-row gap-2.5 items-center">
                  {p.student.linkedin && (
                    <Pressable onPress={() => p.student.linkedin ? Linking.openURL(p.student.linkedin.startsWith('http') ? p.student.linkedin : `https://${p.student.linkedin}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-7 h-7 rounded-full items-center justify-center cursor-pointer" style={{ backgroundColor: '#0A66C2' }}>
                      <LinkedinGlyph size={15} color="#fff" />
                    </Pressable>
                  )}
                  {p.student.github && (
                    <Pressable onPress={() => p.student.github ? Linking.openURL(p.student.github.startsWith('http') ? p.student.github : `https://${p.student.github}`) : toast.info('Link Unavailable', 'This user has not connected this social profile yet.')} className="w-7 h-7 rounded-full items-center justify-center cursor-pointer" style={{ backgroundColor: '#24292e' }}>
                      <Code size={15} color="#fff" />
                    </Pressable>
                  )}
                </View>
              </View>

              <View className="mt-[-4px] mb-[2px]">
                <Text className="text-dim font-body-semibold text-[11.5px]">{p.date}</Text>
              </View>

              <View className="bg-black/[0.15] border border-white/[0.03] rounded-xl p-3.5 gap-1">
                <Text className="text-dim font-body-bold text-[9.5px] tracking-[0.8px]">LAST SESSION NOTES</Text>
                <Text className="text-white font-body-semibold text-[13px] leading-[18px]">{p.notes}</Text>
              </View>

              <View className="mt-2.5 gap-2">
                <Pressable 
                  onPress={() => triggerAISummary(i, p.notes)} 
                  disabled={aiDigest?.loading}
                  style={({ hovered }: any) => ({
                    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 8,
                    borderWidth: 1, borderColor: 'rgba(94, 234, 212, 0.3)', backgroundColor: 'rgba(94, 234, 212, 0.05)',
                    alignSelf: 'flex-start',
                    ...(hovered ? { borderColor: '#5EEAD4' } : {}),
                  })}
                >
                  <Sparkles size={12} color="#5EEAD4" style={{ marginRight: 6 }} />
                  <Text className="text-[#5EEAD4] font-body-bold text-[11.5px]">
                    {aiDigest?.loading ? 'Summarizing...' : 'AI Summarize Notes'}
                  </Text>
                </Pressable>

                {aiDigest && !aiDigest.loading && (
                  <View className="bg-[#14B8A6]/[0.04] border border-[#14B8A6]/[0.15] rounded-[10px] p-3">
                    <Text className="text-[#a5f3fc] font-body-semibold text-[12px] leading-[16px]">{aiDigest.text}</Text>
                  </View>
                )}
              </View>

              <View className="bg-[#F59E0B]/[0.03] border border-[#F59E0B]/[0.15] rounded-xl p-3.5 gap-1.5">
                <Text className="text-dim font-body-bold text-[9.5px] tracking-[0.8px]">AI SESSION SCORE</Text>
                <View className="flex-row items-center gap-3">
                  <View className="px-2 py-[3px] rounded-md bg-[#F59E0B] items-center justify-center">
                    <Text className="text-[#090D16] font-display-bold text-[12px]">{p.score}</Text>
                  </View>
                  <Text className="flex-1 text-[#FCD34D] font-body-bold text-[12px]">{p.feedback}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {(tab === 'upcoming' || tab === 'past') && connPages > 1 && (
          <View className="flex-row justify-center items-center py-4 gap-3.5">
            <Pressable className={`px-3.5 py-[7px] bg-card rounded-lg border border-glass-border cursor-pointer ${connPage <= 1 ? 'opacity-40' : ''}`} onPress={() => connPage > 1 && loadData(connPage - 1)}>
              <Text className="text-white font-body-bold text-[12px]">Prev</Text>
            </Pressable>
            <Text className="text-muted font-body-semibold text-[12px]">{connPage} / {connPages}</Text>
            <Pressable className={`px-3.5 py-[7px] bg-card rounded-lg border border-glass-border cursor-pointer ${connPage >= connPages ? 'opacity-40' : ''}`} onPress={() => connPage < connPages && loadData(connPage + 1)}>
              <Text className="text-white font-body-bold text-[12px]">Next</Text>
            </Pressable>
          </View>
        )}

        {tab === 'availability' && (
          <View className="gap-5 w-full items-start" style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column' }}>
            <View className="w-full" style={{ flex: Platform.OS === 'web' ? 2 : 1 }}>
              <View className="bg-card border border-glass-border rounded-2xl p-[18px] gap-4">
                <View className="flex-row justify-between items-start border-b border-glass-border pb-4 flex-wrap gap-3.5">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white font-display-bold text-[18px]">Availability Calendar</Text>
                      <View className="flex-row gap-1">
                        <Pressable onPress={handlePrevWeek} className="w-6 h-6 rounded-md bg-white/[0.05] items-center justify-center cursor-pointer">
                          <ChevronLeft size={14} color="#fff" />
                        </Pressable>
                        <Pressable onPress={handleNextWeek} className="w-6 h-6 rounded-md bg-white/[0.05] items-center justify-center cursor-pointer">
                          <ChevronRight size={14} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                    <Text className="text-dim font-body-semibold text-[12.5px] mt-[3px]">
                      {weekRangeTitle}  •  <Text className="text-tealP font-body-bold">{openSlotsCount} open slots</Text>  •  <Text className="text-amber font-body-bold">{bookedSlotsCount} booked</Text>
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-3.5 flex-wrap">
                    <View className="flex-row gap-3 items-center">
                      <View className="flex-row items-center gap-[5px]">
                        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#14B8A6' }} />
                        <Text className="text-muted font-body-semibold text-[11px]">Available</Text>
                      </View>
                      <View className="flex-row items-center gap-[5px]">
                        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                        <Text className="text-muted font-body-semibold text-[11px]">Booked</Text>
                      </View>
                      <View className="flex-row items-center gap-[5px]">
                        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#334155' }} />
                        <Text className="text-muted font-body-semibold text-[11px]">Unavailable</Text>
                      </View>
                    </View>

                    <View className="flex-row bg-white/[0.03] border border-glass-border rounded-lg p-[3px]">
                      <Pressable 
                        onPress={() => setLayoutMode('grid')}
                        className={`w-7 h-7 rounded-md items-center justify-center bg-transparent cursor-pointer ${layoutMode === 'grid' ? 'bg-[#14B8A6]' : ''}`}
                      >
                        <Grid size={14} color={layoutMode === 'grid' ? '#090D16' : '#94A3B8'} />
                      </Pressable>
                      <Pressable 
                        onPress={() => setLayoutMode('columns')}
                        className={`w-7 h-7 rounded-md items-center justify-center bg-transparent cursor-pointer ${layoutMode === 'columns' ? 'bg-[#14B8A6]' : ''}`}
                      >
                        <List size={14} color={layoutMode === 'columns' ? '#090D16' : '#94A3B8'} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {layoutMode === 'grid' && (
                  <View className="border border-glass-border rounded-xl overflow-hidden bg-black/[0.1]">
                    <View className="flex-row border-b border-glass-border bg-white/[0.02]">
                      <View className="w-[15%] border-r border-glass-border" />
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
                          <View key={dayHeader} className="flex-1 py-2.5 items-center border-r border-glass-border gap-[2px]">
                            <Text className="text-white font-body-bold text-[12px]">{dayHeader.split(' ')[0]}</Text>
                            <Text className="text-dim font-body-semibold text-[10px]">{dayHeader.split(' ').slice(1).join(' ')}</Text>
                            <View className="mt-1 px-1.5 py-[2px] rounded bg-white/[0.05]">
                              <Text className="text-tealP font-body-bold text-[9px]">{selectedInDay} slots</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((timeLabel) => (
                      <View key={timeLabel} className="flex-row border-b border-glass-border min-h-[52px]">
                        <View className="w-[15%] border-r border-glass-border items-center justify-center bg-black/[0.1]">
                          <Text className="text-dim font-body-semibold text-[10px] text-center">
                            {parseInt(timeLabel) === 12 ? '12:00 PM' : parseInt(timeLabel) > 12 ? `${parseInt(timeLabel) - 12}:00 PM` : `${timeLabel} AM`}
                          </Text>
                        </View>

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
                              style={({ hovered }: any) => ({
                                flex: 1, borderRightWidth: 1, borderRightColor: MC.border,
                                alignItems: 'center', justifyContent: 'center',
                                backgroundColor: isBooked ? 'rgba(245, 158, 11, 0.08)' : isAvailable ? 'rgba(20, 184, 166, 0.08)' : 'transparent',
                                minHeight: 52, cursor: 'pointer',
                                ...(hovered && !isBooked ? { backgroundColor: 'rgba(20, 184, 166, 0.15)' } : {}),
                              })}
                            >
                              {isBooked ? (
                                <View className="flex-row items-center justify-between px-2 w-full">
                                  <Text className="text-[#F59E0B] font-body-bold text-[10.5px] flex-1 mr-1">{name}</Text>
                                  <View className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                                </View>
                              ) : isAvailable ? (
                                <View className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" style={{ shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }} />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                )}

                {layoutMode === 'columns' && (
                  <View className="flex-row gap-2">
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
                        <View key={dayCode} className="flex-1 bg-white/[0.01] border border-glass-border rounded-xl overflow-hidden">
                          <View className="py-2.5 items-center bg-white/[0.03] border-b border-glass-border gap-[2px]">
                            <Text className="text-white font-body-bold text-[12px]">{dayHeader.split(' ')[0]}</Text>
                            <Text className="text-dim font-body-semibold text-[10px]">{dayHeader.split(' ').slice(1).join(' ')}</Text>
                            <View className={`mt-1 px-1.5 py-[2px] rounded bg-white/[0.05] ${activeSlotsCount > 0 ? 'bg-[#14B8A6]' : ''}`}>
                              <Text className={`text-dim font-body-bold text-[9px] ${activeSlotsCount > 0 ? 'text-[#090D16]' : ''}`}>
                                {activeSlotsCount} slots
                              </Text>
                            </View>
                          </View>

                          <View className="p-2 gap-1.5">
                            {daySlots.map((slot) => {
                              const isBooked = slot.status === 'booked';
                              const isAvailable = slot.status === 'available';
                              
                              return (
                                <Pressable
                                  key={slot.time}
                                  onPress={() => toggleSlotForDate(dateStr, dayCode, slot.time)}
                                  disabled={isBooked}
                                  style={({ hovered }: any) => ({
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                    paddingHorizontal: 10, height: 32, borderRadius: 6, borderWidth: 1,
                                    borderColor: isBooked ? '#F59E0B' : isAvailable ? '#14B8A6' : 'transparent',
                                    backgroundColor: isBooked ? '#F59E0B' : isAvailable ? '#14B8A6' : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    ...(isAvailable ? { shadowColor: '#14B8A6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 } : {}),
                                    ...(hovered && !isBooked && !isAvailable ? { borderColor: 'rgba(255,255,255,0.2)' } : {}),
                                  })}
                                >
                                  <Text className={`text-dim font-body-semibold text-[11px] ${isBooked ? 'text-[#090D16] font-body-bold' : ''} ${isAvailable ? 'text-white font-body-bold' : ''}`}>
                                    {slot.time}
                                  </Text>
                                  {isBooked ? (
                                    <Text className="text-[#090D16] font-body-bold text-[10px] flex-1 text-right ml-1" numberOfLines={1}>{slot.bookedBy}</Text>
                                  ) : isAvailable ? (
                                    <View className="w-[5px] h-[5px] rounded-full bg-white" />
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

                <View className="flex-row justify-between items-center bg-white/[0.02] border border-glass-border rounded-xl p-3 mt-1 flex-wrap gap-2.5">
                  <Text className="text-muted font-body-bold text-[12.5px]">
                    {openSlotsCount} open slots  •  {bookedSlotsCount} sessions booked
                  </Text>
                  
                  <View className="flex-row items-center gap-3">
                    {savedAt && (
                      <Text className="text-[#10B981] font-body-bold text-[12px]">✓ Saved at {savedAt}</Text>
                    )}
                    
                    <Pressable 
                      onPress={saveAvailabilitySlots} 
                      disabled={savingAvailability}
                      style={({ hovered }: any) => ({
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        paddingHorizontal: 14, height: 34, borderRadius: 8,
                        backgroundColor: '#14B8A6', cursor: 'pointer',
                        ...(hovered ? { backgroundColor: '#5EEAD4' } : {}),
                        ...(savingAvailability ? { opacity: 0.7 } : {}),
                      })}
                    >
                      <CheckCircle2 size={14} color="#090D16" style={{ marginRight: 6 }} />
                      <Text className="text-[#090D16] font-display-bold text-[12px]">
                        {savingAvailability ? 'Saving...' : 'Save Availability'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <View className="flex-1 w-full">
              <View className="bg-card border border-glass-border rounded-2xl p-[18px] gap-3.5 w-full">
                <Text className="text-white font-display-bold text-[16px]">Set Session Availability</Text>
                <Text className="text-dim font-body-semibold text-[12px] leading-4 mt-[-4px]">Select a date, specify the time or range, and mark availability status.</Text>
                
                <View className="bg-black/[0.15] border border-glass-border rounded-xl p-2.5 mt-1.5">
                  <View className="flex-row justify-between items-center mb-4">
                    <Pressable onPress={handleFormPrevMonth} className="w-8 h-8 rounded-lg bg-white/[0.05] items-center justify-center cursor-pointer">
                      <ChevronLeft size={16} color="#fff" />
                    </Pressable>
                    <Text className="text-white font-body-bold text-[13px]">
                      {MONTHS[formCalMonth]} {formCalYear}
                    </Text>
                    <Pressable onPress={handleFormNextMonth} className="w-8 h-8 rounded-lg bg-white/[0.05] items-center justify-center cursor-pointer">
                      <ChevronRight size={16} color="#fff" />
                    </Pressable>
                  </View>

                  <View className="flex-row justify-around mb-1.5 mt-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                      <Text key={idx} className="text-dim font-body-bold text-[10px] w-6 text-center">{day}</Text>
                    ))}
                  </View>

                  <View className="flex-row flex-wrap justify-start">
                    {formCalendarCells.map((day, idx) => {
                      if (day === null) return <View key={`form-empty-${idx}`} className="my-[1px]" style={{ width: `${100 / 7}%` }} />;
                      
                      const isSelected = formSelectedDate && 
                        formSelectedDate.getDate() === day && 
                        formSelectedDate.getMonth() === formCalMonth && 
                        formSelectedDate.getFullYear() === formCalYear;
                        
                      return (
                        <Pressable
                          key={`form-day-${day}`}
                          onPress={() => handleFormDaySelect(day)}
                          className={`items-center justify-center rounded-md my-[1px] cursor-pointer ${isSelected ? 'bg-[#14B8A6]' : ''}`}
                          style={{ width: `${100 / 7}%` }}
                        >
                          <Text className={`text-white font-body-semibold text-[11px] ${isSelected ? 'text-[#090D16] font-body-bold' : ''}`}>
                            {day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View className="bg-[#14B8A6]/[0.08] border border-[#14B8A6]/[0.2] rounded-lg p-2 items-center">
                  <Text className="text-[#5EEAD4] font-body-bold text-[11.5px]">
                    {formSelectedDate ? formSelectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : 'Select a date'}
                  </Text>
                </View>

                <View className="gap-1.5">
                  <Text className="text-muted font-body-bold text-[11px] tracking-[0.5px]">Time Selection Mode</Text>
                  <View className="flex-row bg-white/[0.03] border border-glass-border rounded-lg p-[3px]">
                    <Pressable 
                      onPress={() => setTimeMode('single')} 
                      className={`flex-1 py-1.5 rounded-md items-center justify-center bg-transparent cursor-pointer ${timeMode === 'single' ? 'bg-[#14B8A6]' : ''}`}
                    >
                      <Text className={`text-muted font-body-semibold text-[11px] ${timeMode === 'single' ? 'text-[#090D16] font-body-bold' : ''}`}>Single Slot</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setTimeMode('range')} 
                      className={`flex-1 py-1.5 rounded-md items-center justify-center bg-transparent cursor-pointer ${timeMode === 'range' ? 'bg-[#14B8A6]' : ''}`}
                    >
                      <Text className={`text-muted font-body-semibold text-[11px] ${timeMode === 'range' ? 'text-[#090D16] font-body-bold' : ''}`}>Time Range</Text>
                    </Pressable>
                  </View>
                </View>

                {timeMode === 'single' ? (
                  <View className="gap-1.5">
                    <Text className="text-muted font-body-bold text-[11px] tracking-[0.5px]">Select Time Slot</Text>
                    <View className="flex-row gap-1.5 flex-wrap">
                      {TIME_PRESETS.map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => setFormSingleTime(t)}
                          className={`px-2 py-[5px] rounded-md bg-white/[0.05] border border-glass-border ${formSingleTime === t ? 'bg-[#14B8A6] border-[#14B8A6]' : ''}`}
                        >
                          <Text className={`text-muted font-body-semibold text-[11px] ${formSingleTime === t ? 'text-[#090D16] font-body-bold' : ''}`}>
                            {t}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View className="flex-row gap-2.5">
                    <View className="gap-1.5 flex-1">
                      <Text className="text-muted font-body-bold text-[11px] tracking-[0.5px]">Start Time (HH:MM)</Text>
                      <TextInput 
                        value={formRangeStart} 
                        onChangeText={setFormRangeStart} 
                        className="h-[34px] rounded-lg border border-glass-border px-2 text-white font-body-semibold text-[12px] bg-black/[0.1]" 
                        style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                        placeholder="09:00" 
                        placeholderTextColor={MC.dim} 
                      />
                    </View>
                    <View className="gap-1.5 flex-1">
                      <Text className="text-muted font-body-bold text-[11px] tracking-[0.5px]">End Time (HH:MM)</Text>
                      <TextInput 
                        value={formRangeEnd} 
                        onChangeText={setFormRangeEnd} 
                        className="h-[34px] rounded-lg border border-glass-border px-2 text-white font-body-semibold text-[12px] bg-black/[0.1]" 
                        style={Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}}
                        placeholder="17:00" 
                        placeholderTextColor={MC.dim} 
                      />
                    </View>
                  </View>
                )}

                <View className="gap-1.5">
                  <Text className="text-muted font-body-bold text-[11px] tracking-[0.5px]">Availability Status</Text>
                  <View className="flex-row gap-2">
                    <Pressable 
                      onPress={() => setFormStatus('available')} 
                      className={`flex-1 flex-row items-center justify-center h-[34px] rounded-lg border cursor-pointer ${formStatus === 'available' ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-glass-border bg-white/[0.02]'}`}
                    >
                      <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: formStatus === 'available' ? '#090D16' : '#14B8A6' }} />
                      <Text className={`text-muted font-body-semibold text-[11px] ${formStatus === 'available' ? 'text-[#090D16] font-body-bold' : ''}`}>Available</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => setFormStatus('unavailable')} 
                      className={`flex-1 flex-row items-center justify-center h-[34px] rounded-lg border cursor-pointer ${formStatus === 'unavailable' ? 'bg-[#475569] border-[#475569]' : 'border-glass-border bg-white/[0.02]'}`}
                    >
                      <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: formStatus === 'unavailable' ? '#fff' : '#475569' }} />
                      <Text className={`text-muted font-body-semibold text-[11px] ${formStatus === 'unavailable' ? 'text-white font-body-bold' : ''}`}>Unavailable</Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable 
                  onPress={handleApplyFormAvailability} 
                  style={({ hovered }: any) => ({
                    backgroundColor: '#14B8A6', height: 38, borderRadius: 10,
                    alignItems: 'center', justifyContent: 'center', marginTop: 6, cursor: 'pointer',
                    ...(hovered ? { backgroundColor: '#5EEAD4' } : {}),
                  })}
                >
                  <Text className="text-[#090D16] font-display-bold text-[13px]">Apply Availability</Text>
                </Pressable>
                
                {formSuccessMsg && (
                  <Text className="text-[#10B981] font-body-bold text-[11px] text-center mt-1">{formSuccessMsg}</Text>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
