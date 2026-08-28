// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';

export default function EchoCampusEventRegisterPage() {
  const { slug, event } = useLocalSearchParams<{ slug: string; event: string }>();

  return (
    <View style={s.container}>
      <EchoEventsPage initialView="reg" initialSlug={slug || 'snist'} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
});
