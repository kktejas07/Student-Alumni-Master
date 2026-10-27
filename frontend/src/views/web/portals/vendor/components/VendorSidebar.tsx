import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';

interface VendorSidebarProps {
  activeView: string;
  onNavigate: (viewId: string) => void;
  onLogout: () => void;
}

export function VendorSidebar({ activeView, onNavigate, onLogout }: VendorSidebarProps) {
  const items = [
    { id: 'dashboard', icon: 'chart-pie', label: 'Dashboard' },
    { id: 'catalog', icon: 'list', label: 'Catalog' },
    { id: 'scanner', icon: 'qrcode', label: 'QR Scanner' },
    { id: 'orders', icon: 'shopping-bag', label: 'Orders' },
  ];

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={styles.content}>
        <View style={styles.header}>
          <FontAwesome5 name="store" size={24} color="#8B5CF6" />
          <Text style={styles.headerText}>Vendor Portal</Text>
        </View>

        <View style={styles.nav}>
          {items.map(item => {
            const isActive = activeView === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => onNavigate(item.id)}
                style={[styles.navItem, isActive && styles.navItemActive]}
              >
                <FontAwesome5 name={item.icon} size={18} color={isActive ? '#FFF' : '#9CA3AF'} style={{ width: 24, textAlign: 'center' }} />
                <Text style={[styles.navText, isActive && styles.navTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onLogout} style={styles.logoutBtn}>
          <FontAwesome5 name="sign-out-alt" size={16} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  headerText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  nav: {
    flex: 1,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  navText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
