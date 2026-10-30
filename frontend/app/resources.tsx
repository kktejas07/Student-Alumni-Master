/**
 * Student Resources - Insurance, Housing, Loans
 */
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Shield, Home, CreditCard, ExternalLink } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/src/theme';
import { Chip, NeoCard } from '@/src/views/components';
import { useCatalog } from '@/src/viewmodels/hooks';

const C = Colors.light;

const TABS = [
  { id: 'insurance', label: 'Insurance', icon: Shield, color: C.accentMint },
  { id: 'housing', label: 'Housing', icon: Home, color: C.accentBlue },
  { id: 'loans', label: 'Loans', icon: CreditCard, color: C.accentYellow },
];

export default function ResourcesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cat?: string }>();
  const [tab, setTab] = useState<string>(params.cat || 'insurance');
  const { items, loading } = useCatalog<any>('resources', tab);

  const tabInfo = TABS.find((t) => t.id === tab);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} testID="resources-back-btn" style={styles.back}>
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>Student Resources</Text>
        <Text style={styles.subtitle}>Insurance, housing & education loan options curated for you</Text>

        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              activeOpacity={0.85}
              testID={`resource-tab-${t.id}`}
              style={{ flex: 1 }}
            >
              <NeoCard bg={tab === t.id ? t.color : C.surface} shadow={tab === t.id ? 'md' : 'sm'}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <t.icon size={22} color={C.textPrimary} />
                  <Text style={[Typography.bodyBold, { color: C.textPrimary, fontSize: 13 }]}>{t.label}</Text>
                </View>
              </NeoCard>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ padding: 40 }} />
        ) : (
          <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
            {items.map((r: any) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => Linking.openURL(r.url)}
                activeOpacity={0.85}
                testID={`resource-item-${r.id}`}
              >
                <NeoCard shadow="sm">
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.caption, { color: C.textSecondary }]}>{r.provider}</Text>
                      <Text style={[Typography.h4, { color: C.textPrimary }]}>{r.title}</Text>
                      <Text style={[Typography.bodySm, { color: C.textSecondary, marginTop: 4 }]}>{r.description}</Text>
                    </View>
                    <View style={[styles.highlight, { backgroundColor: tabInfo?.color || C.accentYellow }]}>
                      <Text style={[Typography.caption, { color: C.textPrimary, fontSize: 10 }]}>{r.highlight}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    <ExternalLink size={14} color={C.accentBlue} />
                    <Text style={[Typography.bodySm, { color: C.accentBlue }]}>Learn more</Text>
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
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.h2, color: C.textPrimary, marginTop: 4 },
  subtitle: { ...Typography.body, color: C.textSecondary, marginTop: 4, marginBottom: Spacing.lg },
  tabRow: { flexDirection: 'row', gap: 10 },
  highlight: {
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
});
