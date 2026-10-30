// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';

export default function EchoCampusEventPage() {
  const { slug, event } = useLocalSearchParams<{ slug: string; event: string }>();

  return (
    <View style={s.container}>
      {/* No event-slug defaulting: a missing slug must never render another
          event's content — fall back to the events list instead. */}
      <EchoEventsPage initialView={slug ? 'detail' : 'list'} initialSlug={slug} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
});
