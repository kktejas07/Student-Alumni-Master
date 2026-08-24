/**
 * LiveStrip — reusable live counters banner with auto-refresh (15s).
 * Used across all 4 portals (Student, Mentor, College, Admin) to show
 * global counts ticking in real-time so the user can SEE auto-refresh.
 *
 * Usage:
 *   <LiveStrip
 *     accent="#22C55E"           // pulse + label color
 *     keys={['users', 'bookings', 'applications', 'workshops']}
 *     labels={{ users: 'users', bookings: 'sessions', ... }}
 *   />
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { usePortalData } from '@/src/lib/portalApi';

type Counters = Record<string, number | string> & { as_of?: string };

const DEFAULT_LABELS: Record<string, string> = {
  users: 'users',
  students: 'students',
  mentors: 'mentors',
  colleges: 'colleges',
  bookings: 'bookings',
  bookings_today: 'sessions today',
  applications: 'applications',
  events: 'events',
  rsvps: 'RSVPs',
  workshops: 'workshops',
  courses: 'courses',
};

export function LiveStrip({
  accent = '#22C55E',
  keys = ['users', 'bookings', 'applications', 'workshops'],
  labels = DEFAULT_LABELS,
  refreshMs = 15_000,
}: {
  accent?: string;
  keys?: string[];
  labels?: Record<string, string>;
  refreshMs?: number;
}) {
  const { data } = usePortalData<Counters>('/live/counters', null as any, refreshMs);
  if (!data) return null;

  return (
    <View style={[s.strip, { backgroundColor: accent + '11', borderColor: accent + '40' }]}>
      <View style={[s.pulse, { backgroundColor: accent }, Platform.OS === 'web' && ({ boxShadow: `0 0 8px ${accent}, 0 0 14px ${accent}` } as any)]} />
      <Text style={[s.label, { color: accent }]}>LIVE</Text>
      <Text style={s.txt}>
        {keys.map((k, i) => (
          <Text key={k}>
            {i > 0 && <Text> · </Text>}
            <Text style={[s.num, { color: accent }]}>
              {(data[k] as number) ?? 0}
            </Text>
            <Text> {labels[k] || k}</Text>
          </Text>
        ))}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={s.asOf}>auto-refreshing every {Math.round(refreshMs / 1000)}s</Text>
    </View>
  );
}

const s = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1,
  },
  pulse: { width: 8, height: 8, borderRadius: 4 },
  label: {
    fontSize: 10, letterSpacing: 1,
    fontFamily: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'System' }) as string,
    fontWeight: '800',
  },
  txt: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'System' }) as string,
    fontWeight: '500',
  },
  num: { fontWeight: '800' },
  asOf: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 11, fontStyle: 'italic',
    fontFamily: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'System' }) as string,
  },
});
