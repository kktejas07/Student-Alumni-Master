import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/viewmodels/stores/authStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { TopBar } from '@/src/views/web/portals/student/TopBar';
import { Sidebar } from '@/src/views/web/portals/student/Sidebar'; // We will create VendorSidebar later
import { LinearGradient } from 'expo-linear-gradient';
import { SP } from '@/src/theme/apple';
import { useBreakpoint } from '@/src/theme/breakpoints';
import { Text } from 'react-native';

export function VendorPortalRN() {
  const router = useRouter();
  const logout = useAuthStore((s: any) => s.logout);
  const { tab, go } = usePortalUrl();
  const active = tab || 'dashboard';
  const bp = useBreakpoint();
  
  const [scrolled, setScrolled] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 8);
  };

  const handleNav = (id: string) => {
    go(id);
  };

  const onLogout = () => {
    logout?.();
    router.replace('/');
  };

  const padH = bp.isPhone ? SP.md : SP.xxl;

  return (
    <View style={{ flex: 1, backgroundColor: '#08080F', flexDirection: 'row' }}>
      <LinearGradient
        pointerEvents="none"
        colors={['#08080F', '#0C0E1F', '#08080F']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />
      
      {/* TODO: VendorSidebar */}
      
      <View style={{ flex: 1, minWidth: 0 }}>
        <TopBar scrolled={scrolled} activeView={active} onAvatarPress={() => {}} onBellPress={() => {}} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: padH, paddingTop: SP.lg, paddingBottom: bp.isPhone ? 80 : 0 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={{ flex: 1, padding: 40, gap: 20 }}>
            {active === 'dashboard' && <Text style={{ color: 'white', fontSize: 32 }}>Vendor Dashboard</Text>}
            {active === 'catalog' && <Text style={{ color: 'white', fontSize: 32 }}>Vendor Catalog (Coming Soon)</Text>}
            {active === 'scanner' && <Text style={{ color: 'white', fontSize: 32 }}>QR Scanner (Coming Soon)</Text>}
            {active === 'orders' && <Text style={{ color: 'white', fontSize: 32 }}>Orders History (Coming Soon)</Text>}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
