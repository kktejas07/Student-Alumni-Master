// @ts-nocheck
/**
 * /echo — public ECHO events catalog, showcases and registration.
 * Built directly per the user design specification with 3 interactive views:
 *   1. Events List View: Explore ECHO Events by College
 *   2. Event Detail View: Full event info, highlights, organizers, and timeline
 *   3. Registration View: Dynamic fees (Individual vs Team), form details & Razorpay checkout
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EchoEventsPage } from '@/src/views/web/echo/EchoEventsPage';

export default function EchoIndexPage() {
  return (
    <View style={s.root}>
      <EchoEventsPage initialView="list" />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
});
