/**
 * Internships listing screen
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, IndianRupee, Clock } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Chip, NeoCard } from '@/src/views/components';
import { useCatalog, useAuth } from '@/src/viewmodels/hooks';

const C = Colors.light;

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'job', label: 'Job' },
  { id: 'higher_education', label: 'Higher Ed' },
  { id: 'startup', label: 'Startup' },
  { id: 'business', label: 'Business' },
];

export default function Internships() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>(user?.career_path || '');
  const { items, loading } = useCatalog<any>('internships', filter || undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} testID="internships-back-btn" style={styles.back}>
            <ArrowLeft size={24} color={C.textPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Internships</Text>
        <Text style={styles.subtitle}>Hand-picked opportunities from top companies</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 16, marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.id || 'all'}
              label={f.label}
              active={filter === f.id}
              onPress={() => setFilter(f.id)}
              color={C.accentPink}
              testID={`internship-filter-${f.id || 'all'}`}
            />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {items.map((i: any) => (
              <TouchableOpacity
                key={i.id}
                onPress={() => Linking.openURL(i.url)}
                activeOpacity={0.85}
                testID={`internship-item-${i.id}`}
              >
                <NeoCard shadow="sm">
                  <Image source={{ uri: i.image }} style={styles.img} />
                  <View style={{ marginTop: 10 }}>
                    <Text style={[Typography.caption, { color: C.textSecondary }]}>{i.company}</Text>
                    <Text style={[Typography.h4, { color: C.textPrimary }]}>{i.title}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <MapPin size={14} color={C.textSecondary} />
                        <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{i.location}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <IndianRupee size={14} color={C.textSecondary} />
                        <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{i.stipend}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={14} color={C.textSecondary} />
                        <Text style={[Typography.bodySm, { color: C.textSecondary }]}>{i.duration}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {i.skills.map((s: string) => (
                        <View key={s} style={styles.skillTag}>
                          <Text style={[Typography.caption, { color: C.textPrimary, fontSize: 10 }]}>{s}</Text>
                        </View>
                      ))}
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
  container: { padding: Spacing.lg, paddingBottom: 60 },
  header: { flexDirection: 'row' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.h2, color: C.textPrimary, marginTop: 4 },
  subtitle: { ...Typography.body, color: C.textSecondary, marginTop: 4 },
  img: { width: '100%', height: 130, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceMuted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  skillTag: { borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: C.accentYellow },
});
