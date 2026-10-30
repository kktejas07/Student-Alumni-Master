import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Calendar as CalIcon, MapPin, Users as UsersIcon, Check } from '../iconShims';
import { SC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { postPortal } from '@/src/lib/portalApi';
import { request } from '@/src/models/services/api';
import { useToast } from '@/src/views/components';

type Ev = { id: string; title: string; date: string; mode: string; city: string; cat: string; attending: number; capacity: number; kind: string; price?: number; accent: string; registered: boolean };

const FILTERS = ['All', 'Free', 'Paid', 'Online', 'Onsite'];
const PER_PAGE = 24;

export function EventsView() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('All');
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set());

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await request<any>(`/student/events?page=${p}&per_page=${PER_PAGE}`);
      setData(res);
      setPages(res.pages || 1);
      setPage(p);
    } catch { setData({ items: [] }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const onRSVP = async (id: string) => {
    setRsvpd((p) => new Set(p).add(id));
    try {
      await postPortal(`/student/events/${id}/rsvp`);
      toast.success('RSVP confirmed', 'You’re registered for this event.');
    } catch (e: any) {
      setRsvpd((p) => { const n = new Set(p); n.delete(id); return n; });
      toast.error('RSVP failed', e?.message || 'Please try again.');
    }
  };

  const EVENTS = data?.items || [];
  const list = EVENTS.filter((e) => {
    if (filter === 'Free') return e.kind === 'free';
    if (filter === 'Paid') return e.kind === 'paid';
    if (filter === 'Online') return e.mode === 'Online';
    if (filter === 'Onsite') return e.mode !== 'Online';
    return true;
  });

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => { setFilter(f); setPage(1); fetchPage(1); }} style={[s.chip, filter === f && s.chipOn]}>
            <Text style={{ color: filter === f ? '#fff' : SC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator size="large" color={SC.primary} /></View>
      ) : (
        <>
          <View style={s.grid}>
            {list.map((e) => {
              const isReg = e.registered || rsvpd.has(e.id);
              return (
                <View key={e.id} style={[s.card, { flexGrow: 1, flexBasis: 300, maxWidth: 360 }]}>
                  <View style={[s.cover, { backgroundColor: e.accent + '22', borderColor: e.accent + '40' }]}>
                    <CalIcon size={28} color={e.accent} />
                  </View>
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Badge label={e.cat} color="purple" />
                      <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'amber'} />
                    </View>
                    <Text numberOfLines={2} style={s.title}>{e.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <CalIcon size={11} color={SC.muted} />
                      <Text style={s.meta}>{e.date}</Text>
                      <Text style={s.dot}>·</Text>
                      <MapPin size={11} color={SC.muted} />
                      <Text style={s.meta}>{e.city}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <UsersIcon size={11} color={SC.muted} />
                      <Text style={s.meta}>{e.attending} attending</Text>
                    </View>
                    {isReg ? (
                      <View style={[s.cta, { backgroundColor: SC.green, flexDirection: 'row', gap: 6 }]}>
                        <Check size={14} color="#fff" />
                        <Text style={s.ctaText}>Registered</Text>
                      </View>
                    ) : (
                      <Pressable style={s.cta} onPress={() => onRSVP(e.id)}>
                        <Text style={s.ctaText}>{e.kind === 'free' ? 'RSVP' : 'Book seat'}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {pages > 1 && (
            <View style={s.pagination}>
              <Pressable style={[s.pageBtn, page <= 1 && { opacity: 0.4 }]} onPress={() => page > 1 && fetchPage(page - 1)}>
                <Text style={s.pageBtnText}>Prev</Text>
              </Pressable>
              <Text style={s.pageInfo}>{page} / {pages}</Text>
              <Pressable style={[s.pageBtn, page >= pages && { opacity: 0.4 }]} onPress={() => page < pages && fetchPage(page + 1)}>
                <Text style={s.pageBtnText}>Next</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, justifyContent: 'center' },
  chipOn: { backgroundColor: SC.primary, borderColor: SC.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cover: { height: 90, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 },
  meta: { color: SC.muted, fontFamily: FONTS.med, fontSize: 11 },
  dot: { color: SC.dim, fontSize: 11 },
  cta: { marginTop: 12, height: 34, borderRadius: 8, backgroundColor: SC.primary, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 14 },
  pageBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SC.card, borderRadius: 8, borderWidth: 1, borderColor: SC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) },
  pageBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
  pageInfo: { color: SC.muted, fontFamily: FONTS.med, fontSize: 12 },
});
