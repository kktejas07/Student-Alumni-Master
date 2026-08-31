// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import EchoTicketsConfirmationPage from '@/src/views/web/echo/EchoTicketsConfirmationPage';

export default function EchoTicketsPage() {
  const params = useLocalSearchParams();
  const initialTab = (params.tab as any) || 'success';

  const ticketInfo = params.ticketId ? {
    ticketId: params.ticketId as string,
    eventName: params.eventName as string,
    attendeeName: params.attendeeName as string,
    email: params.email as string,
    type: params.type as string,
    amount: params.amount ? Number(params.amount) : undefined,
    date: params.date as string,
    venue: params.venue as string,
  } : undefined;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#08080F' }}>
        <EchoTicketsConfirmationPage initialTab={initialTab} ticketInfo={ticketInfo} />
      </div>
    );
  }

  return (
    <View style={s.root}>
      <EchoTicketsConfirmationPage initialTab={initialTab} ticketInfo={ticketInfo} />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08080F',
  },
});
