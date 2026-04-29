/**
 * Courses tab — list, filter, link to provider
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Chip, NeoCard, ScreenHeader } from '@/src/views/components';
import { useCatalog } from '@/src/viewmodels/hooks';
import { useAuth } from '@/src/viewmodels/hooks';

const C = Colors.light;

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'job', label: 'Job' },
  { id: 'higher_education', label: 'Higher Ed' },
  { id: 'startup', label: 'Startup' },
  { id: 'business', label: 'Business' },
];

export default function CoursesTab() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>(user?.career_path || '');
  const { items, loading } = useCatalog<any>('courses', filter || undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Courses" subtitle="Curated free + paid courses for your path" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.id || 'all'}
              label={f.label}
              active={filter === f.id}
              onPress={() => setFilter(f.id)}
              color={C.accentMint}
              testID={`courses-filter-${f.id || 'all'}`}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ padding: 40 }}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {items.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => Linking.openURL(c.url)}
                testID={`course-item-${c.id}`}
                activeOpacity={0.85}
              >
                <NeoCard shadow="sm">
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Image source={{ uri: c.image }} style={styles.thumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.caption, { color: C.textSecondary }]}>{c.provider}</Text>
                      <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={2}>
                        {c.title}
                      </Text>
                      <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 2 }]}>
                        {c.duration} · {c.level}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <View style={[styles.tag, { backgroundColor: c.is_free ? C.accentMint : C.accentYellow }]}>
                          <Text style={[Typography.caption, { color: C.textPrimary, fontSize: 10 }]}>
                            {c.is_free ? 'FREE' : 'PAID'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </NeoCard>
              </TouchableOpacity>
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
  thumb: { width: 90, height: 90, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceMuted },
  tag: { borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});
