// @ts-nocheck
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';

export default function EchoSnistShowcasePage() {
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <View style={s.container}>
      <EchoEventsPage initialView="detail" initialSlug="snist" />
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
