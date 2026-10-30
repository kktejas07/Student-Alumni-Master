/**
 * /marketplace/{slug} — Dedicated Event Marketplace page.
 * Pre-order food, beverages, and exclusive handcrafts to collect at the event.
 */
import React from 'react';
import { WebOnlyRoute } from '@/src/lib/nativeGuard';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EchoHeader, EchoFooter, ECHO_TOP_PADDING } from '@/src/views/web/components/EchoChrome';
import { EchoMarketplace } from '@/src/views/web/echo/EchoMarketplace';

const THEME_VARS = {
  '--bg': '#05060F',
  '--card': '#0C0E1B',
  '--card2': '#0E1020',
  '--panel': '#0C0E1B',
  '--panel2': '#10121E',
  '--line': '#1B1E33',
  '--line2': '#171A2C',
  '--text': '#F4F5FB',
  '--text2': '#D5D8E4',
  '--muted': '#9AA0B4',
  '--violet': '#7C5CFC',
  '--violet-lt': '#A78BFA',
  '--ok': '#34D399',
  '--warn': '#F59E0B',
  '--danger': '#F87186',
} as React.CSSProperties;

function EchoMarketplacePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <div style={{ ...THEME_VARS, minHeight: '100vh', background: '#05060F', color: '#F4F5FB', overflowY: 'auto' }}>
      <EchoHeader />
      <div style={{ paddingTop: ECHO_TOP_PADDING, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '0 20px' }}>
        <EchoMarketplace slug={slug || ''} isDark />
      </div>
      <EchoFooter />
    </div>
  );
}

/**
 * Native guard — this route renders web-only UI. On iOS/Android show a
 * placeholder that opens the page on studentalumni.ai instead of crashing.
 */
export default function EchoMarketplacePageRoute() {
  if (Platform.OS !== 'web') return <WebOnlyRoute />;
  return <EchoMarketplacePage />;
}
