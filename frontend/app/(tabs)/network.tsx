/**
 * Network tab — Mentors & Alumni discovery
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, MessageCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Button, Chip, NeoCard, ScreenHeader } from '@/src/views/components';
import { useCatalog, useAuth } from '@/src/viewmodels/hooks';

const C = Colors.light;

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'job', label: 'Job' },
  { id: 'higher_education', label: 'Higher Ed' },
  { id: 'startup', label: 'Startup' },
  { id: 'business', label: 'Business' },
];

export default function NetworkTab() {
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
              color={C.accentBlue}
              testID={`network-filter-${f.id || 'all'}`}
            />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {mentors.map((m: any) => (
              <NeoCard key={m.id} shadow="sm" testID={`mentor-card-${m.id}`}>
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
                <Button
                  title="View profile & book"
                  variant="secondary"
                  icon={<MessageCircle size={16} color={C.brandPurple} />}
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
                  testID={`mentor-connect-${m.id}`}
                  style={{ marginTop: 12 }}
                />
              </NeoCard>
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
