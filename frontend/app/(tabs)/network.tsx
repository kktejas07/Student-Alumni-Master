/**
 * Network tab — Mentors & Alumni discovery (PhonePe-style with animations)
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star, MessageCircle } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Button, Chip, AnimatedCard, ScreenHeader } from '@/src/views/components';
import { useCatalog, useAuth } from '@/src/viewmodels/hooks';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'job', label: 'Job' },
  { id: 'higher_education', label: 'Higher Ed' },
  { id: 'startup', label: 'Startup' },
  { id: 'business', label: 'Business' },
];

export default function NetworkTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>(user?.career_path || '');
  const { items: mentors, loading } = useCatalog<any>('mentors', filter || undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Network" subtitle="Mentors & alumni in your career path" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.id || 'all'}
              label={f.label}
              active={filter === f.id}
              onPress={() => setFilter(f.id)}
              testID={`network-filter-${f.id || 'all'}`}
            />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.brandPurple} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {mentors.map((m: any, idx: number) => (
              <AnimatedCard
                key={m.id}
                onPress={() =>
                  router.push({
                    pathname: '/mentor/[id]',
                    params: {
                      id: m.id,
                      name: m.full_name,
                      title: m.title,
                      bio: m.bio,
                      avatar: m.avatar,
                      rating: String(m.rating),
                      sessions: String(m.sessions),
                      linkedin: m.linkedin_url || '',
                      tags: (m.tags || []).join(','),
                    },
                  })
                }
                index={idx}
                testID={`mentor-card-${m.id}`}
              >
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Image source={{ uri: m.avatar }} style={styles.avatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>{m.full_name}</Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{m.title}</Text>
                    <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4 }]} numberOfLines={2}>
                      {m.bio}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' }}>
                      <Star size={14} color={C.warning} fill={C.warning} />
                      <Text style={[Typography.bodySm, { color: C.textPrimary }]}>{m.rating}</Text>
                      <Text style={[Typography.bodySm, { color: C.textSecondary }]}>· {m.sessions} sessions</Text>
                    </View>
                  </View>
                </View>
                <View style={{ marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MessageCircle size={14} color={C.brandPurple} />
                  <Text style={[Typography.bodySm, { color: C.brandPurple, fontFamily: 'DMSans_600SemiBold' }]}>
                    Tap to view profile & book
                  </Text>
                </View>
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: { padding: Spacing.lg, paddingBottom: 100 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: C.border, backgroundColor: C.surfaceMuted },
});
