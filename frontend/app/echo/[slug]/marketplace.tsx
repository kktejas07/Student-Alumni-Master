/**
 * /echo/{slug}/marketplace — Dedicated Event Marketplace page.
 * Pre-order food, beverages, and exclusive handcrafts to collect at the event.
 */
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { EchoMarketplace } from '@/src/views/web/echo/EchoMarketplace';

export default function EchoMarketplacePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <View style={s.root}>
      <EchoHeader />
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.content}>
          <EchoMarketplace slug={slug || ''} isDark />
        </View>
        <EchoFooter />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0f1e' },
  scrollContent: { paddingTop: ECHO_TOP_PADDING },
  content: { maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 20 },
});
