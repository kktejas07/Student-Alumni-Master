/**
 * Student -> Calendar — monthly view of events, bookings, workshops, and deadlines.
 * Color-coded dots: blue = events, green = bookings, purple = workshops.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, BookOpen, CalendarCheck } from 'lucide-react-native';
import { request } from '@/src/models/services/api';
import { usePalette } from '../tokens';

/* ── helpers ─────────────────────────────────────────────────────────── */

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

type CalItem = { title: string; type: 'event' | 'booking' | 'workshop'; date: Date; location?: string; time?: string };

const TYPE_COLORS = { event: '#2563EB', booking: '#0ea876', workshop: '#7C5CFC' };
const TYPE_LABELS = { event: 'Event', booking: 'Booking', workshop: 'Workshop' };

/* ── component ───────────────────────────────────────────────────────── */

export function CalendarView() {
  const P = usePalette();
  const today = useMemo(() => new Date(), []);
  const [viewing, setViewing] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [items, setItems] = useState<CalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date | null>(today);

  /* fetch data */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evts, bookings, workshops] = await Promise.allSettled([
        request('/events?limit=200').catch(() => []),
        request('/my-bookings').catch(() => ({ bookings: [] })),
        request('/my-workshops').catch(() => ({ workshops: [] })),
      ]);
      const all: CalItem[] = [];
      const evtData = evts.status === 'fulfilled' ? (Array.isArray(evts.value) ? evts.value : (evts.value as any)?.items || []) : [];
      for (const e of evtData) {
        const d = parseDate(e.start_date || e.date || e.created_at);
        if (d) all.push({ title: e.title || e.name || 'Event', type: 'event', date: d, location: e.location || e.venue, time: e.start_time });
      }
      const bkData = bookings.status === 'fulfilled' ? ((bookings.value as any)?.bookings || (Array.isArray(bookings.value) ? bookings.value : [])) : [];
      for (const b of bkData) {
        const d = parseDate(b.date || b.booking_date || b.created_at);
        if (d) all.push({ title: b.mentor_name || b.title || 'Booking', type: 'booking', date: d, time: b.time || b.slot });
      }
      const wsData = workshops.status === 'fulfilled' ? ((workshops.value as any)?.workshops || (Array.isArray(workshops.value) ? workshops.value : [])) : [];
      for (const w of wsData) {
        const d = parseDate(w.date || w.start_date || w.created_at);
        if (d) all.push({ title: w.title || w.name || 'Workshop', type: 'workshop', date: d, location: w.location, time: w.time });
      }
      setItems(all);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* calendar grid */
  const firstDay = new Date(viewing.year, viewing.month, 1);
  const lastDay = new Date(viewing.year, viewing.month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const weeks = Math.ceil((startPad + totalDays) / 7);

  const dayItems = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) {
      const key = `${it.date.getFullYear()}-${it.date.getMonth()}-${it.date.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return map;
  }, [items]);

  const getDayKey = (d: number) => `${viewing.year}-${viewing.month}-${d}`;

  const selectedItems = useMemo(() => {
    if (!selected) return [];
    return dayItems.get(`${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`) || [];
  }, [selected, dayItems]);

  const goPrev = () => setViewing(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const goNext = () => setViewing(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  const goToday = () => { setViewing({ year: today.getFullYear(), month: today.getMonth() }); setSelected(today); };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.container}>
      {/* Header */}
      <View style={s.header}>
        <CalendarIcon size={22} color={P.violet} />
        <Text style={[s.title, { color: P.text }]}>Calendar</Text>
      </View>

      {/* Month nav */}
      <View style={s.monthNav}>
        <Pressable onPress={goPrev} style={s.navBtn}><ChevronLeft size={20} color={P.muted} /></Pressable>
        <Pressable onPress={goToday}>
          <Text style={[s.monthLabel, { color: P.text }]}>{MONTHS[viewing.month]} {viewing.year}</Text>
        </Pressable>
        <Pressable onPress={goNext} style={s.navBtn}><ChevronRight size={20} color={P.muted} /></Pressable>
      </View>

      {loading && <ActivityIndicator size="small" color={P.violet} style={{ marginVertical: 20 }} />}

      {/* Day headers */}
      <View style={s.dayHeaders}>
        {DAYS.map(d => <Text key={d} style={[s.dayHeader, { color: P.dim }]}>{d}</Text>)}
      </View>

      {/* Grid */}
      {Array.from({ length: weeks }, (_, w) => (
        <View key={w} style={s.week}>
          {Array.from({ length: 7 }, (_, col) => {
            const dayNum = w * 7 + col - startPad + 1;
            const inMonth = dayNum >= 1 && dayNum <= totalDays;
            const dateObj = inMonth ? new Date(viewing.year, viewing.month, dayNum) : null;
            const isToday = dateObj && isSameDay(dateObj, today);
            const isSel = dateObj && selected && isSameDay(dateObj, selected);
            const dItems = inMonth ? (dayItems.get(getDayKey(dayNum)) || []) : [];
            const types = new Set(dItems.map(i => i.type));

            return (
              <Pressable
                key={col}
                style={[s.dayCell, isSel && { backgroundColor: 'rgba(124,92,252,0.10)', borderRadius: 10 }]}
                onPress={() => dateObj && setSelected(dateObj)}
              >
                {inMonth && (
                  <>
                    <Text style={[
                      s.dayNum,
                      { color: isToday ? '#FFFFFF' : P.text },
                      isToday && s.todayBadge,
                    ]}>{dayNum}</Text>
                    <View style={s.dots}>
                      {types.has('event') && <View style={[s.dot, { backgroundColor: TYPE_COLORS.event }]} />}
                      {types.has('booking') && <View style={[s.dot, { backgroundColor: TYPE_COLORS.booking }]} />}
                      {types.has('workshop') && <View style={[s.dot, { backgroundColor: TYPE_COLORS.workshop }]} />}
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={s.legend}>
        {(['event', 'booking', 'workshop'] as const).map(t => (
          <View key={t} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: TYPE_COLORS[t] }]} />
            <Text style={[s.legendText, { color: P.muted }]}>{TYPE_LABELS[t]}s</Text>
          </View>
        ))}
      </View>

      {/* Selected day detail */}
      {selected && (
        <View style={[s.detailCard, { backgroundColor: P.bg1, borderColor: P.glassBorder }]}>
          <Text style={[s.detailTitle, { color: P.text }]}>
            {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {selectedItems.length === 0 && (
            <Text style={[s.emptyText, { color: P.dim }]}>No events on this day</Text>
          )}
          {selectedItems.map((it, i) => (
            <View key={i} style={[s.detailRow, { borderLeftColor: TYPE_COLORS[it.type] }]}>
              <View style={s.detailRowInner}>
                {it.type === 'event' && <CalendarIcon size={16} color={TYPE_COLORS.event} />}
                {it.type === 'booking' && <CalendarCheck size={16} color={TYPE_COLORS.booking} />}
                {it.type === 'workshop' && <BookOpen size={16} color={TYPE_COLORS.workshop} />}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[s.detailName, { color: P.text }]}>{it.title}</Text>
                  <View style={s.detailMeta}>
                    {it.time && <><Clock size={12} color={P.dim} /><Text style={[s.detailMetaText, { color: P.muted }]}>{it.time}</Text></>}
                    {it.location && <><MapPin size={12} color={P.dim} /><Text style={[s.detailMetaText, { color: P.muted }]}>{it.location}</Text></>}
                  </View>
                </View>
                <View style={[s.typeBadge, { backgroundColor: TYPE_COLORS[it.type] + '18' }]}>
                  <Text style={[s.typeBadgeText, { color: TYPE_COLORS[it.type] }]}>{TYPE_LABELS[it.type]}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ── styles ──────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 24, maxWidth: 800, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  title: { fontSize: 22, fontFamily: 'System', fontWeight: '700' },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 },
  navBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)' },
  monthLabel: { fontSize: 18, fontWeight: '600', fontFamily: 'System' },

  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  week: { flexDirection: 'row', minHeight: 64 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 6, minHeight: 56 },
  dayNum: { fontSize: 14, fontWeight: '500', fontFamily: 'System', marginBottom: 4 },
  todayBadge: { backgroundColor: '#7C5CFC', borderRadius: 14, width: 28, height: 28, textAlign: 'center', lineHeight: 28, overflow: 'hidden', color: '#FFFFFF' },

  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16, marginBottom: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '500' },

  detailCard: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 24 },
  detailTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14, fontFamily: 'System' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  detailRow: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 10, marginBottom: 8, borderRadius: 4 },
  detailRowInner: { flexDirection: 'row', alignItems: 'center' },
  detailName: { fontSize: 14, fontWeight: '600', fontFamily: 'System' },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  detailMetaText: { fontSize: 12, marginLeft: 3 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
});
