import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

export function SunsetHero({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#08080F',
  },
});
