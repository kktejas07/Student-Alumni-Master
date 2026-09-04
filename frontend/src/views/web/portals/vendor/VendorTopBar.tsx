// @ts-nocheck
/**
 * Vendor Portal — simple top bar (no student nav context needed).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useBreakpoint } from '@/src/theme/breakpoints';

export function VendorTopBar({ scrolled }: { scrolled?: boolean }) {
  const { logout } = useVendorAuthStore();
  const router = useRouter();
  const bp = useBreakpoint();

  return (
    <View style={[styles.bar, scrolled && styles.barScrolled]}>
      <View style={styles.left}>
        <Text style={styles.logo}>🏪 Vendor Portal</Text>
      </View>
      <Pressable
        onPress={() => { logout(); router.replace('/vendor-portal/login'); }}
        style={styles.logoutBtn}
      >
        <FontAwesome5 name="sign-out-alt" size={13} color="#EF4444" />
        {!bp.isPhone && <Text style={styles.logoutText}>Logout</Text>}
      </Pressable>
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
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  logoutText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
});
