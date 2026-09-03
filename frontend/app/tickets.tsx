import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MyTicketsView } from '@/src/views/web/portals/student/views/MyTicketsView';

export default function TicketsPage() {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#08080F', padding: 24 }}>
        <MyTicketsView />
      </div>
    );
  }

  return (
    <View style={s.root}>
      <MyTicketsView />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08080F',
    padding: 24,
  },
});
