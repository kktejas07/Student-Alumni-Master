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
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, Platform,
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
      style={{ flex: 1, backgroundColor: 'transparent' }}
      contentContainerStyle={[
        styles.scroll,
        !isWide && styles.scrollMobile,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{pageTitle}</Text>
          <Text style={styles.pageSub}>{pageSubtitle}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={16} color="rgba(255,255,255,0.45)" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={searchPlaceholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={styles.searchInput}
        />
      </View>

      {/* Hero bento row */}
      {hero && hero.length > 0 && (
        <View style={[styles.heroRow, !isWide && { flexDirection: 'column' }]}>
          {hero.map((h) => (
            <BentoTile
              key={h.id}
              span={!isWide ? 1 : (h.span || 1)}
              gradient={h.gradient}
              onPress={h.onPress}
              minHeight={isWide ? 180 : 130}
            >
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={styles.heroEmojiBubble}>
                    <Text style={{ fontSize: 24 }}>{h.emoji}</Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.heroTileTitle}>{h.title}</Text>
                  <Text style={styles.heroTileSub} numberOfLines={2}>{h.subtitle}</Text>
                  <View style={styles.heroCta}>
                    <Text style={styles.heroCtaText}>{h.cta}</Text>
                    <ArrowRight size={14} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </BentoTile>
          ))}
        </View>
      )}

      {/* Category sections */}
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

const styles = StyleSheet.create({
  scroll: { padding: 22, paddingBottom: 60, gap: 14 },
  scrollMobile: { padding: 14, paddingBottom: 90, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 26, letterSpacing: -0.5 },
  pageSub:   { color: 'rgba(255,255,255,0.55)', fontFamily: 'DMSans_400Regular', fontSize: 13.5, marginTop: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1, color: '#FFFFFF',
    fontFamily: 'DMSans_400Regular', fontSize: 14,
    ...({ outlineStyle: 'none' } as any),
  },
  heroRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  heroEmojiBubble: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.22)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTileTitle: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 18, letterSpacing: -0.3 },
  heroTileSub:   { color: 'rgba(255,255,255,0.78)', fontFamily: 'DMSans_400Regular', fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  heroCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  heroCtaText: { color: '#FFFFFF', fontFamily: 'DMSans_700Bold', fontSize: 12 },
});
