import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Calendar as CalIcon, Plus } from 'lucide-react-native';
import { CC, FONTS } from '../tokens';
import { Badge } from '../atoms';
import { usePortalData, patchPortal } from '@/src/lib/portalApi';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export const STATUS_OPTIONS = [
  'Upcoming',
  'Live',
  'Completed',
  'Not Completed',
  'Registrations Open',
  'Registrations Closed',
] as const;

type Ev = {
  id: string;
  title: string;
  date: string;
  mode: string;
  city: string;
  cat: string;
  attending: number;
  capacity: number;
  accent: string;
  price?: number | null;
  status?: string;
  event_status_badge?: string;
};
const FALLBACK = { items: [] as Ev[] };

export function EventsView({ onNavigate }: { onNavigate?: (id: any) => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const collegeName = user?.college_info?.institution_name || user?.school_info?.institution_name || '';
  const path = collegeName ? `/college/events?college_name=${encodeURIComponent(collegeName)}` : '/college/events';
  const { data, refresh } = usePortalData<typeof FALLBACK>(path, FALLBACK);
  const events = data?.items || [];
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const quickUpdateStatus = async (e: Ev, badge: string) => {
    setUpdatingId(e.id);
    try {
      await patchPortal(`/events/${e.id}`, { body: { event_status_badge: badge } });
      refresh();
    } catch (err) {
      console.error('Failed to update event status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 16 }}>All Events ({events.length})</Text>
        <View style={{ flex: 1 }} />
        <Pressable style={s.cta} onPress={() => onNavigate?.('create-event')}>
          <Plus size={14} color="#fff" />
          <Text style={s.ctaText}>Create Event</Text>
        </Pressable>
      </View>
      <View style={s.grid}>
        {events.map((e) => (
          <View key={e.id} style={[s.card, { flexGrow: 1, flexBasis: 300, maxWidth: 360 }]}>
            <View style={[s.icon, { backgroundColor: e.accent + '20', borderColor: e.accent + '40' }]}><CalIcon size={20} color={e.accent} /></View>
            <Text numberOfLines={2} style={s.title}>{e.title}</Text>
            <Text style={s.date}>{e.date} · {e.mode}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge label={`${e.attending} attending`} color="cyan" />
              <Badge
                label={e.event_status_badge || 'Upcoming'}
                color={
                  e.event_status_badge === 'Completed' || e.event_status_badge === 'Registrations Open'
                    ? 'green'
                    : (e.event_status_badge === 'Live' || e.event_status_badge === 'Registrations Closed' || e.event_status_badge === 'Not Completed')
                    ? 'red'
                    : 'amber'
                }
              />
            </View>

            {/* Quick Status Bar */}
            <View style={{ marginTop: 10, gap: 4 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: CC.muted, letterSpacing: 0.6 }}>
                STATUS BAR
              </Text>
              <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map((badge) => {
                  const cur = (e.event_status_badge || 'Upcoming') === badge;
                  return (
                    <Pressable
                      key={badge}
                      disabled={updatingId === e.id}
                      onPress={() => quickUpdateStatus(e, badge)}
                      style={[
                        s.quickChip,
                        cur && s.quickChipActive,
                        cur && (badge === 'Completed' || badge === 'Registrations Open') && { backgroundColor: 'rgba(16,185,129,0.22)', borderColor: '#10B981' },
                        cur && (badge === 'Live' || badge === 'Registrations Closed' || badge === 'Not Completed') && { backgroundColor: 'rgba(239,68,68,0.22)', borderColor: '#EF4444' },
                        cur && badge === 'Upcoming' && { backgroundColor: 'rgba(245,158,11,0.22)', borderColor: '#F59E0B' },
                      ]}
                    >
                      <Text style={[s.quickChipText, cur && { color: '#FFFFFF', fontFamily: FONTS.bold }]}>
                        {badge}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              style={s.manage}
              onPress={() => router.push({
                pathname: `/manage-event/${e.id}` as any,
                params: {
                  id: e.id,
                  title: e.title,
                  start_date: e.date,
                  venue: e.city || 'Online',
                  registration_deadline: e.date,
                  category: e.cat || 'Workshop',
                  organizer: 'Institution Partner',
                  image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400',
                  url: '',
                  tags: 'Networking,Career,Academic',
                  price: e.price !== undefined && e.price !== null ? String(e.price) : '',
                  status: e.status || 'published',
                  event_status_badge: e.event_status_badge || 'Upcoming',
                }
              })}
            >
              <Text style={s.manageText}>Manage →</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  cta: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 34, borderRadius: 10, backgroundColor: CC.primary },
  ctaText: { color: '#FFFFFF', fontFamily: FONTS.xbold, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: CC.card, borderColor: CC.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  icon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: '#FFFFFF', fontFamily: FONTS.bold, fontSize: 14, lineHeight: 18 },
  date: { color: CC.muted, fontFamily: FONTS.med, fontSize: 11.5, marginTop: 4 },
  manage: { marginTop: 12, height: 32, borderRadius: 8, backgroundColor: CC.card, borderWidth: 1, borderColor: CC.border2, alignItems: 'center', justifyContent: 'center' },
  manageText: { color: CC.accentBright, fontFamily: FONTS.bold, fontSize: 12 },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  quickChipActive: {
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 10,
    fontFamily: FONTS.med,
    color: CC.muted,
  },
});
