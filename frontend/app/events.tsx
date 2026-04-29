/**
 * Events List Screen
 * ====================
 * Module 2 per spec: Tech/cultural events, hackathons, workshops.
 * Events with imminent deadlines are surfaced first (real-time priority).
 */
import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { AnimatedCard, Chip, CountdownBadge } from '@/src/views/components';
import { useCatalog } from '@/src/viewmodels/hooks';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'hackathon', label: 'Hackathons' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'fest', label: 'Fests' },
  { id: 'networking', label: 'Networking' },
  { id: 'startup', label: 'Startup' },
];

// Helper: returns # of days until ISO date (negative if past)
function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const diff = (target.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

export default function EventsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const { items, loading } = useCatalog<any>('events', filter || undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} testID="events-back-btn" style={styles.back}>
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.h1}>Events</Text>
        <Text style={styles.subtitle}>Hackathons · Workshops · Fests · Networking meets</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {FILTERS.map((f) => (
            <Chip key={f.id || 'all'} label={f.label}
              active={filter === f.id} onPress={() => setFilter(f.id)}
              testID={`events-filter-${f.id || 'all'}`} />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.brandPurple} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: 14 }}>
            {items.map((e: any, idx: number) => {
              const days = daysUntil(e.registration_deadline);
              return (
                <AnimatedCard
                  key={e.id}
                  onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id, ...e, tags: (e.tags || []).join(',') } })}
                  padded={false}
                  style={{ overflow: 'hidden' }}
                  index={idx}
                  testID={`event-item-${e.id}`}
                >
                  <Image source={{ uri: e.image }} style={styles.img} />
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={[Typography.label, { color: C.brandPurple, fontSize: 10, flex: 1 }]} numberOfLines={1}>
                        {e.category?.toUpperCase()} · {e.organizer}
                      </Text>
                      {days !== null && days >= 0 && days <= 14 && (
                        <CountdownBadge days={days} />
                      )}
                    </View>
                    <Text style={[Typography.h4, { color: C.textPrimary, marginTop: 4 }]}>
                      {e.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Calendar size={14} color={C.textSecondary} />
                      <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{e.start_date}</Text>
                      <MapPin size={14} color={C.textSecondary} />
                      <Text style={[Typography.bodySm, { color: C.textSecondary }]} numberOfLines={1}>
                        {e.venue}
                      </Text>
                    </View>
                    <Text style={[Typography.bodySm, { color: C.warning, marginTop: 6, fontFamily: 'DMSans_600SemiBold' }]}>
                      Register by {e.registration_deadline}
                    </Text>
                  </View>
                </AnimatedCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 60 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  h1: { ...Typography.h2, color: C.textPrimary },
  subtitle: { ...Typography.body, color: C.textSecondary, marginTop: 4, marginBottom: Spacing.md },
  chipRow: { gap: 8, marginBottom: 16, paddingRight: 16 },
  img: { width: '100%', height: 160, backgroundColor: C.surfaceMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
});
