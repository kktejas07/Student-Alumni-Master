/**
 * /echo/{slug}/marketplace — Dedicated Event Marketplace page.
 * Pre-order food, beverages, and exclusive handcrafts to collect at the event.
 */
import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EchoMarketplace } from '@/src/views/web/echo/EchoMarketplace';

export default function EchoMarketplacePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return <EchoMarketplace slug={slug || ''} isDark />;
}
