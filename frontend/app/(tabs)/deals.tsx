/**
 * Deals tab — Exclusive student offers
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tag, ExternalLink } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Chip, NeoCard, ScreenHeader } from '@/src/views/components';
import { useCatalog } from '@/src/viewmodels/hooks';

const C = Colors.light;

const CATEGORIES = ['All', 'Tech', 'Education', 'Productivity', 'Design', 'Food', 'Entertainment', 'Shopping'];

export default function DealsTab() {
  const [category, setCategory] = useState('All');
  const { items, loading } = useCatalog<any>('deals', category === 'All' ? undefined : category);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Student Deals" subtitle="Exclusive offers for verified students" />

        <NeoCard bg={C.accentPink} shadow="md" style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.iconBubble}>
              <Tag size={28} color={C.textPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.bodyBold, { color: C.textPrimary }]}>Save $200K+ this year</Text>
              <Text style={[Typography.bodySm, { color: C.textPrimary, opacity: 0.85 }]}>
                Use your unique ID to claim student-only discounts.
              </Text>
            </View>
          </View>
        </NeoCard>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={category === c}
              onPress={() => setCategory(c)}
              color={C.accentYellow}
              testID={`deals-filter-${c}`}
            />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {items.map((d: any) => (
              <TouchableOpacity
                key={d.id}
                onPress={() => Linking.openURL(d.url)}
                activeOpacity={0.85}
                testID={`deal-item-${d.id}`}
              >
                <NeoCard shadow="sm">
                  <Image source={{ uri: d.image }} style={styles.dealImg} />
                  <View style={{ marginTop: 12, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[Typography.caption, { color: C.textSecondary }]}>{d.brand}</Text>
                      <View style={[styles.tag, { backgroundColor: C.accentMint }]}>
                        <Text style={[Typography.caption, { color: C.textPrimary, fontSize: 10 }]}>{d.category}</Text>
                      </View>
                    </View>
                    <Text style={[Typography.h4, { color: C.textPrimary }]}>{d.title}</Text>
                    <Text style={[Typography.bodyBold, { color: C.accentPink }]}>{d.discount}</Text>
                    <View style={styles.codeBox}>
                      <Text style={[Typography.caption, { color: C.textSecondary }]}>CODE</Text>
                      <Text style={[Typography.bodyBold, { color: C.textPrimary, letterSpacing: 1 }]}>
                        {d.code}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <ExternalLink size={14} color={C.accentBlue} />
                      <Text style={[Typography.bodySm, { color: C.accentBlue }]}>Tap to open offer</Text>
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
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealImg: { width: '100%', height: 140, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceMuted },
  tag: { borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  codeBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: C.surfaceMuted,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
});
