// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';

export function VendorTopBar({ scrolled }: { scrolled?: boolean }) {
  return (
    <View style={[styles.bar, scrolled && styles.barScrolled]} />
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(10,10,20,0.95)',
  },
  barScrolled: {
    backgroundColor: 'rgba(10,10,20,0.98)',
    borderBottomColor: 'rgba(139,92,246,0.15)',
  },
});
