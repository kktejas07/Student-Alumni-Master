/**
 * ExploreScreen — generic category-browser layout.
 * Used by Courses, Internships, Network, and Resources pages on both web + mobile.
 *
 * Renders:
 *   • Top bar (greeting / page header + search)
 *   • Optional hero bento row (glowing tiles with gradients)
 *   • Sections: each is a glass card containing a grid of IconBubbles
 */
import { ReactNode, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ArrowRight } from 'lucide-react-native';
import { GlowCard, CategorySection, BentoTile } from './BentoComponents';

const IS_WEB = Platform.OS === 'web';

export type ExploreSection = {
  id: string;
  title: string;
  emoji?: string;
  items: { id: string; label: string; icon: ReactNode; onPress?: () => void; glow?: string }[];
};

export type ExploreHeroTile = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  emoji: string;
  gradient: string[];
  span?: 1 | 2 | 3;
  onPress?: () => void;
};

export function ExploreScreen({
  pageTitle,
  pageSubtitle,
  searchPlaceholder = 'Find anything…',
  hero,
  sections,
}: {
  pageTitle: string;
  pageSubtitle: string;
  searchPlaceholder?: string;
  hero?: ExploreHeroTile[];
  sections: ExploreSection[];
}) {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const [q, setQ] = useState('');

  return (
    <ScrollView
      className="flex-1 bg-transparent"
      contentContainerStyle={isWide
        ? { padding: 22, paddingBottom: 60, gap: 14 }
        : { padding: 14, paddingBottom: 90, gap: 12 }
      }
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-white font-body-bold text-2xl tracking-tight">{pageTitle}</Text>
          <Text className="text-text text-[13.5px] font-body-regular mt-1">{pageSubtitle}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-2.5 bg-glass border border-glass-border rounded-[14px] px-3.5 py-2.5">
        <Search size={16} color="rgba(255,255,255,0.45)" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={searchPlaceholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          className="flex-1 text-white font-body-regular text-sm"
          style={{ outlineStyle: 'none' } as any}
        />
      </View>

      {hero && hero.length > 0 && (
        <View className="flex-row gap-3 mb-1" style={!isWide ? { flexDirection: 'column' } : undefined}>
          {hero.map((h) => (
            <BentoTile
              key={h.id}
              span={!isWide ? 1 : (h.span || 1)}
              gradient={h.gradient}
              onPress={h.onPress}
              minHeight={isWide ? 180 : 130}
            >
              <View className="flex-1 justify-between">
                <View className="flex-row justify-between items-start">
                  <View className="w-[50px] h-[50px] rounded-[14px] bg-white/16 border border-white/22 items-center justify-center">
                    <Text className="text-2xl">{h.emoji}</Text>
                  </View>
                </View>
                <View>
                  <Text className="text-white font-body-bold text-lg tracking-tight">{h.title}</Text>
                  <Text className="text-white/78 font-body-regular text-[12.5px] mt-1 leading-4" numberOfLines={2}>{h.subtitle}</Text>
                  <View className="flex-row items-center gap-1.5 mt-3 bg-white/18 border border-white/25 px-3.5 py-[7px] rounded-full self-start">
                    <Text className="text-white font-body-bold text-xs">{h.cta}</Text>
                    <ArrowRight size={14} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </BentoTile>
          ))}
        </View>
      )}

      {sections.map((section) => (
        <CategorySection
          key={section.id}
          title={section.title}
          emoji={section.emoji}
          items={section.items}
          columns={isWide ? 6 : 4}
        />
      ))}
    </ScrollView>
  );
}
