/**
 * Student Resources - Insurance, Housing, Loans
 */
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-bg2" edges={['top', 'bottom']}>
      <ScrollView className="p-4 pb-16">
        <TouchableOpacity onPress={() => router.back()} testID="resources-back-btn" className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={24} color={C.textPrimary} />
        </TouchableOpacity>

        <Text className="text-text font-display-bold text-lg mt-1">Student Resources</Text>
        <Text className="text-muted text-sm mt-1 mb-4">Insurance, housing & education loan options curated for you</Text>

        <View className="flex-row gap-2.5">
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              activeOpacity={0.85}
              testID={`resource-tab-${t.id}`}
              className="flex-1"
            >
              <NeoCard bg={tab === t.id ? t.color : C.surface} shadow={tab === t.id ? 'md' : 'sm'}>
                <View className="items-center" style={{ gap: 6 }}>
                  <t.icon size={22} color={C.textPrimary} />
                  <Text className="text-text font-body-bold text-sm">{t.label}</Text>
                </View>
              </NeoCard>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} className="mt-10" />
        ) : (
          <View className="mt-4" style={{ gap: Spacing.md }}>
            {items.map((r: any) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => Linking.openURL(r.url)}
                activeOpacity={0.85}
                testID={`resource-item-${r.id}`}
              >
                <NeoCard shadow="sm">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-muted text-xs">{r.provider}</Text>
                      <Text className="text-text font-display-bold text-base">{r.title}</Text>
                      <Text className="text-muted text-sm mt-1">{r.description}</Text>
                    </View>
                    <View className="rounded-md ml-2" style={{ borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: tabInfo?.color || C.accentYellow }}>
                      <Text className="text-text font-body-bold text-xs">{r.highlight}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mt-3" style={{ gap: 6 }}>
                    <ExternalLink size={14} color={C.accentBlue} />
                    <Text className="text-teal text-sm">Learn more</Text>
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
