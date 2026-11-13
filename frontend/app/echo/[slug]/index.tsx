// @ts-nocheck
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';

export default function EchoShowcasePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slug]);

  return (
    <View style={s.container}>
      <EchoEventsPage initialView="detail" initialSlug={slug || 'snist'} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#0A0A14',
  },
});
