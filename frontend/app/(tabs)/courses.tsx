/**
 * Courses Tab — purple/Material rebrand
 * Lists curated courses (MIT/Harvard/Coursera/Udemy) with career-path filter.
 */
import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image,
  TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Card, Chip } from '@/src/views/components';
import { useCatalog, useAuth } from '@/src/viewmodels/hooks';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'job', label: 'Job' },
  { id: 'higher_education', label: 'Higher Ed' },
  { id: 'startup', label: 'Startup' },
  { id: 'business', label: 'Business' },
];

export default function CoursesTab() {
  const { user } = useAuth();
  // Default filter to user's career_path (interest-based prioritization)
  const [filter, setFilter] = useState<string>(user?.career_path || '');
  const { items, loading } = useCatalog<any>('courses', filter || undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={styles.h1}>Courses</Text>
        <Text style={styles.subtitle}>Curated free + paid courses for your path</Text>

        {/* Filter chips — drives content prioritization */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {FILTERS.map((f) => (
            <Chip key={f.id || 'all'} label={f.label}
              active={filter === f.id} onPress={() => setFilter(f.id)}
              testID={`courses-filter-${f.id || 'all'}`} />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.brandPurple} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: 12 }}>
            {items.map((c: any) => (
              <TouchableOpacity key={c.id} onPress={() => Linking.openURL(c.url)}
                activeOpacity={0.7} testID={`course-item-${c.id}`}>
                <Card padded={false} style={{ overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row' }}>
                    <Image source={{ uri: c.image }} style={styles.thumb} />
                    <View style={{ flex: 1, padding: 14, gap: 4 }}>
                      <Text style={[Typography.label, { color: C.brandPurple, fontSize: 10 }]}>
                        {c.provider}
                      </Text>
                      <Text style={[Typography.bodyBold, { color: C.textPrimary }]} numberOfLines={2}>
                        {c.title}
                      </Text>
                      <Text style={[Typography.bodySm, { color: C.textSecondary }]}>
                        {c.duration} · {c.level}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <View style={[styles.tag, c.is_free ? styles.tagFree : styles.tagPaid]}>
                          <Text style={[Typography.label, { color: c.is_free ? '#0F9D58' : C.deepPurple, fontSize: 9 }]}>
                            {c.is_free ? 'FREE' : 'PAID'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Card>
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
  h1: { ...Typography.h2, color: C.textPrimary },
  subtitle: { ...Typography.body, color: C.textSecondary, marginTop: 4, marginBottom: Spacing.md },
  chipRow: { gap: 8, marginBottom: 16, paddingRight: 16 },
  thumb: { width: 100, height: 100, backgroundColor: C.surfaceMuted },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagFree: { backgroundColor: '#E8F5E9' },
  tagPaid: { backgroundColor: C.palePurple },
});
