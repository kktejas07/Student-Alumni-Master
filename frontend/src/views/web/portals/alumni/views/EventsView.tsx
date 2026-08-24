import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
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
      toast.success('RSVP confirmed', 'You\'re registered for this event.');
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
      <View className="flex-row gap-1.5 flex-wrap mb-4">
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => { setFilter(f); setPage(1); fetchPage(1); }} style={[{ paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: SC.card, borderWidth: 1, borderColor: SC.border, justifyContent: 'center' as const }, filter === f && { backgroundColor: SC.primary, borderColor: SC.primary }]}>
            <Text style={{ color: filter === f ? '#fff' : SC.muted, fontFamily: FONTS.bold, fontSize: 12 }}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View className="py-15 items-center"><ActivityIndicator size="large" color={SC.primary} /></View>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-3">
            {list.map((e) => {
              const isReg = e.registered || rsvpd.has(e.id);
              return (
                <View key={e.id} style={{ flexGrow: 1, flexBasis: 300, maxWidth: 360, backgroundColor: SC.card, borderColor: SC.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' as const }}>
                  <View style={{ height: 90, borderBottomWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: e.accent + '22', borderColor: e.accent + '40' }}>
                    <CalIcon size={28} color={e.accent} />
                  </View>
                  <View className="p-3.5">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Badge label={e.cat} color="purple" />
                      <Badge label={e.kind === 'free' ? 'FREE' : `₹${e.price}`} color={e.kind === 'free' ? 'green' : 'amber'} />
                    </View>
                    <Text numberOfLines={2} className="text-white font-body-bold text-sm leading-4.5">{e.title}</Text>
                    <View className="flex-row items-center gap-1.5 mt-2">
                      <CalIcon size={11} color={SC.muted} />
                      <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{e.date}</Text>
                      <Text style={{ color: SC.dim, fontSize: 11 }}>·</Text>
                      <MapPin size={11} color={SC.muted} />
                      <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{e.city}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <UsersIcon size={11} color={SC.muted} />
                      <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 11 }}>{e.attending} attending</Text>
                    </View>
                    {isReg ? (
                      <View style={{ marginTop: 12, height: 34, borderRadius: 8, backgroundColor: SC.green, flexDirection: 'row' as const, gap: 6, alignItems: 'center' as const, justifyContent: 'center' as const }}>
                        <Check size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>Registered</Text>
                      </View>
                    ) : (
                      <Pressable style={{ marginTop: 12, height: 34, borderRadius: 8, backgroundColor: SC.primary, alignItems: 'center' as const, justifyContent: 'center' as const }} onPress={() => onRSVP(e.id)}>
                        <Text style={{ color: '#fff', fontFamily: FONTS.xbold, fontSize: 12 }}>{e.kind === 'free' ? 'RSVP' : 'Book seat'}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {pages > 1 && (
            <View className="flex-row justify-center items-center py-4 gap-3.5">
              <Pressable style={[{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SC.card, borderRadius: 8, borderWidth: 1, borderColor: SC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }, page <= 1 && { opacity: 0.4 }]} onPress={() => page > 1 && fetchPage(page - 1)}>
                <Text className="text-white font-body-bold text-xs">Prev</Text>
              </Pressable>
              <Text style={{ color: SC.muted, fontFamily: FONTS.med, fontSize: 12 }}>{page} / {pages}</Text>
              <Pressable style={[{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: SC.card, borderRadius: 8, borderWidth: 1, borderColor: SC.border, ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}) }, page >= pages && { opacity: 0.4 }]} onPress={() => page < pages && fetchPage(page + 1)}>
                <Text className="text-white font-body-bold text-xs">Next</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}
