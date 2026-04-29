/**
 * Deals Tab — purple/Material rebrand
 * Module 8 per spec: Exclusive student discounts & coupons.
 */
import { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image,
  TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tag, ExternalLink } from 'lucide-react-native';
import { Colors as C, Spacing, Typography } from '@/src/theme';
import { Card, Chip } from '@/src/views/components';
import { useCatalog } from '@/src/viewmodels/hooks';

const CATEGORIES = ['All', 'Tech', 'Education', 'Productivity', 'Design', 'Food', 'Entertainment', 'Shopping'];

export default function DealsTab() {
  const [category, setCategory] = useState('All');
  const { items, loading } = useCatalog<any>('deals',
    category === 'All' ? undefined : category);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>Student Deals</Text>
        <Text style={styles.subtitle}>Exclusive offers verified for you</Text>

        {/* Hero banner — uses deep purple per brand */}
        <Card style={styles.heroBanner} bg={C.deepPurple}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.heroIcon}>
              <Tag size={24} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.bodyBold, { color: C.white }]}>Save $200K+ this year</Text>
              <Text style={[Typography.bodySm, { color: C.lightPurple, marginTop: 2 }]}>
                Verified students unlock all offers
              </Text>
            </View>
          </View>
        </Card>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c}
              onPress={() => setCategory(c)}
              testID={`deals-filter-${c}`} />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={C.brandPurple} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: 14 }}>
            {items.map((d: any) => (
              <TouchableOpacity key={d.id} onPress={() => Linking.openURL(d.url)}
                activeOpacity={0.7} testID={`deal-item-${d.id}`}>
                <Card padded={false} style={{ overflow: 'hidden' }}>
                  <Image source={{ uri: d.image }} style={styles.dealImg} />
                  <View style={{ padding: 14, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[Typography.label, { color: C.textSecondary, fontSize: 10 }]}>
                        {d.brand}
                      </Text>
                      <View style={styles.catTag}>
                        <Text style={[Typography.label, { color: C.deepPurple, fontSize: 9 }]}>{d.category}</Text>
                      </View>
                    </View>
                    <Text style={[Typography.h4, { color: C.textPrimary }]}>{d.title}</Text>
                    <Text style={[Typography.bodyBold, { color: C.brandPurple, fontSize: 16 }]}>
                      {d.discount}
                    </Text>
                    <View style={styles.codeBox}>
                      <Text style={[Typography.label, { color: C.textSecondary, fontSize: 9 }]}>CODE</Text>
                      <Text style={[Typography.bodyBold, { color: C.textPrimary, letterSpacing: 1 }]}>
                        {d.code}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <ExternalLink size={14} color={C.brandPurple} />
                      <Text style={[Typography.bodySm, { color: C.brandPurple }]}>Tap to redeem</Text>
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
  heroBanner: { padding: 18, marginBottom: 20 },
  heroIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  chipRow: { gap: 8, marginBottom: 16, paddingRight: 16 },
  dealImg: { width: '100%', height: 140, backgroundColor: C.surfaceMuted },
  catTag: { backgroundColor: C.palePurple, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surfaceMuted, padding: 10, borderRadius: 10,
    marginTop: 4, borderWidth: 1, borderColor: C.palePurple, borderStyle: 'dashed',
  },
});
