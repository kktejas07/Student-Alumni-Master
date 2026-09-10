// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';

export default function EchoSnistShowcasePage() {
  return (
    <View style={s.container}>
      <EchoEventsPage initialView="detail" initialSlug="snist" />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
});
