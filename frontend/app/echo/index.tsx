// @ts-nocheck
/**
 * /echo — public ECHO events catalog, showcases and registration.
 * Renders the dedicated EchoEventsPage component with SNIST HackWave 3.0 flagship showcase,
 * poster gallery, speakers, 7 verticals, perks vault, and Razorpay registration checkout.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import EchoEventsPage from '@/src/views/web/echo/EchoEventsPage';

export default function EchoIndexPage() {
  return (
    <View style={s.root}>
      <EchoEventsPage initialView="detail" initialSlug="snist" />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
});
