// @ts-nocheck
/**
 * Vendor Portal — simple top bar (no student nav context needed).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function VendorTopBar({ scrolled }: { scrolled?: boolean }) {
  return (
    <View style={[styles.bar, scrolled && styles.barScrolled]}>
      <View style={styles.left}>
        <Text style={styles.logo}>🏪 Vendor Portal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(10,10,20,0.95)',
  },
  barScrolled: {
    backgroundColor: 'rgba(10,10,20,0.98)',
    borderBottomColor: 'rgba(139,92,246,0.15)',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { fontSize: 16, fontWeight: '800', color: '#A78BFA', letterSpacing: -0.3 },
});
